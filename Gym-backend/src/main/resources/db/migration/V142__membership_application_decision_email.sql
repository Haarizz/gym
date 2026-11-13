-- Approvals › Applications: the applicant is emailed when staff approve or reject their
-- membership application. This records whether that email went out, so staff can see it and
-- resend it. Best effort: the decision is saved whatever happens to the email.

ALTER TABLE membership_applications
    -- SENT | FAILED | NOT_CONFIGURED (no mailbox in GymOS › Settings › Email and no server SMTP)
    ADD COLUMN IF NOT EXISTS decision_email_status VARCHAR(20),
    ADD COLUMN IF NOT EXISTS decision_email_error  TEXT,
    ADD COLUMN IF NOT EXISTS decision_email_at     TIMESTAMP;
