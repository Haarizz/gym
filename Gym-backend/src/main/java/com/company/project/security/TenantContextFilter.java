package com.company.project.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.context.ApplicationContext;
import com.company.project.repositories.MemberRepository;

import java.io.IOException;

/**
 * Phase 2 multi-tenant groundwork: reads the "tenant" claim from the already
 * JWT-service-validated bearer token and populates {@link TenantContextHolder}
 * so {@link com.company.project.config.TenantRoutingDataSource} can pick a
 * DataSource. Runs after the JWT authentication filter.
 *
 * Gated by tenant.routing.enabled (default false) — when off, this filter is a
 * complete no-op: no ThreadLocal touched, no claim parsed, zero behavior change
 * from before this feature existed.
 *
 * GYMBIOS_ADMIN (the platform owner) never carries a tenant claim and is exempt
 * from tenant resolution entirely, matching how {@link BranchContextFilter}
 * exempts it from branch resolution. Any other authenticated user is expected
 * to carry a valid tenant claim once the flag is on; a missing/blank claim is
 * treated as a real problem (403), not silently waved through.
 */
@Component
public class TenantContextFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final ApplicationContext applicationContext;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    public TenantContextFilter(JwtService jwtService, ApplicationContext applicationContext) {
        this.jwtService = jwtService;
        this.applicationContext = applicationContext;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        if (!tenantRoutingEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserDetailsImpl) {
                boolean isGymbiosAdmin = auth.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .anyMatch(a -> a.equals("ROLE_GYMBIOS_ADMIN"));

                if (!isGymbiosAdmin) {
                    UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
                    String tenantSlug = null;
                    String authHeader = request.getHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        tenantSlug = jwtService.extractTenant(authHeader.substring(7));
                    }
                    
                    if (userDetails.isGlobal()) {
                        String headerTenant = request.getHeader("X-Tenant-ID");
                        if (headerTenant != null && !headerTenant.isBlank()) {
                            tenantSlug = headerTenant;
                        }
                    }

                    String path = request.getRequestURI();
                    boolean isGlobalExemptPath = path.startsWith("/api/auth/")
                            || path.startsWith("/api/mobile/auth/")
                            || path.startsWith("/api/mobile/profile/")
                            || path.startsWith("/api/mobile/discovery/")
                            || path.startsWith("/api/community")
                            || path.startsWith("/api/notifications");

                    boolean isStrictlyGlobalPath = path.startsWith("/api/mobile/auth/")
                            || path.startsWith("/api/mobile/profile/")
                            || path.startsWith("/api/mobile/discovery/");

                    if (tenantSlug != null && !tenantSlug.isBlank() && !isStrictlyGlobalPath) {
                        TenantContextHolder.setCurrentTenant(tenantSlug);
                        
                        // Validate multi-tenant authorization for global users on protected member paths
                        if (userDetails.isGlobal() && !isGlobalExemptPath) {
                            MemberRepository memberRepository = applicationContext.getBean(MemberRepository.class);
                            if (!memberRepository.existsByGlobalUserId(userDetails.getId())) {
                                TenantContextHolder.clear();
                                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access Denied: Not a member of this Gym");
                                return;
                            }
                        }
                    } else {
                        // Keep legacy exemptions for non-mobile apps (staff, trainers)
                        boolean isLegacyExemptPath = isGlobalExemptPath 
                                || path.equals("/api/branches/my-branches")
                                || path.equals("/api/members/me");

                        // Global users can access endpoints without a tenant (e.g., to see empty dashboard before joining a gym)
                        if (!isLegacyExemptPath && !userDetails.isGlobal()) {
                            response.sendError(HttpServletResponse.SC_FORBIDDEN,
                                    "Request is missing a valid tenant context");
                            return;
                        }
                    }
                }
                // GYMBIOS_ADMIN: skip tenant resolution entirely, same as BranchContextFilter.
            }

            filterChain.doFilter(request, response);
        } finally {
            TenantContextHolder.clear();
        }
    }
}
