package com.company.project.dto;

import com.company.project.entities.GymOsSetting;

public class GymOsSettingResponseDTO {

    private Long id;
    private String category;
    private String settingKey;
    private String settingValue;

    public static GymOsSettingResponseDTO fromEntity(GymOsSetting setting) {
        GymOsSettingResponseDTO dto = new GymOsSettingResponseDTO();
        dto.id = setting.getId();
        dto.category = setting.getCategory();
        dto.settingKey = setting.getSettingKey();
        dto.settingValue = setting.getSettingValue();
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSettingKey() { return settingKey; }
    public void setSettingKey(String settingKey) { this.settingKey = settingKey; }

    public String getSettingValue() { return settingValue; }
    public void setSettingValue(String settingValue) { this.settingValue = settingValue; }
}
