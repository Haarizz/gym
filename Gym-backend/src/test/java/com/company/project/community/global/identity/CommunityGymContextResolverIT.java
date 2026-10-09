package com.company.project.community.global.identity;

import com.company.project.community.global.CommunityException;
import com.company.project.community.global.identity.CommunityGymContextResolver.GymContext;
import com.company.project.community.global.identity.TenantDataSources.TenantDb;
import com.company.project.community.support.DisposableDatabases;
import com.company.project.security.BranchContextHolder;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.jdbc.core.JdbcTemplate;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Security scenarios G–J against two real, isolated gym databases:
 * a gymContext is a request, never authorization.
 */
@EnabledIfEnvironmentVariable(named = "COMMUNITY_IT", matches = "true")
class CommunityGymContextResolverIT {

    private static DisposableDatabases databases;
    private static DataSource gymA;
    private static DataSource gymB;
    private static DataSource sharedPrimary;

    private CommunityGymContextResolver resolver;

    @BeforeAll
    static void createGyms() throws SQLException {
        databases = new DisposableDatabases();
        gymA = gymDatabase("gym_a", false);
        gymB = gymDatabase("gym_b", false);
        sharedPrimary = gymDatabase("primary", true);

        JdbcTemplate a = new JdbcTemplate(gymA);
        a.update("INSERT INTO gyms (id, slug, name) VALUES (1, 'main', 'Gym A')");
        a.update("INSERT INTO branches (id, branch_name) VALUES (10, 'A Downtown')");
        a.update("INSERT INTO members (id, name, branch_id, global_user_id, app_access_enabled) VALUES (100, 'John', 10, 42, TRUE)");
        a.update("INSERT INTO members (id, name, branch_id, global_user_id, app_access_enabled) VALUES (101, 'Pending', 10, 43, FALSE)");
        a.update("INSERT INTO members (id, name, branch_id, global_user_id, app_access_enabled) VALUES (102, 'Legacy', 10, 44, NULL)");
        a.update("INSERT INTO members (id, name, branch_id, user_id, app_access_enabled) VALUES (103, 'Staff-member', 10, 7, TRUE)");

        JdbcTemplate b = new JdbcTemplate(gymB);
        b.update("INSERT INTO gyms (id, slug, name) VALUES (1, 'main', 'Gym B')");
        b.update("INSERT INTO branches (id, branch_name) VALUES (20, 'B North')");
        b.update("INSERT INTO members (id, name, branch_id, global_user_id, app_access_enabled) VALUES (200, 'Jessica', 20, 55, TRUE)");
        // Multi-gym user 42 is also a member of Gym B.
        b.update("INSERT INTO members (id, name, branch_id, global_user_id, app_access_enabled) VALUES (201, 'John', 20, 42, TRUE)");

        // A primary DB holding two gyms whose branches don't record their gym.
        JdbcTemplate p = new JdbcTemplate(sharedPrimary);
        p.update("INSERT INTO gyms (id, slug, name) VALUES (1, 'gym-x', 'X'), (2, 'gym-y', 'Y')");
        p.update("INSERT INTO branches (id, branch_name) VALUES (30, 'somewhere')");
        p.update("INSERT INTO members (id, name, branch_id, global_user_id, app_access_enabled) VALUES (300, 'Z', 30, 77, TRUE)");
    }

    private static DataSource gymDatabase(String name, boolean primary) throws SQLException {
        DataSource ds = databases.create(name);
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        jdbc.execute("CREATE TABLE gyms (id BIGINT PRIMARY KEY, slug VARCHAR(100), name VARCHAR(255))");
        jdbc.execute("CREATE TABLE branches (id BIGINT PRIMARY KEY, branch_name VARCHAR(255))");
        jdbc.execute("CREATE TABLE members (id BIGINT PRIMARY KEY, name VARCHAR(255), photo_url TEXT, branch_id BIGINT, "
                + "user_id BIGINT, global_user_id BIGINT UNIQUE, app_access_enabled BOOLEAN)");
        return ds;
    }

    @AfterAll
    static void drop() throws SQLException {
        databases.close();
    }

    @BeforeEach
    void setUp() {
        TenantDataSources dataSources = mock(TenantDataSources.class);
        when(dataSources.resolve(anyString())).thenReturn(Optional.empty());
        when(dataSources.resolve("gym-a")).thenReturn(Optional.of(new TenantDb("gym-a", gymA, false)));
        when(dataSources.resolve("gym-b")).thenReturn(Optional.of(new TenantDb("gym-b", gymB, false)));
        when(dataSources.resolve("gym-x")).thenReturn(Optional.of(new TenantDb("gym-x", sharedPrimary, true)));
        when(dataSources.gymName("gym-a")).thenReturn(Optional.of("Gym A"));
        when(dataSources.gymName("gym-b")).thenReturn(Optional.of("Gym B"));
        resolver = new CommunityGymContextResolver(dataSources, new TenantMembershipLookup());
    }

