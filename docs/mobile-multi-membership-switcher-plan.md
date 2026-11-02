# Mobile: Multiple Gym Memberships & Gym Switcher — Plan

**Status:**
- **Different gyms** — built on `changes_anandu` (commit `f66bbc90`), not yet released.
  See "What's built".
- **Same gym, more than one branch** — **waiting for a team decision.** See
  "Same gym, several branches — decision needed".

**Scope:** GymBios-Mobile + Gym-backend (tenant DBs and control plane).
**Related:** [global-accounts-for-gym-created-members-plan.md](global-accounts-for-gym-created-members-plan.md)
— every member now has one GymBios account, which is what makes a second gym simply a
second membership on the same account.

## Goal

A member can hold memberships at more than one gym and switch between them in the app,
similar to Instagram's account switcher.

Example: Anandu buys a membership at Fitzone · Main Branch. Later he buys a plan at
Ipsum · Main Branch. The app now lists both gyms; he picks which one the app shows, and
can switch at any time.

## Terminology

The UI says **"gym"** ("Switch gym", "Your gyms"), never "profile". The person is
always the same — one account, one profile, copied to every gym they belong to. What
they hold is several memberships. "Switch profile" would read as "switch account".

## How it works today

- One GymBios account → one `members` row in each gym's own database, linked by
  `members.global_user_id`.
- The control-plane table `user_memberships` indexes which gyms hold a row for an
  account (one row per account per gym), so the app never has to query every gym.
- The app works in one gym at a time: every request carries `X-Tenant-ID` (the gym) and
  `X-Active-Branch-Id` (the branch the member's data is filtered to).

## What's built (different gyms)

**Backend**

- **The gym list.** `GET /api/mobile/profile/memberships` returns, per gym:
  `tenant_slug`, `active`, `gym_name`, `branch_id`, `branch_name`, `plan_name`,
  `status`, `expiry_date`. `GlobalMembershipService.findLinkedGyms` reads the account's
  members row in each indexed gym live; names come from `global_branch_discovery`,
  falling back to `tenants.name`. Index rows whose member was deleted are left out.
- **Status per gym:** ACTIVE, EXPIRED, INACTIVE (frozen, cancelled…), SUSPENDED,
  PENDING_APPROVAL, PAYMENT_REJECTED, or UNAVAILABLE (that gym's database couldn't be
  reached). The access gate wins over expiry, matching `TenantContextFilter`.
- **Notifications name their gym.** `ExpoPushClient` adds `tenantSlug` to every push.

**Mobile** (`src/domains/gymSwitcher`)

- **Picker at sign-in** (`ChooseGymScreen`): only when this device has no remembered gym
  for the account *and* the account has more than one gym. One gym opens directly;
  otherwise the last-used gym opens.
- **Switch gym** from the Profile Hub and from the line under the member's name in the
  header ("Gym · Branch ⌄"). Both appear only for members with more than one gym. The
  sheet lists every gym with branch, plan, status badge and end date, plus "Join another
  gym" → Centers.
- **Switching cleanly** (`switchGym`): sets the gym *and* its branch before anything
  reloads — a branch id left over from the previous gym would filter the new gym's data
  to the wrong branch — then opens Home and resets the whole query cache (very few
  cached queries are keyed by gym). For members, `BranchProvider` now always takes the
  branch from their member record at the active gym, never from the sign-in session.
- **Purchases:** buying a plan or a family plan at a gym switches to it through the same
  path (`enterPurchasedGym`) and refreshes the gym list.
- **Buying when already a member** (checked against the gym list before any payment):
  - *Same gym* (any branch): Centers shows a "Your gym" / "Member · Branch" badge and
    **Manage** instead of Subscribe; the detail page's button becomes "Manage my
    subscription". Choosing a plan there opens "You're already subscribed here" (or
    "…at another branch") → **Open my subscription**, which switches to that gym and
    opens Subscriptions to renew or change plan (`openMembershipAt`).
  - *Another gym, while holding a membership elsewhere*: before terms and payment, a
    "Join another gym?" sheet says it adds a separate membership and the current one
    stays. Asked once per visit to the center page.
