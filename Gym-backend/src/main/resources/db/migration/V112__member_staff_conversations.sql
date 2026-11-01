-- V112__member_staff_conversations.sql
-- Member ↔ staff chat (Staff & Trainers → Message, and the front-desk inbox).
--  * A conversation belongs to the branch, not the staff member: one per member per
--    staff member (staff_id NULL = the branch's shared front-desk inbox).
--  * Either side can start one. Members reach any active staff member of their branch
--    with app access who accepts member messages; staff reach active members of their
--    branch who allow staff-started chats.
--  * Messages are never hard-deleted: a deleted message is hidden from both sides but
--    kept, with its unmasked text, for a report. Admins see a conversation only through
--    a report on it.

CREATE TABLE IF NOT EXISTS conversations (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    -- NULL = front-desk inbox, answered by any desk staff member of the branch
    staff_id BIGINT,
    -- MEMBER | STAFF
    started_by VARCHAR(10) NOT NULL,
    started_by_staff_id BIGINT,
    last_message_at TIMESTAMP WITHOUT TIME ZONE,
    last_message_preview VARCHAR(120),
    -- Who sent the latest messages, and how many in a row (the unanswered-message cap)
    last_sender VARCHAR(10),
    trailing_count INT NOT NULL DEFAULT 0,
    member_unread INT NOT NULL DEFAULT 0,
    staff_unread INT NOT NULL DEFAULT 0,
    -- A member message that arrived outside the staff member's hours; the push waits
    -- for the shift (ConversationQuietHoursScheduler).
    staff_push_pending_since TIMESTAMP WITHOUT TIME ZONE,
    -- Staff muted the member here: the member can't send until then
    muted_until TIMESTAMP WITHOUT TIME ZONE,
    muted_by_staff_id BIGINT,
    -- The member blocked the staff member: staff can't send; the member can undo it
    blocked_by_member_at TIMESTAMP WITHOUT TIME ZONE,
    -- An admin closed it for good after a report: nobody can send
    blocked_by_admin_at TIMESTAMP WITHOUT TIME ZONE,
    blocked_by_admin VARCHAR(255),
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- NULLs are distinct in a plain unique index, so the front-desk thread needs its own.
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_member_staff
    ON conversations(branch_id, member_id, staff_id) WHERE staff_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_conversations_member_front_desk
    ON conversations(branch_id, member_id) WHERE staff_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_member ON conversations(member_id, last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_branch_staff ON conversations(branch_id, staff_id, last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_push_pending
    ON conversations(staff_push_pending_since) WHERE staff_push_pending_since IS NOT NULL;

CREATE TABLE IF NOT EXISTS conversation_messages (
    id BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id),
    -- MEMBER | STAFF
    sender_type VARCHAR(10) NOT NULL,
    -- Which staff member sent it (front-desk replies included); NULL for members
    sender_staff_id BIGINT,
    -- What both sides see: contact details replaced
    body TEXT NOT NULL,
    -- The text as typed, kept only when masking changed it; shown only on a report
    original_body TEXT,
    deleted_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation ON conversation_messages(conversation_id, id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_sender_day ON conversation_messages(sender_type, created_at);

CREATE TABLE IF NOT EXISTS conversation_reports (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL,
    conversation_id BIGINT NOT NULL REFERENCES conversations(id),
    message_id BIGINT NOT NULL REFERENCES conversation_messages(id),
    -- MEMBER | STAFF
    reported_by_type VARCHAR(10) NOT NULL,
    reported_by_id BIGINT NOT NULL,
    -- HARASSMENT | SPAM | INAPPROPRIATE | OFF_PLATFORM | OTHER
    reason VARCHAR(30) NOT NULL,
    details VARCHAR(500),
    -- OPEN | DISMISSED | ACTIONED
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    -- DISMISS | BLOCK_CONVERSATION | BAN_MEMBER
    resolution VARCHAR(30),
    resolution_note VARCHAR(500),
    resolved_by VARCHAR(255),
    resolved_at TIMESTAMP WITHOUT TIME ZONE,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_conversation_reports_open
    ON conversation_reports(message_id, reported_by_type, reported_by_id) WHERE status = 'OPEN';
CREATE INDEX IF NOT EXISTS idx_conversation_reports_branch_status ON conversation_reports(branch_id, status, created_at);

-- Per-person switches
ALTER TABLE employees ADD COLUMN IF NOT EXISTS accepts_member_messages BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS allow_staff_chats BOOLEAN NOT NULL DEFAULT TRUE;
-- An admin banned the member from chat after a report (branch-wide, all conversations)
ALTER TABLE members ADD COLUMN IF NOT EXISTS chat_banned_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE members ADD COLUMN IF NOT EXISTS chat_banned_by VARCHAR(255);

-- Staff devices get pushes too: a token belongs to a member or a staff member.
ALTER TABLE mobile_push_tokens ALTER COLUMN member_id DROP NOT NULL;
ALTER TABLE mobile_push_tokens ADD COLUMN IF NOT EXISTS staff_id BIGINT;
CREATE INDEX IF NOT EXISTS idx_mobile_push_tokens_staff ON mobile_push_tokens(staff_id);
