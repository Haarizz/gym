package com.company.project.controllers;

import com.company.project.dto.AddonPlanDTO;
import com.company.project.services.AddonPlanService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Admin-editable catalog for the "Purchase An Add-On" screen — replaces the
 * hardcoded list previously baked into the frontend (member-addons.tsx).
 */
@RestController
@RequestMapping("/api/addon-plans")
public class AddonPlanController {

    private final AddonPlanService addonPlanService;

    public AddonPlanController(AddonPlanService addonPlanService) {
        this.addonPlanService = addonPlanService;
    }

    /**
     * GET /api/addon-plans?activeOnly=true
     */
    @GetMapping
    public ResponseEntity<List<AddonPlanDTO>> getAll(
            @RequestParam(required = false) Boolean activeOnly) {
        return ResponseEntity.ok(addonPlanService.getAll(activeOnly));
    }

    /**
     * GET /api/addon-plans/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<AddonPlanDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(addonPlanService.getById(id));
    }

    /**
     * POST /api/addon-plans
     */
    @PostMapping
    public ResponseEntity<AddonPlanDTO> create(@RequestBody AddonPlanDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(addonPlanService.create(dto));
    }

    /**
     * PUT /api/addon-plans/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<AddonPlanDTO> update(@PathVariable Long id, @RequestBody AddonPlanDTO dto) {
        return ResponseEntity.ok(addonPlanService.update(id, dto));
    }

    /**
     * PATCH /api/addon-plans/{id}/toggle-active
     */
    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<AddonPlanDTO> toggleActive(@PathVariable Long id) {
        return ResponseEntity.ok(addonPlanService.toggleActive(id));
    }

    /**
     * DELETE /api/addon-plans/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        addonPlanService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
