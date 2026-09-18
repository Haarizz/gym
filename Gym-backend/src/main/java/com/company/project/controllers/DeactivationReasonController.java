package com.company.project.controllers;

import com.company.project.dto.DeactivationReasonRequestDTO;
import com.company.project.dto.DeactivationReasonResponseDTO;
import com.company.project.services.DeactivationReasonService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gymos/deactivation-reasons")
public class DeactivationReasonController {

    private final DeactivationReasonService reasonService;

    public DeactivationReasonController(DeactivationReasonService reasonService) {
        this.reasonService = reasonService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('GYMOS_VIEW')")
    public ResponseEntity<List<DeactivationReasonResponseDTO>> getAll() {
        return ResponseEntity.ok(reasonService.getAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<DeactivationReasonResponseDTO> create(@RequestBody DeactivationReasonRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reasonService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<DeactivationReasonResponseDTO> update(@PathVariable Long id, @RequestBody DeactivationReasonRequestDTO request) {
        return ResponseEntity.ok(reasonService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        reasonService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
