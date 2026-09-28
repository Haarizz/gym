-- Per-redemption ledger for promotions. promotions.usage_count / total_revenue
-- are running totals with no timestamps, so time-windowed metrics like the
-- Deals screen's "This Month's Impact" (revenue from deals, new members won
-- through deals) had nothing to aggregate over.
CREATE TABLE IF NOT EXISTS promotion_redemptions (
    id BIGSERIAL PRIMARY KEY,
    promotion_id BIGINT NOT NULL,
    member_id BIGINT,
    revenue NUMERIC(12, 2),
    savings NUMERIC(12, 2),
    redeemed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    branch_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_redeemed_at ON promotion_redemptions (redeemed_at);
CREATE INDEX IF NOT EXISTS idx_promotion_redemptions_promotion_id ON promotion_redemptions (promotion_id);
