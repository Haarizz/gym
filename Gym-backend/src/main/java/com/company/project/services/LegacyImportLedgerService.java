package com.company.project.services;

import com.company.project.entities.CreditNote;
import com.company.project.entities.DeferredRevenueRecognitionLine;
import com.company.project.entities.DeferredRevenueSchedule;
import com.company.project.entities.MemberAddon;
import com.company.project.entities.Receipt;
import com.company.project.entities.ReceiptVoucher;
import com.company.project.repositories.CreditNoteRepository;
import com.company.project.repositories.DeferredRevenueRecognitionLineRepository;
import com.company.project.repositories.DeferredRevenueScheduleRepository;
import com.company.project.repositories.JournalEntrySourceRepository;
import com.company.project.repositories.ReceiptVoucherRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Posts data brought over from a gym's previous system to the general ledger.
 *
 * Import Gym (services/gymimport, super admin) writes members, receipts, add-ons and
 * refunds straight into a fresh tenant DB with created_by = "legacy-import" and
 * historical dates, which bypasses the services that normally journal them. This
 * replays exactly those rows, oldest first, through the same FinancialEventService
 * handlers a live sale goes through — so VAT, deferral and account balances follow
 * the app's own rules — and then recognizes the deferred revenue whose month has
 * already passed (DeferredRevenueRecognitionScheduler only sees the primary DB).
 *
 * Idempotent: every handler skips a source that's already journaled, and receipt
 * vouchers are matched on their reference, so a re-run only posts what's missing.
 * Rows created any other way are never touched.
 */
@Service
public class LegacyImportLedgerService {

    private static final Logger log = LoggerFactory.getLogger(LegacyImportLedgerService.class);

    public static final String IMPORT_MARKER = "legacy-import";

    // Mirrors the receipt vouchers MemberService/ReceiptService/MemberAddonService
    // create for registrations, renewals, settlements and add-ons. Day passes and
    // refunds don't get one in the live flows either.
    private static final Set<String> VOUCHERED_TYPES = Set.of("New", "Renewal", "Payment");

    @PersistenceContext
    private EntityManager em;

    private final FinancialEventService financialEventService;
    private final VoucherNumberService voucherNumberService;
    private final ReceiptVoucherRepository receiptVoucherRepository;
    private final CreditNoteRepository creditNoteRepository;
    private final DeferredRevenueScheduleRepository scheduleRepository;
    private final DeferredRevenueRecognitionLineRepository lineRepository;
    private final JournalEntrySourceRepository journalEntrySourceRepository;

    public LegacyImportLedgerService(FinancialEventService financialEventService,
                                     VoucherNumberService voucherNumberService,
                                     ReceiptVoucherRepository receiptVoucherRepository,
                                     CreditNoteRepository creditNoteRepository,
                                     DeferredRevenueScheduleRepository scheduleRepository,
                                     DeferredRevenueRecognitionLineRepository lineRepository,
                                     JournalEntrySourceRepository journalEntrySourceRepository) {
        this.journalEntrySourceRepository = journalEntrySourceRepository;
        this.financialEventService = financialEventService;
        this.voucherNumberService = voucherNumberService;
        this.receiptVoucherRepository = receiptVoucherRepository;
        this.creditNoteRepository = creditNoteRepository;
        this.scheduleRepository = scheduleRepository;
        this.lineRepository = lineRepository;
    }

    private record Event(LocalDateTime at, long order, Runnable post) {}

    @Transactional
    public Map<String, Object> postLedger() {
        return postLedger(null);
    }

    /** As postLedger(), reporting (done, total) as it goes — progress may be null. */
    @Transactional
    public Map<String, Object> postLedger(java.util.function.BiConsumer<Integer, Integer> progress) {
        List<Receipt> receipts = em.createQuery(
                "SELECT r FROM Receipt r WHERE r.createdBy = :marker", Receipt.class)
                .setParameter("marker", IMPORT_MARKER).getResultList();
        List<MemberAddon> addons = em.createQuery(
                "SELECT a FROM MemberAddon a WHERE a.createdBy = :marker", MemberAddon.class)
                .setParameter("marker", IMPORT_MARKER).getResultList();
        List<CreditNote> creditNotes = em.createQuery(
                "SELECT c FROM CreditNote c WHERE c.createdBy = :marker", CreditNote.class)
                .setParameter("marker", IMPORT_MARKER).getResultList();

        // An add-on's own receipt is a customer-facing copy: MemberAddonService posts
        // the add-on (Service Revenue) and deliberately never the receipt.
        Set<Long> addonReceiptIds = addons.stream()
                .map(MemberAddon::getReceiptId).filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());

        int[] counts = new int[4]; // receipts, add-ons, credit notes, vouchers
        List<Event> events = new ArrayList<>();
        for (Receipt r : receipts) {
            if (addonReceiptIds.contains(r.getId())) continue;
            if (positive(r.getPaidAmount() != null ? r.getPaidAmount() : r.getAmount())) {
                events.add(new Event(r.getTransactionDate(), r.getId(), () -> {
                    if (!journaled("Receipt", r.getId())) counts[0]++;
                    financialEventService.onMemberPaymentReceived(r);
                    if (VOUCHERED_TYPES.contains(r.getTransactionType()) && createVoucher(r, "Membership")) counts[3]++;
                }));
            }
        }
        for (MemberAddon a : addons) {
            if (positive(a.getAmount())) {
                events.add(new Event(a.getPurchaseDate(), a.getId(), () -> {
                    if (!journaled("MemberAddon", a.getId())) counts[1]++;
                    financialEventService.onAddonPaymentReceived(a);
                    if (createAddonVoucher(a)) counts[3]++;
                }));
            }
        }
        for (CreditNote c : creditNotes) {
            events.add(new Event(c.getDate().atStartOfDay(), c.getId(), () -> {
                if (!journaled("CreditNote", c.getId())) counts[2]++;
                financialEventService.onCreditNoteIssued(c);
                if ("DRAFT".equalsIgnoreCase(c.getStatus())) {
                    c.setStatus("POSTED");
                    creditNoteRepository.save(c);
                }
            }));
        }

