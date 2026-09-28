package com.company.project.controlplane.community.baseline;

import com.company.project.config.TenantDataSourceRegistry;
import com.company.project.controlplane.community.baseline.CommunityBaselineReport.Anomaly;
import com.company.project.controlplane.community.baseline.CommunityBaselineReport.AuthorEntry;
import com.company.project.controlplane.community.baseline.CommunityBaselineReport.Classification;
import com.company.project.controlplane.community.baseline.CommunityBaselineReport.SourceReport;
import com.company.project.controlplane.community.baseline.CommunityBaselineReport.TenantEntry;
import com.company.project.controlplane.community.baseline.LegacyAuthorClassifier.Evidence;
import com.company.project.controlplane.community.baseline.LegacyAuthorClassifier.Outcome;
import com.company.project.controlplane.community.baseline.LegacyAuthorClassifier.SourceKind;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.CommentRow;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.LikeRow;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.PostRow;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.Snapshot;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.UserRow;
import com.company.project.controlplane.entities.Tenant;
import com.company.project.controlplane.repositories.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.function.Function;

/**
 * Phase 0 of the Global Community migration: a strictly read-only baseline of
 * every legacy Community store. It never writes to any database; see
 * {@link LegacyCommunitySnapshotReader} for how reads are isolated.
 *
 * Produces deterministic counts, checksums, identity classifications and a
 * complete anomaly list in which every record that could not be migrated
 * cleanly is classified RESOLVED / APPROVED_EXCLUSION / QUARANTINED — nothing
 * is silently skipped. APPROVED_EXCLUSION is never assigned automatically; it
 * requires a human decision recorded in a later phase.
 */
@Service
public class CommunityBaselineService {

    private static final Logger log = LoggerFactory.getLogger(CommunityBaselineService.class);

    static final int REPORT_VERSION = 1;
    static final String PRIMARY_SOURCE = "primary";
    private static final long MIN_GLOBAL_ID_START = 1_000_000_000L;

    private static final String POSTS = "community_posts";
    private static final String COMMENTS = "community_post_comments";
    private static final String LIKES = "community_post_likes";

    private final DataSource primaryDataSource;
    private final DataSource controlPlaneDataSource;
    private final TenantRepository tenantRepository;
    private final TenantDataSourceRegistry tenantDataSourceRegistry;
    private final LegacyCommunitySnapshotReader snapshotReader;

    @Value("${tenant.routing.enabled:false}")
    private boolean tenantRoutingEnabled;

    public CommunityBaselineService(@Qualifier("primaryDataSource") DataSource primaryDataSource,
                                    @Qualifier("controlPlaneDataSource") DataSource controlPlaneDataSource,
                                    TenantRepository tenantRepository,
                                    TenantDataSourceRegistry tenantDataSourceRegistry,
                                    LegacyCommunitySnapshotReader snapshotReader) {
        this.primaryDataSource = primaryDataSource;
        this.controlPlaneDataSource = controlPlaneDataSource;
        this.tenantRepository = tenantRepository;
        this.tenantDataSourceRegistry = tenantDataSourceRegistry;
        this.snapshotReader = snapshotReader;
    }

    /** One legacy store plus the bookkeeping the analysis accumulates for it. */
    private static final class Source {
        final String name;
        final SourceKind kind;
        final String tenantSlug;
        final SourceReport report = new SourceReport();
        Snapshot snapshot;
        final Set<Long> quarantinedPosts = new TreeSet<>();
        final Set<Long> quarantinedComments = new TreeSet<>();
        final Set<Long> quarantinedLikes = new TreeSet<>();
        final Set<Long> supersededPosts = new TreeSet<>();
        final Set<Long> supersededComments = new TreeSet<>();
        final Set<Long> supersededLikes = new TreeSet<>();
        /** post id -> tenant slug the post is attributed to (null = undetermined). */
        final Map<Long, String> postTenant = new HashMap<>();

        Source(String name, SourceKind kind, String tenantSlug) {
            this.name = name;
            this.kind = kind;
            this.tenantSlug = tenantSlug;
        }

        boolean usable() {
            return snapshot != null && snapshot.hasCommunityTables;
        }

        Set<Long> quarantined(String table) {
            return switch (table) {
                case POSTS -> quarantinedPosts;
                case COMMENTS -> quarantinedComments;
                default -> quarantinedLikes;
            };
        }
    }

