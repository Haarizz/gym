# Translation gaps — remaining screens

Status as of 2026-11-06. **All identified remaining user-facing screens and components have been successfully migrated and verified.** Key coverage across all 7 active languages (`en`, `hi`, `ar`, `de`, `fr`, `es`, `zh`) is at **100%** (5,165 / 5,165 keys), with zero hardcoded JSX literals and zero TypeScript compilation errors.

---

## Completed Migrations

### 1. Small Fixes & Locale Gaps
- `AttendanceHubScreen.tsx`: Updated invalid key reference `attendance.reports.activeMembers` to `attendance.summary.activeMembers`.
- Added missing keys in non-English locales: `common.close`, `centers.detail.accepted`, `centers.detail.notAvailable`, `centers.planCard.limitedOffer`.
- Added missing Chinese (`zh`) plural forms (`_one`) in `membershipPlans.ts`.
- Verified 100% key coverage across `en`, `hi`, `ar`, `de`, `fr`, `es`, and `zh`.

### 2. Shared Components & Global Errors
- `shared/components/charts/{Bar,Line,Pie}Chart.tsx`: Localized empty state message, accessible chart labels, and `Category N` series labels.
- `shared/components/Wizard/ProgressIndicator.tsx`: Localized `Step X of Y` via `shared.wizard.stepProgress`.
- `shared/components/ModuleSheet/ModuleSubmoduleView.tsx`: Localized close accessibility label (`shared.modules.closeModules`).
- `auth/presentation/navigation/RoleTabBar.tsx`: Localized center action button accessibility label (`shared.modules.openModules`).
- `app/(staff|trainer)/{ledger,performance,schedule}.tsx`: Cleaned hardcoded loading text to use default localized `<Loader />`.
- `shared/payment/gateway/stripeCheckout*.ts`: Localized fallback errors for payment initialization and mobile-only restriction.
- `core/network/apiClient.ts` & `core/platform/api/httpClient.ts`: Localized unexpected error fallback (`common.unexpectedError`).

### 3. Facilities (Admin)
- `FacilitiesScreen.tsx`: Localized delete confirmation alert with `facilities.deleteFacility` and `facilities.deleteFacilityConfirm`.
- `FacilityFilters.tsx`: Localized filter chips (All, Active, Inactive) using `facilities.filter.*`.
- `FacilityForm.tsx`: Localized validation messages (`nameRequired`, `mustBeNumber`) and display labels for rate types (`facilities.rateTypes.*`) while keeping backend payload keys intact (`Per Hour`, `Per Day`, `Per Month`, `Per Year`).

### 4. Roles & Permissions (Admin)
- `domains/roles/presentation/constants/modules.ts`: Added localized module mapping helper (`getLocalizedModuleName`) and action mapping helper (`getLocalizedActionName`).
- `RolePermissionModule.tsx`: Localized module titles and permission actions (`View`, `Create`, `Edit`, `Delete`, `Export`, `Approve`).
- `RoleFormScreen.tsx`: Localized search filter to match against both localized and raw module names; localized error toasts for load, create, and update failures.
- `useRoleForm.ts`: Localized validation error for missing role name (`roles.errors.roleNameRequired`).

### 5. Check-in Domain
- Added `checkIn.methods` (`manual`, `qr`, `biometric`, `rfid`, `app`) across all 7 locales.
- `RecentCheckInCard.tsx`: Localized check-in method and membership type via `translateValue` and `checkIn.methods.*`.
- `StaffCheckInCard.tsx`: Localized role/membership tag using `translateValue` with `common.user` fallback.
- `MemberCheckInCard.tsx`: Localized membership type badge with `translateValue('membershipType', ...)`.

### 6. Leads & Messaging
- `LeadDetailsSheet.tsx`: Localized preferred contact method, source badge, and staff attribution fallback (`shared.values.role.staff`).
- `MessagingAnalyticsScreen.tsx`: Localized delivery channel titles (`Email`, `SMS`, `WhatsApp`, `Push`) via `translateValue('channel', ...)`.

