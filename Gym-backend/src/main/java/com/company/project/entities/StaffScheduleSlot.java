package com.company.project.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "staff_schedule_slots")
public class StaffScheduleSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "staff_db_id", nullable = false)
    private Staff staff;

    // Monday, Tuesday, etc.
    private String day;

    // Morning (6am-12pm) / Afternoon (12pm-5pm) / Evening (5pm-10pm)
    private String slot;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Staff getStaff() { return staff; }
    public void setStaff(Staff staff) { this.staff = staff; }
    public String getDay() { return day; }
    public void setDay(String day) { this.day = day; }
    public String getSlot() { return slot; }
    public void setSlot(String slot) { this.slot = slot; }
}
