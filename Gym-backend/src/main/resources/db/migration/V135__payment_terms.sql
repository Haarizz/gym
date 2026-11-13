-- GymOS › Settings › Payment Terms.
--
-- Terms & conditions the member has to accept before a payment is taken at the desk
-- (new membership, renewal, upgrade, freeze, add-on, personal training, dues, day
-- pass, sales invoice — never the POS). A branch can keep several sets, each switched
-- on or off on its own and attached to the payment types it covers.

CREATE TABLE IF NOT EXISTS payment_terms (
    id           BIGSERIAL PRIMARY KEY,
    branch_id    BIGINT       NOT NULL,
    title        VARCHAR(150) NOT NULL,
    content      TEXT         NOT NULL,
    -- Comma-separated payment kinds, e.g. "registration,renewal,upgrade".
    applies_to   TEXT         NOT NULL DEFAULT '',
    enabled      BOOLEAN      NOT NULL DEFAULT TRUE,
    sort_order   INTEGER      NOT NULL DEFAULT 0,
    -- Goes up whenever the title or wording changes, so an acceptance says which text was agreed.
    version      INTEGER      NOT NULL DEFAULT 1,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP,
    created_by   VARCHAR(255),
    updated_by   VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_payment_terms_branch ON payment_terms (branch_id);

-- One row per terms set accepted before a payment: who agreed, for what, and a copy
-- of the exact wording at that moment.
CREATE TABLE IF NOT EXISTS payment_terms_acceptances (
    id             BIGSERIAL PRIMARY KEY,
    branch_id      BIGINT,
    payment_kind   VARCHAR(40)  NOT NULL,
    member_db_id   BIGINT,
    member_name    VARCHAR(255),
    amount         NUMERIC(12, 2),
    terms_id       BIGINT,
    terms_title    VARCHAR(150) NOT NULL,
    terms_version  INTEGER      NOT NULL DEFAULT 1,
    terms_content  TEXT         NOT NULL,
    created_at     TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP,
    created_by     VARCHAR(255),
    updated_by     VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_payment_terms_acc_branch ON payment_terms_acceptances (branch_id, created_at);
CREATE INDEX IF NOT EXISTS idx_payment_terms_acc_member ON payment_terms_acceptances (member_db_id);
