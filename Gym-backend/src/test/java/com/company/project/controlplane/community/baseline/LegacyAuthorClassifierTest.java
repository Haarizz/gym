package com.company.project.controlplane.community.baseline;

import com.company.project.controlplane.community.baseline.LegacyAuthorClassifier.AuthorKind;
import com.company.project.controlplane.community.baseline.LegacyAuthorClassifier.Classification;
import com.company.project.controlplane.community.baseline.LegacyAuthorClassifier.Evidence;
import com.company.project.controlplane.community.baseline.LegacyAuthorClassifier.Outcome;
import com.company.project.controlplane.community.baseline.LegacyAuthorClassifier.SourceKind;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

class LegacyAuthorClassifierTest {

    private static Classification tenant(Set<String> roles, List<String> dir, int byUser, int byGlobal) {
        return LegacyAuthorClassifier.classify(new Evidence(SourceKind.TENANT, "gym-a", true, roles, dir, byUser, byGlobal));
    }

    private static Classification primary(String slug, Set<String> roles, List<String> dir, int byUser, int byGlobal) {
        return LegacyAuthorClassifier.classify(new Evidence(SourceKind.PRIMARY, slug, true, roles, dir, byUser, byGlobal));
    }

    @Test
    void missingUserIsUnresolved() {
        var c = LegacyAuthorClassifier.classify(
                new Evidence(SourceKind.TENANT, "gym-a", false, Set.of(), List.of(), 0, 0));
        assertEquals(Outcome.UNRESOLVED, c.outcome());
        assertNull(c.kind());
    }

    @Test
    void platformOwnerIsNeverMappedToAGymIdentity() {
        assertEquals(Outcome.PLATFORM_ACCOUNT, tenant(Set.of("GYMBIOS_ADMIN"), List.of(), 0, 0).outcome());
        assertEquals(Outcome.PLATFORM_ACCOUNT, primary("main", Set.of("GYMBIOS_ADMIN"), List.of(), 0, 0).outcome());
    }

    @Test
    void tenantStaffResolvesToSourceTenant() {
        var c = tenant(Set.of("MANAGER"), List.of(), 0, 0);
        assertEquals(Outcome.RESOLVED, c.outcome());
        assertEquals(AuthorKind.TENANT, c.kind());
        assertEquals("gym-a", c.tenantSlug());
    }

    @Test
    void tenantMemberLoginResolvesToSourceTenant() {
        var c = tenant(Set.of("MEMBER"), List.of("gym-a"), 1, 0);
        assertEquals(Outcome.RESOLVED, c.outcome());
        assertEquals("gym-a", c.tenantSlug());
    }

    @Test
    void tenantUserWhoseIdMatchesAGlobalMemberIsFlaggedAsPossibleCollision() {
        // The legacy 401/wrong-author bug: global user 42 posting in gym-a would be
        // saved against gym-a's unrelated local users.id 42.
        assertEquals(Outcome.POSSIBLE_GLOBAL_ID_COLLISION, tenant(Set.of("MANAGER"), List.of(), 0, 1).outcome());
    }

    @Test
    void tenantUserLinkedToSeveralMembersIsAmbiguous() {
        assertEquals(Outcome.AMBIGUOUS, tenant(Set.of("MEMBER"), List.of(), 2, 0).outcome());
    }

    @Test
    void tenantUserMappedElsewhereByDirectoryIsAmbiguous() {
        assertEquals(Outcome.AMBIGUOUS, tenant(Set.of("MANAGER"), List.of("gym-b"), 0, 0).outcome());
    }

    @Test
    void primaryUserWithDirectoryEntryIsThatTenantsUser() {
        var c = primary("main", Set.of("MANAGER"), List.of("gym-b"), 0, 0);
        assertEquals(Outcome.RESOLVED, c.outcome());
        assertEquals(AuthorKind.TENANT, c.kind());
        assertEquals("gym-b", c.tenantSlug());
    }

    @Test
    void primaryUserInTwoDirectoryTenantsIsAmbiguous() {
        assertEquals(Outcome.AMBIGUOUS, primary("main", Set.of("MANAGER"), List.of("gym-a", "gym-b"), 0, 0).outcome());
    }

    @Test
    void primaryUserWithDirectoryEntryAndGlobalLinkIsAmbiguous() {
        assertEquals(Outcome.AMBIGUOUS, primary("main", Set.of("MEMBER"), List.of("gym-a"), 0, 1).outcome());
    }

    @Test
    void primaryGlobalMemberResolvesToGlobal() {
        var c = primary("main", Set.of("MEMBER"), List.of(), 0, 1);
        assertEquals(Outcome.RESOLVED, c.outcome());
        assertEquals(AuthorKind.GLOBAL, c.kind());
        assertNull(c.tenantSlug());
    }

    @Test
    void primaryAccountLinkedBothWaysIsAmbiguous() {
        assertEquals(Outcome.AMBIGUOUS, primary("main", Set.of("MEMBER"), List.of(), 1, 1).outcome());
    }

    @Test
    void primaryGymCreatedMemberLoginIsAmbiguousBecauseAuthTreatsItAsGlobal() {
        assertEquals(Outcome.AMBIGUOUS, primary("main", Set.of("MEMBER"), List.of(), 1, 0).outcome());
    }

    @Test
    void primaryMemberRoleWithoutAnyLinkIsAmbiguous() {
        assertEquals(Outcome.AMBIGUOUS, primary("main", Set.of("MEMBER"), List.of(), 0, 0).outcome());
    }

    @Test
    void primaryAccountWithNoRolesIsAmbiguous() {
        assertEquals(Outcome.AMBIGUOUS, primary("main", Set.of(), List.of(), 0, 0).outcome());
    }

    @Test
    void primaryStaffResolvesToPrimaryGym() {
        var c = primary("main", Set.of("MANAGER"), List.of(), 0, 0);
        assertEquals(Outcome.RESOLVED, c.outcome());
        assertEquals(AuthorKind.TENANT, c.kind());
        assertEquals("main", c.tenantSlug());
    }

    @Test
    void primaryStaffWithUndeterminedGymIsAmbiguous() {
        assertEquals(Outcome.AMBIGUOUS, primary(null, Set.of("MANAGER"), List.of(), 0, 0).outcome());
    }

    @Test
    void proposedGlobalIdStartIsFarAboveLegacyMaximum() {
        assertEquals(1_000_000_000L, CommunityBaselineService.proposedStart(null));
        assertEquals(1_000_000_000L, CommunityBaselineService.proposedStart(8L));
        assertEquals(10_000_000_000L, CommunityBaselineService.proposedStart(5_000_000L));
    }
}
