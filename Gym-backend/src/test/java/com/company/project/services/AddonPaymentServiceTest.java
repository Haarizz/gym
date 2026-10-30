package com.company.project.services;

import com.company.project.dto.DiscountCodeDTO;
import com.company.project.dto.PaymentSplitDTO;
import com.company.project.dto.mobile.membership.MobileAddOnPurchaseRequestDTO;
import com.company.project.entities.AddonPlan;
import com.company.project.entities.Member;
import com.company.project.entities.MemberAddon;
import com.company.project.entities.Receipt;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.MemberAddonRepository;
import com.company.project.repositories.MemberRepository;
import com.company.project.repositories.ReceiptRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Buying an add-on in the app (code, wallet, approval) and refunding a cancelled one to the wallet. */
class AddonPaymentServiceTest {

    @Mock private DiscountCodeService discountCodeService;
    @Mock private WalletService walletService;
    @Mock private ReceiptService receiptService;
    @Mock private ReceiptRepository receiptRepository;
    @Mock private MemberRepository memberRepository;
    @Mock private MemberAddonRepository memberAddonRepository;
    @Mock private FinancialEventService financialEventService;
    @Mock private NotificationService notificationService;

    private AddonPaymentService service;
    private Member member;
    private AddonPlan plan;
    private Receipt receipt;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
        service = new AddonPaymentService(discountCodeService, walletService, receiptService, receiptRepository,
                memberRepository, memberAddonRepository, financialEventService, notificationService);

        member = new Member();
        member.setId(10L);
        member.setMemberId("MBR-10");
        member.setName("Asha");
        when(memberRepository.findById(10L)).thenReturn(Optional.of(member));

        plan = new AddonPlan();
        plan.setName("Locker");
        plan.setPrice(new BigDecimal("300"));
        plan.setValidity(30);
        plan.setIsActive(true);

        when(memberAddonRepository.save(any(MemberAddon.class))).thenAnswer(inv -> {
            MemberAddon a = inv.getArgument(0);
            if (a.getId() == null) a.setId(77L);
            return a;
        });

