package com.company.project.dto;

import java.util.List;

public class LeadPageResponseDTO {

    private List<LeadResponseDTO> leads;
    private PaginationDTO pagination;

    public LeadPageResponseDTO(List<LeadResponseDTO> leads, PaginationDTO pagination) {
        this.leads = leads;
        this.pagination = pagination;
    }

    public List<LeadResponseDTO> getLeads() { return leads; }
    public void setLeads(List<LeadResponseDTO> leads) { this.leads = leads; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
