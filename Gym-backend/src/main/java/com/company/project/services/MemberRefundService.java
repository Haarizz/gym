package com.company.project.services;

import com.company.project.entities.CreditNote;
import com.company.project.entities.Member;
import com.company.project.entities.MemberAddon;
import com.company.project.entities.MemberDueWriteOff;
import com.company.project.entities.PackageEnrolment;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.CreditNoteRepository;
import com.company.project.repositories.JournalEntrySourceRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.MemberDueWriteOffRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.PackageEnrolmentRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.UserDetailsImpl;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Billing › Refunds: money given back to a member against one of their bills, optionally
 * cancelling the plan. Each refund is a POSTED credit note (source BILLING_REFUND), so it
 * shows on the member statement, profile and timeline like every other refund.
 */
@Service
public class MemberRefundService {

    public static final String SOURCE = "BILLING_REFUND";

    public static final Map<String, String> REASONS = orderedMap(
            "MEMBER_REQUEST", "Member asked to cancel",
            "MEDICAL", "Medical reasons",
            "RELOCATION", "Moving away",
            "SERVICE_ISSUE", "Unhappy with the service",
            "DUPLICATE_PAYMENT", "Paid twice / overpaid",
            "BILLING_ERROR", "Billing mistake",
            "GOODWILL", "Goodwill gesture",
            "OTHER", "Other");

    /** How the money goes back. Wallet = credit on the member's wallet, no cash leaves. */
    public static final List<String> METHODS = List.of("Cash", "Card", "Bank Transfer", "Online", "Wallet");

    private static final Set<String> MEMBERSHIP_TYPES = Set.of("New", "Renewal");
    private static final Set<String> SERVICE_TYPES = Set.of(ReceiptService.TXN_ADDON, ReceiptService.TXN_CLASS_BOOKING);
    private static final Set<String> NOT_REFUNDABLE_STATUSES = Set.of("Cancelled", "Rejected");

    // ── API shapes (snake_case on the wire) ─────────────────────────────────────

    public record RefundRequest(Long receiptId, BigDecimal amount, String method, String bankAccountCode,
                                String bankAccountName, String reference, String reasonCode, String notes,
                                Boolean cancelPlan) {}

    public record Bill(Long id, String receiptNo, String invoiceNo, OffsetDateTime date, String type, String planName,
                       OffsetDateTime validFrom, OffsetDateTime validTill, BigDecimal amount, BigDecimal paid,
                       BigDecimal refunded, BigDecimal refundable, BigDecimal due, String status,
                       boolean canCancel, boolean currentPeriod, boolean notStarted, String paymentMethod,
                       String blockedReason) {}

    public record MemberBills(Long memberDbId, String memberId, String name, String phone, String photoUrl,
                              String plan, OffsetDateTime endDate, BigDecimal walletBalance,
                              BigDecimal outstanding, BigDecimal totalRefundable, BigDecimal totalRefunded,
                              List<Bill> bills, List<Refund> refunds) {}

    public record Refund(Long id, String voucherNo, LocalDate date, OffsetDateTime createdAt, Long memberDbId,
                         String memberCode, String memberName, String memberPhone, Long receiptId, String receiptNo,
                         String invoiceNo, String billType, String planName, BigDecimal amount, BigDecimal subtotal,
                         BigDecimal tax, String method, String bankAccountName, String reference, String reasonCode,
                         String reasonLabel, String reason, String notes, boolean cancelledPlan, BigDecimal dueCleared,
                         String refundedBy, String source, Long journalVoucherId) {}

    public record Slice(String key, String label, long count, BigDecimal amount) {}

    public record Summary(long count, BigDecimal amount, long members, long cancelledPlans, BigDecimal average,
                          List<Slice> byMethod, List<Slice> byReason, List<Slice> byType) {}

    public record RefundPage(List<Refund> rows, long total, int page, int limit, Summary summary) {}

    public record Option(String code, String label) {}

    public record Options(List<Option> reasons, List<String> methods) {}

