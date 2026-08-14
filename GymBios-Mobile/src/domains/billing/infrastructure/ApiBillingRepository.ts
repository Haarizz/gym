import type {
  BillingStats,
  Bill,
  MemberDue,
  Receipt,
  Statement,
} from '../domain';
import {
  MembershipType,
  PaymentMethod,
  ReceiptStatus,
  TransactionType,
} from '../domain';
import type {
  BillingRepository,
  ReceiptFilters,
  ReceiptsPage,
  SettlePaymentRequest,
  StatementRange,
} from '../application/BillingRepository';

import { apiClient } from '@/core/network/apiClient';

// ── Response DTOs (mirror backend) ─────────────────────────────────────────

interface ReceiptResponse {
  id: string;
  receipt_no?: string;
  transaction_date?: string;
  member_db_id?: string;
  member_id?: string;
  member_name?: string;
  member_phone?: string;
  transaction_type?: string;
  amount?: number;
  payment_method?: string;
  payment_breakdown?: PaymentSplitResponse[];
  status?: string;
  plan_name?: string;
  valid_from?: string;
  valid_till?: string;
  processed_by?: string;
  remarks?: string;
  membership_type?: string;
  paid_amount?: number;
  due_amount?: number;
  due_date?: string;
  bank_account_code?: string;
  bank_account_name?: string;
  minor_charges?: MinorChargeResponse[];
  total_paid_to_date?: number;
  balance_after?: number;
  linked_bill_id?: string;
  created_at?: string;
  updated_at?: string;
}

interface PaymentSplitResponse {
  method?: string;
  amount?: number;
  reference?: string;
  card_type?: string;
  cheque_number?: string;
  cheque_date?: string;
  bank_name?: string;
  bank_account_code?: string;
  bank_account_name?: string;
  online_payment_type?: string;
  provider_name?: string;
}

interface MinorChargeResponse {
  member_id?: string;
  member_db_id?: number;
  name?: string;
  amount?: number;
  paid?: boolean;
}

interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface ReceiptsPageResponse {
  receipts: ReceiptResponse[];
  pagination: PaginationResponse;
}

interface BillingStatsResponse {
  monthly_collection?: number;
  monthly_target?: number;
  overdue_count?: number;
  overdue_amount?: number;
  due_soon_count?: number;
  collection_rate?: number;
  monthly_data?: MonthlyDataResponse[];
  payment_method_breakdown?: Record<string, number>;
}

interface MonthlyDataResponse {
  month?: string;
  collected?: number;
  target?: number;
}

interface MemberDueResponse {
  id: number;
  member_id?: string;
  member_name?: string;
  member_email?: string;
  member_phone?: string;
  membership?: string;
  amount?: number;
  due_date?: string;
  days_overdue?: number;
  last_payment?: string;
  status?: string;
}

interface StatementResponse {
  member_db_id?: string;
  member_id?: string;
  member_name?: string;
  member_phone?: string;
  is_minor?: boolean;
  billed_to_head?: boolean;
  family_head_name?: string;
  opening_balance?: number;
  total_billed?: number;
  total_paid?: number;
  closing_balance?: number;
  lines?: StatementLineResponse[];
}

interface StatementLineResponse {
  date?: string;
  receipt_no?: string;
  type?: string;
  description?: string;
  debit?: number;
  credit?: number;
  balance?: number;
  payment_method?: string;
  status?: string;
  minor_charges?: MinorChargeResponse[];
}

// ── Repository implementation ───────────────────────────────────────────────

export class ApiBillingRepository implements BillingRepository {
  async getBillingStats(): Promise<BillingStats> {
    const response = await apiClient.get<BillingStatsResponse>('/billing/stats');
    return this.toBillingStats(response.data);
  }

  async getMemberReceipts(filters?: ReceiptFilters): Promise<ReceiptsPage> {
    const response = await apiClient.get<ReceiptsPageResponse>('/receipts', {
      params: {
        search: filters?.search,
        transaction_type: filters?.transactionType,
        status: filters?.status,
        page: filters?.page ?? 1,
        limit: filters?.limit ?? 20,
      },
    });

    return {
      receipts: (response.data.receipts ?? []).map(item =>
        this.toReceipt(item),
      ),
      pagination: {
        page: response.data.pagination?.page ?? 1,
        limit: response.data.pagination?.limit ?? 20,
        total: response.data.pagination?.total ?? 0,
        totalPages: response.data.pagination?.total_pages ?? 1,
      },
    };
  }

