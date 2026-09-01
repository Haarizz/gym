package com.company.project.dto.mobile.analytics;

public class MemberChurnPointDTO {
    private String month;
    private int newMembers;
    private int churned;

    public MemberChurnPointDTO() {}

    public MemberChurnPointDTO(String month, int newMembers, int churned) {
        this.month = month;
        this.newMembers = newMembers;
        this.churned = churned;
    }

    public String getMonth() { return month; }
    public void setMonth(String month) { this.month = month; }
    public int getNewMembers() { return newMembers; }
    public void setNewMembers(int newMembers) { this.newMembers = newMembers; }
    public int getChurned() { return churned; }
    public void setChurned(int churned) { this.churned = churned; }
}
