package com.company.project.controllers;

import com.company.project.dto.FacilityRequestDTO;
import com.company.project.dto.FacilityResponseDTO;
import com.company.project.services.FacilityService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/facilities")
public class FacilityController {

    private final FacilityService facilityService;

    public FacilityController(FacilityService facilityService) {
        this.facilityService = facilityService;
    }

    @GetMapping
    public ResponseEntity<List<FacilityResponseDTO>> getFacilities(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(facilityService.getFacilities(status, search));
    }

    @PostMapping
    public ResponseEntity<FacilityResponseDTO> createFacility(
            @RequestBody FacilityRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(facilityService.createFacility(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FacilityResponseDTO> updateFacility(
            @PathVariable Long id,
            @RequestBody FacilityRequestDTO request) {
        return ResponseEntity.ok(facilityService.updateFacility(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFacility(@PathVariable Long id) {
        facilityService.deleteFacility(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/toggle-status")
    public ResponseEntity<FacilityResponseDTO> toggleStatus(@PathVariable Long id) {
        return ResponseEntity.ok(facilityService.toggleStatus(id));
    }
}
