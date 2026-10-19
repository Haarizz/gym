package com.company.project.repositories;

import com.company.project.entities.MarketingCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface MarketingCampaignRepository extends JpaRepository<MarketingCampaign, Long> {

    List<MarketingCampaign> findAllByOrderByStartDateDescIdDesc();

    /**
     * Campaign ids in a branch whose tracking code matches an ad link's utm_campaign, newest
     * first. Native, so the branchFilter does not apply — branch_id is filtered explicitly
     * (the public lead-form submission path runs outside any staff request).
     */
    @Query(value = "SELECT id FROM marketing_campaigns WHERE branch_id = :branchId " +
            "AND status <> 'cancelled' AND tracking_code IS NOT NULL " +
            "AND lower(tracking_code) = lower(:code) ORDER BY start_date DESC, id DESC", nativeQuery = true)
    List<Long> findIdsByTrackingCode(@Param("branchId") Long branchId, @Param("code") String code);

    /**
     * Ids of the non-cancelled campaigns a lead form is linked to, best match for `today`
     * first: a campaign running today, else the most recently started one
     * (leads keep trickling in after the ads stop), else none — a campaign that has not
     * started yet only gets leads once it starts.
     */
    @Query(value = "SELECT c.id FROM marketing_campaigns c " +
            "JOIN marketing_campaign_lead_forms l ON l.campaign_id = c.id " +
            "WHERE l.lead_form_id = :formId AND c.branch_id = :branchId AND c.status <> 'cancelled' " +
            "AND c.start_date <= :today " +
            "ORDER BY CASE WHEN c.end_date >= :today THEN 0 ELSE 1 END, c.start_date DESC, c.id DESC",
            nativeQuery = true)
    List<Long> findAttributableIdsForForm(@Param("formId") Long formId, @Param("branchId") Long branchId,
                                          @Param("today") LocalDate today);
}
