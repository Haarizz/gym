package com.company.project.exceptions;

/**
 * Thrown by CommunityService when a GymBios app account (JWT isGlobal=true)
 * tries to post, comment or like in a gym where it holds no usable membership.
 * App accounts can read the feed of any gym, but only become community
 * participants once their membership purchase has created a members row
 * (members.global_user_id) in that gym — and, for Cash/Credit/Mixed purchases,
 * once reception has approved it.
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
