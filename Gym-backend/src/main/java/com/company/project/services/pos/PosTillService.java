package com.company.project.services.pos;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.*;
import com.company.project.entities.CashMovement;
import com.company.project.entities.PosCashMovementCategory;
import com.company.project.services.FinancialEventService;
import com.company.project.entities.PosSession;
import com.company.project.entities.PosSettings;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.CashMovementRepository;
import com.company.project.repositories.PosDayCloseRepository;
import com.company.project.repositories.PosSessionRepository;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;

import static com.company.project.services.pos.PosSupport.*;

/**
 * POS sessions ("tills"), ported from BillBull's user-centric session model: each
 * cashier opens their own session with a counted float, sells into it, records
 * cash in/out against it and closes it with a counted drawer — the variance
 * against the X-report's expected cash is stored on the session. A supervisor can
 * force-close anyone's session (e.g. one left open overnight).
 */
@Service
@Transactional
public class PosTillService {

    private final PosSessionRepository sessionRepo;
    private final CashMovementRepository movementRepo;
    private final PosDayCloseRepository dayCloseRepo;
    private final PosReportService reportService;
    private final PosSettingsService settingsService;
    private final PosAuditService auditService;
    private final PosSupport support;
    private final PosMapper mapper;
    private final PosSessionControlService controlService;
    /** Optional (absent in unit tests): managed categories and their ledger posting. */
    private PosCashCategoryService categoryService;
    private FinancialEventService financialEventService;
    /** Optional (absent in unit tests): registered terminals. */
    private PosTerminalService terminalService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setTerminalService(@org.springframework.context.annotation.Lazy PosTerminalService terminalService) {
        this.terminalService = terminalService;
    }

