package com.company.project.repositories;

import com.company.project.entities.ReferralRewardRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReferralRewardRuleRepository extends JpaRepository<ReferralRewardRule, Long> {

    List<ReferralRewardRule> findByIsActiveTrue();

    @Modifying
    @Query("UPDATE ReferralRewardRule r SET r.isActive = false WHERE r.isActive = true AND (:excludeId IS NULL OR r.id != :excludeId)")
    void deactivateAllExcept(@Param("excludeId") Long excludeId);

    // Evaluation order for RewardEngineService: highest priority first.
    List<ReferralRewardRule> findByIsActiveTrueOrderByPriorityDesc();

    List<ReferralRewardRule> findByCampaignId(Long campaignId);
}
