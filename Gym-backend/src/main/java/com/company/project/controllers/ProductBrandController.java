package com.company.project.controllers;

import com.company.project.dto.ProductBrandDTO;
import com.company.project.services.ProductBrandService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/product-brands")
public class ProductBrandController {

    private final ProductBrandService productBrandService;

    public ProductBrandController(ProductBrandService productBrandService) {
        this.productBrandService = productBrandService;
    }

    /** GET /api/product-brands */
    @GetMapping
    public ResponseEntity<List<ProductBrandDTO>> getAllBrands() {
        return ResponseEntity.ok(productBrandService.getAllBrands());
    }

    /** GET /api/product-brands/{id} */
    @GetMapping("/{id}")
    public ResponseEntity<ProductBrandDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productBrandService.getById(id));
    }

    /** POST /api/product-brands */
    @PostMapping
    public ResponseEntity<ProductBrandDTO> create(@RequestBody ProductBrandDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productBrandService.create(dto));
    }

    /** PUT /api/product-brands/{id} */
    @PutMapping("/{id}")
    public ResponseEntity<ProductBrandDTO> update(@PathVariable Long id, @RequestBody ProductBrandDTO dto) {
        return ResponseEntity.ok(productBrandService.update(id, dto));
    }

    /** DELETE /api/product-brands/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productBrandService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
