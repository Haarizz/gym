-- Links each add-on purchase to the customer-facing receipt it generated, so
-- the Add-ons table can reprint it. Nothing linked them before: the receipt
-- was written in the same request but its id was never stored.
ALTER TABLE member_addons
ADD COLUMN IF NOT EXISTS receipt_id BIGINT;

-- Backfill: a member billed for their own add-on got a receipt stamped with
-- the add-on's exact purchase_date and plan_name = addon_name.
UPDATE member_addons a
SET receipt_id = (
    SELECT r.id FROM receipts r
    WHERE r.transaction_type = 'Add-on'
      AND r.member_db_id = a.member_db_id
      AND r.plan_name = a.addon_name
      AND r.transaction_date = a.purchase_date
    ORDER BY r.id
    LIMIT 1
)
WHERE a.receipt_id IS NULL;

-- Backfill: an add-on billed to a family head got a receipt on the head's
-- account (plan_name 'Add-on: <name>', remarks naming the family member),
-- stamped a moment after the add-on was saved.
UPDATE member_addons a
SET receipt_id = (
    SELECT r.id FROM receipts r
    WHERE r.transaction_type = 'Add-on'
      AND r.plan_name = 'Add-on: ' || a.addon_name
      AND r.remarks LIKE 'Charge for family member: ' || a.member_name || '%'
      AND r.transaction_date >= a.purchase_date
      AND r.transaction_date < a.purchase_date + INTERVAL '1 minute'
      AND NOT EXISTS (SELECT 1 FROM member_addons o WHERE o.receipt_id = r.id)
    ORDER BY r.transaction_date
    LIMIT 1
)
WHERE a.receipt_id IS NULL;
