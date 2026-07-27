package com.company.project.repositories;

import com.company.project.entities.VoucherSequence;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VoucherSequenceRepository extends JpaRepository<VoucherSequence, String> {

    /**
     * Atomically allocates the next value for a prefix (e.g. "JV-2026-") and returns
     * it. The INSERT ... ON CONFLICT ... RETURNING is a single atomic Postgres
     * statement, so it is safe under any number of concurrent callers or application
     * instances — unlike the previous "read last value, increment in Java, save"
     * pattern it replaces.
     */
    @Query(value = "INSERT INTO voucher_sequences (prefix, last_value) VALUES (:prefix, 1) " +
                   "ON CONFLICT (prefix) DO UPDATE SET last_value = voucher_sequences.last_value + 1 " +
                   "RETURNING last_value",
           nativeQuery = true)
    long incrementAndGet(@Param("prefix") String prefix);
}
