package com.company.project.entities;

import com.company.project.converters.PaymentBreakdownConverter;
import com.company.project.dto.PaymentSplitDTO;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "member_addons")
public class MemberAddon extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // auto-generated: TXN-XXXXXXXXXX
    @Column(name = "transaction_id", unique = true)
    private String transactionId;

    @Column(name = "member_db_id")
    private Long memberDbId;

    // MBR-XXXXXXXXXX
    @Column(name = "member_id")
    private String memberId;

    @Column(name = "member_name")
    private String memberName;

    @Column(name = "addon_name")
    private String addonName;

    @Column(name = "addon_description", columnDefinition = "TEXT")
    private String addonDescription;

    // Training / Nutrition / Spa / Classes / Other
    private String category;

    @Column(precision = 10, scale = 2)
    private BigDecimal amount;

    // Cash / Card / UPI / Bank Transfer
    @Column(name = "payment_mode")
    private String paymentMode;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "expiry_date")
    private LocalDateTime expiryDate;

    @Column(name = "purchase_date")
    private LocalDateTime purchaseDate;

    // Active / Expired / Cancelled
    private String status;

    private String notes;

    // Per-leg detail (card type, cheque number, online payment type, ...)
    // describing how the amount was actually received — single entry for a
    // plain payment mode, unused if this module ever supports Mixed.
    @Column(name = "payment_breakdown", columnDefinition = "TEXT")
    @Convert(converter = PaymentBreakdownConverter.class)
    private List<PaymentSplitDTO> paymentBreakdown;

    public MemberAddon() {}

    // ── Getters & Setters ────────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public Long getMemberDbId() { return memberDbId; }
    public void setMemberDbId(Long memberDbId) { this.memberDbId = memberDbId; }

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getAddonName() { return addonName; }
    public void setAddonName(String addonName) { this.addonName = addonName; }

    public String getAddonDescription() { return addonDescription; }
    public void setAddonDescription(String addonDescription) { this.addonDescription = addonDescription; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMode() { return paymentMode; }
    public void setPaymentMode(String paymentMode) { this.paymentMode = paymentMode; }

    public LocalDateTime getStartDate() { return startDate; }
    public void setStartDate(LocalDateTime startDate) { this.startDate = startDate; }

    public LocalDateTime getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDateTime expiryDate) { this.expiryDate = expiryDate; }

    public LocalDateTime getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(LocalDateTime purchaseDate) { this.purchaseDate = purchaseDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }
}
