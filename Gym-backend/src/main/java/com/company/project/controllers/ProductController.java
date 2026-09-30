package com.company.project.controllers;

import com.company.project.dto.ProductRequestDTO;
import com.company.project.dto.ProductResponseDTO;
import com.company.project.dto.ProductStatsDTO;
import com.company.project.dto.ProductsPageResponseDTO;
import com.company.project.dto.StockAdjustmentRequestDTO;
import com.company.project.services.ProductService;
import com.company.project.services.ProductSettingsService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final ProductSettingsService productSettingsService;

    public ProductController(ProductService productService, ProductSettingsService productSettingsService) {
        this.productService = productService;
        this.productSettingsService = productSettingsService;
    }

    /**
     * GET /api/products/settings — Products › Settings tab (also read by the Add
     * Product form for the SKU mode and default tax rate).
     */
    @GetMapping("/settings")
    public ResponseEntity<Map<String, String>> getSettings() {
        return ResponseEntity.ok(productSettingsService.getSettings());
    }

    /**
     * PUT /api/products/settings — partial update, e.g. {"lowStockAlerts": "false"}.
     * /api/products/** is otherwise open to any authenticated user, so changing
     * gym-wide behaviour is gated on the products edit permission.
     */
    @PutMapping("/settings")
    @PreAuthorize("hasAuthority('PRODUCTS_EDIT')")
    public ResponseEntity<Map<String, String>> updateSettings(@RequestBody Map<String, String> settings) {
        return ResponseEntity.ok(productSettingsService.updateSettings(settings));
    }

    /**
     * GET /api/products?search=&categoryId=&status=&enabledForPos=&page=1&size=20
     */
    @GetMapping
    public ResponseEntity<ProductsPageResponseDTO> getProducts(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Boolean enabledForPos,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {

        return ResponseEntity.ok(
                productService.getProducts(search, categoryId, status, enabledForPos, page, size)
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
