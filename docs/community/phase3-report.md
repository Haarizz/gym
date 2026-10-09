# Global Community — Phase 3 Report: API, Moderation and Rollout Controls

**Status:** implemented and tested locally. Every endpoint is **off by default**
and can't be switched on while `authority = LEGACY` (database-enforced), so
deploying this code changes no production behavior by itself.

## Endpoints

Served under two prefixes by one controller: `/api/mobile/community/**`
(gated by `mobile_surface`) and `/api/community/global/**` (gated by
`web_surface`). The legacy `/api/community/**` endpoints are untouched.

| Method | Path | Purpose |
|---|---|---|
| GET | `/config` | What the client may show; answers even when the Community is off |
| GET | `/feed?cursor&limit&type&q` | Public feed from every gym (keyset pagination) |
| GET | `/gyms/{gym}/feed` | One gym's posts incl. gym-only history — its staff and verified members only |
| GET | `/me/posts?status` | Own posts (active, archived, hidden) |
| GET | `/posts/{id}`, `/posts/{id}/image`, `/posts/{id}/comments` | Detail, image bytes (cached, `nosniff`), comments |
| GET | `/trending`, `/leaderboard` | Public aggregates (SQL, 60 s cache) |
| POST | `/posts` | Create (with `gym_context`) |
| POST | `/posts/{id}/archive`, `/unarchive`; DELETE `/posts/{id}` | Author lifecycle (soft delete) |
| POST | `/posts/{id}/comments`; DELETE `/comments/{id}` | Comments |
| PUT/DELETE | `/posts/{id}/like` (+ POST aliases) | Idempotent like/unlike |
| POST | `/posts/{id}/report`, `/comments/{id}/report` | Reports |
| GET | `/moderation/queue` | Moderator's gym: hidden posts, hidden comments, open reports |
| POST | `/posts/{id}/hide`, `/restore`; `/comments/{id}/hide`, `/restore` | Gym-scoped moderation |
| POST | `/reports/{id}/resolve`, `/dismiss` | Report handling |

Platform (GYMBIOS_ADMIN only), under `/api/platform/community-rollout`:
`GET /baseline`, `GET /state`, `PATCH /flags`, `POST /production-baseline/accept`,
`POST /cutover`, `POST|DELETE /allowlist`, `GET /audit`, `POST /counters/repair`,
`POST /permissions/community-moderate/sync`, `GET /reports/escalated`.

## How requests are handled

Every service method: **actor** (from `CommunityActorResolver` only) → **rollout
gate** → **load target** (anything the caller may not see is 404, so hidden or
deleted IDs can't be probed) → **policy** → **write**. Reads from gym databases
(profiles, membership) happen before the control-plane transaction, so no
transaction spans two databases.

- **Counters:** likes use `INSERT … ON CONFLICT DO NOTHING` / `DELETE`, and the
  counter moves by ±1 only when a row actually changed — in the same
  transaction. `comment_count` counts non-deleted comments. A repair operation
  recomputes both from source rows.
- **State changes are conditional** on the expected current status; a
  concurrent change returns 409 `STATE_CHANGED` instead of overwriting.
- **Responses carry no user IDs** of any identity space. Ownership is the
  server-computed `author.is_mine`; action flags under `viewer` come from the
  same policy the server enforces.
- **Images** are stored as `bytea` in a separate table and served from their
  own endpoint, so feeds stay small.

## Content limits (C9) — enforced before persistence

Topic ≤ 140, post ≤ 1000, comment ≤ 500, type ∈ {achievement, question, tip},
one JPEG/PNG image ≤ 1.5 MB decoded and ≤ 2048×2048, aspect ratio ∈
{1:1, 4:5, 9:16}. The image type is judged from its **magic bytes** (must match
the declared type) and dimensions from the header only (a tiny file claiming
huge dimensions can't exhaust memory). Request bodies over **3 MB** get 413
before parsing. The database repeats the size/type/dimension limits as CHECKs.

## Rollout controls

- **Kill switch** `community.global.kill-switch=true` (property) turns every
  global endpoint off regardless of the database. It never falls back to the
  legacy tables.
- **Runtime flags** (audited, reason required, optimistic version):
  `write_mode`, `op_post|comment|like|report`, `global_reads`, `moderation`,
  `reports`, `mobile_surface`, `web_surface` (`OFF | ALLOWLIST | ALL`), the
  D1–D4 policies, plus the pilot allowlist.
- **Moderation keeps working while `write_mode = READ_ONLY`**, so harmful
  content can still be removed during an incident.
- **Cutover** requires, in order: writes frozen → production baseline accepted
  (with its digest) → a FINAL reconciliation that **PASSed after the freeze
  began** (a later FAIL hides an earlier PASS). Writes stay frozen afterwards
  until reopened explicitly. `GLOBAL → LEGACY` is refused by the database.
- Pilot targeting uses the staff member's JWT gym, or the app member's selected
  gym header — for **targeting only**, never authorization.

## Reports and escalation

Reports store the gyms owning the content at report time (target author's gym;
for comments also the post owner's gym). Duplicate reports by the same person
are idempotent. A report against **staff of the gym that would moderate it** is
escalated immediately (conflict of interest). A scheduled job escalates reports
open longer than 72 h, or with ≥ 3 distinct reporters (both configurable), to
the platform queue — which is **read-only** in version 1 (C6).

## Observability

One structured line per operation on logger `community.audit`:
`op, surface, actor (kind:id), gym, target, result (OK or error code), status, ms`
— never post or comment text. Refusals (403/404/503) are logged with their
code; unexpected failures at ERROR. Moderation actions and rollout changes are
also in append-only database tables. **Metrics:** the project has no
Micrometer/Actuator dependency; adding one is a `pom.xml` change outside the
approved scope, so counters are derivable from the structured log for now.

## Changes to existing files

None beyond Phases 1–2. New Spring beans only; no new `PlatformTransactionManager`
bean (a local manager is used), so existing `@Transactional` behavior can't change.

## Tests

| Suite | Result | Covers |
|---|---|---|
| `GlobalCommunitySecurityIT` | **20 pass** | Scenarios **A–L**, the global-42 vs tenant-42 identity collision, gym-only history, report routing and conflict-of-interest escalation, content limits, keyset pagination; **25 users × 3 concurrent likes** end with an exact count and no counter repair needed |
| `CommunityRolloutIT` | **8 pass** | Off by default, no global flags under LEGACY, stale versions, **every cutover precondition**, one-way authority, independent gates, allowlist targeting, kill switch, permission sync (dry run + idempotent) |
| `GlobalCommunityControllerTest` | **6 pass** | Snake_case wire format with **no user IDs**, error bodies, 413 cap, surface routing |
| Full application context | boots | All new beans and routes wire without ambiguity; `V6` applies |
| Whole backend | **200 tests, 0 failures** | (full-context tests need a control plane without the stray `V5` — see Phase 1) |

The integration harness wires the real services, stores, policy and resolvers
against disposable databases (control plane via Flyway, two isolated gym
databases, a primary) with **real signed JWTs** from the app's `JwtService`.
Only the slug → DataSource lookup is stubbed (it otherwise needs the encrypted
`tenant_connections` registry).

```sh
COMMUNITY_IT=true COMMUNITY_IT_PG_PASSWORD=... mvn test -Dtest='*Community*IT,*Community*Test'
```

## Production-gated items introduced here

- Running `POST /permissions/community-moderate/sync` with `dry_run=false`
  writes to gym databases.
- `POST /production-baseline/accept` must only be called with the digest of a
  reviewed, PASSing pair of production baseline runs.
- Everything else is inert until flags are changed.