    private final ReceiptRepository receipts;
    private final MemberRepository members;
    private final CreditNoteRepository creditNotes;
    private final MemberDueWriteOffRepository writeOffs;
    private final MemberAddonRepository addons;
    private final PackageEnrolmentRepository enrolments;
    private final JournalEntrySourceRepository journalSources;
    private final StaffRepository staff;
    private final FinancialEventService financialEvents;
    private final DeferredRevenueScheduleService deferredRevenue;
    private final WalletService wallets;
    private final VoucherNumberService voucherNumbers;

    public MemberRefundService(ReceiptRepository receipts, MemberRepository members, CreditNoteRepository creditNotes,
                               MemberDueWriteOffRepository writeOffs, MemberAddonRepository addons,
                               PackageEnrolmentRepository enrolments, JournalEntrySourceRepository journalSources,
                               StaffRepository staff, FinancialEventService financialEvents,
                               DeferredRevenueScheduleService deferredRevenue, WalletService wallets,
                               VoucherNumberService voucherNumbers) {
        this.receipts = receipts;
        this.members = members;
        this.creditNotes = creditNotes;
        this.writeOffs = writeOffs;
        this.addons = addons;
        this.enrolments = enrolments;
        this.journalSources = journalSources;
        this.staff = staff;
        this.financialEvents = financialEvents;
        this.deferredRevenue = deferredRevenue;
        this.wallets = wallets;
        this.voucherNumbers = voucherNumbers;
    }

    public Options options() {
        return new Options(REASONS.entrySet().stream().map(e -> new Option(e.getKey(), e.getValue())).toList(), METHODS);
    }

    // ── A member's refundable bills ────────────────────────────────────────────

