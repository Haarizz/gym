package com.company.project.community;

import com.company.project.community.global.CommunityException;
import com.company.project.community.global.identity.TenantDataSources;
import com.company.project.community.global.rollout.CommunityRolloutService;
import com.company.project.community.support.DisposableDatabases;
import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.community.baseline.CommunityBaselineService;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader;
import com.company.project.controlplane.community.migration.CommunityMigrationStore;
import com.company.project.controlplane.community.migration.CommunityReconciliationService;
import com.company.project.controlplane.community.migration.LegacyCommunityBackfillService;
import com.company.project.controlplane.community.migration.LegacyContentReader;
import com.company.project.controlplane.community.store.CommunityDb;
import com.company.project.controlplane.community.store.CommunityRolloutStore;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import javax.sql.DataSource;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Phase 4: backfill + reconciliation against realistic legacy databases.
 *
 * primary DB: gym-a (served from primary) and gym-b (already moved to its own DB)
 *   101  staff 2, branch 10 (gym-a), with a large-object image, liked by 42 and 2, commented by 42   → MIGRATE
 *   102  global member 42, archived                                                              → MIGRATE (ARCHIVED)
 *   103  platform owner 1                                            → D1 (quarantine / exclude / platform)
 *   104  gym-created member login 5                                  → D3 (quarantine / tenant)
 *   300  copy of gym-b's post 300 (same ID, same content)             → SUPERSEDED by the tenant DB
 *   301  gym-b row that never reached gym-b's DB                       → QUARANTINED (primary-only)
 * gym-b DB:
 *   300  staff 8, branch 20                                              → MIGRATE
 *   302  staff 8, no branch                                              → D4 (quarantine / gym level)
 */
