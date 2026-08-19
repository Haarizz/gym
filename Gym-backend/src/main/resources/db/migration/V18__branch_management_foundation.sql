-- ============================================================
-- V18: Branch Management Foundation
-- Creates branches, staff_branches, and user_branches tables
-- ============================================================

-- Branch entity
CREATE TABLE IF NOT EXISTS branches (
    id BIGSERIAL PRIMARY KEY,
    branch_name VARCHAR(255) NOT NULL,
    branch_code VARCHAR(50) NOT NULL UNIQUE,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

-- Staff (employees) ↔ Branch many-to-many
CREATE TABLE IF NOT EXISTS staff_branches (
    id BIGSERIAL PRIMARY KEY,
    staff_id BIGINT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(staff_id, branch_id)
);

-- User ↔ Branch assignment (which branches a user can access)
CREATE TABLE IF NOT EXISTS user_branches (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, branch_id)
);

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_staff_branches_staff_id ON staff_branches(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_branches_branch_id ON staff_branches(branch_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_user_id ON user_branches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_branches_branch_id ON user_branches(branch_id);

-- Seed default branch
INSERT INTO branches (branch_name, branch_code, status, is_default)
VALUES ('Main Branch', 'MAIN', 'ACTIVE', TRUE)
ON CONFLICT (branch_code) DO NOTHING;
