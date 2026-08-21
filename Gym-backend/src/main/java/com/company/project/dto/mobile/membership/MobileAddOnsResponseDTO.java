package com.company.project.dto.mobile.membership;

import com.company.project.dto.PaginationDTO;
import java.util.List;

public class MobileAddOnsResponseDTO {
    private List<MobileAddOnDTO> available;
    private PaginationDTO pagination;
    private List<MobileActiveAddOnDTO> active;

    public List<MobileAddOnDTO> getAvailable() { return available; }
    public void setAvailable(List<MobileAddOnDTO> available) { this.available = available; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }

    public List<MobileActiveAddOnDTO> getActive() { return active; }
    public void setActive(List<MobileActiveAddOnDTO> active) { this.active = active; }
}
