package com.company.project.dto.mobile.profile;

import java.math.BigDecimal;
import java.util.List;

public class MobileProfileTransactionsDTO {
    private List<Transaction> transactions;
    private Summary summary;

    public MobileProfileTransactionsDTO() {}

    public MobileProfileTransactionsDTO(List<Transaction> transactions, Summary summary) {
        this.transactions = transactions;
        this.summary = summary;
    }

    public List<Transaction> getTransactions() { return transactions; }
    public void setTransactions(List<Transaction> transactions) { this.transactions = transactions; }
    public Summary getSummary() { return summary; }
    public void setSummary(Summary summary) { this.summary = summary; }

    public static class Transaction {
        private String id;
        private String type;
        private String description;
        private BigDecimal amount;
        private String date;
        private String status;

        public Transaction() {}

        public Transaction(String id, String type, String description, BigDecimal amount, String date, String status) {
            this.id = id;
            this.type = type;
            this.description = description;
            this.amount = amount;
            this.date = date;
            this.status = status;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public static class Summary {
        private BigDecimal totalEarnings;
        private int totalTransactions;
        private int totalPurchases;
        private int totalBonuses;

        public Summary() {}

        public Summary(BigDecimal totalEarnings, int totalTransactions, int totalPurchases, int totalBonuses) {
            this.totalEarnings = totalEarnings;
            this.totalTransactions = totalTransactions;
            this.totalPurchases = totalPurchases;
            this.totalBonuses = totalBonuses;
        }

        public BigDecimal getTotalEarnings() { return totalEarnings; }
        public void setTotalEarnings(BigDecimal totalEarnings) { this.totalEarnings = totalEarnings; }
        public int getTotalTransactions() { return totalTransactions; }
        public void setTotalTransactions(int totalTransactions) { this.totalTransactions = totalTransactions; }
        public int getTotalPurchases() { return totalPurchases; }
        public void setTotalPurchases(int totalPurchases) { this.totalPurchases = totalPurchases; }
        public int getTotalBonuses() { return totalBonuses; }
        public void setTotalBonuses(int totalBonuses) { this.totalBonuses = totalBonuses; }
    }
}
