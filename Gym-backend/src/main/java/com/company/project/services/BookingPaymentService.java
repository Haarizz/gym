package com.company.project.services;

import com.company.project.dto.BookingRequestDTO;
import com.company.project.dto.PaymentSplitDTO;
import com.company.project.entities.Booking;
import com.company.project.entities.Member;
import com.company.project.entities.Receipt;
import com.company.project.entities.ReferralReward;
import com.company.project.entities.TrainingSession;
import com.company.project.enums.PassContext;
import com.company.project.exceptions.BusinessRuleViolationException;
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
import java.util.Set;

/**
 * Charging for and refunding paid bookings. A member pays for a priced session when
 * they book it (after any promo/coupon code or Reward Pass, optionally partly from
 * their wallet); the payment is recorded as a "Class Booking" receipt. Cash, Credit
 * and Mixed payments wait for staff approval before they reach the ledger, the same
 * rule as mobile membership purchases (MobileDiscoveryController.APPROVAL_REQUIRED_METHODS).
 *
 * Refunds go to the member's wallet: always when staff cancel (a booking or the whole
 * session), and when the member cancels at least REFUND_CUTOFF before the session.
 */
@Service
public class BookingPaymentService {

    /** A member cancelling closer than this to the start gets no refund. */
    public static final Duration REFUND_CUTOFF = Duration.ofHours(2);

    public static final String STATUS_PENDING_APPROVAL = "pending_approval";

    public static final String CANCELLED_BY_MEMBER = "MEMBER";
    public static final String CANCELLED_BY_STAFF = "STAFF";

    public static final String REFUND_REFUNDED = "REFUNDED";
    public static final String REFUND_NOT_REFUNDABLE = "NOT_REFUNDABLE";
    public static final String REFUND_VOIDED = "VOIDED";

    public static final String REFUND_METHOD_WALLET = "WALLET";
    public static final String REFUND_METHOD_DIRECT = "DIRECT";

    // Lower-cased PaymentBottomSheet titles that need staff to confirm the money arrived.
    private static final Set<String> APPROVAL_REQUIRED_METHODS = Set.of("cash", "credit", "mixed");

    private static final BigDecimal TOLERANCE = new BigDecimal("0.01");

    private final RewardRedemptionService rewardRedemptionService;
    private final DiscountCodeService discountCodeService;
    private final WalletService walletService;
    private final ReceiptService receiptService;
    private final ReceiptRepository receiptRepository;
    private final MemberRepository memberRepository;
    private final FinancialEventService financialEventService;
    private final NotificationService notificationService;

    public BookingPaymentService(RewardRedemptionService rewardRedemptionService,
                                 DiscountCodeService discountCodeService,
                                 WalletService walletService,
                                 ReceiptService receiptService,
                                 ReceiptRepository receiptRepository,
                                 MemberRepository memberRepository,
                                 FinancialEventService financialEventService,
                                 NotificationService notificationService) {
        this.rewardRedemptionService = rewardRedemptionService;
        this.discountCodeService = discountCodeService;
        this.walletService = walletService;
        this.receiptService = receiptService;
        this.receiptRepository = receiptRepository;
        this.memberRepository = memberRepository;
        this.financialEventService = financialEventService;
        this.notificationService = notificationService;
    }

    // ── Refund window ─────────────────────────────────────────────────────────

    /** The last moment a member can cancel and still be refunded, or null if the session has no start time. */
    public static LocalDateTime refundDeadline(TrainingSession session) {
        if (session == null || session.getDate() == null || session.getStartTime() == null) return null;
        return LocalDateTime.of(session.getDate(), session.getStartTime()).minus(REFUND_CUTOFF);
    }

    public static boolean isWithinRefundWindow(TrainingSession session, LocalDateTime now) {
        LocalDateTime deadline = refundDeadline(session);
        return deadline == null || now.isBefore(deadline);
    }

    // ── Charging ──────────────────────────────────────────────────────────────

