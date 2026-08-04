package com.company.project.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

// Shape matches the frontend's policyRuleEngine.ts `Member` type exactly, so the
// existing (already-correct) client-side rule engine can evaluate real member
// data instead of the hardcoded sample members it previously ran against.
@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class EligibleMemberDTO {

    private String id;
    private String name;
    private String email;
    private String membershipType;
    private String joinedAt;
    private CurrentPlan currentPlan;
    private Integer renewalCount;
    private String purchaseDate;

    public EligibleMemberDTO() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getMembershipType() { return membershipType; }
    public void setMembershipType(String membershipType) { this.membershipType = membershipType; }

    public String getJoinedAt() { return joinedAt; }
    public void setJoinedAt(String joinedAt) { this.joinedAt = joinedAt; }

    public CurrentPlan getCurrentPlan() { return currentPlan; }
    public void setCurrentPlan(CurrentPlan currentPlan) { this.currentPlan = currentPlan; }

    public Integer getRenewalCount() { return renewalCount; }
    public void setRenewalCount(Integer renewalCount) { this.renewalCount = renewalCount; }

    public String getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(String purchaseDate) { this.purchaseDate = purchaseDate; }

    @JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
    public static class CurrentPlan {
        private String name;
        private int durationMonths;

        public CurrentPlan() {}

        public CurrentPlan(String name, int durationMonths) {
            this.name = name;
            this.durationMonths = durationMonths;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public int getDurationMonths() { return durationMonths; }
        public void setDurationMonths(int durationMonths) { this.durationMonths = durationMonths; }
    }
}
