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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Charging for add-ons members buy in the app, and refunding cancelled add-ons. A member
 * pays after any add-on promotion code, optionally partly from their wallet; the payment
 * is recorded as an "Add-on" receipt. Cash, Credit and Mixed payments wait for staff
 * approval (status STATUS_PENDING_APPROVAL) before they reach the ledger or the add-on
 * becomes active — the same rule as paid bookings (BookingPaymentService).
 *
 * A cancelled add-on's payment goes back to the payer's wallet, whichever way it was sold.
 */
@Service
public class AddonPaymentService {

    public static final String STATUS_ACTIVE = "Active";
    public static final String STATUS_PENDING_APPROVAL = "Pending Approval";
    public static final String STATUS_REJECTED = "Rejected";
    public static final String STATUS_CANCELLED = "Cancelled";

    // Lower-cased PaymentBottomSheet titles that need staff to confirm the money arrived.
    private static final Set<String> APPROVAL_REQUIRED_METHODS = Set.of("cash", "credit", "mixed");

    private static final BigDecimal TOLERANCE = new BigDecimal("0.01");

    private final DiscountCodeService discountCodeService;
    private final WalletService walletService;
    private final ReceiptService receiptService;
    private final ReceiptRepository receiptRepository;
    private final MemberRepository memberRepository;
    private final MemberAddonRepository memberAddonRepository;
    private final FinancialEventService financialEventService;
    private final NotificationService notificationService;

    public AddonPaymentService(DiscountCodeService discountCodeService,
                               WalletService walletService,
                               ReceiptService receiptService,
                               ReceiptRepository receiptRepository,
                               MemberRepository memberRepository,
                               MemberAddonRepository memberAddonRepository,
                               FinancialEventService financialEventService,
                               NotificationService notificationService) {
        this.discountCodeService = discountCodeService;
        this.walletService = walletService;
        this.receiptService = receiptService;
        this.receiptRepository = receiptRepository;
        this.memberRepository = memberRepository;
        this.memberAddonRepository = memberAddonRepository;
        this.financialEventService = financialEventService;
        this.notificationService = notificationService;
    }

    // ── Charging ──────────────────────────────────────────────────────────────

    /** Checks a promotion code against an add-on for this member and prices it, without spending it. */
    @Transactional(readOnly = true)
    public DiscountCodeDTO previewCode(Member member, AddonPlan plan, String code) {
        BigDecimal gross = money(plan.getPrice());
        if (gross.signum() <= 0) {
            throw new BusinessRuleViolationException("This add-on is free — there's nothing to discount");
        }
        return discountCodeService.resolveForAddon(code, gross, PromotionAudience.Buyer.of(member));
    }

