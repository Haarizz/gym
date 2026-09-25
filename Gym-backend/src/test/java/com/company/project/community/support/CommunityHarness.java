package com.company.project.community.support;

import com.company.project.community.global.CommunityAuditLog;
import com.company.project.community.global.CommunityModerationService;
import com.company.project.community.global.CommunityViews;
import com.company.project.community.global.GlobalCommunityService;
import com.company.project.community.global.GlobalCommunityService.Request;
import com.company.project.community.global.content.CommunityContentValidator;
import com.company.project.community.global.identity.CommunityActorResolver;
import com.company.project.community.global.identity.CommunityAuthorProfiles;
import com.company.project.community.global.identity.CommunityGymContextResolver;
import com.company.project.community.global.identity.TenantDataSources;
import com.company.project.community.global.identity.TenantDataSources.TenantDb;
import com.company.project.community.global.identity.TenantMembershipLookup;
import com.company.project.community.global.rollout.CommunityRolloutService;
import com.company.project.community.global.rollout.CommunityRolloutService.Surface;
import com.company.project.controlplane.community.store.CommunityAuthorStore;
import com.company.project.controlplane.community.store.CommunityDb;
import com.company.project.controlplane.community.store.CommunityInteractionStore;
import com.company.project.controlplane.community.store.CommunityModerationStore;
import com.company.project.controlplane.community.store.CommunityPostStore;
import com.company.project.controlplane.community.store.CommunityRolloutStore;
import com.company.project.security.JwtService;
import com.company.project.security.UserDetailsImpl;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.sql.DataSource;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Wires the real global Community services, stores, policy and resolvers
 * against disposable databases: a control plane (V1–V6 via Flyway), two
 * isolated gym databases and a primary database. Identities travel through
 * real signed JWTs from the application's own JwtService, and only the
 * slug → DataSource lookup is stubbed (it would otherwise need the encrypted
 * tenant_connections registry).
 *
 * Cast (fixed IDs chosen to collide across identity spaces on purpose):
 *   John      GLOBAL 42  member of gym-a (member 100) and gym-b (member 201)
 *   Jessica   GLOBAL 55  member of gym-b (member 200)
 *   Pending   GLOBAL 43  gym-a, app access awaiting approval
 *   Outsider  GLOBAL 999 no gym
 *   Gym A admin    TENANT gym-a user 42 (same number as John!) with COMMUNITY_MODERATE
 *   Gym B admin    TENANT gym-b user 8 with COMMUNITY_MODERATE
 *   Gym A trainer  TENANT gym-a user 9 without it
 *   Platform owner user 1
 */
public final class CommunityHarness implements AutoCloseable {

    public static final String SECRET = Base64.getEncoder().encodeToString(new byte[32]).replace('A', 'k');

    public final DisposableDatabases databases = new DisposableDatabases();
    public final DataSource control;
    public final DataSource gymA;
    public final DataSource gymB;
    public final DataSource primary;
    public final JdbcTemplate controlJdbc;

    public final JwtService jwtService = new JwtService();
    public final CommunityRolloutService rollout;
    public final GlobalCommunityService community;
    public final CommunityModerationService moderation;
    public final CommunityPostStore posts;
    public final CommunityRolloutStore rolloutStore;

    public CommunityHarness() throws SQLException {
        control = databases.createControlPlane();
        controlJdbc = new JdbcTemplate(control);
        gymA = gymDatabase("gym_a");
        gymB = gymDatabase("gym_b");
        primary = gymDatabase("primary");
        seed();

        ReflectionTestUtils.setField(jwtService, "jwtSecret", SECRET);
        ReflectionTestUtils.setField(jwtService, "jwtExpirationMs", 3_600_000);

        TenantDataSources dataSources = mock(TenantDataSources.class);
        when(dataSources.resolve(anyString())).thenReturn(Optional.empty());
        when(dataSources.resolve("gym-a")).thenReturn(Optional.of(new TenantDb("gym-a", gymA, false)));
        when(dataSources.resolve("gym-b")).thenReturn(Optional.of(new TenantDb("gym-b", gymB, false)));
        when(dataSources.gymName("gym-a")).thenReturn(Optional.of("FitZone A"));
        when(dataSources.gymName("gym-b")).thenReturn(Optional.of("Iron B"));

        CommunityDb db = new CommunityDb(control);
        CommunityAuthorStore authors = new CommunityAuthorStore(db);
        posts = new CommunityPostStore(db);
        CommunityInteractionStore interactions = new CommunityInteractionStore(db);
        CommunityModerationStore moderationStore = new CommunityModerationStore(db);
        rolloutStore = new CommunityRolloutStore(db);
        rollout = new CommunityRolloutService(rolloutStore);
        ReflectionTestUtils.setField(rollout, "cacheTtlMs", 0L);

        CommunityActorResolver actorResolver = new CommunityActorResolver(jwtService, dataSources);
        ReflectionTestUtils.setField(actorResolver, "tenantRoutingEnabled", true);
        CommunityGymContextResolver gymContexts = new CommunityGymContextResolver(dataSources, new TenantMembershipLookup());
        CommunityAuthorProfiles profiles = new CommunityAuthorProfiles(primary, dataSources);
        CommunityContentValidator validator = new CommunityContentValidator();
        CommunityViews views = new CommunityViews(authors, posts);
        CommunityAuditLog audit = new CommunityAuditLog();

        community = new GlobalCommunityService(actorResolver, gymContexts, profiles, rollout, db, authors, posts,
                interactions, moderationStore, validator, views, audit);
        moderation = new CommunityModerationService(community, actorResolver, profiles, rollout, db, authors, posts,
                interactions, moderationStore, validator, views, audit);
    }

