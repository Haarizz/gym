package com.company.project.services;

import com.company.project.dto.AuthRequestDTO;
import com.company.project.dto.AuthResponseDTO;
import com.company.project.dto.RegisterRequestDTO;
import com.company.project.entities.Role;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.StaffRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserRoleRepository;
import com.company.project.security.JwtService;
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
            com.company.project.repositories.BranchRepository branchRepository
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
        this.branchRepository = branchRepository;
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
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();

        String jwt = jwtService.generateToken(userDetails);
        List<String> roles = extractRoles(userDetails);

        List<com.company.project.dto.BranchResponseDTO> accessibleBranches = fetchAccessibleBranches(userDetails);
        Long defaultBranchId = accessibleBranches.stream()
                .filter(com.company.project.dto.BranchResponseDTO::isDefault)
                .map(com.company.project.dto.BranchResponseDTO::getId)
                .findFirst()
                .orElse(accessibleBranches.isEmpty() ? null : accessibleBranches.get(0).getId());

        return AuthResponseDTO.builder()
                .token(jwt)
                .username(userDetails.getUsername())
                .roles(roles)
                .userId(userDetails.getId())
                .enabled(userDetails.isEnabled())
                .roleName(roles.stream().findFirst().orElse(null))
                .staffName(staffRepository.findByUserId(userDetails.getId())
                        .map(com.company.project.entities.Staff::getName)
                        .orElse(null))
                .permissions(extractPermissions(userDetails))
                .accessibleBranches(accessibleBranches)
                .defaultBranchId(defaultBranchId)
                .build();
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

        return AuthResponseDTO.builder()
                .username(userDetails.getUsername())
                .roles(roles)
                .userId(userDetails.getId())
                .enabled(userDetails.isEnabled())
                .roleName(roles.stream().findFirst().orElse(null))
                .staffName(staffRepository.findByUserId(userDetails.getId())
                        .map(com.company.project.entities.Staff::getName)
                        .orElse(null))
                .permissions(extractPermissions(userDetails))
                .accessibleBranches(accessibleBranches)
                .defaultBranchId(defaultBranchId)
                .build();
    }

    private List<com.company.project.dto.BranchResponseDTO> fetchAccessibleBranches(UserDetailsImpl userDetails) {
        boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SUPER_ADMIN"));
        
        List<com.company.project.entities.Branch> branches;
        if (isAdmin) {
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
