package com.company.project.repositories.mobile.checkin;

import com.company.project.entities.WorkoutFeedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MobileWorkoutFeedbackRepository extends JpaRepository<WorkoutFeedback, Long> {
    boolean existsByAttendance_Id(Long attendanceId);
}
