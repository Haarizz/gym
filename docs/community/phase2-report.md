# Global Community — Phase 2 Report: Identity and Authorization

**Status:** implemented and tested locally. Nothing reachable from any endpoint
yet (Phase 3 adds the APIs, behind flags that default to off).

## What was added

| File | Purpose |
|---|---|
| `community/global/CommunityException.java` | One error type with explicit status + stable code (never a `SecurityException`) |
| `community/global/identity/CommunityActor.java` | The only identity Community code works with: `GLOBAL`, `TENANT` or `PLATFORM`, each carrying only its own ID |
| `community/global/identity/CommunityActorResolver.java` | **The identity boundary**: JWT → principal → actor |
| `community/global/identity/TenantDataSources.java` | Gym slug → that gym's database, as an explicit DataSource |
| `community/global/identity/TenantMembershipLookup.java` | Membership facts by plain JDBC (SELECT only) |
| `community/global/identity/CommunityGymContextResolver.java` | Which gym content is attributed to; `gymContext` is a request, never authorization |
| `community/global/policy/CommunityModerationPolicy.java` | Pure permission rules used for enforcement **and** for UI capability flags |

## Changes to existing files

| File | Why | Behavior change | Rollback |
|---|---|---|---|
| `security/TenantContextFilter.java` | Global members must reach `/api/mobile/community/**` without being routed to, or membership-gated by, their selected `X-Tenant-ID` | Adds one path to the strictly-global and exempt lists; no other path affected | Remove the matcher |
| `config/PermissionCatalog.java` | C7: `COMMUNITY_MODERATE` | `COMMUNITY` module gains a `MODERATE` action | Unused key is harmless |
| `config/DataInitializer.java` | Backfill the new key for existing ADMIN/MANAGER in the primary DB (same pattern as `MEMBERS_APPROVE`) | Two idempotent grants at startup | Remove the lines |
| `config/DefaultRolePermissions.java` | MANAGER default for newly provisioned gyms | — | Remove the key |
| `exceptions/GlobalExceptionHandler.java` | Map `CommunityException` to its status and code | Community-only | Remove the handler |

## Identity rules as implemented

- `ROLE_GYMBIOS_ADMIN` → **PLATFORM** actor (reads only; can't write or moderate in v1).
- JWT `isGlobal=true` → **GLOBAL** actor with the global user ID. The tenant
  claim and `X-Tenant-ID` are never consulted.
- Otherwise → **TENANT** actor. Its gym is the **JWT tenant claim only**. With
  tenant routing off, it is the primary database's gym only if there is exactly
  one; otherwise the actor has no gym and can read but not write.
- A client-supplied gym:
  - GLOBAL: that gym's database must have a member row with this
    `global_user_id` and `app_access_enabled` not false; otherwise 403
    (`NOT_A_MEMBER`, `APP_ACCESS_PENDING`, `MEMBERSHIP_UNDETERMINED`).
  - TENANT: a different gym is 403 `GYM_CONTEXT_MISMATCH` — never silently
    replaced.
  - In the shared primary database a member row isn't enough; the member's
    branch must be shown to belong to the gym, or the result is
    `MEMBERSHIP_UNDETERMINED` (never guessed).
- **No thread tenant switching anywhere.** Every lookup uses an explicit
  DataSource.

## Moderation rules as implemented (C5, C6)

- Moderator of gym G = TENANT actor whose JWT gym is G, holding
  `COMMUNITY_MODERATE`, with the moderation flag on. Global and platform
  accounts never moderate.
- Posts: author archives, unarchives, deletes; author's gym hides and restores.
- Comments: the commenter's gym (`AUTHOR_GYM`) or the post owner's gym
  (`POST_OWNER_GYM`) can hide; each scope lifts only its own hide.
- Deleted content is visible to nobody; hidden content only to its author and
  moderators with a scope; gym-only (`GYM`) content needs a verified gym.
- Reports route by the stored gyms of the content, never the viewer's active gym.

## Tests

| Test | Result | Covers |
|---|---|---|
| `CommunityModerationPolicyTest` | 16 pass | Scenarios A–F, lifecycle, visibility, report routing |
| `CommunityActorResolverTest` | 7 pass | Identity resolution; actors can't mix identity spaces |
| `CommunityGymContextResolverIT` | 9 pass | Scenarios F–J against two isolated gym databases plus a shared primary |
| `CommunityIdentityBoundaryTest` | 1 pass | Build fails if Community code reads the principal, `UserRepository` or `TenantContextHolder` outside the resolver (verified by planting a violation) |
| `TenantContextFilterTest` | 9 pass (2 new) | Global Community path is neither routed nor gated |

Full backend suite on this branch: all pass **except three pre-existing
full-application tests** (`TestPayroll`, `TestPayrollJson`, `RewardRuleTest`)
when pointed at the local `gymbios_control`. That database has `V5` applied
from uncommitted work on `develop`; with `V6` present on this branch, Flyway
reports `V5` as missing and refuses to start — the merge-order constraint from
the Phase 1 report. Against a clean control plane all three pass, and the
application starts with `V6` applied. The local `gymbios_control` was not
modified (validation fails before anything runs).

## Open items carried forward

- **Existing tenant databases don't have `COMMUNITY_MODERATE`.** `DataInitializer`
  seeds only the primary database, and tenant databases only get permissions at
  provisioning (`MEMBERS_APPROVE` has the same gap today). Phase 3 adds an
  explicit, idempotent, audited per-tenant grant operation; running it in
  production is a gated step.
- **D3 (primary-gym member logins):** they authenticate as global accounts but
  have no `global_user_id`, so the resolver treats them as GLOBAL and posting
  fails with `NOT_A_MEMBER`. That's safe (no wrong identity) and stays so until
  D3 is decided.
