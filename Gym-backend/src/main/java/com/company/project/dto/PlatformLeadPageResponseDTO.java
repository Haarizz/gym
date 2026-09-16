package com.company.project.dto;

import java.util.List;

public class PlatformLeadPageResponseDTO {

    private List<PlatformLeadResponseDTO> leads;
    private PaginationDTO pagination;

    public PlatformLeadPageResponseDTO(List<PlatformLeadResponseDTO> leads, PaginationDTO pagination) {
        this.leads = leads;
        this.pagination = pagination;
    }

    public List<PlatformLeadResponseDTO> getLeads() { return leads; }
    public void setLeads(List<PlatformLeadResponseDTO> leads) { this.leads = leads; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
