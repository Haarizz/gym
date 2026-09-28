package com.company.project.dto;

/**
 * Branch-scoped headcount KPIs for the admin Staff Management screen.
 * "Present"/"absent" are today's figures among active staff, derived from staff clock-ins.
 */
public class StaffSummaryDTO {

    private long totalStaff;
    private long activeStaff;
    private long inactiveStaff;
    private long presentToday;
    private long absentToday;

    public StaffSummaryDTO() {}

    public StaffSummaryDTO(long totalStaff, long activeStaff, long inactiveStaff, long presentToday, long absentToday) {
        this.totalStaff    = totalStaff;
        this.activeStaff   = activeStaff;
        this.inactiveStaff = inactiveStaff;
        this.presentToday  = presentToday;
        this.absentToday   = absentToday;
    }

    public long getTotalStaff() { return totalStaff; }
    public void setTotalStaff(long totalStaff) { this.totalStaff = totalStaff; }
    public long getActiveStaff() { return activeStaff; }
    public void setActiveStaff(long activeStaff) { this.activeStaff = activeStaff; }
    public long getInactiveStaff() { return inactiveStaff; }
    public void setInactiveStaff(long inactiveStaff) { this.inactiveStaff = inactiveStaff; }
    public long getPresentToday() { return presentToday; }
    public void setPresentToday(long presentToday) { this.presentToday = presentToday; }
    public long getAbsentToday() { return absentToday; }
    public void setAbsentToday(long absentToday) { this.absentToday = absentToday; }
}
