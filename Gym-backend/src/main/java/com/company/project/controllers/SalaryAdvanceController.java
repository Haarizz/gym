package com.company.project.controllers;

import com.company.project.dto.SalaryAdvanceApprovalRequestDTO;
import com.company.project.dto.SalaryAdvanceRequestDTO;
import com.company.project.dto.SalaryAdvanceResponseDTO;
import com.company.project.services.SalaryAdvanceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/salary-advances")
public class SalaryAdvanceController {

    private final SalaryAdvanceService salaryAdvanceService;

    public SalaryAdvanceController(SalaryAdvanceService salaryAdvanceService) {
        this.salaryAdvanceService = salaryAdvanceService;
    }

    @GetMapping
    public ResponseEntity<List<SalaryAdvanceResponseDTO>> getAdvances(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String department) {
        return ResponseEntity.ok(salaryAdvanceService.getAdvances(search, status, department));
    }

    @PostMapping
    public ResponseEntity<SalaryAdvanceResponseDTO> createAdvance(
            @RequestBody SalaryAdvanceRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(salaryAdvanceService.createAdvance(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SalaryAdvanceResponseDTO> updateAdvance(
            @PathVariable Long id,
            @RequestBody SalaryAdvanceRequestDTO request) {
        return ResponseEntity.ok(salaryAdvanceService.updateAdvance(id, request));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<SalaryAdvanceResponseDTO> approveAdvance(
            @PathVariable Long id,
            @RequestBody SalaryAdvanceApprovalRequestDTO request) {
        return ResponseEntity.ok(salaryAdvanceService.approveAdvance(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAdvance(@PathVariable Long id) {
        salaryAdvanceService.deleteAdvance(id);
        return ResponseEntity.noContent().build();
    }
}
