package com.company.project.exceptions;

import org.springframework.http.HttpStatus;

/**
 * Carries a specific HTTP status + machine-readable code for the mobile OTP
 * verification flow (e.g. ALREADY_VERIFIED, REGISTRATION_EXPIRED, INVALID_OTP,
 * TOO_MANY_ATTEMPTS) so the client can branch on `error` rather than parsing
 * the message string. Mapped by GlobalExceptionHandler.
 */
public class OtpException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public OtpException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }
}
