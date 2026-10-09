package com.company.project.controlplane.community.migration;

import com.company.project.community.global.CommunityException;
import com.company.project.community.global.identity.TenantDataSources;
import com.company.project.controlplane.community.baseline.CommunityBaselineService;
import com.company.project.controlplane.community.baseline.CommunityBaselineService.Analysis;
import com.company.project.controlplane.community.baseline.CommunityBaselineService.Source;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.CommentRow;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.LikeRow;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.PostRow;
import com.company.project.controlplane.community.migration.CommunityMigrationStore.LegacyPost;
import com.company.project.controlplane.community.migration.CommunityMigrationStore.LikeOutcome;
import com.company.project.controlplane.community.migration.LegacyContentReader.Content;
import com.company.project.controlplane.community.migration.LegacyContentReader.PostContent;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Action;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Decision;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Identity;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Plan;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Policies;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.SourcePlan;
import com.company.project.controlplane.community.store.CommunityRolloutStore;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.io.ByteArrayInputStream;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Copies legacy Community data into the global store as a read-only replica
 * (origin = LEGACY, visibility = GYM per C2) while the legacy tables remain
 * authoritative. Refuses to run once authority is GLOBAL.
 *
 * Idempotent and safe to repeat: every row is upserted by its legacy key, rows
 * that no longer exist (or are no longer migratable) are tombstoned, and
 * counters are recomputed from the replica rows. Each source is written in one
 * control-plane transaction after all of its gym-database reads, so a failure
 * rolls that source back cleanly and a rerun converges.
 *
 * Every record that isn't migrated is accounted for: quarantined (OPEN, with
 * its codes), excluded (APPROVED_EXCLUSION with the policy or operator
 * decision), superseded by the tenant's own database, or changed during the
 * run (picked up by the next run).
 */
@Service
public class LegacyCommunityBackfillService {

    private static final Logger log = LoggerFactory.getLogger(LegacyCommunityBackfillService.class);

    public record SourceSummary(String source, int postsMigrated, int commentsMigrated, int likesMigrated,
                                int quarantinedRecords, int excludedRecords, int supersededRecords,
                                int changedDuringRun, int postsTombstoned, int commentsTombstoned, int likesRemoved) {}

    public record Result(long runId, String status, String baselineDigest, List<SourceSummary> sources,
                         int openQuarantine, List<String> unreadableSources) {}

    private final CommunityBaselineService baseline;
    private final CommunityMigrationStore store;
    private final LegacyContentReader reader;
    private final CommunityRolloutStore rolloutStore;
    private final TenantDataSources tenantDataSources;
    private final ObjectMapper objectMapper;

    public LegacyCommunityBackfillService(CommunityBaselineService baseline, CommunityMigrationStore store,
                                          LegacyContentReader reader, CommunityRolloutStore rolloutStore,
                                          TenantDataSources tenantDataSources, ObjectMapper objectMapper) {
        this.baseline = baseline;
        this.store = store;
        this.reader = reader;
        this.rolloutStore = rolloutStore;
        this.tenantDataSources = tenantDataSources;
        this.objectMapper = objectMapper;
    }

