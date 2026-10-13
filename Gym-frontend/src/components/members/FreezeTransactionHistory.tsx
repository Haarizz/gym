import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addYears, differenceInCalendarDays, format, isSameMonth, isValid, parseISO, subYears } from "date-fns";
import { AlertCircle, Clock, Download, Eye, EyeOff, FileText, Hash, Play, Receipt, RefreshCw, Snowflake, User, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Skeleton } from "../ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { CurrencyGlyph } from "../../utils/currency";
import { authService } from "../../utils/supabase/auth-service";
import { StatFilterNotice } from "./MemberStatCards";

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const PREVIEW_ROWS = 10;

// One row of /membership-reports/freezes
interface FreezeRecord {
  id: number;
  memberDbId: number;
  memberId: string;
  name: string;
  phone?: string;
  plan?: string;
  freezeStart: string;
  plannedEnd?: string | null;
  endedAt?: string | null;
  status: "Frozen" | "Unfrozen";
  requestedDays: number;
  daysFrozen: number;
  freeDays: number;
  chargedDays: number;
  chargeAmount: number;
  reason?: string | null;
  source?: string | null;
}

interface HistoryRow {
  key: string;
  docNo: string;
  txnId: string;
  action: "Freeze" | "Unfreeze";
  record: FreezeRecord;
  date: string;
  periodTo: string | null;
  duration: number;
  status: "Active" | "Completed";
}

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = parseISO(v);
  return isValid(d) ? format(d, "dd/MM/yyyy") : "—";
};

const sourceLabel = (s?: string | null) => (s === "MOBILE" ? "Member (App)" : s === "STAFF" ? "Staff" : s || "—");

/**
 * Members → Freeze/Unfreeze: every freeze and unfreeze as a transaction history,
 * built from the membership_freezes records (via /membership-reports/freezes).
 * Each freeze is a "Freeze" row; once it has ended it also gets an "Unfreeze" row.
 */
export type FreezeFilter = "frozen" | "ending7" | "month" | "unfrozen" | "charged";

export interface FreezeStats {
  frozen: number;
  /** Still frozen, with a planned end today through 7 days out */
  ending7: number;
  /** Freezes that started this calendar month */
  month: number;
  unfrozen: number;
  charged: number;
  chargedAmount: number;
}

export const FREEZE_FILTER_LABELS: Record<FreezeFilter, string> = {
  frozen: "Currently frozen",
  ending7: "Unfreezing in the next 7 days",
  month: "Freezes started this month",
  unfrozen: "Unfreezes",
  charged: "Freezes with a fee",
};

const daysUntil = (v?: string | null) => {
  if (!v) return null;
  const d = parseISO(v);
  return isValid(d) ? differenceInCalendarDays(d, new Date()) : null;
};

const isThisMonth = (v?: string | null) => {
  if (!v) return false;
  const d = parseISO(v);
  return isValid(d) && isSameMonth(d, new Date());
};

/** Whether a freeze record belongs to a stat-card bucket. */
const recordMatches = (r: FreezeRecord, filter: FreezeFilter) => {
  switch (filter) {
    case "frozen": return r.status === "Frozen";
    case "ending7": {
      const d = daysUntil(r.plannedEnd);
      return r.status === "Frozen" && d !== null && d >= 0 && d <= 7;
    }
    case "month": return isThisMonth(r.freezeStart);
    case "unfrozen": return !!r.endedAt;
    case "charged": return Number(r.chargeAmount || 0) > 0;
  }
};

