package com.company.project.community;

import com.company.project.community.global.CommunityException;
import com.company.project.community.global.rollout.CommunityPermissionSyncService;
import com.company.project.community.support.CommunityHarness;
import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.community.store.CommunityRolloutStore.State;
import com.company.project.controlplane.repositories.TenantRepository;
import com.company.project.dto.mobile.community.GlobalCommunityDtos.CreatePost;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.function.Executable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;

import static com.company.project.community.support.CommunityHarness.MOBILE;
import static com.company.project.community.support.CommunityHarness.mobile;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Rollout controls: everything is off by default, the kill switch wins, each
 * gate is independent, cutover preconditions are enforced, and GLOBAL never
 * returns to LEGACY. A fresh set of databases per test keeps states isolated.
 */
@EnabledIfEnvironmentVariable(named = "COMMUNITY_IT", matches = "true")
class CommunityRolloutIT {

    private CommunityHarness h;

    @BeforeEach
    void start() throws Exception {
        h = new CommunityHarness();
    }

    @AfterEach
    void stop() throws Exception {
        h.close();
    }

    private static String code(Executable action) {
        return assertThrows(CommunityException.class, action).getCode();
    }

    private State state() {
        return h.rollout.state();
    }

    @Test
    void everythingIsOffByDefault() {
        h.asJohn();
        assertEquals("COMMUNITY_NOT_ENABLED", code(() -> h.community.feed(MOBILE, null, null, null, null)));
        assertEquals("COMMUNITY_NOT_ENABLED", code(() -> h.community.createPost(mobile("gym-a"),
                new CreatePost("t", "c", "tip", "gym-a", null))));
        assertFalse(h.community.clientConfig(MOBILE).available(), "config endpoint answers even when off");
        assertEquals("LEGACY", state().authority());
    }

    @Test
    void globalFeaturesCannotBeSwitchedOnWhileLegacyIsAuthoritative() {
        assertEquals("ROLLOUT_STATE_REJECTED",
                code(() -> h.rollout.updateFlags(state().version(), Map.of("global_reads", true), "test", "try")));
        assertEquals("UNKNOWN_FLAG",
                code(() -> h.rollout.updateFlags(state().version(), Map.of("authority", "GLOBAL"), "test", "sneak")));
        assertEquals("REASON_REQUIRED",
                code(() -> h.rollout.updateFlags(state().version(), Map.of("write_mode", "READ_ONLY"), "test", " ")));
    }

    @Test
    void staleVersionIsRejected() {
        int version = state().version();
        h.rollout.updateFlags(version, Map.of("null_branch_policy", "GYM_LEVEL"), "test", "D4 decided in review");
        assertEquals("ROLLOUT_STATE_CHANGED",
                code(() -> h.rollout.updateFlags(version, Map.of("null_branch_policy", "QUARANTINE"), "test", "stale")));
    }

    @Test
    void cutoverPreconditionsAreEnforcedInOrder() {
        assertEquals("WRITES_NOT_FROZEN", code(() -> h.rollout.cutover(state().version(), "test", "go")));

        h.rollout.updateFlags(state().version(), Map.of("write_mode", "READ_ONLY"), "test", "freeze for cutover");
        assertEquals("PRODUCTION_BASELINE_NOT_ACCEPTED", code(() -> h.rollout.cutover(state().version(), "test", "go")));

        assertEquals("BASELINE_DIGEST_REQUIRED",
                code(() -> h.rollout.acceptProductionBaseline(state().version(), "not-a-digest", "test", "reviewed")));
        h.rollout.acceptProductionBaseline(state().version(), "a".repeat(64), "test", "two identical production runs reviewed");
        assertEquals("RECONCILIATION_NOT_PASSED", code(() -> h.rollout.cutover(state().version(), "test", "go")));

        // A PASS that predates the freeze doesn't count; a later FAIL hides an earlier PASS.
        recordFinalReconciliation("PASS", "NOW() - interval '1 day'");
        assertEquals("RECONCILIATION_NOT_PASSED", code(() -> h.rollout.cutover(state().version(), "test", "go")));
        recordFinalReconciliation("PASS", "NOW() + interval '1 second'");
        recordFinalReconciliation("FAIL", "NOW() + interval '2 seconds'");
        assertEquals("RECONCILIATION_NOT_PASSED", code(() -> h.rollout.cutover(state().version(), "test", "go")));
        recordFinalReconciliation("PASS", "NOW() + interval '3 seconds'");

        State after = h.rollout.cutover(state().version(), "test", "cutover");
        assertEquals("GLOBAL", after.authority());
        assertEquals("READ_ONLY", after.writeMode(), "writes stay frozen until reopened explicitly");
        assertEquals("ALREADY_GLOBAL", code(() -> h.rollout.cutover(state().version(), "test", "again")));

        // One-way, enforced by the database even if someone bypasses the service.
        assertThrows(Exception.class, () -> h.controlJdbc.update("UPDATE community_rollout_state SET authority = 'LEGACY'"));
        assertTrue(h.controlJdbc.queryForObject("SELECT count(*) FROM community_rollout_audit WHERE field = 'authority' "
                + "AND new_value = 'GLOBAL'", Integer.class) == 1);
    }

