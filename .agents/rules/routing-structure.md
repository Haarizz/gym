---
trigger: always_on
---

# GymBios — Mandatory Project Structure & Routing Rule

This is a **mandatory architectural rule** for all future GymBios frontend implementations.

Do not invent new folder structures, routing conventions, or screen locations when an existing project convention already exists.

The project separates:

```text
src/app
    → Expo Router filesystem / navigation

src/domains
    → feature ownership and implementation

src/shared
    → application-wide reusable components/utilities
```

The core rule is:

```text
src/app     = WHERE the user navigates
src/domains = WHAT the feature implements
```

---

## 1. `src/app` IS ROUTING ONLY

Everything under:

```text
src/app/
```

exists for Expo Router.

Route files must be **thin adapters**.

Example:

```tsx
import { CommunityScreen } from '@/domains/community';

export default CommunityScreen;
```

Route files must NOT contain:

* feature UI implementation
* API calls
* services
* repositories
* TanStack Query logic
* business logic
* large forms
* feature components
* server-state management
* duplicated screen implementations

The route file exists only to connect an Expo Router path to the appropriate domain screen.

---

## 2. ROUTES MUST FOLLOW FEATURE HIERARCHY

When multiple routes belong to the same feature, they must be grouped inside a common feature route directory.

Correct:

```text
src/app/
└── (member)/
    └── community/
        ├── index.tsx
        └── create-post.tsx
```

Incorrect:

```text
src/app/
└── (member)/
    ├── community.tsx
    └── create-community-post.tsx
```

The filesystem should communicate feature ownership and navigation hierarchy.

For example:

```text
src/app/(member)/community/
├── index.tsx
├── create-post.tsx
├── events.tsx
└── challenges.tsx
```

rather than flattening everything into:

```text
src/app/(member)/
├── community.tsx
├── create-community-post.tsx
├── community-events.tsx
└── community-challenges.tsx
```

---

## 3. USE `index.tsx` FOR THE FEATURE ROOT

When a feature has a route directory, its main destination should normally be:

```text
src/app/(route-group)/feature/index.tsx
```

Example:

```text
src/app/(member)/community/index.tsx
```

represents:

```text
/community
```

while:

```text
src/app/(member)/community/create-post.tsx
```

represents:

```text
/community/create-post
```

Do not create both:

```text
src/app/(member)/community.tsx
```

and:

```text
src/app/(member)/community/index.tsx
```

for the same feature.

---

## 4. ROUTING AND DOMAIN IMPLEMENTATION ARE SEPARATE

The routing hierarchy:

```text
src/app/(member)/community/
```

and the implementation hierarchy:

```text
src/domains/community/
```

serve different purposes.

Correct structure:

```text
src/app/
└── (member)/
    └── community/
        ├── index.tsx
        └── create-post.tsx


src/domains/
└── community/
    └── presentation/
        └── screens/
            ├── CommunityScreen.tsx
            └── CreateCommunityPostScreen.tsx
```

The relationship is:

```text
src/app/(member)/community/index.tsx
        ↓
CommunityScreen


src/app/(member)/community/create-post.tsx
        ↓
CreateCommunityPostScreen
```

The route files are adapters. The domain screens are the canonical implementations.

---

## 5. CANONICAL SCREEN LOCATION

Actual feature screens must live under:

```text
src/domains/{feature}/presentation/screens/
```

Examples:

```text
src/domains/community/presentation/screens/CommunityScreen.tsx

src/domains/community/presentation/screens/CreateCommunityPostScreen.tsx

src/domains/members/presentation/screens/MembersScreen.tsx

src/domains/members/presentation/screens/CreateMemberScreen.tsx
```

Never duplicate these implementations inside `src/app`.

The existing domain architecture defines `presentation/screens` as the location for feature screen entry points. 

---

## 6. DOMAIN STRUCTURE

Domains follow the established project architecture:

