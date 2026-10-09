package com.company.project.services;

import com.company.project.dto.BookingRequestDTO;
import com.company.project.dto.BookingResponseDTO;
import com.company.project.dto.BookingStatusUpdateDTO;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.entities.TrainingSession;
import com.company.project.enums.PassContext;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.TrainingSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Free PT / Class Reward Passes paying for a booking, and coming back when it's cancelled. */
class BookingRewardPassTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private TrainingSessionRepository sessionRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private NotificationService notificationService;
    @Mock private QrCodeService qrCodeService;
    @Mock private RewardRedemptionService rewardRedemptionService;
    @Mock private DiscountCodeService discountCodeService;
    @Mock private WalletService walletService;
    @Mock private ReceiptService receiptService;
    @Mock private com.company.project.repositories.ReceiptRepository receiptRepository;
    @Mock private FinancialEventService financialEventService;

    private BookingService service;
    private TrainingSession session;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        BookingPaymentService payments = new BookingPaymentService(rewardRedemptionService, discountCodeService,
                walletService, receiptService, receiptRepository, memberRepository, financialEventService,
                notificationService);
        service = new BookingService(bookingRepository, sessionRepository, memberRepository,
                notificationService, qrCodeService, rewardRedemptionService, payments);

        session = new TrainingSession();
        session.setId(1L);
        session.setType("pt");
        session.setPrice(new BigDecimal("150"));
        when(sessionRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(session));

        Member member = new Member();
        member.setId(10L);
        member.setMemberId("MBR-10");
        when(memberRepository.findById(10L)).thenReturn(Optional.of(member));

        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            if (b.getId() == null) b.setId(55L);
            return b;
        });
    }

    private BookingRequestDTO request(Long memberId, Long passId) {
        BookingRequestDTO req = new BookingRequestDTO();
        req.setSessionId(1L);
        req.setMemberId(memberId);
        req.setRewardPassId(passId);
        return req;
    }

    @Test
    void passPaysForPtBooking() {
        BookingResponseDTO dto = service.createBooking(request(10L, 7L));

        verify(rewardRedemptionService).consumePass(7L, "MBR-10", PassContext.PT, 55L);
        assertEquals(0, BigDecimal.ZERO.compareTo(dto.getPrice()));
        assertEquals(7L, dto.getRewardId());
    }

    @Test
    void bookingWithoutPassKeepsSessionPrice() {
        BookingResponseDTO dto = service.createBooking(request(10L, null));

        verify(rewardRedemptionService, never()).consumePass(anyLong(), any(), any(), anyLong());
        assertEquals(0, new BigDecimal("150").compareTo(dto.getPrice()));
    }

    @Test
    void passRejectedForFacilitySessions() {
        session.setType("facility");
        assertThrows(BusinessRuleViolationException.class, () -> service.createBooking(request(10L, 7L)));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void passRejectedForGuestBookings() {
        BookingRequestDTO req = request(null, 7L);
        req.setGuestName("Guest");
        req.setGuestEmail("g@example.com");
        req.setGuestPhone("0500000000");
        assertThrows(BusinessRuleViolationException.class, () -> service.createBooking(req));
    }

    @Test
    void cancellingBookingRestoresPassOnce() {
        Booking booking = new Booking();
        booking.setId(55L);
        booking.setRewardId(7L);
        booking.setStatus("confirmed");
        when(bookingRepository.findById(55L)).thenReturn(Optional.of(booking));

        BookingStatusUpdateDTO update = new BookingStatusUpdateDTO();
        update.setStatus("cancelled");
        service.updateStatus(55L, update);
        // A second cancel is refused, so the pass can't be given back twice.
        assertThrows(BusinessRuleViolationException.class, () -> service.updateStatus(55L, update));

        verify(rewardRedemptionService).restorePass(7L);
        assertNull(booking.getRewardId());
    }

    @Test
    void fullSessionIsRefusedWithSessionFull() {
        session.setCapacity(1);
        when(bookingRepository.countBySessionIdAndStatusNot(1L, "cancelled")).thenReturn(1L);
        assertThrows(com.company.project.exceptions.SessionFullException.class,
                () -> service.createBooking(request(10L, null)));
        verify(bookingRepository, never()).save(any());
    }
}
