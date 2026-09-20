package com.company.project.services.mobile.auth;

import com.company.project.entities.Role;
import com.company.project.entities.User;
import com.company.project.entities.UserProfile;
import com.company.project.entities.UserRole;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserProfileRepository;
import com.company.project.repositories.UserRoleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;

@Service
public class MobileAuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final UserProfileRepository userProfileRepository;

    public MobileAuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            UserProfileRepository userProfileRepository
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.userProfileRepository = userProfileRepository;
    }

    /**
     * Creates the actual account — User + MEMBER role + empty UserProfile —
     * exactly as the old registerMobileUser() body did, but now called only from
     * inside OTP verification (MobilePendingRegistrationService.verifyOtp), never
     * directly from the registration form submission. The password is expected
     * already hashed (hashed once at pending-registration time and carried
     * through unchanged — never re-hashed, never re-collected as plaintext).
     * Username/email uniqueness is enforced by the database's existing unique
     * constraints on User (see entities/User.java); a caller-side check already
     * ran at registration-initiation, so this doesn't repeat it.
     */
    @Transactional
    public User createVerifiedMember(String fullName, String username, String email, String passwordHash) {
        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordHash);
        user.setEnabled(true);
        user.setUserRoles(new HashSet<>());

        user = userRepository.save(user);

        Role memberRole = roleRepository.findByRoleName("MEMBER")
                .orElseThrow(() -> new RuntimeException("Error: Role 'MEMBER' is not found."));
        UserRole userRole = new UserRole(null, user, memberRole);
        user.getUserRoles().add(userRole);
        userRoleRepository.save(userRole);

        UserProfile profile = new UserProfile();
        profile.setUser(user);
        profile.setFullName(fullName);
        userProfileRepository.save(profile);

        return user;
    }
}
