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

/**
 * Reads the {@code X-Active-Branch-Id} header from every authenticated request,
 * validates the user has access to that branch, and populates
 * {@link BranchContextHolder} so services can scope their queries.
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
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();

            if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserDetailsImpl) {
                UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
                String branchHeader = request.getHeader(BRANCH_HEADER);

                if (branchHeader != null && !branchHeader.isBlank()) {
                    try {
                        Long branchId = Long.parseLong(branchHeader.trim());
                        // Admin/Super Admin users can access any branch
                        boolean isAdmin = userDetails.getAuthorities().stream()
                                .map(GrantedAuthority::getAuthority)
                                .anyMatch(a -> a.equals("ROLE_ADMIN") || a.equals("ROLE_SUPER_ADMIN"));

                        if (isAdmin || userBranchRepository.existsByUserIdAndBranchId(userDetails.getId(), branchId)) {
                            BranchContextHolder.setActiveBranchId(branchId);
                        } else {
                            // User doesn't have access to this branch — treat as null (will be caught by service layer)
                            BranchContextHolder.setActiveBranchId(null);
                        }
                    } catch (NumberFormatException e) {
                        // Invalid header value — treat as "All Branches"
                        BranchContextHolder.setActiveBranchId(null);
                    }
                } else {
                    // No header = "All Branches" mode
                    BranchContextHolder.setActiveBranchId(null);
                }
            }

            filterChain.doFilter(request, response);
        } finally {
            BranchContextHolder.clear();
        }
    }
}
