package com.company.project.services;

import com.company.project.dto.BookingRequestDTO;
import com.company.project.dto.BookingResponseDTO;
import com.company.project.dto.BookingStatusUpdateDTO;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.entities.TrainingSession;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.TrainingSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final TrainingSessionRepository sessionRepository;
    private final MemberRepository memberRepository;
    private final NotificationService notificationService;

    public BookingService(BookingRepository bookingRepository,
                          TrainingSessionRepository sessionRepository,
                          MemberRepository memberRepository,
                          NotificationService notificationService) {
        this.bookingRepository = bookingRepository;
        this.sessionRepository = sessionRepository;
        this.memberRepository = memberRepository;
        this.notificationService = notificationService;
    }

    public List<BookingResponseDTO> getBookings(String status,
                                                String type,
                                                LocalDate startDate,
                                                LocalDate endDate,
                                                String search) {
        List<Booking> bookings = bookingRepository.findAll();

        if (StringUtils.hasText(status)) {
            bookings = bookings.stream()
                    .filter(b -> status.equalsIgnoreCase(b.getStatus()))
                    .collect(Collectors.toList());
        }
        if (StringUtils.hasText(type)) {
            bookings = bookings.stream()
                    .filter(b -> b.getSession() != null && type.equalsIgnoreCase(b.getSession().getType()))
                    .collect(Collectors.toList());
        }
        if (startDate != null) {
            bookings = bookings.stream()
                    .filter(b -> b.getSession() != null && b.getSession().getDate() != null
                            && !b.getSession().getDate().isBefore(startDate))
                    .collect(Collectors.toList());
        }
        if (endDate != null) {
            bookings = bookings.stream()
                    .filter(b -> b.getSession() != null && b.getSession().getDate() != null
                            && !b.getSession().getDate().isAfter(endDate))
                    .collect(Collectors.toList());
        }
        if (StringUtils.hasText(search)) {
            String lowered = search.toLowerCase();
            bookings = bookings.stream()
                    .filter(b ->
                            (b.getMember() != null && b.getMember().getName() != null
                                    && b.getMember().getName().toLowerCase().contains(lowered))
                            || (b.getGuestName() != null && b.getGuestName().toLowerCase().contains(lowered))
                            || (b.getSession() != null && b.getSession().getName() != null
                                    && b.getSession().getName().toLowerCase().contains(lowered))
                    )
                    .collect(Collectors.toList());
        }

        List<BookingResponseDTO> response = new ArrayList<>();
        for (Booking booking : bookings) {
            response.add(toResponse(booking));
        }
        return response;
    }

    @Transactional
    public BookingResponseDTO createBooking(BookingRequestDTO request) {
        if (request.getSessionId() == null) {
            throw new RuntimeException("Session is required");
        }

        TrainingSession session = sessionRepository.findById(request.getSessionId())
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if ("cancelled".equalsIgnoreCase(session.getStatus())) {
            throw new RuntimeException("Session is cancelled");
        }

        int booked = Math.toIntExact(bookingRepository.countBySessionIdAndStatusNot(session.getId(), "cancelled"));
        if (session.getCapacity() != null && booked >= session.getCapacity()) {
            throw new RuntimeException("Session is full");
        }

        Member member = null;
        boolean isGuest = request.getMemberId() == null;
        if (!isGuest) {
            member = memberRepository.findById(request.getMemberId())
                    .orElseThrow(() -> new RuntimeException("Member not found"));
        } else {
            if (!StringUtils.hasText(request.getGuestName())
                    || !StringUtils.hasText(request.getGuestEmail())
                    || !StringUtils.hasText(request.getGuestPhone())) {
                throw new RuntimeException("Guest details are required");
            }
        }

        Booking booking = new Booking();
        booking.setSession(session);
        booking.setMember(member);
        booking.setGuest(isGuest);
        booking.setGuestName(request.getGuestName());
        booking.setGuestEmail(request.getGuestEmail());
        booking.setGuestPhone(request.getGuestPhone());
        booking.setStatus(StringUtils.hasText(request.getStatus()) ? request.getStatus() : "confirmed");
        booking.setPrice(session.getPrice());
        booking.setQrCode("QR-" + System.currentTimeMillis() + "-" + session.getId());

        bookingRepository.save(booking);

        String sessionName = session.getName() != null ? session.getName() : "session";
        String today = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        notificationService.notifyRoleAggregated(
                "ADMIN",
                "New Booking",
                "A new booking was made for: " + sessionName,
                "INFO", "LOW", "BOOKINGS",
                "/bookings",
                "BOOKING_CREATED_ADMIN_" + today, 1
        );
        if (member != null && member.getUserId() != null) {
            notificationService.notifyUser(
                    member.getUserId(),
                    "Booking Confirmed",
                    "Your booking for " + sessionName + " is confirmed.",
                    "SUCCESS", "MEDIUM", "BOOKINGS",
                    booking.getId(), "/book-session",
                    "BOOKING_CREATED_" + booking.getId()
            );
        }

        return toResponse(booking);
    }

    @Transactional
    public BookingResponseDTO updateStatus(Long id, BookingStatusUpdateDTO request) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        if (StringUtils.hasText(request.getStatus())) {
            booking.setStatus(request.getStatus());
        }
        bookingRepository.save(booking);

        if ("cancelled".equalsIgnoreCase(request.getStatus())) {
            String sName = booking.getSession() != null && booking.getSession().getName() != null
                    ? booking.getSession().getName() : "session";
            notificationService.notifyRole(
                    "ADMIN",
                    "Booking Cancelled",
                    "Booking for " + sName + " was cancelled.",
                    "WARNING", "MEDIUM", "BOOKINGS",
                    booking.getId(), "/bookings",
                    "BOOKING_CANCELLED_" + booking.getId()
            );
            if (booking.getMember() != null && booking.getMember().getUserId() != null) {
                notificationService.notifyUser(
                        booking.getMember().getUserId(),
                        "Booking Cancelled",
                        "Your booking for " + sName + " has been cancelled.",
                        "WARNING", "MEDIUM", "BOOKINGS",
                        booking.getId(), "/book-session",
                        "BOOKING_CANCELLED_USER_" + booking.getId()
                );
            }
        }

        return toResponse(booking);
    }

    @Transactional
    public void deleteBooking(Long id) {
        bookingRepository.deleteById(id);
    }

    private BookingResponseDTO toResponse(Booking booking) {
        BookingResponseDTO dto = new BookingResponseDTO();
        dto.setId(String.valueOf(booking.getId()));
        dto.setSessionId(booking.getSession() == null ? null : String.valueOf(booking.getSession().getId()));
        dto.setSessionName(booking.getSession() == null ? null : booking.getSession().getName());
        dto.setTrainerName(booking.getSession() != null && booking.getSession().getTrainer() != null
                ? booking.getSession().getTrainer().getName()
                : null);
        dto.setDate(booking.getSession() == null ? null : booking.getSession().getDate());
        dto.setStartTime(booking.getSession() == null ? null : booking.getSession().getStartTime());
        dto.setType(booking.getSession() == null ? null : booking.getSession().getType());
        dto.setStatus(booking.getStatus());
        dto.setPrice(booking.getPrice());
        dto.setQrCode(booking.getQrCode());
        dto.setGuest(booking.isGuest());
        dto.setMemberId(booking.getMember() == null ? null : String.valueOf(booking.getMember().getId()));
        dto.setMemberName(booking.getMember() == null ? booking.getGuestName() : booking.getMember().getName());
        dto.setGuestName(booking.getGuestName());
        dto.setGuestEmail(booking.getGuestEmail());
        dto.setGuestPhone(booking.getGuestPhone());
        dto.setCreatedAt(booking.getCreatedAt());
        return dto;
    }
}
