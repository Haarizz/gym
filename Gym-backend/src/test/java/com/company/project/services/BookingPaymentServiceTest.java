package com.company.project.services;

import com.company.project.dto.BookingRequestDTO;
import com.company.project.dto.PaymentSplitDTO;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.entities.TrainingSession;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.MemberRepository;
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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Paying for a booking at booking time, staff approval, and the 2-hour refund rule. */
class BookingPaymentServiceTest {

    @Mock private RewardRedemptionService rewardRedemptionService;
    @Mock private DiscountCodeService discountCodeService;
    @Mock private WalletService walletService;
    @Mock private ReceiptService receiptService;
    @Mock private ReceiptRepository receiptRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private FinancialEventService financialEventService;
    @Mock private NotificationService notificationService;

    private BookingPaymentService service;
    private Member member;
    private TrainingSession session;
    private Booking booking;
    private Receipt receipt;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new BookingPaymentService(rewardRedemptionService, discountCodeService, walletService,
                receiptService, receiptRepository, memberRepository, financialEventService, notificationService);

        member = new Member();
        member.setId(10L);
        member.setMemberId("MBR-10");
        member.setName("Asha");

        session = new TrainingSession();
        session.setId(1L);
        session.setName("Yoga");
        session.setType("class");
        session.setPrice(new BigDecimal("200"));
        startsIn(24 * 60);

        booking = new Booking();
        booking.setId(55L);
        booking.setMember(member);
        booking.setSession(session);
        booking.setStatus("confirmed");

