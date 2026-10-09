# Global Community — Phase 1 Report: Control-Plane Schema

**Status:** implemented and tested locally. **Not applied to production.**
**Production boundary:** deploying this branch runs control-plane Flyway at
startup, which would create these tables in production. That is a gated step
(see the Phase 0 checklist) and has not happened.

## What was added

| File | Purpose |
|---|---|
| `resources/db/migration-control/V8__global_community.sql` | The global Community store |
| `test/.../community/support/DisposableDatabases.java` | Creates/drops throwaway `community_it_*` databases for integration tests |
| `test/.../community/schema/GlobalCommunitySchemaConstraintIT.java` | 25 tests: every invalid state is rejected by the database |

No gym-database migrations, no `pom.xml` or properties changes, no changes to
existing Community code.

## Tables

| Table | Purpose |
|---|---|
| `community_authors` | Canonical identity: `GLOBAL` (global user ID), `TENANT` (gym slug + local user ID) or `PLATFORM` (platform user ID) |
| `global_community_posts` | Posts, with the author's gym (`author_tenant_slug`), visibility, status and origin |
| `global_community_post_images` | Images as `bytea` (never PostgreSQL large objects) |
| `global_community_comments`, `global_community_likes` | Interactions |
| `community_comment_hides` | The two independent comment-hide scopes (C5), plus a reserved `PLATFORM` scope |
| `community_moderation_actions` | Append-only moderation audit |
| `community_reports` | Reports, routed by the stored gym of the content |
| `community_migration_runs`, `community_migration_quarantine` | Backfill/reconciliation bookkeeping |
| `community_rollout_state`, `community_rollout_allowlist`, `community_rollout_audit` | Runtime flags, D1–D4 policies, pilot gyms, append-only change log |

## Invariants enforced by the database

- **Identity:** each author kind has exactly its own identity columns; the
  same identity can't be registered twice; the same number in different
  identity spaces is allowed (global 7 ≠ tenant-local 7).
- **Slugs:** no empty or whitespace-containing gym slugs.
- **States:** only the approved `status`, `visibility` and `origin` values;
  `HIDDEN` requires who/when, `DELETED` requires when.
- **Counters** can't go negative. **Likes** are unique per (post, author).
- **Legacy mapping:** `origin = 'LEGACY'` ⇔ `(legacy_source, legacy_id,
  legacy_fingerprint)` are all set, and `(legacy_source, legacy_id)` is unique
  per table — a legacy row can be migrated only once.
- **Content limits (C9)** apply to new content: post ≤ 1000, comment ≤ 500,
  image JPEG/PNG ≤ 1.5 MB and ≤ 2048×2048. Legacy content is kept verbatim.
- **Append-only:** moderation actions and rollout audit reject UPDATE, DELETE
  and TRUNCATE.
- **Rollout state:** a single row; can't be deleted; no global feature can be
  switched on while `authority = LEGACY`; `authority` can only become `GLOBAL`
  once `production_baseline_accepted` is true; **`GLOBAL → LEGACY` is rejected
  by a trigger**; shadow comparison and legacy delta sync are only allowed
  while `LEGACY`.
- **Quarantine** records can't be marked resolved or excluded without who,
  when and a written resolution.
- **Global IDs** for posts, comments and likes start at 1,000,000,000 (a
  safeguard only — legacy IDs are resolved through the stored legacy key).

## D1–D4: encoded as configuration, not guessed

`community_rollout_state` holds one policy per unresolved production fact.
Every default is the conservative choice:

| Decision | Column | Default | Alternatives |
|---|---|---|---|
| D1 platform-owner posts | `platform_author_policy` | `QUARANTINE` | `EXCLUDE`, `MIGRATE_AS_PLATFORM` (schema supports a `PLATFORM` author kind) |
| D2 unregistered primary gym | `unregistered_gym_policy` | `QUARANTINE` | `ALLOW` |
| D3 primary-gym member logins | `primary_member_login_policy` | `QUARANTINE` | `TENANT` |
| D4 posts without a branch | `null_branch_policy` | `QUARANTINE` | `GYM_LEVEL` |
| D5 production baseline | `production_baseline_accepted` | `false` | Blocks `authority = GLOBAL` at the database level |

Changes to these go through the audited rollout service (Phase 3).

## Deviations from the Revision 2 plan

1. **Legacy key stored on each row instead of a separate map table.** The
   database then enforces "exactly one global row per legacy row" directly
   (Phase 0 finding: the key must include the source database, not just the
   gym, because stale primary copies share IDs with tenant rows).
2. **No foreign key from `author_tenant_slug` to `tenants(slug)`** — D2 is
   unresolved (the primary gym isn't registered). Slug format is enforced by a
   CHECK; registration is checked during reconciliation.
3. **Integration tests use disposable databases on a local PostgreSQL server
   instead of Testcontainers (C11).** There is no Docker on this machine and
   the Testcontainers libraries aren't cached. Isolation is equivalent, and no
   `pom.xml` change was needed. Tests are opt-in (`COMMUNITY_IT=true`).
4. **No `V7` drop migration.** Rollback before any data exists is manual (below);
   a destructive migration in the repository is riskier than useful.

## Merge-order constraint

Local `gymbios_control` already has **`V5__family_invitation_directory`**
applied from uncommitted work on `develop`; this branch goes from `V4` to
`V6`. **That `V5` must be merged before this `V6`**, or Flyway will refuse the
out-of-order `V5` on any database where `V6` was already applied.

## Tests

`GlobalCommunitySchemaConstraintIT` — **25/25 pass**. Each rejection is
checked to come from a constraint (SQLSTATE 23xxx) or a guard trigger
(P0001), so a SQL typo can't pass as a "rejection". It also re-runs the whole
`V6` script against the already-migrated database to prove idempotency.

```sh
COMMUNITY_IT=true COMMUNITY_IT_PG_PASSWORD=... mvn test -Dtest=GlobalCommunitySchemaConstraintIT
```

Local application databases were not touched (`gymbios_control` still at V5;
all `community_it_*` databases dropped after the run).

## Manual rollback (before any Community data exists)

```sql
DROP TABLE IF EXISTS community_rollout_audit, community_rollout_allowlist, community_rollout_state,
  community_migration_quarantine, community_migration_runs, community_reports,
  community_moderation_actions, community_comment_hides, global_community_likes,
  global_community_comments, global_community_post_images, global_community_posts,
  community_authors CASCADE;
DROP FUNCTION IF EXISTS community_reject_mutation(), community_rollout_state_guard();
DELETE FROM flyway_schema_history WHERE version = '6';
```

After global writes exist, rollback means switching features off, not dropping
tables.
