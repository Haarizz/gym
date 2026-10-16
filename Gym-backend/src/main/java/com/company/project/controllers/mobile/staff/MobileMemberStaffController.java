package com.company.project.controllers.mobile.staff;

import com.company.project.dto.mobile.staff.MemberStaffCardDTO;
import com.company.project.dto.mobile.staff.MemberStaffProfileDTO;
import com.company.project.dto.mobile.staff.RateStaffRequestDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.staff.MobileMemberStaffService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** The member app's Staff & Trainers screens: the staff of the member's branch and rating them. */
@RestController
@RequestMapping("/api/mobile/member/staff")
public class MobileMemberStaffController {

    private final MobileMemberStaffService staffService;

    public MobileMemberStaffController(MobileMemberStaffService staffService) {
        this.staffService = staffService;
    }

    @GetMapping
    public ResponseEntity<List<MemberStaffCardDTO>> getTeam(@AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(staffService.getTeam(principal));
    }

    @GetMapping("/{staffId}")
    public ResponseEntity<MemberStaffProfileDTO> getProfile(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long staffId) {
        return ResponseEntity.ok(staffService.getProfile(principal, staffId));
    }

    /** Body: { "rating": 1-5, "tags": ["motivating"], "comment": "...", "anonymous": false } — replaces any earlier rating. */
    @PutMapping("/{staffId}/rating")
    public ResponseEntity<MemberStaffProfileDTO> rate(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @PathVariable Long staffId,
            @RequestBody RateStaffRequestDTO request) {
        return ResponseEntity.ok(staffService.rate(principal, staffId, request));
    }
}
