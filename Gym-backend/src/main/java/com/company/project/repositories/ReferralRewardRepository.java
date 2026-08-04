package com.company.project.repositories;

import com.company.project.entities.ReferralReward;
import com.company.project.enums.RewardMemberType;
import com.company.project.enums.RewardStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;

public interface ReferralRewardRepository extends JpaRepository<ReferralReward, Long>,
        JpaSpecificationExecutor<ReferralReward> {

    List<ReferralReward> findByMemberIdOrderByGeneratedDateDesc(String memberId);

    List<ReferralReward> findByReferralId(Long referralId);

    List<ReferralReward> findByStatus(RewardStatus status);

    long countByStatus(RewardStatus status);

    boolean existsByReferralIdAndRewardRuleIdAndMemberType(Long referralId, Long rewardRuleId, RewardMemberType memberType);

    long countByMemberIdAndRewardRuleId(String memberId, Long rewardRuleId);

    // Expiry sweep: still-open rewards whose expiry date has passed.
    List<ReferralReward> findByStatusInAndExpiryDateBefore(List<RewardStatus> statuses, LocalDate date);

    // "Expiring soon" notice window.
    List<ReferralReward> findByStatusInAndExpiryDateBetween(List<RewardStatus> statuses, LocalDate from, LocalDate to);
}
