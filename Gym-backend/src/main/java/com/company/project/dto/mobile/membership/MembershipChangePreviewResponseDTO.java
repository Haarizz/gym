package com.company.project.dto.mobile.membership;

import java.math.BigDecimal;
import java.util.List;

public class MembershipChangePreviewResponseDTO {
    private MobileMembershipPlanDTO selectedPlan;
    private String operation; // RENEWAL, UPGRADE, DOWNGRADE
    private BigDecimal regularAmount;
    private BigDecimal discountAmount;
    private BigDecimal finalAmount;
    private List<String> features;

    public MobileMembershipPlanDTO getSelectedPlan() { return selectedPlan; }
    public void setSelectedPlan(MobileMembershipPlanDTO selectedPlan) { this.selectedPlan = selectedPlan; }

    public String getOperation() { return operation; }
    public void setOperation(String operation) { this.operation = operation; }

    public BigDecimal getRegularAmount() { return regularAmount; }
    public void setRegularAmount(BigDecimal regularAmount) { this.regularAmount = regularAmount; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getFinalAmount() { return finalAmount; }
    public void setFinalAmount(BigDecimal finalAmount) { this.finalAmount = finalAmount; }

    public List<String> getFeatures() { return features; }
    public void setFeatures(List<String> features) { this.features = features; }
}
