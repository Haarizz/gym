package com.company.project.entities;

import com.company.project.converters.JsonStringListConverter;
import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;
import java.util.List;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "products")
public class Product extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // Auto-generated after insert: PREFIX-XXXX
    @Column(name = "sku", unique = true)
    private String sku;

    @Column(name = "category_id")
    private Long categoryId;

    @Column(name = "brand")
    private String brand;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "is_active")
    private Boolean isActive = true;

    @Column(name = "has_variants")
    private Boolean hasVariants = false;

    @Column(name = "has_recipe")
    private Boolean hasRecipe = false;

    @Column(name = "is_manufactured")
    private Boolean isManufactured = false;

    // Whether this product should appear in the Point of Sale product grid
    @Column(name = "enabled_for_pos")
    private Boolean enabledForPos = false;

    @Convert(converter = JsonStringListConverter.class)
    @Column(name = "image_urls", columnDefinition = "TEXT")
    private List<String> imageUrls;

    @Column(name = "barcode")
    private String barcode;

    // Code128 / EAN-13 / UPC-A / QRCode / Code39
    @Column(name = "barcode_template")
    private String barcodeTemplate;

    @Column(name = "default_unit")
    private String defaultUnit;

    @Column(name = "selling_price", precision = 10, scale = 2)
    private BigDecimal sellingPrice;

    @Column(name = "cost_price", precision = 10, scale = 2)
    private BigDecimal costPrice;

    @Column(name = "tax_rate", precision = 5, scale = 2)
    private BigDecimal taxRate = new BigDecimal("5.00");

    @Column(name = "supplier")
    private String supplier;

    public Product() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }

    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Boolean getHasVariants() { return hasVariants; }
    public void setHasVariants(Boolean hasVariants) { this.hasVariants = hasVariants; }

    public Boolean getHasRecipe() { return hasRecipe; }
    public void setHasRecipe(Boolean hasRecipe) { this.hasRecipe = hasRecipe; }

    public Boolean getIsManufactured() { return isManufactured; }
    public void setIsManufactured(Boolean isManufactured) { this.isManufactured = isManufactured; }

    public Boolean getEnabledForPos() { return enabledForPos; }
    public void setEnabledForPos(Boolean enabledForPos) { this.enabledForPos = enabledForPos; }

    public List<String> getImageUrls() { return imageUrls; }
    public void setImageUrls(List<String> imageUrls) { this.imageUrls = imageUrls; }

    public String getBarcode() { return barcode; }
    public void setBarcode(String barcode) { this.barcode = barcode; }

    public String getBarcodeTemplate() { return barcodeTemplate; }
    public void setBarcodeTemplate(String barcodeTemplate) { this.barcodeTemplate = barcodeTemplate; }

    public String getDefaultUnit() { return defaultUnit; }
    public void setDefaultUnit(String defaultUnit) { this.defaultUnit = defaultUnit; }

    public BigDecimal getSellingPrice() { return sellingPrice; }
    public void setSellingPrice(BigDecimal sellingPrice) { this.sellingPrice = sellingPrice; }

    public BigDecimal getCostPrice() { return costPrice; }
    public void setCostPrice(BigDecimal costPrice) { this.costPrice = costPrice; }

    public BigDecimal getTaxRate() { return taxRate; }
    public void setTaxRate(BigDecimal taxRate) { this.taxRate = taxRate; }

    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
