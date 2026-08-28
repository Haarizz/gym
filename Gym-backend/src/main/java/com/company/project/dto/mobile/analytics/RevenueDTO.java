package com.company.project.dto.mobile.analytics;

import java.util.List;

public class RevenueDTO {
    private List<MonthlyTrendPointDTO> trend;
    private List<BranchRankingDTO> branchRankings;

    public RevenueDTO() {}

    public RevenueDTO(List<MonthlyTrendPointDTO> trend, List<BranchRankingDTO> branchRankings) {
        this.trend = trend;
        this.branchRankings = branchRankings;
    }

    public List<MonthlyTrendPointDTO> getTrend() { return trend; }
    public void setTrend(List<MonthlyTrendPointDTO> trend) { this.trend = trend; }
    public List<BranchRankingDTO> getBranchRankings() { return branchRankings; }
    public void setBranchRankings(List<BranchRankingDTO> branchRankings) { this.branchRankings = branchRankings; }
}
