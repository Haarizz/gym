package com.company.project.dto;

import com.company.project.entities.JournalVoucherLine;

import java.math.BigDecimal;

public class JournalVoucherLineDTO {

    private Long id;
    private String accountCode;
    private String accountName;
    private BigDecimal debit;
    private BigDecimal credit;
    private String description;
    private String costCenter;

    public JournalVoucherLineDTO() {}

    public static JournalVoucherLineDTO fromEntity(JournalVoucherLine line) {
        JournalVoucherLineDTO dto = new JournalVoucherLineDTO();
        dto.setId(line.getId());
        dto.setAccountCode(line.getAccountCode());
        dto.setAccountName(line.getAccountName());
        dto.setDebit(line.getDebit());
        dto.setCredit(line.getCredit());
        dto.setDescription(line.getDescription());
        dto.setCostCenter(line.getCostCenter());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getAccountCode() { return accountCode; }
    public void setAccountCode(String accountCode) { this.accountCode = accountCode; }

    public String getAccountName() { return accountName; }
    public void setAccountName(String accountName) { this.accountName = accountName; }

    public BigDecimal getDebit() { return debit; }
    public void setDebit(BigDecimal debit) { this.debit = debit; }

    public BigDecimal getCredit() { return credit; }
    public void setCredit(BigDecimal credit) { this.credit = credit; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getCostCenter() { return costCenter; }
    public void setCostCenter(String costCenter) { this.costCenter = costCenter; }
}
