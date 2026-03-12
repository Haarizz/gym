package com.company.project.services;

import com.company.project.dto.AuthRequestDTO;
import com.company.project.dto.AuthResponseDTO;
import com.company.project.dto.RegisterRequestDTO;
import com.company.project.entities.Role;
import com.company.project.entities.User;
import com.company.project.entities.UserRole;
import com.company.project.repositories.RoleRepository;
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

    public AuthService(
            UserRepository userRepository,
            RoleRepository roleRepository,
            UserRoleRepository userRoleRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            AuthenticationManager authenticationManager
    ) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
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

        List<String> roles = userDetails.getAuthorities().stream()
                .map(item -> item.getAuthority().replace("ROLE_", ""))
                .collect(Collectors.toList());

        return AuthResponseDTO.builder()
                .token(jwt)
                .username(userDetails.getUsername())
                .roles(roles)
                .build();
    }
}
