package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "tax_codes")
public class TaxCode extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", unique = true, nullable = false)
    private String code;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "rate", precision = 5, scale = 2, nullable = false)
    private BigDecimal rate;

    @Column(name = "sales_tax_account_code")
    private String salesTaxAccountCode; // Account for Output Tax (e.g. 2100)

    @Column(name = "purchase_tax_account_code")
    private String purchaseTaxAccountCode; // Account for Input Tax (e.g. 2200)

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    public TaxCode() {}

    // Getters and Setters

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
}
