package com.company.project.performance.events;

import com.company.project.performance.PerformanceClock;
import com.company.project.security.BranchContextHolder;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Keeps performance_events in step with the source rows (plan §4.2).
 *
 * Writers don't call it directly: {@link PerformanceSourceListener} notices every insert,
 * update and delete of a receipt, POS sale, lead, session or booking, and the touched rows are
 * reconciled once the writing transaction commits (in a transaction of their own, so a ledger
 * problem can never roll back a sale). That catches every write path — desk, POS, mobile app,
 * approvals, refunds, imports — without hooking each service.
 *
 * Reconciling a row compares what it should be credited with now ({@link SourceDeriver}) with
 * the sum of its ledger rows, per metric and person, and appends the difference. It is
 * idempotent: reconciling an unchanged row writes nothing.
 *
 * Where a correction lands: in the original activity's month while that month is still open
 * for the person; once their month has been decided (approved / rejected / paid) the month
 * stays frozen and the correction lands now — a clawback (plan §7).
 */
@Service
public class PerformanceEventRecorder {

    private static final Logger log = LoggerFactory.getLogger(PerformanceEventRecorder.class);
    private static final String PENDING_KEY = PerformanceEventRecorder.class.getName() + ".pending";

    @PersistenceContext
    private EntityManager em;

    private final PerformanceEventRepository repository;
    private final Map<String, SourceDeriver> derivers;
    private final PerformanceClock clock;
    private final TransactionTemplate newTransaction;

    public PerformanceEventRecorder(PerformanceEventRepository repository, List<SourceDeriver> derivers,
                                    PerformanceClock clock, PlatformTransactionManager transactionManager) {
        this.repository = repository;
        this.derivers = derivers.stream().collect(Collectors.toMap(SourceDeriver::sourceType, Function.identity()));
        this.clock = clock;
        this.newTransaction = new TransactionTemplate(transactionManager);
        this.newTransaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
    }

    public Set<String> sourceTypes() {
        return derivers.keySet();
    }

    public SourceDeriver deriver(String sourceType) {
        return derivers.get(sourceType);
    }

