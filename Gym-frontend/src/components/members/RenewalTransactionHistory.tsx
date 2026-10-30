import React, { useCallback, useEffect, useMemo, useState } from "react";
import { format, isValid, parseISO } from "date-fns";
import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  EyeOff,
  Banknote,
  CreditCard,
  Smartphone,
  Landmark,
  Wallet,
  Printer,
  FileText,
  Hash,
  Receipt as ReceiptIcon,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  User,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { receiptsService, type Receipt } from "../../utils/supabase/receipts-service";
import { CurrencyGlyph, useCurrency } from "../../utils/currency";
import { downloadReceiptInvoice } from "../../utils/receipt-invoice";
import { splitPaid } from "../../utils/payment-split";
import { StatFilterNotice } from "./MemberStatCards";
import { ListPagination } from "../list-pagination";

export type RenewalKind = "Renewal" | "Upgrade" | "Downgrade" | "Plan Change";

export interface RenewalRow {
  receipt: Receipt;
  kind: RenewalKind;
  previousPlan: string | null;
  newPlan: string;
}

const PAGE_PREVIEW = 10;
const PAGE_SIZE = 25;

const parseDate = (value?: string) => {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
};

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Renewal & upgrade history built from real receipts. A renewal receipt's previous
 * plan is the member's latest New/Renewal receipt before it; a different plan at a
 * higher (lower) price is shown as an Upgrade (Downgrade).
 */
export type RenewalHistoryFilter = "renewals" | "changes";

export interface RenewalHistoryStats {
  renewals: number;
  /** Upgrades, downgrades and same-price plan changes */
  changes: number;
  renewalsCollected: number;
  changesCollected: number;
  /** All renewal receipts, of every kind */
  total: number;
  upgrades: number;
  totalCollected: number;
  /** Renewal money by payment method (split payments divided across their methods) */
  methods: RenewalMethodStat[];
}

export interface RenewalMethodStat {
  method: string;
  amount: number;
  count: number;
}

const METHOD_STYLES: { method: string; icon: typeof Wallet; color: string; chip: string }[] = [
  { method: "Cash", icon: Banknote, color: "text-emerald-600", chip: "bg-emerald-50" },
  { method: "Card", icon: CreditCard, color: "text-blue-600", chip: "bg-blue-50" },
  { method: "Online", icon: Smartphone, color: "text-purple-600", chip: "bg-purple-50" },
  { method: "Bank Transfer", icon: Landmark, color: "text-amber-600", chip: "bg-amber-50" },
];

const methodStatsOf = (rows: RenewalRow[]): RenewalMethodStat[] => {
  const amount: Record<string, number> = {};
  const count: Record<string, number> = {};
  for (const { receipt } of rows) {
    for (const [m, amt] of Object.entries(splitPaid(receipt))) {
      amount[m] = (amount[m] || 0) + amt;
      count[m] = (count[m] || 0) + 1;
    }
  }
  const extra = ["Cheque", "Other"].filter((m) => (amount[m] || 0) > 0);
  return [...METHOD_STYLES.map((s) => s.method), ...extra]
    .map((method) => ({ method, amount: amount[method] || 0, count: count[method] || 0 }));
};

