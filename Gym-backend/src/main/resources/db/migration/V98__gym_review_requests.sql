-- V98__gym_review_requests.sql
-- Gym (branch) ratings, part 2.
--  * reviews gets the same "what stood out" tags and anonymous posting as
--    staff_ratings.
--  * A gym can ask its existing members to rate it ("Request reviews"): one
--    gym_review_requests row per send (30-day cooldown per branch, enforced in
--    code), and one gym_review_request_recipients row per member it went to.
--    The recipient row drives the app: PENDING opens the rate sheet on launch;
--    DISMISSED / RATED stop it opening again (the notification still opens it).

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS tags TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS anonymous BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS gym_review_requests (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL,
    recipient_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_gym_review_requests_branch_id ON gym_review_requests(branch_id, created_at);

CREATE TABLE IF NOT EXISTS gym_review_request_recipients (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES gym_review_requests(id) ON DELETE CASCADE,
    branch_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    -- PENDING | DISMISSED | RATED
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    UNIQUE (request_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_gym_review_request_recipients_member ON gym_review_request_recipients(member_id, status);
