-- V99__member_enquiries.sql
-- Member enquiries: a member raises one from the mobile app (Profile → Raise Enquiry),
-- the gym answers it from the web app's Enquiries page.
--  * One staff reply per enquiry — a follow-up question is a new enquiry.
--  * Only staff close an enquiry (with or without replying).
--  * Belongs to the member's branch at the time they raised it.

CREATE TABLE IF NOT EXISTS member_enquiries (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    -- GENERAL | MEMBERSHIP | BILLING | FACILITIES | TRAINER | CLASSES | FEEDBACK | OTHER
    category VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    subject VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    -- OPEN | REPLIED | CLOSED
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    reply TEXT,
    replied_by VARCHAR(255),
    replied_at TIMESTAMP WITHOUT TIME ZONE,
    closed_by VARCHAR(255),
    closed_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_member_enquiries_member ON member_enquiries(member_id, created_at);
CREATE INDEX IF NOT EXISTS idx_member_enquiries_branch_status ON member_enquiries(branch_id, status, created_at);