- **Server guard:** the purchase's "already a member here" check now runs inside
  `withVerifiedPayments`, so a refused purchase whose card/UPI/net banking payment was
  already taken on the device is refunded. It's checked across all branches of the gym
  (native query, not branch-filtered) and answers 409
  `{ "code": "ALREADY_MEMBER", "branchId": 1, "status": "Active" }`; the app then shows
  the same "already subscribed" sheet and says the payment is being refunded.
- **Push:** the device registers its token with every gym the member belongs to and
  unregisters from all of them on sign-out. Tapping a notification from another gym
  switches to that gym first, then opens the screen.
- **Strings** in en, ar, de, es, fr, hi, zh; ml and ta fall back to English, as for the
  rest of their pending phases.

**Not built yet**

- The same-gym, other-branch case only explains that it isn't available yet — it
  waits on the decision below.

**To test on a device:** an account with memberships at two gyms. Fresh install →
picker; switch from header and Profile Hub → Home reloads with no flash of the old gym;
a push from the other gym → the app switches to it; sign out → pushes from both stop.

## Same gym, several branches — decision needed

**The question:** a member of Fitzone · Main Branch wants to use Fitzone · City Branch
too. How should that work?

### What the code assumes today

One member record per person per gym, enforced in several places:

- **Database:** `V58` creates `idx_members_global_user_id_unique ON members(global_user_id)`
  — a second row for the same account at the same gym fails on insert.
  `members.email` is also unique per gym (`V73`), and the referral tables are
  `UNIQUE (global_user_id)` per gym.
- **Code:** about 33 backend files load "the member" with
  `MemberRepository.findByGlobalUserId`, which expects exactly one row — dashboard,
  bookings, check-in, wallet, payments, receipts, freeze, add-ons, plan change,
  outstanding balance, referrals, reviews, ratings, enquiries, conversations, family,
  profile sync, push tokens, `TenantContextFilter`, and others.
- **Index and switcher:** `user_memberships` and `switchGym` work per gym, not per
  branch.
- **Plans** belong to one branch (`membership_plans.branch_id`). Nothing says a plan
  covers other branches.

Things already in our favour:

