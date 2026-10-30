-- Per-branch check-in timing rules, configured from the Check In page. Previously the
-- 120-min gap between visits was a constant in CheckInPolicyService.
--   min_visit_minutes    — a member can't check themselves out sooner than this (staff may override)
--   break_grace_minutes  — re-entering within this long after a check-out resumes the same visit
--   cooldown_minutes     — otherwise, the gap required between a check-out and the next check-in
CREATE TABLE IF NOT EXISTS check_in_settings (
    id                  BIGSERIAL PRIMARY KEY,
    branch_id           BIGINT,
    min_visit_minutes   INT NOT NULL DEFAULT 0,
    break_grace_minutes INT NOT NULL DEFAULT 0,
    cooldown_minutes    INT NOT NULL DEFAULT 120,
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP,
    created_by          VARCHAR(255),
    updated_by          VARCHAR(255)
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_check_in_settings_branch ON check_in_settings (branch_id) WHERE branch_id IS NOT NULL;

-- Time a member spent outside on quick breaks during one visit; left out of total_minutes.
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS break_minutes INT NOT NULL DEFAULT 0;
