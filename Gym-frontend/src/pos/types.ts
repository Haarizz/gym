// Point of Sale domain types (camelCase mirror of the backend's snake_case POS API).

export type SessionStatus = "OPEN" | "SUSPENDED" | "CLOSED";

export interface PosSession {
  id: number;
  sessionNumber: string;
  status: SessionStatus;
  openingCash: number;
  closingCash: number | null;
  openingDenominations: string | null;
  closingDenominations: string | null;
  openedAt: string;
  closedAt: string | null;
  openedBy: string | null;
  closedBy: string | null;
  staffName: string | null;
  terminalName: string | null;
  businessDate: string | null;
  expectedCash: number | null;
  cashVariance: number | null;
  cardSettlementAmount: number | null;
  cardBatchNo: string | null;
  cardSettlementVerified: boolean | null;
  varianceRemarks: string | null;
  notes: string | null;
  forceClosed: boolean;
  forceCloseReason: string | null;
  xReportPrintCount: number;
  dayCloseId: number | null;
  totalSales: number;
  transactionCount: number;
  mine: boolean;
  stale: boolean;
  /** Closing workflow started: selling has stopped, the session can only be closed. */
  closingStartedAt: string | null;
  closingStartedBy: string | null;
  lastActivityAt: string | null;
  suspendedAt: string | null;
  suspendedBy: string | null;
  takenOverFrom: string | null;
  varianceApprovedBy: string | null;
  /** Registered terminal the session runs on (null: opened from an unregistered browser). */
  terminalId: number | null;
  counterName: string | null;
}

export type BusinessDayPhase = "UNRESTRICTED" | "ACTIVE" | "EXTENSION" | "CLOSED";

/** GET /pos/day-status */
export interface DayStatus {
  timeZone: string;
  tradingDate: string;
  phase: BusinessDayPhase;
  windowStart: string | null;
  scheduledEnd: string | null;
  closesAt: string | null;
  nextStart: string | null;
  dayClosed: boolean;
  pendingDayCloseDate: string | null;
  sessionsRequiringClosure: PosSession[];
  mySession: PosSession | null;
}

export interface PaymentLeg {
  method: string;
  amount: number;
  reference?: string | null;
  cardType?: string | null;
  bankAccountCode?: string | null;
  bankAccountName?: string | null;
  onlinePaymentType?: string | null;
}

export interface SaleItem {
  id: number;
  transactionId: number;
  productId: number;
  productName: string;
  productSku: string | null;
  barcode: string | null;
  categoryName: string | null;
  warehouseId: number | null;
  quantity: number;
  returnedQuantity: number;
  listPrice: number;
  unitPrice: number;
  priceOverridden: boolean;
  discountPercent: number;
  discountAmount: number;
  billDiscountShare: number;
  taxRate: number | null;
  taxableAmount: number;
  taxAmount: number;
  totalAmount: number;
  lineTotal: number;
}

export interface ReturnSummary {
  id: number;
  returnNumber: string;
  totalAmount: number;
  refundMethod: string;
  reason: string | null;
  cashierName: string | null;
  createdAt: string;
}

export type SaleStatus = "COMPLETED" | "REFUNDED" | "VOIDED";
export type ReturnStatus = "NONE" | "PARTIAL" | "FULL";