/** Totals + payment-method split for the renewal history, shown at the top of the Renewals tab. */
export function RenewalSummaryCards({ stats }: { stats: RenewalHistoryStats | null }) {
  if (!stats) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[88px] rounded-xl" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
        </div>
      </div>
    );
  }
  const { total, renewals, upgrades, totalCollected, methods } = stats;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-sm text-blue-700">Total Transactions</div>
            <div className="text-2xl font-bold text-blue-900">{total}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="text-sm text-green-700">Renewals</div>
            <div className="text-2xl font-bold text-green-900">{renewals}</div>
          </CardContent>
        </Card>
        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="p-4">
            <div className="text-sm text-purple-700">Upgrades</div>
            <div className="text-2xl font-bold text-purple-900">{upgrades}</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="text-sm text-amber-700">Total Collected</div>
            <div className="text-2xl font-bold text-amber-900"><CurrencyGlyph /> {totalCollected.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* Renewal collection by payment method */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {methods.map((m) => {
          const style = METHOD_STYLES.find((s) => s.method === m.method)
            ?? { icon: Wallet, color: "text-gray-600", chip: "bg-gray-100" };
          return (
            <Card key={m.method} className="border-primary/10 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">{m.method}</span>
                  <span className={`p-1.5 rounded-lg ${style.chip}`}>
                    <style.icon className={`h-4 w-4 ${style.color}`} />
                  </span>
                </div>
                <div className="text-xl font-bold"><CurrencyGlyph /> {m.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {m.count} renewal{m.count === 1 ? "" : "s"}
                  {totalCollected > 0 && m.amount > 0 ? ` · ${Math.round((m.amount / totalCollected) * 100)}% of collected` : ""}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export const RENEWAL_FILTER_LABELS: Record<RenewalHistoryFilter, string> = {
  renewals: "Renewals (same plan)",
  changes: "Upgrades, downgrades & plan changes",
};

export const matchesKind = (kind: RenewalKind, filter: RenewalHistoryFilter) =>
  filter === "renewals" ? kind === "Renewal" : kind !== "Renewal";

/** True when the receipt carries its kind, so no plan-purchase history is needed to classify it. */
export const hasStoredRenewalKind = (r: Receipt) =>
  r.renewal_kind === "Renewal" || r.renewal_kind === "Upgrade" || r.renewal_kind === "Downgrade";

/**
 * Classifies renewal receipts (newest first) as Renewal / Upgrade / Downgrade / Plan Change.
 * Shared by this history and Members → Reports → Renewals Report so both count the same way (BG_127).
 * `planPurchases` is every New + Renewal receipt — only consulted for receipts without a stored kind.
 */
export function classifyRenewals(renewals: Receipt[], planPurchases: Receipt[]): RenewalRow[] {
  // Plan purchases per member, oldest first, to find what each renewal replaced
  const byMember = new Map<string, Receipt[]>();
  for (const r of planPurchases) {
    const key = String(r.member_db_id ?? r.member_id ?? r.member_name);
    if (!byMember.has(key)) byMember.set(key, []);
    byMember.get(key)!.push(r);
  }
  byMember.forEach((list) =>
    list.sort((a, b) => (a.transaction_date ?? "").localeCompare(b.transaction_date ?? "") || num(a.id) - num(b.id)),
  );

  return [...renewals]
    .sort((a, b) => (b.transaction_date ?? "").localeCompare(a.transaction_date ?? "") || num(b.id) - num(a.id))
    .map((receipt) => {
      const history = byMember.get(String(receipt.member_db_id ?? receipt.member_id ?? receipt.member_name)) ?? [];
      const idx = history.findIndex((r) => String(r.id) === String(receipt.id));
      const prev = idx > 0 ? history[idx - 1] : null;
      const newPlan = receipt.plan_name || "—";
      // BG_103: newer receipts carry the kind decided at renewal time against the
      // member's actual previous plan; receipt history can be stale (e.g. a plan
      // changed via Edit Member leaves no receipt), so it's only the fallback.
      const stored = receipt.renewal_kind;
      if (stored === "Renewal" || stored === "Upgrade" || stored === "Downgrade") {
        return { receipt, kind: stored, previousPlan: stored === "Renewal" ? newPlan : prev?.plan_name ?? null, newPlan };
      }
      let kind: RenewalKind = "Renewal";
      if (prev?.plan_name && receipt.plan_name && prev.plan_name !== receipt.plan_name) {
        const diff = num(receipt.amount) - num(prev.amount);
        kind = diff > 0 ? "Upgrade" : diff < 0 ? "Downgrade" : "Plan Change";
      }
      return { receipt, kind, previousPlan: prev?.plan_name ?? null, newPlan };
    });
}

export function RenewalTransactionHistory({
  refreshKey = 0,
  filter = null,
  onClearFilter,
  onStats,
}: {
  refreshKey?: number;
  filter?: RenewalHistoryFilter | null;
  onClearFilter?: () => void;
  onStats?: (stats: RenewalHistoryStats) => void;
}) {
  const { currencyCode } = useCurrency();
  const [renewals, setRenewals] = useState<Receipt[]>([]);
  const [planPurchases, setPlanPurchases] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Every plan purchase (not a capped first page): what each renewal replaced
      // is worked out from the member's full history.
      const [renewalReceipts, newReceipts] = await Promise.all([
        receiptsService.getAllReceipts({ transactionType: "Renewal" }),
        receiptsService.getAllReceipts({ transactionType: "New" }),
      ]);
      setRenewals(renewalReceipts);
      setPlanPurchases([...newReceipts, ...renewalReceipts]);
    } catch (e: any) {
      setError(e?.message || "Could not load renewal history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const rows = useMemo<RenewalRow[]>(() => classifyRenewals(renewals, planPurchases), [renewals, planPurchases]);

  useEffect(() => {
    if (loading || error || !onStats) return;
    const paid = (list: RenewalRow[]) => list.reduce((sum, r) => sum + num(r.receipt.paid_amount ?? r.receipt.amount), 0);
    const renewalRows = rows.filter((r) => matchesKind(r.kind, "renewals"));
    const changeRows = rows.filter((r) => matchesKind(r.kind, "changes"));
    onStats({
      renewals: renewalRows.length,
      changes: changeRows.length,
      renewalsCollected: paid(renewalRows),
      changesCollected: paid(changeRows),
      total: rows.length,
      upgrades: rows.filter((r) => r.kind === "Upgrade").length,
      totalCollected: paid(rows),
      methods: methodStatsOf(rows),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, loading, error]);

  const shownRows = filter ? rows.filter((r) => matchesKind(r.kind, filter)) : rows;
  // "View All" pages through the rows instead of rendering hundreds at once.
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [filter, showAll]);
  const visible = showAll
    ? shownRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : shownRows.slice(0, PAGE_PREVIEW);

  const exportCsv = () => {
    if (rows.length === 0) {
      toast.error("No renewal transactions to export");
      return;
    }
    const cell = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Receipt No", "Member", "Member ID", "Type", "Previous Plan", "New Plan",
      `Amount (${currencyCode})`, `Paid (${currencyCode})`, "Payment Method", "Date", "New Expiry", "Processed By", "Status"];
    const lines = rows.map(({ receipt: r, kind, previousPlan, newPlan }) => [
      r.receipt_no, r.member_name, r.member_id, kind, previousPlan ?? "", newPlan,
      num(r.amount), num(r.paid_amount), r.payment_method, r.transaction_date, r.valid_till ?? "", r.processed_by ?? "", r.status,
    ]);
    const csv = [header, ...lines].map((l) => l.map(cell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `renewal-upgrade-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} transactions`);
  };

  const kindBadge = (kind: RenewalKind) => {
    const cls =
      kind === "Upgrade" ? "bg-blue-100 text-blue-800"
      : kind === "Downgrade" ? "bg-amber-100 text-amber-800"
      : kind === "Plan Change" ? "bg-purple-100 text-purple-800"
      : "bg-green-100 text-green-800";
    return (
      <Badge className={cls}>
        <RefreshCw className="h-3 w-3 mr-1" />
        {kind}
      </Badge>
    );
  };

  const statusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") {
      return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>;
    }
    if (s === "partial") {
      return <Badge className="bg-amber-100 text-amber-800"><Clock className="h-3 w-3 mr-1" />Partially Paid</Badge>;
    }
    if (s === "pending" || s === "overdue") {
      return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />{s === "overdue" ? "Overdue" : "Payment Pending"}</Badge>;
    }
    return <Badge variant="outline">{status || "—"}</Badge>;
  };

  return (
    <Card id="renewal-history" className="border-primary/10 shadow-md">
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Renewal & Upgrade Transaction History
            </CardTitle>
            <CardDescription>Complete record of all membership renewals and upgrades</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} title="Refresh">
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading || rows.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {shownRows.length > PAGE_PREVIEW && (
              <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showAll ? "Show Less" : `View All (${shownRows.length})`}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filter && <StatFilterNotice label={RENEWAL_FILTER_LABELS[filter]} onClear={onClearFilter} />}
        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-md bg-red-50 p-4 text-red-700">
            <span className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4" />{error}</span>
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </div>
        ) : loading && rows.length === 0 ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <RefreshCw className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm">No renewals or upgrades yet. They'll appear here as soon as one is processed.</p>
          </div>
        ) : shownRows.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">No transactions match this filter.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-light">
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Member Details</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Plan Change</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Payment Method</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>New Expiry</TableHead>
                  <TableHead>Processed By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map(({ receipt: r, kind, previousPlan, newPlan }) => {
                  const date = parseDate(r.transaction_date);
                  const expiry = parseDate(r.valid_till);
                  return (
                    <TableRow key={r.id} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <ReceiptIcon className="h-4 w-4 text-primary" />
                          <span className="font-mono font-medium text-primary">{r.receipt_no || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Hash className="h-4 w-4 text-gray-500" />
                          <span className="font-mono text-sm">{r.invoice_no || `TXN-${r.id}`}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">{r.member_name}</div>
                            <div className="text-xs text-gray-500">{r.member_id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{kindBadge(kind)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm text-gray-600">{previousPlan ?? "—"}</div>
                          <div className={kind === "Downgrade" ? "flex items-center text-xs text-amber-600" : "flex items-center text-xs text-green-600"}>
                            {kind === "Downgrade" ? <TrendingDown className="h-3 w-3 mr-1" /> : <TrendingUp className="h-3 w-3 mr-1" />}
                            {newPlan}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-primary"><CurrencyGlyph /> {num(r.amount).toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-primary/30">{r.payment_method || "—"}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{date ? format(date, "dd/MM/yyyy") : "—"}</div>
                          <div className="text-xs text-gray-500">{date ? format(date, "hh:mm a") : ""}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{expiry ? format(expiry, "dd/MM/yyyy") : "—"}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{r.processed_by || "—"}</div>
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          title={`Print receipt ${r.receipt_no}`}
                          onClick={() => downloadReceiptInvoice(r, currencyCode)}
                        >
                          <Printer className="h-4 w-4 mr-1" />
                          Print
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
        {showAll && (
          <ListPagination page={page} pageSize={PAGE_SIZE} total={shownRows.length} onPageChange={setPage}
            noun="transactions" />
        )}
      </CardContent>
    </Card>
  );
}
