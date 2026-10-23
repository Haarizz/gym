package com.company.project.services.mobile.checkin;

import com.company.project.dto.mobile.checkin.MemberCheckInResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckInStatusResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckOutResponseDTO;
import com.company.project.dto.mobile.checkin.MemberBreakResponseDTO;
import com.company.project.entities.Attendance;
import com.company.project.entities.CheckInSettings;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.AttendanceSessionService;
import com.company.project.services.CheckInPolicyService;
import com.company.project.services.CheckInSettingsService;
import com.company.project.services.CheckInService;
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
    private final CheckInSettingsService checkInSettingsService;

    // Per-member lock so a double-tap can't pass the active-session / daily-cap
    // checks twice before either insert commits (same approach as CheckInService).
    private final ConcurrentHashMap<Long, Object> checkInLocks = new ConcurrentHashMap<>();

    public MobileMemberCheckInService(MemberRepository memberRepository,
                                      AttendanceRepository attendanceRepository,
                                      CheckInPolicyService checkInPolicyService,
                                      AttendanceSessionService sessionService,
                                      CheckInSettingsService checkInSettingsService) {
        this.memberRepository = memberRepository;
        this.attendanceRepository = attendanceRepository;
        this.checkInPolicyService = checkInPolicyService;
        this.sessionService = sessionService;
        this.checkInSettingsService = checkInSettingsService;
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
            dto.setBreakStartTime(open.getBreakStartTime());
            dto.setBreakMinutes(open.getBreakMinutes());
        }

        CheckInSettings settings = checkInSettingsService.forMember(member);
        dto.setBreakAllowanceMinutes(settings.getBreakGraceMinutes());
        if (dto.isCheckedIn() && settings.getMinVisitMinutes() > 0) {
            LocalDateTime checkOutAt = open.getCheckInTime().plusMinutes(settings.getMinVisitMinutes());
            if (checkOutAt.isAfter(LocalDateTime.now())) dto.setCheckOutAvailableAt(checkOutAt);
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

        // Members can't leave before the branch's minimum visit time (staff can override on the web).
        checkInSettingsService.enforceMinVisit(activeAttendance, member);

        // Also ends a running break; a visit from an earlier day gets the capped length.
        sessionService.close(activeAttendance, LocalDateTime.now());
        attendanceRepository.save(activeAttendance);

        MemberCheckOutResponseDTO dto = new MemberCheckOutResponseDTO(false, activeAttendance.getId(),
                activeAttendance.getCheckInTime(), activeAttendance.getCheckOutTime(), activeAttendance.getTotalMinutes());
        dto.setWorkoutMinutes(activeAttendance.getWorkoutMinutes());
        return dto;
    }

    /**
     * Take Break: pauses the visit — the member stays checked in and the break is left
     * out of the visit length. Needs the branch's quick break time; its length is only
     * the countdown shown in the app.
     */
    @Transactional
    public MemberBreakResponseDTO startBreak(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);
        Object lock = checkInLocks.computeIfAbsent(member.getId(), k -> new Object());
        synchronized (lock) {
            Attendance visit = currentVisit(member);
            if (visit.getBreakStartTime() != null) {
                throw new BusinessRuleViolationException("You're already on a break.");
            }
            if (checkInSettingsService.forMember(member).getBreakGraceMinutes() <= 0) {
                throw new BusinessRuleViolationException("Breaks aren't enabled at this gym.");
            }
            visit.setBreakStartTime(LocalDateTime.now());
            attendanceRepository.saveAndFlush(visit);
            return toBreakDto(visit);
        }
    }

    /** Ends the break. Allowed any time, even past the break length. */
    @Transactional
    public MemberBreakResponseDTO resumeFromBreak(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);
        Object lock = checkInLocks.computeIfAbsent(member.getId(), k -> new Object());
        synchronized (lock) {
            Attendance visit = currentVisit(member);
            if (visit.getBreakStartTime() == null) {
                throw new BusinessRuleViolationException("You're not on a break.");
            }
            AttendanceSessionService.endBreak(visit, LocalDateTime.now());
            attendanceRepository.saveAndFlush(visit);
            return toBreakDto(visit);
        }
    }

    /** Today's open visit — a break can't be taken on one left open from an earlier day. */
    private Attendance currentVisit(Member member) {
        return sessionService.findActiveSession(member.getId())
                .filter(a -> !AttendanceSessionService.isStale(a))
                .orElseThrow(() -> new BusinessRuleViolationException("Check in first to take a break."));
    }

    private static MemberBreakResponseDTO toBreakDto(Attendance a) {
        return new MemberBreakResponseDTO(a.getId(), a.getBreakStartTime(), a.getBreakMinutes());
    }

    private void validateMembership(Member member) {
        if (member.isMembershipSuspended()) {
            throw new BusinessRuleViolationException(CheckInService.suspendedMessage(member));
        }
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
