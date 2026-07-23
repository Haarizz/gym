package com.company.project.dto;

import java.util.List;

/**
 * Paginated products response.
 * Serializes as:
 * {
 *   "products": [...],
 *   "pagination": { "page":1, "limit":20, "total":100, "totalPages":5 }
 * }
 */
public class ProductsPageResponseDTO {

    private List<ProductResponseDTO> products;
    private PaginationDTO pagination;

    public ProductsPageResponseDTO() {}

    public ProductsPageResponseDTO(List<ProductResponseDTO> products, PaginationDTO pagination) {
        this.products   = products;
        this.pagination = pagination;
    }

    public List<ProductResponseDTO> getProducts() { return products; }
    public void setProducts(List<ProductResponseDTO> products) { this.products = products; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
