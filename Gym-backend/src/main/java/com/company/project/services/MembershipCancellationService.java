package com.company.project.services;

import com.company.project.dto.SettlePaymentRequestDTO;
import com.company.project.dto.WriteOffRequestDTO;
import com.company.project.entities.Attendance;
import com.company.project.entities.Booking;
import com.company.project.entities.DeactivationReason;
import com.company.project.entities.GymOsSetting;
import com.company.project.entities.Member;
import com.company.project.entities.MemberAddon;
import com.company.project.entities.MemberCancellation;
import com.company.project.entities.MemberNote;
import com.company.project.entities.PackageEnrolment;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.DeactivationReasonRepository;
import com.company.project.repositories.GymOsSettingRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.MemberCancellationRepository;
import com.company.project.repositories.MemberCancellationRequestRepository;
import com.company.project.entities.MemberCancellationRequest;
import com.company.project.repositories.MemberNoteRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.PackageEnrolmentRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.security.UserDetailsImpl;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Members › Cancel membership (agreed 2026-11-13).
 *
 * <ul>
 *   <li>A cancelled member is archived, never deleted: status "cancelled", membership ends
 *       today, future bookings / add-ons / PT packages are cancelled. Bills, refunds and the ledger
 *       stay. The app account stays linked: the app shows the gym as cancelled (MemberAccessState).</li>
 *   <li>With GymOS "Approval Required" on, staff who aren't Admin / Manager only send a request;
 *       approving it carries out exactly what they chose.</li>
 *   <li>A family head is cancelled together with everyone in their household.</li>
 *   <li>Dues must be settled first: collected, written off, taken out of the refund, or the
 *       cancellation is put on hold (membership suspended) until they are cleared. An unpaid
 *       "Expiry Due" bill is simply cancelled — it is a renewal the member will never use.</li>
 *   <li>The refund follows GymOS › Member Deactivation Policy, which is the maximum:
 *       pro-rated (unused days), flat (unused bills less a fixed fee) or none.</li>
 * </ul>
 */
@Service
public class MembershipCancellationService {

    private static final Logger log = LoggerFactory.getLogger(MembershipCancellationService.class);

    public static final String STATUS_CANCELLED = "cancelled";
    public static final String DUES_WRITE_OFF = "WRITE_OFF";
    public static final String DUES_DEDUCT = "DEDUCT";
    /** Cancellation refunds go back as money: a wallet is no use to someone leaving the gym. */
    public static final List<String> METHODS = List.of("Cash", "Card", "Bank Transfer", "Online");

    private static final Set<String> MEMBERSHIP_TYPES = Set.of("New", "Renewal");
    private static final Set<String> OPEN_STATUSES = Set.of("Pending", "Overdue", "Partial");
    private static final Set<String> ADDON_DONE = Set.of("cancelled", "rejected", "expired");

    // ── API shapes (snake_case on the wire) ─────────────────────────────────────

    public record Policy(boolean allowCancellation, boolean allowRefund, String method, BigDecimal cancellationFee,
                         boolean approvalRequired) {}

    public record AddonItem(String name, String category, OffsetDateTime start, OffsetDateTime end, String status,
                            BigDecimal amount) {}

    public record BookingItem(Long id, String name, String type, LocalDate date, LocalTime startTime, boolean paid) {}

    public record PackageItem(String name, Integer sessionsTotal, long sessionsUsed, LocalDate endDate, String status) {}

    public record Person(Long memberDbId, String memberId, String name, String phone, String photoUrl, boolean head,
                         String plan, String status, OffsetDateTime joinDate, OffsetDateTime periodStart,
                         OffsetDateTime periodEnd, long memberForDays, long periodDays, long daysUsed, long daysLeft,
                         long checkIns, long checkInsThisPeriod, OffsetDateTime lastCheckIn, List<AddonItem> addons,
                         List<BookingItem> upcomingBookings, long pastBookings, List<PackageItem> packages,
                         BigDecimal walletBalance, boolean suspended, boolean frozen) {}

    public record DueItem(Long receiptId, String receiptNo, Long memberDbId, String memberName, String type,
                          String description, OffsetDateTime date, BigDecimal amount, BigDecimal paid, BigDecimal owed,
                          boolean expiryDue) {}

    public record QuoteBill(Long receiptId, String receiptNo, String invoiceNo, Long memberDbId, String memberName,
                            String type, String planName, OffsetDateTime validFrom, OffsetDateTime validTill,
                            BigDecimal paid, BigDecimal refunded, BigDecimal refundable, BigDecimal policyAmount,
                            String basis) {}

    public record Hold(OffsetDateTime since, String by, String reason, String notes, boolean wantsRefund) {}

    public record Preview(Long memberDbId, String memberId, String name, String photoUrl, String status,
                          Policy policy, List<String> reasons, List<Person> household,
                          List<DueItem> dues, BigDecimal duesTotal, BigDecimal expiryDuesTotal,
                          List<QuoteBill> refundBills, BigDecimal refundableTotal, BigDecimal policySubtotal,
                          BigDecimal cancellationFee, BigDecimal policyTotal, BigDecimal walletTotal,
                          boolean canCancel, String blockedReason, boolean canRefund, String refundBlockedReason,
                          Hold hold, boolean billedToHead, String headName, List<String> refundMethods,
                          boolean needsApproval, PendingRequest pendingRequest) {}

    /** A cancellation waiting for approval. */
    public record PendingRequest(Long id, boolean withRefund, BigDecimal refundAmount, String refundMethod,
                                 String duesAction, String reason, String notes, String requestedBy,
                                 OffsetDateTime requestedAt) {}

    /** One row of the Approvals › Cancellations queue (or its history). */
    public record RequestRow(Long id, Long memberDbId, String memberCode, String memberName, String photoUrl,
                             String plan, int householdSize, boolean withRefund, BigDecimal refundAmount,
                             BigDecimal policyAmount, String refundMethod, String duesAction, BigDecimal duesAmount,
                             String reason, String notes, String status, String requestedBy,
                             OffsetDateTime requestedAt, String decidedBy, OffsetDateTime decidedAt,
                             String decisionNote) {}

    /** Cancel without a refund. duesAction: WRITE_OFF, or null when nothing is owed. */
    public record CancelRequest(String reason, String notes, String duesAction) {}

    /** Put the cancellation on hold until the dues are cleared. */
    public record HoldRequest(String reason, String notes, Boolean wantsRefund) {}

    /** Cancel with a refund (Billing › Refunds). amount is the total, at most the policy amount. */
    public record RefundCancelRequest(String reason, String notes, String duesAction, BigDecimal amount, String method,
                                      String bankAccountCode, String bankAccountName, String reference,
                                      String refundReasonCode) {}

    /** outcome: CANCELLED, or PENDING_APPROVAL (then only requestId is meaningful). */
    public record Result(String outcome, Long cancellationId, Long requestId, List<String> members, BigDecimal refundAmount,
                         BigDecimal duesWrittenOff, BigDecimal duesDeducted, BigDecimal netPaidOut,
                         BigDecimal expiryDuesCancelled, BigDecimal revenueKept, int bookingsCancelled,
                         int addonsCancelled, List<MemberRefundService.Refund> refunds) {}

