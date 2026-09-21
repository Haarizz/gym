package com.company.project.dto.mobile.dashboard.admin;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

public class AdminDashboardReportResponseDTO {

    private String reportType;
    private AdminDashboardBranchContextDTO branch;
    private LocalDate from;
    private LocalDate to;
    private String currency;
    private List<String> columns;
    private List<Map<String, Object>> rows;
    private long totalEntries;
    private BigDecimal aggregateTotal;
    private int page;
    private int pageSize;
    private int totalPages;

    public String getReportType() { return reportType; }
    public void setReportType(String reportType) { this.reportType = reportType; }

    public AdminDashboardBranchContextDTO getBranch() { return branch; }
    public void setBranch(AdminDashboardBranchContextDTO branch) { this.branch = branch; }

    public LocalDate getFrom() { return from; }
    public void setFrom(LocalDate from) { this.from = from; }

    public LocalDate getTo() { return to; }
    public void setTo(LocalDate to) { this.to = to; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public List<String> getColumns() { return columns; }
    public void setColumns(List<String> columns) { this.columns = columns; }

    public List<Map<String, Object>> getRows() { return rows; }
    public void setRows(List<Map<String, Object>> rows) { this.rows = rows; }

    public long getTotalEntries() { return totalEntries; }
    public void setTotalEntries(long totalEntries) { this.totalEntries = totalEntries; }

    public BigDecimal getAggregateTotal() { return aggregateTotal; }
    public void setAggregateTotal(BigDecimal aggregateTotal) { this.aggregateTotal = aggregateTotal; }

    public int getPage() { return page; }
    public void setPage(int page) { this.page = page; }

    public int getPageSize() { return pageSize; }
    public void setPageSize(int pageSize) { this.pageSize = pageSize; }

    public int getTotalPages() { return totalPages; }
    public void setTotalPages(int totalPages) { this.totalPages = totalPages; }
}
