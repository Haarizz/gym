# Mobile: Multiple Gym Memberships & Membership Switcher — Plan

**Status:** Planned, not started. Interim fix is in place (see "Current behaviour").
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

## Decisions needed

1. **Same gym, second branch:** allow a separate membership per branch, or block
   and point to the gym's own multi-branch access / plan change?
2. **Profile edits after purchase:** each gym's `Member` row is a copy made at
   purchase. When the user edits their global profile (phone, weight, address…),
   do we (a) push the change to every membership, (b) update only the global
   profile, or (c) ask per edit? (a) matches user expectations but overwrites
   staff edits in the gym's record.
3. **UI wording:** "membership" (recommended) vs "profile".
4. **Default on app open:** last-used membership (recommended), or always ask when
   there's more than one?
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
