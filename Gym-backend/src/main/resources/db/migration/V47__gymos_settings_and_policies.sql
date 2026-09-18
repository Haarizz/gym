-- GymOS System Overview / Configuration tab: replaces gymos.tsx's remaining
-- hardcoded mock data (Transfer Policy, Member Deactivation Policy, System
-- Configuration widget, Plans & Services Catalog Configuration) with real,
-- persisted, admin-managed records.

-- Generic key/value settings for GymOS policies, gym-wide (not branch-scoped),
-- mirroring financial_settings' proven shape. category groups related keys:
-- TRANSFER_POLICY, DEACTIVATION_POLICY, SYSTEM_CONFIG.
CREATE TABLE IF NOT EXISTS gymos_settings (
    id             BIGSERIAL PRIMARY KEY,
    category       VARCHAR(50) NOT NULL,
    setting_key    VARCHAR(100) NOT NULL,
    setting_value  TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP,
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255),
    CONSTRAINT uq_gymos_settings_category_key UNIQUE (category, setting_key)
);

-- Default deactivation reasons list (Member Deactivation Policy card), replacing
-- the 5 copy-pasted JSX blocks with real, editable rows.
CREATE TABLE IF NOT EXISTS deactivation_reasons (
    id          BIGSERIAL PRIMARY KEY,
    reason      VARCHAR(255) NOT NULL,
    active      BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order  INTEGER NOT NULL DEFAULT 0,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

-- Which sections show in the walk-in inquiry Plans & Services Catalog,
-- replacing gymos.tsx's local-only catalogOptions mock.
CREATE TABLE IF NOT EXISTS catalog_display_sections (
    id           BIGSERIAL PRIMARY KEY,
    section_key  VARCHAR(64) NOT NULL UNIQUE,
    title        VARCHAR(255) NOT NULL,
    description  VARCHAR(500),
    enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP,
    created_by   VARCHAR(255),
    updated_by   VARCHAR(255)
);

-- Seed defaults matching the values previously hardcoded in gymos.tsx, so the
-- UI shows the same starting configuration but now backed by real, editable rows.
INSERT INTO gymos_settings (category, setting_key, setting_value, created_at)
SELECT v.category, v.setting_key, v.setting_value, NOW()
FROM (VALUES
    ('TRANSFER_POLICY', 'allow_transfer', 'true'),
    ('TRANSFER_POLICY', 'fee_structure', 'flat'),
    ('TRANSFER_POLICY', 'default_transfer_fee', '100'),
    ('TRANSFER_POLICY', 'min_days_after_joining', '15'),
    ('TRANSFER_POLICY', 'require_admin_approval', 'false'),
    ('DEACTIVATION_POLICY', 'allow_deactivation', 'true'),
    ('DEACTIVATION_POLICY', 'allow_refund', 'true'),
    ('DEACTIVATION_POLICY', 'refund_method', 'prorated'),
    ('DEACTIVATION_POLICY', 'approval_required', 'true'),
    ('SYSTEM_CONFIG', 'session_timeout_minutes', '30'),
    ('SYSTEM_CONFIG', 'auto_logout_minutes', '60')
) AS v(category, setting_key, setting_value)
WHERE NOT EXISTS (
    SELECT 1 FROM gymos_settings s WHERE s.category = v.category AND s.setting_key = v.setting_key
);

INSERT INTO deactivation_reasons (reason, active, sort_order, created_at)
SELECT v.reason, TRUE, v.sort_order, NOW()
FROM (VALUES
    ('Member Relocation', 1),
    ('Medical Reasons', 2),
    ('Financial Issues', 3),
    ('Dissatisfaction', 4),
    ('Other', 5)
) AS v(reason, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM deactivation_reasons dr WHERE dr.reason = v.reason);

INSERT INTO catalog_display_sections (section_key, title, description, enabled, sort_order, created_at)
SELECT v.section_key, v.title, v.description, v.enabled, v.sort_order, NOW()
FROM (VALUES
    ('membership-plans', 'Membership Plans & Pricing', 'Display gym membership packages and pricing tiers', TRUE, 1),
    ('training-streams', 'Training Streams', 'Show available training programs and specialties', TRUE, 2),
    ('classes', 'Classes', 'List group fitness classes and schedules', FALSE, 3)
) AS v(section_key, title, description, enabled, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM catalog_display_sections c WHERE c.section_key = v.section_key);
