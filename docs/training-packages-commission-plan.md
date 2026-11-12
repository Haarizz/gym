# Training Packages & Completion-Based Commission

Status: phases 1–2 and the web part of phase 3 built 2026-11-10 (migration V130), not yet released. Remaining: the mobile screens (§12.3). First release covers **PT only**. §9 explains how group classes plug in later.
Builds on: [performance-incentives-engine-plan.md](performance-incentives-engine-plan.md). The engine, ledger, incentive plans and settlements are reused as they are.

## 1. Goal

- A gym can sell a **PT package** to a member. It is either:
  - **session-based**: e.g. 15 sessions within 60 days, or
  - **day-based**: e.g. a 30-day plan, with unlimited sessions or a cap ("30 days, up to 20 sessions").
- The admin decides **when the trainer's commission counts**:
  - **On enrolment**: everything counts in the month the member pays.
  - **On completion**: it counts as the package is used, split across the months it actually takes.
- The trainer's incentive plan still decides **how much** (e.g. 10% of PT revenue). The package decides only **when**.

## 2. What exists today

| Piece | Today | Gap |
|---|---|---|
| `TrainingSession` (`type = 'pt'`) | One dated slot; members book and pay per slot | No package and no session counter |
| `AddonPlan` (category Training) | Price + validity in days | No session count, trainer or commission timing |
| `PT_SESSION_DELIVERED` metric | Count per booked PT session, credited to the trainer | Unchanged |
| PT revenue | Earns the trainer nothing (engine §3.2) | Solved by `PT_REVENUE` below |

## 3. Decisions

| # | Question | Decision |
|---|---|---|
| 1 | How a day-based package splits across months | **By days in each month** (pro-rata), not equal halves |
| 2 | Where the commission rate lives | **Trainer's incentive plan**: a `PT_REVENUE` line, `percent_of_amount`. The package sets only the timing |
| 3 | Commission for sessions unused at expiry (completion mode) | **Admin setting per package**: `forfeit` (default) or `pay_at_expiry` |
| 4 | Whether a member no-show uses up a session | **Admin setting per package**: `counts` (default) or `not_counted`. *To confirm with the user* |
| 5 | Day-based: unlimited sessions or a cap | **Both**. `session_cap` is optional on day-based packages |
| 6 | Scope | **PT only**. Group classes later (§9) |

### No-show setting (decision 4), in plain terms
A member books a PT slot and doesn't come. The trainer was there and lost that hour.
- `counts`: the member loses that session and the trainer gets that session's share. This is the usual PT rule and discourages skipping.
- `not_counted`: the member keeps the session and the trainer gets nothing for that slot.

Late cancellations can follow the same setting later if needed (out of scope).

## 4. Data model (migration V130)

```
training_packages                    -- the product, set up by admins
  id, branch_id NULL (= all branches), name, description,
  kind                ('pt'),               -- 'class' later (§9)
  plan_type           ('sessions' | 'days'),
  session_count       INT NULL,             -- required for 'sessions'
  session_cap         INT NULL,             -- optional cap for 'days'
  validity_days       INT NOT NULL,         -- 60 for "15 sessions in 2 months", 30 for a 30-day plan
  price               NUMERIC(10,2) NOT NULL,
  default_trainer_id  BIGINT NULL,
  commission_timing   ('enrolment' | 'completion'),
  unused_at_expiry    ('forfeit' | 'pay_at_expiry') DEFAULT 'forfeit',   -- completion only
  no_show_policy      ('counts' | 'not_counted')    DEFAULT 'counts',
  is_active, created_at, updated_at

package_enrolments                   -- one member's purchase
  id, branch_id, package_id, member_id, trainer_id,
  start_date, end_date,               -- end = start + validity_days - 1
  sessions_total INT NULL,            -- copied from the package at sale (NULL = unlimited)
  sessions_used  INT NOT NULL DEFAULT 0,
  price, amount_paid,                 -- amount_paid follows receipts (part payments)
  commission_timing, unused_at_expiry, no_show_policy,   -- frozen copies of the package settings
  status ('active' | 'completed' | 'expired' | 'cancelled'),
  receipt_id, completed_at, cancelled_at, created_at

package_trainer_changes              -- history, so shares are split correctly
  id, enrolment_id, from_trainer_id, to_trainer_id, effective_date, changed_by, created_at

bookings
  + enrolment_id BIGINT NULL          -- the package this booking used up
```

