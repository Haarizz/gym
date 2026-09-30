package com.company.project.services;

import com.company.project.dto.DiscountCodeDTO;
import com.company.project.dto.PromotionCampaignResponseDTO;
import com.company.project.entities.Coupon;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.exceptions.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class DiscountCodeServiceTest {

    @Mock private PromotionCampaignService promotionService;
    @Mock private CouponService couponService;
    @Mock private RewardRedemptionService rewardRedemptionService;

    private DiscountCodeService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new DiscountCodeService(promotionService, couponService, rewardRedemptionService);
    }

    @Test
    void promotionCodeWins() {
        PromotionCampaignResponseDTO promo = mock(PromotionCampaignResponseDTO.class);
        when(promo.getId()).thenReturn(3L);
        when(promo.getCode()).thenReturn("SUMMER");
        when(promo.getDiscountType()).thenReturn("percentage");
        when(promo.getDiscountValue()).thenReturn(new BigDecimal("15"));
        when(promotionService.validateByCode("SUMMER")).thenReturn(promo);

        DiscountCodeDTO dto = service.resolve(" SUMMER ");

        assertEquals("PROMOTION", dto.getSource());
        assertEquals(3L, dto.getPromotionId());
        verify(couponService, never()).validate(any());
    }

    @Test
    void unknownPromotionFallsBackToCoupon() {
        when(promotionService.validateByCode("gymabc123")).thenThrow(new EntityNotFoundException("Invalid promotion code"));
        Coupon coupon = new Coupon();
        coupon.setCode("GYMABC123");
        coupon.setDiscountValue(new BigDecimal("50"));
        coupon.setDiscountUnit("AMOUNT");
        when(couponService.validate("GYMABC123")).thenReturn(coupon);

        DiscountCodeDTO dto = service.resolve("gymabc123");

        assertEquals("COUPON", dto.getSource());
        assertEquals("GYMABC123", dto.getCode());
        assertEquals("fixed", dto.getDiscountType());
    }

    @Test
    void inactivePromotionReportsItsOwnError() {
        when(promotionService.validateByCode("OLD")).thenThrow(new IllegalStateException("Promotion has expired"));
        assertThrows(IllegalStateException.class, () -> service.resolve("OLD"));
        verify(couponService, never()).validate(any());
    }

    @Test
    void unknownCodeIsNotFound() {
        when(promotionService.validateByCode(any())).thenThrow(new EntityNotFoundException("Invalid promotion code"));
        when(couponService.validate(any())).thenThrow(new EntityNotFoundException("Invalid coupon code"));
        assertThrows(EntityNotFoundException.class, () -> service.resolve("NOPE"));
    }

    private PromotionCampaignResponseDTO promo(String type, String value, String max, String min) {
        PromotionCampaignResponseDTO promo = mock(PromotionCampaignResponseDTO.class);
        when(promo.getId()).thenReturn(7L);
        when(promo.getCode()).thenReturn("NEWYEAR");
        when(promo.getDiscountType()).thenReturn(type);
        when(promo.getDiscountValue()).thenReturn(new BigDecimal(value));
        when(promo.getMaximumDiscount()).thenReturn(max != null ? new BigDecimal(max) : null);
        when(promo.getMinimumPurchase()).thenReturn(min != null ? new BigDecimal(min) : null);
        return promo;
    }

    @Test
    void promotionDiscountOnAmount() {
        PromotionCampaignResponseDTO fixed = promo("fixed", "50", null, null);
        when(promotionService.validateByCode("NEWYEAR")).thenReturn(fixed);
        assertEquals(new BigDecimal("50.00"), service.resolve("NEWYEAR", new BigDecimal("902")).getDiscountAmount());

        assertEquals(new BigDecimal("100.00"),
                DiscountCodeService.promotionDiscount(promo("percentage", "20", "100", null), new BigDecimal("902")));
        assertEquals(new BigDecimal("902.00"),
                DiscountCodeService.promotionDiscount(promo("free", "0", null, null), new BigDecimal("902")));
        assertEquals(new BigDecimal("30.00"),
                DiscountCodeService.promotionDiscount(promo("fixed", "500", null, null), new BigDecimal("30")));
        assertThrows(BusinessRuleViolationException.class,
                () -> DiscountCodeService.promotionDiscount(promo("fixed", "50", null, "1000"), new BigDecimal("902")));
        assertThrows(BusinessRuleViolationException.class,
                () -> DiscountCodeService.promotionDiscount(promo("promotional-access-days", "7", null, null), new BigDecimal("902")));
    }

    @Test
    void redeemingAPromotionRecordsTheRedemption() {
        PromotionCampaignResponseDTO fixed = promo("fixed", "50", null, null);
        when(promotionService.validateByCode("NEWYEAR")).thenReturn(fixed);

        BigDecimal discount = service.redeemAtCheckout("NEWYEAR", new BigDecimal("902"), 10L, "Sam");

        assertEquals(new BigDecimal("50.00"), discount);
        verify(promotionService).redeemPromotion(eq(7L), eq(new BigDecimal("852.00")), eq(new BigDecimal("50.00")), eq(10L));
        verify(rewardRedemptionService, never()).redeemCouponAtCheckout(any(), any(), any(), any());
    }

    @Test
    void redeemingACouponConsumesIt() {
        when(promotionService.validateByCode("GYMABC123")).thenThrow(new EntityNotFoundException("Invalid promotion code"));
        Coupon coupon = new Coupon();
        coupon.setCode("GYMABC123");
        coupon.setDiscountValue(new BigDecimal("50"));
        coupon.setDiscountUnit("AMOUNT");
        when(couponService.validate("GYMABC123")).thenReturn(coupon);
        when(rewardRedemptionService.redeemCouponAtCheckout("GYMABC123", new BigDecimal("300"), 10L, "Sam"))
                .thenReturn(new BigDecimal("50.00"));

        assertEquals(new BigDecimal("50.00"), service.redeemAtCheckout("GYMABC123", new BigDecimal("300"), 10L, "Sam"));
        verify(promotionService, never()).redeemPromotion(any(), any(), any(), any());
    }
}
