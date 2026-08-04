# Billing Module — Complete Architectural Audit

**Date:** 2026-08-04  
**Scope:** Full audit of the billing module across `Gym-backend`, `Gym-frontend`, and `GymBios-Mobile`.  
**Status:** Audit only — no code modified.

---

## 1. Current Billing Architecture

### 1.1 Backend Structure

The billing module is **not** a self-contained package. It is spread across the generic `controllers`, `services`, `repositories`, `entities`, and `dto` packages:

| Layer | Files |
|---|---|
| **Controllers** | `BillingController` (`/api/billing`), `ReceiptController` (`/api/receipts`) |
| **Service** | `ReceiptService` (concrete class — **no interface, no `ReceiptServiceImpl`**) |
| **Repository** | `ReceiptRepository` |
| **Entity** | `Receipt` |
| **DTOs** | `ReceiptResponseDTO`, `ReceiptsPageResponseDTO`, `BillingStatsDTO`, `MemberDueDTO`, `MemberStatementResponseDTO`, `StatementLineDTO`, `SettlePaymentRequestDTO`, `PaymentSplitDTO`, `MinorChargeDTO`, `PaginationDTO` |
| **Indirect deps** | `MemberService`, `MemberAddonService`, `FinancialEventService`, `ReceiptVoucherService`, `MemberRepository`, `Member` entity |

### 1.2 Key Architectural Finding

**`ReceiptServiceImpl` does not exist.** The task description assumed an interface/impl split, but the codebase uses a single concrete `@Service` class `ReceiptService`. This is a notable deviation from the expected pattern and is itself a code-smell (see §13).

### 1.3 Service Responsibilities

`ReceiptService` is a **god class** (748 lines) that handles:

- Receipt CRUD (list, get, create)
- Member Statement of Account (SOA) generation
- Payment settlement (`settlePayment`)
- Billing statistics (dashboard)
- Member dues aggregation
- Receipt numbering
- Minor/guardian billing
- Fallback self-healing of stale `memberDbId`

This violates single-responsibility. The SOA logic alone is ~180 lines of complex date-window/opening-balance computation embedded inside the service.

---

## 2. Complete Receipt Lifecycle

### 2.1 How Bills Are Generated

Bills are generated **manually/event-driven** — there is **no scheduler, cron job, or subscription service** that auto-generates recurring bills. Bills are created synchronously inside the following flows:

| Trigger | Caller | Transaction Type |
|---|---|---|
| New member registration | `MemberService.createMember()` → `ReceiptService.createReceiptForMember()` | `"New"` |
| Membership renewal | `MemberService.renewMember()` → `createReceiptForMember()` | `"Renewal"` |
| Family head renewal | `MemberService.renewFamilyHead()` → `createReceiptForMember()` | `"Renewal"` |
| Minor renewal (billed to guardian) | `MemberService.renewFamilyMinor()` → `createMinorChargeReceipt()` | `"Renewal"` |
| Add-on purchase (billed to guardian) | `MemberAddonService.createAddon()` → `createMinorChargeReceipt()` | `"Add-on"` |
| Add-on purchase (self-billed) | `MemberAddonService.createAddon()` → `financialEventService.onAddonPaymentReceived()` | (no Receipt row) |
| Manual receipt creation | `ReceiptController.createReceipt()` → `createReceipt()` | caller-supplied |
| Payment settlement | `BillingController.settlePayment()` → `settlePayment()` | `"Payment"` |

### 2.2 Receipt Lifecycle States

```
[Created] → status = "Pending" | "Paid" | "Partial"
                │
                │  (later settlement via settlePayment)
                ▼
        totalPaidToDate advances
        status → "Paid" (when totalPaidToDate >= amount)
        status → "Partial" (when 0 < totalPaidToDate < amount)
```

**Status transitions:**
- `Pending` → `Partial` → `Paid` (via `settlePayment`)
- `Pending` → `Paid` (full payment at creation)
- `Partial` → `Paid` (remaining settled)
- `Overdue` is a **member-level** status, not a receipt status — receipts never transition to `Overdue` themselves.

### 2.3 Receipt Numbering Strategy

- Format: `RCPT-` + zero-padded 10-digit DB id (e.g. `RCPT-0000000042`)
- Generated **after** first save: `saved.setReceiptNo("RCPT-" + String.format("%010d", saved.getId()))`
- **Not** using the `VoucherNumberService` / `VoucherSequence` table (unlike JV, Payment Voucher, Receipt Voucher)
- **Risk:** relies on DB auto-increment id — no gap-free guarantee, no per-year sequence, no concurrency protection (two threads could theoretically read the same id before save, though `IDENTITY` generation mitigates this).

### 2.4 Due Date Calculation

