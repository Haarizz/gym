package com.company.project.controllers;

import com.company.project.dto.pos.PosResponses.DiscountRule;
import com.company.project.dto.pos.PosResponses.WalletBalance;
import com.company.project.services.pos.PosPromotionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

/**
 * Till lookups for discounts and the member wallet. Read-only; the code / promotion is
 * re-validated and redeemed by the checkout itself.
 */
@RestController
@RequestMapping("/api/pos")
public class PosPromotionController {

    private final PosPromotionService promotionService;

    public PosPromotionController(PosPromotionService promotionService) {
        this.promotionService = promotionService;
    }

    /** GET /api/pos/promotions — active, in-date promotions with a price discount. */
    @GetMapping("/promotions")
    public ResponseEntity<List<DiscountRule>> promotions() {
        return ResponseEntity.ok(promotionService.activePromotions());
    }

    /** GET /api/pos/discount-codes/lookup?code=SUMMER10&gross=250 — promotion code or referral coupon. */
    @GetMapping("/discount-codes/lookup")
    public ResponseEntity<DiscountRule> lookupCode(@RequestParam String code,
                                                   @RequestParam(required = false) BigDecimal gross) {
        return ResponseEntity.ok(promotionService.lookupCode(code, gross));
    }

    /** GET /api/pos/members/{id}/wallet — spendable reward-wallet balance. */
    @GetMapping("/members/{id}/wallet")
    public ResponseEntity<WalletBalance> wallet(@PathVariable Long id) {
        return ResponseEntity.ok(promotionService.wallet(id));
    }
}
