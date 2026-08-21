package com.company.project.dto.mobile.membership;

import com.company.project.dto.PaginationDTO;
import java.util.List;

public class MobileMembershipPlanPageDTO {
    private List<MobileMembershipPlanDTO> plans;
    private PaginationDTO pagination;

    public List<MobileMembershipPlanDTO> getPlans() {
        return plans;
    }

    public void setPlans(List<MobileMembershipPlanDTO> plans) {
        this.plans = plans;
    }

    public PaginationDTO getPagination() {
        return pagination;
    }

    public void setPagination(PaginationDTO pagination) {
        this.pagination = pagination;
    }
}
