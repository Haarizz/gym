package com.company.project.controllers;

import com.company.project.controlplane.service.LeadCaptureFormService;
import com.company.project.dto.LeadCaptureFormRequestDTO;
import com.company.project.dto.LeadCaptureFormResponseDTO;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Gym admin's public lead forms (Leads page -> "Lead Forms"). Scoped to the
 * caller's own tenant, and to their active branch unless in All Branches mode.
 * The unauthenticated side lives in {@link PublicLeadFormController}.
 */
@RestController
@RequestMapping("/api/lead-forms")
public class LeadCaptureFormController {

    private final LeadCaptureFormService formService;

    public LeadCaptureFormController(LeadCaptureFormService formService) {
        this.formService = formService;
    }

    /** GET /api/lead-forms */
    @GetMapping
    @PreAuthorize("hasAuthority('LEADS_VIEW')")
    public ResponseEntity<List<LeadCaptureFormResponseDTO>> list() {
        return ResponseEntity.ok(formService.list());
    }

    /** POST /api/lead-forms */
    @PostMapping
    @PreAuthorize("hasAuthority('LEADS_CREATE')")
    public ResponseEntity<LeadCaptureFormResponseDTO> create(@RequestBody LeadCaptureFormRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(formService.create(request));
    }

    /** PUT /api/lead-forms/{id} — partial: null fields are left unchanged. */
    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('LEADS_EDIT')")
    public ResponseEntity<LeadCaptureFormResponseDTO> update(@PathVariable Long id,
                                                             @RequestBody LeadCaptureFormRequestDTO request) {
        return ResponseEntity.ok(formService.update(id, request));
    }

    /** DELETE /api/lead-forms/{id} — existing leads it created are kept. */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('LEADS_DELETE')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        formService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
