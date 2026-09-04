-- ============================================================
-- V24: Gym Management Foundation
-- Introduces the Gym entity as a tenant layer above Branch.
-- A gym owns one or more branches; existing branches are backfilled
-- onto a seeded "Main Gym" so nothing currently in production is
-- orphaned. GYM_MANAGEMENT_* permissions are seeded in code via
-- PermissionCatalog + DataInitializer, not here.
-- ============================================================

CREATE TABLE IF NOT EXISTS gyms (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,
    address         TEXT,
    phone           VARCHAR(50),
    email           VARCHAR(255),
    contact_person  VARCHAR(255),
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    status          VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    owner_user_id   BIGINT REFERENCES users(id),
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

-- Seed default gym
INSERT INTO gyms (name, slug, status, is_default)
VALUES ('Main Gym', 'main', 'ACTIVE', TRUE)
ON CONFLICT (slug) DO NOTHING;

-- Add gym_id to branches and backfill existing branches onto Main Gym
ALTER TABLE branches ADD COLUMN IF NOT EXISTS gym_id BIGINT REFERENCES gyms(id);

UPDATE branches SET gym_id = (SELECT id FROM gyms WHERE slug = 'main') WHERE gym_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_branches_gym_id ON branches(gym_id);
