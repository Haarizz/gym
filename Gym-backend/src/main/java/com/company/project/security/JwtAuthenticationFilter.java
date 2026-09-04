package com.company.project.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    public JwtAuthenticationFilter(JwtService jwtService, UserDetailsService userDetailsService) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        // TenantContextFilter (which reads this same claim) runs AFTER this filter
        // in the chain — but loadUserByUsername below runs a real DB lookup right
        // now, via TenantRoutingDataSource, which reads TenantContextHolder at the
        // moment of the call. Without setting it here first, this lookup always hits
        // the default/primary DataSource on every authenticated request (not just
        // login), so a tenant user whose account exists ONLY in their own dedicated
        // database can never pass authentication past login — confirmed live:
        // "UsernameNotFoundException: User Not Found" for a real, correctly-
        // provisioned tenant owner on every subsequent request. This mirrors the
        // exact fix AuthService.login() already applies before its own
        // authenticationManager.authenticate(...) call (Phase 5) — that fix covers
        // login only; this filter covers every request after it, which needed the
        // identical treatment and never got it until now.
        boolean tenantContextSetHere = false;
        try {
            if (tenantRoutingEnabled) {
                String tenantSlug = jwtService.extractTenant(jwt);
                if (tenantSlug != null && !tenantSlug.isBlank()) {
                    TenantContextHolder.setCurrentTenant(tenantSlug);
                    tenantContextSetHere = true;
                }
            }

            username = jwtService.extractUsername(jwt);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);

                if (jwtService.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(
                            new WebAuthenticationDetailsSource().buildDetails(request)
                    );
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            logger.error("Cannot set user authentication: {}", e);
        } finally {
            // Only clears what THIS filter set — TenantContextFilter (next in chain)
            // does its own authoritative set/clear cycle for the rest of the request
            // pipeline (repository calls inside controllers/services), independent
            // of this filter's narrower, earlier need to resolve the tenant just for
            // the loadUserByUsername call above.
            if (tenantContextSetHere) {
                TenantContextHolder.clear();
            }
        }

        filterChain.doFilter(request, response);
    }
}