```text
src/domains/{feature}/
├── application/
├── domain/
├── infrastructure/
├── presentation/
│   ├── components/
│   ├── hooks/
│   └── screens/
├── hooks/
└── index.ts
```

Do not create empty layers unnecessarily.

Responsibilities:

```text
domain
    → business models/types

application
    → use cases/business orchestration

infrastructure
    → API/repository implementations

hooks
    → TanStack Query/server state

presentation
    → UI implementation
```

The domain architecture requires separation of business logic, data access, presentation, and application concerns. 

---

## 7. DOMAIN `index.ts` IS THE PUBLIC API

Every domain should expose its public capabilities through:

```text
src/domains/{feature}/index.ts
```

Example:

```ts
export * from './presentation/screens';
export * from './hooks';
```

Route files should preferably import from the domain public API:

```tsx
import { CommunityScreen } from '@/domains/community';

export default CommunityScreen;
```

Avoid unnecessary deep imports into internal domain files.

---

## 8. MULTIPLE RELATED ROUTES MUST BE GROUPED

If a feature has multiple navigable screens, group them.

Example:

```text
src/app/(member)/community/
├── index.tsx
├── create-post.tsx
├── events.tsx
└── challenges.tsx
```

Implementation:

```text
src/domains/community/presentation/screens/
├── CommunityScreen.tsx
├── CreateCommunityPostScreen.tsx
├── CommunityEventsScreen.tsx
└── CommunityChallengesScreen.tsx
```

Do not flatten the routes:

```text
src/app/(member)/
├── community.tsx
├── create-community-post.tsx
├── community-events.tsx
└── community-challenges.tsx
```

---

## 9. DO NOT CREATE ROUTES FOR EVERY UI STATE

Not every tab, filter, modal, subsection, or local UI state requires an Expo Router route.

Use a route when the destination genuinely requires route-level navigation, such as:

* independent navigation history
* deep linking
* direct navigation
* full-screen navigation
* route parameters
* route-level lifecycle

Otherwise keep the state inside the feature's presentation layer.

Do not introduce nested Expo Router routes merely because a screen contains tabs.

---

## 10. CHILD ROUTES BELONG UNDER THEIR PARENT FEATURE

If a destination is conceptually a child of a feature, place it inside that feature's route directory.

Example:

```text
Community
└── Create Post
```

must become:

```text
src/app/(member)/community/
├── index.tsx
└── create-post.tsx
```

not:

```text
src/app/(member)/
├── community.tsx
└── create-community-post.tsx
```

Likewise:

```text
Members
└── Renew Membership
```

should follow:

```text
src/app/(admin)/members/
├── index.tsx
└── renew.tsx
```

when the renewal flow is a child destination of Members.

---

## 11. DO NOT CREATE A ROUTE DIRECTORY WITHOUT REAL HIERARCHY

Do not create folders merely for consistency.

For a truly standalone destination, follow the existing project convention.

For example:

```text
src/app/(admin)/dashboard.tsx
```

may remain a standalone route.

But when a feature has multiple related destinations:

```text
src/app/(admin)/members/
├── index.tsx
├── create.tsx
└── renew.tsx
```

Use a common feature directory.

Rule:

```text
One standalone destination
    → existing standalone route convention

Multiple related destinations
    → common feature route directory
```

Never mix both conventions for the same feature.

---

## 12. ROUTE NAMING MUST FOLLOW EXISTING CONVENTIONS

Before creating a route:

1. Inspect `src/app/`.
2. Inspect the relevant route group.
3. Inspect the feature domain.
4. Check whether the route already exists.
5. Check existing navigation configuration.
6. Follow the naming convention of neighboring modules.

Do not invent competing names for the same feature:

```text
members.tsx
member.tsx
member-management.tsx
members-management.tsx
```

Use the existing project convention.

---

## 13. NEVER DUPLICATE ROUTES

Do not create:

```text
src/app/(member)/community.tsx
```

alongside:

```text
src/app/(member)/community/index.tsx
```

Do not create multiple aliases for the same destination unless the existing architecture explicitly requires them.

