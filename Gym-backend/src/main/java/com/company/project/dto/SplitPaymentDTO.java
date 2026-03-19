package com.company.project.dto;

import java.math.BigDecimal;

public class SplitPaymentDTO {

    private String mode;
    private BigDecimal amount;
    private String reference;

    public SplitPaymentDTO() {}

    public String getMode() { return mode; }
    public void setMode(String mode) { this.mode = mode; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
}
