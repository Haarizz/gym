package com.company.project.dto;

import com.company.project.entities.BankStatementLine;
import java.math.BigDecimal;
import java.time.LocalDate;

public class BankStatementLineDTO {

    private Long id;
    private Long reconciliationId;
    private LocalDate transactionDate;
    private String description;
    private BigDecimal amount;
    private String type;
    private String reference;
    private Boolean isMatched;
    private String matchedVoucherNo;
    private Long matchedJournalVoucherId;

    public BankStatementLineDTO() {}

    public static BankStatementLineDTO fromEntity(BankStatementLine line) {
        BankStatementLineDTO dto = new BankStatementLineDTO();
        dto.setId(line.getId());
        dto.setReconciliationId(line.getReconciliationId());
        dto.setTransactionDate(line.getTransactionDate());
        dto.setDescription(line.getDescription());
        dto.setAmount(line.getAmount());
        dto.setType(line.getType());
        dto.setReference(line.getReference());
        dto.setIsMatched(line.getIsMatched());
        dto.setMatchedVoucherNo(line.getMatchedVoucherNo());
        dto.setMatchedJournalVoucherId(line.getMatchedJournalVoucherId());
        return dto;
    }

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

    public Long getMatchedJournalVoucherId() { return matchedJournalVoucherId; }
    public void setMatchedJournalVoucherId(Long matchedJournalVoucherId) { this.matchedJournalVoucherId = matchedJournalVoucherId; }
}