There must be one canonical route hierarchy.

---

## 14. NEVER PUT DOMAIN IMPLEMENTATION IN `src/app`

Do not create:

```text
src/app/(member)/community/
├── components/
├── hooks/
├── services/
├── domain/
└── create-post.tsx
```

Do not create:

```text
src/app/(admin)/members/
├── MemberCard.tsx
├── MemberForm.tsx
├── useMembers.ts
└── index.tsx
```

Feature implementation belongs under:

```text
src/domains/{feature}/
```

---

## 15. SERVER STATE NEVER BELONGS IN ROUTES

Never put backend logic in:

```text
src/app/
```

Do not perform:

```tsx
useEffect(...)
fetch(...)
queryClient.invalidateQueries(...)
```

inside route files.

All backend-backed functionality must follow the project's TanStack Query architecture.

Domains own:

* services
* repositories
* query hooks
* mutation hooks
* query keys
* cache invalidation
* server state

Screens consume those capabilities.

The established project architecture explicitly requires TanStack Query for backend server state. 

---

## 16. ANALYTICS ROUTING

Analytics follows the same routing principle.

Routes live under:

```text
src/app/(admin)/analytics/
```

and implementation lives under:

```text
src/domains/analytics/
```

Example:

```text
src/app/(admin)/analytics/
├── index.tsx
├── community.tsx
├── attendance.tsx
└── financials.tsx
```

Implementation:

```text
src/domains/analytics/
├── presentation/
│   └── screens/
│       └── AnalyticsHubScreen.tsx
├── community/
│   └── presentation/
│       └── screens/
│           └── CommunityAnalyticsScreen.tsx
└── ...
```

Analytics routes are thin adapters.

Analytics implementation remains inside the Analytics domain. 

---

## 17. NO ORPHANED SCREENS

Every screen must have a deliberate relationship with navigation.

Valid:

```text
Expo Router route
    ↓
Domain screen
```

or:

```text
Existing feature navigation
    ↓
Domain screen
```

Do not create unreachable screens or components.

The project FSD already identifies orphaned/unrouted components as technical debt. 

---

## 18. BEFORE CREATING A NEW FILE

Classify the file first.

### Expo Router route

```text
src/app/
```

Thin adapter only.

### Feature screen

```text
src/domains/{feature}/presentation/screens/
```

### Feature component

```text
src/domains/{feature}/presentation/components/
```

### Server-state logic

```text
src/domains/{feature}/hooks/
```

### API/repository implementation

```text
src/domains/{feature}/infrastructure/
```

### Reusable application-wide UI

```text
src/shared/
```

Never choose a location merely because it is convenient.

---

# 19. REQUIRED ARCHITECTURAL INVARIANT

This must always remain true:

```text
src/app
    = Expo Router filesystem
    = navigation hierarchy
    = thin route adapters

src/domains
    = feature ownership
    = business/data implementation
    = server state
    = presentation
src/domains/{feature}/presentation/screens
    = canonical screen implementations
Therefore:
src/app ≠ feature implementation
src/app ≠ business logic
src/app ≠ API layer
src/app ≠ server-state ownership
src/app ≠ reusable feature components
# 20. STANDARD PATTERN
For a feature with multiple navigable screens, always prefer:
src/app/
└── (route-group)/
    └── feature/
        ├── index.tsx
        ├── child-route.tsx
        └── another-child-route.tsx
src/domains/
└── feature/
    └── presentation/
        └── screens/
            ├── FeatureScreen.tsx
            ├── ChildScreen.tsx
            └── AnotherChildScreen.tsx
Example:
src/app/
└── (member)/
    └── community/
        ├── index.tsx
        └── create-post.tsx
src/domains/
└── community/
    └── presentation/
        └── screens/
            ├── CommunityScreen.tsx
            └── CreateCommunityPostScreen.tsx
# FINAL NON-NEGOTIABLE RULE

**Do not flatten related routes into the route-group directory.**

