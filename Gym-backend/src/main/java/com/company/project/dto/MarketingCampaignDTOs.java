package com.company.project.dto;

import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Wire types for /api/marketing-campaigns. camelCase on the wire (the global strategy is
 * SNAKE_CASE), like the lead-form DTOs the campaigns tab sits next to.
 */
public final class MarketingCampaignDTOs {

    private MarketingCampaignDTOs() {}

    // ── Requests ─────────────────────────────────────────────────────────────

    /** Create / update. On update, null fields are left unchanged. */
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record CampaignRequest(
            String name,
            String description,
            String platform,
            String objective,
            String status,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal budget,
            Integer targetLeads,
            Integer targetConversions,
            String trackingCode,
            String ownerName,
            String notes,
            Long branchId,
            // Create only: lead forms to link straight away (same as PUT /{id}/lead-forms).
            List<Long> leadFormIds,
            Boolean creditExistingLeads) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record StatusRequest(String status) {}

    /** Replaces the campaign's linked lead forms. */
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record LeadFormLinkRequest(List<Long> leadFormIds, Boolean creditExistingLeads) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record SpendRequest(LocalDate spendDate, String category, BigDecimal amount, BigDecimal hours, String notes) {}

    // ── Responses ────────────────────────────────────────────────────────────

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record LinkedForm(
            Long id,
            String name,
            String formKey,
            String source,
            boolean active,
            boolean missing,
            long leads,
            long conversions) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record Metrics(
            long leads,
            long newLeads,
            long contacted,
            long followUp,
            long converted,
            long lost,
            double conversionRate,
            BigDecimal spend,
            BigDecimal hours,
            BigDecimal costPerLead,
            BigDecimal costPerConversion,
            BigDecimal revenue,
            Double roi,
            Double budgetUsedPct,
            Double leadsPerHour,
            Double avgDaysToConvert,
            Double leadTargetPct,
            Double conversionTargetPct) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record Campaign(
            Long id,
            String campaignCode,
            String name,
            String description,
            String platform,
            String objective,
            String status,
            // draft / scheduled / live / ended / paused / completed / cancelled (status + dates)
            String phase,
            LocalDate startDate,
            LocalDate endDate,
            long durationDays,
            long daysElapsed,
            long daysRemaining,
            BigDecimal budget,
            Integer targetLeads,
            Integer targetConversions,
            String trackingCode,
            String ownerName,
            String notes,
            Long branchId,
            String branchName,
            List<LinkedForm> leadForms,
            Metrics metrics,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt,
            String createdBy) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record DailyPoint(LocalDate date, long leads, long conversions, BigDecimal spend, BigDecimal hours) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record Breakdown(String key, String label, long leads, long conversions, double conversionRate) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record CampaignLead(
            Long id,
            String leadId,
            String name,
            String phone,
            String status,
            String source,
            String assignedStaff,
            String leadFormName,
            Long memberId,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record Spend(
            Long id,
            LocalDate spendDate,
            String category,
            BigDecimal amount,
            BigDecimal hours,
            String notes,
            String createdBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt) {}

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record CampaignReport(
            Campaign campaign,
            List<DailyPoint> daily,
            List<Breakdown> bySource,
            List<Breakdown> byStaff,
            List<Breakdown> byForm,
            List<Spend> spends,
            List<CampaignLead> recentLeads) {}

    /** Lightweight row for pickers (Leads page "Campaign" field). */
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record CampaignOption(Long id, String name, String platform, String status, String phase,
                                 LocalDate startDate, LocalDate endDate) {}

    /** A lead form that can be linked, with the campaigns it already feeds. */
    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public record LeadFormOption(Long id, String name, String formKey, String source, boolean active,
                                 Long branchId, long submissionCount, List<String> campaigns) {}
}
