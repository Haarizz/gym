-- Phase 4: moves beyond the flat single-rate UAE VAT model to genuine
-- multi-tax-type support. TaxCode gains a taxType classification
-- (STANDARD/ZERO_RATED/EXEMPT/CGST/SGST/IGST) and an optional secondaryTaxCode
-- pairing (e.g. CGST paired with SGST) so FinancialEventService.buildInputTaxLines()
-- can split a purchase's input tax across two accounts instead of one flat
-- "GST Input Credit" line. SupplierBill gains tax_code so a bill can opt into
-- that routing (Expense already had tax_code from an earlier migration).
-- company_tax_details holds the single-row GST No / VAT No / TRN registration
-- record surfaced on receipts/invoices/reports.

ALTER TABLE tax_codes ADD COLUMN tax_type VARCHAR(20) NOT NULL DEFAULT 'STANDARD';
ALTER TABLE tax_codes ADD COLUMN secondary_tax_code VARCHAR(50);

ALTER TABLE supplier_bills ADD COLUMN tax_code VARCHAR(50);

CREATE TABLE company_tax_details (
    id         BIGINT PRIMARY KEY,
    legal_name VARCHAR(255),
    gst_number VARCHAR(50),
    vat_number VARCHAR(50),
    trn        VARCHAR(50),
    address    TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP,
    created_by VARCHAR(255),
    updated_by VARCHAR(255)
);
