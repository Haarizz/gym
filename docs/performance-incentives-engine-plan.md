# Performance & Incentives Engine

Status: phases 1–5 implemented 2026-11-05, not yet released. Phase 6 (removing the old tables and endpoints) follows in a later release.
Replaces: `CommissionRule`, `StaffTarget`, the commission/target logic in `StaffProgressCalculator`, and the copies in the mobile ledger, performance and dashboard services.

## 1. Goal

One module decides **what each staff member or trainer did in a period**. Two things are built on that single answer:

- **Targets**: goals per metric ("12 admissions", "₹80,000 POS sales", "40 PT sessions").
- **Incentives**: commission and bonuses per metric ("5% of admission revenue", "₹150 per PT session", "+₹2,000 at 110% of target").

The web targets pages, payroll, the mobile ledger, mobile performance and the dashboards all read from this module. None of them calculates anything on its own.

## 2. What was wrong, and what fixed it

| # | Problem | Fix |
|---|---------|-----|
| 1 | `target_bonuses_json` was shown on mobile but never calculated or paid | Bonuses are part of incentive plans and are paid through the same approval as commission (§5.2) |
| 2 | The mobile ledger recalculated commission live and ignored `commission_earnings` | Decided months return the frozen settlement everywhere, phone included (§6) |
| 3 | Sales were matched to staff with `processedBy LIKE '%name%'` | Staff IDs on source rows; exact, unique matches only (§4.1) |
| 4 | A role with no rule silently earned 5% | No plan, no commission; the UI says "No incentive plan" |
| 5 | "Memberships" meant different things for targets and commission | Each metric has one definition (§3); `REVENUE_TOTAL` is the sum of revenue metrics |
| 6 | Rules were keyed by role across the gym, with no history | Plans are per branch or all branches, versioned by month |
| 7 | The commission formula existed in 4 copies | One `IncentiveCalculator` |
| 8 | Stale `*_achieved` columns were used as a floor; `PATCH /achievement` | Floor logic and the endpoint are removed; the columns go in Phase 6 |
| 9 | Revenue target fallback copied in every screen | One target resolver (§5.1) |
| 10 | Quarterly/yearly targets could be saved but only monthly was read | Monthly only; old non-monthly targets converted to their first month and reported |
| 11 | ~8–10 queries per staff member per month | About four queries per evaluation, whatever the staff count |

## 3. Metrics

Every activity that can count toward a target or earn an incentive is a **metric** with a fixed code (`performance/metric/Metric.java`). A metric measures a **count**, an **amount** (money), or both.

### 3.1 In this release (core metrics)

| Metric | Source | Count | Amount | Credited to |
|--------|--------|:-----:|:------:|-------------|
| `MEMBER_ADMISSION` | Receipt `transactionType = New`, status Paid or Partial | ✓ | ✓ | Whoever processed the receipt (staff or trainer) |
| `LEAD_CONVERSION` | Lead with status `converted` | ✓ | | The lead's assignee |
| `POS_SALE` | `SaleTransaction` with status `COMPLETED` and a net amount above 0 | ✓ | ✓ | The cashier |
| `PT_SESSION_DELIVERED` | PT `TrainingSession`, not cancelled, with at least one active booking | ✓ | | The session's trainer |
| `CLASS_TAUGHT` | Non-PT, non-facility session, not cancelled, with at least one active booking | ✓ | | The session's trainer |
| `CLASS_ATTENDEE` | Checked-in active bookings on those classes | ✓ | | The session's trainer |
| `REVENUE_TOTAL` | Virtual: sum of the amounts of `MEMBER_ADMISSION` and `POS_SALE` | | ✓ | (computed) |

Details:
- **Money basis**: money received, not invoiced. A part-paid receipt counts its paid portion.
- **Mobile Cash/Credit/Mixed payments** count once reception approves them (approval status not `PENDING` or `REJECTED`).
- **POS**: net of refunds. A fully refunded (`REFUNDED`) or voided sale earns nothing. Items sold are not counted.
- **Active booking**: status not `cancelled`, `pending_approval` or `waitlisted`.
- **Lead conversion date**: `last_contact_date`, else `updated_at`, else `created_at`. Count only: the member's first payment is already credited as an admission.

### 3.2 Not in this release

The first release deliberately counts the core metrics only. These were proposed and can be added later:

