package com.company.project.controllers.mobile.profile;

import com.company.project.dto.StaffResponseDTO;
import com.company.project.dto.mobile.profile.MobileProfileDTO;
import com.company.project.dto.mobile.profile.MobileStaffContactUpdateDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.StaffService;
import com.company.project.services.mobile.profile.MemberPhotoSyncService;
import com.company.project.services.mobile.profile.MobileProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/mobile/profile")
public class MobileProfileController {

    private final MobileProfileService mobileProfileService;
    private final StaffService staffService;
    private final MemberPhotoSyncService memberPhotoSyncService;

    public MobileProfileController(MobileProfileService mobileProfileService, StaffService staffService,
                                   MemberPhotoSyncService memberPhotoSyncService) {
        this.mobileProfileService = mobileProfileService;
        this.staffService = staffService;
        this.memberPhotoSyncService = memberPhotoSyncService;
    }

    @GetMapping("/me")
    public ResponseEntity<MobileProfileDTO> getMyProfile(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestHeader(value = "X-Tenant-ID", required = false) String tenantSlug) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        MobileProfileDTO profile = mobileProfileService.getProfileByUserId(principal.getId());
        // BG_82: heal members created before the photo was copied at purchase time —
        // fills the selected gym's photo only when it has none.
        if (principal.isGlobal()) {
            memberPhotoSyncService.syncToGym(principal.getId(), tenantSlug, profile.getPhotoUrl(), true);
        }
        return ResponseEntity.ok(profile);
    }

    @PutMapping("/me")
    public ResponseEntity<MobileProfileDTO> updateMyProfile(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestHeader(value = "X-Tenant-ID", required = false) String tenantSlug,
            @RequestBody MobileProfileDTO request) {
        if (principal == null) {
            return ResponseEntity.status(401).build();
        }
        MobileProfileDTO updated = mobileProfileService.updateProfile(principal.getId(), request);
        // BG_82: a new photo also shows in the Member Directory of every gym they belong to.
        if (principal.isGlobal() && request.getPhotoUrl() != null) {
            memberPhotoSyncService.syncToAllGyms(principal.getId(), tenantSlug, updated.getPhotoUrl());
        }
        return ResponseEntity.ok(updated);
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
