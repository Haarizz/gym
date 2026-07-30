# GymBios Mobile — Web Migration Checklist

**Reference:** `Gym-app/` (mobile-first React web prototype)  
**Architecture:** DDD + Clean Architecture (non-negotiable)  
**Goal:** Visual and behavioral parity — not code parity

---

## Reference Analysis Summary

`Gym-app` is a **390px mobile-first prototype** with mock data and **no API layer**. Entry flow is **Splash → Mode Selection → Role app** (not email/password login). The SRD (`Gym-app/src/app/imports/pasted_text/gymbios-srd.md`) defines auth requirements not yet built in the web UI.

| Gym-app role | Screens | Mobile route group | Primary domain(s) |
|---|---|---|---|
| Entry | Splash, ModeSelection | `(entry)/` | `auth` + app shell |
| Admin | Dashboard, Staff, Deals, Analytics | `(admin)/` | `reports`, `hr`, `sales` |
| Member | Home, Bookings, Centers, Membership, Profile | `(member)/` | `members`, `bookings`, `profile`, `attendance` |
| Trainer | Home, Schedule, Performance, Ledger, Profile | `(trainer)/` | `hr`, `payroll`, `profile` |
| Staff | Home, Performance, Schedule, Ledger, Profile | `(staff)/` | `crm`, `sales`, `hr`, `payroll` |

**Design tokens (Gym-app):**

| Token | Value | Usage |
|---|---|---|
| Brand teal | `#327f74` / `#2a6b62` | Admin, Staff, Splash, Check-in |
| Member gold | `#F5C742` / `#F59E0B` | Member header, membership cards |
| Trainer amber | `#F59E0B` | Trainer accent |
| Text primary | `#1e293b` | Headings |
| Text secondary | `#49587a` | Body, captions |
| Background | `#f9fafe` | Screen background |
| Card radius | `16px` (`rounded-2xl`) | Cards, buttons |
| Icon set | Lucide | All roles |

---

## Migration Order

Domains are migrated in product-journey order aligned with `Gym-app`, not file-by-file.

---

### 0. App Shell & Design System

- [x] Analyze web module
- [x] Identify reusable components
- [ ] Extract shared components (Badge, Avatar, StatCard, EmptyState, GradientCard, RoleModeCard, BottomTabBar, AppHeader)
- [ ] Align `core/theme` tokens to Gym-app palette (replace Expo blue `#208AEF`)
- [ ] Add `@expo/vector-icons` / Lucide RN icon mapping
- [ ] Build React Native UI — SplashScreen, ModeSelectionScreen
- [ ] Implement domain layer — `AppRole` value object, `SelectAppMode` use case
- [ ] Implement application layer — `AppShellOrchestrator`
- [ ] Implement infrastructure — persist selected role (SecureStore)
- [ ] Add navigation — `(entry)/`, role route groups
- [ ] Verify parity with Gym-app Splash + ModeSelection
- [ ] Testing complete
- [ ] Migration complete

---

### 1. Authentication & Onboarding

> SRD defines role-aware login; web prototype skips login today. Mobile implements SRD on top of architecture foundation.

- [x] Analyze web module (SRD + current mobile auth scaffold)
- [ ] Identify reusable components (OTPInput, RoleLoginHeader)
- [ ] Extract shared components
- [ ] Build React Native UI — role-aware login, forgot password, member sign-up paths
- [ ] Refactor existing auth domain to match Gym-app/SRD flows (replace generic login UI)
- [ ] Implement application layer — extend use cases per role
- [ ] Implement infrastructure — connect `Gym-backend` API contracts
- [ ] Connect API
- [ ] Add navigation — login after mode select (or mode select after auth per final UX decision)
- [ ] Verify parity
- [ ] Testing complete
- [ ] Migration complete

---

### 2. Admin Experience

| Screen | Web file | Status |
|---|---|---|
| Dashboard | `admin/AdminDashboard.tsx` | □ |
| Staff | `admin/AdminStaff.tsx` | □ |
| Deals | `admin/AdminDeals.tsx` | □ |
| Analytics | `admin/AdminAnalytics.tsx` | □ |
| Layout + tabs | `admin/AdminLayout.tsx` | □ |

