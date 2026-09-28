package com.company.project.repositories;

import com.company.project.entities.WorkoutFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Repository
public interface WorkoutFeedbackRepository extends JpaRepository<WorkoutFeedback, Long> {
    List<WorkoutFeedback> findBySubmittedAtAfter(LocalDateTime date);
    List<WorkoutFeedback> findByMember_IdOrderBySubmittedAtDesc(Long memberId);
    long countBySubmittedAtAfter(LocalDateTime date);
    long countByRecommendWorkout(String recommend);
    long countByFollowUpRequiredTrue();
    long countByFlaggedForReviewTrue();
    boolean existsByAttendance_Id(Long attendanceId);

    // (trainerId, avgRating, ratingCount) — feedback is attributed to a trainer via the
    // attended booking's session. Trainer rating wins; overall satisfaction is the fallback.
    @Query("SELECT s.trainer.id, AVG(COALESCE(f.trainerRating, f.overallSatisfaction)), COUNT(f) " +
           "FROM WorkoutFeedback f JOIN f.attendance a JOIN a.booking b JOIN b.session s " +
           "WHERE s.trainer.id IN :trainerIds AND COALESCE(f.trainerRating, f.overallSatisfaction) > 0 " +
           "GROUP BY s.trainer.id")
    List<Object[]> averageRatingByTrainerIds(@Param("trainerIds") Collection<Long> trainerIds);
}
