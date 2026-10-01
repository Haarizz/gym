package com.company.project.controllers.mobile.profile;

import com.company.project.dto.StaffResponseDTO;
import com.company.project.dto.mobile.profile.MobileProfileDTO;
import com.company.project.dto.mobile.profile.MobileStaffContactUpdateDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.StaffService;
import com.company.project.services.mobile.profile.MobileProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mobile/profile")
public class MobileProfileController {

    private final MobileProfileService mobileProfileService;
    private final StaffService staffService;

    public MobileProfileController(MobileProfileService mobileProfileService, StaffService staffService) {
        this.mobileProfileService = mobileProfileService;
        this.staffService = staffService;
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

    /**
     * The employee record (as entered on the admin Staffs & Trainers page) linked to the
     * logged-in staff/trainer account. 404 when the account has no staff record, e.g. a
     * gym owner login that was never added as an employee.
     */
    @GetMapping("/staff/me")
    public ResponseEntity<StaffResponseDTO> getMyStaffProfile(@AuthenticationPrincipal UserDetailsImpl principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            return ResponseEntity.ok(staffService.getStaffByUserId(principal.getId()));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PutMapping("/staff/me")
    public ResponseEntity<StaffResponseDTO> updateMyStaffContact(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestBody MobileStaffContactUpdateDTO request) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        try {
            return ResponseEntity.ok(staffService.updateMyContact(principal.getId(), request.getPhone(), request.getAddress()));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/transactions")
    public ResponseEntity<com.company.project.dto.mobile.profile.MobileProfileTransactionsDTO> getMyTransactions(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.ok(mobileProfileService.getTransactions(principal));
    }
}
