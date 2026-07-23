package com.company.project.entities;

import jakarta.persistence.*;

/**
 * A product marked as a favorite in the POS product grid. Global/shared
 * across all POS terminals (no per-staff scoping infrastructure exists yet
 * in this codebase) — mirrors what the previous localStorage-only version
 * did, just centralized and persistent.
 */
@Entity
@Table(name = "pos_favorite_products", uniqueConstraints = {
        @UniqueConstraint(name = "uk_pos_favorite_product", columnNames = "product_id")
})
public class PosFavoriteProduct extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "product_id", nullable = false)
    private Long productId;

    public PosFavoriteProduct() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getProductId() { return productId; }
    public void setProductId(Long productId) { this.productId = productId; }
}
