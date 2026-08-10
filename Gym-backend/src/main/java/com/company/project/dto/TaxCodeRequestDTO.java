package com.company.project.dto;

import java.math.BigDecimal;

public class TaxCodeRequestDTO {

    private String code;
    private String name;
    private BigDecimal rate;
    private String salesTaxAccountCode;
    private String purchaseTaxAccountCode;
    private Boolean active;
    private String description;
    private String taxType;
    private String secondaryTaxCode;

    public TaxCodeRequestDTO() {}

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

    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getTaxType() { return taxType; }
    public void setTaxType(String taxType) { this.taxType = taxType; }

    public String getSecondaryTaxCode() { return secondaryTaxCode; }
    public void setSecondaryTaxCode(String secondaryTaxCode) { this.secondaryTaxCode = secondaryTaxCode; }
}
