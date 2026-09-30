package com.company.project.controllers;

import com.company.project.dto.DiscountCodeDTO;
import com.company.project.services.DiscountCodeService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/discount-codes")
public class DiscountCodeController {

    private final DiscountCodeService discountCodeService;

    public DiscountCodeController(DiscountCodeService discountCodeService) {
        this.discountCodeService = discountCodeService;
    }

    /** GET /api/discount-codes/validate?code=XYZ — a promotion code or a shareable coupon code. */
    @GetMapping("/validate")
    public ResponseEntity<DiscountCodeDTO> validate(@RequestParam String code) {
        return ResponseEntity.ok(discountCodeService.resolve(code));
    }
}
