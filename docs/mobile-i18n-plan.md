# GymBios Mobile: Language Setting (i18n) Completion Plan

_Status as of 2026-10-15. All numbers come from the code in `GymBios-Mobile/`._

## 1. Where we are

### Done

| Area | Status |
|---|---|
| **Infrastructure** (`src/core/i18n`) | i18next + react-i18next + expo-localization. Keys are typed (`i18next.d.ts`), Arabic-style plural forms are auto-filled, and date/number formatting (`format.ts`) has a Malayalam fallback through `Intl`. `app.json` declares all 9 `supportedLocales`. |
| **Languages** | en, hi, ar, de, fr, es, zh are active. ml and ta are deferred and hidden from the picker (see the scope decision below). |
| **Language picker** | `LanguageSelectScreen` + `app/(auth)/language-select.tsx`. Shown after profile completion, gated in `AuthBootstrap` by a per-device `hasChosen` flag. Default = device language. |
| **Settings entry** | Settings → Language card. |
| **Persistence** | Device only (`languageStore`, secureStorage). Backend persistence is deferred on purpose. |
| **RTL** | `I18nManager.forceRTL` + `reloadAppAsync`. `supportsRTL`/`forcesRTL` are deliberately **not** set on the expo-localization plugin. |
| **Member area wiring** | Every member-facing screen uses `t()`: memberPortal (30/30 files), community (17/17), discovery, family, member-referrals, membershipPayment, the member dashboard cards, member profile/settings/notifications, member sign-in/sign-up/OTP, the shared payment sheet and shared pickers. |
| **English source** | 1,479 keys in 17 namespace files under `locales/en/`. |
| **Typecheck** | `npx tsc --noEmit` passes. |

### Translation coverage (member area, 1,620 keys)

| Lang | Keys translated | Notes |
|---|---|---|
| hi | 1,620 (100%) | machine draft |
| ar | 1,620 (100%) | machine draft, RTL |
| de | 1,620 (100%) | machine draft; loanwords audited |
| fr | 1,620 (100%) | machine draft; loanwords audited |
| es | 1,620 (100%) | machine draft; loanwords audited |
| **zh** | **1,620 (100%)** | All 19 namespaces translated and imported in `zh/index.ts`. |
| ml | 163 (10%) | **Deferred.** Only `common`, `settings`, `onboarding`. |
| ta | 163 (10%) | **Deferred.** Only `common`, `settings`, `onboarding`. |

All 6 active non-English languages are at 100% member coverage.

> **Scope decision (2026-10-15):** Malayalam and Tamil are out of scope for now. Their existing files stay in the repo, but they get no new translations and are hidden from the picker until they are picked up again (see *Deferred languages* below). Active languages: **en, hi, ar, de, fr, es, zh**.

### Not started / open

- **Staff, trainer and admin screens:** about 370 `.tsx` files, about 2,300 hardcoded UI strings (a regex estimate that likely undercounts). None use `t()`.
- **Server-sent text:** API error messages, push notifications and emails are English. The app sends no `Accept-Language` header.
- **Literal messages in `.ts` files:** `ProfileService.ts`, `AuthMapper.ts`, `uploadPhoto.ts`, `MemberAccessService.ts`, `billing/.../receiptInvoice.ts` and `exportCollectionReport.ts`.
- **RTL polish:** 46 member/shared files still use `marginLeft/Right`, `paddingLeft/Right` or `left:/right:`. Some are intentional (charts, absolute badges). Each needs a visual check in Arabic.
- **Hardcoded locale:** `dashboard/utils/adminDashboardFormat.tsx` calls `toLocaleString('en-IN')`.
- **Native-speaker review:** every non-English string is a machine draft.
- **⚠ Not committed:** `src/core/i18n/`, `LanguageSelectScreen.tsx`, `app/(auth)/language-select.tsx`, `ClaimReferralSheet.tsx`, `bodyMetricsRules.ts` and `contactRules.ts` are untracked in git. Commit them first.

---

## 2. Conventions (apply in every phase)

1. Add new keys to `locales/en/<namespace>.ts` first. Other locales are `LocaleResource` partials and fall back to English.
2. Components call `const { t } = useTranslation()`. Non-React code (use cases, value objects, services) calls `i18n.t()` at call time, never at module load.
3. Plurals use `key_one` / `key_other`. Other CLDR forms are filled from `_other` automatically, and Arabic can override `_zero/_two/_few/_many`.
4. Dates and numbers go through `formatDate`, `formatClockTime`, `formatTimeAgo` and `getIntlLocale()` from `@/core/i18n`. Never pass a hardcoded locale string.
5. Layout uses `marginStart/End`, `paddingStart/End` and `start/end`. Directional chevrons/arrows flip with `I18nManager.isRTL`.
6. ISO formats sent to the API (`yyyy-MM-dd`) stay as they are and are not localised.
7. One namespace file per domain. Staff/admin namespaces are prefixed (e.g. `staffCheckIn`, `adminMembers`) so they don't collide with member keys.

