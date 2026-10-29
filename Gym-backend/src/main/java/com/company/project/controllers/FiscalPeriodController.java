package com.company.project.controllers;

import com.company.project.dto.FiscalPeriodResponseDTO;
import com.company.project.entities.FiscalPeriod;
import com.company.project.services.FiscalPeriodService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/fiscal-periods")
public class FiscalPeriodController {

    private final FiscalPeriodService fiscalPeriodService;

    public FiscalPeriodController(FiscalPeriodService fiscalPeriodService) {
        this.fiscalPeriodService = fiscalPeriodService;
    }

    /** With fiscal_year_id, each period also carries its journal-entry count. */
    @GetMapping
    public ResponseEntity<List<FiscalPeriodResponseDTO>> getAll(
            @RequestParam(name = "fiscal_year_id", required = false) Long fiscalYearId) {
        if (fiscalYearId == null) {
            return ResponseEntity.ok(fiscalPeriodService.findAll().stream()
                    .map(FiscalPeriodResponseDTO::fromEntity).collect(Collectors.toList()));
        }
        List<FiscalPeriod> periods = fiscalPeriodService.findByFiscalYear(fiscalYearId);
        Map<Long, Long> counts = fiscalPeriodService.voucherCounts(periods);
        return ResponseEntity.ok(periods.stream().map(p -> {
            FiscalPeriodResponseDTO dto = FiscalPeriodResponseDTO.fromEntity(p);
            dto.setVoucherCount(counts.get(p.getId()));
            return dto;
        }).collect(Collectors.toList()));
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
