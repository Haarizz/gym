package com.company.project.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Backing row for VoucherNumberService — one row per (voucher type + year) prefix,
 * e.g. "JV-2026-". See db/migration/V1__create_voucher_sequences.sql.
 */
@Entity
@Table(name = "voucher_sequences")
public class VoucherSequence {

    @Id
    @Column(name = "prefix", length = 32)
    private String prefix;

    @Column(name = "last_value", nullable = false)
    private long lastValue;

    public VoucherSequence() {}

    public String getPrefix() { return prefix; }
    public void setPrefix(String prefix) { this.prefix = prefix; }

    public long getLastValue() { return lastValue; }
    public void setLastValue(long lastValue) { this.lastValue = lastValue; }
}