| Metric | Source | Why it was proposed |
|--------|--------|---------------------|
| `MEMBER_RENEWAL` | Receipt `Renewal` | Lets gyms pay differently for renewals than for new members |
| `ADDON_SALE` | Receipt `Add-on` (non-PT) | Add-ons used to earn the base rate |
| `WALK_IN_SALE` | Receipt `Daily Entry` | Day passes |
| `DUES_COLLECTED` | Instalment `Payment` receipts | Rewards chasing balances |
| `PT_PACKAGE_SALE` | PT receipts | PT revenue currently earns the trainer nothing |
| `FOLLOW_UP_DONE`, `RATING_AVG`, `SESSION_RATING_AVG` | Follow-ups, ratings | Activity targets and bonus conditions |
| `PT_CLIENT_RETENTION`, `NO_SHOW_RATE` | Bookings | Trainer quality KPIs |

**Consequence:** renewals, add-ons, walk-ins, instalments and PT receipts no longer count toward revenue targets or earn commission. The old `base_commission` rate and PT revenue targets were not migrated. Every dropped setting is listed in `performance_migration_report` (`GET /api/performance/migration-report`).

**Adding a metric** means three things: a constant in `Metric`, a `SourceDeriver` that records it (or an extra credit from an existing one), and labels in the web app and in the mobile app's 9 languages.

A staff member and a trainer are the same `Staff` record. The plan assigned to them decides what they earn on, so a trainer who also rings up POS can be paid for both.

## 4. Attribution and the activity ledger

### 4.1 Staff IDs on source rows

Migration `V121` adds these columns:

| Table | Column | Set at write time | Backfill / fallback |
|-------|--------|-------------------|---------------------|
| `receipts` | `processed_by_staff_id` | From the staff member picked on the receipt (`ReceiptService`, `MemberAddonService`) | Unique exact name match on `processed_by`, then the creating login (`created_by` = `employees.app_username`) |
| `leads` | `assigned_staff_id` | Resolved from the assignee name after every save | Unique exact name match; a lead with no assignee falls back to its creator's login |
| `sale_transactions` | `cashier_staff_id` | Resolved after save | The till login, then the printed cashier name |
| `follow_ups` | `assigned_staff_id` | `FollowUpService` | Unique exact name match |

- Matching is case-insensitive and trimmed, and it never uses substrings.
- A name shared by two employees, or a login used by two staff rows, resolves to nobody.
- Receipts processed by "Mobile App" or "Admin" have no staff member.
- For receipts the picked name comes before the login, because the desk chooses it from the staff list.
- A lead's ID follows its assignee name: when the name changes and identifies exactly one employee, the ID moves with it. An ID set by hand is kept while the name can't be resolved.

Rows that can't be matched appear on the **Unassigned** tab (`GET /api/performance/unassigned`), where an admin credits them by hand. The migration also writes per-branch counts to `performance_migration_report`.

### 4.2 The ledger (`performance_events`)

```
performance_events
  id, branch_id, staff_id (NULL = nobody credited), metric,
  occurred_at,                 -- UTC
  quantity,                    -- can be negative on a correction
  amount,                      -- NULL for count-only metrics
  source_type, source_id,      -- receipt | sale | lead | session
  revision,                    -- 0 = original credit, 1, 2 … = corrections
  reverses_event_id,           -- the original, on corrections
  created_at
  UNIQUE (source_type, source_id, metric, COALESCE(staff_id, 0), revision)
```

- **Writers**: a JPA listener (`PerformanceSourceListener`) watches receipts, POS sales, leads, training sessions and bookings. After the writing transaction commits, `PerformanceEventRecorder` reconciles each changed row in a transaction of its own, so a ledger problem can never roll back a sale. This covers every write path (desk, POS, mobile app, approvals, refunds, imports) without hooking each service.
- **Reconciling**: a `SourceDeriver` works out what the row should earn now, compares that with the row's ledger entries per metric and person, and appends the difference. Reconciling an unchanged row writes nothing.
- **Append-only**: refunds, voids, cancellations and reassignments add correction rows; history is never edited. Corrections are numbered, so a sale can be partly refunded more than once.
- **Where a correction lands**: in the original month while that person's month is undecided. Once their month is approved, rejected or paid, the correction lands now (clawback).
- **Sessions** are recorded at their date and start time in the branch's time zone. Reads count events only up to now, so a session later this month counts once its time arrives, with no daily job.
- **Unattributed activity** is recorded with `staff_id` NULL, so branch targets still see every sale.
- **Backfill**: `PerformanceBackfillRunner` rebuilds history once per database, in the background after startup. Completion is marked in `performance_engine_state` (`events_backfilled`). Turn it off with `--performance.backfill.enabled=false`.
- **Repair**: `POST /api/performance/rebuild` (optional `branch_id`, `from`, `to`) re-derives the ledger. It writes only differences, so it is safe to run at any time.

