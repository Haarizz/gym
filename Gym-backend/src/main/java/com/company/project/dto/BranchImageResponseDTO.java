package com.company.project.dto;

public class BranchImageResponseDTO {
    private Long id;
    private String imageUrl;
    private boolean isCover;
    private int sortOrder;

    public BranchImageResponseDTO() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }

    public boolean isCover() { return isCover; }
    public void setCover(boolean cover) { isCover = cover; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
