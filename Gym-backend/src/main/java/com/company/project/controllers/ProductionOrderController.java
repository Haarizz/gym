package com.company.project.controllers;

import com.company.project.dto.ProductionOrderPageResponseDTO;
import com.company.project.dto.ProductionOrderRequestDTO;
import com.company.project.dto.ProductionOrderResponseDTO;
import com.company.project.services.ProductionOrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/production-orders")
public class ProductionOrderController {

    private final ProductionOrderService productionOrderService;

    public ProductionOrderController(ProductionOrderService productionOrderService) {
        this.productionOrderService = productionOrderService;
    }

    /**
     * GET /api/production-orders?page=1&size=20&status=&search=
     */
    @GetMapping
    public ResponseEntity<ProductionOrderPageResponseDTO> getOrders(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(productionOrderService.getOrders(page, size, status, search));
    }

    /**
     * GET /api/production-orders/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(productionOrderService.getStats());
    }

    /**
     * GET /api/production-orders/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProductionOrderResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productionOrderService.getById(id));
    }

    /**
     * POST /api/production-orders
     */
    @PostMapping
    public ResponseEntity<ProductionOrderResponseDTO> createOrder(@RequestBody ProductionOrderRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(productionOrderService.createOrder(request));
    }

    /**
     * DELETE /api/production-orders/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        productionOrderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/production-orders/{id}/start
     */
    @PostMapping("/{id}/start")
    public ResponseEntity<ProductionOrderResponseDTO> startProduction(@PathVariable Long id) {
        return ResponseEntity.ok(productionOrderService.startProduction(id));
    }

    /**
     * POST /api/production-orders/{id}/complete
     */
    @PostMapping("/{id}/complete")
    public ResponseEntity<ProductionOrderResponseDTO> completeProduction(@PathVariable Long id) {
        return ResponseEntity.ok(productionOrderService.completeProduction(id));
    }

    /**
     * POST /api/production-orders/{id}/cancel
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<ProductionOrderResponseDTO> cancelOrder(@PathVariable Long id) {
        return ResponseEntity.ok(productionOrderService.cancelOrder(id));
    }
}
