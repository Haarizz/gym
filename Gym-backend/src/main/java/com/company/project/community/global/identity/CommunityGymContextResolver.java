package com.company.project.community.global.identity;

import com.company.project.community.global.CommunityException;
import com.company.project.community.global.identity.TenantDataSources.TenantDb;
import com.company.project.community.global.identity.TenantMembershipLookup.Lookup;
import com.company.project.community.global.identity.TenantMembershipLookup.Result;
import com.company.project.security.BranchContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * Decides which gym a post or comment is attributed to. A client-supplied gym
 * is only ever a *request*:
 *
 *   GLOBAL actor:  requested gym → that gym's database → member row by
 *                  global_user_id → appAccessEnabled → attributed to that gym.
 *                  Anything else is 403.
 *   TENANT actor:  always the JWT tenant; a different requested gym is 403,
 *                  never silently replaced.
 *   PLATFORM:      cannot write in version 1.
 */
@Component
public class CommunityGymContextResolver {

    /** The gym (and member/branch snapshot) a piece of content is attributed to. */
    public record GymContext(String tenantSlug, String gymName, Long branchId, String branchName, Long memberId) {}

    private final TenantDataSources tenantDataSources;
    private final TenantMembershipLookup membershipLookup;

    public CommunityGymContextResolver(TenantDataSources tenantDataSources, TenantMembershipLookup membershipLookup) {
        this.tenantDataSources = tenantDataSources;
        this.membershipLookup = membershipLookup;
    }

    public GymContext resolveForWrite(CommunityActor actor, String requestedGym) {
        return switch (actor.kind()) {
            case PLATFORM -> throw CommunityException.forbidden("PLATFORM_CANNOT_POST",
                    "Platform accounts can't post in the Community");
            case GLOBAL -> forGlobalMember(actor, requestedGym);
            case TENANT -> forTenantUser(actor, requestedGym);
        };
    }

    /**
     * Whether the actor may see gym-only content of {@code tenantSlug}: staff of
     * that gym (by JWT), or a global user with a current membership there.
     */
    public boolean canSeeGymContent(CommunityActor actor, String tenantSlug) {
        if (tenantSlug == null) {
            return false;
        }
        if (actor.isTenant()) {
            return tenantSlug.equals(actor.tenantSlug());
        }
        if (actor.isGlobal()) {
            Optional<TenantDb> db = tenantDataSources.resolve(tenantSlug);
            if (db.isEmpty()) {
                return false;
            }
            Lookup lookup = membershipLookup.byGlobalUser(db.get(), actor.globalUserId());
            return lookup.result() == Result.MEMBER && lookup.membership().appAccessEnabled();
        }
        return false;
    }

    private GymContext forGlobalMember(CommunityActor actor, String requestedGym) {
        if (requestedGym == null || requestedGym.isBlank()) {
            throw CommunityException.invalid("GYM_CONTEXT_REQUIRED", "Choose which of your gyms you are posting from");
        }
        TenantDb db = tenantDataSources.resolve(requestedGym)
                .orElseThrow(CommunityGymContextResolver::notAMember);
        Lookup lookup = membershipLookup.byGlobalUser(db, actor.globalUserId());
        if (lookup.result() == Result.UNDETERMINED) {
            throw CommunityException.forbidden("MEMBERSHIP_UNDETERMINED",
                    "Your membership of this gym couldn't be confirmed");
        }
        if (lookup.result() != Result.MEMBER) {
            throw notAMember();
        }
        if (!lookup.membership().appAccessEnabled()) {
            throw CommunityException.forbidden("APP_ACCESS_PENDING", "Your membership is awaiting approval");
        }
        return new GymContext(requestedGym, gymName(requestedGym), lookup.membership().branchId(),
                lookup.membership().branchName(), lookup.membership().memberId());
    }

    private GymContext forTenantUser(CommunityActor actor, String requestedGym) {
        String gym = actor.tenantSlug();
        if (gym == null) {
            throw CommunityException.forbidden("MISSING_TENANT_CONTEXT",
                    "Your session doesn't identify a gym; sign in again to post");
        }
        if (requestedGym != null && !requestedGym.isBlank() && !requestedGym.equals(gym)) {
            throw CommunityException.forbidden("GYM_CONTEXT_MISMATCH", "You can only post as a member of your own gym");
        }
        if (gym.chars().anyMatch(Character::isWhitespace)) {
            throw CommunityException.conflict("GYM_SLUG_INVALID",
                    "This gym's identifier needs correcting before it can use the Community");
        }
        TenantDb db = tenantDataSources.resolve(gym).orElseThrow(() -> CommunityException.forbidden("UNKNOWN_GYM",
                "Your gym couldn't be found"));

        Long memberId = null;
        Long branchId = BranchContextHolder.getActiveBranchId();
        Lookup lookup = membershipLookup.byLocalUser(db, actor.tenantUserId());
        if (lookup.result() == Result.MEMBER) {
            if (!lookup.membership().appAccessEnabled()) {
                throw CommunityException.forbidden("APP_ACCESS_PENDING", "Your membership is awaiting approval");
            }
            memberId = lookup.membership().memberId();
            if (branchId == null) {
                branchId = lookup.membership().branchId();
            }
        }
        String branchName = membershipLookup.branchName(db, branchId).orElse(null);
        return new GymContext(gym, gymName(gym), branchId, branchName, memberId);
    }

    private String gymName(String tenantSlug) {
        return tenantDataSources.gymName(tenantSlug).orElse(tenantSlug);
    }

    private static CommunityException notAMember() {
        return CommunityException.forbidden("NOT_A_MEMBER", "You are not a member of that gym");
    }
}
