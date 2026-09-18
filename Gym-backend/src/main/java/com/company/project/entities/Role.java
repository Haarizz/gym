package com.company.project.entities;

import jakarta.persistence.*;

@Entity
@Table(name = "roles")
public class Role extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "role_name", unique = true, nullable = false)
    private String roleName;

    private String description;

    @Column(name = "is_system", nullable = false)
    private boolean isSystem = false;

    // Retail POS | F&B POS | null (unassigned) — which POS mode this role's
    // users get in POS Mode (GymOS's POS Mode Options widget).
    @Column(name = "pos_mode")
    private String posMode;

    public Role() {}

    public Role(String roleName) {
        this.roleName = roleName;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public boolean isSystem() { return isSystem; }
    public void setSystem(boolean system) { isSystem = system; }

    public String getPosMode() { return posMode; }
    public void setPosMode(String posMode) { this.posMode = posMode; }
}
