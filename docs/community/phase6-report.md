# Global Community — Phase 6 Report: Mobile Integration

**Status:** implemented and checked locally (type-check, lint, contract check).
Not released. The web admin UI is **not** part of this phase (see "Not done").

## How the app decides which Community it talks to

The app asks `GET /api/mobile/community/config` (per selected gym). If the
global Community is available to this user it uses the new API; on anything
else — rollout off, an older backend without the endpoint, a network error —
it keeps using the legacy API exactly as before. Queries wait for that answer,
so the screen never flips from legacy to global content, and every query key
includes the mode so the two can't mix in the cache.

**A new app build is therefore safe against every backend state:** before
cutover it behaves like today's app; after cutover, until the mobile surface
flag is on for the user's gym, it uses the legacy endpoints (served by the
compatibility adapter); once on, it uses the global API.

## Changes (all inside `src/domains/community`, plus one header)

| File | Change |
|---|---|
| `domain/community.types.ts` | API mode, server-computed ownership (`isMine`), per-post/comment capabilities, status/visibility, author gym, client config, report reasons, page tokens |
| `application/CommunityRepository.ts`, `CommunityService.ts` | Page token (number or cursor); idempotent like; global-only operations (config, report, hide/restore) |
| `infrastructure/ApiGlobalCommunityRepository.ts` (new) | The global API mapped onto the same domain model; authenticated image URLs; gym analytics stay gym-scoped |
| `infrastructure/ApiCommunityRepository.ts` | Returns the next page token; otherwise unchanged |
| `hooks/useCommunity.ts` | `useCommunityConfig` / `useCommunityMode`; mode-aware feed (cursor or page), comments, trending, leaderboard |
| `hooks/useCommunityActions.ts` | Mutations use the active mode; like passes the current state (idempotent PUT/DELETE); new report and moderation mutations |
| `presentation/components/CommunityPostCard.tsx` | Global mode: ownership and every action from the server (delete, archive, hide/restore, report with reasons); author's gym shown; authenticated images; "Hidden by gym moderators" banner. Legacy mode unchanged |
| `presentation/components/CommunityCommentsSheet.tsx` | Global mode: server-driven delete/report/hide/restore per scope, hidden marker, input replaced by the reason when the user can't comment |
| `presentation/components/CommunityHeader.tsx` | "GymBios Community — One community across GymBios gyms" in global mode |
| `presentation/components/CommunityPostComposer.tsx` | "Posting as a member of <gym> · visible to everyone in the GymBios Community", or the reason posting is blocked; image checked against the server's limits before upload |
| `index.ts` | Exports the new hooks, types and repository |
| `core/network/apiClient.ts` | Sends `X-App-Version` (prerequisite for C1's minimum-version enforcement) |

**Backend addition:** `/config` now reports the posting gym (or the refusal
code) using exactly the check a real post uses. Covered by a new test in
`GlobalCommunitySecurityIT` (21 pass).

**Removed client-side trust:** in global mode the app no longer decides
ownership by comparing user IDs (`user.id === authorUserId` was the client-side
twin of the legacy bug) and no longer shows moderation by role. Every action it
offers comes from the server, which enforces it again.

## Verification

- `tsc --noEmit`: **0 errors** (checked that it really type-checks by planting an error).
- ESLint on the Community domain and `apiClient.ts`: **0 errors**; **no new
  warnings** versus the unchanged code (compared file by file).
- Wire contract: all **34** fields the new repository reads exist in the
  backend DTOs (snake_case), and the request fields it sends are pinned by the
  backend controller tests.
- The mobile project has no unit-test runner, so screens weren't exercised by
  automated UI tests; a device check is part of the release gate.

## Decisions and follow-ups

- **Multi-gym picker:** the app has no "my gym memberships" list to choose
  from, so members post as their currently selected gym (switchable with the
  existing gym switcher) and the server verifies it. A proper picker needs a
  memberships endpoint.
- **Images:** limits are checked before upload with a clear message; automatic
  downscaling needs `expo-image-manipulator`, a new dependency that needs approval.
- **Not done in this phase:** the web admin Community (`community-redesign.tsx`
  moderation queue and reports) — the old web page keeps working through the
  compatibility adapter after cutover; the global web UI is the next step.

## Release gates

- Ship the app build before (or independently of) the backend cutover — it
  falls back automatically.
- Turn `mobile_surface` to `ALLOWLIST` for pilot gyms first.
- Device check: feed, image loading with authentication, like/unlike, comment,
  report, moderator hide/restore, blocked-posting messages.
