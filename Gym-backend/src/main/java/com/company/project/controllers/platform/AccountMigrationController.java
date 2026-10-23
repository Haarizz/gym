package com.company.project.controllers.platform;

import com.company.project.security.UserDetailsImpl;
import com.company.project.services.accounts.GymLoginMigrationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Platform-owner tool for moving gym-only logins to GymBios accounts
 * (docs/global-accounts-for-gym-created-members-plan.md §4). Always run the dry run
 * first and review its report — per gym, what would happen to each member — then run
 * one gym (QA) before all of them.
 */
@RestController
@RequestMapping("/api/platform/account-migration")
@PreAuthorize("hasRole('GYMBIOS_ADMIN')")
public class AccountMigrationController {

    private static final Logger log = LoggerFactory.getLogger(AccountMigrationController.class);

    /** The word the real run must be sent with, so it can't be triggered by accident. */
    private static final String CONFIRMATION = "MIGRATE";

    public record RunRequest(String tenantSlug, String confirm) {}

    private final GymLoginMigrationService migrationService;

    public AccountMigrationController(GymLoginMigrationService migrationService) {
        this.migrationService = migrationService;
    }

    /** POST /api/platform/account-migration/dry-run?tenantSlug=… — changes nothing. */
    @PostMapping("/dry-run")
    public ResponseEntity<GymLoginMigrationService.Report> dryRun(@RequestParam(required = false) String tenantSlug) {
        return ResponseEntity.ok(migrationService.run(true, blankToNull(tenantSlug)));
    }

    /**
     * POST /api/platform/account-migration/run
     * Body: { "tenantSlug": "gym-a" (optional — all gyms when omitted), "confirm": "MIGRATE" }
     */
    @PostMapping("/run")
    public ResponseEntity<?> run(@RequestBody RunRequest request, @AuthenticationPrincipal UserDetailsImpl admin) {
        if (request == null || !CONFIRMATION.equals(request.confirm())) {
            return ResponseEntity.badRequest().body(java.util.Map.of(
                    "message", "Send \"confirm\": \"" + CONFIRMATION + "\" to run the migration. Review a dry run first."));
        }
        String tenant = blankToNull(request.tenantSlug());
        log.warn("Gym-login migration started by {} for {}", admin != null ? admin.getUsername() : "?",
                tenant != null ? tenant : "ALL gyms");
        return ResponseEntity.ok(migrationService.run(false, tenant));
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