export function FreezeTransactionHistory({
  refreshKey = 0,
  filter = null,
  onClearFilter,
  onStats,
}: {
  refreshKey?: number;
  filter?: FreezeFilter | null;
  onClearFilter?: () => void;
  onStats?: (stats: FreezeStats) => void;
}) {
  const [records, setRecords] = useState<FreezeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = format(subYears(new Date(), 5), "yyyy-MM-dd");
      const to = format(addYears(new Date(), 1), "yyyy-MM-dd");
      const res = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/membership-reports/freezes?from=${from}&to=${to}`);
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const body = await res.json();
      setRecords((body?.data ?? []) as FreezeRecord[]);
    } catch (e: any) {
      setError(e?.message || "Could not load freeze history");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const rows = useMemo<HistoryRow[]>(() => {
    const out: HistoryRow[] = [];
    for (const r of records) {
      const seq = String(r.id).padStart(4, "0");
      out.push({
        key: `f-${r.id}`,
        docNo: `FRZ-${seq}`,
        txnId: `FRZ${seq}`,
        action: "Freeze",
        record: r,
        date: r.freezeStart,
        periodTo: r.endedAt || r.plannedEnd || null,
        duration: r.status === "Frozen" ? r.requestedDays || r.daysFrozen : r.daysFrozen,
        status: r.status === "Frozen" ? "Active" : "Completed",
      });
      if (r.endedAt) {
        out.push({
          key: `u-${r.id}`,
          docNo: `UFR-${seq}`,
          txnId: `UFR${seq}`,
          action: "Unfreeze",
          record: r,
          date: r.endedAt,
          periodTo: r.endedAt,
          duration: r.daysFrozen,
          status: "Completed",
        });
      }
    }
    return out.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (a.action === "Unfreeze" ? -1 : 1));
  }, [records]);

  useEffect(() => {
    if (loading || error || !onStats) return;
    const count = (f: FreezeFilter) => records.filter((r) => recordMatches(r, f)).length;
    onStats({
      frozen: count("frozen"),
      ending7: count("ending7"),
      month: count("month"),
      unfrozen: count("unfrozen"),
      charged: count("charged"),
      chargedAmount: records.reduce((s, r) => s + Number(r.chargeAmount || 0), 0),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, loading, error]);

  // "Unfreezes" lists the Unfreeze rows; every other bucket lists the Freeze rows.
  const shownRows = filter
    ? rows.filter((row) => (filter === "unfrozen" ? row.action === "Unfreeze" : row.action === "Freeze") && recordMatches(row.record, filter))
    : rows;
  const visible = showAll ? shownRows : shownRows.slice(0, PREVIEW_ROWS);

  const exportCsv = () => {
    if (rows.length === 0) { toast.info("No freeze transactions to export"); return; }
    const cell = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ["Receipt No", "Transaction ID", "Member", "Member ID", "Action", "Reason", "Freeze From", "Freeze To", "Duration (days)", "Free Days", "Charged Days", "Charge", "Date", "Processed By", "Status"];
    const lines = rows.map((r) => [
      r.docNo, r.txnId, r.record.name, r.record.memberId, r.action, r.record.reason || "",
      r.record.freezeStart, r.periodTo || "", r.duration, r.record.freeDays, r.record.chargedDays,
      Number(r.record.chargeAmount || 0), r.date, sourceLabel(r.record.source), r.status,
    ]);
    const csv = [header, ...lines].map((l) => l.map(cell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `freeze-unfreeze-history-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${rows.length} transactions`);
  };

  return (
    <Card id="freeze-history" className="mt-6 shadow-sm" style={{ borderColor: "rgba(43, 122, 120, 0.2)" }}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Freeze / Unfreeze Transaction History
            </CardTitle>
            <CardDescription>Complete record of all membership freeze and unfreeze actions</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading} title="Refresh">
              <RefreshCw className={loading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={loading || rows.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {shownRows.length > PREVIEW_ROWS && (
              <Button variant="outline" size="sm" onClick={() => setShowAll((v) => !v)}>
                {showAll ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                {showAll ? "Show Less" : `View All (${shownRows.length})`}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filter && <StatFilterNotice label={FREEZE_FILTER_LABELS[filter]} onClear={onClearFilter} />}
        {error ? (
          <div className="flex items-center justify-between gap-3 rounded-md bg-red-50 p-4 text-red-700">
            <span className="flex items-center gap-2 text-sm"><AlertCircle className="h-4 w-4" />{error}</span>
            <Button size="sm" variant="outline" onClick={load}>Retry</Button>
          </div>
        ) : loading && rows.length === 0 ? (
          <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Snowflake className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-sm">No freezes yet. Freeze and unfreeze actions will appear here.</p>
          </div>
        ) : shownRows.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p className="text-sm">No freeze transactions match this filter.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ background: "rgba(223, 245, 244, 0.5)" }}>
                  <TableHead>Receipt No</TableHead>
                  <TableHead>Transaction ID</TableHead>
                  <TableHead>Member Details</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Freeze Period</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Freeze Fee</TableHead>
                  <TableHead>Extra Days</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Processed By</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((row) => {
                  const r = row.record;
                  const fee = Number(r.chargeAmount || 0);
                  return (
                    <TableRow key={row.key} className="hover:bg-gray-50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Receipt className="h-4 w-4 text-primary" />
                          <span className="font-mono font-medium text-primary">{row.docNo}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-gray-500" />
                          <span className="font-mono text-sm">{row.txnId}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-500" />
                          <div>
                            <div className="font-medium">{r.name}</div>
                            <div className="text-xs text-gray-500">{r.memberId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {row.action === "Freeze" ? (
                          <Badge className="bg-blue-100 text-blue-800"><Snowflake className="h-3 w-3 mr-1" />Freeze</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800"><Play className="h-3 w-3 mr-1" />Unfreeze</Badge>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[180px] truncate" title={r.reason || ""}>
                        {row.action === "Unfreeze" ? (r.endedAt && r.plannedEnd && r.endedAt < r.plannedEnd ? "Early return" : "Freeze period ended") : (r.reason || "—")}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-gray-600 space-y-0.5">
                          <div>From: {fmtDate(r.freezeStart)}</div>
                          <div>To: {fmtDate(row.periodTo)}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{row.duration} days</Badge>
                      </TableCell>
                      <TableCell className={fee > 0 ? "font-semibold text-orange-600" : "text-green-600"}>
                        {fee > 0 ? <><CurrencyGlyph /> {fee.toLocaleString()}</> : "Free"}
                      </TableCell>
                      <TableCell className={r.chargedDays > 0 ? "text-orange-600" : "text-muted-foreground"}>
                        {r.chargedDays > 0 ? `${r.chargedDays} days` : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{fmtDate(row.date)}</TableCell>
                      <TableCell className="text-sm">{sourceLabel(r.source)}</TableCell>
                      <TableCell>
                        {row.status === "Active" ? (
                          <Badge className="bg-blue-100 text-blue-800"><Snowflake className="h-3 w-3 mr-1" />Active</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Completed</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