## 5. Configuration

### 5.1 Targets

```
targets
  id, branch_id, scope ('staff' | 'role' | 'branch'),
  staff_id NULL, role NULL,
  period_type ('month'), period_start, period_end,
  repeat_monthly,              -- also applies to later months with no target of their own
  created_at, created_by, updated_at, updated_by

target_lines
  id, target_id, metric, measure ('count' | 'amount'), goal
```

- **Resolution, per metric**: the person's own target first, then their role's target in their branch, then their role's all-branches target, then none.
- **Within one scope**: the month's own target wins; otherwise the latest repeating target that started earlier.
- **Branch targets** (`scope = 'branch'`) are measured against everything done in the branch, credited or not.
- **Monthly only.** A target is replaced as a whole when saved again. Saving one with no goals deletes it. `POST /api/performance/targets/copy` copies a month's targets into the next.
- **Migrated from `staff_targets`**:
  - `revenue_target` → `REVENUE_TOTAL` amount
  - `membership_revenue_target` → `MEMBER_ADMISSION` amount
  - `pos_revenue_target` → `POS_SALE` amount
  - `new_clients_target` → `LEAD_CONVERSION` count
  - `sessions_target` → `PT_SESSION_DELIVERED` count
  - Unit targets for admissions, POS sales and PT sessions → count goals
  - Everything else is reported and dropped.
- **`employees.monthly_target`** became a repeating staff target from 2000-01 on `REVENUE_TOTAL`. The employee form no longer edits it.

### 5.2 Incentive plans

```
incentive_plans              id, name, branch_id NULL (= all branches), effective_from, effective_to NULL,
                             status ('draft' | 'active' | 'archived')
incentive_plan_assignments   plan_id, role NULL, staff_id NULL        -- staff_id beats role
incentive_plan_lines         plan_id, metric, basis ('percent_of_amount' | 'fixed_per_unit'),
                             rate, min_units NULL, cap_amount NULL
incentive_plan_bonuses       plan_id, trigger_type ('target_attainment'), metric (or REVENUE_TOTAL),
                             threshold_pct, reward_type ('fixed' | 'percent_of_metric_amount'),
                             reward_value, condition_metric NULL, condition_min NULL
```

**Rules**
- **No implicit rate.** No plan means no commission.
- **Plan selection**:
  - A plan assigned to the person beats a plan for their role.
  - A branch plan beats an all-branches plan.
  - Then the latest `effective_from` wins.
  - Plans resolve on the person's **home branch**, and one plan covers their whole month across branches.
- **Versions**:
  - `effective_from` is always the 1st of a month.
  - A plan with no approved months can be edited in place.
  - Once a month has been approved under a plan, changes create a new version from a later month (`POST /plans/{id}/versions`), and the old version ends the month before.
  - Deleting a plan that months were approved under archives it instead.
- **Lines**:
  - `percent_of_amount` pays rate % of the metric's money; `fixed_per_unit` pays rate per unit.
  - With `min_units`, a line pays nothing until that many units are reached, then pays on all of them.
  - `cap_amount` limits what the line pays in a month.
- **Bonuses**:
  - Attainment is measured against the person's goal on the metric: the money goal if there is one, else the count goal. No goal, no bonus.
  - Per metric, the highest threshold reached (with its condition met) pays. Tiers don't stack.
- **The month's total never goes below zero.** A clawback larger than the month's earnings is not carried forward.

**Migrated from `commission_rules`**: one plan per role, for all branches, effective from 2000-01:
- `admission_commission` (else `base_commission`) → `MEMBER_ADMISSION` %
- `pos_commission` → `POS_SALE` %
- `pos_commission_per_sale` → `POS_SALE` per unit
- `target_bonuses_json` → bonuses on `REVENUE_TOTAL`, paid as a % of revenue
- `base_commission` on renewals, add-ons, walk-ins and instalments is reported and dropped (§3.2).

