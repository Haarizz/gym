package com.company.project.dto;

public class LeadStatsDTO {

    private long totalLeads;
    private long newLeads;
    private long contactedLeads;
    private long followUpLeads;
    private long convertedLeads;
    private long lostLeads;
    private double conversionRate;

    // Getters & Setters

    public long getTotalLeads() { return totalLeads; }
    public void setTotalLeads(long totalLeads) { this.totalLeads = totalLeads; }

    public long getNewLeads() { return newLeads; }
    public void setNewLeads(long newLeads) { this.newLeads = newLeads; }

    public long getContactedLeads() { return contactedLeads; }
    public void setContactedLeads(long contactedLeads) { this.contactedLeads = contactedLeads; }

    public long getFollowUpLeads() { return followUpLeads; }
    public void setFollowUpLeads(long followUpLeads) { this.followUpLeads = followUpLeads; }

    public long getConvertedLeads() { return convertedLeads; }
    public void setConvertedLeads(long convertedLeads) { this.convertedLeads = convertedLeads; }

    public long getLostLeads() { return lostLeads; }
    public void setLostLeads(long lostLeads) { this.lostLeads = lostLeads; }

    public double getConversionRate() { return conversionRate; }
    public void setConversionRate(double conversionRate) { this.conversionRate = conversionRate; }
}
