package com.company.project.controllers.mobile.dashboard;

import com.company.project.dto.mobile.dashboard.admin.AdminDashboardReportResponseDTO;
import com.company.project.dto.mobile.dashboard.admin.AdminDashboardResponseDTO;
import com.company.project.services.mobile.dashboard.admin.AdminDashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/**
 * Live backend for the GymBios-Mobile Admin Dashboard screen. Branch scope is
 * carried by the existing {@code X-Active-Branch-Id} header (same mechanism
 * every other mobile dashboard endpoint already uses), not a query param —
 * {@code null}/absent means "All Branches", already access-checked for the
 * authenticated Admin by the existing {@code BranchContextFilter}.
 *
 * Distinct from the pre-existing {@code /api/mobile/admin/analytics} endpoint,
 * which backs a different screen (Admin Analytics) — left untouched.
 */
@RestController
@RequestMapping("/api/mobile/admin/dashboard")
@PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
public class MobileAdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    public MobileAdminDashboardController(AdminDashboardService adminDashboardService) {
        this.adminDashboardService = adminDashboardService;
    }

    /**
     * GET /api/mobile/admin/dashboard?from=2026-03-01&to=2026-03-26
     * Both params optional; defaulting to "today" (a single day) when omitted.
     */
    @GetMapping
    public ResponseEntity<AdminDashboardResponseDTO> getDashboard(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(adminDashboardService.getDashboard(from, to));
    }

    /**
     * GET /api/mobile/admin/dashboard/report?type=total-collections&from=...&to=...&page=0&size=20
     * Inherits the same branch/date semantics as the summary endpoint above.
     */
    @GetMapping("/report")
    public ResponseEntity<AdminDashboardReportResponseDTO> getReport(
            @RequestParam String type,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(required = false, defaultValue = "0") int page,
            @RequestParam(required = false, defaultValue = "20") int size) {
        return ResponseEntity.ok(adminDashboardService.getReport(type, from, to, page, size));
    }
}
