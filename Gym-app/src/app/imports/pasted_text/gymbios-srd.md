GymBiOS Mobile Application
Software Requirements & Design Reference (SRD)
Purpose: This document converts the source note into a design-ready and development-ready SRD for the GymBiOS mobile application. It defines product structure, user roles, screens, workflows, UX recommendations, and recommended enhancements so the design team can build polished flows without ambiguity.

















1. Product intent and document scope
GymBiOS is a mobile-first wellness operations platform that serves four user contexts from one application shell: Admin, Member, Trainer/Staff, and a future Virtual Studio layer. The original source note defined the broad module ideas. This SRD clarifies those ideas into product-ready requirements, screen expectations, navigation, and recommended usability improvements.
Primary objective: create a mobile experience that supports gym operations, membership commerce, access/check-in, trainer scheduling, staff performance, and member engagement.
Primary output of this SRD: a clean handoff for design exploration, wireframes, detailed UI, and later engineering scope breakdown.
This document intentionally includes a small number of recommended additions where they materially improve clarity, user friendliness, or product maturity.




2. Design principles for the app
Single app, role-aware experience. The landing screen should clearly separate the four user contexts while keeping the visual system consistent.
Fast first actions. Every role should be able to complete its top action in one or two taps: check in, see today’s schedule, review branch KPIs, or follow up leads.
Professional enterprise feel. Use clear data hierarchy, concise cards, readable charts, and meaningful empty states.
Low friction navigation. Bottom navigation should be reserved for high-frequency actions; secondary tools should sit behind logical tabs or segmented views.
Trust and transparency. Statuses such as membership validity, class booking state, payroll status, and payment progress must be obvious at a glance.
3. User roles and access model


4. Entry experience and application shell
The first-time application opening should present a clean role selection screen with four tiles/cards: GymBiOS Admin, GymBiOS Member, GymBiOS Trainer/Staff, and Virtual Studio (marked “Upcoming”). Each tile should include a short caption that explains the purpose of the area.


5. Authentication and onboarding requirements
Admin / Trainer / Staff login should use credentials provisioned by the gym management system or onboarding team.
Member onboarding should support two paths: new customer sign-up and existing member activation using unique identification number plus email/mobile verification.
Password setup, forgot password, OTP verification, and device session management should be part of the core authentication flow.
All login screens should clearly state which role the user is entering to avoid accidental role confusion.
Recommended enhancement: support biometric login after first successful authentication for speed and convenience.
6. Admin experience
The admin app should behave like a compact command center for gym operations. It is not just a dashboard; it should support performance review, offer management, and high-level operational visibility across one or multiple branches.
6.1 Admin navigation structure


6.2 Admin dashboard detail
Top area: branch selector, date range selector, refresh action, and alert center.
Primary KPI row: total collections, membership sales, PT sales, day pass revenue, e-commerce revenue, total check-ins, active members, renewals due.
Revenue mix: card vs cash vs online vs other payment modes.
Operational highlights: attendance of staff, member footprint/footfall, low-performing branches, expiring memberships, pending follow-ups.
Recommended enhancement: a “Today needs attention” card that lists urgent operational items, not only metrics.
6.3 Staff performance area for admin
Each staff member card/profile should show target assigned, target achieved, conversion quality, PT handled, follow-up completion, attendance, and feedback score.
The interface should support comments or coaching notes from management.
Recommended enhancement: performance color bands (excellent / on track / at risk) and weekly trend sparkline.
6.4 Deals and referrals
Admin can create time-bound offers, apply them to one or multiple branches, and review uptake.
Referral codes should support owner assignment, validity, discount type, usage limits, and performance analytics.
Recommended enhancement: coupon preview card for easy sharing to WhatsApp and social channels.
6.5 BiOS analytics
This module should summarize high-level business health, not raw reports only.
Sections should include churn overview, trainer productivity, class utilization, add-on performance, e-commerce health, expense visibility, upcoming receivables/payables, and branch ranking.
Recommended enhancement: AI narrative summary such as “Membership renewals are up 14% vs last month, but Class A utilization fell in Branch 2.”



7. Member experience
The member app must feel simple, polished, and highly action-oriented. The member should be able to discover gyms, join, manage subscription benefits, check in, and engage with trainers without seeing enterprise complexity.
7.1 Member onboarding paths


7.2 Member dashboard states
State A – Marketplace mode: before the member joins a gym, the dashboard should show gym/studio listing cards with facilities, fees, trainers, location, offers, and membership options.
State B – Active membership mode: after joining or linking a gym, the dashboard becomes gym-specific and shows check-in, days remaining, membership type, booked classes, and add-on opportunities.
State C – Expiring / frozen / inactive mode: the top card should explain the status clearly and present the next action such as renew, unfreeze date, or contact club.7.3 Member core modules