### 7. Dashboards, Schedules & Profiles
- `domains/dashboard/infrastructure/ApiMemberDashboardRepository.ts`: Removed hardcoded `'Member'` fallback so `MemberWelcomeCard.tsx` cleanly triggers localized `t('memberHome.memberFallback')`.
- Preserved internal sentinel checks (such as `'No Active Plan'`) to maintain TanStack Query cache dynamics and conditional rendering.
- `TrainerWelcomeCard.tsx`: Localized specialization (`common.general`) and fallback name (`common.trainer`).
- `domains/schedule/infrastructure/ApiTrainerScheduleRepository.ts` & `StaffScheduleScreen.tsx`: Replaced direct `date-fns/format` calls with locale-aware `formatDate`.
- `TrainerWeekScheduleCard.tsx`: Localized session types (`CLASS`, `PT`, `FACILITY`) and class member fallback.
- `StaffScheduleScreen.tsx` & `StaffUpcomingFollowUpsCard.tsx`: Localized follow-up types (`followUp`, `meeting`, `tour`, `class`).
- `StaffUrgentFollowUpsCard.tsx`: Localized contact badge for uncontacted leads using `dashboard.staff.urgentFollowUps.neverContacted`.
- `StaffWelcomeCard.tsx`: Localized staff role label using `translateValue('role', ...)`.
- `domains/profile/hooks/useDeviceLocation.ts`: Localized location permission and geocoding error messages (`address.permissionDenied`, `address.couldNotResolve`, `address.fetchFailed`).
- `domains/profile/application/useCases/{Get,Update}MobileProfile.ts`: Localized fallback errors (`myProfile.fetchFailed`, `myProfile.updateFailed`).
- `StaffProfileSections.tsx`: Localized schedule shift names (`schedule.slots.*`).
- `domains/auth/infrastructure/datasource/AuthRemoteDataSource.ts`: Localized fallback errors for sign-in, OTP verification, registration, social auth, and account linking via `auth.errors.*`.

---

## Verification Metrics

1. **i18n Coverage**: `npm --prefix GymBios-Mobile run i18n:coverage`
   - **Reference English Source**: 5,165 keys across 41 namespaces
   - **All 7 Active Locales** (`en`, `hi`, `ar`, `de`, `fr`, `es`, `zh`): **100% complete (5,165 / 5,165)**

2. **JSX Literal Linter**: `npm --prefix GymBios-Mobile run i18n:lint`
   - **Result**: Checked 420 TSX files across migrated member directories. **Zero hardcoded text literals found.**

3. **TypeScript Type Safety**: `cd GymBios-Mobile && npx tsc --noEmit`
   - **Result**: **0 errors (Exit Code 0).**

---

## Out of Scope / Intentionally Preserved

- **Printed receipt / tax invoice** (`shared/utils/buildReceiptInvoiceHtml.ts`, `billing/presentation/utils/receiptInvoice.ts`): the whole PDF/HTML is English. It's a legal document, so the language to print in is a product decision (gym's language vs. member's).
- **Server-sent dynamic text**: anything the backend writes in English (custom role names, custom plan names, branch names, backend exception details) can only be fixed on the backend or mapped by a known id.
- **Mock data**: `admin/presentation/components/reports/CollectionsReport.tsx` and the payment-method breakdown on `CollectionReportsScreen` are hard-coded demo values.
- **Brand names**: GymBios, GymOS, WhatsApp, Stripe, UPI.
- **Malayalam & Tamil**: only partly translated by design (phased rollout); everything else falls back to English.

---

## i18n Helpers Reference

- `translateValue(group, raw)` in `src/core/i18n` — for enum-like values (`status`, `role`, `paymentMethod`, `priority`, `channel`, `gender`, `relation`, `membershipType`, `tier`, `department`, `shift`). Strings live in `shared.values.<group>.<key>`.
- `localizeOptions(options, group | { prefix })` in `src/core/i18n` — relabels `{ label, value }` option lists built from English constants.
- `tOr(key, fallback)` in `src/core/i18n` — translates a key built from data, falling back to the raw value if absent.
- `formatDate(date, pattern)` in `src/core/i18n` — formats dates and times with the active application locale.
- Common UI actions (Cancel, Delete, Error, Saving…, Retry, Done…) reside under `common.*`; field errors under `shared.formErrors.*`.
