package com.company.project.dto.pos;

import com.company.project.dto.PaymentSplitDTO;
import com.company.project.json.UtcLocalDateTimeSerializer;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response bodies for the Point of Sale API (serialized snake_case). Field names
 * of SessionDTO / TransactionDTO are a superset of the legacy PosSessionResponseDTO /
 * SaleTransactionResponseDTO, so older clients keep working.
 */
public final class PosResponses {

    private PosResponses() {}

    public record SessionDTO(
            Long id,
            String sessionNumber,
            String status,
            BigDecimal openingCash,
            BigDecimal closingCash,
            String openingDenominations,
            String closingDenominations,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime openedAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime closedAt,
            String openedBy,
            String closedBy,
            String staffName,
            String terminalName,
            LocalDate businessDate,
            BigDecimal expectedCash,
            BigDecimal cashVariance,
            BigDecimal cardSettlementAmount,
            String cardBatchNo,
            Boolean cardSettlementVerified,
            String varianceRemarks,
            String notes,
            Boolean forceClosed,
            String forceCloseReason,
            Integer xReportPrintCount,
            Long dayCloseId,
            BigDecimal totalSales,
            int transactionCount,
            /** The calling user opened this session. */
            boolean mine,
            /** Still open on a business date before today — must be closed before selling continues. */
            boolean stale,
            /** Closing workflow started: only closing is allowed now. */
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime closingStartedAt,
            String closingStartedBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime lastActivityAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime suspendedAt,
            String suspendedBy,
            String takenOverFrom,
            String varianceApprovedBy,
            Long terminalId,
            String counterName) {}

    public record TerminalDTO(
            Long id,
            String terminalCode,
            String name,
            Long counterId,
            String counterName,
            String deviceInfo,
            String operatingSystem,
            String browser,
            String ipAddress,
            boolean isMain,
            /** PENDING, ACTIVE, MAINTENANCE, BLOCKED, ARCHIVED or DECOMMISSIONED. */
            String status,
            /** ONLINE / OFFLINE from the last heartbeat (only meaningful for usable terminals). */
            String connectivity,
            String statusReason,
            String registeredBy,
            String approvedBy,
            String lastUser,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime lastSeenAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime lastHeartbeatAt,
            Long currentSessionId,
            String currentSessionNumber,
            String currentSessionUser,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime archivedAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime decommissionedAt,
            /** Usable for selling (ACTIVE or MAINTENANCE with its session running). */
            boolean canSell,
            Long hardwareProfileId,
            String hardwareProfileName,
            /** The profile's receipt printer (pos_printers id) — preferred over name-matched printers. */
            Long receiptPrinterId) {}

    public record DeviceDTO(
            Long id,
            String deviceCode,
            String name,
            String deviceType,
            String connectionType,
            String address,
            Long terminalId,
            String terminalName,
            Long printerId,
            String printerName,
            String status,
            String health,
            String healthMessage,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime lastHealthAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime lastUsedAt,
            String configJson,
            String notes,
            /** Hardware profiles that use it ("Front desk kit: RECEIPT_PRINTER"). */
            List<String> profiles,
            /** PRINTER devices are managed under Printers. */
            boolean managedByPrinter) {}

    public record DeviceEventDTO(
            Long id, Long deviceId, String deviceName, String eventType, String result, String message,
            String terminalName, String performedBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt) {}

    public record HardwareProfileDeviceDTO(String role, Long deviceId, String deviceName, String deviceType, String health) {}

    public record HardwareProfileDTO(Long id, String name, String description, String status, Integer version,
                                     List<HardwareProfileDeviceDTO> devices, List<String> terminals) {}

    public record PrintJobDTO(
            Long id, String jobType, Long printerId, String printerName, String connectionType, String terminalName,
            String title, String sourceRef, Integer payloadBytes, String status, Integer attemptCount, Integer maxAttempts,
            String lastError, String requestedBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime dispatchedAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime completedAt,
            /** A network job whose payload is still held — it can be sent again. */
            boolean retryable) {}

    public record PrintJobsPage(List<PrintJobDTO> jobs, PageMeta pagination) {}

    public record DeviceDashboard(
            java.util.Map<String, Long> byType,
            java.util.Map<String, Long> byHealth,
            long devices,
            long attention,
            long terminalsOnline,
            long terminalsOffline,
            long terminalsPending,
            long jobsQueued,
            long jobsFailed24h,
            long jobsSucceeded24h,
            List<DeviceEventDTO> recentEvents) {}