    private DataSource gymDatabase(String name) throws SQLException {
        DataSource ds = databases.create(name);
        JdbcTemplate jdbc = new JdbcTemplate(ds);
        jdbc.execute("CREATE TABLE gyms (id BIGINT PRIMARY KEY, slug VARCHAR(100), name VARCHAR(255))");
        jdbc.execute("CREATE TABLE branches (id BIGINT PRIMARY KEY, branch_name VARCHAR(255))");
        jdbc.execute("CREATE TABLE members (id BIGINT PRIMARY KEY, name VARCHAR(255), photo_url TEXT, branch_id BIGINT, "
                + "user_id BIGINT, global_user_id BIGINT UNIQUE, app_access_enabled BOOLEAN)");
        jdbc.execute("CREATE TABLE users (id BIGINT PRIMARY KEY, username VARCHAR(255))");
        jdbc.execute("CREATE TABLE user_profiles (id BIGSERIAL PRIMARY KEY, user_id BIGINT, full_name VARCHAR(255), photo_url TEXT)");
        return ds;
    }

    private void seed() {
        JdbcTemplate a = new JdbcTemplate(gymA);
        a.update("INSERT INTO gyms VALUES (1, 'main', 'FitZone A')");
        a.update("INSERT INTO branches VALUES (10, 'Downtown')");
        a.update("INSERT INTO members (id, name, branch_id, global_user_id, app_access_enabled) VALUES "
                + "(100, 'John', 10, 42, TRUE), (101, 'Pending', 10, 43, FALSE)");
        a.update("INSERT INTO users VALUES (42, 'gym-a-admin@example.com'), (9, 'trainer@example.com')");
        a.update("INSERT INTO user_profiles (user_id, full_name) VALUES (42, 'Alice (A admin)')");

        JdbcTemplate b = new JdbcTemplate(gymB);
        b.update("INSERT INTO gyms VALUES (1, 'main', 'Iron B')");
        b.update("INSERT INTO branches VALUES (20, 'North')");
        b.update("INSERT INTO members (id, name, branch_id, global_user_id, app_access_enabled) VALUES "
                + "(200, 'Jessica', 20, 55, TRUE), (201, 'John', 20, 42, TRUE)");
        b.update("INSERT INTO users VALUES (8, 'gym-b-admin@example.com')");
        b.update("INSERT INTO user_profiles (user_id, full_name) VALUES (8, 'Bob (B admin)')");

        JdbcTemplate p = new JdbcTemplate(primary);
        p.update("INSERT INTO users VALUES (42, 'john@example.com'), (55, 'jessica@example.com'), (43, 'p@example.com'), "
                + "(999, 'o@example.com'), (1, 'owner@example.com')");
        p.update("INSERT INTO user_profiles (user_id, full_name) VALUES (42, 'John Doe'), (55, 'Jessica Roe')");
    }

    /** Turns everything on, as if the verified production cutover had happened. */
    public void enableEverything() {
        controlJdbc.update("UPDATE community_rollout_state SET production_baseline_accepted = TRUE, authority = 'GLOBAL'");
        controlJdbc.update("UPDATE community_rollout_state SET global_reads = TRUE, op_post = TRUE, op_comment = TRUE, "
                + "op_like = TRUE, op_report = TRUE, moderation = TRUE, reports = TRUE, mobile_surface = 'ALL', "
                + "web_surface = 'ALL', write_mode = 'OPEN'");
    }

    // ── Acting as someone ───────────────────────────────────────────────────

    public static final Request MOBILE = new Request(Surface.MOBILE, null, "/api/mobile/community");

    public static Request mobile(String selectedGym) {
        return new Request(Surface.MOBILE, selectedGym, "/api/mobile/community");
    }

    public void asGlobal(long globalUserId) {
        authenticate(globalUserId, true, null, "ROLE_MEMBER");
    }

    public void asTenant(String gym, long userId, String... authorities) {
        authenticate(userId, false, gym, authorities);
    }

    public void asJohn() { asGlobal(42); }
    public void asJessica() { asGlobal(55); }
    public void asPending() { asGlobal(43); }
    public void asOutsider() { asGlobal(999); }
    public void asGymAAdmin() { asTenant("gym-a", 42, "ROLE_ADMIN", "COMMUNITY_MODERATE"); }
    public void asGymBAdmin() { asTenant("gym-b", 8, "ROLE_ADMIN", "COMMUNITY_MODERATE"); }
    public void asGymATrainer() { asTenant("gym-a", 9, "ROLE_TRAINER", "COMMUNITY_VIEW"); }
    public void asPlatform() { authenticate(1, false, null, "ROLE_GYMBIOS_ADMIN"); }

    private void authenticate(long id, boolean global, String tenant, String... authorities) {
        List<GrantedAuthority> list = new ArrayList<>();
        for (String a : authorities) {
            list.add(new SimpleGrantedAuthority(a));
        }
        UserDetailsImpl principal = new UserDetailsImpl(id, "user" + id, "user" + id + "@x", "pw", list, true, global);
        Map<String, Object> claims = new HashMap<>();
        if (tenant != null) {
            claims.put(JwtService.TENANT_CLAIM, tenant);
        }
        if (global) {
            claims.put(JwtService.IS_GLOBAL_CLAIM, true);
        }
        String token = jwtService.generateToken(claims, principal);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(principal, null, list));
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
    }

    public void signOut() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    @Override
    public void close() throws SQLException {
        signOut();
        databases.close();
    }
}
