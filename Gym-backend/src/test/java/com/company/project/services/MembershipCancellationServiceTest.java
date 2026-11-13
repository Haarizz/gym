package com.company.project.services;

import com.company.project.entities.GymOsSetting;
import com.company.project.entities.Member;
import com.company.project.entities.MemberCancellation;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.DeactivationReasonRepository;
import com.company.project.repositories.GymOsSettingRepository;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.MemberCancellationRepository;
import com.company.project.repositories.MemberNoteRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.PackageEnrolmentRepository;
import com.company.project.repositories.ReceiptRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.security.BranchContextHolder;
import com.company.project.services.MembershipCancellationService.CancelRequest;
import com.company.project.services.MembershipCancellationService.Preview;
import com.company.project.services.MembershipCancellationService.RefundCancelRequest;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MembershipCancellationServiceTest {

    @Mock private MemberRepository members;
    @Mock private ReceiptRepository receipts;
    @Mock private AttendanceRepository attendance;
    @Mock private BookingRepository bookings;
    @Mock private MemberAddonRepository addons;
    @Mock private PackageEnrolmentRepository enrolments;
    @Mock private GymOsSettingRepository settings;
    @Mock private DeactivationReasonRepository reasons;
    @Mock private MemberCancellationRepository cancellations;
    @Mock private MemberNoteRepository notes;
    @Mock private StaffRepository staff;
    @Mock private MemberRefundService refunds;
    @Mock private PendingPaymentService pendingPayments;
    @Mock private ReceiptService receiptService;
    @Mock private BookingService bookingService;
    @Mock private AddonPaymentService addonPayments;
    @Mock private DeferredRevenueScheduleService deferredRevenue;
    @Mock private FinancialEventService financialEvents;
    @Mock private NotificationService notifications;
    @Mock private com.company.project.repositories.MemberCancellationRequestRepository requests;

    @InjectMocks private MembershipCancellationService service;

    private final List<Receipt> billsOf7 = new ArrayList<>();
    private final List<MemberRefundService.Bill> refundBills = new ArrayList<>();

    @BeforeEach
    void setUp() {
        BranchContextHolder.setActiveBranchId(1L);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("manager@gym.test", null, List.of()));
        lenient().when(receipts.findByMemberDbIdOrderByTransactionDateAsc(7L)).thenReturn(billsOf7);
        lenient().when(receipts.findByRenewsMemberIdAndStatusIn(anyLong(), any())).thenReturn(List.of());
        lenient().when(refunds.memberBills(7L)).thenAnswer(inv -> new MemberRefundService.MemberBills(7L, "GYM7", "Ahmed",
                null, null, "Gold", null, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                refundBills, List.of()));
        lenient().when(receipts.findById(anyLong())).thenAnswer(inv -> billsOf7.stream()
                .filter(r -> r.getId().equals(inv.getArgument(0))).findFirst());
        lenient().when(cancellations.save(any())).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(deferredRevenue.forfeitOnCancel(anyLong())).thenReturn(BigDecimal.ZERO);
        lenient().when(requests.findFirstByMemberDbIdAndStatus(anyLong(), any())).thenReturn(Optional.empty());
        lenient().when(requests.save(any())).thenAnswer(inv -> inv.getArgument(0));
        policy(Map.of("refund_method", "prorated"));
    }

    @AfterEach
    void clear() {
        BranchContextHolder.clear();
        SecurityContextHolder.clearContext();
    }

    private void policy(Map<String, String> values) {
        List<GymOsSetting> rows = values.entrySet().stream().map(e -> {
            GymOsSetting s = new GymOsSetting();
            s.setCategory(GymOsSetting.CATEGORY_DEACTIVATION_POLICY);
            s.setSettingKey(e.getKey());
            s.setSettingValue(e.getValue());
            return s;
        }).toList();
        lenient().when(settings.findByCategoryOrderBySettingKeyAsc(GymOsSetting.CATEGORY_DEACTIVATION_POLICY)).thenReturn(rows);
    }

    private Member member() {
        Member m = new Member();
        m.setId(7L);
        m.setMemberId("GYM7");
        m.setName("Ahmed");
        m.setMembershipStatus("active");
        m.setGlobalUserId(900L);
        m.setOutstandingBalance(BigDecimal.ZERO);
        m.setMembershipEndDate(LocalDate.now().plusDays(15).atStartOfDay());
        when(members.findById(7L)).thenReturn(Optional.of(m));
        return m;
    }

    /** A paid membership bill for a period running from `startOffset` to `endOffset` days from today. */
    private Receipt paidBill(long id, String paid, int startOffset, int endOffset) {
        Receipt r = new Receipt();
        r.setId(id);
        r.setReceiptNo("RCPT-" + id);
        r.setMemberDbId(7L);
        r.setTransactionType("Renewal");
        r.setStatus("Paid");
        r.setAmount(new BigDecimal(paid));
        r.setPaidAmount(new BigDecimal(paid));
        r.setTotalPaidToDate(new BigDecimal(paid));
        r.setValidFrom(LocalDate.now().plusDays(startOffset).atStartOfDay());
        r.setValidTill(LocalDate.now().plusDays(endOffset).atStartOfDay());
        billsOf7.add(r);
        refundBills.add(new MemberRefundService.Bill(id, r.getReceiptNo(), null, null, "Renewal", "Gold",
                r.getValidFrom().atOffset(ZoneOffset.UTC), r.getValidTill().atOffset(ZoneOffset.UTC),
                new BigDecimal(paid), new BigDecimal(paid), BigDecimal.ZERO, new BigDecimal(paid), BigDecimal.ZERO,
                "Paid", true, startOffset <= 0, startOffset > 0, "Cash", null));
        return r;
    }

    private Receipt openBill(long id, String type, String amount, String paid) {
        Receipt r = new Receipt();
        r.setId(id);
        r.setReceiptNo("RCPT-" + id);
        r.setMemberDbId(7L);
        r.setTransactionType(type);
        r.setStatus(new BigDecimal(paid).signum() > 0 ? "Partial" : "Pending");
        r.setAmount(new BigDecimal(amount));
        r.setPaidAmount(new BigDecimal(paid));
        r.setTotalPaidToDate(new BigDecimal(paid));
        billsOf7.add(r);
        return r;
    }

    // ── Policy maths ──────────────────────────────────────────────────────────

    @Test
    void proRatedRefundIsTheUnusedShareOfTheCurrentPeriod() {
        member();
        paidBill(1, "300.00", -15, 15);   // 30-day period, 15 days left

        Preview p = service.preview(7L);

        assertEquals(0, new BigDecimal("150.00").compareTo(p.policyTotal()));
        assertEquals("15 of 30 days unused", p.refundBills().get(0).basis());
        assertTrue(p.canRefund());
    }

    @Test
    void notStartedPeriodIsRefundedInFullAndFinishedOneNotAtAll() {
        member();
        paidBill(1, "200.00", 5, 35);     // early renewal, not started
        paidBill(2, "300.00", -60, -30);  // finished

        Preview p = service.preview(7L);

        assertEquals(0, new BigDecimal("200.00").compareTo(p.policyTotal()));
    }

    @Test
    void flatPolicyTakesTheFeeOffInProportion() {
        policy(Map.of("refund_method", "flat", "cancellation_fee", "50"));
        member();
        paidBill(1, "200.00", 5, 35);
        paidBill(2, "300.00", -10, 20);

        Preview p = service.preview(7L);

        assertEquals(0, new BigDecimal("500.00").compareTo(p.policySubtotal()));
        assertEquals(0, new BigDecimal("450.00").compareTo(p.policyTotal()));
        BigDecimal sum = p.refundBills().stream().map(MembershipCancellationService.QuoteBill::policyAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, new BigDecimal("450.00").compareTo(sum));
    }

    @Test
    void noRefundPolicyOffersOnlyCancellingWithoutRefund() {
        policy(Map.of("refund_method", "none"));
        member();
        paidBill(1, "300.00", -15, 15);

        Preview p = service.preview(7L);

        assertFalse(p.canRefund());
        assertEquals(0, BigDecimal.ZERO.compareTo(p.policyTotal()));
        assertTrue(p.canCancel());
    }

    @Test
    void cancellationTurnedOffInPolicyIsBlocked() {
        policy(Map.of("allow_deactivation", "false"));
        member();

        assertFalse(service.preview(7L).canCancel());
        assertThrows(BusinessRuleViolationException.class,
                () -> service.cancel(7L, new CancelRequest("Moving away", null, null)));
    }

    // ── Dues ──────────────────────────────────────────────────────────────────

    @Test
    void duesMustBeSettledBeforeCancelling() {
        member();
        openBill(5, "Renewal", "400.00", "100.00");

        BusinessRuleViolationException e = assertThrows(BusinessRuleViolationException.class,
                () -> service.cancel(7L, new CancelRequest("Moving away", null, null)));
        assertTrue(e.getMessage().contains("300"));
        verify(bookingService, never()).cancelUpcomingForMembershipCancellation(anyLong());
    }

    @Test
    void writeOffSettlesTheDuesAndCancels() {
        Member m = member();
        openBill(5, "Renewal", "400.00", "100.00");

        service.cancel(7L, new CancelRequest("Moving away", null, "WRITE_OFF"));

        verify(pendingPayments).writeOff(eq(5L), any());
        assertEquals("cancelled", m.getMembershipStatus());
    }

    @Test
    void unpaidExpiryDueIsCancelledNotDemanded() {
        Member m = member();
        m.setOutstandingBalance(new BigDecimal("250.00"));
        Receipt due = openBill(6, ExpiryDueService.EXPIRY_DUE_TYPE, "250.00", "0");

        service.cancel(7L, new CancelRequest("Moving away", null, null));

        assertEquals("Cancelled", due.getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(m.getOutstandingBalance()));
        verify(pendingPayments, never()).writeOff(anyLong(), any());
    }

    @Test
    void duesCanOnlyBeTakenFromARefundThatCoversThem() {
        member();
        paidBill(1, "300.00", -15, 15);  // policy 150
        openBill(5, "Add-on", "200.00", "0");

        assertThrows(BusinessRuleViolationException.class, () -> service.cancelWithRefund(7L,
                new RefundCancelRequest("Moving away", null, "DEDUCT", new BigDecimal("150.00"), "Cash",
                        null, null, null, null)));
        verify(refunds, never()).refund(any());
    }

    // ── Refund cap & effects ──────────────────────────────────────────────────

    @Test
    void refundAbovePolicyIsRefused() {
        member();
        paidBill(1, "300.00", -15, 15);

        assertThrows(BusinessRuleViolationException.class, () -> service.cancelWithRefund(7L,
                new RefundCancelRequest("Moving away", null, null, new BigDecimal("150.01"), "Cash",
                        null, null, null, null)));
    }

    @Test
    void walletIsNotARefundMethodForCancellation() {
        member();
        paidBill(1, "300.00", -15, 15);

        assertThrows(BusinessRuleViolationException.class, () -> service.cancelWithRefund(7L,
                new RefundCancelRequest("Moving away", null, null, new BigDecimal("100.00"), "Wallet",
                        null, null, null, null)));
    }

    @Test
    void partialRefundIsSplitOverBillsAndCancelsThePlan() {
        member();
        paidBill(1, "200.00", 5, 35);    // policy 200
        paidBill(2, "300.00", -15, 15);  // policy 150 → total 350
        when(refunds.refund(any())).thenAnswer(inv -> {
            MemberRefundService.RefundRequest r = inv.getArgument(0);
            return new MemberRefundService.Refund(r.receiptId(), "CN-" + r.receiptId(), LocalDate.now(), null, 7L, "GYM7",
                    "Ahmed", null, r.receiptId(), null, null, "Renewal", "Gold", r.amount(), r.amount(), BigDecimal.ZERO,
                    r.method(), null, null, r.reasonCode(), null, null, r.notes(), true, null, null,
                    MemberRefundService.SOURCE, null);
        });

        service.cancelWithRefund(7L, new RefundCancelRequest("Moving away", null, null,
                new BigDecimal("175.00"), "Cash", null, null, null, null));   // 50%

        ArgumentCaptor<MemberRefundService.RefundRequest> req = ArgumentCaptor.forClass(MemberRefundService.RefundRequest.class);
        verify(refunds, times(2)).refund(req.capture());
        BigDecimal total = req.getAllValues().stream().map(MemberRefundService.RefundRequest::amount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertEquals(0, new BigDecimal("175.00").compareTo(total));
        assertTrue(req.getAllValues().stream().allMatch(r -> Boolean.TRUE.equals(r.cancelPlan())));
        assertEquals(0, new BigDecimal("100.00").compareTo(req.getAllValues().get(0).amount()));
    }

    @Test
    void cancellingArchivesTheMemberButKeepsTheirAppAccountLinked() {
        Member m = member();
        Receipt bill = paidBill(1, "300.00", -15, 15);
        when(deferredRevenue.forfeitOnCancel(1L)).thenReturn(new BigDecimal("140.00"));

        service.cancel(7L, new CancelRequest("Moving away", "Relocating to Abu Dhabi", null));

        assertEquals("cancelled", m.getMembershipStatus());
        assertEquals(LocalDate.now().atStartOfDay(), m.getMembershipEndDate());
        assertEquals(900L, m.getGlobalUserId(), "the app account is the person's own and stays linked");
        assertEquals(MemberAccessState.CANCELLED, MemberAccessState.of(m));
        assertEquals("Moving away", m.getCancellationReason());
        assertEquals("Paid", bill.getStatus(), "without a refund the bill stays paid — the gym keeps the money");
        verify(bookingService).cancelUpcomingForMembershipCancellation(7L);
        verify(financialEvents).onCancellationRevenueKept(1L, "Ahmed", new BigDecimal("140.00"));
        ArgumentCaptor<MemberCancellation> row = ArgumentCaptor.forClass(MemberCancellation.class);
        verify(cancellations).save(row.capture());
        assertFalse(row.getValue().isWithRefund());
    }

    @Test
    void familyHeadIsCancelledWithTheirHousehold() {
        Member head = member();
        head.setIsFamilyHead(true);
        Member child = new Member();
        child.setId(8L);
        child.setMemberId("GYM8");
        child.setName("Sara");
        child.setFamilyHeadId("GYM7");
        child.setMembershipStatus("active");
        when(members.findByFamilyHeadId("GYM7")).thenReturn(List.of(child));
        when(receipts.findByMemberDbIdOrderByTransactionDateAsc(8L)).thenReturn(List.of());

        var result = service.cancel(7L, new CancelRequest("Moving away", null, null));

        assertEquals(List.of("Ahmed", "Sara"), result.members());
        assertEquals("cancelled", child.getMembershipStatus());
        assertTrue(child.getCancellationReason().contains("family of Ahmed"));
    }

    @Test
    void alreadyCancelledMemberCannotBeCancelledAgain() {
        Member m = member();
        m.setMembershipStatus("cancelled");

        assertThrows(BusinessRuleViolationException.class,
                () -> service.cancel(7L, new CancelRequest("Moving away", null, null)));
    }

    @Test
    void holdSuspendsUntilDuesAreCleared() {
        Member m = member();
        openBill(5, "Renewal", "400.00", "100.00");

        service.hold(7L, new MembershipCancellationService.HoldRequest("Moving away", null, false));

        assertTrue(m.isMembershipSuspended());
        assertTrue(m.isOnCancellationHold());
        assertEquals("active", m.getMembershipStatus());
        // The dues stay collectable while on hold.
        assertDoesNotThrow(() -> MemberSuspension.requireCanPayDues(m, "taking a payment"));
        assertThrows(BusinessRuleViolationException.class, () -> MemberSuspension.requireUsable(m, "booking"));
    }

    // ── Approval Required ─────────────────────────────────────────────────────

    private void signedInAs(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                "someone@gym.test", null, List.of(new org.springframework.security.core.authority.SimpleGrantedAuthority(role))));
    }

    @Test
    void withApprovalRequiredReceptionOnlySendsARequest() {
        policy(Map.of("refund_method", "prorated", "approval_required", "true"));
        signedInAs("ROLE_RECEPTIONIST");
        Member m = member();
        paidBill(1, "300.00", -15, 15);

        var result = service.cancelWithRefund(7L, new RefundCancelRequest("Moving away", null, null,
                new BigDecimal("150.00"), "Cash", null, null, null, null));

        assertEquals("PENDING_APPROVAL", result.outcome());
        assertEquals("active", m.getMembershipStatus(), "nothing changes until it's approved");
        verify(refunds, never()).refund(any());
        ArgumentCaptor<com.company.project.entities.MemberCancellationRequest> saved =
                ArgumentCaptor.forClass(com.company.project.entities.MemberCancellationRequest.class);
        verify(requests).save(saved.capture());
        assertEquals(0, new BigDecimal("150.00").compareTo(saved.getValue().getRefundAmount()));
        assertEquals("Cash", saved.getValue().getRefundMethod());
    }

    @Test
    void requestIsStillCheckedAgainstThePolicyCap() {
        policy(Map.of("refund_method", "prorated", "approval_required", "true"));
        signedInAs("ROLE_RECEPTIONIST");
        member();
        paidBill(1, "300.00", -15, 15);

        assertThrows(BusinessRuleViolationException.class, () -> service.cancelWithRefund(7L,
                new RefundCancelRequest("Moving away", null, null, new BigDecimal("200.00"), "Cash", null, null, null, null)));
        verify(requests, never()).save(any());
    }

    @Test
    void managerCancelsDirectlyEvenWithApprovalRequired() {
        policy(Map.of("approval_required", "true"));
        signedInAs("ROLE_MANAGER");
        Member m = member();

        var result = service.cancel(7L, new CancelRequest("Moving away", null, null));

        assertEquals("CANCELLED", result.outcome());
        assertEquals("cancelled", m.getMembershipStatus());
    }

    @Test
    void approvingCarriesOutTheRequestAsAsked() {
        signedInAs("ROLE_ADMIN");
        Member m = member();
        var r = new com.company.project.entities.MemberCancellationRequest();
        r.setMemberDbId(7L);
        r.setStatus(com.company.project.entities.MemberCancellationRequest.STATUS_PENDING);
        r.setReason("Moving away");
        when(requests.findById(5L)).thenReturn(Optional.of(r));

        service.approve(5L);

        assertEquals("cancelled", m.getMembershipStatus());
        assertEquals(com.company.project.entities.MemberCancellationRequest.STATUS_APPROVED, r.getStatus());
    }

    @Test
    void onlyAdminsAndManagersCanApprove() {
        signedInAs("ROLE_RECEPTIONIST");
        assertThrows(BusinessRuleViolationException.class, () -> service.approve(5L));
        assertThrows(BusinessRuleViolationException.class, () -> service.reject(5L, "no"));
    }

    @Test
    void secondRequestForTheSameMemberIsRefused() {
        Member m = member();
        var pending = new com.company.project.entities.MemberCancellationRequest();
        pending.setRequestedBy("Front desk");
        when(requests.findFirstByMemberDbIdAndStatus(7L, "PENDING")).thenReturn(Optional.of(pending));

        assertThrows(BusinessRuleViolationException.class,
                () -> service.cancel(7L, new CancelRequest("Moving away", null, null)));
        assertEquals("active", m.getMembershipStatus());
    }
}
