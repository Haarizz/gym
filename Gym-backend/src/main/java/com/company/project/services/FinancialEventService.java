package com.company.project.services;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.entities.*;
import com.company.project.enums.PaymentMethod;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * FinancialEventService — the single point through which every module
 * generates double-entry journal entries.
 *
 * RULES:
 *  1. No module may call JournalVoucherRepository directly for auto-entries.
 *  2. Every real-world money movement passes through one of the onXxx() methods.
 *  3. Idempotency is enforced: each (entityType, entityId) pair can only ever
 *     produce exactly one journal entry, even on retry.
 *  4. All auto-generated vouchers are posted immediately (status = POSTED).
 *  5. AccountHead.currentBalance is updated atomically with the posting.
 *
 * DEFAULT ACCOUNT CODES (matches Chart of Accounts seeded in account_heads):
 *
 *   ASSETS
 *   1000  Cash in Hand
 *   1001  Cash at Bank
 *   1100  Accounts Receivable
 *   1400  Salary Advance Receivable
 *   1500  Fixed Assets
 *   1600  Accumulated Depreciation
 *
 *   LIABILITIES
 *   2000  Accounts Payable
 *   2100  Tax / GST Payable
 *   2200  GST Input Credit
 *   2300  Deferred Revenue
 *   2400  Reward Wallet Liability
 *
 *   REVENUE
 *   4000  Membership Revenue
 *   4100  POS Sales Revenue
 *   4200  Service / Add-on Revenue
 *
 *   EXPENSES
 *   5000  Salary Expense
 *   5100  Maintenance Expense
 *   5200  Purchase / COGS
 *   5300  Referral & Loyalty Rewards Expense
 *   5700  Miscellaneous Expense
 *   5800  Depreciation Expense
 */
@Service
@Transactional
public class FinancialEventService {

    private static final Logger log = LoggerFactory.getLogger(FinancialEventService.class);

    // ── Account code constants ────────────────────────────────────────────────
    public static final String ACC_CASH_IN_HAND       = "1000";
    public static final String ACC_CASH_AT_BANK        = "1001";
    public static final String ACC_RECEIVABLE          = "1100";
    public static final String ACC_INVENTORY_ASSET     = "1200";
    public static final String ACC_SALARY_ADVANCE_REC  = "1400";
    public static final String ACC_FIXED_ASSETS        = "1500";
    public static final String ACC_ACCUM_DEPRECIATION  = "1600";
    public static final String ACC_ACCOUNTS_PAYABLE    = "2000";
    public static final String ACC_TAX_PAYABLE         = "2100";
    public static final String ACC_GST_INPUT           = "2200";
    public static final String ACC_DEFERRED_REVENUE    = "2300";
    public static final String ACC_MEMBERSHIP_REVENUE  = "4000";
    public static final String ACC_SALES_REVENUE       = "4100";
    public static final String ACC_SERVICE_REVENUE     = "4200";
    public static final String ACC_SALARY_EXPENSE      = "5000";
    public static final String ACC_MAINTENANCE_EXPENSE = "5100";
    public static final String ACC_PURCHASE_COGS       = "5200";
    public static final String ACC_REWARD_EXPENSE      = "5300";
    public static final String ACC_MISC_EXPENSE        = "5700";
    public static final String ACC_DEPRECIATION_EXPENSE = "5800";
    public static final String ACC_REWARD_LIABILITY    = "2400";

    private final JournalVoucherRepository          jvRepo;
    private final JournalVoucherLineRepository      lineRepo;
    private final AccountHeadRepository             accountRepo;
    private final JournalEntrySourceRepository      sourceRepo;
    private final TaxCodeRepository                 taxCodeRepo;
    private final FinancialSettingRepository        settingRepo;
    private final VoucherNumberService              voucherNumberService;
    private final DeferredRevenueScheduleService    deferredRevenueScheduleService;
    private final FiscalPeriodService               fiscalPeriodService;
    private final FinancialAuditLogService          financialAuditLogService;

    // UAE VAT — no CGST/SGST/IGST split, one flat rate. Configurable via
    // FinancialSettings("standard_vat_rate", category TAX) so a rate change
    // (or a future zero-rated/exempt product line) doesn't require a deploy;
    // defaults to the current UAE standard rate if unset.
    private static final String VAT_RATE_SETTING_KEY = "standard_vat_rate";
    private static final BigDecimal DEFAULT_VAT_RATE = new BigDecimal("5.00");

    public FinancialEventService(JournalVoucherRepository jvRepo,
                                 JournalVoucherLineRepository lineRepo,
                                 AccountHeadRepository accountRepo,
                                 JournalEntrySourceRepository sourceRepo,
                                 TaxCodeRepository taxCodeRepo,
                                 FinancialSettingRepository settingRepo,
                                 VoucherNumberService voucherNumberService,
                                 DeferredRevenueScheduleService deferredRevenueScheduleService,
                                 FiscalPeriodService fiscalPeriodService,
                                 FinancialAuditLogService financialAuditLogService) {
        this.jvRepo      = jvRepo;
        this.lineRepo    = lineRepo;
        this.accountRepo = accountRepo;
        this.sourceRepo  = sourceRepo;
        this.taxCodeRepo = taxCodeRepo;
        this.settingRepo = settingRepo;
        this.voucherNumberService = voucherNumberService;
        this.deferredRevenueScheduleService = deferredRevenueScheduleService;
        this.fiscalPeriodService = fiscalPeriodService;
        this.financialAuditLogService = financialAuditLogService;
    }

    /** Standard UAE VAT rate (%), e.g. 5.00 — see VAT_RATE_SETTING_KEY. */
    private BigDecimal getStandardVatRate() {
        return settingRepo.findBySettingKey(VAT_RATE_SETTING_KEY)
                .map(FinancialSetting::getSettingValue)
                .filter(v -> v != null && !v.isBlank())
                .map(v -> {
                    try {
                        return new BigDecimal(v);
                    } catch (NumberFormatException e) {
                        return DEFAULT_VAT_RATE;
                    }
                })
                .orElse(DEFAULT_VAT_RATE);
    }

