-- GymOS System Overview: replaces gymos.tsx's remaining hardcoded mock data
-- (apiIntegrations, accessControlDevices, userRoles POS-mode assignments)
-- with real, persisted, admin-managed records.

-- One row per third-party integration a gym can connect (payment gateway,
-- SMS, email, etc.). Status/success-rate/last-sync are admin- or
-- system-updated, not live-probed (no external monitoring layer exists).
CREATE TABLE IF NOT EXISTS integrations (
    id                BIGSERIAL PRIMARY KEY,
    integration_key   VARCHAR(64) NOT NULL UNIQUE,
    name              VARCHAR(255) NOT NULL,
    category          VARCHAR(50) NOT NULL,
    status            VARCHAR(20) NOT NULL DEFAULT 'DISCONNECTED',
    success_rate      NUMERIC(5,2),
    last_sync_at      TIMESTAMP,
    notes             TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMP,
    created_by        VARCHAR(255),
    updated_by        VARCHAR(255)
);

-- Physical access-control hardware (face scanners, card readers, turnstiles)
-- per branch. Status is admin-managed (no IoT/heartbeat integration exists).
CREATE TABLE IF NOT EXISTS access_control_devices (
    id              BIGSERIAL PRIMARY KEY,
    device_code     VARCHAR(64) NOT NULL UNIQUE,
    name            VARCHAR(255) NOT NULL,
    device_type     VARCHAR(50) NOT NULL,
    location        VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'OFFLINE',
    last_sync_at    TIMESTAMP,
    branch_id       BIGINT,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_access_control_devices_branch_id ON access_control_devices (branch_id);

-- Which POS mode a role is assigned to (Retail POS / F&B POS), replacing
-- gymos.tsx's local-only userRoles mock. Nullable: existing roles start
-- unassigned rather than silently defaulting to one mode.
ALTER TABLE roles ADD COLUMN IF NOT EXISTS pos_mode VARCHAR(20);

-- Seed the integrations this app actually ships wiring for today, so the
-- widget shows real (if mostly DISCONNECTED) rows instead of an empty state.
-- Email reflects EmailService's SMTP config; the rest are genuinely not
-- connected since no provider client exists in the codebase.
INSERT INTO integrations (integration_key, name, category, status, created_at)
SELECT v.integration_key, v.name, v.category, v.status, NOW()
FROM (VALUES
    ('EMAIL', 'Email Service (SMTP)', 'Messaging', 'DISCONNECTED'),
    ('PAYMENT_GATEWAY', 'Payment Gateway', 'Payments', 'DISCONNECTED'),
    ('SMS', 'SMS Service', 'Messaging', 'DISCONNECTED')
) AS v(integration_key, name, category, status)
WHERE NOT EXISTS (
    SELECT 1 FROM integrations i WHERE i.integration_key = v.integration_key
);
