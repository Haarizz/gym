package com.company.project.controllers;

import com.company.project.dto.CostCenterRequestDTO;
import com.company.project.dto.CostCenterResponseDTO;
import com.company.project.services.CostCenterService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cost-centers")
public class CostCenterController {

    private final CostCenterService costCenterService;

    public CostCenterController(CostCenterService costCenterService) {
        this.costCenterService = costCenterService;
    }

    @GetMapping
    public ResponseEntity<List<CostCenterResponseDTO>> getAll(
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(costCenterService.getAll(branch, isActive, search));
    }

    @PostMapping
    public ResponseEntity<CostCenterResponseDTO> create(@RequestBody CostCenterRequestDTO req) {
        try {
            return ResponseEntity.ok(costCenterService.create(req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<CostCenterResponseDTO> update(@PathVariable Long id,
                                                         @RequestBody CostCenterRequestDTO req) {
        try {
            return ResponseEntity.ok(costCenterService.update(id, req));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PatchMapping("/{id}/toggle-active")
    public ResponseEntity<CostCenterResponseDTO> toggleActive(@PathVariable Long id) {
        try {
            return ResponseEntity.ok(costCenterService.toggleActive(id));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        try {
            costCenterService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
