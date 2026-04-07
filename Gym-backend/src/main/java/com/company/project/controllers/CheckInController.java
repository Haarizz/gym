package com.company.project.controllers;

import com.company.project.dto.AttendanceRecordDTO;
import com.company.project.dto.CheckInRequest;
import com.company.project.dto.CheckInResponse;
import com.company.project.dto.CheckInStatusResponse;
import com.company.project.services.CheckInService;
import com.company.project.services.DeviceKeyService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/checkin")
public class CheckInController {

    private final CheckInService checkInService;
    private final DeviceKeyService deviceKeyService;

    public CheckInController(CheckInService checkInService,
                             DeviceKeyService deviceKeyService) {
        this.checkInService   = checkInService;
        this.deviceKeyService = deviceKeyService;
    }

    /**
     * Method-agnostic check-in endpoint.
     * Accepts JWT (web/app users) or X-Device-Key (hardware devices).
     *
     * POST /api/checkin
     */
    @PostMapping
    public ResponseEntity<?> checkIn(@RequestBody CheckInRequest request) {
        try {
            CheckInResponse response = checkInService.checkIn(request);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(403).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Returns member status so devices with screens can show feedback.
     *
     * GET /api/checkin/status?qr=GYMBIOS:...
     * GET /api/checkin/status?face_id=face_abc123
     * GET /api/checkin/status?member_id=42
     */
    @GetMapping("/status")
    public ResponseEntity<?> getStatus(
            @RequestParam(required = false) String qr,
            @RequestParam(name = "face_id", required = false) String faceId,
            @RequestParam(name = "member_id", required = false) Long memberId
    ) {
        try {
            CheckInStatusResponse response = checkInService.getStatus(qr, faceId, memberId);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.status(404).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Returns all check-ins for today, newest first.
     * Used by the frontend check-in dashboard to show recent activity.
     *
     * GET /api/checkin/today
     */
    @GetMapping("/today")
    public ResponseEntity<List<AttendanceRecordDTO>> getTodayAttendance() {
        return ResponseEntity.ok(checkInService.getTodayAttendance());
    }

    // ── Device Key Management (admin) ─────────────────────────────────────────

    /**
     * Creates a new device API key. The raw key is returned once — store it securely.
     *
     * POST /api/checkin/device-keys
     * Body: { "name": "GATE-01" }
     */
    @PostMapping("/device-keys")
    public ResponseEntity<?> createDeviceKey(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        if (name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Device name is required"));
        }
        try {
            String rawKey = deviceKeyService.createDeviceKey(name.trim().toUpperCase());
            return ResponseEntity.ok(Map.of(
                    "name", name.trim().toUpperCase(),
                    "key", rawKey,
                    "message", "Store this key securely — it will not be shown again."
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Revokes a device key by device name.
     *
     * DELETE /api/checkin/device-keys/{name}
     */
    @DeleteMapping("/device-keys/{name}")
    public ResponseEntity<?> revokeDeviceKey(@PathVariable String name) {
        deviceKeyService.revokeDeviceKey(name.toUpperCase());
        return ResponseEntity.ok(Map.of("message", "Device key revoked for: " + name.toUpperCase()));
    }
}
