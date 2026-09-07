-- Repairs tenant databases provisioned before this branch was merged with main.
--
-- main independently added V24__user_profile.sql while this branch already had
-- its own V24 (gym_management_foundation) through V28 (drop_branch_gym_id) — a
-- real Flyway version collision the merge resolved by renumbering this branch's
-- V24-V28 up to V29-V33 (see commit 755a089's merge message). That renumber was
-- safe for any environment that hadn't run those migrations yet, but every
-- tenant database provisioned BEFORE the merge (acme-fitness, power-gym,
-- test-gym — confirmed live, likely all of them) already has a
-- flyway_schema_history row claiming "version 24" is applied, under the OLD
-- meaning (gym_management_foundation). Flyway only ever compares version
-- numbers, never content, so it will never re-run "V24" for these tenants now
-- that the source tree's V24 means something completely different
-- (user_profile) — leaving user_profiles permanently missing on every
-- pre-merge tenant, breaking tenant-owner login and the mobile
-- registration/profile endpoints the moment tenant routing sends them to their
-- own database. Guarded with IF NOT EXISTS so this is a no-op everywhere the
-- table already exists correctly (any tenant provisioned after the merge, and
-- the primary/local DB, which gets it from Hibernate ddl-auto instead).
CREATE TABLE IF NOT EXISTS user_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(50),
    nationality VARCHAR(100),
    address TEXT,
    photo_url TEXT,
    emergency_contact VARCHAR(255),
    emergency_phone VARCHAR(255),
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(255),
    blood_type VARCHAR(10),
    medical_conditions TEXT,
    allergies TEXT,
    current_medications TEXT,
    health_notes TEXT,
    chronic_illnesses TEXT,
    height DOUBLE PRECISION,
    weight DOUBLE PRECISION,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
