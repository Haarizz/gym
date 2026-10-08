package com.company.project.services.pos;

import com.company.project.dto.pos.PosRequests;
import com.company.project.dto.pos.PosResponses.SettingsDTO;
import com.company.project.entities.PosSettings;
import com.company.project.exceptions.BusinessRuleViolationException;
import com.company.project.repositories.PosSettingsRepository;
import com.company.project.security.BranchContextHolder;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Set;

/**
 * Branch POS settings. A branch with no row yet behaves as if it had the defaults;
 * the row is created on the first save (or the first PIN change).
 */
@Service
@Transactional
public class PosSettingsService {

    public static final List<String> DEFAULT_CASH_IN = List.of("Float top-up", "Change fund", "Other");
    public static final List<String> DEFAULT_CASH_OUT = List.of(
            "Bank deposit", "Safe drop", "Petty cash expense", "Supplier payment", "Other");
    public static final List<BigDecimal> DEFAULT_DENOMINATIONS = List.of(
            new BigDecimal("1000"), new BigDecimal("500"), new BigDecimal("200"), new BigDecimal("100"),
            new BigDecimal("50"), new BigDecimal("20"), new BigDecimal("10"), new BigDecimal("5"),
            new BigDecimal("1"), new BigDecimal("0.50"), new BigDecimal("0.25"));

    private static final Set<String> PRINT_FORMATS = Set.of("80mm", "58mm", "A4");
    private static final Set<String> LAYOUTS = Set.of("classic", "compact", "focus");
    private static final Set<String> Z_ACCESS = Set.of("ANY", "SUPERVISOR");
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private final PosSettingsRepository repository;
    private final PosSupport support;
    private final PosAuditService auditService;

    /** Optional (absent in unit tests): managed cash categories replace the plain label lists. */
    private PosCashCategoryService categoryService;

    public PosSettingsService(PosSettingsRepository repository, PosSupport support, PosAuditService auditService) {
        this.repository = repository;
        this.support = support;
        this.auditService = auditService;
    }

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    public void setCategoryService(@org.springframework.context.annotation.Lazy PosCashCategoryService categoryService) {
        this.categoryService = categoryService;
    }

    /** Settings for the active branch, or unsaved defaults when the branch has none yet. */
    @Transactional(readOnly = true)
    public PosSettings current() {
        Long branchId = BranchContextHolder.getActiveBranchId();
        if (branchId == null) return new PosSettings();
        return repository.findFirstByBranchId(branchId).orElseGet(() -> {
            PosSettings fresh = new PosSettings();
            fresh.setBranchId(branchId);
            return fresh;
        });
    }

    @Transactional(readOnly = true)
    public SettingsDTO getSettings() {
        return toDto(current());
    }

