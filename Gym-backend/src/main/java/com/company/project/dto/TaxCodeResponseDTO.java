package com.company.project.dto;

import com.company.project.entities.TaxCode;
import java.math.BigDecimal;

public class TaxCodeResponseDTO {

    private Long id;
    private String code;
    private String name;
    private BigDecimal rate;
    private String salesTaxAccountCode;
    private String purchaseTaxAccountCode;
    private boolean active;
    private String description;
    private String taxType;
    private String secondaryTaxCode;

    public TaxCodeResponseDTO() {}

    public static TaxCodeResponseDTO fromEntity(TaxCode t) {
        TaxCodeResponseDTO dto = new TaxCodeResponseDTO();
        dto.setId(t.getId());
        dto.setCode(t.getCode());
        dto.setName(t.getName());
        dto.setRate(t.getRate());
        dto.setSalesTaxAccountCode(t.getSalesTaxAccountCode());
        dto.setPurchaseTaxAccountCode(t.getPurchaseTaxAccountCode());
        dto.setActive(t.isActive());
        dto.setDescription(t.getDescription());
        dto.setTaxType(t.getTaxType());
        dto.setSecondaryTaxCode(t.getSecondaryTaxCode());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }

    public String getSalesTaxAccountCode() { return salesTaxAccountCode; }
    public void setSalesTaxAccountCode(String salesTaxAccountCode) { this.salesTaxAccountCode = salesTaxAccountCode; }

    public String getPurchaseTaxAccountCode() { return purchaseTaxAccountCode; }
    public void setPurchaseTaxAccountCode(String purchaseTaxAccountCode) { this.purchaseTaxAccountCode = purchaseTaxAccountCode; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTaxType() { return taxType; }
    public void setTaxType(String taxType) { this.taxType = taxType; }

    public String getSecondaryTaxCode() { return secondaryTaxCode; }
    public void setSecondaryTaxCode(String secondaryTaxCode) { this.secondaryTaxCode = secondaryTaxCode; }
}
