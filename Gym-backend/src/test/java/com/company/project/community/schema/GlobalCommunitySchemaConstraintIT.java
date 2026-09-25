package com.company.project.community.schema;

import com.company.project.community.support.DisposableDatabases;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Phase 1 exit criterion: every invalid Community state is rejected by the
 * database itself, not only by Java validation, and V6 is safe to re-apply.
 */
@EnabledIfEnvironmentVariable(named = "COMMUNITY_IT", matches = "true")
class GlobalCommunitySchemaConstraintIT {

    private static DisposableDatabases databases;
    private static JdbcTemplate jdbc;

    private long globalAuthor;
    private long tenantAuthor;

    @BeforeAll
    static void createDatabase() throws SQLException {
        databases = new DisposableDatabases();
        DataSource control = databases.createControlPlane();
        jdbc = new JdbcTemplate(control);
    }

    @AfterAll
    static void dropDatabase() throws SQLException {
        databases.close();
    }

    @BeforeEach
    void seedAuthors() {
        long unique = System.nanoTime();
        globalAuthor = jdbc.queryForObject("INSERT INTO community_authors (kind, global_user_id, display_name) "
                + "VALUES ('GLOBAL', ?, 'Global') RETURNING id", Long.class, unique);
        tenantAuthor = jdbc.queryForObject("INSERT INTO community_authors (kind, tenant_slug, tenant_user_id, display_name) "
                + "VALUES ('TENANT', 'gym-a', ?, 'Tenant') RETURNING id", Long.class, unique);
    }

    /**
     * Only counts a rejection caused by a constraint (SQLSTATE class 23) or by
     * one of V6's guard triggers (P0001) — a typo in the SQL must fail the test,
     * not pass it.
     */
    private static void rejected(String sql, Object... args) {
        DataAccessException e = assertThrows(DataAccessException.class, () -> jdbc.update(sql, args), sql);
        assertConstraintRejection(e, sql);
    }

    private static void assertConstraintRejection(DataAccessException e, String sql) {
        Throwable t = e;
        while (t != null && !(t instanceof SQLException)) {
            t = t.getCause();
        }
        String state = t == null ? null : ((SQLException) t).getSQLState();
        assertTrue(state != null && (state.startsWith("23") || state.equals("P0001")),
                "expected a constraint/guard rejection but got SQLSTATE " + state + " (" + e.getMostSpecificCause().getMessage()
                        + ") for: " + sql);
    }

    private long post(String origin, String legacySource, Long legacyId) {
        return jdbc.queryForObject("INSERT INTO global_community_posts (author_id, author_tenant_slug, topic, content, "
                        + "type, origin, legacy_source, legacy_id, legacy_fingerprint) VALUES (?, 'gym-a', 't', 'c', "
                        + "'tip', ?, ?, ?, ?) RETURNING id", Long.class,
                globalAuthor, origin, legacySource, legacyId, legacyId == null ? null : "fp");
    }

