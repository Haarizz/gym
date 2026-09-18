package com.company.project.controllers;

import com.company.project.dto.IntegrationRequestDTO;
import com.company.project.dto.IntegrationResponseDTO;
import com.company.project.services.IntegrationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * GymOS's "API Integration" widget: real, admin-managed integration records
 * (see IntegrationService for why status isn't live-probed).
 */
@RestController
@RequestMapping("/api/gymos/integrations")
public class IntegrationController {

    private final IntegrationService integrationService;

    public IntegrationController(IntegrationService integrationService) {
        this.integrationService = integrationService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('GYMOS_VIEW')")
    public ResponseEntity<List<IntegrationResponseDTO>> getAll() {
        return ResponseEntity.ok(integrationService.getAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<IntegrationResponseDTO> create(@RequestBody IntegrationRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(integrationService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<IntegrationResponseDTO> update(@PathVariable Long id, @RequestBody IntegrationRequestDTO request) {
        return ResponseEntity.ok(integrationService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        integrationService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<IntegrationResponseDTO> setStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("status is required");
        }
        return ResponseEntity.ok(integrationService.setStatus(id, status.toUpperCase()));
    }
}
