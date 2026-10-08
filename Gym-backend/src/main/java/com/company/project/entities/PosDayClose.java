package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;

/**
 * Z-report day close for one branch and business date: a frozen snapshot of the
 * day figures (summaryJson holds the full Z-report payload as it was at close).
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_day_closes")
public class PosDayClose extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    @Column(name = "business_date", nullable = false)
    private java.time.LocalDate businessDate;

    @Column(name = "close_number", length = 50)
    private String closeNumber;

    @Column(name = "session_count", nullable = false)
    private Integer sessionCount = 0;

    @Column(name = "invoice_count", nullable = false)
    private Integer invoiceCount = 0;

    @Column(name = "gross_sales", precision = 14, scale = 2, nullable = false)
    private BigDecimal grossSales = BigDecimal.ZERO;

    @Column(name = "total_discount", precision = 14, scale = 2, nullable = false)
    private BigDecimal totalDiscount = BigDecimal.ZERO;

    @Column(name = "total_tax", precision = 14, scale = 2, nullable = false)
    private BigDecimal totalTax = BigDecimal.ZERO;

    @Column(name = "net_sales", precision = 14, scale = 2, nullable = false)
    private BigDecimal netSales = BigDecimal.ZERO;

    @Column(name = "total_returns", precision = 14, scale = 2, nullable = false)
    private BigDecimal totalReturns = BigDecimal.ZERO;

    @Column(name = "expected_cash", precision = 14, scale = 2, nullable = false)
    private BigDecimal expectedCash = BigDecimal.ZERO;

    @Column(name = "counted_cash", precision = 14, scale = 2, nullable = false)
    private BigDecimal countedCash = BigDecimal.ZERO;

    @Column(name = "cash_variance", precision = 14, scale = 2, nullable = false)
    private BigDecimal cashVariance = BigDecimal.ZERO;

    @Column(name = "summary_json", columnDefinition = "TEXT")
    private String summaryJson;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "closed_by")
    private String closedBy;

    @Column(name = "closed_at")
    private java.time.LocalDateTime closedAt;

    public PosDayClose() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public java.time.LocalDate getBusinessDate() { return businessDate; }
    public void setBusinessDate(java.time.LocalDate businessDate) { this.businessDate = businessDate; }

    public String getCloseNumber() { return closeNumber; }
    public void setCloseNumber(String closeNumber) { this.closeNumber = closeNumber; }

    public Integer getSessionCount() { return sessionCount; }
    public void setSessionCount(Integer sessionCount) { this.sessionCount = sessionCount; }

    public Integer getInvoiceCount() { return invoiceCount; }
    public void setInvoiceCount(Integer invoiceCount) { this.invoiceCount = invoiceCount; }

    public BigDecimal getGrossSales() { return grossSales; }
    public void setGrossSales(BigDecimal grossSales) { this.grossSales = grossSales; }

    public BigDecimal getTotalDiscount() { return totalDiscount; }
    public void setTotalDiscount(BigDecimal totalDiscount) { this.totalDiscount = totalDiscount; }

    public BigDecimal getTotalTax() { return totalTax; }
    public void setTotalTax(BigDecimal totalTax) { this.totalTax = totalTax; }

    public BigDecimal getNetSales() { return netSales; }
    public void setNetSales(BigDecimal netSales) { this.netSales = netSales; }

    public BigDecimal getTotalReturns() { return totalReturns; }
    public void setTotalReturns(BigDecimal totalReturns) { this.totalReturns = totalReturns; }

    public BigDecimal getExpectedCash() { return expectedCash; }
    public void setExpectedCash(BigDecimal expectedCash) { this.expectedCash = expectedCash; }

    public BigDecimal getCountedCash() { return countedCash; }
    public void setCountedCash(BigDecimal countedCash) { this.countedCash = countedCash; }

    public BigDecimal getCashVariance() { return cashVariance; }
    public void setCashVariance(BigDecimal cashVariance) { this.cashVariance = cashVariance; }

    public String getSummaryJson() { return summaryJson; }
    public void setSummaryJson(String summaryJson) { this.summaryJson = summaryJson; }

    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }

    public String getClosedBy() { return closedBy; }
    public void setClosedBy(String closedBy) { this.closedBy = closedBy; }

    public java.time.LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(java.time.LocalDateTime closedAt) { this.closedAt = closedAt; }
}
