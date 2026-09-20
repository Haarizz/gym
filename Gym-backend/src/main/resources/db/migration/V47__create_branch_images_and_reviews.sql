-- Track 2: branch cover/gallery images (no image storage existed anywhere in this
-- codebase before) and member reviews/ratings for mobile discovery. Both are
-- branch-scoped (BranchAware), so include the standard BaseEntity audit columns
-- (created_by/updated_by were a known gap the hard way in V36 — included here
-- up front instead).

CREATE TABLE branch_images (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL,
    image_url TEXT NOT NULL,
    is_cover BOOLEAN NOT NULL DEFAULT false,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);

CREATE INDEX idx_branch_images_branch_id ON branch_images(branch_id);

CREATE TABLE reviews (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL,
    member_id BIGINT NOT NULL,
    global_user_id BIGINT,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    UNIQUE (branch_id, member_id)
);

CREATE INDEX idx_reviews_branch_id ON reviews(branch_id);
