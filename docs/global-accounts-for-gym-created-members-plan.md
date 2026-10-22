# Global Accounts for Gym-Created Members — Plan

**Status:** Proposed, not started. Interim fixes are in place (see "Interim fixes").
Membership suspension (section 5) is agreed and goes first.
**Scope:** Gym-backend (tenant DBs, main DB, control plane), Gym-frontend (Add Member,
member details), GymBios-Mobile (login, invite claim).
**Related:** [mobile-multi-membership-switcher-plan.md](mobile-multi-membership-switcher-plan.md)
— this plan is what lets gym-created members take part in it.

## Goal

Every member who uses the app has **one global account**, whether they signed up in
the app or reception added them on the web. When staff create a member, that member's
gym record is linked to a global account from the start (`members.global_user_id`),
exactly like a member who bought their plan in the app.

Result: one kind of member account, one identity across gyms, and every mobile
feature (profile, purchases, referrals, reviews, Community, multi-gym) works the
same way for everyone.

**Principle: the account belongs to the person, not to a gym.** GymBios is an
independent app — anyone can sign up, browse Community and find gyms without being a
member anywhere. A gym never grants or removes access to the app. What a gym controls
is the *membership* it holds for that person. Staff can help someone create their
account at the desk (section 1), but once created it is the person's: no gym can edit,
reset or disable it. A gym can only suspend its own membership (section 5).

## The problem today

There are two kinds of member login, with **different id spaces**:

| | App-registered (global) | Gym-created |
|---|---|---|
| Created by | The member, in the app | Staff, on the web (Add Member → app username/password) |
| Login account lives in | Main DB `users` (global id) | The gym's own DB `users` (gym id) + `user_directory` entry |
| Linked to the gym record by | `members.global_user_id` | `members.user_id` |
| Listed in `user_memberships` (cross-gym index) | Yes | No |

The same number means different people in the two spaces (gym user 7 ≠ global user
7). Mobile features were built for global accounts, and each one has had to be
taught about gym-created logins separately. Where that was missed, we got bugs:

- **Profile split** — the app kept its own copy of a gym-created member's details,
  never filled from the gym record and never written back. Seen on QA: member
  "tinu t" showed as "Yash" in the app.
- **Purchases** — Discover purchase and new family purchase treated the gym user id
  as a global id: they failed, or could link the new membership to a stranger whose
  global id had the same number.
- **Referrals** — codes were filed under the gym user id read as a global id: rewards
  went nowhere or to the wrong person, and two people could share one code.
- **Reviews** — a gym-created login was looked up by global id and could post as
  another member.

### Multiple memberships and paying at another gym

These are the problems this plan removes outright rather than patching:

- **Duplicate membership at the same gym.** Before an app purchase, the gym is checked
  for an existing membership by `global_user_id` **or email**
  (`MemberRepository.existsUnrejectedMembership`). A gym-created record has no
  global id, so only the email protects it. If reception typed a different email, or
  none, the same person can buy the same gym's plan again in the app and **pay twice
  for two memberships**.
- **Can't join or pay at a second gym.** A gym-created login can't buy another gym's
  plan from the app; it is refused with a message (interim guard). With a global
  account they could, and it would simply become a second membership on the same
  account.
- **Payment approval and rejection rules depend on the global id.** The "payment
  awaiting approval" block (`TenantContextFilter`, per gym, by `global_user_id`) and
  the "was this rejected purchase replaced elsewhere?" check
  (`MemberService.isSupersededRejection` → `GlobalMembershipService.hasPurchaseInAnotherGymSince`)
  only work for linked members. Gym-created members fall outside both.
- **No cross-gym view.** `user_memberships` only lists global accounts, so
  gym-created members are invisible to Community access checks, gym recovery after a
  reinstall, and the planned membership switcher.

### Blocking a member locks the wrong thing

The **App Access** toggle on the web member page (`MemberService.toggleMemberAccess`)
behaves differently per account kind, and neither matches the principle above:

- **Gym-created login** — sets `users.enabled = false`, so the member can't sign in
  at all, and loses Community and gym discovery too.
- **Global account** — sets `members.app_access_enabled = false`. Sign-in works and
  `TenantContextFilter` refuses that gym's member endpoints, but the app's
  `MemberApprovalGate` only recognises a *pending* or *rejected* payment, so it opens
  the home screen and every call on it fails with "Membership payment is awaiting
  approval". The web card also hides the toggle for these members (it requires
  `user_id`), so staff can only block them from the mobile admin screens.

