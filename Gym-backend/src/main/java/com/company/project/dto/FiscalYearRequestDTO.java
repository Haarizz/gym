package com.company.project.dto;

import java.time.LocalDate;

public class FiscalYearRequestDTO {

    private String name;
    private LocalDate startDate;
    private LocalDate endDate;

    public FiscalYearRequestDTO() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }
}
