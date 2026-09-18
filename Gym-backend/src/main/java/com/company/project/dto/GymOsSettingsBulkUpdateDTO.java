package com.company.project.dto;

import java.util.Map;

/** Bulk upsert payload for one category's settings, e.g. saving the whole Transfer Policy card at once. */
public class GymOsSettingsBulkUpdateDTO {

    private Map<String, String> settings;

    public Map<String, String> getSettings() { return settings; }
    public void setSettings(Map<String, String> settings) { this.settings = settings; }
}
