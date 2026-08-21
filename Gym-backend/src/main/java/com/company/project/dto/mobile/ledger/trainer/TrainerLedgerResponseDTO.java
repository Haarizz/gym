package com.company.project.dto.mobile.ledger.trainer;

import java.math.BigDecimal;
import java.util.List;

public class TrainerLedgerResponseDTO {

    private TrainerEarningsSummaryDTO summary;
    private TrainerQuickLedgerStatsDTO quickStats;
    private List<TrainerEarningsBreakdownItemDTO> breakdown;
    private List<TrainerRecentTransactionDTO> recentTransactions;
    private TrainerTaxInformationDTO taxInfo;
    private List<TrainerTaxDocumentDTO> taxDocuments;

    public TrainerLedgerResponseDTO() {}

    public TrainerLedgerResponseDTO(
            TrainerEarningsSummaryDTO summary,
            TrainerQuickLedgerStatsDTO quickStats,
            List<TrainerEarningsBreakdownItemDTO> breakdown,
            List<TrainerRecentTransactionDTO> recentTransactions,
            TrainerTaxInformationDTO taxInfo,
            List<TrainerTaxDocumentDTO> taxDocuments) {
        this.summary = summary;
        this.quickStats = quickStats;
        this.breakdown = breakdown;
        this.recentTransactions = recentTransactions;
        this.taxInfo = taxInfo;
        this.taxDocuments = taxDocuments;
    }

    public TrainerEarningsSummaryDTO getSummary() { return summary; }
    public void setSummary(TrainerEarningsSummaryDTO summary) { this.summary = summary; }

    public TrainerQuickLedgerStatsDTO getQuickStats() { return quickStats; }
    public void setQuickStats(TrainerQuickLedgerStatsDTO quickStats) { this.quickStats = quickStats; }

    public List<TrainerEarningsBreakdownItemDTO> getBreakdown() { return breakdown; }
    public void setBreakdown(List<TrainerEarningsBreakdownItemDTO> breakdown) { this.breakdown = breakdown; }

    public List<TrainerRecentTransactionDTO> getRecentTransactions() { return recentTransactions; }
    public void setRecentTransactions(List<TrainerRecentTransactionDTO> recentTransactions) { this.recentTransactions = recentTransactions; }

    public TrainerTaxInformationDTO getTaxInfo() { return taxInfo; }
    public void setTaxInfo(TrainerTaxInformationDTO taxInfo) { this.taxInfo = taxInfo; }

    public List<TrainerTaxDocumentDTO> getTaxDocuments() { return taxDocuments; }
    public void setTaxDocuments(List<TrainerTaxDocumentDTO> taxDocuments) { this.taxDocuments = taxDocuments; }

    // Nested DTOs
    public static class TrainerEarningsSummaryDTO {
        private BigDecimal thisMonth;
        private BigDecimal lastMonth;
        private BigDecimal pending;
        private BigDecimal paid;

        public TrainerEarningsSummaryDTO() {}

        public TrainerEarningsSummaryDTO(BigDecimal thisMonth, BigDecimal lastMonth, BigDecimal pending, BigDecimal paid) {
            this.thisMonth = thisMonth;
            this.lastMonth = lastMonth;
            this.pending = pending;
            this.paid = paid;
        }

        public BigDecimal getThisMonth() { return thisMonth; }
        public void setThisMonth(BigDecimal thisMonth) { this.thisMonth = thisMonth; }
        public BigDecimal getLastMonth() { return lastMonth; }
        public void setLastMonth(BigDecimal lastMonth) { this.lastMonth = lastMonth; }
        public BigDecimal getPending() { return pending; }
        public void setPending(BigDecimal pending) { this.pending = pending; }
        public BigDecimal getPaid() { return paid; }
        public void setPaid(BigDecimal paid) { this.paid = paid; }
    }

    public static class TrainerQuickLedgerStatsDTO {
        private String growth;
        private String nextPayoutDate;
        private String daysRemaining;

        public TrainerQuickLedgerStatsDTO() {}

        public TrainerQuickLedgerStatsDTO(String growth, String nextPayoutDate, String daysRemaining) {
            this.growth = growth;
            this.nextPayoutDate = nextPayoutDate;
            this.daysRemaining = daysRemaining;
        }

        public String getGrowth() { return growth; }
        public void setGrowth(String growth) { this.growth = growth; }
        public String getNextPayoutDate() { return nextPayoutDate; }
        public void setNextPayoutDate(String nextPayoutDate) { this.nextPayoutDate = nextPayoutDate; }
        public String getDaysRemaining() { return daysRemaining; }
        public void setDaysRemaining(String daysRemaining) { this.daysRemaining = daysRemaining; }
    }

    public static class TrainerEarningsBreakdownItemDTO {
        private String category;
        private BigDecimal amount;
        private int percentage;

        public TrainerEarningsBreakdownItemDTO() {}

        public TrainerEarningsBreakdownItemDTO(String category, BigDecimal amount, int percentage) {
            this.category = category;
            this.amount = amount;
            this.percentage = percentage;
        }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public int getPercentage() { return percentage; }
        public void setPercentage(int percentage) { this.percentage = percentage; }
    }

    public static class TrainerRecentTransactionDTO {
        private String id;
        private String date;
        private String description;
        private String member;
        private BigDecimal amount;
        private String status;

        public TrainerRecentTransactionDTO() {}

        public TrainerRecentTransactionDTO(String id, String date, String description, String member, BigDecimal amount, String status) {
            this.id = id;
            this.date = date;
            this.description = description;
            this.member = member;
            this.amount = amount;
            this.status = status;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getMember() { return member; }
        public void setMember(String member) { this.member = member; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public static class TrainerTaxInformationDTO {
        private String ytdEarnings;
        private int totalSessions;
        private String avgPerSession;
        private int activeClients;

        public TrainerTaxInformationDTO() {}

        public TrainerTaxInformationDTO(String ytdEarnings, int totalSessions, String avgPerSession, int activeClients) {
            this.ytdEarnings = ytdEarnings;
            this.totalSessions = totalSessions;
            this.avgPerSession = avgPerSession;
            this.activeClients = activeClients;
        }

        public String getYtdEarnings() { return ytdEarnings; }
        public void setYtdEarnings(String ytdEarnings) { this.ytdEarnings = ytdEarnings; }
        public int getTotalSessions() { return totalSessions; }
        public void setTotalSessions(int totalSessions) { this.totalSessions = totalSessions; }
        public String getAvgPerSession() { return avgPerSession; }
        public void setAvgPerSession(String avgPerSession) { this.avgPerSession = avgPerSession; }
        public int getActiveClients() { return activeClients; }
        public void setActiveClients(int activeClients) { this.activeClients = activeClients; }
    }

    public static class TrainerTaxDocumentDTO {
        private String id;
        private String title;

        public TrainerTaxDocumentDTO() {}

        public TrainerTaxDocumentDTO(String id, String title) {
            this.id = id;
            this.title = title;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
    }
}
