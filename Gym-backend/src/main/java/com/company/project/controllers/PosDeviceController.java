package com.company.project.controllers;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.*;
import com.company.project.services.pos.PosDeviceService;
import com.company.project.services.pos.PosPrintJobService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * POS device manager (BillBull parity): device register, health, events, hardware profiles and the
 * print queue. Tills report health and their own prints; managing devices and profiles, kicking a
 * drawer remotely and retrying / cancelling print jobs need POINT_OF_SALE_EDIT.
 */
@RestController
@RequestMapping("/api/pos")
public class PosDeviceController {

    private final PosDeviceService deviceService;
    private final PosPrintJobService printJobService;

    public PosDeviceController(PosDeviceService deviceService, PosPrintJobService printJobService) {
        this.deviceService = deviceService;
        this.printJobService = printJobService;
    }

    // ── Devices ─────────────────────────────────────────────────────────────

    @GetMapping("/devices/dashboard")
    public ResponseEntity<DeviceDashboard> dashboard() {
        return ResponseEntity.ok(deviceService.dashboard());
    }

    /** GET /api/pos/devices?type=SCANNER&includeRetired=true */
    @GetMapping("/devices")
    public ResponseEntity<List<DeviceDTO>> devices(@RequestParam(required = false) String type,
                                                   @RequestParam(defaultValue = "false") boolean includeRetired) {
        return ResponseEntity.ok(deviceService.list(type, includeRetired));
    }

    @GetMapping("/devices/{id}")
    public ResponseEntity<DeviceDTO> device(@PathVariable Long id) {
        return ResponseEntity.ok(deviceService.get(id));
    }

    @GetMapping("/devices/{id}/events")
    public ResponseEntity<List<DeviceEventDTO>> events(@PathVariable Long id) {
        return ResponseEntity.ok(deviceService.events(id));
    }

    @PostMapping("/devices")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<DeviceDTO> create(@RequestBody PosRequests.Device request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deviceService.create(request));
    }

    @PutMapping("/devices/{id}")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<DeviceDTO> update(@PathVariable Long id, @RequestBody PosRequests.Device request) {
        return ResponseEntity.ok(deviceService.update(id, request));
    }

    @PutMapping("/devices/{id}/status")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<DeviceDTO> setStatus(@PathVariable Long id, @RequestBody PosRequests.DeviceStatus request) {
        return ResponseEntity.ok(deviceService.setStatus(id, request));
    }

    @PostMapping("/devices/{id}/health")
    public ResponseEntity<DeviceDTO> health(@PathVariable Long id, @RequestBody PosRequests.DeviceHealth request) {
        return ResponseEntity.ok(deviceService.reportHealth(id, request));
    }

    @PostMapping("/devices/{id}/kick")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<DeviceDTO> kick(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        return ResponseEntity.ok(deviceService.kickDrawer(id, body == null ? null : body.get("terminalName")));
    }

    @PostMapping("/devices/{id}/scan-test")
    public ResponseEntity<DeviceDTO> scanTest(@PathVariable Long id, @RequestBody PosRequests.ScanTest request) {
        return ResponseEntity.ok(deviceService.scanTest(id, request));
    }

    // ── Hardware profiles ───────────────────────────────────────────────────

    @GetMapping("/hardware-profiles")
    public ResponseEntity<List<HardwareProfileDTO>> profiles() {
        return ResponseEntity.ok(deviceService.profiles());
    }

    @PostMapping("/hardware-profiles")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<HardwareProfileDTO> createProfile(@RequestBody PosRequests.HardwareProfile request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(deviceService.createProfile(request));
    }

    @PutMapping("/hardware-profiles/{id}")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<HardwareProfileDTO> updateProfile(@PathVariable Long id, @RequestBody PosRequests.HardwareProfile request) {
        return ResponseEntity.ok(deviceService.updateProfile(id, request));
    }

    @PutMapping("/terminals/{id}/hardware-profile")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<TerminalDTO> assignProfile(@PathVariable Long id, @RequestBody PosRequests.TerminalProfile request) {
        return ResponseEntity.ok(deviceService.assignProfile(id, request.hardwareProfileId()));
    }

    // ── Print jobs ──────────────────────────────────────────────────────────

    /** GET /api/pos/print-jobs?status=FAILED&printerId=&jobType=&page=1&size=25 */
    @GetMapping("/print-jobs")
    public ResponseEntity<PrintJobsPage> jobs(@RequestParam(required = false) String status,
                                              @RequestParam(required = false) Long printerId,
                                              @RequestParam(required = false) String jobType,
                                              @RequestParam(defaultValue = "1") int page,
                                              @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(printJobService.list(status, printerId, jobType, page, size));
    }

    @PostMapping("/print-jobs/report")
    public ResponseEntity<PrintJobDTO> report(@RequestBody PosRequests.PrintJobReport request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(printJobService.report(request));
    }

    /** Retrying is allowed to the till that hit the failure, not just supervisors. */
    @PostMapping("/print-jobs/{id}/retry")
    public ResponseEntity<PrintJobDTO> retry(@PathVariable Long id) {
        return ResponseEntity.ok(printJobService.retry(id));
    }

    @PostMapping("/print-jobs/{id}/cancel")
    @PreAuthorize("hasAuthority('POINT_OF_SALE_EDIT')")
    public ResponseEntity<PrintJobDTO> cancel(@PathVariable Long id) {
        return ResponseEntity.ok(printJobService.cancel(id));
    }
}