    public CommunityBaselineReport run() {
        CommunityBaselineReport report = new CommunityBaselineReport();
        report.reportVersion = REPORT_VERSION;
        report.generatedAt = Instant.now().toString();
        report.tenantRoutingEnabled = tenantRoutingEnabled;

        List<Tenant> tenants = new ArrayList<>(tenantRepository.findAll());
        tenants.sort(Comparator.comparing(Tenant::getSlug));
        Map<String, Tenant> tenantsBySlug = new LinkedHashMap<>();
        tenants.forEach(t -> tenantsBySlug.put(t.getSlug(), t));

        List<Source> sources = new ArrayList<>();
        Source primary = new Source(PRIMARY_SOURCE, SourceKind.PRIMARY, null);
        sources.add(primary);
        readSource(report, primary, primaryDataSource);

        Map<String, Source> tenantSources = new TreeMap<>();
        for (Tenant tenant : tenants) {
            TenantEntry entry = new TenantEntry();
            entry.slug = tenant.getSlug();
            entry.status = tenant.getStatus();
            entry.hasConnection = tenantDataSourceRegistry.hasConnection(tenant.getSlug());
            entry.slugHasSurroundingOrInnerWhitespace = tenant.getSlug().chars().anyMatch(Character::isWhitespace);
            report.tenants.add(entry);
            if (!entry.hasConnection) {
                continue;
            }
            Source source = new Source("tenant:" + tenant.getSlug(), SourceKind.TENANT, tenant.getSlug());
            sources.add(source);
            tenantSources.put(tenant.getSlug(), source);
            try {
                readSource(report, source, tenantDataSourceRegistry.getDataSource(tenant.getSlug()));
            } catch (RuntimeException e) {
                markUnreachable(report, source, e);
            }
        }

        Map<String, List<String>> directoryCache = new HashMap<>();
        Map<String, AuthorEntry> authors = new TreeMap<>();

        for (Source source : sources) {
            if (!source.usable()) {
                continue;
            }
            attributeTenants(report, source, tenantsBySlug);
            if (source.kind == SourceKind.PRIMARY) {
                detectStalePrimaryCopies(report, source, tenantSources, tenantsBySlug);
            } else {
                checkTenantSource(report, source, tenantsBySlug.get(source.tenantSlug));
            }
            checkRecords(report, source);
            classifyAuthors(report, source, directoryCache, authors);
            propagateParentQuarantine(report, source);
        }

        for (Source source : sources) {
            summarizeSource(source);
            report.sources.add(source.report);
        }
        report.authors.addAll(authors.values());
        summarizeIdentity(report, sources);
        computeIdCeilings(report, sources);
        summarizeAnomalies(report);
        report.digest = digest(report);

        log.info("Community baseline complete: sources={}, anomalies={}, quarantinedRecords={}, digest={}",
                report.sources.size(), report.anomalies.size(), report.identity.quarantinedRecords, report.digest);
        return report;
    }

    // ── Reading ──────────────────────────────────────────────────────────────

    private void readSource(CommunityBaselineReport report, Source source, DataSource dataSource) {
        SourceReport sr = source.report;
        sr.source = source.name;
        sr.kind = source.kind.name();
        sr.tenantSlug = source.tenantSlug;
        try {
            Snapshot snap = snapshotReader.read(dataSource);
            source.snapshot = snap;
            sr.reachable = true;
            sr.database = snap.database;
            sr.hasCommunityTables = snap.hasCommunityTables;
            sr.imageColumnType = snap.imageColumnType;
            sr.imageDigestAvailable = snap.imageDigestAvailable;
            sr.branchesHaveGymId = snap.branchesHaveGymId;
            sr.communityModuleStatus = snap.communityModuleStatus;
            snap.gyms.values().forEach(g -> sr.gyms.add(g.id() + ":" + g.slug() + ":" + g.status()));
            if (!snap.hasCommunityTables) {
                addAnomaly(report, source, "MISSING_COMMUNITY_TABLES", Classification.RESOLVED, null, null,
                        "Source has no legacy Community tables", "Nothing to migrate from this source");
            } else if (!snap.imageDigestAvailable) {
                addAnomaly(report, source, "IMAGE_DIGEST_UNAVAILABLE", Classification.QUARANTINED, null, null,
                        "lo_get() is not permitted for this connection, so image content cannot be checksummed",
                        "Grant SELECT on the large objects to the baseline connection and re-run");
            }
        } catch (LegacyCommunitySnapshotReader.SchemaDriftException e) {
            sr.reachable = true;
            sr.error = e.getMessage();
            addAnomaly(report, source, "SCHEMA_DRIFT", Classification.QUARANTINED, null, null, e.getMessage(),
                    "Source cannot be baselined or migrated until its schema is reconciled");
        } catch (SQLException | RuntimeException e) {
            markUnreachable(report, source, e);
        }
    }

    private void markUnreachable(CommunityBaselineReport report, Source source, Exception e) {
        source.report.reachable = false;
        source.report.error = e.getClass().getSimpleName() + ": " + e.getMessage();
        addAnomaly(report, source, "SOURCE_UNREACHABLE", Classification.QUARANTINED, null, null,
                source.report.error, "All Community data in this source is unaccounted for until it can be read");
    }

