package com.company.project.dto;

import com.company.project.entities.AssetMaintenance;

import java.math.BigDecimal;
import java.time.LocalDate;

public class AssetMaintenanceDTO {

    private Long id;
    private LocalDate date;
    private String type;
    private BigDecimal cost;
    private String notes;

    public AssetMaintenanceDTO() {}

    public static AssetMaintenanceDTO fromEntity(AssetMaintenance m) {
        AssetMaintenanceDTO dto = new AssetMaintenanceDTO();
        dto.setId(m.getId());
        dto.setDate(m.getMaintenanceDate());
        dto.setType(m.getType());
        dto.setCost(m.getCost());
        dto.setNotes(m.getNotes());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public BigDecimal getCost() { return cost; }
    public void setCost(BigDecimal cost) { this.cost = cost; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
