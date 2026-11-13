# Membership Cancellation

Status: built 2026-11-13 on `changes_anandu` (not committed). Migrations V139 and V140.
The wallet question (section 7) is still open.

This document records what was asked for, the questions raised along the way, what was
decided, and what was built.

---

## 1. What was asked

- A **Cancel membership** option in the Members page action menu, and the same button on
  the member profile page.
- Clicking it shows a **warning**, then a **review** of the member: how many days they
  subscribed, days checked in, add-ons bought, classes booked and so on.
- Two choices:
  - **Cancel without refund**: the membership is cancelled, everything is removed, and the
    member leaves the gym.
  - **Cancel with refund**: go to the Refunds page, where a modal shows how much can be
    refunded, with 100% / 75% / 50% / 25% options. Refunds follow the gym's policy.
- A member who **owes money** must clear the dues first. Open question from the request:
  is suspending them until then the right approach, or is there something better?

---

## 2. Decisions

| Question | Decision |
|---|---|
| What does "removed from the gym" mean? | **Archive, never delete.** Status becomes Cancelled; the record, bills, refunds and ledger are kept. Hard delete would break statements, refund vouchers and the accounts. |
| Dues: is suspension the right tool? | **Not on its own.** A member who never pays would stay suspended forever. Staff choose one of four options (section 4). |
| How strict is the refund policy? | **The policy is the maximum.** 100/75/50/25% are percentages of the policy amount; staff can never refund more. |
| A family head with dependents? | **The whole family is cancelled together**, with one combined refund. |
| Does the member lose their app account? | **No.** See section 6. The account belongs to the person; only this gym's membership ends. |
| Wallet balance? | **Open.** See section 7. |
| Approval Required? | **Built.** Admins and Managers approve; see section 8. |

---

## 3. The flow

**Entry points**
- Members list: action menu, then **Cancel membership** (shows **Finish cancellation** when on hold).
- Member profile: **Cancel membership** button. This replaced the old **Deactivate**
  button, which only set the status to inactive and saved a note.

**Step 1: warning.** What will happen: the membership ends today; check-in and face access
stop; upcoming bookings, add-ons and PT packages are cancelled; the app shows the gym as
cancelled; dues must be settled first. Shows a family banner when a family head is
cancelled, and a hold banner or approval banner where those apply.

**Step 2: review**, for every person being cancelled:
- time as a member and the date they joined
- days subscribed in the current period (used / left, with a progress bar)
- days checked in this period, all-time check-ins, and the last visit
- classes attended, upcoming bookings (marked when paid), and add-ons bought
- PT packages (sessions used / total) and wallet balance

It also lists unpaid dues, shows the refund the policy allows, and asks for a reason (from
GymOS › Deactivation reasons) and optional notes.

**Step 3a: Cancel without refund.** A confirm step lists exactly what happens, with an
"I understand" checkbox.