  async getReceipt(id: number): Promise<Receipt> {
    const response = await apiClient.get<ReceiptResponse>(`/receipts/${id}`);
    return this.toReceipt(response.data);
  }

  async getMemberDues(): Promise<MemberDue[]> {
    const response = await apiClient.get<MemberDueResponse[]>('/billing/dues');
    return (response.data ?? []).map(item => this.toMemberDue(item));
  }

  async getPendingBills(memberDbId: number): Promise<Bill[]> {
    const response = await apiClient.get<ReceiptResponse[]>(
      `/billing/member/${memberDbId}/pending-bills`,
    );
    return (response.data ?? []).map(item => this.toBill(item));
  }

  async settlePayment(request: SettlePaymentRequest): Promise<Receipt> {
    const response = await apiClient.post<ReceiptResponse>(
      '/billing/settle',
      {
        member_db_id: request.memberDbId,
        payment_method: request.paymentMethod,
        payment_date: request.paymentDate,
        transaction_ref: request.transactionRef,
        remarks: request.remarks,
        bill_payments: request.billPayments.map(bp => ({
          receipt_id: bp.receiptId,
          pay_amount: bp.payAmount,
        })),
        payment_breakdown: request.paymentBreakdown,
      },
    );
    return this.toReceipt(response.data);
  }

  async getMemberStatement(
    memberDbId: number,
    range?: StatementRange,
  ): Promise<Statement> {
    const response = await apiClient.get<StatementResponse>(
      `/billing/member/${memberDbId}/statement`,
      {
        params: {
          from: range?.from,
          to: range?.to,
        },
      },
    );
    return this.toStatement(response.data);
  }

  // ── Mappers ───────────────────────────────────────────────────────────────

  private toReceipt(response: ReceiptResponse): Receipt {
    return {
      id: response.id,
      receiptNo: response.receipt_no,
      transactionDate: response.transaction_date,
      memberDbId: response.member_db_id,
      memberId: response.member_id,
      memberName: response.member_name,
      memberPhone: response.member_phone,
      transactionType: this.toTransactionType(response.transaction_type),
      amount: response.amount,
      paymentMethod: this.toPaymentMethod(response.payment_method),
      paymentBreakdown: (response.payment_breakdown ?? []).map(leg =>
        this.toPaymentSplit(leg),
      ),
      status: this.toReceiptStatus(response.status),
      planName: response.plan_name,
      validFrom: response.valid_from,
      validTill: response.valid_till,
      processedBy: response.processed_by,
      remarks: response.remarks,
      membershipType: this.toMembershipType(response.membership_type),
      paidAmount: response.paid_amount,
      dueAmount: response.due_amount,
      dueDate: response.due_date,
      bankAccountCode: response.bank_account_code,
      bankAccountName: response.bank_account_name,
      minorCharges: (response.minor_charges ?? []).map(charge =>
        this.toMinorCharge(charge),
      ),
      totalPaidToDate: response.total_paid_to_date,
      balanceAfter: response.balance_after,
      linkedBillId: response.linked_bill_id,
      createdAt: response.created_at,
      updatedAt: response.updated_at,
    };
  }

  private toBill(response: ReceiptResponse): Bill {
    const receipt = this.toReceipt(response);
    return {
      ...receipt,
      dueAmount: response.due_amount ?? 0,
    };
  }

  private toPaymentSplit(response: PaymentSplitResponse) {
    return {
      method: response.method ?? '',
      amount: response.amount ?? 0,
      reference: response.reference,
      cardType: response.card_type,
      chequeNumber: response.cheque_number,
      chequeDate: response.cheque_date,
      bankName: response.bank_name,
      bankAccountCode: response.bank_account_code,
      bankAccountName: response.bank_account_name,
      onlinePaymentType: response.online_payment_type,
      providerName: response.provider_name,
    };
  }

