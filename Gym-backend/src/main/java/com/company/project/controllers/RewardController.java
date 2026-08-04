package com.company.project.controllers;

import com.company.project.dto.ReferralRewardResponseDTO;
import com.company.project.dto.RewardActionRequestDTO;
import com.company.project.dto.RewardAuditLogResponseDTO;
import com.company.project.dto.RewardStatsDTO;
import com.company.project.services.RewardService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rewards")
public class RewardController {

    private final RewardService rewardService;

    public RewardController(RewardService rewardService) {
        this.rewardService = rewardService;
    }

    /** GET /api/rewards?page=1&size=20&status=&rewardType=&memberId=&search= */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getRewards(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String rewardType,
            @RequestParam(required = false) String memberId,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(rewardService.getRewards(page, size, status, rewardType, memberId, search));
    }

    /** GET /api/rewards/stats */
    @GetMapping("/stats")
    public ResponseEntity<RewardStatsDTO> getStats() {
        return ResponseEntity.ok(rewardService.getStats());
    }

    /** GET /api/rewards/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ReferralRewardResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(rewardService.getById(id));
    }

    /** GET /api/rewards/member/{memberId} */
    @GetMapping("/member/{memberId}")
    public ResponseEntity<List<ReferralRewardResponseDTO>> getByMember(@PathVariable String memberId) {
        return ResponseEntity.ok(rewardService.getByMember(memberId));
    }

    /** GET /api/rewards/audit/{rewardId} */
    @GetMapping("/audit/{rewardId}")
    public ResponseEntity<List<RewardAuditLogResponseDTO>> getAuditTrail(@PathVariable Long rewardId) {
        return ResponseEntity.ok(rewardService.getAuditTrail(rewardId));
    }

    /** POST /api/rewards/{rewardId}/claim */
    @PostMapping("/{rewardId}/claim")
    public ResponseEntity<ReferralRewardResponseDTO> claim(@PathVariable Long rewardId) {
        return ResponseEntity.ok(rewardService.claim(rewardId));
    }

    /** POST /api/rewards/{rewardId}/redeem */
    @PostMapping("/{rewardId}/redeem")
    public ResponseEntity<ReferralRewardResponseDTO> redeem(@PathVariable Long rewardId) {
        return ResponseEntity.ok(rewardService.redeem(rewardId));
    }

    /** POST /api/rewards/{rewardId}/approve */
    @PostMapping("/{rewardId}/approve")
    public ResponseEntity<ReferralRewardResponseDTO> approve(@PathVariable Long rewardId,
            @RequestBody(required = false) RewardActionRequestDTO body) {
        return ResponseEntity.ok(rewardService.approve(rewardId, body != null ? body.getRemarks() : null));
    }

    /** POST /api/rewards/{rewardId}/reject */
    @PostMapping("/{rewardId}/reject")
    public ResponseEntity<ReferralRewardResponseDTO> reject(@PathVariable Long rewardId,
            @RequestBody(required = false) RewardActionRequestDTO body) {
        return ResponseEntity.ok(rewardService.reject(rewardId, body != null ? body.getRemarks() : null));
    }

    /** POST /api/rewards/{rewardId}/cancel */
    @PostMapping("/{rewardId}/cancel")
    public ResponseEntity<ReferralRewardResponseDTO> cancel(@PathVariable Long rewardId,
            @RequestBody(required = false) RewardActionRequestDTO body) {
        return ResponseEntity.ok(rewardService.cancel(rewardId, body != null ? body.getRemarks() : null));
    }
}
