package com.company.project.controllers;

import com.company.project.dto.DebitNoteRequestDTO;
import com.company.project.dto.DebitNoteResponseDTO;
import com.company.project.services.DebitNoteService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/debit-notes")
public class DebitNoteController {

    private final DebitNoteService debitNoteService;

    public DebitNoteController(DebitNoteService debitNoteService) {
        this.debitNoteService = debitNoteService;
    }

    @GetMapping
    public ResponseEntity<List<DebitNoteResponseDTO>> getAll() {
        return ResponseEntity.ok(debitNoteService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DebitNoteResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(debitNoteService.getById(id));
    }

    @PostMapping
    public ResponseEntity<DebitNoteResponseDTO> create(@RequestBody DebitNoteRequestDTO req) {
        return ResponseEntity.ok(debitNoteService.create(req));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<DebitNoteResponseDTO> post(@PathVariable Long id) {
        return ResponseEntity.ok(debitNoteService.post(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<DebitNoteResponseDTO> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(debitNoteService.cancel(id));
    }
}
