package com.company.project.dto;

import com.company.project.entities.CommissionRule;
import java.math.BigDecimal;

public class CommissionRuleResponseDTO {
    private String id;
    private String role;
    private BigDecimal baseCommission;
    private BigDecimal admissionCommission;
    private BigDecimal posCommission;
    private BigDecimal posCommissionPerSale;
    private String targetBonusesJson;

    public static CommissionRuleResponseDTO fromEntity(CommissionRule r) {
        CommissionRuleResponseDTO dto = new CommissionRuleResponseDTO();
        dto.id = String.valueOf(r.getId());
        dto.role = r.getRole();
        dto.baseCommission = r.getBaseCommission();
        dto.admissionCommission = r.getAdmissionCommission();
        dto.posCommission = r.getPosCommission();
        dto.posCommissionPerSale = r.getPosCommissionPerSale();
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
    public BigDecimal getPosCommission() { return posCommission; }
    public void setPosCommission(BigDecimal posCommission) { this.posCommission = posCommission; }
    public BigDecimal getPosCommissionPerSale() { return posCommissionPerSale; }
    public void setPosCommissionPerSale(BigDecimal posCommissionPerSale) { this.posCommissionPerSale = posCommissionPerSale; }
    public String getTargetBonusesJson() { return targetBonusesJson; }
    public void setTargetBonusesJson(String targetBonusesJson) { this.targetBonusesJson = targetBonusesJson; }
}