    // ── Gym / tenant attribution ─────────────────────────────────────────────

    /**
     * Tenant sources: every record belongs to the control-plane tenant slug —
     * that is what JWT tenant claims carry, regardless of gyms.slug inside the DB.
     * Primary: branch -> gym -> gyms.slug when branches.gym_id exists; otherwise
     * only when the primary DB holds exactly one gym. Never inferred beyond that.
     */
    private void attributeTenants(CommunityBaselineReport report, Source source, Map<String, Tenant> tenantsBySlug) {
        Snapshot snap = source.snapshot;
        if (source.kind == SourceKind.TENANT) {
            snap.posts.keySet().forEach(id -> source.postTenant.put(id, source.tenantSlug));
            return;
        }

        String singleGymSlug = snap.gyms.size() == 1 ? snap.gyms.firstEntry().getValue().slug() : null;
        Map<String, long[]> recordsPerGym = new TreeMap<>();
        for (PostRow post : snap.posts.values()) {
            String gymSlug = null;
            if (snap.branchesHaveGymId && post.branchId() != null && snap.branchGym.containsKey(post.branchId())) {
                Long gymId = snap.branchGym.get(post.branchId());
                var gym = gymId == null ? null : snap.gyms.get(gymId);
                gymSlug = gym == null ? null : gym.slug();
            }
            if (gymSlug == null) {
                gymSlug = singleGymSlug;
            }
            source.postTenant.put(post.id(), gymSlug);
            if (gymSlug == null) {
                addAnomaly(report, source, "PRIMARY_GYM_UNDETERMINED", Classification.QUARANTINED, POSTS, post.id(),
                        "Primary DB holds " + snap.gyms.size() + " gyms and the post's branch does not identify one",
                        "Manual gym assignment required");
            } else {
                recordsPerGym.computeIfAbsent(gymSlug, k -> new long[1])[0]++;
            }
        }

        for (Map.Entry<String, long[]> e : recordsPerGym.entrySet()) {
            if (!tenantsBySlug.containsKey(e.getKey())) {
                Set<Long> affected = postsAttributedTo(source, e.getKey());
                quarantineByReference(source, affected);
                addAnomaly(report, source, "PRIMARY_GYM_NOT_REGISTERED_AS_TENANT", Classification.QUARANTINED, "gyms", null,
                        "Primary gym '" + e.getKey() + "' has no control-plane tenants row; affects "
                                + describeAffected(source, affected),
                        "Register the gym in the control plane (or approve an unregistered-slug attribution) before migration");
            }
        }
    }

    private void checkTenantSource(CommunityBaselineReport report, Source source, Tenant tenant) {
        Snapshot snap = source.snapshot;
        Set<Long> allPosts = new TreeSet<>(snap.posts.keySet());
        boolean hasData = !snap.posts.isEmpty() || !snap.comments.isEmpty() || !snap.likes.isEmpty();

        if (source.tenantSlug.chars().anyMatch(Character::isWhitespace)) {
            if (hasData) {
                quarantineByReference(source, allPosts);
            }
            addAnomaly(report, source, "TENANT_SLUG_WHITESPACE",
                    hasData ? Classification.QUARANTINED : Classification.RESOLVED, "tenants", tenant.getId(),
                    "Tenant slug '" + source.tenantSlug + "' contains whitespace",
                    hasData ? "Normalize the slug before migration; attribution would depend on exact whitespace"
                            : "No Community data; flag for control-plane slug cleanup");
        }
        if (!"ACTIVE".equals(tenant.getStatus())) {
            if (hasData) {
                quarantineByReference(source, allPosts);
            }
            addAnomaly(report, source, "TENANT_NOT_ACTIVE",
                    hasData ? Classification.QUARANTINED : Classification.RESOLVED, "tenants", tenant.getId(),
                    "Tenant status is " + tenant.getStatus() + " but it has a database connection",
                    hasData ? "Decide whether this tenant's Community data should be migrated"
                            : "No Community data to migrate");
        }
        if (snap.gyms.size() != 1) {
            if (hasData) {
                quarantineByReference(source, allPosts);
            }
            addAnomaly(report, source, "TENANT_GYM_COUNT_UNEXPECTED",
                    hasData ? Classification.QUARANTINED : Classification.RESOLVED, "gyms", null,
                    "Tenant database holds " + snap.gyms.size() + " gyms rows (expected exactly 1)",
                    hasData ? "Confirm which gym owns this data" : "No Community data to migrate");
        } else {
            String gymSlug = snap.gyms.firstEntry().getValue().slug();
            if (!source.tenantSlug.equals(gymSlug)) {
                addAnomaly(report, source, "TENANT_GYM_SLUG_DIFFERS", Classification.RESOLVED, "gyms",
                        snap.gyms.firstKey(),
                        "gyms.slug is '" + gymSlug + "' but the control-plane tenant slug is '" + source.tenantSlug + "'",
                        "Attribution uses the control-plane tenant slug (what JWT tenant claims carry), never gyms.slug");
            }
        }
    }

