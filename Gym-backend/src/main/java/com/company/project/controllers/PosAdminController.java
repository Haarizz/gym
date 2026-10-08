package com.company.project.controllers;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.*;
import com.company.project.services.pos.PosCashCategoryService;
import com.company.project.services.pos.PosCorrectionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * POS administration (BillBull parity): managed cash in / out categories and maker-checker
 * corrections. Anyone at the POS can read categories and raise a correction; managing
 * categories needs POINT_OF_SALE_EDIT, and deciding a correction is checked by the service
 * (a supervisor other than the requester).
 */
@RestController
@RequestMapping("/api/pos")
public class PosAdminController {

    private final PosCashCategoryService categoryService;
    private final PosCorrectionService correctionService;

    public PosAdminController(PosCashCategoryService categoryService, PosCorrectionService correctionService) {
        this.categoryService = categoryService;
        this.correctionService = correctionService;
    }

    // ── Cash categories ─────────────────────────────────────────────────────

    /** GET /api/pos/cash-categories?includeInactive=true */
    @GetMapping("/cash-categories")
    public ResponseEntity<List<CashCategoryDTO>> categories(@RequestParam(defaultValue = "false") boolean includeInactive) {
        return ResponseEntity.ok(categoryService.list(includeInactive));
    }

    @PostMapping("/cash-categories")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<CashCategoryDTO> createCategory(@RequestBody PosRequests.CashCategory request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.create(request));
    }

    @PutMapping("/cash-categories/{id}")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<CashCategoryDTO> updateCategory(@PathVariable Long id, @RequestBody PosRequests.CashCategory request) {
        return ResponseEntity.ok(categoryService.update(id, request));
    }

    @PostMapping("/cash-categories/{id}/activate")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<CashCategoryDTO> activateCategory(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.setActive(id, true));
    }

    @PostMapping("/cash-categories/{id}/deactivate")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<CashCategoryDTO> deactivateCategory(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.setActive(id, false));
    }

    // ── Corrections ─────────────────────────────────────────────────────────

    /** GET /api/pos/corrections?status=OPEN&targetType=SALE&search=&page=1&size=20 */
    @GetMapping("/corrections")
    public ResponseEntity<CorrectionsPage> corrections(@RequestParam(required = false) String status,
                                                       @RequestParam(required = false) String targetType,
                                                       @RequestParam(required = false) String search,
                                                       @RequestParam(defaultValue = "1") int page,
                                                       @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(correctionService.list(status, targetType, search, page, size));
    }

    @GetMapping("/corrections/dashboard")
    public ResponseEntity<CorrectionDashboard> correctionDashboard() {
        return ResponseEntity.ok(correctionService.dashboard());
    }

    /** GET /api/pos/corrections/target?targetType=SALE&targetId=42 */
    @GetMapping("/corrections/target")
    public ResponseEntity<List<CorrectionDTO>> correctionsFor(@RequestParam String targetType, @RequestParam Long targetId) {
        return ResponseEntity.ok(correctionService.forTarget(targetType, targetId));
    }

    @GetMapping("/corrections/{id}")
    public ResponseEntity<CorrectionDTO> correction(@PathVariable Long id) {
        return ResponseEntity.ok(correctionService.get(id));
    }

    @PostMapping("/corrections")
    public ResponseEntity<CorrectionDTO> requestCorrection(@RequestBody PosRequests.CorrectionCreate request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(correctionService.create(request));
    }

    @PostMapping("/corrections/{id}/submit")
    public ResponseEntity<CorrectionDTO> submitCorrection(@PathVariable Long id) {
        return ResponseEntity.ok(correctionService.submit(id));
    }

    @PostMapping("/corrections/{id}/cancel")
    public ResponseEntity<CorrectionDTO> cancelCorrection(@PathVariable Long id) {
        return ResponseEntity.ok(correctionService.cancel(id));
    }

    @PostMapping("/corrections/{id}/approve")
    public ResponseEntity<CorrectionDTO> approveCorrection(@PathVariable Long id,
                                                           @RequestBody(required = false) PosRequests.CorrectionDecision request) {
        return ResponseEntity.ok(correctionService.approve(id, request));
    }

    @PostMapping("/corrections/{id}/reject")
    public ResponseEntity<CorrectionDTO> rejectCorrection(@PathVariable Long id,
                                                          @RequestBody(required = false) PosRequests.CorrectionDecision request) {
        return ResponseEntity.ok(correctionService.reject(id, request));
    }

    @PostMapping("/corrections/{id}/apply")
    public ResponseEntity<CorrectionDTO> applyCorrection(@PathVariable Long id) {
        return ResponseEntity.ok(correctionService.apply(id));
    }
}
