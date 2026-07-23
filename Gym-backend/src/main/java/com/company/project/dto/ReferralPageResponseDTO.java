package com.company.project.dto;

import java.util.List;

public class ReferralPageResponseDTO {

    private List<ReferralResponseDTO> referrals;
    private PaginationDTO pagination;

    public ReferralPageResponseDTO(List<ReferralResponseDTO> referrals, PaginationDTO pagination) {
        this.referrals = referrals;
        this.pagination = pagination;
    }

    public List<ReferralResponseDTO> getReferrals() { return referrals; }
    public void setReferrals(List<ReferralResponseDTO> referrals) { this.referrals = referrals; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