    // ── Stale primary copies ─────────────────────────────────────────────────

    /**
     * For every primary record attributed to a tenant that has its own database,
     * the tenant database is authoritative. Rows copied by the tenant data
     * migration keep their IDs, so a primary row is compared to the tenant row
     * with the same ID on immutable fields only (likes/comments/archived may
     * legitimately have changed in the tenant after the copy).
     */
    private void detectStalePrimaryCopies(CommunityBaselineReport report, Source primary,
                                          Map<String, Source> tenantSources, Map<String, Tenant> tenantsBySlug) {
        Snapshot snap = primary.snapshot;
        for (PostRow post : snap.posts.values()) {
            String slug = primary.postTenant.get(post.id());
            Source tenant = slug == null ? null : tenantSources.get(slug);
            if (tenant == null) {
                continue;
            }
            if (!tenant.usable()) {
                primary.quarantinedPosts.add(post.id());
                addAnomaly(report, primary, "STALE_CHECK_IMPOSSIBLE", Classification.QUARANTINED, POSTS, post.id(),
                        "Post belongs to migrated tenant '" + slug + "' whose database could not be read",
                        "Re-run once the tenant database is reachable");
                continue;
            }
            PostRow copy = tenant.snapshot.posts.get(post.id());
            classifyStale(report, primary, POSTS, post.id(), slug,
                    copy == null ? null : copy.immutableFingerprint(), post.immutableFingerprint(),
                    primary.supersededPosts);
        }
        for (CommentRow comment : snap.comments.values()) {
            String slug = comment.postId() == null ? null : primary.postTenant.get(comment.postId());
            Source tenant = slug == null ? null : tenantSources.get(slug);
            if (tenant == null || !tenant.usable()) {
                continue;
            }
            CommentRow copy = tenant.snapshot.comments.get(comment.id());
            classifyStale(report, primary, COMMENTS, comment.id(), slug,
                    copy == null ? null : copy.immutableFingerprint(), comment.immutableFingerprint(),
                    primary.supersededComments);
        }
        for (LikeRow like : snap.likes.values()) {
            String slug = like.postId() == null ? null : primary.postTenant.get(like.postId());
            Source tenant = slug == null ? null : tenantSources.get(slug);
            if (tenant == null || !tenant.usable()) {
                continue;
            }
            LikeRow copy = tenant.snapshot.likes.get(like.id());
            classifyStale(report, primary, LIKES, like.id(), slug,
                    copy == null ? null : copy.immutableFingerprint(), like.immutableFingerprint(),
                    primary.supersededLikes);
        }
    }

    private void classifyStale(CommunityBaselineReport report, Source primary, String table, long id, String slug,
                               String tenantFingerprint, String primaryFingerprint, Set<Long> superseded) {
        if (tenantFingerprint == null) {
            primary.quarantined(table).add(id);
            addAnomaly(report, primary, "PRIMARY_ONLY_FOR_MIGRATED_TENANT", Classification.QUARANTINED, table, id,
                    "Row exists in the primary DB for migrated tenant '" + slug + "' but not in the tenant DB "
                            + "(never copied, or deleted in the tenant after migration)",
                    "Manual review; the tenant DB is authoritative, so this row is not copied automatically");
        } else if (tenantFingerprint.equals(primaryFingerprint)) {
            superseded.add(id);
            addAnomaly(report, primary, "STALE_PRIMARY_COPY_SUPERSEDED", Classification.RESOLVED, table, id,
                    "Identical immutable fields exist in tenant '" + slug + "' under the same ID",
                    "Excluded: the tenant DB copy is authoritative");
        } else {
            primary.quarantined(table).add(id);
            addAnomaly(report, primary, "STALE_PRIMARY_COPY_DIVERGED", Classification.QUARANTINED, table, id,
                    "Tenant '" + slug + "' has a row with the same ID but different immutable fields",
                    "Manual review; IDs may refer to different records");
        }
    }

    // ── Record-level checks ──────────────────────────────────────────────────