    /**
     * Prices a member's booking (already saved, so it has an id) and takes payment for it.
     * Runs in the caller's transaction: if anything fails, the seat, the code or pass,
     * the wallet debit and the receipt all roll back together.
     */
    @Transactional
    public void charge(Booking booking, Member member, TrainingSession session, BookingRequestDTO request) {
        BigDecimal gross = money(session.getPrice());
        boolean hasPass = request.getRewardPassId() != null;
        boolean hasCode = StringUtils.hasText(request.getCouponCode());
        if (hasPass && hasCode) {
            throw new BusinessRuleViolationException("Apply either a Reward Pass or a code, not both");
        }

        BigDecimal discount = BigDecimal.ZERO;
        String discountLabel = null;
        if (hasPass) {
            PassContext context = PassContext.forSessionType(session.getType());
            if (context == null) {
                throw new BusinessRuleViolationException("Reward Passes can only be used for PT or class sessions");
            }
            // A Free PT / Class pass covers the whole session.
            ReferralReward pass = rewardRedemptionService.consumePass(
                    request.getRewardPassId(), member.getMemberId(), context, booking.getId());
            booking.setRewardId(pass.getId());
            discount = gross;
            discountLabel = "Reward Pass " + (pass.getRewardCode() != null ? pass.getRewardCode() : "#" + pass.getId());
        } else if (hasCode) {
            if (gross.signum() <= 0) {
                throw new BusinessRuleViolationException("This session is free — there's nothing to discount");
            }
            String code = request.getCouponCode().trim();
            discount = discountCodeService.redeemAtCheckout(code, gross, member.getId(), member.getName()).min(gross);
            discountLabel = "Code " + code.toUpperCase();
        }

        BigDecimal net = gross.subtract(discount).max(BigDecimal.ZERO);
        // The app shows the member a total before they pay; never charge a different one.
        if (request.getExpectedAmount() != null
                && request.getExpectedAmount().subtract(net).abs().compareTo(TOLERANCE) > 0) {
            throw new BusinessRuleViolationException("The price of this session has changed to " + net
                    + ". Please review your booking and try again.");
        }

        booking.setGrossPrice(gross);
        booking.setDiscountAmount(discount.signum() > 0 ? discount : null);
        booking.setDiscountLabel(discountLabel);
        booking.setPrice(net);

        if (net.signum() <= 0) {
            booking.setPaymentStatus(gross.signum() > 0 ? "paid" : null);
            return;
        }

        BigDecimal wallet = money(request.getWalletAmount());
        if (wallet.compareTo(net) > 0) {
            throw new BusinessRuleViolationException("Wallet amount can't be more than the price of the session");
        }
        BigDecimal toPay = net.subtract(wallet);
        String method = StringUtils.hasText(request.getPaymentMethodUsed()) ? request.getPaymentMethodUsed().trim() : null;
        if (toPay.signum() > 0 && method == null) {
            throw new BusinessRuleViolationException("Payment is required to book this session");
        }

        List<PaymentSplitDTO> legs = new ArrayList<>();
        if (wallet.signum() > 0) {
            // Throws (rolling everything back) if the balance has changed since the app read it.
            walletService.debit(member.getMemberId(), wallet, "BOOKING", booking.getId(),
                    "Paid for booking #" + booking.getId() + " — " + session.getName());
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
                    .filter(java.util.Objects::nonNull)
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
        LocalDateTime sessionStart = session.getDate() != null && session.getStartTime() != null
                ? LocalDateTime.of(session.getDate(), session.getStartTime()) : LocalDateTime.now();

        if (outstanding.signum() > 0) {
            member.setOutstandingBalance(money(member.getOutstandingBalance()).add(outstanding));
            if (!"overdue".equalsIgnoreCase(member.getPaymentStatus())) {
                member.setPaymentStatus(received.add(wallet).signum() > 0 ? "partial" : "pending");
            }
            memberRepository.save(member);
        }

        Receipt receipt = receiptService.createBookingReceipt(member, describe(session), sessionStart,
                net, wallet.add(received), receiptMethod, legs,
                request.getBankAccountCode(), request.getBankAccountName(), dueDate);
        receipt = receiptService.recordDiscount(receipt, discount, discountLabel);

        booking.setReceiptId(receipt.getId());
        booking.setWalletAmount(wallet.signum() > 0 ? wallet : null);

        if (requiresApproval) {
            receiptService.markPendingApproval(receipt);
            booking.setStatus(STATUS_PENDING_APPROVAL);
            booking.setPaymentStatus("pending");
            notificationService.notifyRoles(
                    List.of("ADMIN", "MANAGER", "RECEPTIONIST"),
                    "Booking payment awaiting approval",
                    member.getName() + " paid via " + method + " for " + session.getName()
                            + " — needs reception approval.",
                    "WARNING", "HIGH", "BOOKINGS",
                    booking.getId(), "/approvals",
                    "BOOKING_PAYMENT_PENDING_" + booking.getId());
        } else {
            receiptService.postBookingReceipt(receipt);
            booking.setPaymentStatus("paid");
        }
    }

    // ── Staff approval ────────────────────────────────────────────────────────

    /** Staff confirmed a Cash/Credit/Mixed booking payment: the seat is confirmed and the money posted. */
    @Transactional
    public void approve(Booking booking, String approvedBy) {
        requirePendingApproval(booking);
        Receipt receipt = receiptOf(booking);
        if (receipt != null) {
            receipt.setApprovalStatus("APPROVED");
            receipt.setApprovedBy(approvedBy);
            receipt.setApprovedAt(LocalDateTime.now());
            receipt = receiptRepository.save(receipt);
            receiptService.postBookingReceipt(receipt);
            booking.setPaymentStatus(isFullyPaid(receipt) ? "paid" : "partial");
        }
        booking.setStatus("confirmed");
        notifyMember(booking, "Booking Confirmed",
                "Your payment for " + sessionName(booking) + " was approved. Your seat is confirmed.",
                "SUCCESS", "BOOKING_PAYMENT_APPROVED_" + booking.getId());
    }

    /** Staff rejected a Cash/Credit/Mixed booking payment: the seat is released and nothing is charged. */
    @Transactional
    public void reject(Booking booking, String rejectedBy, String reason) {
        requirePendingApproval(booking);
        voidPendingPayment(booking, rejectedBy, reason);
        booking.setStatus("cancelled");
        booking.setCancelledBy(CANCELLED_BY_STAFF);
        notifyMember(booking, "Booking Payment Rejected",
                "Your payment for " + sessionName(booking) + " was not approved"
                        + (StringUtils.hasText(reason) ? ": " + reason : "") + ". The booking has been cancelled.",
                "WARNING", "BOOKING_PAYMENT_REJECTED_" + booking.getId());
    }

    // ── Cancellation & refunds ────────────────────────────────────────────────

    /**
     * Settles the money side of a cancellation; the caller sets the booking's status.
     * Staff cancellations refund in full; a member's only inside the refund window.
     * Only WALLET refunds exist until a payment gateway can send money back.
     */
    @Transactional
    public void settleCancellation(Booking booking, String cancelledBy, String refundMethod) {
        booking.setCancelledBy(cancelledBy);

        if (STATUS_PENDING_APPROVAL.equalsIgnoreCase(booking.getStatus())) {
            // Staff never confirmed the money arrived, so there's nothing to refund — undo the charge.
            voidPendingPayment(booking, cancelledBy.equals(CANCELLED_BY_STAFF) ? "Staff" : "Member",
                    "Booking cancelled before the payment was approved");
            return;
        }

        boolean refundable = CANCELLED_BY_STAFF.equals(cancelledBy)
                || isWithinRefundWindow(booking.getSession(), LocalDateTime.now());

        if (booking.getRewardId() != null && refundable) {
            rewardRedemptionService.restorePass(booking.getRewardId());
            booking.setRewardId(null);
        }

        Receipt receipt = receiptOf(booking);
        if (receipt == null) return;

        // A Credit/partial booking's unpaid remainder is no longer owed.
        BigDecimal paid = money(receipt.getTotalPaidToDate() != null ? receipt.getTotalPaidToDate() : receipt.getPaidAmount());
        BigDecimal unpaid = money(receipt.getAmount()).subtract(paid);
        if (unpaid.signum() > 0) {
            writeOffOutstanding(booking.getMember(), unpaid);
            receipt.setStatus("Cancelled");
            receiptRepository.save(receipt);
        }

        if (paid.signum() <= 0) return;
        if (!refundable) {
            booking.setRefundStatus(REFUND_NOT_REFUNDABLE);
            return;
        }
        String method = StringUtils.hasText(refundMethod) ? refundMethod.trim().toUpperCase() : REFUND_METHOD_WALLET;
        if (REFUND_METHOD_DIRECT.equals(method)) {
            throw new BusinessRuleViolationException("Refunds to your original payment method are coming soon. "
                    + "Please choose wallet credit.");
        }
        if (!REFUND_METHOD_WALLET.equals(method)) {
            throw new IllegalArgumentException("Unknown refund method: " + refundMethod);
        }

        Member member = booking.getMember();
        walletService.credit(member.getMemberId(), paid, "BOOKING_REFUND", booking.getId(),
                "Refund for cancelled booking #" + booking.getId() + " — " + sessionName(booking));
        financialEventService.onBookingRefundedToWallet(booking.getId(), member.getName(), paid);
        booking.setRefundStatus(REFUND_REFUNDED);
        booking.setRefundMethod(REFUND_METHOD_WALLET);
        booking.setRefundedAmount(paid);
        booking.setRefundedAt(LocalDateTime.now());
    }

    /** The receipt behind a paid booking, or null (free / staff-booked) — for the approvals list. */
    @Transactional(readOnly = true)
    public Receipt receiptFor(Booking booking) {
        return receiptOf(booking);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Undoes a payment staff never approved: rejects its receipt, gives back the wallet
     * amount and Reward Pass, and drops any Credit remainder from the member's balance.
     * The receipt was never posted, so there is nothing to reverse in the ledger.
     * A promo/coupon code stays spent — codes have no way to be given back.
     */
    private void voidPendingPayment(Booking booking, String by, String reason) {
        Receipt receipt = receiptOf(booking);
        Member member = booking.getMember();
        if (receipt != null) {
            BigDecimal unpaid = money(receipt.getAmount()).subtract(money(receipt.getPaidAmount()));
            if (unpaid.signum() > 0) writeOffOutstanding(member, unpaid);
            receiptService.rejectReceipt(receipt, by, StringUtils.hasText(reason) ? reason : "Rejected");
        }
        if (booking.getWalletAmount() != null && booking.getWalletAmount().signum() > 0 && member != null) {
            walletService.credit(member.getMemberId(), booking.getWalletAmount(), "BOOKING_REFUND", booking.getId(),
                    "Wallet amount returned — booking #" + booking.getId() + " was not confirmed");
        }
        if (booking.getRewardId() != null) {
            rewardRedemptionService.restorePass(booking.getRewardId());
            booking.setRewardId(null);
        }
        booking.setPaymentStatus(null);
        booking.setRefundStatus(REFUND_VOIDED);
    }

    private void writeOffOutstanding(Member member, BigDecimal amount) {
        if (member == null) return;
        BigDecimal remaining = money(member.getOutstandingBalance()).subtract(amount).max(BigDecimal.ZERO);
        member.setOutstandingBalance(remaining);
        if (remaining.signum() == 0) member.setPaymentStatus("paid");
        memberRepository.save(member);
    }

    private void requirePendingApproval(Booking booking) {
        if (!STATUS_PENDING_APPROVAL.equalsIgnoreCase(booking.getStatus())) {
            throw new BusinessRuleViolationException("This booking has no payment awaiting approval");
        }
    }

    private Receipt receiptOf(Booking booking) {
        return booking.getReceiptId() == null ? null
                : receiptRepository.findById(booking.getReceiptId()).orElse(null);
    }

    private static boolean isFullyPaid(Receipt receipt) {
        return money(receipt.getPaidAmount()).compareTo(money(receipt.getAmount())) >= 0;
    }

    private void notifyMember(Booking booking, String title, String message, String type, String eventKey) {
        Member member = booking.getMember();
        if (member == null) return;
        Long targetId = member.getUserId() != null ? member.getUserId() : member.getGlobalUserId();
        try {
            notificationService.notifyUser(targetId, title, message, type, "MEDIUM", "BOOKINGS",
                    booking.getId(), "/book-session", eventKey);
        } catch (Exception ignored) {
            // A failed notification must not undo the approval itself.
        }
    }

    private static String describe(TrainingSession session) {
        String name = session.getName() != null ? session.getName() : "Session";
        return session.getDate() != null ? name + " — " + session.getDate() : name;
    }

    private static String sessionName(Booking booking) {
        return booking.getSession() != null && booking.getSession().getName() != null
                ? booking.getSession().getName() : "your session";
    }

    private static BigDecimal money(BigDecimal value) {
        return value != null ? value.setScale(2, RoundingMode.HALF_UP) : BigDecimal.ZERO.setScale(2);
    }
}
