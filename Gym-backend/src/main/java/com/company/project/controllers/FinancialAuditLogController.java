package com.company.project.controllers;

import com.company.project.dto.FinancialAuditLogResponseDTO;
import com.company.project.services.FinancialAuditLogService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/financial-audit-logs")
public class FinancialAuditLogController {

    private final FinancialAuditLogService financialAuditLogService;

    public FinancialAuditLogController(FinancialAuditLogService financialAuditLogService) {
        this.financialAuditLogService = financialAuditLogService;
    }

    @GetMapping
    public ResponseEntity<List<FinancialAuditLogResponseDTO>> search(
            @RequestParam(name = "entity_type", required = false) String entityType,
            @RequestParam(name = "entity_id", required = false) Long entityId,
            @RequestParam(required = false) String module,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(financialAuditLogService.search(entityType, entityId, module, from, to)
                .stream().map(FinancialAuditLogResponseDTO::fromEntity).collect(Collectors.toList()));
    }
}
