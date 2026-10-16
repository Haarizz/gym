# Global Accounts for Gym-Created Members — Plan

**Status:** Proposed, not started. Interim fixes are in place (see "Interim fixes").
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

### 1. Invite instead of a staff-set password

Staff no longer set the member's app password. On **Add Member** (and **Give app
access** for an existing member), the backend sends an **invite** to the member's email:

1. **Email has no global account yet** → the invite link lets the member set their own
   password. The global account (`users`, `user_profiles` in the main DB) is created at
   that moment, already linked: `members.global_user_id` is set and the link is recorded
   in `user_memberships` (`GlobalMembershipService.recordLink`).
2. **Email already has a global account** (they use the app at another gym) → the
   invite asks them to sign in and confirm "Link your membership at <Gym>". Only then
   is the gym record linked to their account.

The family invitation flow already works like this (`MobileFamilyInvitationService`,
`FamilyInvitationDirectoryEntry`, claim endpoints) and should be reused.

Why not create the account silently with a staff-chosen password:

- Staff must never set or reset the password of an account the person created
  themselves (the code already refuses this: "Global mobile accounts manage their own
  credentials").
- A mistyped email would attach the membership — and its payments — to a stranger's
  account. Confirming from the inbox proves the email belongs to the member.

Until the invite is accepted, the member is an ordinary gym member with no app
access. Reception can resend the invite from the member's page.

### 2. Members without an email

Couple/Family dependents and minors can have no email (`members.email` is nullable),
but a global account needs a unique email. Options:

- **A.** No app login until an email is added (simplest).
- **B.** Phone-number login (needs OTP-by-SMS, which the app doesn't have today).
- **C.** Minors are reached through the guardian's account only.

Recommendation: **A** now, revisit **C** with the family features.

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
   - **Email not used by any global account** → create the global account, copying the
     password hash (same encoder) so their current password keeps working; copy the
     member's details into `user_profiles`; set `global_user_id`; record the link.
   - **Email already used by a global account** → don't merge automatically; send the
     "link your membership" invite from step 1.
   - **No email** → leave as is (see 2).
2. Remove the old gym login (`users` row in the gym DB) and its `user_directory` entry
   once the member is linked, so login goes through the global path.
3. Phones logged in with an old gym login must sign in once more (their token carries
   the gym user id).

Before running in production, produce a dry-run report per gym: how many members fall
into each group, and every email clash.

### 5. Staff tools on the web

These act on gym logins today and need the global-account versions:

| Today | After |
|---|---|
| Set app username/password on Add Member | Send invite |
| `setMemberCredentials` (reset password) | Resend invite / send password-reset email |
| `toggleMemberAccess` (`User.enabled`) | `setAppAccessEnabled` (already used for global members) |
| Member page shows "app username" | Show invite status: not sent / sent / accepted |

### 6. What gets simpler afterwards

- The duplicate-membership check at a gym becomes reliable: one `global_user_id` per
  person, email no longer the only guard.
- Buying at a second gym works for everyone and lands on the same account — the
  membership switcher plan then covers all members.
- Payment-approval blocking, rejection handling and Community access apply to every
  member the same way.
- The account-kind branches added by the interim fixes can be reduced to the global
  path (keep them until the migration report shows no gym-created logins left).

## Decisions needed

1. **Invite vs. auto-create.** Recommended: invite (section 1). Auto-create is only
   safe for emails with no existing account, and still lets staff choose the password.
2. **Members without email.** Recommended: no app login until an email is added.
3. **Profile edits by staff.** Recommended: staff edits to identity fields copy back to
   the global profile. Alternative: identity fields are read-only on the web once the
   member has accepted the invite.
4. **Existing gym-created logins.** Recommended: migrate with password hash copied;
   email clashes go through the invite. Alternative: leave them as they are and only
   use invites for new members (keeps two kinds of login indefinitely).
5. **Usernames.** Global login today accepts username or email. Recommended: invited
   members log in with email; keep existing usernames working during the migration
   (they're already unique across gyms through `user_directory`).

## Suggested implementation order

1. Invite backend: create/link global account on accept, `recordLink`, resend.
2. Web: Add Member sends the invite; member page shows invite status and resend.
3. Mobile: invite-accept screens (set password / sign in and confirm link).
4. Profile ownership sync (section 3), both directions.
5. Staff tool switch-over (section 5).
6. Migration: dry-run report on QA, review, then run on QA, then production.
7. After production shows no gym-created logins left, simplify the interim branches.

## Risks

- **Wrong email typed by staff** — mitigated by the invite: nothing links until the
  real owner accepts.
- **Email clashes during migration** — never merged automatically; reported and sent
  through the invite.
- **Forced sign-in** after migration — one-time; announce it to gyms beforehand.
- **Members without email** lose nothing they have today only if their existing gym
  login is kept; decide this together with decision 2.

## Relevant code

- Gym login creation: `MemberService.createMember` (app username/password branch),
  `MemberService.setMemberCredentials`, `MemberService.toggleMemberAccess`
- Login routing: `AuthService.login` (`user_directory` lookup → gym vs. global)
- Global account creation: `MobileAuthService.createVerifiedMember`
- Linking: `MemberService.linkGlobalUser`, `GlobalMembershipService.recordLink`,
  `UserMembershipBackfillRunner`
- Duplicate check: `MemberRepository.existsUnrejectedMembership`
- Cross-gym purchase check: `GlobalMembershipService.hasPurchaseInAnotherGymSince`,
  `MemberService.isSupersededRejection`
- Approval gate: `TenantContextFilter` (pending-approval block for global users)
- Invite flow to reuse: `MobileFamilyInvitationService`, `MobileFamilyClaimController`
- Photo sync pattern: `MemberPhotoSyncService`
- Interim fixes: `MobileProfileService`, `MobileDiscoveryController`,
  `MobileFamilyPurchaseController`, `MobileReferralService`, `V95__referral_codes_belong_to_members.sql`
