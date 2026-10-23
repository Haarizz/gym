package com.company.project.dto;

/**
 * A staff member as shown to anyone browsing a center: name, role and branch rating
 * only — never contact details, pay or login info.
 */
public class CenterTrainerDTO {
    private Long id;
    private String name;
    private String role;
    private String department;
    private String photoUrl;
    /** Average of this branch's member ratings, or null when nobody has rated yet. */
    private Double averageRating;
    private long ratingCount;

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

    public Double getAverageRating() { return averageRating; }
    public void setAverageRating(Double averageRating) { this.averageRating = averageRating; }

    public long getRatingCount() { return ratingCount; }
    public void setRatingCount(long ratingCount) { this.ratingCount = ratingCount; }
}
