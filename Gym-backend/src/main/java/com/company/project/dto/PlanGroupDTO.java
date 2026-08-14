package com.company.project.dto;

import com.company.project.entities.PlanGroup;

public class PlanGroupDTO {

    private Long id;
    private String name;
    private String status;

    public PlanGroupDTO() {}

    public static PlanGroupDTO fromEntity(PlanGroup g) {
        PlanGroupDTO dto = new PlanGroupDTO();
        dto.setId(g.getId());
        dto.setName(g.getName());
        dto.setStatus(g.getStatus());
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
