# Global Community — Phase 0 Production Verification Checklist

**Branch:** `community/phase0-baseline` (built on `9c7dec9`)
**Audience:** whoever deploys to production, and the reviewer approving Phase 1.
**Goal:** deploy the read-only Phase 0 baseline, capture two production runs, and
bring back the evidence needed to decide D1–D5 before any Phase 1 work starts.

Phase 1 (the control-plane `V6` schema) is **not** part of this branch and must
not start until the production baseline has been reviewed and approved.

---

## What this branch changes

| File | Change |
|---|---|
| `services/CommunityService.java` | C10 hotfix: global app accounts are refused **before** the tenant `users` lookup; `likedByMe` is never matched by a global ID |
| `exceptions/CommunityGlobalPrincipalNotSupportedException.java` | New exception for the hotfix (deliberately not a `SecurityException`) |
| `exceptions/GlobalExceptionHandler.java` | Maps that exception to **403** |
| `controlplane/community/baseline/*` (4 files) | Read-only baseline: snapshot reader, author classifier, analysis service, report model |
| `controllers/platform/CommunityRolloutController.java` | `GET /api/platform/community-rollout/baseline`, GYMBIOS_ADMIN only |
| 3 test files | Classifier rules, hotfix behavior, opt-in local determinism test |

**Not in this branch:** no SQL migrations, no entities, no `pom.xml` or
properties changes, and none of the unrelated uncommitted work from the main
worktree.

### Behavior change in production

- **Global app accounts** (JWT `isGlobal=true`) now get
  `403 COMMUNITY_GLOBAL_PRINCIPAL_NOT_SUPPORTED` on legacy Community writes
  (create post, comment, like, delete, archive) instead of `401 User not found`
  — or, worse, a post saved under an unrelated tenant user who shares the ID.
  Their feed reads still work; `likedByMe` is always `false` for them.
- **Tenant users** (staff, owners, gym-created member logins with a tenant
  token): no change.
- **New endpoint:** read-only, GYMBIOS_ADMIN only.

### How the baseline stays read-only

Each database is read with plain JDBC on its own DataSource inside a single
`REPEATABLE READ`, `READ ONLY` transaction that is always rolled back. It never
changes `TenantContextHolder`. Any write attempt would fail the transaction
rather than change data.

---

## Step 1 — Confirm production's commit (stop if it isn't `9c7dec9`)

The jar built from this branch is only valid on top of `9c7dec9`.

**If production deploys from a git checkout on the server:**

```sh
git -C <deploy-checkout-path> rev-parse --short HEAD
```

**If only a jar is copied to the server,** identify the commit from a migration
that was renamed in each of the last three commits:

```sh
unzip -l <deployed-jar> | grep add_mobile_referral_tables
```

| Output | Production is at | Action |
|---|---|---|
| `V42.1__add_mobile_referral_tables.sql` | `9c7dec9` | Continue |
| `V56__add_mobile_referral_tables.sql` | `3506211` or `ff14ba9` | **Stop.** Report it; Phase 0 is rebuilt on that commit |
| `V42__add_mobile_referral_tables.sql` or no match | Older than `ed74b4b` | **Stop.** Report the commit |

Checksums of jars can't be compared: every build embeds timestamps.

- [ ] Production commit confirmed as `9c7dec9` (record how it was confirmed: ______)

---

## Step 2 — Build and deploy

```sh
git checkout community/phase0-baseline
cd Gym-backend
mvn package -DskipTests
```

1. Keep the currently deployed jar for rollback.
2. Replace it with `Gym-backend/target/project-0.0.1-SNAPSHOT.jar` and restart
   the `gymbios-backend` systemd unit.
3. In the startup log, confirm Flyway applied **no new migrations** (this
   branch adds none) and there are no schema errors.

- [ ] Previous jar kept
- [ ] Deployed and restarted
- [ ] Flyway: nothing new applied; no schema errors

**Rollback:** restore the previous jar and restart. The baseline writes
nothing, so no data needs undoing.

---

## Step 3 — Run the baseline twice

Log in as a GYMBIOS_ADMIN user to obtain a token, then:

```sh
curl -sf -H "Authorization: Bearer $TOKEN" \
  http://localhost:9080/api/platform/community-rollout/baseline -o baseline-prod-run1.json
curl -sf -H "Authorization: Bearer $TOKEN" \
  http://localhost:9080/api/platform/community-rollout/baseline -o baseline-prod-run2.json
```

Run them back to back while Community traffic is as low as practical. A post,
comment or like created between the two runs legitimately changes the digest;
if that happens, run the pair again.

- [ ] Run 1 saved
- [ ] Run 2 saved

---

## Step 4 — Compare the two runs

The runs must have an **identical digest**, **identical per-source
checksums**, and no other differences apart from `generated_at`.

