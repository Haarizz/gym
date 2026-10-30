package com.company.project.controllers.mobile.membership;

import com.company.project.dto.mobile.membership.MobileAddOnsResponseDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.membership.MobileMemberAddOnsService;
import com.company.project.services.payments.StripePaymentService;
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
    private final StripePaymentService stripePaymentService;

    public MobileMemberAddOnsController(MobileMemberAddOnsService addOnsService,
                                        StripePaymentService stripePaymentService) {
        this.addOnsService = addOnsService;
        this.stripePaymentService = stripePaymentService;
    }

    @GetMapping
    public ResponseEntity<MobileAddOnsResponseDTO> getAddOns(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(addOnsService.getAddOns(principal, page, limit));
    }

    /** GET /api/mobile/member/add-ons/{addonId}/validate-code?code= — a promotion code priced on this add-on. */
    @GetMapping("/{addonId}/validate-code")
    public ResponseEntity<com.company.project.dto.DiscountCodeDTO> validateCode(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @org.springframework.web.bind.annotation.PathVariable Long addonId,
            @RequestParam String code) {
        return ResponseEntity.ok(addOnsService.validateCode(principal, addonId, code));
    }

    @org.springframework.web.bind.annotation.PostMapping("/{addonId}/purchase")
    public ResponseEntity<com.company.project.dto.mobile.membership.MobileActiveAddOnDTO> purchaseAddOn(
            @AuthenticationPrincipal UserDetailsImpl principal,
            @org.springframework.web.bind.annotation.PathVariable Long addonId,
            @org.springframework.web.bind.annotation.RequestBody com.company.project.dto.mobile.membership.MobileAddOnPurchaseRequestDTO request) {
        return ResponseEntity.ok(stripePaymentService.withVerifiedPayments(request.getPaymentBreakdown(), true, null,
                () -> addOnsService.purchaseAddOn(principal, addonId, request)));
    }
}
