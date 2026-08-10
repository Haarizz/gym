package com.company.project.controllers;

import com.company.project.dto.TaxCodeRequestDTO;
import com.company.project.dto.TaxCodeResponseDTO;
import com.company.project.services.TaxCodeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tax-codes")
public class TaxCodeController {

    private final TaxCodeService taxCodeService;

    public TaxCodeController(TaxCodeService taxCodeService) {
        this.taxCodeService = taxCodeService;
    }

    @GetMapping
    public ResponseEntity<List<TaxCodeResponseDTO>> getAll() {
        return ResponseEntity.ok(taxCodeService.getAll());
    }

    @PostMapping
    public ResponseEntity<TaxCodeResponseDTO> create(@RequestBody TaxCodeRequestDTO req) {
        return ResponseEntity.ok(taxCodeService.create(req));
    }

    @PutMapping("/{id}")
    public ResponseEntity<TaxCodeResponseDTO> update(@PathVariable Long id, @RequestBody TaxCodeRequestDTO req) {
        return ResponseEntity.ok(taxCodeService.update(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        taxCodeService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
