package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "journal_voucher_lines")
public class JournalVoucherLine extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "journal_voucher_id", nullable = false)
    private Long journalVoucherId;

    @Column(name = "account_code")
    private String accountCode;

    @Column(name = "account_name")
    private String accountName;

    @Column(name = "debit", precision = 12, scale = 2)
    private BigDecimal debit;

    @Column(name = "credit", precision = 12, scale = 2)
    private BigDecimal credit;

    @Column(name = "description")
    private String description;

    @Column(name = "cost_center")
    private String costCenter;

    public JournalVoucherLine() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getJournalVoucherId() { return journalVoucherId; }
    public void setJournalVoucherId(Long journalVoucherId) { this.journalVoucherId = journalVoucherId; }

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