    public synchronized Result run(String mode, String triggeredBy) {
        if (!"FULL".equals(mode) && !"DELTA".equals(mode)) {
            throw CommunityException.invalid("INVALID_MODE", "Backfill mode must be FULL or DELTA");
        }
        var state = rolloutStore.load();
        if (state.isGlobalAuthority()) {
            throw CommunityException.conflict("ALREADY_GLOBAL", "The legacy store is no longer authoritative; backfill is closed");
        }
        store.expireStaleRuns(2);
        if (store.anyRunning()) {
            throw CommunityException.conflict("RUN_IN_PROGRESS", "Another migration run is in progress");
        }
        long runId = store.startRun("BACKFILL", mode, triggeredBy);
        try {
            Analysis analysis = baseline.analyze();
            Policies policies = new Policies(state.platformAuthorPolicy(), state.unregisteredGymPolicy(),
                    state.primaryMemberLoginPolicy(), state.nullBranchPolicy());
            Plan plan = LegacyMigrationPlanner.plan(analysis, policies, store.approvedExclusions());

            List<SourceSummary> summaries = new ArrayList<>();
            List<String> written = new ArrayList<>();
            for (SourcePlan sp : plan.sources()) {
                summaries.add(backfillSource(sp, runId));
                written.add(sp.source().name());
            }
            store.resolveNoLongerAnomalous(written, runId);

            List<String> unreadable = analysis.sources().stream().filter(s -> !s.isUsable() && s.snapshot() == null)
                    .map(Source::name).toList();
            Result result = new Result(runId, "COMPLETED", plan.baselineDigest(), summaries, store.openQuarantineCount(), unreadable);
            store.finishRun(runId, "COMPLETED", plan.baselineDigest(), objectMapper.writeValueAsString(result));
            log.info("community migration BACKFILL run={} mode={} sources={} openQuarantine={}",
                    runId, mode, summaries.size(), result.openQuarantine());
            return result;
        } catch (Exception e) {
            store.finishRun(runId, "ERROR", null, e.getClass().getSimpleName() + ": " + e.getMessage());
            log.error("community migration BACKFILL run={} failed", runId, e);
            throw e instanceof RuntimeException re ? re : new IllegalStateException(e);
        }
    }