    public PosTillService(PosSessionRepository sessionRepo, CashMovementRepository movementRepo,
                          PosDayCloseRepository dayCloseRepo, PosReportService reportService,
                          PosSettingsService settingsService, PosAuditService auditService,
                          PosSupport support, PosMapper mapper, PosSessionControlService controlService) {
        this.controlService = controlService;
        this.sessionRepo = sessionRepo;
        this.movementRepo = movementRepo;
        this.dayCloseRepo = dayCloseRepo;
        this.reportService = reportService;
        this.settingsService = settingsService;
        this.auditService = auditService;
        this.support = support;
        this.mapper = mapper;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setCashCategories(@org.springframework.context.annotation.Lazy PosCashCategoryService categoryService,
                                  @org.springframework.context.annotation.Lazy FinancialEventService financialEventService) {
        this.categoryService = categoryService;
        this.financialEventService = financialEventService;
    }

    // ── Open / active ───────────────────────────────────────────────────────

    public SessionDTO open(PosRequests.OpenSession req) {
        support.requireBranch();
        String me = support.currentUsername();
        Optional<PosSession> existing = myOpenSession();
        if (existing.isPresent()) {
            throw new BusinessRuleViolationException("You already have an open session ("
                    + existing.get().getSessionNumber() + "). Continue it or close it first.");
        }
        Optional<PosSession> suspended = sessionRepo.findFirstByStatusAndOpenedByOrderByOpenedAtDesc("SUSPENDED", me);
        if (suspended.isPresent()) {
            throw new BusinessRuleViolationException("You have a suspended session (" + suspended.get().getSessionNumber()
                    + "). Resume it or close it first.");
        }
        controlService.assertDayOpen();
        LocalDate today = support.today();
        // BillBull PREVIOUS_BUSINESS_DAY_OPEN: an earlier business day must be Day-Closed first.
        LocalDate unclosed = sessionRepo.firstUnclosedDayBefore(today);
        if (unclosed != null) {
            throw new BusinessRuleViolationException("Business day " + unclosed + " has not been closed yet. Run its Z-Report and "
                    + "Day Close before opening a session for " + today + ".");
        }
        dayCloseRepo.findFirstByBusinessDate(today).ifPresent(dc -> {
            throw new BusinessRuleViolationException("Business day " + today + " is already closed ("
                    + dc.getCloseNumber() + "). New sessions can be opened from tomorrow.");
        });
        BigDecimal opening = r2(req.openingCash());
        if (opening.signum() < 0) throw new BusinessRuleViolationException("Opening cash cannot be negative.");
        com.company.project.entities.PosTerminal terminal = terminalService != null && trimToNull(req.terminalCode()) != null
                ? terminalService.claimForNewSession(req.terminalCode()) : null;

        PosSession s = new PosSession();
        s.setOpeningCash(opening);
        s.setOpeningDenominations(req.openingDenominations());
        s.setStaffName(Optional.ofNullable(trimToNull(req.staffName())).orElse(support.currentDisplayName()));
        s.setOpenedBy(me);
        s.setTerminalName(trimToNull(req.terminalName()));
        s.setNotes(trimToNull(req.notes()));
        s.setStatus("OPEN");
        s.setOpenedAt(LocalDateTime.now());
        s.setBusinessDate(today);
        s.setForceClosed(false);
        s.setXReportPrintCount(0);
        s.setLastActivityAt(LocalDateTime.now());
        s = sessionRepo.save(s);
        s.setSessionNumber("SES-" + String.format("%08d", s.getId()));
        if (terminal != null) terminalService.attach(s, terminal, "Opened", null);
        s = sessionRepo.save(s);

        auditService.log("SESSION_OPEN", "PosSession", s.getId(), s.getSessionNumber(), s.getId(), opening,
                "Opening float " + opening, null, s.getTerminalName());
        return mapper.session(s);
    }

    /**
     * The caller's open session. Sessions opened before per-cashier sessions existed
     * carry no owner; the first cashier to resume one adopts it.
     */
    public Optional<PosSession> myOpenSession() {
        String me = support.currentUsername();
        Optional<PosSession> mine = sessionRepo.findFirstByStatusAndOpenedByOrderByOpenedAtDesc("OPEN", me);
        if (mine.isPresent()) return mine;
        Optional<PosSession> legacy = sessionRepo.findByStatusOrderByOpenedAtDesc("OPEN").stream()
                .filter(s -> s.getOpenedBy() == null).findFirst();
        legacy.ifPresent(s -> {
            if (s.getBusinessDate() == null && s.getOpenedAt() != null) s.setBusinessDate(s.getOpenedAt().toLocalDate());
            s.setOpenedBy(me);
            sessionRepo.save(s);
        });
        return legacy;
    }

    /** The caller's current session — open, or suspended (the till then offers Resume). */
    public Optional<SessionDTO> active() {
        if (com.company.project.security.BranchContextHolder.getActiveBranchId() == null) return Optional.empty();
        Optional<PosSession> open = myOpenSession();
        if (open.isPresent()) return open.map(mapper::session);
        return sessionRepo.findFirstByStatusAndOpenedByOrderByOpenedAtDesc("SUSPENDED", support.currentUsername())
                .map(mapper::session);
    }

    @Transactional(readOnly = true)
    public List<SessionDTO> live() {
        return mapper.sessions(sessionRepo.findByStatusInOrderByOpenedAtDesc(PosSessionControlService.CURRENT));
    }

    @Transactional(readOnly = true)
    public SessionDTO get(Long id) {
        return mapper.session(find(id));
    }

    @Transactional(readOnly = true)
    public SessionsPage history(LocalDate from, LocalDate to, String status, String cashier, int page, int size) {
        Specification<PosSession> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (from != null) p.add(cb.greaterThanOrEqualTo(root.get("businessDate"), from));
            if (to != null) p.add(cb.lessThanOrEqualTo(root.get("businessDate"), to));
            if (status != null && !status.isBlank()) p.add(cb.equal(root.get("status"), status.toUpperCase(Locale.ROOT)));
            if (cashier != null && !cashier.isBlank()) {
                String like = "%" + cashier.toLowerCase(Locale.ROOT) + "%";
                p.add(cb.or(cb.like(cb.lower(root.get("openedBy")), like), cb.like(cb.lower(root.get("staffName")), like)));
            }
            return cb.and(p.toArray(new Predicate[0]));
        };
        int safeSize = Math.min(Math.max(size, 1), 100);
        Page<PosSession> result = sessionRepo.findAll(spec,
                PageRequest.of(Math.max(page, 1) - 1, safeSize, Sort.by(Sort.Direction.DESC, "openedAt")));
        return new SessionsPage(mapper.sessions(result.getContent()),
                new PageMeta(page, safeSize, result.getTotalElements(), result.getTotalPages()));
    }

    // ── Close ───────────────────────────────────────────────────────────────

