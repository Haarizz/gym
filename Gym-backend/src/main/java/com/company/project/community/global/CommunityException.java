package com.company.project.community.global;

import org.springframework.http.HttpStatus;

/**
 * Every refusal in the global Community carries an explicit HTTP status and a
 * stable machine-readable code, mapped by GlobalExceptionHandler.
 *
 * Deliberately not a java.lang.SecurityException, which legacy controllers catch
 * and turn into 401.
 */
public class CommunityException extends RuntimeException {

    private final HttpStatus status;
    private final String code;

    public CommunityException(HttpStatus status, String code, String message) {
        super(message);
        this.status = status;
        this.code = code;
    }

    public HttpStatus getStatus() { return status; }
    public String getCode() { return code; }

    public static CommunityException unauthenticated() {
        return new CommunityException(HttpStatus.UNAUTHORIZED, "NOT_AUTHENTICATED", "Authentication required");
    }

    public static CommunityException forbidden(String code, String message) {
        return new CommunityException(HttpStatus.FORBIDDEN, code, message);
    }

    /** Used for anything the caller may not see, so hidden/deleted content is indistinguishable from missing. */
    public static CommunityException notFound(String what) {
        return new CommunityException(HttpStatus.NOT_FOUND, "NOT_FOUND", what + " not found");
    }

    public static CommunityException invalid(String code, String message) {
        return new CommunityException(HttpStatus.BAD_REQUEST, code, message);
    }

    public static CommunityException conflict(String code, String message) {
        return new CommunityException(HttpStatus.CONFLICT, code, message);
    }

    public static CommunityException unavailable(String code, String message) {
        return new CommunityException(HttpStatus.SERVICE_UNAVAILABLE, code, message);
    }
}