export interface Sale {
  id: number;
  transactionNumber: string;
  posSessionId: number | null;
  memberId: number | null;
  memberName: string;
  memberCode: string | null;
  memberPhone: string | null;
  paymentMethod: string;
  paymentSummary: string;
  paymentBreakdown: PaymentLeg[] | null;
  paymentAllocations: string | null;
  subtotal: number;
  lineDiscountAmount: number;
  billDiscountType: string | null;
  billDiscountValue: number | null;
  billDiscountAmount: number;
  /** Promotion / coupon code applied at the till, and the discount it gave. */
  discountCode: string | null;
  codeDiscountAmount: number;
  promotionId: number | null;
  promotionName: string | null;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  taxInclusive: boolean;
  totalAmount: number;
  receivedAmount: number | null;
  changeAmount: number | null;
  creditAmount: number;
  creditSettledAmount: number;
  creditOutstanding: number;
  refundedAmount: number;
  returnStatus: ReturnStatus;
  status: SaleStatus;
  notes: string | null;
  cashierName: string | null;
  terminalName: string | null;
  businessDate: string | null;
  reprintCount: number;
  approvedBy: string | null;
  branchId: number | null;
  createdAt: string;
  updatedAt: string | null;
  items: SaleItem[];
  returns: ReturnSummary[];
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SalesPage {
  transactions: Sale[];
  pagination: PageMeta;
}

export interface SessionsPage {
  sessions: PosSession[];
  pagination: PageMeta;
}

export interface CashMovement {
  id: number;
  posSessionId: number;
  type: "DROP_IN" | "CASH_OUT";
  amount: number;
  reason: string | null;
  category: string | null;
  reference: string | null;
  createdBy: string | null;
  approvedBy: string | null;
  createdAt: string;
  categoryId: number | null;
  /** Ledger account the movement was journaled against (categories mapped to an account). */
  postedAccountCode: string | null;
  postedAccountName: string | null;
}

export type TerminalStatus = "PENDING" | "ACTIVE" | "MAINTENANCE" | "BLOCKED" | "ARCHIVED" | "DECOMMISSIONED";

export interface PosTerminal {
  id: number;
  terminalCode: string;
  name: string;
  counterId: number | null;
  counterName: string | null;
  deviceInfo: string | null;
  operatingSystem: string | null;
  browser: string | null;
  ipAddress: string | null;
  isMain: boolean;
  status: TerminalStatus;
  connectivity: "ONLINE" | "OFFLINE";
  statusReason: string | null;
  registeredBy: string | null;
  approvedBy: string | null;
  lastUser: string | null;
  lastSeenAt: string | null;
  lastHeartbeatAt: string | null;
  currentSessionId: number | null;
  currentSessionNumber: string | null;
  currentSessionUser: string | null;
  createdAt: string | null;
  archivedAt: string | null;
  decommissionedAt: string | null;
  canSell: boolean;
  hardwareProfileId: number | null;
  hardwareProfileName: string | null;
  /** The hardware profile's receipt printer — preferred over printers matched by terminal name. */
  receiptPrinterId: number | null;
}

export type DeviceType = "PRINTER" | "SCANNER" | "CASH_DRAWER" | "CARD_TERMINAL" | "CUSTOMER_DISPLAY" | "SCALE" | "GENERIC";
export type DeviceHealth = "UNKNOWN" | "HEALTHY" | "DEGRADED" | "OFFLINE";

export interface PosDevice {
  id: number;
  deviceCode: string;
  name: string;
  deviceType: DeviceType;
  connectionType: string | null;
  address: string | null;
  terminalId: number | null;
  terminalName: string | null;
  printerId: number | null;
  printerName: string | null;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE" | "DECOMMISSIONED";
  health: DeviceHealth;
  healthMessage: string | null;
  lastHealthAt: string | null;
  lastUsedAt: string | null;
  configJson: string | null;
  notes: string | null;
  profiles: string[];
  managedByPrinter: boolean;
}

export interface DeviceEvent {
  id: number;
  deviceId: number | null;
  deviceName: string | null;
  eventType: string;
  result: "SUCCESS" | "FAILURE" | "INFO";
  message: string | null;
  terminalName: string | null;
  performedBy: string | null;
  createdAt: string;
}

export type HardwareRole = "RECEIPT_PRINTER" | "REPORT_PRINTER" | "CASH_DRAWER" | "SCANNER" | "CARD_TERMINAL" | "CUSTOMER_DISPLAY" | "SCALE";

export interface HardwareProfile {
  id: number;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  version: number;
  devices: { role: HardwareRole; deviceId: number; deviceName: string; deviceType: DeviceType | null; health: DeviceHealth | null }[];
  terminals: string[];
}

export interface PrintJob {
  id: number;
  jobType: "RECEIPT" | "REPORT" | "TEST" | "DRAWER_KICK" | "OTHER";
  printerId: number | null;
  printerName: string | null;
  connectionType: string | null;
  terminalName: string | null;
  title: string | null;
  sourceRef: string | null;
  payloadBytes: number | null;
  status: "QUEUED" | "DISPATCHED" | "SUCCEEDED" | "FAILED" | "CANCELLED";
  attemptCount: number;
  maxAttempts: number;
  lastError: string | null;
  requestedBy: string | null;
  createdAt: string;
  dispatchedAt: string | null;
  completedAt: string | null;
  retryable: boolean;
}

export interface DeviceDashboard {
  byType: Record<string, number>;
  byHealth: Record<string, number>;
  devices: number;
  attention: number;
  terminalsOnline: number;
  terminalsOffline: number;
  terminalsPending: number;
  jobsQueued: number;
  jobsFailed24h: number;
  jobsSucceeded24h: number;
  recentEvents: DeviceEvent[];
}

export interface TerminalRegistration {
  terminal: PosTerminal;
  isNew: boolean;
  pending: boolean;
}

export interface PosCounter {
  id: number;
  code: string;
  name: string;
  description: string | null;
  status: "ACTIVE" | "INACTIVE";
  displayOrder: number;
  terminalCount: number;
}

export interface SessionTerminalHistory {
  id: number;
  terminalId: number | null;
  terminalName: string | null;
  startedAt: string;
  endedAt: string | null;
  movedBy: string | null;
  approvedBy: string | null;
  reason: string | null;
}

export type CashMovementType = "DROP_IN" | "CASH_OUT" | "BOTH";

export interface CashCategory {
  id: number;
  code: string;
  name: string;
  description: string | null;
  movementType: CashMovementType;
  accountCode: string | null;
  accountName: string | null;
  displayOrder: number;
  notesRequired: boolean;
  approvalRequired: boolean;
  active: boolean;
}

export type CorrectionStatus = "REQUESTED" | "PENDING_APPROVAL" | "APPROVED" | "APPLIED" | "REJECTED" | "CANCELLED" | "FAILED";
export type CorrectionTarget = "SALE" | "CASH_MOVEMENT" | "SESSION";
export type CorrectionType = "PAYMENT_MODE" | "CUSTOMER" | "CATEGORY" | "DENOMINATION";

export interface Correction {
  id: number;
  requestNumber: string;
  targetType: CorrectionTarget;
  targetId: number;
  targetLabel: string | null;
  correctionType: CorrectionType;
  originalJson: string;
  correctedJson: string;
  differenceAmount: number | null;
  summary: string | null;
  reason: string;
  status: CorrectionStatus;
  requestedBy: string | null;
  requestedAt: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalNotes: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  appliedBy: string | null;
  appliedAt: string | null;
  journalReference: string | null;
  executionError: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  canDecide: boolean;
}

export interface CorrectionRequest {
  targetType: CorrectionTarget;
  targetId: number;
  correctionType: CorrectionType;
  reason: string;
  paymentAllocations?: PaymentAllocationRequest[];
  memberId?: number | null;
  categoryId?: number | null;
  closingCash?: number | null;
  closingDenominations?: string | null;
  submit?: boolean;
}

export interface CorrectionDashboard {
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  awaitingMyDecision: number;
  appliedDifference: number;
}

export interface SaleReturnItem {
  id: number;
  transactionItemId: number;
  productId: number;
  productName: string;
  productSku: string | null;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
}

export interface SaleReturn {
  id: number;
  returnNumber: string;
  transactionId: number;
  transactionNumber: string;
  posSessionId: number | null;
  memberId: number | null;
  memberName: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  refundMethod: string;
  refundBreakdown: PaymentLeg[] | null;
  reason: string | null;
  notes: string | null;
  restock: boolean;
  approvedBy: string | null;
  cashierName: string | null;
  businessDate: string | null;
  branchId: number | null;
  createdAt: string;
  items: SaleReturnItem[];
}

export interface HeldSale {
  id: number;
  holdNumber: string;
  posSessionId: number | null;
  label: string | null;
  memberId: number | null;
  memberName: string | null;
  cartJson: string;
  itemCount: number;
  total: number;
  heldBy: string | null;
  terminalName: string | null;
  createdAt: string;
}

export interface CreditAllocation {
  transactionId: number;
  transactionNumber: string;
  amount: number;
}

export interface CreditPayment {
  id: number;
  paymentNumber: string;
  memberId: number;
  memberName: string;
  posSessionId: number | null;
  amount: number;
  paymentMethod: string;
  bankAccountName: string | null;
  reference: string | null;
  notes: string | null;
  allocations: CreditAllocation[];
  receivedBy: string | null;
  businessDate: string | null;
  branchId: number | null;
  createdAt: string;
}

export interface OpenCreditSale {
  transactionId: number;
  transactionNumber: string;
  createdAt: string;
  totalAmount: number;
  creditAmount: number;
  settledAmount: number;
  outstanding: number;
}

export interface CustomerCredit {
  memberId: number;
  memberName: string;
  memberCode: string | null;
  phone: string | null;
  totalCredit: number;
  totalSettled: number;
  outstanding: number;
  membershipOutstanding: number;
  openSales: OpenCreditSale[];
  recentPayments: CreditPayment[];
}

export type PrinterConnection = "BROWSER" | "AGENT" | "NETWORK";
export type PaperSize = "58mm" | "80mm" | "A4";

export interface PosPrinter {
  id: number;
  name: string;
  connectionType: PrinterConnection;
  systemPrinterName: string | null;
  ipAddress: string | null;
  portNumber: number | null;
  paperSize: PaperSize;
  terminalName: string | null;
  isDefault: boolean;
  openDrawer: boolean;
  autoCut: boolean;
  enabled: boolean;
  lastTestAt: string | null;
  lastTestResult: string | null;
}

export interface AuditLog {
  id: number;
  action: string;
  referenceType: string | null;
  referenceId: number | null;
  referenceNumber: string | null;
  posSessionId: number | null;
  amount: number | null;
  details: string | null;
  performedBy: string | null;
  approvedBy: string | null;
  terminalName: string | null;
  createdAt: string;
}

export interface PosSettings {
  id: number | null;
  branchId: number | null;
  hasSupervisorPin: boolean;
  requireSupervisorForVoid: boolean;
  requireSupervisorForReturn: boolean;
  requireSupervisorForPriceOverride: boolean;
  requireSupervisorForCashOut: boolean;
  requireSupervisorForReprint: boolean;
  requireSupervisorForForceClose: boolean;
  allowPriceOverride: boolean;
  maxCashierDiscountPercent: number;
  taxInclusive: boolean;
  requireCustomer: boolean;
  allowCreditSales: boolean;
  requireCashMovementCategory: boolean;
  cashInCategories: string[];
  cashOutCategories: string[];
  cashVarianceThreshold: number;
  denominations: number[];
  autoPrintReceipt: boolean;
  receiptCopies: number;
  defaultPrintFormat: PaperSize;
  openDrawerOnCash: boolean;
  idleLockMinutes: number;
  layout: "classic" | "compact" | "focus";
  hideCategoryPanel: boolean;
  showProductImages: boolean;
  showStockOnCards: boolean;
  receiptShareEnabled: boolean;
  zReportAccess: "ANY" | "SUPERVISOR";
  receiptTemplate: string | null;
  businessDayEnabled: boolean;
  businessDayStart: string | null;
  businessDayEnd: string | null;
  businessDayExtensionMinutes: number;
  timeZone: string | null;
  requireSupervisorForVariance: boolean;
  requireTerminalApproval: boolean;
  maxTerminals: number;
  offlineThresholdMinutes: number;
  currentUserIsSupervisor: boolean;
  currentUsername: string;
  currentUserDisplayName: string;
}

// ── Reports ───────────────────────────────────────────────────────────────

export interface TenderLine { method: string; count: number; amount: number }
export interface ItemLine { productId: number | null; name: string; sku: string | null; category: string; quantity: number; amount: number }
export interface CategoryLine { category: string; quantity: number; amount: number }
export interface HourLine { hour: number; count: number; amount: number }
export interface DayLine { date: string; count: number; amount: number; returns: number }
export interface CashierLine { cashier: string; invoiceCount: number; grossSales: number; netSales: number; discount: number; returns: number }
export interface ReportInvoiceLine {
  id: number;
  transactionNumber: string;
  createdAt: string;
  memberName: string;
  cashierName: string | null;
  paymentSummary: string;
  totalAmount: number;
  refundedAmount: number;
  status: string;
}
export interface CashEvent { type: string; category: string | null; reason: string | null; amount: number; by: string | null; at: string }

export interface CashPosition {
  openingCash: number;
  cashSales: number;
  creditCollectionsCash: number;
  cashIn: number;
  cashOut: number;
  cashRefunds: number;
  expectedCash: number;
}

export interface ReportSummary {
  invoiceCount: number;
  grossSales: number;
  lineDiscount: number;
  billDiscount: number;
  totalDiscount: number;
  discountedInvoiceCount: number;
  taxableAmount: number;
  totalTax: number;
  totalSales: number;
  returnCount: number;
  returnTotal: number;
  returnTax: number;
  netSales: number;
  itemsSold: number;
  itemsReturned: number;
  averageBasket: number;
  creditSales: number;
  creditCollections: number;
  creditCollectionCount: number;
  tenders: TenderLine[];
  refunds: TenderLine[];
  collections: TenderLine[];
  cash: CashPosition;
  firstInvoice: string | null;
  lastInvoice: string | null;
}

export interface XReport {
  session: PosSession;
  summary: ReportSummary;
  topItems: ItemLine[];
  categories: CategoryLine[];
  hourly: HourLine[];
  cashEvents: CashEvent[];
  invoices: ReportInvoiceLine[];
  returns: SaleReturn[];
  generatedAt: string;
  generatedBy: string;
}

export interface DayClose {
  id: number;
  closeNumber: string;
  businessDate: string;
  sessionCount: number;
  invoiceCount: number;
  grossSales: number;
  totalDiscount: number;
  totalTax: number;
  netSales: number;
  totalReturns: number;
  expectedCash: number;
  countedCash: number;
  cashVariance: number;
  remarks: string | null;
  closedBy: string | null;
  closedAt: string | null;
}

export interface ChecklistItem { key: string; label: string; ok: boolean; detail: string }

export interface ZReport {
  businessDate: string;
  summary: ReportSummary;
  sessions: PosSession[];
  cashiers: CashierLine[];
  topItems: ItemLine[];
  categories: CategoryLine[];
  hourly: HourLine[];
  cashEvents: CashEvent[];
  invoices: ReportInvoiceLine[];
  checklist: ChecklistItem[];
  canClose: boolean;
  dayClose: DayClose | null;
  heldSaleCount: number;
  generatedAt: string;
  generatedBy: string;
}

export interface Analytics {
  from: string;
  to: string;
  summary: ReportSummary;
  daily: DayLine[];
  hourly: HourLine[];
  topItems: ItemLine[];
  categories: CategoryLine[];
  cashiers: CashierLine[];
}

// ── Requests ──────────────────────────────────────────────────────────────

export interface CheckoutItemRequest {
  productId: number;
  productName?: string;
  productSku?: string | null;
  warehouseId?: number | null;
  quantity: number;
  unitPrice?: number;
  priceOverridden?: boolean;
  discountPercent?: number;
  discountAmount?: number;
}

export interface PaymentAllocationRequest {
  type: "CASH" | "CARD" | "ONLINE" | "CREDIT" | "WALLET";
  subtype?: string | null;
  amount: number;
  reference?: string | null;
  bankAccountId?: number | null;
  bankAccountName?: string | null;
  customerCode?: string | null;
  customerName?: string | null;
}

export interface CheckoutRequest {
  posSessionId: number | null;
  memberId: number | null;
  memberName?: string | null;
  items: CheckoutItemRequest[];
  billDiscountType?: "PERCENT" | "AMOUNT" | null;
  billDiscountValue?: number | null;
  paymentAllocations: PaymentAllocationRequest[];
  notes?: string | null;
  terminalName?: string | null;
  supervisorPin?: string | null;
  heldSaleId?: number | null;
  /** A promotion or referral-coupon code typed at the till. */
  discountCode?: string | null;
  /** A promotion picked from the till's list (one without a code). */
  promotionId?: number | null;
}

export type RefundMethod = "ORIGINAL" | "CASH" | "CARD" | "ONLINE" | "WALLET" | "CREDIT";

/** A promotion or coupon as the till sees it (GET /pos/promotions, /pos/discount-codes/lookup). */
export interface DiscountRule {
  source: "PROMOTION" | "COUPON";
  code: string | null;
  promotionId: number | null;
  name: string;
  discountType: string;
  discountValue: number;
  maximumDiscount: number | null;
  minimumPurchase: number | null;
  discountAmount: number | null;
  description: string | null;
}

export interface WalletBalance {
  memberId: number;
  memberCode: string | null;
  balance: number;
}

export interface ReturnRequest {
  items: { transactionItemId: number; quantity: number }[];
  refundMethod: RefundMethod;
  bankAccountId?: number | null;
  reason?: string | null;
  notes?: string | null;
  restock: boolean;
  posSessionId?: number | null;
  supervisorPin?: string | null;
}

export type SettingsUpdate = Partial<Omit<PosSettings,
  "id" | "branchId" | "hasSupervisorPin" | "currentUserIsSupervisor" | "currentUsername" | "currentUserDisplayName">>;
