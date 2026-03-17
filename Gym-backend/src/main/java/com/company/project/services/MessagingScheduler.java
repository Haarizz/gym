package com.company.project.services;

import com.company.project.entities.MessageCampaign;
import com.company.project.repositories.MessageCampaignRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class MessagingScheduler {

    private final MessageCampaignRepository campaignRepository;
    private final MessagingService messagingService;

    public MessagingScheduler(MessageCampaignRepository campaignRepository, MessagingService messagingService) {
        this.campaignRepository = campaignRepository;
        this.messagingService = messagingService;
    }

    @Scheduled(fixedDelayString = "${messaging.scheduler.delay-ms:60000}")
    public void processScheduledMessages() {
        List<MessageCampaign> campaigns = campaignRepository.findByStatusAndScheduledAtBefore("scheduled", LocalDateTime.now());
        for (MessageCampaign campaign : campaigns) {
            messagingService.processScheduledCampaign(campaign);
        }
    }
}
