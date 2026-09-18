package com.company.project.dto;

import com.company.project.entities.CatalogDisplaySection;

public class CatalogDisplaySectionResponseDTO {

    private Long id;
    private String sectionKey;
    private String title;
    private String description;
    private boolean enabled;
    private int sortOrder;

    public static CatalogDisplaySectionResponseDTO fromEntity(CatalogDisplaySection s) {
        CatalogDisplaySectionResponseDTO dto = new CatalogDisplaySectionResponseDTO();
        dto.id = s.getId();
        dto.sectionKey = s.getSectionKey();
        dto.title = s.getTitle();
        dto.description = s.getDescription();
        dto.enabled = s.isEnabled();
        dto.sortOrder = s.getSortOrder();
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSectionKey() { return sectionKey; }
    public void setSectionKey(String sectionKey) { this.sectionKey = sectionKey; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }

    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
