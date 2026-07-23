package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "bank_reconciliations")
public class BankReconciliation extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "bank_account_name", nullable = false)
    private String bankAccountName;

    @Column(name = "statement_date", nullable = false)
    private LocalDate statementDate;

    @Column(name = "opening_balance", precision = 12, scale = 2)
    private BigDecimal openingBalance;

    @Column(name = "closing_balance", precision = 12, scale = 2)
    private BigDecimal closingBalance;

    @Column(name = "system_balance", precision = 12, scale = 2)
    private BigDecimal systemBalance;

    @Column(name = "difference", precision = 12, scale = 2)
    private BigDecimal difference;

    @Column(name = "status")
    private String status; // OPEN, IN_PROGRESS, COMPLETED

    @Column(name = "notes", columnDefinition = "TEXT")
    private String notes;

    public BankReconciliation() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public LocalDate getStatementDate() { return statementDate; }
    public void setStatementDate(LocalDate statementDate) { this.statementDate = statementDate; }

    public BigDecimal getOpeningBalance() { return openingBalance; }
    public void setOpeningBalance(BigDecimal openingBalance) { this.openingBalance = openingBalance; }

    public BigDecimal getClosingBalance() { return closingBalance; }
    public void setClosingBalance(BigDecimal closingBalance) { this.closingBalance = closingBalance; }

    public BigDecimal getSystemBalance() { return systemBalance; }
    public void setSystemBalance(BigDecimal systemBalance) { this.systemBalance = systemBalance; }

    public BigDecimal getDifference() { return difference; }
    public void setDifference(BigDecimal difference) { this.difference = difference; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
