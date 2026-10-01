package com.company.project.repositories;

import com.company.project.entities.Lead;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface LeadRepository extends JpaRepository<Lead, Long>, JpaSpecificationExecutor<Lead> {

    Optional<Lead> findByLeadId(String leadId);

    long countByStatus(String status);

    /** Unlinks leads from a member that is being deleted, so they can be registered again. */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Lead l SET l.memberId = null WHERE l.memberId = :memberId")
    int clearMemberLink(@org.springframework.data.repository.query.Param("memberId") Long memberId);

    @org.springframework.data.jpa.repository.Query("SELECT l.status, COUNT(l) FROM Lead l GROUP BY l.status")
    java.util.List<Object[]> countLeadsByStatus();

    // Duplicate check for public lead forms: compares the last 10 digits so
    // "+91 98765-43210" and "9876543210" match. Native (for regexp_replace), so the
    // Hibernate branchFilter does NOT apply — branch_id is filtered explicitly.
    @org.springframework.data.jpa.repository.Query(value =
            "SELECT * FROM leads WHERE branch_id = :branchId AND phone IS NOT NULL " +
            "AND right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = :phoneDigits " +
            "ORDER BY created_at DESC LIMIT 1", nativeQuery = true)
    Optional<Lead> findLatestByBranchAndPhoneDigits(
            @org.springframework.data.repository.query.Param("branchId") Long branchId,
            @org.springframework.data.repository.query.Param("phoneDigits") String phoneDigits);
}
