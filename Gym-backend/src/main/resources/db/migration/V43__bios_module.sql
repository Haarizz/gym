-- BiOS module backing tables (BiosSettings, BiosActivityLog).
--
-- The BiOS page's Set Targets / Set Alerts / Schedule Report / Configure
-- actions, and its "Recent Reports"/"Recent Exports" lists, were wired up on
-- the frontend and backend (BiosController/BiosService/BiosScheduler) with
-- no migration ever creating the tables they read and write.

CREATE TABLE IF NOT EXISTS bios_settings (
    id                                     BIGSERIAL PRIMARY KEY,
    branch_id                              BIGINT REFERENCES branches(id),
    monthly_revenue_target                 NUMERIC(14,2),
    daily_checkin_target_percent           DOUBLE PRECISION,
    alert_enabled                          BOOLEAN NOT NULL DEFAULT FALSE,
    alert_email                            VARCHAR(255),
    alert_retention_threshold              DOUBLE PRECISION DEFAULT 80.0,
    schedule_enabled                       BOOLEAN NOT NULL DEFAULT FALSE,
    schedule_email                         VARCHAR(255),
    schedule_frequency                     VARCHAR(20) DEFAULT 'WEEKLY',
    revenue_alert_enabled                  BOOLEAN NOT NULL DEFAULT FALSE,
    revenue_alert_threshold_percent        DOUBLE PRECISION DEFAULT 90.0,
    benchmark_revenue_per_member           NUMERIC(12,2),
    benchmark_retention_percent            DOUBLE PRECISION,
    benchmark_class_utilization_percent    DOUBLE PRECISION,
    benchmark_staff_efficiency_percent     DOUBLE PRECISION,
    benchmark_operating_margin_percent     DOUBLE PRECISION,
    created_at                             TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at                             TIMESTAMP,
    created_by                             VARCHAR(255),
    updated_by                             VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bios_settings_branch_id ON bios_settings (branch_id);

CREATE TABLE IF NOT EXISTS bios_activity_logs (
    id          BIGSERIAL PRIMARY KEY,
    type        VARCHAR(20) NOT NULL,
    title       VARCHAR(255) NOT NULL,
    format      VARCHAR(20) NOT NULL,
    row_count   INTEGER,
    created_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);

-- Backs BiosActivityLogRepository.findByTypeOrderByCreatedAtDesc /
-- countByTypeAndCreatedAtAfter.
CREATE INDEX IF NOT EXISTS idx_bios_activity_logs_type_created_at ON bios_activity_logs (type, created_at DESC);