    private void checkRecords(CommunityBaselineReport report, Source source) {
        Snapshot snap = source.snapshot;
        Map<Long, Long> actualLikes = new HashMap<>();
        Map<Long, Long> actualComments = new HashMap<>();
        Map<String, Long> likePairs = new HashMap<>();

        for (LikeRow like : snap.likes.values()) {
            if (source.supersededLikes.contains(like.id())) {
                continue;
            }
            if (like.postId() == null || !snap.posts.containsKey(like.postId())) {
                source.quarantinedLikes.add(like.id());
                addAnomaly(report, source, "ORPHAN_LIKE", Classification.QUARANTINED, LIKES, like.id(),
                        "Like references missing post " + like.postId(), "Manual review");
                continue;
            }
            actualLikes.merge(like.postId(), 1L, Long::sum);
            likePairs.merge(like.postId() + ":" + like.userId(), 1L, Long::sum);
        }
        for (LikeRow like : snap.likes.values()) {
            if (like.postId() != null && likePairs.getOrDefault(like.postId() + ":" + like.userId(), 0L) > 1) {
                source.quarantinedLikes.add(like.id());
                addAnomaly(report, source, "DUPLICATE_LIKE", Classification.QUARANTINED, LIKES, like.id(),
                        "More than one like for post " + like.postId() + " by the same user", "Manual review");
            }
        }

        for (CommentRow comment : snap.comments.values()) {
            if (source.supersededComments.contains(comment.id())) {
                continue;
            }
            if (comment.postId() == null || !snap.posts.containsKey(comment.postId())) {
                source.quarantinedComments.add(comment.id());
                addAnomaly(report, source, "ORPHAN_COMMENT", Classification.QUARANTINED, COMMENTS, comment.id(),
                        "Comment references missing post " + comment.postId(), "Manual review");
                continue;
            }
            actualComments.merge(comment.postId(), 1L, Long::sum);
        }

        for (PostRow post : snap.posts.values()) {
            if (source.supersededPosts.contains(post.id())) {
                continue;
            }
            if (post.branchId() == null) {
                source.quarantinedPosts.add(post.id());
                addAnomaly(report, source, "NULL_BRANCH", Classification.QUARANTINED, POSTS, post.id(),
                        "Post has no branch_id (invisible to branch-scoped legacy readers)",
                        "Decide branch attribution (or approve a gym-level, branch-less migration)");
            } else if (!snap.branchGym.containsKey(post.branchId())) {
                source.quarantinedPosts.add(post.id());
                addAnomaly(report, source, "UNKNOWN_BRANCH", Classification.QUARANTINED, POSTS, post.id(),
                        "Post references branch " + post.branchId() + " which does not exist", "Manual review");
            }
            if (post.imageRef() != null && !post.imagePresent()) {
                source.quarantinedPosts.add(post.id());
                addAnomaly(report, source, "IMAGE_LARGE_OBJECT_MISSING", Classification.QUARANTINED, POSTS, post.id(),
                        "image_data_url references large object " + post.imageRef() + " which does not exist in this database",
                        "Recover the image from the source it was copied from, or approve migrating the post without it");
            }
            if (post.archived() == null) {
                addAnomaly(report, source, "ARCHIVED_NULL", Classification.RESOLVED, POSTS, post.id(),
                        "archived is NULL", "Treated as not archived, matching legacy feed semantics");
            }
            long likes = actualLikes.getOrDefault(post.id(), 0L);
            if (likes != post.likeCount()) {
                source.report.incorrectLikeCounts++;
                addAnomaly(report, source, "LIKE_COUNT_MISMATCH", Classification.RESOLVED, POSTS, post.id(),
                        "Stored like_count " + post.likeCount() + ", actual likes " + likes,
                        "Recompute from source rows during migration");
            }
            long comments = actualComments.getOrDefault(post.id(), 0L);
            if (comments != post.commentCount()) {
                source.report.incorrectCommentCounts++;
                addAnomaly(report, source, "COMMENT_COUNT_MISMATCH", Classification.RESOLVED, POSTS, post.id(),
                        "Stored comment_count " + post.commentCount() + ", actual comments " + comments,
                        "Recompute from source rows during migration");
            }
        }
    }

    // ── Identity ─────────────────────────────────────────────────────────────

    private void classifyAuthors(CommunityBaselineReport report, Source source,
                                 Map<String, List<String>> directoryCache, Map<String, AuthorEntry> authors) {
        Snapshot snap = source.snapshot;
        for (PostRow post : snap.posts.values()) {
            if (!source.supersededPosts.contains(post.id())) {
                classifyRecord(report, source, POSTS, post.id(), post.authorUserId(),
                        source.postTenant.get(post.id()), directoryCache, authors, e -> e.posts++);
            }
        }
        for (CommentRow comment : snap.comments.values()) {
            if (!source.supersededComments.contains(comment.id())) {
                classifyRecord(report, source, COMMENTS, comment.id(), comment.authorUserId(),
                        comment.postId() == null ? null : source.postTenant.get(comment.postId()),
                        directoryCache, authors, e -> e.comments++);
            }
        }
        for (LikeRow like : snap.likes.values()) {
            if (!source.supersededLikes.contains(like.id())) {
                classifyRecord(report, source, LIKES, like.id(), like.userId(),
                        like.postId() == null ? null : source.postTenant.get(like.postId()),
                        directoryCache, authors, e -> e.likes++);
            }
        }
    }