**Step 3b: Cancel with refund.** Opens **Billing › Refunds** (`/billing?tab=refunds&cancel=<id>`)
with a modal showing:
- every refundable bill, with what the policy gives back on each and why ("12 of 30 days
  unused", "Not started yet", "Period finished", "Session not held yet")
- the cancellation fee, when the policy uses one
- 100 / 75 / 50 / 25% buttons, or a typed amount capped at the policy total
- refund method (Cash, Card, Bank Transfer, Online) with bank account and reference
- the reason for leaving and the refund reason

The refund is split across the bills in proportion; each bill gets its own refund voucher,
posted to the ledger. Vouchers can be printed at the end.

**What cancellation does**
- `membership_status = cancelled`, and the end date is cut to today.
- Upcoming bookings are cancelled; seats go to the waitlist and unapproved booking payments are voided.
- Running add-ons and PT packages are cancelled.
- Without a refund, any still-deferred membership revenue is recognised now (the gym keeps the fee).
- A note is saved on the member, the app user is notified, and a `member_cancellations` row is recorded.
- Face devices drop the member on their next sync.
- Cancelled members are hidden from the Members list, but appear under the **Cancelled**
  filter and in name / ID / phone search.

**Rejoining.** Renewing a cancelled member (Renewals, or Renew Family for a household)
reactivates the **same record**, with the same history, app link and wallet.

---

## 4. Dues

When a member owes money, staff choose one of four options:

1. **Collect now.** Opens Billing › Pending Payments filtered to the member. Take the
   payment, then open Cancel membership again.
2. **Take it from the refund.** Only offered when the refund covers the dues. The dues are
   paid out of the refund, so only the difference leaves the till.
3. **Write it off.** Uses the existing write-off and appears in Write-off History.
4. **Put on hold.** The membership is suspended (no entry, no bookings) until the dues are
   paid or written off. The member **can still pay the dues** while on hold.
   - Without a refund, the cancellation **finishes by itself** once nothing is owed.
   - With a refund, staff finish it from the member's page.
   - Staff can withdraw a held cancellation, which lifts the suspension.

An unpaid, auto-raised **Expiry Due** bill is simply cancelled: it is a renewal the member
will never use.

---

## 5. Refund policy (GymOS › Member Deactivation Policy)

The settings card used to say "Saved, but not applied". It now drives cancellations.

| Setting | Effect |
|---|---|
| Allow Deactivation | Off = Cancel membership is blocked. |
| Allow Refund | Off = only Cancel without refund is offered. |
| Refund Method: **Pro-rated** | Current period: unused days ÷ total days × amount paid. Not started: full amount. Finished: nothing. |
| Refund Method: **Flat Fee** | Current and future bills in full, less the **Cancellation fee** (new setting). |
| Refund Method: **No Refund** | Same as Allow Refund off. |
| Approval Required | See section 8. |

These apply to add-ons too (by their own dates). A class booking is fully refundable
until the session is held.

---

## 6. The app account

**Question raised:** the app account is the person's own. Community and the gym centers
are public. Should cancelling clear their app account link?

**Answer: no, and the first build was changed.**
- Community and gym search never depended on the gym membership: they stay open to every
  signed-in account. Liking and commenting already needs an active membership at *some* gym.
- Clearing the link lost the member's history at the gym, made the gym vanish from their
  switcher with no explanation, and made an in-app rejoin create a **second** member record.

**Now:**
- The link stays. The member's access state at that gym becomes **Cancelled**
  (`MemberAccessState.CANCELLED`).
- The gym switcher shows the gym as **Cancelled**.
- Opening that gym shows a **Membership Cancelled** screen: the reason, their payment
  history at the gym, and buttons to Community and Browse Gyms.
- The server lets a cancelled member *read* their membership summary, payments and
  receipts. Everything else at that gym (bookings, check-in, freezes, wallet, purchases)
  is refused.
- Trying to buy a plan there again shows "Your membership here was cancelled. Contact the
  gym to rejoin." The gym renews them on the same record.
- Translated into English, Arabic, German, Spanish, French, Hindi and Chinese. Malayalam
  and Tamil fall back to English, as those translations don't cover these screens yet.

---

## 7. Wallet balance (open, to be decided)

> **Gap.** Not decided yet.

What we know:
- The wallet balance lives on the member's record **at that gym**, not on the app account.
  It can only be spent at that gym.
- A cancelled member can't spend it until they rejoin. Since the record is kept, the
  balance is still there if they come back.
- Cancellation refunds can't go to the wallet (only Cash, Card, Bank Transfer, Online).
- The cancel screens warn staff when there's a wallet balance; nothing is paid out.

Options discussed:
- **Pay it out** at cancellation (cash, card or bank), with its own voucher and ledger entry.
- **Keep it** for if they rejoin.
- Should promotional credit (rewards) be treated differently from money the member paid in?

Decision: _to be filled in_

---

## 8. Approval Required

When GymOS › Member Deactivation Policy › **Approval Required** is on:
- **Admins and Managers** (roles Admin, Super Admin, GymBios Admin, Manager) cancel directly.
- **Everyone else** sends a request. The same checks run first (policy cap, refund method,
  dues choice), so a request can't be approved into an error. Nothing changes for the member yet.
  - Admins and Managers are notified.
  - The request appears in **Approvals › Cancellations**: who asked, the reason, the refund
    and method, what the policy allows, the dues choice, and the amount to be paid out.
  - **Approve** carries out exactly what was requested, including the refund.
  - **Reject** needs a reason, which is saved as a note on the member.
  - Only one request can wait per member. The requester can withdraw it from the Cancel
    membership dialog.
- A held cancellation that clears its dues becomes a request instead of finishing on its own.
- Putting a cancellation on hold does not need approval (nothing is cancelled yet).

**To turn it on:** GymOS › Member Deactivation Policy › switch on **Approval Required** › Save.

---

## 9. Technical reference

**Backend**
- `MembershipCancellationService`: review, cancel, cancel with refund, hold, approval.
- `MembershipCancellationController`: `/api/members/{id}/cancellation` (GET review, POST cancel, POST / DELETE hold).
- `MembershipCancellationRequestController`: `/api/members/cancellation-requests` (list, can-approve, approve, reject, withdraw).
- `MemberRefundController`: `POST /api/billing/refunds/cancellation/{id}`, needs Billing write access.
- `MemberAccessState.CANCELLED`, plus `TenantContextFilter` read-only paths for cancelled members.
- `MemberSuspension.requireCanPayDues`: members on hold can pay their dues.
- `MemberService.rejoinIfCancelled`: renewal reactivates the record.
- V139: cancellation fields on `members`, the `member_cancellations` table, the `cancellation_fee` setting.
- V140: the `member_cancellation_requests` table; drops the no-longer-used `cancelled_global_user_id`.

**Web:** `CancelMembershipDialog`, the cancellation refund modal in `refunds.tsx`,
`CancellationRequestsPanel` (Approvals), the GymOS policy card, the Members list
filter and menu, and the profile banner.

**Mobile:** `MembershipCancelledScreen`, `MemberApprovalGate`, the `CANCELLED` status in the
gym switcher, and `AlreadyMemberSheet`.

**Tests:** `MembershipCancellationServiceTest` (22), `MemberAccessStateCancelledTest` (3).

---

## 10. Follow-ups

- [ ] Wallet decision (section 7).
- [ ] Rejoin from the app itself (today it's at the desk). This would mean letting a
      cancelled member use the in-app plan change on their existing record.
- [ ] A cancellation report (counts, reasons, refunds), from `member_cancellations`.
- [ ] Malayalam and Tamil translations for the new mobile strings, when those languages
      reach these screens.