In `createReceiptForMember`:
```
dueDate = (paidAmount < totalAmount && member.nextPaymentDate != null)
        ? member.nextPaymentDate
        : (member.membershipEndDate != null ? membershipEndDate : expiryDate)
```
- A **pending/partial** bill is due on the member's `nextPaymentDate`
- A **fully paid** bill falls back to the membership end/expiry date
- For minor charges: `dueDate = fullyPaid ? null : guardian.nextPaymentDate`

### 2.5 Balance Calculation

- `paidAmount` = `totalAmount − member.outstandingBalance` (clamped ≥ 0) — derived from the member's outstanding balance at creation
- `totalPaidToDate` = cumulative amount paid toward this bill (own `paidAmount` + later settlements)
- `balanceAfter` = snapshot of member's overall outstanding balance immediately after this transaction
- `dueAmount` (DTO) = `amount − totalPaidToDate` (clamped ≥ 0)

### 2.6 Partial Payment Support

**Yes.** Supported via:
- `paidAmount` field (what was received at creation)
- `totalPaidToDate` rollup (advances with later settlements)
- `status = "Partial"` when `0 < paidAmount < amount`
- `SettlePaymentRequestDTO.billPayments[]` allows paying a portion of a bill

### 2.7 Outstanding Amount Calculation

- Stored on `Member.outstandingBalance` (denormalized)
- Set at creation: `fee − paidAmount` (or full fee if pending)
- Reduced in `settlePayment`: `outstandingBalance = max(0, current − totalPaid)`
- **Risk:** denormalized — can drift from the sum of receipt `dueAmount`s if any code path updates one without the other.

### 2.8 Collection Rate Calculation

```
monthlyCollection = SUM(paidAmount) for receipts in current month
pendingThisMonth  = SUM(amount − totalPaidToDate) for Pending/Overdue/Partial receipts in month
totalExpected     = monthlyCollection + pendingThisMonth
collectionRate    = (monthlyCollection / totalExpected) × 100  (capped at 100)
```

### 2.9 Overdue Calculation

- **Member-level:** `MemberRepository.findOverdueMembers()` → `paymentStatus = 'overdue'`
- `overdueCount` = `countOverdueMembers()`
- `overdueAmount` = `SUM(outstandingBalance) WHERE paymentStatus = 'overdue'`
- `daysOverdue` = `ChronoUnit.DAYS.between(nextPaymentDate, now)` (clamped ≥ 0)

### 2.10 Due Soon Calculation

- **Member-level:** `findDueSoonMembers(now, now+7days)` → `nextPaymentDate` within 7 days AND `paymentStatus != 'overdue'`
- `dueSoonCount` = `countDueSoonMembers(now, now+7days)`

### 2.11 Monthly Collection Calculation

- `sumPaidInPeriod(startOfMonth, endOfMonth)` — sums `paidAmount` (cash-basis) for all receipts in the month
- 12-month chart: `findPaidSince(yearAgo)` → groups by `MMM yyyy` label, sums `paidAmount`
- Payment method breakdown: `getPaymentMethodBreakdown(start, end)` → groups by `paymentMethod`

---

## 3. Bill Generation Workflow

### 3.1 New Member Registration

```
MemberService.createMember()
  ├─ Compute fee (plan price, family pricing, minor fees)
  ├─ Set member.outstandingBalance = fee − paid
  ├─ Save member → get DB id
  ├─ Set memberId = "MBR-" + zero-padded id
  ├─ ReceiptService.createReceiptForMember(member, "New", status, breakdown, bankCode, bankName, combinedFee, minorCharges)
  │    ├─ Build Receipt row (amount, paidAmount, totalPaidToDate, balanceAfter, status, dueDate, planName, validFrom/Till)
  │    ├─ Save → get id
  │    └─ Set receiptNo = "RCPT-" + zero-padded id
  ├─ If paidAmount > 0:
  │    ├─ financialEventService.onMemberPaymentReceived(receipt)  → DR Cash/Bank, CR Membership Revenue
  │    └─ receiptVoucherService.createVoucherFromModule(...)      → UI voucher document
  ├─ Register family adults (independent billing)
  ├─ Create billed-to-head records for minors
  ├─ Create app login (if credentials)
  ├─ Notify ADMIN/MANAGER
  └─ Fire new_signup automation
```

### 3.2 Membership Renewal

```
MemberService.renewMember(id, request)
  ├─ Load member
  ├─ Update membership dates, fee, payment status
  ├─ Recompute outstandingBalance
  ├─ ReceiptService.createReceiptForMember(member, "Renewal", status, breakdown, ...)
  ├─ If paidAmount > 0 → financialEventService + receiptVoucherService
  └─ (family head / minor variants use createMinorChargeReceipt)
```

### 3.3 Add-on Purchase

