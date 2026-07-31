package com.company.project.dto;

import com.company.project.entities.WastageReturn;
import com.company.project.entities.WastageReturnItem;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class WastageReturnResponseDTO {

    private Long id;
    private String voucherNumber;
    private LocalDate date;
    private String type;
    private String associatedParty;
    private String partyType;
    private String reason;
    private String status;
    private String location;
    private String recordedBy;
    private String approvedBy;
    private Integer totalItems;
    private BigDecimal totalValue;
    private String notes;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime approvalDate;
    private String rejectionReason;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime updatedAt;
    private String createdBy;
    private List<WastageReturnItemDTO> items;

    public WastageReturnResponseDTO() {}

    public static WastageReturnResponseDTO fromEntity(WastageReturn e, List<WastageReturnItem> items) {
        WastageReturnResponseDTO dto = new WastageReturnResponseDTO();
        dto.setId(e.getId());
        dto.setVoucherNumber(e.getVoucherNumber());
        dto.setDate(e.getDate());
        dto.setType(e.getType());
        dto.setAssociatedParty(e.getAssociatedParty());
        dto.setPartyType(e.getPartyType());
        dto.setReason(e.getReason());
        dto.setStatus(e.getStatus());
        dto.setLocation(e.getLocation());
        dto.setRecordedBy(e.getRecordedBy());
        dto.setApprovedBy(e.getApprovedBy());
        dto.setTotalItems(e.getTotalItems());
        dto.setTotalValue(e.getTotalValue());
        dto.setNotes(e.getNotes());
        dto.setApprovalDate(e.getApprovalDate());
        dto.setRejectionReason(e.getRejectionReason());
        dto.setCreatedAt(e.getCreatedAt());
        dto.setUpdatedAt(e.getUpdatedAt());
        dto.setCreatedBy(e.getCreatedBy());
        dto.setItems(items.stream().map(WastageReturnItemDTO::fromEntity).collect(Collectors.toList()));
        return dto;
    }

    // ── Getters & Setters ──────────────────────────────────────────────────

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVoucherNumber() { return voucherNumber; }
    public void setVoucherNumber(String voucherNumber) { this.voucherNumber = voucherNumber; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getAssociatedParty() { return associatedParty; }
    public void setAssociatedParty(String associatedParty) { this.associatedParty = associatedParty; }

    public String getPartyType() { return partyType; }
    public void setPartyType(String partyType) { this.partyType = partyType; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }

    public String getRecordedBy() { return recordedBy; }
    public void setRecordedBy(String recordedBy) { this.recordedBy = recordedBy; }

    public String getApprovedBy() { return approvedBy; }
    public void setApprovedBy(String approvedBy) { this.approvedBy = approvedBy; }

    public Integer getTotalItems() { return totalItems; }
    public void setTotalItems(Integer totalItems) { this.totalItems = totalItems; }

    public BigDecimal getTotalValue() { return totalValue; }
    public void setTotalValue(BigDecimal totalValue) { this.totalValue = totalValue; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getApprovalDate() { return approvalDate; }
    public void setApprovalDate(LocalDateTime approvalDate) { this.approvalDate = approvalDate; }

    public String getRejectionReason() { return rejectionReason; }
    public void setRejectionReason(String rejectionReason) { this.rejectionReason = rejectionReason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getCreatedBy() { return createdBy; }
    public void setCreatedBy(String createdBy) { this.createdBy = createdBy; }

    public List<WastageReturnItemDTO> getItems() { return items; }
    public void setItems(List<WastageReturnItemDTO> items) { this.items = items; }
}
