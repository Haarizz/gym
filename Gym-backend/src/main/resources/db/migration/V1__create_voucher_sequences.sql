-- Shared, database-backed voucher numbering (see docs/gymbios-financial-roadmap.html — H2).
--
-- Replaces the four independent, JVM-synchronized "read last, increment, format"
-- generators previously duplicated in JournalVoucherService, FinancialEventService,
-- PaymentVoucherService and ReceiptVoucherService. Those generators were only safe
-- against concurrent threads inside a single application instance; this table lets
-- VoucherNumberService allocate the next number atomically via
-- "INSERT ... ON CONFLICT ... DO UPDATE ... RETURNING", which is safe across any
-- number of concurrent requests or application instances.
--
-- One row per (voucher type + year) prefix, e.g. "JV-2026-", "PV-2026-", "RV-2026-".
-- A new year automatically gets a fresh row starting from 1, matching the existing
-- JV-YYYY-NNNNN / PV-YYYY-NNNNN / RV-YYYY-NNNNN numbering format exactly.
CREATE TABLE voucher_sequences (
    prefix     VARCHAR(32) PRIMARY KEY,
    last_value BIGINT NOT NULL DEFAULT 0
);

-- Seed one row per prefix already in use, from the highest existing 5-digit
-- sequence number, so numbering continues without collision or gaps.
INSERT INTO voucher_sequences (prefix, last_value)
SELECT LEFT(voucher_no, LENGTH(voucher_no) - 5) AS prefix,
       MAX(CAST(RIGHT(voucher_no, 5) AS BIGINT)) AS last_value
FROM journal_vouchers
WHERE voucher_no ~ '^JV-[0-9]{4}-[0-9]{5}$'
GROUP BY LEFT(voucher_no, LENGTH(voucher_no) - 5)
ON CONFLICT (prefix) DO UPDATE
    SET last_value = GREATEST(voucher_sequences.last_value, EXCLUDED.last_value);

INSERT INTO voucher_sequences (prefix, last_value)
SELECT LEFT(voucher_no, LENGTH(voucher_no) - 5),
       MAX(CAST(RIGHT(voucher_no, 5) AS BIGINT))
FROM payment_vouchers
WHERE voucher_no ~ '^PV-[0-9]{4}-[0-9]{5}$'
GROUP BY LEFT(voucher_no, LENGTH(voucher_no) - 5)
ON CONFLICT (prefix) DO UPDATE
    SET last_value = GREATEST(voucher_sequences.last_value, EXCLUDED.last_value);

INSERT INTO voucher_sequences (prefix, last_value)
SELECT LEFT(voucher_no, LENGTH(voucher_no) - 5),
       MAX(CAST(RIGHT(voucher_no, 5) AS BIGINT))
FROM receipt_vouchers
WHERE voucher_no ~ '^RV-[0-9]{4}-[0-9]{5}$'
GROUP BY LEFT(voucher_no, LENGTH(voucher_no) - 5)
ON CONFLICT (prefix) DO UPDATE
    SET last_value = GREATEST(voucher_sequences.last_value, EXCLUDED.last_value);
