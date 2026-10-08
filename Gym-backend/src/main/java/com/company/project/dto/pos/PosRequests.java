package com.company.project.dto.pos;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Request bodies for the Point of Sale API. JSON is snake_case (global Jackson
 * naming strategy); every field is optional unless the service says otherwise.
 * {@code supervisorPin} is only needed when the caller is not a supervisor
 * (POINT_OF_SALE_EDIT) and the action is gated by POS settings.
 */
public final class PosRequests {

    private PosRequests() {}

    public record OpenSession(
            BigDecimal openingCash,
            String openingDenominations,
            String staffName,
            String terminalName,
            String notes,
            /** The registered terminal (its code from the browser) the session opens on. */
            String terminalCode) {}

    /** Device registration / refresh from a browser. */
    public record TerminalRegister(
            String terminalCode,
            String deviceFingerprint,
            String deviceInfo,
            String operatingSystem,
            String browser,
            String name) {}

    public record TerminalUpdate(String name, Long counterId, Boolean clearCounter) {}

    /** status: ACTIVE, MAINTENANCE or BLOCKED. */
    public record TerminalStatus(String status, String reason) {}

    public record Counter(String code, String name, String description, Integer displayOrder, String status) {}

    /** Move an open session to another terminal (explicit, supervisor-approved). */
    public record SessionTransfer(String destinationTerminalCode, Long destinationTerminalId, String reason,
                                  String supervisorPin, Boolean confirm) {}

    public record CloseSession(
            BigDecimal closingCash,
            String closingDenominations,
            String notes,
            String varianceRemarks,
            BigDecimal cardSettlementAmount,
            String cardBatchNo,
            Boolean cardSettlementVerified,
            /** Supervisor closing someone else's session (or a session stuck on a previous day). */
            Boolean force,
            String forceCloseReason,
            String supervisorPin) {}

    public record CashMovement(
            String type,
            BigDecimal amount,
            String reason,
            /** Category name (legacy clients) — categoryId wins when both are sent. */
            String category,
            String reference,
            String supervisorPin,
            Long categoryId) {}

    /** Create / update a cash in / out category. movementType: DROP_IN, CASH_OUT or BOTH. */
    public record CashCategory(
            String code,
            String name,
            String description,
            String movementType,
            String accountCode,
            Integer displayOrder,
            Boolean notesRequired,
            Boolean approvalRequired,
            Boolean active) {}

    /**
     * A correction request. targetType SALE (correctionType PAYMENT_MODE or CUSTOMER),
     * CASH_MOVEMENT (CATEGORY) or SESSION (DENOMINATION); only the fields for that type are read.
     */
    public record CorrectionCreate(
            String targetType,
            Long targetId,
            String correctionType,
            String reason,
            List<PaymentAllocation> paymentAllocations,
            Long memberId,
            Long categoryId,
            String closingDenominations,
            BigDecimal closingCash,
            /** Submit straight away for approval. */
            Boolean submit) {}

    public record CorrectionDecision(String notes) {}

    /** One payment allocation from the terminal's payment panel. */
    public record PaymentAllocation(
            String type,
            String subtype,
            BigDecimal amount,
            String reference,
            Long bankAccountId,
            String bankAccountName,
            String customerCode,
            String customerName) {}

    public record CheckoutItem(
            Long productId,
            String productName,
            String productSku,
            Long warehouseId,
            Integer quantity,
            BigDecimal unitPrice,
            Boolean priceOverridden,
            BigDecimal discountPercent,
            BigDecimal discountAmount) {}

    public record Checkout(
            Long posSessionId,
            Long memberId,
            String memberName,
            List<CheckoutItem> items,
            String billDiscountType,
            BigDecimal billDiscountValue,
            List<PaymentAllocation> paymentAllocations,
            String notes,
            String terminalName,
            String supervisorPin,
            Long heldSaleId,
            /* Legacy single-method fields, used only when paymentAllocations is absent. */
            String paymentMethod,
            BigDecimal receivedAmount,
            List<com.company.project.dto.PaymentSplitDTO> paymentBreakdown,
            /** A promotion or referral-coupon code typed at the till. */
            String discountCode,
            /** A promotion picked from the till's promotion list (promotions without a code). */
            Long promotionId) {}

