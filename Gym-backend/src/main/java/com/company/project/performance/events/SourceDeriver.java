package com.company.project.performance.events;

import java.util.List;

/**
 * Reads one source row (receipt, POS sale, lead, session) and says what it should be credited
 * with right now. An empty list means "nothing" — a deleted, refunded, voided or cancelled row.
 * The recorder compares this with the ledger and writes the difference.
 */
public interface SourceDeriver {

    /** receipt | sale | lead | session */
    String sourceType();

    List<Credit> derive(Long sourceId);

    /**
     * Source ids worth reconciling (the rebuild job walks these), optionally limited to one
     * branch and to rows dated in [from, to). Nulls mean no limit.
     */
    List<Long> sourceIds(Long branchId, java.time.LocalDateTime from, java.time.LocalDateTime to);
}
