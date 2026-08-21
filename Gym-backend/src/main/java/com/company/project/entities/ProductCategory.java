package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "product_categories")
public class ProductCategory extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    // SUPPLEMENTS / EQUIPMENT / MERCHANDISE / CAFE / APPAREL / ACCESSORIES / FOOD_BEVERAGES / SERVICES
    @Column(name = "category_type")
    private String categoryType;

    // e.g. "bg-blue-500"
    @Column(name = "color")
    private String color;

    @Column(name = "icon_name")
    private String iconName;

    public ProductCategory() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getCategoryType() { return categoryType; }
    public void setCategoryType(String categoryType) { this.categoryType = categoryType; }

    public String getColor() { return color; }
    public void setColor(String color) { this.color = color; }

    public String getIconName() { return iconName; }
    public void setIconName(String iconName) { this.iconName = iconName; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    @jakarta.persistence.PrePersist
    public void prePersistBranchId() {
        if (this.branchId == null) {
            Long activeBranch = com.company.project.security.BranchContextHolder.getActiveBranchId();
            if (activeBranch != null) {
                this.branchId = activeBranch;
            }
        }
    }
}
