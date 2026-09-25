package com.company.project.controllers.platform;

import com.company.project.community.global.CommunityException;
import com.company.project.community.global.CommunityModerationService;
import com.company.project.community.global.identity.CommunityActorResolver;
import com.company.project.community.global.rollout.CommunityPermissionSyncService;
import com.company.project.community.global.rollout.CommunityRolloutService;
import com.company.project.controlplane.community.baseline.CommunityBaselineReport;
import com.company.project.controlplane.community.baseline.CommunityBaselineService;
import com.company.project.controlplane.community.store.CommunityPostStore;
import com.company.project.controlplane.community.store.CommunityRolloutStore;
import com.company.project.controlplane.community.store.CommunityRolloutStore.State;
import com.company.project.dto.mobile.community.GlobalCommunityDtos;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * Platform-owner operations for the Global Community migration and rollout.
 * Every change needs a written reason, is audited in community_rollout_audit,
 * and uses optimistic locking (the caller sends the state version it read).
 *
 * The database backs every rule here: global features can't be on while the
 * legacy store is authoritative, authority can't become GLOBAL without an
 * accepted production baseline, and GLOBAL can never go back to LEGACY.
 */
@RestController
@RequestMapping("/api/platform/community-rollout")
@PreAuthorize("hasRole('GYMBIOS_ADMIN')")
public class CommunityRolloutController {

    public record FlagChange(Integer version, Map<String, Object> changes, String reason) {}

    public record BaselineAcceptance(Integer version, String baselineDigest, String reason) {}

    public record Transition(Integer version, String reason) {}

    public record AllowlistChange(String tenantSlug, String reason) {}

    public record Reasoned(String reason) {}

    public record PermissionSync(Boolean dryRun, String reason) {}

    private final CommunityBaselineService baselineService;
    private final CommunityRolloutService rollout;
    private final CommunityRolloutStore rolloutStore;
    private final CommunityPostStore postStore;
    private final CommunityPermissionSyncService permissionSync;
    private final CommunityModerationService moderation;
    private final CommunityActorResolver actorResolver;

    public CommunityRolloutController(CommunityBaselineService baselineService, CommunityRolloutService rollout,
                                      CommunityRolloutStore rolloutStore, CommunityPostStore postStore,
                                      CommunityPermissionSyncService permissionSync, CommunityModerationService moderation,
                                      CommunityActorResolver actorResolver) {
        this.baselineService = baselineService;
        this.rollout = rollout;
        this.rolloutStore = rolloutStore;
        this.postStore = postStore;
        this.permissionSync = permissionSync;
        this.moderation = moderation;
        this.actorResolver = actorResolver;
    }

    /** Read-only: never writes to any Community store. */
    @GetMapping("/baseline")
    public ResponseEntity<CommunityBaselineReport> baseline() {
        return ResponseEntity.ok(baselineService.run());
    }

    @GetMapping("/state")
    public Map<String, Object> state() {
        return Map.of("state", rollout.state(), "kill_switch_engaged", rollout.killSwitchEngaged());
    }

    @PatchMapping("/flags")
    public State updateFlags(@RequestBody FlagChange body) {
        return rollout.updateFlags(version(body.version()), body.changes() == null ? Map.of() : body.changes(),
                operator(), body.reason());
    }

    /** D5: record that the production baseline was run twice, compared (PASS) and reviewed. */
    @PostMapping("/production-baseline/accept")
    public State acceptProductionBaseline(@RequestBody BaselineAcceptance body) {
        return rollout.acceptProductionBaseline(version(body.version()), body.baselineDigest(), operator(), body.reason());
    }

    /** LEGACY → GLOBAL. One-way; refused unless writes are frozen and a FINAL reconciliation passed afterwards. */
    @PostMapping("/cutover")
    public State cutover(@RequestBody Transition body) {
        return rollout.cutover(version(body.version()), operator(), body.reason());
    }

    @PostMapping("/allowlist")
    public State addToAllowlist(@RequestBody AllowlistChange body) {
        return rollout.addToAllowlist(body.tenantSlug(), operator(), body.reason());
    }

    @DeleteMapping("/allowlist/{tenantSlug}")
    public State removeFromAllowlist(@PathVariable String tenantSlug, @RequestParam String reason) {
        return rollout.removeFromAllowlist(tenantSlug, operator(), reason);
    }

    @GetMapping("/audit")
    public List<CommunityRolloutStore.AuditRow> audit(@RequestParam(defaultValue = "100") int limit) {
        return rolloutStore.recentAudit(Math.min(Math.max(limit, 1), 500));
    }

    /** Recomputes like/comment counters from source rows; returns how many posts were corrected. */
    @PostMapping("/counters/repair")
    public Map<String, Integer> repairCounters(@RequestBody Reasoned body) {
        requireReason(body.reason());
        int fixed = postStore.repairCounters();
        rolloutStore.audit(operator(), "counter_repair", null, fixed + " posts corrected", body.reason());
        return Map.of("posts_corrected", fixed);
    }

    /** Dry run unless dry_run is false. A real run writes to gym databases. */
    @PostMapping("/permissions/community-moderate/sync")
    public List<CommunityPermissionSyncService.GymResult> syncModeratePermission(@RequestBody PermissionSync body) {
        requireReason(body.reason());
        return permissionSync.sync(!Boolean.FALSE.equals(body.dryRun()), operator(), body.reason());
    }

    @GetMapping("/reports/escalated")
    public List<GlobalCommunityDtos.Report> escalatedReports() {
        return moderation.escalatedReports();
    }

    private String operator() {
        return actorResolver.current().describe();
    }

    private static int version(Integer version) {
        if (version == null) {
            throw CommunityException.invalid("VERSION_REQUIRED", "Send the state version you read");
        }
        return version;
    }

    private static void requireReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw CommunityException.invalid("REASON_REQUIRED", "Every rollout change needs a reason");
        }
    }
}
