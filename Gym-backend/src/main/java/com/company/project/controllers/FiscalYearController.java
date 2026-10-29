package com.company.project.controllers;

import com.company.project.dto.FiscalYearRequestDTO;
import com.company.project.dto.FiscalYearResponseDTO;
import com.company.project.entities.FiscalPeriod;
import com.company.project.entities.FiscalYear;
import com.company.project.services.FiscalPeriodService;
import com.company.project.services.FiscalYearService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/fiscal-years")
public class FiscalYearController {

    private final FiscalYearService fiscalYearService;
    private final FiscalPeriodService fiscalPeriodService;

    public FiscalYearController(FiscalYearService fiscalYearService, FiscalPeriodService fiscalPeriodService) {
        this.fiscalYearService = fiscalYearService;
        this.fiscalPeriodService = fiscalPeriodService;
    }

    @GetMapping
    public ResponseEntity<List<FiscalYearResponseDTO>> getAll() {
        return ResponseEntity.ok(fiscalYearService.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList()));
    }

    /** Creates the fiscal year AND its monthly periods in one call. */
    @PostMapping
    public ResponseEntity<FiscalYearResponseDTO> create(@RequestBody FiscalYearRequestDTO req) {
        FiscalYear year = fiscalYearService.create(req.getName(), req.getStartDate(), req.getEndDate());
        return ResponseEntity.ok(toDto(year));
    }

    /** Also closes the year's OPEN periods (LOCKED ones stay locked). */
    @PatchMapping("/{id}/close")
    public ResponseEntity<FiscalYearResponseDTO> close(@PathVariable Long id) {
        return ResponseEntity.ok(toDto(fiscalYearService.close(id)));
    }

    /** Also reopens the year's CLOSED periods (LOCKED ones stay locked). */
    @PatchMapping("/{id}/reopen")
    public ResponseEntity<FiscalYearResponseDTO> reopen(@PathVariable Long id) {
        return ResponseEntity.ok(toDto(fiscalYearService.reopen(id)));
    }

    /** Refused once any journal entry is dated inside the year. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        fiscalYearService.delete(id);
        return ResponseEntity.noContent().build();
    }

    private FiscalYearResponseDTO toDto(FiscalYear year) {
        FiscalYearResponseDTO dto = FiscalYearResponseDTO.fromEntity(year);
        List<FiscalPeriod> periods = fiscalPeriodService.findByFiscalYear(year.getId());
        dto.setOpenPeriods((int) periods.stream().filter(p -> "OPEN".equalsIgnoreCase(p.getStatus())).count());
        dto.setClosedPeriods((int) periods.stream().filter(p -> "CLOSED".equalsIgnoreCase(p.getStatus())).count());
        dto.setLockedPeriods((int) periods.stream().filter(p -> "LOCKED".equalsIgnoreCase(p.getStatus())).count());
        return dto;
    }
}
