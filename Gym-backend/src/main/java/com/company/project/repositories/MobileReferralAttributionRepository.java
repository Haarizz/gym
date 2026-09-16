package com.company.project.repositories;

import com.company.project.entities.MobileReferralAttribution;
import com.company.project.entities.MobileReferralStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.List;

public interface MobileReferralAttributionRepository extends JpaRepository<MobileReferralAttribution, Long> {
    
    Optional<MobileReferralAttribution> findByRefereeGlobalUserId(Long refereeGlobalUserId);
    
    List<MobileReferralAttribution> findByReferrerGlobalUserId(Long referrerGlobalUserId);

    List<MobileReferralAttribution> findByStatus(MobileReferralStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM MobileReferralAttribution m WHERE m.refereeGlobalUserId = :refereeGlobalUserId AND m.status = :status")
    Optional<MobileReferralAttribution> findByRefereeGlobalUserIdAndStatusForUpdate(
            @Param("refereeGlobalUserId") Long refereeGlobalUserId, 
            @Param("status") MobileReferralStatus status);
}
