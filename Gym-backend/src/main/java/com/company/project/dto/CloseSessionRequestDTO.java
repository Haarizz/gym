package com.company.project.dto;

import java.math.BigDecimal;

public class CloseSessionRequestDTO {

    private BigDecimal closingCash;
    private String closingDenominations;
    private String notes;

    public CloseSessionRequestDTO() {}

    public BigDecimal getClosingCash() { return closingCash; }
    public void setClosingCash(BigDecimal closingCash) { this.closingCash = closingCash; }

    public String getClosingDenominations() { return closingDenominations; }
    public void setClosingDenominations(String closingDenominations) { this.closingDenominations = closingDenominations; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
