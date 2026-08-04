package com.company.project.repositories;

import com.company.project.entities.ReferralCampaign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReferralCampaignRepository extends JpaRepository<ReferralCampaign, Long> {

    List<ReferralCampaign> findByStatusOrderByCreatedAtDesc(String status);

    List<ReferralCampaign> findAllByOrderByCreatedAtDesc();
}