    public SessionDTO close(Long id, PosRequests.CloseSession req) {
        support.requireBranch();
        PosSession s = find(id);
        if ("CLOSED".equals(s.getStatus())) throw new BusinessRuleViolationException("Session " + s.getSessionNumber() + " is already closed.");
        PosSettings settings = settingsService.current();

        boolean someoneElses = s.getOpenedBy() != null && !s.getOpenedBy().equals(support.currentUsername());
        boolean force = Boolean.TRUE.equals(req.force()) || someoneElses;
        String approvedBy = null;
        if (force) {
            if (trimToNull(req.forceCloseReason()) == null) {
                throw new BusinessRuleViolationException("Give a reason for closing " + s.getOpenedBy() + "'s session.");
            }
            approvedBy = support.approve(settings, someoneElses || Boolean.TRUE.equals(settings.getRequireSupervisorForForceClose()),
                    req.supervisorPin(), "closing another cashier's session");
        }

        BigDecimal counted = r2(req.closingCash());
        if (counted.signum() < 0) throw new BusinessRuleViolationException("Counted cash cannot be negative.");
        BigDecimal expected = reportService.expectedCash(s.getId());
        BigDecimal variance = counted.subtract(expected);
        BigDecimal threshold = nz(settings.getCashVarianceThreshold());
        boolean overThreshold = variance.abs().compareTo(threshold) > 0 && variance.signum() != 0;
        if (overThreshold && trimToNull(req.varianceRemarks()) == null) {
            throw new BusinessRuleViolationException("The counted cash differs from the expected " + expected
                    + " by " + variance + ". Enter variance remarks to close the session.");
        }
        // BillBull: a variance beyond the threshold is authorised by a supervisor, not just explained.
        String varianceApprovedBy = overThreshold
                ? support.approve(settings, !Boolean.FALSE.equals(settings.getRequireSupervisorForVariance()), req.supervisorPin(),
                        "a cash " + (variance.signum() < 0 ? "shortage" : "excess") + " of " + variance.abs())
                : null;

        s.setStatus("CLOSED");
        s.setClosedAt(LocalDateTime.now());
        s.setClosedBy(support.currentUsername());
        s.setClosingCash(counted);
        s.setClosingDenominations(req.closingDenominations());
        s.setExpectedCash(expected);
        s.setCashVariance(variance);
        s.setVarianceRemarks(trimToNull(req.varianceRemarks()));
        s.setCardSettlementAmount(req.cardSettlementAmount() != null ? r2(req.cardSettlementAmount()) : null);
        s.setCardBatchNo(trimToNull(req.cardBatchNo()));
        s.setCardSettlementVerified(req.cardSettlementVerified());
        if (trimToNull(req.notes()) != null) s.setNotes(req.notes().trim());
        s.setForceClosed(force);
        s.setForceCloseReason(force ? req.forceCloseReason().trim() : null);
        s.setVarianceApprovedBy(varianceApprovedBy);
        if (s.getClosingStartedAt() == null) {
            s.setClosingStartedAt(LocalDateTime.now());
            s.setClosingStartedBy(support.currentUsername());
        }
        s = sessionRepo.save(s);
        if (terminalService != null) terminalService.release(s);

        auditService.log(force ? "SESSION_FORCE_CLOSE" : "SESSION_CLOSE", "PosSession", s.getId(), s.getSessionNumber(),
                s.getId(), counted, "Expected " + expected + ", counted " + counted + ", variance " + variance
                        + (force ? " | reason: " + s.getForceCloseReason() : "")
                        + (varianceApprovedBy != null ? " | variance approved by " + varianceApprovedBy : ""),
                approvedBy != null ? approvedBy : varianceApprovedBy, s.getTerminalName());
        return mapper.session(s);
    }

    public SessionDTO recordXReportPrint(Long id) {
        PosSession s = find(id);
        s.setXReportPrintCount((s.getXReportPrintCount() == null ? 0 : s.getXReportPrintCount()) + 1);
        s = sessionRepo.save(s);
        auditService.log("X_REPORT_PRINT", "PosSession", s.getId(), s.getSessionNumber(), s.getId(), null,
                "X-report printed (#" + s.getXReportPrintCount() + ")", null, s.getTerminalName());
        return mapper.session(s);
    }

    // ── Cash movements ──────────────────────────────────────────────────────

