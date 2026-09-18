package com.company.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * Generic key/value settings backing GymOS's Configuration tab (Transfer
 * Policy, Member Deactivation Policy) and System Overview's System
 * Configuration widget, replacing gymos.tsx's hardcoded values. Gym-wide,
 * not branch-scoped, mirroring FinancialSetting's shared-category rows.
 */
@Entity
@Table(name = "gymos_settings", uniqueConstraints = @UniqueConstraint(columnNames = {"category", "setting_key"}))
public class GymOsSetting extends BaseEntity {

    public static final String CATEGORY_TRANSFER_POLICY = "TRANSFER_POLICY";
    public static final String CATEGORY_DEACTIVATION_POLICY = "DEACTIVATION_POLICY";
    public static final String CATEGORY_SYSTEM_CONFIG = "SYSTEM_CONFIG";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String category;

    @Column(name = "setting_key", nullable = false)
    private String settingKey;

    @Column(name = "setting_value", columnDefinition = "TEXT")
    private String settingValue;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSettingKey() { return settingKey; }
    public void setSettingKey(String settingKey) { this.settingKey = settingKey; }

    public String getSettingValue() { return settingValue; }
    public void setSettingValue(String settingValue) { this.settingValue = settingValue; }
}
