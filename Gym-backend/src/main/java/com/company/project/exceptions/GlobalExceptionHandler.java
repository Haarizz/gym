package com.company.project.exceptions;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.lang.reflect.Method;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

    @ExceptionHandler(OtpException.class)
    public ResponseEntity<Map<String, Object>> handleOtpException(OtpException ex) {
        return build(ex.getStatus(), ex.getCode(), ex.getMessage());
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
     * A DB constraint rejected the write (value too long for a column, a unique
     * constraint, a not-null violation, an FK violation, ...). Spring/Hibernate's
     * DataIntegrityViolationException.getMessage() includes the raw failing SQL
     * and every bound parameter value — confirmed live: an oversized Gym.phone
     * (VARCHAR(50), unvalidated on both frontend and backend) hit exactly this
     * exception, and before this handler existed it fell through to the generic
     * catch-all below, which put that raw SQL/parameter text straight into a
     * browser alert(). Without a dedicated handler here, ANY oversized/duplicate/
     * invalid field on ANY entity leaks the same way, not just Gym.phone — this
     * closes it for every endpoint at once rather than patching each field's
     * length individually (which still happened for phone specifically, since a
     * real validation error is friendlier than even a clean generic message).
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> handleDataIntegrityViolation(DataIntegrityViolationException ex) {
        log.warn("Data integrity violation", ex);
        return build(HttpStatus.CONFLICT, "DATA_INTEGRITY_VIOLATION", describeDataIntegrityViolation(ex));
    }

    /**
     * Builds a field-specific message from the driver's structured error info.
     * The postgres driver is a <scope>runtime</scope> dependency (pom.xml), so
     * PSQLException/ServerErrorMessage aren't on the compile classpath here —
     * this reaches getServerErrorMessage().getColumn()/getSQLState() via
     * reflection instead of adding a compile-time driver dependency. Falls
     * back to the generic message whenever that detail isn't available, e.g.
     * a non-Postgres constraint check or a cause type this can't introspect.
     */
    private String describeDataIntegrityViolation(DataIntegrityViolationException ex) {
        String fallback = "The data provided could not be saved — a value may be too long, missing, or already in use.";

        Throwable psqlEx = findCauseByClassName(ex, "org.postgresql.util.PSQLException");
        if (psqlEx == null) {
            return fallback;
        }

        try {
            Method getServerErrorMessage = psqlEx.getClass().getMethod("getServerErrorMessage");
            Object error = getServerErrorMessage.invoke(psqlEx);
            if (error == null) {
                return fallback;
            }

            String column = (String) error.getClass().getMethod("getColumn").invoke(error);
            String sqlState = (String) error.getClass().getMethod("getSQLState").invoke(error);
            String detailMessage = (String) error.getClass().getMethod("getMessage").invoke(error);
            String field = humanizeColumn(column);

            // 23505 = unique_violation, 23502 = not_null_violation, 23503 = foreign_key_violation,
            // 22001 = string_data_right_truncation (value too long for the column type)
            if ("23505".equals(sqlState)) {
                return field != null
                        ? "This " + field + " is already in use by another record."
                        : "A duplicate value was provided — this record already exists.";
            }
            if ("23502".equals(sqlState)) {
                return field != null
                        ? "The " + field + " field is required and was left empty."
                        : "A required field was left empty.";
            }
            if ("23503".equals(sqlState)) {
                return field != null
                        ? "The selected " + field + " does not exist or has been removed."
                        : "A referenced record does not exist or has been removed.";
            }
            if ("22001".equals(sqlState)
                    || (detailMessage != null && detailMessage.toLowerCase(Locale.ROOT).contains("too long"))) {
                // Postgres doesn't report a column for this SQLSTATE, but the message
                // names the column's declared type/length (e.g. "character varying(50)"),
                // which is still more actionable than nothing.
                String typeDetail = extractTypeDetail(detailMessage);
                return typeDetail != null
                        ? "A value is too long for its field (max " + typeDetail + ")."
                        : "One of the provided values is too long.";
            }
            return fallback;
        } catch (ReflectiveOperationException | ClassCastException e) {
            log.debug("Could not introspect PSQLException detail", e);
            return fallback;
        }
    }

    private Throwable findCauseByClassName(Throwable ex, String className) {
        Throwable cause = ex;
        while (cause != null) {
            if (className.equals(cause.getClass().getName())) {
                return cause;
            }
            cause = cause.getCause();
        }
        return null;
    }

    private String humanizeColumn(String column) {
        if (column == null || column.isBlank()) {
            return null;
        }
        return column.replace('_', ' ');
    }

    private static final Pattern TYPE_LENGTH_PATTERN = Pattern.compile("character varying\\((\\d+)\\)");

    private String extractTypeDetail(String message) {
        if (message == null) {
            return null;
        }
        Matcher matcher = TYPE_LENGTH_PATTERN.matcher(message);
        return matcher.find() ? matcher.group(1) + " characters" : null;
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
