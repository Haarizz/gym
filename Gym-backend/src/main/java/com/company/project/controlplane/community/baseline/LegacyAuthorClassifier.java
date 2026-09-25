package com.company.project.controlplane.community.baseline;

import java.util.List;
import java.util.Set;

/**
 * Deterministic classification of a legacy Community author (the users row a
 * legacy post/comment/like points at) into a future Community identity kind.
 *
 * Never guesses: any case where the evidence supports more than one reading,
 * or where the authentication layer would interpret the account differently
 * from what the data says, is AMBIGUOUS and must be quarantined for manual
 * resolution. A wrong author is worse than an unmigrated record.
 *
 * Pure function of {@link Evidence} so every rule is unit-testable in isolation.
 */
public final class LegacyAuthorClassifier {

    public enum SourceKind { PRIMARY, TENANT }

    public enum AuthorKind { GLOBAL, TENANT }

    public enum Outcome {
        RESOLVED,
        AMBIGUOUS,
        UNRESOLVED,
        PLATFORM_ACCOUNT,
        POSSIBLE_GLOBAL_ID_COLLISION
    }

    /**
     * @param sourceKind             which database the legacy row lives in
     * @param attributedTenantSlug   the tenant the legacy record belongs to: the
     *                               control-plane slug for a TENANT source, or the
     *                               record's resolved primary gym slug for PRIMARY
     *                               (null when the gym could not be determined)
     * @param userExists             whether the referenced users row exists in the source
     * @param roles                  role names assigned to that users row in the source
     * @param directoryTenantSlugs   distinct control-plane user_directory tenant slugs
     *                               matching the user's username or email
     * @param membersByUserId        members rows in the source with user_id = this id
     * @param membersByGlobalUserId  members rows in the source with global_user_id = this id
     */
    public record Evidence(
            SourceKind sourceKind,
            String attributedTenantSlug,
            boolean userExists,
            Set<String> roles,
            List<String> directoryTenantSlugs,
            int membersByUserId,
            int membersByGlobalUserId
    ) {}

    public record Classification(Outcome outcome, AuthorKind kind, String tenantSlug, String reason) {

        static Classification resolved(AuthorKind kind, String tenantSlug, String reason) {
            return new Classification(Outcome.RESOLVED, kind, tenantSlug, reason);
        }

        static Classification of(Outcome outcome, String reason) {
            return new Classification(outcome, null, null, reason);
        }
    }

    private LegacyAuthorClassifier() {}

    public static Classification classify(Evidence e) {
        if (!e.userExists()) {
            return Classification.of(Outcome.UNRESOLVED, "Referenced users row does not exist in the source database");
        }
        if (e.roles().contains("GYMBIOS_ADMIN")) {
            return Classification.of(Outcome.PLATFORM_ACCOUNT,
                    "Author is the platform owner (GYMBIOS_ADMIN), which has no gym membership or staff identity");
        }
        return e.sourceKind() == SourceKind.TENANT ? classifyTenantSource(e) : classifyPrimarySource(e);
    }

    private static Classification classifyTenantSource(Evidence e) {
        if (e.membersByGlobalUserId() > 0) {
            // The legacy bug: a global principal's ID was looked up in this tenant's
            // users table. If a member here carries global_user_id == this local
            // users.id, the content may have been written by that global user and
            // attributed to the unrelated local user who shares the numeric ID.
            return Classification.of(Outcome.POSSIBLE_GLOBAL_ID_COLLISION,
                    "A member in this tenant has global_user_id equal to this tenant-local users.id; "
                            + "the record may have been written by that global user under the wrong identity");
        }
        if (e.membersByUserId() > 1) {
            return Classification.of(Outcome.AMBIGUOUS, "More than one member row links to this users row");
        }
        for (String slug : e.directoryTenantSlugs()) {
            if (!slug.equals(e.attributedTenantSlug())) {
                return Classification.of(Outcome.AMBIGUOUS,
                        "user_directory maps this username/email to a different tenant");
            }
        }
        return Classification.resolved(AuthorKind.TENANT, e.attributedTenantSlug(),
                e.membersByUserId() == 1 ? "Tenant-local member login" : "Tenant-local staff/user account");
    }

    private static Classification classifyPrimarySource(Evidence e) {
        List<String> dir = e.directoryTenantSlugs();
        if (dir.size() > 1) {
            return Classification.of(Outcome.AMBIGUOUS, "user_directory maps this username/email to more than one tenant");
        }
        if (dir.size() == 1) {
            if (e.membersByGlobalUserId() > 0) {
                return Classification.of(Outcome.AMBIGUOUS,
                        "Account has a user_directory (tenant) entry and is also linked as a global member");
            }
            return Classification.resolved(AuthorKind.TENANT, dir.get(0),
                    "Tenant user per user_directory (primary row predates tenant migration)");
        }

        boolean memberRole = e.roles().contains("MEMBER");
        boolean globalLink = e.membersByGlobalUserId() > 0;
        boolean localLink = e.membersByUserId() > 0;

        if (globalLink && localLink) {
            return Classification.of(Outcome.AMBIGUOUS,
                    "Account is linked to members both as a global user and as a gym-created login");
        }
        if (globalLink) {
            return Classification.resolved(AuthorKind.GLOBAL, null, "Global app account linked via members.global_user_id");
        }
        if (localLink && memberRole) {
            // AuthService issues isGlobal=true for ROLE_MEMBER without a directory
            // entry under tenant routing, so authentication would treat this account
            // as GLOBAL while the data says it is a gym-created member login.
            return Classification.of(Outcome.AMBIGUOUS,
                    "Gym-created member login in the primary database: data links it via members.user_id, "
                            + "but authentication treats ROLE_MEMBER without a directory entry as a global account");
        }
        if (memberRole) {
            return Classification.of(Outcome.AMBIGUOUS,
                    "MEMBER-role account with no membership link and no directory entry");
        }
        if (e.roles().isEmpty()) {
            return Classification.of(Outcome.AMBIGUOUS, "Account has no roles, no membership link and no directory entry");
        }
        if (e.attributedTenantSlug() == null) {
            return Classification.of(Outcome.AMBIGUOUS, "Primary-gym staff account but the record's gym could not be determined");
        }
        return Classification.resolved(AuthorKind.TENANT, e.attributedTenantSlug(), "Primary-gym staff account");
    }
}
