package com.company.project.services;

import com.company.project.automation.AutomationExecutorService;
import com.company.project.controlplane.repositories.UserDirectoryRepository;
import com.company.project.dto.RenewalRequestDTO;
import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.entities.ReferralReward;
import com.company.project.enums.PassContext;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** A Reward Pass or coupon applied through MemberService.renewMember. */
class MemberRenewalRewardTest {

    @Mock private MemberRepository memberRepository;
    @Mock private MembershipPlanRepository planRepository;
    @Mock private UserRepository userRepository;
    @Mock private RoleRepository roleRepository;
    @Mock private UserRoleRepository userRoleRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private NotificationService notificationService;
    @Mock private AutomationExecutorService automationExecutorService;
    @Mock private ReceiptVoucherService receiptVoucherService;
    @Mock private FinancialEventService financialEventService;
    @Mock private BranchService branchService;
    @Mock private UserBranchRepository userBranchRepository;
    @Mock private UserDirectoryRepository userDirectoryRepository;
    @Mock private RewardRedemptionService rewardRedemptionService;

    private MemberService service;
    private Member member;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        // Every createReceiptForMember overload hands back a fresh (unpaid) receipt.
        ReceiptService receiptService = Mockito.mock(ReceiptService.class, inv ->
                inv.getMethod().getReturnType() == Receipt.class ? new Receipt() : null);
        service = new MemberService(memberRepository, planRepository, receiptService, userRepository,
                roleRepository, userRoleRepository, passwordEncoder, notificationService,
                automationExecutorService, receiptVoucherService, financialEventService, branchService,
                userBranchRepository, userDirectoryRepository, rewardRedemptionService, null, null, null);

        member = new Member();
        member.setId(10L);
        member.setMemberId("MBR-10");
        member.setName("Sam");
        when(memberRepository.findById(10L)).thenReturn(Optional.of(member));
        when(memberRepository.save(any(Member.class))).thenAnswer(inv -> inv.getArgument(0));
        when(planRepository.findByName(any())).thenReturn(Optional.empty());
    }

    private RenewalRequestDTO renewal() {
        RenewalRequestDTO req = new RenewalRequestDTO();
        req.setMembershipFee(new BigDecimal("300"));
        req.setAmountReceived(new BigDecimal("300"));
        req.setPaymentMethod("Card");
        return req;
    }

    @Test
    void rewardPassComesOffTheFeeAndIsSpent() {
        RenewalRequestDTO req = renewal();
        req.setRewardPassId(7L);
        when(rewardRedemptionService.passDiscount(7L, new BigDecimal("300"))).thenReturn(new BigDecimal("30.00"));
        ReferralReward pass = new ReferralReward();
        pass.setRewardCode("RWD-0000000007");
        when(rewardRedemptionService.consumePass(7L, "MBR-10", PassContext.MEMBERSHIP, 10L)).thenReturn(pass);

        service.renewMember(10L, req);

        assertEquals(0, new BigDecimal("270").compareTo(member.getMembershipFee()));
        assertEquals(0, new BigDecimal("30").compareTo(member.getDiscountApplied()));
        // amountReceived (300) is capped at the net fee, so nothing is left outstanding.
        assertEquals(0, BigDecimal.ZERO.compareTo(member.getOutstandingBalance()));
        assertEquals("paid", member.getPaymentStatus());
        verify(rewardRedemptionService).consumePass(7L, "MBR-10", PassContext.MEMBERSHIP, 10L);
    }

    @Test
    void couponComesOffTheFee() {
        RenewalRequestDTO req = renewal();
        req.setCouponCode("GYMABC123");
        when(rewardRedemptionService.redeemCouponAtCheckout(eq("GYMABC123"), eq(new BigDecimal("300")), eq(10L), eq("Sam")))
                .thenReturn(new BigDecimal("50.00"));

        service.renewMember(10L, req);

        assertEquals(0, new BigDecimal("250").compareTo(member.getMembershipFee()));
        assertEquals(0, new BigDecimal("50").compareTo(member.getDiscountApplied()));
    }

    @Test
    void passAndCouponTogetherAreRejected() {
        RenewalRequestDTO req = renewal();
        req.setRewardPassId(7L);
        req.setCouponCode("GYMABC123");

        assertThrows(BusinessRuleViolationException.class, () -> service.renewMember(10L, req));
        verify(rewardRedemptionService, never()).consumePass(any(), any(), any(), any());
    }

    @Test
    void plainRenewalIsUnchanged() {
        service.renewMember(10L, renewal());

        assertEquals(0, new BigDecimal("300").compareTo(member.getMembershipFee()));
        verify(rewardRedemptionService, never()).passDiscount(any(), any());
    }
}
