package com.company.project.entities;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "assets")
public class Asset extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    @Column(name = "model")
    private String model;

    @Column(name = "category")
    private String category;

    @Column(name = "subcategory")
    private String subcategory;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "purchase_price", precision = 12, scale = 2)
    private BigDecimal purchasePrice;

    @Column(name = "current_value", precision = 12, scale = 2)
    private BigDecimal currentValue;

    @Column(name = "depreciation_rate", precision = 6, scale = 2)
    private BigDecimal depreciationRate;

    @Column(name = "location")
    private String location;

    @Column(name = "branch")
    private String branch;

    @Column(name = "vendor")
    private String vendor;

    @Column(name = "status")
    private String status;

    @Column(name = "condition_status")
    private String condition;

    @Column(name = "warranty_expiry")
    private LocalDate warrantyExpiry;

    @Column(name = "serial_number")
    private String serialNumber;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "next_maintenance_date")
    private LocalDate nextMaintenanceDate;

    @Column(name = "utilization_rate")
    private Integer utilizationRate;

    @Column(name = "disposal_date")
    private LocalDate disposalDate;

    @Column(name = "disposal_reason")
    private String disposalReason;

    @OneToMany(mappedBy = "asset", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("maintenanceDate DESC")
    private List<AssetMaintenance> maintenanceHistory = new ArrayList<>();

    @OneToMany(mappedBy = "asset", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("transferDate DESC")
    private List<AssetTransfer> transferHistory = new ArrayList<>();

    public Asset() {}

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

    public List<AssetMaintenance> getMaintenanceHistory() { return maintenanceHistory; }
    public void setMaintenanceHistory(List<AssetMaintenance> maintenanceHistory) { this.maintenanceHistory = maintenanceHistory; }

    public List<AssetTransfer> getTransferHistory() { return transferHistory; }
    public void setTransferHistory(List<AssetTransfer> transferHistory) { this.transferHistory = transferHistory; }
}
