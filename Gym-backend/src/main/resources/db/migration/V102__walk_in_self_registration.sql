-- Walk-in self-registration: a visitor scans the gym's (or a staff member's) QR,
-- fills in a public form, and lands in a pending list. Nothing grants entry until
-- staff collect payment through the normal walk-in flow, which confirms the row.

-- Per-branch switch for the public /w/{tenant}/{branch} page.
ALTER TABLE branches ADD COLUMN IF NOT EXISTS walk_in_self_registration BOOLEAN NOT NULL DEFAULT FALSE;

-- Random code in a staff member's personal walk-in QR (?s=CODE), so the link
-- credits them without exposing a guessable employee id. Generated on first use.
ALTER TABLE employees ADD COLUMN IF NOT EXISTS walk_in_code VARCHAR(16);
CREATE UNIQUE INDEX IF NOT EXISTS uq_employees_walk_in_code ON employees (walk_in_code);

CREATE TABLE IF NOT EXISTS walk_in_registrations (
    id                      BIGSERIAL PRIMARY KEY,
    branch_id               BIGINT,
    name                    VARCHAR(255) NOT NULL,
    phone                   VARCHAR(50)  NOT NULL,
    email                   VARCHAR(255),
    plan_id                 BIGINT,
    plan_name               VARCHAR(255),
    referred_by_staff_id    BIGINT,
    referred_by_staff_name  VARCHAR(255),
    -- pending | confirmed | dismissed
    status                  VARCHAR(20)  NOT NULL DEFAULT 'pending',
    attendance_id           BIGINT,
    confirmed_at            TIMESTAMP,
    created_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP,
    created_by              VARCHAR(255),
    updated_by              VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_walk_in_registrations_status_created
    ON walk_in_registrations (status, created_at);