```
MemberAddonService.createAddon(request)
  ├─ Save addon → get id
  ├─ Set transactionId = "TXN-" + zero-padded id
  ├─ If target member is billed-to-head:
  │    ├─ Update guardian.outstandingBalance += due
  │    ├─ ReceiptService.createMinorChargeReceipt(guardian, minor, fee, paidNow, "Add-on", ...)
  │    └─ If paidNow > 0 → financialEventService + receiptVoucherService
  └─ Else (self-billed):
       └─ financialEventService.onAddonPaymentReceived(addon)  → DR Cash/Bank, CR Service Revenue
```

### 3.4 Sequence Diagram (New Member)

```
Frontend ──POST /api/members──▶ MemberController
                                   │
                                   ▼
                              MemberService.createMember()
                                   │
                                   ├──▶ MemberRepository.save(member)
                                   ├──▶ ReceiptService.createReceiptForMember()
                                   │        ├──▶ ReceiptRepository.save(receipt)
                                   │        └──▶ set receiptNo
                                   ├──▶ FinancialEventService.onMemberPaymentReceived()
                                   │        ├──▶ JournalVoucherRepository.save()
                                   │        ├──▶ JournalVoucherLineRepository.save()
                                   │        └──▶ AccountHeadRepository.updateBalance()
                                   ├──▶ ReceiptVoucherService.createVoucherFromModule()
                                   ├──▶ NotificationService.notifyRoles()
                                   └──▶ AutomationExecutorService.handleEvent("new_signup")
```

---

## 4. Payment Settlement Workflow

### 4.1 `settlePayment(SettlePaymentRequestDTO req)`

```
BillingController.settlePayment()
  └─ ReceiptService.settlePayment(req)
       ├─ Load member by memberDbId
       ├─ For each billPayment:
       │    ├─ Load receipt by receiptId
       │    ├─ Compute billPaidSoFar = totalPaidToDate (fallback paidAmount)
       │    ├─ newBillPaid = billPaidSoFar + payAmount
       │    ├─ Set totalPaidToDate = newBillPaid
       │    ├─ Set status = (newBillPaid >= amount) ? "Paid" : "Partial"
       │    └─ Save receipt
       ├─ Update member:
       │    ├─ outstandingBalance = max(0, current − totalPaid)
       │    ├─ lastPaymentDate = now
       │    ├─ paymentMethodUsed = req.paymentMethod
       │    ├─ paymentStatus = "paid" (if balance == 0) | "partial" (if paid > 0)
       │    └─ Save member
       ├─ Create settlement Receipt:
       │    ├─ transactionType = "Payment"
       │    ├─ amount = totalPaid
       │    ├─ paidAmount = totalPaid
       │    ├─ status = "Paid"
       │    ├─ linkedBillId = soleBillId (only if single bill)
       │    ├─ balanceAfter = member.outstandingBalance (post-settlement)
       │    └─ Save → set receiptNo
       ├─ financialEventService.onMemberPaymentReceived(settlement)
       └─ receiptVoucherService.createVoucherFromModule(...)
```

### 4.2 Validation

- Member must exist (else `RuntimeException`)
- Each `billPayment.receiptId` must exist (else `RuntimeException`)
- `payAmount <= 0` entries are **silently skipped** (no error)
- **No validation** that `payAmount` doesn't exceed the bill's remaining due
- **No validation** that the bill belongs to the member
- **No validation** that the bill is in `Pending`/`Partial`/`Overdue` status
- **No overpayment handling** — paying more than the bill's remaining due simply sets `totalPaidToDate` above `amount` and status to `"Paid"`; the excess is **not** refunded or credited

### 4.3 Transaction Handling

- `ReceiptService` is annotated `@Transactional` at class level → `settlePayment` runs in a transaction
- `FinancialEventService` is also `@Transactional` → nested transaction joins the outer one
- **Idempotency:** `FinancialEventService.alreadyJournaled("Receipt", id)` prevents duplicate journal entries on retry
- **However:** the receipt/member updates themselves are **not idempotent** — a duplicate `POST /api/billing/settle` with the same payload would double-apply the payment (member balance reduced twice, two settlement receipts created)

### 4.4 Consistency Issues

1. **No duplicate-payment prevention** — same request sent twice double-settles
2. **No bill-ownership check** — a receipt belonging to member A can be settled by member B
3. **No remaining-due cap** — overpayment silently inflates `totalPaidToDate`
4. **`paymentDate` and `transactionRef` fields in `SettlePaymentRequestDTO` are ignored** — the settlement always uses `LocalDateTime.now()` and never stores the transaction reference
5. **`linkedBillId` only set for single-bill settlements** — multi-bill settlements lose attribution
6. **Member `paymentStatus` downgrade risk** — if a member was `"overdue"` and pays partially, the code sets `"partial"` (downgrades from overdue), which could remove them from the overdue list prematurely

