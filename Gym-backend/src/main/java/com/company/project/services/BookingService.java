package com.company.project.services;

import com.company.project.dto.BookingRequestDTO;
import com.company.project.dto.BookingResponseDTO;
import com.company.project.dto.BookingStatusUpdateDTO;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.entities.PackageEnrolment;
import com.company.project.packages.PackageUsageService;
import com.company.project.repositories.PackageEnrolmentRepository;
import com.company.project.entities.TrainingSession;
import com.company.project.enums.PassContext;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.SessionFullException;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.TrainingSessionRepository;
import com.company.project.services.mobile.push.SessionMemberNotifier;
import com.company.project.services.pos.PosBusinessDayService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Service
public class BookingService {

    /** Booked onto a full session's waitlist: holds no seat and has not been charged. */
    public static final String STATUS_WAITLISTED = "waitlisted";
    /** Booking statuses that don't take a seat on the session. */
    public static final List<String> NO_SEAT_STATUSES = List.of("cancelled", STATUS_WAITLISTED);

    private final BookingRepository bookingRepository;
    private final TrainingSessionRepository sessionRepository;
    private final MemberRepository memberRepository;
    private final NotificationService notificationService;
    private final QrCodeService qrCodeService;
    private final RewardRedemptionService rewardRedemptionService;
    private final BookingPaymentService bookingPaymentService;
    private final SessionMemberNotifier sessionMemberNotifier;
    private final PosBusinessDayService businessDay;
    private final PackageUsageService packageUsage;
    private final PackageEnrolmentRepository enrolmentRepository;

    public BookingService(BookingRepository bookingRepository,
                          TrainingSessionRepository sessionRepository,
                          MemberRepository memberRepository,
                          NotificationService notificationService,
                          QrCodeService qrCodeService,
                          RewardRedemptionService rewardRedemptionService,
                          BookingPaymentService bookingPaymentService,
                          SessionMemberNotifier sessionMemberNotifier,
                          PosBusinessDayService businessDay,
                          PackageUsageService packageUsage,
                          PackageEnrolmentRepository enrolmentRepository) {
        this.bookingRepository = bookingRepository;
        this.sessionRepository = sessionRepository;
        this.memberRepository = memberRepository;
        this.notificationService = notificationService;
        this.qrCodeService = qrCodeService;
        this.rewardRedemptionService = rewardRedemptionService;
        this.bookingPaymentService = bookingPaymentService;
        this.sessionMemberNotifier = sessionMemberNotifier;
        this.businessDay = businessDay;
        this.packageUsage = packageUsage;
        this.enrolmentRepository = enrolmentRepository;
    }

    public List<BookingResponseDTO> getBookings(String status,
                                                String type,
                                                LocalDate startDate,
                                                LocalDate endDate,
                                                String search,
                                                Long memberId) {
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
        if (memberId != null) {
            bookings = bookings.stream()
                    .filter(b -> b.getMember() != null && memberId.equals(b.getMember().getId()))
                    .collect(Collectors.toList());
        }

        List<BookingResponseDTO> response = new ArrayList<>();
        for (Booking booking : bookings) {
            response.add(toResponse(booking));
        }
        return response;
    }

