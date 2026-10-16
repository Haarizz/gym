package com.company.project.repositories.mobile.referrals;

import com.company.project.entities.MobileReferralProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface MobileReferralProfileRepository extends JpaRepository<MobileReferralProfile, Long> {
    Optional<MobileReferralProfile> findByGlobalUserId(Long globalUserId);
    Optional<MobileReferralProfile> findByMemberId(Long memberId);
    boolean existsByReferralCode(String referralCode);
    Optional<MobileReferralProfile> findByReferralCode(String referralCode);
}
