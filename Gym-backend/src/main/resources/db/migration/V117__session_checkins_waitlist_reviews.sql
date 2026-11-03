-- Trainings & Classes session management:
--  * bookings.checked_in_at  — when a participant was checked in (QR or by staff)
--  * waitlist                — a booking on a full session gets status 'waitlisted' (no new column)
--  * session_reviews         — a member's 1-5 star rating (+ comment) of a session they booked

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS session_reviews (
    id          BIGSERIAL PRIMARY KEY,
    session_id  BIGINT    NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
    booking_id  BIGINT    REFERENCES bookings(id) ON DELETE SET NULL,
    member_id   BIGINT    NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    rating      INTEGER   NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT,
    branch_id   BIGINT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255),
    CONSTRAINT uq_session_reviews_session_member UNIQUE (session_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_session_reviews_session ON session_reviews (session_id);
