package com.company.project.controllers.mobile.membership;

import com.company.project.dto.mobile.membership.MembershipChangePreviewRequestDTO;
import com.company.project.dto.mobile.membership.MembershipChangePreviewResponseDTO;
import com.company.project.dto.mobile.membership.MembershipChangeRequestDTO;
import com.company.project.dto.mobile.membership.MobileMembershipPlanDTO;
import com.company.project.dto.mobile.membership.MobileMembershipPlanPageDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.membership.MobileMemberMembershipChangeService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mobile/member/membership")
public class MobileMemberMembershipChangeController {

    private final MobileMemberMembershipChangeService membershipChangeService;

    public MobileMemberMembershipChangeController(MobileMemberMembershipChangeService membershipChangeService) {
        this.membershipChangeService = membershipChangeService;
    }

    @GetMapping("/plans")
    public ResponseEntity<MobileMembershipPlanPageDTO> getPlans(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(membershipChangeService.getPlans(page, limit, search));
    }

    @PostMapping("/change/preview")
    public ResponseEntity<MembershipChangePreviewResponseDTO> previewChange(
            @RequestBody MembershipChangePreviewRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(membershipChangeService.previewChange(request, principal));
    }

    @PostMapping("/change")
    public ResponseEntity<Map<String, String>> changePlan(
            @RequestBody MembershipChangeRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        membershipChangeService.changePlan(request, principal);
        return ResponseEntity.ok(Map.of("message", "Membership plan changed successfully"));
    }
}
