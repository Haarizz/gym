package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.time.LocalDateTime;

/**
 * A visitor's own walk-in sign-up from the public QR page. It grants nothing by
 * itself: staff collect payment through the normal walk-in check-in, which marks
 * this row confirmed and links the Attendance it created.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "walk_in_registrations")
public class WalkInRegistration extends BaseEntity implements BranchAware {

    public static final String PENDING = "pending";
    public static final String CONFIRMED = "confirmed";
    public static final String DISMISSED = "dismissed";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, length = 50)
    private String phone;

    private String email;

    // The Walk-In plan the visitor picked — staff may still change it at the desk.
    @Column(name = "plan_id")
    private Long planId;

    @Column(name = "plan_name")
    private String planName;

    // Staff whose personal QR was scanned; credited when the walk-in is paid.
    @Column(name = "referred_by_staff_id")
    private Long referredByStaffId;

    @Column(name = "referred_by_staff_name")
    private String referredByStaffName;

    // pending | confirmed | dismissed
    @Column(nullable = false, length = 20, columnDefinition = "varchar(20) default 'pending'")
    private String status = PENDING;

    @Column(name = "attendance_id")
    private Long attendanceId;

    @Column(name = "confirmed_at")
    private LocalDateTime confirmedAt;

    @Column(name = "branch_id")
    private Long branchId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public Long getPlanId() { return planId; }
    public void setPlanId(Long planId) { this.planId = planId; }

    public String getPlanName() { return planName; }
    public void setPlanName(String planName) { this.planName = planName; }

    public Long getReferredByStaffId() { return referredByStaffId; }
    public void setReferredByStaffId(Long referredByStaffId) { this.referredByStaffId = referredByStaffId; }

    public String getReferredByStaffName() { return referredByStaffName; }
    public void setReferredByStaffName(String referredByStaffName) { this.referredByStaffName = referredByStaffName; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getAttendanceId() { return attendanceId; }
    public void setAttendanceId(Long attendanceId) { this.attendanceId = attendanceId; }

    public LocalDateTime getConfirmedAt() { return confirmedAt; }
    public void setConfirmedAt(LocalDateTime confirmedAt) { this.confirmedAt = confirmedAt; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