---

## 5. Receipt Entity Analysis

### 5.1 Field-by-Field

| Field | Type | Purpose | Notes |
|---|---|---|---|
| `id` | Long | PK, auto-increment | |
| `receiptNo` | String | Business number `RCPT-XXXXXXXXXX` | Unique; generated post-save |
| `transactionDate` | LocalDateTime | When the transaction occurred | |
| `memberDbId` | Long | FK to `members.id` | **Not enforced** — comment says "not enforced for simplicity" |
| `memberId` | String | Business ID `MBR-XXXXXXXXXX` | Denormalized snapshot |
| `memberName` | String | Member name snapshot | Denormalized |
| `memberPhone` | String | Member phone snapshot | Denormalized |
| `transactionType` | String | `"New" \| "Renewal" \| "Add-on" \| "Daily Entry" \| "Payment"` | String, not enum |
| `amount` | BigDecimal | Invoice total | |
| `paymentMethod` | String | `"Cash" \| "Card" \| "Online" \| "Wallet" \| "Bank Transfer"` | String, not enum |
| `status` | String | `"Paid" \| "Pending" \| "Partial"` | String, not enum |
| `planName` | String | Membership plan name | |
| `validFrom` | LocalDateTime | Membership start | |
| `validTill` | LocalDateTime | Membership end | |
| `processedBy` | String | Who processed | Hardcoded `"Admin"` |
| `remarks` | String | Free text | |
| `membershipType` | String | `"Individual" \| "Family" \| "Corporate"` | |
| `paidAmount` | BigDecimal | Amount received at creation | Immutable after creation |
| `dueDate` | LocalDateTime | When bill is due | |
| `paymentBreakdown` | List\<PaymentSplitDTO\> | Per-leg breakdown for Mixed payments | JSON-converted TEXT column |
| `bankAccountCode` | String | Ledger account for Bank Transfer | |
| `bankAccountName` | String | Ledger account name | |
| `minorCharges` | List\<MinorChargeDTO\> | Itemized minor family fees | JSON-converted TEXT column |
| `totalPaidToDate` | BigDecimal | Cumulative paid toward this bill | Live rollup, advances with settlements |
| `balanceAfter` | BigDecimal | Member's outstanding balance snapshot after this txn | Immutable |
| `linkedBillId` | Long | For settlement rows, the bill it paid down | Only single-bill settlements |

### 5.2 Missing Fields

| Missing Field | Why Needed |
|---|---|
| `discount` | No discount tracking on receipts (only `Member.discountApplied`) |
| `tax` / `vatAmount` | No tax breakdown — the frontend hardcodes 5% VAT in the HTML receipt |
| `attachments` | No attachment support |
| `generatedPdfPath` | No PDF generation exists |
| `email` | Receipt stores `memberPhone` but not `memberEmail` — needed for emailing receipts |
| `transactionRef` | `SettlePaymentRequestDTO` has it but it's never persisted |
| `paymentDate` | `SettlePaymentRequestDTO` has it but it's never persisted |
| `createdBy` / `updatedBy` | Only `processedBy` (hardcoded "Admin") |
| `currency` | No currency field (assumes AED) |
| `reversalOf` / `voided` | No void/reversal support |

### 5.3 Unnecessary / Redundant Fields

- `memberId`, `memberName`, `memberPhone` are denormalized snapshots — necessary for historical integrity, but `memberDbId` is the only FK and it's not enforced
- `validFrom` / `validTill` duplicate `Member.membershipStartDate` / `membershipEndDate` — arguably useful as snapshots
- `membershipType` duplicates `Member.membershipType`

---

## 6. Repository Analysis

### 6.1 `ReceiptRepository` Queries

| Query | Purpose | Notes |
|---|---|---|
| `findAll(Specification, Pageable)` | Paginated receipt list with search/filter | Uses JPA Specification — `LIKE '%...%'` on `receiptNo`, `memberId`, `memberName`, `memberPhone` — **no index-friendly prefix search** |
| `sumPaidInPeriod(start, end)` | Monthly collection (cash-basis) | `SUM(paidAmount)` — efficient aggregate |
| `sumPendingInPeriod(start, end)` | Collection-rate denominator | `SUM(amount − COALESCE(totalPaidToDate, paidAmount, 0))` — **COALESCE with 3 args is non-standard JPQL**; may not be portable |
| `findPaidSince(start)` | 12-month chart | Loads **all** paid receipts since a year ago into memory, then groups in Java — **inefficient for large datasets** |
| `getPaymentMethodBreakdown(start, end)` | Payment method chart | `GROUP BY paymentMethod` — efficient |
| `findPendingByMember(memberDbId)` | Pending bills for a member | Indexed on `memberDbId` + `status` |
| `findPendingByMemberName(memberName)` | Fallback for stale memberDbId | **No index on `memberName`** — full scan |
| `findByMemberDbIdOrderByTransactionDateAsc` | SOA history | Indexed on `memberDbId` |
| `findByMemberNameOrderByTransactionDateAsc` | SOA fallback | **No index on `memberName`** |
| `countByMemberDbIdAndTransactionType` | Renewal-count promotion rule | Efficient count |

