package com.company.project.services.mobile.checkin;

import com.company.project.dto.WorkoutFeedbackRequestDTO;
import com.company.project.dto.mobile.checkin.MemberFeedbackResponseDTO;
import com.company.project.dto.mobile.checkin.MobileMemberFeedbackRequestDTO;
import com.company.project.entities.Attendance;
import com.company.project.entities.Member;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.mobile.checkin.MobileWorkoutFeedbackRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.WorkoutFeedbackService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MobileMemberFeedbackService {

    private final MemberRepository memberRepository;
    private final AttendanceRepository attendanceRepository;
    private final MobileWorkoutFeedbackRepository mobileWorkoutFeedbackRepository;
    private final WorkoutFeedbackService workoutFeedbackService;

    public MobileMemberFeedbackService(
            MemberRepository memberRepository,
            AttendanceRepository attendanceRepository,
            MobileWorkoutFeedbackRepository mobileWorkoutFeedbackRepository,
            WorkoutFeedbackService workoutFeedbackService) {
        this.memberRepository = memberRepository;
        this.attendanceRepository = attendanceRepository;
        this.mobileWorkoutFeedbackRepository = mobileWorkoutFeedbackRepository;
        this.workoutFeedbackService = workoutFeedbackService;
    }

    private Member getAuthenticatedMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) {
            throw new EntityNotFoundException("User not authenticated");
        }
        return memberRepository.findByUserId(principal.getId())
                .orElseThrow(() -> new EntityNotFoundException("No member profile linked to this user account"));
    }

    @Transactional
    public MemberFeedbackResponseDTO submitFeedback(UserDetailsImpl principal, MobileMemberFeedbackRequestDTO request) {
        Member member = getAuthenticatedMember(principal);

        Long attendanceId = request.getAttendanceId();
        if (attendanceId == null) {
            // Find most recent completed attendance session for member
            attendanceId = attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(member.getId()).stream()
                    .filter(a -> "completed".equalsIgnoreCase(a.getStatus()))
                    .map(Attendance::getId)
                    .findFirst()
                    .orElseThrow(() -> new IllegalArgumentException("Attendance ID is required for feedback submission"));
        }

        final Long resolvedAttendanceId = attendanceId;
        Attendance attendance = attendanceRepository.findById(resolvedAttendanceId)
                .orElseThrow(() -> new EntityNotFoundException("Attendance record not found: " + resolvedAttendanceId));

        if (attendance.getMember() == null || !attendance.getMember().getId().equals(member.getId())) {
            throw new BusinessRuleViolationException("Attendance record does not belong to the authenticated member");
        }

        if (!"completed".equalsIgnoreCase(attendance.getStatus())) {
            throw new BusinessRuleViolationException("Feedback can only be submitted for a completed workout session");
        }

        if (mobileWorkoutFeedbackRepository.existsByAttendance_Id(attendanceId)) {
            throw new BusinessRuleViolationException("Feedback has already been submitted for this workout session");
        }

        WorkoutFeedbackRequestDTO webDTO = new WorkoutFeedbackRequestDTO();
        webDTO.setSessionId(String.valueOf(attendanceId));
        webDTO.setOverallSatisfaction(request.getOverallSatisfaction());
        webDTO.setWorkoutIntensity(request.getWorkoutIntensity());
        webDTO.setTrainerRating(request.getTrainerRating());
        webDTO.setEquipmentQuality(request.getEquipmentQuality());
        webDTO.setFacilityRating(request.getFacilityRating());
        webDTO.setRecommendWorkout(request.getRecommendWorkout());
        webDTO.setDifficultyLevel(request.getDifficultyLevel());
        webDTO.setPaceRating(request.getPaceRating());
        webDTO.setBestAspects(request.getBestAspects());
        webDTO.setAreasForImprovement(request.getAreasForImprovement());
        webDTO.setComments(request.getComments());
        webDTO.setSuggestions(request.getSuggestions());
        webDTO.setEnergyAfterWorkout(request.getEnergyAfterWorkout());
        webDTO.setLikelyToReturn(request.getLikelyToReturn());
        webDTO.setWouldRecommendTrainer(request.getWouldRecommendTrainer());

        workoutFeedbackService.submitFeedback(webDTO);

        return new MemberFeedbackResponseDTO(true, attendanceId);
    }
}
