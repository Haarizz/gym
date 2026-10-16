package com.company.project.services.mobile.checkin;

import com.company.project.dto.mobile.checkin.MemberCheckInResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckInStatusResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckOutResponseDTO;
import com.company.project.dto.mobile.checkin.MemberWorkoutResponseDTO;
import com.company.project.entities.Attendance;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.AttendanceSessionService;
import com.company.project.services.CheckInPolicyService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class MobileMemberCheckInService {

    private final MemberRepository memberRepository;
    private final AttendanceRepository attendanceRepository;
    private final CheckInPolicyService checkInPolicyService;
    private final AttendanceSessionService sessionService;

    // Per-member lock so a double-tap can't pass the active-session / daily-cap
    // checks twice before either insert commits (same approach as CheckInService).
    private final ConcurrentHashMap<Long, Object> checkInLocks = new ConcurrentHashMap<>();

    public MobileMemberCheckInService(MemberRepository memberRepository,
                                      AttendanceRepository attendanceRepository,
                                      CheckInPolicyService checkInPolicyService,
                                      AttendanceSessionService sessionService) {
        this.memberRepository = memberRepository;
        this.attendanceRepository = attendanceRepository;
        this.checkInPolicyService = checkInPolicyService;
        this.sessionService = sessionService;
    }

    private Member getAuthenticatedMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        Optional<Member> memberOpt = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());
        // Fallback for stale tokens with IS_GLOBAL_CLAIM=true but no globalUserId record
        if (memberOpt.isEmpty() && principal.isGlobal()) {
            memberOpt = memberRepository.findByUserId(principal.getId());
        }
        return memberOpt.orElseThrow(() -> new EntityNotFoundException("No member profile linked to this user account"));
    }

    @Transactional(readOnly = true)
    public MemberCheckInStatusResponseDTO getCheckInStatus(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            return new MemberCheckInStatusResponseDTO(false, null, null);
        }

        var memberOpt = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());
        // Fallback for stale tokens with IS_GLOBAL_CLAIM=true but no globalUserId record
        if (memberOpt.isEmpty() && principal.isGlobal()) {
            memberOpt = memberRepository.findByUserId(principal.getId());
        }
        if (memberOpt.isEmpty()) {
            return new MemberCheckInStatusResponseDTO(false, null, null);
        }

        Member member = memberOpt.get();

        Attendance open = sessionService.findActiveSession(member.getId()).orElse(null);
        MemberCheckInStatusResponseDTO dto;
        if (open == null) {
            dto = new MemberCheckInStatusResponseDTO(false, null, null);
        } else if (AttendanceSessionService.isStale(open)) {
            // Left open from an earlier day — not a current visit. Checking in closes it.
            dto = new MemberCheckInStatusResponseDTO(false, null, null);
            dto.setUnclosedAttendanceId(open.getId());
            dto.setUnclosedCheckInTime(open.getCheckInTime());
            dto.setUnclosedAutoCloseTime(AttendanceSessionService.staleCloseTime(open));
        } else {
            dto = new MemberCheckInStatusResponseDTO(true, open.getId(), open.getCheckInTime());
            dto.setWorkoutStartTime(open.getWorkoutStartTime());
            dto.setWorkoutEndTime(open.getWorkoutEndTime());
            dto.setWorkoutMinutes(open.getWorkoutMinutes());
        }

        CheckInPolicyService.Allowance allowance = checkInPolicyService.evaluate(member);
        dto.setLimitUnit(allowance.limitUnit());
        dto.setLimitValue(allowance.limitValue());
        dto.setUsed(allowance.used());
        dto.setLimitPeriod(allowance.limitPeriod());
        dto.setCheckInsToday(allowance.checkInsToday());
        dto.setMaxCheckInsPerDay(allowance.maxCheckInsPerDay());
        dto.setNextCheckInAllowedAt(allowance.nextCheckInAllowedAt());
        dto.setCanCheckIn(allowance.canCheckIn());
        dto.setBlockedReason(allowance.blockedReason());
        return dto;
    }

    @Transactional
    public MemberCheckInResponseDTO checkIn(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);

        validateMembership(member);

        Attendance attendance = new Attendance();
        Object lock = checkInLocks.computeIfAbsent(member.getId(), k -> new Object());
        synchronized (lock) {
            // A visit left open from an earlier day (the app warned about it) is closed
            // at the capped length first; one from today means they're still checked in.
            Attendance open = sessionService.findActiveSession(member.getId()).orElse(null);
            if (open != null) {
                if (!AttendanceSessionService.isStale(open)) {
                    throw new BusinessRuleViolationException(member.getName() + " is already checked in. Please check out first.");
                }
                sessionService.close(open, LocalDateTime.now());
                attendanceRepository.saveAndFlush(open);
            }
            // Plan quota, daily cap and cooldown between visits
            checkInPolicyService.enforce(member);

            attendance.setMember(member);
            attendance.setCheckInTime(LocalDateTime.now());
            attendance.setCheckInMethod("app");
            attendance.setDeviceId("MOBILE");
            attendance.setResolvedBy("member_id");
            attendance.setStatus("active");
            attendance.setType("member");
            attendanceRepository.saveAndFlush(attendance);
        }

        member.setTotalVisits(member.getTotalVisits() == null ? 1 : member.getTotalVisits() + 1);
        memberRepository.save(member);

        return new MemberCheckInResponseDTO(true, attendance.getId(), attendance.getCheckInTime());
    }

    @Transactional
    public MemberCheckOutResponseDTO checkOut(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);

        Attendance activeAttendance = sessionService.findActiveSession(member.getId())
                .orElseThrow(() -> new BusinessRuleViolationException("No active check-in session found to check out"));

        // Also ends a running workout; a visit from an earlier day gets the capped length.
        sessionService.close(activeAttendance, LocalDateTime.now());
        attendanceRepository.save(activeAttendance);

        MemberCheckOutResponseDTO dto = new MemberCheckOutResponseDTO(false, activeAttendance.getId(),
                activeAttendance.getCheckInTime(), activeAttendance.getCheckOutTime(), activeAttendance.getTotalMinutes());
        dto.setWorkoutMinutes(activeAttendance.getWorkoutMinutes());
        return dto;
    }

    @Transactional
    public MemberWorkoutResponseDTO startWorkout(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);
        Object lock = checkInLocks.computeIfAbsent(member.getId(), k -> new Object());
        synchronized (lock) {
            Attendance visit = currentVisit(member);
            if (visit.getWorkoutStartTime() != null) {
                throw new BusinessRuleViolationException(visit.getWorkoutEndTime() == null
                        ? "Your workout is already running."
                        : "You've already logged a workout for this visit.");
            }
            visit.setWorkoutStartTime(LocalDateTime.now());
            attendanceRepository.saveAndFlush(visit);
            return toWorkoutDto(visit);
        }
    }

    @Transactional
    public MemberWorkoutResponseDTO endWorkout(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);
        Object lock = checkInLocks.computeIfAbsent(member.getId(), k -> new Object());
        synchronized (lock) {
            Attendance visit = currentVisit(member);
            if (visit.getWorkoutStartTime() == null || visit.getWorkoutEndTime() != null) {
                throw new BusinessRuleViolationException("No workout is running.");
            }
            AttendanceSessionService.endWorkout(visit, LocalDateTime.now());
            attendanceRepository.saveAndFlush(visit);
            return toWorkoutDto(visit);
        }
    }

    /** Today's open visit — a workout can't be attached to one left open from an earlier day. */
    private Attendance currentVisit(Member member) {
        return sessionService.findActiveSession(member.getId())
                .filter(a -> !AttendanceSessionService.isStale(a))
                .orElseThrow(() -> new BusinessRuleViolationException("Check in first to start a workout."));
    }

    private static MemberWorkoutResponseDTO toWorkoutDto(Attendance a) {
        return new MemberWorkoutResponseDTO(a.getId(), a.getWorkoutStartTime(), a.getWorkoutEndTime(), a.getWorkoutMinutes());
    }

    private void validateMembership(Member member) {
        String status = member.getMembershipStatus();
        if (!"active".equalsIgnoreCase(status)) {
            throw new BusinessRuleViolationException(
                    "Check-in denied — membership is " + status + " for member: " + member.getName());
        }

        LocalDateTime expiry = member.getExpiryDate() != null ? member.getExpiryDate() : member.getMembershipEndDate();
        if (expiry != null && expiry.isBefore(LocalDateTime.now())) {
            throw new BusinessRuleViolationException(
                    "Check-in denied — membership expired on " + expiry.toLocalDate() + " for member: " + member.getName());
        }
    }
}
