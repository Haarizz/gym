package com.company.project.services.mobile.checkin;

import com.company.project.dto.mobile.checkin.MemberCheckInResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckInStatusResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckOutResponseDTO;
import com.company.project.entities.Attendance;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.UserDetailsImpl;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class MobileMemberCheckInService {

    private final MemberRepository memberRepository;
    private final AttendanceRepository attendanceRepository;

    public MobileMemberCheckInService(MemberRepository memberRepository,
                                      AttendanceRepository attendanceRepository) {
        this.memberRepository = memberRepository;
        this.attendanceRepository = attendanceRepository;
    }

    private Member getAuthenticatedMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        return memberRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No member profile linked to this user account"));
    }

    @Transactional(readOnly = true)
    public MemberCheckInStatusResponseDTO getCheckInStatus(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            return new MemberCheckInStatusResponseDTO(false, null, null);
        }

        var memberOpt = memberRepository.findByUserId(principal.getId());
        if (memberOpt.isEmpty()) {
            return new MemberCheckInStatusResponseDTO(false, null, null);
        }

        Member member = memberOpt.get();

        List<Attendance> attendances = attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(member.getId());
        Attendance activeAttendance = (attendances != null)
                ? attendances.stream()
                        .filter(a -> "active".equalsIgnoreCase(a.getStatus()))
                        .findFirst()
                        .orElse(null)
                : null;

        if (activeAttendance != null) {
            return new MemberCheckInStatusResponseDTO(true, activeAttendance.getId(), activeAttendance.getCheckInTime());
        }

        return new MemberCheckInStatusResponseDTO(false, null, null);
    }

    @Transactional
    public MemberCheckInResponseDTO checkIn(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);

        validateMembership(member);

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay   = LocalDate.now().atTime(LocalTime.MAX);

        if (attendanceRepository.existsActiveSessionForMember(member.getId(), startOfDay, endOfDay)) {
            throw new BusinessRuleViolationException(member.getName() + " is already checked in. Please check out first.");
        }

        Attendance attendance = new Attendance();
        attendance.setMember(member);
        attendance.setCheckInTime(LocalDateTime.now());
        attendance.setCheckInMethod("app");
        attendance.setDeviceId("MOBILE");
        attendance.setResolvedBy("member_id");
        attendance.setStatus("active");
        attendance.setType("member");
        attendanceRepository.saveAndFlush(attendance);

        member.setTotalVisits(member.getTotalVisits() == null ? 1 : member.getTotalVisits() + 1);
        memberRepository.save(member);

        return new MemberCheckInResponseDTO(true, attendance.getId(), attendance.getCheckInTime());
    }

    @Transactional
    public MemberCheckOutResponseDTO checkOut(UserDetailsImpl principal) {
        Member member = getAuthenticatedMember(principal);

        List<Attendance> attendances = attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(member.getId());
        Attendance activeAttendance = (attendances != null)
                ? attendances.stream()
                        .filter(a -> "active".equalsIgnoreCase(a.getStatus()))
                        .findFirst()
                        .orElseThrow(() -> new BusinessRuleViolationException("No active check-in session found to check out"))
                : null;

        if (activeAttendance == null) {
            throw new BusinessRuleViolationException("No active check-in session found to check out");
        }

        LocalDateTime now = LocalDateTime.now();
        int minutes = (int) Duration.between(activeAttendance.getCheckInTime(), now).toMinutes();
        activeAttendance.setCheckOutTime(now);
        activeAttendance.setTotalMinutes(minutes);
        activeAttendance.setStatus("completed");
        attendanceRepository.save(activeAttendance);

        return new MemberCheckOutResponseDTO(false, activeAttendance.getId(), activeAttendance.getCheckInTime(), activeAttendance.getCheckOutTime(), minutes);
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
