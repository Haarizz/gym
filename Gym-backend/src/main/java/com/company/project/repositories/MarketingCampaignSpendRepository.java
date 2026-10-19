package com.company.project.repositories;

import com.company.project.entities.MarketingCampaignSpend;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface MarketingCampaignSpendRepository extends JpaRepository<MarketingCampaignSpend, Long> {

    List<MarketingCampaignSpend> findByCampaignIdOrderBySpendDateDescIdDesc(Long campaignId);

    List<MarketingCampaignSpend> findByCampaignIdIn(Collection<Long> campaignIds);

    @Modifying
    @Query("DELETE FROM MarketingCampaignSpend s WHERE s.campaignId = :campaignId")
    void deleteByCampaignId(@Param("campaignId") Long campaignId);
}
