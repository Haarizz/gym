package com.company.project.controllers;

import com.company.project.dto.MobileProfileDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MobileProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mobile/profile")
public class MobileProfileController {

    private final MobileProfileService mobileProfileService;

    public MobileProfileController(MobileProfileService mobileProfileService) {
        this.mobileProfileService = mobileProfileService;
    }

    @GetMapping("/me")
    public ResponseEntity<MobileProfileDTO> getMyProfile(@AuthenticationPrincipal UserDetailsImpl principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(mobileProfileService.getProfileByUserId(principal.getId()));
    }

    @PutMapping("/me")
    public ResponseEntity<MobileProfileDTO> updateMyProfile(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody MobileProfileDTO request) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(mobileProfileService.updateProfile(principal.getId(), request));
    }
}
