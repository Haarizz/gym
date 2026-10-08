-- POS terminals & counters (BillBull parity):
--  * pos_counters — named checkout counters a terminal can be assigned to.
--  * pos_terminals — registered POS devices (browser fingerprint + a terminal code kept in the
--    browser). Optional approval of new devices, one main terminal per branch, maintenance /
--    blocked, archive (restorable) and decommission (permanent). Online / offline is derived from
--    last_heartbeat_at when read.
--  * pos_sessions.terminal_id / counter_name — the terminal a session runs on; a terminal holds at
--    most one open session. pos_session_terminal_history records moves between terminals.
--  * pos_settings — require_terminal_approval, max_terminals, offline_threshold_minutes.
-- Idempotent.

CREATE TABLE IF NOT EXISTS pos_counters (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    code VARCHAR(40) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pos_counters_branch_code ON pos_counters (COALESCE(branch_id, 0), code);

CREATE TABLE IF NOT EXISTS pos_terminals (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    terminal_code VARCHAR(40) NOT NULL,
    name VARCHAR(100) NOT NULL,
    counter_id BIGINT,
    counter_name VARCHAR(100),
    device_fingerprint VARCHAR(128),
    device_info VARCHAR(500),
    operating_system VARCHAR(100),
    browser VARCHAR(100),
    ip_address VARCHAR(64),
    is_main BOOLEAN NOT NULL DEFAULT FALSE,
    -- PENDING, ACTIVE, MAINTENANCE, BLOCKED, ARCHIVED, DECOMMISSIONED
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    registered_by VARCHAR(100),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    rejection_reason VARCHAR(500),
    last_seen_at TIMESTAMP,
    last_heartbeat_at TIMESTAMP,
    last_user VARCHAR(100),
    current_session_id BIGINT,
    status_reason VARCHAR(500),
    archived_at TIMESTAMP,
    decommissioned_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_pos_terminals_code ON pos_terminals (terminal_code);
CREATE INDEX IF NOT EXISTS idx_pos_terminals_fingerprint ON pos_terminals (device_fingerprint, branch_id);

CREATE TABLE IF NOT EXISTS pos_session_terminal_history (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT,
    session_id BIGINT NOT NULL,
    terminal_id BIGINT,
    terminal_name VARCHAR(100),
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    moved_by VARCHAR(100),
    approved_by VARCHAR(100),
    reason VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_pos_session_terminal_history_session ON pos_session_terminal_history (session_id);

DO $$
BEGIN
    IF to_regclass('public.pos_sessions') IS NOT NULL THEN
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS terminal_id BIGINT;
        ALTER TABLE pos_sessions ADD COLUMN IF NOT EXISTS counter_name VARCHAR(100);
    END IF;
    IF to_regclass('public.pos_settings') IS NOT NULL THEN
        ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS require_terminal_approval BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS max_terminals INTEGER NOT NULL DEFAULT 10;
        ALTER TABLE pos_settings ADD COLUMN IF NOT EXISTS offline_threshold_minutes INTEGER NOT NULL DEFAULT 15;
    END IF;
END $$;
