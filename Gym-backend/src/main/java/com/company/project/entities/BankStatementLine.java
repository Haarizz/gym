package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "bank_statement_lines")
public class BankStatementLine extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "reconciliation_id", nullable = false)
    private Long reconciliationId;

    @Column(name = "transaction_date", nullable = false)
    private LocalDate transactionDate;

    @Column(name = "description")
    private String description;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount;

    @Column(name = "type")
    private String type; // DEBIT, CREDIT

    @Column(name = "reference")
    private String reference;

    @Column(name = "is_matched")
    private Boolean isMatched;

    @Column(name = "matched_voucher_no")
    private String matchedVoucherNo;

    public BankStatementLine() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getReconciliationId() { return reconciliationId; }
    public void setReconciliationId(Long reconciliationId) { this.reconciliationId = reconciliationId; }

    public LocalDate getTransactionDate() { return transactionDate; }
    public void setTransactionDate(LocalDate transactionDate) { this.transactionDate = transactionDate; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public Boolean getIsMatched() { return isMatched; }
    public void setIsMatched(Boolean isMatched) { this.isMatched = isMatched; }

    public String getMatchedVoucherNo() { return matchedVoucherNo; }
    public void setMatchedVoucherNo(String matchedVoucherNo) { this.matchedVoucherNo = matchedVoucherNo; }
}
