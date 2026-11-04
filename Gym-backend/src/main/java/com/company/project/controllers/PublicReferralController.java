package com.company.project.controllers;

import com.company.project.controlplane.service.LeadFormRateLimiter;
import com.company.project.security.ClientIpResolver;
import com.company.project.services.referrals.PublicReferralLookupService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Unauthenticated lookup behind the /ref/{code} landing page that referral links
 * open. permitAll in SecurityConfig; rate-limited per IP (same budget as the public
 * lead forms) so the codes can't be cheaply enumerated.
 */
@RestController
@RequestMapping("/api/public/referrals")
public class PublicReferralController {

    private final PublicReferralLookupService lookupService;
    private final LeadFormRateLimiter rateLimiter;

    public PublicReferralController(PublicReferralLookupService lookupService,
                                    LeadFormRateLimiter rateLimiter) {
        this.lookupService = lookupService;
        this.rateLimiter = rateLimiter;
    }

    /** GET /api/public/referrals/{code} → { kind: APP|GYM, code, gym_name, referrer_first_name } */
    @GetMapping("/{code}")
    public ResponseEntity<?> lookup(@PathVariable String code, HttpServletRequest request) {
        if (!rateLimiter.tryAcquire(ClientIpResolver.resolve(request), "referral:" + code)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                    .body(Map.of("message", "Too many requests. Please try again later."));
        }
        return lookupService.lookup(code)
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "This referral link isn't valid anymore.")));
    }
}
