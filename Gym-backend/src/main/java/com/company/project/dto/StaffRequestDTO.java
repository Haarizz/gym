package com.company.project.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public class StaffRequestDTO {

    private String name;
    private String email;
    private String phone;
    private String role;
    private String department;
    private String branch;
    private BigDecimal monthlyTarget;
    private BigDecimal baseSalary;
    private String status;
    private String joinDate;   // ISO date string yyyy-MM-dd
    private String address;
    private String photoUrl;

    // List of certification objects
    private List<CertificationInput> certifications;

    // Map of day → list of slot strings
    private Map<String, List<String>> schedule;

    public static class CertificationInput {
        private String certName;
        private String issuer;
        private String issueDate;
        private String expiryDate;
        private String documentUrl;

        public String getCertName() { return certName; }
        public void setCertName(String certName) { this.certName = certName; }
        public String getIssuer() { return issuer; }
        public void setIssuer(String issuer) { this.issuer = issuer; }
        public String getIssueDate() { return issueDate; }
        public void setIssueDate(String issueDate) { this.issueDate = issueDate; }
        public String getExpiryDate() { return expiryDate; }
        public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }
        public String getDocumentUrl() { return documentUrl; }
        public void setDocumentUrl(String documentUrl) { this.documentUrl = documentUrl; }
    }

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
    public List<CertificationInput> getCertifications() { return certifications; }
    public void setCertifications(List<CertificationInput> certifications) { this.certifications = certifications; }
    public Map<String, List<String>> getSchedule() { return schedule; }
    public void setSchedule(Map<String, List<String>> schedule) { this.schedule = schedule; }

    // App access credentials (optional — leave blank to not create app login)
    private String appUsername;
    private String appPassword;
    private Boolean enableLogin;

    // Security role for the linked login account (Admin/Receptionist/Trainer/Accountant/Manager).
    // Independent of the free-text `role` (job title, used for commission/target filtering) —
    // lets forms like the Staffs & Trainers "App Access" section pick a real RBAC role without
    // disturbing the commission system's job-title values. Falls back to `role` if omitted.
    private String appRole;

    public String getAppUsername() { return appUsername; }
    public void setAppUsername(String appUsername) { this.appUsername = appUsername; }

    public String getAppPassword() { return appPassword; }
    public void setAppPassword(String appPassword) { this.appPassword = appPassword; }

    public Boolean getEnableLogin() { return enableLogin; }
    public void setEnableLogin(Boolean enableLogin) { this.enableLogin = enableLogin; }

    public String getAppRole() { return appRole; }
    public void setAppRole(String appRole) { this.appRole = appRole; }
}
