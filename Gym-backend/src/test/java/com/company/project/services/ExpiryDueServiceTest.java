package com.company.project.services;

import com.company.project.entities.Member;
import com.company.project.entities.MembershipPlan;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.MembershipPlanRepository;
import com.company.project.repositories.ReceiptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.*;

/** Expiry dues: raised once at the plan's current price; paying renews from today; a renewal replaces an unpaid due. */
class ExpiryDueServiceTest {

    @Mock private MemberRepository memberRepository;
    @Mock private MembershipPlanRepository planRepository;
    @Mock private ReceiptRepository receiptRepository;
    @Mock private VoucherNumberService voucherNumberService;

    private ExpiryDueService service;
    private Member john;
    private MembershipPlan golden;
    private final LocalDateTime expiredOn = LocalDate.now().minusDays(1).atTime(23, 59);

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new ExpiryDueService(memberRepository, planRepository, receiptRepository, voucherNumberService);

        golden = new MembershipPlan();
        golden.setName("Golden");
        golden.setPrice(new BigDecimal("500"));
        golden.setDurationType("months");
        golden.setDurationValue("1");

        john = new Member();
        john.setId(7L);
        john.setMemberId("MBR-7");
        john.setName("John");
        john.setMembershipPlan("Golden");
        john.setMembershipFee(new BigDecimal("450")); // had a discount last time
        john.setMembershipStatus("active");
        john.setMembershipEndDate(expiredOn);
        john.setOutstandingBalance(BigDecimal.ZERO);
        john.setPaymentStatus("paid");

        when(memberRepository.findById(7L)).thenReturn(Optional.of(john));
        when(planRepository.findByName("Golden")).thenReturn(Optional.of(golden));
        when(receiptRepository.save(any(Receipt.class))).thenAnswer(inv -> {
            Receipt r = inv.getArgument(0);
            if (r.getId() == null) r.setId(99L);
            return r;
        });
        when(voucherNumberService.next("INV")).thenReturn("INV-1");
    }

    @Test
    void raisesOneDueAtThePlansCurrentPrice() {
        assertTrue(service.raiseDueFor(7L));

        ArgumentCaptor<Receipt> bill = ArgumentCaptor.forClass(Receipt.class);
        verify(receiptRepository, atLeastOnce()).save(bill.capture());
        Receipt due = bill.getValue();
        assertEquals(ExpiryDueService.EXPIRY_DUE_TYPE, due.getTransactionType());
        assertEquals(0, new BigDecimal("500").compareTo(due.getAmount()));
        assertEquals("Pending", due.getStatus());
        assertEquals(7L, due.getRenewsMemberId());
        assertEquals(0, new BigDecimal("500").compareTo(john.getOutstandingBalance()));
        assertEquals("pending", john.getPaymentStatus());
        assertEquals(expiredOn, john.getExpiryDueRaisedFor());

        // Only once per expiry: the due just raised is dated after the end date
        when(receiptRepository.existsByRenewsMemberIdAndTransactionDateGreaterThanEqual(7L, expiredOn)).thenReturn(true);
        assertFalse(service.raiseDueFor(7L));
    }

    @Test
    void memberExpiredLongBeforeThisShippedStillGetsADue() {
        LocalDateTime longAgo = LocalDate.now().minusYears(2).atStartOfDay();
        john.setMembershipEndDate(longAgo);
        john.setExpiryDueRaisedFor(longAgo); // stamped by the V137 back-fill
        assertTrue(service.raiseDueFor(7L));
        assertEquals(0, new BigDecimal("500").compareTo(john.getOutstandingBalance()));
    }

    @Test
    void noDueWhileStillOnLastDayOrFrozen() {
        john.setMembershipEndDate(LocalDate.now().atTime(23, 59));
        assertFalse(service.raiseDueFor(7L));

        john.setMembershipEndDate(expiredOn);
        john.setMembershipStatus("frozen");
        assertFalse(service.raiseDueFor(7L));
        assertNull(john.getExpiryDueRaisedFor()); // re-checked once unfrozen
    }

    @Test
    void payingTheDueRenewsFromToday() {
        Receipt due = new Receipt();
        due.setTransactionType(ExpiryDueService.EXPIRY_DUE_TYPE);
        due.setStatus("Paid");
        due.setRenewsMemberId(7L);
        due.setMemberDbId(7L);
        due.setPlanName("Golden");
        due.setAmount(new BigDecimal("500"));

        service.onBillPaid(due);

        LocalDate expectedEnd = LocalDate.now().plusMonths(1);
        assertEquals(expectedEnd, john.getMembershipEndDate().toLocalDate());
        assertEquals(expectedEnd, john.getExpiryDate().toLocalDate());
        assertEquals("Renewal", due.getTransactionType());
        assertEquals(LocalDate.now(), due.getValidFrom().toLocalDate());
    }

    @Test
    void renewalCancelsAnUnpaidDue() {
        john.setOutstandingBalance(new BigDecimal("500"));
        Receipt due = new Receipt();
        due.setTransactionType(ExpiryDueService.EXPIRY_DUE_TYPE);
        due.setStatus("Pending");
        due.setMemberDbId(7L);
        due.setRenewsMemberId(7L);
        due.setAmount(new BigDecimal("500"));
        due.setTotalPaidToDate(BigDecimal.ZERO);
        when(receiptRepository.findByRenewsMemberIdAndStatusIn(eq(7L), anyCollection())).thenReturn(List.of(due));

        service.replaceOpenDueOnRenewal(john);

        assertEquals("Cancelled", due.getStatus());
        assertEquals(0, BigDecimal.ZERO.compareTo(john.getOutstandingBalance()));
    }

    @Test
    void renewalRefusedWhenDuePartlyPaid() {
        Receipt due = new Receipt();
        due.setTransactionType(ExpiryDueService.EXPIRY_DUE_TYPE);
        due.setStatus("Partial");
        due.setMemberDbId(7L);
        due.setRenewsMemberId(7L);
        due.setAmount(new BigDecimal("500"));
        due.setTotalPaidToDate(new BigDecimal("200"));
        when(receiptRepository.findByRenewsMemberIdAndStatusIn(eq(7L), anyCollection())).thenReturn(List.of(due));

        assertThrows(BusinessRuleViolationException.class, () -> service.replaceOpenDueOnRenewal(john));
    }
}
