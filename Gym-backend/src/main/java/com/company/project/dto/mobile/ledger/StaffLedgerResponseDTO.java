package com.company.project.dto.mobile.ledger;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class StaffLedgerResponseDTO {

    private PeriodDTO period;
    private EarningsSummaryDTO summary;
    private QuickStatsDTO quickStats;
    private NextPayoutDTO nextPayout;
    private List<BreakdownItemDTO> breakdown = new ArrayList<>();
    private List<CommissionStructureItemDTO> commissionStructure = new ArrayList<>();
    private List<RecentEarningDTO> recentEarnings = new ArrayList<>();
    private TaxInfoDTO taxInfo;
    private TaxInfoDTO tax; // alias for contract flexibility
    private List<TaxDocumentDTO> taxDocuments = new ArrayList<>();

    public StaffLedgerResponseDTO() {}

    public StaffLedgerResponseDTO(
            PeriodDTO period,
            EarningsSummaryDTO summary,
            QuickStatsDTO quickStats,
            NextPayoutDTO nextPayout,
            List<BreakdownItemDTO> breakdown,
            List<CommissionStructureItemDTO> commissionStructure,
            List<RecentEarningDTO> recentEarnings,
            TaxInfoDTO taxInfo,
            List<TaxDocumentDTO> taxDocuments) {
        this.period = period;
        this.summary = summary;
        this.quickStats = quickStats;
        this.nextPayout = nextPayout;
        this.breakdown = breakdown != null ? breakdown : new ArrayList<>();
        this.commissionStructure = commissionStructure != null ? commissionStructure : new ArrayList<>();
        this.recentEarnings = recentEarnings != null ? recentEarnings : new ArrayList<>();
        this.taxInfo = taxInfo;
        this.tax = taxInfo;
        this.taxDocuments = taxDocuments != null ? taxDocuments : new ArrayList<>();
    }

    public PeriodDTO getPeriod() {
        return period;
    }

    public void setPeriod(PeriodDTO period) {
        this.period = period;
    }

    public EarningsSummaryDTO getSummary() {
        return summary;
    }

    public void setSummary(EarningsSummaryDTO summary) {
        this.summary = summary;
    }

    public QuickStatsDTO getQuickStats() {
        return quickStats;
    }

    public void setQuickStats(QuickStatsDTO quickStats) {
        this.quickStats = quickStats;
    }

    public NextPayoutDTO getNextPayout() {
        return nextPayout;
    }

    public void setNextPayout(NextPayoutDTO nextPayout) {
        this.nextPayout = nextPayout;
    }

    public List<BreakdownItemDTO> getBreakdown() {
        return breakdown;
    }

    public void setBreakdown(List<BreakdownItemDTO> breakdown) {
        this.breakdown = breakdown != null ? breakdown : new ArrayList<>();
    }

    public List<CommissionStructureItemDTO> getCommissionStructure() {
        return commissionStructure;
    }

    public void setCommissionStructure(List<CommissionStructureItemDTO> commissionStructure) {
        this.commissionStructure = commissionStructure != null ? commissionStructure : new ArrayList<>();
    }

    public List<RecentEarningDTO> getRecentEarnings() {
        return recentEarnings;
    }

    public void setRecentEarnings(List<RecentEarningDTO> recentEarnings) {
        this.recentEarnings = recentEarnings != null ? recentEarnings : new ArrayList<>();
    }

    public TaxInfoDTO getTaxInfo() {
        return taxInfo;
    }

    public void setTaxInfo(TaxInfoDTO taxInfo) {
        this.taxInfo = taxInfo;
        this.tax = taxInfo;
    }

    public TaxInfoDTO getTax() {
        return tax;
    }

    public void setTax(TaxInfoDTO tax) {
        this.tax = tax;
        this.taxInfo = tax;
    }

    public List<TaxDocumentDTO> getTaxDocuments() {
        return taxDocuments;
    }

    public void setTaxDocuments(List<TaxDocumentDTO> taxDocuments) {
        this.taxDocuments = taxDocuments != null ? taxDocuments : new ArrayList<>();
    }

    // ── Nested DTOs ─────────────────────────────────────────────────────────────

    public static class PeriodDTO {
        private int year;
        private int month;
        private String label;

        public PeriodDTO() {}

        public PeriodDTO(int year, int month, String label) {
            this.year = year;
            this.month = month;
            this.label = label;
        }

        public int getYear() { return year; }
        public void setYear(int year) { this.year = year; }
        public int getMonth() { return month; }
        public void setMonth(int month) { this.month = month; }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
    }

    public static class EarningsSummaryDTO {
        private BigDecimal thisMonth;
        private BigDecimal lastMonth;
        private int growthPercentage;
        private BigDecimal baseSalary;
        private BigDecimal commission;

        public EarningsSummaryDTO() {}

        public EarningsSummaryDTO(BigDecimal thisMonth, BigDecimal lastMonth, int growthPercentage, BigDecimal baseSalary, BigDecimal commission) {
            this.thisMonth = thisMonth != null ? thisMonth : BigDecimal.ZERO;
            this.lastMonth = lastMonth != null ? lastMonth : BigDecimal.ZERO;
            this.growthPercentage = growthPercentage;
            this.baseSalary = baseSalary != null ? baseSalary : BigDecimal.ZERO;
            this.commission = commission != null ? commission : BigDecimal.ZERO;
        }

        public BigDecimal getThisMonth() { return thisMonth; }
        public void setThisMonth(BigDecimal thisMonth) { this.thisMonth = thisMonth; }
        public BigDecimal getLastMonth() { return lastMonth; }
        public void setLastMonth(BigDecimal lastMonth) { this.lastMonth = lastMonth; }
        public int getGrowthPercentage() { return growthPercentage; }
        public void setGrowthPercentage(int growthPercentage) { this.growthPercentage = growthPercentage; }
        public BigDecimal getBaseSalary() { return baseSalary; }
        public void setBaseSalary(BigDecimal baseSalary) { this.baseSalary = baseSalary; }
        public BigDecimal getCommission() { return commission; }
        public void setCommission(BigDecimal commission) { this.commission = commission; }
    }

    public static class QuickStatsDTO {
        private String growth;
        private String nextPayoutDate;
        private String daysRemaining;

        public QuickStatsDTO() {}

        public QuickStatsDTO(String growth, String nextPayoutDate, String daysRemaining) {
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

    public static class NextPayoutDTO {
        private String date;
        private long daysRemaining;

        public NextPayoutDTO() {}

        public NextPayoutDTO(String date, long daysRemaining) {
            this.date = date;
            this.daysRemaining = daysRemaining;
        }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public long getDaysRemaining() { return daysRemaining; }
        public void setDaysRemaining(long daysRemaining) { this.daysRemaining = daysRemaining; }
    }

    public static class BreakdownItemDTO {
        private String category;
        private BigDecimal amount;
        private double percentage;

        public BreakdownItemDTO() {}

        public BreakdownItemDTO(String category, BigDecimal amount, double percentage) {
            this.category = category;
            this.amount = amount != null ? amount : BigDecimal.ZERO;
            this.percentage = percentage;
        }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public double getPercentage() { return percentage; }
        public void setPercentage(double percentage) { this.percentage = percentage; }
    }

    public static class CommissionStructureItemDTO {
        private String type;
        private String label;
        private String amount;

        public CommissionStructureItemDTO() {}

        public CommissionStructureItemDTO(String type, String label, String amount) {
            this.type = type;
            this.label = label;
            this.amount = amount;
        }

        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getLabel() { return label; }
        public void setLabel(String label) { this.label = label; }
        public String getAmount() { return amount; }
        public void setAmount(String amount) { this.amount = amount; }
    }

    public static class RecentEarningDTO {
        private String id;
        private String type;
        private String title;
        private String description;
        private String details;
        private List<String> relatedNames = new ArrayList<>();
        private String date;
        private BigDecimal amount;
        private String status;

        public RecentEarningDTO() {}

        public RecentEarningDTO(
                String id,
                String type,
                String title,
                String description,
                String details,
                List<String> relatedNames,
                String date,
                BigDecimal amount,
                String status) {
            this.id = id;
            this.type = type;
            this.title = title;
            this.description = description;
            this.details = details;
            this.relatedNames = relatedNames != null ? relatedNames : new ArrayList<>();
            this.date = date;
            this.amount = amount != null ? amount : BigDecimal.ZERO;
            this.status = status;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getDetails() { return details; }
        public void setDetails(String details) { this.details = details; }
        public List<String> getRelatedNames() { return relatedNames; }
        public void setRelatedNames(List<String> relatedNames) { this.relatedNames = relatedNames != null ? relatedNames : new ArrayList<>(); }
        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }
        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public static class TaxInfoDTO {
        private String taxYear;
        private BigDecimal ytdEarnings;
        private BigDecimal tdsDeducted;
        private BigDecimal baseSalaryPaid;
        private BigDecimal totalCommission;
        private int conversions;

        public TaxInfoDTO() {}

        public TaxInfoDTO(
                String taxYear,
                BigDecimal ytdEarnings,
                BigDecimal tdsDeducted,
                BigDecimal baseSalaryPaid,
                BigDecimal totalCommission,
                int conversions) {
            this.taxYear = taxYear;
            this.ytdEarnings = ytdEarnings != null ? ytdEarnings : BigDecimal.ZERO;
            this.tdsDeducted = tdsDeducted != null ? tdsDeducted : BigDecimal.ZERO;
            this.baseSalaryPaid = baseSalaryPaid != null ? baseSalaryPaid : BigDecimal.ZERO;
            this.totalCommission = totalCommission != null ? totalCommission : BigDecimal.ZERO;
            this.conversions = conversions;
        }

        public String getTaxYear() { return taxYear; }
        public void setTaxYear(String taxYear) { this.taxYear = taxYear; }
        public BigDecimal getYtdEarnings() { return ytdEarnings; }
        public void setYtdEarnings(BigDecimal ytdEarnings) { this.ytdEarnings = ytdEarnings; }
        public BigDecimal getTdsDeducted() { return tdsDeducted; }
        public void setTdsDeducted(BigDecimal tdsDeducted) { this.tdsDeducted = tdsDeducted; }
        public BigDecimal getBaseSalaryPaid() { return baseSalaryPaid; }
        public void setBaseSalaryPaid(BigDecimal baseSalaryPaid) { this.baseSalaryPaid = baseSalaryPaid; }
        public BigDecimal getTotalCommission() { return totalCommission; }
        public void setTotalCommission(BigDecimal totalCommission) { this.totalCommission = totalCommission; }
        public int getConversions() { return conversions; }
        public void setConversions(int conversions) { this.conversions = conversions; }
    }

    public static class TaxDocumentDTO {
        private String id;
        private String title;
        private String period;
        private String documentUrl;

        public TaxDocumentDTO() {}

        public TaxDocumentDTO(String id, String title, String period, String documentUrl) {
            this.id = id;
            this.title = title;
            this.period = period;
            this.documentUrl = documentUrl;
        }

        public String getId() { return id; }
        public void setId(String id) { this.id = id; }
        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getPeriod() { return period; }
        public void setPeriod(String period) { this.period = period; }
        public String getDocumentUrl() { return documentUrl; }
        public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }
    }
}
