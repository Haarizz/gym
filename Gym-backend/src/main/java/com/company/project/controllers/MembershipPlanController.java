package com.company.project.controllers;

import com.company.project.dto.MembershipPlanRequestDTO;
import com.company.project.dto.MembershipPlanResponseDTO;
import com.company.project.services.MembershipPlanService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/plans")
public class MembershipPlanController {

    private final MembershipPlanService planService;

    public MembershipPlanController(MembershipPlanService planService) {
        this.planService = planService;
    }

    @GetMapping
    public ResponseEntity<List<MembershipPlanResponseDTO>> getPlans(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(planService.getPlans(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<MembershipPlanResponseDTO> getPlanById(@PathVariable Long id) {
        return ResponseEntity.ok(planService.getPlanById(id));
    }

    @PostMapping
    public ResponseEntity<MembershipPlanResponseDTO> createPlan(
            @RequestBody MembershipPlanRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(planService.createPlan(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MembershipPlanResponseDTO> updatePlan(
            @PathVariable Long id,
            @RequestBody MembershipPlanRequestDTO request) {
        return ResponseEntity.ok(planService.updatePlan(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deletePlan(@PathVariable Long id) {
        planService.deletePlan(id);
        return ResponseEntity.ok(Map.of("message", "Plan deleted successfully"));
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<MembershipPlanResponseDTO> duplicatePlan(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(planService.duplicatePlan(id));
    }
}