### 6.2 `MemberRepository` Billing Queries

| Query | Purpose | Notes |
|---|---|---|
| `findOverdueMembers()` | Member Due list | `paymentStatus = 'overdue'` — **no index on `paymentStatus`** |
| `findDueSoonMembers(now, 7d)` | Due-soon list | `nextPaymentDate` range + `paymentStatus != 'overdue'` — **no composite index** |
| `findPendingMembersWithBalance(now, 7d)` | Pending-with-balance list | Complex `NOT (...)` subquery — **no index** |
| `countOverdueMembers()` | Stats | Count — efficient |
| `countDueSoonMembers(now, 7d)` | Stats | Count — efficient |
| `sumOverdueBalance()` | Stats | `SUM(outstandingBalance)` — efficient |

### 6.3 N+1 / Inefficiency Issues

1. **`getMemberDues()`** — calls `findOverdueMembers()`, `findDueSoonMembers()`, `findPendingMembersWithBalance()` — three separate queries, each returning full `Member` entities. No pagination — **scales poorly** with member count.
2. **`getBillingStats()`** — `findPaidSince(yearAgo)` loads all paid receipts into memory and groups in Java. Should be a `GROUP BY` SQL query.
3. **`getMemberStatement()`** — loads all receipts for a member, then does date-window filtering and running-balance in Java. Acceptable for a single member, but the `LocalDateTime.parse(row.getDate() + "T00:00:00")` string round-trip is fragile.
4. **Fallback by `memberName`** — the self-healing fallback queries by name (unindexed) and then writes back the correct `memberDbId`. This is a **write inside a `@Transactional(readOnly = true)` method** — the `save()` calls in `getPendingBillsForMember` and `getMemberStatement` are inside read-only transactions, which may silently no-op or throw depending on the JPA provider.

---

## 7. DTO Analysis

### 7.1 DTO Inventory

| DTO | Used By | Endpoint |
|---|---|---|
| `ReceiptResponseDTO` | Receipt list, details, pending bills, settle response | `GET /api/receipts`, `GET /api/receipts/{id}`, `GET /api/billing/member/{id}/pending-bills`, `POST /api/billing/settle` |
| `ReceiptsPageResponseDTO` | Receipt list | `GET /api/receipts` |
| `BillingStatsDTO` | Dashboard stats | `GET /api/billing/stats` |
| `MemberDueDTO` | Member Due list | `GET /api/billing/dues` |
| `MemberStatementResponseDTO` | Member SOA | `GET /api/billing/member/{id}/statement` |
| `StatementLineDTO` | SOA lines | (nested) |
| `SettlePaymentRequestDTO` | Payment settlement | `POST /api/billing/settle` |
| `PaymentSplitDTO` | Payment legs | (nested in Receipt, SettlePaymentRequest) |
| `MinorChargeDTO` | Minor charges | (nested in Receipt, StatementLine) |
| `PaginationDTO` | Pagination | (nested in ReceiptsPageResponse) |

### 7.2 Sufficiency Assessment

| Use Case | Sufficient? | Notes |
|---|---|---|
| **Receipt List** | ✅ | `ReceiptResponseDTO` covers all fields the UI needs |
| **Receipt Details** | ✅ | Same DTO reused |
| **Receipt Download** | ❌ | No PDF endpoint; frontend generates HTML client-side |
| **Member SOA** | ✅ | `MemberStatementResponseDTO` + `StatementLineDTO` complete |
| **Due List** | ✅ | `MemberDueDTO` complete |
| **Collection Report** | ❌ | No dedicated collection-report DTO/endpoint — only `BillingStatsDTO` |
| **CSV Export** | ❌ | No backend export — frontend builds CSV client-side |

### 7.3 Missing / Unnecessary Fields

- `ReceiptResponseDTO` — **missing `memberEmail`** (needed for emailing receipts)
- `ReceiptResponseDTO` — **missing `transactionRef`** (never persisted anyway)
- `MemberDueDTO` — **missing `memberDbId`** (only has `id` which is the DB id — OK)
- `SettlePaymentRequestDTO` — `paymentDate` and `transactionRef` are **declared but never used** by the service
- `ReceiptResponseDTO` — `id`, `memberDbId`, `linkedBillId` are serialized as **Strings** (via `String.valueOf`) — inconsistent with `MemberDueDTO.id` which is a `Long`

