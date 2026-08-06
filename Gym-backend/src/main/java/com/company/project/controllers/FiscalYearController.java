package com.company.project.controllers;

import com.company.project.dto.FiscalYearRequestDTO;
import com.company.project.dto.FiscalYearResponseDTO;
import com.company.project.entities.FiscalYear;
import com.company.project.services.FiscalYearService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/fiscal-years")
public class FiscalYearController {

    private final FiscalYearService fiscalYearService;

    public FiscalYearController(FiscalYearService fiscalYearService) {
        this.fiscalYearService = fiscalYearService;
    }

    @GetMapping
    public ResponseEntity<List<FiscalYearResponseDTO>> getAll() {
        return ResponseEntity.ok(fiscalYearService.findAll().stream()
                .map(FiscalYearResponseDTO::fromEntity)
                .collect(Collectors.toList()));
    }

    /** Creates the fiscal year AND its 12 monthly periods in one call. */
    @PostMapping
    public ResponseEntity<FiscalYearResponseDTO> create(@RequestBody FiscalYearRequestDTO req) {
        FiscalYear year = fiscalYearService.create(req.getName(), req.getStartDate(), req.getEndDate());
        return ResponseEntity.ok(FiscalYearResponseDTO.fromEntity(year));
    }

    @PatchMapping("/{id}/close")
    public ResponseEntity<FiscalYearResponseDTO> close(@PathVariable Long id) {
        return ResponseEntity.ok(FiscalYearResponseDTO.fromEntity(fiscalYearService.setStatus(id, "CLOSED")));
    }

    @PatchMapping("/{id}/reopen")
    public ResponseEntity<FiscalYearResponseDTO> reopen(@PathVariable Long id) {
        return ResponseEntity.ok(FiscalYearResponseDTO.fromEntity(fiscalYearService.setStatus(id, "OPEN")));
    }
}
