package com.company.project.dto;

import com.company.project.entities.JournalVoucher;
import com.company.project.entities.JournalVoucherLine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class JournalVoucherResponseDTO {

    private Long id;
    private String voucherNo;
    private LocalDate date;
    private String narration;
    private String status;
    private String reference;
    private BigDecimal totalDebit;
    private BigDecimal totalCredit;
    private boolean systemGenerated;
    private Long reversesVoucherId;
    private Long reversedByVoucherId;
    private List<JournalVoucherLineDTO> lines;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public JournalVoucherResponseDTO() {}

    public static JournalVoucherResponseDTO fromEntity(JournalVoucher jv, List<JournalVoucherLine> lines) {
        JournalVoucherResponseDTO dto = new JournalVoucherResponseDTO();
        dto.setId(jv.getId());
        dto.setVoucherNo(jv.getVoucherNo());
        dto.setDate(jv.getDate());
        dto.setNarration(jv.getNarration());
        dto.setStatus(jv.getStatus());
        dto.setReference(jv.getReference());
        dto.setTotalDebit(jv.getTotalDebit());
        dto.setTotalCredit(jv.getTotalCredit());
        dto.setLines(lines.stream().map(JournalVoucherLineDTO::fromEntity).collect(Collectors.toList()));
        dto.setSystemGenerated(jv.isSystemGenerated());
        dto.setReversesVoucherId(jv.getReversesVoucherId());
        dto.setReversedByVoucherId(jv.getReversedByVoucherId());
        dto.setCreatedAt(jv.getCreatedAt());
        dto.setUpdatedAt(jv.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getVoucherNo() { return voucherNo; }
    public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public BigDecimal getTotalDebit() { return totalDebit; }
    public void setTotalDebit(BigDecimal totalDebit) { this.totalDebit = totalDebit; }

    public BigDecimal getTotalCredit() { return totalCredit; }
    public void setTotalCredit(BigDecimal totalCredit) { this.totalCredit = totalCredit; }

    public boolean isSystemGenerated() { return systemGenerated; }
    public void setSystemGenerated(boolean systemGenerated) { this.systemGenerated = systemGenerated; }

    public Long getReversesVoucherId() { return reversesVoucherId; }
    public void setReversesVoucherId(Long reversesVoucherId) { this.reversesVoucherId = reversesVoucherId; }

    public Long getReversedByVoucherId() { return reversedByVoucherId; }
    public void setReversedByVoucherId(Long reversedByVoucherId) { this.reversedByVoucherId = reversedByVoucherId; }

    public List<JournalVoucherLineDTO> getLines() { return lines; }
    public void setLines(List<JournalVoucherLineDTO> lines) { this.lines = lines; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
