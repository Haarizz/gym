package com.company.project.exceptions;

/**
 * Thrown by CommunityService when a GymBios app account (JWT isGlobal=true)
 * lacks the membership an action needs. App accounts can read the feed of any
 * gym; liking and commenting need an active membership at any gym, and posting
 * needs an active membership in this gym (for Cash/Credit/Mixed purchases, once
 * reception has approved it).
 *
 * Deliberately NOT a java.lang.SecurityException: CommunityController catches
 * SecurityException and maps it to 401, which is the wrong signal here (the
 * caller is authenticated; they just aren't a member of this gym yet).
 * GlobalExceptionHandler maps this type to 403 instead.
 */
public class CommunityMembershipRequiredException extends RuntimeException {

    public CommunityMembershipRequiredException(String message) {
        super(message);
    }
}
