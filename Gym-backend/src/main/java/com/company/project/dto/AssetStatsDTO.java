package com.company.project.dto;

import java.math.BigDecimal;

public class AssetStatsDTO {

    private BigDecimal totalAssetsValue;
    private Long activeAssetsCount;
    private Long maintenanceDue;
    private Long assetsForDisposal;
    private Long totalAssets;

    public AssetStatsDTO() {}

    public AssetStatsDTO(BigDecimal totalAssetsValue,
                         Long activeAssetsCount,
                         Long maintenanceDue,
                         Long assetsForDisposal,
                         Long totalAssets) {
        this.totalAssetsValue = totalAssetsValue;
        this.activeAssetsCount = activeAssetsCount;
        this.maintenanceDue = maintenanceDue;
        this.assetsForDisposal = assetsForDisposal;
        this.totalAssets = totalAssets;
    }

    public BigDecimal getTotalAssetsValue() { return totalAssetsValue; }
    public void setTotalAssetsValue(BigDecimal totalAssetsValue) { this.totalAssetsValue = totalAssetsValue; }

    public Long getActiveAssetsCount() { return activeAssetsCount; }
    public void setActiveAssetsCount(Long activeAssetsCount) { this.activeAssetsCount = activeAssetsCount; }

    public Long getMaintenanceDue() { return maintenanceDue; }
    public void setMaintenanceDue(Long maintenanceDue) { this.maintenanceDue = maintenanceDue; }

    public Long getAssetsForDisposal() { return assetsForDisposal; }
    public void setAssetsForDisposal(Long assetsForDisposal) { this.assetsForDisposal = assetsForDisposal; }

    public Long getTotalAssets() { return totalAssets; }
    public void setTotalAssets(Long totalAssets) { this.totalAssets = totalAssets; }
}
