package com.company.project.controllers;

import com.company.project.dto.ProductRequestDTO;
import com.company.project.dto.ProductResponseDTO;
import com.company.project.dto.ProductStatsDTO;
import com.company.project.dto.ProductsPageResponseDTO;
import com.company.project.dto.StockAdjustmentRequestDTO;
import com.company.project.services.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;

    public ProductController(ProductService productService) {
        this.productService = productService;
    }

    /**
     * GET /api/products?search=&categoryId=&status=&page=1&size=20
     */
    @GetMapping
    public ResponseEntity<ProductsPageResponseDTO> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {

        return ResponseEntity.ok(
                productService.getProducts(search, categoryId, status, page, size)
        );
    }

    /**
     * GET /api/products/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<ProductStatsDTO> getStats() {
        return ResponseEntity.ok(productService.getStats());
    }

    /**
     * GET /api/products/low-stock
     */
    @GetMapping("/low-stock")
    public ResponseEntity<List<ProductResponseDTO>> getLowStockProducts() {
        return ResponseEntity.ok(productService.getLowStockProducts());
    }

    /**
     * GET /api/products/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProductResponseDTO> getProductById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id));
    }

    /**
     * POST /api/products
     */
    @PostMapping
    public ResponseEntity<ProductResponseDTO> createProduct(@RequestBody ProductRequestDTO req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.createProduct(req));
    }

    /**
     * PUT /api/products/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<ProductResponseDTO> updateProduct(@PathVariable Long id,
                                                            @RequestBody ProductRequestDTO req) {
        return ResponseEntity.ok(productService.updateProduct(id, req));
    }

    /**
     * DELETE /api/products/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteProduct(@PathVariable Long id) {
        productService.deleteProduct(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * PATCH /api/products/{id}/stock
     */
    @PatchMapping("/{id}/stock")
    public ResponseEntity<ProductResponseDTO> adjustStock(@PathVariable Long id,
                                                          @RequestBody StockAdjustmentRequestDTO req) {
        return ResponseEntity.ok(productService.adjustStock(id, req));
    }

    /**
     * POST /api/products/{id}/duplicate
     */
    @PostMapping("/{id}/duplicate")
    public ResponseEntity<ProductResponseDTO> duplicateProduct(@PathVariable Long id) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productService.duplicateProduct(id));
    }
}
