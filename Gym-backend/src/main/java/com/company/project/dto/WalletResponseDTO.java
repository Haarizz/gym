package com.company.project.dto;

import com.company.project.entities.WalletTransaction;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public class WalletResponseDTO {

    private String memberId;
    private BigDecimal balance;
    private List<Entry> transactions;

    public String getMemberId() { return memberId; }
    public void setMemberId(String memberId) { this.memberId = memberId; }

    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }

    public List<Entry> getTransactions() { return transactions; }
    public void setTransactions(List<Entry> transactions) { this.transactions = transactions; }

    public static class Entry {
        private Long id;
        private String type;
        private BigDecimal amount;
        private BigDecimal balanceAfter;
        private String sourceType;
        private Long sourceId;
        private String remarks;
        @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
        private LocalDateTime createdAt;

        public static Entry fromEntity(WalletTransaction tx) {
            Entry e = new Entry();
            e.id = tx.getId();
            e.type = tx.getType();
            e.amount = tx.getAmount();
            e.balanceAfter = tx.getBalanceAfter();
            e.sourceType = tx.getSourceType();
            e.sourceId = tx.getSourceId();
            e.remarks = tx.getRemarks();
            e.createdAt = tx.getCreatedAt();
            return e;
        }

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public BigDecimal getBalanceAfter() { return balanceAfter; }
        public void setBalanceAfter(BigDecimal balanceAfter) { this.balanceAfter = balanceAfter; }

        public String getSourceType() { return sourceType; }
        public void setSourceType(String sourceType) { this.sourceType = sourceType; }

        public Long getSourceId() { return sourceId; }
        public void setSourceId(Long sourceId) { this.sourceId = sourceId; }

        public String getRemarks() { return remarks; }
        public void setRemarks(String remarks) { this.remarks = remarks; }

        public LocalDateTime getCreatedAt() { return createdAt; }
        public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    }
}
