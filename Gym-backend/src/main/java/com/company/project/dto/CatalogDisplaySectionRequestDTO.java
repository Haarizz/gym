package com.company.project.dto;

public class CatalogDisplaySectionRequestDTO {

    private String sectionKey;
    private String title;
    private String description;
    private Boolean enabled;
    private Integer sortOrder;

    public String getSectionKey() { return sectionKey; }
    public void setSectionKey(String sectionKey) { this.sectionKey = sectionKey; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public Boolean getEnabled() { return enabled; }
    public void setEnabled(Boolean enabled) { this.enabled = enabled; }

    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}
