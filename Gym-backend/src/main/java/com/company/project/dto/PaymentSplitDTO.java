package com.company.project.dto;

import java.math.BigDecimal;

/**
 * One leg of a Mixed payment, e.g. { method: "Cash", amount: 500 } or
 * { method: "Cheque", amount: 250, reference: "CHQ-00219" }.
 */
public class PaymentSplitDTO {

    private String method;
    private BigDecimal amount;
    private String reference;

    public PaymentSplitDTO() {}

    public PaymentSplitDTO(String method, BigDecimal amount, String reference) {
        this.method = method;
        this.amount = amount;
        this.reference = reference;
    }

    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
}