    private SourceSummary backfillSource(SourcePlan sp, long runId) throws Exception {
        Source source = sp.source();
        String src = source.name();
        var snap = source.snapshot();

        List<Long> postIds = ids(sp.posts(), Action.MIGRATE);
        List<Long> commentIds = ids(sp.comments(), Action.MIGRATE);
        List<Long> likeIds = ids(sp.likes(), Action.MIGRATE);
        Set<Long> userIds = new TreeSet<>();
        postIds.forEach(id -> addUser(userIds, snap.posts.get(id).authorUserId()));
        commentIds.forEach(id -> addUser(userIds, snap.comments.get(id).authorUserId()));
        likeIds.forEach(id -> addUser(userIds, snap.likes.get(id).userId()));

        // All reads from the gym database happen before the control-plane transaction.
        Content content = reader.read(source.dataSource(), snap, postIds, commentIds, likeIds, userIds);
        Map<Long, ParsedImage> images = new HashMap<>();
        Map<Long, String> imageProblems = new HashMap<>();
        for (PostContent pc : content.posts().values()) {
            if (pc.imageDataUrl() != null) {
                try {
                    images.put(pc.id(), parseLegacyImage(pc.imageDataUrl()));
                } catch (IllegalArgumentException e) {
                    imageProblems.put(pc.id(), e.getMessage());
                }
            }
        }
        Map<String, String> gymNames = new HashMap<>();
        for (Decision d : sp.posts().values()) {
            if (d.gym() != null) {
                gymNames.computeIfAbsent(d.gym(), g -> tenantDataSources.gymName(g).orElse(null));
            }
        }
        Set<Long> changedPosts = new HashSet<>(content.changedPosts());
        Set<Long> changedComments = new HashSet<>(content.changedComments());

        return store.db().inTransaction(() -> {
            Map<String, Long> authorIds = new HashMap<>();
            Map<Long, Long> postGlobalId = new LinkedHashMap<>();
            Set<Long> keepPosts = new TreeSet<>();
            Set<Long> keepComments = new TreeSet<>();
            Set<Long> keepLikes = new TreeSet<>();
            int quarantined = 0, excluded = 0, superseded = 0, changed = 0, posts = 0, comments = 0, likes = 0;
            Set<Long> blockedPosts = new HashSet<>();

            // Posts
            for (Decision d : sp.posts().values()) {
                long legacyId = d.legacyId();
                switch (d.action()) {
                    case SUPERSEDED -> superseded++;
                    case EXCLUDE -> { store.exclude(src, d.table(), legacyId, d.exclusionReason(), runId); excluded++; }
                    case QUARANTINE -> { quarantineAll(d, runId); quarantined++; blockedPosts.add(legacyId); }
                    case MIGRATE -> {
                        if (changedPosts.contains(legacyId)) {
                            keepPosts.add(legacyId);   // don't tombstone an existing copy because it changed mid-run
                            changed++;
                            blockedPosts.add(legacyId);
                            continue;
                        }
                        if (imageProblems.containsKey(legacyId)) {
                            store.quarantine(src, d.table(), legacyId, "LEGACY_IMAGE_UNREADABLE", imageProblems.get(legacyId), runId);
                            quarantined++;
                            blockedPosts.add(legacyId);
                            continue;
                        }
                        PostRow row = snap.posts.get(legacyId);
                        PostContent pc = content.posts().get(legacyId);
                        long authorId = author(authorIds, d.author(), row.authorUserId(), content);
                        boolean archived = Boolean.TRUE.equals(row.archived());
                        long globalId = store.upsertPost(new LegacyPost(authorId, d.gym(), d.branchId(),
                                memberId(d.author(), row.authorUserId(), content), gymNames.get(d.gym()),
                                d.branchId() == null ? null : content.branchNames().get(d.branchId()),
                                pc.topic(), pc.content(), pc.type() == null ? "achievement" : pc.type(), archived,
                                archived ? (pc.updatedAt() != null ? pc.updatedAt() : pc.createdAt()) : null,
                                src, legacyId, LegacyFingerprints.post(d, row), pc.createdAt()));
                        ParsedImage img = images.get(legacyId);
                        if (img != null) {
                            store.upsertImage(globalId, img.contentType(), img.data(), img.width(), img.height(),
                                    pc.imageAspectRatio(), pc.imageCropPosition(), pc.imageCropZoom(), img.sha256());
                        }
                        postGlobalId.put(legacyId, globalId);
                        keepPosts.add(legacyId);
                        posts++;
                    }
                }
            }

            // Comments
            for (Decision d : sp.comments().values()) {
                CommentRow row = snap.comments.get(d.legacyId());
                switch (d.action()) {
                    case SUPERSEDED -> superseded++;
                    case EXCLUDE -> { store.exclude(src, d.table(), d.legacyId(), d.exclusionReason(), runId); excluded++; }
                    case QUARANTINE -> { quarantineAll(d, runId); quarantined++; }
                    case MIGRATE -> {
                        if (changedComments.contains(d.legacyId()) || (row.postId() != null && blockedPosts.contains(row.postId())
                                && changedPosts.contains(row.postId()))) {
                            keepComments.add(d.legacyId());
                            changed++;
                            continue;
                        }
                        if (row.postId() == null || blockedPosts.contains(row.postId())) {
                            store.quarantine(src, d.table(), d.legacyId(), "PARENT_POST_QUARANTINED",
                                    "Parent post " + row.postId() + " was not migrated in this run", runId);
                            quarantined++;
                            continue;
                        }
                        long authorId = author(authorIds, d.author(), row.authorUserId(), content);
                        store.upsertComment(postGlobalId.get(row.postId()), authorId, d.gym(),
                                memberId(d.author(), row.authorUserId(), content),
                                content.comments().get(d.legacyId()).content(), src, d.legacyId(),
                                LegacyFingerprints.comment(d, row), content.comments().get(d.legacyId()).createdAt());
                        keepComments.add(d.legacyId());
                        comments++;
                    }
                }
            }

            // Likes
            for (Decision d : sp.likes().values()) {
                LikeRow row = snap.likes.get(d.legacyId());
                switch (d.action()) {
                    case SUPERSEDED -> superseded++;
                    case EXCLUDE -> { store.exclude(src, d.table(), d.legacyId(), d.exclusionReason(), runId); excluded++; }
                    case QUARANTINE -> { quarantineAll(d, runId); quarantined++; }
                    case MIGRATE -> {
                        if (row.postId() != null && changedPosts.contains(row.postId())) {
                            keepLikes.add(d.legacyId());
                            changed++;
                            continue;
                        }
                        if (row.postId() == null || blockedPosts.contains(row.postId()) || !content.likeCreatedAt().containsKey(d.legacyId())) {
                            store.quarantine(src, d.table(), d.legacyId(), "PARENT_POST_QUARANTINED",
                                    "Parent post " + row.postId() + " was not migrated in this run (or the like was removed)", runId);
                            quarantined++;
                            continue;
                        }
                        long authorId = author(authorIds, d.author(), row.userId(), content);
                        LikeOutcome outcome = store.upsertLike(postGlobalId.get(row.postId()), authorId, src, d.legacyId(),
                                LegacyFingerprints.like(d, row), content.likeCreatedAt().get(d.legacyId()));
                        if (outcome == LikeOutcome.IDENTITY_CONFLICT) {
                            store.quarantine(src, d.table(), d.legacyId(), "DUPLICATE_LIKE_IDENTITY",
                                    "Another legacy like maps to the same person on the same post", runId);
                            quarantined++;
                            continue;
                        }
                        keepLikes.add(d.legacyId());
                        likes++;
                    }
                }
            }

            int likesRemoved = store.removeLikes(src, keepLikes);
            int commentsTombstoned = store.tombstoneComments(src, keepComments);
            int postsTombstoned = store.tombstonePosts(src, keepPosts);
            store.recomputeCounters(src);
            return new SourceSummary(src, posts, comments, likes, quarantined, excluded, superseded, changed,
                    postsTombstoned, commentsTombstoned, likesRemoved);
        });
    }

