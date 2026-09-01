package com.company.project.dto.mobile.analytics;

import java.util.List;

public class MobileAdminAnalyticsResponseDTO {
    private List<String> aiInsights;
    private OverviewDTO overview;
    private RevenueDTO revenue;
    private OperationsDTO operations;

    public MobileAdminAnalyticsResponseDTO() {}

    public MobileAdminAnalyticsResponseDTO(List<String> aiInsights, OverviewDTO overview, RevenueDTO revenue, OperationsDTO operations) {
        this.aiInsights = aiInsights;
        this.overview = overview;
        this.revenue = revenue;
        this.operations = operations;
    }

    public List<String> getAiInsights() { return aiInsights; }
    public void setAiInsights(List<String> aiInsights) { this.aiInsights = aiInsights; }
    public OverviewDTO getOverview() { return overview; }
    public void setOverview(OverviewDTO overview) { this.overview = overview; }
    public RevenueDTO getRevenue() { return revenue; }
    public void setRevenue(RevenueDTO revenue) { this.revenue = revenue; }
    public OperationsDTO getOperations() { return operations; }
    public void setOperations(OperationsDTO operations) { this.operations = operations; }
}
