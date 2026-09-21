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
import org.springframework.security.web.util.matcher.AndRequestMatcher;
import org.springframework.security.web.util.matcher.NegatedRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;
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

    // Custom RequestMatchers to preserve the exact semantics of the previous String.startsWith and String.equals checks,
    // ensuring 100% equivalence, including any trailing-slash anomalies, without broadening boundaries.
    private static RequestMatcher uriStartsWith(String prefix) {
        return request -> request.getRequestURI() != null && request.getRequestURI().startsWith(prefix);
    }

    private static RequestMatcher uriEquals(String exactPath) {
        return request -> request.getRequestURI() != null && request.getRequestURI().equals(exactPath);
    }

    private static final RequestMatcher PROFILE_TRANSACTIONS_PATH = uriEquals("/api/mobile/profile/transactions");
    private static final RequestMatcher STRICTLY_GLOBAL_PROFILE_PATH = new AndRequestMatcher(
            uriStartsWith("/api/mobile/profile/"),
            new NegatedRequestMatcher(PROFILE_TRANSACTIONS_PATH)
    );

    private static final RequestMatcher STRICTLY_GLOBAL_PATH = new OrRequestMatcher(
            uriStartsWith("/api/mobile/auth/"),
            STRICTLY_GLOBAL_PROFILE_PATH,
            uriStartsWith("/api/mobile/discovery/")
    );

    private static final RequestMatcher GLOBAL_EXEMPT_PATH = new OrRequestMatcher(
            uriStartsWith("/api/auth/"),
            uriStartsWith("/api/mobile/auth/"),
            STRICTLY_GLOBAL_PROFILE_PATH,
            uriStartsWith("/api/mobile/discovery/"),
            uriStartsWith("/api/community"),
            uriStartsWith("/api/notifications")
    );

    private static final RequestMatcher OWN_STATUS_CHECK_PATH = uriEquals("/api/members/me");

    private static final RequestMatcher LEGACY_EXEMPT_PATH = new OrRequestMatcher(
            GLOBAL_EXEMPT_PATH,
            uriEquals("/api/branches/my-branches"),
            OWN_STATUS_CHECK_PATH
    );

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

                    if (tenantSlug != null && !tenantSlug.isBlank() && !STRICTLY_GLOBAL_PATH.matches(request)) {
                        TenantContextHolder.setCurrentTenant(tenantSlug);
                        
                        // Validate multi-tenant authorization for global users on protected member paths
                        if (userDetails.isGlobal() && !GLOBAL_EXEMPT_PATH.matches(request)) {
                            MemberRepository memberRepository = applicationContext.getBean(MemberRepository.class);
                            var member = memberRepository.findByGlobalUserId(userDetails.getId()).orElse(null);
                            if (member == null) {
                                TenantContextHolder.clear();
                                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access Denied: Not a member of this Gym");
                                return;
                            }
                            // A Cash/Credit/Mixed mobile purchase awaiting reception approval
                            // (see MobileDiscoveryController.purchaseMembership) has
                            // appAccessEnabled=false until staff approve/reject it in the
                            // web app's Approvals tab — block every other member-facing
                            // mobile endpoint for this gym until then, so the restriction
                            // can't be bypassed by calling an API other than /purchase.
                            // /api/members/me stays reachable (see isOwnStatusCheckPath)
                            // so the app can keep checking whether it's been resolved.
                            if (!OWN_STATUS_CHECK_PATH.matches(request) && Boolean.FALSE.equals(member.getAppAccessEnabled())) {
                                TenantContextHolder.clear();
                                response.sendError(HttpServletResponse.SC_FORBIDDEN,
                                        "Access Denied: Membership payment is awaiting approval");
                                return;
                            }
                        }
                    } else {
                        // Global users can access endpoints without a tenant (e.g., to see empty dashboard before joining a gym)
                        if (!LEGACY_EXEMPT_PATH.matches(request) && !userDetails.isGlobal()) {
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