7.4 Check-in experience
App validates active membership and access date rules.
When the member is within eligible context, the check-in button becomes active and prominent.
Member taps Check In.
System triggers access/gate communication flow or attendance registration flow as configured by the gym.
Success state confirms access and attendance time; failure state gives a clear reason and next action.
Recommended enhancement: show gate connection status or branch status where access control is integrated, so the user understands whether the app is ready.
Recommended enhancement: add wallet/pass QR fallback in case smart trigger access is unavailable.
7.5 Freeze and renewal controls
Freeze eligibility, balance days, policy text, and next activation date must be transparent to the member.
Renewal offers should be contextual, showing savings, plan benefits, and validity.
Recommended enhancement: one-tap renewal recommendation based on current usage pattern.
8. Trainer experience
The trainer app should help coaches manage their day, communicate with members, track targets, and understand earnings without making the flow feel like payroll software.


Recommended enhancement: quick action buttons for “Start session”, “Mark complete”, and “Send next workout plan”.
Recommended enhancement: member progress snapshots inside schedule detail to help the trainer prepare before sessions.
9. Staff experience
Staff users mainly need a work-operating tool for sales and front-desk execution. Their experience should be simpler than admin but more action-heavy than trainer.


Recommended enhancement: smart follow-up queue sorted by urgency, inquiry age, and renewal probability.
10. Virtual Studio (future module)
This module is marked as future scope in the source. The design team should visually acknowledge it without making it appear incomplete or broken. Suggested treatment: “Upcoming” card with teaser screens only in the early design stage.
Potential future capabilities: live sessions, on-demand workouts, remote coaching, digital memberships, nutrition content, program marketplace.
11. Shared UX requirements across all roles


12. Screen inventory for design team



13. Suggested navigation pattern
The design team may adapt final patterns, but the following navigation guidance will produce a cleaner app architecture:
Admin: bottom navigation with Dashboard, Staff, Deals, Analytics, More/Settings.
Member: bottom navigation with Home, Bookings, My Trainer, Membership, Profile.
Trainer: bottom navigation with Home, Schedule, Performance, LedgerOne, Profile.
Staff: bottom navigation with Home, Performance, Schedule, LedgerOne, Profile.
Use top tabs or segmented controls inside heavy modules such as Analytics, Membership, or LedgerOne to avoid deep menu trees.
14. Functional additions recommended for a more professional product
Unified notification center with unread counters and action CTAs.
Calendar sync option for booked sessions and classes.
Receipt / invoice history for members and compensation slips for trainers/staff.
In-app support ticket or help request flow.
Quick switch branch option for authorized multi-branch admins and staff.
Member progress widgets such as weight, body metrics, attendance streak, and plan adherence.
Offer banners that are rule-based rather than generic, for example renewal offer only to expiring members.
Audit trail / activity log for important admin actions.
Dashboard personalization so each role can pin the most-used widgets.
15. Non-functional expectations for design and engineering alignment
Responsive layout support for standard phone sizes; tablet adaptation may be considered for admin later.
Fast perceived performance with skeleton loaders and background refresh patterns.
Secure role-based data visibility; users must never see data outside their entitlement.
Scalable module architecture because the same product will grow across multiple gym formats and future digital services.
Consistent analytics instrumentation should be planned from design stage for important actions such as bookings, renewals, check-ins, PT purchases, and offer redemptions.
16. Open assumptions to confirm during design workshop
Whether admin is only owner-level, or also includes branch manager role with restricted visibility.
Exact access-control method for check-in: app trigger, BLE/Wi-Fi/Bluetooth, QR fallback, or mixed mode.
Whether trainer and staff remain one login flow with role split after authentication, or separate entry screens.
Depth of e-commerce capability inside the mobile app.
How much payroll detail should be visible to trainer/staff in mobile view.
Which member communication mode is preferred: full chat, guided chat, or structured message templates.
17. Final handoff summary
This refined SRD is intended to be the baseline design brief. The design team should use it to prepare role-based user flows, low-fidelity wireframes, visual design system decisions, and clickable prototypes. Any future engineering PRD can be derived from this document by converting each module and screen into epics, user stories, and acceptance criteria.
Recommended next step: create the design file in four streams — Common/Auth, Admin, Member, Trainer/Staff — and validate the check-in, booking, renewal, and payroll-summary flows first, because these are the highest-impact journeys.