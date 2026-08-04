package com.company.project.controllers;

import com.company.project.dto.RewardRuleRequestDTO;
import com.company.project.dto.RewardRuleResponseDTO;
import com.company.project.services.RewardRuleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reward-rules")
public class RewardRuleController {

    private final RewardRuleService rewardRuleService;

    public RewardRuleController(RewardRuleService rewardRuleService) {
        this.rewardRuleService = rewardRuleService;
    }

    /** GET /api/reward-rules */
    @GetMapping
    public ResponseEntity<List<RewardRuleResponseDTO>> getAll() {
        return ResponseEntity.ok(rewardRuleService.getAll());
    }

    /** POST /api/reward-rules */
    @PostMapping
    public ResponseEntity<RewardRuleResponseDTO> create(@RequestBody RewardRuleRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rewardRuleService.create(request));
    }

    /** PUT /api/reward-rules/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<RewardRuleResponseDTO> update(@PathVariable Long id,
                                                         @RequestBody RewardRuleRequestDTO request) {
        return ResponseEntity.ok(rewardRuleService.update(id, request));
    }

    /** DELETE /api/reward-rules/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        rewardRuleService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /** PATCH /api/reward-rules/{id}/toggle */
    @PatchMapping("/{id}/toggle")
    public ResponseEntity<RewardRuleResponseDTO> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(rewardRuleService.toggle(id));
    }

    /** POST /api/reward-rules/{id}/duplicate */
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<RewardRuleResponseDTO> duplicate(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(rewardRuleService.duplicate(id));
    }
}
