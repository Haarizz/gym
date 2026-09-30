package com.company.project.controllers.mobile.membership;

import com.company.project.dto.mobile.membership.MobileMemberFreezeRequestDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.MembershipFreezeService;
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
    public ResponseEntity<Map<String, Object>> freezeMembership(
            @RequestBody MobileMemberFreezeRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        MembershipFreezeService.FreezeResult result = freezeService.freezeMembership(request, principal);
        // Map keys aren't renamed by the SNAKE_CASE naming strategy, so they're written snake_case here.
        return ResponseEntity.ok(Map.of(
                "message", "Membership frozen successfully",
                "freeze_start", result.freezeStart().toString(),
                "freeze_end", result.freezeEnd().toString(),
                "days", result.days(),
                "free_days_applied", result.freeDaysApplied(),
                "charged_days", result.chargedDays(),
                "charge_amount", result.chargeAmount()));
    }

    @PostMapping("/unfreeze")
    public ResponseEntity<Map<String, String>> unfreezeMembership(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        freezeService.unfreezeMembership(principal);
        return ResponseEntity.ok(Map.of("message", "Membership unfrozen successfully"));
    }
}