- [ ] Analyze web module
- [ ] Identify reusable components (KpiGrid, TrendBadge, ReportBottomSheet, PaymentMixBar, AlertList)
- [ ] Extract shared components
- [ ] Build React Native UI
- [ ] Implement domain / application / infrastructure layers
- [ ] Connect API
- [ ] Add navigation `(admin)/`
- [ ] Verify parity
- [ ] Testing complete
- [ ] Migration complete

---

### 3. Member Experience

| Screen | Web file | Status |
|---|---|---|
| Home | `member/MemberHome.tsx` | □ |
| Bookings | `member/MemberBookings.tsx` | □ |
| Centers | `member/MemberCenters.tsx` | □ |
| Membership | `member/MemberMembership.tsx` | □ |
| Profile | `member/MemberProfile.tsx` | □ |
| Trainer (sub) | `member/MemberTrainer.tsx` | □ |
| Layout + tabs | `member/MemberLayout.tsx` | □ |

- [ ] Analyze web module
- [ ] Identify reusable components (MembershipCard, CheckInButton, ScheduleList, QuickStatGrid)
- [ ] Extract shared components
- [ ] Build React Native UI
- [ ] Implement domain / application / infrastructure layers
- [ ] Connect API
- [ ] Add navigation `(member)/`
- [ ] Verify parity
- [ ] Testing complete
- [ ] Migration complete

---

### 4. Trainer Experience

| Screen | Web file | Status |
|---|---|---|
| Home | `trainer/TrainerHome.tsx` | □ |
| Schedule | `trainer/TrainerSchedule.tsx` | □ |
| Performance | `trainer/TrainerPerformance.tsx` | □ |
| Ledger | `trainer/TrainerLedger.tsx` | □ |
| Profile | `trainer/TrainerProfile.tsx` | □ |
| Layout + tabs | `trainer/TrainerLayout.tsx` | □ |

- [ ] Full checklist (same 11 steps)
- [ ] Migration complete

---

### 5. Staff Experience

| Screen | Web file | Status |
|---|---|---|
| Home | `staff/StaffHome.tsx` | □ |
| Performance | `staff/StaffPerformance.tsx` | □ |
| Schedule | `staff/StaffSchedule.tsx` | □ |
| Ledger | `staff/StaffLedger.tsx` | □ |
| Profile | `staff/StaffProfile.tsx` | □ |
| Layout + tabs | `staff/StaffLayout.tsx` | □ |

- [ ] Full checklist (same 11 steps)
- [ ] Migration complete

---

### 6+. Enterprise Domains (future — `Gym-frontend` scope)

These are **not in `Gym-app` today** but exist in the broader GymBios product (`Gym-frontend/`). Migrate after role experiences reach parity.

- [ ] Attendance (check-in deep integration)
- [ ] Bookings (full backend)
- [ ] CRM / Sales / Inventory / Accounting / HR / Payroll / Assets / Reports / Notifications / Community

---

## Per-Screen Workflow (mandatory)

1. **Analyze** — layout, interactions, state, API (or mock data shape)
2. **Extract** — shared vs domain components
3. **Design system** — tokens, no duplication
4. **Rebuild** — RN primitives only
5. **Wire** — Screen → Hook → UseCase → Repository → API
6. **Validate** — side-by-side parity check

---

## Current Mobile Gaps vs Gym-app

| Area | Mobile today | Gym-app reference | Action |
|---|---|---|---|
| Entry flow | Email/password login | Splash → Mode Selection | Replace routing + UI |
| Theme | Expo blue `#208AEF` | Teal `#327f74`, gold `#F5C742` | Update `core/theme` |
| Navigation | `(auth)` / `(app)` | 4 role apps + bottom tabs | Add route groups |
| Data | Mock auth API | Inline mock constants | Domain repositories per feature |
| Icons | None | Lucide | Add icon layer to shared |
| Components | 6 shared primitives | Cards, KPI grids, gradients, sheets | Expand shared library |

---

## Architecture Notes

- **Presentation never imports Infrastructure**
- **Composition roots** wire dependencies in each domain's `index.ts`
- **Zustand** — selected role, UI state, drawer; **TanStack Query** — server data
- **`app/` routes** — re-exports only
- **Business components** (e.g. `MembershipCard`) → domain; **generic** (e.g. `StatCard`) → shared
