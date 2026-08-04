package com.company.project.controllers;

import com.company.project.dto.MarkSuccessfulRequestDTO;
import com.company.project.dto.ReferralPageResponseDTO;
import com.company.project.dto.ReferralRequestDTO;
import com.company.project.dto.ReferralResponseDTO;
import com.company.project.dto.ReferralSettingsDTO;
import com.company.project.dto.ReferralStatsDTO;
import com.company.project.dto.ReferralValidationResponseDTO;
import com.company.project.dto.RewardRuleRequestDTO;
import com.company.project.dto.RewardRuleResponseDTO;
import com.company.project.services.ReferralService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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

    /** GET /api/referrals/validate-code?code=XYZ */
    @GetMapping("/validate-code")
    public ResponseEntity<?> validateCode(@RequestParam String code) {
        try {
            ReferralValidationResponseDTO result = referralService.validateByCode(code);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** GET /api/referrals/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ReferralResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(referralService.getById(id));
    }

    /** GET /api/referrals/fix-rewards (TEMPORARY FIX) */
    @GetMapping("/fix-rewards")
    public ResponseEntity<String> fixRewards() {
        String diag = referralService.fixRetroactiveRewards();
        return ResponseEntity.ok(diag);
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
    public ResponseEntity<ReferralResponseDTO> markSuccessful(@PathVariable Long id,
            @RequestBody(required = false) MarkSuccessfulRequestDTO body) {
        return ResponseEntity.ok(referralService.markSuccessful(id, body));
    }

    /** POST /api/referrals/{id}/mark-expired */
    @PostMapping("/{id}/mark-expired")
    public ResponseEntity<ReferralResponseDTO> markExpired(@PathVariable Long id) {
        return ResponseEntity.ok(referralService.markExpired(id));
    }

    /** GET /api/referrals/unredeemed-reward?memberId=MBR-0000000001 */
    @GetMapping("/unredeemed-reward")
    public ResponseEntity<ReferralResponseDTO> getUnredeemedReward(@RequestParam String memberId) {
        ReferralResponseDTO reward = referralService.getUnredeemedReward(memberId);
        return reward != null ? ResponseEntity.ok(reward) : ResponseEntity.noContent().build();
    }

    /** POST /api/referrals/{id}/redeem-reward */
    @PostMapping("/{id}/redeem-reward")
    public ResponseEntity<ReferralResponseDTO> redeemReward(@PathVariable Long id) {
        return ResponseEntity.ok(referralService.redeemReward(id));
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

    // ── Settings ──────────────────────────────────────────────────────────────

    /** GET /api/referrals/settings */
    @GetMapping("/settings")
    public ResponseEntity<ReferralSettingsDTO> getSettings() {
        return ResponseEntity.ok(referralService.getSettings());
    }

    /** PUT /api/referrals/settings */
    @PutMapping("/settings")
    public ResponseEntity<ReferralSettingsDTO> updateSettings(@RequestBody ReferralSettingsDTO request) {
        return ResponseEntity.ok(referralService.updateSettings(request));
    }
}

