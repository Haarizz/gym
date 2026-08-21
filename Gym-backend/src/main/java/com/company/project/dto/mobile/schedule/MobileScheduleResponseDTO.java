package com.company.project.dto.mobile.schedule;

import java.time.LocalDate;
import java.util.List;

public class MobileScheduleResponseDTO {
    private LocalDate startDate;
    private LocalDate endDate;
    private int totalSessions;
    private List<MobileScheduleDayDTO> days;

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public int getTotalSessions() { return totalSessions; }
    public void setTotalSessions(int totalSessions) { this.totalSessions = totalSessions; }

    public List<MobileScheduleDayDTO> getDays() { return days; }
    public void setDays(List<MobileScheduleDayDTO> days) { this.days = days; }
}
