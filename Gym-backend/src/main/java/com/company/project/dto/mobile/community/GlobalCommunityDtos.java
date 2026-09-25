package com.company.project.dto.mobile.community;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;

/**
 * Request/response shapes of the global Community API (serialized snake_case
 * by the application's Jackson configuration).
 *
 * Responses never expose user IDs of any identity space: ownership is the
 * server-computed author.is_mine, and every action flag under "viewer" comes
 * from CommunityModerationPolicy — the same rules the server enforces.
 * Post and comment IDs are global-store IDs; legacy IDs are never exposed.
 */
public final class GlobalCommunityDtos {

    private GlobalCommunityDtos() {}

    // ── Responses ───────────────────────────────────────────────────────────

    public record Author(String displayName, String avatarUrl, String role, String gymSlug, String gymName,
                         String branchName, boolean isMine) {}

    public record Image(String url, Integer width, Integer height, String aspectRatio, Integer cropPosition,
                        Integer cropZoom) {}

    public record PostViewer(boolean likedByMe, boolean canLike, boolean canComment, boolean canReport,
                             boolean canArchive, boolean canUnarchive, boolean canDelete, boolean canHide,
                             boolean canRestore) {}

    public record Post(long id, String topic, String content, String type, String visibility, String status,
                       LocalDateTime createdAt, int likeCount, int commentCount, Image image, Author author,
                       PostViewer viewer) {}

    public record FeedPage(List<Post> posts, String nextCursor) {}

    public record CommentViewer(boolean canDelete, boolean canReport, Set<String> hideScopes, Set<String> restoreScopes) {}

    /** hiddenScopes is only populated for viewers allowed to see why a comment is hidden. */
    public record Comment(long id, long postId, String content, LocalDateTime createdAt, boolean hidden,
                          Set<String> hiddenScopes, Author author, CommentViewer viewer) {}

    public record LikeResult(boolean liked, int likeCount) {}

    public record ReportResult(long reportId, boolean alreadyReported) {}

    public record Report(long id, String targetType, long targetId, String reason, String details,
                         String targetGym, String contextGym, String status, LocalDateTime createdAt,
                         Set<String> yourScopes) {}

    public record ModerationQueue(List<Post> hiddenPosts, List<Comment> hiddenComments, List<Report> openReports) {}

    public record TrendingTopic(String topic, long postCount) {}

    public record LeaderboardEntry(String displayName, String avatarUrl, long posts, long likes, long comments,
                                   long engagementScore) {}

    public record Limits(int topic, int post, int comment, int imageBytes, int imageDimension,
                         List<String> imageTypes, List<String> postTypes, List<String> aspectRatios,
                         List<String> reportReasons) {}

    /** What the calling client may show; safe to call even when the Community is off. */
    public record ClientConfig(boolean available, boolean readOnly, boolean canPost, boolean canComment,
                               boolean canLike, boolean canReport, boolean moderation, Limits limits) {}

    // ── Requests ────────────────────────────────────────────────────────────

    public record ImageUpload(String dataUrl, String aspectRatio, Integer cropPosition, Integer cropZoom) {}

    /** gymContext: the gym the member is posting as — a request, verified against their membership. */
    public record CreatePost(String topic, String content, String type, String gymContext, ImageUpload image) {}

    public record CreateComment(String content, String gymContext) {}

    public record CreateReport(String reason, String details) {}

    public record Moderate(String reason, String scope) {}
}
