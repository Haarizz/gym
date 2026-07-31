package com.company.project.dto;

import com.company.project.entities.BankReconciliation;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class BankReconciliationResponseDTO {

    private Long id;
    private String bankAccountName;
    private LocalDate statementDate;
    private BigDecimal openingBalance;
    private BigDecimal closingBalance;
    private BigDecimal systemBalance;
    private BigDecimal difference;
    private String status;
    private String notes;
    private long unmatchedCount;
    private List<BankStatementLineDTO> lines;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;

    public BankReconciliationResponseDTO() {}

    public static BankReconciliationResponseDTO fromEntity(BankReconciliation r,
                                                            List<BankStatementLineDTO> lines,
                                                            long unmatchedCount) {
        BankReconciliationResponseDTO dto = new BankReconciliationResponseDTO();
        dto.setId(r.getId());
        dto.setBankAccountName(r.getBankAccountName());
        dto.setStatementDate(r.getStatementDate());
        dto.setOpeningBalance(r.getOpeningBalance());
        dto.setClosingBalance(r.getClosingBalance());
        dto.setSystemBalance(r.getSystemBalance());
        dto.setDifference(r.getDifference());
        dto.setStatus(r.getStatus());
        dto.setNotes(r.getNotes());
        dto.setUnmatchedCount(unmatchedCount);
        dto.setLines(lines);
        dto.setCreatedAt(r.getCreatedAt());
        dto.setUpdatedAt(r.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBankAccountName() { return bankAccountName; }
    public void setBankAccountName(String bankAccountName) { this.bankAccountName = bankAccountName; }

    public LocalDate getStatementDate() { return statementDate; }
    public void setStatementDate(LocalDate statementDate) { this.statementDate = statementDate; }

    public BigDecimal getOpeningBalance() { return openingBalance; }
    public void setOpeningBalance(BigDecimal openingBalance) { this.openingBalance = openingBalance; }

    public BigDecimal getClosingBalance() { return closingBalance; }
    public void setClosingBalance(BigDecimal closingBalance) { this.closingBalance = closingBalance; }

    public BigDecimal getSystemBalance() { return systemBalance; }
    public void setSystemBalance(BigDecimal systemBalance) { this.systemBalance = systemBalance; }

    public BigDecimal getDifference() { return difference; }
    public void setDifference(BigDecimal difference) { this.difference = difference; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public long getUnmatchedCount() { return unmatchedCount; }
    public void setUnmatchedCount(long unmatchedCount) { this.unmatchedCount = unmatchedCount; }

    public List<BankStatementLineDTO> getLines() { return lines; }
    public void setLines(List<BankStatementLineDTO> lines) { this.lines = lines; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
