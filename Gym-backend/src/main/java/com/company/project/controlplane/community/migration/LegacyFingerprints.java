package com.company.project.controlplane.community.migration;

import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.CommentRow;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.LikeRow;
import com.company.project.controlplane.community.baseline.LegacyCommunitySnapshotReader.PostRow;
import com.company.project.controlplane.community.migration.LegacyMigrationPlanner.Decision;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * The legacy_fingerprint stored on every migrated row: a hash of exactly what
 * the migration decided (identity, gym, branch) plus the legacy row's own
 * content and state as the baseline saw it. The backfill writes it and the
 * reconciliation recomputes it independently from a fresh analysis — any drift
 * in author, gym, branch, timestamps, archived state, text or image shows up
 * as a mismatch.
 */
public final class LegacyFingerprints {

    private LegacyFingerprints() {}

    public static String post(Decision d, PostRow p) {
        return sha256(d.author().key(), d.gym(), s(d.branchId()), p.createdAt(), String.valueOf(Boolean.TRUE.equals(p.archived())),
                p.topicMd5(), p.contentMd5(), p.metaMd5(), imageToken(p));
    }

    public static String comment(Decision d, CommentRow c) {
        return sha256(d.author().key(), d.gym(), s(c.postId()), c.createdAt(), c.contentMd5());
    }

    public static String like(Decision d, LikeRow l) {
        return sha256(d.author().key(), s(l.postId()), l.createdAt());
    }

    static String imageToken(PostRow p) {
        if (p.imageRef() == null) return "none";
        if (!p.imagePresent()) return "missing";
        return p.imageMd5() != null ? p.imageMd5() : "present";
    }

    private static String sha256(String... parts) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(String.join("|", parts).getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(md.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static String s(Object o) {
        return o == null ? "" : o.toString();
    }
}
