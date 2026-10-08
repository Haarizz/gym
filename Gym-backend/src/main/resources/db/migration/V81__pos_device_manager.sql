-- POS device manager (BillBull parity):
--  * pos_devices — POS hardware register (printers, scanners, cash drawers, card terminals,
--    customer displays, scales). A PRINTER device mirrors a pos_printers row; a CASH_DRAWER names
--    the printer it is wired to. Health is reported by tills / print jobs / tests.
--  * pos_device_events — per-device event log (registered, health changed, print, drawer kick, …).
--  * pos_hardware_profiles (+ pos_hardware_profile_devices) — a named set of devices with roles,
--    assigned to terminals (pos_terminals.hardware_profile_id).
--  * pos_print_jobs — server print queue / log: network jobs keep their payload until they succeed so
--    failures can be retried; agent and browser prints are reported by the till.
-- Idempotent.

CREATE TABLE IF NOT EXISTS pos_devices (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    device_code VARCHAR(40) NOT NULL,
    name VARCHAR(120) NOT NULL,
    -- PRINTER, SCANNER, CASH_DRAWER, CARD_TERMINAL, CUSTOMER_DISPLAY, SCALE, GENERIC
    device_type VARCHAR(30) NOT NULL,
    connection_type VARCHAR(30),
    address VARCHAR(200),
    terminal_id BIGINT,
    terminal_name VARCHAR(100),
    printer_id BIGINT,
    -- ACTIVE, INACTIVE, MAINTENANCE, DECOMMISSIONED
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    -- UNKNOWN, HEALTHY, DEGRADED, OFFLINE
    health VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN',
    health_message VARCHAR(500),
    last_health_at TIMESTAMP,
    last_used_at TIMESTAMP,
    config_json TEXT,
    notes VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pos_devices_branch_code ON pos_devices (COALESCE(branch_id, 0), device_code);
CREATE INDEX IF NOT EXISTS idx_pos_devices_printer ON pos_devices (printer_id);

CREATE TABLE IF NOT EXISTS pos_device_events (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    device_id BIGINT,
    event_type VARCHAR(40) NOT NULL,
    -- SUCCESS, FAILURE, INFO
    result VARCHAR(20) NOT NULL DEFAULT 'INFO',
    message VARCHAR(1000),
    terminal_name VARCHAR(100),
    performed_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_pos_device_events_device ON pos_device_events (device_id, created_at);

CREATE TABLE IF NOT EXISTS pos_hardware_profiles (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS pos_hardware_profile_devices (
    id BIGSERIAL PRIMARY KEY,
    profile_id BIGINT NOT NULL,
    device_id BIGINT NOT NULL,
    -- RECEIPT_PRINTER, REPORT_PRINTER, CASH_DRAWER, SCANNER, CARD_TERMINAL, CUSTOMER_DISPLAY, SCALE
    role VARCHAR(30) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pos_hw_profile_role ON pos_hardware_profile_devices (profile_id, role);

CREATE TABLE IF NOT EXISTS pos_print_jobs (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    -- RECEIPT, REPORT, TEST, DRAWER_KICK, OTHER
    job_type VARCHAR(20) NOT NULL,
    printer_id BIGINT,
    printer_name VARCHAR(120),
    connection_type VARCHAR(20),
    terminal_name VARCHAR(100),
    title VARCHAR(200),
    source_type VARCHAR(40),
    source_ref VARCHAR(60),
    payload TEXT,
    payload_bytes INTEGER,
    -- QUEUED, DISPATCHED, SUCCEEDED, FAILED, CANCELLED
    status VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    attempt_count INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    last_error VARCHAR(1000),
    dispatched_at TIMESTAMP,
    completed_at TIMESTAMP,
    requested_by VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_pos_print_jobs_status ON pos_print_jobs (status, created_at);

DO $$
BEGIN
    IF to_regclass('public.pos_terminals') IS NOT NULL THEN
        ALTER TABLE pos_terminals ADD COLUMN IF NOT EXISTS hardware_profile_id BIGINT;
    END IF;
END $$;
