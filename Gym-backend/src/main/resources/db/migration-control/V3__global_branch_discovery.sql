CREATE TABLE IF NOT EXISTS global_branch_discovery (
    id BIGSERIAL PRIMARY KEY,
    tenant_slug VARCHAR(255) NOT NULL,
    branch_id BIGINT NOT NULL,
    gym_name VARCHAR(255) NOT NULL,
    branch_name VARCHAR(255) NOT NULL,
    address TEXT,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    phone VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    UNIQUE(tenant_slug, branch_id)
);

CREATE INDEX idx_global_branch_discovery_tenant ON global_branch_discovery(tenant_slug);
CREATE INDEX idx_global_branch_discovery_status ON global_branch_discovery(status);
