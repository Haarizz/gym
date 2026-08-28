package com.company.project.dto.mobile.analytics;

public class ClassUtilizationDTO {
    private String classType;
    private int utilization;

    public ClassUtilizationDTO() {}

    public ClassUtilizationDTO(String classType, int utilization) {
        this.classType = classType;
        this.utilization = utilization;
    }

    public String getClassType() { return classType; }
    public void setClassType(String classType) { this.classType = classType; }
    public int getUtilization() { return utilization; }
    public void setUtilization(int utilization) { this.utilization = utilization; }
}
