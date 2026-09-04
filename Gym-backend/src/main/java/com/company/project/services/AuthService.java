package com.company.project.services;

import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.dto.AuthRequestDTO;
import com.company.project.dto.AuthResponseDTO;
import com.company.project.dto.RegisterRequestDTO;
import com.company.project.entities.Role;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.GymRepository;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserRoleRepository;
import com.company.project.security.JwtService;
import com.company.project.security.TenantContextHolder;
import com.company.project.security.UserDetailsImpl;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final StaffRepository staffRepository;
    private final RoleService roleService;
    private final com.company.project.repositories.UserBranchRepository userBranchRepository;
    private final com.company.project.repositories.BranchRepository branchRepository;
    private final GymRepository gymRepository;
    private final UserDirectoryRepository userDirectoryRepository;
    private final com.company.project.repositories.UserProfileRepository userProfileRepository;

    @org.springframework.beans.factory.annotation.Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager,
            StaffRepository staffRepository,
            RoleService roleService,
            com.company.project.repositories.UserBranchRepository userBranchRepository,
            com.company.project.repositories.BranchRepository branchRepository,
            GymRepository gymRepository,
            UserDirectoryRepository userDirectoryRepository,
            com.company.project.repositories.UserProfileRepository userProfileRepository
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.staffRepository = staffRepository;
        this.roleService = roleService;
        this.userBranchRepository = userBranchRepository;
        this.gymRepository = gymRepository;
        this.branchRepository = branchRepository;
        this.userDirectoryRepository = userDirectoryRepository;
        this.userProfileRepository = userProfileRepository;
    }

    @Transactional
    public void register(RegisterRequestDTO request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Error: Username is already taken!");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Error: Email is already in use!");
        }

        User user = new User();
        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setEnabled(true);
        user.setUserRoles(new HashSet<>());

        user = userRepository.save(user);

        if (request.getRoles() == null || request.getRoles().isEmpty()) {
            Role userRoleEntity = roleRepository.findByRoleName("USER")
                    .orElseThrow(() -> new RuntimeException("Error: Role 'USER' is not found."));
            UserRole userRole = new UserRole(null, user, userRoleEntity);
            userRoleRepository.save(userRole);
        } else {
            for (String roleName : request.getRoles()) {
                Role roleEntity = roleRepository.findByRoleName(roleName)
                        .orElseThrow(() -> new RuntimeException("Error: Role '" + roleName + "' is not found."));
                UserRole userRole = new UserRole(null, user, roleEntity);
                userRoleRepository.save(userRole);
            }
        }
    }

    public AuthResponseDTO login(AuthRequestDTO request) {
        // Resolve which tenant database this username/email lives in BEFORE
        // authenticating, so UserDetailsServiceImpl.loadUserByUsername (unchanged
        // itself) transparently hits the right database via TenantRoutingDataSource.
        // A user absent from the directory (GYMBIOS_ADMIN, or any account not yet
        // migrated/provisioned into its own tenant database) falls through to the
        // default/primary DataSource exactly as before this phase — no special-casing
        // needed. TenantContextHolder is only ever set here when tenant routing is
        // actually enabled; otherwise every lookup is a no-op find that's simply
        // never consulted, since TenantRoutingDataSource itself doesn't exist.
        String loginTenantSlug = tenantRoutingEnabled
                ? userDirectoryRepository.findByUsernameOrEmail(request.getUsername(), request.getUsername())
                        .map(com.company.project.controlplane.entities.UserDirectoryEntry::getTenantSlug)
                        .orElse(null)
                : null;
        if (loginTenantSlug != null) {
            TenantContextHolder.setCurrentTenant(loginTenantSlug);
        }
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );

            SecurityContextHolder.getContext().setAuthentication(authentication);
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

            // Clear any previous branch context (from an old session's JWT) so that fetching the new user's profile doesn't fail
            com.company.project.security.BranchContextHolder.clear();

            // Credentials are valid at this point — now check whether this user's own
            // gym has been deactivated by the platform owner. GYMBIOS_ADMIN owns no
            // gym, so resolveGymForUser returns null and it's never affected by this
            // check. A directory-resolved tenant slug (loginTenantSlug) is preferred
            // when present — it's already known and correct; resolveGymForUser is the
            // fallback for anyone not yet in the directory (still-primary-DB users).
            String tenantSlug = loginTenantSlug != null ? loginTenantSlug : null;
            Long gymId = resolveGymForUser(userDetails);
            if (gymId != null && !isGymActive(gymId)) {
                throw new BusinessRuleViolationException("This gym's access has been suspended. Please contact the platform administrator.");
            }
            if (tenantSlug == null && gymId != null) {
                tenantSlug = gymRepository.findById(gymId)
                        .map(com.company.project.entities.Gym::getSlug)
                        .orElse(null);
            }

            java.util.Map<String, Object> extraClaims = java.util.Map.of();
            if (tenantRoutingEnabled && tenantSlug != null) {
                extraClaims = java.util.Map.of(JwtService.TENANT_CLAIM, tenantSlug);
            }
            String jwt = jwtService.generateToken(extraClaims, userDetails);
            List<String> roles = extractRoles(userDetails);

            List<com.company.project.dto.BranchResponseDTO> accessibleBranches = fetchAccessibleBranches(userDetails);
            Long defaultBranchId = accessibleBranches.stream()
                    .filter(com.company.project.dto.BranchResponseDTO::isDefault)
                    .map(com.company.project.dto.BranchResponseDTO::getId)
                    .findFirst()
                    .orElse(accessibleBranches.isEmpty() ? null : accessibleBranches.get(0).getId());

            String staffName = staffRepository.findByUserId(userDetails.getId())
                    .map(com.company.project.entities.Staff::getName)
                    .orElse(null);
            return AuthResponseDTO.builder()
                    .token(jwt)
                    .username(userDetails.getUsername())
                    .roles(roles)
                    .userId(userDetails.getId())
                    .enabled(userDetails.isEnabled())
                    .roleName(roles.stream().findFirst().orElse(null))
                    .staffName(staffName)
                    .gymName(staffName == null ? resolveGymNameForDisplay() : null)
                    .permissions(extractPermissions(userDetails))
                    .accessibleBranches(accessibleBranches)
                    .defaultBranchId(defaultBranchId)
                    .profileCompleted(deriveProfileCompleted(userDetails.getId()))
                    .build();
        } finally {
            // Only ever set above when loginTenantSlug != null — always safe to clear
            // unconditionally, matching TenantContextFilter's own finally-clear pattern.
            TenantContextHolder.clear();
        }
    }

    public boolean usernameExists(String username) {
        return userRepository.existsByUsername(username);
    }

    public AuthResponseDTO getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal().equals("anonymousUser")) {
            throw new RuntimeException("Not authenticated");
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        List<String> roles = extractRoles(userDetails);
        List<com.company.project.dto.BranchResponseDTO> accessibleBranches = fetchAccessibleBranches(userDetails);
        Long defaultBranchId = accessibleBranches.stream()
                .filter(com.company.project.dto.BranchResponseDTO::isDefault)
                .map(com.company.project.dto.BranchResponseDTO::getId)
                .findFirst()
                .orElse(accessibleBranches.isEmpty() ? null : accessibleBranches.get(0).getId());

        String staffName = staffRepository.findByUserId(userDetails.getId())
                .map(com.company.project.entities.Staff::getName)
                .orElse(null);
        return AuthResponseDTO.builder()
                .username(userDetails.getUsername())
                .roles(roles)
                .userId(userDetails.getId())
                .enabled(userDetails.isEnabled())
                .roleName(roles.stream().findFirst().orElse(null))
                .staffName(staffName)
                .gymName(staffName == null ? resolveGymNameForDisplay() : null)
                .permissions(extractPermissions(userDetails))
                .accessibleBranches(accessibleBranches)
                .defaultBranchId(defaultBranchId)
                .profileCompleted(deriveProfileCompleted(userDetails.getId()))
                .build();
    }

    /**
     * A gym owner has no Staff record (only actual employees do), so the sidebar's
     * display name previously fell back to their raw login username/email —
     * confirmed live: "powergym@gmail.com" shown instead of any real name. The
     * gym's own name is a much better label for its owner than their login email,
     * and is always available. Reads gymRepository.findByIsDefaultTrue() — under
     * tenant routing, the request is already routed to the correct tenant database
     * at this point (TenantContextFilter/JwtAuthenticationFilter both run before
     * this), so this is already scoped to the current gym without any extra lookup.
     * Returns null (no override) if this account isn't a gym owner at all (e.g.
     * GYMBIOS_ADMIN, or a non-owner staff member who already has a real staffName).
     */
    private String resolveGymNameForDisplay() {
        try {
            // Under tenant routing, the currently-routed database holds exactly one
            // gym, regardless of its is_default flag — confirmed live: Test Gym's own
            // database has is_default=false on its sole gym row (a leftover from how
            // Phase 4's migration copied it, unlike a freshly-provisioned tenant like
            // Power Gym, which gets is_default=true from the provisioning bootstrap).
            // findByIsDefaultTrue() alone silently returned null for Test Gym's owner
            // because of this — take the one-and-only row directly instead. Only the
            // PRIMARY database (no tenant routed — GYMBIOS_ADMIN, or a not-yet-
            // migrated gym) can legitimately hold more than one gym, where is_default
            // remains the correct, necessary filter.
            if (com.company.project.security.TenantContextHolder.getCurrentTenant() != null) {
                List<com.company.project.entities.Gym> tenantGyms = gymRepository.findAll();
                return tenantGyms.size() == 1 ? tenantGyms.get(0).getName() : null;
            }
            return gymRepository.findByIsDefaultTrue()
                    .map(com.company.project.entities.Gym::getName)
                    .orElse(null);
        } catch (Exception e) {
            return null;
        }
    }

    private Boolean deriveProfileCompleted(Long userId) {
        return userProfileRepository.findByUserId(userId)
                .map(com.company.project.entities.UserProfile::isProfileCompleted)
                .orElse(false);
    }

    private List<com.company.project.dto.BranchResponseDTO> fetchAccessibleBranches(UserDetailsImpl userDetails) {
        boolean isSuperAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        boolean isGymOwnerAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        List<com.company.project.entities.Branch> branches;
        if (isSuperAdmin || isGymOwnerAdmin) {
            // A gym-owner ADMIN's "All Branches" is every branch in the database this
            // request is routed to — which, once each gym has its own dedicated
            // database, is definitionally always just that one gym's own branches.
            // Previously this filtered by gymId (via resolveGymForUser's branch
            // lookup); that filtering is now redundant now that gym_id itself has
            // been retired (see Branch entity/BranchRepository — Phase 5 cutover).
            branches = branchRepository.findByStatus("ACTIVE");
        } else {
            List<Long> branchIds = userBranchRepository.findBranchIdsByUserId(userDetails.getId());
            branches = branchRepository.findByIdIn(branchIds).stream()
                    .filter(b -> "ACTIVE".equals(b.getStatus()))
                    .collect(Collectors.toList());
        }
        
        return branches.stream().map(b -> {
            com.company.project.dto.BranchResponseDTO dto = new com.company.project.dto.BranchResponseDTO();
            dto.setId(b.getId());
            dto.setBranchName(b.getBranchName());
            dto.setBranchCode(b.getBranchCode());
            dto.setDefault(b.isDefault());
            return dto;
        }).collect(Collectors.toList());
    }

    /**
     * Resolves the gym a logging-in user belongs to, so login() can check whether
     * that gym has been deactivated. Only the owner path (gyms.owner_user_id)
     * remains — the branch-based fallback (walking a user's branches to their
     * gym_id) was retired in Phase 5's cutover along with Branch.gymId itself: once
     * each gym has its own dedicated database, every branch a non-owner staff
     * member can see already belongs to the one gym in that database, so there is
     * nothing left to resolve for them here. Returns null for a user who owns no
     * gym at all (GYMBIOS_ADMIN, or a non-owner staff account — never affected by
     * the gym-suspension check this feeds).
     */
    private Long resolveGymForUser(UserDetailsImpl userDetails) {
        return gymRepository.findByOwnerUserId(userDetails.getId())
                .map(com.company.project.entities.Gym::getId)
                .orElse(null);
    }

    private boolean isGymActive(Long gymId) {
        return gymRepository.findById(gymId)
                .map(g -> "ACTIVE".equalsIgnoreCase(g.getStatus()))
                .orElse(true);
    }

    private List<String> extractRoles(UserDetailsImpl userDetails) {
        return userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> authority.replace("ROLE_", ""))
                .collect(Collectors.toList());
    }

    private List<String> extractPermissions(UserDetailsImpl userDetails) {
        return userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority())
                .filter(authority -> !authority.startsWith("ROLE_"))
                .collect(Collectors.toList());
    }

    @Transactional
    public void changePassword(String currentPassword, String newPassword) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getPrincipal().equals("anonymousUser")) {
            throw new RuntimeException("Not authenticated");
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new RuntimeException("Current password is incorrect");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new RuntimeException("New password must be at least 8 characters");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }
}
