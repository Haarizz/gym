# Salary Advance Requests — Implementation Plan

Staff and trainers request a salary advance from the mobile app. Approvers review the request in a new **Requests** tab on the web Salary Advances page. In the app, the request section **replaces the Tax tab** on both ledger screens.

Status: implemented 2026-11-02 (migration V115; rejection note stored in its own `rejection_note` column).

---

## 1. Agreed rules

| Rule | Decision |
|---|---|
| Who can request | Any signed-in staff member or trainer who has a `Staff` row (found with `staffRepository.findByUserId`) |
| What they enter | **Amount and reason only.** The approver sets installments, start month and auto-deduct when approving. |
| Pending limit | **One pending request at a time** per employee |
| Amount cap | `amount ≤ base_salary − outstanding balance of the employee's Active/Approved advances`. If `base_salary` is missing or 0, the request is rejected with a clear message. |
| Cancel | The employee can withdraw a request only while it is `Pending Approval` (→ `Cancelled`) |
| Approval | Existing web flow (approve with amount/plan, or reject with a note), plus a new **Requests** tab |
| Outcome notification | The employee is notified when their request is approved or rejected |
| Tax tab | Removed completely from mobile (UI, data, i18n) and from the backend ledger API |

---

## 2. Current state (already working)

- `SalaryAdvanceController` (`/api/salary-advances`) and `SalaryAdvanceService` already follow a request → approve/reject flow:
  - A new advance is saved as `approval_status = Pending`, `status = Pending Approval`.
  - `POST /{id}/approve` with `Approved` sets `status = Active`, sets the balance and calls `financialEventService.onSalaryAdvanceDisbursed`. With `Rejected` it sets `status = Rejected`.
  - Admin and HR are notified on create (link `/salary-advances`).
- Payroll matches installments by `employee_id`, which is `Staff.staffId`. The web page saves `selStaff.staff_id` there, so advances requested from the app go into the same pipeline without extra work.
- The web page already shows a "Waiting for approval" panel on Overview and approve/reject buttons on the Advances tab, gated by `SALARY_ADVANCES_APPROVE` or `PAYROLL_APPROVE`.
- `/api/salary-advances/**` is gated by the `SALARY_ADVANCES` module permission, so staff and trainers **cannot** call it. The app needs its own endpoints scoped to the signed-in person.

---

## 3. Backend (Gym-backend)

### 3.1 Migration — `V115__salary_advance_request_source.sql`
(Use the next free version number at implementation time. Never edit applied migrations.)

```sql
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS requested_via VARCHAR(20) NOT NULL DEFAULT 'web';
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS requested_by_user_id BIGINT;
ALTER TABLE salary_advances ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_salary_advances_employee_status ON salary_advances (employee_id, status);
```

- `requested_via`: `web` (entered by admin/HR) or `app` (requested by the employee).
- `requested_by_user_id`: who should get the decision notification.
- Add the matching fields to the `SalaryAdvance` entity and `SalaryAdvanceResponseDTO` (`requested_via`, `requested_by_user_id`).

### 3.2 New mobile endpoints scoped to the signed-in person

