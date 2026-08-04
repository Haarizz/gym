package com.company.project.repositories;

import com.company.project.entities.TrainingSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {
    List<TrainingSession> findTop5ByStatusOrderByDateDescStartTimeDesc(String status);
}
