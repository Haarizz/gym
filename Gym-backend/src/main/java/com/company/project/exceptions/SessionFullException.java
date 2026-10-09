package com.company.project.exceptions;

/**
 * A booking was attempted on a session with no seats left. Mapped to HTTP 409 with
 * error code SESSION_FULL so the app can tell it apart from other booking failures.
 */
public class SessionFullException extends BusinessRuleViolationException {
    public SessionFullException(String message) {
        super(message);
    }
}
