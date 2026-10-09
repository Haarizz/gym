package com.company.project.community.global.identity;

import java.util.Objects;
import java.util.Set;

/**
 * Who is making a Community request, in exactly one identity space.
 *
 * Produced only by {@link CommunityActorResolver}. Community code never reads
 * the Spring principal's ID directly: a global user's ID and a tenant-local
 * users.id are different numbering spaces, and confusing them caused the
 * legacy "User not found" / wrong-author bug.
 *
 * @param tenantSlug for TENANT actors, the gym from the authenticated JWT
 *                   tenant claim — never from a client header. May be null when
 *                   the token carries no tenant, in which case the actor can
 *                   read but not write or moderate.
 */
public record CommunityActor(
        Kind kind,
        Long globalUserId,
        String tenantSlug,
        Long tenantUserId,
        Long platformUserId,
        String primaryRole,
        Set<String> permissions
) {

    public enum Kind { GLOBAL, TENANT, PLATFORM }

    public static final String MODERATE_PERMISSION = "COMMUNITY_MODERATE";

    public CommunityActor {
        Objects.requireNonNull(kind, "kind");
        permissions = permissions == null ? Set.of() : Set.copyOf(permissions);
        switch (kind) {
            case GLOBAL -> require(globalUserId != null && tenantUserId == null && platformUserId == null && tenantSlug == null,
                    "GLOBAL actor must carry only a global user id");
            case TENANT -> require(tenantUserId != null && globalUserId == null && platformUserId == null,
                    "TENANT actor must carry only a tenant-local user id");
            case PLATFORM -> require(platformUserId != null && globalUserId == null && tenantUserId == null && tenantSlug == null,
                    "PLATFORM actor must carry only a platform user id");
        }
    }

    public static CommunityActor global(long globalUserId) {
        return new CommunityActor(Kind.GLOBAL, globalUserId, null, null, null, "MEMBER", Set.of());
    }

    public static CommunityActor tenant(String tenantSlug, long tenantUserId, String primaryRole, Set<String> permissions) {
        return new CommunityActor(Kind.TENANT, null, tenantSlug, tenantUserId, null, primaryRole, permissions);
    }

    public static CommunityActor platform(long platformUserId) {
        return new CommunityActor(Kind.PLATFORM, null, null, null, platformUserId, "GYMBIOS_ADMIN", Set.of());
    }

    public boolean isGlobal() { return kind == Kind.GLOBAL; }
    public boolean isTenant() { return kind == Kind.TENANT; }
    public boolean isPlatform() { return kind == Kind.PLATFORM; }

    public boolean hasPermission(String permission) {
        return permissions.contains(permission);
    }

    /** Stable, non-sensitive identifier for logs and audit rows, e.g. "TENANT:gym-a:12". */
    public String describe() {
        return switch (kind) {
            case GLOBAL -> "GLOBAL:" + globalUserId;
            case TENANT -> "TENANT:" + tenantSlug + ":" + tenantUserId;
            case PLATFORM -> "PLATFORM:" + platformUserId;
        };
    }

    private static void require(boolean condition, String message) {
        if (!condition) {
            throw new IllegalArgumentException(message);
        }
    }
}
