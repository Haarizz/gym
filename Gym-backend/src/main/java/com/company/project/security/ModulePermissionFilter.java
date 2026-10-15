package com.company.project.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Enforces the Roles & Permissions matrix on staff API calls (see
 * {@link ModulePermissionRules}). Runs after authentication, tenant and branch
 * context are resolved. Members (global mobile identities), hardware devices and
 * legacy super admins are left to their own controller-level checks.
 *
 * Not a @Component on purpose: SecurityConfig adds it to the security chain only,
 * so Spring Boot doesn't also register it as a plain servlet filter.
 */
public class ModulePermissionFilter extends OncePerRequestFilter {

    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Set<String> NON_STAFF_ROLES = Set.of("ROLE_MEMBER");

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String path = request.getRequestURI().substring(request.getContextPath().length());

        if (!path.startsWith("/api/") || "OPTIONS".equalsIgnoreCase(request.getMethod())
                || auth == null || !auth.isAuthenticated() || auth instanceof AnonymousAuthenticationToken
                || isExempt(auth)) {
            filterChain.doFilter(request, response);
            return;
        }

        Set<String> authorities = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .collect(Collectors.toSet());
        ModulePermissionRules.Decision decision =
                ModulePermissionRules.evaluate(request.getMethod(), path, authorities);
        if (decision.allowed()) {
            filterChain.doFilter(request, response);
            return;
        }

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", 403);
        body.put("error", "Forbidden");
        body.put("message", "You don't have permission to " + decision.description()
                + ". Ask your administrator to update your role in Roles & Permissions.");
        body.put("requiredPermissions", decision.required());
        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        JSON.writeValue(response.getWriter(), body);
    }

    private static boolean isExempt(Authentication auth) {
        if (auth.getPrincipal() instanceof UserDetailsImpl user && user.isGlobal()) return true;
        Set<String> roles = auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .filter(a -> a.startsWith("ROLE_"))
                .collect(Collectors.toSet());
        if (roles.contains("ROLE_DEVICE") || roles.contains("ROLE_SUPER_ADMIN")) return true;
        // A member signed in with no staff role at all: their controllers
        // already scope them to their own data.
        return !roles.isEmpty() && NON_STAFF_ROLES.containsAll(roles);
    }
}
