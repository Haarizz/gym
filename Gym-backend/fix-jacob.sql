INSERT INTO user_branches (user_id, branch_id, created_at)
SELECT u.id, m.branch_id, CURRENT_TIMESTAMP
FROM users u
JOIN members m ON u.email = m.email
WHERE u.username = 'jacob@123'
AND NOT EXISTS (
    SELECT 1 FROM user_branches ub WHERE ub.user_id = u.id
);
