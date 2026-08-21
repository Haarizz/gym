package com.company.project.dto.mobile.dashboard.trainer;

public class TrainerInfoDTO {
    private String name;
    private String specialization;
    private Double rating;

    public TrainerInfoDTO() {}

    public TrainerInfoDTO(String name, String specialization, Double rating) {
        this.name = name;
        this.specialization = specialization;
        this.rating = rating;
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
}
