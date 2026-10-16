# Community Redesign — Communities (Groups) Plan

**Status:** planned, not started · **Written:** 2026-10-05 · **Owner:** Anandu361

This plan adds Facebook-Groups-style **communities** to GymBios and reshapes the
mobile Community section into **Feed · Communities · Stats**. It builds on the
unmerged Global Community migration (branch `community/global-community`), not
on today's per-gym community tables.

---

## 1. Background

### 1.1 What exists on `main` today

- **Mobile** (`GymBios-Mobile/src/domains/community`): one feed with search,
  type filter buttons (All / Achievements / Questions / Tips), infinite scroll,
  image posts with cropping, comments sheet, archive, notifications. Bottom
  tabs: **Feed, Events, Achieve, Board, Stats**.
  - `Events` is a "coming soon" placeholder (`CommunityEventsScreen.tsx`).
  - `Achieve` is the same feed filtered to `type: 'achievement'`.
  - `Board` is an engagement leaderboard (posts / likes / comments).
  - `Stats` is gym-wide engagement analytics (`CommunityAnalyticsScreen`).
- **Backend** (`Gym-backend`): community posts, comments and likes live in
  **each gym's own database** (`CommunityPost`, `CommunityPostComment`,
  `CommunityPostLike`). The app sends the selected gym in `X-Tenant-ID`; with no
  gym selected the backend refuses community requests
  (`CommunityService.resolveActor`). So a member sees **the selected gym's
  posts only**. Members of other gyms can like and comment (V72 migration).
- **Phase 0 only** of the Global Community migration is on `main`
  (`controlplane/community/baseline`, `CommunityRolloutController`).

### 1.2 The Global Community branch (built, not merged)

Branch `community/global-community` (worktree `~/Projects/gym-phase0`),
7 commits dated 2026-09-25, ~13k lines. Each phase has a report in
`docs/community/` **on that branch**.

| Phase | Built |
|---|---|
| 0 | Read-only baseline of every legacy community store |
| 1 | Control-plane schema `V6__global_community.sql`: `community_authors`, `global_community_posts`, images, comments, likes, comment hides, moderation audit, reports, migration bookkeeping, rollout state/allowlist/audit |
| 2 | Identity boundary (GLOBAL / TENANT / PLATFORM authors) and moderation policy |
| 3 | Global API under `/api/mobile/community/**` and `/api/community/global/**`: global feed (keyset paging), per-gym feed, `/me/posts`, comments, idempotent likes, reports, gym moderation queue, hide/restore; platform rollout controls for `GYMBIOS_ADMIN` |
| 4 | Idempotent backfill of legacy posts + reconciliation |
| 5 | Legacy compatibility adapter (old `/api/community/**` keeps working after cutover) |
| 6 | Mobile dual mode: app calls `/config`, uses the global API when enabled, otherwise falls back to the legacy API |

**Not done on that branch:** web admin UI for global moderation/reports;
platform report queue is read-only (v1); production baseline acceptance and
cutover have not been run.

### 1.3 Reference design

`GymBios Mobile App/src/app/components/community/CommunityPortal.tsx` (mock-data
prototype): communities list (My / Discover), create wizard, per-community
dashboard with Home, Members, Activities, Challenges, Achievements, Chat,
Settings tabs. **We port its UX for the parts we keep, not its mock data or
local-state architecture.** Goals, challenges, awarded achievements and chat
are **out of scope** for this plan (see §8).

---

## 2. Product decisions (agreed 2026-10-05)

### Navigation
- Mobile tabs become **Feed · Communities · Stats**.
- **Remove** Events, Achieve and Board. (The Feed already has an
  "Achievements" filter; the leaderboard rewards posting volume across gyms.)

### Feed
- Main Feed = **general posts + posts from communities the viewer has joined**.
- Posts from a community carry a **tappable community-name tag** that opens the
  community. General posts have no tag.

### Communities
- Communities are **global** — not tied to any gym — like Facebook Groups.
- **Public only** for now: anyone can find them, joining is instant.
  Private communities with join approval are a later phase.
- **Anyone can create** a community (members, staff, trainers, gym admins).

### Access rules
| Action | Requirement |
|---|---|
| Browse communities, read posts | Any signed-in account |
| Join, create, post, like, comment | Active membership at **any** gym (staff/trainer/admin logins also allowed) |
| Membership expires | Stay in communities, **read-only** |

### Roles and moderation
- Creator becomes **Owner**; Owner can promote members to **Admin**.
- Owner and Admins can remove posts/comments and remove members.
- A **Report** button sends abuse to the platform team (super admin).
- Owner leaves or loses their membership → ownership passes to the
  **longest-serving Admin** (earliest `joined_at`). If there is no Admin, pass
  to the longest-serving Member *(proposed — confirm)*.
