package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.hibernate.annotations.Filter;

/** Manager decisions on one staff member's day: a status override (leave, holiday...) and overtime approval. */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "staff_attendance_days")
public class StaffAttendanceDay extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "staff_id", nullable = false)
    private Long staffId;

    @Column(name = "work_date", nullable = false)
    private LocalDate workDate;

    @Column(name = "day_status")
    private String dayStatus;

    @Column(name = "approval_status")
    private String approvalStatus;

    @Column(name = "approved_ot_minutes")
    private Integer approvedOtMinutes;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "reviewed_by")
    private String reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "branch_id")
    private Long branchId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getStaffId() { return staffId; }
    public void setStaffId(Long staffId) { this.staffId = staffId; }
    public LocalDate getWorkDate() { return workDate; }
    public void setWorkDate(LocalDate workDate) { this.workDate = workDate; }
    public String getDayStatus() { return dayStatus; }
    public void setDayStatus(String dayStatus) { this.dayStatus = dayStatus; }
    public String getApprovalStatus() { return approvalStatus; }
    public void setApprovalStatus(String approvalStatus) { this.approvalStatus = approvalStatus; }
    public Integer getApprovedOtMinutes() { return approvedOtMinutes; }
    public void setApprovedOtMinutes(Integer approvedOtMinutes) { this.approvedOtMinutes = approvedOtMinutes; }
    public String getNote() { return note; }
    public void setNote(String note) { this.note = note; }
    public String getReviewedBy() { return reviewedBy; }
    public void setReviewedBy(String reviewedBy) { this.reviewedBy = reviewedBy; }
    public LocalDateTime getReviewedAt() { return reviewedAt; }
    public void setReviewedAt(LocalDateTime reviewedAt) { this.reviewedAt = reviewedAt; }
    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
