package com.company.project.dto;

import java.math.BigDecimal;

public class PosSessionRequestDTO {

    private BigDecimal openingCash;
    private String openingDenominations;
    private String staffName;

    public PosSessionRequestDTO() {}

    public BigDecimal getOpeningCash() { return openingCash; }
    public void setOpeningCash(BigDecimal openingCash) { this.openingCash = openingCash; }

    public String getOpeningDenominations() { return openingDenominations; }
    public void setOpeningDenominations(String openingDenominations) { this.openingDenominations = openingDenominations; }

    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }
}