        receipt = new Receipt();
        receipt.setId(900L);
        when(receiptService.createBookingReceipt(any(), anyString(), any(), any(), any(), anyString(), any(),
                any(), any(), any())).thenAnswer(inv -> {
                    receipt.setAmount(inv.getArgument(3));
                    receipt.setPaidAmount(inv.getArgument(4));
                    receipt.setTotalPaidToDate(inv.getArgument(4));
                    receipt.setPaymentMethod(inv.getArgument(5));
                    return receipt;
                });
        when(receiptService.recordDiscount(any(), any(), any())).thenAnswer(inv -> inv.getArgument(0));
        when(receiptRepository.findById(900L)).thenReturn(Optional.of(receipt));
        when(receiptRepository.save(any(Receipt.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private void startsIn(long minutes) {
        LocalDateTime start = LocalDateTime.now().plusMinutes(minutes);
        session.setDate(start.toLocalDate());
        session.setStartTime(start.toLocalTime());
    }

    private BookingRequestDTO pay(String method, String amount) {
        BookingRequestDTO req = new BookingRequestDTO();
        req.setPaymentMethodUsed(method);
        PaymentSplitDTO leg = new PaymentSplitDTO();
        leg.setMethod(method);
        leg.setAmount(new BigDecimal(amount));
        req.setPaymentBreakdown(new ArrayList<>(List.of(leg)));
        return req;
    }

    /** A booking that was paid `amount` by card and posted. */
    private void paidBooking(String amount) {
        booking.setReceiptId(900L);
        booking.setPrice(new BigDecimal(amount));
        booking.setPaymentStatus("paid");
        receipt.setAmount(new BigDecimal(amount));
        receipt.setPaidAmount(new BigDecimal(amount));
        receipt.setTotalPaidToDate(new BigDecimal(amount));
    }

    // ── Charging ──

    @Test
    void cardPaymentAfterCodeIsPostedAndConfirmed() {
        when(discountCodeService.redeemAtCheckout("SUMMER", new BigDecimal("200.00"), 10L, "Asha"))
                .thenReturn(new BigDecimal("50.00"));
        BookingRequestDTO req = pay("Card", "150");
        req.setCouponCode("SUMMER");
        req.setExpectedAmount(new BigDecimal("150"));

        service.charge(booking, member, session, req);

        assertEquals(0, new BigDecimal("150").compareTo(booking.getPrice()));
        assertEquals(0, new BigDecimal("50").compareTo(booking.getDiscountAmount()));
        assertEquals("Code SUMMER", booking.getDiscountLabel());
        assertEquals("confirmed", booking.getStatus());
        assertEquals("paid", booking.getPaymentStatus());
        assertEquals(900L, booking.getReceiptId());
        verify(receiptService).postBookingReceipt(receipt);
        verify(receiptService, never()).markPendingApproval(any());
    }

    @Test
    void cashPaymentWaitsForStaffApproval() {
        service.charge(booking, member, session, pay("Cash", "200"));

        assertEquals(BookingPaymentService.STATUS_PENDING_APPROVAL, booking.getStatus());
        assertEquals("pending", booking.getPaymentStatus());
        verify(receiptService).markPendingApproval(receipt);
        verify(receiptService, never()).postBookingReceipt(any());
    }

    @Test
    void walletCoversPartAndTheRestByCard() {
        BookingRequestDTO req = pay("Card", "150");
        req.setWalletAmount(new BigDecimal("50"));

        service.charge(booking, member, session, req);

        verify(walletService).debit(eq("MBR-10"), eq(new BigDecimal("50.00")), eq("BOOKING"), eq(55L), anyString());
        assertEquals("Mixed", receipt.getPaymentMethod());
        assertEquals(0, new BigDecimal("200").compareTo(receipt.getPaidAmount()));
        assertEquals(0, new BigDecimal("50").compareTo(booking.getWalletAmount()));
        verify(receiptService).postBookingReceipt(receipt);
    }

    @Test
    void cashChangeIsNotCountedAsPayment() {
        service.charge(booking, member, session, pay("Cash", "500"));
        assertEquals(0, new BigDecimal("200").compareTo(receipt.getPaidAmount()));
    }

    @Test
    void priceChangeSinceTheAppShowedItIsRefused() {
        BookingRequestDTO req = pay("Card", "180");
        req.setExpectedAmount(new BigDecimal("180"));
        assertThrows(BusinessRuleViolationException.class, () -> service.charge(booking, member, session, req));
        verify(receiptService, never()).postBookingReceipt(any());
    }

    @Test
    void pricedSessionNeedsAPayment() {
        assertThrows(BusinessRuleViolationException.class,
                () -> service.charge(booking, member, session, new BookingRequestDTO()));
    }

    @Test
    void partPaymentByCardIsRefused() {
        assertThrows(BusinessRuleViolationException.class,
                () -> service.charge(booking, member, session, pay("Card", "100")));
    }

    @Test
    void freeSessionTakesNoPayment() {
        session.setPrice(null);
        service.charge(booking, member, session, new BookingRequestDTO());
        assertNull(booking.getReceiptId());
        assertNull(booking.getPaymentStatus());
    }

    // ── Cancellation & refunds ──

    @Test
    void memberCancellingBeforeTheCutoffIsRefundedToWallet() {
        paidBooking("150");

        service.settleCancellation(booking, BookingPaymentService.CANCELLED_BY_MEMBER, "WALLET");

        verify(walletService).credit(eq("MBR-10"), eq(new BigDecimal("150.00")), eq("BOOKING_REFUND"), eq(55L), anyString());
        verify(financialEventService).onBookingRefundedToWallet(55L, "Asha", new BigDecimal("150.00"));
        assertEquals(BookingPaymentService.REFUND_REFUNDED, booking.getRefundStatus());
        assertEquals("WALLET", booking.getRefundMethod());
    }

    @Test
    void memberCancellingInsideTwoHoursIsNotRefunded() {
        startsIn(90);
        paidBooking("150");
        booking.setRewardId(7L);

        service.settleCancellation(booking, BookingPaymentService.CANCELLED_BY_MEMBER, "WALLET");

        verify(walletService, never()).credit(any(), any(), any(), any(), any());
        verify(rewardRedemptionService, never()).restorePass(any());
        assertEquals(BookingPaymentService.REFUND_NOT_REFUNDABLE, booking.getRefundStatus());
    }

    @Test
    void staffCancellingInsideTwoHoursStillRefundsInFull() {
        startsIn(30);
        paidBooking("150");

        service.settleCancellation(booking, BookingPaymentService.CANCELLED_BY_STAFF, null);

        verify(walletService).credit(eq("MBR-10"), eq(new BigDecimal("150.00")), eq("BOOKING_REFUND"), eq(55L), anyString());
        assertEquals(BookingPaymentService.REFUND_REFUNDED, booking.getRefundStatus());
        assertEquals("STAFF", booking.getCancelledBy());
    }

    @Test
    void directRefundIsNotAvailableYet() {
        paidBooking("150");
        assertThrows(BusinessRuleViolationException.class,
                () -> service.settleCancellation(booking, BookingPaymentService.CANCELLED_BY_MEMBER, "DIRECT"));
        verify(walletService, never()).credit(any(), any(), any(), any(), any());
    }

    @Test
    void cancellingBeforeApprovalVoidsThePaymentAndReturnsTheWallet() {
        paidBooking("200");
        booking.setStatus(BookingPaymentService.STATUS_PENDING_APPROVAL);
        booking.setWalletAmount(new BigDecimal("50"));

        service.settleCancellation(booking, BookingPaymentService.CANCELLED_BY_MEMBER, "WALLET");

        verify(receiptService).rejectReceipt(eq(receipt), anyString(), anyString());
        verify(walletService).credit(eq("MBR-10"), eq(new BigDecimal("50")), eq("BOOKING_REFUND"), eq(55L), anyString());
        verify(financialEventService, never()).onBookingRefundedToWallet(any(), any(), any());
        assertEquals(BookingPaymentService.REFUND_VOIDED, booking.getRefundStatus());
    }

    // ── Staff approval ──

    @Test
    void approvingConfirmsTheSeatAndPostsThePayment() {
        paidBooking("200");
        booking.setStatus(BookingPaymentService.STATUS_PENDING_APPROVAL);
        receipt.setApprovalStatus("PENDING");

        service.approve(booking, "reception");

        assertEquals("confirmed", booking.getStatus());
        assertEquals("paid", booking.getPaymentStatus());
        assertEquals("APPROVED", receipt.getApprovalStatus());
        verify(receiptService).postBookingReceipt(receipt);
    }

    @Test
    void rejectingCancelsTheBooking() {
        paidBooking("200");
        booking.setStatus(BookingPaymentService.STATUS_PENDING_APPROVAL);

        service.reject(booking, "reception", "No cash received");

        assertEquals("cancelled", booking.getStatus());
        verify(receiptService).rejectReceipt(receipt, "reception", "No cash received");
        verify(receiptService, never()).postBookingReceipt(any());
    }

    @Test
    void onlyPendingPaymentsCanBeApproved() {
        paidBooking("200");
        assertThrows(BusinessRuleViolationException.class, () -> service.approve(booking, "reception"));
    }

    @Test
    void receiptCaptureUsesNetAmount() {
        ArgumentCaptor<BigDecimal> amount = ArgumentCaptor.forClass(BigDecimal.class);
        service.charge(booking, member, session, pay("Card", "200"));
        verify(receiptService).createBookingReceipt(any(), anyString(), any(), amount.capture(), any(), anyString(),
                any(), any(), any(), any());
        assertEquals(0, new BigDecimal("200").compareTo(amount.getValue()));
    }
}
