package com.company.project.entities;

import jakarta.persistence.*;

// One row per BiOS report/export generation — backs the "Recent Reports" and
// "Recent Exports" lists, which previously showed hardcoded sample rows
// ("Monthly Financial Summary", "24 this month", etc.) with no real backing data.
@Entity
@Table(name = "bios_activity_logs")
public class BiosActivityLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // REPORT / EXPORT
    @Column(nullable = false)
    private String type;

    @Column(nullable = false)
    private String title;

    // CSV — the only format this app actually generates today.
    @Column(nullable = false)
    private String format;

    @Column(name = "row_count")
    private Integer rowCount;

    public BiosActivityLog() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getFormat() { return format; }
    public void setFormat(String format) { this.format = format; }

    public Integer getRowCount() { return rowCount; }
    public void setRowCount(Integer rowCount) { this.rowCount = rowCount; }
}