    /**
     * A member buying an add-on in the app. If anything fails, the code, the wallet debit,
     * the add-on and its receipt all roll back together.
     */
    @Transactional
    public MemberAddon purchase(Member member, AddonPlan plan, MobileAddOnPurchaseRequestDTO request) {
        if (!Boolean.TRUE.equals(plan.getIsActive())) {
            throw new BusinessRuleViolationException("This add-on is no longer available.");
        }
        if (member.isEffectivelyBilledToHead()) {
            // Their add-ons are billed to the family head, which only the front desk can do.
            throw new BusinessRuleViolationException("Add-ons for you are billed to your family head — "
                    + "please buy this one at the gym's front desk.");
        }

        BigDecimal gross = money(plan.getPrice());
        BigDecimal discount = BigDecimal.ZERO;
        String discountLabel = null;
        if (StringUtils.hasText(request.getCouponCode())) {
            if (gross.signum() <= 0) {
                throw new BusinessRuleViolationException("This add-on is free — there's nothing to discount");
            }
            String code = request.getCouponCode().trim();
            discount = money(discountCodeService.redeemForAddon(code, gross, member.getId()).getDiscountAmount()).min(gross);
            discountLabel = "Code " + code.toUpperCase();
        }

        BigDecimal net = gross.subtract(discount).max(BigDecimal.ZERO);
        // The app shows the member a total before they pay; never charge a different one.
        if (request.getExpectedAmount() != null
                && request.getExpectedAmount().subtract(net).abs().compareTo(TOLERANCE) > 0) {
            throw new BusinessRuleViolationException("The price of this add-on has changed to " + net
                    + ". Please review it and try again.");
        }

        LocalDateTime now = LocalDateTime.now();
        MemberAddon addon = new MemberAddon();
        addon.setMemberDbId(member.getId());
        addon.setMemberId(member.getMemberId());
        addon.setMemberName(member.getName());
        addon.setAddonName(plan.getName());
        addon.setAddonDescription(plan.getDescription());
        addon.setCategory(plan.getCategory());
        addon.setAmount(net);
        addon.setPurchaseDate(now);
        addon.setStartDate(now);
        if (plan.getValidity() != null) {
            addon.setExpiryDate(now.plusDays(plan.getValidity()));
        }
        addon.setNotes(discountLabel);
        addon.setStatus(STATUS_ACTIVE);
        addon = memberAddonRepository.save(addon);
        addon.setTransactionId("TXN-" + String.format("%010d", addon.getId()));

        if (net.signum() <= 0) {
            // Free, or a code covered all of it — nothing to pay or post.
            addon.setPaymentMode(gross.signum() > 0 ? "Promotion" : "Free");
            return memberAddonRepository.save(addon);
        }

        BigDecimal wallet = money(request.getWalletAmount());
        if (wallet.compareTo(net) > 0) {
            throw new BusinessRuleViolationException("Wallet amount can't be more than the price of the add-on");
        }
        BigDecimal toPay = net.subtract(wallet);
        String method = StringUtils.hasText(request.getPaymentMethodUsed()) ? request.getPaymentMethodUsed().trim() : null;
        if (toPay.signum() > 0 && method == null) {
            throw new BusinessRuleViolationException("Payment is required to buy this add-on");
        }

        List<PaymentSplitDTO> legs = new ArrayList<>();
        if (wallet.signum() > 0) {
            // Throws (rolling everything back) if the balance has changed since the app read it.
            walletService.debit(member.getMemberId(), wallet, "ADDON", addon.getId(),
                    "Paid for add-on " + addon.getTransactionId() + " — " + plan.getName());
            PaymentSplitDTO walletLeg = new PaymentSplitDTO();
            walletLeg.setMethod("Wallet");
            walletLeg.setAmount(wallet);
            legs.add(walletLeg);
        }

        BigDecimal received = BigDecimal.ZERO;
        boolean requiresApproval = false;
        if (toPay.signum() > 0) {
            requiresApproval = APPROVAL_REQUIRED_METHODS.contains(method.toLowerCase());
            List<PaymentSplitDTO> sheetLegs = request.getPaymentBreakdown() != null
                    ? request.getPaymentBreakdown() : List.of();
            received = sheetLegs.stream()
                    .map(PaymentSplitDTO::getAmount)
                    .filter(Objects::nonNull)
                    .reduce(BigDecimal.ZERO, BigDecimal::add)
                    .min(toPay)
                    .max(BigDecimal.ZERO);
            if (sheetLegs.size() == 1) {
                // Cash handed over beyond the price is change, not payment.
                sheetLegs.get(0).setAmount(received);
            }
            legs.addAll(sheetLegs);
        }
        BigDecimal outstanding = toPay.subtract(received);
        if (outstanding.signum() > 0 && !requiresApproval) {
            throw new BusinessRuleViolationException("Pay the full amount, or choose Cash or Credit to pay the rest at the gym");
        }

        String receiptMethod = wallet.signum() > 0
                ? (toPay.signum() > 0 ? "Mixed" : "Wallet")
                : method;
        LocalDateTime dueDate = StringUtils.hasText(request.getPaymentDueDate())
                ? LocalDate.parse(request.getPaymentDueDate().substring(0, 10)).atStartOfDay()
                : null;

        if (outstanding.signum() > 0) {
            member.setOutstandingBalance(money(member.getOutstandingBalance()).add(outstanding));
            if (!"overdue".equalsIgnoreCase(member.getPaymentStatus())) {
                member.setPaymentStatus(received.add(wallet).signum() > 0 ? "partial" : "pending");
            }
            memberRepository.save(member);
        }

        Receipt receipt = receiptService.createAddonReceipt(member, plan.getName(),
                addon.getStartDate(), addon.getExpiryDate(),
                net, wallet.add(received), receiptMethod, legs,
                request.getBankAccountCode(), request.getBankAccountName(), dueDate);
        receipt = receiptService.recordDiscount(receipt, discount, discountLabel);

        addon.setReceiptId(receipt.getId());
        addon.setPaymentMode(receiptMethod);
        addon.setPaymentBreakdown(legs);
        addon.setWalletAmount(wallet.signum() > 0 ? wallet : null);

        if (requiresApproval) {
            receiptService.markPendingApproval(receipt);
            addon.setStatus(STATUS_PENDING_APPROVAL);
            notificationService.notifyRoles(
                    List.of("ADMIN", "MANAGER", "RECEPTIONIST"),
                    "Add-on payment awaiting approval",
                    member.getName() + " paid via " + method + " for " + plan.getName()
                            + " — needs reception approval.",
                    "WARNING", "HIGH", "ADDONS",
                    addon.getId(), "/approvals",
                    "ADDON_PAYMENT_PENDING_" + addon.getId());
        } else {
            receiptService.postAddonReceipt(receipt);
        }
        return memberAddonRepository.save(addon);
    }

