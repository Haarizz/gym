package com.company.project.dto.mobile.schedule;

import java.time.LocalDate;
import java.util.List;

public class StaffScheduleResponseDTO {
    private LocalDate date;
    private StaffScheduleSummaryDTO summary;
    private List<StaffScheduleTaskDTO> tasks;
    private List<UpcomingFollowUpDTO> upcomingFollowUps;

    public StaffScheduleResponseDTO() {}

    public StaffScheduleResponseDTO(LocalDate date, StaffScheduleSummaryDTO summary, List<StaffScheduleTaskDTO> tasks, List<UpcomingFollowUpDTO> upcomingFollowUps) {
        this.date = date;
        this.summary = summary;
        this.tasks = tasks;
        this.upcomingFollowUps = upcomingFollowUps;
    }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public StaffScheduleSummaryDTO getSummary() { return summary; }
    public void setSummary(StaffScheduleSummaryDTO summary) { this.summary = summary; }

    public List<StaffScheduleTaskDTO> getTasks() { return tasks; }
    public void setTasks(List<StaffScheduleTaskDTO> tasks) { this.tasks = tasks; }

    public List<UpcomingFollowUpDTO> getUpcomingFollowUps() { return upcomingFollowUps; }
    public void setUpcomingFollowUps(List<UpcomingFollowUpDTO> upcomingFollowUps) { this.upcomingFollowUps = upcomingFollowUps; }
}
