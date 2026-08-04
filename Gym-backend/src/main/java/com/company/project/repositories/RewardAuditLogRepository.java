package com.company.project.repositories;

import com.company.project.entities.RewardAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RewardAuditLogRepository extends JpaRepository<RewardAuditLog, Long> {

    List<RewardAuditLog> findByRewardIdOrderByCreatedAtDesc(Long rewardId);
}
