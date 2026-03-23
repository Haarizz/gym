package com.company.project.dto;

import java.time.LocalDate;
import java.util.List;

public class JournalVoucherRequestDTO {

    private LocalDate date;
    private String narration;
    private String status;
    private String reference;
    private List<JournalVoucherLineDTO> lines;

    public JournalVoucherRequestDTO() {}

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public List<JournalVoucherLineDTO> getLines() { return lines; }
    public void setLines(List<JournalVoucherLineDTO> lines) { this.lines = lines; }
}
