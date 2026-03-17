package com.company.project.repositories;

import com.company.project.entities.MessageRecipient;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MessageRecipientRepository extends JpaRepository<MessageRecipient, Long> {
    List<MessageRecipient> findByCampaignId(Long campaignId);
    void deleteByCampaignId(Long campaignId);
}
