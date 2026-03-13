package com.company.project.dto;

import java.util.List;

/**
 * Paginated receipts response.
 * Serializes as:
 * {
 *   "receipts": [...],
 *   "pagination": { "page":1, "limit":20, "total":100, "totalPages":5 }
 * }
 */
public class ReceiptsPageResponseDTO {

    private List<ReceiptResponseDTO> receipts;
    private PaginationDTO pagination;

    public ReceiptsPageResponseDTO() {}

    public ReceiptsPageResponseDTO(List<ReceiptResponseDTO> receipts, PaginationDTO pagination) {
        this.receipts   = receipts;
        this.pagination = pagination;
    }

    public List<ReceiptResponseDTO> getReceipts() { return receipts; }
    public void setReceipts(List<ReceiptResponseDTO> receipts) { this.receipts = receipts; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
