package com.company.project.dto;

import java.math.BigDecimal;

public class RecordBillPaymentRequestDTO {

    private BigDecimal amount;
    private String paymentMethod;
    private String notes;

    public RecordBillPaymentRequestDTO() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
