package com.company.project.entities;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

import org.hibernate.annotations.Filter;

@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "facilities")
public class Facility extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // FAC-001, FAC-002 … auto-generated after insert
    @Column(name = "facility_id", unique = true)
    private String facilityId;

    @Column(nullable = false)
    private String name;

    @Column(name = "occupancy_limit", nullable = false)
    private Integer occupancyLimit;

    // Active | Inactive
    @Column(nullable = false)
    private String status = "Active";

    @Column(columnDefinition = "TEXT")
    private String description;

    // icon label stored as string (Basketball, Swimming, etc.)
    @Column(name = "icon_name")
    private String iconName;

    @OneToMany(mappedBy = "facility", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<FacilityRate> rates = new ArrayList<>();

    public Facility() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFacilityId() { return facilityId; }
    public void setFacilityId(String facilityId) { this.facilityId = facilityId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public Integer getOccupancyLimit() { return occupancyLimit; }
    public void setOccupancyLimit(Integer occupancyLimit) { this.occupancyLimit = occupancyLimit; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getIconName() { return iconName; }
    public void setIconName(String iconName) { this.iconName = iconName; }

    public List<FacilityRate> getRates() { return rates; }
    public void setRates(List<FacilityRate> rates) { this.rates = rates; }

    @Column(name = "branch_id")
    private Long branchId;

    public Long getBranchId() { return branchId; }
    public void setBranchId(Long branchId) { this.branchId = branchId; }

}
