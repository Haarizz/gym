package com.company.project.dto;

import java.util.List;

public class AssetsPageResponseDTO {

    private List<AssetResponseDTO> assets;
    private PaginationDTO pagination;

    public AssetsPageResponseDTO() {}

    public AssetsPageResponseDTO(List<AssetResponseDTO> assets, PaginationDTO pagination) {
        this.assets = assets;
        this.pagination = pagination;
    }

    public List<AssetResponseDTO> getAssets() { return assets; }
    public void setAssets(List<AssetResponseDTO> assets) { this.assets = assets; }

    public PaginationDTO getPagination() { return pagination; }
    public void setPagination(PaginationDTO pagination) { this.pagination = pagination; }
}