    @Transactional(readOnly = true)
    public MemberBills memberBills(Long memberDbId) {
        Member m = members.findById(memberDbId)
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + memberDbId));
        List<Receipt> all = receipts.findByMemberDbIdOrderByTransactionDateAsc(memberDbId);
        List<CreditNote> notes = creditNotes.findByMemberDbIdOrderByDateAscIdAsc(memberDbId).stream()
                .filter(MemberRefundService::counts).toList();
        Map<Long, BigDecimal> refundedByBill = new HashMap<>();
        for (CreditNote n : notes) {
            if (n.getLinkedReceiptId() != null) refundedByBill.merge(n.getLinkedReceiptId(), total(n), BigDecimal::add);
        }
        LocalDateTime now = LocalDateTime.now();
        List<Bill> bills = new ArrayList<>();
        BigDecimal totalRefundable = BigDecimal.ZERO;
        for (int i = all.size() - 1; i >= 0; i--) {
            Receipt r = all.get(i);
            if (!isBill(r)) continue;
            BigDecimal paid = PendingPaymentService.paidToDate(r);
            BigDecimal refunded = money(refundedByBill.getOrDefault(r.getId(), BigDecimal.ZERO));
            if (paid.signum() <= 0 && refunded.signum() <= 0) continue;
            String blocked = blockedReason(r);
            BigDecimal refundable = blocked != null ? BigDecimal.ZERO : paid.subtract(refunded).max(BigDecimal.ZERO);
            boolean current = r.getValidFrom() != null && r.getValidTill() != null
                    && !r.getValidFrom().isAfter(now) && r.getValidTill().isAfter(now);
            boolean notStarted = r.getValidFrom() != null && r.getValidFrom().isAfter(now);
            bills.add(new Bill(r.getId(), r.getReceiptNo(), r.getInvoiceNo(), utc(r.getTransactionDate()),
                    r.getTransactionType(), r.getPlanName(), utc(r.getValidFrom()), utc(r.getValidTill()),
                    money(r.getAmount()), paid, refunded, refundable, PendingPaymentService.owed(r), r.getStatus(),
                    blocked == null, current, notStarted, r.getPaymentMethod(), blocked));
            totalRefundable = totalRefundable.add(refundable);
        }
        Map<Long, Receipt> byId = all.stream().collect(Collectors.toMap(Receipt::getId, r -> r, (a, b) -> a));
        List<Refund> history = notes.stream()
                .sorted(Comparator.comparing(CreditNote::getDate).thenComparing(CreditNote::getId).reversed())
                .map(n -> toRefund(n, n.getLinkedReceiptId() == null ? null : byId.get(n.getLinkedReceiptId()), m))
                .toList();
        BigDecimal totalRefunded = notes.stream().map(MemberRefundService::total).reduce(BigDecimal.ZERO, BigDecimal::add);
        LocalDateTime end = m.getMembershipEndDate() != null ? m.getMembershipEndDate() : m.getExpiryDate();
        return new MemberBills(m.getId(), m.getMemberId(), m.getName(), m.getPhone(), m.getPhotoUrl(),
                m.getMembershipPlan(), utc(end), money(m.getWalletBalance()), money(m.getOutstandingBalance()),
                money(totalRefundable), money(totalRefunded), bills, history);
    }

    // ── Make a refund ──────────────────────────────────────────────────────────

    @Transactional
    public Refund refund(RefundRequest req) {
        if (BranchContextHolder.getActiveBranchId() == null) {
            throw new BusinessRuleViolationException("Select a branch first: refunds can't be made in All Branches mode.");
        }
        if (req == null || req.receiptId() == null) throw new BusinessRuleViolationException("Choose the bill to refund.");

        // Locked until commit, so two refunds of the same bill can't both pass the cap.
        Receipt bill = receipts.findByIdForUpdate(req.receiptId())
                .orElseThrow(() -> new EntityNotFoundException("Bill not found: " + req.receiptId()));
        if (!isBill(bill)) throw new BusinessRuleViolationException("This receipt is a settlement, not a bill — refund the bill it paid.");
        String blocked = blockedReason(bill);
        if (blocked != null) throw new BusinessRuleViolationException(blocked);
        if (bill.getMemberDbId() == null) throw new BusinessRuleViolationException("This bill isn't linked to a member.");
        Member member = members.findById(bill.getMemberDbId())
                .orElseThrow(() -> new EntityNotFoundException("Member not found: " + bill.getMemberDbId()));

        BigDecimal amount = req.amount() == null ? BigDecimal.ZERO : req.amount().setScale(2, RoundingMode.HALF_UP);
        if (amount.signum() <= 0) throw new BusinessRuleViolationException("Enter the amount to refund.");
        BigDecimal paid = PendingPaymentService.paidToDate(bill);
        BigDecimal refunded = creditNotes.findByLinkedReceiptId(bill.getId()).stream()
                .filter(MemberRefundService::counts).map(MemberRefundService::total)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal refundable = paid.subtract(refunded).max(BigDecimal.ZERO);
        if (amount.compareTo(refundable) > 0) {
            throw new BusinessRuleViolationException("At most " + plain(refundable) + " can be refunded on this bill"
                    + (refunded.signum() > 0 ? " (" + plain(refunded) + " was already refunded)." : "."));
        }

        String method = METHODS.stream().filter(x -> x.equalsIgnoreCase(trim(req.method()))).findFirst()
                .orElseThrow(() -> new BusinessRuleViolationException("Choose how the money goes back to the member."));
        if ("Wallet".equals(method) && !StringUtils.hasText(member.getMemberId())) {
            throw new BusinessRuleViolationException("This member has no wallet — refund by another method.");
        }
        String reasonCode = trim(req.reasonCode()).toUpperCase(Locale.ROOT);
        if (!REASONS.containsKey(reasonCode)) throw new BusinessRuleViolationException("Choose a reason for the refund.");
        String notes = trim(req.notes());
        if ("OTHER".equals(reasonCode) && notes.isEmpty()) {
            throw new BusinessRuleViolationException("Add a note explaining the refund when the reason is Other.");
        }
        if (notes.length() > 1000) notes = notes.substring(0, 1000);
        boolean cancelPlan = Boolean.TRUE.equals(req.cancelPlan());

        BigDecimal[] split = financialEvents.vatSplit(amount, bill.getBranchId());
        boolean membership = MEMBERSHIP_TYPES.contains(bill.getTransactionType());
        String revenueAccount = SERVICE_TYPES.contains(bill.getTransactionType())
                ? FinancialEventService.ACC_SERVICE_REVENUE : FinancialEventService.ACC_MEMBERSHIP_REVENUE;

        CreditNote n = new CreditNote();
        n.setVoucherNo(voucherNumbers.next("CN"));
        n.setDate(LocalDate.now());
        n.setMemberDbId(member.getId());
        n.setMemberName(member.getName());
        n.setLinkedReceiptId(bill.getId());
        n.setReason(REASONS.get(reasonCode) + (notes.isEmpty() ? "" : " — " + notes));
        n.setReasonCode(reasonCode);
        n.setNotes(notes.isEmpty() ? null : notes);
        n.setSubtotal(split[0]);
        n.setTaxAmount(split[1]);
        n.setTotalAmount(amount);
        n.setRefundMethod(method);
        if ("Bank Transfer".equals(method) || "Online".equals(method)) {
            n.setBankAccountCode(blankToNull(req.bankAccountCode()));
            n.setBankAccountName(blankToNull(req.bankAccountName()));
        }
        String reference = trim(req.reference());
        n.setRefundReference(reference.isEmpty() ? null : (reference.length() > 120 ? reference.substring(0, 120) : reference));
        n.setStatus("POSTED");
        n.setSource(SOURCE);
        n.setCancelledPlan(cancelPlan);
        n.setBranchId(bill.getBranchId());
        n = creditNotes.save(n);

        BigDecimal[] deferral = membership
                ? deferredRevenue.applyRefund(bill.getId(), split[0], cancelPlan)
                : new BigDecimal[] { BigDecimal.ZERO, BigDecimal.ZERO };
        financialEvents.onMemberRefund(n, revenueAccount, deferral[0], deferral[1]);

        if ("Wallet".equals(method)) {
            wallets.credit(member.getMemberId(), amount, "REFUND", n.getId(),
                    "Refund " + n.getVoucherNo() + " — " + describe(bill));
        }

        if (cancelPlan) {
            BigDecimal due = PendingPaymentService.owed(bill);
            if (due.signum() > 0 && !writeOffs.existsByReceiptId(bill.getId())) {
                bill.setWrittenOffAmount(due);
                BigDecimal left = money(member.getOutstandingBalance()).subtract(due).max(BigDecimal.ZERO);
                member.setOutstandingBalance(left);
                if (left.signum() == 0) member.setPaymentStatus("paid");
                writeOffs.save(writeOffFor(bill, member, due, n.getVoucherNo()));
                n.setDueCleared(due);
            }
            bill.setStatus("Cancelled");
            receipts.save(bill);
            cancelAddons(bill, refunded.add(amount));
            if (membership) rollBackMembership(member, bill);
            members.save(member);
            n = creditNotes.save(n);
        }
        return toRefund(n, bill, member);
    }

    // ── History ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RefundPage list(LocalDate from, LocalDate to, String search, String method, String reason, int page, int limit) {
        LocalDate f = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate t = to != null ? to : LocalDate.now();
        if (t.isBefore(f)) { LocalDate x = f; f = t; t = x; }
        List<CreditNote> notes = creditNotes.findByMemberDbIdIsNotNullAndDateBetweenOrderByDateDescIdDesc(f, t).stream()
                .filter(MemberRefundService::counts).toList();

        Map<Long, Receipt> bills = byId(receipts.findAllById(notes.stream().map(CreditNote::getLinkedReceiptId)
                .filter(Objects::nonNull).collect(Collectors.toSet())), Receipt::getId);
        Map<Long, Member> people = byId(members.findAllById(notes.stream().map(CreditNote::getMemberDbId)
                .filter(Objects::nonNull).collect(Collectors.toSet())), Member::getId);
        List<Refund> rows = notes.stream()
                .map(n -> toRefund(n, n.getLinkedReceiptId() == null ? null : bills.get(n.getLinkedReceiptId()),
                        people.get(n.getMemberDbId())))
                .toList();

        String q = trim(search).toLowerCase(Locale.ROOT);
        String m = trim(method);
        String rc = trim(reason).toUpperCase(Locale.ROOT);
        List<Refund> filtered = rows.stream()
                .filter(r -> q.isEmpty() || contains(r.memberName(), q) || contains(r.memberCode(), q)
                        || contains(r.memberPhone(), q) || contains(r.voucherNo(), q) || contains(r.receiptNo(), q)
                        || contains(r.invoiceNo(), q) || contains(r.planName(), q))
                .filter(r -> m.isEmpty() || m.equalsIgnoreCase(r.method()))
                .filter(r -> rc.isEmpty() || rc.equals(r.reasonCode()))
                .toList();

        int size = Math.max(1, Math.min(limit <= 0 ? 25 : limit, 200));
        int p = Math.max(1, page);
        List<Refund> shown = filtered.stream().skip((long) (p - 1) * size).limit(size).toList();
        return new RefundPage(shown, filtered.size(), p, size, summarize(filtered));
    }

    @Transactional(readOnly = true)
    public Refund get(Long id) {
        CreditNote n = creditNotes.findById(id).orElseThrow(() -> new EntityNotFoundException("Refund not found: " + id));
        Receipt bill = n.getLinkedReceiptId() == null ? null : receipts.findById(n.getLinkedReceiptId()).orElse(null);
        Member m = n.getMemberDbId() == null ? null : members.findById(n.getMemberDbId()).orElse(null);
        return toRefund(n, bill, m);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    private Summary summarize(List<Refund> rows) {
        BigDecimal amount = rows.stream().map(Refund::amount).reduce(BigDecimal.ZERO, BigDecimal::add);
        long people = rows.stream().map(Refund::memberDbId).filter(Objects::nonNull).distinct().count();
        long cancelled = rows.stream().filter(Refund::cancelledPlan).count();
        BigDecimal avg = rows.isEmpty() ? BigDecimal.ZERO
                : amount.divide(BigDecimal.valueOf(rows.size()), 2, RoundingMode.HALF_UP);
        return new Summary(rows.size(), money(amount), people, cancelled, avg,
                slices(rows, r -> Objects.toString(r.method(), "Cash"), k -> k),
                slices(rows, r -> Objects.toString(r.reasonCode(), "OTHER"),
                        k -> REASONS.getOrDefault(k, "Other")),
                slices(rows, r -> Objects.toString(r.billType(), "Other"), MemberRefundService::typeLabel));
    }

    private static List<Slice> slices(List<Refund> rows, Function<Refund, String> key, Function<String, String> label) {
        Map<String, List<Refund>> groups = rows.stream().collect(Collectors.groupingBy(key, LinkedHashMap::new, Collectors.toList()));
        return groups.entrySet().stream()
                .map(e -> new Slice(e.getKey(), label.apply(e.getKey()), e.getValue().size(),
                        money(e.getValue().stream().map(Refund::amount).reduce(BigDecimal.ZERO, BigDecimal::add))))
                .sorted(Comparator.comparing(Slice::amount).reversed())
                .toList();
    }

    /** The cancelled period no longer counts: the member's end date goes back. */
    private void rollBackMembership(Member member, Receipt bill) {
        LocalDateTime end = member.getMembershipEndDate() != null ? member.getMembershipEndDate() : member.getExpiryDate();
        if (bill.getValidTill() == null || end == null) return;
        // Only when this bill's period is the one the member is on (or about to start) —
        // cancelling an old, finished period doesn't change today's dates.
        if (end.toLocalDate().isBefore(bill.getValidTill().toLocalDate().minusDays(1))) return;
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime newEnd;
        if (bill.getValidFrom() != null && bill.getValidFrom().isAfter(now)) {
            // Not started yet (an early renewal): back to the end of the period before it.
            newEnd = bill.getValidFrom();
            previousPlan(member.getId(), bill).ifPresent(member::setMembershipPlan);
        } else {
            // Started: the membership ends today.
            newEnd = LocalDate.now().atStartOfDay();
        }
        member.setMembershipEndDate(newEnd);
        member.setExpiryDate(newEnd);
    }

    private Optional<String> previousPlan(Long memberDbId, Receipt bill) {
        return receipts.findByMemberDbIdOrderByTransactionDateAsc(memberDbId).stream()
                .filter(r -> !r.getId().equals(bill.getId()))
                .filter(r -> MEMBERSHIP_TYPES.contains(r.getTransactionType()))
                .filter(r -> !NOT_REFUNDABLE_STATUSES.contains(Objects.toString(r.getStatus(), "")))
                .filter(r -> r.getValidTill() != null && bill.getValidFrom() != null
                        && !r.getValidTill().toLocalDate().isAfter(bill.getValidFrom().toLocalDate().plusDays(1)))
                .reduce((a, b) -> b)
                .map(Receipt::getPlanName)
                .filter(StringUtils::hasText);
    }

    /** Add-ons (and PT packages) paid by a cancelled bill are cancelled with it; the refund already went back. */
    private void cancelAddons(Receipt bill, BigDecimal refundedTotal) {
        LocalDateTime now = LocalDateTime.now();
        for (MemberAddon a : addons.findByReceiptId(bill.getId())) {
            if (AddonPaymentService.STATUS_CANCELLED.equalsIgnoreCase(a.getStatus())) continue;
            a.setStatus(AddonPaymentService.STATUS_CANCELLED);
            if (a.getRefundedAt() == null) {
                a.setRefundedAt(now);
                a.setRefundedAmount(refundedTotal);
            }
            addons.save(a);
            enrolments.findByMemberAddonId(a.getId()).ifPresent(e -> {
                if (!PackageEnrolment.STATUS_CANCELLED.equals(e.getStatus())) {
                    e.setStatus(PackageEnrolment.STATUS_CANCELLED);
                    e.setCancelledAt(now);
                    enrolments.save(e);
                }
            });
        }
    }

    private MemberDueWriteOff writeOffFor(Receipt bill, Member member, BigDecimal due, String voucherNo) {
        MemberDueWriteOff w = new MemberDueWriteOff();
        w.setBranchId(bill.getBranchId());
        w.setReceiptId(bill.getId());
        w.setReceiptNo(bill.getReceiptNo());
        w.setInvoiceNo(bill.getInvoiceNo());
        w.setMemberDbId(member.getId());
        w.setMemberCode(bill.getMemberId());
        w.setMemberName(bill.getMemberName());
        w.setMemberPhone(bill.getMemberPhone());
        w.setBillDescription(describe(bill));
        w.setBillDate(bill.getTransactionDate());
        w.setDueDate(bill.getDueDate() != null ? bill.getDueDate() : bill.getTransactionDate());
        w.setOriginalAmount(money(bill.getAmount()));
        w.setPaidAmount(PendingPaymentService.paidToDate(bill));
        w.setWrittenOffAmount(due);
        w.setReason("DISCONTINUED");
        w.setNotes("Plan cancelled with refund " + voucherNo);
        w.setWrittenOffBy(currentStaffName());
        w.setWrittenOffAt(LocalDateTime.now());
        return w;
    }

    private Refund toRefund(CreditNote n, Receipt bill, Member m) {
        Long jvId = journalSources.findBySourceEntityTypeAndSourceEntityId("CreditNote", n.getId())
                .map(s -> s.getJournalVoucherId()).orElse(null);
        String code = n.getReasonCode() != null ? n.getReasonCode() : null;
        return new Refund(n.getId(), n.getVoucherNo(), n.getDate(),
                utc(n.getCreatedAt() != null ? n.getCreatedAt() : (n.getDate() != null ? n.getDate().atStartOfDay() : null)),
                n.getMemberDbId(), m != null ? m.getMemberId() : (bill != null ? bill.getMemberId() : null),
                n.getMemberName() != null ? n.getMemberName() : (m != null ? m.getName() : null),
                m != null ? m.getPhone() : (bill != null ? bill.getMemberPhone() : null),
                n.getLinkedReceiptId(), bill != null ? bill.getReceiptNo() : null, bill != null ? bill.getInvoiceNo() : null,
                bill != null ? bill.getTransactionType() : null, bill != null ? bill.getPlanName() : null,
                total(n), money(n.getSubtotal()), money(n.getTaxAmount()), n.getRefundMethod(), n.getBankAccountName(),
                n.getRefundReference(), code, code != null ? REASONS.getOrDefault(code, code) : null, n.getReason(),
                n.getNotes(),
                // Imported refunds carry no flag: their bill being cancelled is what says the plan went.
                n.isCancelledPlan() || (n.getSource() == null && bill != null && "Cancelled".equalsIgnoreCase(bill.getStatus())),
                n.getDueCleared(), n.getCreatedBy(), n.getSource(), jvId);
    }

    /** Refunds that really happened: posted, or imported from the old system (kept as drafts). */
    static boolean counts(CreditNote n) {
        String st = n.getStatus() == null ? "" : n.getStatus().toUpperCase(Locale.ROOT);
        return "POSTED".equals(st)
                || ("DRAFT".equals(st) && LegacyImportLedgerService.IMPORT_MARKER.equals(n.getCreatedBy()));
    }

    private static boolean isBill(Receipt r) {
        return r.getTransactionType() != null && !"Payment".equalsIgnoreCase(r.getTransactionType());
    }

    private static String blockedReason(Receipt r) {
        String status = Objects.toString(r.getStatus(), "");
        if ("Cancelled".equalsIgnoreCase(status)) return "This bill is already cancelled.";
        if ("Rejected".equalsIgnoreCase(status)) return "This payment was rejected, so there is nothing to refund.";
        String approval = Objects.toString(r.getApprovalStatus(), "").toUpperCase(Locale.ROOT);
        if ("PENDING".equals(approval)) return "This payment is still waiting for approval.";
        if ("REJECTED".equals(approval)) return "This payment was rejected, so there is nothing to refund.";
        return null;
    }

    private static String describe(Receipt r) {
        String label = typeLabel(r.getTransactionType());
        return StringUtils.hasText(r.getPlanName()) ? label + " · " + r.getPlanName() : label;
    }

    static String typeLabel(String type) {
        if (type == null) return "Bill";
        return switch (type) {
            case "New" -> "New membership";
            case "Renewal" -> "Renewal";
            case "Add-on" -> "Add-on";
            case "Daily Entry" -> "Day pass";
            case "Class Booking" -> "Class booking";
            default -> type;
        };
    }

    private String currentStaffName() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return "System";
        if (auth.getPrincipal() instanceof UserDetailsImpl user && user.getId() != null) {
            Optional<String> name = staff.findNameByUserId(user.getId()).stream().filter(StringUtils::hasText).findFirst();
            if (name.isPresent()) return name.get();
        }
        return auth.getName();
    }

    private static <T> Map<Long, T> byId(Collection<T> items, Function<T, Long> id) {
        return items.stream().collect(Collectors.toMap(id, x -> x, (a, b) -> a));
    }

    private static boolean contains(String s, String q) {
        return s != null && s.toLowerCase(Locale.ROOT).contains(q);
    }

    private static BigDecimal total(CreditNote n) {
        return money(n.getTotalAmount() != null ? n.getTotalAmount() : n.getSubtotal());
    }

    private static BigDecimal money(BigDecimal v) {
        return (v == null ? BigDecimal.ZERO : v).setScale(2, RoundingMode.HALF_UP);
    }

    private static String plain(BigDecimal v) {
        return money(v).stripTrailingZeros().toPlainString();
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }

    private static String blankToNull(String s) {
        return StringUtils.hasText(s) ? s.trim() : null;
    }

    private static OffsetDateTime utc(LocalDateTime t) {
        return t == null ? null : t.atOffset(ZoneOffset.UTC);
    }

    private static Map<String, String> orderedMap(String... kv) {
        Map<String, String> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put(kv[i], kv[i + 1]);
        return java.util.Collections.unmodifiableMap(m);
    }
}
