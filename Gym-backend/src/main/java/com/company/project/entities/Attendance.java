package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "attendance")
public class Attendance extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = true)
    private Member member;

    // Nullable — only set when check-in was triggered by a specific booking (e.g. QR on a class booking)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(name = "check_in_time", nullable = false)
    private LocalDateTime checkInTime;

    // qr | face | manual | app
    @Column(name = "check_in_method")
    private String checkInMethod;

    // The physical or logical source: "GATE-01", "SCANNER-01", "WEB", "MOBILE"
    @Column(name = "device_id")
    private String deviceId;

    // What identifier resolved the member: "qr_code" | "face_id" | "member_id" | "booking_id"
    @Column(name = "resolved_by")
    private String resolvedBy;

    // Lifecycle
    @Column(name = "check_out_time")
    private java.time.LocalDateTime checkOutTime;

    // active | completed
    @Column(nullable = false, columnDefinition = "varchar(255) default 'active'")
    private String status = "active";

    // member | walk_in
    @Column(nullable = false, columnDefinition = "varchar(255) default 'member'")
    private String type = "member";

    // e.g. "Strength Training", "Yoga Class", "Cardio"
    @Column(name = "activity_type")
    private String activityType;

    // Calculated on checkout: checkOutTime − checkInTime in minutes
    @Column(name = "total_minutes")
    private Integer totalMinutes;

    // Walk-in visitor fields (null for regular members)
    @Column(name = "walk_in_name")
    private String walkInName;

    @Column(name = "walk_in_phone")
    private String walkInPhone;

    @Column(name = "walk_in_email")
    private String walkInEmail;

    // "paid" | "pending" — for walk-in sessions
    @Column(name = "walk_in_payment_status")
    private String walkInPaymentStatus;

    // The day-pass amount, structured (not just embedded in notes text) so it can
    // actually be posted to the ledger via ReceiptVoucherService/FinancialEventService.
    @Column(name = "walk_in_amount", precision = 12, scale = 2)
    private java.math.BigDecimal walkInAmount;

    @Column(name = "walk_in_payment_method")
    private String walkInPaymentMethod;

    @Column(columnDefinition = "TEXT")
    private String notes;

    public Attendance() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Member getMember() { return member; }
    public void setMember(Member member) { this.member = member; }

    public Booking getBooking() { return booking; }
    public void setBooking(Booking booking) { this.booking = booking; }

    public LocalDateTime getCheckInTime() { return checkInTime; }
    public void setCheckInTime(LocalDateTime checkInTime) { this.checkInTime = checkInTime; }

    public String getCheckInMethod() { return checkInMethod; }
    public void setCheckInMethod(String checkInMethod) { this.checkInMethod = checkInMethod; }

    public String getDeviceId() { return deviceId; }
    public void setDeviceId(String deviceId) { this.deviceId = deviceId; }

    public String getResolvedBy() { return resolvedBy; }
    public void setResolvedBy(String resolvedBy) { this.resolvedBy = resolvedBy; }

    public java.time.LocalDateTime getCheckOutTime() { return checkOutTime; }
    public void setCheckOutTime(java.time.LocalDateTime checkOutTime) { this.checkOutTime = checkOutTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getActivityType() { return activityType; }
    public void setActivityType(String activityType) { this.activityType = activityType; }

    public Integer getTotalMinutes() { return totalMinutes; }
    public void setTotalMinutes(Integer totalMinutes) { this.totalMinutes = totalMinutes; }

    public String getWalkInName() { return walkInName; }
    public void setWalkInName(String walkInName) { this.walkInName = walkInName; }

    public String getWalkInPhone() { return walkInPhone; }
    public void setWalkInPhone(String walkInPhone) { this.walkInPhone = walkInPhone; }

    public String getWalkInEmail() { return walkInEmail; }
    public void setWalkInEmail(String walkInEmail) { this.walkInEmail = walkInEmail; }

    public String getWalkInPaymentStatus() { return walkInPaymentStatus; }
    public void setWalkInPaymentStatus(String walkInPaymentStatus) { this.walkInPaymentStatus = walkInPaymentStatus; }

    public java.math.BigDecimal getWalkInAmount() { return walkInAmount; }
    public void setWalkInAmount(java.math.BigDecimal walkInAmount) { this.walkInAmount = walkInAmount; }

    public String getWalkInPaymentMethod() { return walkInPaymentMethod; }
    public void setWalkInPaymentMethod(String walkInPaymentMethod) { this.walkInPaymentMethod = walkInPaymentMethod; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
