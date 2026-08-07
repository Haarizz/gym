package com.company.project.services;

import com.company.project.dto.WorkoutFeedbackAnalyticsDTO;
import com.company.project.dto.WorkoutFeedbackDTO;
import com.company.project.dto.WorkoutFeedbackNotesRequestDTO;
import com.company.project.dto.WorkoutFeedbackRequestDTO;
import com.company.project.dto.WorkoutSessionDTO;
import com.company.project.entities.Attendance;
import com.company.project.entities.Member;
import com.company.project.entities.WorkoutFeedback;
import com.company.project.repositories.AttendanceRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.WorkoutFeedbackRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class WorkoutFeedbackService {

    @Autowired
    private WorkoutFeedbackRepository workoutFeedbackRepository;

    @Autowired
    private AttendanceRepository attendanceRepository;

    @Autowired
    private MemberRepository memberRepository;

    public List<WorkoutSessionDTO> getRecentSessions() {
        LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
        LocalDateTime now = LocalDateTime.now();
        List<Attendance> attendances = attendanceRepository.findByDateRange(sevenDaysAgo, now);

        return attendances.stream()
                .filter(a -> "completed".equals(a.getStatus()))
                .map(this::mapToWorkoutSessionDTO)
                .collect(Collectors.toList());
    }

    public void submitFeedback(WorkoutFeedbackRequestDTO requestDTO) {
        Long attendanceId = Long.parseLong(requestDTO.getSessionId());
        Attendance attendance = attendanceRepository.findById(attendanceId)
                .orElseThrow(() -> new RuntimeException("Attendance not found"));
        
        Member member = attendance.getMember();
        if (member == null) {
            throw new RuntimeException("No member associated with this session");
        }

        WorkoutFeedback feedback = new WorkoutFeedback();
        feedback.setAttendance(attendance);
        feedback.setMember(member);
        feedback.setOverallSatisfaction(requestDTO.getOverallSatisfaction());
        feedback.setWorkoutIntensity(requestDTO.getWorkoutIntensity());
        feedback.setTrainerRating(requestDTO.getTrainerRating());
        feedback.setEquipmentQuality(requestDTO.getEquipmentQuality());
        feedback.setFacilityRating(requestDTO.getFacilityRating());
        feedback.setRecommendWorkout(requestDTO.getRecommendWorkout());
        feedback.setDifficultyLevel(requestDTO.getDifficultyLevel());
        feedback.setPaceRating(requestDTO.getPaceRating());
        feedback.setBestAspects(requestDTO.getBestAspects());
        feedback.setAreasForImprovement(requestDTO.getAreasForImprovement());
        feedback.setComments(requestDTO.getComments());
        feedback.setSuggestions(requestDTO.getSuggestions());
        feedback.setEnergyAfterWorkout(requestDTO.getEnergyAfterWorkout());
        feedback.setLikelyToReturn(requestDTO.getLikelyToReturn());
        feedback.setWouldRecommendTrainer(requestDTO.getWouldRecommendTrainer());

        workoutFeedbackRepository.save(feedback);
    }

    public List<WorkoutFeedbackDTO> getAllFeedbacks() {
        List<WorkoutFeedback> feedbacks = workoutFeedbackRepository.findAll();
        return feedbacks.stream().map(this::mapToWorkoutFeedbackDTO).collect(Collectors.toList());
    }

    public List<WorkoutFeedbackDTO> getMemberFeedbacks(Long memberId) {
        return workoutFeedbackRepository.findByMember_IdOrderBySubmittedAtDesc(memberId).stream()
                .map(this::mapToWorkoutFeedbackDTO)
                .collect(Collectors.toList());
    }

    public List<WorkoutSessionDTO> getMemberSessions(Long memberId) {
        return attendanceRepository.findByMember_IdOrderByCheckInTimeDesc(memberId).stream()
                .filter(a -> "completed".equals(a.getStatus()))
                .map(this::mapToWorkoutSessionDTO)
                .collect(Collectors.toList());
    }

    public WorkoutFeedbackDTO updateNotes(Long id, WorkoutFeedbackNotesRequestDTO requestDTO) {
        WorkoutFeedback feedback = workoutFeedbackRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Workout feedback not found"));

        if (requestDTO.getTrainerNotes() != null) {
            feedback.setTrainerNotes(requestDTO.getTrainerNotes());
        }
        if (requestDTO.getFollowUpRequired() != null) {
            feedback.setFollowUpRequired(requestDTO.getFollowUpRequired());
        }
        if (requestDTO.getFlaggedForReview() != null) {
            feedback.setFlaggedForReview(requestDTO.getFlaggedForReview());
        }

        WorkoutFeedback saved = workoutFeedbackRepository.save(feedback);
        return mapToWorkoutFeedbackDTO(saved);
    }

    public WorkoutFeedbackAnalyticsDTO getFeedbackAnalytics() {
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();
        long todayFeedback = workoutFeedbackRepository.countBySubmittedAtAfter(startOfToday);
        long totalFeedback = workoutFeedbackRepository.count();
        
        List<WorkoutFeedback> allFeedbacks = workoutFeedbackRepository.findAll();
        List<WorkoutFeedback> ratedFeedbacks = allFeedbacks.stream()
                .filter(f -> f.getOverallSatisfaction() != null)
                .collect(Collectors.toList());
        double avgSatisfaction = 0;
        if (!ratedFeedbacks.isEmpty()) {
            long sum = ratedFeedbacks.stream().mapToInt(WorkoutFeedback::getOverallSatisfaction).sum();
            avgSatisfaction = (double) sum / ratedFeedbacks.size();
        }

        long recommendCount = workoutFeedbackRepository.countByRecommendWorkout("yes");
        double recommendationRate = totalFeedback > 0 ? ((double) recommendCount / totalFeedback) * 100 : 0;

        long followUpCount = workoutFeedbackRepository.countByFollowUpRequiredTrue();
        long flaggedCount = workoutFeedbackRepository.countByFlaggedForReviewTrue();

        long completedSessions = attendanceRepository.findByDateRange(startOfToday, LocalDateTime.now()).stream()
                .filter(a -> "completed".equals(a.getStatus()))
                .count();

        double responseRate = completedSessions > 0 ? ((double) todayFeedback / completedSessions) * 100 : 0;

        WorkoutFeedbackAnalyticsDTO dto = new WorkoutFeedbackAnalyticsDTO();
        dto.setTodayFeedback(todayFeedback);
        dto.setTotalFeedback(totalFeedback);
        dto.setAvgSatisfaction(avgSatisfaction);
        dto.setRecommendationRate(recommendationRate);
        dto.setResponseRate(responseRate);
        dto.setFlaggedCount(flaggedCount);
        dto.setFollowUpCount(followUpCount);
        dto.setCompletedSessions(completedSessions);

        return dto;
    }

    private WorkoutSessionDTO mapToWorkoutSessionDTO(Attendance a) {
        WorkoutSessionDTO dto = new WorkoutSessionDTO();
        dto.setId(String.valueOf(a.getId()));
        if (a.getMember() != null) {
            dto.setMemberId(String.valueOf(a.getMember().getId()));
            dto.setMemberName(a.getMember().getName());
        } else {
            dto.setMemberName(a.getWalkInName());
        }
        
        dto.setWorkoutType(a.getActivityType() != null ? a.getActivityType() : "open-gym");
        if (a.getBooking() != null && a.getBooking().getSession() != null) {
            dto.setClassName(a.getBooking().getSession().getName());
            if (a.getBooking().getSession().getTrainer() != null) {
                dto.setTrainerId(String.valueOf(a.getBooking().getSession().getTrainer().getId()));
                dto.setTrainerName(a.getBooking().getSession().getTrainer().getName());
            }
        }
        
        dto.setStartTime(a.getCheckInTime());
        dto.setEndTime(a.getCheckOutTime());
        if (a.getTotalMinutes() != null) {
            dto.setDuration(Math.max(0, a.getTotalMinutes()));
        } else if (a.getCheckInTime() != null && a.getCheckOutTime() != null) {
            long minutes = ChronoUnit.MINUTES.between(a.getCheckInTime(), a.getCheckOutTime());
            dto.setDuration((int) Math.max(0, minutes));
        }
        dto.setStatus(a.getStatus());
        dto.setLocation(a.getDeviceId() != null ? a.getDeviceId() : "Main Gym");
        return dto;
    }

    private WorkoutFeedbackDTO mapToWorkoutFeedbackDTO(WorkoutFeedback f) {
        WorkoutFeedbackDTO dto = new WorkoutFeedbackDTO();
        dto.setId(String.valueOf(f.getId()));
        if (f.getAttendance() != null) {
            dto.setSessionId(String.valueOf(f.getAttendance().getId()));
            dto.setWorkoutType(f.getAttendance().getActivityType() != null ? f.getAttendance().getActivityType() : "open-gym");
            if (f.getAttendance().getBooking() != null && f.getAttendance().getBooking().getSession() != null) {
                dto.setClassName(f.getAttendance().getBooking().getSession().getName());
                if (f.getAttendance().getBooking().getSession().getTrainer() != null) {
                    dto.setTrainerId(String.valueOf(f.getAttendance().getBooking().getSession().getTrainer().getId()));
                    dto.setTrainerName(f.getAttendance().getBooking().getSession().getTrainer().getName());
                }
            }
        }
        if (f.getMember() != null) {
            dto.setMemberId(String.valueOf(f.getMember().getId()));
            dto.setMemberName(f.getMember().getName());
        }
        
        dto.setSubmittedAt(f.getSubmittedAt());
        dto.setOverallSatisfaction(f.getOverallSatisfaction());
        dto.setWorkoutIntensity(f.getWorkoutIntensity());
        dto.setTrainerRating(f.getTrainerRating());
        dto.setEquipmentQuality(f.getEquipmentQuality());
        dto.setFacilityRating(f.getFacilityRating());
        
        dto.setRecommendWorkout(f.getRecommendWorkout());
        dto.setDifficultyLevel(f.getDifficultyLevel());
        dto.setPaceRating(f.getPaceRating());
        
        dto.setBestAspects(f.getBestAspects());
        dto.setAreasForImprovement(f.getAreasForImprovement());
        dto.setComments(f.getComments());
        dto.setSuggestions(f.getSuggestions());
        dto.setEnergyAfterWorkout(f.getEnergyAfterWorkout());
        dto.setLikelyToReturn(f.getLikelyToReturn());
        dto.setWouldRecommendTrainer(f.getWouldRecommendTrainer());
        
        dto.setTrainerNotes(f.getTrainerNotes());
        dto.setFollowUpRequired(f.getFollowUpRequired());
        dto.setFlaggedForReview(f.getFlaggedForReview());
        
        return dto;
    }
}
