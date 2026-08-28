package com.company.project.dto.mobile.analytics;

import java.util.List;

public class OperationsDTO {
    private List<ClassUtilizationDTO> classUtilization;
    private TrainerProductivityDTO trainerProductivity;
    private List<AddOnPerformanceDTO> addonPerformance;

    public OperationsDTO() {}

    public OperationsDTO(List<ClassUtilizationDTO> classUtilization, TrainerProductivityDTO trainerProductivity, List<AddOnPerformanceDTO> addonPerformance) {
        this.classUtilization = classUtilization;
        this.trainerProductivity = trainerProductivity;
        this.addonPerformance = addonPerformance;
    }

    public List<ClassUtilizationDTO> getClassUtilization() { return classUtilization; }
    public void setClassUtilization(List<ClassUtilizationDTO> classUtilization) { this.classUtilization = classUtilization; }
    public TrainerProductivityDTO getTrainerProductivity() { return trainerProductivity; }
    public void setTrainerProductivity(TrainerProductivityDTO trainerProductivity) { this.trainerProductivity = trainerProductivity; }
    public List<AddOnPerformanceDTO> getAddonPerformance() { return addonPerformance; }
    public void setAddonPerformance(List<AddOnPerformanceDTO> addonPerformance) { this.addonPerformance = addonPerformance; }
}
