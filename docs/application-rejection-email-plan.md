# Membership applications: emailing the decision to the applicant

Status: **implemented 2026-11-13** (uncommitted) · approve + reject emails, one-off (no shared email layer yet)

## The problem

When staff approved or rejected an online membership application (Approvals → Applications), the applicant was never told. The rejection reason was saved on the application and shown only to staff.

- An applicant isn't a member yet, so there's no app account to notify. The mobile app has no applications screen.
- The public join page shows a one-time confirmation only. There's no status lookup.

Email is required on the application form (public link and desk), so **email is the one channel that reaches every applicant.**

## What already existed

Sending is unified, and each gym can use its own mailbox:

| Piece | Where | What it does |
|---|---|---|
| Gym mailbox settings | GymOS → Settings → Email (`EmailSettingsController`, `EmailSettingsService`, table `email_settings`, V129) | SMTP host/port/security, username, encrypted app password, **From address, sender name, reply-to**, and a test email. Applies to the whole gym (every branch) |
| Choosing the mailbox | `services/email/GymMailResolver` | Reads the gym's settings from the gym's database **on every send**, through the request's tenant |
| Sending | `EmailService.sendEmail(to, subject, html)` | Uses the gym's mailbox if one is set up, otherwise the server `SMTP_*` / `MESSAGE_EMAIL_FROM`. `isConfigured()` is true if either exists |
| Error text | `services/email/MailErrors.explain()` | Turns SMTP exceptions into advice a gym owner can act on |

So the decision emails need no new settings. **From, sender name and reply-to all come from the gym's Settings → Email** (decision: always the gym's reply-to, not the branch email).

## What was built

### When emails go out
- **Approve** → "Welcome to {Gym} · {Branch}: your membership is approved". Includes the reference, a note that the membership starts today, the **member ID**, the payment (card ending … / cash at the front desk), any household members added, and a note that the front desk can set them up on the GymBios app. It doesn't promise automatic app linking, because members are linked to app accounts by staff, not by email.
- **Reject** → "Your membership application at {Gym} · {Branch}". Includes the reference, the **reason as staff wrote it** (escaped, line breaks kept, in a quote box), and either "The {amount} you paid (card ending …) has been refunded" or "No payment was taken".
- Both have a gym-name header and a footer with the branch phone and email.

### How it's sent
- `MembershipApplicationService.approve()` / `reject()` save the decision in its own `TransactionTemplate`. **Once it has committed**, `emailDecision()` sends on the same request thread, so the gym's mailbox is still found through the tenant.
- **Best effort:** if email isn't set up or the send fails, the decision still stands. The outcome is recorded:
  - migration **V142**: `membership_applications.decision_email_status` (`SENT` | `FAILED` | `NOT_CONFIGURED`), `decision_email_error`, `decision_email_at`.
- **Resend:** `POST /api/members/applications/{id}/resend-email` sends the email again for an approved or rejected application. It refuses a pending one. Permission is MEMBERS edit.
- The email text is built in `services/MembershipApplicationEmails` (package-private). The gym name comes from `TenantDataSources.gymName(tenant)`, the same one the public join page shows. The currency comes from `ServicePortfolioService.currencyCode(branchId)`.
- **Refund wording:** card payments are still simulated, so "has been refunded" mirrors `payment_status = REFUNDED`. When real payments go live, it must only be said after a real refund succeeds.

### What staff see (`components/approvals/ApplicationsPanel.tsx`)
- **Review / reject dialog:** "{Name} will be emailed their member ID at {email}" or "This reason will be emailed to {email} exactly as written". If email isn't set up (`email_configured = false` on the view), an amber warning says the applicant won't be notified and to contact them on {phone}.
- **Toasts** end with "{Name} has been emailed.", "The email … couldn't be sent…" or "Email isn't set up, so the applicant wasn't notified."
- **New "Recently decided" panel** under the pending queues. It lists approved and rejected applications (10 at a time, up to 100) with the reason, an **Emailed / Email failed / Not emailed** badge, the failure reason, and a **Resend email** button for anything not sent. Before this, decided applications weren't shown anywhere in the web app.

### Tests (`MembershipApplicationServiceTest`)
- The rejection email escapes the name and reason, keeps line breaks, and has the refund line and branch contact.
- Cash rejection says "No payment was taken".
- The approval email has the member ID and the card payment.
- No mailbox → `NOT_CONFIGURED`, the decision is saved and nothing is sent. A send that throws → `FAILED` with a reason, and the decision is saved.
- Resend works for a decided application and is refused for a pending one.

## Not done / later

- **"We received your application" email** on submit. Not requested this round.
- **A shared email layer.** Each email feature still writes its own "configured? send, catch, log", HTML and escaping. About 9 callers do this. Only receipts and now applications record what was sent. If more emails are added, it's worth extracting:
  - a `GymEmailLayout` (one branded template with built-in escaping), based on `MembershipApplicationEmails.layout()` and `ReceiptEmailService.html()`;
  - a `GymMailer` that never throws and returns SENT / FAILED / NOT_CONFIGURED;
  - a generic `email_log` table keyed by `ref_type` + `ref_id`, instead of per-feature status columns.
- **Each gym must fill in GymOS → Settings → Email** (or the server `SMTP_*` must be set). Until then every decision shows "Not emailed", and staff can resend once it's set up.
