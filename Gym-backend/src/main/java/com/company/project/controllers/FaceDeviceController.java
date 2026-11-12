package com.company.project.controllers;

import com.company.project.services.facedevice.FaceDeviceDtos.DeviceRequest;
import com.company.project.services.facedevice.FaceDeviceDtos.DeviceResponse;
import com.company.project.services.facedevice.FaceDeviceDtos.MemberPage;
import com.company.project.services.facedevice.FaceDeviceDtos.MemberStatus;
import com.company.project.services.facedevice.FaceDeviceDtos.ReportResult;
import com.company.project.services.facedevice.FaceDeviceDtos.TestResult;
import com.company.project.services.facedevice.FaceDeviceService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GymOS › Face Device Configuration. /api/gymos/** is skipped by ModulePermissionRules,
 * so access is gated here: GYMOS_VIEW to look, GYMOS_EDIT to change or push to a device.
 */
@RestController
@RequestMapping("/api/gymos/face-devices")
public class FaceDeviceController {

    private final FaceDeviceService service;

    public FaceDeviceController(FaceDeviceService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('GYMOS_VIEW')")
    public List<DeviceResponse> list() {
        return service.list();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('GYMOS_VIEW')")
    public DeviceResponse get(@PathVariable Long id) {
        return service.get(id);
    }

    @PostMapping
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<DeviceResponse> create(@RequestBody DeviceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public DeviceResponse update(@PathVariable Long id, @RequestBody DeviceRequest request) {
        return service.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/test")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public TestResult test(@PathVariable Long id) {
        return service.test(id);
    }

    /** Starts a background sync; {@code full=true} re-pushes every member, not just changed ones. */
    @PostMapping("/{id}/sync")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public DeviceResponse sync(@PathVariable Long id, @RequestParam(defaultValue = "false") boolean full) {
        return service.syncNow(id, full);
    }

    /** Emails today's sync report now, to the device's report addresses. */
    @PostMapping("/{id}/report")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public ReportResult sendReport(@PathVariable Long id) {
        return service.sendReport(id);
    }

    @PostMapping("/{id}/retry-failed")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public DeviceResponse retryFailed(@PathVariable Long id) {
        return service.retryFailed(id);
    }

    @GetMapping("/{id}/members")
    @PreAuthorize("hasAuthority('GYMOS_VIEW')")
    public MemberPage members(@PathVariable Long id,
                              @RequestParam(required = false) String state,
                              @RequestParam(required = false) String q,
                              @RequestParam(defaultValue = "200") int limit) {
        return service.members(id, state, q, limit);
    }

    @PostMapping("/{id}/members/{memberId}/sync")
    @PreAuthorize("hasAuthority('GYMOS_EDIT')")
    public MemberStatus syncMember(@PathVariable Long id, @PathVariable Long memberId) {
        return service.syncMember(id, memberId);
    }
}
