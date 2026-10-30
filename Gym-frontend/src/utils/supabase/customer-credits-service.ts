import { authService } from "./auth-service";
import { parseApiError } from "./api-error";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

export type CustomerCreditStatus = "Active" | "Fully Used";

/** One credit put on a member's wallet, with what of it is used and left (oldest credits are spent first). */
export interface CustomerCredit {
  id: number;
  creditNo: string;
  date: string | null;
  memberId: string;
  memberDbId: number | null;
  memberName: string;
  memberPhone: string | null;
  memberEmail: string | null;
  /** "Refund as credit" | "Referral reward" | "Manual credit" */
  creditType: string;
  sourceType: string | null;
  amount: number;
  used: number;
  balance: number;
  status: CustomerCreditStatus;
  remarks: string | null;
  processedBy: string | null;
}

export interface CustomerCreditsSummary {
  totalCredits: number;
  active: number;
  fullyUsed: number;
  totalIssued: number;
  totalBalance: number;
  membersWithBalance: number;
}

export interface CustomerCreditsPage {
  credits: CustomerCredit[];
  total: number;
  summary: CustomerCreditsSummary;
}

export const CREDIT_TYPES = ["Refund as credit", "Referral reward", "Manual credit"];

// The records come back snake_case (global naming) — read both spellings to be safe.
const pick = (r: any, snake: string, camel: string) => r?.[snake] ?? r?.[camel];

function mapCredit(r: any): CustomerCredit {
  return {
    id: Number(r.id),
    creditNo: pick(r, "credit_no", "creditNo") ?? "",
    date: r.date ?? null,
    memberId: pick(r, "member_id", "memberId") ?? "",
    memberDbId: pick(r, "member_db_id", "memberDbId") ?? null,
    memberName: pick(r, "member_name", "memberName") ?? "",
    memberPhone: pick(r, "member_phone", "memberPhone") ?? null,
    memberEmail: pick(r, "member_email", "memberEmail") ?? null,
    creditType: pick(r, "credit_type", "creditType") ?? "",
    sourceType: pick(r, "source_type", "sourceType") ?? null,
    amount: Number(r.amount ?? 0),
    used: Number(r.used ?? 0),
    balance: Number(r.balance ?? 0),
    status: r.status ?? "Active",
    remarks: r.remarks ?? null,
    processedBy: pick(r, "processed_by", "processedBy") ?? null,
  };
}

export const customerCreditsService = {
  async list(f: { search?: string; type?: string; status?: string; page?: number; size?: number }): Promise<CustomerCreditsPage> {
    const params = new URLSearchParams();
    if (f.search) params.set("search", f.search);
    if (f.type && f.type !== "all") params.set("type", f.type);
    if (f.status && f.status !== "all") params.set("status", f.status);
    params.set("page", String(f.page ?? 1));
    params.set("size", String(f.size ?? 20));
    const res = await authService.makeAuthenticatedRequest(`${BASE_URL}/wallet/credits?${params.toString()}`);
    if (!res.ok) throw new Error(await parseApiError(res, `Failed to load customer credits: ${res.status}`));
    const data = await res.json();
    const s = data.summary ?? {};
    return {
      credits: (data.credits ?? []).map(mapCredit),
      total: Number(data.total ?? 0),
      summary: {
        totalCredits: Number(pick(s, "total_credits", "totalCredits") ?? 0),
        active: Number(s.active ?? 0),
        fullyUsed: Number(pick(s, "fully_used", "fullyUsed") ?? 0),
        totalIssued: Number(pick(s, "total_issued", "totalIssued") ?? 0),
        totalBalance: Number(pick(s, "total_balance", "totalBalance") ?? 0),
        membersWithBalance: Number(pick(s, "members_with_balance", "membersWithBalance") ?? 0),
      },
    };
  },
};
