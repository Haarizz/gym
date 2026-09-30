-- Managed brand list for products. products.brand stays a plain text column;
-- this table is the list those values are picked from (Category / Brand screen).
CREATE TABLE IF NOT EXISTS product_brands (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description VARCHAR(1000),
    website VARCHAR(255),
    color VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    branch_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255),
    CONSTRAINT uk_product_brands_branch_name UNIQUE (branch_id, name)
);

-- Seed the list from brands already typed on products, so existing data shows up.
INSERT INTO product_brands (name, branch_id, is_active, created_at)
SELECT DISTINCT ON (lower(trim(p.brand)), p.branch_id) trim(p.brand), p.branch_id, TRUE, NOW()
FROM products p
WHERE p.brand IS NOT NULL AND trim(p.brand) <> ''
  AND NOT EXISTS (
      SELECT 1 FROM product_brands b
      WHERE lower(b.name) = lower(trim(p.brand))
        AND b.branch_id IS NOT DISTINCT FROM p.branch_id
  )
ORDER BY lower(trim(p.brand)), p.branch_id, trim(p.brand);