    /**
     * What booking this member into the session would cost at the desk: the package that covers
     * it (nothing to pay), or the price to take.
     */
    @Transactional(readOnly = true)
    public java.util.Map<String, Object> deskQuote(Long sessionId, Long memberId) {
        TrainingSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("Session not found"));
        PackageEnrolment cover = memberId != null ? packageUsage.coverFor(memberId, session) : null;
        java.util.Map<String, Object> out = new java.util.LinkedHashMap<>();
        out.put("price", session.getPrice() != null ? session.getPrice() : BigDecimal.ZERO);
        out.put("enrolment_id", cover != null ? cover.getId() : null);
        out.put("package_name", cover != null ? cover.getPackageName() : null);
        return out;
    }

    /**
     * Staff booking from the web. A member's priced session is paid at the desk (see
     * BookingPaymentService.chargeAtDesk) unless a package or Reward Pass covers it.
     */
    @Transactional
    public BookingResponseDTO createBooking(BookingRequestDTO request) {
        return createBooking(request, false);
    }

    /**
     * memberSelfService: a member booking for themselves in the app, who pays for a
     * priced session now (see BookingPaymentService.charge).
     */
    @Transactional
    public BookingResponseDTO createBooking(BookingRequestDTO request, boolean memberSelfService) {
        if (request.getSessionId() == null) {
            throw new RuntimeException("Session is required");
        }

        // Locked until this transaction ends, so concurrent bookings can't oversell the last seat.
        TrainingSession session = sessionRepository.findByIdForUpdate(request.getSessionId())
                .orElseThrow(() -> new RuntimeException("Session not found"));

        if ("cancelled".equalsIgnoreCase(session.getStatus())) {
            throw new BusinessRuleViolationException("This session has been cancelled");
        }

        if ("completed".equalsIgnoreCase(session.getStatus())) {
            throw new BusinessRuleViolationException("This session has already finished");
        }

        // Bookings awaiting payment approval hold their seat too (anything not cancelled or waitlisted).
        int booked = Math.toIntExact(bookingRepository.countBySessionIdAndStatusNotIn(session.getId(), NO_SEAT_STATUSES));
        boolean waitlisted = false;
        if (session.getCapacity() != null && booked >= session.getCapacity()) {
            // Staff can put someone on the waitlist; they move in when a seat frees up.
            if (memberSelfService || !Boolean.TRUE.equals(request.getWaitlist())) {
                throw new SessionFullException("This session is full — all " + session.getCapacity()
                        + " spots have been booked.");
            }
            if (request.getRewardPassId() != null) {
                throw new BusinessRuleViolationException("A Reward Pass can't hold a waitlist spot — use it once a seat frees up");
            }
            waitlisted = true;
        }

        Member member = null;
        boolean isGuest = request.getMemberId() == null;
        if (!isGuest) {
            member = memberRepository.findById(request.getMemberId())
                    .orElseThrow(() -> new RuntimeException("Member not found"));
            MemberSuspension.requireUsable(member, "booking a session");
        } else {
            if (!StringUtils.hasText(request.getGuestName())
                    || !StringUtils.hasText(request.getGuestEmail())
                    || !StringUtils.hasText(request.getGuestPhone())) {
                throw new RuntimeException("Guest details are required");
            }
        }

        if (memberSelfService && member == null) {
            throw new BusinessRuleViolationException("Member is required");
        }
        // Staff and members alike can only book sessions that haven't started. Session times are
        // the gym's wall clock, so compare against the gym's "now", not the server's (UTC).
        if (session.getDate() != null && session.getStartTime() != null
                && !LocalDateTime.of(session.getDate(), session.getStartTime()).isAfter(LocalDateTime.now(businessDay.zone()))) {
            throw new BusinessRuleViolationException("This session has already started — only upcoming sessions can be booked");
        }
        if (member != null && bookingRepository.existsBySessionIdAndMember_IdAndStatusNot(
                session.getId(), member.getId(), "cancelled")) {
            throw new BusinessRuleViolationException(memberSelfService
                    ? "You have already booked this session"
                    : "This member already has a booking for this session");
        }

        // A Free PT / Class Reward Pass must fit this booking before anything is saved.
        PassContext passContext = null;
        if (request.getRewardPassId() != null && !memberSelfService) {
            if (member == null) {
                throw new BusinessRuleViolationException("Reward Passes can only be used for member bookings");
            }
            passContext = PassContext.forSessionType(session.getType());
            if (passContext == null) {
                throw new BusinessRuleViolationException("Reward Passes can only be used for PT or class sessions");
            }
        }

        // A member's PT booking draws on one of their training packages when one fits. An app
        // booking that already brings a payment (card verified before this runs, wallet, code) is
        // charged as before; it uses a package only when it names one and brings no payment.
        boolean bringsPayment = memberSelfService && bringsPayment(request);
        if (bringsPayment && request.getEnrolmentId() != null) {
            throw new BusinessRuleViolationException("This session is covered by your PT package — book it without paying");
        }
        PackageEnrolment enrolment = null;
        if (member != null && !waitlisted && request.getRewardPassId() == null && !bringsPayment
                && !Boolean.TRUE.equals(request.getSkipPackage())) {
            enrolment = packageUsage.pickFor(member.getId(), session, request.getEnrolmentId());
        } else if (request.getEnrolmentId() != null) {
            throw new BusinessRuleViolationException(waitlisted
                    ? "A waitlist spot can't use a package — book it once a seat frees up"
                    : "This booking can't use a package");
        }

        Booking booking = new Booking();
        booking.setSession(session);
        booking.setMember(member);
        booking.setGuest(isGuest);
        booking.setGuestName(request.getGuestName());
        booking.setGuestEmail(request.getGuestEmail());
        booking.setGuestPhone(request.getGuestPhone());
        booking.setStatus(waitlisted ? STATUS_WAITLISTED
                : StringUtils.hasText(request.getStatus()) ? request.getStatus() : "confirmed");
        booking.setPaymentStatus(request.getPaymentStatus());
        booking.setPrice(session.getPrice());

        // Save first to obtain the booking ID, then generate the HMAC-signed QR
        bookingRepository.save(booking);

        if (enrolment != null) {
            // Covered by the package: nothing to charge.
            booking.setEnrolmentId(enrolment.getId());
            booking.setPrice(BigDecimal.ZERO);
            booking.setGrossPrice(session.getPrice());
            booking.setPaymentStatus(null);
        } else if (memberSelfService) {
            // Prices the booking and takes payment (code/pass, wallet, receipt, approval).
            bookingPaymentService.charge(booking, member, session, request);
        } else if (passContext != null) {
            // Spent in this same transaction — if anything below fails, the pass is untouched.
            rewardRedemptionService.consumePass(request.getRewardPassId(), member.getMemberId(), passContext, booking.getId());
            booking.setRewardId(request.getRewardPassId());
            booking.setPrice(BigDecimal.ZERO);
            booking.setPaymentStatus("paid");
        } else if (member != null && !waitlisted) {
            // Staff booking a member into a priced session: the member pays at the desk now.
            bookingPaymentService.chargeAtDesk(booking, member, session, request);
        }
        booking.setQrCode(qrCodeService.generateBookingQr(booking.getId()));
        bookingRepository.save(booking);

        String sessionName = session.getName() != null ? session.getName() : "session";
        String today = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"));
        notificationService.notifyRoleAggregated(
                "GYMBIOS_ADMIN",
                "New Booking",
                "A new booking was made for: " + sessionName,
                "INFO", "LOW", "BOOKINGS",
                "/bookings",
                "BOOKING_CREATED_ADMIN_" + today, 1
        );
        if (member != null) {
            Long targetId = member.getUserId() != null ? member.getUserId() : member.getGlobalUserId();
            if (targetId != null) {
                try {
                    boolean awaitingApproval = BookingPaymentService.STATUS_PENDING_APPROVAL.equals(booking.getStatus());
                    notificationService.notifyUser(
                            targetId,
                            waitlisted ? "On the Waitlist" : awaitingApproval ? "Booking Received" : "Booking Confirmed",
                            waitlisted
                                    ? "You're on the waitlist for " + sessionName + ". We'll let you know if a spot opens up."
                                    : awaitingApproval
                                    ? "Your seat for " + sessionName + " is held while the gym confirms your payment."
                                    : "Your booking for " + sessionName + " is confirmed.",
                            "SUCCESS", "MEDIUM", "BOOKINGS",
                            booking.getId(), "/book-session",
                            "BOOKING_CREATED_" + booking.getId()
                    );
                } catch (Exception e) {
                    // Log error
                }
            }
        }

        return toResponse(booking);
    }

    /** Staff status change from the web — a staff cancellation always refunds in full. */
    @Transactional
    public BookingResponseDTO updateStatus(Long id, BookingStatusUpdateDTO request) {
        return updateStatus(id, request, BookingPaymentService.CANCELLED_BY_STAFF, BookingPaymentService.REFUND_METHOD_WALLET);
    }

    /**
     * cancelledBy/refundMethod only matter when the new status is "cancelled": a member
     * cancelling inside the refund window gets nothing back (BookingPaymentService).
     */
    @Transactional
    public BookingResponseDTO updateStatus(Long id, BookingStatusUpdateDTO request, String cancelledBy, String refundMethod) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
        boolean cancelling = "cancelled".equalsIgnoreCase(request.getStatus())
                && !"cancelled".equalsIgnoreCase(booking.getStatus());
        if ("cancelled".equalsIgnoreCase(request.getStatus()) && !cancelling) {
            throw new BusinessRuleViolationException("This booking is already cancelled");
        }
        if (BookingPaymentService.STATUS_PENDING_APPROVAL.equalsIgnoreCase(booking.getStatus())
                && StringUtils.hasText(request.getStatus()) && !cancelling) {
            throw new BusinessRuleViolationException("Approve or reject this booking's payment first");
        }
        String previousStatus = booking.getStatus();
        boolean heldSeat = !NO_SEAT_STATUSES.contains(String.valueOf(previousStatus).toLowerCase());
        if (StringUtils.hasText(request.getStatus()) && !heldSeat && !cancelling
                && !request.getStatus().equalsIgnoreCase(previousStatus)) {
            // Off the waitlist (e.g. staff "Move in"): only when a seat is actually free.
            TrainingSession session = booking.getSession();
            long taken = bookingRepository.countBySessionIdAndStatusNotIn(session.getId(), NO_SEAT_STATUSES);
            if (session.getCapacity() != null && taken >= session.getCapacity()) {
                throw new SessionFullException("The session is still full — cancel a booking or raise the capacity first");
            }
        }
        if (cancelling) {
            // Before the status flips — it decides between voiding and refunding.
            bookingPaymentService.settleCancellation(booking, cancelledBy, refundMethod);
        }
        if (StringUtils.hasText(request.getStatus())) {
            booking.setStatus(request.getStatus());
            if ("checked-in".equalsIgnoreCase(request.getStatus())) {
                if (booking.getCheckedInAt() == null) booking.setCheckedInAt(LocalDateTime.now());
            } else if (!"no-show".equalsIgnoreCase(request.getStatus())) {
                booking.setCheckedInAt(null);
            }
        }
        if (request.getPaymentStatus() != null) {
            booking.setPaymentStatus(request.getPaymentStatus());
        }
        bookingRepository.save(booking);

        if (cancelling && heldSeat) {
            promoteFromWaitlist(booking.getSession());
        }

        if ("cancelled".equalsIgnoreCase(request.getStatus())) {
            String sName = booking.getSession() != null && booking.getSession().getName() != null
                    ? booking.getSession().getName() : "session";
            notificationService.notifyRole(
                    "GYMBIOS_ADMIN",
                    "Booking Cancelled",
                    "Booking for " + sName + " was cancelled.",
                    "WARNING", "MEDIUM", "BOOKINGS",
                    booking.getId(), "/bookings",
                    "BOOKING_CANCELLED_" + booking.getId()
            );
            if (booking.getMember() != null) {
                Long targetId = booking.getMember().getUserId() != null ? booking.getMember().getUserId() : booking.getMember().getGlobalUserId();
                if (targetId != null) {
                    try {
                        notificationService.notifyUser(
                                targetId,
                                "Booking Cancelled",
                                "Your booking for " + sName + " has been cancelled.",
                                "WARNING", "MEDIUM", "BOOKINGS",
                                booking.getId(), "/book-session",
                                "BOOKING_CANCELLED_USER_" + booking.getId()
                        );
                    } catch (Exception e) {
                        // Log error
                    }
                }
            }
        }

        return toResponse(booking);
    }

    /**
     * The member's membership is being cancelled: every booking that hasn't started yet is
     * cancelled (seats freed, waitlists moved up). Money is settled by the cancellation.
     * Returns how many were cancelled.
     */
    @Transactional
    public int cancelUpcomingForMembershipCancellation(Long memberId) {
        java.time.LocalDateTime now = java.time.LocalDateTime.now();
        List<Booking> upcoming = bookingRepository.findUpcomingBookings(memberId, now.toLocalDate(), now.toLocalTime());
        int count = 0;
        for (Booking booking : upcoming) {
            if ("cancelled".equalsIgnoreCase(booking.getStatus())) continue;
            boolean heldSeat = !NO_SEAT_STATUSES.contains(String.valueOf(booking.getStatus()).toLowerCase());
            bookingPaymentService.settleMembershipCancellation(booking);
            booking.setStatus("cancelled");
            booking.setCheckedInAt(null);
            bookingRepository.save(booking);
            if (heldSeat) promoteFromWaitlist(booking.getSession());
            count++;
        }
        return count;
    }

    @Transactional
    public void deleteBooking(Long id) {
        TrainingSession[] freedSeat = { null };
        bookingRepository.findById(id).ifPresent(booking -> {
            // Deleting a live booking is a staff cancellation: refund it in full first.
            if (!"cancelled".equalsIgnoreCase(booking.getStatus())) {
                bookingPaymentService.settleCancellation(booking,
                        BookingPaymentService.CANCELLED_BY_STAFF, BookingPaymentService.REFUND_METHOD_WALLET);
            }
            if (!NO_SEAT_STATUSES.contains(String.valueOf(booking.getStatus()).toLowerCase())) {
                freedSeat[0] = booking.getSession();
            }
            releaseRewardPass(booking);
        });
        bookingRepository.deleteById(id);
        if (freedSeat[0] != null) {
            bookingRepository.flush();
            promoteFromWaitlist(freedSeat[0]);
        }
    }

    /**
     * Seats opened up (a cancellation, a deletion, a bigger capacity): move waitlisted
     * bookings in, first come first served, and tell each member. Staff bookings aren't
     * charged here, so a promoted booking is simply confirmed — same as a staff booking.
     */
    @Transactional
    public void promoteFromWaitlist(TrainingSession session) {
        if (session == null || "cancelled".equalsIgnoreCase(session.getStatus())
                || "completed".equalsIgnoreCase(session.getStatus())) {
            return;
        }
        long taken = bookingRepository.countBySessionIdAndStatusNotIn(session.getId(), NO_SEAT_STATUSES);
        for (Booking next : bookingRepository.findBySessionIdAndStatusOrderByIdAsc(session.getId(), STATUS_WAITLISTED)) {
            if (session.getCapacity() != null && taken >= session.getCapacity()) break;
            // A suspended or frozen member keeps their waitlist place but isn't given the seat.
            if (next.getMember() != null
                    && (next.getMember().isMembershipSuspended() || MemberSuspension.isFrozen(next.getMember()))) continue;
            next.setStatus("confirmed");
            bookingRepository.save(next);
            taken++;
            sessionMemberNotifier.notifyPromoted(next.getMember(), session, next.getId());
        }
    }

    /** Bookings whose Cash/Credit/Mixed payment awaits staff approval — web Approvals page. */
    @Transactional(readOnly = true)
    public List<BookingResponseDTO> getPendingPaymentApprovals() {
        return bookingRepository.findPendingPaymentApprovals().stream()
                .map(booking -> {
                    BookingResponseDTO dto = toResponse(booking);
                    com.company.project.entities.Receipt receipt = bookingPaymentService.receiptFor(booking);
                    if (receipt != null) {
                        // Cash / Credit / Mixed — "Mixed" also when part came from the wallet.
                        dto.setPaymentMethod(receipt.getPaymentMethod());
                        dto.setPaidAmount(receipt.getPaidAmount());
                    }
                    return dto;
                })
                .collect(Collectors.toList());
    }

    @Transactional
    public BookingResponseDTO approvePayment(Long id, String approvedBy) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new com.company.project.exceptions.EntityNotFoundException("Booking not found"));
        MemberSuspension.requireUsable(booking.getMember(), "approving a booking payment");
        bookingPaymentService.approve(booking, approvedBy);
        return toResponse(bookingRepository.save(booking));
    }

    @Transactional
    public BookingResponseDTO rejectPayment(Long id, String rejectedBy, String reason) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new com.company.project.exceptions.EntityNotFoundException("Booking not found"));
        bookingPaymentService.reject(booking, rejectedBy, reason);
        return toResponse(bookingRepository.save(booking));
    }

    /** Gives back the Reward Pass a booking was paid with (cancel/delete), at most once. */
    public void releaseRewardPass(Booking booking) {
        if (booking.getRewardId() == null) return;
        rewardRedemptionService.restorePass(booking.getRewardId());
        booking.setRewardId(null);
    }

    /** The app sent money for this booking: payment legs, wallet, a promo code or a price to pay. */
    static boolean bringsPayment(BookingRequestDTO r) {
        boolean legs = r.getPaymentBreakdown() != null && r.getPaymentBreakdown().stream()
                .anyMatch(l -> l != null && l.getAmount() != null && l.getAmount().signum() > 0);
        return legs
                || (r.getWalletAmount() != null && r.getWalletAmount().signum() > 0)
                || StringUtils.hasText(r.getCouponCode())
                || (r.getExpectedAmount() != null && r.getExpectedAmount().signum() > 0);
    }

    private BookingResponseDTO toResponse(Booking booking) {
        BookingResponseDTO dto = new BookingResponseDTO();
        dto.setId(String.valueOf(booking.getId()));
        dto.setRewardId(booking.getRewardId());
        dto.setEnrolmentId(booking.getEnrolmentId());
        if (booking.getEnrolmentId() != null) {
            enrolmentRepository.findById(booking.getEnrolmentId())
                    .ifPresent(e -> dto.setPackageName(e.getPackageName()));
        }
        dto.setSessionId(booking.getSession() == null ? null : String.valueOf(booking.getSession().getId()));
        dto.setSessionName(booking.getSession() == null ? null : booking.getSession().getName());
        dto.setTrainerName(booking.getSession() != null && booking.getSession().getTrainer() != null
                ? booking.getSession().getTrainer().getName()
                : null);
        dto.setDate(booking.getSession() == null ? null : booking.getSession().getDate());
        dto.setStartTime(booking.getSession() == null ? null : booking.getSession().getStartTime());
        dto.setType(booking.getSession() == null ? null : booking.getSession().getType());
        dto.setStatus(booking.getStatus());
        dto.setCheckedInAt(booking.getCheckedInAt());
        dto.setPrice(booking.getPrice());
        dto.setQrCode(booking.getQrCode());
        dto.setGuest(booking.isGuest());
        dto.setMemberId(booking.getMember() == null ? null : String.valueOf(booking.getMember().getId()));
        dto.setMemberName(booking.getMember() == null ? booking.getGuestName() : booking.getMember().getName());
        dto.setGuestName(booking.getGuestName());
        dto.setGuestEmail(booking.getGuestEmail());
        dto.setGuestPhone(booking.getGuestPhone());
        dto.setCreatedAt(booking.getCreatedAt());
        dto.setPaymentStatus(booking.getPaymentStatus());
        dto.setGrossPrice(booking.getGrossPrice());
        dto.setDiscountAmount(booking.getDiscountAmount());
        dto.setDiscountLabel(booking.getDiscountLabel());
        dto.setWalletAmount(booking.getWalletAmount());
        dto.setReceiptId(booking.getReceiptId());
        dto.setRefundStatus(booking.getRefundStatus());
        dto.setRefundMethod(booking.getRefundMethod());
        dto.setRefundedAmount(booking.getRefundedAmount());
        dto.setCancelledBy(booking.getCancelledBy());
        return dto;
    }
}
