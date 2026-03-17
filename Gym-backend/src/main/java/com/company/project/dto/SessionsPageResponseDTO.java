package com.company.project.dto;

import java.util.List;

public class SessionsPageResponseDTO {

    private List<PosSessionResponseDTO> sessions;
    private PaginationDTO pagination;

    public SessionsPageResponseDTO() {}

    public SessionsPageResponseDTO(List<PosSessionResponseDTO> sessions, PaginationDTO pagination) {
        this.sessions = sessions;
        this.pagination = pagination;
    }

    public List<PosSessionResponseDTO> getSessions() { return sessions; }
    public void setSessions(List<PosSessionResponseDTO> sessions) { this.sessions = sessions; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
