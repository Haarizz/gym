package com.company.project.services;

import com.company.project.repositories.VoucherSequenceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Single source of voucher numbers for Journal, Payment and Receipt Vouchers.
 *
 * Replaces the four previously-duplicated per-service generators, each of which
 * only guarded against concurrent threads within one JVM (a "synchronized" method
 * around a separate read-then-save) and so could still produce duplicate numbers
 * under concurrent requests or multiple application instances.
 *
 * Format matches the existing convention exactly: "{TYPE}-{YEAR}-{00001}". Backed
 * by voucher_sequences (see V1__create_voucher_sequences.sql), allocated via a
 * single atomic "INSERT ... ON CONFLICT ... RETURNING" statement, so numbers never
 * collide regardless of concurrency.
 */
@Service
public class VoucherNumberService {

    private final VoucherSequenceRepository sequenceRepository;

    public VoucherNumberService(VoucherSequenceRepository sequenceRepository) {
        this.sequenceRepository = sequenceRepository;
    }

    /**
     * @param voucherType short type code, e.g. "JV", "PV", "RV"
     */
    @Transactional
    public String next(String voucherType) {
        String prefix = voucherType + "-" + LocalDate.now().getYear() + "-";
        long seq = sequenceRepository.incrementAndGet(prefix);
        return String.format("%s%05d", prefix, seq);
    }
}
