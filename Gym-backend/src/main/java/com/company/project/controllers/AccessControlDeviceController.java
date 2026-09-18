package com.company.project.controllers;

import com.company.project.dto.AccessControlDeviceRequestDTO;
import com.company.project.dto.AccessControlDeviceResponseDTO;
import com.company.project.services.AccessControlDeviceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * GymOS's "Access Control Devices" widget: real, branch-scoped device
 * records (see AccessControlDeviceService for why status isn't live-probed).
 */
@RestController
@RequestMapping("/api/gymos/access-devices")
public class AccessControlDeviceController {

    private final AccessControlDeviceService deviceService;

    public AccessControlDeviceController(AccessControlDeviceService deviceService) {
        this.deviceService = deviceService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('GYMOS_VIEW')")
    public ResponseEntity<List<AccessControlDeviceResponseDTO>> getAll() {
        return ResponseEntity.ok(deviceService.getAll());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<AccessControlDeviceResponseDTO> create(@RequestBody AccessControlDeviceRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deviceService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<AccessControlDeviceResponseDTO> update(@PathVariable Long id, @RequestBody AccessControlDeviceRequestDTO request) {
        return ResponseEntity.ok(deviceService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        deviceService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<AccessControlDeviceResponseDTO> setStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            throw new IllegalArgumentException("status is required");
        }
        return ResponseEntity.ok(deviceService.setStatus(id, status.toUpperCase()));
    }
}
