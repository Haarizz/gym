package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import org.hibernate.annotations.Filter;

/** Shift template: working hours, break, grace periods and overtime policy. A shift whose check-out is not after its check-in runs past midnight. */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "shifts")
public class Shift extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "code")
    private String code;

    @Column(name = "shift_type", nullable = false)
    private String shiftType = "fixed";

    @Column(name = "status", nullable = false)
    private String status = "active";

    @Column(name = "check_in", nullable = false)
    private LocalTime checkIn;

    @Column(name = "check_out", nullable = false)
    private LocalTime checkOut;

    @Column(name = "break_start")
    private LocalTime breakStart;

    @Column(name = "break_end")
    private LocalTime breakEnd;

    @Column(name = "grace_in_minutes", nullable = false)
    private Integer graceInMinutes = 10;

    @Column(name = "grace_out_minutes", nullable = false)
    private Integer graceOutMinutes = 15;

    @Column(name = "ot_after_minutes", nullable = false)
    private Integer otAfterMinutes = 15;

    @Column(name = "max_daily_ot_hours", precision = 5, scale = 2)
    private BigDecimal maxDailyOtHours;

    @Column(name = "max_weekly_hours", precision = 5, scale = 2)
    private BigDecimal maxWeeklyHours;

    @Column(name = "overtime_policy", nullable = false)
    private String overtimePolicy = "approval";

    @Column(name = "work_days", nullable = false)
    private String workDays = "Mon,Tue,Wed,Thu,Fri";

    @Column(name = "departments", columnDefinition = "TEXT")
    private String departments;

    @Column(name = "effective_from")
    private LocalDate effectiveFrom;

    @Column(name = "effective_to")
    private LocalDate effectiveTo;

    @Column(name = "branch_id")
    private Long branchId;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getShiftType() { return shiftType; }
    public void setShiftType(String shiftType) { this.shiftType = shiftType; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalTime getCheckIn() { return checkIn; }
    public void setCheckIn(LocalTime checkIn) { this.checkIn = checkIn; }
    public LocalTime getCheckOut() { return checkOut; }
    public void setCheckOut(LocalTime checkOut) { this.checkOut = checkOut; }
    public LocalTime getBreakStart() { return breakStart; }
    public void setBreakStart(LocalTime breakStart) { this.breakStart = breakStart; }
    public LocalTime getBreakEnd() { return breakEnd; }
    public void setBreakEnd(LocalTime breakEnd) { this.breakEnd = breakEnd; }
    public Integer getGraceInMinutes() { return graceInMinutes; }
    public void setGraceInMinutes(Integer graceInMinutes) { this.graceInMinutes = graceInMinutes; }
    public Integer getGraceOutMinutes() { return graceOutMinutes; }
    public void setGraceOutMinutes(Integer graceOutMinutes) { this.graceOutMinutes = graceOutMinutes; }
    public Integer getOtAfterMinutes() { return otAfterMinutes; }
    public void setOtAfterMinutes(Integer otAfterMinutes) { this.otAfterMinutes = otAfterMinutes; }
    public BigDecimal getMaxDailyOtHours() { return maxDailyOtHours; }
    public void setMaxDailyOtHours(BigDecimal maxDailyOtHours) { this.maxDailyOtHours = maxDailyOtHours; }
    public BigDecimal getMaxWeeklyHours() { return maxWeeklyHours; }
    public void setMaxWeeklyHours(BigDecimal maxWeeklyHours) { this.maxWeeklyHours = maxWeeklyHours; }
    public String getOvertimePolicy() { return overtimePolicy; }
    public void setOvertimePolicy(String overtimePolicy) { this.overtimePolicy = overtimePolicy; }
    public String getWorkDays() { return workDays; }
    public void setWorkDays(String workDays) { this.workDays = workDays; }
    public String getDepartments() { return departments; }
    public void setDepartments(String departments) { this.departments = departments; }
    public LocalDate getEffectiveFrom() { return effectiveFrom; }
    public void setEffectiveFrom(LocalDate effectiveFrom) { this.effectiveFrom = effectiveFrom; }
    public LocalDate getEffectiveTo() { return effectiveTo; }
    public void setEffectiveTo(LocalDate effectiveTo) { this.effectiveTo = effectiveTo; }
    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
