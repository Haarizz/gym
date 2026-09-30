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

    @Test
    void freezeBeyondFreeDaysRaisesChargeOnOutstandingBalance() {
        pastFreeze(6, 6); // 4 free days left
        when(receiptService.createReceipt(any())).thenAnswer(inv -> {
            Receipt r = inv.getArgument(0);
            r.setId(99L);
            when(receiptRepository.findById(99L)).thenReturn(Optional.of(r));
            return ReceiptResponseDTO.fromEntity(r);
        });

        MembershipFreezeService.FreezeResult result = service.freezeByMember(member, 15, "Travel");

        assertEquals(4, result.freeDaysApplied());
        assertEquals(11, result.chargedDays());
        assertEquals(new BigDecimal("55.00"), result.chargeAmount());
        assertEquals(new BigDecimal("55.00"), member.getOutstandingBalance());
        assertEquals("pending", member.getPaymentStatus());

        ArgumentCaptor<Receipt> bill = ArgumentCaptor.forClass(Receipt.class);
        verify(receiptService).createReceipt(bill.capture());
        assertEquals("Freeze Charge", bill.getValue().getTransactionType());
        assertEquals("Extra freeze days", bill.getValue().getPlanName());
        assertEquals("Pending", bill.getValue().getStatus());

        ArgumentCaptor<MembershipFreeze> record = ArgumentCaptor.forClass(MembershipFreeze.class);
        verify(freezeRepository).save(record.capture());
        assertEquals(99L, record.getValue().getChargeReceiptId());
        verify(memberService).freezeMember(eq(7L), any());
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
    void renewingAnActiveMembershipLeavesFreezeStateAlone() {
        RenewalRequestDTO request = new RenewalRequestDTO();

        service.renewEndingFreeze(7L, request);

        verify(memberService, never()).unfreezeMember(anyLong(), any());
        verify(memberService).renewMember(7L, request);
    }
}
