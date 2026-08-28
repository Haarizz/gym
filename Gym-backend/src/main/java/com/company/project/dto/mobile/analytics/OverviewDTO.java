package com.company.project.dto.mobile.analytics;

import java.math.BigDecimal;
import java.util.List;

public class OverviewDTO {
    private double revenueGrowth;
    private double memberGrowth;
    private double churnRate;
    private double churnImprovement;
    private BigDecimal averageRevenuePerMember;
    private List<MemberChurnPointDTO> memberVsChurn;

    public OverviewDTO() {}

    public OverviewDTO(double revenueGrowth, double memberGrowth, double churnRate, double churnImprovement, BigDecimal averageRevenuePerMember, List<MemberChurnPointDTO> memberVsChurn) {
        this.revenueGrowth = revenueGrowth;
        this.memberGrowth = memberGrowth;
        this.churnRate = churnRate;
        this.churnImprovement = churnImprovement;
        this.averageRevenuePerMember = averageRevenuePerMember;
        this.memberVsChurn = memberVsChurn;
    }

    public double getRevenueGrowth() { return revenueGrowth; }
    public void setRevenueGrowth(double revenueGrowth) { this.revenueGrowth = revenueGrowth; }
    public double getMemberGrowth() { return memberGrowth; }
    public void setMemberGrowth(double memberGrowth) { this.memberGrowth = memberGrowth; }
    public double getChurnRate() { return churnRate; }
    public void setChurnRate(double churnRate) { this.churnRate = churnRate; }
    public double getChurnImprovement() { return churnImprovement; }
    public void setChurnImprovement(double churnImprovement) { this.churnImprovement = churnImprovement; }
    public BigDecimal getAverageRevenuePerMember() { return averageRevenuePerMember; }
    public void setAverageRevenuePerMember(BigDecimal averageRevenuePerMember) { this.averageRevenuePerMember = averageRevenuePerMember; }
    public List<MemberChurnPointDTO> getMemberVsChurn() { return memberVsChurn; }
    public void setMemberVsChurn(List<MemberChurnPointDTO> memberVsChurn) { this.memberVsChurn = memberVsChurn; }
}
