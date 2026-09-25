package com.company.project.community.global.rollout;

import com.company.project.community.global.CommunityException;
import com.company.project.controlplane.community.store.CommunityRolloutStore;
import com.company.project.controlplane.community.store.CommunityRolloutStore.State;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * Runtime gatekeeper for the global Community. Every Community endpoint asks
 * this service first; nothing is reachable until the rollout state allows it.
 *
 * Two layers of switch:
 *  - community.global.kill-switch (property): turns every global Community
 *    endpoint off regardless of the database, e.g. if the control plane itself
 *    is unhealthy. It never falls back to the legacy tables.
 *  - community_rollout_state (database): the audited runtime flags.
 */
@Service
public class CommunityRolloutService {

    /**
     * MOBILE/WEB: the new clients, gated by their surface flags and global_reads.
     * LEGACY: the compatibility adapter behind the old /api/community endpoints —
     * available as soon as authority is GLOBAL, independent of the pilot surface
     * flags, because old clients must keep working through the cutover.
     */
    public enum Surface { MOBILE, WEB, LEGACY }

    public enum Operation { POST, COMMENT, LIKE, REPORT }

    private final CommunityRolloutStore store;

    @Value("${community.global.kill-switch:false}")
    private boolean killSwitch;

    @Value("${community.rollout.cache-ttl-ms:5000}")
    private long cacheTtlMs;

    private volatile State cached;
    private volatile long cachedAt;

    public CommunityRolloutService(CommunityRolloutStore store) {
        this.store = store;
    }

    public State state() {
        State s = cached;
        if (s == null || System.currentTimeMillis() - cachedAt > cacheTtlMs) {
            s = store.load();
            cached = s;
            cachedAt = System.currentTimeMillis();
        }
        return s;
    }

    public boolean killSwitchEngaged() {
        return killSwitch;
    }

    // ── Checks used by every endpoint ───────────────────────────────────────

    /**
     * @param gym the gym used only for pilot targeting (allowlist), never for
     *            authorization: the caller's selected gym for app members, the
     *            JWT gym for staff. May be null.
     */
    public void requireReads(Surface surface, String gym) {
        if (killSwitch) {
            throw CommunityException.unavailable("COMMUNITY_DISABLED", "The Community is temporarily unavailable");
        }
        State s = state();
        if (surface == Surface.LEGACY) {
            if (!s.isGlobalAuthority()) {
                throw CommunityException.unavailable("COMMUNITY_NOT_ENABLED", "The compatibility adapter is only active after cutover");
            }
            return;
        }
        if (!s.isGlobalAuthority() || !s.globalReads()) {
            throw CommunityException.unavailable("COMMUNITY_NOT_ENABLED", "The GymBios Community isn't available yet");
        }
        String mode = surface == Surface.MOBILE ? s.mobileSurface() : s.webSurface();
        boolean allowed = "ALL".equals(mode) || ("ALLOWLIST".equals(mode) && gym != null && s.allowlist().contains(gym));
        if (!allowed) {
            throw CommunityException.unavailable("COMMUNITY_NOT_ENABLED", "The GymBios Community isn't available yet");
        }
    }

    public void requireWrite(Surface surface, String gym, Operation operation) {
        requireReads(surface, gym);
        State s = state();
        if (!"OPEN".equals(s.writeMode())) {
            throw CommunityException.unavailable("COMMUNITY_READ_ONLY", "The Community is read-only right now");
        }
        boolean enabled = switch (operation) {
            case POST -> s.opPost();
            case COMMENT -> s.opComment();
            case LIKE -> s.opLike();
            case REPORT -> s.opReport() && s.reports();
        };
        if (!enabled) {
            throw CommunityException.unavailable("OPERATION_DISABLED", "This action is temporarily unavailable");
        }
    }

    /**
     * Moderation stays available while writes are READ_ONLY, so moderators can
     * still remove harmful content during an incident.
     */
    public void requireModeration(Surface surface, String gym) {
        requireReads(surface, gym);
        if (!state().moderation()) {
            throw CommunityException.unavailable("MODERATION_DISABLED", "Moderation is temporarily unavailable");
        }
    }

    public boolean moderationEnabled() {
        return !killSwitch && state().isGlobalAuthority() && state().moderation();
    }

    // ── Operator changes (GYMBIOS_ADMIN endpoints) ──────────────────────────

