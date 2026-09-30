package com.company.project.services;

import com.company.project.entities.Coupon;
import com.company.project.entities.ReferralReward;
import com.company.project.enums.PassContext;
import com.company.project.enums.RewardStatus;
import com.company.project.enums.RewardType;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReferralRewardRepository;
import com.company.project.repositories.RewardAuditLogRepository;
import com.company.project.repositories.WalletTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Reward Pass spending/restoring and coupon checkout in RewardRedemptionService. */
class RewardPassRedemptionTest {

    @Mock private ReferralRewardRepository rewardRepository;
    @Mock private RewardAuditLogRepository auditLogRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private WalletTransactionRepository walletTransactionRepository;
    @Mock private CouponService couponService;
    @Mock private FinancialEventService financialEventService;
    @Mock private NotificationService notificationService;

    private RewardRedemptionService service;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new RewardRedemptionService(rewardRepository, auditLogRepository, memberRepository,
                walletTransactionRepository, couponService, financialEventService, notificationService);
        when(rewardRepository.save(any(ReferralReward.class))).thenAnswer(inv -> inv.getArgument(0));
        when(memberRepository.findByMemberId(any())).thenReturn(Optional.empty());
    }

    private ReferralReward pass(RewardType type, RewardStatus status) {
        ReferralReward r = new ReferralReward();
        r.setId(7L);
        r.setRewardCode("RWD-0000000007");
        r.setMemberId("MBR-1");
        r.setRewardType(type);
        r.setStatus(status);
        r.setRewardValue(new BigDecimal("10"));
        r.setRewardUnit("PERCENT");
        when(rewardRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(r));
        when(rewardRepository.findById(7L)).thenReturn(Optional.of(r));
        return r;
    }

    // ── discountFor ───────────────────────────────────────────────────────────

    @Test
    void percentDiscountIsTakenOffGross() {
        assertEquals(new BigDecimal("30.00"),
                RewardRedemptionService.discountFor("PERCENT", new BigDecimal("10"), new BigDecimal("300")));
    }

    @Test
    void amountDiscountIsFlat() {
        assertEquals(new BigDecimal("50.00"),
                RewardRedemptionService.discountFor("AMOUNT", new BigDecimal("50"), new BigDecimal("300")));
    }

    @Test
    void discountNeverExceedsGross() {
        assertEquals(new BigDecimal("40.00"),
                RewardRedemptionService.discountFor("AMOUNT", new BigDecimal("50"), new BigDecimal("40")));
        assertEquals(new BigDecimal("0.00"),
                RewardRedemptionService.discountFor("AMOUNT", new BigDecimal("50"), BigDecimal.ZERO));
    }

    // ── consumePass ───────────────────────────────────────────────────────────

    @Test
    void consumePassMarksRedeemedWithContext() {
        ReferralReward r = pass(RewardType.MEMBERSHIP_DISCOUNT, RewardStatus.AVAILABLE);

        service.consumePass(7L, "MBR-1", PassContext.MEMBERSHIP, 99L);

        assertEquals(RewardStatus.REDEEMED, r.getStatus());
        assertEquals("MEMBERSHIP", r.getConsumedContext());
        assertEquals(99L, r.getConsumedRefId());
    }

    @Test
    void freePtPassCoversClassBookings() {
        ReferralReward r = pass(RewardType.FREE_PT, RewardStatus.CLAIMED);

        service.consumePass(7L, "MBR-1", PassContext.CLASS, 5L);

        assertEquals(RewardStatus.REDEEMED, r.getStatus());
        assertEquals("BOOKING", r.getConsumedContext());
    }

    @Test
    void consumePassRejectsAnotherMembersPass() {
        pass(RewardType.MEMBERSHIP_DISCOUNT, RewardStatus.AVAILABLE);
        assertThrows(BusinessRuleViolationException.class,
                () -> service.consumePass(7L, "MBR-2", PassContext.MEMBERSHIP, 1L));
    }

    @Test
    void consumePassRejectsWrongContext() {
        pass(RewardType.FREE_PT, RewardStatus.AVAILABLE);
        assertThrows(BusinessRuleViolationException.class,
                () -> service.consumePass(7L, "MBR-1", PassContext.MEMBERSHIP, 1L));
    }

    @Test
    void consumePassRejectsExpiredPass() {
        ReferralReward r = pass(RewardType.MEMBERSHIP_DISCOUNT, RewardStatus.AVAILABLE);
        r.setExpiryDate(LocalDate.now().minusDays(1));
        assertThrows(BusinessRuleViolationException.class,
                () -> service.consumePass(7L, "MBR-1", PassContext.MEMBERSHIP, 1L));
    }

    @Test
    void passCannotBeSpentTwice() {
        pass(RewardType.MEMBERSHIP_DISCOUNT, RewardStatus.AVAILABLE);
        service.consumePass(7L, "MBR-1", PassContext.MEMBERSHIP, 1L);
        assertThrows(BusinessRuleViolationException.class,
                () -> service.consumePass(7L, "MBR-1", PassContext.MEMBERSHIP, 1L));
    }

    @Test
    void redeemRefusesPassTypes() {
        pass(RewardType.MEMBERSHIP_DISCOUNT, RewardStatus.AVAILABLE);
        assertThrows(BusinessRuleViolationException.class, () -> service.redeem(7L));
    }

    // ── restorePass ───────────────────────────────────────────────────────────

    @Test
    void restorePassGivesBookingPassBack() {
        ReferralReward r = pass(RewardType.FREE_PT, RewardStatus.AVAILABLE);
        service.consumePass(7L, "MBR-1", PassContext.PT, 5L);

        service.restorePass(7L);

        assertEquals(RewardStatus.AVAILABLE, r.getStatus());
        assertNull(r.getConsumedContext());
        assertNull(r.getRedeemedDate());
    }

    @Test
    void restorePassIgnoresMembershipSpentPass() {
        ReferralReward r = pass(RewardType.MEMBERSHIP_DISCOUNT, RewardStatus.AVAILABLE);
        service.consumePass(7L, "MBR-1", PassContext.MEMBERSHIP, 1L);

        service.restorePass(7L);

        assertEquals(RewardStatus.REDEEMED, r.getStatus());
    }

    @Test
    void restoredPassThatExpiredMeanwhileIsExpired() {
        ReferralReward r = pass(RewardType.FREE_PT, RewardStatus.AVAILABLE);
        service.consumePass(7L, "MBR-1", PassContext.PT, 5L);
        r.setExpiryDate(LocalDate.now().minusDays(1));

        service.restorePass(7L);

        assertEquals(RewardStatus.EXPIRED, r.getStatus());
    }

    // ── coupons ───────────────────────────────────────────────────────────────

    @Test
    void couponAtCheckoutRecordsWhoUsedItAndReturnsDiscount() {
        ReferralReward r = pass(RewardType.COUPON, RewardStatus.AVAILABLE);
        Coupon coupon = new Coupon();
        coupon.setCode("GYMABC123");
        coupon.setRewardId(7L);
        coupon.setDiscountValue(new BigDecimal("50"));
        coupon.setDiscountUnit("AMOUNT");
        when(couponService.validate("GYMABC123")).thenReturn(coupon);

        BigDecimal discount = service.redeemCouponAtCheckout(" gymabc123 ", new BigDecimal("300"), 42L, "Friend");

        assertEquals(new BigDecimal("50.00"), discount);
        verify(couponService).consume("GYMABC123");
        assertEquals("COUPON", r.getConsumedContext());
        assertEquals(42L, r.getConsumedRefId());
    }

    @Test
    void couponPreviewDoesNotSpendIt() {
        Coupon coupon = new Coupon();
        coupon.setCode("GYMABC123");
        coupon.setDiscountValue(new BigDecimal("20"));
        coupon.setDiscountUnit("PERCENT");
        when(couponService.validate("GYMABC123")).thenReturn(coupon);

        assertEquals(new BigDecimal("40.00"), service.previewCouponDiscount("GYMABC123", new BigDecimal("200")));
        verify(couponService, never()).consume(any());
    }
}