Underneath, `app_access_enabled` does two jobs: the staff toggle **and** the
Cash/Credit/Mixed payment-approval lock (set `false` on purchase, set back to `true`
by `approveMemberPayment` and renewal approval). Approving a payment would therefore
silently undo a staff block.

## Interim fixes (already done)

These keep gym-created logins safe until this plan lands, and stay as a fallback
afterwards:

- My Profile reads and writes the gym record for gym-created logins
  (`MobileProfileService`), and login no longer sends them through profile completion.
- Discover purchase and new family purchase refuse gym-created logins with a clear
  message (`MobileDiscoveryController`, `MobileFamilyPurchaseController`).
- Referral codes belong to the member record, not a user id (`V95`,
  `MobileReferralService`).
- Reviews and Community look the member up by account kind.

## Proposed design

### 1. Staff-assisted sign-up, then the account is the person's

Staff keep the ability to set a username and password — for members who can't or
won't sign up themselves (e.g. an elderly member who asks reception to "set up the
app"). What changes is *what* they create: a **global GymBios account**, the same kind
as an in-app sign-up, not a gym login.

**Creating a new account** — on **Add Member**, or **Create app account** on an
existing member's page:

1. Staff enter a username, password and (optionally) an email.
2. The backend checks the username and email against all global accounts.
3. If neither is taken, it creates the global account (`users`, `user_profiles` in the
   main DB, via `MobileAuthService.createVerifiedMember`) and links it straight away —
   the person is at the desk: `members.global_user_id` is set and the link is recorded
   in `user_memberships` (`GlobalMembershipService.recordLink`).
4. A staff-entered email starts **unverified**; a verification email is sent, and
   password reset only ever goes to a verified email (section 2). A mistyped email
   therefore can't be used by a stranger to take the account over.

**Linking an existing account** — if the username or email already belongs to a
global account (they already use the app, perhaps at another gym), staff can't create
or change anything. They use **Link existing account**: the person confirms "Link your
membership at <Gym>" in their own app (or signs in on the gym's device). Only then is
the gym record linked. The family invitation flow already works like this
(`MobileFamilyInvitationService`, `FamilyInvitationDirectoryEntry`, claim endpoints)
and should be reused.

**After creation the account belongs to the person, permanently:**

- Staff can't change its username or password, reset it, or disable it. Only the
  person changes their password, in the app (the code already refuses staff changes
  to global accounts: "Global mobile accounts manage their own credentials").
- Nothing that happens to a membership touches the account — suspension, expiry,
  freeze, payment rejection, or deleting the member record. Those only change what
  that gym's membership gives access to (section 5).
- The member page shows **App account: linked (username)** — no toggle, no edit.

A member with no linked account is just a gym member; the person can still sign up in
the app themselves and be linked later.

### 2. Members without an email, and forgotten passwords

**Email is optional on global accounts.** Elderly members, dependents and minors
often have none (`members.email` is nullable), but main-DB `users.email` is
`NOT NULL UNIQUE` today. A main-DB migration makes it nullable (still unique when
present); username stays required and unique. Such accounts sign in with username
and password only. Minors reached through a guardian's account is revisited with the
family features.

**Forgotten password: self-service by email only.**

- Accounts with a **verified email** reset their own password from the login screen
  (a mobile forgot-password flow — not present today, to be built).
- Accounts **without** a verified email can't self-reset; they go to **GymBios
  support**, never the gym. Support verifies identity and resets it.
- Gym staff never reset a global account's password, even with the person present.

When staff create an account without an email, the screen warns that the person won't
be able to recover a forgotten password themselves and suggests adding one.

### 3. Who owns the profile

With one global account, there is still a gym record per gym. The rule:

- **The person owns their identity:** name, phone, photo, date of birth, gender,
  nationality, emergency contact, health details. These live on the global profile.
- **App edits are copied to every gym** the member belongs to, the way photos already
  are (`MemberPhotoSyncService.syncToAllGyms`).
- **Staff edits on the web** to those same fields are copied back to the global
  profile, so reception can still correct a typo.
- **Gym-only fields** (plan, fees, payments, notes, branch, status) never leave the gym.

### 4. Moving existing gym-created logins

A one-time migration per gym, safe to re-run:

