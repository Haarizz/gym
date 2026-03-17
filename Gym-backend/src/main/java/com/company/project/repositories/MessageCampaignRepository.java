package com.company.project.repositories;

import com.company.project.entities.MessageCampaign;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface MessageCampaignRepository extends JpaRepository<MessageCampaign, Long> {
    List<MessageCampaign> findTop200ByOrderByCreatedAtDesc();
    List<MessageCampaign> findByStatusAndScheduledAtBefore(String status, LocalDateTime scheduledAt);
}