---

## 8. Existing Communication Capabilities

### 8.1 EmailService

- `EmailService.sendEmail(to, subject, htmlContent)` — SMTP via `JavaMailSender`
- `isConfigured()` checks `spring.mail.host` and `messaging.email.from`
- **No attachment support** — cannot send a PDF receipt
- **Not wired into billing** — `ReceiptService` never calls `EmailService`

### 8.2 MessagingService

- `sendMessage(SendMessageRequestDTO)` supports `email`, `sms`, `whatsapp`, `in-app`
- Uses `TwilioClientService` for SMS/WhatsApp
- **Not wired into billing** — no receipt/reminder sending from the billing module

### 8.3 NotificationService

- `notifyRoles(...)` — in-app notifications to roles
- Used by `MemberService` for "New Member Joined" — **not** for billing reminders

### 8.4 Current Billing Communication Capabilities

| Capability | Status |
|---|---|
| Email a receipt | ❌ No backend API; frontend shows a toast only |
| SMS a receipt | ❌ No backend API |
| WhatsApp a receipt | ❌ No backend API |
| Send due reminder (single) | ❌ No backend API; frontend shows a toast only |
| Send due reminder (bulk) | ❌ No backend API; frontend shows a toast only |
| Print receipt | ✅ Client-side HTML window.print() |

---

## 9. Existing PDF Capabilities

**None.**

- No `ReceiptPdfService`, `PdfService`, `Jasper`, `iText`, `OpenPDF`, or `PDFBox` anywhere in the codebase
- `pom.xml` has **no PDF library**
- The frontend generates an HTML receipt and uses `window.print()` for "download" — this is a browser print, not a server-generated PDF

---

## 10. Existing Export Capabilities

**None on the backend.**

- No `CsvExportService`, `ExcelExportService`, or `ReportExportService`
- No CSV/Excel/export code anywhere in `Gym-backend`
- All CSV export is **client-side** in `billing.tsx`:
  - `handleExportStatementCsv()` — SOA lines
  - `handleExportOverdueReport()` — overdue members
  - `handleExportAllReceipts()` — all receipts
- These build CSV strings in the browser and trigger a download — no server involvement

---

## 11. Missing Backend APIs

### 11.1 Receipt Management

| Endpoint | Exists? | Notes |
|---|---|---|
| `GET /api/billing/receipts` | ❌ | Exists as `GET /api/receipts` instead |
| `GET /api/billing/receipts/{id}` | ❌ | Exists as `GET /api/receipts/{id}` instead |
| `GET /api/billing/receipts/{id}/pdf` | ❌ | **Must implement** (no PDF infra) |
| `POST /api/billing/receipts/{id}/email` | ❌ | **Must implement** |
| `POST /api/billing/receipts/{id}/share` | ❌ | **Must implement** |

### 11.2 Member Due

| Endpoint | Exists? | Notes |
|---|---|---|
| `GET /api/billing/dues` | ✅ | Exists |
| `POST /api/billing/dues/{id}/remind` | ❌ | **Must implement** |
| `POST /api/billing/dues/remind-all` | ❌ | **Must implement** |

### 11.3 Member SOA

| Endpoint | Exists? | Notes |
|---|---|---|
| `GET /api/billing/member/{id}/statement` | ✅ | Exists |
| `GET /api/billing/member/{id}/statement/pdf` | ❌ | **Must implement** (no PDF infra) |
| `POST /api/billing/member/{id}/statement/email` | ❌ | **Must implement** |

### 11.4 Collection Reports

| Endpoint | Exists? | Notes |
|---|---|---|
| `GET /api/billing/collections` | ❌ | **Must implement** |
| `GET /api/billing/collections/report` | ❌ | **Must implement** |
| `GET /api/billing/collections/report/pdf` | ❌ | **Must implement** (no PDF infra) |
| `GET /api/billing/collections/report/csv` | ❌ | **Must implement** |

### 11.5 Exports

| Endpoint | Exists? | Notes |
|---|---|---|
| `GET /api/billing/export/receipts.csv` | ❌ | **Must implement** |
| `GET /api/billing/export/dues.csv` | ❌ | **Must implement** |
| `GET /api/billing/export/soa.csv` | ❌ | **Must implement** |
| `GET /api/billing/export/collections.csv` | ❌ | **Must implement** |

---

## 12. Missing Frontend Capabilities

The frontend (`billing.tsx`) has UI for features that have **no backend support**:

