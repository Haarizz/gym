package com.company.project.exceptions;

/**
 * Thrown by the legacy, tenant-scoped CommunityService when a global mobile
 * principal (JWT isGlobal=true) reaches a code path that would resolve the
 * caller's identity by looking their ID up in the tenant database's users
 * table. A global principal's ID is a primary-DB users.id, not a tenant-local
 * one, so that lookup either fails ("User not found") or — worse — succeeds
 * against an unrelated tenant user who happens to share the numeric ID, and
 * the content is saved under that person's identity.
 *
 * Deliberately NOT a java.lang.SecurityException: CommunityController catches
 * SecurityException and maps it to 401, which is the wrong signal here (the
 * caller is authenticated; this path just doesn't support their account type).
 * GlobalExceptionHandler maps this type to 403 instead.
 */
public class CommunityGlobalPrincipalNotSupportedException extends RuntimeException {

    public CommunityGlobalPrincipalNotSupportedException() {
        super("Community posting, commenting and liking are not yet available for GymBios app accounts.");
    }
}
