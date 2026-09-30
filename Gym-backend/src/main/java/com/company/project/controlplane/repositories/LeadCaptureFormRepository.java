package com.company.project.controlplane.repositories;

import com.company.project.controlplane.entities.LeadCaptureForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface LeadCaptureFormRepository extends JpaRepository<LeadCaptureForm, Long> {

    Optional<LeadCaptureForm> findByFormKey(String formKey);

    boolean existsByFormKey(String formKey);

    List<LeadCaptureForm> findByTenantSlugOrderByCreatedAtDesc(String tenantSlug);

    List<LeadCaptureForm> findByTenantSlugAndBranchIdOrderByCreatedAtDesc(String tenantSlug, Long branchId);

    Optional<LeadCaptureForm> findByIdAndTenantSlug(Long id, String tenantSlug);

    // Single UPDATE rather than read-modify-write so concurrent submissions
    // (an ad going live) can't lose increments.
    @Modifying
    @Query("UPDATE LeadCaptureForm f SET f.submissionCount = f.submissionCount + 1, f.lastSubmissionAt = :at WHERE f.id = :id")
    void recordSubmission(@Param("id") Long id, @Param("at") LocalDateTime at);
}
