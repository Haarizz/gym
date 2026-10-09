package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.math.BigDecimal;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "bookings")
public class Booking extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private TrainingSession session;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id")
    private Member member;

    @Column(name = "guest_name")
    private String guestName;

    @Column(name = "guest_email")
    private String guestEmail;

    @Column(name = "guest_phone")
    private String guestPhone;

    // confirmed | pending_approval | checked-in | no-show | cancelled
    @Column(nullable = false)
    private String status = "confirmed";

    // What the member was charged — grossPrice less discountAmount.
    @Column(precision = 10, scale = 2)
    private BigDecimal price;

    // The session's price at booking time, before any code or Reward Pass.
    @Column(name = "gross_price", precision = 10, scale = 2)
    private BigDecimal grossPrice;

    @Column(name = "discount_amount", precision = 10, scale = 2)
    private BigDecimal discountAmount;

    // e.g. "Code SUMMER10" or "Reward Pass RP-123".
    @Column(name = "discount_label")
    private String discountLabel;

    // The part of price paid from the member's wallet.
    @Column(name = "wallet_amount", precision = 10, scale = 2)
    private BigDecimal walletAmount;

    // The receipt that recorded the payment, if the booking was paid for.
    @Column(name = "receipt_id")
    private Long receiptId;

    // null = nothing to refund | REFUNDED | NOT_REFUNDABLE (cancelled inside the refund window)
    // | VOIDED (cancelled or rejected before staff approved the payment)
    @Column(name = "refund_status", length = 32)
    private String refundStatus;

    // WALLET for now; DIRECT once a payment gateway can send money back.
    @Column(name = "refund_method", length = 32)
    private String refundMethod;

    @Column(name = "refunded_amount", precision = 10, scale = 2)
    private BigDecimal refundedAmount;

    @Column(name = "refunded_at")
    private java.time.LocalDateTime refundedAt;

    // MEMBER | STAFF — staff cancellations always refund in full.
    @Column(name = "cancelled_by", length = 16)
    private String cancelledBy;

    @Column(name = "qr_code")
    private String qrCode;

    @Column(name = "is_guest")
    private boolean guest;

    // null = free/not applicable  |  "paid" = paid  |  "pay_later" = pay at gym
    @Column(name = "payment_status")
    private String paymentStatus;

    // The Reward Pass (ReferralReward id) that paid for this booking, if any.
    @Column(name = "reward_id")
    private Long rewardId;

    public Booking() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public TrainingSession getSession() { return session; }
    public void setSession(TrainingSession session) { this.session = session; }

    public Member getMember() { return member; }
    public void setMember(Member member) { this.member = member; }

    public String getGuestName() { return guestName; }
    public void setGuestName(String guestName) { this.guestName = guestName; }

    public String getGuestEmail() { return guestEmail; }
    public void setGuestEmail(String guestEmail) { this.guestEmail = guestEmail; }

    public String getGuestPhone() { return guestPhone; }
    public void setGuestPhone(String guestPhone) { this.guestPhone = guestPhone; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public String getQrCode() { return qrCode; }
    public void setQrCode(String qrCode) { this.qrCode = qrCode; }

    public boolean isGuest() { return guest; }
    public void setGuest(boolean guest) { this.guest = guest; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public Long getRewardId() { return rewardId; }
    public void setRewardId(Long rewardId) { this.rewardId = rewardId; }

    public BigDecimal getGrossPrice() { return grossPrice; }
    public void setGrossPrice(BigDecimal grossPrice) { this.grossPrice = grossPrice; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public String getDiscountLabel() { return discountLabel; }
    public void setDiscountLabel(String discountLabel) { this.discountLabel = discountLabel; }

    public BigDecimal getWalletAmount() { return walletAmount; }
    public void setWalletAmount(BigDecimal walletAmount) { this.walletAmount = walletAmount; }

    public Long getReceiptId() { return receiptId; }
    public void setReceiptId(Long receiptId) { this.receiptId = receiptId; }

    public String getRefundStatus() { return refundStatus; }
    public void setRefundStatus(String refundStatus) { this.refundStatus = refundStatus; }

    public String getRefundMethod() { return refundMethod; }
    public void setRefundMethod(String refundMethod) { this.refundMethod = refundMethod; }

    public BigDecimal getRefundedAmount() { return refundedAmount; }
    public void setRefundedAmount(BigDecimal refundedAmount) { this.refundedAmount = refundedAmount; }

    public java.time.LocalDateTime getRefundedAt() { return refundedAt; }
    public void setRefundedAt(java.time.LocalDateTime refundedAt) { this.refundedAt = refundedAt; }

    public String getCancelledBy() { return cancelledBy; }
    public void setCancelledBy(String cancelledBy) { this.cancelledBy = cancelledBy; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
