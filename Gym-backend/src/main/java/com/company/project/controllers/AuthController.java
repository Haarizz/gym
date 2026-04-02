package com.company.project.controllers;

import com.company.project.dto.AuthRequestDTO;
import com.company.project.dto.AuthResponseDTO;
import com.company.project.dto.RegisterRequestDTO;
import com.company.project.services.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequestDTO request) {
        try {
            authService.register(request);
            return ResponseEntity.ok("User registered successfully!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponseDTO> login(@RequestBody AuthRequestDTO request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * GET /api/auth/me
     * Returns the current authenticated user's profile (role, userId, enabled).
     * Used by the mobile app after login to fetch and store the session profile.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            return ResponseEntity.ok(authService.getCurrentUser());
        } catch (Exception e) {
            return ResponseEntity.status(401).body(e.getMessage());
        }
    }

    /**
     * GET /api/auth/check-username?username=xxx
     * Returns { "available": true/false } — used by the admin frontend before creating credentials.
     */
    @GetMapping("/check-username")
    public ResponseEntity<java.util.Map<String, Boolean>> checkUsername(@RequestParam String username) {
        boolean available = !authService.usernameExists(username);
        return ResponseEntity.ok(java.util.Map.of("available", available));
    }
}
