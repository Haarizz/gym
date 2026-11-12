# Rejected applications: emailing the reason to the applicant

Status: plan, not implemented · 2026-11-11

## The problem

When staff reject an online membership application (Approvals → Applications), they must type a reason. The reason is saved on the application (`membership_applications.rejection_reason`) and shown only to staff. **It never reaches the applicant.**

- **No email is sent.** `MembershipApplicationService.reject()` saves the status, reason and refund marker, and does nothing else.
- **The mobile app can't show it either.** An applicant isn't a member yet, so there's no member record or app account to attach the reason to. The mobile app has no screen for membership applications. Even an applicant who has the app sees nothing.
- **The public join page can't show it.** After applying, the applicant sees a one-time confirmation with a reference number. There's no way to look up the application's status later.

The only contact details we have for an applicant are the ones they typed on the form. Email is required there and checked for format, so **email is the only channel that reliably reaches every applicant.**

## What email support exists today

Email sending already exists, but there are no per-gym email settings.

| Piece | Where | State |
|---|---|---|
| Sending | `services/EmailService.java`, `sendEmail(to, subject, html)` | Works. Uses Spring `JavaMailSender` over SMTP |
| SMTP server | `application.properties`: `spring.mail.*` from env vars `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_AUTH`, `SMTP_STARTTLS` | **One account for the whole platform.** If `SMTP_HOST` is empty, `isConfigured()` returns false and nothing is sent |
| From address | `messaging.email.from` = env `MESSAGE_EMAIL_FROM`, default `no-reply@gymbios.app` | One address for every gym. No sender name, no reply-to |
| Status | GymOS → Integrations → "Email Service (SMTP)" | Shows **Connected** only when the env vars are set. It can't be configured from the UI |
| Existing uses | Account codes, family invitations, member-app link invites, campaigns, weekly attendance report, rewards, scheduled reports | All follow the same pattern: check `isConfigured()`, send, and log the error on failure without failing the main action |

I can't tell from the repo whether QA or production have the `SMTP_*` variables set. The Integrations page shows it: **Connected** means set. If they aren't set, every email above is silently skipped today, and this feature would be skipped too until they are.

**What's missing for gyms:** each gym can't set its own sender name, reply-to address or SMTP account. Every email comes from `no-reply@gymbios.app` with no gym name. A reply from an applicant goes nowhere.

## Proposal

### Phase 1: send the rejection email (small, uses existing SMTP)

**1. Email on rejection.** After the rejection is saved (after commit, never inside the transaction), send one email to `application.email`:

> **Subject:** Your membership application at {Gym} · {Branch}
>
> Hi {Full name},
>
> Thank you for applying for the **{Plan}** membership at **{Gym}, {Branch}** (reference **{REF}**).
>
> Unfortunately we can't approve your application at this time.
>
> **Reason from the gym:**
> {rejection reason, quoted as written}
>
> *[Only if paid online]* The {amount} you paid by card (ending {last4}) has been refunded.
> *[Only if cash]* No payment was taken.
>
> If you have questions or would like to apply again, contact the gym:
> {branch phone} · {branch email}
>
> {Gym}

Rules:
- **Best effort.** If SMTP isn't configured or the send fails, the rejection still succeeds. This matches every other email in the system.
- **HTML-escape** the reason and the applicant's name (staff and applicants type free text). Keep the reason's line breaks.
- **Reply-to = the branch email** (`branches.email`) when it's set, so a reply reaches the gym and not `no-reply@`. This needs a small overload: `EmailService.sendEmail(to, subject, html, replyTo, fromName)`.
- **Sender name:** use `"{Gym name} via GymBios" <no-reply@gymbios.app>` so the inbox shows the gym. The gym name is the tenant name, the same one the public join page shows.
- **Refund wording:** card payments are still simulated (fake Stripe test cards), so the line just mirrors what the app records (`payment_status = REFUNDED`). When real payments go live, this sentence must only appear after a real refund succeeds.

**2. Record whether it went out.** Add a migration (next free number after V133) to `membership_applications`:

```sql
ALTER TABLE membership_applications
  ADD COLUMN decision_email_status VARCHAR(20),   -- SENT | FAILED | NOT_CONFIGURED
  ADD COLUMN decision_email_at     TIMESTAMP;
```

**3. Show it to staff.**
- **Reject dialog:** add a line under the reason box: *"This reason will be emailed to {email} exactly as written."* Staff will then write it for the applicant, not as an internal note.
- **If SMTP isn't configured:** the dialog warns *"Email isn't set up, so the applicant won't be notified. Contact them on {phone}."* (`ApplicationView` gets an `emailConfigured` flag.)
- **Decided list:** each rejected application shows "Email sent" / "Email failed" / "Not emailed", with a **Resend email** action for failed or not-emailed ones. Resend uses a new endpoint `POST /api/membership-applications/{id}/resend-decision-email` that resends the stored reason.
- **Success toast:** "…rejected, and the reason was emailed to the applicant" or "…rejected. Email isn't set up, so the applicant wasn't notified."

**4. Tests.** Rejecting sends one email with the escaped reason. SMTP not configured → status `NOT_CONFIGURED` and the rejection still saved. A send that throws → `FAILED` and the rejection still saved. Paid vs cash wording.

### Optional, same phase (cheap once the template exists)

- **Approval email:** "You're in. Your member ID is {code}. Download the app and sign in with this email." Today an approved applicant isn't told either.
- **"We received your application" email** on submit, with the reference and payment method. If they chose cash, it says to pay at the front desk.

### Phase 2: per-gym email settings (larger, only if needed)

Only needed if gyms want mail sent from their own domain or SMTP account. Phase 1 already handles the gym name and replies.

- A GymOS settings page: sender name, reply-to, and optionally the gym's own SMTP (host/port/user/password, password stored encrypted), with a **Send test email** button.
- `EmailService` picks the tenant's SMTP if it's set, otherwise the platform one.
- Brings the deliverability issues of gyms' own domains (SPF/DKIM), so it's best left until a gym asks for it.

## Decisions needed

1. **Phase 1 as described** (platform SMTP, gym name in the sender, branch email as reply-to)? Or go straight to per-gym settings?
2. **Include the approval and "received" emails** now, or only the rejection email?
3. **Confirm SMTP is set on QA/prod.** If GymOS → Integrations shows Email as Disconnected, set the `SMTP_*` and `MESSAGE_EMAIL_FROM` env vars on the server. Otherwise nothing will be sent.

## Files touched (phase 1)

- Backend: `EmailService` (reply-to and sender-name overload), `MembershipApplicationService` (send after commit, status, resend), `MembershipApplication` entity and `MembershipApplicationDTOs` (status fields and `emailConfigured`), `MembershipApplicationController` (resend endpoint), new migration, tests.
- Frontend: `components/approvals/ApplicationsPanel.tsx` (notice in the dialog, email status, resend), `utils/supabase/service-portfolio-service` (resend call, types).
