package com.company.project.services;

import com.company.project.entities.FinancialSetting;
import com.company.project.entities.Product;
import com.company.project.repositories.FinancialSettingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Optional;

/**
 * The tax a sale or purchase line carries, from Settings › Tax Configuration (branch scoped):
 * <ul>
 *   <li>Not VAT registered (TRN switch off) — no tax anywhere: 0% on POS sales, sales invoices,
 *       purchase orders and supplier bills.</li>
 *   <li>Registered — sales use the branch Sales Tax, purchases the Purchase Tax (each falling back
 *       to the branch Default VAT); a product set to its own rate ({@code useDefaultTax = false})
 *       overrides the branch default. With no branch rate configured the product's rate applies,
 *       as before.</li>
 * </ul>
 * A branch that never set the switch keeps charging tax as before (counts as registered).
 */
@Service
@Transactional(readOnly = true)
public class TaxPolicyService {

    public static final String KEY_VAT_REGISTERED = "vat_registered";
    public static final String KEY_VAT_RATE = "default_vat_rate";
    public static final String KEY_SALES_RATE = "default_sales_tax_rate";
    public static final String KEY_PURCHASE_RATE = "default_purchase_tax_rate";
    public static final String KEY_TRN = "company_trn";

    public record TaxDefaults(boolean vatRegistered, String trn, BigDecimal vatRate, BigDecimal salesRate, BigDecimal purchaseRate) {}

    private final FinancialSettingRepository settingRepository;
    private final BranchSettingsResolver branchResolver;

    public TaxPolicyService(FinancialSettingRepository settingRepository, BranchSettingsResolver branchResolver) {
        this.settingRepository = settingRepository;
        this.branchResolver = branchResolver;
    }

    /** The active branch's tax defaults (registered with no rates when no branch is selected). */
    public TaxDefaults current() {
        Long branchId = branchResolver.resolveForRead();
        if (branchId == null) return new TaxDefaults(true, null, null, null, null);
        String trn = value(KEY_TRN, branchId).orElse(null);
        boolean registered = value(KEY_VAT_REGISTERED, branchId)
                .map(v -> v.equalsIgnoreCase("true"))
                // Never set: keep charging tax as before — only switching it off stops tax.
                .orElse(true);
        BigDecimal vat = rate(KEY_VAT_RATE, branchId);
        BigDecimal sales = rate(KEY_SALES_RATE, branchId);
        BigDecimal purchase = rate(KEY_PURCHASE_RATE, branchId);
        // Settings › Tax Configuration shows two rates: "Default VAT" (stored as the sales tax rate) and
        // Purchase Tax. The old separate default_vat_rate is no longer editable, so it is not a fallback.
        return new TaxDefaults(registered, trn, vat, sales, purchase);
    }

    /** Tax % for a sales line (POS, sales invoice). */
    public BigDecimal salesRate(Product product) {
        return resolve(current(), product, true);
    }

    /** Tax % for a purchase line, given the rate the user entered (null = the default). */
    public BigDecimal purchaseRate(Product product, BigDecimal entered) {
        TaxDefaults d = current();
        if (!d.vatRegistered()) return BigDecimal.ZERO;
        if (entered != null) return entered.setScale(2, RoundingMode.HALF_UP);
        return resolve(d, product, false);
    }

    public boolean vatRegistered() {
        return current().vatRegistered();
    }

    static BigDecimal resolve(TaxDefaults d, Product product, boolean sales) {
        if (!d.vatRegistered()) return BigDecimal.ZERO;
        if (product != null && Boolean.FALSE.equals(product.getUseDefaultTax())) return nz(product.getTaxRate());
        BigDecimal branch = sales ? d.salesRate() : d.purchaseRate();
        if (branch != null) return branch;
        return product != null ? nz(product.getTaxRate()) : BigDecimal.ZERO;
    }

    private Optional<String> value(String key, Long branchId) {
        return settingRepository.findBySettingKeyAndBranchId(key, branchId)
                .filter(s -> !Boolean.FALSE.equals(s.getIsActive()))
                .map(FinancialSetting::getSettingValue)
                .map(String::trim)
                .filter(v -> !v.isEmpty());
    }

    private BigDecimal rate(String key, Long branchId) {
        return value(key, branchId).map(v -> {
            try {
                BigDecimal r = new BigDecimal(v);
                return r.signum() < 0 ? null : r.setScale(2, RoundingMode.HALF_UP);
            } catch (NumberFormatException e) {
                return null;
            }
        }).orElse(null);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v.setScale(2, RoundingMode.HALF_UP);
    }
}
