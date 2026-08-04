import type {
  BillingStats,
  Bill,
  MemberDue,
  Receipt,
  Statement,
} from '../domain';
import type {
  BillingRepository,
  ReceiptFilters,
  ReceiptsPage,
  SettlePaymentRequest,
  StatementRange,
} from './BillingRepository';

/**
 * Coordinates repository calls and exposes business operations for the
 * Billing domain. Contains no React code and no HTTP code.
 */
export class BillingService {
  constructor(private readonly repository: BillingRepository) {}

  getBillingStats(): Promise<BillingStats> {
    return this.repository.getBillingStats();
  }

  getMemberReceipts(filters?: ReceiptFilters): Promise<ReceiptsPage> {
    return this.repository.getMemberReceipts(filters);
  }

  getReceipt(id: number): Promise<Receipt> {
    return this.repository.getReceipt(id);
  }

  getMemberDues(): Promise<MemberDue[]> {
    return this.repository.getMemberDues();
  }

  getPendingBills(memberDbId: number): Promise<Bill[]> {
    return this.repository.getPendingBills(memberDbId);
  }

  settlePayment(request: SettlePaymentRequest): Promise<Receipt> {
    return this.repository.settlePayment(request);
  }

  getMemberStatement(
    memberDbId: number,
    range?: StatementRange,
  ): Promise<Statement> {
    return this.repository.getMemberStatement(memberDbId, range);
  }
}