- Members may send any branch id; `BranchContextFilter` accepts it on purpose ("to view
  classes in other branches or check in").
- The branch header already decides which branch's classes and settings a request sees.
- **Caveat to check:** `Member` carries the Hibernate `branchFilter`. When a member
  views a branch other than their own, lookups of their own record may be filtered out.
  Confirm where `BranchFilterAspect` applies before building either option.

### Option A — one membership, several branches (recommended)

The member keeps **one** membership at the gym; their plan says which branches it
covers. In the app they switch branch, not gym.

| | |
|---|---|
| **Backend** | A "branch access" setting on each plan: home branch only / selected branches / all branches (one new table, e.g. `membership_plan_branches`). Check-in and bookings at a branch require the plan to cover it. Member lookups must ignore the branch filter (see caveat above). |
| **Web** | Branch access on the plan form; show it on the member page. |
| **Mobile** | A branch picker under the gym in the switcher sheet ("Gym → Branch"), shown only when the plan covers more than one branch. It changes only `X-Active-Branch-Id`. |
| **Unchanged** | One member card, one wallet, one referral code, one check-in quota, one row in reports. The ~33 `findByGlobalUserId` call sites stay as they are. |
| **Effort** | Roughly a week, mostly the plan setting and its enforcement. |
| **Doesn't cover** | Someone who wants two separately paid plans at one gym (e.g. off-peak at Main, full at City). Answer: upgrade to a plan that covers both, via the existing plan-change flow. |

### Option B — a separate membership per branch

The person can hold two (or more) independent memberships at the same gym, each with
its own plan and payments. In the app each appears as its own entry in the switcher.

| | |
|---|---|
| **Database** | Replace the unique index with one on `(global_user_id, branch_id)`; relax members' email uniqueness for the same account; rework the referral tables' uniqueness. Add `branch_id` to `user_memberships` and its uniqueness. |
| **Backend** | Every one of the ~33 `findByGlobalUserId` call sites must choose the record by branch (`findByGlobalUserIdAndBranchId`, driven by `X-Active-Branch-Id`). Purchase check becomes `existsByGlobalUserIdAndBranchId` (already exists). |
| **Mobile** | Switcher entries become (gym, branch); `switchGym` keys on both. |
| **Product questions it raises** | One wallet per person or per membership? Whose referral code? Is the 3-a-day check-in limit per membership or per person? Do the gym's reports count the person once or twice? Staff will see two member cards for one person — is that acceptable? |
| **Effort** | Several weeks across backend, web and mobile, plus a migration on every gym database. |

### Questions for the team

1. **Which option — A (one membership, plan says which branches) or B (separate
   membership per branch)?**
2. If **A**: do gyms set branch access **per plan** (some plans one branch, others all
   branches), or **per gym** (every plan covers every branch)? Per plan is more flexible;
   per gym is simpler for staff.
3. If **A**: when a member checks in at a branch their plan doesn't cover, refuse with
   a message, or allow it as a paid visit (day pass)?
4. If **B**: answers to the product questions in the Option B table — especially
   wallet, check-in limit and how reports count the person.
5. In both cases: what should the app show when a member tries to buy a plan at another
   branch of a gym they already belong to? (Today: "You're subscribed at another
   branch" with a link to their subscription.)

**Decision:** _pending_ — record it here, with the date and who decided, before work
starts.

## Decisions

1. **Same gym, second branch:** _pending_ — see the section above. Different gyms
   shipped first.
2. **Profile edits after purchase:** **Decided** in the global-accounts plan — the
   person owns their details; app edits are copied to every gym, staff edits copy back
   to the account (`MemberProfileSyncService`).
3. **UI wording:** **Decided** — "gym" ("Switch gym", "Your gyms"), not "profile".
4. **Default on app open:** **Decided** — last-used gym; the picker only when none is
   remembered on the device.
5. **Expired / cancelled memberships in the switcher:** **Decided** — shown, greyed
   with a status badge.
6. **Family seats:** a claimed family/couple seat is a members row linked to the
   account, so it appears like any other gym membership.
7. **Pending approval (Cash/Credit/Mixed):** **Decided** — shown with an "Awaiting
   approval" badge; switching there shows the locked state.
8. **Staff accounts:** **Decided** — out of scope. A person who is staff at one gym and
   a member at another isn't handled by the switcher.

## Relevant code

- Backend: `GlobalMembershipService.findLinkedGyms`, `MobileLinkedGymDTO`,
  `MobileProfileController` (`/memberships`), `ExpoPushClient`,
  `MobilePushTokenService`, `TenantContextFilter`, `BranchContextFilter`,
  `MemberRepository` (`findByGlobalUserId`, `existsByGlobalUserIdAndBranchId`),
  `MobileDiscoveryController` (purchase + 409), migration `V58` (unique global user id).
- Mobile: `src/domains/gymSwitcher` (`gymMembershipsApi`, `switchGym`,
  `ChooseGymScreen`, `GymSwitcherSheet`), `authStore` (`gymChoicePending`,
  `restoreActiveTenantForUser`), `auth/application/fetchLinkedGymChoice.ts`,
  `shared/providers/BranchProvider.tsx`, `RoleTabsLayout` (header),
  `ProfileHubScreen`, `notifications/` (push registration and deep links),
  `PlanPurchaseModal` (interim "already a member" sheet).
