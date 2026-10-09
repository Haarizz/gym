package com.company.project.dto.mobile.dashboard.trainer;

public class TrainerInfoDTO {
    private String name;
    private String specialization;
    // Null until the trainer has received at least one member rating.
    private Double rating;
    private long ratingCount;

    public TrainerInfoDTO() {}

    public TrainerInfoDTO(String name, String specialization, Double rating, long ratingCount) {
        this.name = name;
        this.specialization = specialization;
        this.rating = rating;
        this.ratingCount = ratingCount;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getSpecialization() {
        return specialization;
    }

    public void setSpecialization(String specialization) {
        this.specialization = specialization;
    }

    public Double getRating() {
        return rating;
    }

    public void setRating(Double rating) {
        this.rating = rating;
    }

    public long getRatingCount() {
        return ratingCount;
    }

    public void setRatingCount(long ratingCount) {
        this.ratingCount = ratingCount;
    }
}
