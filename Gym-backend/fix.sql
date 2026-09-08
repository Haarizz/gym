UPDATE tenant_fitzone_new.members 
SET global_user_id = (SELECT id FROM users WHERE username = 'gokulvs3221' LIMIT 1)
WHERE id = 21;
