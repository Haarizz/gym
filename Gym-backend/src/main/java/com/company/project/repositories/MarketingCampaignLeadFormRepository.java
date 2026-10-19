package com.company.project.repositories;

import com.company.project.entities.MarketingCampaignLeadForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface MarketingCampaignLeadFormRepository extends JpaRepository<MarketingCampaignLeadForm, Long> {

    List<MarketingCampaignLeadForm> findByCampaignId(Long campaignId);

    List<MarketingCampaignLeadForm> findByCampaignIdIn(Collection<Long> campaignIds);

    List<MarketingCampaignLeadForm> findByLeadFormIdIn(Collection<Long> leadFormIds);

    @Modifying
    @Query("DELETE FROM MarketingCampaignLeadForm l WHERE l.campaignId = :campaignId")
    void deleteByCampaignId(@Param("campaignId") Long campaignId);
}
