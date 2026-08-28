package com.company.project.dto;

import com.company.project.entities.CommissionRule;
import java.math.BigDecimal;

public class CommissionRuleResponseDTO {
    private String id;
    private String role;
    private BigDecimal baseCommission;
    private BigDecimal admissionCommission;
    private String targetBonusesJson;

    public static CommissionRuleResponseDTO fromEntity(CommissionRule r) {
        CommissionRuleResponseDTO dto = new CommissionRuleResponseDTO();
        dto.id = String.valueOf(r.getId());
        dto.role = r.getRole();
        dto.baseCommission = r.getBaseCommission();
        dto.admissionCommission = r.getAdmissionCommission();
        dto.targetBonusesJson = r.getTargetBonusesJson();
        return dto;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public BigDecimal getBaseCommission() { return baseCommission; }
    public void setBaseCommission(BigDecimal baseCommission) { this.baseCommission = baseCommission; }
    public BigDecimal getAdmissionCommission() { return admissionCommission; }
    public void setAdmissionCommission(BigDecimal admissionCommission) { this.admissionCommission = admissionCommission; }
    public String getTargetBonusesJson() { return targetBonusesJson; }
    public void setTargetBonusesJson(String targetBonusesJson) { this.targetBonusesJson = targetBonusesJson; }
}
