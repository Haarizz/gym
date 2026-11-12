package com.company.project.performance.events;

import java.util.List;

/**
 * A row that earns nothing itself but whose changes affect rows that do — e.g. the add-on a
 * training package was sold as (its payment, approval or cancellation changes what the package
 * enrolment earns). Touching it reconciles {@link #targets} instead.
 */
public interface SourceRedirect {

    /** The touched type, e.g. "addon". */
    String sourceType();

    /** The source type the targets are reconciled as, e.g. "enrolment". */
    String targetType();

    /** Runs inside a transaction. */
    List<Long> targets(Long sourceId);
}
