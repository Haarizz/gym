package com.company.project.controllers;

import com.company.project.dto.PurchaseOrderPageResponseDTO;
import com.company.project.dto.PurchaseOrderRequestDTO;
import com.company.project.dto.PurchaseOrderResponseDTO;
import com.company.project.dto.ReceiveItemsRequestDTO;
import com.company.project.services.PurchaseOrderService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/purchase-orders")
public class PurchaseOrderController {

    private final PurchaseOrderService purchaseOrderService;

    public PurchaseOrderController(PurchaseOrderService purchaseOrderService) {
        this.purchaseOrderService = purchaseOrderService;
    }

    /**
     * GET /api/purchase-orders?search=&status=&supplierId=&page=1&size=20
     */
    @GetMapping
    public ResponseEntity<PurchaseOrderPageResponseDTO> getOrders(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long supplierId,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(purchaseOrderService.getOrders(search, status, supplierId, page, size));
    }

    /**
     * GET /api/purchase-orders/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<PurchaseOrderResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(purchaseOrderService.getById(id));
    }

    /**
     * POST /api/purchase-orders
     */
    @PostMapping
    public ResponseEntity<PurchaseOrderResponseDTO> createOrder(@RequestBody PurchaseOrderRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(purchaseOrderService.createOrder(request));
    }

    /**
     * PUT /api/purchase-orders/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<PurchaseOrderResponseDTO> updateOrder(
            @PathVariable Long id,
            @RequestBody PurchaseOrderRequestDTO request) {
        return ResponseEntity.ok(purchaseOrderService.updateOrder(id, request));
    }

    /**
     * PATCH /api/purchase-orders/{id}/status
     */
    @PatchMapping("/{id}/status")
    public ResponseEntity<PurchaseOrderResponseDTO> updateStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            throw new RuntimeException("Status is required");
        }
        return ResponseEntity.ok(purchaseOrderService.updateStatus(id, newStatus));
    }

    /**
     * POST /api/purchase-orders/{id}/receive
     */
    @PostMapping("/{id}/receive")
    public ResponseEntity<PurchaseOrderResponseDTO> receiveItems(
            @PathVariable Long id,
            @RequestBody ReceiveItemsRequestDTO request) {
        return ResponseEntity.ok(purchaseOrderService.receiveItems(id, request));
    }

    /**
     * DELETE /api/purchase-orders/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteOrder(@PathVariable Long id) {
        purchaseOrderService.deleteOrder(id);
        return ResponseEntity.noContent().build();
    }
}