- **Deleting a community deletes its posts** (they never fall back into the
  general Feed).

### Stats
- Mobile Stats = the viewer's **personal community-interaction stats only**,
  for every role: posts made, likes and comments received, likes and comments
  given, communities joined/owned.
- Gym-wide and platform-wide analytics move off mobile:
  - **Super admin (GYMBIOS_ADMIN, web):** platform-wide community analytics +
    the report queue.
  - Gym owners keep the existing web page `/analytics`
    (`Gym-frontend/src/pages/community-analytics.tsx`) for now; review after
    launch, since most activity will move into communities.

---

## 3. Target flow

```
Account created
   │
   ├── Feed tab
   │     view:     general posts + posts from joined communities
   │     interact: active membership required (else read-only + "get a membership" prompt)
   │
   ├── Communities tab
   │     ├── My Communities (joined)
   │     ├── Discover (all public communities, search)
   │     │     └── Join ── active membership? ── no ──► "Get a membership to join"
   │     │                        │ yes
   │     │                        └──► joined instantly (role MEMBER)
   │     ├── Create ── active membership? ── yes ──► wizard ──► creator = OWNER
   │     └── Community detail
   │           ├── Feed (this community's posts only)
   │           ├── About (description, guidelines, tags, created by)
   │           ├── Members (roles; Owner/Admin: promote, remove)
   │           └── Settings (Owner/Admin: edit; Owner: delete)
   │
   └── Stats tab ── personal interaction stats

Reports ──► community Owner/Admins ──(escalation)──► super admin (web)
```

---

## 4. Architecture

### 4.1 Where data lives
Communities are global, so they live in the **control-plane database**
(`db/migration-control`), next to the Global Community tables. Do **not** add
them to per-gym migrations.

### 4.2 Proposed schema (new migration, number after the last control-plane migration)

```sql
CREATE TABLE global_communities (
    id               BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    name             VARCHAR(80)  NOT NULL,
    description      VARCHAR(1000),
    guidelines       TEXT,                       -- one rule per line
    tags             VARCHAR(40)[] NOT NULL DEFAULT '{}',
    cover_image      BYTEA,                      -- same limits as post images
    cover_image_type VARCHAR(16),
    visibility       VARCHAR(16)  NOT NULL DEFAULT 'PUBLIC',   -- 'PRIVATE' later
    status           VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',   -- ACTIVE | DELETED
    created_by       BIGINT       NOT NULL REFERENCES community_authors (id),
    member_count     INTEGER      NOT NULL DEFAULT 0 CHECK (member_count >= 0),
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP,
    deleted_at       TIMESTAMP,
    CONSTRAINT ck_gc_visibility CHECK (visibility IN ('PUBLIC')),
    CONSTRAINT ck_gc_status CHECK (status IN ('ACTIVE', 'DELETED')),
    CONSTRAINT ck_gc_deleted CHECK (status <> 'DELETED' OR deleted_at IS NOT NULL)
);

CREATE TABLE global_community_members (
    community_id  BIGINT      NOT NULL REFERENCES global_communities (id),
    author_id     BIGINT      NOT NULL REFERENCES community_authors (id),
    role          VARCHAR(16) NOT NULL,           -- OWNER | ADMIN | MEMBER
    joined_at     TIMESTAMP   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (community_id, author_id),
    CONSTRAINT ck_gcm_role CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER'))
);
-- Exactly one owner per community:
CREATE UNIQUE INDEX ux_gcm_one_owner ON global_community_members (community_id) WHERE role = 'OWNER';
CREATE INDEX ix_gcm_author ON global_community_members (author_id);

ALTER TABLE global_community_posts
    ADD COLUMN community_id BIGINT REFERENCES global_communities (id);
CREATE INDEX ix_gcp_community_created ON global_community_posts (community_id, created_at DESC, id DESC);
```

Notes:
- `community_authors` already models app members (GLOBAL), staff/trainers/gym
  admins (TENANT) and platform users (PLATFORM), so decision "staff can use
  communities" needs no extra identity work.
- `community_id IS NULL` = general post. Existing and migrated posts stay general.
- Existing post `visibility` values are `PUBLIC` and `GYM` (gym-only legacy
  history). Community posts are always `PUBLIC` within their community.
- Add community actions to `community_moderation_actions` (remove member,
  promote, transfer ownership, delete community) so they're audited like
  existing moderation.
- `community_reports` gets an optional `community_id` so reports can route to
  community Owner/Admins first.

### 4.3 Proposed endpoints (in the existing global controller, both prefixes)