    private void recordFinalReconciliation(String status, String finishedAtSql) {
        h.controlJdbc.update("INSERT INTO community_migration_runs (kind, mode, status, triggered_by, started_at, finished_at) "
                + "VALUES ('RECONCILE', 'FINAL', ?, 'test', NOW(), " + finishedAtSql + ")", status);
    }

    @Test
    void eachGateIsIndependent() {
        h.enableEverything();
        long id;
        h.asJohn();
        id = h.community.createPost(mobile("gym-a"), new CreatePost("t", "c", "tip", "gym-a", null)).id();

        h.controlJdbc.update("UPDATE community_rollout_state SET op_like = FALSE");
        assertEquals("OPERATION_DISABLED", code(() -> h.community.like(MOBILE, id)));
        assertEquals(id, h.community.post(MOBILE, id).id(), "reads unaffected");

        h.controlJdbc.update("UPDATE community_rollout_state SET write_mode = 'READ_ONLY'");
        assertEquals("COMMUNITY_READ_ONLY", code(() -> h.community.createPost(mobile("gym-a"), new CreatePost("t", "c", "tip", "gym-a", null))));
        h.asGymAAdmin();
        assertEquals("HIDDEN", h.moderation.hidePost(MOBILE, id, null).status(), "moderation keeps working while read-only");

        h.controlJdbc.update("UPDATE community_rollout_state SET moderation = FALSE");
        assertEquals("MODERATION_DISABLED", code(() -> h.moderation.restorePost(MOBILE, id, null)));

        h.controlJdbc.update("UPDATE community_rollout_state SET mobile_surface = 'OFF'");
        h.asJohn();
        assertEquals("COMMUNITY_NOT_ENABLED", code(() -> h.community.post(MOBILE, id)));
    }

    @Test
    void allowlistTargetsPilotGymsOnly() {
        h.enableEverything();
        h.controlJdbc.update("UPDATE community_rollout_state SET mobile_surface = 'ALLOWLIST'");
        h.rollout.addToAllowlist("gym-a", "test", "pilot");
        h.asJohn();
        h.community.feed(mobile("gym-a"), null, null, null, null);
        assertEquals("COMMUNITY_NOT_ENABLED", code(() -> h.community.feed(mobile("gym-b"), null, null, null, null)));
        h.asGymBAdmin();
        assertEquals("COMMUNITY_NOT_ENABLED", code(() -> h.community.feed(mobile("gym-a"), null, null, null, null)),
                "staff are targeted by their JWT gym, not the header");
    }

    @Test
    void killSwitchOverridesTheDatabase() {
        h.enableEverything();
        ReflectionTestUtils.setField(h.rollout, "killSwitch", true);
        h.asJohn();
        assertEquals("COMMUNITY_DISABLED", code(() -> h.community.feed(MOBILE, null, null, null, null)));
        assertFalse(h.rollout.moderationEnabled());
    }

    @Test
    void moderatePermissionSyncIsDryRunByDefaultAndIdempotent() throws Exception {
        JdbcTemplate gym = new JdbcTemplate(h.gymA);
        gym.execute("CREATE TABLE permissions (id BIGSERIAL PRIMARY KEY, permission_key VARCHAR(100) UNIQUE NOT NULL, "
                + "module VARCHAR(100) NOT NULL, action VARCHAR(50) NOT NULL, description TEXT, created_at TIMESTAMP DEFAULT NOW())");
        gym.execute("CREATE TABLE roles (id BIGSERIAL PRIMARY KEY, role_name VARCHAR(100) UNIQUE)");
        gym.execute("CREATE TABLE role_permissions (id BIGSERIAL PRIMARY KEY, role_id BIGINT, permission_id BIGINT, created_at TIMESTAMP DEFAULT NOW())");
        gym.update("INSERT INTO roles (role_name) VALUES ('ADMIN'), ('MANAGER'), ('TRAINER')");

        TenantRepository tenants = mock(TenantRepository.class);
        when(tenants.findAll()).thenReturn(List.of());
        CommunityPermissionSyncService sync = new CommunityPermissionSyncService(h.gymA, tenants,
                mock(TenantDataSourceRegistry.class), h.rolloutStore);

        var dry = sync.sync(true, "test", "preview").get(0);
        assertEquals(List.of("ADMIN", "MANAGER"), dry.rolesGranted());
        assertEquals(0, gym.queryForObject("SELECT count(*) FROM role_permissions", Integer.class), "dry run writes nothing");

        sync.sync(false, "test", "grant");
        sync.sync(false, "test", "grant again");
        assertEquals(2, gym.queryForObject("SELECT count(*) FROM role_permissions", Integer.class), "idempotent");
        assertEquals(0, gym.queryForObject("SELECT count(*) FROM role_permissions rp JOIN roles r ON r.id = rp.role_id "
                + "WHERE r.role_name = 'TRAINER'", Integer.class));
    }
}
