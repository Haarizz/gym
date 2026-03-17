package com.company.project.dto;

import com.company.project.entities.PosSession;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class PosSessionResponseDTO {

    private Long id;
    private String sessionNumber;
    private BigDecimal openingCash;
    private BigDecimal closingCash;
    private String openingDenominations;
    private String closingDenominations;
    private String status;
    private LocalDateTime openedAt;
    private LocalDateTime closedAt;
    private String staffName;
    private String notes;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private BigDecimal totalSales;
    private int transactionCount;

    public PosSessionResponseDTO() {}

    public static PosSessionResponseDTO fromEntity(PosSession s, BigDecimal totalSales, int transactionCount) {
        PosSessionResponseDTO dto = new PosSessionResponseDTO();
        dto.setId(s.getId());
        dto.setSessionNumber(s.getSessionNumber());
        dto.setOpeningCash(s.getOpeningCash());
        dto.setClosingCash(s.getClosingCash());
        dto.setOpeningDenominations(s.getOpeningDenominations());
        dto.setClosingDenominations(s.getClosingDenominations());
        dto.setStatus(s.getStatus());
        dto.setOpenedAt(s.getOpenedAt());
        dto.setClosedAt(s.getClosedAt());
        dto.setStaffName(s.getStaffName());
        dto.setNotes(s.getNotes());
        dto.setCreatedAt(s.getCreatedAt());
        dto.setUpdatedAt(s.getUpdatedAt());
        dto.setTotalSales(totalSales);
        dto.setTransactionCount(transactionCount);
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSessionNumber() { return sessionNumber; }
    public void setSessionNumber(String sessionNumber) { this.sessionNumber = sessionNumber; }

    public BigDecimal getOpeningCash() { return openingCash; }
    public void setOpeningCash(BigDecimal openingCash) { this.openingCash = openingCash; }

    public BigDecimal getClosingCash() { return closingCash; }
    public void setClosingCash(BigDecimal closingCash) { this.closingCash = closingCash; }

    public String getOpeningDenominations() { return openingDenominations; }
    public void setOpeningDenominations(String openingDenominations) { this.openingDenominations = openingDenominations; }

    public String getClosingDenominations() { return closingDenominations; }
    public void setClosingDenominations(String closingDenominations) { this.closingDenominations = closingDenominations; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getOpenedAt() { return openedAt; }
    public void setOpenedAt(LocalDateTime openedAt) { this.openedAt = openedAt; }

    public LocalDateTime getClosedAt() { return closedAt; }
    public void setClosedAt(LocalDateTime closedAt) { this.closedAt = closedAt; }

    public String getStaffName() { return staffName; }
    public void setStaffName(String staffName) { this.staffName = staffName; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public BigDecimal getTotalSales() { return totalSales; }
    public void setTotalSales(BigDecimal totalSales) { this.totalSales = totalSales; }

    public int getTransactionCount() { return transactionCount; }
    public void setTransactionCount(int transactionCount) { this.transactionCount = transactionCount; }
}
