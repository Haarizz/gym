package com.company.project.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.Map;

public class FacilityRequestDTO {

    private String name;

    @JsonProperty("occupancy_limit")
    private Integer occupancyLimit;

    private String status;

    private String description;

    @JsonProperty("icon_name")
    private String iconName;

    // e.g. { "Per Hour": 100.00, "Per Half Day": 400.00 }
    private Map<String, BigDecimal> rates;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getOccupancyLimit() { return occupancyLimit; }
    public void setOccupancyLimit(Integer occupancyLimit) { this.occupancyLimit = occupancyLimit; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIconName() { return iconName; }
    public void setIconName(String iconName) { this.iconName = iconName; }

    public Map<String, BigDecimal> getRates() { return rates; }
    public void setRates(Map<String, BigDecimal> rates) { this.rates = rates; }
}
