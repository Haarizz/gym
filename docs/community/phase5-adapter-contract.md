# Global Community — Legacy API Compatibility Contract

Written for: reviewers of Phase 5 and whoever owns the old app builds.

While `authority = LEGACY`, the old `/api/community/**` endpoints behave
exactly as before (legacy tables, legacy service, plus the C10 hotfix). From
the moment `authority = GLOBAL`, the same endpoints are served by
`LegacyCommunityCompatAdapter` from the global store — the only authoritative
store. The switch is the authority flag itself; there is no second flag that
could put the two stores in play at once.

**Response shapes are identical by construction:** the adapter returns the same
DTO classes the legacy service returned (`CommunityPostResponseDTO`,
`CommunityPostCommentResponseDTO`, `CommunityPostsPageResponseDTO`,
`PaginationDTO`, `ToggleCommunityLikeResponseDTO`, `CommunityEngagementStatsDTO`,
`TrendingTopicDTO`, `LeaderboardEntryDTO`). Status codes follow the legacy
controller's own mapping (IllegalArgumentException → 400, SecurityException →
401/403 per endpoint), so old clients see the codes they already handle.

**Scope is still one gym** — old clients never see the global feed:

| Caller | Gym | Branch |
|---|---|---|
| Staff / gym user | JWT tenant claim | active branch (validated by `BranchContextFilter`); none = all branches |
| App member | `X-Tenant-ID`, **now membership-checked** | same |
| Platform owner | the primary gym, only if the primary DB holds exactly one gym | same |

## Endpoint map

| # | Old request | Adapter | New service | Old response |
|---|---|---|---|---|
| 1 | `GET /api/community/posts?q&type&archived&page&limit` | gym + branch scope; `archived=true` → the caller's own archived posts | offset query over the gym's posts (LEGACY and new, any visibility), newest first | `{posts, pagination{page, limit, total, total_pages}}` |
| 2 | `POST /api/community/posts` | legacy body → `CreatePost` | `GlobalCommunityService.createPost` (surface LEGACY → **visibility GYM**) | post DTO |
| 3 | `GET /api/community/posts/{id}/comments` | id resolved in gym scope | `comments` (hidden/deleted filtered) | comment DTO list |
| 4 | `POST /api/community/posts/{id}/comments` | id resolved; gym = caller's | `addComment` | comment DTO |
| 5 | `POST /api/community/posts/{id}/like` (toggle) | liked? → `unlike` : `like` | `like` / `unlike` | `{liked, like_count}` |
| 6 | `DELETE /api/community/posts/{id}` + `POST …/delete` | id resolved | `deletePost` (soft) | `{success: true}` |
| 7 | `DELETE /api/community/posts/{id}/comments/{cid}` + `POST …/delete` | both ids resolved; comment must belong to post | `deleteComment` (soft) | `{success: true}` |
| 8 | `POST /api/community/posts/{id}/archive` | id resolved | `archive` | post DTO |
| 9 | `POST /api/community/posts/{id}/unarchive` | id resolved | `unarchive` | post DTO |
| 10 | `GET /api/community/stats` | gym + branch scope | SQL over the gym's active posts | stats DTO (same 8 Monday-start weeks) |
| 11 | `GET /api/community/stats/trending-topics` | gym + branch scope, last 30 days | SQL | `[{topic, post_count}]` |
| 12 | `GET /api/community/stats/leaderboard` | gym + branch scope | SQL | `[{user_id, username, …}]` |

**IDs.** Responses carry global IDs (≥ 1,000,000,000). Incoming IDs are
resolved by the stored legacy key within the caller's gym: an ID below the
global range is looked up as `legacy_id` of a migrated row **of this gym**; an
ID in the global range must belong to this gym. Anything else is "Post not
found" (400, as before). The numeric range is only a safeguard; resolution
always goes through stored keys and the gym scope.

**Author fields.** `author_user_id` is the ID in the author's own identity
space — tenant-local user ID for staff/gym logins, global user ID for app
members — which is what each client already compares against its own user ID.
`author_roles` is the author's role (app members: `MEMBER`).

## Intended behavior differences (documented, reviewed)

| Difference | Why |
|---|---|
| `author_username` is the display name, not the login username | Usernames are often emails; the global store never keeps them |
| App members' `X-Tenant-ID` is now membership-checked (403 `NOT_A_MEMBER`) | Previously any gym's feed could be read by sending another gym's header |
| App members can now post/comment/like (with a valid membership) | The C10 hotfix blocked them; the adapter resolves identity correctly |
| Delete is soft | Content stays auditable; clients see it disappear exactly as before |
| C9 limits apply (post ≤ 1000, JPEG/PNG ≤ 1.5 MB, ≤ 2048×2048, known types) | Limits are required before global writes |
| Posts written through the old API are `GYM` visibility | Old-UI users expect a gym-only audience |
| Hidden (moderated) content isn't returned | Moderation must apply to every client |
| Platform owner can't write through the old API | C6: no platform actions in version 1 |
| New error codes can appear: 503 (read-only / kill switch / operation disabled), 403 membership codes | New rollout controls and identity checks |
| Trending ties are ordered by topic name | Legacy tie order was undefined (hash-map iteration) |

## Rollback

Before cutover: the adapter isn't used. After cutover there is no switching
back (the authority trigger forbids it); problems are handled with the kill
switch, `write_mode = READ_ONLY` or per-operation flags, and fixed forward.
