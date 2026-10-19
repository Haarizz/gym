package com.company.project.controllers;

import com.company.project.dto.MarketingCampaignDTOs.*;
import com.company.project.services.MarketingCampaignService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Marketing campaigns (Promotions &amp; Campaigns › Campaigns). Guarded by ModulePermissionRules:
 * reads need PROMOTIONS_CAMPAIGN_VIEW (the /options picker also LEADS_VIEW), writes the
 * matching PROMOTIONS_CAMPAIGN action.
 */
@RestController
@RequestMapping("/api/marketing-campaigns")
public class MarketingCampaignController {

    private final MarketingCampaignService service;

    public MarketingCampaignController(MarketingCampaignService service) {
        this.service = service;
    }

    /** GET /api/marketing-campaigns — every campaign with its metrics. */
    @GetMapping
    public ResponseEntity<List<Campaign>> list() {
        return ResponseEntity.ok(service.list());
    }

    /** GET /api/marketing-campaigns/options — id + name for pickers (Leads page). */
    @GetMapping("/options")
    public ResponseEntity<List<CampaignOption>> options() {
        return ResponseEntity.ok(service.options());
    }

    /** GET /api/marketing-campaigns/lead-forms — lead forms that can be linked. */
    @GetMapping("/lead-forms")
    public ResponseEntity<List<LeadFormOption>> leadForms() {
        return ResponseEntity.ok(service.leadFormOptions());
    }

    /** GET /api/marketing-campaigns/{id} — full report (daily trend, breakdowns, spend log, leads). */
    @GetMapping("/{id}")
    public ResponseEntity<CampaignReport> report(@PathVariable Long id) {
        return ResponseEntity.ok(service.report(id));
    }

    /** POST /api/marketing-campaigns */
    @PostMapping
    public ResponseEntity<Campaign> create(@RequestBody CampaignRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    /** PUT /api/marketing-campaigns/{id} — partial: null fields are left unchanged. */
    @PutMapping("/{id}")
    public ResponseEntity<Campaign> update(@PathVariable Long id, @RequestBody CampaignRequest request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    /** PATCH /api/marketing-campaigns/{id}/status */
    @PatchMapping("/{id}/status")
    public ResponseEntity<Campaign> updateStatus(@PathVariable Long id, @RequestBody StatusRequest request) {
        return ResponseEntity.ok(service.updateStatus(id, request.status()));
    }

    /** PUT /api/marketing-campaigns/{id}/lead-forms — replaces the linked lead forms. */
    @PutMapping("/{id}/lead-forms")
    public ResponseEntity<Campaign> linkLeadForms(@PathVariable Long id, @RequestBody LeadFormLinkRequest request) {
        return ResponseEntity.ok(service.linkLeadForms(id, request));
    }

    /** DELETE /api/marketing-campaigns/{id} — leads it was credited with are kept. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** POST /api/marketing-campaigns/{id}/spends */
    @PostMapping("/{id}/spends")
    public ResponseEntity<Spend> addSpend(@PathVariable Long id, @RequestBody SpendRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.addSpend(id, request));
    }

    /** PUT /api/marketing-campaigns/{id}/spends/{spendId} */
    @PutMapping("/{id}/spends/{spendId}")
    public ResponseEntity<Spend> updateSpend(@PathVariable Long id, @PathVariable Long spendId,
                                             @RequestBody SpendRequest request) {
        return ResponseEntity.ok(service.updateSpend(id, spendId, request));
    }

    /** DELETE /api/marketing-campaigns/{id}/spends/{spendId} */
    @DeleteMapping("/{id}/spends/{spendId}")
    public ResponseEntity<Void> deleteSpend(@PathVariable Long id, @PathVariable Long spendId) {
        service.deleteSpend(id, spendId);
        return ResponseEntity.noContent().build();
    }
}
