package com.company.project.dto;

import com.company.project.entities.Staff;
import com.company.project.entities.StaffScheduleSlot;
import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

public class StaffResponseDTO {

    private String id;
    private String staffId;
    private String name;
    private String email;
    private String phone;
    private String role;
    private String department;
    private String branch;
    private BigDecimal monthlyTarget;
    private BigDecimal baseSalary;
    private String status;
    private String joinDate;
    private String address;
    private String photoUrl;
    private List<StaffCertificationDTO> certifications;
    // Map of day → list of slots
    private Map<String, List<String>> schedule;
    private String createdAt;
    private String updatedAt;

    public static StaffResponseDTO fromEntity(Staff s) {
        StaffResponseDTO dto = new StaffResponseDTO();
        dto.id = String.valueOf(s.getId());
        dto.staffId = s.getStaffId();
        dto.name = s.getName();
        dto.email = s.getEmail();
        dto.phone = s.getPhone();
        dto.role = s.getRole();
        dto.department = s.getDepartment();
        dto.branch = s.getBranch();
        dto.monthlyTarget = s.getMonthlyTarget();
        dto.baseSalary = s.getBaseSalary();
        dto.status = s.getStatus();
        dto.joinDate = s.getJoinDate() != null ? s.getJoinDate().toString() : null;
        dto.address = s.getAddress();
        dto.photoUrl = s.getPhotoUrl();
        dto.createdAt = s.getCreatedAt() != null ? s.getCreatedAt().toString() : null;
        dto.updatedAt = s.getUpdatedAt() != null ? s.getUpdatedAt().toString() : null;

        // certifications
        dto.certifications = s.getCertifications() != null
                ? s.getCertifications().stream().map(StaffCertificationDTO::fromEntity).collect(Collectors.toList())
                : new ArrayList<>();

        // schedule: group slots by day
        Map<String, List<String>> schedMap = new LinkedHashMap<>();
        if (s.getScheduleSlots() != null) {
            for (StaffScheduleSlot slot : s.getScheduleSlots()) {
                schedMap.computeIfAbsent(slot.getDay(), k -> new ArrayList<>()).add(slot.getSlot());
            }
        }
        dto.schedule = schedMap;

        return dto;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
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
    public BigDecimal getBaseSalary() { return baseSalary; }
    public void setBaseSalary(BigDecimal baseSalary) { this.baseSalary = baseSalary; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getJoinDate() { return joinDate; }
    public void setJoinDate(String joinDate) { this.joinDate = joinDate; }
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public List<StaffCertificationDTO> getCertifications() { return certifications; }
    public void setCertifications(List<StaffCertificationDTO> certifications) { this.certifications = certifications; }
    public Map<String, List<String>> getSchedule() { return schedule; }
    public void setSchedule(Map<String, List<String>> schedule) { this.schedule = schedule; }
    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