Create one shared service, `MobileSalaryAdvanceService`, and expose it under both roles so it matches the existing ledger URLs:

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/mobile/staff/salary-advances`, `/api/mobile/trainer/salary-advances` | The signed-in employee's advances plus limits |
| POST | same paths | Create a request `{ amount, reason }` |
| POST | `…/{id}/cancel` | Withdraw an advance that is still pending |

**GET response**
```json
{
  "limits": {
    "base_salary": 5000.00,
    "outstanding": 1200.00,
    "available": 3800.00,
    "has_pending": false,
    "can_request": true,
    "reason_blocked": null
  },
  "advances": [
    {
      "id": 12, "request_date": "2026-10-20", "requested_amount": 1500,
      "approved_amount": 1500, "status": "Active", "remarks": "…",
      "installment_count": 3, "installment_amount": 500,
      "start_month": "2026-11-01", "next_deduction_date": "2026-11-01",
      "total_deducted": 300, "balance": 1200,
      "approved_date": "2026-10-21", "rejection_note": null
    }
  ]
}
```

**POST create — server-side rules**
1. Find the `Staff` row from `principal.getId()`. Return 403 if there is none.
2. Fill `employee_id = staff.staffId`, `employee_name`, `department` and `branch_id` from the `Staff` row. The client never sends identity fields.
3. `amount > 0`; `reason` required (trimmed, max 500 characters).
4. Return 422 if the employee already has a `Pending Approval` advance.
5. Return 422 if `amount > base_salary − outstanding`. If `base_salary` is null or 0, return 422 with "Salary not set up — contact HR".
6. Save with `advance_type = "Salary Advance"`, `requested_via = app`, `requested_by_user_id = principal.id`, `installment_count = 0`, `start_month = null`. The approver sets the plan.
7. Reuse the existing admin/HR notification, with deep link `/salary-advances?tab=requests`.

**POST cancel**: allowed only if the advance belongs to the caller and its status is `Pending Approval`. Sets `status = Cancelled`, `approval_status = Cancelled` and `cancelled_at`.

**Security**: add the mobile paths to the authenticated staff/trainer rules in `ModulePermissionRules` (the same way the existing `/api/mobile/staff/ledger` and `/api/mobile/trainer/ledger` routes are handled), **not** under the `SALARY_ADVANCES` module gate.

### 3.3 Fixes to existing `SalaryAdvanceService`

- **Status check in `approveAdvance`**: return 422 unless `status == "Pending Approval"`. Today an advance that is already Active or Rejected can be approved again, which posts a second disbursement to the accounts and resets the balance.
- **Notify the employee** after approve or reject: call `notificationService.notifyUser(...)` with `requested_by_user_id`, or for advances created on the web, fall back to the user found from `Staff.staffId`. Include the approved amount, installments and start month, or the rejection note. Send a push notification as well, using the existing staff push tokens.
- **Currency**: replace the hard-coded `"AED "` in the create notification with the gym's configured currency.
- **Rejection note**: store it in its own field, or pull it out of `remarks`, so the app can show it on its own line. Today it is appended to `remarks` as `"Approval Note: …"`.
- `deleteAdvance`: leave as is (admin only). The employee-facing equivalent is cancel.

### 3.4 Remove Tax from the mobile ledger API

- `MobileStaffLedgerController`: remove `GET /tax-documents/{documentId}` and `MobileStaffLedgerService.getTaxDocument`.
- `StaffLedgerResponseDTO` and the trainer ledger DTO: remove `taxInfo` and `taxDocuments`, and the code that builds them in both services.

---

## 4. Mobile (GymBios-Mobile)

Read the Expo v57 docs (per `AGENTS.md`) before writing code.

### 4.1 Domain and data — `src/domains/ledger/`

- `domain/SalaryAdvance.ts` (new): `SalaryAdvance`, `SalaryAdvanceLimits` and `SalaryAdvanceStatus` types.
- `infrastructure/ApiSalaryAdvanceRepository.ts` (new): `list(role)`, `create(role, { amount, reason })`, `cancel(role, id)`. `role` is `'staff' | 'trainer'` and selects the URL prefix.
- `hooks/useSalaryAdvances.ts` (new): a react-query `useQuery` plus `useMutation` for create and cancel. After a mutation it refreshes the advances query and the ledger query.

### 4.2 UI

- `presentation/components/SalaryAdvanceSection.tsx` (new, shared by both screens, with an `accentColor` prop: teal for staff, `trainerAmber` for trainers):
  - **Summary card**: available to request, outstanding balance, next deduction.
  - **Request button**: disabled (with `reason_blocked` shown) when `can_request` is false.
  - **Request sheet**: amount (shows "Max {available}") and reason. Validate on the client too, then submit.
  - **My requests list**: status badge (Pending / Active / Fully Repaid / Rejected / Cancelled), requested vs. approved amount, the repayment plan once approved, the rejection note, and a **Withdraw** action on pending items (with a confirm dialog).
  - Empty state when there are no requests.
- `StaffLedgerScreen.tsx` / `TrainerLedgerScreen.tsx`: change the `'tax'` tab to `'advances'` (`LedgerTab` type, button, label `ledger.tabs.advances`) and render `SalaryAdvanceSection`. Pull-to-refresh refetches both queries.

### 4.3 Remove Tax

- Delete `StaffLedgerTaxSection.tsx` and `TrainerLedgerTaxSection.tsx`.
- Remove `TaxInformation`, `TaxDocument`, `TrainerTaxInformation` and `TrainerTaxDocument`, plus the `taxInfo`/`taxDocuments` fields in `StaffLedgerData.ts`/`TrainerLedgerData.ts`, the matching mapping in both repositories, `downloadTaxDocument`, `handleDocumentPress`, and the exports in `index.ts`.
- i18n: remove `ledger.tabs.tax`, `ledger.tax.*` and `ledger.earnings.taxDoc*`. Add `ledger.tabs.advances` and `ledger.advances.*` in **all 9 languages**.

### 4.4 Notifications

- Make the approve/reject push open the ledger screen on the Advances tab for the right role group (follow the route-group rules in the mobile role routing).

---

## 5. Web (Gym-frontend)

### 5.1 `salary-advances-service.tsx`
- Map `requested_via` and `requested_by_user_id` into `SalaryAdvance`.

### 5.2 `pages/salary-advances.tsx` — new **Requests** tab
- `TabId` gets `"requests"`. Add it to the tab bar with an amber count badge showing the number of pending app requests.
- Read `?tab=requests` from the URL so the notification link opens it directly.
- Contents:
  - Filter chips: **Pending** (default) / Approved / Rejected / Cancelled / All. Search by employee.
  - Each row shows the employee (name, ID, department, role: Staff or Trainer), requested amount, reason, request date, their base salary and current outstanding balance (so the approver can see what's affordable), and an "App" source badge.
  - Actions (only with `canApprove`): **Approve**, which opens the existing approve dialog prefilled with the requested amount, 4 installments and next month; and **Reject**, which uses the existing reject dialog with a note.
  - Users without approve permission can see the list but get no action buttons.
- The Overview "Waiting for approval" panel stays. Add the "App" badge there too and a "View all requests" link to the new tab.
- The Advances tab keeps listing everything, with the source badge on app-requested rows.

### 5.3 Error handling
- Show the backend's 422 message (e.g. "already processed") as a toast when an approver acts on a request that has just been cancelled or decided by someone else.

---

## 6. Testing checklist

**Backend**
- [ ] Creating a request finds the correct `Staff` row; identity fields sent by the client are ignored.
- [ ] A second pending request → 422.
- [ ] Amount over the cap → 422; missing `base_salary` → 422.
- [ ] An employee can't cancel another employee's advance (404/403) or one that isn't pending (422).
- [ ] Approving an advance that isn't pending → 422; no duplicate disbursement entry in the accounts.
- [ ] Approve/reject notifies the requesting employee (in-app and push).
- [ ] An approved app request appears in the installment schedule and is deducted in the next payroll run.
- [ ] The ledger endpoints no longer return tax fields; the tax-document route is gone.

**Mobile**
- [ ] The Advances tab replaces Tax on both the staff and trainer screens, in the correct accent colour.
- [ ] The request button is disabled with a reason when blocked; the form validates against `available`.
- [ ] Withdraw works and updates the list.
- [ ] All 9 languages have the new keys and none of the removed tax keys are still used; RTL layout checked.

**Web**
- [ ] The Requests tab badge count, filters, deep link `?tab=requests`.
- [ ] The approve dialog is prefilled; reject saves the note; actions are hidden without approve permission.
- [ ] A request cancelled while the approver has the page open shows a clean error.

---

## 7. Deferred / out of scope

- The employee proposing installments or a start month (may be added later).
- Attachments on requests.
- A minimum time employed before someone can request, or a cooldown after a rejection.
- A configurable cap per branch (fixed rule for now: base salary minus outstanding balance).
