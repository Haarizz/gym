package com.company.project.dto.mobile.staff;

import java.time.LocalDate;
import java.util.List;

/** One staff member on the member app's team list. */
public class MemberStaffCardDTO {
    private Long id;
    private String name;
    private String role;
    private String department;
    private String photoUrl;
    private LocalDate joinDate;
    /** Certification names, shown as tags. */
    private List<String> certifications;
    private Double averageRating;
    private Long ratingCount;
    /** The calling member's own rating of this staff member, if any. */
    private Integer myRating;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }

    public LocalDate getJoinDate() { return joinDate; }
    public void setJoinDate(LocalDate joinDate) { this.joinDate = joinDate; }

    public List<String> getCertifications() { return certifications; }
    public void setCertifications(List<String> certifications) { this.certifications = certifications; }

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }

    public Long getRatingCount() { return ratingCount; }
    public void setRatingCount(Long ratingCount) { this.ratingCount = ratingCount; }

    public Integer getMyRating() { return myRating; }
    public void setMyRating(Integer myRating) { this.myRating = myRating; }
}
