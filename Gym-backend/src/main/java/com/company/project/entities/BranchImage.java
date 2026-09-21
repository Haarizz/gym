package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "branch_images")
public class BranchImage extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "image_url", nullable = false, columnDefinition = "TEXT")
    private String imageUrl;

    @Column(name = "is_cover", nullable = false)
    private boolean isCover = false;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder = 0;

    public BranchImage() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public boolean isCover() { return isCover; }
    public void setCover(boolean cover) { isCover = cover; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }

    @Override
    public Long getBranchId() { return branchId; }

    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }
}
