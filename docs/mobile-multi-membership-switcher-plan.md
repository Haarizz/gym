# Mobile: Multiple Gym Memberships & Membership Switcher — Plan

**Status:** Different gyms built on `changes_anandu`, not yet released — see "What's
built". Same gym, second branch (§6) deferred (Decision 1).
**Scope:** GymBios-Mobile + Gym-backend (tenant DBs and control plane).

## Goal

A member can hold memberships at more than one gym (or branch) and switch between
them from the app header, similar to Instagram's account switcher.

Example: Anandu signs up, completes the profile, and buys a membership at
Fitzone · Main Branch. Later, when buying a plan at another gym, the app asks:

> "You're already a member at Fitzone · Main Branch. Add Ipsum · Main Branch as
> another membership?"

On "Yes", a new membership is created using the same profile details. The header
("Ipsum · Main Branch") becomes tappable and opens a switcher listing every
membership.

## Current behaviour

- One global account (`UserProfile`, control plane) → one `Member` row per tenant
  database, created by `MobileDiscoveryController.purchaseMembership` from the
  profile details and linked via `global_user_id`.
- The app picks the gym per request with the `X-Tenant-ID` header
  (`setApiClientTenant` / `authStore.setActiveTenant`).
- Purchase returns **409 Conflict** (empty body) when the target tenant already has a
  `Member` row with the caller's `global_user_id` or email
  (`MobileDiscoveryController.java`, "Check if member already exists").
- **Interim fix:** `PlanPurchaseModal` catches the 409 and shows an
  "You're already a member" bottom sheet.

Important consequences:

- **Different gyms (tenants) already work at the data level.** The 409 check only
  looks inside the target tenant's database, so buying at a second gym succeeds
  today. What's missing is any way to *list* or *switch* between them in the app.
- **Same gym, different branch is blocked by design.** The backend assumes one
  `Member` row per global user per tenant.

## Terminology

Use **"membership"**, not "profile", in the UI. The person is always the same
(one account, one profile); what they hold is several memberships. "Create another
profile" risks reading as "create a second account".

In code, a switcher entry = `(tenantSlug, branchId, memberId)`.

## Proposed design

### 1. Membership index (backend, control plane)

New control-plane table, e.g. `user_memberships`:

| column | notes |
|---|---|
| `global_user_id` | FK to the global user |
| `tenant_slug` | gym |
| `branch_id` | branch within that tenant |
| `member_id` | business member id in the tenant DB |
| `gym_name`, `branch_name` | denormalised for display |
| `status` | active / pending_approval / expired / … (best-effort mirror) |
| `created_at`, `updated_at` | |

Written on:
- mobile purchase (`purchaseMembership`)
- family/couple invitation claim
- staff linking an existing member to a global account (`linkGlobalUser`)
- status changes that matter to the switcher (approval, expiry, cancellation)

A backfill runner is needed for existing `global_user_id`-linked members across all
tenants (same pattern as `UserDirectoryBackfillRunner`).

Querying every tenant DB on each request is **not** an option. That's why the
index exists.

### 2. Endpoint

`GET /api/mobile/me/memberships`: a global path (add to `TenantContextFilter`'s
strictly-global matchers). Returns the index rows for the caller, sorted with the
last-used membership first.

### 3. Header switcher (mobile)

- Tapping the header name/branch opens a bottom sheet listing memberships (gym logo
  or avatar, "Gym · Branch", plan name, status badge, checkmark on the active one).
- "Add membership" at the bottom → Discover.
- Selecting an entry → `setActiveTenant(slug)` + `setApiClientBranch(branchId)`,
  persist as last-used, and reset gym-scoped state (see §5).
- Hide the chevron/affordance when the user has only one membership.

### 4. Purchase flow

Replace the interim "already a member" sheet with a decision based on where the
existing membership is:

| Situation | Behaviour |
|---|---|
| No membership at this gym | Purchase as today. If the user has memberships elsewhere, show the "Add as another membership?" confirmation first. |
| Member at a **different gym** | Confirmation prompt → purchase → new index row → offer to switch to it. |
| Member at the **same gym, different branch** | Depends on Decision 1. |
| Member at the **same gym, same branch** | No new membership. Show "already a member" with actions to renew/change plan (existing `MembershipChangePreview` endpoints). |

The backend 409 should return a JSON body so the app can pick the right branch of
this table, e.g. `{ "code": "ALREADY_MEMBER", "branchId": 1, "status": "active" }`.

### 5. Switching cleanly

- React Query keys for gym-scoped data must include the tenant (and branch), or the
  cache must be cleared on switch. Otherwise the previous gym's plan, check-ins
  and schedule flash briefly.
- Approval gate (`useMembershipApprovalStatus`) and check-in QR are already per
  tenant via `X-Tenant-ID`; they follow the switch automatically once refetched.
- Push notifications: a notification from gym B opened while gym A is active should
  switch to gym B first. The payload needs `tenantSlug`/`branchId`.

### 6. Same-gym, multiple branches (only if Decision 1 = allow)

Largest backend change. Everything that resolves "the member" by
`global_user_id` alone must also filter by branch:

