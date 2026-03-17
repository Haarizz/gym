package com.company.project.repositories;

import com.company.project.entities.CashMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CashMovementRepository extends JpaRepository<CashMovement, Long> {
    List<CashMovement> findByPosSessionIdOrderByCreatedAtDesc(Long sessionId);
}