    private void quarantineAll(Decision d, long runId) {
        for (String code : d.codes()) {
            store.quarantine(d.source(), d.table(), d.legacyId(), code, "Raised by baseline analysis (" + code + ")", runId);
        }
    }

    private long author(Map<String, Long> cache, Identity identity, Long legacyUserId, Content content) {
        return cache.computeIfAbsent(identity.key(), k -> {
            String name = "PLATFORM".equals(identity.kind()) ? "GymBios" : content.displayNames().get(legacyUserId);
            String avatar = "PLATFORM".equals(identity.kind()) ? null : content.avatarUrls().get(legacyUserId);
            return store.ensureAuthor(identity, name, avatar);
        });
    }

    private static Long memberId(Identity identity, Long legacyUserId, Content content) {
        return switch (identity.kind()) {
            case "GLOBAL" -> content.memberIdByGlobalUserId().get(legacyUserId);
            case "TENANT" -> content.memberIdByUserId().get(legacyUserId);
            default -> null;
        };
    }

    private static List<Long> ids(Map<Long, Decision> decisions, Action action) {
        List<Long> out = new ArrayList<>();
        decisions.values().forEach(d -> {
            if (d.action() == action) out.add(d.legacyId());
        });
        return out;
    }

    private static void addUser(Set<Long> users, Long id) {
        if (id != null) users.add(id);
    }

    record ParsedImage(String contentType, byte[] data, Integer width, Integer height, String sha256) {}

    /**
     * Legacy images are data URLs. Kept verbatim (no new-upload limits — C9 applies
     * to new content), but they must at least be a decodable base64 image.
     */
    static ParsedImage parseLegacyImage(String dataUrl) {
        int comma = dataUrl.indexOf(',');
        if (!dataUrl.startsWith("data:") || comma < 0) {
            throw new IllegalArgumentException("Not a data URL");
        }
        String header = dataUrl.substring(5, comma).toLowerCase(java.util.Locale.ROOT);
        if (!header.endsWith(";base64") || !header.startsWith("image/")) {
            throw new IllegalArgumentException("Not a base64 image data URL (" + header + ")");
        }
        byte[] data;
        try {
            data = Base64.getMimeDecoder().decode(dataUrl.substring(comma + 1));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid base64 image data");
        }
        if (data.length == 0) {
            throw new IllegalArgumentException("Empty image");
        }
        Integer width = null, height = null;
        try (ImageInputStream in = ImageIO.createImageInputStream(new ByteArrayInputStream(data))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (readers.hasNext()) {
                ImageReader r = readers.next();
                try {
                    r.setInput(in, true, true);
                    width = r.getWidth(0);
                    height = r.getHeight(0);
                } finally {
                    r.dispose();
                }
            }
        } catch (Exception ignored) {
            // Dimensions are informational for legacy images.
        }
        try {
            String sha = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));
            return new ParsedImage(header.substring(0, header.length() - ";base64".length()), data, width, height, sha);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