    /** POST /pos/terminals/register — this browser's terminal; pending until approved when approval is on. */
    public record TerminalRegistration(TerminalDTO terminal, boolean isNew, boolean pending) {}

    public record CounterDTO(Long id, String code, String name, String description, String status,
                             Integer displayOrder, long terminalCount) {}

    public record SessionTerminalHistoryDTO(
            Long id, Long terminalId, String terminalName,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime startedAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime endedAt,
            String movedBy, String approvedBy, String reason) {}

    /**
     * GET /pos/day-status — the business day as the till sees it. phase: UNRESTRICTED (no window),
     * ACTIVE, EXTENSION (past the scheduled end, still trading) or CLOSED (no new sessions / sales).
     */
    public record DayStatus(
            String timeZone,
            LocalDate tradingDate,
            String phase,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime windowStart,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime scheduledEnd,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime closesAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime nextStart,
            boolean dayClosed,
            /** Earliest business date with sessions but no Day Close yet (before today, or today once closed). */
            LocalDate pendingDayCloseDate,
            /** Open / suspended sessions from a business date that has ended. */
            List<SessionDTO> sessionsRequiringClosure,
            SessionDTO mySession) {}

    public record TransactionItemDTO(
            Long id,
            Long transactionId,
            Long productId,
            String productName,
            String productSku,
            String barcode,
            String categoryName,
            Long warehouseId,
            Integer quantity,
            Integer returnedQuantity,
            BigDecimal listPrice,
            BigDecimal unitPrice,
            Boolean priceOverridden,
            BigDecimal discountPercent,
            BigDecimal discountAmount,
            BigDecimal billDiscountShare,
            BigDecimal taxRate,
            BigDecimal taxableAmount,
            BigDecimal taxAmount,
            /** Taxable amount (net of all discounts, before VAT). Kept for legacy clients. */
            BigDecimal totalAmount,
            /** Taxable + VAT — what the customer pays for the line. */
            BigDecimal lineTotal) {}

    public record ReturnSummaryDTO(
            Long id,
            String returnNumber,
            BigDecimal totalAmount,
            String refundMethod,
            String reason,
            String cashierName,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt) {}

    public record TransactionDTO(
            Long id,
            String transactionNumber,
            Long posSessionId,
            Long memberId,
            String memberName,
            String memberCode,
            String memberPhone,
            String paymentMethod,
            String paymentSummary,
            List<PaymentSplitDTO> paymentBreakdown,
            String paymentAllocations,
            BigDecimal subtotal,
            BigDecimal lineDiscountAmount,
            String billDiscountType,
            BigDecimal billDiscountValue,
            BigDecimal billDiscountAmount,
            /** Promotion / coupon code applied at the till, its discount, and the promotion's name. */
            String discountCode,
            BigDecimal codeDiscountAmount,
            Long promotionId,
            String promotionName,
            BigDecimal discountAmount,
            BigDecimal taxableAmount,
            BigDecimal taxAmount,
            Boolean taxInclusive,
            BigDecimal totalAmount,
            BigDecimal receivedAmount,
            BigDecimal changeAmount,
            BigDecimal creditAmount,
            BigDecimal creditSettledAmount,
            BigDecimal creditOutstanding,
            BigDecimal refundedAmount,
            String returnStatus,
            String status,
            String notes,
            String cashierName,
            String terminalName,
            LocalDate businessDate,
            Integer reprintCount,
            String approvedBy,
            Long branchId,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime updatedAt,
            List<TransactionItemDTO> items,
            List<ReturnSummaryDTO> returns) {}

    public record PageMeta(int page, int limit, long total, int totalPages) {}

    /**
     * A promotion or coupon as the till sees it. discountType: percentage | fixed | free.
     * discountAmount is filled when looked up against a basket amount.
     */
    public record DiscountRule(
            String source,
            String code,
            Long promotionId,
            String name,
            String discountType,
            BigDecimal discountValue,
            BigDecimal maximumDiscount,
            BigDecimal minimumPurchase,
            BigDecimal discountAmount,
            String description) {}

    public record WalletBalance(Long memberId, String memberCode, BigDecimal balance) {}

    public record TransactionsPage(List<TransactionDTO> transactions, PageMeta pagination) {}

