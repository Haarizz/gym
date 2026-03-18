package com.company.project.controllers;

import com.company.project.dto.LeadInteractionDTO;
import com.company.project.dto.LeadPageResponseDTO;
import com.company.project.dto.LeadRequestDTO;
import com.company.project.dto.LeadResponseDTO;
import com.company.project.dto.LeadStatsDTO;
import com.company.project.services.LeadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/leads")
public class LeadController {

    private final LeadService leadService;

    public LeadController(LeadService leadService) {
        this.leadService = leadService;
    }

    /** GET /api/leads?page=1&size=20&status=&source=&priority=&search= */
    @GetMapping
    public ResponseEntity<LeadPageResponseDTO> getLeads(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String source,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(leadService.getLeads(page, size, status, source, priority, search));
    }

    /** GET /api/leads/stats */
    @GetMapping("/stats")
    public ResponseEntity<LeadStatsDTO> getStats() {
        return ResponseEntity.ok(leadService.getStats());
    }

    /** GET /api/leads/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<LeadResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(leadService.getById(id));
    }

    /** POST /api/leads */
    @PostMapping
    public ResponseEntity<LeadResponseDTO> create(@RequestBody LeadRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(leadService.createLead(request));
    }

    /** PUT /api/leads/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<LeadResponseDTO> update(@PathVariable Long id,
                                                   @RequestBody LeadRequestDTO request) {
        return ResponseEntity.ok(leadService.updateLead(id, request));
    }

    /** DELETE /api/leads/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        leadService.deleteLead(id);
        return ResponseEntity.noContent().build();
    }

    /** PATCH /api/leads/{id}/status */
    @PatchMapping("/{id}/status")
    public ResponseEntity<LeadResponseDTO> updateStatus(@PathVariable Long id,
                                                         @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(leadService.updateStatus(id, body.get("status")));
    }

    /** POST /api/leads/{id}/interactions */
    @PostMapping("/{id}/interactions")
    public ResponseEntity<LeadInteractionDTO> addInteraction(@PathVariable Long id,
                                                              @RequestBody LeadInteractionDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(leadService.addInteraction(id, dto));
    }

    /** DELETE /api/leads/interactions/{interactionId} */
    @DeleteMapping("/interactions/{interactionId}")
    public ResponseEntity<Void> deleteInteraction(@PathVariable Long interactionId) {
        leadService.deleteInteraction(interactionId);
        return ResponseEntity.noContent().build();
    }
}