    /** Published when a member's dues go down (paid or written off): a held cancellation may now finish. */
    public record DuesClearedEvent(Long memberDbId) {}

    private final MemberRepository members;
    private final ReceiptRepository receipts;
    private final AttendanceRepository attendance;
    private final BookingRepository bookings;
    private final MemberAddonRepository addons;
    private final PackageEnrolmentRepository enrolments;
    private final GymOsSettingRepository settings;
    private final DeactivationReasonRepository reasons;
    private final MemberCancellationRepository cancellations;
    private final MemberNoteRepository notes;
    private final StaffRepository staff;
    private final MemberRefundService refunds;
    private final PendingPaymentService pendingPayments;
    private final ReceiptService receiptService;
    private final BookingService bookingService;
    private final AddonPaymentService addonPayments;
    private final DeferredRevenueScheduleService deferredRevenue;
    private final FinancialEventService financialEvents;
    private final NotificationService notifications;
    private final MemberCancellationRequestRepository requests;

    public MembershipCancellationService(MemberRepository members, ReceiptRepository receipts,
                                         AttendanceRepository attendance, BookingRepository bookings,
                                         MemberAddonRepository addons, PackageEnrolmentRepository enrolments,
                                         GymOsSettingRepository settings, DeactivationReasonRepository reasons,
                                         MemberCancellationRepository cancellations, MemberNoteRepository notes,
                                         StaffRepository staff, MemberRefundService refunds,
                                         PendingPaymentService pendingPayments, ReceiptService receiptService,
                                         BookingService bookingService, AddonPaymentService addonPayments,
                                         DeferredRevenueScheduleService deferredRevenue,
                                         FinancialEventService financialEvents, NotificationService notifications,
                                         MemberCancellationRequestRepository requests) {
        this.members = members;
        this.receipts = receipts;
        this.attendance = attendance;
        this.bookings = bookings;
        this.addons = addons;
        this.enrolments = enrolments;
        this.settings = settings;
        this.reasons = reasons;
        this.cancellations = cancellations;
        this.notes = notes;
        this.staff = staff;
        this.refunds = refunds;
        this.pendingPayments = pendingPayments;
        this.receiptService = receiptService;
        this.bookingService = bookingService;
        this.addonPayments = addonPayments;
        this.deferredRevenue = deferredRevenue;
        this.financialEvents = financialEvents;
        this.notifications = notifications;
        this.requests = requests;
    }

    // ── Review ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public Preview preview(Long memberDbId) {
        Member subject = member(memberDbId);
        Policy policy = policy();
        List<Member> household = household(subject);
        LocalDateTime now = LocalDateTime.now();

        List<Person> people = household.stream().map(m -> person(m, m == subject && household.size() > 1, now)).toList();

        List<Receipt> open = openBills(household);
        List<DueItem> dues = open.stream().map(MembershipCancellationService::dueItem).toList();
        BigDecimal duesTotal = sum(dues.stream().filter(d -> !d.expiryDue()).map(DueItem::owed));
        BigDecimal expiryTotal = sum(dues.stream().filter(DueItem::expiryDue).map(DueItem::owed));

        Quote quote = quote(household, policy, now);

        String blocked = blockedReason(subject, policy);
        String refundBlocked = null;
        if (!policy.allowRefund() || "none".equals(policy.method())) {
            refundBlocked = "The gym's cancellation policy gives no refunds (GymOS › Member Deactivation Policy).";
        } else if (subject.isEffectivelyBilledToHead() && quote.bills.isEmpty()) {
            refundBlocked = subject.getName() + "'s fees are billed to their family head — refund from the head's bills.";
        } else if (quote.total.signum() <= 0) {
            refundBlocked = quote.refundable.signum() > 0
                    ? "Under the cancellation policy nothing is left to refund — the paid periods are used up."
                    : "Nothing has been paid that can still be refunded.";
        }

        Hold hold = subject.isOnCancellationHold()
                ? new Hold(utc(subject.getCancellationHoldAt()), subject.getCancellationHoldBy(),
                        subject.getCancellationReason(), subject.getCancellationNotes(), subject.isCancellationHoldRefund())
                : null;
        Member head = familyHead(subject);
        List<String> reasonList = reasons.findAllByOrderBySortOrderAsc().stream()
                .filter(DeactivationReason::isActive).map(DeactivationReason::getReason).toList();
        BigDecimal wallet = sum(household.stream().map(m -> money(m.getWalletBalance())));

