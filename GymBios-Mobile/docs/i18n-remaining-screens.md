# Translation gaps — remaining screens

Status as of 2026-11-01. These are the places in the mobile app that still show
English when another language is selected. Found by scanning `src/` for
hard-coded strings and for `t()` keys missing from the English locale, then
checking each hit by hand.

## Already done (for reference)

Admin dashboard, Modules sheet, branch picker, Staff list, Deals → Referral
Codes, Analytics charts (month labels), Follow-ups, Promotions, Referrals,
Members & Staff forms (wizard steps, field errors, review cards), Billing,
Attendance, Subscriptions. Fixed-locale dates (`toLocaleDateString('en-IN')`
etc.) were switched to the app language everywhere.

## Remaining — user-facing screens

Ordered roughly by how often people see them.

### 1. Member home dashboard
- `domains/dashboard/infrastructure/ApiMemberDashboardRepository.ts` — fallbacks
  `'Member'`, `'Unassigned'`, `'No Active Plan'`, `'Main Floor'`, and
  `` `${type} Member` `` (shown on the active-membership card as
  `memberInfo.membershipType`).
- `domains/dashboard/hooks/useMemberDashboard.ts` — the placeholder shown while
  loading uses the same English values.

### 2. Trainer home & schedule
- `domains/dashboard/infrastructure/ApiTrainerDashboardRepository.ts` —
  `'Trainer'`, `'General'` (specialization on `TrainerWelcomeCard`).
- `domains/schedule/infrastructure/ApiTrainerScheduleRepository.ts` —
  `'Class'` and `` `${n} min` `` (shown on `TrainerWeekScheduleCard` and
  `SessionDetailsSheet`).
- `domains/schedule/presentation/components/TrainerAvailabilitySheet.tsx` —
  day names (Monday…Sunday) and slots "Morning (6am–12pm)" etc. The keys
  `hr.days.*` and `hr.shifts.*` already exist and can be reused.

### 3. Staff home & schedule
- `domains/schedule/infrastructure/ApiStaffScheduleRepository.ts` — task types
  `'Follow-up'`, `'Meeting'`, `'Tour'`, `'Unknown Contact'`, and the whole
  productivity tip sentence.
- `domains/schedule/presentation/screens/StaffScheduleScreen.tsx` — `'Class'`,
  `'Scheduled Class'`; header date uses `format(..., 'EEEE, MMMM d, yyyy')` from
  date-fns directly, so it is always English. Use `formatDate` from
  `@/core/i18n/format`.
- `domains/schedule/presentation/components/StaffUpcomingFollowUpsCard.tsx` —
  shows `item.type` raw.
- `domains/dashboard/hooks/useStaffDashboard.ts` — placeholder
  `'Staff Member'`, `'Front Desk Executive'`, `'Main Branch'`, `'Never'`.

### 4. Profile (all roles)
- `domains/profile/hooks/useDeviceLocation.ts` — three location error messages.
- `domains/profile/presentation/components/StaffProfileSections.tsx` — day
  names (reuse `hr.days.*`).
- `domains/profile/application/useCases/{Get,Update}MobileProfile.ts` —
  `'Failed to fetch profile'` / `'Failed to update profile'` when the server
  gives no message.
- `ProfileCompletionScreen.tsx` — phone placeholder `+91 XXXXX XXXXX` (fine as
  is, but India-specific).

### 5. Sign-in & role selection
- `domains/auth/presentation/config/roleConfig.ts` — role cards on the role
  selection screen: titles ("GymBios Admin/Trainer/Staff") and the three
  descriptions.
- `domains/auth/infrastructure/datasource/AuthRemoteDataSource.ts` — sign-in,
  registration, code-verification and Google/Apple error messages (about 12)
  shown when the server sends none.
- `domains/auth/infrastructure/mapper/AuthMapper.ts` — three "Access denied…"
  messages.

### 6. Roles & permissions (admin)
- `domains/roles/presentation/constants/modules.ts` — permission action names
  (View, Create, Edit, Delete, Export, Approve) and module names (Dashboard,
  Members, Billing…) shown in the permission grid.
- `domains/roles/presentation/screens/RoleFormScreen.tsx` — three error toasts.
- `domains/roles/presentation/hooks/useRoleForm.ts` — "Role name is required".

### 7. Facilities (admin)
- `FacilitiesScreen.tsx` — delete confirmation
  `` `Are you sure you want to delete ${name}?` ``; key
  `facilities.deleteFacility` is used but **doesn't exist** (falls back to
  English).