    /**
     * Splits a VAT-inclusive amount into [net, vat] using the standard rate —
     * prices across this app (memberships, add-ons) are quoted VAT-inclusive
     * (see plans-services-catalog.tsx: "All prices ... inclusive of VAT"), so
     * the member never pays more; this only determines how much of what they
     * already paid must be remitted to the FTA vs. recognized as revenue. vat
     * is computed as the remainder (amount - net) rather than independently
     * rounded, so the two lines always sum back to the original amount.
     */
    private BigDecimal[] splitVatInclusive(BigDecimal grossAmount) {
        BigDecimal rate = getStandardVatRate();
        if (rate.compareTo(BigDecimal.ZERO) <= 0) {
            return new BigDecimal[] { grossAmount, BigDecimal.ZERO };
        }
        BigDecimal divisor = BigDecimal.ONE.add(rate.divide(BigDecimal.valueOf(100), 6, java.math.RoundingMode.HALF_UP));
        BigDecimal net = grossAmount.divide(divisor, 2, java.math.RoundingMode.HALF_UP);
        BigDecimal vat = grossAmount.subtract(net);
        return new BigDecimal[] { net, vat };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  MODULE EVENT HANDLERS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * BILLING — Member payment received.
     * DR  Cash/Bank                    (paidAmount)
     * CR  Membership Revenue           (paidAmount, net of VAT)   — single-month plans
     *   or CR  Deferred Revenue        (paidAmount, net of VAT)   — multi-month plans,
     *          recognized ratably later by DeferredRevenueRecognitionScheduler
     * CR  Tax / GST Payable            (VAT portion)   — UAE, 5% VAT-inclusive pricing,
     *                                    always recognized immediately, never deferred
     */
    public void onMemberPaymentReceived(Receipt receipt) {
        if (alreadyJournaled("Receipt", receipt.getId())) return;

        BigDecimal amount = safe(receipt.getPaidAmount() != null
                ? receipt.getPaidAmount() : receipt.getAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipped auto-journal for Receipt id={}: amount {} is not positive", receipt.getId(), amount);
            return;
        }

        List<JvLine> lines = new ArrayList<>(buildMoneyLines(
                receipt.getPaymentMethod(), receipt.getPaymentBreakdown(),
                receipt.getBankAccountCode(), receipt.getBankAccountName(), amount, true,
                "Member payment — " + receipt.getMemberName()));

        boolean defer = false;
        BigDecimal deferredNet = BigDecimal.ZERO;
        if (receipt.getInvoiceId() != null) {
            // Revenue and VAT were already recognized when the invoice itself was
            // issued (onInvoiceIssued) — this only settles the receivable.
            lines.add(cr(ACC_RECEIVABLE, "Accounts Receivable", amount, "Invoice payment"));
        } else {
            BigDecimal[] split = splitVatInclusive(amount);
            defer = deferredRevenueScheduleService.qualifiesForDeferral(receipt);
            if (defer) {
                deferredNet = split[0];
                lines.add(cr(ACC_DEFERRED_REVENUE, "Deferred Revenue", split[0],
                        "Membership payment held as deferred revenue"));
            } else {
                lines.add(cr(ACC_MEMBERSHIP_REVENUE, "Membership Revenue", split[0], "Revenue recognition"));
            }
            if (split[1].compareTo(BigDecimal.ZERO) > 0) {
                lines.add(cr(ACC_TAX_PAYABLE, "Tax / GST Payable", split[1], "VAT on membership payment"));
            }
        }

        LocalDate date = receipt.getTransactionDate() != null
                ? receipt.getTransactionDate().toLocalDate() : LocalDate.now();

        JournalVoucher jv = createAndPost(
                "Member payment: " + receipt.getMemberName()
                + " | " + receipt.getReceiptNo(),
                date, lines, "BILLING");

        registerSource("Receipt", receipt.getId(), "BILLING", jv.getId());

        if (defer) {
            deferredRevenueScheduleService.createSchedule(receipt, deferredNet, jv.getId());
        }
    }

    /**
     * DEFERRED REVENUE — one monthly bucket of a multi-month membership recognized.
     * DR  Deferred Revenue             (line amount)
     * CR  Membership Revenue           (line amount)
     *
     * Posted by DeferredRevenueRecognitionScheduler once a bucket's periodEnd has
     * elapsed. Known limitation: membership freeze/cancellation does not currently
     * adjust or write off an in-flight schedule — lines keep recognizing on their
     * original calendar dates regardless of freeze state (tracked as follow-up work).
     */
    public void onDeferredRevenueRecognized(DeferredRevenueRecognitionLine line, DeferredRevenueSchedule schedule) {
        if (alreadyJournaled("DeferredRevenueLine", line.getId())) return;

        BigDecimal amount = safe(line.getAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) return;

        List<JvLine> lines = List.of(
                dr(ACC_DEFERRED_REVENUE, "Deferred Revenue", amount,
                        "Revenue recognition — " + schedule.getMemberName()
                        + " period " + line.getPeriodNumber() + "/" + schedule.getTotalPeriods()),
                cr(ACC_MEMBERSHIP_REVENUE, "Membership Revenue", amount,
                        "Revenue recognition — " + schedule.getMemberName())
        );

        JournalVoucher jv = createAndPost(
                "Deferred Revenue Recognition: " + schedule.getMemberName()
                + " (period " + line.getPeriodNumber() + "/" + schedule.getTotalPeriods() + ")",
                line.getPeriodEnd(), lines, "DEFERRED_REVENUE");

        registerSource("DeferredRevenueLine", line.getId(), "DEFERRED_REVENUE", jv.getId());
        deferredRevenueScheduleService.markRecognized(line, jv.getId());
    }

    /**
     * INVOICE — B2B or recurring subscription invoice issued.
     * DR Accounts Receivable (totalAmount)
     * CR Membership Revenue (subtotal)
     * CR Tax / GST Payable (taxAmount)
     */
    public void onInvoiceIssued(Invoice invoice) {
        if (alreadyJournaled("Invoice", invoice.getId())) return;

        BigDecimal total = safe(invoice.getTotalAmount());
        BigDecimal tax = safe(invoice.getTaxAmount());
        BigDecimal subtotal = safe(invoice.getSubtotal());

        if (total.compareTo(BigDecimal.ZERO) <= 0) return;

        List<JvLine> lines = new ArrayList<>();
        lines.add(dr(ACC_RECEIVABLE, "Accounts Receivable", total, "Invoice " + invoice.getInvoiceNumber()));
        lines.add(cr(ACC_MEMBERSHIP_REVENUE, "Membership Revenue", subtotal, "Invoice Revenue"));
        
        if (tax.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(cr(ACC_TAX_PAYABLE, "Tax / GST Payable", tax, "Invoice Tax"));
        }

        LocalDate date = invoice.getIssueDate() != null ? invoice.getIssueDate() : LocalDate.now();

        JournalVoucher jv = createAndPost(
                "Invoice Issued: " + invoice.getInvoiceNumber(), date, lines, "INVOICE");
        registerSource("Invoice", invoice.getId(), "INVOICE", jv.getId());
    }

    /**
     * SALES — POS sale transaction completed.
     * DR  Cash/Bank                    (totalAmount)
     * CR  Sales Revenue                (subtotal)
     * CR  Tax / GST Payable            (taxAmount)   — only if tax > 0
     */
    public void onSaleCompleted(SaleTransaction sale) {
        if (alreadyJournaled("SaleTransaction", sale.getId())) return;

        BigDecimal total   = safe(sale.getTotalAmount());
        BigDecimal tax     = safe(sale.getTaxAmount());
        BigDecimal revenue = total.subtract(tax);
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipped auto-journal for SaleTransaction id={}: total {} is not positive", sale.getId(), total);
            return;
        }

        List<JvLine> lines = new ArrayList<>(buildMoneyLines(
                sale.getPaymentMethod(), sale.getPaymentBreakdown(), total, true,
                "POS sale — " + sale.getTransactionNumber()));
        lines.add(cr(ACC_SALES_REVENUE, "POS Sales Revenue", revenue, "Sales revenue"));
        if (tax.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(cr(ACC_TAX_PAYABLE, "Tax / GST Payable", tax, "GST collected"));
        }

        LocalDate date = sale.getCreatedAt() != null
                ? sale.getCreatedAt().toLocalDate() : LocalDate.now();

        // Perpetual Inventory: DR COGS, CR Inventory Asset
        BigDecimal cogs = safe(sale.getTotalCogs());
        if (cogs.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(dr(ACC_PURCHASE_COGS, "Cost of Goods Sold", cogs, "COGS — " + sale.getTransactionNumber()));
            lines.add(cr(ACC_INVENTORY_ASSET, "Inventory Asset", cogs, "Inventory reduction — " + sale.getTransactionNumber()));
        }

        JournalVoucher jv = createAndPost(
                "POS Sale: " + sale.getTransactionNumber(), date, lines, "SALES");
        registerSource("SaleTransaction", sale.getId(), "SALES", jv.getId());
    }

