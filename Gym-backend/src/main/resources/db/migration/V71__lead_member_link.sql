-- V71__lead_member_link.sql
-- Additive only: the member a converted lead was registered as. Lets the apps hide
-- "Register as Member" once it's done and blocks registering the same lead twice.
-- Plain id (no FK) so deleting a member never fails on its source lead; the member
-- delete endpoint clears the link instead.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS member_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_leads_member_id ON leads (member_id);