    public record SessionsPage(List<SessionDTO> sessions, PageMeta pagination) {}

    public record CashMovementDTO(
            Long id,
            Long posSessionId,
            String type,
            BigDecimal amount,
            String reason,
            String category,
            String reference,
            String createdBy,
            String approvedBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt,
            Long categoryId,
            String postedAccountCode,
            String postedAccountName) {}

    public record CashCategoryDTO(
            Long id,
            String code,
            String name,
            String description,
            String movementType,
            String accountCode,
            String accountName,
            Integer displayOrder,
            Boolean notesRequired,
            Boolean approvalRequired,
            Boolean active) {}

    public record CorrectionDTO(
            Long id,
            String requestNumber,
            String targetType,
            Long targetId,
            String targetLabel,
            String correctionType,
            String originalJson,
            String correctedJson,
            BigDecimal differenceAmount,
            String summary,
            String reason,
            String status,
            String requestedBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime requestedAt,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime submittedAt,
            String approvedBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime approvedAt,
            String approvalNotes,
            String rejectedBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime rejectedAt,
            String rejectionReason,
            String appliedBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime appliedAt,
            String journalReference,
            String executionError,
            String cancelledBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime cancelledAt,
            /** The caller may approve / reject (a supervisor who did not request it). */
            boolean canDecide) {}

    public record CorrectionsPage(List<CorrectionDTO> corrections, PageMeta pagination) {}

    /** Counts per status plus totals by type — the corrections dashboard. */
    public record CorrectionDashboard(java.util.Map<String, Long> byStatus, java.util.Map<String, Long> byType,
                                      long awaitingMyDecision, BigDecimal appliedDifference) {}

    public record ReturnItemDTO(
            Long id,
            Long transactionItemId,
            Long productId,
            String productName,
            String productSku,
            Integer quantity,
            BigDecimal unitPrice,
            BigDecimal discountAmount,
            BigDecimal taxAmount,
            BigDecimal totalAmount) {}

    public record ReturnDTO(
            Long id,
            String returnNumber,
            Long transactionId,
            String transactionNumber,
            Long posSessionId,
            Long memberId,
            String memberName,
            BigDecimal subtotal,
            BigDecimal discountAmount,
            BigDecimal taxAmount,
            BigDecimal totalAmount,
            String refundMethod,
            List<PaymentSplitDTO> refundBreakdown,
            String reason,
            String notes,
            Boolean restock,
            String approvedBy,
            String cashierName,
            LocalDate businessDate,
            Long branchId,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt,
            List<ReturnItemDTO> items) {}

    public record HeldSaleDTO(
            Long id,
            String holdNumber,
            Long posSessionId,
            String label,
            Long memberId,
            String memberName,
            String cartJson,
            Integer itemCount,
            BigDecimal total,
            String heldBy,
            String terminalName,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt) {}

    public record CreditAllocationDTO(Long transactionId, String transactionNumber, BigDecimal amount) {}

    public record CreditPaymentDTO(
            Long id,
            String paymentNumber,
            Long memberId,
            String memberName,
            Long posSessionId,
            BigDecimal amount,
            String paymentMethod,
            String bankAccountName,
            String reference,
            String notes,
            List<CreditAllocationDTO> allocations,
            String receivedBy,
            LocalDate businessDate,
            Long branchId,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt) {}

    public record OpenCreditSaleDTO(
            Long transactionId,
            String transactionNumber,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt,
            BigDecimal totalAmount,
            BigDecimal creditAmount,
            BigDecimal settledAmount,
            BigDecimal outstanding) {}

    public record CustomerCreditDTO(
            Long memberId,
            String memberName,
            String memberCode,
            String phone,
            BigDecimal totalCredit,
            BigDecimal totalSettled,
            BigDecimal outstanding,
            BigDecimal membershipOutstanding,
            List<OpenCreditSaleDTO> openSales,
            List<CreditPaymentDTO> recentPayments) {}

    public record PrinterDTO(
            Long id,
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
            Boolean enabled,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime lastTestAt,
            String lastTestResult) {}

    public record PrintResult(boolean ok, int bytes, String message) {}

    public record AuditLogDTO(
            Long id,
            String action,
            String referenceType,
            Long referenceId,
            String referenceNumber,
            Long posSessionId,
            BigDecimal amount,
            String details,
            String performedBy,
            String approvedBy,
            String terminalName,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt) {}