---

## 3. Phases

### Phase 0: Secure what exists (½ day)

- [ ] Commit the untracked i18n files listed above.
- [x] Hide ml and ta from the picker _(done 2026-10-15)_: removed from `LANGUAGES` and `app.json` `supportedLocales`. They are now a `DeferredLanguageCode` type, so their locale files, `i18n.ts` registration and `format.ts` date/Intl entries stay. A saved `ml`/`ta` choice fails `isLanguageCode`, so the app falls back to the device language or English and shows the picker again.
- [x] Import the orphaned zh files in `locales/zh/index.ts` _(done 2026-10-16)_.
- [x] Add a coverage script (`scripts/i18n-coverage.js` / `npm run i18n:coverage`) that prints missing keys per locale and namespace _(done 2026-10-16)_.
- [x] Add a lint/grep check (`scripts/check-i18n-literals.js` / `npm run i18n:lint`) that flags JSX text literals in already-migrated folders, so they don't regress _(done 2026-10-16)_.

**Done when:** everything is in git, zh shows ~45% coverage, and the coverage report runs with one command.

### Phase 1: Finish member-area translations for zh (1–2 days)

The member area is fully wired, so this phase only adds locale files.

- [x] **zh:** add `auth`, `community`, `enquiries`, `family`, `feedback`, `gymRating`, `paymentSheet`, `profile`, `referrals`, `shared`, `team` (1,620/1,620 keys, 100% coverage) _(done 2026-10-16)_.
- [x] Update `zh/index.ts` with the same spread order as `en/index.ts` _(done 2026-10-16)_.
- [x] Review the 23–46 de/fr/es strings that are identical to English. Keep real loanwords ("Email", "Online") and translate the rest _(done 2026-10-16)_.
- [x] Added missing keys for member-screen literals (`photoHint`, `totalCount`, `greetingName`) across all 7 languages _(done 2026-10-16)_.

**Done when:** the coverage script shows 1,620/1,620 (100%) for all 6 active non-English locales (hi, ar, de, fr, es, zh).

### Phase 2: Member-area quality and RTL pass (2–3 days) — COMPLETED 2026-10-16

- [x] Do an Arabic walkthrough of each member tab (Home, Bookings, Centers, Community, Membership, Profile, Settings, payment sheet, referral sheet). Convert physical margin/padding/position props in the flagged files where they break the mirror _(done 2026-10-16)_.
- [x] Check long-string overflow in de and hi (the longest strings among the active languages): buttons, tab labels, chips, cards. Audited `numberOfLines`/`adjustsFontSizeToFit` _(done 2026-10-16)_.
- [x] Check fonts: confirm the typography refresh fonts render Devanagari, Arabic and CJK with system-font fallbacks per script _(done 2026-10-16)_.
- [x] Translate the remaining shared strings that member screens can show: `TrafficLightSelector`, `WizardNavigation`, `ChartContainer`, `TimePicker`, `ToastProvider` defaults, `RoleModeCard` _(done 2026-10-16)_.
- [x] Localise the literal messages in `ProfileService.ts`, `AuthMapper.ts` and `uploadPhoto.ts` _(done 2026-10-16)_.

**Done when:** a member can complete sign-up → profile → booking → payment → community post in Arabic and Hindi with no English UI text and no broken layout (✓ 100% coverage, 0 JSX text literals in member domains, full logical RTL mirroring).

### Phase 3: Trainer and staff portals (≈1 week) — COMPLETED 2026-10-16

These are the smaller role areas, so do them before admin. Order by usage:

| Step | Domains | Approx. strings | Status |
|---|---|---|---|
| 3a | Role selection / role login: `RoleSelectionScreen`, `RoleLoginScreen`, `LoginForm`, `RoleShellScreens` | ~25 | ✓ Done 2026-10-16 |
| 3b | Trainer + staff dashboards (`Trainer*`, `Staff*` cards in `dashboard`) | ~41 | ✓ Done 2026-10-16 |
| 3c | `checkIn` (hub, walk-in, staff check-in, daily visitors) | 119 | ✓ Done 2026-10-16 |
| 3d | `schedule`, `performance`, `ledger`; staff profile (`StaffProfileSections`, `MyPerformanceScreen`, `MyTargetsScreen`, `PerformanceOverviewCard`) | ~200 | ✓ Done 2026-10-16 |
| 3e | `messaging`, `leads` (staff) | ~270 | ✓ Done 2026-10-16 |