    // ── Staff approval ────────────────────────────────────────────────────────

    /** Staff confirmed a Cash/Credit/Mixed add-on payment: the add-on starts now and the money is posted. */
    @Transactional
    public MemberAddon approve(MemberAddon addon, String approvedBy) {
        requirePendingApproval(addon);
        // Its validity starts on approval, so waiting on reception costs no days.
        LocalDateTime now = LocalDateTime.now();
        if (addon.getStartDate() != null && addon.getExpiryDate() != null) {
            addon.setExpiryDate(now.plus(Duration.between(addon.getStartDate(), addon.getExpiryDate())));
        }
        addon.setStartDate(now);

        Receipt receipt = receiptOf(addon);
        if (receipt != null) {
            receipt.setApprovalStatus("APPROVED");
            receipt.setApprovedBy(approvedBy);
            receipt.setApprovedAt(now);
            receipt.setValidFrom(addon.getStartDate());
            receipt.setValidTill(addon.getExpiryDate());
            receipt = receiptRepository.save(receipt);
            receiptService.postAddonReceipt(receipt);
        }
        addon.setStatus(STATUS_ACTIVE);
        notifyMember(addon, "Add-on Active",
                "Your payment for " + addonName(addon) + " was approved. Your add-on is now active.",
                "SUCCESS", "ADDON_PAYMENT_APPROVED_" + addon.getId());
        return memberAddonRepository.save(addon);
    }

    /** Staff rejected a Cash/Credit/Mixed add-on payment: nothing is charged and the add-on never starts. */
    @Transactional
    public MemberAddon reject(MemberAddon addon, String rejectedBy, String reason) {
        requirePendingApproval(addon);
        voidPendingPayment(addon, rejectedBy, reason);
        addon.setStatus(STATUS_REJECTED);
        notifyMember(addon, "Add-on Payment Rejected",
                "Your payment for " + addonName(addon) + " was not approved"
                        + (StringUtils.hasText(reason) ? ": " + reason : "") + ".",
                "WARNING", "ADDON_PAYMENT_REJECTED_" + addon.getId());
        return memberAddonRepository.save(addon);
    }

    // ── Cancellation ──────────────────────────────────────────────────────────

    /**
     * Settles the money side of cancelling an add-on; the caller sets its status. What was
     * paid (wallet included) goes back to the payer's wallet — the family head's for an
     * add-on billed to them — and any unpaid Credit remainder is no longer owed.
     */
    @Transactional
    public void settleCancellation(MemberAddon addon, String cancelledBy) {
        if (STATUS_CANCELLED.equalsIgnoreCase(addon.getStatus()) || STATUS_REJECTED.equalsIgnoreCase(addon.getStatus())) {
            throw new BusinessRuleViolationException("This add-on is already " + addon.getStatus().toLowerCase());
        }
        if (STATUS_PENDING_APPROVAL.equalsIgnoreCase(addon.getStatus())) {
            // Staff never confirmed the money arrived, so there's nothing to refund — undo the charge.
            voidPendingPayment(addon, cancelledBy, "Add-on cancelled before the payment was approved");
            return;
        }
        if (addon.getRefundedAt() != null) return;

        Receipt receipt = receiptOf(addon);
        Member payer = receipt != null && receipt.getMemberDbId() != null
                ? memberRepository.findById(receipt.getMemberDbId()).orElse(null)
                : ownerOf(addon);

        BigDecimal paid;
        if (receipt != null) {
            paid = money(receipt.getTotalPaidToDate() != null ? receipt.getTotalPaidToDate() : receipt.getPaidAmount());
            BigDecimal unpaid = money(receipt.getAmount()).subtract(paid);
            if (unpaid.signum() > 0) writeOffOutstanding(payer, unpaid);
            receipt.setStatus("Cancelled");
            receiptRepository.save(receipt);
        } else {
            // Older add-ons have no receipt; they were always sold fully paid.
            paid = money(addon.getAmount());
        }

        if (paid.signum() <= 0 || payer == null || payer.getMemberId() == null) return;
        walletService.credit(payer.getMemberId(), paid, "ADDON_REFUND", addon.getId(),
                "Refund for cancelled add-on " + addon.getTransactionId() + " — " + addonName(addon));
        financialEventService.onAddonRefundedToWallet(addon, payer.getName(), paid);
        addon.setRefundedAmount(paid);
        addon.setRefundedAt(LocalDateTime.now());
        notifyMember(addon, "Add-on Cancelled",
                addonName(addon) + " was cancelled and " + paid + " was refunded to your wallet.",
                "INFO", "ADDON_REFUNDED_" + addon.getId());
    }