    public record AuditPage(List<AuditLogDTO> logs, PageMeta pagination) {}

    public record SettingsDTO(
            Long id,
            Long branchId,
            boolean hasSupervisorPin,
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
            Integer offlineThresholdMinutes,
            /** The caller can approve supervisor-gated actions without a PIN. */
            boolean currentUserIsSupervisor,
            String currentUsername,
            String currentUserDisplayName) {}

    public record PinCheck(boolean valid) {}

    // ── Reports ────────────────────────────────────────────────────────────

    public record TenderLine(String method, int count, BigDecimal amount) {}

    public record ItemLine(Long productId, String name, String sku, String category, int quantity, BigDecimal amount) {}

    public record CategoryLine(String category, int quantity, BigDecimal amount) {}

    public record HourLine(int hour, int count, BigDecimal amount) {}

    public record DayLine(LocalDate date, int count, BigDecimal amount, BigDecimal returns) {}

    public record CashierLine(String cashier, int invoiceCount, BigDecimal grossSales, BigDecimal netSales, BigDecimal discount, BigDecimal returns) {}

    public record ReportInvoiceLine(
            Long id,
            String transactionNumber,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime createdAt,
            String memberName,
            String cashierName,
            String paymentSummary,
            BigDecimal totalAmount,
            BigDecimal refundedAmount,
            String status) {}

    public record CashEvent(String type, String category, String reason, BigDecimal amount, String by, @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime at) {}

    public record CashPosition(
            BigDecimal openingCash,
            BigDecimal cashSales,
            BigDecimal creditCollectionsCash,
            BigDecimal cashIn,
            BigDecimal cashOut,
            BigDecimal cashRefunds,
            BigDecimal expectedCash) {}

    public record ReportSummary(
            int invoiceCount,
            BigDecimal grossSales,
            BigDecimal lineDiscount,
            BigDecimal billDiscount,
            BigDecimal totalDiscount,
            int discountedInvoiceCount,
            BigDecimal taxableAmount,
            BigDecimal totalTax,
            BigDecimal totalSales,
            int returnCount,
            BigDecimal returnTotal,
            BigDecimal returnTax,
            BigDecimal netSales,
            int itemsSold,
            int itemsReturned,
            BigDecimal averageBasket,
            BigDecimal creditSales,
            BigDecimal creditCollections,
            int creditCollectionCount,
            List<TenderLine> tenders,
            List<TenderLine> refunds,
            List<TenderLine> collections,
            CashPosition cash,
            String firstInvoice,
            String lastInvoice) {}

    public record XReport(
            SessionDTO session,
            ReportSummary summary,
            List<ItemLine> topItems,
            List<CategoryLine> categories,
            List<HourLine> hourly,
            List<CashEvent> cashEvents,
            List<ReportInvoiceLine> invoices,
            List<ReturnDTO> returns,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime generatedAt,
            String generatedBy) {}

    public record DayCloseDTO(
            Long id,
            String closeNumber,
            LocalDate businessDate,
            int sessionCount,
            int invoiceCount,
            BigDecimal grossSales,
            BigDecimal totalDiscount,
            BigDecimal totalTax,
            BigDecimal netSales,
            BigDecimal totalReturns,
            BigDecimal expectedCash,
            BigDecimal countedCash,
            BigDecimal cashVariance,
            String remarks,
            String closedBy,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime closedAt) {}

    public record ChecklistItem(String key, String label, boolean ok, String detail) {}

    public record ZReport(
            LocalDate businessDate,
            ReportSummary summary,
            List<SessionDTO> sessions,
            List<CashierLine> cashiers,
            List<ItemLine> topItems,
            List<CategoryLine> categories,
            List<HourLine> hourly,
            List<CashEvent> cashEvents,
            List<ReportInvoiceLine> invoices,
            List<ChecklistItem> checklist,
            boolean canClose,
            DayCloseDTO dayClose,
            int heldSaleCount,
            @JsonSerialize(using = UtcLocalDateTimeSerializer.class) LocalDateTime generatedAt,
            String generatedBy) {}

    public record Analytics(
            LocalDate from,
            LocalDate to,
            ReportSummary summary,
            List<DayLine> daily,
            List<HourLine> hourly,
            List<ItemLine> topItems,
            List<CategoryLine> categories,
            List<CashierLine> cashiers) {}
}
