package com.company.project.services.mobile.bookings;

import com.company.project.dto.BookingResponseDTO;
import com.company.project.dto.mobile.bookings.*;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.entities.TrainingSession;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.bookings.MobileMemberBookingRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.BookingService;
import com.company.project.services.TrainingSessionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MobileMemberBookingsServiceTest {

    @Mock private MobileMemberBookingRepository mobileBookingRepository;
    @Mock private BookingRepository bookingRepository;
    @Mock private AttendanceRepository attendanceRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private BookingService bookingService;
    @Mock private TrainingSessionService trainingSessionService;

    @InjectMocks
    private MobileMemberBookingsService mobileMemberBookingsService;

    private UserDetailsImpl principal;
    private Member member;
    private TrainingSession session;
    private Booking booking;

    @BeforeEach
    void setUp() {
        principal = new UserDetailsImpl(1L, "user", "user@example.com", "pass", 
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_MEMBER")), false);
        
        member = new Member();
        member.setId(10L);
        member.setUserId(1L);

        session = new TrainingSession();
        session.setId(100L);
        session.setDate(LocalDate.now().plusDays(1));
        session.setStartTime(LocalTime.of(10, 0));
        session.setEndTime(LocalTime.of(11, 0));
        session.setCapacity(20);

        booking = new Booking();
        booking.setId(500L);
        booking.setMember(member);
        booking.setSession(session);
        booking.setStatus("confirmed");
    }

    @Test
    void testGetUpcomingBookings() {
        when(memberRepository.findByUserId(1L)).thenReturn(Optional.of(member));
        when(mobileBookingRepository.findUpcomingBookings(eq(10L), any(LocalDate.class), any(LocalTime.class)))
                .thenReturn(Collections.singletonList(booking));
        when(bookingRepository.countBySessionIdAndStatusNot(100L, "cancelled")).thenReturn(5L);

        List<MemberBookingDTO> upcoming = mobileMemberBookingsService.getUpcomingBookings(principal);

        assertEquals(1, upcoming.size());
        assertEquals(100L, upcoming.get(0).getClassId());
        assertEquals("CONFIRMED", upcoming.get(0).getStatus());
        assertEquals(15, upcoming.get(0).getAvailableSpots());
    }

    @Test
    void testGetBookingDetails_Unauthorized() {
        when(memberRepository.findByUserId(1L)).thenReturn(Optional.of(member));
        when(mobileBookingRepository.findByIdAndMemberId(500L, 10L)).thenReturn(Optional.empty());

        assertThrows(EntityNotFoundException.class, () -> 
            mobileMemberBookingsService.getBookingDetails(principal, 500L));
    }

    @Test
    void testCreateBooking() {
        when(memberRepository.findByUserId(1L)).thenReturn(Optional.of(member));
        
        BookingResponseDTO bookingResponseDTO = new BookingResponseDTO();
        bookingResponseDTO.setId("500");
        
        when(bookingService.createBooking(any())).thenReturn(bookingResponseDTO);
        when(mobileBookingRepository.findByIdAndMemberId(500L, 10L)).thenReturn(Optional.of(booking));
        when(bookingRepository.countBySessionIdAndStatusNot(100L, "cancelled")).thenReturn(10L);

        CreateMemberBookingRequestDTO req = new CreateMemberBookingRequestDTO();
        req.setClassId(100L);

        MemberBookingDTO result = mobileMemberBookingsService.createBooking(principal, req);
        
        assertNotNull(result);
        assertEquals(500L, result.getId());
        assertEquals("CONFIRMED", result.getStatus());
        verify(bookingService).createBooking(any());
    }

    @Test
    void testCancelBooking() {
        when(memberRepository.findByUserId(1L)).thenReturn(Optional.of(member));
        when(mobileBookingRepository.findByIdAndMemberId(500L, 10L)).thenReturn(Optional.of(booking));

        // The booking session is in the future, so it can be cancelled
        Booking cancelledBooking = new Booking();
        cancelledBooking.setId(500L);
        cancelledBooking.setSession(session);
        cancelledBooking.setStatus("cancelled");
        
        when(mobileBookingRepository.findByIdAndMemberId(500L, 10L)).thenReturn(Optional.of(booking))
                .thenReturn(Optional.of(cancelledBooking));

        MemberBookingDTO result = mobileMemberBookingsService.cancelBooking(principal, 500L);
        
        verify(bookingService).updateStatus(eq(500L), any());
        assertEquals("CANCELLED", result.getStatus());
    }
}