```sh
python3 - <<'EOF'
import json
a = json.load(open("baseline-prod-run1.json"))
b = json.load(open("baseline-prod-run2.json"))
ok = True
if a["digest"] != b["digest"]:
    ok = False; print("DIGEST DIFFERS", a["digest"], b["digest"])
for sa, sb in zip(a["sources"], b["sources"]):
    if sa["checksums"] != sb["checksums"]:
        ok = False; print("CHECKSUMS DIFFER:", sa["source"])
a.pop("generated_at"); b.pop("generated_at")
if a != b:
    ok = False; print("REPORT BODIES DIFFER (beyond generated_at)")
print("PASS" if ok else "FAIL")
EOF
```

- [ ] Comparison prints `PASS`
- [ ] Every source has `reachable: true` (or each unreachable source is listed as `SOURCE_UNREACHABLE`)

---

## Step 5 — Hand back for review

Send **both JSON files unmodified** (no redaction or reformatting). They
contain user IDs and role names, but no usernames, emails, or post/comment
text.

- [ ] Both files delivered, plus the production commit from Step 1

---

## D1–D5 — Decisions to make from the production report

Each decision names the evidence to read in the report. Local findings are in
brackets for comparison; production numbers decide.

### D1 — Posts authored by the platform owner (GYMBIOS_ADMIN)

- **Evidence:** `identity.platform_account_authors`; anomalies with code
  `AUTHOR_PLATFORM_ACCOUNT` (counts per table). [Local: 1 author — 2 posts, 1 like.]
- **Options:** (a) mark them `APPROVED_EXCLUSION` if they are test/demo
  content; (b) add a `PLATFORM` author kind to the Phase 1 schema.
- **Recommended:** (a) if the posts are test content; (b) only if real
  platform announcements need to survive.
- [ ] Decision: ______

### D2 — Primary gym not registered as a control-plane tenant

- **Evidence:** anomalies with code `PRIMARY_GYM_NOT_REGISTERED_AS_TENANT`
  (affected counts in `detail`); the primary source's `gyms`.
  [Local: `main-gym` — 4 posts, 1 comment, 4 likes.]
- **Options:** (a) register the primary gym in `tenants` (a control-plane data
  change needing its own approval), enabling an FK from posts to
  `tenants(slug)`; (b) allow the unregistered slug and drop that FK.
- **Recommended:** (a).
- [ ] Decision: ______

### D3 — Gym-created member logins in the primary database

- **Evidence:** anomalies with code `AUTHOR_AMBIGUOUS` whose detail starts
  "Gym-created member login in the primary database". [Local: 1 author —
  2 posts, 1 comment, 3 likes.]
- **Problem:** the data links these accounts to a gym member
  (`members.user_id`), but `AuthService` logs them in as global accounts
  (ROLE_MEMBER, no directory entry), and `MobileJwtIssuer` uses a different
  global rule. Under C3 they could never post.
- **Recommended:** classify them as TENANT(primary gym, user id), trusting the
  data relationship over the login rule, and fix the inconsistent global rule
  in a separate, reviewed change.
- [ ] Decision: ______

### D4 — Posts with no branch

- **Evidence:** each source's `posts_by_branch["NULL"]`; anomalies with code
  `NULL_BRANCH`. [Local: all 4 posts.]
- **Recommended:** migrate them with a gym but no branch; the compatibility
  adapter keeps showing them only in All Branches mode, matching current
  behavior.
- [ ] Decision: ______

### D5 — The production baseline itself

- **Also check before approving Phase 1:**
  - `STALE_PRIMARY_COPY_SUPERSEDED` / `STALE_PRIMARY_COPY_DIVERGED` /
    `PRIMARY_ONLY_FOR_MIGRATED_TENANT` — primary-DB copies of already-migrated
    tenants (unprovable locally: no migrated tenant had Community data).
  - `IMAGE_LARGE_OBJECT_MISSING` and each source's
    `posts_with_missing_image_object` — images broken by the tenant data copy
    (it copies large-object IDs, not the objects).
  - `AUTHOR_POSSIBLE_GLOBAL_ID_COLLISION` — posts that may have been saved under
    the wrong person by the legacy bug.
  - `SCHEMA_DRIFT`, `SOURCE_UNREACHABLE`, `IMAGE_DIGEST_UNAVAILABLE`.
  - `id_ceilings` — confirms the proposed global ID starts.
  - `TENANT_GYM_SLUG_DIFFERS` for any tenant whose staff might lack a
    `user_directory` entry (their JWT tenant claim could be `gyms.slug`, which
    would break moderator matching).
- [ ] Production baseline reviewed; every anomaly is RESOLVED, APPROVED_EXCLUSION, or QUARANTINED with an owner

---

## Exit criteria for Phase 0

- [ ] Production commit confirmed
- [ ] Phase 0 deployed; Flyway applied nothing new
- [ ] Two production runs compared: `PASS`
- [ ] D1–D5 decided
- [ ] Explicit approval to start Phase 1

**Phase 1 does not start until every box above is checked.**