        receipt = new Receipt();
        receipt.setId(900L);
        receipt.setMemberDbId(10L);
        when(receiptService.createAddonReceipt(any(), anyString(), any(), any(), any(), any(), anyString(), any(),
                any(), any(), any())).thenAnswer(inv -> {
                    receipt.setAmount(inv.getArgument(4));
                    receipt.setPaidAmount(inv.getArgument(5));
                    receipt.setTotalPaidToDate(inv.getArgument(5));
                    receipt.setPaymentMethod(inv.getArgument(6));
                    return receipt;
                });
        when(receiptService.recordDiscount(any(), any(), any())).thenAnswer(inv -> inv.getArgument(0));
        when(receiptRepository.findById(900L)).thenReturn(Optional.of(receipt));
        when(receiptRepository.save(any(Receipt.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private MobileAddOnPurchaseRequestDTO pay(String method, String amount) {
        MobileAddOnPurchaseRequestDTO req = new MobileAddOnPurchaseRequestDTO();
        req.setPaymentMethodUsed(method);
        PaymentSplitDTO leg = new PaymentSplitDTO();
        leg.setMethod(method);
        leg.setAmount(new BigDecimal(amount));
        req.setPaymentBreakdown(new ArrayList<>(List.of(leg)));
        return req;
    }

    private DiscountCodeDTO code(String discount) {
        DiscountCodeDTO dto = new DiscountCodeDTO();
        dto.setDiscountAmount(new BigDecimal(discount));
        return dto;
    }

    /** An active add-on bought for `amount`, paid in full and posted. */
    private MemberAddon paidAddon(String amount) {
        MemberAddon addon = new MemberAddon();
        addon.setId(77L);
        addon.setTransactionId("TXN-0000000077");
        addon.setMemberDbId(10L);
        addon.setMemberId("MBR-10");
        addon.setAddonName("Locker");
        addon.setAmount(new BigDecimal(amount));
        addon.setStatus(AddonPaymentService.STATUS_ACTIVE);
        addon.setReceiptId(900L);
        receipt.setAmount(new BigDecimal(amount));
        receipt.setPaidAmount(new BigDecimal(amount));
        receipt.setTotalPaidToDate(new BigDecimal(amount));
        return addon;
    }

    // ── Charging ──

    @Test
    void cardPaymentAfterCodeIsPostedAndActive() {
        when(discountCodeService.redeemForAddon(eq("lock50"), any(), eq(10L))).thenReturn(code("50"));
        MobileAddOnPurchaseRequestDTO req = pay("Card", "250");
        req.setCouponCode("lock50");
        req.setExpectedAmount(new BigDecimal("250"));

        MemberAddon addon = service.purchase(member, plan, req);

        assertEquals(AddonPaymentService.STATUS_ACTIVE, addon.getStatus());
        assertEquals(0, addon.getAmount().compareTo(new BigDecimal("250")));
        assertEquals(900L, addon.getReceiptId());
        assertNotNull(addon.getExpiryDate());
        verify(receiptService).recordDiscount(receipt, new BigDecimal("50.00"), "Code LOCK50");
        verify(receiptService).postAddonReceipt(receipt);
    }

    @Test
    void walletAndCardAreRecordedAsMixed() {
        MobileAddOnPurchaseRequestDTO req = pay("Card", "200");
        req.setWalletAmount(new BigDecimal("100"));

        MemberAddon addon = service.purchase(member, plan, req);

        verify(walletService).debit(eq("MBR-10"), eq(new BigDecimal("100.00")), eq("ADDON"), eq(77L), anyString());
        assertEquals("Mixed", addon.getPaymentMode());
        assertEquals(0, addon.getWalletAmount().compareTo(new BigDecimal("100")));
        assertEquals("Wallet", addon.getPaymentBreakdown().get(0).getMethod());
        verify(receiptService).postAddonReceipt(receipt);
    }

    @Test
    void walletCoveringAllNeedsNoPaymentMethod() {
        MobileAddOnPurchaseRequestDTO req = new MobileAddOnPurchaseRequestDTO();
        req.setWalletAmount(new BigDecimal("300"));

        MemberAddon addon = service.purchase(member, plan, req);

        assertEquals("Wallet", addon.getPaymentMode());
        assertEquals(AddonPaymentService.STATUS_ACTIVE, addon.getStatus());
    }

    @Test
    void walletMoreThanPriceIsRefused() {
        MobileAddOnPurchaseRequestDTO req = new MobileAddOnPurchaseRequestDTO();
        req.setWalletAmount(new BigDecimal("301"));

        assertThrows(BusinessRuleViolationException.class, () -> service.purchase(member, plan, req));
        verify(walletService, never()).debit(any(), any(), any(), any(), any());
    }

    @Test
    void priceChangedSinceTheAppShowedItIsRefused() {
        MobileAddOnPurchaseRequestDTO req = pay("Card", "300");
        req.setExpectedAmount(new BigDecimal("250"));

        assertThrows(BusinessRuleViolationException.class, () -> service.purchase(member, plan, req));
    }

    @Test
    void cashWaitsForApprovalAndIsNotPosted() {
        MemberAddon addon = service.purchase(member, plan, pay("Cash", "300"));

        assertEquals(AddonPaymentService.STATUS_PENDING_APPROVAL, addon.getStatus());
        verify(receiptService).markPendingApproval(receipt);
        verify(receiptService, never()).postAddonReceipt(any());
    }

    @Test
    void creditRemainderIsAddedToOutstanding() {
        service.purchase(member, plan, pay("Credit", "100"));

        assertEquals(0, member.getOutstandingBalance().compareTo(new BigDecimal("200")));
    }

    @Test
    void underpaidCardIsRefused() {
        assertThrows(BusinessRuleViolationException.class, () -> service.purchase(member, plan, pay("Card", "100")));
    }

    @Test
    void memberBilledToFamilyHeadIsSentToTheDesk() {
        member.setBilledToHead(true);

        assertThrows(BusinessRuleViolationException.class, () -> service.purchase(member, plan, pay("Card", "300")));
    }

    // ── Approval ──

    @Test
    void approvingPostsTheReceiptAndActivates() {
        MemberAddon addon = service.purchase(member, plan, pay("Cash", "300"));

        service.approve(addon, "reception");

        assertEquals(AddonPaymentService.STATUS_ACTIVE, addon.getStatus());
        assertEquals("APPROVED", receipt.getApprovalStatus());
        verify(receiptService).postAddonReceipt(receipt);
    }

    @Test
    void rejectingReturnsTheWalletAmountAndWritesOffCredit() {
        MobileAddOnPurchaseRequestDTO req = pay("Credit", "0");
        req.setWalletAmount(new BigDecimal("100"));
        MemberAddon addon = service.purchase(member, plan, req);

        service.reject(addon, "reception", "No cash received");

        assertEquals(AddonPaymentService.STATUS_REJECTED, addon.getStatus());
        verify(walletService).credit(eq("MBR-10"), eq(new BigDecimal("100.00")), eq("ADDON_REFUND"), eq(77L), anyString());
        verify(receiptService).rejectReceipt(receipt, "reception", "No cash received");
        assertEquals(0, member.getOutstandingBalance().compareTo(BigDecimal.ZERO));
    }

    @Test
    void approvingAnActiveAddonIsRefused() {
        assertThrows(BusinessRuleViolationException.class, () -> service.approve(paidAddon("300"), "reception"));
    }

    // ── Cancellation ──

    @Test
    void cancellingRefundsWhatWasPaidToTheWallet() {
        MemberAddon addon = paidAddon("300");

        service.settleCancellation(addon, "staff");

        verify(walletService).credit(eq("MBR-10"), eq(new BigDecimal("300.00")), eq("ADDON_REFUND"), eq(77L), anyString());
        verify(financialEventService).onAddonRefundedToWallet(addon, "Asha", new BigDecimal("300.00"));
        assertEquals(0, addon.getRefundedAmount().compareTo(new BigDecimal("300")));
        assertNotNull(addon.getRefundedAt());
        assertEquals("Cancelled", receipt.getStatus());
    }

    @Test
    void cancellingPartlyPaidCreditRefundsOnlyWhatWasPaid() {
        MemberAddon addon = paidAddon("300");
        receipt.setPaidAmount(new BigDecimal("100"));
        receipt.setTotalPaidToDate(new BigDecimal("100"));
        member.setOutstandingBalance(new BigDecimal("200"));

        service.settleCancellation(addon, "staff");

        verify(walletService).credit(eq("MBR-10"), eq(new BigDecimal("100.00")), eq("ADDON_REFUND"), eq(77L), anyString());
        assertEquals(0, member.getOutstandingBalance().compareTo(BigDecimal.ZERO));
    }

    @Test
    void cancellingWhilePendingVoidsInsteadOfRefunding() {
        MemberAddon addon = service.purchase(member, plan, pay("Cash", "300"));

        service.settleCancellation(addon, "staff");

        verify(receiptService).rejectReceipt(eq(receipt), eq("staff"), anyString());
        verify(financialEventService, never()).onAddonRefundedToWallet(any(), any(), any());
    }

    @Test
    void alreadyRefundedAddonIsNotRefundedAgain() {
        MemberAddon addon = paidAddon("300");
        addon.setRefundedAt(LocalDateTime.now());

        service.settleCancellation(addon, "staff");

        verify(walletService, never()).credit(any(), any(), any(), any(), any());
    }

    @Test
    void cancellingACancelledAddonIsRefused() {
        MemberAddon addon = paidAddon("300");
        addon.setStatus(AddonPaymentService.STATUS_CANCELLED);

        assertThrows(BusinessRuleViolationException.class, () -> service.settleCancellation(addon, "staff"));
    }
}
