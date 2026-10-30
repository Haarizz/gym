-- GymBios accounts no longer need an email: staff can create one at the desk for a
-- member who has none (docs/global-accounts-for-gym-created-members-plan.md §1–2).
-- Still unique when present — PostgreSQL's UNIQUE allows any number of NULLs.
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Whether the account owner proved they receive mail at this address. Existing rows
-- signed up through email OTP or Google/Apple, so they start verified; an email
-- typed in by staff starts unverified, and password reset only ever goes to a
-- verified one, so a mistyped address can't be used to take the account over.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT TRUE;