    private void classifyRecord(CommunityBaselineReport report, Source source, String table, long recordId,
                                Long userId, String attributedSlug, Map<String, List<String>> directoryCache,
                                Map<String, AuthorEntry> authors, java.util.function.Consumer<AuthorEntry> count) {
        if (userId == null) {
            source.quarantined(table).add(recordId);
            addAnomaly(report, source, "AUTHOR_UNRESOLVED", Classification.QUARANTINED, table, recordId,
                    "Record has no author user id", "Manual resolution required");
            return;
        }
        Snapshot snap = source.snapshot;
        UserRow user = snap.users.get(userId);
        // users.id is only meaningful within its own database, so cache per source.
        String cacheKey = source.name + "|" + userId;
        List<String> directory = user == null ? List.of()
                : directoryCache.computeIfAbsent(cacheKey, k -> lookupDirectory(user));

        Evidence evidence = new Evidence(
                source.kind,
                attributedSlug,
                user != null,
                user == null ? Set.of() : user.roles(),
                directory,
                snap.membersByUserId.getOrDefault(userId, 0),
                snap.membersByGlobalUserId.getOrDefault(userId, 0));
        LegacyAuthorClassifier.Classification result = LegacyAuthorClassifier.classify(evidence);

        String authorKey = cacheKey + "|" + Objects.toString(attributedSlug, "");
        AuthorEntry entry = authors.computeIfAbsent(authorKey, k -> {
            AuthorEntry a = new AuthorEntry();
            a.source = source.name;
            a.userId = userId;
            a.attributedTenantSlug = attributedSlug;
            a.outcome = result.outcome().name();
            a.kind = result.kind() == null ? null : result.kind().name();
            a.resolvedTenantSlug = result.tenantSlug();
            a.reason = result.reason();
            a.roles.addAll(evidence.roles());
            a.directoryEntries = evidence.directoryTenantSlugs().size();
            a.membersByUserId = evidence.membersByUserId();
            a.membersByGlobalUserId = evidence.membersByGlobalUserId();
            return a;
        });
        count.accept(entry);

        if (result.outcome() != Outcome.RESOLVED) {
            source.quarantined(table).add(recordId);
            addAnomaly(report, source, "AUTHOR_" + result.outcome().name(), Classification.QUARANTINED, table, recordId,
                    "users.id " + userId + ": " + result.reason(), "Manual identity resolution required; never guessed");
        }
    }

    private List<String> lookupDirectory(UserRow user) {
        String email = user.email() == null ? user.username() : user.email();
        List<String> slugs = new ArrayList<>();
        try (Connection c = controlPlaneDataSource.getConnection();
             PreparedStatement ps = c.prepareStatement(
                     "SELECT DISTINCT tenant_slug FROM user_directory WHERE username = ? OR email = ? ORDER BY 1")) {
            c.setReadOnly(true);
            ps.setString(1, user.username());
            ps.setString(2, email);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    slugs.add(rs.getString(1));
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("user_directory lookup failed", e);
        }
        return slugs;
    }

    /** Comments/likes can only migrate if their post does. */
    private void propagateParentQuarantine(CommunityBaselineReport report, Source source) {
        Snapshot snap = source.snapshot;
        for (CommentRow comment : snap.comments.values()) {
            if (comment.postId() != null && source.quarantinedPosts.contains(comment.postId())
                    && !source.supersededComments.contains(comment.id())
                    && source.quarantinedComments.add(comment.id())) {
                addAnomaly(report, source, "PARENT_POST_QUARANTINED", Classification.QUARANTINED, COMMENTS, comment.id(),
                        "Parent post " + comment.postId() + " is quarantined", "Resolved together with the parent post");
            }
        }
        for (LikeRow like : snap.likes.values()) {
            if (like.postId() != null && source.quarantinedPosts.contains(like.postId())
                    && !source.supersededLikes.contains(like.id())
                    && source.quarantinedLikes.add(like.id())) {
                addAnomaly(report, source, "PARENT_POST_QUARANTINED", Classification.QUARANTINED, LIKES, like.id(),
                        "Parent post " + like.postId() + " is quarantined", "Resolved together with the parent post");
            }
        }
    }

    // ── Summaries ────────────────────────────────────────────────────────────

