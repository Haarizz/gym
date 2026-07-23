package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class LedgerTransactionDTO {

    private String id;
    private LocalDate date;
    private String type;
    private String referenceNo;
    private String description;
    private BigDecimal debit;
    private BigDecimal credit;
    private String branch;
    private String status;
    private String costCenter;

    public LedgerTransactionDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getReferenceNo() { return referenceNo; }
    public void setReferenceNo(String referenceNo) { this.referenceNo = referenceNo; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getDebit() { return debit; }
    public void setDebit(BigDecimal debit) { this.debit = debit; }

    public BigDecimal getCredit() { return credit; }
    public void setCredit(BigDecimal credit) { this.credit = credit; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCostCenter() { return costCenter; }
    public void setCostCenter(String costCenter) { this.costCenter = costCenter; }
}