The web plan editor offers "Front desk / sales" and "Trainer" templates as starting points.

## 6. The engine

```
performance/
  metric/       Metric, Measure, Achieved
  events/       PerformanceEvent(+Repository), PerformanceSourceListener, PerformanceEventRecorder,
                SourceDeriver (Receipt/Sale/Lead/Session), PerformanceEventRebuilder,
                PerformanceBackfillRunner, PerformanceParityService, SourceLabels
  attribution/  StaffAttribution, UnassignedService
  targets/      Target, TargetLine, TargetRepository, TargetResolver, TargetService, Goal
  incentives/   IncentivePlan(+Assignment, Line, Bonus), PlanResolver, IncentiveCalculator,
                IncentiveBreakdown, IncentivePlanService
  settlement/   SettlementService, SettlementView      (entity: entities/CommissionEarning)
  PerformanceEngine, PeriodResult, PerformanceClock
  api/          PerformanceController, PerformanceViews
```

```java
Map<Long, PeriodResult> evaluate(Collection<Long> staffIds, YearMonth period);

record PeriodResult(Long staffId, YearMonth period,
                    Map<Metric, Achieved> achieved,      // count, amount
                    Map<Goal.Key, Goal> goals,           // resolved target lines
                    IncentiveBreakdown incentive,        // lines + bonuses (frozen once decided)
                    SettlementView settlement) {}        // estimated | pending | approved | rejected | paid
```

- **Reads**: one query each for events, targets, plans and settlements. A person's figures sum every branch they worked in.
- **Decided months** (approved, rejected, paid) return the frozen amount and breakdown. Only running and undecided months are calculated.
- **Month boundaries** use the gym's local time: the branch's POS time zone, else the caller's `X-Client-Timezone`, else UTC.

### 6.1 Settlements

- **One decision per person per month**: a `commission_earnings` row with category `total`, plus `breakdown_json` (a snapshot of the lines, bonuses and plan), `plan_id`, `computed_amount` and `adjustment_amount`.
- **Actions**: approve, reject, pay and reset, only after the month has ended. "Approve all" approves every undecided, non-zero month of a period.
- **Adjustment**: approval can add a +/- adjustment to the month's total; it requires a note. (The plan text proposed per-line adjustments; one month-level adjustment was built instead.)
- **Payroll** (`PayrollRunService`, `SalaryPaymentService`) reads approved settlements through `SettlementService`. It marks them paid when salary is paid, and warns about undecided months.
- **Migration**: a month whose `memberships` and `pos` rows shared a status was merged into one `total` row. Months with mixed statuses (for example, one part already paid by payroll) keep their old rows, which are read together as one settlement, so nothing is paid twice.

## 7. API and screens

**`/api/performance`**

| Endpoint | Purpose |
|----------|---------|
| `GET /metrics` | Metric catalogue |
| `GET /overview?from&to&staff_id` | Targets board and commission review (at most 12 months) |
| `GET /branch?period` | Branch figures against the branch target |
| `GET /me?period` | The signed-in staff member's own month and plan |
| `GET /events?staff_id&period` | Audit trail behind a month |
| `POST /settlements/{approve\|reject\|pay\|reset}` | Commission decisions |
| `POST /settlements/bulk/approve` | Approve all for a period |
| `GET /targets?period`, `PUT /targets`, `DELETE /targets/{id}`, `POST /targets/copy` | Targets |
| `GET /plans`, `POST /plans`, `PUT /plans/{id}`, `POST /plans/{id}/versions`, `DELETE /plans/{id}` | Incentive plans |
| `GET /unassigned`, `PUT /unassigned/{receipt\|sale\|lead}/{id}` | Unassigned sales |
| `POST /rebuild` | Repair the ledger |
| `GET /parity?months` | Old calculator vs ledger, per staff member and month |
| `GET /migration-report` | What `V121` couldn't carry over |

**Permissions**: `/me` and `/metrics` are open to anyone signed in. Everything else needs STAFF or PAYROLL; plans also accept SALARY_PAYMENTS for writes.

**Web**
- `set-targets.tsx` has tabs for Overview, Branch, Targets, Incentive Plans, Commission and Unassigned.
- The Staffs & Trainers quick "Set target" dialog saves to the new targets, and its button opens Incentive Plans.
- Payroll labels the single settlement row "Commission & bonuses".

