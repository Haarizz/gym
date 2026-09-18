-- GymOS Module Management: platform_modules (real enable/disable + status,
-- replacing gymos.tsx's hardcoded moduleStatus sample data) and
-- module_audit_logs (who changed what, mirroring financial_audit_logs).

CREATE TABLE IF NOT EXISTS platform_modules (
    id                     BIGSERIAL PRIMARY KEY,
    module_key             VARCHAR(64) NOT NULL UNIQUE,
    display_name           VARCHAR(255) NOT NULL,
    status                 VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    enabled                BOOLEAN NOT NULL DEFAULT TRUE,
    last_status_change_at  TIMESTAMP,
    created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at             TIMESTAMP,
    created_by             VARCHAR(255),
    updated_by             VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS module_audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    action      VARCHAR(20) NOT NULL,
    module_key  VARCHAR(64) NOT NULL,
    performed_by VARCHAR(255),
    ip_address  VARCHAR(64),
    summary     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_module_audit_logs_module_key_created_at
    ON module_audit_logs (module_key, created_at DESC);

-- Seed the curated set of toggleable modules (PlatformModuleService.MANAGEABLE_MODULES).
INSERT INTO platform_modules (module_key, display_name, status, enabled, created_at)
SELECT v.module_key, v.display_name, 'ACTIVE', TRUE, NOW()
FROM (VALUES
    ('COMMUNITY', 'Community Management'),
    ('MEMBER_CONNECT', 'Member Connect'),
    ('SALES_PURCHASES', 'Sales & Purchases'),
    ('FINANCIALS', 'Financials'),
    ('PAYROLL', 'Payroll & Employees'),
    ('ASSETS', 'Assets Management'),
    ('BIOS', 'BiOS Analytics'),
    ('REPORTS', 'Advanced Reports')
) AS v(module_key, display_name)
WHERE NOT EXISTS (
    SELECT 1 FROM platform_modules pm WHERE pm.module_key = v.module_key
);
