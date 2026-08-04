package com.company.project.services;

import com.company.project.dto.ReferralCampaignRequestDTO;
import com.company.project.dto.ReferralCampaignResponseDTO;
import com.company.project.entities.ReferralCampaign;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.ReferralCampaignRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ReferralCampaignService {

    private final ReferralCampaignRepository campaignRepository;

    public ReferralCampaignService(ReferralCampaignRepository campaignRepository) {
        this.campaignRepository = campaignRepository;
    }

    @Transactional(readOnly = true)
    public List<ReferralCampaignResponseDTO> getAll() {
        return campaignRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(ReferralCampaignResponseDTO::fromEntity)
                .collect(Collectors.toList());
    }

    public ReferralCampaignResponseDTO create(ReferralCampaignRequestDTO req) {
        ReferralCampaign campaign = new ReferralCampaign();
        applyRequest(req, campaign);
        ReferralCampaign saved = campaignRepository.save(campaign);
        saved.setCampaignId("CAMP-" + String.format("%010d", saved.getId()));
        return ReferralCampaignResponseDTO.fromEntity(campaignRepository.save(saved));
    }

    public ReferralCampaignResponseDTO update(Long id, ReferralCampaignRequestDTO req) {
        ReferralCampaign campaign = campaignRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("Campaign not found: " + id));
        applyRequest(req, campaign);
        return ReferralCampaignResponseDTO.fromEntity(campaignRepository.save(campaign));
    }

    public void delete(Long id) {
        if (!campaignRepository.existsById(id)) {
            throw new EntityNotFoundException("Campaign not found: " + id);
        }
        campaignRepository.deleteById(id);
    }

    private void applyRequest(ReferralCampaignRequestDTO req, ReferralCampaign campaign) {
        if (req.getName() != null) campaign.setName(req.getName());
        if (req.getDescription() != null) campaign.setDescription(req.getDescription());
        if (req.getStartDate() != null) campaign.setStartDate(req.getStartDate());
        if (req.getEndDate() != null) campaign.setEndDate(req.getEndDate());
        if (req.getStatus() != null) campaign.setStatus(req.getStatus());
        if (req.getPriority() != null) campaign.setPriority(req.getPriority());
        if (req.getStackable() != null) campaign.setStackable(req.getStackable());
    }

    // Called by NotificationScheduler, mirroring PromotionCampaignService.autoTransitionStatuses() —
    // status is otherwise purely user/API-set, so a "scheduled" campaign never flips to "active"
    // when its start date arrives, and nothing ever flips to "expired" when the end date passes.
    public void autoTransitionStatuses() {
        LocalDate today = LocalDate.now();
        List<ReferralCampaign> candidates = new ArrayList<>();
        candidates.addAll(campaignRepository.findByStatusOrderByCreatedAtDesc("scheduled"));
        candidates.addAll(campaignRepository.findByStatusOrderByCreatedAtDesc("active"));
        candidates.addAll(campaignRepository.findByStatusOrderByCreatedAtDesc("paused"));

        List<ReferralCampaign> changed = new ArrayList<>();
        for (ReferralCampaign c : candidates) {
            if (c.getEndDate() != null && c.getEndDate().isBefore(today)) {
                c.setStatus("expired");
                changed.add(c);
            } else if ("scheduled".equals(c.getStatus()) && c.getStartDate() != null && !c.getStartDate().isAfter(today)) {
                c.setStatus("active");
                changed.add(c);
            }
        }
        if (!changed.isEmpty()) campaignRepository.saveAll(changed);
    }
}
