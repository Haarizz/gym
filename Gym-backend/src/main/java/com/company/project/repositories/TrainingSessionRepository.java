package com.company.project.repositories;

import com.company.project.entities.TrainingSession;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TrainingSessionRepository extends JpaRepository<TrainingSession, Long> {
}
