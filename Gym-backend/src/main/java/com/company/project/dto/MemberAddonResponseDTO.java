package com.company.project.dto;

import com.company.project.entities.MemberAddon;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Response DTO for MemberAddon.
 * Jackson serializes camelCase fields to snake_case via the global SNAKE_CASE strategy.
 */
public class MemberAddonResponseDTO {

    private String id;
    private String transactionId;
    private String memberDbId;
    private String memberId;
    private String memberName;
    private String addonName;
    private String addonDescription;
    private String category;
    private BigDecimal amount;
    private String paymentMode;
    private String startDate;
    private String expiryDate;
    private String purchaseDate;
    private String status;
    private String notes;
    private List<PaymentSplitDTO> paymentBreakdown;
    private String createdAt;
    private String updatedAt;

    private static final DateTimeFormatter ISO = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public static MemberAddonResponseDTO fromEntity(MemberAddon a) {
        MemberAddonResponseDTO dto = new MemberAddonResponseDTO();
        dto.id              = a.getId() != null ? String.valueOf(a.getId()) : null;
        dto.transactionId   = a.getTransactionId();
        dto.memberDbId      = a.getMemberDbId() != null ? String.valueOf(a.getMemberDbId()) : null;
        dto.memberId        = a.getMemberId();
        dto.memberName      = a.getMemberName();
        dto.addonName       = a.getAddonName();
        dto.addonDescription = a.getAddonDescription();
        dto.category        = a.getCategory();
        dto.amount          = a.getAmount();
        dto.paymentMode     = a.getPaymentMode();
        dto.startDate       = a.getStartDate() != null ? a.getStartDate().format(ISO) + "Z" : null;
        dto.expiryDate      = a.getExpiryDate() != null ? a.getExpiryDate().format(ISO) + "Z" : null;
        dto.purchaseDate    = a.getPurchaseDate() != null ? a.getPurchaseDate().format(ISO) + "Z" : null;
        dto.status          = a.getStatus();
        dto.notes           = a.getNotes();
        dto.paymentBreakdown = a.getPaymentBreakdown();
        dto.createdAt       = a.getCreatedAt() != null ? a.getCreatedAt().format(ISO) + "Z" : null;
        dto.updatedAt       = a.getUpdatedAt() != null ? a.getUpdatedAt().format(ISO) + "Z" : null;
        return dto;
    }

    // ── Getters (Jackson uses these for serialization) ──────────────────────

    public String getId() { return id; }
    public String getTransactionId() { return transactionId; }
    public String getMemberDbId() { return memberDbId; }
    public String getMemberId() { return memberId; }
    public String getMemberName() { return memberName; }
    public String getAddonName() { return addonName; }
    public String getAddonDescription() { return addonDescription; }
    public String getCategory() { return category; }
    public BigDecimal getAmount() { return amount; }
    public String getPaymentMode() { return paymentMode; }
    public String getStartDate() { return startDate; }
    public String getExpiryDate() { return expiryDate; }
    public String getPurchaseDate() { return purchaseDate; }
    public String getStatus() { return status; }
    public String getNotes() { return notes; }
    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public String getCreatedAt() { return createdAt; }
    public String getUpdatedAt() { return updatedAt; }
}
