package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "employees")
public class Staff extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // EMP-XXXXXXXXXX auto-generated after first insert
    @Column(name = "staff_id", unique = true)
    private String staffId;

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    private String phone;
    private String role;
    private String department;
    private String branch;

    @Column(name = "monthly_target", precision = 12, scale = 2)
    private BigDecimal monthlyTarget;

    // active / inactive / on_leave
    private String status;

    @Column(name = "join_date")
    private LocalDate joinDate;

    private String address;

    @Column(name = "photo_url", columnDefinition = "TEXT")
    private String photoUrl;

    @OneToMany(mappedBy = "staff", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<StaffCertification> certifications = new ArrayList<>();

    @OneToMany(mappedBy = "staff", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<StaffScheduleSlot> scheduleSlots = new ArrayList<>();

    // getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getStaffId() { return staffId; }
    public void setStaffId(String staffId) { this.staffId = staffId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }
    public BigDecimal getMonthlyTarget() { return monthlyTarget; }
    public void setMonthlyTarget(BigDecimal monthlyTarget) { this.monthlyTarget = monthlyTarget; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDate getJoinDate() { return joinDate; }
    public void setJoinDate(LocalDate joinDate) { this.joinDate = joinDate; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public List<StaffCertification> getCertifications() { return certifications; }
    public void setCertifications(List<StaffCertification> certifications) { this.certifications = certifications; }
    public List<StaffScheduleSlot> getScheduleSlots() { return scheduleSlots; }
    public void setScheduleSlots(List<StaffScheduleSlot> scheduleSlots) { this.scheduleSlots = scheduleSlots; }
}
