package com.company.project.controllers;

import com.company.project.dto.ReferralPageResponseDTO;
import com.company.project.dto.ReferralRequestDTO;
import com.company.project.dto.ReferralResponseDTO;
import com.company.project.dto.ReferralStatsDTO;
import com.company.project.dto.RewardRuleRequestDTO;
import com.company.project.dto.RewardRuleResponseDTO;
import com.company.project.services.ReferralService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/referrals")
public class ReferralController {

    private final ReferralService referralService;

    public ReferralController(ReferralService referralService) {
        this.referralService = referralService;
    }

    /** GET /api/referrals?page=1&size=20&status=&search= */
    @GetMapping
    public ResponseEntity<ReferralPageResponseDTO> getReferrals(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(referralService.getReferrals(page, size, status, search));
    }

    /** GET /api/referrals/stats */
    @GetMapping("/stats")
    public ResponseEntity<ReferralStatsDTO> getStats() {
        return ResponseEntity.ok(referralService.getStats());
    }

    /** GET /api/referrals/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ReferralResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(referralService.getById(id));
    }

    /** POST /api/referrals */
    @PostMapping
    public ResponseEntity<ReferralResponseDTO> create(@RequestBody ReferralRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(referralService.createReferral(request));
    }

    /** PUT /api/referrals/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<ReferralResponseDTO> update(@PathVariable Long id,
                                                       @RequestBody ReferralRequestDTO request) {
        return ResponseEntity.ok(referralService.updateReferral(id, request));
    }

    /** DELETE /api/referrals/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        referralService.deleteReferral(id);
        return ResponseEntity.noContent().build();
    }

    /** POST /api/referrals/{id}/mark-successful */
    @PostMapping("/{id}/mark-successful")
    public ResponseEntity<ReferralResponseDTO> markSuccessful(@PathVariable Long id) {
        return ResponseEntity.ok(referralService.markSuccessful(id));
    }

    /** POST /api/referrals/{id}/mark-expired */
    @PostMapping("/{id}/mark-expired")
    public ResponseEntity<ReferralResponseDTO> markExpired(@PathVariable Long id) {
        return ResponseEntity.ok(referralService.markExpired(id));
    }

    // ── Reward Rules ──────────────────────────────────────────────────────────

    /** GET /api/referrals/rules */
    @GetMapping("/rules")
    public ResponseEntity<List<RewardRuleResponseDTO>> getRules() {
        return ResponseEntity.ok(referralService.getAllRules());
    }

    /** POST /api/referrals/rules */
    @PostMapping("/rules")
    public ResponseEntity<RewardRuleResponseDTO> createRule(@RequestBody RewardRuleRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(referralService.createRule(request));
    }

    /** PUT /api/referrals/rules/{id} */
    @PutMapping("/rules/{id}")
    public ResponseEntity<RewardRuleResponseDTO> updateRule(@PathVariable Long id,
                                                             @RequestBody RewardRuleRequestDTO request) {
        return ResponseEntity.ok(referralService.updateRule(id, request));
    }

    /** POST /api/referrals/rules/{id}/toggle */
    @PostMapping("/rules/{id}/toggle")
    public ResponseEntity<RewardRuleResponseDTO> toggleRule(@PathVariable Long id) {
        return ResponseEntity.ok(referralService.toggleRule(id));
    }

    /** DELETE /api/referrals/rules/{id} */
    @DeleteMapping("/rules/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        referralService.deleteRule(id);
        return ResponseEntity.noContent().build();
    }
}
