package com.company.project.controllers;

import com.company.project.dto.CommissionRuleRequestDTO;
import com.company.project.dto.CommissionRuleResponseDTO;
import com.company.project.services.CommissionRuleService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/commission-rules")
public class CommissionRuleController {

    private final CommissionRuleService ruleService;

    public CommissionRuleController(CommissionRuleService ruleService) {
        this.ruleService = ruleService;
    }

    @GetMapping
    public ResponseEntity<List<CommissionRuleResponseDTO>> getAllRules() {
        return ResponseEntity.ok(ruleService.getAllRules());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CommissionRuleResponseDTO> getRuleById(@PathVariable Long id) {
        return ResponseEntity.ok(ruleService.getRuleById(id));
    }

    @PostMapping
    public ResponseEntity<CommissionRuleResponseDTO> createRule(@RequestBody CommissionRuleRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ruleService.createRule(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CommissionRuleResponseDTO> updateRule(
            @PathVariable Long id,
            @RequestBody CommissionRuleRequestDTO request) {
        return ResponseEntity.ok(ruleService.updateRule(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRule(@PathVariable Long id) {
        ruleService.deleteRule(id);
        return ResponseEntity.noContent().build();
    }
}
