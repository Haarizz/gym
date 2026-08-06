package com.company.project.dto;

import com.company.project.entities.FiscalPeriod;
import java.time.LocalDate;

public class FiscalPeriodResponseDTO {

    private Long id;
    private Long fiscalYearId;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;

    public FiscalPeriodResponseDTO() {}

    public static FiscalPeriodResponseDTO fromEntity(FiscalPeriod p) {
        FiscalPeriodResponseDTO dto = new FiscalPeriodResponseDTO();
        dto.setId(p.getId());
        dto.setFiscalYearId(p.getFiscalYearId());
        dto.setName(p.getName());
        dto.setStartDate(p.getStartDate());
        dto.setEndDate(p.getEndDate());
        dto.setStatus(p.getStatus());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFiscalYearId() { return fiscalYearId; }
    public void setFiscalYearId(Long fiscalYearId) { this.fiscalYearId = fiscalYearId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
