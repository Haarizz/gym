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

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    public TenantContextFilter(JwtService jwtService) {
        this.jwtService = jwtService;
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
                    String tenantSlug = null;
                    String authHeader = request.getHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        tenantSlug = jwtService.extractTenant(authHeader.substring(7));
                    }

                    if (tenantSlug == null || tenantSlug.isBlank()) {
                        response.sendError(HttpServletResponse.SC_FORBIDDEN,
                                "Request is missing a valid tenant context");
                        return;
                    }
                    TenantContextHolder.setCurrentTenant(tenantSlug);
                }
                // GYMBIOS_ADMIN: skip tenant resolution entirely, same as BranchContextFilter.
            }

            filterChain.doFilter(request, response);
        } finally {
            TenantContextHolder.clear();
        }
    }
}
