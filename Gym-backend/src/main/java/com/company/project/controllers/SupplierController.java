package com.company.project.controllers;

import com.company.project.dto.SupplierRequestDTO;
import com.company.project.dto.SupplierResponseDTO;
import com.company.project.services.SupplierService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService supplierService;

    public SupplierController(SupplierService supplierService) {
        this.supplierService = supplierService;
    }

    /**
     * GET /api/suppliers
     */
    @GetMapping
    public ResponseEntity<List<SupplierResponseDTO>> getAllSuppliers() {
        return ResponseEntity.ok(supplierService.getAllSuppliers());
    }

    /**
     * GET /api/suppliers/active
     */
    @GetMapping("/active")
    public ResponseEntity<List<SupplierResponseDTO>> getActiveSuppliers() {
        return ResponseEntity.ok(supplierService.getActiveSuppliers());
    }

    /**
     * GET /api/suppliers/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<SupplierResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(supplierService.getById(id));
    }

    /**
     * POST /api/suppliers
     */
    @PostMapping
    public ResponseEntity<SupplierResponseDTO> create(@RequestBody SupplierRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(supplierService.create(request));
    }

    /**
     * PUT /api/suppliers/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<SupplierResponseDTO> update(
            @PathVariable Long id,
            @RequestBody SupplierRequestDTO request) {
        return ResponseEntity.ok(supplierService.update(id, request));
    }

    /**
     * DELETE /api/suppliers/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        supplierService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