    public record ReturnItem(Long transactionItemId, Integer quantity) {}

    public record SaleReturn(
            List<ReturnItem> items,
            /** ORIGINAL (mirror the sale's tenders), CASH, CARD, ONLINE or CREDIT (reduce on-account balance). */
            String refundMethod,
            Long bankAccountId,
            String reason,
            String notes,
            Boolean restock,
            Long posSessionId,
            String supervisorPin) {}

    public record Approval(String supervisorPin) {}

    public record HoldSale(
            Long posSessionId,
            String label,
            Long memberId,
            String memberName,
            String cartJson,
            Integer itemCount,
            BigDecimal total,
            String terminalName) {}

    public record DayClose(
            LocalDate businessDate,
            BigDecimal countedCash,
            String remarks,
            String supervisorPin) {}

    public record CreditPayment(
            Long memberId,
            BigDecimal amount,
            String paymentMethod,
            Long bankAccountId,
            String reference,
            String notes,
            Long posSessionId) {}

    public record Printer(
            String name,
            String connectionType,
            String systemPrinterName,
            String ipAddress,
            Integer portNumber,
            String paperSize,
            String terminalName,
            Boolean isDefault,
            Boolean openDrawer,
            Boolean autoCut,
            Boolean enabled) {}

    /** jobType: RECEIPT, REPORT, TEST, DRAWER_KICK or OTHER (inferred from the title when absent). */
    public record EscPosPrint(String dataBase64, String title, String jobType, String sourceRef, String terminalName) {}

    /** A print the till sent itself (agent / browser), reported for the print log and device health. */
    public record PrintJobReport(Long printerId, String jobType, String title, Boolean success, String message,
                                 Integer bytes, String terminalName, String sourceRef) {}

    public record Device(String deviceCode, String name, String deviceType, String connectionType, String address,
                         Long terminalId, Long printerId, String notes, String configJson) {}

    /** status: ACTIVE, INACTIVE, MAINTENANCE or DECOMMISSIONED. */
    public record DeviceStatus(String status, String reason) {}

    /** health: HEALTHY, DEGRADED or OFFLINE. */
    public record DeviceHealth(String health, String message, String terminalName) {}

    public record ScanTest(String value, String terminalName) {}

    public record HardwareProfileDevice(String role, Long deviceId) {}

    public record HardwareProfile(String name, String description, String status, List<HardwareProfileDevice> devices) {}

    public record TerminalProfile(Long hardwareProfileId) {}

    public record PrinterTestResult(Boolean success, String message) {}

    public record SupervisorPin(String pin, String currentPin) {}

    public record ClientAudit(
            String action,
            String referenceType,
            Long referenceId,
            String referenceNumber,
            Long posSessionId,
            BigDecimal amount,
            String details,
            String terminalName) {}

    /** Partial settings update — null fields are left unchanged. */
    public record Settings(
            Boolean requireSupervisorForVoid,
            Boolean requireSupervisorForReturn,
            Boolean requireSupervisorForPriceOverride,
            Boolean requireSupervisorForCashOut,
            Boolean requireSupervisorForReprint,
            Boolean requireSupervisorForForceClose,
            Boolean allowPriceOverride,
            BigDecimal maxCashierDiscountPercent,
            Boolean taxInclusive,
            Boolean requireCustomer,
            Boolean allowCreditSales,
            Boolean requireCashMovementCategory,
            List<String> cashInCategories,
            List<String> cashOutCategories,
            BigDecimal cashVarianceThreshold,
            List<BigDecimal> denominations,
            Boolean autoPrintReceipt,
            Integer receiptCopies,
            String defaultPrintFormat,
            Boolean openDrawerOnCash,
            Integer idleLockMinutes,
            String layout,
            Boolean hideCategoryPanel,
            Boolean showProductImages,
            Boolean showStockOnCards,
            Boolean receiptShareEnabled,
            String zReportAccess,
            String receiptTemplate,
            Boolean businessDayEnabled,
            String businessDayStart,
            String businessDayEnd,
            Integer businessDayExtensionMinutes,
            String timeZone,
            Boolean requireSupervisorForVariance,
            Boolean requireTerminalApproval,
            Integer maxTerminals,
            Integer offlineThresholdMinutes) {}

    public record SupervisorAction(String supervisorPin, String reason) {}
}
