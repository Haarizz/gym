package com.company.project.controllers;

import com.company.project.entities.AutomationWorkflow;
import com.company.project.services.AutomationWorkflowService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/automations")
public class AutomationWorkflowController {

    private final AutomationWorkflowService service;

    public AutomationWorkflowController(AutomationWorkflowService service) {
        this.service = service;
    }

    /** GET /api/automations — list all workflows */
    @GetMapping
    public ResponseEntity<List<AutomationWorkflow>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    /** GET /api/automations/stats — dashboard analytics */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(service.getStats());
    }

    /** GET /api/automations/{id} — single workflow detail */
    @GetMapping("/{id}")
    public ResponseEntity<AutomationWorkflow> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    /** GET /api/automations/{id}/logs?page=0&size=20 — execution history */
    @GetMapping("/{id}/logs")
    public ResponseEntity<List<?>> getLogs(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(service.getExecutionLogs(id, page, size));
    }

    /** POST /api/automations — create a new workflow */
    @PostMapping
    public ResponseEntity<AutomationWorkflow> create(@RequestBody AutomationWorkflow workflow) {
        return ResponseEntity.ok(service.create(workflow));
    }

    /** PUT /api/automations/{id} — update an existing workflow */
    @PutMapping("/{id}")
    public ResponseEntity<AutomationWorkflow> update(
            @PathVariable Long id,
            @RequestBody AutomationWorkflow patch) {
        return ResponseEntity.ok(service.update(id, patch));
    }

    /** PUT /api/automations/{id}/toggle — activate ↔ pause */
    @PutMapping("/{id}/toggle")
    public ResponseEntity<AutomationWorkflow> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(service.toggleStatus(id));
    }

    /** POST /api/automations/{id}/run — manual run */
    @PostMapping("/{id}/run")
    public ResponseEntity<Map<String, String>> run(@PathVariable Long id) {
        service.manualRun(id);
        return ResponseEntity.ok(Map.of("status", "triggered"));
    }

    /** DELETE /api/automations/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
