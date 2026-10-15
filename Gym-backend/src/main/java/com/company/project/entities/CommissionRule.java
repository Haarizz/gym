package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "commission_rules")
public class CommissionRule extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String role;

    @Column(name = "base_commission", precision = 5, scale = 2)
    private BigDecimal baseCommission;

    // Percentage applied to revenue from brand-new member admissions (Receipt
    // transactionType "New") instead of baseCommission, which still applies to
    // everything else (renewals, add-ons, walk-ins). Null falls back to baseCommission.
    @Column(name = "admission_commission", precision = 5, scale = 2)
    private BigDecimal admissionCommission;

    // POS sales rung up by this role (V88): a percentage of each completed sale's net
    // amount and/or a fixed amount per completed sale. Null = no POS commission.
    @Column(name = "pos_commission", precision = 5, scale = 2)
    private BigDecimal posCommission;

    @Column(name = "pos_commission_per_sale", precision = 10, scale = 2)
    private BigDecimal posCommissionPerSale;

    // JSON: [{"threshold":100,"bonus":2.0},{"threshold":120,"bonus":3.0}]
    @Column(name = "target_bonuses_json", columnDefinition = "TEXT")
    private String targetBonusesJson = "[]";

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
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
