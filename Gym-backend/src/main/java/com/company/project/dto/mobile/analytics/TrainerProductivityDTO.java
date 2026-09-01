package com.company.project.dto.mobile.analytics;

import java.math.BigDecimal;

public class TrainerProductivityDTO {
    private int averageSessionsPerTrainer;
    private double memberSatisfaction;
    private BigDecimal ptPackageSales;

    public TrainerProductivityDTO() {}

    public TrainerProductivityDTO(int averageSessionsPerTrainer, double memberSatisfaction, BigDecimal ptPackageSales) {
        this.averageSessionsPerTrainer = averageSessionsPerTrainer;
        this.memberSatisfaction = memberSatisfaction;
        this.ptPackageSales = ptPackageSales;
    }

    public int getAverageSessionsPerTrainer() { return averageSessionsPerTrainer; }
    public void setAverageSessionsPerTrainer(int averageSessionsPerTrainer) { this.averageSessionsPerTrainer = averageSessionsPerTrainer; }
    public double getMemberSatisfaction() { return memberSatisfaction; }
    public void setMemberSatisfaction(double memberSatisfaction) { this.memberSatisfaction = memberSatisfaction; }
    public BigDecimal getPtPackageSales() { return ptPackageSales; }
    public void setPtPackageSales(BigDecimal ptPackageSales) { this.ptPackageSales = ptPackageSales; }
}