    /**
     * SALES — POS sale refunded.
     * DR  Sales Revenue                (subtotal refunded)
     * DR  Tax / GST Payable            (tax refunded)   — only if tax > 0
     * CR  Cash/Bank                    (total refunded)
     */
    public void onSaleRefunded(SaleTransaction sale) {
        if (alreadyJournaled("SaleTransactionRefund", sale.getId())) return;

        BigDecimal total   = safe(sale.getTotalAmount());
        BigDecimal tax     = safe(sale.getTaxAmount());
        BigDecimal revenue = total.subtract(tax);
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipped auto-journal for SaleTransaction refund id={}: total {} is not positive", sale.getId(), total);
            return;
        }

        List<JvLine> lines = new ArrayList<>();
        lines.add(dr(ACC_SALES_REVENUE, "POS Sales Revenue", revenue, "Refund — revenue reversal"));
        if (tax.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(dr(ACC_TAX_PAYABLE, "Tax / GST Payable", tax, "Refund — GST reversal"));
        }
        lines.addAll(buildMoneyLines(
                sale.getPaymentMethod(), sale.getPaymentBreakdown(), total, false, "Refund paid out"));

        LocalDate date = sale.getUpdatedAt() != null
                ? sale.getUpdatedAt().toLocalDate() : LocalDate.now();

        // Perpetual Inventory Reversal: DR Inventory Asset, CR COGS
        BigDecimal cogs = safe(sale.getTotalCogs());
        if (cogs.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(dr(ACC_INVENTORY_ASSET, "Inventory Asset", cogs, "Refund — inventory restoration"));
            lines.add(cr(ACC_PURCHASE_COGS, "Cost of Goods Sold", cogs, "Refund — COGS reversal"));
        }

