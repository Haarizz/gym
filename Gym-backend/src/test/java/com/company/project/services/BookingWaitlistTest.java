package com.company.project.services;

import com.company.project.dto.BookingRequestDTO;
import com.company.project.dto.BookingResponseDTO;
import com.company.project.dto.BookingStatusUpdateDTO;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.entities.TrainingSession;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.SessionFullException;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.TrainingSessionRepository;
import com.company.project.services.mobile.push.SessionMemberNotifier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Waitlist on full sessions, moving members in when a seat frees up, and check-in times. */
class BookingWaitlistTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private TrainingSessionRepository sessionRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private NotificationService notificationService;
    @Mock private QrCodeService qrCodeService;
    @Mock private RewardRedemptionService rewardRedemptionService;
    @Mock private BookingPaymentService bookingPaymentService;
    @Mock private SessionMemberNotifier sessionMemberNotifier;

    private BookingService service;
    private TrainingSession session;
    private Member member;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new BookingService(bookingRepository, sessionRepository, memberRepository,
                notificationService, qrCodeService, rewardRedemptionService, bookingPaymentService, sessionMemberNotifier);

        session = new TrainingSession();
        session.setId(1L);
        session.setName("Yoga Flow");
        session.setType("class");
        session.setCapacity(2);
        session.setPrice(new BigDecimal("40"));
        when(sessionRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(session));

        member = new Member();
        member.setId(10L);
        member.setMemberId("MBR-10");
        when(memberRepository.findById(10L)).thenReturn(Optional.of(member));

        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            if (b.getId() == null) b.setId(55L);
            return b;
        });
    }

    private void seatsTaken(long taken) {
        when(bookingRepository.countBySessionIdAndStatusNotIn(1L, BookingService.NO_SEAT_STATUSES)).thenReturn(taken);
    }

    private BookingRequestDTO request(Boolean waitlist) {
        BookingRequestDTO req = new BookingRequestDTO();
        req.setSessionId(1L);
        req.setMemberId(10L);
        req.setWaitlist(waitlist);
        return req;
    }

    private Booking booking(long id, String status) {
        Booking b = new Booking();
        b.setId(id);
        b.setSession(session);
        b.setMember(member);
        b.setStatus(status);
        return b;
    }

    private static BookingStatusUpdateDTO status(String status) {
        BookingStatusUpdateDTO dto = new BookingStatusUpdateDTO();
        dto.setStatus(status);
        return dto;
    }

    @Test
    void fullSessionGoesOnTheWaitlistWhenStaffAskFor() {
        seatsTaken(2);
        BookingResponseDTO dto = service.createBooking(request(true));
        assertEquals(BookingService.STATUS_WAITLISTED, dto.getStatus());
    }

    @Test
    void fullSessionStillRefusedWithoutTheWaitlistFlag() {
        seatsTaken(2);
        assertThrows(SessionFullException.class, () -> service.createBooking(request(null)));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    void membersBookingInTheAppCannotJoinTheWaitlist() {
        seatsTaken(2);
        assertThrows(SessionFullException.class, () -> service.createBooking(request(true), true));
    }

    @Test
    void sessionWithFreeSeatsIgnoresTheWaitlistFlag() {
        seatsTaken(1);
        assertEquals("confirmed", service.createBooking(request(true)).getStatus());
    }

    @Test
    void finishedSessionsTakeNoBookings() {
        session.setStatus("completed");
        assertThrows(BusinessRuleViolationException.class, () -> service.createBooking(request(true)));
    }

    @Test
    void cancellingASeatMovesTheFirstWaitlistedMemberIn() {
        Booking seat = booking(55L, "confirmed");
        Booking first = booking(60L, BookingService.STATUS_WAITLISTED);
        Booking second = booking(61L, BookingService.STATUS_WAITLISTED);
        when(bookingRepository.findById(55L)).thenReturn(Optional.of(seat));
        // After the cancellation one of the two seats is free.
        seatsTaken(1);
        when(bookingRepository.findBySessionIdAndStatusOrderByIdAsc(1L, BookingService.STATUS_WAITLISTED))
                .thenReturn(List.of(first, second));

        service.updateStatus(55L, status("cancelled"));

        assertEquals("confirmed", first.getStatus());
        assertEquals(BookingService.STATUS_WAITLISTED, second.getStatus());
        verify(sessionMemberNotifier).notifyPromoted(member, session, 60L);
        verify(sessionMemberNotifier, never()).notifyPromoted(any(), any(), eq(61L));
    }

    @Test
    void cancellingAWaitlistedBookingPromotesNobody() {
        when(bookingRepository.findById(60L)).thenReturn(Optional.of(booking(60L, BookingService.STATUS_WAITLISTED)));
        service.updateStatus(60L, status("cancelled"));
        verify(bookingRepository, never()).findBySessionIdAndStatusOrderByIdAsc(anyLong(), any());
    }

    @Test
    void movingOffTheWaitlistNeedsAFreeSeat() {
        when(bookingRepository.findById(60L)).thenReturn(Optional.of(booking(60L, BookingService.STATUS_WAITLISTED)));
        seatsTaken(2);
        assertThrows(SessionFullException.class, () -> service.updateStatus(60L, status("confirmed")));

        seatsTaken(1);
        assertEquals("confirmed", service.updateStatus(60L, status("confirmed")).getStatus());
    }

    @Test
    void checkingInStampsTheTimeAndUndoingClearsIt() {
        Booking seat = booking(55L, "confirmed");
        when(bookingRepository.findById(55L)).thenReturn(Optional.of(seat));

        service.updateStatus(55L, status("checked-in"));
        assertNotNull(seat.getCheckedInAt());

        service.updateStatus(55L, status("confirmed"));
        assertNull(seat.getCheckedInAt());
    }
}
