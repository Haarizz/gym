package com.company.project.entities;

import jakarta.persistence.*;
import org.hibernate.annotations.Filter;

import java.math.BigDecimal;

/**
 * Point of Sale configuration for one branch (ported from BillBull's PosSettings):
 * supervisor approvals, discount limits, tax mode, cash handling, printing and
 * terminal layout. One row per branch, created with defaults on first read.
 * receiptTemplate holds the receipt designer's JSON (header/footer text and toggles).
 */
@Filter(name = "branchFilter", condition = "branch_id = :branchId")
@Entity
@Table(name = "pos_settings")
public class PosSettings extends BaseEntity implements BranchAware {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "branch_id")
    private Long branchId;

    /** BCrypt hash of the branch supervisor PIN; null until one is set. Never serialized. */
    @Column(name = "supervisor_pin_hash")
    private String supervisorPinHash;

    @Column(name = "require_supervisor_for_void", nullable = false)
    private Boolean requireSupervisorForVoid = false;

    @Column(name = "require_supervisor_for_return", nullable = false)
    private Boolean requireSupervisorForReturn = true;

    @Column(name = "require_supervisor_for_price_override", nullable = false)
    private Boolean requireSupervisorForPriceOverride = true;

    @Column(name = "require_supervisor_for_cash_out", nullable = false)
    private Boolean requireSupervisorForCashOut = false;

    @Column(name = "require_supervisor_for_reprint", nullable = false)
    private Boolean requireSupervisorForReprint = false;

    @Column(name = "require_supervisor_for_force_close", nullable = false)
    private Boolean requireSupervisorForForceClose = true;

    @Column(name = "allow_price_override", nullable = false)
    private Boolean allowPriceOverride = true;

    /** Highest line/bill discount a cashier may give without supervisor approval. */
    @Column(name = "max_cashier_discount_percent", precision = 5, scale = 2, nullable = false)
    private BigDecimal maxCashierDiscountPercent = new BigDecimal("10.00");

    /** When true, product selling prices already include VAT (tax is extracted, not added). */
    @Column(name = "tax_inclusive", nullable = false)
    private Boolean taxInclusive = false;

    @Column(name = "require_customer", nullable = false)
    private Boolean requireCustomer = false;

    @Column(name = "allow_credit_sales", nullable = false)
    private Boolean allowCreditSales = true;

    @Column(name = "require_cash_movement_category", nullable = false)
    private Boolean requireCashMovementCategory = false;

    /** JSON array of category labels offered for cash drop-in. */
    @Column(name = "cash_in_categories", columnDefinition = "TEXT")
    private String cashInCategories;

    /** JSON array of category labels offered for cash-out / paid-out. */
    @Column(name = "cash_out_categories", columnDefinition = "TEXT")
    private String cashOutCategories;

    /** Closing variance above this absolute amount requires remarks. 0 = any variance needs remarks. */
    @Column(name = "cash_variance_threshold", precision = 12, scale = 2, nullable = false)
    private BigDecimal cashVarianceThreshold = BigDecimal.ZERO;

    /** JSON array of denomination values (e.g. [1000,500,...,0.25]) used by the cash count. */
    @Column(name = "denominations", columnDefinition = "TEXT")
    private String denominations;

    @Column(name = "auto_print_receipt", nullable = false)
    private Boolean autoPrintReceipt = true;

    @Column(name = "receipt_copies", nullable = false)
    private Integer receiptCopies = 1;

    /** 80mm, 58mm or A4. */
    @Column(name = "default_print_format", length = 20, nullable = false)
    private String defaultPrintFormat = "80mm";

    @Column(name = "open_drawer_on_cash", nullable = false)
    private Boolean openDrawerOnCash = true;

    /** Minutes of inactivity before the terminal locks itself. 0 = never. */
    @Column(name = "idle_lock_minutes", nullable = false)
    private Integer idleLockMinutes = 0;

    /** classic (categories + grid + cart) or compact (grid + cart). */
    @Column(name = "layout", length = 20, nullable = false)
    private String layout = "classic";

    @Column(name = "hide_category_panel", nullable = false)
    private Boolean hideCategoryPanel = false;

    @Column(name = "show_product_images", nullable = false)
    private Boolean showProductImages = true;

    @Column(name = "show_stock_on_cards", nullable = false)
    private Boolean showStockOnCards = true;

    @Column(name = "receipt_share_enabled", nullable = false)
    private Boolean receiptShareEnabled = true;

    /** ANY = every cashier may run the day close; SUPERVISOR = needs supervisor approval. */
    @Column(name = "z_report_access", length = 20, nullable = false)
    private String zReportAccess = "SUPERVISOR";

    @Column(name = "receipt_template", columnDefinition = "TEXT")
    private String receiptTemplate;

    /** Business-day window (V78). Off = 24-hour trading on the calendar date. */
    @Column(name = "business_day_enabled", nullable = false, columnDefinition = "boolean not null default false")
    private Boolean businessDayEnabled = false;

    /** "HH:mm" in the branch time zone. An end earlier than the start runs past midnight. */
    @Column(name = "business_day_start", length = 5)
    private String businessDayStart;

    @Column(name = "business_day_end", length = 5)
    private String businessDayEnd;

    /** Grace period after the scheduled end before trading stops. */
    @Column(name = "business_day_extension_minutes", nullable = false, columnDefinition = "integer not null default 0")
    private Integer businessDayExtensionMinutes = 0;

    /** IANA zone for business dates and the window, e.g. Asia/Dubai. Null = server time (UTC). */
    @Column(name = "time_zone", length = 60)
    private String timeZone;

    /** Closing with a cash variance above the threshold needs a supervisor. */
    @Column(name = "require_supervisor_for_variance", nullable = false, columnDefinition = "boolean not null default true")
    private Boolean requireSupervisorForVariance = true;

    /** New devices wait for a supervisor's approval before they can open sessions. */
    @Column(name = "require_terminal_approval", nullable = false, columnDefinition = "boolean not null default false")
    private Boolean requireTerminalApproval = false;

    /** Cap on registered terminals (archived and decommissioned ones free their slot). */
    @Column(name = "max_terminals", nullable = false, columnDefinition = "integer not null default 10")
    private Integer maxTerminals = 10;

    /** A terminal without a heartbeat for this long shows as offline. */
    @Column(name = "offline_threshold_minutes", nullable = false, columnDefinition = "integer not null default 15")
    private Integer offlineThresholdMinutes = 15;

    public PosSettings() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    @Override
    public Long getBranchId() { return branchId; }
    @Override
    public void setBranchId(Long branchId) { this.branchId = branchId; }

    public String getSupervisorPinHash() { return supervisorPinHash; }
    public void setSupervisorPinHash(String supervisorPinHash) { this.supervisorPinHash = supervisorPinHash; }

    public Boolean getRequireSupervisorForVoid() { return requireSupervisorForVoid; }
    public void setRequireSupervisorForVoid(Boolean v) { this.requireSupervisorForVoid = v; }

    public Boolean getRequireSupervisorForReturn() { return requireSupervisorForReturn; }
    public void setRequireSupervisorForReturn(Boolean v) { this.requireSupervisorForReturn = v; }

    public Boolean getRequireSupervisorForPriceOverride() { return requireSupervisorForPriceOverride; }
    public void setRequireSupervisorForPriceOverride(Boolean v) { this.requireSupervisorForPriceOverride = v; }

    public Boolean getRequireSupervisorForCashOut() { return requireSupervisorForCashOut; }
    public void setRequireSupervisorForCashOut(Boolean v) { this.requireSupervisorForCashOut = v; }

    public Boolean getRequireSupervisorForReprint() { return requireSupervisorForReprint; }
    public void setRequireSupervisorForReprint(Boolean v) { this.requireSupervisorForReprint = v; }

    public Boolean getRequireSupervisorForForceClose() { return requireSupervisorForForceClose; }
    public void setRequireSupervisorForForceClose(Boolean v) { this.requireSupervisorForForceClose = v; }

    public Boolean getAllowPriceOverride() { return allowPriceOverride; }
    public void setAllowPriceOverride(Boolean v) { this.allowPriceOverride = v; }

    public BigDecimal getMaxCashierDiscountPercent() { return maxCashierDiscountPercent; }
    public void setMaxCashierDiscountPercent(BigDecimal v) { this.maxCashierDiscountPercent = v; }

    public Boolean getTaxInclusive() { return taxInclusive; }
    public void setTaxInclusive(Boolean v) { this.taxInclusive = v; }

    public Boolean getRequireCustomer() { return requireCustomer; }
    public void setRequireCustomer(Boolean v) { this.requireCustomer = v; }

    public Boolean getAllowCreditSales() { return allowCreditSales; }
    public void setAllowCreditSales(Boolean v) { this.allowCreditSales = v; }

    public Boolean getRequireCashMovementCategory() { return requireCashMovementCategory; }
    public void setRequireCashMovementCategory(Boolean v) { this.requireCashMovementCategory = v; }

    public String getCashInCategories() { return cashInCategories; }
    public void setCashInCategories(String v) { this.cashInCategories = v; }

    public String getCashOutCategories() { return cashOutCategories; }
    public void setCashOutCategories(String v) { this.cashOutCategories = v; }

    public BigDecimal getCashVarianceThreshold() { return cashVarianceThreshold; }
    public void setCashVarianceThreshold(BigDecimal v) { this.cashVarianceThreshold = v; }

    public String getDenominations() { return denominations; }
    public void setDenominations(String v) { this.denominations = v; }

    public Boolean getAutoPrintReceipt() { return autoPrintReceipt; }
    public void setAutoPrintReceipt(Boolean v) { this.autoPrintReceipt = v; }

    public Integer getReceiptCopies() { return receiptCopies; }
    public void setReceiptCopies(Integer v) { this.receiptCopies = v; }

    public String getDefaultPrintFormat() { return defaultPrintFormat; }
    public void setDefaultPrintFormat(String v) { this.defaultPrintFormat = v; }

    public Boolean getOpenDrawerOnCash() { return openDrawerOnCash; }
    public void setOpenDrawerOnCash(Boolean v) { this.openDrawerOnCash = v; }

    public Integer getIdleLockMinutes() { return idleLockMinutes; }
    public void setIdleLockMinutes(Integer v) { this.idleLockMinutes = v; }

    public String getLayout() { return layout; }
    public void setLayout(String v) { this.layout = v; }

    public Boolean getHideCategoryPanel() { return hideCategoryPanel; }
    public void setHideCategoryPanel(Boolean v) { this.hideCategoryPanel = v; }

    public Boolean getShowProductImages() { return showProductImages; }
    public void setShowProductImages(Boolean v) { this.showProductImages = v; }

    public Boolean getShowStockOnCards() { return showStockOnCards; }
    public void setShowStockOnCards(Boolean v) { this.showStockOnCards = v; }

    public Boolean getReceiptShareEnabled() { return receiptShareEnabled; }
    public void setReceiptShareEnabled(Boolean v) { this.receiptShareEnabled = v; }

    public String getZReportAccess() { return zReportAccess; }
    public void setZReportAccess(String v) { this.zReportAccess = v; }

    public String getReceiptTemplate() { return receiptTemplate; }
    public void setReceiptTemplate(String v) { this.receiptTemplate = v; }
    public Boolean getBusinessDayEnabled() { return businessDayEnabled; }
    public void setBusinessDayEnabled(Boolean v) { this.businessDayEnabled = v; }
    public String getBusinessDayStart() { return businessDayStart; }
    public void setBusinessDayStart(String v) { this.businessDayStart = v; }
    public String getBusinessDayEnd() { return businessDayEnd; }
    public void setBusinessDayEnd(String v) { this.businessDayEnd = v; }
    public Integer getBusinessDayExtensionMinutes() { return businessDayExtensionMinutes; }
    public void setBusinessDayExtensionMinutes(Integer v) { this.businessDayExtensionMinutes = v; }
    public String getTimeZone() { return timeZone; }
    public void setTimeZone(String v) { this.timeZone = v; }
    public Boolean getRequireSupervisorForVariance() { return requireSupervisorForVariance; }
    public void setRequireSupervisorForVariance(Boolean v) { this.requireSupervisorForVariance = v; }
    public Boolean getRequireTerminalApproval() { return requireTerminalApproval; }
    public void setRequireTerminalApproval(Boolean v) { this.requireTerminalApproval = v; }
    public Integer getMaxTerminals() { return maxTerminals; }
    public void setMaxTerminals(Integer v) { this.maxTerminals = v; }
    public Integer getOfflineThresholdMinutes() { return offlineThresholdMinutes; }
    public void setOfflineThresholdMinutes(Integer v) { this.offlineThresholdMinutes = v; }
}
