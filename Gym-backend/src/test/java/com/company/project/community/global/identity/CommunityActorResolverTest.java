package com.company.project.community.global.identity;

import com.company.project.community.global.CommunityException;
import com.company.project.security.JwtService;
import com.company.project.security.UserDetailsImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class CommunityActorResolverTest {

    private JwtService jwtService;
    private TenantDataSources tenantDataSources;
    private CommunityActorResolver resolver;

    @BeforeEach
    void setUp() {
        jwtService = mock(JwtService.class);
        tenantDataSources = mock(TenantDataSources.class);
        resolver = new CommunityActorResolver(jwtService, tenantDataSources);
        ReflectionTestUtils.setField(resolver, "tenantRoutingEnabled", true);
    }

    private static UsernamePasswordAuthenticationToken auth(long id, boolean global, String... authorities) {
        List<GrantedAuthority> list = java.util.Arrays.stream(authorities)
                .map(SimpleGrantedAuthority::new).map(GrantedAuthority.class::cast).toList();
        UserDetailsImpl principal = new UserDetailsImpl(id, "u", "u@x", "pw", list, true, global);
        return new UsernamePasswordAuthenticationToken(principal, null, list);
    }

    @Test
    void globalPrincipalBecomesGlobalActorAndIgnoresTenantClaim() {
        CommunityActor actor = resolver.resolve(auth(42, true, "ROLE_MEMBER"), "Bearer t");
        assertEquals(CommunityActor.Kind.GLOBAL, actor.kind());
        assertEquals(42L, actor.globalUserId());
        assertNull(actor.tenantUserId());
        assertNull(actor.tenantSlug());
        verify(jwtService, never()).extractTenant("t");
    }

    @Test
    void tenantPrincipalTakesGymFromJwtClaimOnly() {
        when(jwtService.extractTenant("t")).thenReturn("gym-a");
        CommunityActor actor = resolver.resolve(auth(7, false, "ROLE_MANAGER", "COMMUNITY_MODERATE"), "Bearer t");
        assertEquals(CommunityActor.Kind.TENANT, actor.kind());
        assertEquals("gym-a", actor.tenantSlug());
        assertEquals(7L, actor.tenantUserId());
        assertNull(actor.globalUserId());
        assertEquals("MANAGER", actor.primaryRole());
        assertTrue(actor.hasPermission("COMMUNITY_MODERATE"));
    }

    @Test
    void tenantPrincipalWithoutClaimHasNoGym() {
        when(jwtService.extractTenant("t")).thenReturn(null);
        assertNull(resolver.resolve(auth(7, false, "ROLE_MANAGER"), "Bearer t").tenantSlug());
    }

    @Test
    void platformOwnerBecomesPlatformActor() {
        CommunityActor actor = resolver.resolve(auth(1, false, "ROLE_GYMBIOS_ADMIN"), "Bearer t");
        assertEquals(CommunityActor.Kind.PLATFORM, actor.kind());
        assertEquals(1L, actor.platformUserId());
    }

    @Test
    void withoutRoutingOnlyASinglePrimaryGymIsTrusted() {
        ReflectionTestUtils.setField(resolver, "tenantRoutingEnabled", false);
        when(tenantDataSources.singlePrimaryGymSlug()).thenReturn(Optional.of("main-gym"));
        assertEquals("main-gym", resolver.resolve(auth(7, false, "ROLE_MANAGER"), null).tenantSlug());

        when(tenantDataSources.singlePrimaryGymSlug()).thenReturn(Optional.empty());
        assertNull(resolver.resolve(auth(7, false, "ROLE_MANAGER"), null).tenantSlug());
    }

    @Test
    void unauthenticatedIsRejected() {
        CommunityException e = assertThrows(CommunityException.class, () -> resolver.resolve(null, null));
        assertEquals(401, e.getStatus().value());
    }

    @Test
    void actorsCannotMixIdentitySpaces() {
        assertThrows(IllegalArgumentException.class,
                () -> new CommunityActor(CommunityActor.Kind.GLOBAL, 1L, "gym-a", null, null, null, Set.of()));
        assertThrows(IllegalArgumentException.class,
                () -> new CommunityActor(CommunityActor.Kind.TENANT, 1L, "gym-a", 2L, null, null, Set.of()));
    }
}
