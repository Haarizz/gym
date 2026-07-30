package com.company.project.exceptions;

/**
 * A requested entity does not exist (or is soft-deleted). Mapped to HTTP 404 by
 * GlobalExceptionHandler (see docs/gymbios-financial-roadmap.html — M2).
 */
public class EntityNotFoundException extends RuntimeException {
    public EntityNotFoundException(String message) {
        super(message);
    }
}
