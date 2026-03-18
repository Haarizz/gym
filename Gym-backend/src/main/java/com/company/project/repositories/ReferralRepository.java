package com.company.project.repositories;

import com.company.project.entities.Referral;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ReferralRepository extends JpaRepository<Referral, Long>, JpaSpecificationExecutor<Referral> {

    Optional<Referral> findByReferralId(String referralId);

    Optional<Referral> findByReferralCode(String referralCode);

    List<Referral> findByReferrerMemberId(String referrerMemberId);

    long countByStatus(String status);

    @Query("SELECT COALESCE(SUM(r.rewardAmount), 0) FROM Referral r WHERE r.status = 'successful'")
    java.math.BigDecimal sumRewardsEarned();
}