- `MemberRepository.findByGlobalUserId` returns `Optional`, so it **throws** if two
  rows exist. Replace with `findByGlobalUserIdAndBranchId` (driven by
  `X-Active-Branch-Id`) across `TenantContextFilter` and every mobile member
  service/controller.
- Purchase check becomes `existsByGlobalUserIdAndBranchId` (method already exists).
- The email uniqueness check (`existsByEmail`) must be relaxed for the same global
  user.
- Audit reporting/dashboards that count "members" per tenant: decide whether one
  person with two branch memberships counts once or twice.

## What's built (different gyms)

Every member now has one global account (see
[global-accounts-for-gym-created-members-plan.md](global-accounts-for-gym-created-members-plan.md)),
so a second gym is a second membership on the same account.

- **List:** `GET /api/mobile/profile/memberships` (the existing endpoint, not a new
  `/me/memberships`) now returns, per gym: `tenant_slug`, `active`, `gym_name`,
  `branch_id`, `branch_name`, `plan_name`, `status`, `expiry_date`.
  `GlobalMembershipService.findLinkedGyms` reads the account's members row in each
  indexed gym live; names come from `global_branch_discovery`, falling back to
  `tenants.name`. Status: ACTIVE, EXPIRED, INACTIVE, SUSPENDED, PENDING_APPROVAL,
  PAYMENT_REJECTED, UNAVAILABLE (gym DB unreachable). Index rows whose member was
  deleted are left out. No change to `user_memberships` itself.
- **Picker at sign-in:** only when the device has no remembered gym for this account and
  the account has more than one (`fetchLinkedGymChoice` → `authStore.gymChoicePending`;
  the member layout renders `ChooseGymScreen` instead of the tabs). Otherwise the
  last-used gym opens directly (Decision 4).
- **Switching:** Profile Hub → **Switch gym**, and the line under the member's name in
  the header ("Gym · Branch ⌄"). Both only when the member has more than one gym.
  `switchGym` sets X-Tenant-ID **and** X-Active-Branch-Id before anything refetches (a
  branch id from the previous gym would filter the new gym's data to the wrong branch),
  opens Home and resets the whole query cache. `BranchProvider` no longer uses the
  session's `branchId` for members — their branch always comes from the member record
  at the active gym.
- **Purchases:** buying a plan or a family plan at a gym switches to it through the same
  path (`enterPurchasedGym`), so the previous gym's cached data is cleared and the new
  gym appears in the switcher.
- **Push:** the device registers its token with every gym the member belongs to, and
  unregisters from all of them on sign-out. `ExpoPushClient` adds `tenantSlug` (the
  sending gym) to every notification's data; tapping one from another gym switches to
  it first, then opens the screen.
- **Wording:** "Switch gym" / "Your gyms" in the UI. Strings in en, ar, de, es, fr, hi,
  zh (ml and ta fall back to English, as for the rest of their pending phases).
- **Shown in the list:** expired, suspended and pending memberships too, with a status
  badge (Decisions 5 and 7). Staff accounts are out of scope (Decision 8).

## Decisions needed

1. **Same gym, second branch:** **Decided: deferred** — ship different gyms first. allow a separate membership per branch, or block
   and point to the gym's own multi-branch access / plan change?
2. **Profile edits after purchase:** each gym's `Member` row is a copy made at
   purchase. When the user edits their global profile (phone, weight, address…),
   do we (a) push the change to every membership, (b) update only the global
   profile, or (c) ask per edit? (a) matches user expectations but overwrites
   staff edits in the gym's record.
3. **UI wording:** "membership" (recommended) vs "profile".
4. **Default on app open:** **Decided:** last-used gym; the picker only when none is
   remembered on the device.
5. **Expired / cancelled memberships in the switcher:** show (greyed, with Renew) or
   hide?
6. **Family seats:** should a claimed family/couple seat appear as its own entry in
   the switcher? (Likely yes. It is a `Member` row linked to the user.)
7. **Pending approval (Cash/Credit/Mixed):** show in the switcher with a "Pending"
   badge and the locked state, or hide until approved?
8. **Staff accounts:** out of scope, or should a user who is both staff at one gym
   and a member at another also switch here?

## Suggested implementation order

1. Control-plane `user_memberships` table + writes on purchase/claim/link + backfill.
2. `GET /api/mobile/me/memberships`.
3. Header switcher for **different gyms** (no tenant-DB changes needed).
4. Purchase flow: JSON 409 body + "Add as another membership?" prompt, replacing the
   interim sheet.
5. Cache keying/reset and notification routing on switch.
6. Same-gym multi-branch support, if Decision 1 = allow.

## Relevant code

- `Gym-backend/.../controllers/mobile/discovery/MobileDiscoveryController.java`: purchase + 409
- `Gym-backend/.../security/TenantContextFilter.java`: tenant resolution, member access check
- `Gym-backend/.../repositories/MemberRepository.java`: `findByGlobalUserId`, `existsByGlobalUserIdAndBranchId`
- `GymBios-Mobile/src/core/network/apiClient.ts`: `X-Tenant-ID` / `X-Active-Branch-Id` headers
- `GymBios-Mobile/src/domains/memberPortal/centers/presentation/components/PlanPurchaseModal.tsx`: interim "already a member" sheet
- `GymBios-Mobile/src/domains/auth/store/authStore.ts`: `setActiveTenant`
