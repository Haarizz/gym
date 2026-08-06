package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * One monthly posting period within a FiscalYear. FiscalPeriodService checks
 * status here before allowing a journal entry to post to a date inside this
 * range — OPEN allows posting, CLOSED/LOCKED rejects it.
 */
@Entity
@Table(name = "fiscal_periods")
public class FiscalPeriod extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "fiscal_year_id", nullable = false)
    private Long fiscalYearId;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    // OPEN | CLOSED | LOCKED
    @Column(name = "status", nullable = false)
    private String status = "OPEN";

    public FiscalPeriod() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getFiscalYearId() { return fiscalYearId; }
    public void setFiscalYearId(Long fiscalYearId) { this.fiscalYearId = fiscalYearId; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
