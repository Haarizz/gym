package com.company.project.controllers.mobile.auth;

import com.company.project.dto.AuthResponseDTO;
import com.company.project.dto.mobile.auth.MobileAppleAuthRequestDTO;
import com.company.project.dto.mobile.auth.MobileGoogleAuthRequestDTO;
import com.company.project.dto.mobile.auth.MobileLinkProviderRequestDTO;
import com.company.project.dto.mobile.auth.MobileLinkProviderResponseDTO;
import com.company.project.dto.mobile.auth.MobileSocialAuthResponseDTO;
import com.company.project.dto.mobile.auth.MobileSocialCompleteRequestDTO;
import com.company.project.exceptions.OtpException;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.auth.MobileSocialAuthService;
import com.company.project.services.mobile.auth.MobileSocialRateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Google/Apple sign-in for GymBios Mobile. Mirrors MobileAuthController's
 * conventions (thin controller, no try/catch — GlobalExceptionHandler maps
 * every exception centrally) but never issues an OTP: a validated provider
 * token is the authentication event.
 */
@RestController
@RequestMapping("/api/mobile/auth")
public class MobileSocialAuthController {

    private final MobileSocialAuthService socialAuthService;
    private final MobileSocialRateLimiter rateLimiter;

    public MobileSocialAuthController(MobileSocialAuthService socialAuthService, MobileSocialRateLimiter rateLimiter) {
        this.socialAuthService = socialAuthService;
        this.rateLimiter = rateLimiter;
    }

    @PostMapping("/google")
    public ResponseEntity<MobileSocialAuthResponseDTO> google(@RequestBody MobileGoogleAuthRequestDTO request,
                                                                HttpServletRequest httpRequest) {
        checkRateLimit(httpRequest);
        return ResponseEntity.ok(socialAuthService.authenticateWithGoogle(request.getIdToken()));
    }

    @PostMapping("/google/complete")
    public ResponseEntity<AuthResponseDTO> googleComplete(
            @RequestHeader("X-Social-Registration-Token") String pendingToken,
            @RequestBody MobileSocialCompleteRequestDTO request,
            HttpServletRequest httpRequest) {
        checkRateLimit(httpRequest);
        return ResponseEntity.ok(socialAuthService.completeRegistration(
                "GOOGLE", pendingToken, request.getUsername(), request.getFullName()));
    }

    @PostMapping("/apple")
    public ResponseEntity<MobileSocialAuthResponseDTO> apple(@RequestBody MobileAppleAuthRequestDTO request,
                                                               HttpServletRequest httpRequest) {
        checkRateLimit(httpRequest);
        String userHintFullName = request.getUser() != null ? request.getUser().getFullName() : null;
        return ResponseEntity.ok(socialAuthService.authenticateWithApple(request.getIdentityToken(), userHintFullName));
    }

    @PostMapping("/apple/complete")
    public ResponseEntity<AuthResponseDTO> appleComplete(
            @RequestHeader("X-Social-Registration-Token") String pendingToken,
            @RequestBody MobileSocialCompleteRequestDTO request,
            HttpServletRequest httpRequest) {
        checkRateLimit(httpRequest);
        return ResponseEntity.ok(socialAuthService.completeRegistration(
                "APPLE", pendingToken, request.getUsername(), request.getFullName()));
    }

    @PostMapping("/{provider}/link")
    public ResponseEntity<MobileLinkProviderResponseDTO> link(
            @PathVariable String provider,
            @RequestBody MobileLinkProviderRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal,
            HttpServletRequest httpRequest) {
        String bearerRawJwt = extractBearerToken(httpRequest);
        return ResponseEntity.ok(socialAuthService.linkProvider(
                principal.getId(), provider.toUpperCase(), request.getToken(), bearerRawJwt));
    }

    private void checkRateLimit(HttpServletRequest request) {
        if (!rateLimiter.tryAcquire(clientIp(request))) {
            throw new OtpException(HttpStatus.TOO_MANY_REQUESTS, "RATE_LIMITED",
                    "Too many attempts. Please wait and try again.");
        }
    }

    private String clientIp(HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        if (forwardedFor != null && !forwardedFor.isBlank()) {
            return forwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String extractBearerToken(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            throw new OtpException(HttpStatus.UNAUTHORIZED, "REAUTH_REQUIRED", "Please sign in again to link this account.");
        }
        return authHeader.substring(7);
    }
}
