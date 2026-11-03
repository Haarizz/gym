package com.company.project.services;

import com.company.project.dto.SessionOverviewDTO;
import com.company.project.dto.TrainingSessionRequestDTO;
import com.company.project.dto.TrainingSessionResponseDTO;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.entities.SessionReview;
import com.company.project.entities.StaffRating;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.entities.Staff;
import com.company.project.entities.TrainingSession;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.SessionReviewRepository;
import com.company.project.repositories.StaffRatingRepository;
import com.company.project.services.mobile.push.SessionMemberNotifier;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.TrainingSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class TrainingSessionService {

    /** Session lifecycle: active (scheduled) → in_progress → completed, or cancelled. */
    public static final List<String> STATUSES = List.of("active", "in_progress", "completed", "cancelled");

    private final TrainingSessionRepository sessionRepository;
    private final BookingRepository bookingRepository;
    private final StaffRepository staffRepository;
    private final RewardRedemptionService rewardRedemptionService;
    private final BookingPaymentService bookingPaymentService;
    private final BookingService bookingService;
    private final SessionReviewRepository sessionReviewRepository;
    private final StaffRatingRepository staffRatingRepository;
    private final SessionMemberNotifier sessionMemberNotifier;

    public TrainingSessionService(TrainingSessionRepository sessionRepository,
                                  BookingRepository bookingRepository,
                                  StaffRepository staffRepository,
                                  RewardRedemptionService rewardRedemptionService,
                                  BookingPaymentService bookingPaymentService,
                                  BookingService bookingService,
                                  SessionReviewRepository sessionReviewRepository,
                                  StaffRatingRepository staffRatingRepository,
                                  SessionMemberNotifier sessionMemberNotifier) {
        this.sessionRepository = sessionRepository;
        this.bookingRepository = bookingRepository;
        this.staffRepository = staffRepository;
        this.rewardRedemptionService = rewardRedemptionService;
        this.bookingPaymentService = bookingPaymentService;
        this.bookingService = bookingService;
        this.sessionReviewRepository = sessionReviewRepository;
        this.staffRatingRepository = staffRatingRepository;
        this.sessionMemberNotifier = sessionMemberNotifier;
    }

    // @Transactional is what makes BranchFilterAspect enable the branch filter;
    // without it findAll() loads every branch's sessions and BranchSecurityListener
    // rejects the first foreign-branch row on @PostLoad.
    @Transactional(readOnly = true)
    public List<TrainingSessionResponseDTO> getSessions(String type,
                                                        Long trainerId,
                                                        LocalDate startDate,
                                                        LocalDate endDate,
                                                        String search) {
        List<TrainingSession> sessions = sessionRepository.findAll();

        if (StringUtils.hasText(type)) {
            sessions = sessions.stream()
                    .filter(s -> type.equalsIgnoreCase(s.getType()))
                    .collect(Collectors.toList());
        }
        if (trainerId != null) {
            sessions = sessions.stream()
                    .filter(s -> s.getTrainer() != null && trainerId.equals(s.getTrainer().getId()))
                    .collect(Collectors.toList());
        }
        if (startDate != null) {
            sessions = sessions.stream()
                    .filter(s -> s.getDate() != null && !s.getDate().isBefore(startDate))
                    .collect(Collectors.toList());
        }
        if (endDate != null) {
            sessions = sessions.stream()
                    .filter(s -> s.getDate() != null && !s.getDate().isAfter(endDate))
                    .collect(Collectors.toList());
        }
        if (StringUtils.hasText(search)) {
            String lowered = search.toLowerCase();
            sessions = sessions.stream()
                    .filter(s ->
                            (s.getName() != null && s.getName().toLowerCase().contains(lowered))
                            || (s.getLocation() != null && s.getLocation().toLowerCase().contains(lowered))
                            || (s.getTrainer() != null && s.getTrainer().getName() != null
                                && s.getTrainer().getName().toLowerCase().contains(lowered))
                    )
                    .collect(Collectors.toList());
        }

        Map<Long, Integer> bookedCounts = new HashMap<>();
        List<Long> sessionIds = sessions.stream().map(TrainingSession::getId).collect(Collectors.toList());
        if (!sessionIds.isEmpty()) {
            for (Object[] row : bookingRepository.countActiveBySessionIds(sessionIds)) {
                Long sessionId = (Long) row[0];
                Long count = (Long) row[1];
                bookedCounts.put(sessionId, count == null ? 0 : count.intValue());
            }
        }

        Map<Long, Map<String, Integer>> byStatus = new HashMap<>();
        Map<Long, Object[]> reviewSummary = new HashMap<>();
        if (!sessionIds.isEmpty()) {
            for (Object[] row : bookingRepository.countByStatusForSessionIds(sessionIds)) {
                byStatus.computeIfAbsent((Long) row[0], k -> new HashMap<>())
                        .put(String.valueOf(row[1]), ((Long) row[2]).intValue());
            }
            for (Object[] row : sessionReviewRepository.summarizeBySessionIds(sessionIds)) {
                reviewSummary.put((Long) row[0], row);
            }
        }

        List<TrainingSessionResponseDTO> response = new ArrayList<>();
        for (TrainingSession session : sessions) {
            TrainingSessionResponseDTO dto = toResponse(session, bookedCounts.getOrDefault(session.getId(), 0));
            Map<String, Integer> counts = byStatus.getOrDefault(session.getId(), Map.of());
            dto.setCheckedIn(counts.getOrDefault("checked-in", 0));
            dto.setWaitlisted(counts.getOrDefault(BookingService.STATUS_WAITLISTED, 0));
            applyReviewSummary(dto, reviewSummary.get(session.getId()));
            response.add(dto);
        }
        return response;
    }

    private static void applyReviewSummary(TrainingSessionResponseDTO dto, Object[] row) {
        dto.setReviewCount(row == null ? 0 : ((Long) row[1]).intValue());
        dto.setAverageRating(row == null || row[2] == null ? null : Math.round(((Number) row[2]).doubleValue() * 10) / 10.0);
    }

    /** Start / complete / reopen / cancel a session (Trainings & Classes row actions). */
    @Transactional
    public TrainingSessionResponseDTO updateStatus(Long id, String status) {
        String next = status == null ? "" : status.trim().toLowerCase();
        if (!STATUSES.contains(next)) {
            throw new BusinessRuleViolationException("Unknown session status: " + status);
        }
        TrainingSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        if ("cancelled".equalsIgnoreCase(session.getStatus()) && !"cancelled".equals(next)) {
            throw new BusinessRuleViolationException("A cancelled session can't be reopened — create a new one");
        }
        TrainingSessionRequestDTO request = new TrainingSessionRequestDTO();
        request.setStatus(next);
        return updateSession(id, request);
    }

    /** The session dialog: session figures, trainer profile, everyone booked, and reviews. */
    @Transactional(readOnly = true)
    public SessionOverviewDTO getOverview(Long id) {
        TrainingSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        List<Booking> bookings = bookingRepository.findBySessionIdWithMember(id);

        SessionOverviewDTO overview = new SessionOverviewDTO();
        int booked = 0, checkedIn = 0, waitlisted = 0;
        for (Booking booking : bookings) {
            String status = String.valueOf(booking.getStatus()).toLowerCase();
            if (!BookingService.NO_SEAT_STATUSES.contains(status)) booked++;
            if ("checked-in".equals(status)) checkedIn++;
            if (BookingService.STATUS_WAITLISTED.equals(status)) waitlisted++;
            if (!"cancelled".equals(status)) {
                overview.getParticipants().add(toParticipant(booking, BookingService.STATUS_WAITLISTED.equals(status) ? waitlisted : null));
            }
        }
        TrainingSessionResponseDTO dto = toResponse(session, booked);
        dto.setCheckedIn(checkedIn);
        dto.setWaitlisted(waitlisted);

        List<SessionReview> reviews = sessionReviewRepository.findBySessionIdWithMember(id);
        for (SessionReview review : reviews) {
            SessionOverviewDTO.Review r = new SessionOverviewDTO.Review();
            r.setId(review.getId());
            r.setRating(review.getRating());
            r.setComment(review.getComment());
            r.setCreatedAt(review.getCreatedAt());
            if (review.getMember() != null) {
                r.setMemberDbId(review.getMember().getId());
                r.setMemberName(review.getMember().getName());
                r.setMemberPhotoUrl(review.getMember().getPhotoUrl());
            }
            overview.getReviews().add(r);
        }
        dto.setReviewCount(reviews.size());
        dto.setAverageRating(reviews.isEmpty() ? null
                : Math.round(reviews.stream().mapToInt(SessionReview::getRating).average().orElse(0) * 10) / 10.0);

        overview.setSession(dto);
        overview.setTrainer(toTrainer(session.getTrainer()));
        return overview;
    }

    private static SessionOverviewDTO.Participant toParticipant(Booking booking, Integer waitlistPosition) {
        SessionOverviewDTO.Participant p = new SessionOverviewDTO.Participant();
        p.setBookingId(String.valueOf(booking.getId()));
        p.setGuest(booking.isGuest());
        p.setStatus(booking.getStatus());
        p.setPaymentStatus(booking.getPaymentStatus());
        p.setPrice(booking.getPrice());
        p.setWaitlistPosition(waitlistPosition);
        p.setCheckedInAt(booking.getCheckedInAt());
        p.setBookedAt(booking.getCreatedAt());
        Member member = booking.getMember();
        if (member != null) {
            p.setMemberDbId(member.getId());
            p.setMemberCode(member.getMemberId());
            p.setName(member.getName());
            p.setPhone(member.getPhone());
            p.setEmail(member.getEmail());
            p.setPhotoUrl(member.getPhotoUrl());
            p.setPlan(member.getMembershipPlan());
            p.setMembershipStatus(member.getMembershipStatus());
        } else {
            p.setName(booking.getGuestName());
            p.setPhone(booking.getGuestPhone());
            p.setEmail(booking.getGuestEmail());
        }
        return p;
    }

    private SessionOverviewDTO.Trainer toTrainer(Staff staff) {
        if (staff == null) return null;
        SessionOverviewDTO.Trainer t = new SessionOverviewDTO.Trainer();
        t.setId(staff.getId());
        t.setName(staff.getName());
        t.setRole(staff.getRole());
        t.setPhotoUrl(staff.getPhotoUrl());
        if (staff.getJoinDate() != null && !staff.getJoinDate().isAfter(LocalDate.now())) {
            t.setYearsAtGym(Period.between(staff.getJoinDate(), LocalDate.now()).getYears());
        }
        List<StaffRating> ratings = staffRatingRepository.findByStaffIdOrderByUpdatedAtDesc(staff.getId());
        t.setRatingCount(ratings.size());
        if (!ratings.isEmpty()) {
            t.setRating(Math.round(ratings.stream().mapToInt(StaffRating::getRating).average().orElse(0) * 10) / 10.0);
        }
        if (staff.getCertifications() != null) {
            staff.getCertifications().stream()
                    .map(c -> c.getCertName())
                    .filter(StringUtils::hasText)
                    .forEach(t.getCertifications()::add);
        }
        return t;
    }

    /** Longest review comment kept (the app should cap its text box to match). */
    public static final int MAX_REVIEW_COMMENT = 1000;

    /**
     * A member rates a session they booked (1-5, optional comment), once it has started.
     * Reviewing the same session again replaces the earlier review.
     */
    @Transactional
    public SessionOverviewDTO.Review submitMemberReview(Member member, Booking booking, Integer rating, String comment) {
        if (rating == null || rating < 1 || rating > 5) {
            throw new BusinessRuleViolationException("Rating must be between 1 and 5");
        }
        String status = String.valueOf(booking.getStatus()).toLowerCase();
        if ("cancelled".equals(status) || BookingService.STATUS_WAITLISTED.equals(status)
                || BookingPaymentService.STATUS_PENDING_APPROVAL.equals(status)) {
            throw new BusinessRuleViolationException("Only sessions you took part in can be reviewed");
        }
        TrainingSession session = booking.getSession();
        boolean started = "completed".equalsIgnoreCase(session.getStatus())
                || "in_progress".equalsIgnoreCase(session.getStatus())
                || (session.getDate() != null && session.getStartTime() != null
                    && !LocalDateTime.of(session.getDate(), session.getStartTime()).isAfter(LocalDateTime.now()));
        if (!started) {
            throw new BusinessRuleViolationException("You can review this session once it has started");
        }
        String text = comment == null ? null : comment.trim();
        if (text != null && text.length() > MAX_REVIEW_COMMENT) {
            throw new BusinessRuleViolationException("Comments can be at most " + MAX_REVIEW_COMMENT + " characters");
        }

        SessionReview review = sessionReviewRepository.findBySessionIdAndMember_Id(session.getId(), member.getId())
                .orElseGet(SessionReview::new);
        review.setSessionId(session.getId());
        review.setBookingId(booking.getId());
        review.setMember(member);
        review.setRating(rating);
        review.setComment(text == null || text.isEmpty() ? null : text);
        if (review.getBranchId() == null) review.setBranchId(session.getBranchId());
        sessionReviewRepository.save(review);

        SessionOverviewDTO.Review dto = new SessionOverviewDTO.Review();
        dto.setId(review.getId());
        dto.setMemberDbId(member.getId());
        dto.setMemberName(member.getName());
        dto.setRating(review.getRating());
        dto.setComment(review.getComment());
        dto.setCreatedAt(review.getCreatedAt());
        return dto;
    }

    /**
     * Staff "Send Reminder": an in-app notification + push to every member holding a seat
     * (not waitlisted, cancelled or checked in already). Returns how many members it reached.
     */
    @Transactional(readOnly = true)
    public int sendReminder(Long id, String note) {
        TrainingSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        if ("cancelled".equalsIgnoreCase(session.getStatus()) || "completed".equalsIgnoreCase(session.getStatus())) {
            throw new BusinessRuleViolationException("Reminders can only be sent for upcoming sessions");
        }
        // Minute-stamped so a double click sends once, but a later reminder still goes out.
        String stamp = LocalDateTime.now().withSecond(0).withNano(0).toString();
        int sent = 0;
        for (Booking booking : bookingRepository.findBySessionIdWithMember(id)) {
            String status = String.valueOf(booking.getStatus()).toLowerCase();
            if (booking.getMember() == null || !("confirmed".equals(status) || "pending_approval".equals(status))) continue;
            sessionMemberNotifier.notifyReminder(booking.getMember(), session, booking.getId(), note,
                    "SESSION_REMINDER_" + booking.getId() + "_" + stamp);
            sent++;
        }
        return sent;
    }

    @Transactional
    public TrainingSessionResponseDTO createSession(TrainingSessionRequestDTO request) {
        validateRequest(request);

        TrainingSession session = new TrainingSession();
        applyRequest(session, request);
        sessionRepository.save(session);
        return toResponse(session, 0);
    }

    @Transactional
    public TrainingSessionResponseDTO updateSession(Long id, TrainingSessionRequestDTO request) {
        TrainingSession session = sessionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if (request.getCapacity() != null) {
            int booked = Math.toIntExact(bookingRepository.countBySessionIdAndStatusNotIn(id, BookingService.NO_SEAT_STATUSES));
            if (request.getCapacity() < booked) {
                throw new RuntimeException("Capacity cannot be less than current bookings");
            }
        }

        boolean cancelling = "cancelled".equalsIgnoreCase(request.getStatus())
                && !"cancelled".equalsIgnoreCase(session.getStatus());

        applyRequest(session, request);
        sessionRepository.save(session);

        if (cancelling) {
            cancelActiveBookings(id);
        } else if (request.getCapacity() != null) {
            // A bigger session lets waitlisted members in.
            bookingService.promoteFromWaitlist(session);
        }

        int booked = Math.toIntExact(bookingRepository.countBySessionIdAndStatusNotIn(id, BookingService.NO_SEAT_STATUSES));
        return toResponse(session, booked);
    }

    @Transactional
    public void deleteSession(Long id) {
        // Deleting the session deletes its bookings — refund the live ones in full first.
        cancelActiveBookings(id);
        // A pass kept by a member's late cancellation is given back too: the session is gone.
        bookingRepository.findBySessionIdAndRewardIdIsNotNull(id)
                .forEach(b -> rewardRedemptionService.restorePass(b.getRewardId()));
        bookingRepository.deleteBySessionId(id);
        sessionRepository.deleteById(id);
    }

    /** The gym called the session off: every booking on it is cancelled and refunded in full. */
    private void cancelActiveBookings(Long sessionId) {
        for (Booking booking : bookingRepository.findBySessionIdAndStatusNot(sessionId, "cancelled")) {
            bookingPaymentService.settleCancellation(booking,
                    BookingPaymentService.CANCELLED_BY_STAFF, BookingPaymentService.REFUND_METHOD_WALLET);
            booking.setStatus("cancelled");
            bookingRepository.save(booking);
        }
    }

    private void validateRequest(TrainingSessionRequestDTO request) {
        if (!StringUtils.hasText(request.getName())) {
            throw new RuntimeException("Session name is required");
        }
        if (!StringUtils.hasText(request.getType())) {
            throw new RuntimeException("Session type is required");
        }
        if (request.getDate() == null) {
            throw new RuntimeException("Session date is required");
        }
        if (request.getStartTime() == null || request.getEndTime() == null) {
            throw new RuntimeException("Start and end time are required");
        }
    }

    private void applyRequest(TrainingSession session, TrainingSessionRequestDTO request) {
        if (StringUtils.hasText(request.getName())) {
            session.setName(request.getName());
        }
        if (StringUtils.hasText(request.getType())) {
            session.setType(request.getType());
        }
        if (request.getTrainerId() != null) {
            Staff trainer = staffRepository.findById(request.getTrainerId())
                    .orElseThrow(() -> new RuntimeException("Trainer not found"));
            session.setTrainer(trainer);
        }
        if (request.getDate() != null) {
            session.setDate(request.getDate());
        }
        if (request.getStartTime() != null) {
            session.setStartTime(request.getStartTime());
        }
        if (request.getEndTime() != null) {
            session.setEndTime(request.getEndTime());
        }
        if (request.getLocation() != null) {
            session.setLocation(request.getLocation());
        }
        if (request.getCapacity() != null) {
            session.setCapacity(request.getCapacity());
        }
        if (request.getPrice() != null) {
            session.setPrice(request.getPrice());
        }
        if (request.getStatus() != null) {
            session.setStatus(request.getStatus());
        }
        if (request.getDescription() != null) {
            session.setDescription(request.getDescription());
        }

        if ("pt".equalsIgnoreCase(session.getType()) && (session.getCapacity() == null || session.getCapacity() <= 0)) {
            session.setCapacity(1);
        } else if (session.getCapacity() == null || session.getCapacity() <= 0) {
            session.setCapacity(1);
        }

        Integer durationMinutes = request.getDurationMinutes();
        if (durationMinutes == null && session.getStartTime() != null && session.getEndTime() != null) {
            durationMinutes = calculateDuration(session.getStartTime(), session.getEndTime());
        }
        if (durationMinutes != null) {
            session.setDurationMinutes(durationMinutes);
        }
    }

    private int calculateDuration(LocalTime start, LocalTime end) {
        if (start == null || end == null) return 0;
        long minutes = Duration.between(start, end).toMinutes();
        return (int) Math.max(minutes, 0);
    }

    private TrainingSessionResponseDTO toResponse(TrainingSession session, int booked) {
        TrainingSessionResponseDTO dto = new TrainingSessionResponseDTO();
        dto.setId(String.valueOf(session.getId()));
        dto.setName(session.getName());
        dto.setType(session.getType());
        dto.setTrainerId(session.getTrainer() == null ? null : session.getTrainer().getId());
        dto.setTrainerName(session.getTrainer() == null ? null : session.getTrainer().getName());
        dto.setTrainerPhotoUrl(session.getTrainer() == null ? null : session.getTrainer().getPhotoUrl());
        dto.setDate(session.getDate());
        dto.setStartTime(session.getStartTime());
        dto.setEndTime(session.getEndTime());
        dto.setDurationMinutes(session.getDurationMinutes());
        dto.setLocation(session.getLocation());
        dto.setCapacity(session.getCapacity());
        dto.setBooked(booked);
        dto.setPrice(session.getPrice());
        dto.setStatus(session.getStatus());
        dto.setDescription(session.getDescription());
        return dto;
    }
}
