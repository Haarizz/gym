package com.company.project.security;

import com.company.project.repositories.UserBranchRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Reads the {@code X-Active-Branch-Id} header from every authenticated request,
 * validates the user has access to that branch, and populates
 * {@link BranchContextHolder} so services can scope their queries.
 *
 * "All Branches" mode (a {@code null} active branch, which disables the
 * Hibernate branch filter) is only ever granted to ROLE_ADMIN/ROLE_SUPER_ADMIN.
 * Every other authenticated user must resolve to one concrete branch — either
 * the one named by the header (if they're assigned to it) or, when no header
 * is sent, their single assigned branch. A non-admin who is assigned to zero
 * or multiple branches without specifying one is rejected rather than silently
 * falling back to an unfiltered view.
 *
 * Runs after the JWT authentication filter.
 */
@Component
public class BranchContextFilter extends OncePerRequestFilter {

    private static final String BRANCH_HEADER = "X-Active-Branch-Id";

    private final UserBranchRepository userBranchRepository;

    public BranchContextFilter(UserBranchRepository userBranchRepository) {
        this.userBranchRepository = userBranchRepository;
    }

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (path.startsWith("/api/auth/")
                || path.startsWith("/api/mobile/auth/")
                || path.startsWith("/api/mobile/profile/")
                || path.startsWith("/api/mobile/")
                || path.startsWith("/api/community")
                || path.startsWith("/api/notifications")
                || path.equals("/api/branches/my-branches")
                || path.equals("/api/members/me")) {
            // Mobile endpoints are scoped to the authenticated user via JWT (not branch).
            // /api/branches/my-branches must also be reachable so members can discover gyms.
            // /api/members/me is used to fetch the user's member profile on mount.
            // Self-registered members with no gym assignment must not be blocked here.
            filterChain.doFilter(request, response);
            return;
        }

        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserDetailsImpl) {
                UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
                boolean isAdmin = userDetails.getAuthorities().stream()
                        .map(GrantedAuthority::getAuthority)
                        .anyMatch(a -> a.equals("ROLE_ADMIN") || a.equals("ROLE_SUPER_ADMIN"));
                String branchHeader = request.getHeader(BRANCH_HEADER);

                if (branchHeader != null && !branchHeader.isBlank()) {
                    Long branchId;
                    try {
                        branchId = Long.parseLong(branchHeader.trim());
                    } catch (NumberFormatException e) {
                        response.sendError(HttpServletResponse.SC_BAD_REQUEST,
                                "Invalid " + BRANCH_HEADER + " header");
                        return;
                    }

                    if (isAdmin || userBranchRepository.existsByUserIdAndBranchId(userDetails.getId(), branchId)) {
                        BranchContextHolder.setActiveBranchId(branchId);
                    } else {
                        response.sendError(HttpServletResponse.SC_FORBIDDEN,
                                "You do not have access to the requested branch");
                        return;
                    }
                } else if (isAdmin) {
                    // No header, admin — consolidated "All Branches" view.
                    BranchContextHolder.setActiveBranchId(null);
                } else {
                    // No header, non-admin — never fall back to "All Branches".
                    // Resolve unambiguously to the user's own assigned branch.
                    List<Long> accessibleBranchIds = userBranchRepository.findBranchIdsByUserId(userDetails.getId());
                    if (accessibleBranchIds.size() == 1) {
                        BranchContextHolder.setActiveBranchId(accessibleBranchIds.get(0));
                    } else if (accessibleBranchIds.isEmpty()) {
                        response.sendError(HttpServletResponse.SC_FORBIDDEN,
                                "No branch is assigned to this user");
                        return;
                    } else {
                        response.sendError(HttpServletResponse.SC_BAD_REQUEST,
                                BRANCH_HEADER + " header is required when a user has access to multiple branches");
                        return;
                    }
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            BranchContextHolder.clear();
        }
    }
}
