-- Month-end member counts per branch for the BiOS member trend chart.
--
-- Members only carry their *current* membership period, so a past month's
-- active count can't be recomputed exactly later. BiosScheduler writes one row
-- per branch just after each month ends; months before the first row are
-- estimated from membership receipts instead (see BiosService.getOverview).

CREATE TABLE IF NOT EXISTS bios_monthly_snapshots (
    id              BIGSERIAL PRIMARY KEY,
    branch_id       BIGINT NOT NULL REFERENCES branches(id),
    month           DATE NOT NULL,
    total_members   INTEGER NOT NULL,
    active_members  INTEGER NOT NULL,
    new_members     INTEGER NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP,
    created_by      VARCHAR(255),
    updated_by      VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bios_monthly_snapshots_branch_month ON bios_monthly_snapshots (branch_id, month);
