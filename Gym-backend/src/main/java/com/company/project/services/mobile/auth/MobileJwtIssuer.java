package com.company.project.services.mobile.auth;

import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.dto.AuthResponseDTO;
import com.company.project.entities.User;
import com.company.project.security.JwtService;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.RoleService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Issues a member JWT for an account that was just created by OTP verification —
 * without a password check, since OTP possession already served as the
 * authentication event. AuthService.login() can't be reused directly here: it
 * requires a plaintext password, which /verify-otp never receives (only the
 * OTP). This mirrors login()'s post-authentication claim/response logic for the
 * "brand-new global mobile member" case specifically (no branches, no staff
 * record, profile not yet completed — all true by construction for a row that
 * was created moments ago), without modifying AuthService.java itself.
 */
@Service
public class MobileJwtIssuer {

    private final JwtService jwtService;
    private final RoleService roleService;
    private final UserDirectoryRepository userDirectoryRepository;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    public MobileJwtIssuer(JwtService jwtService, RoleService roleService, UserDirectoryRepository userDirectoryRepository) {
        this.jwtService = jwtService;
        this.roleService = roleService;
        this.userDirectoryRepository = userDirectoryRepository;
    }

    public AuthResponseDTO issueForNewMember(User user, String fullName) {
        List<String> permissionKeys = roleService.getEffectivePermissionKeysForRoleNames(List.of("MEMBER"));
        UserDetailsImpl userDetails = UserDetailsImpl.build(user, permissionKeys);

        // Mirrors AuthService.login()'s isGlobalUser derivation: a fresh mobile
        // member never has a control-plane user_directory entry (that's only for
        // tenant-DB-resident staff/owner accounts), so this evaluates the same way
        // it would if this same user logged in normally right after verifying.
        boolean hasDirectoryEntry = userDirectoryRepository
                .findByUsernameOrEmail(user.getUsername(), user.getUsername())
                .isPresent();
        boolean isGlobalUser = tenantRoutingEnabled && !hasDirectoryEntry;

        Map<String, Object> extraClaims = new HashMap<>();
        if (isGlobalUser) {
            extraClaims.put(JwtService.IS_GLOBAL_CLAIM, true);
            userDetails.setGlobal(true);
        }

        String jwt = jwtService.generateToken(extraClaims, userDetails);

        List<String> roles = userDetails.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(a -> a.startsWith("ROLE_"))
                .map(a -> a.replace("ROLE_", ""))
                .collect(Collectors.toList());

        List<String> permissions = userDetails.getAuthorities().stream()
                .map(a -> a.getAuthority())
                .filter(a -> !a.startsWith("ROLE_"))
                .collect(Collectors.toList());

        return AuthResponseDTO.builder()
                .token(jwt)
                .username(user.getUsername())
                .roles(roles)
                .userId(user.getId())
                .enabled(user.isEnabled())
                .roleName(roles.stream().findFirst().orElse(null))
                .staffName(null)
                .fullName(fullName)
                .gymName(null)
                .permissions(permissions)
                .accessibleBranches(List.of())
                .defaultBranchId(null)
                .profileCompleted(false)
                .build();
    }
}
