package com.company.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.Filter;

/**
 * A set of terms & conditions accepted before desk payments of the kinds it applies to
 * (GymOS › Settings › Payment Terms, V135).
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "payment_terms")
public class PaymentTerms extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id", nullable = false)
    private Long branchId;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** Comma-separated payment kinds (PaymentTermsService.KINDS). */
    @Column(name = "applies_to", nullable = false, columnDefinition = "TEXT")
    private String appliesTo = "";

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    @Column(nullable = false)
    private int version = 1;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override public Long getBranchId() { return branchId; }
    @Override public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getAppliesTo() { return appliesTo; }
    public void setAppliesTo(String appliesTo) { this.appliesTo = appliesTo; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    public int getVersion() { return version; }
    public void setVersion(int version) { this.version = version; }
}
