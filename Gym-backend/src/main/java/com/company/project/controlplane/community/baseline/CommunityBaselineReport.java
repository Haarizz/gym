package com.company.project.controlplane.community.baseline;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Phase 0 read-only baseline of every legacy Community store (primary DB plus
 * each tenant database). Serialized as-is by the rollout endpoint; public
 * fields keep it a plain data carrier with no behavior.
 *
 * Everything except {@link #generatedAt} is deterministic for an unchanged
 * dataset, and {@link #digest} summarizes it so two runs can be compared at a
 * glance.
 */
public class CommunityBaselineReport {

    /** Anomaly classifications required by the Phase 0 exit criteria. */
    public enum Classification { RESOLVED, APPROVED_EXCLUSION, QUARANTINED }

    public int reportVersion;
    public String generatedAt;
    public boolean readOnly = true;
    public boolean tenantRoutingEnabled;
    public String digest;

    public List<TenantEntry> tenants = new ArrayList<>();
    public List<SourceReport> sources = new ArrayList<>();
    public IdentitySummary identity = new IdentitySummary();
    public List<AuthorEntry> authors = new ArrayList<>();
    public IdCeilings idCeilings = new IdCeilings();
    public Map<String, Map<Classification, Integer>> anomalySummary = new TreeMap<>();
    public List<Anomaly> anomalies = new ArrayList<>();

    public static class TenantEntry {
        public String slug;
        public String status;
        public boolean hasConnection;
        public boolean slugHasSurroundingOrInnerWhitespace;
    }

    public static class SourceReport {
        public String source;
        public String kind;
        public String tenantSlug;
        public String database;
        public boolean reachable;
        public String error;
        public boolean hasCommunityTables;
        public String imageColumnType;
        public boolean imageDigestAvailable;
        public boolean branchesHaveGymId;
        public List<String> gyms = new ArrayList<>();
        public String communityModuleStatus;

        public long posts;
        public long activePosts;
        public long archivedPosts;
        public long postsWithNullArchived;
        public long comments;
        public long likes;
        public long postsWithImage;
        public long postsWithMissingImageObject;

        public Map<String, Long> postsByBranch = new TreeMap<>();
        public Map<String, Long> commentsByBranch = new TreeMap<>();
        public Map<String, Long> likesByBranch = new TreeMap<>();

        public long incorrectLikeCounts;
        public long incorrectCommentCounts;

        public Long maxPostId;
        public Long maxCommentId;
        public Long maxLikeId;

        public Map<String, String> checksums = new LinkedHashMap<>();
        public MigrationScope migrationScope = new MigrationScope();
    }

    /** What a backfill would do with this source's rows, given the anomalies found. */
    public static class MigrationScope {
        public long postsMigratable;
        public long postsSupersededByTenantDatabase;
        public long postsQuarantined;
        public long commentsMigratable;
        public long commentsSupersededByTenantDatabase;
        public long commentsQuarantined;
        public long likesMigratable;
        public long likesSupersededByTenantDatabase;
        public long likesQuarantined;
    }

    public static class IdentitySummary {
        public int totalAuthors;
        public int globalAuthors;
        public int tenantAuthors;
        public int ambiguousAuthors;
        public int unresolvedAuthors;
        public int platformAccountAuthors;
        public int possibleGlobalIdCollisionAuthors;
        public long quarantinedRecords;
    }

    public static class AuthorEntry {
        public String source;
        public long userId;
        public String attributedTenantSlug;
        public String outcome;
        public String kind;
        public String resolvedTenantSlug;
        public String reason;
        public List<String> roles = new ArrayList<>();
        public int directoryEntries;
        public int membersByUserId;
        public int membersByGlobalUserId;
        public long posts;
        public long comments;
        public long likes;
    }

    public static class IdCeilings {
        public Long maxPostId;
        public Long maxCommentId;
        public Long maxLikeId;
        public long proposedPostIdStart;
        public long proposedCommentIdStart;
        public long proposedLikeIdStart;
        public String note;
    }

    public static class Anomaly {
        public String code;
        public Classification classification;
        public String source;
        public String table;
        public Long recordId;
        public String detail;
        public String resolution;

        public Anomaly() {}

        public Anomaly(String code, Classification classification, String source, String table,
                       Long recordId, String detail, String resolution) {
            this.code = code;
            this.classification = classification;
            this.source = source;
            this.table = table;
            this.recordId = recordId;
            this.detail = detail;
            this.resolution = resolution;
        }
    }
}
