package com.company.project.controllers;

import com.company.project.dto.ReferralCampaignRequestDTO;
import com.company.project.dto.ReferralCampaignResponseDTO;
import com.company.project.services.ReferralCampaignService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/referral-campaigns")
public class ReferralCampaignController {

    private final ReferralCampaignService campaignService;

    public ReferralCampaignController(ReferralCampaignService campaignService) {
        this.campaignService = campaignService;
    }

    /** GET /api/referral-campaigns */
    @GetMapping
    public ResponseEntity<List<ReferralCampaignResponseDTO>> getAll() {
        return ResponseEntity.ok(campaignService.getAll());
    }

    /** POST /api/referral-campaigns */
    @PostMapping
    public ResponseEntity<ReferralCampaignResponseDTO> create(@RequestBody ReferralCampaignRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(campaignService.create(request));
    }

    /** PUT /api/referral-campaigns/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<ReferralCampaignResponseDTO> update(@PathVariable Long id,
                                                               @RequestBody ReferralCampaignRequestDTO request) {
        return ResponseEntity.ok(campaignService.update(id, request));
    }

    /** DELETE /api/referral-campaigns/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        campaignService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