    private void summarizeSource(Source source) {
        SourceReport sr = source.report;
        Snapshot snap = source.snapshot;
        if (snap == null || !snap.hasCommunityTables) {
            return;
        }
        sr.posts = snap.posts.size();
        sr.comments = snap.comments.size();
        sr.likes = snap.likes.size();
        for (PostRow p : snap.posts.values()) {
            if (Boolean.TRUE.equals(p.archived())) {
                sr.archivedPosts++;
            } else {
                sr.activePosts++;
            }
            if (p.archived() == null) {
                sr.postsWithNullArchived++;
            }
            if (p.imageRef() != null) {
                sr.postsWithImage++;
                if (!p.imagePresent()) {
                    sr.postsWithMissingImageObject++;
                }
            }
            sr.postsByBranch.merge(branchKey(snap, p.branchId()), 1L, Long::sum);
        }
        for (CommentRow c : snap.comments.values()) {
            PostRow p = c.postId() == null ? null : snap.posts.get(c.postId());
            sr.commentsByBranch.merge(p == null ? "ORPHAN" : branchKey(snap, p.branchId()), 1L, Long::sum);
        }
        for (LikeRow l : snap.likes.values()) {
            PostRow p = l.postId() == null ? null : snap.posts.get(l.postId());
            sr.likesByBranch.merge(p == null ? "ORPHAN" : branchKey(snap, p.branchId()), 1L, Long::sum);
        }
        sr.maxPostId = snap.posts.isEmpty() ? null : snap.posts.lastKey();
        sr.maxCommentId = snap.comments.isEmpty() ? null : snap.comments.lastKey();
        sr.maxLikeId = snap.likes.isEmpty() ? null : snap.likes.lastKey();

        sr.checksums.put(POSTS, checksum(snap.posts.values(), p -> String.join("|",
                String.valueOf(p.id()), s(p.authorUserId()), s(p.branchId()), s(p.archived()),
                String.valueOf(p.likeCount()), String.valueOf(p.commentCount()), p.createdAt(),
                p.topicMd5(), p.contentMd5(), p.metaMd5(), imageToken(p))));
        sr.checksums.put(COMMENTS, checksum(snap.comments.values(), c -> String.join("|",
                String.valueOf(c.id()), s(c.postId()), s(c.authorUserId()), c.createdAt(), c.contentMd5())));
        sr.checksums.put(LIKES, checksum(snap.likes.values(), l -> String.join("|",
                String.valueOf(l.id()), s(l.postId()), s(l.userId()), l.createdAt())));

        var scope = sr.migrationScope;
        scope.postsSupersededByTenantDatabase = source.supersededPosts.size();
        scope.postsQuarantined = source.quarantinedPosts.size();
        scope.postsMigratable = sr.posts - scope.postsSupersededByTenantDatabase - scope.postsQuarantined;
        scope.commentsSupersededByTenantDatabase = source.supersededComments.size();
        scope.commentsQuarantined = source.quarantinedComments.size();
        scope.commentsMigratable = sr.comments - scope.commentsSupersededByTenantDatabase - scope.commentsQuarantined;
        scope.likesSupersededByTenantDatabase = source.supersededLikes.size();
        scope.likesQuarantined = source.quarantinedLikes.size();
        scope.likesMigratable = sr.likes - scope.likesSupersededByTenantDatabase - scope.likesQuarantined;
    }

    private void summarizeIdentity(CommunityBaselineReport report, List<Source> sources) {
        var id = report.identity;
        for (AuthorEntry a : report.authors) {
            id.totalAuthors++;
            switch (Outcome.valueOf(a.outcome)) {
                case RESOLVED -> {
                    if ("GLOBAL".equals(a.kind)) id.globalAuthors++;
                    else id.tenantAuthors++;
                }
                case AMBIGUOUS -> id.ambiguousAuthors++;
                case UNRESOLVED -> id.unresolvedAuthors++;
                case PLATFORM_ACCOUNT -> id.platformAccountAuthors++;
                case POSSIBLE_GLOBAL_ID_COLLISION -> id.possibleGlobalIdCollisionAuthors++;
            }
        }
        for (Source s : sources) {
            id.quarantinedRecords += s.quarantinedPosts.size() + s.quarantinedComments.size() + s.quarantinedLikes.size();
        }
    }

    /**
     * Defense in depth only: the adapter resolves legacy IDs through the explicit
     * legacy mapping table, never by numeric range. Starting global sequences far
     * above every legacy ID just guarantees the two ranges can't collide during
     * the transition even if a caller mixes them up.
     */
    private void computeIdCeilings(CommunityBaselineReport report, List<Source> sources) {
        var c = report.idCeilings;
        for (Source s : sources) {
            c.maxPostId = max(c.maxPostId, s.report.maxPostId);
            c.maxCommentId = max(c.maxCommentId, s.report.maxCommentId);
            c.maxLikeId = max(c.maxLikeId, s.report.maxLikeId);
        }
        c.proposedPostIdStart = proposedStart(c.maxPostId);
        c.proposedCommentIdStart = proposedStart(c.maxCommentId);
        c.proposedLikeIdStart = proposedStart(c.maxLikeId);
        c.note = "Proposed starts are max(1e9, next power of ten >= 1000 x current maximum). They are a "
                + "defense-in-depth separation only; legacy IDs are resolved exclusively through the legacy "
                + "mapping table, and the new API never accepts legacy IDs.";
    }

