-- Profiles auto-created on first read of /mobile/profile/me used to get the
-- placeholder full_name 'Member'. For admin/staff/trainer accounts that name was
-- then shown in the app header and profile. Replace it with the login username.
-- Member accounts are left alone: their real name comes from profile completion.
UPDATE user_profiles up
SET full_name = u.username,
    updated_at = NOW()
FROM users u
WHERE up.user_id = u.id
  AND up.full_name = 'Member'
  AND NOT EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = u.id
        AND r.role_name = 'MEMBER'
  );
