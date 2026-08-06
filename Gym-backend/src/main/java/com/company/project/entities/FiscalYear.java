package com.company.project.entities;

import jakarta.persistence.*;
import java.time.LocalDate;

/**
 * A fiscal year owns 12 FiscalPeriod rows (auto-created by FiscalYearService
 * on creation). status is a coarse OPEN/CLOSED flag over the whole year —
 * fine-grained locking happens per-period on FiscalPeriod.status.
 */
@Entity
@Table(name = "fiscal_years")
public class FiscalYear extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, unique = true)
    private String name;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    // OPEN | CLOSED
    @Column(name = "status", nullable = false)
    private String status = "OPEN";

    public FiscalYear() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
