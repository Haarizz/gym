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

    // ── Marketing campaign attribution (V101) ──────────────────────────────────

    /**
     * [id, marketingCampaignId, status, memberId, createdAt, leadFormId, source, assignedStaff,
     * lastContactDate] for every lead credited to these campaigns. JPQL, so the branchFilter applies.
     */
    @org.springframework.data.jpa.repository.Query("SELECT l.id, l.marketingCampaignId, l.status, l.memberId, l.createdAt, " +
            "l.leadFormId, l.source, l.assignedStaff, l.lastContactDate FROM Lead l WHERE l.marketingCampaignId IN :campaignIds")
    java.util.List<Object[]> findCampaignLeadRows(
            @org.springframework.data.repository.query.Param("campaignIds") java.util.Collection<Long> campaignIds);

    java.util.List<Lead> findTop50ByMarketingCampaignIdOrderByCreatedAtDesc(Long marketingCampaignId);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Lead l SET l.marketingCampaignId = null WHERE l.marketingCampaignId = :campaignId")
    int clearMarketingCampaign(@org.springframework.data.repository.query.Param("campaignId") Long campaignId);

    /**
     * Credits a campaign with leads its newly linked lead forms already brought in since it
     * started (only leads not credited to any campaign yet). Bulk update: branch_id is explicit.
     */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("UPDATE Lead l SET l.marketingCampaignId = :campaignId " +
            "WHERE l.marketingCampaignId IS NULL AND l.branchId = :branchId AND l.leadFormId IN :formIds " +
            "AND l.createdAt >= :since")
    int attributeFormLeads(@org.springframework.data.repository.query.Param("campaignId") Long campaignId,
                           @org.springframework.data.repository.query.Param("branchId") Long branchId,
                           @org.springframework.data.repository.query.Param("formIds") java.util.Collection<Long> formIds,
                           @org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since);

    /**
     * Same, for leads captured before V101 stamped lead_form_id: those only carry the form's
     * name as a "form:<name>" tag (tags is a JSON array in a TEXT column).
     */
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query(value = "UPDATE leads SET marketing_campaign_id = :campaignId, lead_form_id = :formId " +
            "WHERE marketing_campaign_id IS NULL AND lead_form_id IS NULL AND branch_id = :branchId " +
            "AND tags LIKE :tagPattern AND created_at >= :since", nativeQuery = true)
    int attributeLegacyFormLeads(@org.springframework.data.repository.query.Param("campaignId") Long campaignId,
                                 @org.springframework.data.repository.query.Param("formId") Long formId,
                                 @org.springframework.data.repository.query.Param("branchId") Long branchId,
                                 @org.springframework.data.repository.query.Param("tagPattern") String tagPattern,
                                 @org.springframework.data.repository.query.Param("since") java.time.LocalDateTime since);
}