**Mobile**
- The ledger, the performance screens (staff, trainer, my performance) and both dashboards read the engine.
- The commission-structure card is generated from the active plan, bonuses included, and worded in all 9 languages.
- The transaction list comes from the ledger: each credited activity, with what it earns at the plan's line rates (minimums, caps and bonuses apply only to the month as a whole).

**Compatibility**
- `GET /api/staff-targets` (and `/me`) is now a read-only, engine-backed view in the old shape. It serves the screens not yet switched (targets overview, my-targets, some dashboards) and older app versions.
- The old target write endpoints, `PATCH …/achievement` and `/api/commission-rules`, have been removed.

## 8. Phases

| Phase | Status |
|-------|--------|
| 1 — Attribution and events: staff ID columns, ledger, recorder, backfill, unmatched report, parity check | Done |
| 2 — Engine and targets: `targets`/`target_lines` and migration; mobile performance and dashboards switched; floor logic removed | Done; the web targets overview, `StaffTargetsBoard` and my-targets still read the compatibility endpoint |
| 3 — Incentive plans and settlement: plan tables and migration, calculator, one settlement per month, plan editor, payroll through `SettlementService` | Done |
| 4 — Mobile ledger: engine-backed amounts, plan-based structure card, ledger transaction list, 9-language strings | Done |
| 5 — Trainer metrics: `PT_SESSION_DELIVERED`, `CLASS_TAUGHT`, `CLASS_ATTENDEE`; trainer plan template | Done for the core metrics; `PT_PACKAGE_SALE`, retention and ratings deferred (§3.2) |
| 6 — Remove the old code | Next release (below) |

**Phase 6 checklist**
1. Move the targets overview, `StaffTargetsBoard`, my-targets and the remaining dashboard web screens onto `/api/performance`.
2. Remove `GET /api/staff-targets` and `StaffTargetResponseDTO`.
3. Drop `commission_rules`, `staff_targets` and `employees.monthly_target` in a new migration.
4. Remove `StaffProgressCalculator`, which now only backs the parity check and two POS/receipt helpers.

## 9. Testing

| Area | Status |
|------|--------|
| `IncentiveCalculator`: percent, per unit, minimum, cap, bonus tiers, bonus condition, count goals, no plan, clawback floor, snapshot JSON round trip | Unit tests |
| Recorder: first credit, idempotence, partial refund in an open month, clawback after approval, reassignment, cancelled session | Unit tests (`PerformanceEventRecorderTest`) |
| Target and plan resolution | Unit tests (`ResolutionTest`) |
| Mobile ledger and performance services on the engine | Unit tests (rewritten) |
| `V121` on a copy of a tenant database, seeded with edge cases | Done once, locally |
| **Parity check** reviewed on a copy of a real tenant | **To do before release** |
| **Payroll integration**: approve → payroll run → paid, with a clawback the next month | **To do** |
| **Mobile snapshots** for a staff member and a trainer | **To do** (the app has no test suite yet) |

## 10. Decisions

| # | Question | Decision (2026-11-05) |
|---|----------|----------------------|
| 1 | Target bonuses | Built |
| 2 | Who earns on PT receipts | Moot for now: `PT_PACKAGE_SALE` is not in this release. When it is added: the trainer of the booked session, else the seller |
| 3 | Lead conversion amount | Count only |
| 4 | Instalments | Moot for now: `DUES_COLLECTED` is not in this release. When it is added: count under `DUES_COLLECTED` |
| 5 | Trainer credit for new members | Only when the trainer processed the receipt |
| 6 | Clawback after approval | Yes |
| 7 | Settlement granularity | One decision per person per month |
| 8 | First-release metrics | Core metrics only (§3.1) |

## 11. Known limitations

- **Clawbacks** larger than a month's earnings are not carried into later months.
- **Multi-branch staff**: a single plan, chosen by home branch, covers the whole month. Their settlement row belongs to their home branch, so it can be hidden in another branch's view.
- **Ledger transaction list**: what it shows per activity ignores minimums, caps and bonuses. The month total is always correct.
- **Missed reconcile**: a source row changed inside a nested transaction that commits while the outer one rolls back may not be reconciled. `POST /rebuild` repairs it.
- **Trend windows**: the mobile staff performance growth and six-month trend use UTC month boundaries; the headline month uses the gym's zone.
- **Malayalam and Tamil** have the new ledger strings but don't load the ledger namespace yet, so they show English.
