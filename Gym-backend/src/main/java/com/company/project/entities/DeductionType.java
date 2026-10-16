package com.company.project.entities;

import jakarta.persistence.*;

/** Configurable payroll deduction type (gym-wide). */
@Entity
@Table(name = "deduction_types")
public class DeductionType extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "code", nullable = false)
    private String code;

    @Column(name = "calc_method", nullable = false)
    private String calcMethod = "Fixed";

    @Column(name = "recurring", nullable = false)
    private Boolean recurring = false;

    @Column(name = "requires_approval", nullable = false)
    private Boolean requiresApproval = true;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getCalcMethod() { return calcMethod; }
    public void setCalcMethod(String calcMethod) { this.calcMethod = calcMethod; }
    public Boolean getRecurring() { return recurring; }
    public void setRecurring(Boolean recurring) { this.recurring = recurring; }
    public Boolean getRequiresApproval() { return requiresApproval; }
    public void setRequiresApproval(Boolean requiresApproval) { this.requiresApproval = requiresApproval; }
    public Boolean getActive() { return active; }
    public void setActive(Boolean active) { this.active = active; }
}