    public State updateFlags(int expectedVersion, Map<String, Object> changes, String changedBy, String reason) {
        requireReason(reason);
        for (String column : changes.keySet()) {
            if (!CommunityRolloutStore.FLAG_COLUMNS.contains(column)) {
                throw CommunityException.invalid("UNKNOWN_FLAG", "Not a changeable rollout flag: " + column);
            }
        }
        return apply(expectedVersion, changes, changedBy, reason);
    }

    /**
     * D5: records that the production baseline was run twice, compared (PASS)
     * and reviewed. Required by the database before authority can become GLOBAL.
     */
    public State acceptProductionBaseline(int expectedVersion, String baselineDigest, String changedBy, String reason) {
        requireReason(reason);
        if (baselineDigest == null || !baselineDigest.matches("[0-9a-f]{64}")) {
            throw CommunityException.invalid("BASELINE_DIGEST_REQUIRED", "Provide the reviewed production baseline digest");
        }
        return apply(expectedVersion, Map.of("production_baseline_accepted", true), changedBy,
                reason + " [baseline digest " + baselineDigest + "]");
    }

    /**
     * LEGACY → GLOBAL. One-way. Only with writes frozen, the production baseline
     * accepted, and a PASSing FINAL reconciliation that finished after the freeze
     * began. Writes stay frozen afterwards; the operator reopens them explicitly.
     */
    public State cutover(int expectedVersion, String changedBy, String reason) {
        requireReason(reason);
        State s = store.load();
        if (s.isGlobalAuthority()) {
            throw CommunityException.conflict("ALREADY_GLOBAL", "Authority is already GLOBAL");
        }
        if (!"READ_ONLY".equals(s.writeMode())) {
            throw CommunityException.conflict("WRITES_NOT_FROZEN", "Freeze writes (write_mode = READ_ONLY) before cutover");
        }
        if (!s.productionBaselineAccepted()) {
            throw CommunityException.conflict("PRODUCTION_BASELINE_NOT_ACCEPTED", "The production baseline hasn't been accepted");
        }
        LocalDateTime freeze = store.writeFreezeStartedAt();
        LocalDateTime pass = store.latestFinalReconciliationPass();
        if (freeze == null || pass == null || !pass.isAfter(freeze)) {
            throw CommunityException.conflict("RECONCILIATION_NOT_PASSED",
                    "A FINAL reconciliation must PASS after writes were frozen");
        }
        Map<String, Object> changes = new HashMap<>();
        changes.put("authority", "GLOBAL");
        changes.put("shadow_compare", false);
        changes.put("legacy_delta_sync", false);
        return apply(expectedVersion, changes, changedBy, reason);
    }

    public State addToAllowlist(String tenantSlug, String changedBy, String reason) {
        requireReason(reason);
        if (tenantSlug == null || tenantSlug.isBlank() || tenantSlug.chars().anyMatch(Character::isWhitespace)) {
            throw CommunityException.invalid("INVALID_GYM", "Not a valid gym identifier");
        }
        store.addToAllowlist(tenantSlug, changedBy, reason);
        return refresh();
    }

    public State removeFromAllowlist(String tenantSlug, String changedBy, String reason) {
        requireReason(reason);
        store.removeFromAllowlist(tenantSlug, changedBy, reason);
        return refresh();
    }

    private State apply(int expectedVersion, Map<String, Object> changes, String changedBy, String reason) {
        boolean applied;
        try {
            applied = store.update(expectedVersion, changes, changedBy, reason);
        } catch (org.springframework.dao.DataIntegrityViolationException | org.springframework.jdbc.UncategorizedSQLException e) {
            // The database enforces valid combinations (e.g. no global flags under LEGACY, one-way authority).
            throw new CommunityException(HttpStatus.CONFLICT, "ROLLOUT_STATE_REJECTED",
                    "The database rejected this rollout change: " + e.getMostSpecificCause().getMessage());
        }
        if (!applied) {
            throw CommunityException.conflict("ROLLOUT_STATE_CHANGED", "Rollout state changed since it was read; reload and retry");
        }
        return refresh();
    }

    private State refresh() {
        cached = store.load();
        cachedAt = System.currentTimeMillis();
        return cached;
    }

    private static void requireReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw CommunityException.invalid("REASON_REQUIRED", "Every rollout change needs a reason");
        }
    }
}
