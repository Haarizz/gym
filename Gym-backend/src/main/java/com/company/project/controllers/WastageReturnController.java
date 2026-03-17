package com.company.project.controllers;

import com.company.project.dto.WastageReturnApprovalRequestDTO;
import com.company.project.dto.WastageReturnPageResponseDTO;
import com.company.project.dto.WastageReturnRequestDTO;
import com.company.project.dto.WastageReturnResponseDTO;
import com.company.project.dto.WastageReturnStatsDTO;
import com.company.project.services.WastageReturnService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wastage-returns")
public class WastageReturnController {

    private final WastageReturnService wastageReturnService;

    public WastageReturnController(WastageReturnService wastageReturnService) {
        this.wastageReturnService = wastageReturnService;
    }

    /**
     * GET /api/wastage-returns?page=1&size=20&type=&status=&search=
     */
    @GetMapping
    public ResponseEntity<WastageReturnPageResponseDTO> getVouchers(
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(wastageReturnService.getVouchers(page, size, type, status, search));
    }

    /**
     * GET /api/wastage-returns/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<WastageReturnStatsDTO> getStats() {
        return ResponseEntity.ok(wastageReturnService.getStats());
    }

    /**
     * GET /api/wastage-returns/{id}
     */
    @GetMapping("/{id}")
    public ResponseEntity<WastageReturnResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(wastageReturnService.getById(id));
    }

    /**
     * POST /api/wastage-returns
     */
    @PostMapping
    public ResponseEntity<WastageReturnResponseDTO> createVoucher(@RequestBody WastageReturnRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(wastageReturnService.createVoucher(request));
    }

    /**
     * PUT /api/wastage-returns/{id}
     */
    @PutMapping("/{id}")
    public ResponseEntity<WastageReturnResponseDTO> updateVoucher(
            @PathVariable Long id,
            @RequestBody WastageReturnRequestDTO request) {
        return ResponseEntity.ok(wastageReturnService.updateVoucher(id, request));
    }

    /**
     * DELETE /api/wastage-returns/{id}
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteVoucher(@PathVariable Long id) {
        wastageReturnService.deleteVoucher(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * POST /api/wastage-returns/{id}/submit
     */
    @PostMapping("/{id}/submit")
    public ResponseEntity<WastageReturnResponseDTO> submitForApproval(@PathVariable Long id) {
        return ResponseEntity.ok(wastageReturnService.submitForApproval(id));
    }

    /**
     * POST /api/wastage-returns/{id}/approve
     */
    @PostMapping("/{id}/approve")
    public ResponseEntity<WastageReturnResponseDTO> approveVoucher(@PathVariable Long id) {
        return ResponseEntity.ok(wastageReturnService.approveVoucher(id));
    }

    /**
     * POST /api/wastage-returns/{id}/reject
     */
    @PostMapping("/{id}/reject")
    public ResponseEntity<WastageReturnResponseDTO> rejectVoucher(
            @PathVariable Long id,
            @RequestBody WastageReturnApprovalRequestDTO request) {
        return ResponseEntity.ok(wastageReturnService.rejectVoucher(id, request.getRejectionReason()));
    }

    /**
     * POST /api/wastage-returns/{id}/complete
     */
    @PostMapping("/{id}/complete")
    public ResponseEntity<WastageReturnResponseDTO> completeVoucher(@PathVariable Long id) {
        return ResponseEntity.ok(wastageReturnService.completeVoucher(id));
    }

    /**
     * POST /api/wastage-returns/{id}/cancel
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<WastageReturnResponseDTO> cancelVoucher(@PathVariable Long id) {
        return ResponseEntity.ok(wastageReturnService.cancelVoucher(id));
    }
}
