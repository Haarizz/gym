package com.company.project.repositories;

import com.company.project.entities.MembershipApplication;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MembershipApplicationRepository extends JpaRepository<MembershipApplication, Long> {

    List<MembershipApplication> findByApprovalStatusOrderByCreatedAtDesc(String approvalStatus);

    List<MembershipApplication> findTop100ByApprovalStatusInOrderByDecidedAtDesc(List<String> approvalStatuses);

    List<MembershipApplication> findByBranchIdAndApprovalStatus(Long branchId, String approvalStatus);

    long countByApprovalStatus(String approvalStatus);

    boolean existsByReference(String reference);

    /** Locks the row so two admins can't both approve (and create two members). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM MembershipApplication a WHERE a.id = :id")
    Optional<MembershipApplication> findByIdForUpdate(@Param("id") Long id);
}
