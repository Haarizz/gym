package com.company.project.dto;

import java.util.List;

public class WastageReturnPageResponseDTO {

    private List<WastageReturnResponseDTO> vouchers;
    private PaginationDTO pagination;

    public WastageReturnPageResponseDTO() {}

    public WastageReturnPageResponseDTO(List<WastageReturnResponseDTO> vouchers, PaginationDTO pagination) {
        this.vouchers = vouchers;
        this.pagination = pagination;
    }

    public List<WastageReturnResponseDTO> getVouchers() { return vouchers; }
    public void setVouchers(List<WastageReturnResponseDTO> vouchers) { this.vouchers = vouchers; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
