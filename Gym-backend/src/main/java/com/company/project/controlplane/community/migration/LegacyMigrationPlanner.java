package com.company.project.controlplane.community.migration;

import com.company.project.controlplane.community.baseline.CommunityBaselineService.Analysis;
import com.company.project.controlplane.community.baseline.CommunityBaselineService.Source;
import com.company.project.controlplane.community.baseline.LegacyAuthorClassifier;
import com.company.project.controlplane.community.baseline.LegacyAuthorClassifier.Classification;
import com.company.project.controlplane.community.baseline.LegacyAuthorClassifier.Outcome;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.CommentRow;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.LikeRow;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.PostRow;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Turns the baseline analysis plus the D1–D4 policies into one decision per
 * legacy record: MIGRATE, QUARANTINE, EXCLUDE or SUPERSEDED. Pure: the same
 * analysis and policies always give the same plan, and both the backfill and
 * the reconciliation use it, so they can't disagree about a record.
 *
 * A policy can only lift the specific quarantine code it was approved for; any
 * other anomaly on the record keeps it quarantined. Nothing is ever guessed.
 */
public final class LegacyMigrationPlanner {

    public static final String POSTS = "community_posts";
    public static final String COMMENTS = "community_post_comments";
    public static final String LIKES = "community_post_likes";

    public enum Action { MIGRATE, QUARANTINE, EXCLUDE, SUPERSEDED }

    /** The D1–D4 policy columns of community_rollout_state. */
    public record Policies(String platformAuthor, String unregisteredGym, String primaryMemberLogin, String nullBranch) {
        public static final Policies CONSERVATIVE = new Policies("QUARANTINE", "QUARANTINE", "QUARANTINE", "QUARANTINE");
    }

    /** A Community identity in exactly one space (mirrors community_authors). */
    public record Identity(String kind, Long globalUserId, String tenantSlug, Long tenantUserId, Long platformUserId) {
        static Identity global(long id) { return new Identity("GLOBAL", id, null, null, null); }
        static Identity tenant(String slug, long id) { return new Identity("TENANT", null, slug, id, null); }
        static Identity platform(long id) { return new Identity("PLATFORM", null, null, null, id); }

        public String key() {
            return switch (kind) {
                case "GLOBAL" -> "G:" + globalUserId;
                case "TENANT" -> "T:" + tenantSlug + ":" + tenantUserId;
                default -> "P:" + platformUserId;
            };
        }
    }

    public record Decision(String source, String table, long legacyId, Action action, Identity author, String gym,
                           Long branchId, Set<String> codes, String exclusionReason) {}

    public record SourcePlan(Source source, Map<Long, Decision> posts, Map<Long, Decision> comments, Map<Long, Decision> likes) {
        public Map<Long, Decision> table(String table) {
            return switch (table) {
                case POSTS -> posts;
                case COMMENTS -> comments;
                default -> likes;
            };
        }
    }

    public record Plan(List<SourcePlan> sources, String baselineDigest, Policies policies) {}

    private LegacyMigrationPlanner() {}

    /**
     * @param approvedExclusions "source|table|id" keys an operator has marked APPROVED_EXCLUSION
     */
    public static Plan plan(Analysis analysis, Policies policies, Set<String> approvedExclusions) {
        List<SourcePlan> plans = new ArrayList<>();
        for (Source source : analysis.sources()) {
            if (!source.isUsable()) {
                continue;
            }
            Map<Long, Decision> posts = new LinkedHashMap<>();
            for (PostRow p : source.snapshot().posts.values()) {
                String gym = source.attributedTenant(p.id());
                posts.put(p.id(), decide(source, POSTS, p.id(), p.authorUserId(), gym, p.branchId(), null, policies, approvedExclusions));
            }
            Map<Long, Decision> comments = new LinkedHashMap<>();
            for (CommentRow c : source.snapshot().comments.values()) {
                String gym = c.postId() == null ? null : source.attributedTenant(c.postId());
                comments.put(c.id(), decide(source, COMMENTS, c.id(), c.authorUserId(), gym, null,
                        c.postId() == null ? null : posts.get(c.postId()), policies, approvedExclusions));
            }
            Map<Long, Decision> likes = new LinkedHashMap<>();
            for (LikeRow l : source.snapshot().likes.values()) {
                String gym = l.postId() == null ? null : source.attributedTenant(l.postId());
                likes.put(l.id(), decide(source, LIKES, l.id(), l.userId(), gym, null,
                        l.postId() == null ? null : posts.get(l.postId()), policies, approvedExclusions));
            }
            plans.add(new SourcePlan(source, posts, comments, likes));
        }
        return new Plan(plans, analysis.report().digest, policies);
    }

