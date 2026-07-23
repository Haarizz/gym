package com.company.project.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "device_keys")
public class DeviceKey extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Human-readable name matching the device_id convention (e.g. "GATE-01", "SCANNER-01")
    @Column(nullable = false, unique = true)
    private String name;

    // SHA-256 hex of the raw API key — never store the raw key
    @Column(name = "key_hash", nullable = false, unique = true)
    private String keyHash;

    @Column(nullable = false)
    private boolean active = true;

    public DeviceKey() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getKeyHash() { return keyHash; }
    public void setKeyHash(String keyHash) { this.keyHash = keyHash; }

    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
