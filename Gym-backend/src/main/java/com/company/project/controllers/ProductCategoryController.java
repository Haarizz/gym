package com.company.project.controllers;

import com.company.project.dto.ProductCategoryDTO;
import com.company.project.services.ProductCategoryService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/product-categories")
public class ProductCategoryController {

    private final ProductCategoryService productCategoryService;

    public ProductCategoryController(ProductCategoryService productCategoryService) {
        this.productCategoryService = productCategoryService;
    }

    /**
     * GET /api/product-categories
     */
    @GetMapping
    public ResponseEntity<List<ProductCategoryDTO>> getAllCategories() {
        return ResponseEntity.ok(productCategoryService.getAllCategories());
    }

    /**
     * GET /api/product-categories/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProductCategoryDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productCategoryService.getById(id));
    }

    /**
     * POST /api/product-categories
     */
    @PostMapping
    public ResponseEntity<ProductCategoryDTO> create(@RequestBody ProductCategoryDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productCategoryService.create(dto));
    }

    /**
     * PUT /api/product-categories/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ProductCategoryDTO> update(@PathVariable Long id,
                                                     @RequestBody ProductCategoryDTO dto) {
        return ResponseEntity.ok(productCategoryService.update(id, dto));
    }

    /**
     * DELETE /api/product-categories/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productCategoryService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