1. For each member with `user_id` set and no `global_user_id`:
   - **Email and username not used by any global account** → create the global
     account with the same username, copying the password hash (same encoder) so their
     current login keeps working unchanged; copy the member's details into
     `user_profiles`; set `global_user_id`; record the link. The email is marked
     unverified (it was typed by staff).
   - **No email** → same, with no email (section 2).
   - **Email or username already used by a global account** → don't merge
     automatically; send the "link your membership" confirmation from section 1.
     If only the username clashes, the member keeps their gym login until they confirm.
2. Remove the old gym login (`users` row in the gym DB) and its `user_directory` entry
   once the member is linked, so login goes through the global path.
3. Phones logged in with an old gym login must sign in once more (their token carries
   the gym user id).

Before running in production, produce a dry-run report per gym: how many members fall
into each group, and every email or username clash.

### 5. Membership access vs. the account

A gym can **suspend a membership**; it can never lock the account. This is
independent of the migration and ships first (implementation step 0).

**Separate state for suspension.** New member fields `membership_suspended`,
`suspended_reason`, `suspended_by`, `suspended_at`, written only by the new
Suspend / Resume staff actions — never by payment approval. Payment gating keeps
using `approval_status`. The backend derives one per-gym `access_state`:

| `access_state` | From | Checked |
|---|---|---|
| `SUSPENDED` | `membership_suspended = true` | first — wins over everything |
| `PENDING_APPROVAL` | `approval_status = 'PENDING'` | |
| `PAYMENT_REJECTED` | `approval_status = 'REJECTED'`, not superseded (`isSupersededRejection`) | |
| `ACTIVE` | anything else | |

`app_access_enabled` stops gating members; it's dropped once all readers use
`access_state`. The migration that adds the new fields sets
`membership_suspended = true` where `app_access_enabled = false` with no pending or
rejected approval (those can only have come from the staff toggle), and re-enables
the `users` rows that `toggleMemberAccess` disabled.

**What a suspended (or pending / rejected) member keeps and loses:**

| Keeps — never gated by a gym | Loses — at that gym only |
|---|---|
| Sign-in, profile | Home dashboard |
| Community (reading; posting via another gym where active) | Bookings, check-in, workouts |
| Gym centers / Discover / catalog | Membership details, payments, wallet |
| Memberships at other gyms | Offers, team |
| `/api/members/me`, push tokens, notifications | |

**Enforcement.**

- `TenantContextFilter` resolves the member for both token kinds (`global_user_id`
  for global, `user_id` for gym-created logins) and refuses member endpoints unless
  `access_state = ACTIVE`, returning the state as an error code instead of the
  current fixed "awaiting approval" message. Gym-independent paths (auth, profile,
  discovery, Community) are untouched.
- `/api/members/me` returns `access_state` and `suspended_reason`.
- Mobile: `MemberApprovalGate` / `isMemberAccessLocked` switch on `access_state`
  rather than inferring it from flags, with a new **Membership suspended** screen
  (gym name, reason, "contact reception", links to Community and Gyms).
- Web: the member page's **App Access** card becomes **Membership access —
  Active / Suspended**, with Suspend (asks for a reason) and Resume, shown for every
  member regardless of account kind.

### 6. Staff tools on the web

These act on gym logins today and need the global-account versions:

| Today | After |
|---|---|
| Set app username/password on Add Member (gym login) | Same fields, creates a **global** account and links it (section 1) — only if username/email are free |
| — | **Link existing account** — person confirms in their app |
| `setMemberCredentials` (staff change username/password later) | **Removed.** Only the person changes their password; forgotten passwords go through email reset or GymBios support (section 2) |
| `toggleMemberAccess` (`User.enabled`) | Suspend / resume membership (section 5) — never touches the account |
| Member page shows "app username" | **App account:** not linked / awaiting confirmation / linked (username), plus **Membership access:** active / suspended |

### 7. What gets simpler afterwards

- The duplicate-membership check at a gym becomes reliable: one `global_user_id` per
  person, email no longer the only guard.
- Buying at a second gym works for everyone and lands on the same account — the
  membership switcher plan then covers all members.
- Payment-approval blocking, suspension, rejection handling and Community access
  apply to every member the same way; the `user_id` lookup in `TenantContextFilter`
  goes away.
- The account-kind branches added by the interim fixes can be reduced to the global
  path (keep them until the migration report shows no gym-created logins left).

## Decisions needed

