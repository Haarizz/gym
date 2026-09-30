package com.company.project.entities;

import jakarta.persistence.*;

/**
 * A saved print layout for a purchase document (see V61__create_print_templates.sql).
 * Deliberately not BranchAware: the design is company-wide, while the header
 * details printed on it come from the document's own branch at print time.
 */
@Entity
@Table(name = "print_templates")
public class PrintTemplate extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // PURCHASE_ORDER | PURCHASE_INVOICE — see PrintTemplateService.CATEGORIES
    @Column(nullable = false, length = 50)
    private String category;

    @Column(nullable = false)
    private String name;

    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;

    @Column(name = "paper_size", nullable = false, length = 20)
    private String paperSize = "A4";

    // Designer JSON, opaque to the backend.
    @Column(name = "settings", columnDefinition = "TEXT")
    private String settings;

    public PrintTemplate() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Boolean getIsDefault() { return isDefault; }
    public void setIsDefault(Boolean isDefault) { this.isDefault = isDefault; }

    public String getPaperSize() { return paperSize; }
    public void setPaperSize(String paperSize) { this.paperSize = paperSize; }

    public String getSettings() { return settings; }
    public void setSettings(String settings) { this.settings = settings; }
}
