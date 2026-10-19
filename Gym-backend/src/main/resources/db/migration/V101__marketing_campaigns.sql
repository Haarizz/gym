-- V101__marketing_campaigns.sql
-- Marketing (social-media / ads) campaigns: a time-boxed push with a budget, the money and
-- team hours actually spent on it, and the lead forms its ads point to. Leads created from a
-- linked form (or from an ad link whose utm_campaign matches the campaign's tracking code)
-- are stamped with the campaign, so each campaign reports leads -> conversions -> revenue
-- against what it cost. Unrelated to referral_campaigns (referral reward windows).
-- IF NOT EXISTS: Hibernate (ddl-auto=update) may already have built these on the primary DB.

CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id                 BIGSERIAL PRIMARY KEY,
    campaign_code      VARCHAR(30) UNIQUE,
    name               VARCHAR(150)  NOT NULL,
    description        TEXT,
    -- instagram / facebook / meta / google / youtube / whatsapp / offline / other
    platform           VARCHAR(30)   NOT NULL DEFAULT 'instagram',
    -- leads / trials / awareness / renewals / event
    objective          VARCHAR(30)   NOT NULL DEFAULT 'leads',
    -- draft / active / paused / completed / cancelled
    status             VARCHAR(20)   NOT NULL DEFAULT 'draft',
    start_date         DATE          NOT NULL,
    end_date           DATE          NOT NULL,
    budget             NUMERIC(12, 2),
    target_leads       INT,
    target_conversions INT,
    -- matched (case-insensitively) against utm_campaign on lead-form links
    tracking_code      VARCHAR(100),
    owner_name         VARCHAR(255),
    notes              TEXT,
    branch_id          BIGINT,
    created_at         TIMESTAMP     NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP,
    created_by         VARCHAR(255),
    updated_by         VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_branch ON marketing_campaigns (branch_id);

-- Lead forms whose submissions count toward a campaign. lead_form_id is a control-plane
-- lead_capture_forms.id (another database), so there is no foreign key on it.
CREATE TABLE IF NOT EXISTS marketing_campaign_lead_forms (
    id           BIGSERIAL PRIMARY KEY,
    campaign_id  BIGINT    NOT NULL REFERENCES marketing_campaigns (id) ON DELETE CASCADE,
    lead_form_id BIGINT    NOT NULL,
    created_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP,
    created_by   VARCHAR(255),
    updated_by   VARCHAR(255),
    CONSTRAINT uq_marketing_campaign_lead_form UNIQUE (campaign_id, lead_form_id)
);
CREATE INDEX IF NOT EXISTS idx_mc_lead_forms_form ON marketing_campaign_lead_forms (lead_form_id);

-- What a campaign cost, entry by entry: ad spend, creatives, boosting... and team hours.
CREATE TABLE IF NOT EXISTS marketing_campaign_spends (
    id          BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT         NOT NULL REFERENCES marketing_campaigns (id) ON DELETE CASCADE,
    spend_date  DATE           NOT NULL,
    -- ad_spend / creative / boosting / influencer / printing / team_time / other
    category    VARCHAR(30)    NOT NULL DEFAULT 'ad_spend',
    amount      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    hours       NUMERIC(7, 2)  NOT NULL DEFAULT 0,
    notes       TEXT,
    created_at  TIMESTAMP      NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP,
    created_by  VARCHAR(255),
    updated_by  VARCHAR(255)
);
CREATE INDEX IF NOT EXISTS idx_mc_spends_campaign ON marketing_campaign_spends (campaign_id);

-- Attribution on the lead itself: which campaign and which lead form it came from.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketing_campaign_id BIGINT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lead_form_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_leads_marketing_campaign ON leads (marketing_campaign_id);
