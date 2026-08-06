package com.company.project.services;

import com.company.project.dto.AttendanceRecordDTO;
import com.company.project.dto.CheckInRequest;
import com.company.project.dto.CheckInResponse;
import com.company.project.dto.CheckInStatusResponse;
import com.company.project.entities.Attendance;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.BookingRepository;
import com.company.project.repositories.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class CheckInService {

    private final MemberRepository memberRepository;
    private final BookingRepository bookingRepository;
    private final AttendanceRepository attendanceRepository;
    private final QrCodeService qrCodeService;

    // Per-member lock so two near-simultaneous check-ins for the same member
    // (e.g. gate scanner + reception scanning the same QR within milliseconds)
    // can't both pass the "already active" check before either insert commits.
    // Effective for a single application instance, which is this app's actual
    // deployment model (no clustering).
    private final java.util.concurrent.ConcurrentHashMap<Long, Object> checkInLocks = new java.util.concurrent.ConcurrentHashMap<>();

    public CheckInService(MemberRepository memberRepository,
                          BookingRepository bookingRepository,
                          AttendanceRepository attendanceRepository,
                          QrCodeService qrCodeService) {
        this.memberRepository    = memberRepository;
        this.bookingRepository   = bookingRepository;
        this.attendanceRepository = attendanceRepository;
        this.qrCodeService       = qrCodeService;
    }

    // ── POST /api/checkin ─────────────────────────────────────────────────────

    @Transactional
    public CheckInResponse checkIn(CheckInRequest req) {
        ResolvedIdentifier resolved = resolveIdentifier(req);
        Member member   = resolved.member;
        Booking booking = resolved.booking;

        validateMembership(member);

        Attendance attendance = new Attendance();
        Object lock = checkInLocks.computeIfAbsent(member.getId(), k -> new Object());
        synchronized (lock) {
            // Prevent duplicate active check-ins for the same member on the same day
            LocalDateTime startOfDayNow = LocalDate.now().atStartOfDay();
            LocalDateTime endOfDayNow   = LocalDate.now().atTime(LocalTime.MAX);
            if (attendanceRepository.existsActiveSessionForMember(member.getId(), startOfDayNow, endOfDayNow)) {
                throw new RuntimeException(member.getName() + " is already checked in. Please check out first.");
            }

            // Record attendance
            attendance.setMember(member);
            attendance.setBooking(booking);
            attendance.setCheckInTime(LocalDateTime.now());
            attendance.setCheckInMethod(req.getMethod());
            attendance.setDeviceId(req.getDeviceId() != null ? req.getDeviceId() : "WEB");
            attendance.setResolvedBy(resolved.resolvedBy);
            attendance.setNotes(req.getNotes());
            attendance.setStatus("active");
            attendance.setType("member");
            attendanceRepository.saveAndFlush(attendance);
        }

        // Increment total visit counter on the member
        member.setTotalVisits(member.getTotalVisits() == null ? 1 : member.getTotalVisits() + 1);
        memberRepository.save(member);

        // If this was a booking-based check-in, mark the booking as checked in
        if (booking != null && "confirmed".equals(booking.getStatus())) {
            booking.setStatus("checked-in");
            bookingRepository.save(booking);
        }

        CheckInResponse response = new CheckInResponse();
        response.setSuccess(true);
        response.setMessage("Welcome, " + member.getName() + "!");
        response.setAttendanceId(attendance.getId());
        response.setMemberName(member.getName());
        response.setMemberId(member.getMemberId());
        response.setMembershipStatus(member.getMembershipStatus());
        response.setCheckInTime(attendance.getCheckInTime());
        response.setCheckInMethod(req.getMethod());
        response.setResolvedBy(resolved.resolvedBy);
        return response;
    }

    // ── GET /api/checkin/status ───────────────────────────────────────────────

    @Transactional(readOnly = true)
    public CheckInStatusResponse getStatus(String qr, String faceId, Long memberId) {
        Member member = null;

        if (qr != null && !qr.isBlank()) {
            member = resolveByQr(qr);
        } else if (faceId != null && !faceId.isBlank()) {
            member = memberRepository.findByFaceId(faceId)
                    .orElseThrow(() -> new RuntimeException("No member found for face ID"));
        } else if (memberId != null) {
            member = memberRepository.findById(memberId)
                    .orElseThrow(() -> new RuntimeException("Member not found"));
        } else {
            throw new IllegalArgumentException("Provide at least one of: qr, face_id, member_id");
        }

        boolean allowed = "active".equals(member.getMembershipStatus());

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay   = LocalDate.now().atTime(LocalTime.MAX);
        long todayVisits = attendanceRepository.countTodayVisits(
                member.getId(), startOfDay, endOfDay);

        CheckInStatusResponse resp = new CheckInStatusResponse();
        resp.setMemberName(member.getName());
        resp.setMembershipStatus(member.getMembershipStatus());
        resp.setExpires(member.getExpiryDate() != null ? member.getExpiryDate().toLocalDate() : null);
        resp.setTodayVisits(todayVisits);
        resp.setAllowed(allowed);
        resp.setMessage(allowed
                ? "Welcome back, " + member.getName() + "!"
                : "Membership " + member.getMembershipStatus() + " — please contact reception.");
        return resp;
    }

    // ── GET /api/checkin/today ────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<AttendanceRecordDTO> getTodayAttendance() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay   = LocalDate.now().atTime(LocalTime.MAX);
        return attendanceRepository.findTodayAttendance(startOfDay, endOfDay)
                .stream()
                .map(this::toDTO)
                .toList();
    }

    private AttendanceRecordDTO toDTO(Attendance a) {
        AttendanceRecordDTO dto = new AttendanceRecordDTO();
        dto.setId(a.getId());
        dto.setCheckInTime(a.getCheckInTime());
        dto.setCheckOutTime(a.getCheckOutTime());
        dto.setTotalMinutes(a.getTotalMinutes());
        dto.setFormattedDuration(a.getTotalMinutes() != null
                ? AttendanceService.formatDuration(a.getTotalMinutes()) : null);
        dto.setCheckInMethod(a.getCheckInMethod());
        dto.setDeviceId(a.getDeviceId());
        dto.setResolvedBy(a.getResolvedBy());
        dto.setStatus(a.getStatus());
        dto.setType(a.getType());
        dto.setWalkInName(a.getWalkInName());
        dto.setWalkInPhone(a.getWalkInPhone());
        Member m = a.getMember();
        if (m != null) {
            dto.setMemberId(m.getId());
            dto.setMemberBizId(m.getMemberId());
            dto.setMemberName(m.getName());
            dto.setPhotoUrl(m.getPhotoUrl());
            dto.setMembershipType(m.getMembershipType());
            dto.setMembershipStatus(m.getMembershipStatus());
        }
        return dto;
    }

    // ── Identifier resolution ─────────────────────────────────────────────────

    private record ResolvedIdentifier(Member member, Booking booking, String resolvedBy) {}

    private ResolvedIdentifier resolveIdentifier(CheckInRequest req) {
        // Priority: qr_code > face_id > booking_id > member_id
        if (req.getQrCode() != null && !req.getQrCode().isBlank()) {
            Member member = resolveByQr(req.getQrCode());
            // If the QR was a booking QR, also find the booking for linkage
            Booking booking = null;
            try {
                QrCodeService.ParsedQr parsed = qrCodeService.verifyAndParse(req.getQrCode());
                if ("BOOKING".equals(parsed.type())) {
                    booking = bookingRepository.findById(parsed.id()).orElse(null);
                }
            } catch (Exception ignored) {}
            return new ResolvedIdentifier(member, booking, "qr_code");
        }

        if (req.getFaceId() != null && !req.getFaceId().isBlank()) {
            Member member = memberRepository.findByFaceId(req.getFaceId())
                    .orElseThrow(() -> new RuntimeException("No member found for face ID: " + req.getFaceId()));
            return new ResolvedIdentifier(member, null, "face_id");
        }

        if (req.getBookingId() != null) {
            Booking booking = bookingRepository.findById(req.getBookingId())
                    .orElseThrow(() -> new RuntimeException("Booking not found: " + req.getBookingId()));
            if (booking.getMember() == null) {
                throw new RuntimeException("Booking has no associated member");
            }
            return new ResolvedIdentifier(booking.getMember(), booking, "booking_id");
        }

        if (req.getMemberId() != null) {
            Member member = memberRepository.findById(req.getMemberId())
                    .orElseThrow(() -> new RuntimeException("Member not found: " + req.getMemberId()));
            return new ResolvedIdentifier(member, null, "member_id");
        }

        throw new IllegalArgumentException(
                "Cannot resolve member — provide at least one of: qr_code, face_id, booking_id, member_id");
    }

    private Member resolveByQr(String qrCode) {
        QrCodeService.ParsedQr parsed = qrCodeService.verifyAndParse(qrCode);
        return switch (parsed.type()) {
            case "BOOKING" -> {
                Booking booking = bookingRepository.findById(parsed.id())
                        .orElseThrow(() -> new RuntimeException("Booking not found"));
                if (booking.getMember() == null) {
                    throw new RuntimeException("Booking has no associated member");
                }
                yield booking.getMember();
            }
            case "MEMBER" -> memberRepository.findById(parsed.id())
                    .orElseThrow(() -> new RuntimeException("Member not found"));
            default -> throw new IllegalArgumentException("Unknown QR type: " + parsed.type());
        };
    }

    private void validateMembership(Member member) {
        String status = member.getMembershipStatus();
        if (!"active".equals(status)) {
            throw new RuntimeException(
                    "Check-in denied — membership is " + status +
                    " for member: " + member.getName());
        }
        // Nothing ever flips membershipStatus to "expired" on its own (no scheduled
        // job), so a lapsed member whose status was never manually updated could
        // otherwise keep checking in indefinitely. This applies to billed-to-head
        // dependents too — createBilledToHeadRecord/renewFamily keep their own
        // expiryDate/membershipEndDate in sync with the head's plan cycle.
        LocalDateTime expiry = member.getExpiryDate() != null ? member.getExpiryDate() : member.getMembershipEndDate();
        if (expiry != null && expiry.isBefore(LocalDateTime.now())) {
            throw new RuntimeException(
                    "Check-in denied — membership expired on " + expiry.toLocalDate() +
                    " for member: " + member.getName());
        }
    }
}