    @Test
    void v6IsIdempotentWhenReapplied() throws Exception {
        String sql = new String(new ClassPathResource("db/migration-control/V6__global_community.sql")
                .getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        assertDoesNotThrow(() -> jdbc.execute(sql));
        assertEquals(1, jdbc.queryForObject("SELECT count(*) FROM community_rollout_state", Integer.class));
    }

    @Test
    void globalIdSequencesStartAboveLegacyCeiling() {
        long id = post("GLOBAL", null, null);
        assertTrue(id >= 1_000_000_000L, "post id " + id);
    }

    // ── Identity invariants ─────────────────────────────────────────────────

    @Test
    void globalAuthorCannotCarryTenantIdentity() {
        rejected("INSERT INTO community_authors (kind, global_user_id, tenant_slug, display_name) VALUES ('GLOBAL', 1, 'gym-a', 'x')");
        rejected("INSERT INTO community_authors (kind, global_user_id, tenant_user_id, display_name) VALUES ('GLOBAL', 1, 5, 'x')");
        rejected("INSERT INTO community_authors (kind, display_name) VALUES ('GLOBAL', 'x')");
    }

    @Test
    void tenantAuthorRequiresSlugAndLocalIdAndNoGlobalId() {
        rejected("INSERT INTO community_authors (kind, tenant_slug, display_name) VALUES ('TENANT', 'gym-a', 'x')");
        rejected("INSERT INTO community_authors (kind, tenant_user_id, display_name) VALUES ('TENANT', 5, 'x')");
        rejected("INSERT INTO community_authors (kind, tenant_slug, tenant_user_id, global_user_id, display_name) "
                + "VALUES ('TENANT', 'gym-a', 5, 9, 'x')");
    }

    @Test
    void platformAuthorOnlyCarriesPlatformIdentity() {
        rejected("INSERT INTO community_authors (kind, platform_user_id, global_user_id, display_name) VALUES ('PLATFORM', 1, 1, 'x')");
        rejected("INSERT INTO community_authors (kind, display_name) VALUES ('PLATFORM', 'x')");
    }

    @Test
    void unknownKindAndWhitespaceSlugsAreRejected() {
        rejected("INSERT INTO community_authors (kind, global_user_id, display_name) VALUES ('ADMIN', 1, 'x')");
        rejected("INSERT INTO community_authors (kind, tenant_slug, tenant_user_id, display_name) VALUES ('TENANT', 'sint voluptatum id ', 1, 'x')");
        rejected("INSERT INTO community_authors (kind, tenant_slug, tenant_user_id, display_name) VALUES ('TENANT', '', 1, 'x')");
    }

    @Test
    void sameIdentityCannotBeRegisteredTwice() {
        long g = System.nanoTime();
        jdbc.update("INSERT INTO community_authors (kind, global_user_id, display_name) VALUES ('GLOBAL', ?, 'x')", g);
        rejected("INSERT INTO community_authors (kind, global_user_id, display_name) VALUES ('GLOBAL', ?, 'y')", g);
        jdbc.update("INSERT INTO community_authors (kind, tenant_slug, tenant_user_id, display_name) VALUES ('TENANT', 'gym-z', ?, 'x')", g);
        rejected("INSERT INTO community_authors (kind, tenant_slug, tenant_user_id, display_name) VALUES ('TENANT', 'gym-z', ?, 'y')", g);
    }

    @Test
    void sameNumericIdInDifferentIdentitySpacesIsAllowed() {
        // The whole point: global user 7 and tenant-local user 7 are different people.
        long n = System.nanoTime();
        jdbc.update("INSERT INTO community_authors (kind, global_user_id, display_name) VALUES ('GLOBAL', ?, 'x')", n);
        assertDoesNotThrow(() -> jdbc.update("INSERT INTO community_authors (kind, tenant_slug, tenant_user_id, display_name) "
                + "VALUES ('TENANT', 'gym-a', ?, 'y')", n));
        assertDoesNotThrow(() -> jdbc.update("INSERT INTO community_authors (kind, tenant_slug, tenant_user_id, display_name) "
                + "VALUES ('TENANT', 'gym-b', ?, 'z')", n));
    }

    // ── Post invariants ─────────────────────────────────────────────────────

    @Test
    void invalidStatusVisibilityAndOriginAreRejected() {
        String base = "INSERT INTO global_community_posts (author_id, author_tenant_slug, topic, content, type, origin, status, visibility) "
                + "VALUES (?, 'gym-a', 't', 'c', 'tip', ?, ?, ?)";
        rejected(base, globalAuthor, "GLOBAL", "REPORTED", "PUBLIC");
        rejected(base, globalAuthor, "GLOBAL", "ACTIVE", "PRIVATE");
        rejected(base, globalAuthor, "IMPORTED", "ACTIVE", "PUBLIC");
    }

    @Test
    void negativeCountersAreRejected() {
        long id = post("GLOBAL", null, null);
        rejected("UPDATE global_community_posts SET like_count = -1 WHERE id = ?", id);
        rejected("UPDATE global_community_posts SET comment_count = -1 WHERE id = ?", id);
    }

    @Test
    void legacyOriginRequiresLegacyKeyAndGlobalOriginForbidsIt() {
        rejected("INSERT INTO global_community_posts (author_id, author_tenant_slug, topic, content, type, origin) "
                + "VALUES (?, 'gym-a', 't', 'c', 'tip', 'LEGACY')", globalAuthor);
        rejected("INSERT INTO global_community_posts (author_id, author_tenant_slug, topic, content, type, origin, "
                + "legacy_source, legacy_id, legacy_fingerprint) VALUES (?, 'gym-a', 't', 'c', 'tip', 'GLOBAL', 'primary', 1, 'fp')", globalAuthor);
    }

    @Test
    void aLegacyRowCanOnlyBeMigratedOnce() {
        long legacyId = System.nanoTime();
        post("LEGACY", "tenant:gym-a", legacyId);
        assertConstraintRejection(assertThrows(DataAccessException.class, () -> post("LEGACY", "tenant:gym-a", legacyId)), "duplicate legacy key");
        // Same numeric ID from a different source is a different legacy row.
        assertDoesNotThrow(() -> post("LEGACY", "primary", legacyId));
    }

    @Test
    void newContentLimitsAreEnforcedButLegacyContentIsKeptVerbatim() {
        String long1001 = "x".repeat(1001);
        rejected("INSERT INTO global_community_posts (author_id, author_tenant_slug, topic, content, type, origin) "
                + "VALUES (?, 'gym-a', 't', ?, 'tip', 'GLOBAL')", globalAuthor, long1001);
        assertDoesNotThrow(() -> jdbc.update("INSERT INTO global_community_posts (author_id, author_tenant_slug, topic, content, "
                + "type, origin, legacy_source, legacy_id, legacy_fingerprint) VALUES (?, 'gym-a', 't', ?, 'tip', 'LEGACY', 'primary', ?, 'fp')",
                globalAuthor, long1001, System.nanoTime()));
    }

    @Test
    void hiddenAndDeletedStatesRequireTheirMetadata() {
        long id = post("GLOBAL", null, null);
        rejected("UPDATE global_community_posts SET status = 'HIDDEN' WHERE id = ?", id);
        rejected("UPDATE global_community_posts SET status = 'DELETED' WHERE id = ?", id);
        assertDoesNotThrow(() -> jdbc.update("UPDATE global_community_posts SET status = 'HIDDEN', hidden_at = now(), "
                + "hidden_by_author_id = ? WHERE id = ?", tenantAuthor, id));
    }

    @Test
    void postsMustReferenceARealAuthor() {
        rejected("INSERT INTO global_community_posts (author_id, author_tenant_slug, topic, content, type, origin) "
                + "VALUES (-1, 'gym-a', 't', 'c', 'tip', 'GLOBAL')");
    }

    @Test
    void newImagesMustObeyUploadLimits() {
        long id = post("GLOBAL", null, null);
        String insert = "INSERT INTO global_community_post_images (post_id, origin, content_type, data, byte_size, width, height, sha256) "
                + "VALUES (?, 'GLOBAL', ?, ?, ?, ?, ?, repeat('0', 64))";
        byte[] small = new byte[16];
        rejected(insert, id, "image/gif", small, 16, 10, 10);
        rejected(insert, id, "image/png", small, 16, 4096, 10);
        rejected(insert, id, "image/png", small, 99, 10, 10);
        rejected(insert, id, "image/png", new byte[1_572_865], 1_572_865, 10, 10);
        assertDoesNotThrow(() -> jdbc.update(insert, id, "image/png", small, 16, 10, 10));
    }

    // ── Comments, likes, hides ──────────────────────────────────────────────

    @Test
    void likesAreUniquePerAuthorAndPost() {
        long id = post("GLOBAL", null, null);
        jdbc.update("INSERT INTO global_community_likes (post_id, author_id, origin) VALUES (?, ?, 'GLOBAL')", id, tenantAuthor);
        rejected("INSERT INTO global_community_likes (post_id, author_id, origin) VALUES (?, ?, 'GLOBAL')", id, tenantAuthor);
    }

    @Test
    void commentLimitsAndStatusesAreEnforced() {
        long id = post("GLOBAL", null, null);
        String insert = "INSERT INTO global_community_comments (post_id, author_id, author_tenant_slug, content, origin, status) "
                + "VALUES (?, ?, 'gym-b', ?, 'GLOBAL', ?)";
        rejected(insert, id, globalAuthor, "x".repeat(501), "ACTIVE");
        rejected(insert, id, globalAuthor, "ok", "HIDDEN");
        rejected(insert, id, globalAuthor, "ok", "DELETED");
    }

    @Test
    void platformHideScopeHasNoGymAndGymScopesRequireOne() {
        long id = post("GLOBAL", null, null);
        long comment = jdbc.queryForObject("INSERT INTO global_community_comments (post_id, author_id, author_tenant_slug, "
                + "content, origin) VALUES (?, ?, 'gym-b', 'hi', 'GLOBAL') RETURNING id", Long.class, id, globalAuthor);
        String hide = "INSERT INTO community_comment_hides (comment_id, scope, scope_tenant_slug, hidden_by_author_id) VALUES (?, ?, ?, ?)";
        rejected(hide, comment, "AUTHOR_GYM", null, tenantAuthor);
        rejected(hide, comment, "PLATFORM", "gym-a", tenantAuthor);
        jdbc.update(hide, comment, "AUTHOR_GYM", "gym-b", tenantAuthor);
        assertDoesNotThrow(() -> jdbc.update(hide, comment, "POST_OWNER_GYM", "gym-a", tenantAuthor));
        rejected(hide, comment, "AUTHOR_GYM", "gym-b", tenantAuthor);
    }

    // ── Audit and rollout guards ────────────────────────────────────────────

    @Test
    void moderationActionsAreAppendOnly() {
        long id = jdbc.queryForObject("INSERT INTO community_moderation_actions (target_type, target_id, action, scope, "
                + "actor_author_id) VALUES ('POST', 1, 'HIDE', 'AUTHOR_GYM', ?) RETURNING id", Long.class, tenantAuthor);
        rejected("UPDATE community_moderation_actions SET reason = 'x' WHERE id = ?", id);
        rejected("DELETE FROM community_moderation_actions WHERE id = ?", id);
        assertConstraintRejection(assertThrows(DataAccessException.class,
                () -> jdbc.execute("TRUNCATE community_moderation_actions")), "TRUNCATE");
    }

    @Test
    void rolloutAuditIsAppendOnly() {
        long id = jdbc.queryForObject("INSERT INTO community_rollout_audit (changed_by, field, reason) "
                + "VALUES ('t', 'x', 'r') RETURNING id", Long.class);
        rejected("DELETE FROM community_rollout_audit WHERE id = ?", id);
    }

    @Test
    void rolloutStateIsASingletonThatCannotBeDeleted() {
        rejected("INSERT INTO community_rollout_state (id) VALUES (2)");
        rejected("DELETE FROM community_rollout_state");
    }

    @Test
    void globalFeaturesCannotBeEnabledWhileLegacyIsAuthoritative() {
        rejected("UPDATE community_rollout_state SET op_post = TRUE");
        rejected("UPDATE community_rollout_state SET mobile_surface = 'ALL'");
        rejected("UPDATE community_rollout_state SET global_reads = TRUE");
    }

    @Test
    void authorityCannotFlipWithoutAcceptedProductionBaselineAndNeverReturnsToLegacy() {
        rejected("UPDATE community_rollout_state SET authority = 'GLOBAL'");
        // This test database stands in for a fully verified environment.
        jdbc.update("UPDATE community_rollout_state SET production_baseline_accepted = TRUE, authority = 'GLOBAL'");
        rejected("UPDATE community_rollout_state SET authority = 'LEGACY'");
        rejected("UPDATE community_rollout_state SET shadow_compare = TRUE");
        rejected("UPDATE community_rollout_state SET production_baseline_accepted = FALSE");
        assertEquals("GLOBAL", jdbc.queryForObject("SELECT authority FROM community_rollout_state", String.class));
    }

    @Test
    void quarantineResolutionRequiresAnAccountableResolver() {
        String insert = "INSERT INTO community_migration_quarantine (legacy_source, legacy_table, legacy_id, code, detail, status) "
                + "VALUES ('primary', 'community_posts', ?, 'NULL_BRANCH', 'd', ?)";
        rejected(insert, System.nanoTime(), "APPROVED_EXCLUSION");
        rejected(insert, System.nanoTime(), "SILENTLY_IGNORED");
        assertDoesNotThrow(() -> jdbc.update(insert, System.nanoTime(), "OPEN"));
    }
}
