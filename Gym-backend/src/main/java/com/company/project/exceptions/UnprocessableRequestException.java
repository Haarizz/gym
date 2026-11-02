package com.company.project.exceptions;

/**
 * The request is valid but a business rule forbids it right now (e.g. a second pending
 * salary advance, or approving an advance someone else already decided). Mapped to
 * HTTP 422 by GlobalExceptionHandler; the message is shown to the user as is.
 */
public class UnprocessableRequestException extends RuntimeException {
    public UnprocessableRequestException(String message) {
        super(message);
    }
}