    /** The receipt behind an add-on, or null — for the approvals list. */
    @Transactional(readOnly = true)
    public Receipt receiptFor(MemberAddon addon) {
        return receiptOf(addon);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Undoes a payment staff never approved: rejects its receipt, gives back the wallet
     * amount and drops any Credit remainder from the member's balance. The receipt was
     * never posted, so there is nothing to reverse in the ledger. A promo code stays
     * spent — codes have no way to be given back.
     */
    private void voidPendingPayment(MemberAddon addon, String by, String reason) {
        Receipt receipt = receiptOf(addon);
        Member member = ownerOf(addon);
        if (receipt != null) {
            BigDecimal unpaid = money(receipt.getAmount()).subtract(money(receipt.getPaidAmount()));
            if (unpaid.signum() > 0) writeOffOutstanding(member, unpaid);
            receiptService.rejectReceipt(receipt, by, StringUtils.hasText(reason) ? reason : "Rejected");
        }
        if (addon.getWalletAmount() != null && addon.getWalletAmount().signum() > 0 && member != null) {
            walletService.credit(member.getMemberId(), addon.getWalletAmount(), "ADDON_REFUND", addon.getId(),
                    "Wallet amount returned — add-on " + addon.getTransactionId() + " was not confirmed");
        }
    }

    private void writeOffOutstanding(Member member, BigDecimal amount) {
        if (member == null) return;
        BigDecimal remaining = money(member.getOutstandingBalance()).subtract(amount).max(BigDecimal.ZERO);
        member.setOutstandingBalance(remaining);
        if (remaining.signum() == 0) member.setPaymentStatus("paid");
        memberRepository.save(member);
    }

    private void requirePendingApproval(MemberAddon addon) {
        if (!STATUS_PENDING_APPROVAL.equalsIgnoreCase(addon.getStatus())) {
            throw new BusinessRuleViolationException("This add-on has no payment awaiting approval");
        }
    }

    private Receipt receiptOf(MemberAddon addon) {
        return addon.getReceiptId() == null ? null
                : receiptRepository.findById(addon.getReceiptId()).orElse(null);
    }

    // Older add-ons only carry the business member id.
    private Member ownerOf(MemberAddon addon) {
        if (addon.getMemberDbId() != null) {
            Member member = memberRepository.findById(addon.getMemberDbId()).orElse(null);
            if (member != null) return member;
        }
        return addon.getMemberId() != null ? memberRepository.findByMemberId(addon.getMemberId()).orElse(null) : null;
    }

    private void notifyMember(MemberAddon addon, String title, String message, String type, String eventKey) {
        Member member = ownerOf(addon);
        if (member == null) return;
        Long targetId = member.getUserId() != null ? member.getUserId() : member.getGlobalUserId();
        try {
            notificationService.notifyUser(targetId, title, message, type, "MEDIUM", "ADDONS",
                    addon.getId(), "/membership", eventKey);
        } catch (Exception ignored) {
            // A failed notification must not undo the approval itself.
        }
    }

    private static String addonName(MemberAddon addon) {
        return addon.getAddonName() != null ? addon.getAddonName() : "your add-on";
    }

    private static BigDecimal money(BigDecimal value) {
        return value != null ? value.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2);
    }
}
