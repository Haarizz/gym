package com.company.project.dto;

import com.company.project.entities.AssetTransfer;

import java.time.LocalDate;

public class AssetTransferDTO {

    private Long id;
    private LocalDate date;
    private String from;
    private String to;
    private String reason;

    public AssetTransferDTO() {}

    public static AssetTransferDTO fromEntity(AssetTransfer t) {
        AssetTransferDTO dto = new AssetTransferDTO();
        dto.setId(t.getId());
        dto.setDate(t.getTransferDate());
        dto.setFrom(t.getFromLocation());
        dto.setTo(t.getToLocation());
        dto.setReason(t.getReason());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getFrom() { return from; }
    public void setFrom(String from) { this.from = from; }

    public String getTo() { return to; }
    public void setTo(String to) { this.to = to; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
}
