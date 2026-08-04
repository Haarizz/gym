package com.company.project.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import java.time.LocalDateTime;
import java.util.List;

@JsonNaming(PropertyNamingStrategies.LowerCamelCaseStrategy.class)
public class ApplyAccessDaysResponseDTO {

    private boolean success;
    private int appliedCount;
    private int skippedCount;
    private int totalDaysApplied;
    private LocalDateTime appliedAt;
    private List<String> skippedMemberIds;

    public ApplyAccessDaysResponseDTO() {}

    public ApplyAccessDaysResponseDTO(boolean success, int appliedCount, int skippedCount,
                                       int totalDaysApplied, LocalDateTime appliedAt,
                                       List<String> skippedMemberIds) {
        this.success = success;
        this.appliedCount = appliedCount;
        this.skippedCount = skippedCount;
        this.totalDaysApplied = totalDaysApplied;
        this.appliedAt = appliedAt;
        this.skippedMemberIds = skippedMemberIds;
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public int getAppliedCount() { return appliedCount; }
    public void setAppliedCount(int appliedCount) { this.appliedCount = appliedCount; }

    public int getSkippedCount() { return skippedCount; }
    public void setSkippedCount(int skippedCount) { this.skippedCount = skippedCount; }

    public int getTotalDaysApplied() { return totalDaysApplied; }
    public void setTotalDaysApplied(int totalDaysApplied) { this.totalDaysApplied = totalDaysApplied; }

    public LocalDateTime getAppliedAt() { return appliedAt; }
    public void setAppliedAt(LocalDateTime appliedAt) { this.appliedAt = appliedAt; }

    public List<String> getSkippedMemberIds() { return skippedMemberIds; }
    public void setSkippedMemberIds(List<String> skippedMemberIds) { this.skippedMemberIds = skippedMemberIds; }
}