| UI Feature | Backend Support | Current Behavior |
|---|---|---|
| **Download Receipt** | ❌ | Generates HTML client-side, `window.print()` |
| **Send Receipt** (Email/SMS/WhatsApp/Print) | ❌ | Shows a success toast only — **no actual send** |
| **Send Reminder** (single) | ❌ | Shows a success toast only — **no actual send** |
| **Send Reminders** (bulk) | ❌ | Shows a success toast only — **no actual send** |
| **Export CSV** (receipts/dues/SOA) | ❌ | Client-side CSV generation |
| **Freeze Overdue Accounts** | ❌ | Shows an info toast only — **no actual freeze** |

---

## 13. Architectural Risks

### 13.1 Code Smells

1. **God class** — `ReceiptService` (748 lines) handles CRUD, SOA, settlement, stats, dues, numbering, and self-healing
2. **No interface** — `ReceiptService` is a concrete class; no `ReceiptServiceImpl` exists (contrary to the task's assumption)
3. **Stringly-typed enums** — `transactionType`, `status`, `paymentMethod`, `membershipType` are all `String` with no enum validation
4. **`RuntimeException` instead of domain exceptions** — `EntityNotFoundException` and `BusinessRuleViolationException` exist but are not used in `ReceiptService`
5. **Hardcoded values** — `processedBy = "Admin"`, `monthlyTarget = 50000`, `"RCPT-"` prefix, 7-day due-soon window
6. **Read-only transactions that write** — `getPendingBillsForMember` and `getMemberStatement` call `receiptRepository.save()` inside `@Transactional(readOnly = true)` methods
7. **Dead DTO fields** — `SettlePaymentRequestDTO.paymentDate` and `transactionRef` are never used
8. **Duplicate logic** — the fallback-by-name + self-heal pattern is duplicated in `getPendingBillsForMember` and `getMemberStatement`
9. **Frontend/backend contract drift** — frontend has UI for send/remind/export that the backend doesn't support

### 13.2 Missing Abstractions

- **No `BillingService` interface** — hard to mock/test
- **No `ReceiptNumberGenerator`** — numbering logic inline
- **No `StatementBuilder`** — SOA logic embedded in service
- **No `CollectionReportService`** — no collection report exists
- **No `ExportService`** — no reusable CSV/PDF infrastructure
- **No `ReceiptEmailService` / `ReminderService`** — no communication abstraction

### 13.3 Service / Repository Responsibility Issues

- `ReceiptService` does too much (see god class)
- `MemberRepository` mixes billing queries with automation-trigger queries and dashboard metrics
- `FinancialEventService` is well-factored (single responsibility: journal entries) — a good model to follow

### 13.4 DTO Inconsistencies

- `ReceiptResponseDTO` serializes numeric IDs as Strings; `MemberDueDTO` uses Long
- `ReceiptResponseDTO` missing `memberEmail`
- `SettlePaymentRequestDTO` has unused fields

### 13.5 Scalability Concerns

- `getMemberDues()` loads all overdue/due-soon/pending members into memory — no pagination
- `getBillingStats()` loads a year of receipts into memory for the chart
- `findPaidSince()` and `findByMemberName*` queries have no supporting indexes
- `LIKE '%...%'` search patterns prevent index usage

### 13.6 Transaction Safety

| Concern | Status |
|---|---|
| `@Transactional` on `settlePayment` | ✅ Class-level |
| Rollback safety | ⚠️ `RuntimeException` triggers rollback, but `FinancialEventService` idempotency check happens **after** the receipt is saved — if the journal fails, the receipt is rolled back too (same transaction) — OK |
| Concurrency | ⚠️ No optimistic locking (`@Version`) on `Receipt` or `Member` — two concurrent settlements could both read the same `totalPaidToDate` and double-apply |
| Duplicate payment prevention | ❌ None — same request twice double-settles |
| Duplicate receipt generation | ⚠️ `receiptNo` is unique, but the `RCPT-` + id scheme means a retry after a failed save would get a new id — no idempotency key |
| Idempotency | ⚠️ Only `FinancialEventService` is idempotent (via `JournalEntrySource`); the receipt/member updates are not |

---

## 14. Recommended Implementation Order

### Phase 1 — Foundation (no new features)

1. **Introduce `BillingService` interface** — extract `ReceiptService` into an interface + `ReceiptServiceImpl` (aligns with the task's expected structure)
2. **Split the god class** — extract `StatementOfAccountService`, `BillingStatsService`, `MemberDuesService`, `PaymentSettlementService`
3. **Replace `RuntimeException` with domain exceptions** — use `EntityNotFoundException`, `BusinessRuleViolationException`
4. **Add `@Version` optimistic locking** to `Receipt` and `Member`
5. **Fix read-only transactions that write** — remove the self-healing `save()` calls from `@Transactional(readOnly = true)` methods, or make them proper write transactions
6. **Add missing indexes** — `memberName`, `paymentStatus`, `nextPaymentDate`, composite `(memberDbId, status)`

### Phase 2 — Correctness

7. **Add duplicate-payment prevention** — idempotency key on `SettlePaymentRequestDTO` (e.g. `clientRequestId`), unique constraint
8. **Add bill-ownership validation** — verify `receipt.memberDbId == req.memberDbId`
9. **Cap `payAmount` at remaining due** — reject or clamp overpayment
10. **Persist `paymentDate` and `transactionRef`** — add fields to `Receipt` entity
11. **Fix member `paymentStatus` downgrade** — never downgrade `"overdue"` to `"partial"` on partial payment
12. **Add `memberEmail` to `Receipt`** — needed for emailing

### Phase 3 — PDF & Export Infrastructure

13. **Add a PDF library** (OpenPDF or iText) to `pom.xml`
14. **Create `ReceiptPdfService`** — generate receipt PDFs
15. **Create `StatementPdfService`** — generate SOA PDFs
16. **Create `CsvExportService`** — reusable CSV writer
17. **Create `CollectionReportService`** — aggregate collection data

### Phase 4 — New APIs

18. **Receipt Management** — `GET /api/billing/receipts/{id}/pdf`, `POST /api/billing/receipts/{id}/email`, `POST /api/billing/receipts/{id}/share`
19. **Member Due** — `POST /api/billing/dues/{id}/remind`, `POST /api/billing/dues/remind-all`
20. **Member SOA** — `GET /api/billing/member/{id}/statement/pdf`, `POST /api/billing/member/{id}/statement/email`
21. **Collection Reports** — `GET /api/billing/collections`, `GET /api/billing/collections/report`, `GET /api/billing/collections/report/pdf`, `GET /api/billing/collections/report/csv`
22. **Exports** — `GET /api/billing/export/receipts.csv`, `dues.csv`, `soa.csv`, `collections.csv`

### Phase 5 — Communication

23. **Create `ReceiptCommunicationService`** — wire `EmailService` + `MessagingService` to send receipts/reminders
24. **Add attachment support to `EmailService`** — send PDF receipts as attachments
25. **Wire frontend** — replace toast-only send/remind with real API calls

### Phase 6 — Performance

26. **Paginate `getMemberDues()`**
27. **Move 12-month chart aggregation to SQL** (`GROUP BY`)
28. **Add supporting indexes** for all billing queries

---

## Appendix A — Complete Endpoint Inventory

### Existing Backend Endpoints

| Method | Path | Controller | Purpose |
|---|---|---|---|
| GET | `/api/billing/stats` | BillingController | Dashboard stats |
| GET | `/api/billing/dues` | BillingController | Member due list |
| GET | `/api/billing/member/{id}/pending-bills` | BillingController | Pending bills for a member |
| POST | `/api/billing/settle` | BillingController | Settle payment |
| GET | `/api/billing/member/{id}/statement` | BillingController | Member SOA |
| GET | `/api/receipts` | ReceiptController | Paginated receipt list |
| GET | `/api/receipts/{id}` | ReceiptController | Receipt details |
| POST | `/api/receipts` | ReceiptController | Create receipt (manual) |

### Frontend-Only Features (no backend)

- Download receipt (client-side HTML/print)
- Send receipt (Email/SMS/WhatsApp/Print) — toast only
- Send reminder (single/bulk) — toast only
- Export CSV (receipts/dues/SOA) — client-side
- Freeze overdue accounts — toast only

---

## Appendix B — Key Files

| File | Role |
|---|---|
| `Gym-backend/.../controllers/BillingController.java` | Billing REST endpoints |
| `Gym-backend/.../controllers/ReceiptController.java` | Receipt REST endpoints |
| `Gym-backend/.../services/ReceiptService.java` | Core billing logic (god class) |
| `Gym-backend/.../repositories/ReceiptRepository.java` | Receipt queries |
| `Gym-backend/.../entities/Receipt.java` | Receipt entity |
| `Gym-backend/.../entities/Member.java` | Member entity (financial fields) |
| `Gym-backend/.../repositories/MemberRepository.java` | Member billing queries |
| `Gym-backend/.../services/MemberService.java` | Bill generation (create/renew) |
| `Gym-backend/.../services/MemberAddonService.java` | Add-on billing |
| `Gym-backend/.../services/FinancialEventService.java` | Journal entries (idempotent) |
| `Gym-backend/.../services/EmailService.java` | SMTP email |
| `Gym-backend/.../services/MessagingService.java` | SMS/WhatsApp/email/in-app |
| `Gym-frontend/src/pages/billing.tsx` | Billing UI (4 tabs) |
| `Gym-frontend/src/utils/supabase/billing-service.tsx` | Frontend billing API client |
| `Gym-frontend/src/utils/supabase/receipts-service.tsx` | Frontend receipts API client |