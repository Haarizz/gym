package com.company.project.controllers;

import com.company.project.dto.CreditNoteRequestDTO;
import com.company.project.dto.CreditNoteResponseDTO;
import com.company.project.services.CreditNoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/credit-notes")
public class CreditNoteController {

    private final CreditNoteService creditNoteService;

    public CreditNoteController(CreditNoteService creditNoteService) {
        this.creditNoteService = creditNoteService;
    }

    @GetMapping
    public ResponseEntity<List<CreditNoteResponseDTO>> getAll() {
        return ResponseEntity.ok(creditNoteService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CreditNoteResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(creditNoteService.getById(id));
    }

    @PostMapping
    public ResponseEntity<CreditNoteResponseDTO> create(@RequestBody CreditNoteRequestDTO req) {
        return ResponseEntity.ok(creditNoteService.create(req));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<CreditNoteResponseDTO> post(@PathVariable Long id) {
        return ResponseEntity.ok(creditNoteService.post(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<CreditNoteResponseDTO> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(creditNoteService.cancel(id));
    }
}
