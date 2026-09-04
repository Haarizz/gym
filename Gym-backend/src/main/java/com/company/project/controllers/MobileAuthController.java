package com.company.project.controllers;

import com.company.project.dto.AuthRequestDTO;
import com.company.project.dto.MobileRegisterRequestDTO;
import com.company.project.services.AuthService;
import com.company.project.services.MobileAuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mobile/auth")
public class MobileAuthController {

    private final MobileAuthService mobileAuthService;
    private final AuthService authService;

    public MobileAuthController(MobileAuthService mobileAuthService, AuthService authService) {
        this.mobileAuthService = mobileAuthService;
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody MobileRegisterRequestDTO request) {
        try {
            mobileAuthService.registerMobileUser(request);
            
            // Auto-login
            AuthRequestDTO loginRequest = new AuthRequestDTO();
            loginRequest.setUsername(request.getUsername());
            loginRequest.setPassword(request.getPassword());
            return ResponseEntity.ok(authService.login(loginRequest));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
