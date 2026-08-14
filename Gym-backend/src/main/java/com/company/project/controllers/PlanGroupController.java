package com.company.project.controllers;

import com.company.project.dto.PlanGroupDTO;
import com.company.project.services.PlanGroupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/plan-groups")
public class PlanGroupController {

    private final PlanGroupService planGroupService;

    public PlanGroupController(PlanGroupService planGroupService) {
        this.planGroupService = planGroupService;
    }

    @GetMapping
    public ResponseEntity<List<PlanGroupDTO>> getAll() {
        return ResponseEntity.ok(planGroupService.getAll());
    }

    @PostMapping
    public ResponseEntity<PlanGroupDTO> create(@RequestBody PlanGroupDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(planGroupService.create(dto));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PlanGroupDTO> update(@PathVariable Long id, @RequestBody PlanGroupDTO dto) {
        return ResponseEntity.ok(planGroupService.update(id, dto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        planGroupService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