        return new Preview(subject.getId(), subject.getMemberId(), subject.getName(), subject.getPhotoUrl(),
                subject.getMembershipStatus(), policy, reasonList, people, dues, duesTotal, expiryTotal,
                quote.bills, quote.refundable, quote.subtotal, quote.fee, quote.total, wallet,
                blocked == null, blocked, blocked == null && refundBlocked == null, refundBlocked, hold,
                subject.isEffectivelyBilledToHead(), head != null ? head.getName() : null, METHODS,
                policy.approvalRequired() && !isApprover(),
                requests.findFirstByMemberDbIdAndStatus(subject.getId(), MemberCancellationRequest.STATUS_PENDING)
                        .map(MembershipCancellationService::pending).orElse(null));
    }

    // ── Cancel without a refund ───────────────────────────────────────────────

    @Transactional
    public Result cancel(Long memberDbId, CancelRequest req) {
        requireBranch();
        Member subject = member(memberDbId);
        Policy policy = policy();
        requireCancellable(subject, policy);
        requireNoPendingRequest(subject);
        if (policy.approvalRequired() && !isApprover()) {
            String reason = requireReason(req.reason());
            List<Member> household = household(subject);
            BigDecimal dues = checkDuesChoice(household, req.duesAction(), false, BigDecimal.ZERO);
            return requestApproval(subject, household, false, BigDecimal.ZERO, BigDecimal.ZERO, null, null, null, null,
                    null, req.duesAction(), dues, reason, req.notes());
        }
        return doCancel(subject, policy, req);
    }

    private Result doCancel(Member subject, Policy policy, CancelRequest req) {
        String reason = requireReason(req.reason());
        List<Member> household = household(subject);

        Settled settled = settleDues(household, req.duesAction(), false, BigDecimal.ZERO, null);
        Applied applied = cancelHousehold(subject, household, reason, req.notes(), Set.of());

        MemberCancellation row = record(subject, household, false, BigDecimal.ZERO, BigDecimal.ZERO, policy,
                List.of(), settled, applied, reason, req.notes());
        return result(row, household, BigDecimal.ZERO, settled, applied, List.of());
    }

    // ── Cancel with a refund ──────────────────────────────────────────────────

    @Transactional
    public Result cancelWithRefund(Long memberDbId, RefundCancelRequest req) {
        requireBranch();
        Member subject = member(memberDbId);
        Policy policy = policy();
        requireCancellable(subject, policy);
        requireNoPendingRequest(subject);
        if (policy.approvalRequired() && !isApprover()) {
            String reason = requireReason(req.reason());
            List<Member> household = household(subject);
            Quote quote = quote(household, policy, LocalDateTime.now());
            BigDecimal amount = checkRefund(policy, quote, req);
            String method = refundMethod(req.method());
            BigDecimal dues = checkDuesChoice(household, req.duesAction(), true, amount);
            return requestApproval(subject, household, true, amount, quote.total, method, req.bankAccountCode(),
                    req.bankAccountName(), req.reference(), req.refundReasonCode(), req.duesAction(), dues, reason, req.notes());
        }
        return doCancelWithRefund(subject, policy, req);
    }

    private Result doCancelWithRefund(Member subject, Policy policy, RefundCancelRequest req) {
        String reason = requireReason(req.reason());
        List<Member> household = household(subject);
        LocalDateTime now = LocalDateTime.now();

        Quote quote = quote(household, policy, now);
        BigDecimal amount = checkRefund(policy, quote, req);
        String method = refundMethod(req.method());
        String refundReason = StringUtils.hasText(req.refundReasonCode())
                ? req.refundReasonCode().trim().toUpperCase(Locale.ROOT) : "MEMBER_REQUEST";

        // Dues first: taking them out of the refund pays the bills before they are refunded,
        // so cancelling those bills doesn't write the same money off.
        Settled settled = settleDues(household, req.duesAction(), true, amount, method);

        // Split the refund over the bills in proportion to what the policy allows on each.
        Map<Long, BigDecimal> split = allocate(quote.bills, quote.total, amount);
        String refundNotes = "Membership cancelled — " + reason + (StringUtils.hasText(req.notes()) ? ". " + req.notes().trim() : "");
        List<MemberRefundService.Refund> made = new ArrayList<>();
        for (Map.Entry<Long, BigDecimal> e : split.entrySet()) {
            if (e.getValue().signum() <= 0) continue;
            made.add(refunds.refund(new MemberRefundService.RefundRequest(e.getKey(), e.getValue(), method,
                    req.bankAccountCode(), req.bankAccountName(), req.reference(), refundReason, refundNotes, true)));
        }
        Set<Long> refundedBills = split.keySet();

        Applied applied = cancelHousehold(subject, household, reason, req.notes(), refundedBills);
        MemberCancellation row = record(subject, household, true, amount, quote.total, policy, made, settled, applied,
                reason, req.notes());
        return result(row, household, amount, settled, applied, made);
    }

    // ── Approval (GymOS › Member Deactivation Policy › Approval Required) ─────

    /** Admins and managers decide; everyone else's cancellations wait for them when approval is on. */
    private static final Set<String> APPROVER_ROLES = Set.of("ROLE_ADMIN", "ROLE_SUPER_ADMIN", "ROLE_GYMBIOS_ADMIN", "ROLE_MANAGER");

    public boolean isApprover() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream().anyMatch(a -> APPROVER_ROLES.contains(a.getAuthority()));
    }

    @Transactional(readOnly = true)
    public List<RequestRow> requests(String status) {
        List<MemberCancellationRequest> rows = "PENDING".equalsIgnoreCase(trim(status)) || trim(status).isEmpty()
                ? requests.findByStatusOrderByRequestedAtAsc(MemberCancellationRequest.STATUS_PENDING)
                : requests.findTop100ByStatusNotOrderByDecidedAtDesc(MemberCancellationRequest.STATUS_PENDING);
        return rows.stream().map(r -> {
            Member m = members.findById(r.getMemberDbId()).orElse(null);
            return new RequestRow(r.getId(), r.getMemberDbId(), r.getMemberCode(), r.getMemberName(),
                    m != null ? m.getPhotoUrl() : null, m != null ? m.getMembershipPlan() : null, r.getHouseholdSize(),
                    r.isWithRefund(), money(r.getRefundAmount()), money(r.getPolicyAmount()), r.getRefundMethod(),
                    r.getDuesAction(), money(r.getDuesAmount()), r.getReason(), r.getNotes(), r.getStatus(),
                    r.getRequestedBy(), utc(r.getRequestedAt()), r.getDecidedBy(), utc(r.getDecidedAt()), r.getDecisionNote());
        }).toList();
    }

    /** Carries out the cancellation exactly as requested. If it can't go through any more, nothing changes. */
    @Transactional
    public Result approve(Long requestId) {
        requireApprover();
        requireBranch();
        MemberCancellationRequest r = openRequest(requestId);
        Member subject = member(r.getMemberDbId());
        Policy policy = policy();
        requireCancellable(subject, policy);
        Result result = r.isWithRefund()
                ? doCancelWithRefund(subject, policy, new RefundCancelRequest(r.getReason(), r.getNotes(), r.getDuesAction(),
                        r.getRefundAmount(), r.getRefundMethod(), r.getBankAccountCode(), r.getBankAccountName(),
                        r.getRefundReference(), r.getRefundReasonCode()))
                : doCancel(subject, policy, new CancelRequest(r.getReason(), r.getNotes(), r.getDuesAction()));
        r.setStatus(MemberCancellationRequest.STATUS_APPROVED);
        r.setDecidedBy(currentStaffName());
        r.setDecidedAt(LocalDateTime.now());
        r.setCancellationId(result.cancellationId());
        requests.save(r);
        return result;
    }

    @Transactional
    public void reject(Long requestId, String note) {
        requireApprover();
        MemberCancellationRequest r = openRequest(requestId);
        if (trim(note).isEmpty()) throw new BusinessRuleViolationException("Say why the cancellation is rejected.");
        r.setStatus(MemberCancellationRequest.STATUS_REJECTED);
        r.setDecidedBy(currentStaffName());
        r.setDecidedAt(LocalDateTime.now());
        r.setDecisionNote(trim(note));
        requests.save(r);
        members.findById(r.getMemberDbId()).ifPresent(m ->
                note(m, "Cancellation request rejected by " + r.getDecidedBy() + ": " + trim(note)));
    }

    /** The requester (or an approver) withdraws a waiting request. */
    @Transactional
    public void withdraw(Long requestId) {
        MemberCancellationRequest r = openRequest(requestId);
        r.setStatus(MemberCancellationRequest.STATUS_REJECTED);
        r.setDecidedBy(currentStaffName());
        r.setDecidedAt(LocalDateTime.now());
        r.setDecisionNote("Withdrawn");
        requests.save(r);
    }

    private Result requestApproval(Member subject, List<Member> household, boolean withRefund, BigDecimal amount,
                                   BigDecimal policyAmount, String method, String bankCode, String bankName,
                                   String reference, String refundReasonCode, String duesAction, BigDecimal dues,
                                   String reason, String notesText) {
        MemberCancellationRequest r = new MemberCancellationRequest();
        r.setBranchId(subject.getBranchId() != null ? subject.getBranchId() : BranchContextHolder.getActiveBranchId());
        r.setMemberDbId(subject.getId());
        r.setMemberCode(subject.getMemberId());
        r.setMemberName(subject.getName());
        r.setHouseholdSize(household.size());
        r.setWithRefund(withRefund);
        r.setRefundAmount(money(amount));
        r.setPolicyAmount(money(policyAmount));
        r.setRefundMethod(method);
        r.setBankAccountCode(blankToNull(bankCode));
        r.setBankAccountName(blankToNull(bankName));
        r.setRefundReference(blankToNull(reference));
        r.setRefundReasonCode(blankToNull(refundReasonCode));
        String a = trim(duesAction).toUpperCase(Locale.ROOT);
        r.setDuesAction(a.isEmpty() || dues.signum() <= 0 ? null : a);
        r.setDuesAmount(money(dues));
        r.setReason(reason);
        r.setNotes(blankToNull(notesText));
        r.setStatus(MemberCancellationRequest.STATUS_PENDING);
        r.setRequestedBy(currentStaffName());
        r.setRequestedAt(LocalDateTime.now());
        r = requests.save(r);
        note(subject, "Cancellation requested by " + r.getRequestedBy() + " and sent for approval"
                + (withRefund ? " (refund " + plain(amount) + " by " + method + ")" : " (no refund)") + ". Reason: " + reason);
        try {
            notifications.notifyRoles(List.of("ADMIN", "GYMBIOS_ADMIN", "MANAGER"), "Cancellation awaiting approval",
                    r.getRequestedBy() + " asked to cancel " + subject.getName() + "'s membership"
                            + (withRefund ? " with a refund of " + plain(amount) : " without a refund") + ".",
                    "WARNING", "HIGH", "MEMBERS", r.getId(), "/approvals?tab=cancellations",
                    "CANCELLATION_REQUEST_" + r.getId());
        } catch (Exception e) {
            log.warn("Could not notify approvers about cancellation request {}: {}", r.getId(), e.getMessage());
        }
        return new Result("PENDING_APPROVAL", null, r.getId(), household.stream().map(Member::getName).toList(),
                money(amount), BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                0, 0, List.of());
    }

    private MemberCancellationRequest openRequest(Long id) {
        MemberCancellationRequest r = requests.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Cancellation request not found: " + id));
        if (!MemberCancellationRequest.STATUS_PENDING.equals(r.getStatus())) {
            throw new BusinessRuleViolationException("This request has already been " + r.getStatus().toLowerCase(Locale.ROOT) + ".");
        }
        return r;
    }

    private void requireApprover() {
        if (!isApprover()) throw new BusinessRuleViolationException("Only an Admin or Manager can approve or reject cancellations.");
    }

    private void requireNoPendingRequest(Member subject) {
        requests.findFirstByMemberDbIdAndStatus(subject.getId(), MemberCancellationRequest.STATUS_PENDING).ifPresent(r -> {
            throw new BusinessRuleViolationException("A cancellation for " + subject.getName()
                    + " is already waiting for approval (asked by " + r.getRequestedBy() + ").");
        });
    }

    private static PendingRequest pending(MemberCancellationRequest r) {
        return new PendingRequest(r.getId(), r.isWithRefund(), money(r.getRefundAmount()), r.getRefundMethod(),
                r.getDuesAction(), r.getReason(), r.getNotes(), r.getRequestedBy(), utc(r.getRequestedAt()));
    }

    /** The checks settleDues makes, without touching anything — so a request can't be approved into an error. */
    private BigDecimal checkDuesChoice(List<Member> household, String action, boolean withRefund, BigDecimal refund) {
        BigDecimal owed = sum(openBills(household).stream().filter(r -> !isUnpaidExpiryDue(r)).map(PendingPaymentService::owed));
        if (owed.signum() <= 0) return BigDecimal.ZERO;
        String a = trim(action).toUpperCase(Locale.ROOT);
        if (a.isEmpty()) {
            throw new BusinessRuleViolationException(plain(owed) + " is still owed. Collect it, write it off"
                    + (withRefund ? ", take it out of the refund" : "") + " or put the cancellation on hold first.");
        }
        if (DUES_DEDUCT.equals(a)) {
            if (!withRefund) throw new BusinessRuleViolationException("Dues can only be taken out of a refund.");
            if (refund.compareTo(owed) < 0) {
                throw new BusinessRuleViolationException("The refund (" + plain(refund) + ") doesn't cover the "
                        + plain(owed) + " owed — collect or write off the rest first.");
            }
        } else if (!DUES_WRITE_OFF.equals(a)) {
            throw new BusinessRuleViolationException("Choose how the dues are settled.");
        }
        return owed;
    }

    private static BigDecimal checkRefund(Policy policy, Quote quote, RefundCancelRequest req) {
        if (!policy.allowRefund() || "none".equals(policy.method()) || quote.total.signum() <= 0) {
            throw new BusinessRuleViolationException("Nothing can be refunded under the cancellation policy — cancel without a refund.");
        }
        BigDecimal amount = money(req.amount());
        if (amount.signum() <= 0) throw new BusinessRuleViolationException("Enter the amount to refund.");
        if (amount.compareTo(quote.total) > 0) {
            throw new BusinessRuleViolationException("At most " + plain(quote.total)
                    + " can be refunded under the gym's cancellation policy.");
        }
        return amount;
    }

    private static String refundMethod(String method) {
        return METHODS.stream().filter(x -> x.equalsIgnoreCase(trim(method))).findFirst()
                .orElseThrow(() -> new BusinessRuleViolationException("Choose how the money goes back to the member."));
    }

    // ── On hold until the dues are cleared ────────────────────────────────────

    @Transactional
    public Preview hold(Long memberDbId, HoldRequest req) {
        requireBranch();
        Member subject = member(memberDbId);
        requireCancellable(subject, policy());
        String reason = requireReason(req.reason());
        List<Member> household = household(subject);
        BigDecimal dues = sum(openBills(household).stream().filter(r -> !isUnpaidExpiryDue(r)).map(PendingPaymentService::owed));
        if (dues.signum() <= 0) {
            throw new BusinessRuleViolationException("Nothing is owed — the membership can be cancelled now.");
        }
        String by = currentStaffName();
        LocalDateTime now = LocalDateTime.now();
        for (Member m : household) {
            if (!m.isMembershipSuspended()) {
                m.setMembershipSuspended(true);
                m.setSuspendedReason("Cancellation on hold until " + plain(dues) + " in dues is cleared");
                m.setSuspendedBy(by);
                m.setSuspendedAt(now);
            }
        }
        subject.setCancellationHoldAt(now);
        subject.setCancellationHoldBy(by);
        subject.setCancellationHoldRefund(Boolean.TRUE.equals(req.wantsRefund()));
        subject.setCancellationReason(reason);
        subject.setCancellationNotes(blankToNull(req.notes()));
        members.saveAll(household);
        note(subject, "Cancellation requested and put on hold until " + plain(dues) + " in dues is cleared. Reason: "
                + reason + (StringUtils.hasText(req.notes()) ? " — " + req.notes().trim() : "")
                + (subject.isCancellationHoldRefund() ? " (refund to be given when it finishes)" : ""));
        return preview(memberDbId);
    }

    /** Withdraws a held cancellation: the member stays and the suspension is lifted. */
    @Transactional
    public Preview releaseHold(Long memberDbId) {
        Member subject = member(memberDbId);
        if (!subject.isOnCancellationHold()) throw new BusinessRuleViolationException("This cancellation isn't on hold.");
        for (Member m : household(subject)) {
            if (m.isMembershipSuspended() && Objects.toString(m.getSuspendedReason(), "").startsWith("Cancellation on hold")) {
                m.setMembershipSuspended(false);
                m.setSuspendedReason(null);
                m.setSuspendedBy(null);
                m.setSuspendedAt(null);
                members.save(m);
            }
        }
        clearHold(subject);
        members.save(subject);
        note(subject, "Held cancellation withdrawn — the member stays.");
        return preview(memberDbId);
    }

    /**
     * A held cancellation finishes by itself once nothing is owed, when no refund was asked for.
     * (A held cancellation with a refund is finished by staff from Billing › Refunds.)
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void onDuesCleared(DuesClearedEvent event) {
        if (event == null || event.memberDbId() == null) return;
        try {
            Member payer = members.findById(event.memberDbId()).orElse(null);
            if (payer == null) return;
            Member subject = payer.isOnCancellationHold() ? payer : null;
            if (subject == null && StringUtils.hasText(payer.getFamilyHeadId())) {
                subject = members.findByMemberId(payer.getFamilyHeadId()).filter(Member::isOnCancellationHold).orElse(null);
            }
            if (subject == null || subject.isCancellationHoldRefund()) return;
            List<Member> household = household(subject);
            BigDecimal dues = sum(openBills(household).stream().filter(r -> !isUnpaidExpiryDue(r)).map(PendingPaymentService::owed));
            if (dues.signum() > 0) return;
            Policy policy = policy();
            if (policy.approvalRequired()) {
                // Still needs an Admin / Manager: the cleared hold becomes a request instead.
                if (requests.findFirstByMemberDbIdAndStatus(subject.getId(), MemberCancellationRequest.STATUS_PENDING).isEmpty()) {
                    requestApproval(subject, household, false, BigDecimal.ZERO, BigDecimal.ZERO, null, null, null, null,
                            null, null, BigDecimal.ZERO, subject.getCancellationReason(), subject.getCancellationNotes());
                }
                return;
            }
            Settled settled = settleDues(household, null, false, BigDecimal.ZERO, null);
            Applied applied = cancelHousehold(subject, household, subject.getCancellationReason(),
                    subject.getCancellationNotes(), Set.of());
            record(subject, household, false, BigDecimal.ZERO, BigDecimal.ZERO, policy, List.of(), settled, applied,
                    subject.getCancellationReason(), subject.getCancellationNotes());
            log.info("Held cancellation of member {} finished after dues were cleared", subject.getId());
        } catch (Exception e) {
            log.warn("Could not finish held cancellation for member {}: {}", event.memberDbId(), e.getMessage());
        }
    }

    // ── Dues ──────────────────────────────────────────────────────────────────

    private record Settled(String action, BigDecimal written, BigDecimal deducted, BigDecimal expiryCancelled) {}

    private Settled settleDues(List<Member> household, String action, boolean withRefund, BigDecimal refund, String method) {
        List<Receipt> open = openBills(household);
        BigDecimal expiryCancelled = BigDecimal.ZERO;
        List<Receipt> dues = new ArrayList<>();
        for (Receipt r : open) {
            if (isUnpaidExpiryDue(r)) expiryCancelled = expiryCancelled.add(cancelExpiryDue(r));
            else dues.add(r);
        }
        BigDecimal owed = sum(dues.stream().map(PendingPaymentService::owed));
        if (owed.signum() <= 0) return new Settled(null, BigDecimal.ZERO, BigDecimal.ZERO, expiryCancelled);

        String a = trim(action).toUpperCase(Locale.ROOT);
        if (a.isEmpty()) {
            throw new BusinessRuleViolationException(plain(owed) + " is still owed. Collect it, write it off"
                    + (withRefund ? ", take it out of the refund" : "") + " or put the cancellation on hold first.");
        }
        if (DUES_WRITE_OFF.equals(a)) {
            for (Receipt r : dues) {
                WriteOffRequestDTO w = new WriteOffRequestDTO();
                w.setReason("DISCONTINUED");
                w.setNotes("Membership cancelled");
                pendingPayments.writeOff(r.getId(), w);
            }
            return new Settled(DUES_WRITE_OFF, owed, BigDecimal.ZERO, expiryCancelled);
        }
        if (DUES_DEDUCT.equals(a)) {
            if (!withRefund) throw new BusinessRuleViolationException("Dues can only be taken out of a refund.");
            if (refund.compareTo(owed) < 0) {
                throw new BusinessRuleViolationException("The refund (" + plain(refund) + ") doesn't cover the "
                        + plain(owed) + " owed — collect or write off the rest first.");
            }
            // One settlement per payer, paid "out of the refund" by the refund's own method:
            // the till takes the dues in and pays the whole refund out, so only the difference moves.
            Map<Long, List<Receipt>> byPayer = dues.stream()
                    .collect(Collectors.groupingBy(Receipt::getMemberDbId, LinkedHashMap::new, Collectors.toList()));
            for (Map.Entry<Long, List<Receipt>> e : byPayer.entrySet()) {
                Member payer = member(e.getKey());
                payer.setCancelling(true);
                SettlePaymentRequestDTO s = new SettlePaymentRequestDTO();
                s.setMemberDbId(payer.getId());
                s.setPaymentMethod(method);
                s.setRemarks("Dues taken out of the cancellation refund");
                List<SettlePaymentRequestDTO.BillPayment> lines = new ArrayList<>();
                for (Receipt r : e.getValue()) {
                    SettlePaymentRequestDTO.BillPayment bp = new SettlePaymentRequestDTO.BillPayment();
                    bp.setReceiptId(r.getId());
                    bp.setPayAmount(PendingPaymentService.owed(r));
                    lines.add(bp);
                }
                s.setBillPayments(lines);
                receiptService.settlePayment(s);
            }
            return new Settled(DUES_DEDUCT, BigDecimal.ZERO, owed, expiryCancelled);
        }
        throw new BusinessRuleViolationException("Choose how the dues are settled.");
    }

    /** An unpaid expiry due is a renewal nobody will use: cancelled, and off the payer's balance. */
    private BigDecimal cancelExpiryDue(Receipt due) {
        BigDecimal amount = money(due.getAmount());
        if (due.getMemberDbId() != null) {
            members.findById(due.getMemberDbId()).ifPresent(payer -> {
                BigDecimal left = money(payer.getOutstandingBalance()).subtract(amount).max(BigDecimal.ZERO);
                payer.setOutstandingBalance(left);
                if (left.signum() == 0) payer.setPaymentStatus("paid");
                members.save(payer);
            });
        }
        due.setStatus("Cancelled");
        String remark = "Membership cancelled on " + LocalDate.now();
        due.setRemarks(StringUtils.hasText(due.getRemarks()) ? due.getRemarks() + " · " + remark : remark);
        receipts.save(due);
        return amount;
    }

    private static boolean isUnpaidExpiryDue(Receipt r) {
        return ExpiryDueService.EXPIRY_DUE_TYPE.equals(r.getTransactionType())
                && PendingPaymentService.paidToDate(r).signum() <= 0;
    }

    /** Open bills the household owes on: billed to one of them, or an expiry due renewing one of them. */
    private List<Receipt> openBills(List<Member> household) {
        Map<Long, Receipt> out = new LinkedHashMap<>();
        for (Member m : household) {
            for (Receipt r : receipts.findByMemberDbIdOrderByTransactionDateAsc(m.getId())) {
                if (isOpenDue(r)) out.putIfAbsent(r.getId(), r);
            }
            for (Receipt r : receipts.findByRenewsMemberIdAndStatusIn(m.getId(), OPEN_STATUSES)) {
                if (isOpenDue(r)) out.putIfAbsent(r.getId(), r);
            }
        }
        return new ArrayList<>(out.values());
    }

    private static boolean isOpenDue(Receipt r) {
        if ("Payment".equalsIgnoreCase(r.getTransactionType())) return false;
        if (!OPEN_STATUSES.contains(Objects.toString(r.getStatus(), ""))) return false;
        // Waiting for approval: voided by the cancellation itself, never collected.
        if ("PENDING".equalsIgnoreCase(Objects.toString(r.getApprovalStatus(), ""))) return false;
        return PendingPaymentService.owed(r).signum() > 0;
    }

    private static DueItem dueItem(Receipt r) {
        return new DueItem(r.getId(), r.getReceiptNo(), r.getMemberDbId(), r.getMemberName(), r.getTransactionType(),
                MemberRefundService.typeLabel(r.getTransactionType())
                        + (StringUtils.hasText(r.getPlanName()) ? " · " + r.getPlanName() : ""),
                utc(r.getTransactionDate()), money(r.getAmount()), money(PendingPaymentService.paidToDate(r)),
                PendingPaymentService.owed(r), isUnpaidExpiryDue(r));
    }

    // ── Refund quote (the policy maximum) ─────────────────────────────────────

    private record Quote(List<QuoteBill> bills, BigDecimal refundable, BigDecimal subtotal, BigDecimal fee, BigDecimal total) {}

    private Quote quote(List<Member> household, Policy policy, LocalDateTime now) {
        Map<Long, String> names = household.stream().collect(Collectors.toMap(Member::getId, Member::getName, (a, b) -> a));
        Map<Long, MemberRefundService.Bill> bills = new LinkedHashMap<>();
        for (Member m : household) {
            for (MemberRefundService.Bill b : refunds.memberBills(m.getId()).bills()) {
                if (b.refundable().signum() > 0) bills.putIfAbsent(b.id(), b);
            }
        }
        boolean refunding = policy.allowRefund() && !"none".equals(policy.method());
        boolean flat = "flat".equals(policy.method());
        List<QuoteBill> raw = new ArrayList<>();
        BigDecimal refundable = BigDecimal.ZERO;
        BigDecimal subtotal = BigDecimal.ZERO;
        for (MemberRefundService.Bill b : bills.values()) {
            Receipt r = receipts.findById(b.id()).orElse(null);
            if (r == null) continue;
            Share share = refunding ? share(r, b, flat, now) : new Share(BigDecimal.ZERO, "No refunds under the policy");
            BigDecimal amount = money(b.refundable().multiply(share.fraction)).min(b.refundable());
            refundable = refundable.add(b.refundable());
            subtotal = subtotal.add(amount);
            raw.add(new QuoteBill(b.id(), b.receiptNo(), b.invoiceNo(), r.getMemberDbId(),
                    names.getOrDefault(r.getMemberDbId(), r.getMemberName()), b.type(), b.planName(), b.validFrom(),
                    b.validTill(), b.paid(), b.refunded(), b.refundable(), amount, share.basis));
        }
        BigDecimal fee = flat ? money(policy.cancellationFee()) : BigDecimal.ZERO;
        BigDecimal total = subtotal.subtract(fee).max(BigDecimal.ZERO);
        List<QuoteBill> out = raw;
        if (fee.signum() > 0 && subtotal.signum() > 0) {
            // The fee comes off every bill in proportion, so each bill's share still adds up.
            Map<Long, BigDecimal> scaled = allocate(raw, subtotal, total);
            out = raw.stream().map(q -> new QuoteBill(q.receiptId(), q.receiptNo(), q.invoiceNo(), q.memberDbId(),
                    q.memberName(), q.type(), q.planName(), q.validFrom(), q.validTill(), q.paid(), q.refunded(),
                    q.refundable(), scaled.getOrDefault(q.receiptId(), BigDecimal.ZERO), q.basis())).toList();
        }
        return new Quote(out, money(refundable), money(subtotal), fee, money(total));
    }

    private record Share(BigDecimal fraction, String basis) {}

    /** How much of a bill's refundable money the policy gives back. */
    private Share share(Receipt r, MemberRefundService.Bill b, boolean flat, LocalDateTime now) {
        LocalDateTime from = r.getValidFrom();
        LocalDateTime till = r.getValidTill();
        String type = Objects.toString(r.getTransactionType(), "");
        if ((from == null || till == null) && ReceiptService.TXN_ADDON.equals(type)) {
            // Add-ons sold on their own carry their dates on the add-on, not the bill.
            Optional<MemberAddon> a = addons.findByReceiptId(r.getId()).stream()
                    .filter(x -> x.getStartDate() != null && x.getExpiryDate() != null).findFirst();
            if (a.isPresent()) { from = a.get().getStartDate(); till = a.get().getExpiryDate(); }
        }
        if (ReceiptService.TXN_CLASS_BOOKING.equals(type)) {
            Optional<Booking> booking = bookings.findFirstByReceiptId(r.getId());
            boolean upcoming = booking.filter(x -> !"cancelled".equalsIgnoreCase(x.getStatus())
                    && !"checked-in".equalsIgnoreCase(x.getStatus())
                    && x.getSession() != null && x.getSession().getDate() != null
                    && x.getSession().getDate().atTime(Optional.ofNullable(x.getSession().getStartTime()).orElse(LocalTime.MIDNIGHT)).isAfter(now))
                    .isPresent();
            return upcoming ? new Share(BigDecimal.ONE, "Session not held yet") : new Share(BigDecimal.ZERO, "Session already held");
        }
        if (from == null || till == null) return new Share(BigDecimal.ZERO, "One-off charge, already used");
        if (from.isAfter(now)) return new Share(BigDecimal.ONE, "Not started yet");
        if (!till.isAfter(now)) return new Share(BigDecimal.ZERO, "Period finished");
        if (flat) return new Share(BigDecimal.ONE, "Current period");
        long total = Math.max(1, ChronoUnit.DAYS.between(from.toLocalDate(), till.toLocalDate()));
        long left = Math.max(0, Math.min(total, ChronoUnit.DAYS.between(now.toLocalDate(), till.toLocalDate())));
        return new Share(BigDecimal.valueOf(left).divide(BigDecimal.valueOf(total), 6, RoundingMode.HALF_UP),
                left + " of " + total + " days unused");
    }

    /** Splits `amount` over the bills in proportion to their policy amounts (out of `of`); the last takes the rounding. */
    private static Map<Long, BigDecimal> allocate(List<QuoteBill> bills, BigDecimal of, BigDecimal amount) {
        Map<Long, BigDecimal> out = new LinkedHashMap<>();
        List<QuoteBill> paying = bills.stream().filter(b -> b.policyAmount().signum() > 0).toList();
        if (paying.isEmpty() || of.signum() <= 0) return out;
        BigDecimal given = BigDecimal.ZERO;
        for (int i = 0; i < paying.size(); i++) {
            QuoteBill b = paying.get(i);
            BigDecimal share = i < paying.size() - 1
                    ? b.policyAmount().multiply(amount).divide(of, 2, RoundingMode.DOWN)
                    : amount.subtract(given);
            share = share.min(b.refundable()).max(BigDecimal.ZERO);
            given = given.add(share);
            out.put(b.receiptId(), share);
        }
        return out;
    }

    // ── Cancelling the members ────────────────────────────────────────────────

    private record Applied(int bookings, int addons, BigDecimal revenueKept) {}

    private Applied cancelHousehold(Member subject, List<Member> household, String reason, String notesText,
                                    Set<Long> refundedBills) {
        String by = currentStaffName();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime today = LocalDate.now().atStartOfDay();
        int bookingCount = 0;
        int addonCount = 0;
        BigDecimal kept = BigDecimal.ZERO;

        for (Member m : household) {
            bookingCount += bookingService.cancelUpcomingForMembershipCancellation(m.getId());

            for (MemberAddon a : addons.findByMemberDbIdOrderByPurchaseDateAsc(m.getId())) {
                String st = Objects.toString(a.getStatus(), "").toLowerCase(Locale.ROOT);
                if (ADDON_DONE.contains(st)) continue;
                if (a.getExpiryDate() != null && !a.getExpiryDate().isAfter(now)) continue;
                if (AddonPaymentService.STATUS_PENDING_APPROVAL.equalsIgnoreCase(a.getStatus())) {
                    addonPayments.settleCancellation(a, "Staff"); // voids the unapproved charge
                }
                a.setStatus(AddonPaymentService.STATUS_CANCELLED);
                addons.save(a);
                addonCount++;
            }
            for (PackageEnrolment e : enrolments.findByMemberIdAndStatusOrderByEndDateAsc(m.getId(), PackageEnrolment.STATUS_ACTIVE)) {
                e.setStatus(PackageEnrolment.STATUS_CANCELLED);
                e.setCancelledAt(now);
                enrolments.save(e);
            }

            // Kept without a refund: what is still deferred on their membership bills is earned now.
            for (Receipt r : receipts.findByMemberDbIdOrderByTransactionDateAsc(m.getId())) {
                if (!MEMBERSHIP_TYPES.contains(Objects.toString(r.getTransactionType(), ""))) continue;
                if (refundedBills.contains(r.getId()) || "Cancelled".equalsIgnoreCase(r.getStatus())) continue;
                BigDecimal k = deferredRevenue.forfeitOnCancel(r.getId());
                if (k.signum() > 0) {
                    financialEvents.onCancellationRevenueKept(r.getId(), m.getName(), k);
                    kept = kept.add(k);
                }
            }

            LocalDateTime end = m.getMembershipEndDate() != null ? m.getMembershipEndDate() : m.getExpiryDate();
            if (end == null || end.isAfter(today)) {
                m.setMembershipEndDate(today);
                m.setExpiryDate(today);
            }
            m.setNextPaymentDate(null);
            m.setMembershipStatus(STATUS_CANCELLED);
            m.setCancelledAt(now);
            m.setCancelledBy(by);
            m.setCancellationReason(m == subject || household.size() == 1 ? reason : reason + " (family of " + subject.getName() + ")");
            m.setCancellationNotes(blankToNull(notesText));
            m.setMembershipSuspended(false);
            m.setSuspendedReason(null);
            m.setSuspendedBy(null);
            m.setSuspendedAt(null);
            clearHold(m);
            m.setCancelling(false);

            // The app account is the person's own and stays linked: the app shows this gym as
            // "Cancelled", keeps their history readable, and a rejoin reuses this record.
            notifyMember(m);
            members.save(m);
            note(m, "Membership cancelled by " + by + ". Reason: " + reason
                    + (StringUtils.hasText(notesText) ? " — " + notesText.trim() : ""));
        }
        return new Applied(bookingCount, addonCount, money(kept));
    }

    private void notifyMember(Member m) {
        Long target = m.getGlobalUserId() != null ? m.getGlobalUserId() : m.getUserId();
        if (target == null) return;
        try {
            notifications.notifyUser(target, "Membership cancelled",
                    "Your membership has been cancelled. Your history stays in the app — contact the gym to rejoin.",
                    "WARNING", "HIGH", "MEMBERS", m.getId(), null, "MEMBERSHIP_CANCELLED_" + m.getId());
        } catch (Exception e) {
            log.warn("Could not notify member {} about the cancellation: {}", m.getId(), e.getMessage());
        }
    }

    private MemberCancellation record(Member subject, List<Member> household, boolean withRefund, BigDecimal refund,
                                      BigDecimal policyAmount, Policy policy, List<MemberRefundService.Refund> made,
                                      Settled settled, Applied applied, String reason, String notesText) {
        MemberCancellation c = new MemberCancellation();
        c.setBranchId(subject.getBranchId() != null ? subject.getBranchId() : BranchContextHolder.getActiveBranchId());
        c.setMemberDbId(subject.getId());
        c.setMemberCode(subject.getMemberId());
        c.setMemberName(subject.getName());
        c.setHouseholdIds(household.stream().map(m -> String.valueOf(m.getId())).collect(Collectors.joining(",")));
        c.setHouseholdSize(household.size());
        c.setWithRefund(withRefund);
        c.setRefundAmount(money(refund));
        c.setPolicyAmount(money(policyAmount));
        c.setPolicyMethod(policy.allowRefund() ? policy.method() : "none");
        c.setRefundVoucherNos(made.isEmpty() ? null
                : made.stream().map(MemberRefundService.Refund::voucherNo).collect(Collectors.joining(", ")));
        c.setDuesAction(settled.action());
        c.setDuesAmount(money(settled.written().add(settled.deducted())));
        c.setExpiryDuesCancelled(money(settled.expiryCancelled()));
        c.setRevenueKept(applied.revenueKept());
        c.setReason(reason);
        c.setNotes(blankToNull(notesText));
        c.setCancelledBy(currentStaffName());
        c.setCancelledAt(LocalDateTime.now());
        return cancellations.save(c);
    }

    private static Result result(MemberCancellation row, List<Member> household, BigDecimal refund, Settled settled,
                                 Applied applied, List<MemberRefundService.Refund> made) {
        return new Result("CANCELLED", row.getId(), null, household.stream().map(Member::getName).toList(), money(refund),
                money(settled.written()), money(settled.deducted()), money(refund.subtract(settled.deducted())),
                money(settled.expiryCancelled()), applied.revenueKept(), applied.bookings(), applied.addons(), made);
    }

    // ── The review's people ───────────────────────────────────────────────────

    private Person person(Member m, boolean head, LocalDateTime now) {
        LocalDateTime start = m.getMembershipStartDate();
        LocalDateTime end = m.getMembershipEndDate() != null ? m.getMembershipEndDate() : m.getExpiryDate();
        LocalDate today = now.toLocalDate();
        long periodDays = start != null && end != null ? Math.max(0, ChronoUnit.DAYS.between(start.toLocalDate(), end.toLocalDate())) : 0;
        long used = start != null ? Math.max(0, Math.min(periodDays, ChronoUnit.DAYS.between(start.toLocalDate(), today))) : 0;
        long left = end != null ? Math.max(0, ChronoUnit.DAYS.between(today, end.toLocalDate())) : 0;
        LocalDateTime joined = m.getJoinDate() != null ? m.getJoinDate() : start;
        long memberFor = joined != null ? Math.max(0, ChronoUnit.DAYS.between(joined.toLocalDate(), today)) : 0;

        long checkIns = attendance.countByMember_Id(m.getId());
        long thisPeriod = start != null ? attendance.countByMember_IdAndCheckInTimeGreaterThanEqual(m.getId(), start) : checkIns;
        OffsetDateTime last = attendance.findFirstByMember_IdOrderByCheckInTimeDesc(m.getId())
                .map(Attendance::getCheckInTime).map(MembershipCancellationService::utc).orElse(null);

        List<AddonItem> addonItems = addons.findByMemberDbIdOrderByPurchaseDateAsc(m.getId()).stream()
                .map(a -> new AddonItem(a.getAddonName(), a.getCategory(), utc(a.getStartDate()), utc(a.getExpiryDate()),
                        a.getStatus(), money(a.getAmount())))
                .toList();
        List<BookingItem> upcoming = bookings.findUpcomingBookings(m.getId(), today, now.toLocalTime()).stream()
                .map(b -> new BookingItem(b.getId(), b.getSession() != null ? b.getSession().getName() : null,
                        b.getSession() != null ? b.getSession().getType() : null,
                        b.getSession() != null ? b.getSession().getDate() : null,
                        b.getSession() != null ? b.getSession().getStartTime() : null, b.getReceiptId() != null))
                .toList();
        long past = bookings.findPastBookings(m.getId(), today, now.toLocalTime()).stream()
                .filter(b -> !"cancelled".equalsIgnoreCase(b.getStatus())).count();
        List<PackageItem> packages = enrolments.findByMemberIdOrderByStartDateDesc(m.getId()).stream()
                .map(e -> new PackageItem(e.getPackageName(), e.getSessionsTotal(),
                        bookings.findByEnrolmentIdWithSession(e.getId()).stream()
                                .filter(b -> !"cancelled".equalsIgnoreCase(b.getStatus())).count(),
                        e.getEndDate(), e.getStatus()))
                .toList();

        return new Person(m.getId(), m.getMemberId(), m.getName(), m.getPhone(), m.getPhotoUrl(), head,
                m.getMembershipPlan(), m.getMembershipStatus(), utc(joined), utc(start), utc(end), memberFor,
                periodDays, used, left, checkIns, thisPeriod, last, addonItems, upcoming, past, packages,
                money(m.getWalletBalance()), m.isMembershipSuspended(), MemberSuspension.isFrozen(m));
    }

    // ── Rules & lookups ───────────────────────────────────────────────────────

    public Policy policy() {
        Map<String, String> v = settings.findByCategoryOrderBySettingKeyAsc(GymOsSetting.CATEGORY_DEACTIVATION_POLICY)
                .stream().filter(s -> s.getSettingValue() != null)
                .collect(Collectors.toMap(GymOsSetting::getSettingKey, GymOsSetting::getSettingValue, (a, b) -> a));
        String method = v.getOrDefault("refund_method", "prorated").trim().toLowerCase(Locale.ROOT);
        if (!Set.of("prorated", "flat", "none").contains(method)) method = "prorated";
        BigDecimal fee;
        try { fee = new BigDecimal(v.getOrDefault("cancellation_fee", "0").trim()); } catch (NumberFormatException e) { fee = BigDecimal.ZERO; }
        return new Policy(!"false".equalsIgnoreCase(v.get("allow_deactivation")),
                !"false".equalsIgnoreCase(v.get("allow_refund")), method, money(fee.max(BigDecimal.ZERO)),
                "true".equalsIgnoreCase(v.get("approval_required")));
    }

    /** A family head goes with everyone billed to them; anyone else goes alone. */
    private List<Member> household(Member subject) {
        Set<Member> out = new LinkedHashSet<>();
        out.add(subject);
        if (Boolean.TRUE.equals(subject.getIsFamilyHead()) && StringUtils.hasText(subject.getMemberId())) {
            for (Member d : members.findByFamilyHeadId(subject.getMemberId())) {
                if (d.getId().equals(subject.getId())) continue;
                if (STATUS_CANCELLED.equalsIgnoreCase(d.getMembershipStatus())) continue;
                out.add(d);
            }
        }
        return new ArrayList<>(out);
    }

    private Member familyHead(Member m) {
        if (!StringUtils.hasText(m.getFamilyHeadId()) || m.getFamilyHeadId().equals(m.getMemberId())) return null;
        return members.findByMemberId(m.getFamilyHeadId()).orElse(null);
    }

    private static String blockedReason(Member m, Policy policy) {
        if (STATUS_CANCELLED.equalsIgnoreCase(m.getMembershipStatus())) return m.getName() + "'s membership is already cancelled.";
        if (!policy.allowCancellation()) return "Cancelling memberships is turned off in GymOS › Member Deactivation Policy.";
        if ("pending_approval".equalsIgnoreCase(m.getMembershipStatus()) || "PENDING".equals(m.getApprovalStatus())) {
            return "This purchase is still waiting for approval — reject it in Approvals instead.";
        }
        return null;
    }

    private static void requireCancellable(Member m, Policy policy) {
        String blocked = blockedReason(m, policy);
        if (blocked != null) throw new BusinessRuleViolationException(blocked);
    }

    private static void requireBranch() {
        if (BranchContextHolder.getActiveBranchId() == null) {
            throw new BusinessRuleViolationException("Select a branch first: a membership can't be cancelled in All Branches mode.");
        }
    }

    private static String requireReason(String reason) {
        String r = trim(reason);
        if (r.isEmpty()) throw new BusinessRuleViolationException("Choose why the membership is being cancelled.");
        return r.length() > 255 ? r.substring(0, 255) : r;
    }

    private static void clearHold(Member m) {
        m.setCancellationHoldAt(null);
        m.setCancellationHoldBy(null);
        m.setCancellationHoldRefund(false);
    }

    private Member member(Long id) {
        return members.findById(id).orElseThrow(() -> new EntityNotFoundException("Member not found: " + id));
    }

    private void note(Member m, String text) {
        try {
            notes.save(new MemberNote(m.getId(), text));
        } catch (Exception e) {
            log.warn("Could not save note for member {}: {}", m.getId(), e.getMessage());
        }
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

    private static BigDecimal sum(java.util.stream.Stream<BigDecimal> values) {
        return money(values.filter(Objects::nonNull).reduce(BigDecimal.ZERO, BigDecimal::add));
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
}
