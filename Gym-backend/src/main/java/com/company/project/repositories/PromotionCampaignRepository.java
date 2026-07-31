package com.company.project.repositories;

import com.company.project.entities.PromotionCampaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PromotionCampaignRepository extends JpaRepository<PromotionCampaign, Long> {

    List<PromotionCampaign> findAllByOrderByCreatedAtDesc();

    List<PromotionCampaign> findByStatusOrderByCreatedAtDesc(String status);

    Optional<PromotionCampaign> findByCodeIgnoreCase(String code);

    List<PromotionCampaign> findByStatusAndTypeOrderByPriorityAsc(String status, String type);
}
