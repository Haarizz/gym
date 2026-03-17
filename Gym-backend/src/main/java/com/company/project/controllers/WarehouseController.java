package com.company.project.controllers;

import com.company.project.dto.WarehouseDTO;
import com.company.project.services.WarehouseService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/warehouses")
public class WarehouseController {

    private final WarehouseService warehouseService;

    public WarehouseController(WarehouseService warehouseService) {
        this.warehouseService = warehouseService;
    }

    /**
     * GET /api/warehouses
     */
    @GetMapping
    public ResponseEntity<List<WarehouseDTO>> getAllWarehouses() {
        return ResponseEntity.ok(warehouseService.getAllWarehouses());
    }

    /**
     * GET /api/warehouses/active
     */
    @GetMapping("/active")
    public ResponseEntity<List<WarehouseDTO>> getActiveWarehouses() {
        return ResponseEntity.ok(warehouseService.getActiveWarehouses());
    }

    /**
     * GET /api/warehouses/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<WarehouseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(warehouseService.getById(id));
    }

    /**
     * POST /api/warehouses
     */
    @PostMapping
    public ResponseEntity<WarehouseDTO> create(@RequestBody WarehouseDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(warehouseService.create(dto));
    }

    /**
     * PUT /api/warehouses/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<WarehouseDTO> update(@PathVariable Long id, @RequestBody WarehouseDTO dto) {
        return ResponseEntity.ok(warehouseService.update(id, dto));
    }

    /**
     * DELETE /api/warehouses/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        warehouseService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
