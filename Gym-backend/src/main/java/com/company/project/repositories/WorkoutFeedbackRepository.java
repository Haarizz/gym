package com.company.project.repositories;

import com.company.project.entities.WorkoutFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface WorkoutFeedbackRepository extends JpaRepository<WorkoutFeedback, Long> {
    List<WorkoutFeedback> findBySubmittedAtAfter(LocalDateTime date);
    List<WorkoutFeedback> findByMember_IdOrderBySubmittedAtDesc(Long memberId);
    long countBySubmittedAtAfter(LocalDateTime date);
    long countByRecommendWorkout(String recommend);
    long countByFollowUpRequiredTrue();
    long countByFlaggedForReviewTrue();
}
