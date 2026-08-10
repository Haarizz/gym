package com.company.project.controllers;

import com.company.project.dto.ContraVoucherRequestDTO;
import com.company.project.dto.ContraVoucherResponseDTO;
import com.company.project.services.ContraVoucherService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/contra-vouchers")
public class ContraVoucherController {

    private final ContraVoucherService contraVoucherService;

    public ContraVoucherController(ContraVoucherService contraVoucherService) {
        this.contraVoucherService = contraVoucherService;
    }

    @GetMapping
    public ResponseEntity<List<ContraVoucherResponseDTO>> getAll() {
        return ResponseEntity.ok(contraVoucherService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ContraVoucherResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(contraVoucherService.getById(id));
    }

    @PostMapping
    public ResponseEntity<ContraVoucherResponseDTO> create(@RequestBody ContraVoucherRequestDTO req) {
        return ResponseEntity.ok(contraVoucherService.create(req));
    }

    @PostMapping("/{id}/post")
    public ResponseEntity<ContraVoucherResponseDTO> post(@PathVariable Long id) {
        return ResponseEntity.ok(contraVoucherService.post(id));
    }

    @PostMapping("/{id}/cancel")
    public ResponseEntity<ContraVoucherResponseDTO> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(contraVoucherService.cancel(id));
    }
}