- The settings are copied onto the enrolment, so editing a package later never changes sales already made.
- A package is sold through the existing receipt flow (new receipt type `PT Package`), so cash, wallet, promos, approval and refunds work as they already do for add-ons.

## 5. Using a package

- When a member books a PT slot with that package's trainer, the booking is linked to their active enrolment (`bookings.enrolment_id`).
- A session is **used** when:
  - the booking is checked in, or
  - it is marked `no-show` and `no_show_policy = 'counts'`.
- Booking is refused when:
  - `sessions_used = sessions_total` (or the cap is reached), or
  - the slot is after `end_date`.
- The package ends at the first of: all sessions used (`completed`), the end date passing (`expired`, via the existing per-tenant cron), or a cancellation (`cancelled`).
- Mobile and web show progress: "Session 4 of 15 · ends 12 Jan", or "Day 9 of 30" for day-based.

## 6. Commission: new metrics and how they're recorded

New metrics, following the engine rule (`Metric` constant + `SourceDeriver` + web/mobile labels in 9 languages):

| Metric | Count | Amount | Credited to | When |
|---|:-:|:-:|---|---|
| `PT_PACKAGE_SALE` | ✓ | ✓ | The trainer on the enrolment | Payment date (money received) |
| `PT_REVENUE` | | ✓ | The trainer who earned that portion | Depends on `commission_timing` (below) |

`PT_PACKAGE_SALE` is for targets ("sell 10 packages"). `PT_REVENUE` is what incentive plans pay on.

A new `EnrolmentDeriver` (source type `enrolment`) writes `PT_REVENUE` events. Because the engine reconciles, any change (payment, check-in, trainer change, cancel) re-derives the enrolment and appends only the difference.

