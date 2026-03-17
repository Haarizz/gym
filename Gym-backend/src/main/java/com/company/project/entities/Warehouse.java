package com.company.project.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "warehouses")
public class Warehouse extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    // MAIN_WAREHOUSE / BRANCH / ONLINE
    @Column(name = "type")
    private String type;

    @Column(name = "location")
    private String location;

    @Column(name = "is_active")
    private Boolean isActive = true;

    public Warehouse() {}

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