    public SettingsDTO update(PosRequests.Settings req) {
        Long branchId = support.requireBranch();
        PosSettings s = repository.findFirstByBranchId(branchId).orElseGet(() -> {
            PosSettings fresh = new PosSettings();
            fresh.setBranchId(branchId);
            return fresh;
        });

        if (req.requireSupervisorForVoid() != null) s.setRequireSupervisorForVoid(req.requireSupervisorForVoid());
        if (req.requireSupervisorForReturn() != null) s.setRequireSupervisorForReturn(req.requireSupervisorForReturn());
        if (req.requireSupervisorForPriceOverride() != null) s.setRequireSupervisorForPriceOverride(req.requireSupervisorForPriceOverride());
        if (req.requireSupervisorForCashOut() != null) s.setRequireSupervisorForCashOut(req.requireSupervisorForCashOut());
        if (req.requireSupervisorForReprint() != null) s.setRequireSupervisorForReprint(req.requireSupervisorForReprint());
        if (req.requireSupervisorForForceClose() != null) s.setRequireSupervisorForForceClose(req.requireSupervisorForForceClose());
        if (req.allowPriceOverride() != null) s.setAllowPriceOverride(req.allowPriceOverride());
        if (req.maxCashierDiscountPercent() != null) {
            BigDecimal pct = req.maxCashierDiscountPercent();
            if (pct.signum() < 0 || pct.compareTo(PosSupport.HUNDRED) > 0) {
                throw new BusinessRuleViolationException("Maximum cashier discount must be between 0 and 100%.");
            }
            s.setMaxCashierDiscountPercent(PosSupport.r2(pct));
        }
        if (req.taxInclusive() != null) s.setTaxInclusive(req.taxInclusive());
        if (req.requireCustomer() != null) s.setRequireCustomer(req.requireCustomer());
        if (req.allowCreditSales() != null) s.setAllowCreditSales(req.allowCreditSales());
        if (req.requireCashMovementCategory() != null) s.setRequireCashMovementCategory(req.requireCashMovementCategory());
        if (req.cashInCategories() != null) s.setCashInCategories(writeList(cleanLabels(req.cashInCategories())));
        if (req.cashOutCategories() != null) s.setCashOutCategories(writeList(cleanLabels(req.cashOutCategories())));
        if (categoryService != null) {
            categoryService.ensureNames("DROP_IN", req.cashInCategories() == null ? null : cleanLabels(req.cashInCategories()));
            categoryService.ensureNames("CASH_OUT", req.cashOutCategories() == null ? null : cleanLabels(req.cashOutCategories()));
        }
        if (req.cashVarianceThreshold() != null) {
            if (req.cashVarianceThreshold().signum() < 0) {
                throw new BusinessRuleViolationException("Cash variance threshold cannot be negative.");
            }
            s.setCashVarianceThreshold(PosSupport.r2(req.cashVarianceThreshold()));
        }
        if (req.denominations() != null) {
            List<BigDecimal> denoms = req.denominations().stream()
                    .filter(Objects::nonNull).filter(d -> d.signum() > 0)
                    .distinct().sorted((a, b) -> b.compareTo(a)).toList();
            if (denoms.isEmpty()) throw new BusinessRuleViolationException("Add at least one cash denomination.");
            s.setDenominations(writeList(denoms));
        }
        if (req.autoPrintReceipt() != null) s.setAutoPrintReceipt(req.autoPrintReceipt());
        if (req.receiptCopies() != null) s.setReceiptCopies(Math.max(1, Math.min(5, req.receiptCopies())));
        if (req.defaultPrintFormat() != null) {
            if (!PRINT_FORMATS.contains(req.defaultPrintFormat())) {
                throw new BusinessRuleViolationException("Print format must be 80mm, 58mm or A4.");
            }
            s.setDefaultPrintFormat(req.defaultPrintFormat());
        }
        if (req.openDrawerOnCash() != null) s.setOpenDrawerOnCash(req.openDrawerOnCash());
        if (req.idleLockMinutes() != null) s.setIdleLockMinutes(Math.max(0, Math.min(240, req.idleLockMinutes())));
        if (req.layout() != null) {
            if (!LAYOUTS.contains(req.layout())) throw new BusinessRuleViolationException("Unknown terminal layout.");
            s.setLayout(req.layout());
        }
        if (req.hideCategoryPanel() != null) s.setHideCategoryPanel(req.hideCategoryPanel());
        if (req.showProductImages() != null) s.setShowProductImages(req.showProductImages());
        if (req.showStockOnCards() != null) s.setShowStockOnCards(req.showStockOnCards());
        if (req.receiptShareEnabled() != null) s.setReceiptShareEnabled(req.receiptShareEnabled());
        if (req.zReportAccess() != null) {
            if (!Z_ACCESS.contains(req.zReportAccess())) throw new BusinessRuleViolationException("Unknown Z-report access mode.");
            s.setZReportAccess(req.zReportAccess());
        }
        if (req.receiptTemplate() != null) s.setReceiptTemplate(req.receiptTemplate());
        if (req.businessDayEnabled() != null) s.setBusinessDayEnabled(req.businessDayEnabled());
        if (req.businessDayStart() != null) s.setBusinessDayStart(hhmm(req.businessDayStart(), "start"));
        if (req.businessDayEnd() != null) s.setBusinessDayEnd(hhmm(req.businessDayEnd(), "end"));
        if (req.businessDayExtensionMinutes() != null) {
            s.setBusinessDayExtensionMinutes(Math.max(0, Math.min(720, req.businessDayExtensionMinutes())));
        }
        if (req.timeZone() != null) {
            String tz = PosSupport.trimToNull(req.timeZone());
            if (tz != null) {
                try {
                    java.time.ZoneId.of(tz);
                } catch (java.time.DateTimeException e) {
                    throw new BusinessRuleViolationException("Unknown time zone: " + tz);
                }
            }
            s.setTimeZone(tz);
        }
        if (req.requireSupervisorForVariance() != null) s.setRequireSupervisorForVariance(req.requireSupervisorForVariance());
        // Business hours are local times: a window without a zone takes the saving computer's zone.
        if (Boolean.TRUE.equals(s.getBusinessDayEnabled()) && (s.getTimeZone() == null || s.getTimeZone().isBlank())) {
            java.time.ZoneId client = PosBusinessDayService.clientZone();
            if (client != null) s.setTimeZone(client.getId());
        }
        if (req.requireTerminalApproval() != null) s.setRequireTerminalApproval(req.requireTerminalApproval());
        if (req.maxTerminals() != null) {
            if (req.maxTerminals() < 1 || req.maxTerminals() > 200) throw new BusinessRuleViolationException("Maximum terminals must be between 1 and 200.");
            s.setMaxTerminals(req.maxTerminals());
        }
        if (req.offlineThresholdMinutes() != null) {
            if (req.offlineThresholdMinutes() < 1 || req.offlineThresholdMinutes() > 1440) {
                throw new BusinessRuleViolationException("Offline threshold must be between 1 and 1440 minutes.");
            }
            s.setOfflineThresholdMinutes(req.offlineThresholdMinutes());
        }
        if (Boolean.TRUE.equals(s.getBusinessDayEnabled())
                && (s.getBusinessDayStart() == null || s.getBusinessDayEnd() == null)) {
            throw new BusinessRuleViolationException("Set the business day start and end times to turn the business-day window on.");
        }

        PosSettings saved = repository.save(s);
        auditService.log("SETTINGS_UPDATE", "PosSettings", saved.getId(), null, null, null,
                "POS settings updated", null, null);
        return toDto(saved);
    }

