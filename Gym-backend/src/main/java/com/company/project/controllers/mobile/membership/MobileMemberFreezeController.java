package com.company.project.controllers.mobile.membership;

import com.company.project.dto.mobile.membership.MobileMemberFreezeRequestDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.membership.MobileMemberFreezeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/mobile/member/membership")
public class MobileMemberFreezeController {

    private final MobileMemberFreezeService freezeService;

    public MobileMemberFreezeController(MobileMemberFreezeService freezeService) {
        this.freezeService = freezeService;
    }

    @PostMapping("/freeze")
    public ResponseEntity<Map<String, String>> freezeMembership(
            @RequestBody MobileMemberFreezeRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        freezeService.freezeMembership(request, principal);
        return ResponseEntity.ok(Map.of("message", "Membership frozen successfully"));
    }

    @PostMapping("/unfreeze")
    public ResponseEntity<Map<String, String>> unfreezeMembership(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        freezeService.unfreezeMembership(principal);
        return ResponseEntity.ok(Map.of("message", "Membership unfrozen successfully"));
    }
}
