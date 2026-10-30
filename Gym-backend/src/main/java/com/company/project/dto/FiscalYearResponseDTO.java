package com.company.project.dto;

import com.company.project.entities.FiscalYear;
import java.time.LocalDate;

public class FiscalYearResponseDTO {

    private Long id;
    private String name;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private int openPeriods;
    private int closedPeriods;
    private int lockedPeriods;

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

    public int getOpenPeriods() { return openPeriods; }
    public void setOpenPeriods(int openPeriods) { this.openPeriods = openPeriods; }
    public int getClosedPeriods() { return closedPeriods; }
    public void setClosedPeriods(int closedPeriods) { this.closedPeriods = closedPeriods; }
    public int getLockedPeriods() { return lockedPeriods; }
    public void setLockedPeriods(int lockedPeriods) { this.lockedPeriods = lockedPeriods; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
