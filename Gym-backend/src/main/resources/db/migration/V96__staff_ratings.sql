-- V96__staff_ratings.sql
-- Member ratings/reviews of a gym's staff (trainers, reception, sales, ...),
-- submitted from the mobile app and listed on the web Staffs & Trainers page.
-- Kept apart from reviews (branch ratings) and workout_feedbacks (per-session
-- feedback): a member may rate any staff of their gym, with no session needed.
-- One rating per member per staff member — rating again replaces it.

CREATE TABLE IF NOT EXISTS staff_ratings (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL,
    staff_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    member_id BIGINT NOT NULL,
    global_user_id BIGINT,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    -- JSON array of "what stood out" keys, e.g. ["motivating","punctual"]
    tags TEXT,
    -- Shown to other members as "Anonymous member"; gym staff still see the author.
    anonymous BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    UNIQUE (staff_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_staff_ratings_branch_id ON staff_ratings(branch_id);
CREATE INDEX IF NOT EXISTS idx_staff_ratings_staff_id ON staff_ratings(staff_id);
