package com.company.project.entities;

import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "facility_rates")
public class FacilityRate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "facility_id", nullable = false)
    private Facility facility;

    // Per Hour | Per Half Day | Per Full Day | Per Month
    @Column(name = "rate_type", nullable = false)
    private String rateType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal rate;

    public FacilityRate() {}

    public FacilityRate(Facility facility, String rateType, BigDecimal rate) {
        this.facility = facility;
        this.rateType = rateType;
        this.rate = rate;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Facility getFacility() { return facility; }
    public void setFacility(Facility facility) { this.facility = facility; }

    public String getRateType() { return rateType; }
    public void setRateType(String rateType) { this.rateType = rateType; }

    public BigDecimal getRate() { return rate; }
    public void setRate(BigDecimal rate) { this.rate = rate; }
}
