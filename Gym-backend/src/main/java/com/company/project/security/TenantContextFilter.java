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
import com.company.project.services.MemberAccessState;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

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

    // Family purchase/quote target a gym the caller is typically NOT a member of yet,
    // and claim-pending runs before the app knows any tenant at all — all three
    // pick their tenant(s) themselves, like /api/mobile/discovery/. The other
    // /api/mobile/family/ endpoints (view, resend, revoke) stay tenant-routed and
    // membership-checked by X-Tenant-ID as usual.
    private static final RequestMatcher STRICTLY_GLOBAL_FAMILY_PATH = new OrRequestMatcher(
            uriStartsWith("/api/mobile/family/purchase/"),
            uriStartsWith("/api/mobile/family/quote/"),
            uriEquals("/api/mobile/family/invitations/claim-pending")
    );

    // Claiming a referral code targets the REFERRER's gym, which the referee is normally
    // not a member of yet — MobileReferralController.claimCode looks the tenant up from
    // the code itself, so whatever X-Tenant-ID the app sends must not gate it.
    private static final RequestMatcher STRICTLY_GLOBAL_REFERRAL_PATH = uriEquals("/api/mobile/referrals/claim");

    // The global Community spans every gym and picks the gym it needs itself (the
    // posting gym is membership-checked per request against that gym's own
    // database), so it must neither be routed to nor membership-gated by the
    // caller's currently selected X-Tenant-ID.
    private static final RequestMatcher GLOBAL_COMMUNITY_PATH = uriStartsWith("/api/mobile/community/");

    // The signed-in person's own GymBios account (email, gyms' link requests) — never
    // about the gym selected in the app; accepting a link request picks its gym itself.
    private static final RequestMatcher ACCOUNT_PATH = new OrRequestMatcher(
            uriEquals("/api/mobile/account"),
            uriStartsWith("/api/mobile/account/")
    );

    private static final RequestMatcher STRICTLY_GLOBAL_PATH = new OrRequestMatcher(
            uriStartsWith("/api/mobile/auth/"),
            STRICTLY_GLOBAL_PROFILE_PATH,
            uriStartsWith("/api/mobile/discovery/"),
            STRICTLY_GLOBAL_FAMILY_PATH,
            STRICTLY_GLOBAL_REFERRAL_PATH,
            GLOBAL_COMMUNITY_PATH,
            ACCOUNT_PATH
    );

    private static final RequestMatcher GLOBAL_EXEMPT_PATH = new OrRequestMatcher(
            uriStartsWith("/api/auth/"),
            uriStartsWith("/api/mobile/auth/"),
            STRICTLY_GLOBAL_PROFILE_PATH,
            uriStartsWith("/api/mobile/discovery/"),
            STRICTLY_GLOBAL_FAMILY_PATH,
            STRICTLY_GLOBAL_REFERRAL_PATH,
            GLOBAL_COMMUNITY_PATH,
            ACCOUNT_PATH,
            uriStartsWith("/api/community"),
            uriStartsWith("/api/notifications")
    );

    private static final RequestMatcher OWN_STATUS_CHECK_PATH = uriEquals("/api/members/me");

    // Reachable while this gym's member features are closed (suspended, or a purchase
    // pending/refused approval — see MemberAccessState): the status check itself, plus
    // push-token registration so the device can receive the "payment approved" push (see
    // MemberPaymentApprovalNotifier) — a member who bought by cash is pending from their
    // very first app session, so blocking this would mean they never get that push.
    private static final RequestMatcher PENDING_APPROVAL_ALLOWED_PATH = new OrRequestMatcher(
            OWN_STATUS_CHECK_PATH,
            uriStartsWith("/api/mobile/member/push-tokens")
    );

    private static final ObjectMapper JSON = new ObjectMapper();

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

                    // /api/mobile/profile/ is global only for global (member) accounts. Staff/admin
                    // ids are tenant users.id, so their profile must resolve in the tenant DB —
                    // otherwise the lazy profile insert hits the default DB and fails
                    // user_profiles_user_id_fkey.
                    boolean strictlyGlobal = STRICTLY_GLOBAL_PATH.matches(request)
                            && (userDetails.isGlobal() || !STRICTLY_GLOBAL_PROFILE_PATH.matches(request));

                    if (tenantSlug != null && !tenantSlug.isBlank() && !strictlyGlobal) {
                        TenantContextHolder.setCurrentTenant(tenantSlug);
                        
                        // Validate multi-tenant authorization for members (GymBios accounts) on
                        // protected member paths. Staff are never gated here, and old gym-only
                        // member logins never get this far (JwtAuthenticationFilter rejects them).
                        if (userDetails.isGlobal() && !GLOBAL_EXEMPT_PATH.matches(request)) {
                            MemberRepository memberRepository = applicationContext.getBean(MemberRepository.class);
                            var member = memberRepository.findByGlobalUserId(userDetails.getId()).orElse(null);
                            if (member == null) {
                                TenantContextHolder.clear();
                                response.sendError(HttpServletResponse.SC_FORBIDDEN, "Access Denied: Not a member of this Gym");
                                return;
                            } else {
                                // A suspended membership, or a Cash/Credit/Mixed purchase awaiting
                                // (or refused) reception approval, closes this gym's member
                                // features — every member-facing endpoint, so it can't be bypassed
                                // by calling a different API. The account itself, Community, gym
                                // discovery and profile stay open (GLOBAL_EXEMPT_PATH), and
                                // /api/members/me stays reachable so the app can show the state
                                // and notice when it's lifted.
                                MemberAccessState state = MemberAccessState.of(member);
                                if (!state.allowsMemberFeatures() && !PENDING_APPROVAL_ALLOWED_PATH.matches(request)) {
                                    TenantContextHolder.clear();
                                    writeAccessRefusal(response, state);
                                    return;
                                }
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

    private static void writeAccessRefusal(HttpServletResponse response, MemberAccessState state) throws IOException {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 403);
        body.put("error", "Forbidden");
        body.put("code", "MEMBERSHIP_" + state.name());
        body.put("access_state", state.name());
        body.put("message", state.refusalMessage());
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        JSON.writeValue(response.getWriter(), body);
    }
}
