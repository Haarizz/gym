package com.company.project.repositories;

import com.company.project.entities.ReferralRewardRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReferralRewardRuleRepository extends JpaRepository<ReferralRewardRule, Long> {

    List<ReferralRewardRule> findByIsActiveTrue();
}
