package com.company.project.dto.mobile.bookings;

import java.time.LocalDate;
import java.time.LocalTime;

public class AvailableClassDTO {
    private Long classId;
    private String className;
    private String type; // class | pt | facility
    private String trainerName;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private Integer durationMinutes;
    private String location;
    private Integer capacity;
    private Integer availableSpots;
    private String memberBookingState; // e.g. "CONFIRMED", "CANCELLED", null

    public AvailableClassDTO() {}

    public Long getClassId() { return classId; }
    public void setClassId(Long classId) { this.classId = classId; }

    public String getClassName() { return className; }
    public void setClassName(String className) { this.className = className; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTrainerName() { return trainerName; }
    public void setTrainerName(String trainerName) { this.trainerName = trainerName; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public LocalTime getStartTime() { return startTime; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }

    public LocalTime getEndTime() { return endTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }

    public Integer getDurationMinutes() { return durationMinutes; }
    public void setDurationMinutes(Integer durationMinutes) { this.durationMinutes = durationMinutes; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Integer getCapacity() { return capacity; }
    public void setCapacity(Integer capacity) { this.capacity = capacity; }

    public Integer getAvailableSpots() { return availableSpots; }
    public void setAvailableSpots(Integer availableSpots) { this.availableSpots = availableSpots; }

    public String getMemberBookingState() { return memberBookingState; }
    public void setMemberBookingState(String memberBookingState) { this.memberBookingState = memberBookingState; }

    // The session's price (null or 0 = free).
    private java.math.BigDecimal price;
    // Gym-local wall-clock time (ISO, no zone) after which a member's cancellation is not refunded.
    private String refundDeadline;
    // Whether a booking made now could still be cancelled with a refund (false inside the window).
    private boolean refundableIfBookedNow;

    public java.math.BigDecimal getPrice() { return price; }
    public void setPrice(java.math.BigDecimal price) { this.price = price; }

    public String getRefundDeadline() { return refundDeadline; }
    public void setRefundDeadline(String refundDeadline) { this.refundDeadline = refundDeadline; }

    public boolean isRefundableIfBookedNow() { return refundableIfBookedNow; }
    public void setRefundableIfBookedNow(boolean refundableIfBookedNow) { this.refundableIfBookedNow = refundableIfBookedNow; }
}
