package com.company.project.controllers.mobile.auth;

import com.company.project.dto.AuthResponseDTO;
import com.company.project.dto.mobile.auth.MobileRegisterInitiatedResponseDTO;
import com.company.project.dto.mobile.auth.MobileRegisterRequestDTO;
import com.company.project.dto.mobile.auth.MobileRegistrationStatusResponseDTO;
import com.company.project.dto.mobile.auth.MobileResendOtpResponseDTO;
import com.company.project.dto.mobile.auth.MobileVerifyOtpRequestDTO;
import com.company.project.services.mobile.auth.MobilePendingRegistrationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Email-OTP-verified mobile registration. Submitting the form no longer
 * creates an account or a session directly — it creates a pending registration
 * and an OTP (see MobilePendingRegistrationService). A User/JWT is only ever
 * created by a successful /verify-otp call. Error handling is centralized in
 * GlobalExceptionHandler; this controller has no try/catch of its own.
 */
@RestController
@RequestMapping("/api/mobile/auth")
public class MobileAuthController {

    private final MobilePendingRegistrationService pendingRegistrationService;

    public MobileAuthController(MobilePendingRegistrationService pendingRegistrationService) {
        this.pendingRegistrationService = pendingRegistrationService;
    }

    @PostMapping("/register")
    public ResponseEntity<MobileRegisterInitiatedResponseDTO> register(@RequestBody MobileRegisterRequestDTO request) {
        return ResponseEntity.ok(pendingRegistrationService.initiateRegistration(request));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<AuthResponseDTO> verifyOtp(
            @RequestHeader("X-Registration-Token") String registrationToken,
            @RequestBody MobileVerifyOtpRequestDTO request) {
        return ResponseEntity.ok(pendingRegistrationService.verifyOtp(registrationToken, request.getOtp()));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<MobileResendOtpResponseDTO> resendOtp(
            @RequestHeader("X-Registration-Token") String registrationToken) {
        return ResponseEntity.ok(pendingRegistrationService.resendOtp(registrationToken));
    }

    @GetMapping("/registration-status")
    public ResponseEntity<MobileRegistrationStatusResponseDTO> registrationStatus(
            @RequestHeader("X-Registration-Token") String registrationToken) {
        return ResponseEntity.ok(pendingRegistrationService.getStatus(registrationToken));
    }
}
