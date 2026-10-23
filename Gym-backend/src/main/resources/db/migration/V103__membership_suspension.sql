-- Membership suspension: a gym can suspend the membership it holds for someone, but
-- never their app account (docs/global-accounts-for-gym-created-members-plan.md §5).
-- Until now the web/mobile "App Access" toggle did both jobs through
-- members.app_access_enabled (shared with the payment-approval lock) and, for
-- gym-created logins, users.enabled — which stopped them signing in at all.

ALTER TABLE members ADD COLUMN IF NOT EXISTS app_access_enabled BOOLEAN;
ALTER TABLE members ADD COLUMN IF NOT EXISTS membership_suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS suspended_reason TEXT;
ALTER TABLE members ADD COLUMN IF NOT EXISTS suspended_by VARCHAR(255);
ALTER TABLE members ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;

-- Carry over existing staff blocks. app_access_enabled = false with no pending or
-- rejected purchase behind it can only have come from the toggle; members with no
-- linked account at all were never blocked (the add-member form just left access off).
UPDATE members
SET membership_suspended = TRUE,
    suspended_reason = 'Carried over from the former App Access toggle',
    suspended_at = NOW()
WHERE app_access_enabled = FALSE
  AND membership_suspended = FALSE
  AND (approval_status IS NULL OR approval_status NOT IN ('PENDING', 'REJECTED'))
  AND (user_id IS NOT NULL OR global_user_id IS NOT NULL);

-- Gym-created logins that the toggle disabled can sign in again. Only member-only
-- accounts: a login that also holds a staff role keeps whatever staff tools set.
UPDATE users
SET enabled = TRUE
WHERE enabled = FALSE
  AND id IN (SELECT user_id FROM members WHERE user_id IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1 FROM user_roles ur JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = users.id AND r.role_name <> 'MEMBER');