- `FacilityForm.tsx` — rate types (Per Hour, Per Half Day, Per Full Day, Per
  Month), "Name is required", "Must be a number".
- `FacilityFilters.tsx` — All / Active / Inactive chips.

### 8. Leads
- `LeadDetailsSheet.tsx` — preferred contact method and fallbacks `'Email'`,
  `'Website'`, `'Staff'` shown raw. Use `translateValue('channel', …)`.

### 9. Messaging
- `domains/messaging/presentation/channels.ts` — channel labels Email /
  WhatsApp / Push (SMS is the same everywhere).
- `ComposeMessageScreen.tsx` — the preview's sample member ("Jordan Blake",
  "Iron Peak Fitness", …) is English demo data.
- `ApiMessagingRepository.ts` — `'System'` as sender.

### 10. Check-in
- `checkIn/domain/membershipEligibility.ts` — label "No membership".
- `RecentCheckInCard.tsx` — check-in method fallback `'Manual'`.
- `StaffCheckInCard.tsx` — role/membership type shown raw (fallback `'User'`).
  Use `translateValue('role' | 'membershipType', …)`.

### 11. Shared components
- `shared/components/charts/{Bar,Line,Pie}Chart.tsx` — "No chart data
  available", chart accessibility labels, `Category N`.
- `shared/components/Wizard/ProgressIndicator.tsx` — `Step X of Y`.
- `shared/components/ModuleSheet/ModuleSubmoduleView.tsx` — accessibility label
  "Close modules".
- `auth/presentation/navigation/RoleTabBar.tsx` — accessibility label
  "Open Modules".
- `app/(staff|trainer)/{ledger,performance,schedule}.tsx` — `Loading...` while
  the screen loads.
- `shared/payment/gateway/stripeCheckout*.ts` — "Payment could not be started",
  "Online payments are available in the mobile app".
- `core/network/apiClient.ts`, `core/platform/api/httpClient.ts` — "An
  unexpected error occurred" when the server sends no message.

### 12. Small fixes
- `AttendanceHubScreen.tsx` uses `attendance.reports.activeMembers`, which
  doesn't exist. Point it at `attendance.summary.activeMembers`.
- Arabic is missing 4 keys that other languages have: `common.close`,
  `centers.detail.accepted`, `centers.detail.notAvailable`,
  `centers.planCard.limitedOffer`.
- `domains/analytics/hooks/useAdminAnalytics.ts` — fallbacks `'Class'`,
  `'Add-on'`.

## Out of scope / intentionally left

- **Printed receipt / tax invoice** (`shared/utils/buildReceiptInvoiceHtml.ts`,
  `billing/presentation/utils/receiptInvoice.ts`): the whole PDF/HTML is
  English. It's a legal document, so the language to print in is a product
  decision (gym's language vs. member's).
- **Server-sent text**: anything the backend writes in English (custom role
  names, plan names, branch names, server error messages) can only be fixed
  on the backend or mapped by a known id. Example done: the admin dashboard
  highlights and alerts.
- **Mock data**: `admin/presentation/components/reports/CollectionsReport.tsx`
  and the payment-method breakdown on `CollectionReportsScreen` are hard-coded
  demo values.
- **Unused code**: the members `*FormSection.tsx` components,
  `MEMBER_STATUS_OPTIONS`, `hr/components/StaffForm.tsx` and
  `hr/components/form/ScheduleSection.tsx` aren't rendered anywhere.
- **Brand names**: GymBios, GymOS, WhatsApp, Stripe, UPI.
- **Malayalam & Tamil**: only partly translated by design (phased rollout);
  everything else falls back to English.

## How to fix (helpers that already exist)

- `translateValue(group, raw)` in `src/core/i18n/format.ts` — for enum-like
  values (status, role, paymentMethod, priority, channel, gender, relation,
  membershipType, tier, department, shift). Words live in
  `shared.values.<group>.<key>`.
- `localizeOptions(options, group | { prefix })` — relabels `{ label, value }`
  option lists built from English constants.
- `tOr(key, fallback)` — translate a key built from data, fall back to the raw
  value.
- Common words (Cancel, Delete, Error, Saving…, Retry, Done…) are under
  `common.*`; field errors under `shared.formErrors.*`.
- Every new key needs English plus ar, de, es, fr, hi and zh. Arabic plurals
  need `_zero/_one/_two/_few/_many/_other`; missing forms fall back to
  `_other`.