| Method | Path | Purpose |
|---|---|---|
| GET | `/communities?cursor&q` | Discover (public, active) |
| GET | `/me/communities` | Joined communities, with my role |
| POST | `/communities` | Create (caller becomes OWNER) |
| GET | `/communities/{id}` | Detail + `viewer` capability flags |
| PATCH | `/communities/{id}` | Edit (Owner/Admin) |
| DELETE | `/communities/{id}` | Delete (Owner) — soft-deletes community and its posts |
| PUT / DELETE | `/communities/{id}/membership` | Join / leave (idempotent) |
| GET | `/communities/{id}/members?cursor` | Member list with roles |
| PATCH | `/communities/{id}/members/{memberRef}` | Promote/demote (Owner) |
| DELETE | `/communities/{id}/members/{memberRef}` | Remove member (Owner/Admin) |
| GET | `/communities/{id}/feed?cursor&type&q` | This community's posts |
| POST | `/posts` | Existing endpoint, plus optional `community_id` |
| GET | `/me/stats` | Personal interaction stats |

Rules carried over from Phase 3 (keep them):
- Every request: **actor → rollout gate → load target → policy → write**.
- Anything the caller may not see returns **404**.
- Responses contain **no raw user IDs**; use opaque member refs and
  server-computed `viewer` flags (`can_post`, `can_moderate`, `can_edit`,
  `can_delete`, `is_member`, `role`).
- New feature switch on `community_rollout_state` (e.g. `op_communities`,
  `OFF | ALLOWLIST | ALL`), off by default, audited.

### 4.4 Feed query change
Main feed (`GET /feed`) becomes:
`community_id IS NULL OR community_id IN (communities the viewer has joined)`,
still keyset-paginated on `(created_at, id)`. Response posts include
`community: { id, name } | null` for the tag.

---

## 5. Phases

### Phase A — Bring the Global Community branch up to date
**Goal:** `community/global-community` merges cleanly on current `main`.

1. Rebase or merge `main` into the branch (work in `~/Projects/gym-phase0`).
2. **Renumber the migration:** branch has `V6__global_community.sql`; `main`
   already has `V6__lead_capture_forms.sql` and `V7__user_memberships.sql`.
   Rename to `V8__global_community.sql` (or the next free number). Update any
   test that references the file name/version (Phase 1 test re-runs the script).
3. Resolve conflicts in mobile files changed on both sides since 2026-09-25:
   `community.types.ts`, `useCommunity.ts`, `index.ts`,
   `ApiCommunityRepository.ts`, `CommunityCommentsSheet.tsx`,
   `CommunityHeader.tsx`, `CommunityPostCard.tsx` (plus `CommunityScreen.tsx`,
   `CommunityLeaderboard.tsx` changed only on `main`). Keep `main`'s UI changes
   and the branch's dual-mode logic.
4. Re-run: `COMMUNITY_IT=true COMMUNITY_IT_PG_PASSWORD=... mvn test -Dtest='*Community*IT,*Community*Test'`,
   the full backend suite, and `tsc --noEmit` + ESLint on mobile.

**Done when:** all suites pass on top of current `main`; no behavior change in
production (everything stays behind rollout flags).

### Phase B — Communities backend (Phase 7 of the global migration)
1. Migration from §4.2.
2. Entities/stores, `CommunityGroupPolicy` (join/create/post/moderate rules
   from §2), service, endpoints from §4.3, new rollout flag.
3. Membership check for join/create/post reuses the same "active membership at
   any gym" check the global API uses for interaction.
4. Ownership transfer: on owner leave and on a scheduled job that detects an
   owner with no active membership → promote longest-serving Admin (then
   Member); log to `community_moderation_actions`.
5. Delete community: set community `DELETED`, set its posts `DELETED` in the
   same transaction.
6. Main feed query change (§4.4) and `community` field on post responses.
7. `/me/stats`.
8. Tests in the existing harness: permissions per role and membership state,
   expired membership = read-only, one owner invariant, ownership transfer,
   delete cascade, feed inclusion/exclusion, 404 for deleted communities,
   concurrent join/leave counter accuracy.

**Done when:** endpoints work behind the flag; integration tests cover every
rule in §2.

### Phase C — Mobile restructure
1. `useCommunityNavigation`: tabs `'feed' | 'communities' | 'stats'`.
   Update `CommunityBottomNav` TABS.
2. Delete `CommunityEventsScreen`, `CommunityAchievementsScreen`,
   `CommunityLeaderboardScreen`, `CommunityLeaderboard` and their hooks/exports
   if unused elsewhere. Remove `CommunityAnalyticsScreen` from this screen
   (check whether anything else in `@/domains/analytics/community` still uses it).