    static Decision decide(Source source, String table, long id, Long userId, String gym, Long branchId, Decision parent,
                           Policies policies, Set<String> approvedExclusions) {
        String src = source.name();
        if (source.isSuperseded(table, id)) {
            return new Decision(src, table, id, Action.SUPERSEDED, null, gym, branchId, Set.of(), null);
        }
        if (approvedExclusions.contains(src + "|" + table + "|" + id)) {
            return new Decision(src, table, id, Action.EXCLUDE, null, gym, branchId, Set.of(), "Approved exclusion");
        }

        Set<String> codes = new TreeSet<>(source.quarantineCodes(table, id));
        codes.remove("PARENT_POST_QUARANTINED");   // re-derived from the parent's final decision below

        Identity author = null;
        Classification cls = source.authorOf(table, id);
        if (cls != null && userId != null) {
            if (cls.outcome() == Outcome.RESOLVED) {
                author = cls.kind() == LegacyAuthorClassifier.AuthorKind.GLOBAL
                        ? Identity.global(userId) : Identity.tenant(cls.tenantSlug(), userId);
            } else if (cls.outcome() == Outcome.PLATFORM_ACCOUNT) {
                switch (policies.platformAuthor()) {           // D1
                    case "MIGRATE_AS_PLATFORM" -> {
                        author = Identity.platform(userId);
                        codes.remove("AUTHOR_PLATFORM_ACCOUNT");
                    }
                    case "EXCLUDE" -> {
                        return new Decision(src, table, id, Action.EXCLUDE, null, gym, branchId, Set.of(),
                                "platform_author_policy=EXCLUDE");
                    }
                    default -> { }
                }
            } else if (cls.outcome() == Outcome.AMBIGUOUS
                    && LegacyAuthorClassifier.RULE_PRIMARY_MEMBER_LOGIN.equals(cls.rule())
                    && "TENANT".equals(policies.primaryMemberLogin()) && gym != null) {   // D3
                author = Identity.tenant(gym, userId);
                codes.remove("AUTHOR_AMBIGUOUS");
            }
        }

        if ("GYM_LEVEL".equals(policies.nullBranch())) {            // D4
            codes.remove("NULL_BRANCH");
        }
        if ("ALLOW".equals(policies.unregisteredGym())) {           // D2
            codes.remove("PRIMARY_GYM_NOT_REGISTERED_AS_TENANT");
        }

        if (parent != null) {
            if (parent.action() == Action.EXCLUDE) {
                return new Decision(src, table, id, Action.EXCLUDE, null, gym, null, Set.of(), "Parent post excluded");
            }
            if (parent.action() != Action.MIGRATE) {
                codes.add("PARENT_POST_QUARANTINED");
            }
        }
        if (author == null && codes.isEmpty()) {
            codes.add("AUTHOR_UNRESOLVED");   // defensive: a record without an identity never migrates
        }
        if (gym == null && codes.isEmpty()) {
            codes.add("PRIMARY_GYM_UNDETERMINED");
        }
        return codes.isEmpty()
                ? new Decision(src, table, id, Action.MIGRATE, author, gym, branchId, Set.of(), null)
                : new Decision(src, table, id, Action.QUARANTINE, author, gym, branchId, Set.copyOf(codes), null);
    }
}
