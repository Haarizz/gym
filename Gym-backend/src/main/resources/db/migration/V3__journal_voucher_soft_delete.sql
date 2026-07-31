-- Soft-delete for Journal Vouchers (see docs/gymbios-financial-roadmap.html — H3).
--
-- Previously, JournalVoucherService.deleteJournalVoucher() ran a real
-- DELETE against journal_vouchers and journal_voucher_lines for DRAFT/CANCELLED
-- vouchers, leaving no trace once deleted. deleted_at lets the service mark a
-- voucher as removed without erasing it, so its history remains queryable for
-- audit purposes. NULL means "not deleted" (the default, and the only state
-- POSTED/REVERSED vouchers can ever be in, since those were never deletable).
ALTER TABLE journal_vouchers ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
