package com.company.project.community.global.identity;

import com.company.project.community.global.CommunityException;
import com.company.project.security.JwtService;
import com.company.project.security.UserDetailsImpl;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * THE identity boundary for the global Community. This is the only Community
 * class allowed to read the authenticated principal's ID
 * (CommunityIdentityBoundaryTest enforces that), and it always reads it
 * together with the account kind:
 *
 *   JWT → principal → GLOBAL | TENANT | PLATFORM actor
 *
 * A TENANT actor's gym comes only from the authenticated JWT tenant claim.
 * X-Tenant-ID and any client-supplied gym are never consulted here.
 */
@Component
public class CommunityActorResolver {

    private static final String PLATFORM_ROLE = "ROLE_GYMBIOS_ADMIN";

    private final JwtService jwtService;
    private final TenantDataSources tenantDataSources;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    public CommunityActorResolver(JwtService jwtService, TenantDataSources tenantDataSources) {
        this.jwtService = jwtService;
        this.tenantDataSources = tenantDataSources;
    }

    /** The actor for the current request; throws 401 when unauthenticated. */
    public CommunityActor current() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        HttpServletRequest request = RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes attrs
                ? attrs.getRequest() : null;
        return resolve(auth, request == null ? null : request.getHeader("Authorization"));
    }

    CommunityActor resolve(Authentication auth, String authorizationHeader) {
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof UserDetailsImpl principal)) {
            throw CommunityException.unauthenticated();
        }

        Set<String> roles = new LinkedHashSet<>();
        Set<String> permissions = new LinkedHashSet<>();
        for (GrantedAuthority authority : principal.getAuthorities()) {
            String name = authority.getAuthority();
            if (name.startsWith("ROLE_")) {
                roles.add(name);
            } else {
                permissions.add(name);
            }
        }

        if (roles.contains(PLATFORM_ROLE)) {
            return CommunityActor.platform(principal.getId());
        }
        if (principal.isGlobal()) {
            return CommunityActor.global(principal.getId());
        }

        String primaryRole = roles.stream().findFirst().map(r -> r.substring("ROLE_".length())).orElse(null);
        return CommunityActor.tenant(tenantClaim(authorizationHeader), principal.getId(), primaryRole, permissions);
    }

    /**
     * With tenant routing on, the gym is the JWT tenant claim. With routing off
     * the whole deployment is one primary database, so the only unambiguous gym
     * is the primary database's single gym; with several gyms there is no
     * trustworthy answer and the actor gets no gym (read-only).
     */
    private String tenantClaim(String authorizationHeader) {
        if (!tenantRoutingEnabled) {
            return tenantDataSources.singlePrimaryGymSlug().orElse(null);
        }
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return null;
        }
        String claim = jwtService.extractTenant(authorizationHeader.substring(7));
        return claim == null || claim.isBlank() ? null : claim;
    }
}
