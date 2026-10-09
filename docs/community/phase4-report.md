# Global Community — Phase 4 Report: Backfill and Reconciliation

**Status:** implemented and tested locally, including a rehearsal against the
real local legacy estate. **Nothing has been run against production.** Running
the backfill in production writes to the production control plane and is a
gated step.

## Components

| File | Purpose |
|---|---|
| `controlplane/community/migration/LegacyMigrationPlanner.java` | Baseline analysis + D1–D4 policies → one decision per legacy record (MIGRATE / QUARANTINE / EXCLUDE / SUPERSEDED). Pure |
| `…/LegacyContentReader.java` | Batched READ ONLY reads of full legacy content; re-verifies every row against the analysed snapshot |
| `…/LegacyFingerprints.java` | The `legacy_fingerprint` written by the backfill and recomputed by reconciliation |
| `…/CommunityMigrationStore.java` | Replica upserts keyed by `(legacy_source, legacy_id)`, tombstones, runs, quarantine |
| `…/LegacyCommunityBackfillService.java` | The backfill |
| `…/CommunityReconciliationService.java` | The reconciliation |
| `…/CommunityShadowSyncJob.java` | Scheduled delta sync + shadow comparison while LEGACY |
| `CommunityRolloutController` (+ endpoints) | `POST /migration/backfill`, `POST /migration/reconcile`, `GET /migration/runs`, `GET /migration/quarantine`, `POST /migration/quarantine/{id}/decide` |

**Refactor of Phase 0 code** (`CommunityBaselineService`, `LegacyAuthorClassifier`):
the baseline now exposes its analysis so the backfill and reconciliation act
on exactly the facts it reports, instead of re-implementing them. Output is
unchanged — verified: the local baseline digest is still
`99808cad10b1be8a…` over the same 7 sources. The classifier gained a stable
`rule` tag (`PRIMARY_MEMBER_LOGIN`) so the D3 policy never matches on
human-readable text.

## How the backfill works

1. Refuses once authority is GLOBAL, or while another run is in progress
   (stale RUNNING rows expire after 2 h).
2. Runs a fresh baseline analysis → plan (policies + operator exclusions).
3. Per source: reads all gym-database content first (READ ONLY), then writes
   in **one control-plane transaction** — authors, posts, images, comments,
   likes, quarantine rows — tombstones rows that should no longer exist, and
   recomputes counters from the replica.
4. Resolves quarantine rows that weren't raised again, and lapses policy
   exclusions whose policy changed. Operator decisions are never touched.

Properties:

- **Idempotent:** full run, retry, partial-failure recovery and delta all
  converge (upsert by legacy key; a second full run changes nothing — tested
  on synthetic and real local data).
- **Never guesses:** a policy lifts only the code it was approved for
  (D1 `AUTHOR_PLATFORM_ACCOUNT`, D2 `PRIMARY_GYM_NOT_REGISTERED_AS_TENANT`,
  D3 `AUTHOR_AMBIGUOUS` with the member-login rule, D4 `NULL_BRANCH`). Any
  other anomaly keeps the record quarantined. A member ID is recorded only when
  exactly one member row links to the user.
- **Every record is accounted for:** migrated, quarantined (OPEN, per code),
  excluded (APPROVED_EXCLUSION with who/why), superseded by the tenant's own
  database, or changed during the run (skipped, not tombstoned, picked up next
  run). Children of excluded posts are excluded with them; children of
  quarantined posts are quarantined with `PARENT_POST_QUARANTINED`.
- **Stale primary copies** of migrated tenants are skipped as superseded;
  primary-only rows for migrated tenants are quarantined.
- **Images:** legacy large objects hold the data-URL *text*; the backfill
  decodes it to bytes (unreadable images are quarantined, not dropped).
- **Legacy content is kept verbatim** (C9 limits apply to new content only) and
  every migrated post is `GYM` visibility (C2).
- Two legacy likes that would map to the same person on the same post are
  quarantined (`DUPLICATE_LIKE_IDENTITY`), never merged.

## How reconciliation proves correctness

From a **fresh** analysis (never from what the backfill remembers), for every
migratable record: exactly one global row; matching author identity, gym,
branch, `created_at`, archived→status, visibility, topic/content hashes, image
presence and fingerprint; counters equal to both the legacy rows and the global
rows. Plus: no orphans, no duplicate legacy keys, each gym's first feed page in
the same order, every source readable, and **zero OPEN quarantine**. Result
stored as a run (PASS/FAIL, counts, first 200 differences).

`FINAL` mode requires `write_mode = READ_ONLY`; the cutover requires a FINAL
PASS that finished after the freeze began (Phase 3).

## Tests

| Suite | Result | Covers |
|---|---|---|
| `LegacyMigrationIT` | **6 pass** | Two gyms in a shared primary plus a migrated tenant: large-object image byte-for-byte, archived state, stale copy superseded, primary-only quarantined, parent/child quarantine; **idempotent reruns**; D1 EXCLUDE / D3 TENANT / D4 GYM_LEVEL each lifting only their own code; operator exclusion; **reconciliation catches new, deleted and changed legacy rows before the delta run and PASSes after**; **tampering with the replica is detected** and repaired by the next run; FINAL reconciliation gates the one-way cutover; backfill and reconciliation closed after cutover |
| `LocalLegacyMigrationRehearsalIT` (opt-in) | pass | Real local legacy estate, disposable control-plane copy |

**Local rehearsal results** (real schema, `oid` images):

- Conservative policies: 0 migrated, **9 records quarantined with exactly the
  codes Phase 0 reported**, second run changed nothing, reconciliation's only
  finding is `OPEN_QUARANTINE`.
- All four policies permissive: **4 posts, 1 comment, 4 likes migrated,
  reconciliation PASS**, zero open quarantine; the real large-object image
  migrated as an 81,691-byte 736×414 JPEG; platform-owner posts became a
  `PLATFORM` author; the primary member login became `TENANT(main-gym, 5)`.

The legacy databases were only read; every write went to disposable databases.

## Production-gated items introduced here

- `POST /migration/backfill` and `/migration/reconcile` write to the
  production control plane (replica rows, runs, quarantine).
- Setting D1–D4 policies must follow the production baseline review.
- `POST /migration/quarantine/{id}/decide` is an accountable production decision.
