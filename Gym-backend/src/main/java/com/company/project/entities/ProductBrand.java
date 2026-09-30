package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * A product brand (e.g. "Optimum Nutrition", "Nike"). Products still store the
 * brand as plain text in products.brand; this table is the managed list those
 * values are picked from, so renaming a brand here also renames it on products.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "product_brands", uniqueConstraints = {
    @UniqueConstraint(name = "uk_product_brands_branch_name", columnNames = {"branch_id", "name"})
})
public class ProductBrand extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "description", length = 1000)
    private String description;

    @Column(name = "website")
    private String website;

    // e.g. "bg-blue-500" — same palette as product categories
    @Column(name = "color")
    private String color;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;

    @Column(name = "branch_id")
    private Long branchId;

    public ProductBrand() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getWebsite() { return website; }
    public void setWebsite(String website) { this.website = website; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
