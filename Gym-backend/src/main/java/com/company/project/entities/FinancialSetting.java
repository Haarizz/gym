package com.company.project.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "financial_settings")
public class FinancialSetting extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "setting_key", nullable = false)
    private String settingKey;

    // Null for genuinely-global settings (GENERAL/ACCOUNTING/TAX/BANK categories).
    // Set only for COMPANY-category and APP_PREFERENCES/currency_code rows, which
    // are branch-scoped — see FinancialSettingService's BRANCH_SCOPED_CATEGORIES.
    // Deliberately NOT a BranchAware entity: that would force every category into
    // branch-scoping via the generic BranchSecurityListener, breaking the
    // genuinely-shared GENERAL/ACCOUNTING/TAX/BANK settings.
    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String settingValue;

    @Column(name = "category", nullable = false)
    private String category; // GENERAL, ACCOUNTING, TAX, BANK

    @Column(name = "description")
    private String description;

    @Column(name = "is_active")
    private Boolean isActive;

    public FinancialSetting() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSettingKey() { return settingKey; }
    public void setSettingKey(String settingKey) { this.settingKey = settingKey; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getSettingValue() { return settingValue; }
    public void setSettingValue(String settingValue) { this.settingValue = settingValue; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
