package com.company.project.exceptions;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Central mapping from exception type to HTTP status + a structured error body
 * (see docs/gymbios-financial-roadmap.html — M2).
 *
 * Previously every "not found" and business-rule violation across the financial
 * services was a plain RuntimeException, so the frontend had no way to
 * distinguish "voucher not found" (should be 404) from "only DRAFT vouchers can
 * be posted" (should be 409) other than parsing the message string — both
 * surfaced as a generic 500.
 *
 * IllegalArgumentException/IllegalStateException are also handled here: those
 * are already the established convention for validation/state errors elsewhere
 * in this codebase (BankReconciliationService, CostCenterService,
 * TaxComplianceService, SupplierBillService, FinancialEventService, …), so
 * mapping them gives every one of those call sites a correct HTTP status too,
 * without having to touch each of those services individually.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(EntityNotFoundException ex) {
        return build(HttpStatus.NOT_FOUND, "NOT_FOUND", ex.getMessage());
    }

    @ExceptionHandler(BusinessRuleViolationException.class)
    public ResponseEntity<Map<String, Object>> handleBusinessRule(BusinessRuleViolationException ex) {
        return build(HttpStatus.CONFLICT, "BUSINESS_RULE_VIOLATION", ex.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalState(IllegalStateException ex) {
        return build(HttpStatus.CONFLICT, "INVALID_STATE", ex.getMessage());
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, Object>> handleIllegalArgument(IllegalArgumentException ex) {
        return build(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", ex.getMessage());
    }

    /**
     * Catch-all for anything not already mapped above (plain RuntimeException,
     * NullPointerException, etc.). Without this, an uncaught exception falls
     * through to Spring Boot's default /error page, which sits outside the
     * permitAll("/api/**") security rule and comes back as an empty 403 —
     * masking the real error and making failures like a broken renewal look
     * like an auth problem instead of showing what actually went wrong.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleUnexpected(Exception ex) {
        log.error("Unhandled exception", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
                ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName());
    }

    private ResponseEntity<Map<String, Object>> build(HttpStatus status, String error, String message) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("timestamp", Instant.now().toString());
        body.put("status", status.value());
        body.put("error", error);
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
