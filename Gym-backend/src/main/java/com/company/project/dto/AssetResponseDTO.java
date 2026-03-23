package com.company.project.dto;

import com.company.project.entities.Asset;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class AssetResponseDTO {

    private Long id;
    private String code;
    private String name;
    private String model;
    private String category;
    private String subcategory;
    private LocalDate purchaseDate;
    private BigDecimal purchasePrice;
    private BigDecimal currentValue;
    private BigDecimal depreciationRate;
    private String location;
    private String branch;
    private String vendor;
    private String status;
    private String condition;
    private LocalDate warrantyExpiry;
    private String serialNumber;
    private String imageUrl;
    private LocalDate nextMaintenanceDate;
    private Integer utilizationRate;
    private LocalDate disposalDate;
    private String disposalReason;
    private List<AssetMaintenanceDTO> maintenanceHistory;
    private List<AssetTransferDTO> transferHistory;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public AssetResponseDTO() {}

    public static AssetResponseDTO fromEntity(Asset asset) {
        AssetResponseDTO dto = new AssetResponseDTO();
        dto.setId(asset.getId());
        dto.setCode(asset.getCode());
        dto.setName(asset.getName());
        dto.setModel(asset.getModel());
        dto.setCategory(asset.getCategory());
        dto.setSubcategory(asset.getSubcategory());
        dto.setPurchaseDate(asset.getPurchaseDate());
        dto.setPurchasePrice(asset.getPurchasePrice());
        dto.setCurrentValue(asset.getCurrentValue());
        dto.setDepreciationRate(asset.getDepreciationRate());
        dto.setLocation(asset.getLocation());
        dto.setBranch(asset.getBranch());
        dto.setVendor(asset.getVendor());
        dto.setStatus(asset.getStatus());
        dto.setCondition(asset.getCondition());
        dto.setWarrantyExpiry(asset.getWarrantyExpiry());
        dto.setSerialNumber(asset.getSerialNumber());
        dto.setImageUrl(asset.getImageUrl());
        dto.setNextMaintenanceDate(asset.getNextMaintenanceDate());
        dto.setUtilizationRate(asset.getUtilizationRate());
        dto.setDisposalDate(asset.getDisposalDate());
        dto.setDisposalReason(asset.getDisposalReason());
        dto.setCreatedAt(asset.getCreatedAt());
        dto.setUpdatedAt(asset.getUpdatedAt());

        if (asset.getMaintenanceHistory() != null) {
            dto.setMaintenanceHistory(
                    asset.getMaintenanceHistory().stream()
                            .map(AssetMaintenanceDTO::fromEntity)
                            .collect(Collectors.toList())
            );
        } else {
            dto.setMaintenanceHistory(List.of());
        }

        if (asset.getTransferHistory() != null) {
            dto.setTransferHistory(
                    asset.getTransferHistory().stream()
                            .map(AssetTransferDTO::fromEntity)
                            .collect(Collectors.toList())
            );
        } else {
            dto.setTransferHistory(List.of());
        }

        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSubcategory() { return subcategory; }
    public void setSubcategory(String subcategory) { this.subcategory = subcategory; }

    public LocalDate getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(LocalDate purchaseDate) { this.purchaseDate = purchaseDate; }

    public BigDecimal getPurchasePrice() { return purchasePrice; }
    public void setPurchasePrice(BigDecimal purchasePrice) { this.purchasePrice = purchasePrice; }

    public BigDecimal getCurrentValue() { return currentValue; }
    public void setCurrentValue(BigDecimal currentValue) { this.currentValue = currentValue; }

    public BigDecimal getDepreciationRate() { return depreciationRate; }
    public void setDepreciationRate(BigDecimal depreciationRate) { this.depreciationRate = depreciationRate; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getBranch() { return branch; }
    public void setBranch(String branch) { this.branch = branch; }

    public String getVendor() { return vendor; }
    public void setVendor(String vendor) { this.vendor = vendor; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCondition() { return condition; }
    public void setCondition(String condition) { this.condition = condition; }

    public LocalDate getWarrantyExpiry() { return warrantyExpiry; }
    public void setWarrantyExpiry(LocalDate warrantyExpiry) { this.warrantyExpiry = warrantyExpiry; }

    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public LocalDate getNextMaintenanceDate() { return nextMaintenanceDate; }
    public void setNextMaintenanceDate(LocalDate nextMaintenanceDate) { this.nextMaintenanceDate = nextMaintenanceDate; }

    public Integer getUtilizationRate() { return utilizationRate; }
    public void setUtilizationRate(Integer utilizationRate) { this.utilizationRate = utilizationRate; }

    public LocalDate getDisposalDate() { return disposalDate; }
    public void setDisposalDate(LocalDate disposalDate) { this.disposalDate = disposalDate; }

    public String getDisposalReason() { return disposalReason; }
    public void setDisposalReason(String disposalReason) { this.disposalReason = disposalReason; }

    public List<AssetMaintenanceDTO> getMaintenanceHistory() { return maintenanceHistory; }
    public void setMaintenanceHistory(List<AssetMaintenanceDTO> maintenanceHistory) { this.maintenanceHistory = maintenanceHistory; }

    public List<AssetTransferDTO> getTransferHistory() { return transferHistory; }
    public void setTransferHistory(List<AssetTransferDTO> transferHistory) { this.transferHistory = transferHistory; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
