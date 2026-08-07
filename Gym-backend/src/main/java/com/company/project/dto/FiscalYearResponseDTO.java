package com.company.project.dto;

import com.company.project.entities.FiscalYear;
import java.time.LocalDate;

public class FiscalYearResponseDTO {

    private Long id;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;

    public FiscalYearResponseDTO() {}

    public static FiscalYearResponseDTO fromEntity(FiscalYear y) {
        FiscalYearResponseDTO dto = new FiscalYearResponseDTO();
        dto.setId(y.getId());
        dto.setName(y.getName());
        dto.setStartDate(y.getStartDate());
        dto.setEndDate(y.getEndDate());
        dto.setStatus(y.getStatus());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
