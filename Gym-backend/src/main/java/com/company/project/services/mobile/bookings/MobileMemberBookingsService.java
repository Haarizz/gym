package com.company.project.services.mobile.bookings;

import com.company.project.dto.BookingRequestDTO;
import com.company.project.dto.BookingResponseDTO;
import com.company.project.dto.BookingStatusUpdateDTO;
import com.company.project.dto.mobile.bookings.*;
import com.company.project.entities.Attendance;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MobileMemberBookingsService {

    private final MobileMemberBookingRepository mobileBookingRepository;
    private final BookingRepository bookingRepository;
    private final AttendanceRepository attendanceRepository;
    private final MemberRepository memberRepository;
    private final BookingService bookingService;
    private final TrainingSessionService trainingSessionService;

    public MobileMemberBookingsService(
            MobileMemberBookingRepository mobileBookingRepository,
            BookingRepository bookingRepository,
            AttendanceRepository attendanceRepository,
            MemberRepository memberRepository,
            BookingService bookingService,
            TrainingSessionService trainingSessionService) {
        this.mobileBookingRepository = mobileBookingRepository;
        this.bookingRepository = bookingRepository;
        this.attendanceRepository = attendanceRepository;
        this.memberRepository = memberRepository;
        this.bookingService = bookingService;
        this.trainingSessionService = trainingSessionService;
    }

    private Member getAuthenticatedMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        return memberRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No member profile linked to this user account"));
    }

    public List<MemberBookingDTO> getUpcomingBookings(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        List<Booking> bookings = mobileBookingRepository.findUpcomingBookings(member.getId(), today, now);
        return bookings.stream().map(b -> mapToMemberBookingDTO(b, false)).collect(Collectors.toList());
    }

    public List<MemberBookingDTO> getPastBookings(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        List<Booking> bookings = mobileBookingRepository.findPastBookings(member.getId(), today, now);
        List<Attendance> attendances = attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(member.getId());

        return bookings.stream().map(b -> {
            boolean attended = isAttended(b, attendances);
            return mapToMemberBookingDTO(b, attended);
        }).collect(Collectors.toList());
    }

    public BookingStatsDTO getBookingStats(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        LocalDate startOfWeek = today.with(DayOfWeek.MONDAY);
        LocalDate endOfWeek = today.with(DayOfWeek.SUNDAY);

        int upcoming = (int) mobileBookingRepository.countUpcomingBookings(member.getId(), today, now);
        int thisWeek = (int) mobileBookingRepository.countBookingsThisWeek(member.getId(), startOfWeek, endOfWeek);
        
        List<Booking> pastBookings = mobileBookingRepository.findPastBookings(member.getId(), today, now);
        List<Attendance> attendances = attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(member.getId());
        int attendedCount = (int) pastBookings.stream().filter(b -> isAttended(b, attendances)).count();

        return new BookingStatsDTO(upcoming, thisWeek, attendedCount);
    }

    public List<AvailableClassDTO> getAvailableClasses(UserDetailsImpl principal, LocalDate date) {
        Member member = getAuthenticatedMember(principal);
        final LocalDate targetDate = (date == null) ? LocalDate.now() : date;

        // Use existing TrainingSessionService to fetch all available sessions for the specific date
        List<com.company.project.dto.TrainingSessionResponseDTO> sessions = trainingSessionService.getSessions(null, null, targetDate, targetDate, null);
        
        // Find existing bookings for this member on this date to check memberBookingState
        List<Booking> memberBookings = mobileBookingRepository.findPastBookings(member.getId(), targetDate.plusDays(1), LocalTime.MIDNIGHT);
        memberBookings.addAll(mobileBookingRepository.findUpcomingBookings(member.getId(), targetDate.minusDays(1), LocalTime.MAX));
        
        Map<Long, String> sessionStatusMap = memberBookings.stream()
                .filter(b -> b.getSession() != null && b.getSession().getDate() != null && b.getSession().getDate().equals(targetDate))
                .collect(Collectors.toMap(b -> b.getSession().getId(), Booking::getStatus, (s1, s2) -> s1));

        List<AvailableClassDTO> availableClasses = new ArrayList<>();
        for (com.company.project.dto.TrainingSessionResponseDTO session : sessions) {
            // Apply booking business logic: exclude cancelled sessions
            if ("cancelled".equalsIgnoreCase(session.getStatus())) {
                continue;
            }

            int capacity = session.getCapacity() != null ? session.getCapacity() : 0;
            int bookedCount = session.getBooked();
            int availableSpots = Math.max(0, capacity - bookedCount);

            AvailableClassDTO dto = new AvailableClassDTO();
            dto.setClassId(Long.valueOf(session.getId()));
            dto.setClassName(session.getName());
            dto.setTrainerName(session.getTrainerName());
            dto.setDate(session.getDate());
            dto.setStartTime(session.getStartTime());
            dto.setEndTime(session.getEndTime());
            dto.setDurationMinutes(session.getDurationMinutes());
            dto.setLocation(session.getLocation());
            dto.setCapacity(capacity);
            dto.setAvailableSpots(availableSpots);
            dto.setMemberBookingState(sessionStatusMap.get(Long.valueOf(session.getId())));

            availableClasses.add(dto);
        }

        return availableClasses;
    }

    public MemberBookingDTO getBookingDetails(UserDetailsImpl principal, Long bookingId) {
        Member member = getAuthenticatedMember(principal);
        Booking booking = mobileBookingRepository.findByIdAndMemberId(bookingId, member.getId())
                .orElseThrow(() -> new EntityNotFoundException("Booking not found or access denied"));

        List<Attendance> attendances = attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(member.getId());
        boolean attended = isAttended(booking, attendances);

        return mapToMemberBookingDTO(booking, attended);
    }

    @Transactional
    public MemberBookingDTO createBooking(UserDetailsImpl principal, CreateMemberBookingRequestDTO request) {
        Member member = getAuthenticatedMember(principal);
        
        // Use existing BookingService which handles capacity checks, waitlists (if any), and notifications
        BookingRequestDTO webRequest = new BookingRequestDTO();
        webRequest.setSessionId(request.getClassId());
        webRequest.setMemberId(member.getId());
        webRequest.setStatus("confirmed"); // Default to confirmed as per existing backend logic

        BookingResponseDTO response = bookingService.createBooking(webRequest);
        
        // Fetch the created booking
        Booking booking = mobileBookingRepository.findByIdAndMemberId(Long.valueOf(response.getId()), member.getId())
                .orElseThrow(() -> new RuntimeException("Booking creation failed or could not be retrieved"));
        
        return mapToMemberBookingDTO(booking, false);
    }

    @Transactional
    public MemberBookingDTO cancelBooking(UserDetailsImpl principal, Long bookingId) {
        Member member = getAuthenticatedMember(principal);
        Booking booking = mobileBookingRepository.findByIdAndMemberId(bookingId, member.getId())
                .orElseThrow(() -> new EntityNotFoundException("Booking not found or access denied"));

        if (!canCancel(booking)) {
            throw new RuntimeException("Booking cannot be cancelled");
        }

        BookingStatusUpdateDTO updateRequest = new BookingStatusUpdateDTO();
        updateRequest.setStatus("cancelled");
        
        // Use existing BookingService which handles notifications and state transitions
        bookingService.updateStatus(bookingId, updateRequest);
        
        Booking updatedBooking = mobileBookingRepository.findByIdAndMemberId(bookingId, member.getId())
                .orElseThrow(() -> new RuntimeException("Could not retrieve updated booking"));
                
        return mapToMemberBookingDTO(updatedBooking, false);
    }

    private boolean isAttended(Booking booking, List<Attendance> attendances) {
        if ("cancelled".equalsIgnoreCase(booking.getStatus())) return false;
        
        if (booking.getSession() != null && booking.getSession().getDate() != null) {
            LocalDate sessionDate = booking.getSession().getDate();
            return attendances.stream().anyMatch(a -> {
                if (a.getBooking() != null && a.getBooking().getId().equals(booking.getId())) return true;
                if (a.getCheckInTime() != null && a.getCheckInTime().toLocalDate().equals(sessionDate)) return true;
                return false;
            });
        }
        return false;
    }

    private boolean canCancel(Booking booking) {
        if ("cancelled".equalsIgnoreCase(booking.getStatus())) return false;
        
        if (booking.getSession() != null) {
            LocalDate sessionDate = booking.getSession().getDate();
            LocalTime sessionTime = booking.getSession().getStartTime();
            if (sessionDate != null && sessionTime != null) {
                LocalDateTime sessionDateTime = LocalDateTime.of(sessionDate, sessionTime);
                return LocalDateTime.now().isBefore(sessionDateTime);
            }
        }
        return true;
    }

    private MemberBookingDTO mapToMemberBookingDTO(Booking booking, boolean isAttended) {
        MemberBookingDTO dto = new MemberBookingDTO();
        dto.setId(booking.getId());
        
        TrainingSession session = booking.getSession();
        if (session != null) {
            dto.setClassId(session.getId());
            dto.setClassName(session.getName());
            dto.setTrainerName(session.getTrainer() != null ? session.getTrainer().getName() : null);
            dto.setDate(session.getDate());
            dto.setStartTime(session.getStartTime());
            dto.setEndTime(session.getEndTime());
            dto.setDurationMinutes(session.getDurationMinutes());
            dto.setLocation(session.getLocation());
            dto.setCapacity(session.getCapacity());
            
            int bookedCount = (int) bookingRepository.countBySessionIdAndStatusNot(session.getId(), "cancelled");
            dto.setAvailableSpots(Math.max(0, (session.getCapacity() != null ? session.getCapacity() : 0) - bookedCount));
        }

        if (isAttended) {
            dto.setStatus("ATTENDED");
        } else {
            dto.setStatus(booking.getStatus() != null ? booking.getStatus().toUpperCase() : "CONFIRMED");
        }
        
        dto.setCanCancel(canCancel(booking));
        
        return dto;
    }
}
