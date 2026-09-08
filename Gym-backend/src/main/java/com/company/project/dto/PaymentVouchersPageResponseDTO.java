package com.company.project.dto;

import java.util.List;

public class PaymentVouchersPageResponseDTO {

    private List<PaymentVoucherResponseDTO> vouchers;
    private PaginationDTO pagination;

    public PaymentVouchersPageResponseDTO() {}

    public PaymentVouchersPageResponseDTO(List<PaymentVoucherResponseDTO> vouchers, PaginationDTO pagination) {
        this.vouchers = vouchers;
        this.pagination = pagination;
    }

    public List<PaymentVoucherResponseDTO> getVouchers() { return vouchers; }
    public void setVouchers(List<PaymentVoucherResponseDTO> vouchers) { this.vouchers = vouchers; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