    /** A source row changed: reconcile it after the current transaction commits (or now, outside one). */
    @SuppressWarnings("unchecked")
    public void touch(String sourceType, Long sourceId) {
        if (sourceId == null || !derivers.containsKey(sourceType)) return;
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            reconcileQuietly(sourceType, sourceId);
            return;
        }
        Set<String> pending = (Set<String>) TransactionSynchronizationManager.getResource(PENDING_KEY);
        if (pending == null) {
            Set<String> fresh = new LinkedHashSet<>();
            TransactionSynchronizationManager.bindResource(PENDING_KEY, fresh);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int status) {
                    TransactionSynchronizationManager.unbindResourceIfPossible(PENDING_KEY);
                    if (status != STATUS_COMMITTED) return;
                    for (String key : fresh) {
                        int sep = key.indexOf(':');
                        reconcileQuietly(key.substring(0, sep), Long.valueOf(key.substring(sep + 1)));
                    }
                }
            });
            pending = fresh;
        }
        pending.add(sourceType + ":" + sourceId);
    }

    /** Reconciles in a new transaction; logs instead of throwing (the source write already committed). */
    public void reconcileQuietly(String sourceType, Long sourceId) {
        for (int attempt = 1; attempt <= 2; attempt++) {
            try {
                reconcileInNewTransaction(sourceType, sourceId);
                return;
            } catch (DataIntegrityViolationException e) {
                // Two writers reconciled the same row at once and picked the same revision: retry once.
                if (attempt == 2) log.warn("Performance ledger: could not reconcile {} {}", sourceType, sourceId, e);
            } catch (RuntimeException e) {
                log.warn("Performance ledger: could not reconcile {} {}", sourceType, sourceId, e);
                return;
            }
        }
    }

    public int reconcileInNewTransaction(String sourceType, Long sourceId) {
        Long branch = BranchContextHolder.getActiveBranchId();
        // Ledger work reads across branches (a multi-branch staff member, a session in another
        // branch); the branch filter and read check must not apply.
        BranchContextHolder.clear();
        try {
            Integer written = newTransaction.execute(tx -> reconcile(sourceType, sourceId));
            return written != null ? written : 0;
        } finally {
            if (branch != null) BranchContextHolder.setActiveBranchId(branch);
        }
    }

    /** Runs {@code change} (e.g. reassigning the row's staff member) and reconciles the row, in one new transaction. */
    public void reconcileInNewTransactionAfter(Runnable change, String sourceType, Long sourceId) {
        Long branch = BranchContextHolder.getActiveBranchId();
        BranchContextHolder.clear();
        try {
            newTransaction.executeWithoutResult(tx -> {
                change.run();
                reconcile(sourceType, sourceId);
            });
        } finally {
            if (branch != null) BranchContextHolder.setActiveBranchId(branch);
        }
    }

    /** Reconciles several rows of one type in a single new transaction (rebuild job). */
    public int reconcileBatchInNewTransaction(String sourceType, List<Long> sourceIds) {
        Long branch = BranchContextHolder.getActiveBranchId();
        BranchContextHolder.clear();
        try {
            Integer written = newTransaction.execute(tx -> {
                int n = 0;
                for (Long id : sourceIds) n += reconcile(sourceType, id);
                return n;
            });
            return written != null ? written : 0;
        } finally {
            if (branch != null) BranchContextHolder.setActiveBranchId(branch);
        }
    }

    /** Must run inside a transaction. Returns the number of ledger rows written. */
    public int reconcile(String sourceType, Long sourceId) {
        SourceDeriver deriver = derivers.get(sourceType);
        if (deriver == null) return 0;
        List<Credit> desired = deriver.derive(sourceId);
        List<PerformanceEvent> existing = repository.findBySourceTypeAndSourceIdOrderByRevisionAsc(sourceType, sourceId);
        List<PerformanceEvent> toWrite = plan(sourceType, sourceId, desired, existing, PerformanceClock.nowUtc(), this::isFrozen);
        repository.saveAll(toWrite);
        return toWrite.size();
    }

    /**
     * Pure: the ledger rows that bring {@code existing} in line with {@code desired}.
     * {@code frozen} says whether a person's month (in which an original credit fell) is decided.
     */
    static List<PerformanceEvent> plan(String sourceType, Long sourceId, List<Credit> desired,
                                       List<PerformanceEvent> existing, LocalDateTime now, FrozenCheck frozen) {
        Map<Credit.Key, Credit> want = new LinkedHashMap<>();
        for (Credit c : desired) {
            want.merge(c.key(), c, (a, b) -> new Credit(a.metric(), a.staffId(), a.branchId(), a.occurredAt(),
                    a.quantity() + b.quantity(), add(a.amount(), b.amount())));
        }
        Map<Credit.Key, List<PerformanceEvent>> have = new LinkedHashMap<>();
        for (PerformanceEvent e : existing) {
            have.computeIfAbsent(new Credit.Key(e.getMetric(), e.getStaffId()), k -> new ArrayList<>()).add(e);
        }
        Set<Credit.Key> keys = new LinkedHashSet<>(have.keySet());
        keys.addAll(want.keySet());

        List<PerformanceEvent> out = new ArrayList<>();
        for (Credit.Key key : keys) {
            Credit target = want.get(key);
            List<PerformanceEvent> rows = have.getOrDefault(key, List.of());
            int haveQty = rows.stream().mapToInt(PerformanceEvent::getQuantity).sum();
            BigDecimal haveAmount = rows.stream().map(PerformanceEvent::getAmount).reduce(null, PerformanceEventRecorder::add);
            int wantQty = target != null ? target.quantity() : 0;
            BigDecimal wantAmount = target != null ? target.amount() : null;

            int dq = wantQty - haveQty;
            BigDecimal da = subtract(wantAmount, haveAmount);
            if (dq == 0 && (da == null || da.signum() == 0)) continue;

            PerformanceEvent e = new PerformanceEvent();
            e.setSourceType(sourceType);
            e.setSourceId(sourceId);
            e.setMetric(key.metric());
            e.setStaffId(key.staffId());
            e.setQuantity(dq);
            e.setAmount(da);
            e.setCreatedAt(now);
            if (rows.isEmpty()) {
                e.setRevision(0);
                e.setBranchId(target.branchId());
                e.setOccurredAt(target.occurredAt());
            } else {
                PerformanceEvent original = rows.get(0);
                e.setRevision(rows.stream().mapToInt(PerformanceEvent::getRevision).max().orElse(0) + 1);
                e.setReversesEventId(original.getId());
                e.setBranchId(target != null && target.branchId() != null ? target.branchId() : original.getBranchId());
                LocalDateTime when = target != null ? target.occurredAt() : original.getOccurredAt();
                boolean decided = key.staffId() != null && frozen.isFrozen(key.staffId(), when, e.getBranchId());
                e.setOccurredAt(decided ? now : when);
            }
            out.add(e);
        }
        return out;
    }

    @FunctionalInterface
    interface FrozenCheck {
        boolean isFrozen(Long staffId, LocalDateTime occurredAt, Long branchId);
    }

    /** The person's month that this moment falls in has been decided (its commission is frozen). */
    boolean isFrozen(Long staffId, LocalDateTime occurredAt, Long branchId) {
        YearMonth month = clock.monthOf(occurredAt, branchId);
        return !em.createNativeQuery("SELECT 1 FROM commission_earnings WHERE staff_id = :s AND period_year = :y " +
                        "AND period_month = :m AND status IN ('approved', 'rejected', 'paid') LIMIT 1")
                .setParameter("s", staffId).setParameter("y", month.getYear()).setParameter("m", month.getMonthValue())
                .getResultList().isEmpty();
    }

    private static BigDecimal add(BigDecimal a, BigDecimal b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.add(b);
    }

    private static BigDecimal subtract(BigDecimal want, BigDecimal have) {
        if (want == null && have == null) return null;
        return (want != null ? want : BigDecimal.ZERO).subtract(have != null ? have : BigDecimal.ZERO);
    }
}
