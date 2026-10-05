-- V73__members_email_nullable.sql
-- Family/couple dependents are created without an email (the Add Member form
-- labels it "Email (optional)") and MemberService deliberately stores null for
-- them, but Hibernate's ddl-auto created members.email as NOT NULL, so every
-- family registration with a blank dependent email failed with "The email field
-- is required" (BG_81).
--
-- DROP NOT NULL is a no-op when the column is already nullable, so this is safe
-- to re-run on any tenant DB. The UNIQUE constraint stays: Postgres allows many
-- NULLs under a unique index, so real emails are still deduplicated.

ALTER TABLE members ALTER COLUMN email DROP NOT NULL;
