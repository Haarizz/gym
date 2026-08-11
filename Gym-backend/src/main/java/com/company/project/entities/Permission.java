package com.company.project.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "permissions")
public class Permission extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "permission_key", unique = true, nullable = false)
    private String permissionKey;

    @Column(nullable = false)
    private String module;

    @Column(nullable = false)
    private String action;

    private String description;

    public Permission() {}

    public Permission(String permissionKey, String module, String action, String description) {
        this.permissionKey = permissionKey;
        this.module = module;
        this.action = action;
        this.description = description;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getPermissionKey() { return permissionKey; }
    public void setPermissionKey(String permissionKey) { this.permissionKey = permissionKey; }

    public String getModule() { return module; }
    public void setModule(String module) { this.module = module; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
