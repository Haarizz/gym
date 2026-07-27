package com.company.project.exceptions;

/**
 * The request is well-formed but conflicts with the current state of the
 * resource (e.g. posting an already-POSTED voucher, cancelling a REVERSED one).
 * Mapped to HTTP 409 by GlobalExceptionHandler (see
 * docs/gymbios-financial-roadmap.html — M2).
 */
public class BusinessRuleViolationException extends RuntimeException {
    public BusinessRuleViolationException(String message) {
        super(message);
    }
}
