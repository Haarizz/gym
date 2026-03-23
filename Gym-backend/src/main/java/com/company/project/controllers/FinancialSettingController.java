package com.company.project.controllers;

import com.company.project.dto.FinancialSettingRequestDTO;
import com.company.project.dto.FinancialSettingResponseDTO;
import com.company.project.services.FinancialSettingService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/financial-settings")
public class FinancialSettingController {

    private final FinancialSettingService financialSettingService;

    public FinancialSettingController(FinancialSettingService financialSettingService) {
        this.financialSettingService = financialSettingService;
    }

    @GetMapping
    public ResponseEntity<List<FinancialSettingResponseDTO>> getSettings(
            @RequestParam(required = false) String category) {
        return ResponseEntity.ok(financialSettingService.getSettings(category));
    }

    @PostMapping
    public ResponseEntity<FinancialSettingResponseDTO> upsertSetting(
            @RequestBody FinancialSettingRequestDTO request) {
        return ResponseEntity.ok(financialSettingService.upsertSetting(request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSetting(@PathVariable Long id) {
        financialSettingService.deleteSetting(id);
        return ResponseEntity.noContent().build();
    }
}
