-- V74__receipt_voucher_system_generated.sql
-- Marks receipt vouchers created automatically from a real payment (member
-- registration/renewal, add-on, POS sale, sales invoice) so their amount can be
-- locked (BG_47). Manually entered vouchers stay editable.
--
-- Guarded/idempotent: Hibernate ddl-auto may already have added the column.

ALTER TABLE receipt_vouchers ADD COLUMN IF NOT EXISTS system_generated BOOLEAN;
UPDATE receipt_vouchers SET system_generated = FALSE WHERE system_generated IS NULL;
ALTER TABLE receipt_vouchers ALTER COLUMN system_generated SET DEFAULT FALSE;
ALTER TABLE receipt_vouchers ALTER COLUMN system_generated SET NOT NULL;

-- Backfill: createVoucherFromModule() has always raised a notification keyed
-- RECEIPT_MODULE_<voucherId>_<ROLE> with reference_id = the voucher id, whereas the
-- manual form uses RECEIPT_CREATED_<id>_<ROLE>. Sales Invoice vouchers are always
-- module-created too.
UPDATE receipt_vouchers rv
SET system_generated = TRUE
WHERE rv.system_generated = FALSE
  AND (
        rv.source_category = 'Sales Invoice'
     OR EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.reference_id = rv.id
              AND n.event_key LIKE 'RECEIPT_MODULE_%'
        )
  );
