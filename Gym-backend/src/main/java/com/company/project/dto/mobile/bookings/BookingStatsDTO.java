package com.company.project.dto.mobile.bookings;

public class BookingStatsDTO {
    private int upcoming;
    private int thisWeek;
    private int attended;

    public BookingStatsDTO() {}

    public BookingStatsDTO(int upcoming, int thisWeek, int attended) {
        this.upcoming = upcoming;
        this.thisWeek = thisWeek;
        this.attended = attended;
    }

    public int getUpcoming() { return upcoming; }
    public void setUpcoming(int upcoming) { this.upcoming = upcoming; }

    public int getThisWeek() { return thisWeek; }
    public void setThisWeek(int thisWeek) { this.thisWeek = thisWeek; }

    public int getAttended() { return attended; }
    public void setAttended(int attended) { this.attended = attended; }
}
