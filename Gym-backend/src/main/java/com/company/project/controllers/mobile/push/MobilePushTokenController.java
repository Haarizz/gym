package com.company.project.controllers.mobile.push;

import com.company.project.dto.mobile.push.MobilePushTokenRequestDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.push.MobilePushTokenService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mobile/member/push-tokens")
public class MobilePushTokenController {

    private final MobilePushTokenService pushTokenService;

    public MobilePushTokenController(MobilePushTokenService pushTokenService) {
        this.pushTokenService = pushTokenService;
    }

    @PutMapping
    public ResponseEntity<Void> register(
            @RequestBody @Valid MobilePushTokenRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        pushTokenService.register(principal, request);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping
    public ResponseEntity<Void> unregister(
            @RequestBody @Valid MobilePushTokenRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        pushTokenService.unregister(principal, request.getExpoPushToken());
        return ResponseEntity.noContent().build();
    }
}
