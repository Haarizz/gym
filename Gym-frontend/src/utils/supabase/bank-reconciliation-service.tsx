import { authService } from "./auth-service";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export interface BankStatementLine {
  id: number;
  reconciliationId: number;
  transactionDate: string;
  description: string;
  amount: number;
  type: string;
  reference: string;
  isMatched: boolean;
  matchedVoucherNo: string | null;
  matchedJournalVoucherId: number | null;
}

export interface BankReconciliation {
  id: number;
  bankAccountName: string;
  statementDate: string;
  openingBalance: number;
  closingBalance: number;
  systemBalance: number;
  difference: number;
  status: string;
  notes: string | null;
  unmatchedCount: number;
  lines: BankStatementLine[];
  createdAt: string;
  updatedAt: string;
}

export interface BankReconciliationCreateRequest {
  bankAccountName: string;
  statementDate: string;
  openingBalance: number;
  closingBalance: number;
  notes?: string;
  /** Existing lines being kept must include their `id` so match state survives the edit. */
  lines?: Partial<BankStatementLine>[];
}

/** A real, posted journal voucher that could explain a bank statement line. */
export interface MatchCandidate {
  journalVoucherId: number;
  voucherNo: string;
  date: string;
  narration: string;
  amount: number;
}

export interface AutoMatchSuggestion {
  lineId: number;
  confidence: "HIGH" | "AMBIGUOUS";
  candidates: MatchCandidate[];
}

function mapLine(r: any): BankStatementLine {
  return {
    id: r.id,
    reconciliationId: r.reconciliation_id,
    transactionDate: r.transaction_date,
    description: r.description ?? "",
    amount: r.amount ?? 0,
    type: r.type ?? "DEBIT",
    reference: r.reference ?? "",
    isMatched: r.is_matched ?? false,
    matchedVoucherNo: r.matched_voucher_no ?? null,
    matchedJournalVoucherId: r.matched_journal_voucher_id ?? null,
  };
}

function mapReconciliation(r: any): BankReconciliation {
  return {
    id: r.id,
    bankAccountName: r.bank_account_name,
    statementDate: r.statement_date,
    openingBalance: r.opening_balance ?? 0,
    closingBalance: r.closing_balance ?? 0,
    systemBalance: r.system_balance ?? 0,
    difference: r.difference ?? 0,
    status: r.status,
    notes: r.notes ?? null,
    unmatchedCount: r.unmatched_count ?? 0,
    lines: (r.lines ?? []).map(mapLine),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapCandidate(r: any): MatchCandidate {
  return {
    journalVoucherId: r.journal_voucher_id,
    voucherNo: r.voucher_no ?? "",
    date: r.date,
    narration: r.narration ?? "",
    amount: r.amount ?? 0,
  };
}

function mapSuggestion(r: any): AutoMatchSuggestion {
  return {
    lineId: r.line_id,
    confidence: r.confidence ?? "AMBIGUOUS",
    candidates: (r.candidates ?? []).map(mapCandidate),
  };
}

function toLineBody(line: Partial<BankStatementLine>): any {
  return {
    id: line.id ?? null,
    transaction_date: line.transactionDate,
    description: line.description ?? null,
    amount: line.amount ?? 0,
    type: line.type ?? "DEBIT",
    reference: line.reference ?? null,
  };
}

class BankReconciliationService {
  async getAll(bankAccountName?: string): Promise<BankReconciliation[]> {
    const query = bankAccountName
      ? `?bank_account=${encodeURIComponent(bankAccountName)}`
      : "";
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/bank-reconciliations${query}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch bank reconciliations");
    return (await res.json()).map(mapReconciliation);
  }

  async getById(id: number): Promise<BankReconciliation> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/bank-reconciliations/${id}`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch bank reconciliation");
    return mapReconciliation(await res.json());
  }

  async create(req: BankReconciliationCreateRequest): Promise<BankReconciliation> {
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/bank-reconciliations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bank_account_name: req.bankAccountName,
        statement_date: req.statementDate,
        opening_balance: req.openingBalance,
        closing_balance: req.closingBalance,
        notes: req.notes ?? null,
        lines: (req.lines ?? []).map(toLineBody),
      }),
    });
    if (!res.ok) throw new Error("Failed to create reconciliation");
    return mapReconciliation(await res.json());
  }

  async update(id: number, req: BankReconciliationCreateRequest): Promise<BankReconciliation> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/bank-reconciliations/${id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bank_account_name: req.bankAccountName,
          statement_date: req.statementDate,
          opening_balance: req.openingBalance,
          closing_balance: req.closingBalance,
          notes: req.notes ?? null,
          lines: (req.lines ?? []).map(toLineBody),
        }),
      }
    );
    if (!res.ok) throw new Error("Failed to update reconciliation");
    return mapReconciliation(await res.json());
  }

  async matchLine(
    reconciliationId: number,
    lineId: number,
    journalVoucherId: number
  ): Promise<BankReconciliation> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/bank-reconciliations/${reconciliationId}/lines/${lineId}/match`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ journal_voucher_id: journalVoucherId }),
      }
    );
    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(err || "Failed to match line");
    }
    return mapReconciliation(await res.json());
  }

  async unmatchLine(
    reconciliationId: number,
    lineId: number
  ): Promise<BankReconciliation> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/bank-reconciliations/${reconciliationId}/lines/${lineId}/unmatch`,
      { method: "POST" }
    );
    if (!res.ok) throw new Error("Failed to unmatch line");
    return mapReconciliation(await res.json());
  }

  /** Real, unmatched, posted vouchers on the bank account that could match this line — for the manual match picker. */
  async getMatchCandidates(reconciliationId: number, lineId: number): Promise<MatchCandidate[]> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/bank-reconciliations/${reconciliationId}/lines/${lineId}/candidates`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to fetch match candidates");
    return (await res.json()).map(mapCandidate);
  }

  /** Read-only suggestions — nothing is applied until matchLine() is called for an accepted suggestion. */
  async getAutoMatchSuggestions(reconciliationId: number): Promise<AutoMatchSuggestion[]> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/bank-reconciliations/${reconciliationId}/auto-match`,
      { method: "GET" }
    );
    if (!res.ok) throw new Error("Failed to compute auto-match suggestions");
    return (await res.json()).map(mapSuggestion);
  }

  async complete(reconciliationId: number): Promise<BankReconciliation> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/bank-reconciliations/${reconciliationId}/complete`,
      { method: "POST" }
    );
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Failed to complete reconciliation");
    }
    return mapReconciliation(await res.json());
  }

  async delete(id: number): Promise<void> {
    const res = await authService.makeAuthenticatedRequest(
      `${BASE_URL}/bank-reconciliations/${id}`,
      { method: "DELETE" }
    );
    if (!res.ok) throw new Error("Failed to delete reconciliation");
  }
}

export const bankReconciliationService = new BankReconciliationService();