        JournalVoucher jv = createAndPost(
                "POS Refund: " + sale.getTransactionNumber(), date, lines, "SALES");
        registerSource("SaleTransactionRefund", sale.getId(), "SALES", jv.getId());
    }

    /**
     * SERVICE — Member add-on purchased (Training, Nutrition, Spa, Classes, ...).
     * DR  Cash/Bank                    (amount)
     * CR  Service / Add-on Revenue     (amount, net of VAT)
     * CR  Tax / GST Payable            (VAT portion)   — UAE, 5% VAT-inclusive pricing
     */
    public void onAddonPaymentReceived(MemberAddon addon) {
        if (alreadyJournaled("MemberAddon", addon.getId())) return;

        BigDecimal amount = safe(addon.getAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipped auto-journal for MemberAddon id={}: amount {} is not positive", addon.getId(), amount);
            return;
        }

        List<JvLine> lines = new ArrayList<>(buildMoneyLines(
                addon.getPaymentMode(), addon.getPaymentBreakdown(), amount, true,
                "Add-on purchase — " + addon.getMemberName()));
        BigDecimal[] split = splitVatInclusive(amount);
        lines.add(cr(ACC_SERVICE_REVENUE, "Service / Add-on Revenue", split[0],
                "Revenue recognition — " + addon.getAddonName()));
        if (split[1].compareTo(BigDecimal.ZERO) > 0) {
            lines.add(cr(ACC_TAX_PAYABLE, "Tax / GST Payable", split[1], "VAT on add-on purchase"));
        }

        LocalDate date = addon.getPurchaseDate() != null
                ? addon.getPurchaseDate().toLocalDate() : LocalDate.now();

        JournalVoucher jv = createAndPost(
                "Add-on: " + (addon.getAddonName() != null ? addon.getAddonName() : "Add-on")
                + " — " + addon.getMemberName()
                + " | " + addon.getTransactionId(),
                date, lines, "ADDONS");

        registerSource("MemberAddon", addon.getId(), "ADDONS", jv.getId());
    }

    /**
     * EXPENSES — Operational expense approved.
     * DR  [Expense Category Account]   (amount excl. tax)
     * DR  GST Input Credit             (taxAmount)   — only if tax > 0
     * CR  Cash in Hand                 (totalAmount)   — paymentStatus == PAID (default)
     *   or CR  Accounts Payable        (totalAmount)   — paymentStatus == UNPAID/CREDIT
     */
    public void onExpenseApproved(Expense expense) {
        if (alreadyJournaled("Expense", expense.getId())) return;

        BigDecimal amount = safe(expense.getAmount());
        BigDecimal tax    = safe(expense.getTaxAmount());
        BigDecimal total  = safe(expense.getTotalAmount());
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipped auto-journal for Expense id={}: total {} is not positive", expense.getId(), total);
            return;
        }

        String expenseCode = categoryToExpenseAccount(expense.getCategory());
        String expenseName = expense.getCategory() != null ? expense.getCategory() + " Expense"
                : "Miscellaneous Expense";

        List<JvLine> lines = new ArrayList<>();
        lines.add(dr(expenseCode, expenseName, amount, "Expense — " + expense.getVendorName()));
        if (tax.compareTo(BigDecimal.ZERO) > 0) {
            String inputTaxAccount = ACC_GST_INPUT;
            String inputTaxName = "GST Input Credit";
            if (expense.getTaxCode() != null && !expense.getTaxCode().isBlank()) {
                Optional<TaxCode> tc = taxCodeRepo.findByCode(expense.getTaxCode());
                if (tc.isPresent() && tc.get().getPurchaseTaxAccountCode() != null && !tc.get().getPurchaseTaxAccountCode().isBlank()) {
                    inputTaxAccount = tc.get().getPurchaseTaxAccountCode();
                    inputTaxName = tc.get().getName() != null ? tc.get().getName() : inputTaxName;
                }
            }
            lines.add(dr(inputTaxAccount, inputTaxName, tax, "Input tax credit"));
        }
        boolean unpaid = "UNPAID".equalsIgnoreCase(expense.getPaymentStatus())
                || "CREDIT".equalsIgnoreCase(expense.getPaymentStatus());
        if (unpaid) {
            lines.add(cr(ACC_ACCOUNTS_PAYABLE, "Accounts Payable", total,
                    "Expense payable — " + expense.getVendorName()));
        } else {
            lines.add(cr(ACC_CASH_IN_HAND, "Cash in Hand", total, "Expense payment"));
        }

        LocalDate date = expense.getDate() != null ? expense.getDate() : LocalDate.now();

        JournalVoucher jv = createAndPost(
                "Expense: " + expense.getVendorName()
                + (expense.getCategory() != null ? " — " + expense.getCategory() : ""),
                date, lines, "EXPENSES");
        registerSource("Expense", expense.getId(), "EXPENSES", jv.getId());
    }

    /**
     * PAYROLL — Monthly salary disbursed.
     * DR  Salary Expense               (netSalary)
     * CR  Cash at Bank                 (netSalary)
     */
    public void onSalaryPaid(SalaryPayment payment) {
        if (alreadyJournaled("SalaryPayment", payment.getId())) return;

        BigDecimal amount = safe(payment.getNetSalary());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipped auto-journal for SalaryPayment id={}: net salary {} is not positive", payment.getId(), amount);
            return;
        }

        List<JvLine> lines = List.of(
                dr(ACC_SALARY_EXPENSE, "Salary Expense", amount,
                        "Salary — " + payment.getEmployeeName()
                        + " | " + payment.getMonth() + "/" + payment.getYear()),
                cr(ACC_CASH_AT_BANK, "Cash at Bank", amount, "Bank transfer / salary payment")
        );

        LocalDate date = payment.getPaymentDate() != null ? payment.getPaymentDate() : LocalDate.now();

        JournalVoucher jv = createAndPost(
                "Salary: " + payment.getEmployeeName()
                + " (" + payment.getMonth() + "/" + payment.getYear() + ")",
                date, lines, "PAYROLL");
        registerSource("SalaryPayment", payment.getId(), "PAYROLL", jv.getId());
    }

    /**
     * PAYROLL — Salary advance approved and disbursed.
     * DR  Salary Advance Receivable    (approvedAmount)
     * CR  Cash at Bank                 (approvedAmount)
     */
    public void onSalaryAdvanceDisbursed(SalaryAdvance advance) {
        if (alreadyJournaled("SalaryAdvance", advance.getId())) return;

        BigDecimal amount = safe(advance.getApprovedAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipped auto-journal for SalaryAdvance id={}: approved amount {} is not positive", advance.getId(), amount);
            return;
        }

        List<JvLine> lines = List.of(
                dr(ACC_SALARY_ADVANCE_REC, "Salary Advance Receivable", amount,
                        "Advance — " + advance.getEmployeeName()),
                cr(ACC_CASH_AT_BANK, "Cash at Bank", amount, "Advance disbursed")
        );

        LocalDate date = advance.getApprovedDate() != null ? advance.getApprovedDate() : LocalDate.now();

        JournalVoucher jv = createAndPost(
                "Salary Advance: " + advance.getEmployeeName(), date, lines, "PAYROLL");
        registerSource("SalaryAdvance", advance.getId(), "PAYROLL", jv.getId());
    }

    /**
     * ASSETS — Fixed asset purchased.
     * DR  Fixed Assets                 (purchasePrice)
     * CR  Accounts Payable             (purchasePrice)
     * Note: if paid immediately in cash, the AP entry would be settled by a
     * Payment Voucher which triggers onSupplierPaid().
     */
    public void onAssetPurchased(Asset asset) {
        if (alreadyJournaled("Asset", asset.getId())) return;

        BigDecimal amount = safe(asset.getPurchasePrice());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipped auto-journal for Asset id={}: purchase price {} is not positive", asset.getId(), amount);
            return;
        }

        String assetAccCode = categoryToAssetAccount(asset.getCategory());
        String assetAccName = (asset.getCategory() != null ? asset.getCategory() : "Fixed") + " Assets";

        List<JvLine> lines = List.of(
                dr(assetAccCode, assetAccName, amount,
                        "Asset purchase — " + asset.getName() + " [" + asset.getCode() + "]"),
                cr(ACC_ACCOUNTS_PAYABLE, "Accounts Payable", amount,
                        "Payable to " + (asset.getVendor() != null ? asset.getVendor() : "vendor"))
        );

        LocalDate date = asset.getPurchaseDate() != null ? asset.getPurchaseDate() : LocalDate.now();

        JournalVoucher jv = createAndPost(
                "Asset Purchase: " + asset.getName(), date, lines, "ASSETS");
        registerSource("Asset", asset.getId(), "ASSETS", jv.getId());
    }

    /**
     * ASSETS — Fixed asset depreciated automatically.
     * DR  Depreciation Expense         (amount)
     * CR  Accumulated Depreciation     (amount)
     */
    public void onAssetDepreciated(Asset asset, BigDecimal amount) {
        if (amount.compareTo(BigDecimal.ZERO) <= 0) return;

        String depExpenseAcc = ACC_DEPRECIATION_EXPENSE;
        String accumDepAcc = ACC_ACCUM_DEPRECIATION;
        
        List<JvLine> lines = List.of(
                dr(depExpenseAcc, "Depreciation Expense", amount,
                        "Monthly depreciation — " + asset.getName() + " [" + asset.getCode() + "]"),
                cr(accumDepAcc, "Accumulated Depreciation", amount,
                        "Monthly depreciation — " + asset.getName() + " [" + asset.getCode() + "]")
        );

        JournalVoucher jv = createAndPost(
                "Depreciation: " + asset.getName(), LocalDate.now(), lines, "ASSETS");
        
        // Use a unique source entity string so it doesn't conflict with purchase journal
        registerSource("AssetDepreciation", asset.getId(), "ASSETS", jv.getId());
    }

    /**
     * PURCHASES — Supplier bill confirmed (goods received).
     * DR  Purchase / COGS              (subtotal after discount)
     * DR  GST Input Credit             (taxAmount)   — only if tax > 0
     * CR  Accounts Payable             (totalAmount)
     */
    public void onSupplierBillConfirmed(SupplierBill bill) {
        if (alreadyJournaled("SupplierBill", bill.getId())) return;

        BigDecimal subtotal = safe(bill.getSubtotal());
        BigDecimal tax      = safe(bill.getTaxAmount());
        BigDecimal total    = safe(bill.getTotalAmount());
        if (total.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipped auto-journal for SupplierBill id={}: total {} is not positive", bill.getId(), total);
            return;
        }

        List<JvLine> lines = new ArrayList<>();
        lines.add(dr(ACC_INVENTORY_ASSET, "Inventory Asset", subtotal,
                "Goods received — " + bill.getSupplierName()));
        if (tax.compareTo(BigDecimal.ZERO) > 0) {
            lines.add(dr(ACC_GST_INPUT, "GST Input Credit", tax, "Input tax on purchase"));
        }
        lines.add(cr(ACC_ACCOUNTS_PAYABLE, "Accounts Payable", total,
                "Payable to " + bill.getSupplierName() + " | " + bill.getBillNumber()));

        LocalDate date = bill.getBillDate() != null ? bill.getBillDate() : LocalDate.now();

        JournalVoucher jv = createAndPost(
                "Supplier Bill: " + bill.getBillNumber() + " — " + bill.getSupplierName(),
                date, lines, "PURCHASES");
        registerSource("SupplierBill", bill.getId(), "PURCHASES", jv.getId());
    }

    /**
     * PAYMENTS — Payment Voucher marked as Paid (outgoing payment to supplier).
     * DR  Accounts Payable             (amount)
     * CR  Cash / Bank                  (amount)
     */
    public void onSupplierPaid(PaymentVoucher voucher) {
        if (alreadyJournaled("PaymentVoucher", voucher.getId())) return;

        BigDecimal amount = safe(voucher.getAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipped auto-journal for PaymentVoucher id={}: amount {} is not positive", voucher.getId(), amount);
            return;
        }

        List<JvLine> lines = new ArrayList<>();
        lines.add(dr(ACC_ACCOUNTS_PAYABLE, "Accounts Payable", amount,
                "Payment to " + voucher.getSupplierName()));
        lines.addAll(buildMoneyLines(
                voucher.getPaymentMethod(), voucher.getPaymentBreakdown(), amount, false,
                "Payment via " + voucher.getPaymentMethod()));

        LocalDate date = voucher.getPaymentDate() != null ? voucher.getPaymentDate() : LocalDate.now();

        JournalVoucher jv = createAndPost(
                "Payment: " + voucher.getVoucherNo() + " — " + voucher.getSupplierName(),
                date, lines, "PAYMENTS");
        registerSource("PaymentVoucher", voucher.getId(), "PAYMENTS", jv.getId());
    }

    /**
     * RECEIPT VOUCHER — accountant-entered receipt marked "completed" through the
     * manual Ledgers/Receipt Voucher screen.
     * DR  Cash/Bank                    (amount)
     * CR  [account mapped from sourceCategory]   (amount)
     *
     * Closes the gap where a manually entered Receipt Voucher was shown on the
     * Ledgers screen as if it were posted, but never actually generated a journal
     * entry or updated any AccountHead balance (see
     * docs/gymbios-financial-roadmap.html — C1). Vouchers created internally via
     * ReceiptVoucherService.createVoucherFromModule() (POS sales, member payments,
     * add-ons, …) are NOT routed through this method — those events already post
     * their own journal entry via onSaleCompleted()/onMemberPaymentReceived()/etc.,
     * so posting again here would double-count the same cash movement.
     */
    public void onManualReceiptVoucherPosted(ReceiptVoucher voucher) {
        if (alreadyJournaled("ReceiptVoucher", voucher.getId())) return;

        BigDecimal amount = safe(voucher.getAmount());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            log.warn("Skipped auto-journal for ReceiptVoucher id={}: amount {} is not positive", voucher.getId(), amount);
            return;
        }

        String revenueCode = categoryToRevenueAccount(voucher.getSourceCategory());
        if (revenueCode == null) {
            throw new IllegalStateException(
                    "Cannot post Receipt Voucher " + voucher.getVoucherNo()
                    + " to the ledger: source category '" + voucher.getSourceCategory()
                    + "' is not mapped to an account. Set a recognized source category "
                    + "(e.g. Membership, POS, Service) before marking it completed.");
        }
        String revenueName = revenueAccountName(revenueCode);

        List<JvLine> lines = new ArrayList<>(buildMoneyLines(
                voucher.getPaymentMode(), voucher.getPaymentBreakdown(), amount, true,
                "Receipt Voucher " + voucher.getVoucherNo()
                        + (voucher.getMemberName() != null ? " — " + voucher.getMemberName() : "")));
        lines.add(cr(revenueCode, revenueName, amount, "Manual receipt — " + voucher.getSourceCategory()));

        LocalDate date = voucher.getDate() != null ? voucher.getDate() : LocalDate.now();

        JournalVoucher jv = createAndPost(
                "Receipt Voucher: " + voucher.getVoucherNo()
                + (voucher.getSource() != null ? " — " + voucher.getSource() : ""),
                date, lines, "RECEIPT_VOUCHER");

        registerSource("ReceiptVoucher", voucher.getId(), "RECEIPT_VOUCHER", jv.getId());
    }

    /**
     * REWARDS — a WALLET_CREDIT or CASH referral/loyalty reward is issued
     * (approved/generated and ready to use, or immediately auto-applied).
     * DR  Referral & Loyalty Rewards Expense   (rewardValue)
     * CR  Reward Wallet Liability              (rewardValue)
     *
     * Coupon/membership/PT/class/gift/points rewards are not posted here — they
     * either have no direct cash cost (points) or their cost is realized through
     * the receipt they're eventually applied to (discount) rather than as a
     * standalone liability.
     */
    public void onReferralRewardIssued(ReferralReward reward) {
        if (alreadyJournaled("ReferralReward", reward.getId())) return;

        BigDecimal amount = safe(reward.getRewardValue());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) return;

        List<JvLine> lines = List.of(
                dr(ACC_REWARD_EXPENSE, "Referral & Loyalty Rewards Expense", amount,
                        "Reward issued — " + reward.getRewardCode() + " (" + reward.getMemberId() + ")"),
                cr(ACC_REWARD_LIABILITY, "Reward Wallet Liability", amount,
                        "Reward payable — " + reward.getRewardCode())
        );

        JournalVoucher jv = createAndPost(
                "Reward Issued: " + reward.getRewardCode() + " — " + reward.getMemberId(),
                LocalDate.now(), lines, "REWARDS");
        registerSource("ReferralReward", reward.getId(), "REWARDS", jv.getId());
    }

    /**
     * REWARDS — a CASH reward is actually paid out to the member (settles the
     * liability booked by onReferralRewardIssued()).
     * DR  Reward Wallet Liability              (rewardValue)
     * CR  Cash in Hand                         (rewardValue)
     */
    public void onReferralRewardPaidOut(ReferralReward reward) {
        if (alreadyJournaled("ReferralRewardPayout", reward.getId())) return;

        BigDecimal amount = safe(reward.getRewardValue());
        if (amount.compareTo(BigDecimal.ZERO) <= 0) return;

        List<JvLine> lines = List.of(
                dr(ACC_REWARD_LIABILITY, "Reward Wallet Liability", amount,
                        "Cash payout — " + reward.getRewardCode()),
                cr(ACC_CASH_IN_HAND, "Cash in Hand", amount,
                        "Cash payout — " + reward.getRewardCode() + " (" + reward.getMemberId() + ")")
        );

        JournalVoucher jv = createAndPost(
                "Reward Cash Payout: " + reward.getRewardCode() + " — " + reward.getMemberId(),
                LocalDate.now(), lines, "REWARDS");
        registerSource("ReferralRewardPayout", reward.getId(), "REWARDS", jv.getId());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  INTERNAL MACHINERY
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Creates a JournalVoucher with status=POSTED immediately, saves all lines,
     * and updates each AccountHead.currentBalance.
     */
    private JournalVoucher createAndPost(String narration, LocalDate date,
                                          List<JvLine> lines, String module) {
        BigDecimal totalDebit  = lines.stream().map(l -> l.debit).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = lines.stream().map(l -> l.credit).reduce(BigDecimal.ZERO, BigDecimal::add);

        if (totalDebit.compareTo(totalCredit) != 0) {
            throw new IllegalStateException(
                    "[FinancialEventService] Journal entry does not balance for module=" + module
                    + " narration='" + narration + "'"
                    + " DR=" + totalDebit + " CR=" + totalCredit);
        }

        fiscalPeriodService.assertPeriodOpen(date);

        JournalVoucher jv = new JournalVoucher();
        jv.setVoucherNo(voucherNumberService.next("JV"));
        jv.setDate(date);
        jv.setNarration(narration);
        jv.setStatus("POSTED");
        jv.setReference(module);
        jv.setTotalDebit(totalDebit);
        jv.setTotalCredit(totalCredit);
        jv.setSystemGenerated(true);
        jv = jvRepo.save(jv);

        final Long jvId = jv.getId();
        for (JvLine l : lines) {
            JournalVoucherLine line = new JournalVoucherLine();
            line.setJournalVoucherId(jvId);
            line.setAccountCode(l.code);
            line.setAccountName(l.name);
            line.setDebit(l.debit);
            line.setCredit(l.credit);
            line.setDescription(l.description);
            lineRepo.save(line);

            // Update AccountHead.currentBalance immediately
            updateAccountBalance(l.code, l.name, l.debit, l.credit);
        }

        financialAuditLogService.record("AUTO_POST", "JournalVoucher", jv.getId(), jv.getVoucherNo(),
                module, "Auto-posted: DR=" + totalDebit + " CR=" + totalCredit + " — " + narration);

        return jv;
    }

    /**
     * Updates the stored currentBalance on an AccountHead after posting.
     * Uses simple additive logic: balance += debit − credit
     * (consistent with getLedgerEntries() running balance calculation).
     * Creates the AccountHead if it doesn't exist yet (safe bootstrapping).
     */
    void updateAccountBalance(String code, String name, BigDecimal debit, BigDecimal credit) {
        if (code == null) return;
        AccountHead account = accountRepo.findByCode(code).orElseGet(() -> {
            AccountHead a = new AccountHead();
            a.setCode(code);
            a.setName(name);
            a.setType(deriveTypeFromCode(code));
            a.setOpeningBalance(BigDecimal.ZERO);
            a.setCurrentBalance(BigDecimal.ZERO);
            a.setIsActive(true);
            return accountRepo.save(a);
        });
        BigDecimal current = account.getCurrentBalance() != null
                ? account.getCurrentBalance() : BigDecimal.ZERO;
        account.setCurrentBalance(current.add(safe(debit)).subtract(safe(credit)));
        accountRepo.save(account);
    }

    /** Idempotency check: has this entity already generated a journal entry? */
    private boolean alreadyJournaled(String entityType, Long entityId) {
        return sourceRepo.existsBySourceEntityTypeAndSourceEntityId(entityType, entityId);
    }

    private void registerSource(String entityType, Long entityId, String module, Long jvId) {
        JournalEntrySource src = new JournalEntrySource();
        src.setSourceEntityType(entityType);
        src.setSourceEntityId(entityId);
        src.setSourceModule(module);
        src.setJournalVoucherId(jvId);
        src.setCreatedAt(LocalDateTime.now());
        sourceRepo.save(src);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  HELPER BUILDERS
    // ─────────────────────────────────────────────────────────────────────────

    private static JvLine dr(String code, String name, BigDecimal amount, String desc) {
        return new JvLine(code, name, amount, BigDecimal.ZERO, desc);
    }

    private static JvLine cr(String code, String name, BigDecimal amount, String desc) {
        return new JvLine(code, name, BigDecimal.ZERO, amount, desc);
    }

    private static BigDecimal safe(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    /** Maps payment method string to a cash/bank account code. */
    private static String paymentMethodToAccount(String method) {
        if (method == null) return ACC_CASH_IN_HAND;
        return switch (method.toUpperCase()) {
            case "CASH", "CASH IN HAND" -> ACC_CASH_IN_HAND;
            // A "Wallet" leg is the member spending previously-issued reward credit,
            // not real cash coming in — it draws down the liability booked by
            // onReferralRewardIssued() rather than falsely inflating cash/bank.
            case "WALLET" -> ACC_REWARD_LIABILITY;
            default -> ACC_CASH_AT_BANK;  // CARD, CHEQUE, ONLINE, BANK_TRANSFER
        };
    }

    /** Human-readable name for a cash/bank account code, for journal line descriptions. */
    private static String cashAccountName(String code) {
        if (ACC_CASH_AT_BANK.equals(code)) return "Cash at Bank";
        if (ACC_REWARD_LIABILITY.equals(code)) return "Reward Wallet Liability";
        return "Cash in Hand";
    }

    /**
     * Builds the debit (or credit) side of the "money" leg of a journal entry for a
     * given payment method. For a single method (Cash/Card/Cheque/...) this is one
     * line for the full amount. For a "Mixed" payment, it's one line per leg in the
     * breakdown — e.g. DR Cash in Hand 500 + DR Cash at Bank 500 instead of a single
     * line — so cash-drawer and bank reconciliation both tie out to the ledger.
     *
     * @param debit true to debit these accounts (money coming in), false to credit
     *              them (money going out)
     */
    private static List<JvLine> buildMoneyLines(String paymentMethod, List<PaymentSplitDTO> breakdown,
                                                 BigDecimal totalAmount, boolean debit, String narration) {
        return buildMoneyLines(paymentMethod, breakdown, null, null, totalAmount, debit, narration);
    }

    /**
     * Same as above, but lets the caller pin the "money" leg to a specific ledger
     * account (e.g. a named bank account picked from Chart of Accounts) instead of
     * the generic Cash in Hand / Cash at Bank bucket. Used for Bank Transfer receipts
     * where the user selected exactly which bank account was credited.
     */
    private static List<JvLine> buildMoneyLines(String paymentMethod, List<PaymentSplitDTO> breakdown,
                                                 String overrideAccountCode, String overrideAccountName,
                                                 BigDecimal totalAmount, boolean debit, String narration) {
        PaymentMethod pm = PaymentMethod.fromString(paymentMethod);
        boolean hasOverride = overrideAccountCode != null && !overrideAccountCode.isBlank();

        if (pm != PaymentMethod.MIXED || breakdown == null || breakdown.isEmpty()) {
            String code = hasOverride ? overrideAccountCode : paymentMethodToAccount(paymentMethod);
            String name = hasOverride && overrideAccountName != null && !overrideAccountName.isBlank()
                    ? overrideAccountName : cashAccountName(code);
            JvLine line = debit
                    ? dr(code, name, totalAmount, narration)
                    : cr(code, name, totalAmount, narration);
            return List.of(line);
        }

        BigDecimal sum = breakdown.stream()
                .map(PaymentSplitDTO::getAmount)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (sum.subtract(totalAmount).abs().compareTo(new BigDecimal("0.01")) > 0) {
            throw new BusinessRuleViolationException(
                    "Mixed payment legs (" + sum + ") do not add up to the total amount (" + totalAmount + ")");
        }

        List<JvLine> lines = new ArrayList<>();
        for (PaymentSplitDTO leg : breakdown) {
            if (leg.getAmount() == null || leg.getAmount().compareTo(BigDecimal.ZERO) <= 0) continue;
            boolean legHasOverride = leg.getBankAccountCode() != null && !leg.getBankAccountCode().isBlank();
            String code = legHasOverride ? leg.getBankAccountCode() : paymentMethodToAccount(leg.getMethod());
            String name = legHasOverride && leg.getBankAccountName() != null && !leg.getBankAccountName().isBlank()
                    ? leg.getBankAccountName() : cashAccountName(code);
            String legLabel = leg.getMethod() != null ? leg.getMethod() : "Payment";
            String desc = narration + " — " + legLabel
                    + (leg.getReference() != null && !leg.getReference().isBlank() ? " #" + leg.getReference() : "");
            lines.add(debit
                    ? dr(code, name, leg.getAmount(), desc)
                    : cr(code, name, leg.getAmount(), desc));
        }
        return lines;
    }

    /** Maps expense category to the most appropriate expense account code. */
    private static String categoryToExpenseAccount(String category) {
        if (category == null) return ACC_MISC_EXPENSE;
        return switch (category.toUpperCase()) {
            case "SALARY", "PAYROLL"    -> ACC_SALARY_EXPENSE;
            case "MAINTENANCE", "REPAIR" -> ACC_MAINTENANCE_EXPENSE;
            case "PURCHASE", "COGS"     -> ACC_PURCHASE_COGS;
            default                      -> ACC_MISC_EXPENSE;
        };
    }

    /**
     * Maps a manual Receipt Voucher's source category to a revenue account code.
     * Returns null when the category is unrecognized, so the caller can reject the
     * post rather than guess which revenue line the money belongs to.
     */
    private static String categoryToRevenueAccount(String category) {
        if (category == null) return null;
        return switch (category.trim().toUpperCase()) {
            case "MEMBERSHIP", "MEMBER" -> ACC_MEMBERSHIP_REVENUE;
            case "POS", "SALE", "SALES" -> ACC_SALES_REVENUE;
            case "ADDON", "ADD-ON", "SERVICE" -> ACC_SERVICE_REVENUE;
            default -> null;
        };
    }

    /** Human-readable name for a revenue account code, for journal line descriptions. */
    private static String revenueAccountName(String code) {
        if (ACC_MEMBERSHIP_REVENUE.equals(code)) return "Membership Revenue";
        if (ACC_SALES_REVENUE.equals(code)) return "POS Sales Revenue";
        if (ACC_SERVICE_REVENUE.equals(code)) return "Service / Add-on Revenue";
        return "Revenue";
    }

    /** Maps asset category to a fixed-asset account code. */
    private static String categoryToAssetAccount(String category) {
        // All asset categories map to 1500 by default.
        // Extend with sub-codes (1501, 1502…) as needed.
        return ACC_FIXED_ASSETS;
    }

    /** Derives account type from the standard code prefix. */
    private static String deriveTypeFromCode(String code) {
        if (code == null) return "EXPENSE";
        int c = Integer.parseInt(code.substring(0, 1));
        return switch (c) {
            case 1 -> "ASSET";
            case 2 -> "LIABILITY";
            case 3 -> "EQUITY";
            case 4 -> "REVENUE";
            default -> "EXPENSE";
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  INNER RECORD — lightweight line representation
    // ─────────────────────────────────────────────────────────────────────────

    private static final class JvLine {
        final String code;
        final String name;
        final BigDecimal debit;
        final BigDecimal credit;
        final String description;

        JvLine(String code, String name, BigDecimal debit, BigDecimal credit, String description) {
            this.code        = code;
            this.name        = name;
            this.debit       = debit  != null ? debit  : BigDecimal.ZERO;
            this.credit      = credit != null ? credit : BigDecimal.ZERO;
            this.description = description;
        }
    }
}
