package com.company.project.controllers;

import com.company.project.dto.StaffTargetRequestDTO;
import com.company.project.dto.StaffTargetResponseDTO;
import com.company.project.services.StaffTargetService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/staff-targets")
public class StaffTargetController {

    private final StaffTargetService targetService;

    public StaffTargetController(StaffTargetService targetService) {
        this.targetService = targetService;
    }

    @GetMapping
    public ResponseEntity<List<StaffTargetResponseDTO>> getTargets(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) String scope) {
        return ResponseEntity.ok(targetService.getTargets(year, month, scope));
    }

    @GetMapping("/{id}")
    public ResponseEntity<StaffTargetResponseDTO> getTargetById(@PathVariable Long id) {
        return ResponseEntity.ok(targetService.getTargetById(id));
    }

    @PostMapping
    public ResponseEntity<StaffTargetResponseDTO> createTarget(@RequestBody StaffTargetRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(targetService.createTarget(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<StaffTargetResponseDTO> updateTarget(
            @PathVariable Long id,
            @RequestBody StaffTargetRequestDTO request) {
        return ResponseEntity.ok(targetService.updateTarget(id, request));
    }

    @PatchMapping("/{id}/achievement")
    public ResponseEntity<StaffTargetResponseDTO> updateAchievement(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body) {
        BigDecimal revenueAchieved = body.get("revenue_achieved") != null
                ? new BigDecimal(body.get("revenue_achieved").toString()) : null;
        Integer sessionsAchieved = body.get("sessions_achieved") != null
                ? Integer.valueOf(body.get("sessions_achieved").toString()) : null;
        Integer newClientsAchieved = body.get("new_clients_achieved") != null
                ? Integer.valueOf(body.get("new_clients_achieved").toString()) : null;
        BigDecimal commissionEarned = body.get("commission_earned") != null
                ? new BigDecimal(body.get("commission_earned").toString()) : null;
        String trend    = body.get("trend")    != null ? body.get("trend").toString()    : null;
        Integer forecast = body.get("forecast") != null ? Integer.valueOf(body.get("forecast").toString()) : null;
        return ResponseEntity.ok(targetService.updateAchievement(id, revenueAchieved, sessionsAchieved, newClientsAchieved, commissionEarned, trend, forecast));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTarget(@PathVariable Long id) {
        targetService.deleteTarget(id);
        return ResponseEntity.noContent().build();
    }
}