1. **How staff give app access.** Decided: staff-assisted sign-up — staff set a
   username and password, which creates a global account linked at once; existing
   accounts are linked only with the person's confirmation (section 1).
2. **Members without email.** Decided: email is optional on global accounts;
   username + password login (section 2).
3. **Forgotten passwords.** Decided: self-service reset to a verified email; accounts
   without one go to GymBios support, never the gym (section 2).
4. **Who controls the account after creation.** Decided: the person. Staff can't
   edit, reset or disable it; no membership status affects it (sections 1, 5).
5. **What a gym can block.** Decided: a gym can only suspend its own membership
   (section 5); it can never lock the person's account or their access to Community,
   gym discovery or other gyms.
6. **Profile edits by staff.** Recommended: staff edits to identity fields copy back to
   the global profile. Alternative: identity fields are read-only on the web once the
   account is linked.
7. **Existing gym-created logins.** Recommended: migrate with username and password
   hash copied; clashes go through link confirmation. Alternative: leave them as they
   are and only create global accounts for new members (keeps two kinds of login
   indefinitely).
8. **Usernames.** Global login accepts username or email. Recommended: keep it so;
   migrated usernames keep working (they're already unique across gyms through
   `user_directory`, but must also be checked against global usernames).

## Suggested implementation order

0. Membership suspension (section 5) — backend fields, migration and filter; mobile
   gate and suspended screen (all 9 locales); web Membership access card. Independent
   of the steps below and ships first.
1. Backend: main-DB migration making `users.email` nullable plus an email-verified
   flag; staff-assisted global account creation + `recordLink`; link-existing-account
   request and confirm; forgot-password by verified email.
2. Web: Add Member / Create app account create the global account; Link existing
   account; member page shows app account status (no edit, no reset).
3. Mobile: confirm-link screen; forgot-password screens; email verification.
4. Profile ownership sync (section 3), both directions.
5. Staff tool switch-over (section 6).
6. Migration: dry-run report on QA, review, then run on QA, then production.
7. After production shows no gym-created logins left, simplify the interim branches.

## Risks

- **Wrong email typed by staff** — the email stays unverified and password reset only
  goes to verified emails, so the stranger who owns that address can't take the
  account over. An existing account is never linked without its owner confirming.
- **Email or username clashes during migration** — never merged automatically;
  reported and sent through link confirmation.
- **Forced sign-in** after migration — one-time; announce it to gyms beforehand.
- **No-email accounts can't self-recover** — support load for forgotten passwords;
  staff are prompted to add an email at creation.
- **Suspension backfill guesses intent** — rows with `app_access_enabled = false` and
  no pending/rejected approval are assumed staff-blocked. List them per gym in the
  migration log so reception can resume any that are wrong.

## Relevant code

- Gym login creation: `MemberService.createMember` (app username/password branch),
  `MemberService.setMemberCredentials`, `MemberService.toggleMemberAccess`
- Login routing: `AuthService.login` (`user_directory` lookup → gym vs. global)
- Global account creation: `MobileAuthService.createVerifiedMember`; main-DB
  `User` entity (`email` currently `nullable = false, unique = true`)
- Linking: `MemberService.linkGlobalUser`, `GlobalMembershipService.recordLink`,
  `UserMembershipBackfillRunner`
- Duplicate check: `MemberRepository.existsUnrejectedMembership`
- Cross-gym purchase check: `GlobalMembershipService.hasPurchaseInAnotherGymSince`,
  `MemberService.isSupersededRejection`
- Approval gate: `TenantContextFilter` (pending-approval block for global users),
  `/api/members/me` (`MemberController.getMyMembership`); mobile
  `MemberApprovalGate`, `useMembershipApprovalStatus`
- Access flag writers: `MemberService.toggleMemberAccess` / `setAppAccessEnabled`,
  `approveMemberPayment`, `MobileDiscoveryController.purchaseMembership`,
  `MobileFamilyPurchaseService`
- Web access card: `Gym-frontend/src/components/shared/member-detail.tsx`
- Invite flow to reuse: `MobileFamilyInvitationService`, `MobileFamilyClaimController`
- Photo sync pattern: `MemberPhotoSyncService`
- Interim fixes: `MobileProfileService`, `MobileDiscoveryController`,
  `MobileFamilyPurchaseController`, `MobileReferralService`, `V95__referral_codes_belong_to_members.sql`