  private toMinorCharge(response: MinorChargeResponse) {
    return {
      memberId: response.member_id,
      memberDbId: response.member_db_id,
      name: response.name,
      amount: response.amount,
      paid: response.paid,
    };
  }

  private toBillingStats(response: BillingStatsResponse): BillingStats {
    return {
      monthlyCollection: response.monthly_collection ?? 0,
      monthlyTarget: response.monthly_target ?? 0,
      overdueCount: response.overdue_count ?? 0,
      overdueAmount: response.overdue_amount ?? 0,
      dueSoonCount: response.due_soon_count ?? 0,
      collectionRate: response.collection_rate ?? 0,
      monthlyData: (response.monthly_data ?? []).map(item => ({
        month: item.month ?? '',
        collected: item.collected ?? 0,
        target: item.target ?? 0,
      })),
      paymentMethodBreakdown: response.payment_method_breakdown ?? {},
    };
  }

  private toMemberDue(response: MemberDueResponse): MemberDue {
    return {
      id: response.id,
      memberId: response.member_id,
      memberName: response.member_name,
      memberEmail: response.member_email,
      memberPhone: response.member_phone,
      membership: response.membership,
      amount: response.amount,
      dueDate: response.due_date,
      daysOverdue: response.days_overdue ?? 0,
      lastPayment: response.last_payment,
      status: response.status as MemberDue['status'],
    };
  }

  private toStatement(response: StatementResponse): Statement {
    return {
      memberDbId: response.member_db_id,
      memberId: response.member_id,
      memberName: response.member_name,
      memberPhone: response.member_phone,
      isMinor: response.is_minor,
      billedToHead: response.billed_to_head,
      familyHeadName: response.family_head_name,
      openingBalance: response.opening_balance,
      totalBilled: response.total_billed,
      totalPaid: response.total_paid,
      closingBalance: response.closing_balance,
      lines: (response.lines ?? []).map(line => ({
        date: line.date,
        receiptNo: line.receipt_no,
        type: line.type as Statement['lines'][number]['type'],
        description: line.description,
        debit: line.debit,
        credit: line.credit,
        balance: line.balance,
        paymentMethod: line.payment_method,
        status: line.status,
        minorCharges: (line.minor_charges ?? []).map(charge =>
          this.toMinorCharge(charge),
        ),
      })),
    };
  }

  // ── Enum mappers ──────────────────────────────────────────────────────────

  private toTransactionType(value?: string): TransactionType | undefined {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    if (normalized === 'new') return TransactionType.New;
    if (normalized === 'renewal') return TransactionType.Renewal;
    if (normalized === 'add-on') return TransactionType.AddOn;
    if (normalized === 'daily entry') return TransactionType.DailyEntry;
    if (normalized === 'payment') return TransactionType.Payment;
    return undefined;
  }

  private toReceiptStatus(value?: string): ReceiptStatus | undefined {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    if (normalized === 'paid') return ReceiptStatus.Paid;
    if (normalized === 'pending') return ReceiptStatus.Pending;
    if (normalized === 'overdue') return ReceiptStatus.Overdue;
    if (normalized === 'partial') return ReceiptStatus.Partial;
    return undefined;
  }

  private toPaymentMethod(value?: string): PaymentMethod | undefined {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    if (normalized === 'cash') return PaymentMethod.Cash;
    if (normalized === 'card') return PaymentMethod.Card;
    if (normalized === 'online') return PaymentMethod.Online;
    if (normalized === 'wallet') return PaymentMethod.Wallet;
    if (normalized === 'bank transfer') return PaymentMethod.BankTransfer;
    if (normalized === 'cheque') return PaymentMethod.Cheque;
    if (normalized === 'mixed') return PaymentMethod.Mixed;
    if (normalized === 'credit') return PaymentMethod.Credit;
    return undefined;
  }

  private toMembershipType(value?: string): MembershipType | undefined {
    if (!value) return undefined;
    const normalized = value.toLowerCase();
    if (normalized === 'individual') return MembershipType.Individual;
    if (normalized === 'family') return MembershipType.Family;
    if (normalized === 'corporate') return MembershipType.Corporate;
    return undefined;
  }
}