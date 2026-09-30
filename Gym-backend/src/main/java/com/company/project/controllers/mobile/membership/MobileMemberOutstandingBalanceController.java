package com.company.project.controllers.mobile.membership;

import com.company.project.dto.mobile.membership.MobileOutstandingBalanceDTO;
import com.company.project.dto.mobile.membership.MobileOutstandingBalanceSettleRequestDTO;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.mobile.membership.MobileMemberOutstandingBalanceService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/mobile/member/membership/outstanding-balance")
public class MobileMemberOutstandingBalanceController {

    private final MobileMemberOutstandingBalanceService outstandingBalanceService;

    public MobileMemberOutstandingBalanceController(MobileMemberOutstandingBalanceService outstandingBalanceService) {
        this.outstandingBalanceService = outstandingBalanceService;
    }

    @GetMapping
    public ResponseEntity<MobileOutstandingBalanceDTO> getOutstandingBalance(
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(outstandingBalanceService.getOutstandingBalance(principal));
    }

    @GetMapping("/{membershipId}")
    public ResponseEntity<MobileOutstandingBalanceDTO> getOutstandingBalanceForMembership(
            @PathVariable Long membershipId,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        return ResponseEntity.ok(outstandingBalanceService.getOutstandingBalance(principal, membershipId));
    }

    @PostMapping("/{membershipId}/settle")
    public ResponseEntity<String> settle(
            @PathVariable Long membershipId,
            @RequestHeader("Idempotency-Key") UUID idempotencyKey,
            @RequestHeader("Payload-Fingerprint") String fingerprint,
            @RequestBody @Valid MobileOutstandingBalanceSettleRequestDTO request,
            @AuthenticationPrincipal UserDetailsImpl principal) {
        String responseJson = outstandingBalanceService.settle(principal, membershipId, idempotencyKey, fingerprint, request);
        return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(responseJson);
    }
}
