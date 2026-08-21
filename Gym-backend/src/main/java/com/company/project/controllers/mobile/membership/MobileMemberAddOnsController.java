package com.company.project.controllers.mobile.membership;

import com.company.project.dto.mobile.membership.MobileAddOnsResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.membership.MobileMemberAddOnsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/mobile/member/add-ons")
public class MobileMemberAddOnsController {

    private final MobileMemberAddOnsService addOnsService;

    public MobileMemberAddOnsController(MobileMemberAddOnsService addOnsService) {
        this.addOnsService = addOnsService;
    }

    @GetMapping
    public ResponseEntity<MobileAddOnsResponseDTO> getAddOns(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(addOnsService.getAddOns(principal, page, limit));
    }

    @org.springframework.web.bind.annotation.PostMapping("/{addonId}/purchase")
    public ResponseEntity<com.company.project.dto.mobile.membership.MobileActiveAddOnDTO> purchaseAddOn(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @org.springframework.web.bind.annotation.PathVariable Long addonId,
            @org.springframework.web.bind.annotation.RequestBody com.company.project.dto.mobile.membership.MobileAddOnPurchaseRequestDTO request) {
        return ResponseEntity.ok(addOnsService.purchaseAddOn(principal, addonId, request));
    }
}
