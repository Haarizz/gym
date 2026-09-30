package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;

public class RecordBillPaymentRequestDTO {

    private BigDecimal amount;
    private String paymentMethod;
    private String notes;
    // Method-specific detail (card type, cheque number, bank account, online
    // payment type, ...) for the payment method above.
    private List<PaymentSplitDTO> paymentBreakdown;
    // Date the supplier was paid (defaults to today). Drives the payment voucher,
    // its journal entry and the supplier statement of account.
    private java.time.LocalDate paymentDate;

    public RecordBillPaymentRequestDTO() {}

    public java.time.LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(java.time.LocalDate paymentDate) { this.paymentDate = paymentDate; }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public List<PaymentSplitDTO> getPaymentBreakdown() { return paymentBreakdown; }
    public void setPaymentBreakdown(List<PaymentSplitDTO> paymentBreakdown) { this.paymentBreakdown = paymentBreakdown; }
}
