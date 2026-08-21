package com.company.project.dto.mobile.dashboard;

import java.util.ArrayList;
import java.util.List;

public class StaffDashboardResponseDTO {

    private StaffInfoDTO staffInfo;
    private StaffTodayStatsDTO todaysStats;
    private List<UrgentFollowUpDTO> urgentFollowUps = new ArrayList<>();
    private List<RecentConversionDTO> recentConversions = new ArrayList<>();
    private StaffMonthSummaryDTO monthlySummary;

    public StaffDashboardResponseDTO() {}

    public StaffDashboardResponseDTO(
            StaffInfoDTO staffInfo,
            StaffTodayStatsDTO todaysStats,
            List<UrgentFollowUpDTO> urgentFollowUps,
            List<RecentConversionDTO> recentConversions,
            StaffMonthSummaryDTO monthlySummary) {
        this.staffInfo = staffInfo;
        this.todaysStats = todaysStats;
        this.urgentFollowUps = urgentFollowUps != null ? urgentFollowUps : new ArrayList<>();
        this.recentConversions = recentConversions != null ? recentConversions : new ArrayList<>();
        this.monthlySummary = monthlySummary;
    }

    public StaffInfoDTO getStaffInfo() {
        return staffInfo;
    }

    public void setStaffInfo(StaffInfoDTO staffInfo) {
        this.staffInfo = staffInfo;
    }

    public StaffTodayStatsDTO getTodaysStats() {
        return todaysStats;
    }

    public void setTodaysStats(StaffTodayStatsDTO todaysStats) {
        this.todaysStats = todaysStats;
    }

    public List<UrgentFollowUpDTO> getUrgentFollowUps() {
        return urgentFollowUps;
    }

    public void setUrgentFollowUps(List<UrgentFollowUpDTO> urgentFollowUps) {
        this.urgentFollowUps = urgentFollowUps != null ? urgentFollowUps : new ArrayList<>();
    }

    public List<RecentConversionDTO> getRecentConversions() {
        return recentConversions;
    }

    public void setRecentConversions(List<RecentConversionDTO> recentConversions) {
        this.recentConversions = recentConversions != null ? recentConversions : new ArrayList<>();
    }

    public StaffMonthSummaryDTO getMonthlySummary() {
        return monthlySummary;
    }

    public void setMonthlySummary(StaffMonthSummaryDTO monthlySummary) {
        this.monthlySummary = monthlySummary;
    }

    // ── Nested DTOs ─────────────────────────────────────────────────────────────

    public static class StaffInfoDTO {
        private String name;
        private String role;
        private String branch;

        public StaffInfoDTO() {}

        public StaffInfoDTO(String name, String role, String branch) {
            this.name = name != null ? name : "";
            this.role = role != null ? role : "";
            this.branch = branch != null ? branch : "";
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getRole() {
            return role;
        }

        public void setRole(String role) {
            this.role = role;
        }

        public String getBranch() {
            return branch;
        }

        public void setBranch(String branch) {
            this.branch = branch;
        }
    }

    public static class StaffTodayStatsDTO {
        private int leadsAdded;
        private int followUpsCompleted;
        private int conversions;
        private int checkins;

        public StaffTodayStatsDTO() {}

        public StaffTodayStatsDTO(int leadsAdded, int followUpsCompleted, int conversions, int checkins) {
            this.leadsAdded = leadsAdded;
            this.followUpsCompleted = followUpsCompleted;
            this.conversions = conversions;
            this.checkins = checkins;
        }

        public int getLeadsAdded() {
            return leadsAdded;
        }

        public void setLeadsAdded(int leadsAdded) {
            this.leadsAdded = leadsAdded;
        }

        public int getFollowUpsCompleted() {
            return followUpsCompleted;
        }

        public void setFollowUpsCompleted(int followUpsCompleted) {
            this.followUpsCompleted = followUpsCompleted;
        }

        public int getConversions() {
            return conversions;
        }

        public void setConversions(int conversions) {
            this.conversions = conversions;
        }

        public int getCheckins() {
            return checkins;
        }

        public void setCheckins(int checkins) {
            this.checkins = checkins;
        }
    }

    public static class UrgentFollowUpDTO {
        private Long id;
        private String name;
        private String phone;
        private String inquiry;
        private String lastContact;
        private String priority; // "high" | "medium" | "low"

        public UrgentFollowUpDTO() {}

        public UrgentFollowUpDTO(Long id, String name, String phone, String inquiry, String lastContact, String priority) {
            this.id = id;
            this.name = name != null ? name : "";
            this.phone = phone != null ? phone : "";
            this.inquiry = inquiry != null ? inquiry : "";
            this.lastContact = lastContact != null ? lastContact : "Never";
            this.priority = priority != null ? priority : "medium";
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getPhone() {
            return phone;
        }

        public void setPhone(String phone) {
            this.phone = phone;
        }

        public String getInquiry() {
            return inquiry;
        }

        public void setInquiry(String inquiry) {
            this.inquiry = inquiry;
        }

        public String getLastContact() {
            return lastContact;
        }

        public void setLastContact(String lastContact) {
            this.lastContact = lastContact;
        }

        public String getPriority() {
            return priority;
        }

        public void setPriority(String priority) {
            this.priority = priority;
        }
    }

    public static class RecentConversionDTO {
        private Long id;
        private String name;
        private String plan;
        private String amount;

        public RecentConversionDTO() {}

        public RecentConversionDTO(Long id, String name, String plan, String amount) {
            this.id = id;
            this.name = name != null ? name : "";
            this.plan = plan != null ? plan : "";
            this.amount = amount != null ? amount : "₹0";
        }

        public Long getId() {
            return id;
        }

        public void setId(Long id) {
            this.id = id;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getPlan() {
            return plan;
        }

        public void setPlan(String plan) {
            this.plan = plan;
        }

        public String getAmount() {
            return amount;
        }

        public void setAmount(String amount) {
            this.amount = amount;
        }
    }

    public static class StaffMonthSummaryDTO {
        private int targetAchievement;
        private int totalConversions;
        private String revenueGenerated;
        private int conversionRate;

        public StaffMonthSummaryDTO() {}

        public StaffMonthSummaryDTO(int targetAchievement, int totalConversions, String revenueGenerated, int conversionRate) {
            this.targetAchievement = targetAchievement;
            this.totalConversions = totalConversions;
            this.revenueGenerated = revenueGenerated != null ? revenueGenerated : "₹0";
            this.conversionRate = conversionRate;
        }

        public int getTargetAchievement() {
            return targetAchievement;
        }

        public void setTargetAchievement(int targetAchievement) {
            this.targetAchievement = targetAchievement;
        }

        public int getTotalConversions() {
            return totalConversions;
        }

        public void setTotalConversions(int totalConversions) {
            this.totalConversions = totalConversions;
        }

        public String getRevenueGenerated() {
            return revenueGenerated;
        }

        public void setRevenueGenerated(String revenueGenerated) {
            this.revenueGenerated = revenueGenerated;
        }

        public int getConversionRate() {
            return conversionRate;
        }

        public void setConversionRate(int conversionRate) {
            this.conversionRate = conversionRate;
        }
    }
}
