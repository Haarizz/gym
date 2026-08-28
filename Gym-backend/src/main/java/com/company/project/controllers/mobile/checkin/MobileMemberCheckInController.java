package com.company.project.controllers.mobile.checkin;

import com.company.project.dto.mobile.checkin.MemberCheckInResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckInStatusResponseDTO;
import com.company.project.dto.mobile.checkin.MemberCheckOutResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.checkin.MobileMemberCheckInService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/member")
public class MobileMemberCheckInController {

    private final MobileMemberCheckInService checkInService;

    public MobileMemberCheckInController(MobileMemberCheckInService checkInService) {
        this.checkInService = checkInService;
    }

    /**
     * Read current check-in status for the authenticated member.
     *
     * GET /api/mobile/member/check-in/status
     */
    @GetMapping("/check-in/status")
    public ResponseEntity<MemberCheckInStatusResponseDTO> getCheckInStatus(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(checkInService.getCheckInStatus(principal));
    }

    /**
     * Check in the authenticated member.
     *
     * POST /api/mobile/member/check-in
     */
    @PostMapping("/check-in")
    public ResponseEntity<MemberCheckInResponseDTO> checkIn(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(checkInService.checkIn(principal));
    }

    /**
     * Check out the authenticated member.
     *
     * POST /api/mobile/member/check-out
     */
    @PostMapping("/check-out")
    public ResponseEntity<MemberCheckOutResponseDTO> checkOut(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(checkInService.checkOut(principal));
    }
}
