package com.company.project.controllers;

import com.company.project.dto.DiscountCodeDTO;
import com.company.project.entities.Member;
import com.company.project.exceptions.EntityNotFoundException;
import com.company.project.repositories.MemberRepository;
import com.company.project.security.UserDetailsImpl;
import com.company.project.services.DiscountCodeService;
import com.company.project.services.PromotionAudience;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/discount-codes")
public class DiscountCodeController {

    private final DiscountCodeService discountCodeService;
    private final MemberRepository memberRepository;

    public DiscountCodeController(DiscountCodeService discountCodeService, MemberRepository memberRepository) {
        this.discountCodeService = discountCodeService;
        this.memberRepository = memberRepository;
    }

    /**
     * GET /api/discount-codes/validate?code=XYZ[&amount=500][&memberId=12|&joining=true] — a promotion
     * code or a shareable coupon code. With amount, also prices the code on it (promotion caps/minimums
     * included). The promotion's target audience is checked against someone signing up (joining), the
     * member staff pass, else the signed-in member (the app); with none of those, it's left to redemption.
     */
    @GetMapping("/validate")
    public ResponseEntity<DiscountCodeDTO> validate(@RequestParam String code,
                                                    @RequestParam(required = false) java.math.BigDecimal amount,
                                                    @RequestParam(required = false) Long memberId,
                                                    @RequestParam(defaultValue = "false") boolean joining,
                                                    @AuthenticationPrincipal UserDetailsImpl principal) {
        if (joining) return ResponseEntity.ok(discountCodeService.resolve(code, amount, PromotionAudience.Buyer.JOINING));
        Optional<Member> member = memberId != null
                ? Optional.of(memberRepository.findById(memberId)
                        .orElseThrow(() -> new EntityNotFoundException("Member not found with id: " + memberId)))
                : signedInMember(principal);
        PromotionAudience.Buyer buyer = member.map(PromotionAudience.Buyer::of).orElse(null);
        return ResponseEntity.ok(discountCodeService.resolve(code, amount, buyer));
    }

    private Optional<Member> signedInMember(UserDetailsImpl principal) {
        if (principal == null || principal.getId() == null) return Optional.empty();
        Optional<Member> m = principal.isGlobal()
                ? memberRepository.findByGlobalUserId(principal.getId())
                : memberRepository.findByUserId(principal.getId());
        // Stale tokens can carry the global claim without a globalUserId record
        if (m.isEmpty() && principal.isGlobal()) m = memberRepository.findByUserId(principal.getId());
        return m;
    }
}
