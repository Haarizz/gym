package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class ContraVoucherRequestDTO {

    private LocalDate date;
    private String fromAccountCode;
    private String fromAccountName;
    private String toAccountCode;
    private String toAccountName;
    private BigDecimal amount;
    private String narration;
    private String reference;

    public ContraVoucherRequestDTO() {}

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getFromAccountCode() { return fromAccountCode; }
    public void setFromAccountCode(String fromAccountCode) { this.fromAccountCode = fromAccountCode; }

    public String getFromAccountName() { return fromAccountName; }
    public void setFromAccountName(String fromAccountName) { this.fromAccountName = fromAccountName; }

    public String getToAccountCode() { return toAccountCode; }
    public void setToAccountCode(String toAccountCode) { this.toAccountCode = toAccountCode; }

    public String getToAccountName() { return toAccountName; }
    public void setToAccountName(String toAccountName) { this.toAccountName = toAccountName; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }
}
