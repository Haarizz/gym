package com.company.project.repositories.mobile.family;

import com.company.project.entities.MobileFamilyInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MobileFamilyInvitationRepository extends JpaRepository<MobileFamilyInvitation, Long> {

    Optional<MobileFamilyInvitation> findByTokenHash(String tokenHash);

    List<MobileFamilyInvitation> findByPrimaryMemberIdAndStatus(String primaryMemberId, String status);
    
    List<MobileFamilyInvitation> findByDependentMemberIdAndStatus(String dependentMemberId, String status);

    @Modifying
    @Query("UPDATE MobileFamilyInvitation i SET i.status = 'REVOKED', i.updatedAt = :now WHERE i.dependentMemberId = :dependentMemberId AND i.status = 'PENDING'")
    int revokePendingInvitations(@Param("dependentMemberId") String dependentMemberId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE MobileFamilyInvitation i SET i.status = :status, i.updatedAt = :now WHERE i.id = :id AND i.status = 'PENDING'")
    int transitionFromPending(@Param("id") Long id, @Param("status") String status, @Param("now") LocalDateTime now);
}