    /** Sets (or changes) the branch supervisor PIN. Changing an existing PIN needs the current one unless the caller is a supervisor. */
    public SettingsDTO setSupervisorPin(PosRequests.SupervisorPin req) {
        Long branchId = support.requireBranch();
        String pin = req.pin() == null ? "" : req.pin().trim();
        if (!pin.matches("\\d{4,8}")) {
            throw new BusinessRuleViolationException("The supervisor PIN must be 4 to 8 digits.");
        }
        PosSettings s = repository.findFirstByBranchId(branchId).orElseGet(() -> {
            PosSettings fresh = new PosSettings();
            fresh.setBranchId(branchId);
            return fresh;
        });
        if (s.getSupervisorPinHash() != null && !support.isSupervisor() && !support.pinMatches(s, req.currentPin())) {
            throw new BusinessRuleViolationException("The current supervisor PIN is incorrect.");
        }
        s.setSupervisorPinHash(support.hashPin(pin));
        PosSettings saved = repository.save(s);
        auditService.log("SUPERVISOR_PIN_CHANGE", "PosSettings", saved.getId(), null, null, null,
                "Supervisor PIN set", null, null);
        return toDto(saved);
    }

    @Transactional(readOnly = true)
    public boolean verifyPin(String pin) {
        return support.pinMatches(current(), pin);
    }

    // ── Mapping ─────────────────────────────────────────────────────────────

    public List<String> cashInCategories(PosSettings s) {
        List<String> list = readStrings(s.getCashInCategories());
        return list.isEmpty() ? DEFAULT_CASH_IN : list;
    }

