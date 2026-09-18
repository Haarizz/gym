package com.company.project.controllers;

import com.company.project.dto.CatalogDisplaySectionRequestDTO;
import com.company.project.dto.CatalogDisplaySectionResponseDTO;
import com.company.project.services.CatalogDisplaySectionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/gymos/catalog-sections")
public class CatalogDisplaySectionController {

    private final CatalogDisplaySectionService sectionService;

    public CatalogDisplaySectionController(CatalogDisplaySectionService sectionService) {
        this.sectionService = sectionService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('GYMOS_VIEW')")
    public ResponseEntity<List<CatalogDisplaySectionResponseDTO>> getAll() {
        return ResponseEntity.ok(sectionService.getAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<CatalogDisplaySectionResponseDTO> create(@RequestBody CatalogDisplaySectionRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(sectionService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<CatalogDisplaySectionResponseDTO> update(@PathVariable Long id, @RequestBody CatalogDisplaySectionRequestDTO request) {
        return ResponseEntity.ok(sectionService.update(id, request));
    }

    @PatchMapping("/{id}/toggle")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<CatalogDisplaySectionResponseDTO> toggle(@PathVariable Long id) {
        return ResponseEntity.ok(sectionService.toggleEnabled(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        sectionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
