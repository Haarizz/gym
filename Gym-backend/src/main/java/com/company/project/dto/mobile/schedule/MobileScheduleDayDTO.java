package com.company.project.dto.mobile.schedule;

import java.time.LocalDate;
import java.util.List;

public class MobileScheduleDayDTO {
    private LocalDate date;
    private String dayOfWeek;
    private int sessionCount;
    private List<MobileSessionDTO> sessions;

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getDayOfWeek() { return dayOfWeek; }
    public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }

    public int getSessionCount() { return sessionCount; }
    public void setSessionCount(int sessionCount) { this.sessionCount = sessionCount; }

    public List<MobileSessionDTO> getSessions() { return sessions; }
    public void setSessions(List<MobileSessionDTO> sessions) { this.sessions = sessions; }
}
