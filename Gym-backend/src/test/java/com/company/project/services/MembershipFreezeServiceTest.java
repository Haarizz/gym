package com.company.project.services;

import com.company.project.dto.ReceiptResponseDTO;
import com.company.project.dto.RenewalRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.MembershipFreeze;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipFreezeRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.repositories.ReceiptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class MembershipFreezeServiceTest {

    @Mock private MemberRepository memberRepository;
    @Mock private MembershipPlanRepository planRepository;
    @Mock private MembershipFreezeRepository freezeRepository;
    @Mock private ReceiptRepository receiptRepository;
    @Mock private ReceiptService receiptService;
    @Mock private MemberService memberService;

    private MembershipFreezeService service;
    private Member member;
    private final List<MembershipFreeze> history = new ArrayList<>();

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new MembershipFreezeService(memberRepository, planRepository, freezeRepository,
                receiptRepository, receiptService, memberService);

        member = new Member();
        member.setId(7L);
        member.setName("John");
        member.setMembershipStatus("active");
        member.setMembershipPlan("Gold");
        member.setPaymentStatus("paid");
        member.setOutstandingBalance(BigDecimal.ZERO);

        // Plan: 30 days total, 2 freezes, first 10 days free, 5 per extra day.
        MembershipPlan plan = new MembershipPlan();
        plan.setName("Gold");
        plan.setMaxFreezeDays(30);
        plan.setMaxFreezeOccurrences(2);
        plan.setFreeDaysAllowed(10);
        plan.setChargePerExtraDay(new BigDecimal("5.00"));
        when(planRepository.findByName("Gold")).thenReturn(Optional.of(plan));

        when(receiptRepository.findLatestPlanPurchaseDate(7L)).thenReturn(LocalDateTime.now().minusMonths(2));
        when(freezeRepository.findByMemberDbIdAndFreezeStartGreaterThanEqualOrderByFreezeStartAsc(eq(7L), any()))
                .thenReturn(history);
        when(memberRepository.findById(7L)).thenReturn(Optional.of(member));
    }

    private void pastFreeze(int daysLasted, int freeDaysApplied) {
        MembershipFreeze f = new MembershipFreeze();
        f.setFreezeStart(LocalDateTime.now().minusDays(40));
        f.setEndedAt(f.getFreezeStart().plusDays(daysLasted));
        f.setRequestedDays(daysLasted);
        f.setFreeDaysApplied(freeDaysApplied);
        history.add(f);
    }

    @Test
    void allowanceCountsDaysAndFreezesAcrossThePlanPeriod() {
        pastFreeze(6, 6);

        MembershipFreezeService.FreezeAllowance a = service.getAllowance(member, service.findPlan(member));

        assertTrue(a.canFreeze());
        assertEquals(6, a.usedDays());
        assertEquals(24, a.remainingDays());
        assertEquals(1, a.remainingOccurrences());
        assertEquals(4, a.freeDaysRemaining());
    }

    /** A mobile freeze in progress, started daysAgo, as freezeByMember records it. */
    private MembershipFreeze openMobileFreeze(int daysAgo, int requestedDays, int plannedFreeDays) {
        MembershipFreeze f = new MembershipFreeze();
        f.setMemberDbId(7L);
        f.setSource(MembershipFreeze.SOURCE_MOBILE);
        f.setFreezeStart(LocalDateTime.now().minusDays(daysAgo));
        f.setRequestedDays(requestedDays);
        f.setFreeDaysApplied(plannedFreeDays);
        f.setChargePerDay(new BigDecimal("5.00"));
        history.add(f);
        when(freezeRepository.findFirstByMemberDbIdAndEndedAtIsNullOrderByFreezeStartDesc(7L))
                .thenReturn(Optional.of(f));
        return f;
    }

    private void stubBillCreation() {
        when(receiptService.createReceipt(any())).thenAnswer(inv -> {
            Receipt r = inv.getArgument(0);
            r.setId(99L);
            when(receiptRepository.findById(99L)).thenReturn(Optional.of(r));
            return ReceiptResponseDTO.fromEntity(r);
        });
    }

    @Test
    void freezeBeyondFreeDaysQuotesChargeButBillsNothingUpfront() {
        pastFreeze(6, 6); // 4 free days left

        MembershipFreezeService.FreezeResult result = service.freezeByMember(member, 15, "Travel");

        assertEquals(4, result.freeDaysApplied());
        assertEquals(11, result.chargedDays());
        assertEquals(new BigDecimal("55.00"), result.chargeAmount());
        assertEquals(0, member.getOutstandingBalance().signum());
        verify(receiptService, never()).createReceipt(any());

        ArgumentCaptor<MembershipFreeze> record = ArgumentCaptor.forClass(MembershipFreeze.class);
        verify(freezeRepository).save(record.capture());
        assertNull(record.getValue().getChargeReceiptId());
        assertEquals(new BigDecimal("5.00"), record.getValue().getChargePerDay());
        verify(memberService).freezeMember(eq(7L), any());
    }

    @Test
    void unfreezeAfterFullFreezeBillsOnlyDaysBeyondFreeDays() {
        // 12-day freeze, 10 free: ran its full length.
        MembershipFreeze open = openMobileFreeze(12, 12, 10);
        stubBillCreation();

        service.unfreeze(7L, open.getFreezeStart().plusDays(12));

        assertEquals(10, open.getFreeDaysApplied());
        assertEquals(2, open.getChargedDays());
        assertEquals(new BigDecimal("10.00"), open.getChargeAmount());
        assertEquals(99L, open.getChargeReceiptId());
        assertEquals(new BigDecimal("10.00"), member.getOutstandingBalance());
        assertEquals("pending", member.getPaymentStatus());

        ArgumentCaptor<Receipt> bill = ArgumentCaptor.forClass(Receipt.class);
        verify(receiptService).createReceipt(bill.capture());
        assertEquals("Freeze Charge", bill.getValue().getTransactionType());
        assertEquals("Extra freeze days", bill.getValue().getPlanName());
        assertEquals("Pending", bill.getValue().getStatus());
    }

    @Test
    void freeDaysUsedByAnEndedFreezeAreNotOfferedAgain() {
        MembershipFreeze open = openMobileFreeze(12, 12, 10);
        stubBillCreation();
        service.unfreeze(7L, open.getFreezeStart().plusDays(12));

        MembershipFreezeService.FreezeAllowance a = service.getAllowance(member, service.findPlan(member));

        assertEquals(0, a.freeDaysRemaining());
        assertEquals(5, a.chargeableDays(5));
    }

    @Test
    void earlyUnfreezeBillsOnlyDaysActuallyFrozen() {
        // 12-day freeze, 10 free, ended after 4 days: all 4 free, nothing billed, 6 free days left.
        MembershipFreeze open = openMobileFreeze(4, 12, 10);

        service.unfreeze(7L, open.getFreezeStart().plusDays(4));

        assertEquals(4, open.getFreeDaysApplied());
        assertEquals(0, open.getChargedDays());
        verify(receiptService, never()).createReceipt(any());
        assertEquals(6, service.getAllowance(member, service.findPlan(member)).freeDaysRemaining());
    }

    @Test
    void staffFreezeIsNeverBilledOnUnfreeze() {
        MembershipFreeze open = openMobileFreeze(12, 12, 10);
        open.setSource(MembershipFreeze.SOURCE_STAFF);

        service.unfreeze(7L, open.getFreezeStart().plusDays(12));

        assertEquals(10, open.getFreeDaysApplied());
        assertEquals(0, open.getChargedDays());
        verify(receiptService, never()).createReceipt(any());
    }

    @Test
    void freezeWithinFreeDaysIsNotCharged() {
        MembershipFreezeService.FreezeResult result = service.freezeByMember(member, 10, "Travel");

        assertEquals(0, result.chargedDays());
        assertEquals(0, result.chargeAmount().signum());
        verify(receiptService, never()).createReceipt(any());
    }

    @Test
    void rejectsFreezeWhenNoFreezesLeft() {
        pastFreeze(3, 3);
        pastFreeze(3, 3);

        BusinessRuleViolationException e = assertThrows(BusinessRuleViolationException.class,
                () -> service.freezeByMember(member, 5, "Travel"));
        assertTrue(e.getMessage().contains("2 freezes"));
        verify(memberService, never()).freezeMember(anyLong(), any());
    }

    @Test
    void rejectsFreezeLongerThanRemainingDays() {
        pastFreeze(25, 10);

        assertThrows(BusinessRuleViolationException.class, () -> service.freezeByMember(member, 6, "Travel"));
        verify(memberService, never()).freezeMember(anyLong(), any());
    }

    @Test
    void earlyUnfreezeReducesUnpaidCharge() {
        // A 20-day freeze: 10 free + 10 charged (50), unfrozen after 13 days → only 3 charged days used.
        MembershipFreeze open = new MembershipFreeze();
        open.setMemberDbId(7L);
        open.setFreezeStart(LocalDateTime.now().minusDays(13));
        open.setRequestedDays(20);
        open.setFreeDaysApplied(10);
        open.setChargedDays(10);
        open.setChargePerDay(new BigDecimal("5.00"));
        open.setChargeAmount(new BigDecimal("50.00"));
        open.setChargeReceiptId(99L);
        when(freezeRepository.findFirstByMemberDbIdAndEndedAtIsNullOrderByFreezeStartDesc(7L))
                .thenReturn(Optional.of(open));

        Receipt bill = new Receipt();
        bill.setId(99L);
        bill.setMemberDbId(7L);
        bill.setAmount(new BigDecimal("50.00"));
        bill.setTotalPaidToDate(BigDecimal.ZERO);
        bill.setStatus("Pending");
        when(receiptRepository.findById(99L)).thenReturn(Optional.of(bill));
        member.setOutstandingBalance(new BigDecimal("50.00"));

        service.unfreeze(7L);

        assertEquals(new BigDecimal("15.00"), bill.getAmount());
        assertEquals(new BigDecimal("15.00"), member.getOutstandingBalance());
        assertEquals(3, open.getChargedDays());
        assertNotNull(open.getEndedAt());
    }

    @Test
    void renewingWhileFrozenEndsTheFreezeBeforeRenewing() {
        member.setMembershipStatus("frozen");
        MembershipFreeze open = new MembershipFreeze();
        open.setFreezeStart(LocalDateTime.now().minusDays(3));
        when(freezeRepository.findFirstByMemberDbIdAndEndedAtIsNullOrderByFreezeStartDesc(7L))
                .thenReturn(Optional.of(open));
        RenewalRequestDTO request = new RenewalRequestDTO();

        service.renewEndingFreeze(7L, request);

        var order = inOrder(memberService);
        order.verify(memberService).unfreezeMember(eq(7L), any(LocalDateTime.class));
        order.verify(memberService).renewMember(7L, request);
        assertNotNull(open.getEndedAt());
    }

    @Test
    void frozenMemberSeesExpiryPushedOutByTheFreeze() {
        LocalDateTime now = LocalDateTime.of(2026, 10, 2, 12, 0);
        member.setMembershipStatus("frozen");
        member.setExpiryDate(LocalDateTime.of(2026, 10, 10, 0, 0));
        member.setFreezeStartDate(LocalDateTime.of(2026, 10, 1, 0, 0));
        member.setFreezeEndDate(LocalDateTime.of(2026, 10, 4, 0, 0)); // frozen 1–3 Oct

        assertEquals(LocalDateTime.of(2026, 10, 13, 0, 0), MembershipFreezeService.projectedExpiry(member, now));

        // Still frozen past the planned end (no auto-unfreeze): extends up to now.
        assertEquals(LocalDateTime.of(2026, 10, 15, 0, 0),
                MembershipFreezeService.projectedExpiry(member, LocalDateTime.of(2026, 10, 6, 9, 0)));

        member.setMembershipStatus("active");
        assertEquals(LocalDateTime.of(2026, 10, 10, 0, 0), MembershipFreezeService.projectedExpiry(member, now));
    }

    @Test
    void staffEndDateIsTheLastFrozenDay() {
        assertEquals("2026-10-04T00:00:00", MembershipFreezeService.staffEndDateToFreezeEnd("2026-10-03"));
        assertEquals("2026-10-04T00:00:00", MembershipFreezeService.staffEndDateToFreezeEnd("2026-10-03T00:00:00Z"));
    }

    @Test
    void staffFreezeStoresTheDayAfterTheLastFrozenDayAsTheEnd() {
        com.company.project.dto.FreezeRequestDTO request = new com.company.project.dto.FreezeRequestDTO();
        request.setFreezeStartDate("2026-10-01T00:00:00Z");
        request.setFreezeUntil("2026-10-03T00:00:00Z");

        service.freezeByStaff(7L, request);

        ArgumentCaptor<com.company.project.dto.FreezeRequestDTO> sent =
                ArgumentCaptor.forClass(com.company.project.dto.FreezeRequestDTO.class);
        verify(memberService).freezeMember(eq(7L), sent.capture());
        assertEquals("2026-10-04T00:00:00", sent.getValue().getFreezeUntil());
    }

    @Test
    void staffRefreezingAFrozenMemberEndsTheOldFreezeFirst() {
        member.setMembershipStatus("frozen");
        MembershipFreeze open = openMobileFreeze(3, 3, 3);
        open.setSource(MembershipFreeze.SOURCE_STAFF);
        com.company.project.dto.FreezeRequestDTO request = new com.company.project.dto.FreezeRequestDTO();
        request.setFreezeUntil("2026-12-20");

        service.freezeByStaff(7L, request);

        var order = inOrder(memberService);
        order.verify(memberService).unfreezeMember(eq(7L), any(LocalDateTime.class));
        order.verify(memberService).freezeMember(eq(7L), any());
        assertNotNull(open.getEndedAt());
    }

    @Test
    void renewingAnActiveMembershipLeavesFreezeStateAlone() {
        RenewalRequestDTO request = new RenewalRequestDTO();

        service.renewEndingFreeze(7L, request);

        verify(memberService, never()).unfreezeMember(anyLong(), any());
        verify(memberService).renewMember(7L, request);
    }
}
