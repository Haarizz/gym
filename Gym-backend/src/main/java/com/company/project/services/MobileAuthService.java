package com.company.project.services;

import com.company.project.dto.MobileRegisterRequestDTO;
import com.company.project.entities.Role;
import com.company.project.entities.User;
import com.company.project.entities.UserProfile;
import com.company.project.entities.UserRole;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserProfileRepository;
import com.company.project.repositories.UserRoleRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;

@Service
public class MobileAuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserProfileRepository userProfileRepository;
    private final PasswordEncoder passwordEncoder;

    public MobileAuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            UserProfileRepository userProfileRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.userProfileRepository = userProfileRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void registerMobileUser(MobileRegisterRequestDTO request) {
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

        // Force MEMBER role
        Role memberRole = roleRepository.findByRoleName("MEMBER")
                .orElseThrow(() -> new RuntimeException("Error: Role 'MEMBER' is not found."));
        UserRole userRole = new UserRole(null, user, memberRole);
        user.getUserRoles().add(userRole);
        userRoleRepository.save(userRole);

        // Create empty UserProfile with fullName
        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setFullName(request.getFullName());
        userProfileRepository.save(profile);
    }
}
