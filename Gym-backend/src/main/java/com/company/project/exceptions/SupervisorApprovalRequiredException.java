package com.company.project.exceptions;

/**
 * A POS action needs supervisor approval (POS settings) and the caller is neither a
 * supervisor nor supplied a valid supervisor PIN. Mapped to HTTP 403 with error code
 * SUPERVISOR_APPROVAL_REQUIRED so the terminal can prompt for the PIN and retry.
 */
public class SupervisorApprovalRequiredException extends RuntimeException {
    public SupervisorApprovalRequiredException(String message) {
        super(message);
    }
}
