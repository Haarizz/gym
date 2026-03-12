package com.company.project.config;

import com.company.project.entities.Role;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.repositories.RoleRepository;
import com.company.project.repositories.UserRepository;
import com.company.project.repositories.UserRoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final PasswordEncoder passwordEncoder;

    public DataInitializer(
            RoleRepository roleRepository,
            UserRepository userRepository,
            UserRoleRepository userRoleRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.roleRepository = roleRepository;
        this.userRepository = userRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // Seed Roles
        List<String> rolesToSeed = List.of("ADMIN", "MANAGER", "USER", "ACCOUNTANT", "HR");
        for (String roleName : rolesToSeed) {
            if (roleRepository.findByRoleName(roleName).isEmpty()) {
                Role role = new Role();
                role.setRoleName(roleName);
                roleRepository.save(role);
            }
        }

        // Seed Admin User
        if (!userRepository.existsByEmail("admin@gymbios.com")) {
            User admin = new User();
            admin.setUsername("admin");
            admin.setEmail("admin@gymbios.com");
            admin.setPasswordHash(passwordEncoder.encode("admin123"));
            admin.setEnabled(true);
            admin.setUserRoles(new HashSet<>());
            admin = userRepository.save(admin);

            Role adminRole = roleRepository.findByRoleName("ADMIN")
                    .orElseThrow(() -> new RuntimeException("Admin role not found"));
            
            UserRole userRole = new UserRole(null, admin, adminRole);
            userRoleRepository.save(userRole);
        }
    }
}
