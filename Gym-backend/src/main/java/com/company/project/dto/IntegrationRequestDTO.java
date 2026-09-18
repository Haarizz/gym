package com.company.project.dto;

import java.math.BigDecimal;

public class IntegrationRequestDTO {

    private String integrationKey;
    private String name;
    private String category;
    private String status;
    private BigDecimal successRate;
    private String notes;

    public String getIntegrationKey() { return integrationKey; }
    public void setIntegrationKey(String integrationKey) { this.integrationKey = integrationKey; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public BigDecimal getSuccessRate() { return successRate; }
    public void setSuccessRate(BigDecimal successRate) { this.successRate = successRate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
