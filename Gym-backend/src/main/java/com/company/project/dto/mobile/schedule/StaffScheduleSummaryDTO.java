package com.company.project.dto.mobile.schedule;

public class StaffScheduleSummaryDTO {
    private int today;
    private int thisWeek;
    private int pending;
    private int highPriority;

    public StaffScheduleSummaryDTO() {}

    public StaffScheduleSummaryDTO(int today, int thisWeek, int pending, int highPriority) {
        this.today = today;
        this.thisWeek = thisWeek;
        this.pending = pending;
        this.highPriority = highPriority;
    }

    public int getToday() { return today; }
    public void setToday(int today) { this.today = today; }

    public int getThisWeek() { return thisWeek; }
    public void setThisWeek(int thisWeek) { this.thisWeek = thisWeek; }

    public int getPending() { return pending; }
    public void setPending(int pending) { this.pending = pending; }

    public int getHighPriority() { return highPriority; }
    public void setHighPriority(int highPriority) { this.highPriority = highPriority; }
}