    public CashMovementDTO addCashMovement(Long sessionId, PosRequests.CashMovement req) {
        support.requireBranch();
        PosSession s = find(sessionId);
        if (!"OPEN".equals(s.getStatus())) throw new BusinessRuleViolationException("Cash can only be moved in an open session.");
        if (s.getOpenedBy() != null && !s.getOpenedBy().equals(support.currentUsername()) && !support.isSupervisor()) {
            throw new BusinessRuleViolationException("Session " + s.getSessionNumber() + " belongs to " + s.getOpenedBy() + ".");
        }
        String type = req.type() == null ? "" : req.type().trim().toUpperCase(Locale.ROOT);
        if (!type.equals("DROP_IN") && !type.equals("CASH_OUT")) {
            throw new BusinessRuleViolationException("Cash movement type must be DROP_IN or CASH_OUT.");
        }
        BigDecimal amount = r2(req.amount());
        if (amount.signum() <= 0) throw new BusinessRuleViolationException("Amount must be greater than zero.");

        PosSettings settings = settingsService.current();
        PosCashMovementCategory managed = categoryService != null
                ? categoryService.resolve(type, req.categoryId(), req.category()) : null;
        String category = managed != null ? managed.getName() : trimToNull(req.category());
        if (category == null && Boolean.TRUE.equals(settings.getRequireCashMovementCategory())) {
            throw new BusinessRuleViolationException("Select a category for this cash movement.");
        }
        if (managed != null && Boolean.TRUE.equals(managed.getNotesRequired()) && trimToNull(req.reason()) == null) {
            throw new BusinessRuleViolationException("Add a note — \"" + managed.getName() + "\" needs an explanation.");
        }
        String approvedBy = null;
        if (type.equals("CASH_OUT")) {
            BigDecimal inDrawer = reportService.expectedCash(s.getId());
            if (amount.compareTo(inDrawer) > 0) {
                throw new BusinessRuleViolationException("Cash out of " + amount + " is more than the " + inDrawer + " expected in the drawer.");
            }
        }
        boolean categoryApproval = managed != null && Boolean.TRUE.equals(managed.getApprovalRequired());
        boolean cashOutApproval = type.equals("CASH_OUT") && Boolean.TRUE.equals(settings.getRequireSupervisorForCashOut());
        approvedBy = support.approve(settings, categoryApproval || cashOutApproval, req.supervisorPin(),
                categoryApproval ? "a \"" + managed.getName() + "\" " + (type.equals("CASH_OUT") ? "cash out" : "cash in")
                        : "a cash out");

        CashMovement m = new CashMovement();
        m.setPosSessionId(sessionId);
        m.setType(type);
        m.setAmount(amount);
        m.setReason(trimToNull(req.reason()));
        m.setCategory(category);
        m.setCategoryId(managed != null ? managed.getId() : null);
        m.setReference(trimToNull(req.reference()));
        m.setApprovedBy(approvedBy);
        m = movementRepo.save(m);

        if (managed != null && managed.getAccountCode() != null && financialEventService != null) {
            postMovement(m, s, managed.getAccountCode(), managed.getAccountName());
            m = movementRepo.save(m);
        }

        auditService.log(type.equals("DROP_IN") ? "CASH_IN" : "CASH_OUT", "CashMovement", m.getId(), null, sessionId,
                amount, (category != null ? category : "") + (m.getReason() != null ? " — " + m.getReason() : ""),
                approvedBy, s.getTerminalName());
        return mapper.cashMovement(m);
    }

    /**
     * Journals a cash movement whose category names a ledger account — DROP_IN: DR Cash in Hand /
     * CR account, CASH_OUT: DR account / CR Cash in Hand — and stamps the account on it. Movements
     * in plain categories stay inside the till (the drawer reconciliation covers them).
     */
    void postMovement(CashMovement m, PosSession s, String accountCode, String accountName) {
        boolean in = "DROP_IN".equals(m.getType());
        String what = (in ? "Cash in" : "Cash out") + " — " + m.getCategory()
                + (s.getSessionNumber() != null ? " (" + s.getSessionNumber() + ")" : "");
        String cash = FinancialEventService.ACC_CASH_IN_HAND;
        BigDecimal amt = m.getAmount();
        financialEventService.postPosEntry("PosCashMovement", m.getId(), "POS " + what
                        + (m.getReason() != null ? ": " + m.getReason() : ""), support.today(),
                List.of(new FinancialEventService.PosLine(in ? cash : accountCode, in ? "Cash in Hand" : accountName,
                                amt, BigDecimal.ZERO, what),
                        new FinancialEventService.PosLine(in ? accountCode : cash, in ? accountName : "Cash in Hand",
                                BigDecimal.ZERO, amt, what)));
        m.setPostedAccountCode(accountCode);
        m.setPostedAccountName(accountName);
    }

    @Transactional(readOnly = true)
    public List<CashMovementDTO> cashMovements(Long sessionId) {
        find(sessionId);
        return movementRepo.findByPosSessionIdOrderByCreatedAtDesc(sessionId).stream().map(mapper::cashMovement).toList();
    }

    PosSession find(Long id) {
        return sessionRepo.findById(id).orElseThrow(() -> new EntityNotFoundException("POS session not found with id: " + id));
    }
}
