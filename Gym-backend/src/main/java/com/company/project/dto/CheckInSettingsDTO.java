package com.company.project.dto;

public class CheckInSettingsDTO {

    private Integer minVisitMinutes;
    private Integer breakGraceMinutes;
    private Integer cooldownMinutes;

    public CheckInSettingsDTO() {}

    public CheckInSettingsDTO(Integer minVisitMinutes, Integer breakGraceMinutes, Integer cooldownMinutes) {
        this.minVisitMinutes = minVisitMinutes;
        this.breakGraceMinutes = breakGraceMinutes;
        this.cooldownMinutes = cooldownMinutes;
    }

    public Integer getMinVisitMinutes() { return minVisitMinutes; }
    public void setMinVisitMinutes(Integer minVisitMinutes) { this.minVisitMinutes = minVisitMinutes; }

    public Integer getBreakGraceMinutes() { return breakGraceMinutes; }
    public void setBreakGraceMinutes(Integer breakGraceMinutes) { this.breakGraceMinutes = breakGraceMinutes; }

    public Integer getCooldownMinutes() { return cooldownMinutes; }
    public void setCooldownMinutes(Integer cooldownMinutes) { this.cooldownMinutes = cooldownMinutes; }
}