### 6.1 On enrolment
- One `PT_REVENUE` event per payment received, for the paid amount, on the payment date.
- Cancel or refund leads to a correction (clawback through the engine's existing rules).

### 6.2 On completion, session-based
- Per-session share = `amount_paid ÷ sessions_total`.
- One event per used session, dated at the session, credited to that session's trainer.
- Example: ₹15,000, 15 sessions, 10% rate. 9 sessions in January and 6 in February give ₹900 in January and ₹600 in February.
- At expiry with unused sessions:
  - `forfeit`: nothing more is paid.
  - `pay_at_expiry`: one event for `unused × share`, dated `end_date`, to the trainer at that time.

### 6.3 On completion, day-based
- Daily share = `amount_paid ÷ validity_days`.
- One event per calendar month the package covers, for `days_in_that_month × daily share`. Each is dated at the end of that month, or the end date if earlier.
- Example: ₹9,000, 30 days from 20 Jan, 10%. 12 days in January and 18 in February give ₹360 in January and ₹540 in February.
- Future months' events are written at sale. The engine only counts events up to now, so they show up as each month closes (the same mechanism sessions use today).
- The session cap doesn't affect money. It only limits bookings.
- Cancel: events for days after the cancel date are reversed. Days already passed stay earned.

### 6.4 Rules for both
- **Part payment:** shares use `amount_paid`. A later payment re-derives the events and tops up shares that have already been earned.
- **Trainer change:** days and sessions before `effective_date` stay with the old trainer; the rest go to the new one.
- **Refund after some use (completion mode):** earned shares stay. Only the unearned part is reversed.
- **Month locked:** a correction to an approved or paid month lands in the current month (engine clawback rule).
- `PT_SESSION_DELIVERED` keeps working unchanged, so a gym can still pay "₹150 per session" on top of, or instead of, a percentage.

## 7. Targets

- `PT_PACKAGE_SALE` count or amount, e.g. "10 packages / ₹1,50,000 this month".
- `PT_REVENUE` amount, e.g. "₹1,00,000 earned PT revenue".
- Decide during implementation: should `REVENUE_TOTAL` include `PT_PACKAGE_SALE` amount? (Suggested yes, since it's money received.)

## 8. Screens

**Web**
- Trainings & Classes: a new **Packages** tab where admins create and edit packages, with all the fields in §4 and the two policy settings explained inline.
- Member hub: sell a package (pick package, trainer, start date) through the receipt flow; a list of the member's enrolments with progress, trainer change and cancel.
- Booking dialog: shows which enrolment is used and how many sessions remain.
- Incentive plan editor: `PT_REVENUE` and `PT_PACKAGE_SALE` in the metric list. The Trainer template gets a `PT_REVENUE` % line.
- Events/audit trail: label enrolment events ("Session 4/15, Rahul", "Feb share, 18 days").

**Mobile**
- Member: "My packages" with progress; booking a PT slot picks the active enrolment automatically.
- Trainer: active clients with progress; the ledger shows PT revenue earned per month.
- Labels in all 9 languages.

## 9. Later: group classes

The model is generic on purpose. To add classes:

1. Allow `training_packages.kind = 'class'`, plus a `class_category` (e.g. Yoga) or a list of allowed class names.
2. `default_trainer_id` becomes optional or ignored. A class package isn't tied to one trainer.
3. Booking a class uses up the member's class enrolment the same way (§5).
4. **Commission:**
   - *On enrolment*: credited to whoever sold it (the processing staff), since there's no single trainer. Confirm then.
   - *On completion, session-based*: each attended class's share goes to **that class's trainer**, so several trainers can share one package.
   - *On completion, day-based*: no single trainer. Options: split each month's share by classes attended per trainer, or credit the seller. Decide then.
5. A new metric `CLASS_REVENUE` (mirrors `PT_REVENUE`) so gyms can pay class trainers differently from PT. `CLASS_PACKAGE_SALE` for targets.
6. Capacity: a class booking from a package still respects class capacity and waitlists.

Nothing in the PT release blocks this. Keep `kind` checks in one place (`EnrolmentDeriver`, booking linkage) so classes are an additive change.

## 10. Phases

1. **Packages & enrolments**: V130, package admin screen, selling through receipts, linking bookings, session counter, expiry cron, member hub views.
2. **Commission timing**: `PT_REVENUE` and `PT_PACKAGE_SALE` metrics, `EnrolmentDeriver`, backfill (none needed since there's no history), plan editor, audit labels, tests for every example in §6.
3. **Targets & mobile**: target metrics, member "My packages", trainer client list and ledger, 9-language labels.
4. **(Later) Group classes**: §9.

## 11. Open points

- Confirm decision 4's default (`counts`).
- Whether a member can hold two active PT packages at once (suggested: yes, used oldest first).
- Whether to allow freezing a package (pauses the end date). Not in the first release.

## 12. Implementation notes (2026-11-10)

### 12.1 What was built
- **Backend**:
  - V130: tables from §4, plus `performance_events.part`.
  - Entities `TrainingPackage`, `PackageEnrolment`, `PackageTrainerChange`.
  - Package `com.company.project.packages`: `TrainingPackageService`, `PackageEnrolmentService`, `PackageUsageService`, `TrainingPackageController`.
  - Ledger: `PackageEarnings` (pure, tested), `EnrolmentDeriver`, `AddonRedirect` / `SourceRedirect`.
  - Metrics `PT_PACKAGE_SALE` and `PT_REVENUE`.
- **API**:
  - `/api/training-packages`: CRUD and `toggle-active`.
  - `/api/package-enrolments`: list, `usable?member_id`, sell (POST), `{id}/trainer`, `{id}/cancel`.
- **Web**:
  - Trainings & Classes → **PT Packages** tab (catalogue and sold packages, change trainer, cancel).
  - Selling happens on Members → Add-ons: packages appear as Training cards, with a trainer picker and a start date.
  - The session roster shows which bookings used a package.
  - Metric labels; the Trainer plan template gets a 10% `PT_REVENUE` line.
- **Mobile**: metric labels in all 9 languages.

### 12.2 Deviations from the plan
- **Selling uses the add-on flow.** There is no new receipt type `PT Package`. The sale is a `member_addons` row (category Training) with a normal Add-on receipt, so the following already work:
  - wallet, referral reward and family billing
  - approval of mobile Cash/Credit payments
  - refund on cancel
  - receipt printing

  Cancelling the add-on anywhere (Add-ons screen or the package's Cancel) cancels the package and its upcoming unused bookings, then moves waitlisted members in. A package add-on can't be deleted.
- **Packages belong to a branch** (like add-on plans), not "NULL = all branches".
- **Only `active` and `cancelled` are stored.** Upcoming, completed and expired are worked out on read, so no expiry cron is needed. Sessions used are counted from linked bookings, never stored.
- **Day-based shares are dated at the first day each month covers**, not the month's end. The trainer sees the month's estimate during the month; cancelling corrects it.
- **Session-based shares go to the trainer who ran the session** (a substitute gets that session's share). The trainer-change history applies to day-based shares, the expiry payout and the sale.
- **The sale (`PT_PACKAGE_SALE`) is credited to the trainer the package was sold with.** It counts in `REVENUE_TOTAL` (§7's open question: yes).
- **One row can earn several credits for the same metric and person.** `performance_events.part` tells them apart (e.g. `d:2026-02`, `b:<booking id>`, `expiry`) and is part of the unique index.
- **Add-on changes reach the ledger** through `SourceRedirect`: touching an add-on reconciles the enrolment it was sold as.
- **Booking rules:**
  - A member's PT booking uses a fitting package automatically. The package with the session's trainer is preferred, then the one ending soonest.
  - The booking costs 0 and isn't charged.
  - `skip_package` books it on its own; `enrolment_id` picks a package.
  - Waitlist spots and Reward Pass bookings never use a package.
  - **An app booking that brings a payment** (card legs, wallet, code, or an expected amount) is charged as before and doesn't use a package. Otherwise a card already verified by Stripe would be dropped. Naming a package while paying is refused, and the wrapper refunds the card.

### 12.3 Still to do (phase 3, mobile)
- Member app:
  - "My packages" with progress.
  - Booking a PT slot: offer the package (`GET /api/package-enrolments/usable`), then book with `enrolment_id` and no payment. Until then the app keeps charging per slot, even for members with a package.
  - Buying a package in the app.
- Trainer app: active package clients with progress.
- Not built: `PackageEnrolmentService` has no mobile endpoints yet; freezing a package; two packages at once is allowed (the one ending soonest is used first).

## 13. Simplified PT flow and Targets & Commission rework (2026-11-11)

The flow, as agreed:

1. A member pays for PT: a package (add-on) **or** a normal paid PT session booking.
2. The trainer's **target** moves by the full amount on the payment date (`PT_SALE`, formerly
   `PT_PACKAGE_SALE`, renamed in V131). One-off paid PT bookings now count too, credited to the
   session's trainer via their "Class Booking" receipt, less refunds.
3. The trainer's **commission** = their % × that money (`PT_REVENUE` line, the only PT option
   in the UI). Package "On booking" (`enrolment`) → all at once; "On completion" → a share per
   session used, in the month it's used (day packages: by days per month). Single paid sessions
   → when the member pays. Timing stays on each package.
4. "Delivered" means one thing everywhere: checked in, or a no-show the package counts
   (`PT_SESSION_DELIVERED` now uses the same rule as package usage).

Web: Targets & Commission is now three tabs — **Setup** (one card per role: target, commission %,
bonus; per-person table, blank = role's value), **Team progress** (progress per person + a list
of what credited them from `GET /performance/events`, which now returns labels and per-item
commission; unassigned sales live here), **Payouts** (approval). The Advanced plan editor,
target scopes UI and plan versions UI were removed; plans/targets are still the storage
underneath. Settings the page doesn't manage show as "Older settings" with Remove.

Later, if a client asks: "₹ per session delivered" as one more line on the trainer card
(`PT_SESSION_DELIVERED`, `fixed_per_unit`) — the engine already supports it.
