package com.company.project.dto;

import com.company.project.entities.SaleTransaction;
import com.company.project.entities.SaleTransactionItem;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class SaleTransactionResponseDTO {

    private Long id;
    private String transactionNumber;
    private Long posSessionId;
    private Long memberId;
    private String memberName;
    private String paymentMethod;
    private List<PaymentSplitDTO> paymentBreakdown;
    private BigDecimal subtotal;
    private BigDecimal discountAmount;
    private BigDecimal taxAmount;
    private BigDecimal totalAmount;
    private BigDecimal receivedAmount;
    private BigDecimal changeAmount;
    private String status;
    private String notes;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;
    private List<SaleTransactionItemDTO> items;

    public SaleTransactionResponseDTO() {}

    public static SaleTransactionResponseDTO fromEntity(SaleTransaction t, List<SaleTransactionItem> items) {
        SaleTransactionResponseDTO dto = new SaleTransactionResponseDTO();
        dto.setId(t.getId());
        dto.setTransactionNumber(t.getTransactionNumber());
        dto.setPosSessionId(t.getPosSessionId());
        dto.setMemberId(t.getMemberId());
        dto.setMemberName(t.getMemberName());
        dto.setPaymentMethod(t.getPaymentMethod());
        dto.setPaymentBreakdown(t.getPaymentBreakdown());
        dto.setSubtotal(t.getSubtotal());
        dto.setDiscountAmount(t.getDiscountAmount());
        dto.setTaxAmount(t.getTaxAmount());
        dto.setTotalAmount(t.getTotalAmount());
        dto.setReceivedAmount(t.getReceivedAmount());
        dto.setChangeAmount(t.getChangeAmount());
        dto.setStatus(t.getStatus());
        dto.setNotes(t.getNotes());
        dto.setCreatedAt(t.getCreatedAt());
        dto.setUpdatedAt(t.getUpdatedAt());
        dto.setItems(items.stream().map(SaleTransactionItemDTO::fromEntity).collect(Collectors.toList()));
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTransactionNumber() { return transactionNumber; }
    public void setTransactionNumber(String transactionNumber) { this.transactionNumber = transactionNumber; }

    public Long getPosSessionId() { return posSessionId; }
    public void setPosSessionId(Long posSessionId) { this.posSessionId = posSessionId; }

    public Long getMemberId() { return memberId; }
    public void setMemberId(Long memberId) { this.memberId = memberId; }

    public String getMemberName() { return memberName; }
    public void setMemberName(String memberName) { this.memberName = memberName; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getTaxAmount() { return taxAmount; }
    public void setTaxAmount(BigDecimal taxAmount) { this.taxAmount = taxAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getReceivedAmount() { return receivedAmount; }
    public void setReceivedAmount(BigDecimal receivedAmount) { this.receivedAmount = receivedAmount; }

    public BigDecimal getChangeAmount() { return changeAmount; }
    public void setChangeAmount(BigDecimal changeAmount) { this.changeAmount = changeAmount; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<SaleTransactionItemDTO> getItems() { return items; }
    public void setItems(List<SaleTransactionItemDTO> items) { this.items = items; }
}
