package com.company.project.controllers;

import com.company.project.dto.JournalVoucherRequestDTO;
import com.company.project.dto.JournalVoucherResponseDTO;
import com.company.project.services.JournalVoucherService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/journal-vouchers")
public class JournalVoucherController {

    private final JournalVoucherService journalVoucherService;

    public JournalVoucherController(JournalVoucherService journalVoucherService) {
        this.journalVoucherService = journalVoucherService;
    }

    @GetMapping
    public ResponseEntity<List<JournalVoucherResponseDTO>> getJournalVouchers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(journalVoucherService.getJournalVouchers(search, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<JournalVoucherResponseDTO> getJournalVoucher(@PathVariable Long id) {
        return ResponseEntity.ok(journalVoucherService.getJournalVoucherById(id));
    }

    @PostMapping
    public ResponseEntity<JournalVoucherResponseDTO> createJournalVoucher(
            @RequestBody JournalVoucherRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(journalVoucherService.createJournalVoucher(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<JournalVoucherResponseDTO> updateJournalVoucher(
            @PathVariable Long id,
            @RequestBody JournalVoucherRequestDTO request) {
        return ResponseEntity.ok(journalVoucherService.updateJournalVoucher(id, request));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<JournalVoucherResponseDTO> postJournalVoucher(@PathVariable Long id) {
        return ResponseEntity.ok(journalVoucherService.postJournalVoucher(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<JournalVoucherResponseDTO> cancelJournalVoucher(@PathVariable Long id) {
        return ResponseEntity.ok(journalVoucherService.cancelJournalVoucher(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteJournalVoucher(@PathVariable Long id) {
        journalVoucherService.deleteJournalVoucher(id);
        return ResponseEntity.noContent().build();
    }
}
