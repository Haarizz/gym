package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

/**
 * A named checkout counter (BillBull PosCounter); terminals are assigned to counters.
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_counters")
public class PosCounter extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "code", length = 40, nullable = false)
    private String code;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "status", length = 20, nullable = false)
    private String status = "ACTIVE";

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    public PosCounter() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
}
