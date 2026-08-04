package com.company.project.controllers;

import com.company.project.entities.Coupon;
import com.company.project.services.CouponService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponService couponService;

    public CouponController(CouponService couponService) {
        this.couponService = couponService;
    }

    /** GET /api/coupons/validate?code=GYM4F9A2C — used at checkout before applying a coupon. */
    @GetMapping("/validate")
    public ResponseEntity<Coupon> validate(@RequestParam String code) {
        return ResponseEntity.ok(couponService.validate(code));
    }

    /** POST /api/coupons/consume?code=GYM4F9A2C — called once the checkout actually applies it. */
    @PostMapping("/consume")
    public ResponseEntity<Coupon> consume(@RequestParam String code) {
        return ResponseEntity.ok(couponService.consume(code));
    }
}
