-- Print layouts for purchase documents (Purchase Order, Purchase Invoice), ported
-- from BillBull's Print & Email Templates designer. One design is shared by every
-- branch; the branch-specific header (name, address, TRN, logo) is filled in at
-- print time from that document's branch COMPANY settings, so no branch_id here.
-- settings holds the designer's JSON (toggles, colours, terms text, stamp image).
CREATE TABLE IF NOT EXISTS print_templates (
    id BIGSERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    paper_size VARCHAR(20) NOT NULL DEFAULT 'A4',
    settings TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_print_templates_category ON print_templates (category);
