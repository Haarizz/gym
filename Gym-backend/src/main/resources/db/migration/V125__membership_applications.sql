-- Public "Service Portfolios" share link + online membership applications.
--
-- An admin shares /join/{tenant}/{branch}/{token}; a visitor browses the gym's
-- plans and services without logging in, picks a plan, fills in their details and
-- either pays online (simulated card checkout) or chooses to pay cash at the gym.
-- Nothing is created on the member side until staff approve: approval creates the
-- member, assigns the plan and posts the receipt. Payment status and approval status
-- are tracked separately — a paid application still needs approval.

-- Random token in the share link, so an admin can revoke a link by resetting it.
-- NULL until the admin first opens Share Link.
ALTER TABLE branches ADD COLUMN IF NOT EXISTS catalog_share_token VARCHAR(40);

CREATE TABLE IF NOT EXISTS membership_applications (
    id                      BIGSERIAL PRIMARY KEY,
    branch_id               BIGINT       NOT NULL,
    -- Short code shown to the visitor (e.g. APP-7KQ2M9XD) to quote at reception.
    reference               VARCHAR(20)  NOT NULL,

    full_name               VARCHAR(255) NOT NULL,
    phone                   VARCHAR(50)  NOT NULL,
    email                   VARCHAR(255),
    gender                  VARCHAR(20),
    date_of_birth           DATE,
    address                 TEXT,
    emergency_contact_name  VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    notes                   TEXT,

    plan_id                 BIGINT       NOT NULL,
    plan_name               VARCHAR(255) NOT NULL,
    plan_duration           VARCHAR(100),
    -- Price list value and what the visitor was asked to pay (the plan's running offer).
    list_price              NUMERIC(12, 2) NOT NULL DEFAULT 0,
    amount                  NUMERIC(12, 2) NOT NULL DEFAULT 0,
    offer_label             VARCHAR(255),

    -- CASH | ONLINE
    payment_method          VARCHAR(20)  NOT NULL,
    -- PENDING (cash not yet received) | PAID | REFUNDED | VOID
    payment_status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    payment_reference       VARCHAR(100),
    card_brand              VARCHAR(30),
    card_last4              VARCHAR(4),
    paid_at                 TIMESTAMP,
    cash_received_by        VARCHAR(255),

    -- PENDING | APPROVED | REJECTED
    approval_status         VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    decided_by              VARCHAR(255),
    decided_at              TIMESTAMP,
    rejection_reason        TEXT,
    -- The member created on approval.
    member_id               BIGINT,
    member_code             VARCHAR(50),

    created_at              TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP,
    created_by              VARCHAR(255),
    updated_by              VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_applications_reference
    ON membership_applications (reference);
CREATE INDEX IF NOT EXISTS idx_membership_applications_branch_status
    ON membership_applications (branch_id, approval_status, created_at);