    public List<String> cashOutCategories(PosSettings s) {
        List<String> list = readStrings(s.getCashOutCategories());
        return list.isEmpty() ? DEFAULT_CASH_OUT : list;
    }

    public List<BigDecimal> denominations(PosSettings s) {
        if (s.getDenominations() == null || s.getDenominations().isBlank()) return DEFAULT_DENOMINATIONS;
        try {
            List<BigDecimal> list = MAPPER.readValue(s.getDenominations(), new TypeReference<List<BigDecimal>>() {});
            return list == null || list.isEmpty() ? DEFAULT_DENOMINATIONS : list;
        } catch (Exception e) {
            return DEFAULT_DENOMINATIONS;
        }
    }

    public SettingsDTO toDto(PosSettings s) {
        return new SettingsDTO(
                s.getId(), s.getBranchId(), s.getSupervisorPinHash() != null,
                s.getRequireSupervisorForVoid(), s.getRequireSupervisorForReturn(),
                s.getRequireSupervisorForPriceOverride(), s.getRequireSupervisorForCashOut(),
                s.getRequireSupervisorForReprint(), s.getRequireSupervisorForForceClose(),
                s.getAllowPriceOverride(), s.getMaxCashierDiscountPercent(), s.getTaxInclusive(),
                s.getRequireCustomer(), s.getAllowCreditSales(), s.getRequireCashMovementCategory(),
                categoryService != null ? categoryService.names(s, "DROP_IN") : cashInCategories(s),
                categoryService != null ? categoryService.names(s, "CASH_OUT") : cashOutCategories(s),
                s.getCashVarianceThreshold(), denominations(s),
                s.getAutoPrintReceipt(), s.getReceiptCopies(), s.getDefaultPrintFormat(), s.getOpenDrawerOnCash(),
                s.getIdleLockMinutes(), s.getLayout(), s.getHideCategoryPanel(), s.getShowProductImages(),
                s.getShowStockOnCards(), s.getReceiptShareEnabled(), s.getZReportAccess(), s.getReceiptTemplate(),
                Boolean.TRUE.equals(s.getBusinessDayEnabled()), s.getBusinessDayStart(), s.getBusinessDayEnd(),
                s.getBusinessDayExtensionMinutes() == null ? 0 : s.getBusinessDayExtensionMinutes(), s.getTimeZone(),
                !Boolean.FALSE.equals(s.getRequireSupervisorForVariance()),
                Boolean.TRUE.equals(s.getRequireTerminalApproval()),
                s.getMaxTerminals() == null ? 10 : s.getMaxTerminals(),
                s.getOfflineThresholdMinutes() == null ? 15 : s.getOfflineThresholdMinutes(),
                support.isSupervisor(), support.currentUsername(), support.currentDisplayName());
    }

    /** Validates and normalises a "H:mm" / "HH:mm" time of day. */
    private static String hhmm(String raw, String which) {
        String t = PosSupport.trimToNull(raw);
        if (t == null) return null;
        try {
            return java.time.LocalTime.parse(t.length() == 4 ? "0" + t : t).toString().substring(0, 5);
        } catch (java.time.format.DateTimeParseException e) {
            throw new BusinessRuleViolationException("Business day " + which + " must be a time like 06:00.");
        }
    }

    private static List<String> cleanLabels(List<String> labels) {
        List<String> out = new ArrayList<>();
        for (String l : labels) {
            String t = PosSupport.trimToNull(l);
            if (t != null && t.length() <= 100 && !out.contains(t)) out.add(t);
        }
        return out;
    }

    private static List<String> readStrings(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            List<String> list = MAPPER.readValue(json, new TypeReference<List<String>>() {});
            return list == null ? List.of() : list;
        } catch (Exception e) {
            return List.of();
        }
    }

    private static String writeList(List<?> list) {
        try {
            return MAPPER.writeValueAsString(list);
        } catch (Exception e) {
            throw new IllegalStateException("Could not serialize POS settings list", e);
        }
    }
}