    @AfterEach
    void clearBranch() {
        BranchContextHolder.clear();
    }

    private static String code(Runnable r) {
        return assertThrows(CommunityException.class, r::run).getCode();
    }

    @Test
    void memberPostsFromTheirGymWithMemberAndBranchSnapshot() {
        GymContext ctx = resolver.resolveForWrite(CommunityActor.global(42), "gym-a");
        assertEquals("gym-a", ctx.tenantSlug());
        assertEquals("Gym A", ctx.gymName());
        assertEquals(100L, ctx.memberId());
        assertEquals(10L, ctx.branchId());
        assertEquals("A Downtown", ctx.branchName());
    }

    @Test
    void scenarioF_multiGymMemberGetsTheRequestedGymsIdentity() {
        assertEquals(100L, resolver.resolveForWrite(CommunityActor.global(42), "gym-a").memberId());
        assertEquals(201L, resolver.resolveForWrite(CommunityActor.global(42), "gym-b").memberId());
    }

    @Test
    void scenarioG_cannotPostUsingAnotherGymsContext() {
        assertEquals("NOT_A_MEMBER", code(() -> resolver.resolveForWrite(CommunityActor.global(55), "gym-a")));
    }

    @Test
    void scenarioH_globalUserWithoutMembershipCannotPost() {
        assertEquals("NOT_A_MEMBER", code(() -> resolver.resolveForWrite(CommunityActor.global(999), "gym-a")));
        assertEquals("NOT_A_MEMBER", code(() -> resolver.resolveForWrite(CommunityActor.global(42), "no-such-gym")));
        assertEquals("GYM_CONTEXT_REQUIRED", code(() -> resolver.resolveForWrite(CommunityActor.global(42), " ")));
    }

    @Test
    void scenarioI_appAccessDisabledBlocksPostingButNullMeansNeverRestricted() {
        assertEquals("APP_ACCESS_PENDING", code(() -> resolver.resolveForWrite(CommunityActor.global(43), "gym-a")));
        assertEquals(102L, resolver.resolveForWrite(CommunityActor.global(44), "gym-a").memberId());
    }

    @Test
    void scenarioJ_staffCannotChangeTheirGymBySupplyingAnother() {
        CommunityActor staffA = CommunityActor.tenant("gym-a", 7, "MANAGER", Set.of());
        assertEquals("GYM_CONTEXT_MISMATCH", code(() -> resolver.resolveForWrite(staffA, "gym-b")));

        BranchContextHolder.setActiveBranchId(10L);
        GymContext ctx = resolver.resolveForWrite(staffA, null);
        assertEquals("gym-a", ctx.tenantSlug());
        assertEquals(103L, ctx.memberId(), "tenant user linked to a member row keeps that snapshot");
        assertEquals(10L, ctx.branchId());
    }

    @Test
    void staffWithoutGymAndPlatformAccountsCannotWrite() {
        assertEquals("MISSING_TENANT_CONTEXT",
                code(() -> resolver.resolveForWrite(CommunityActor.tenant(null, 7, "MANAGER", Set.of()), null)));
        assertEquals("PLATFORM_CANNOT_POST", code(() -> resolver.resolveForWrite(CommunityActor.platform(1), "gym-a")));
    }

    @Test
    void primaryMembershipThatCannotBeTiedToTheGymIsUndeterminedNotGuessed() {
        assertEquals("MEMBERSHIP_UNDETERMINED", code(() -> resolver.resolveForWrite(CommunityActor.global(77), "gym-x")));
    }

    @Test
    void gymOnlyContentVisibility() {
        assertTrue(resolver.canSeeGymContent(CommunityActor.global(42), "gym-a"));
        assertFalse(resolver.canSeeGymContent(CommunityActor.global(55), "gym-a"));
        assertFalse(resolver.canSeeGymContent(CommunityActor.global(43), "gym-a"), "pending members don't see gym-only content");
        assertTrue(resolver.canSeeGymContent(CommunityActor.tenant("gym-a", 7, "MANAGER", Set.of()), "gym-a"));
        assertFalse(resolver.canSeeGymContent(CommunityActor.tenant("gym-a", 7, "MANAGER", Set.of()), "gym-b"));
        assertFalse(resolver.canSeeGymContent(CommunityActor.platform(1), "gym-a"));
    }
}