        // Oldest first, so journal and voucher numbers run in date order like they
        // would have if these sales had been rung up here.
        events.sort(Comparator.comparing(Event::at, Comparator.nullsFirst(Comparator.naturalOrder()))
                .thenComparingLong(Event::order));
        for (int i = 0; i < events.size(); i++) {
            events.get(i).post().run();
            if (progress != null && (i % 25 == 24 || i == events.size() - 1)) progress.accept(i + 1, events.size());
            // Thousands of postings in one persistence context make every flush
            // dirty-check everything posted so far; the handlers only read the
            // source rows, so detaching as we go is safe.
            if (i % 100 == 99) {
                em.flush();
                em.clear();
            }
        }
        em.flush();
        em.clear();

        int recognized = recognizeElapsedDeferredRevenue(receipts.stream().map(Receipt::getId)
                .collect(Collectors.toSet()));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("receipts_posted", counts[0]);
        result.put("addons_posted", counts[1]);
        result.put("credit_notes_posted", counts[2]);
        result.put("receipt_vouchers_created", counts[3]);
        result.put("deferred_lines_recognized", recognized);
        log.info("Legacy import ledger posting: {}", result);
        return result;
    }

    private int recognizeElapsedDeferredRevenue(Set<Long> importedReceiptIds) {
        Map<Long, DeferredRevenueSchedule> schedules = scheduleRepository.findAll().stream()
                .filter(s -> importedReceiptIds.contains(s.getReceiptId()))
                .collect(Collectors.toMap(DeferredRevenueSchedule::getId, s -> s));
        List<DeferredRevenueRecognitionLine> due = lineRepository
                .findByStatusAndPeriodEndLessThanEqual("PENDING", LocalDate.now()).stream()
                .filter(l -> schedules.containsKey(l.getScheduleId()))
                .sorted(Comparator.comparing(DeferredRevenueRecognitionLine::getPeriodEnd)
                        .thenComparing(DeferredRevenueRecognitionLine::getId))
                .toList();
        for (DeferredRevenueRecognitionLine line : due) {
            financialEventService.onDeferredRevenueRecognized(line, schedules.get(line.getScheduleId()));
        }
        return due.size();
    }

    private boolean createVoucher(Receipt r, String category) {
        BigDecimal amount = r.getPaidAmount() != null ? r.getPaidAmount() : r.getAmount();
        String source = ("Payment".equals(r.getTransactionType()) ? "Payment Settlement – "
                : "New".equals(r.getTransactionType()) ? "Member Registration – " : "Membership Renewal – ")
                + r.getMemberName();
        return saveVoucher(r.getReceiptNo(), source, category, r.getMemberName(), r.getMemberDbId(), amount,
                r.getPaymentMethod(), r.getPaymentBreakdown(), r.getTransactionDate(), r.getBranchId(),
                r.getPlanName());
    }

    private boolean createAddonVoucher(MemberAddon a) {
        return saveVoucher(a.getTransactionId(), "Add-on Purchase – " + a.getAddonName(), "Add-on",
                a.getMemberName(), a.getMemberDbId(), a.getAmount(), a.getPaymentMode(),
                a.getPaymentBreakdown(), a.getPurchaseDate(), null, a.getNotes());
    }

    private boolean saveVoucher(String reference, String source, String category, String memberName,
                                Long memberDbId, BigDecimal amount, String paymentMode,
                                List<com.company.project.dto.PaymentSplitDTO> breakdown,
                                LocalDateTime date, Long branchId, String notes) {
        Long existing = em.createQuery(
                "SELECT COUNT(v) FROM ReceiptVoucher v WHERE v.reference = :ref", Long.class)
                .setParameter("ref", reference).getSingleResult();
        if (existing > 0) return false;

        // Same shape as ReceiptVoucherService.createVoucherFromModule, minus its
        // per-voucher staff notification — thousands of those for a history import
        // would bury the real ones.
        ReceiptVoucher rv = new ReceiptVoucher();
        rv.setVoucherNo(voucherNumberService.next("RV"));
        rv.setDate(date != null ? date.toLocalDate() : LocalDate.now());
        rv.setSource(source);
        rv.setSourceCategory(category);
        rv.setMemberName(memberName);
        rv.setMemberId(memberDbId);
        rv.setAmount(amount);
        rv.setPaymentMode(paymentMode != null ? paymentMode : "Cash");
        rv.setPaymentBreakdown(breakdown);
        rv.setReference(reference);
        rv.setTransactionId(reference);
        rv.setNotes(notes);
        rv.setStatus("completed");
        rv.setVoucherType("Receipt");
        rv.setSystemGenerated(true);
        if (branchId != null) rv.setBranchId(branchId);
        receiptVoucherRepository.save(rv);
        return true;
    }

    private boolean journaled(String entityType, Long entityId) {
        return journalEntrySourceRepository.existsBySourceEntityTypeAndSourceEntityId(entityType, entityId);
    }

    private static boolean positive(BigDecimal v) {
        return v != null && v.signum() > 0;
    }
}