@EnabledIfEnvironmentVariable(named = "COMMUNITY_IT", matches = "true")
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class LegacyMigrationIT {

    private static final String PNG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

    private static DisposableDatabases databases;
    private static JdbcTemplate control, primary, gymB;
    private static LegacyCommunityBackfillService backfill;
    private static CommunityReconciliationService reconciliation;
    private static CommunityRolloutService rollout;
    private static CommunityMigrationStore migrationStore;

    @BeforeAll
    static void setUp() throws Exception {
        databases = new DisposableDatabases();
        DataSource controlDs = databases.createControlPlane();
        DataSource primaryDs = legacyDatabase("legacy_primary", true);
        DataSource gymBDs = legacyDatabase("legacy_gym_b", false);
        control = new JdbcTemplate(controlDs);
        primary = new JdbcTemplate(primaryDs);
        gymB = new JdbcTemplate(gymBDs);
        seed();

        Tenant a = new Tenant("Gym A", "gym-a");
        Tenant b = new Tenant("Gym B", "gym-b");
        TenantRepository tenants = mock(TenantRepository.class);
        when(tenants.findAll()).thenReturn(List.of(a, b));
        TenantDataSourceRegistry registry = mock(TenantDataSourceRegistry.class);
        when(registry.hasConnection(anyString())).thenReturn(false);
        when(registry.hasConnection("gym-b")).thenReturn(true);
        when(registry.getDataSource("gym-b")).thenReturn(gymBDs);
        TenantDataSources dataSources = mock(TenantDataSources.class);
        when(dataSources.gymName("gym-a")).thenReturn(Optional.of("Gym A"));
        when(dataSources.gymName("gym-b")).thenReturn(Optional.of("Gym B"));

        CommunityBaselineService baseline = new CommunityBaselineService(primaryDs, controlDs, tenants, registry,
                new LegacyCommunitySnapshotReader());
        CommunityDb db = new CommunityDb(controlDs);
        migrationStore = new CommunityMigrationStore(db);
        CommunityRolloutStore rolloutStore = new CommunityRolloutStore(db);
        rollout = new CommunityRolloutService(rolloutStore);
        ReflectionTestUtils.setField(rollout, "cacheTtlMs", 0L);
        ObjectMapper mapper = new ObjectMapper().findAndRegisterModules();
        backfill = new LegacyCommunityBackfillService(baseline, migrationStore, new LegacyContentReader(), rolloutStore,
                dataSources, mapper);
        reconciliation = new CommunityReconciliationService(baseline, migrationStore, rolloutStore, mapper);
    }

    @AfterAll
    static void tearDown() throws Exception {
        databases.close();
    }

    private static DataSource legacyDatabase(String name, boolean primaryDb) throws Exception {
        DataSource ds = databases.create(name);
        JdbcTemplate j = new JdbcTemplate(ds);
        j.execute("CREATE TABLE gyms (id BIGINT PRIMARY KEY, slug VARCHAR(100), status VARCHAR(20), name VARCHAR(100))");
        j.execute("CREATE TABLE branches (id BIGINT PRIMARY KEY, branch_name VARCHAR(100)" + (primaryDb ? ", gym_id BIGINT" : "") + ")");
        j.execute("CREATE TABLE users (id BIGINT PRIMARY KEY, username VARCHAR(100), email VARCHAR(100))");
        j.execute("CREATE TABLE roles (id BIGINT PRIMARY KEY, role_name VARCHAR(50))");
        j.execute("CREATE TABLE user_roles (user_id BIGINT, role_id BIGINT)");
        j.execute("CREATE TABLE members (id BIGINT PRIMARY KEY, name VARCHAR(100), photo_url TEXT, user_id BIGINT, "
                + "global_user_id BIGINT, branch_id BIGINT, app_access_enabled BOOLEAN)");
        j.execute("CREATE TABLE user_profiles (id BIGSERIAL PRIMARY KEY, user_id BIGINT, full_name VARCHAR(100), photo_url TEXT)");
        j.execute("CREATE TABLE community_posts (id BIGINT PRIMARY KEY, author_user_id BIGINT NOT NULL REFERENCES users(id), "
                + "branch_id BIGINT, archived BOOLEAN DEFAULT FALSE, like_count INT DEFAULT 0, comment_count INT DEFAULT 0, "
                + "created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP, created_by VARCHAR(50), updated_by VARCHAR(50), "
                + "topic VARCHAR(140) NOT NULL, content TEXT NOT NULL, type VARCHAR(32) NOT NULL, image_data_url OID, "
                + "image_aspect_ratio VARCHAR(8), image_crop_position INT, image_crop_zoom INT)");
        j.execute("CREATE TABLE community_post_comments (id BIGINT PRIMARY KEY, post_id BIGINT NOT NULL REFERENCES community_posts(id), "
                + "author_user_id BIGINT NOT NULL REFERENCES users(id), content TEXT NOT NULL, created_at TIMESTAMP NOT NULL, "
                + "updated_at TIMESTAMP, created_by VARCHAR(50), updated_by VARCHAR(50))");
        j.execute("CREATE TABLE community_post_likes (id BIGINT PRIMARY KEY, post_id BIGINT NOT NULL REFERENCES community_posts(id), "
                + "user_id BIGINT NOT NULL REFERENCES users(id), created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP, "
                + "created_by VARCHAR(50), updated_by VARCHAR(50), UNIQUE (post_id, user_id))");
        j.update("INSERT INTO roles VALUES (1, 'GYMBIOS_ADMIN'), (2, 'MANAGER'), (3, 'MEMBER'), (4, 'ADMIN')");
        return ds;
    }

    private static void seed() {
        primary.update("INSERT INTO gyms VALUES (1, 'gym-a', 'ACTIVE', 'Gym A'), (2, 'gym-b', 'ACTIVE', 'Gym B')");
        primary.update("INSERT INTO branches VALUES (10, 'A Downtown', 1), (20, 'B North', 2)");
        primary.update("INSERT INTO users VALUES (1, 'owner', 'o@x'), (2, 'manager', 'm@x'), (5, 'login', 'l@x'), (8, 'b-admin', 'b@x'), (42, 'john', 'j@x')");
        primary.update("INSERT INTO user_roles VALUES (1, 1), (2, 2), (5, 3), (8, 4), (42, 3)");
        primary.update("INSERT INTO members (id, name, user_id, global_user_id, branch_id, app_access_enabled) VALUES "
                + "(900, 'John', NULL, 42, 10, TRUE), (901, 'Login Member', 5, NULL, 10, TRUE)");
        primary.update("INSERT INTO user_profiles (user_id, full_name) VALUES (42, 'John Doe'), (2, 'Mary Manager')");
        primary.update("INSERT INTO community_posts (id, author_user_id, branch_id, archived, like_count, comment_count, created_at, "
                + "topic, content, type, image_data_url, image_aspect_ratio, image_crop_position, image_crop_zoom) VALUES "
                + "(101, 2, 10, FALSE, 2, 1, '2026-08-01 10:00:00.123456', 'Welcome', 'Hello gym A', 'tip', "
                + "lo_from_bytea(0, convert_to('data:image/png;base64," + PNG_B64 + "', 'UTF8')), '4:5', 50, 110), "
                + "(102, 42, 10, TRUE, 0, 0, '2026-08-02 10:00:00', 'Old', 'archived one', 'achievement', NULL, NULL, NULL, NULL), "
                + "(103, 1, 10, FALSE, 1, 1, '2026-08-03 10:00:00', 'Announcement', 'from the platform', 'tip', NULL, NULL, NULL, NULL), "
                + "(104, 5, 10, FALSE, 0, 0, '2026-08-04 10:00:00', 'Hi', 'member login post', 'question', NULL, NULL, NULL, NULL), "
                + "(300, 8, 20, FALSE, 0, 0, '2026-07-01 09:00:00', 'B post', 'copied to gym-b', 'tip', NULL, NULL, NULL, NULL), "
                + "(301, 8, 20, FALSE, 0, 0, '2026-07-02 09:00:00', 'B lost', 'never reached gym-b', 'tip', NULL, NULL, NULL, NULL)");
        primary.update("INSERT INTO community_post_comments (id, post_id, author_user_id, content, created_at) VALUES "
                + "(201, 101, 42, 'Nice!', '2026-08-01 11:00:00'), (202, 103, 42, 'Thanks', '2026-08-03 11:00:00')");
        primary.update("INSERT INTO community_post_likes (id, post_id, user_id, created_at) VALUES "
                + "(401, 101, 42, '2026-08-01 12:00:00'), (402, 101, 2, '2026-08-01 12:30:00'), (403, 103, 2, '2026-08-03 12:00:00')");

        gymB.update("INSERT INTO gyms VALUES (1, 'main', 'ACTIVE', 'Gym B')");
        gymB.update("INSERT INTO branches VALUES (20, 'B North')");
        gymB.update("INSERT INTO users VALUES (8, 'b-admin', 'b@x')");
        gymB.update("INSERT INTO user_roles VALUES (8, 4)");
        gymB.update("INSERT INTO user_profiles (user_id, full_name) VALUES (8, 'Bea Admin')");
        gymB.update("INSERT INTO community_posts (id, author_user_id, branch_id, archived, like_count, comment_count, created_at, "
                + "topic, content, type) VALUES (300, 8, 20, FALSE, 1, 0, '2026-07-01 09:00:00', 'B post', 'copied to gym-b', 'tip'), "
                + "(302, 8, NULL, FALSE, 0, 0, '2026-07-05 09:00:00', 'No branch', 'gym-level post', 'tip')");
        gymB.update("INSERT INTO community_post_likes (id, post_id, user_id, created_at) VALUES (501, 300, 8, '2026-07-01 10:00:00')");
    }

    private static int count(String sql, Object... args) {
        return control.queryForObject(sql, Integer.class, args);
    }

    private static Map<String, Object> globalPost(String source, long legacyId) {
        return control.queryForMap("SELECT p.*, a.kind, a.global_user_id, a.tenant_slug, a.tenant_user_id, a.platform_user_id "
                + "FROM global_community_posts p JOIN community_authors a ON a.id = p.author_id "
                + "WHERE p.legacy_source = ? AND p.legacy_id = ?", source, legacyId);
    }

    private static void policies(Map<String, Object> changes) {
        rollout.updateFlags(rollout.state().version(), changes, "test", "decided in review");
    }

    @Test
    @Order(1)
    void firstBackfillMigratesOnlyUnambiguousRecordsAndQuarantinesTheRest() {
        var result = backfill.run("FULL", "test");
        assertEquals("COMPLETED", result.status());

        // Migrated: 101, 102 (primary), 300 (gym-b). Nothing guessed.
        assertEquals(3, count("SELECT count(*) FROM global_community_posts WHERE status <> 'DELETED'"));
        assertEquals(0, count("SELECT count(*) FROM global_community_posts WHERE legacy_source = 'primary' AND legacy_id IN (103, 104, 300, 301)"));

        Map<String, Object> p101 = globalPost("primary", 101);
        assertEquals("TENANT", p101.get("kind"));
        assertEquals("gym-a", p101.get("tenant_slug"));
        assertEquals(2L, p101.get("tenant_user_id"));
        assertEquals("gym-a", p101.get("author_tenant_slug"));
        assertEquals(10L, p101.get("author_branch_id"));
        assertEquals("GYM", p101.get("visibility"), "C2: history stays gym-only");
        assertEquals(2, p101.get("like_count"));
        assertEquals(1, p101.get("comment_count"));
        assertTrue(((Long) p101.get("id")) >= 1_000_000_000L);
        byte[] image = control.queryForObject("SELECT data FROM global_community_post_images WHERE post_id = ?", byte[].class, p101.get("id"));
        assertArrayEquals(Base64.getDecoder().decode(PNG_B64), image, "large-object image decoded byte for byte");

        Map<String, Object> p102 = globalPost("primary", 102);
        assertEquals("GLOBAL", p102.get("kind"));
        assertEquals(42L, p102.get("global_user_id"));
        assertEquals("ARCHIVED", p102.get("status"));
        assertEquals(900L, p102.get("author_member_id"));

        assertEquals("TENANT", globalPost("tenant:gym-b", 300).get("kind"));

        // Every non-migrated record is accounted for.
        assertEquals(1, count("SELECT count(*) FROM community_migration_quarantine WHERE legacy_id = 103 AND code = 'AUTHOR_PLATFORM_ACCOUNT' AND status = 'OPEN'"));
        assertEquals(1, count("SELECT count(*) FROM community_migration_quarantine WHERE legacy_id = 104 AND code = 'AUTHOR_AMBIGUOUS' AND status = 'OPEN'"));
        assertEquals(1, count("SELECT count(*) FROM community_migration_quarantine WHERE legacy_id = 302 AND code = 'NULL_BRANCH' AND status = 'OPEN'"));
        assertEquals(1, count("SELECT count(*) FROM community_migration_quarantine WHERE legacy_id = 301 AND code = 'PRIMARY_ONLY_FOR_MIGRATED_TENANT'"));
        assertEquals(1, count("SELECT count(*) FROM community_migration_quarantine WHERE legacy_id = 202 AND code = 'PARENT_POST_QUARANTINED'"));
        assertEquals(1, count("SELECT count(*) FROM community_migration_quarantine WHERE legacy_id = 403 AND code = 'PARENT_POST_QUARANTINED'"));
        assertEquals(0, count("SELECT count(*) FROM community_migration_quarantine WHERE legacy_source = 'primary' AND legacy_id = 300"),
                "the stale primary copy is superseded, not quarantined");

        var rec = reconciliation.run("DELTA", "test");
        assertEquals("FAIL", rec.status(), "open quarantine blocks a PASS");
        assertTrue(rec.firstDifferences().stream().allMatch(d -> d.startsWith("OPEN_QUARANTINE")), rec.firstDifferences().toString());
    }

    @Test
    @Order(2)
    void rerunningIsIdempotent() {
        List<Map<String, Object>> before = control.queryForList("SELECT id, legacy_source, legacy_id, legacy_fingerprint FROM global_community_posts ORDER BY id");
        int likes = count("SELECT count(*) FROM global_community_likes");
        int comments = count("SELECT count(*) FROM global_community_comments");
        int authors = count("SELECT count(*) FROM community_authors");
        backfill.run("FULL", "test");
        backfill.run("DELTA", "test");
        assertEquals(before, control.queryForList("SELECT id, legacy_source, legacy_id, legacy_fingerprint FROM global_community_posts ORDER BY id"));
        assertEquals(likes, count("SELECT count(*) FROM global_community_likes"));
        assertEquals(comments, count("SELECT count(*) FROM global_community_comments"));
        assertEquals(authors, count("SELECT count(*) FROM community_authors"));
    }

    @Test
    @Order(3)
    void approvedPoliciesResolveOnlyTheirOwnCodesAndReconciliationPasses() {
        policies(Map.of("platform_author_policy", "EXCLUDE", "primary_member_login_policy", "TENANT", "null_branch_policy", "GYM_LEVEL"));
        backfill.run("DELTA", "test");

        assertEquals(0, count("SELECT count(*) FROM global_community_posts WHERE legacy_id = 103"), "D1 EXCLUDE");
        assertEquals(1, count("SELECT count(*) FROM community_migration_quarantine WHERE legacy_id = 103 AND status = 'APPROVED_EXCLUSION'"));
        assertEquals(1, count("SELECT count(*) FROM community_migration_quarantine WHERE legacy_id IN (202) AND status = 'APPROVED_EXCLUSION'"),
                "children of an excluded post are excluded with it");

        Map<String, Object> p104 = globalPost("primary", 104);
        assertEquals("TENANT", p104.get("kind"), "D3 TENANT");
        assertEquals("gym-a", p104.get("tenant_slug"));
        assertEquals(5L, p104.get("tenant_user_id"));

        Map<String, Object> p302 = globalPost("tenant:gym-b", 302);
        assertEquals(null, p302.get("author_branch_id"), "D4 GYM_LEVEL");

        // 301 (primary-only for a migrated tenant) has no policy: it still needs an operator decision.
        long q301 = control.queryForObject("SELECT id FROM community_migration_quarantine WHERE legacy_id = 301 AND status = 'OPEN'", Long.class);
        assertEquals("FAIL", reconciliation.run("DELTA", "test").status());
        assertTrue(migrationStore.decide(q301, "APPROVED_EXCLUSION", "test", "confirmed deleted in gym-b after its migration"));

        var rec = reconciliation.run("DELTA", "test");
        assertEquals("PASS", rec.status(), String.valueOf(rec.firstDifferences()));
    }

    @Test
    @Order(4)
    void deltaRunsFollowLegacyChangesAndReconciliationCatchesDriftFirst() {
        primary.update("INSERT INTO community_posts (id, author_user_id, branch_id, created_at, topic, content, type) "
                + "VALUES (105, 42, 10, '2026-09-01 08:00:00', 'New', 'fresh post', 'achievement')");
        primary.update("DELETE FROM community_post_likes WHERE id = 401");
        primary.update("UPDATE community_posts SET archived = TRUE, updated_at = '2026-09-02 08:00:00' WHERE id = 101");

        var drift = reconciliation.run("DELTA", "test");
        assertEquals("FAIL", drift.status());
        String diffs = String.join("\n", drift.firstDifferences());
        assertTrue(diffs.contains("MISSING primary post 105"), diffs);
        assertTrue(diffs.contains("ORPHAN primary like 401"), diffs);
        assertTrue(diffs.contains("MISMATCH primary post 101 status"), diffs);

        backfill.run("DELTA", "test");
        assertEquals("PASS", reconciliation.run("DELTA", "test").status());
        Map<String, Object> p101 = globalPost("primary", 101);
        assertEquals("ARCHIVED", p101.get("status"));
        assertEquals(1, p101.get("like_count"));
        assertEquals(0, count("SELECT count(*) FROM global_community_likes WHERE legacy_id = 401"));
    }

    @Test
    @Order(5)
    void tamperingWithTheReplicaIsDetectedAndRepairedByTheNextRun() {
        control.update("UPDATE global_community_posts SET content = 'tampered' WHERE legacy_source = 'primary' AND legacy_id = 102");
        control.update("UPDATE global_community_posts SET like_count = 99 WHERE legacy_source = 'tenant:gym-b' AND legacy_id = 300");
        var rec = reconciliation.run("DELTA", "test");
        assertEquals("FAIL", rec.status());
        String diffs = String.join("\n", rec.firstDifferences());
        assertTrue(diffs.contains("post 102 content"), diffs);
        assertTrue(diffs.contains("post 300 like_count"), diffs);

        backfill.run("DELTA", "test");
        assertEquals("PASS", reconciliation.run("DELTA", "test").status());
    }

    @Test
    @Order(6)
    void finalReconciliationGatesTheOneWayCutover() {
        assertEquals("WRITES_NOT_FROZEN", assertThrowsCode(() -> reconciliation.run("FINAL", "test")));
        policies(Map.of("write_mode", "READ_ONLY"));
        rollout.acceptProductionBaseline(rollout.state().version(), "b".repeat(64), "test", "reviewed");
        assertEquals("RECONCILIATION_NOT_PASSED", assertThrowsCode(() -> rollout.cutover(rollout.state().version(), "test", "go")));

        assertEquals("PASS", reconciliation.run("FINAL", "test").status());
        assertEquals("GLOBAL", rollout.cutover(rollout.state().version(), "test", "cutover").authority());

        assertEquals("ALREADY_GLOBAL", assertThrowsCode(() -> backfill.run("DELTA", "test")));
        assertEquals("ALREADY_GLOBAL", assertThrowsCode(() -> reconciliation.run("DELTA", "test")));
    }

    private static String assertThrowsCode(Runnable r) {
        try {
            r.run();
        } catch (CommunityException e) {
            return e.getCode();
        }
        throw new AssertionError("expected a CommunityException");
    }
}
