package com.company.project.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * A real, POSTED journal voucher line on the bank account that a bank
 * statement line could be matched against — used both by the manual match
 * picker and by auto-match suggestions. Never fabricated: always backed by
 * an actual JournalVoucher.
 */
public class MatchCandidateDTO {

    private Long journalVoucherId;
    private String voucherNo;
    private LocalDate date;
    private String narration;
    private BigDecimal amount;

    public MatchCandidateDTO() {}

    public MatchCandidateDTO(Long journalVoucherId, String voucherNo, LocalDate date,
                              String narration, BigDecimal amount) {
        this.journalVoucherId = journalVoucherId;
        this.voucherNo = voucherNo;
        this.date = date;
        this.narration = narration;
        this.amount = amount;
    }

    public Long getJournalVoucherId() { return journalVoucherId; }
    public void setJournalVoucherId(Long journalVoucherId) { this.journalVoucherId = journalVoucherId; }

    public String getVoucherNo() { return voucherNo; }
    public void setVoucherNo(String voucherNo) { this.voucherNo = voucherNo; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public String getNarration() { return narration; }
    public void setNarration(String narration) { this.narration = narration; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
