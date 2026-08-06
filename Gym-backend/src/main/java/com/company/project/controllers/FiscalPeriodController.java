package com.company.project.controllers;

import com.company.project.dto.FiscalPeriodResponseDTO;
import com.company.project.services.FiscalPeriodService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/fiscal-periods")
public class FiscalPeriodController {

    private final FiscalPeriodService fiscalPeriodService;

    public FiscalPeriodController(FiscalPeriodService fiscalPeriodService) {
        this.fiscalPeriodService = fiscalPeriodService;
    }

    @GetMapping
    public ResponseEntity<List<FiscalPeriodResponseDTO>> getAll(
            @RequestParam(name = "fiscal_year_id", required = false) Long fiscalYearId) {
        List<FiscalPeriodResponseDTO> periods = (fiscalYearId != null
                ? fiscalPeriodService.findByFiscalYear(fiscalYearId)
                : fiscalPeriodService.findAll())
                .stream().map(FiscalPeriodResponseDTO::fromEntity).collect(Collectors.toList());
        return ResponseEntity.ok(periods);
    }

    @PatchMapping("/{id}/close")
    public ResponseEntity<FiscalPeriodResponseDTO> close(@PathVariable Long id) {
        return ResponseEntity.ok(FiscalPeriodResponseDTO.fromEntity(fiscalPeriodService.setStatus(id, "CLOSED")));
    }

    @PatchMapping("/{id}/lock")
    public ResponseEntity<FiscalPeriodResponseDTO> lock(@PathVariable Long id) {
        return ResponseEntity.ok(FiscalPeriodResponseDTO.fromEntity(fiscalPeriodService.setStatus(id, "LOCKED")));
    }

    @PatchMapping("/{id}/reopen")
    public ResponseEntity<FiscalPeriodResponseDTO> reopen(@PathVariable Long id) {
        return ResponseEntity.ok(FiscalPeriodResponseDTO.fromEntity(fiscalPeriodService.setStatus(id, "OPEN")));
    }
}