3. Show the **Communities** tab only when `/config` says the global community
   and `op_communities` are on for this user; legacy mode keeps Feed + Stats.
4. Feed: render the community tag on `CommunityPostCard` (tap → community).

### Phase D — Mobile Communities screens
Use Expo Router routes (back button and deep links work), shared by all role
groups `(member)`, `(trainer)`, `(admin)`, `(staff)`:
- `community/communities/index` — My Communities + Discover + search.
- `community/communities/create` — wizard: (1) name, description, cover image;
  (2) guidelines, tags. (Visibility/approval steps from the reference are
  skipped until private communities exist.)
- `community/communities/[communityId]` — header (cover, name, member count,
  my role, Join/Leave), top tabs: **Feed · About · Members · Settings**
  (Settings only for Owner/Admin). Feed reuses `CommunityFeed`,
  `CommunityPostCard`, `CommunityCommentsSheet` with a `communityId` param.
- Composer: when opened from a community, posts into it; from the main Feed,
  posts a general post.
- Domain additions: types (`Community`, `CommunityMember`, `CommunityRole`,
  viewer flags), repository methods, React Query keys
  (`communityKeys.community(id)`, `.communityFeed(id)`, `.myCommunities()`),
  mutations with cache updates (join/leave updates My Communities and the main
  Feed).
- Blocked states: no active membership → buttons show the server's reason
  (same pattern as `canPost` / `canInteract` today).

Read the Expo v57 docs before writing routes (see `GymBios-Mobile/AGENTS.md`).

### Phase E — Personal Stats (mobile)
Replace the Stats tab content with `/me/stats`: posts made, likes received,
comments received, likes given, comments given, communities joined, communities
owned. Simple stat tiles; optional weekly trend if the endpoint provides it.

### Phase F — Web super admin
In `Gym-frontend` (GYMBIOS_ADMIN only):
1. **Report queue:** escalated reports with actions (remove post/comment,
   delete community, suspend author). Phase 3's platform queue is read-only in
   v1 — add the write actions to the backend first.
2. **Platform community analytics:** total communities, most active
   communities, posts/likes/comments over time, new members over time.
3. Global moderation UI that Phase 6 left undone (`community-redesign.tsx`).

### Phase G — Production rollout
Follow the order already defined in the branch's phase reports:
1. Deploy backend with all flags off (control-plane migration runs at startup —
   this is a gated step).
2. Run the production baseline twice; review; accept with its digest.
3. Freeze writes → run backfill + FINAL reconciliation (must PASS after the
   freeze) → cutover (`authority = GLOBAL`, one-way) → reopen writes.
4. Ship the mobile build (safe before or after cutover — it falls back).
5. `mobile_surface` and `op_communities` to `ALLOWLIST` for pilot gyms → `ALL`.
6. Device check: feed, community tag, join/leave, create, community feed,
   post into community, report, owner/admin moderation, expired membership,
   personal stats.

**Dependency order:** A → B → (C, D, E in parallel) → F → G.
C can start against mocked API shapes, but must not ship before B.

---

## 6. Moderation model (three levels, no conflicts)

| Level | Who | Scope |
|---|---|---|
| Community | Owner / Admins | Posts, comments and members in their community |
| Gym | Gym staff with the moderate permission (Phase 3) | Content authored by their gym's members |
| Platform | Super admin (GYMBIOS_ADMIN) | Everything; receives escalated reports |

Reports go to community Owner/Admins first; Phase 3's escalation rules
(open > 72 h, ≥ 3 reporters, conflict of interest) send them to the platform
queue.

---

## 7. Risks and checks

- **Migration number collision** (Phase A step 2) — Flyway fails at startup if
  missed.
- **Branch drift:** every week the branch stays unmerged, conflicts with
  `main` grow. Do Phase A before other community UI work.
- **Spam communities:** creation requires an active membership; consider a
  per-account limit (e.g. 5 owned communities) and a name length/profanity check.
- **Abandoned communities:** an owner with no active membership and no other
  members — decide later whether to auto-archive.
- **Images:** community cover images reuse the post image limits (JPEG/PNG,
  ≤ 1.5 MB, ≤ 2048×2048); automatic downscaling needs `expo-image-manipulator`
  (new dependency, needs approval).
- **Gym-only (`GYM` visibility) legacy posts** must never appear in community
  feeds or other gyms' main feeds.
- **Multi-gym posting identity:** members post as their selected gym (Phase 6
  limitation); a memberships picker needs a memberships endpoint.

---

## 8. Out of scope (later)

- Private communities and join approval.
- Challenges, community goals, awarded achievements, group chat (from the
  reference design).
- Community notification preferences.
- Leaderboards (removed; could return per community).
