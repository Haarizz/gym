package com.company.project.repositories;

import com.company.project.entities.ReferralReward;
import com.company.project.enums.RewardMemberType;
import com.company.project.enums.RewardStatus;
import com.company.project.enums.RewardType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface ReferralRewardRepository extends JpaRepository<ReferralReward, Long>,
        JpaSpecificationExecutor<ReferralReward> {

    List<ReferralReward> findByMemberIdOrderByGeneratedDateDesc(String memberId);

    List<ReferralReward> findByReferralId(Long referralId);

    List<ReferralReward> findByStatus(RewardStatus status);

    long countByStatus(RewardStatus status);

    boolean existsByReferralIdAndRewardRuleIdAndMemberType(Long referralId, Long rewardRuleId, RewardMemberType memberType);

    boolean existsByRewardRuleId(Long rewardRuleId);

    long countByMemberIdAndRewardRuleId(String memberId, Long rewardRuleId);

    // Global cap enforcement (ReferralSettings.maxRewardsPerMember), independent of any one rule.
    long countByMemberId(String memberId);

    // Expiry sweep: still-open rewards whose expiry date has passed.
    List<ReferralReward> findByStatusInAndExpiryDateBefore(List<RewardStatus> statuses, LocalDate date);

    // "Expiring soon" notice window.
    List<ReferralReward> findByStatusInAndExpiryDateBetween(List<RewardStatus> statuses, LocalDate from, LocalDate to);

    // Reward Passes a member can still spend (type/status filtered; expiry is checked by the caller).
    List<ReferralReward> findByMemberIdAndRewardTypeInAndStatusInOrderByExpiryDateAsc(
            String memberId, Collection<RewardType> types, Collection<RewardStatus> statuses);

    // Row lock while spending a pass, so two concurrent checkouts can't both use it.
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM ReferralReward r WHERE r.id = :id")
    Optional<ReferralReward> findByIdForUpdate(@Param("id") Long id);
}
