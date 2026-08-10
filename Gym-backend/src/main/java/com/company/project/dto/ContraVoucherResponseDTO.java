package com.company.project.dto;

import com.company.project.entities.ContraVoucher;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

public class ContraVoucherResponseDTO {

    private Long id;
    private String voucherNo;
    private LocalDate date;
    private String fromAccountCode;
    private String fromAccountName;
    private String toAccountCode;
    private String toAccountName;
    private BigDecimal amount;
    private String narration;
    private String reference;
    private String status;
    private Long journalVoucherId;
    @JsonSerialize(using = UtcLocalDateTimeSerializer.class)
    private LocalDateTime createdAt;

    public ContraVoucherResponseDTO() {}

    public static ContraVoucherResponseDTO fromEntity(ContraVoucher v, Long journalVoucherId) {
        ContraVoucherResponseDTO dto = new ContraVoucherResponseDTO();
        dto.setId(v.getId());
        dto.setVoucherNo(v.getVoucherNo());
        dto.setDate(v.getDate());
        dto.setFromAccountCode(v.getFromAccountCode());
        dto.setFromAccountName(v.getFromAccountName());
        dto.setToAccountCode(v.getToAccountCode());
        dto.setToAccountName(v.getToAccountName());
        dto.setAmount(v.getAmount());
        dto.setNarration(v.getNarration());
        dto.setReference(v.getReference());
        dto.setStatus(v.getStatus());
        dto.setJournalVoucherId(journalVoucherId);
        dto.setCreatedAt(v.getCreatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVoucherNo() { return voucherNo; }
    public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getFromAccountCode() { return fromAccountCode; }
    public void setFromAccountCode(String fromAccountCode) { this.fromAccountCode = fromAccountCode; }

    public String getFromAccountName() { return fromAccountName; }
    public void setFromAccountName(String fromAccountName) { this.fromAccountName = fromAccountName; }

    public String getToAccountCode() { return toAccountCode; }
    public void setToAccountCode(String toAccountCode) { this.toAccountCode = toAccountCode; }

    public String getToAccountName() { return toAccountName; }
    public void setToAccountName(String toAccountName) { this.toAccountName = toAccountName; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Long getJournalVoucherId() { return journalVoucherId; }
    public void setJournalVoucherId(Long journalVoucherId) { this.journalVoucherId = journalVoucherId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
