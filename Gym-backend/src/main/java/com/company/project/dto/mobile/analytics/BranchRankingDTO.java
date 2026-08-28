package com.company.project.dto.mobile.analytics;

import java.math.BigDecimal;

public class BranchRankingDTO {
    private int rank;
    private String branchName;
    private double rating;
    private BigDecimal revenue;
    private int members;

    public BranchRankingDTO() {}

    public BranchRankingDTO(int rank, String branchName, double rating, BigDecimal revenue, int members) {
        this.rank = rank;
        this.branchName = branchName;
        this.rating = rating;
        this.revenue = revenue;
        this.members = members;
    }

    public int getRank() { return rank; }
    public void setRank(int rank) { this.rank = rank; }
    public String getBranchName() { return branchName; }
    public void setBranchName(String branchName) { this.branchName = branchName; }
    public double getRating() { return rating; }
    public void setRating(double rating) { this.rating = rating; }
    public BigDecimal getRevenue() { return revenue; }
    public void setRevenue(BigDecimal revenue) { this.revenue = revenue; }
    public int getMembers() { return members; }
    public void setMembers(int members) { this.members = members; }
}