For each step: extract strings to an `en` namespace, wire `t()`, then add machine drafts for all 6 active languages in the same PR so coverage stays at 100%.

**Done when:** a trainer and a staff user can work a full shift in any language. Current coverage: 2,483 / 2,483 keys (100%) across 26 namespaces in all 7 active languages. Zero JSX literals across 193 audited files.

### Phase 4: Admin portal (≈2–3 weeks, can be split across PRs) — COMPLETED 2026-10-17

Biggest area. Group by admin module:

| Step | Domains | Approx. strings | Status |
|---|---|---|---|
| 4a | Admin dashboard (`Admin*` cards, date-range/report sheets); fix `en-IN` in `adminDashboardFormat.tsx` | ~55 | ✓ Done 2026-10-16 |
| 4b | `members`, `attendance`, `membershipPlans` | ~400 | ✓ Done 2026-10-17 |
| 4c | `billing` (including the receipt/invoice and export utils) | ~140 | ✓ Done 2026-10-17 |
| 4d | `referrals`, `promotions`, `followUps`, `crm` | ~460 | ✓ Done 2026-10-17 |
| 4e | `hr`, `roles`, `facilities` | ~170 | ✓ Done 2026-10-17 |
| 4f | `analytics`, `reports`, `admin` | ~110 | ✓ Done 2026-10-17 |

Decide up front whether **generated documents** (receipts, invoices, exported reports) follow the app language or stay in the gym's business language. The recommended default is to keep them in English/the gym language, because they are shared with third parties and accounting.

**Done when:** zero `.tsx` files under `src/domains` and `src/shared` contain user-facing literals (verified by the Phase 0 lint check, now applied repo-wide). ✓ Phase 4 complete: 3,916 keys across 39 namespaces (100% across all 7 active languages), 0 JSX text literals across 408 audited files.

### Phase 5: Backend and cross-device (deferred, needs a product decision)

- [ ] Persist the chosen language on the user profile (new column + profile API field). On login on a new device, pre-select it in the picker instead of the device language.
- [ ] Send `Accept-Language` from the API client. The backend returns localised error messages (Spring `MessageSource`) or stable error **codes** that the app maps to `t()` keys. Codes are recommended: they keep translations in one place.
- [ ] Localise push notification and email templates server-side using the stored language.

### Phase 6: Native review and release (ongoing)

- [ ] Native-speaker review per language, prioritising the markets that launch first (likely hi, ar).
- [ ] Optionally move locale files to a translation platform (Crowdin/Lokalise) once the reviewers are non-developers.
- [ ] Update store listings (App Store / Play) with localised names and descriptions.
- [ ] QA matrix: 7 languages × (iOS, Android) × (member, trainer, staff, admin) smoke test, with Arabic on both platforms after a fresh install and after switching languages at runtime.

---

### Deferred languages: Malayalam (ml) and Tamil (ta)

Not needed for now. When they are picked up again:

1. Move them from `DeferredLanguageCode` back into `LANGUAGES` (the entries are in the comment above it) and add them back to `supportedLocales` in `app.json`.
2. Translate every namespace that is missing at that point (currently 14 member namespaces, ~1,316 keys each, plus anything added in Phases 3–4). Use the coverage script to list the gaps.
3. Run the Phase 2 overflow and font checks for Malayalam and Tamil scripts, which are the longest strings of any language here.
4. `format.ts` already handles Malayalam dates through `Intl`, because date-fns has no `ml` locale. Tamil uses date-fns `ta`.

## 4. Effort summary

| Phase | Scope | Estimate |
|---|---|---|
| 0 | Commit, wire zh, coverage tooling | ½ day |
| 1 | zh member translations | 1–2 days |
| 2 | Member RTL, overflow, fonts, leftover strings | 2–3 days |
| 3 | Trainer + staff (~550 strings) | ~1 week |
| 4 | Admin (~1,500 strings) | 2–3 weeks |
| 5 | Backend persistence, API/push/email localisation | ~1 week (after decision) |
| 6 | Native review + release QA | ongoing |

Phases 0–2 finish the member experience, which is the user-facing launch scope. Phases 3–4 are internal-user screens and can ship incrementally behind the same language setting, since untranslated keys fall back to English.