    static long proposedStart(Long max) {
        if (max == null) {
            return MIN_GLOBAL_ID_START;
        }
        long target = Math.multiplyExact(Math.max(max, 1L), 1000L);
        long start = 1;
        while (start < target) {
            start = Math.multiplyExact(start, 10L);
        }
        return Math.max(start, MIN_GLOBAL_ID_START);
    }

    private void summarizeAnomalies(CommunityBaselineReport report) {
        report.anomalies.sort(Comparator.comparing((Anomaly a) -> a.source)
                .thenComparing(a -> a.code)
                .thenComparing(a -> Objects.toString(a.table, ""))
                .thenComparing(a -> a.recordId == null ? -1L : a.recordId));
        for (Anomaly a : report.anomalies) {
            report.anomalySummary
                    .computeIfAbsent(a.code, k -> new EnumMap<>(Classification.class))
                    .merge(a.classification, 1, Integer::sum);
        }
    }

    /** Hash of everything except generatedAt, so two runs over unchanged data compare equal. */
    private String digest(CommunityBaselineReport report) {
        List<String> lines = new ArrayList<>();
        for (SourceReport s : report.sources) {
            lines.add(String.join("|", "source", s.source, String.valueOf(s.reachable), s(s.error),
                    String.valueOf(s.posts), String.valueOf(s.comments), String.valueOf(s.likes),
                    s.checksums.toString()));
        }
        for (AuthorEntry a : report.authors) {
            lines.add(String.join("|", "author", a.source, String.valueOf(a.userId), s(a.attributedTenantSlug),
                    a.outcome, s(a.kind), s(a.resolvedTenantSlug)));
        }
        for (Anomaly a : report.anomalies) {
            lines.add(String.join("|", "anomaly", a.code, a.classification.name(), a.source, s(a.table),
                    s(a.recordId), a.detail));
        }
        return sha256(String.join("\n", lines));
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private void addAnomaly(CommunityBaselineReport report, Source source, String code, Classification classification,
                            String table, Long recordId, String detail, String resolution) {
        report.anomalies.add(new Anomaly(code, classification, source.name, table, recordId, detail, resolution));
    }

    private void quarantineByReference(Source source, Set<Long> posts) {
        source.quarantinedPosts.addAll(posts);
        for (CommentRow c : source.snapshot.comments.values()) {
            if (c.postId() != null && posts.contains(c.postId())) source.quarantinedComments.add(c.id());
        }
        for (LikeRow l : source.snapshot.likes.values()) {
            if (l.postId() != null && posts.contains(l.postId())) source.quarantinedLikes.add(l.id());
        }
    }

    private Set<Long> postsAttributedTo(Source source, String slug) {
        Set<Long> ids = new TreeSet<>();
        source.postTenant.forEach((id, s) -> {
            if (slug.equals(s)) ids.add(id);
        });
        return ids;
    }

    private String describeAffected(Source source, Set<Long> posts) {
        long comments = source.snapshot.comments.values().stream()
                .filter(c -> c.postId() != null && posts.contains(c.postId())).count();
        long likes = source.snapshot.likes.values().stream()
                .filter(l -> l.postId() != null && posts.contains(l.postId())).count();
        return posts.size() + " posts, " + comments + " comments, " + likes + " likes";
    }

    private static String branchKey(Snapshot snap, Long branchId) {
        if (branchId == null) return "NULL";
        return snap.branchGym.containsKey(branchId) ? String.valueOf(branchId) : "UNKNOWN:" + branchId;
    }

    private static String imageToken(PostRow p) {
        if (p.imageRef() == null) return "";
        if (!p.imagePresent()) return "missing:" + p.imageRef();
        return p.imageMd5() != null ? p.imageMd5() : "unhashed:" + p.imageRef();
    }

    private static <T> String checksum(Iterable<T> rows, Function<T, String> line) {
        MessageDigest md = sha256Digest();
        for (T row : rows) {
            md.update(line.apply(row).getBytes(StandardCharsets.UTF_8));
            md.update((byte) '\n');
        }
        return HexFormat.of().formatHex(md.digest());
    }

    private static String sha256(String value) {
        return HexFormat.of().formatHex(sha256Digest().digest(value.getBytes(StandardCharsets.UTF_8)));
    }

    private static MessageDigest sha256Digest() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Long max(Long a, Long b) {
        if (a == null) return b;
        if (b == null) return a;
        return Math.max(a, b);
    }

    private static String s(Object o) {
        return o == null ? "" : o.toString();
    }
}
