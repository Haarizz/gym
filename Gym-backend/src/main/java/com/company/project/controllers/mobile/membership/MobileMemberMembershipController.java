package com.company.project.controllers.mobile.membership;

import com.company.project.dto.mobile.membership.MobileMemberMembershipResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.membership.MobileMemberMembershipService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/member/membership")
public class MobileMemberMembershipController {

    private final MobileMemberMembershipService membershipService;

    public MobileMemberMembershipController(MobileMemberMembershipService membershipService) {
        this.membershipService = membershipService;
    }

    @GetMapping
    public ResponseEntity<MobileMemberMembershipResponseDTO> getMembership(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(membershipService.getMembership(principal));
    }
}
