import React, { useEffect, useMemo, useState } from "react";
import { addDays, format, isValid, parseISO, startOfDay, subDays, subMonths } from "date-fns";
import {
  AlertCircle,
  BarChart3,
  CalendarClock,
  CalendarX,
  Download,
  FileText,
  Loader2,
  Printer,
  RefreshCw,
  Snowflake,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DatePickerField } from "../shared/DatePickerField";
import { CurrencyGlyph, useCurrency } from "../../utils/currency";
import { authService } from "../../utils/supabase/auth-service";
import { receiptsService, type Receipt } from "../../utils/supabase/receipts-service";
import { downloadReceiptInvoice } from "../../utils/receipt-invoice";

export type LifecycleReportType = "transactions" | "renewals" | "expired" | "expiring" | "joined" | "freeze";

export const LIFECYCLE_REPORT_TYPES: { value: LifecycleReportType; label: string }[] = [
  { value: "renewals", label: "Renewals Report" },
  { value: "expired", label: "Expired Memberships" },
  { value: "expiring", label: "Expiring Soon" },
  { value: "joined", label: "New Joiners" },
  { value: "freeze", label: "Freeze / Unfreeze Report" },
];

/** Every membership report, including all receipt transactions — for places without their own transactions report */
export const ALL_MEMBERSHIP_REPORT_TYPES: { value: LifecycleReportType; label: string }[] = [
  { value: "transactions", label: "Membership Transactions" },
  ...LIFECYCLE_REPORT_TYPES,
];

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const PAGE_SIZE = 20;
const ISO = "yyyy-MM-dd";

interface MemberRow {
  memberDbId: number;
  memberId: string;
  name: string;
  phone?: string;
  email?: string;
  membershipType?: string;
  plan?: string;
  status?: string;
  joinDate?: string;
  startDate?: string;
  expiryDate?: string;
  daysFromToday?: number | null;
  outstandingBalance?: number;
}

interface FreezeRow {
  id: number;
  memberId: string;
  name: string;
  phone?: string;
  membershipType?: string;
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
  reason?: string;
  source?: string;
}

type RangeKey = "today" | "last-7" | "last-30" | "last-90" | "last-12-months" | "next-7" | "next-30" | "next-90" | "custom";

const PAST_RANGES: { value: RangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "last-7", label: "Last 7 Days" },
  { value: "last-30", label: "Last 30 Days" },
  { value: "last-90", label: "Last 90 Days" },
  { value: "last-12-months", label: "Last 12 Months" },
  { value: "custom", label: "Custom Date Range" },
];

const FUTURE_RANGES: { value: RangeKey; label: string }[] = [
  { value: "next-7", label: "Next 7 Days" },
  { value: "next-30", label: "Next 30 Days" },
  { value: "next-90", label: "Next 90 Days" },
  { value: "custom", label: "Custom Date Range" },
];

function resolveRange(key: RangeKey, custom: { from: string; to: string }): { from: string; to: string } | null {
  const today = startOfDay(new Date());
  const f = (d: Date) => format(d, ISO);
  switch (key) {
    case "today": return { from: f(today), to: f(today) };
    case "last-7": return { from: f(subDays(today, 6)), to: f(today) };
    case "last-30": return { from: f(subDays(today, 29)), to: f(today) };
    case "last-90": return { from: f(subDays(today, 89)), to: f(today) };
    case "last-12-months": return { from: f(addDays(subMonths(today, 12), 1)), to: f(today) };
    case "next-7": return { from: f(today), to: f(addDays(today, 6)) };
    case "next-30": return { from: f(today), to: f(addDays(today, 29)) };
    case "next-90": return { from: f(today), to: f(addDays(today, 89)) };
    case "custom": return custom.from && custom.to ? custom : null;
  }
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const fmtDate = (v?: string | null) => {
  if (!v) return "—";
  const d = parseISO(v);
  return isValid(d) ? format(d, "dd/MM/yyyy") : "—";
};

async function fetchReport<T>(path: string): Promise<T[]> {
  const res = await authService.makeAuthenticatedRequest(`${backendBaseUrl}${path}`);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  const body = await res.json();
  return (body?.data ?? []) as T[];
}

function downloadCsv(filename: string, header: string[], rows: unknown[][]) {
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [header, ...rows].map((r) => r.map(cell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Members → Reports for the membership lifecycle: renewals, expired, expiring soon,
 * new joiners and freeze/unfreeze. Each report has its own date range; the parent
 * owns the Report Type selector and passes it in so the header stays in one place.
 */
export function MembershipLifecycleReport({
  reportType,
  reportTypeSelect,
}: {
  reportType: LifecycleReportType;
  reportTypeSelect: React.ReactNode;
}) {
  const { currencyCode } = useCurrency();
  const isFuture = reportType === "expiring";
  const [range, setRange] = useState<RangeKey>(isFuture ? "next-30" : "last-30");
  const [custom, setCustom] = useState({ from: "", to: "" });
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [memberRows, setMemberRows] = useState<MemberRow[]>([]);
  const [freezeRows, setFreezeRows] = useState<FreezeRow[]>([]);
  const [renewalRows, setRenewalRows] = useState<Receipt[]>([]);
  const [page, setPage] = useState(1);

  // Switching report type starts fresh with a sensible default window
  useEffect(() => {
    setRange(reportType === "expiring" ? "next-30" : "last-30");
    setGenerated(false);
    setMemberRows([]);
    setFreezeRows([]);
    setRenewalRows([]);
    setPage(1);
  }, [reportType]);

  const generate = async () => {
    const window = resolveRange(range, custom);
    if (!window) {
      toast.error("Pick both a start and an end date");
      return;
    }
    if (window.to < window.from) {
      toast.error("End date can't be before the start date");
      return;
    }
    setLoading(true);
    try {
      if (reportType === "freeze") {
        setFreezeRows(await fetchReport<FreezeRow>(`/membership-reports/freezes?from=${window.from}&to=${window.to}`));
      } else if (reportType === "renewals" || reportType === "transactions") {
        const res = await receiptsService.getReceipts(reportType === "renewals" ? { transactionType: "Renewal" } : {}, { page: 1, limit: 2000 });
        const rows = (res.receipts ?? [])
          .filter((r) => {
            const d = r.transaction_date ? format(parseISO(r.transaction_date), ISO) : "";
            return d >= window.from && d <= window.to;
          })
          .sort((a, b) => (b.transaction_date ?? "").localeCompare(a.transaction_date ?? ""));
        setRenewalRows(rows);
      } else {
        setMemberRows(await fetchReport<MemberRow>(`/membership-reports/members?type=${reportType}&from=${window.from}&to=${window.to}`));
      }
      setGenerated(true);
      setPage(1);
    } catch (e: any) {
      toast.error("Failed to generate report", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const isReceiptReport = reportType === "renewals" || reportType === "transactions";
  const rowCount = reportType === "freeze" ? freezeRows.length : isReceiptReport ? renewalRows.length : memberRows.length;
  const totalPages = Math.max(1, Math.ceil(rowCount / PAGE_SIZE));
  const pageStart = (page - 1) * PAGE_SIZE;

  const summary = useMemo(() => {
    if (reportType === "freeze") {
      return [
        { label: "Total Freezes", value: freezeRows.length, icon: Snowflake, color: "text-sky-600" },
        { label: "Currently Frozen", value: freezeRows.filter((r) => r.status === "Frozen").length, icon: Snowflake, color: "text-blue-600" },
        { label: "Unfrozen", value: freezeRows.filter((r) => r.status === "Unfrozen").length, icon: RefreshCw, color: "text-emerald-600" },
        { label: "Days Frozen", value: freezeRows.reduce((s, r) => s + num(r.daysFrozen), 0), icon: CalendarClock, color: "text-purple-600" },
        { label: "Freeze Charges", value: freezeRows.reduce((s, r) => s + num(r.chargeAmount), 0), icon: AlertCircle, color: "text-amber-600", money: true },
      ];
    }
    if (isReceiptReport) {
      return [
        { label: reportType === "renewals" ? "Renewals" : "Transactions", value: renewalRows.length, icon: RefreshCw, color: "text-emerald-600" },
        { label: reportType === "renewals" ? "Members Renewed" : "Members", value: new Set(renewalRows.map((r) => r.member_db_id ?? r.member_id)).size, icon: Users, color: "text-blue-600" },
        { label: "Total Amount", value: renewalRows.reduce((s, r) => s + num(r.amount), 0), icon: BarChart3, color: "text-green-600", money: true },
        { label: "Collected", value: renewalRows.reduce((s, r) => s + num(r.paid_amount ?? r.amount), 0), icon: BarChart3, color: "text-emerald-600", money: true },
        { label: "Due", value: renewalRows.reduce((s, r) => s + Math.max(0, num(r.amount) - num(r.paid_amount ?? r.amount)), 0), icon: AlertCircle, color: "text-amber-600", money: true },
      ];
    }
    const label = reportType === "expired" ? "Expired" : reportType === "expiring" ? "Expiring" : "New Joiners";
    const icon = reportType === "expired" ? CalendarX : reportType === "expiring" ? CalendarClock : UserPlus;
    return [
      { label, value: memberRows.length, icon, color: reportType === "expired" ? "text-red-600" : reportType === "expiring" ? "text-amber-600" : "text-emerald-600" },
      { label: "Individual", value: memberRows.filter((r) => (r.membershipType || "").toLowerCase() === "individual").length, icon: Users, color: "text-blue-600" },
      { label: "Family", value: memberRows.filter((r) => (r.membershipType || "").toLowerCase() === "family").length, icon: Users, color: "text-purple-600" },
      { label: "Outstanding Due", value: memberRows.reduce((s, r) => s + num(r.outstandingBalance), 0), icon: AlertCircle, color: "text-amber-600", money: true },
    ];
  }, [reportType, isReceiptReport, freezeRows, renewalRows, memberRows]);

  const exportCsv = () => {
    const stamp = format(new Date(), ISO);
    if (reportType === "freeze") {
      downloadCsv(`freeze-report-${stamp}.csv`,
        ["Member ID", "Member", "Mobile", "Plan", "Freeze Start", "Planned End", "Unfrozen On", "Status", "Requested Days", "Days Frozen", "Free Days", "Charged Days", `Charge (${currencyCode})`, "Reason"],
        freezeRows.map((r) => [r.memberId, r.name, r.phone, r.plan, r.freezeStart, r.plannedEnd, r.endedAt, r.status, r.requestedDays, r.daysFrozen, r.freeDays, r.chargedDays, num(r.chargeAmount), r.reason]));
    } else if (isReceiptReport) {
      downloadCsv(`${reportType}-report-${stamp}.csv`,
        ["Date", "Receipt No", "Type", "Member ID", "Member", "Mobile", "Plan", `Amount (${currencyCode})`, `Paid (${currencyCode})`, "Payment Method", "New Expiry", "Processed By", "Status"],
        renewalRows.map((r) => [r.transaction_date, r.receipt_no, r.transaction_type, r.member_id, r.member_name, r.member_phone, r.plan_name, num(r.amount), num(r.paid_amount), r.payment_method, r.valid_till, r.processed_by, r.status]));
    } else {
      downloadCsv(`${reportType}-members-report-${stamp}.csv`,
        ["Member ID", "Member", "Mobile", "Email", "Membership Type", "Plan", "Status", "Join Date", "Start Date", "Expiry Date", reportType === "expired" ? "Days Since Expiry" : "Days Left", `Outstanding (${currencyCode})`],
        memberRows.map((r) => [r.memberId, r.name, r.phone, r.email, r.membershipType, r.plan, r.status, r.joinDate, r.startDate, r.expiryDate,
          r.daysFromToday == null ? "" : Math.abs(r.daysFromToday), num(r.outstandingBalance)]));
    }
    toast.success(`Exported ${rowCount} rows`);
  };

  const ranges = isFuture ? FUTURE_RANGES : PAST_RANGES;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {reportTypeSelect}
            <div>
              <Label className="text-sm mb-2 block">Date Range</Label>
              <Select value={range} onValueChange={(v) => setRange(v as RangeKey)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ranges.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {range === "custom" && (
              <>
                <div>
                  <Label className="text-sm mb-2 block">From</Label>
                  <DatePickerField value={custom.from} max={custom.to || undefined} onChange={(v) => setCustom((c) => ({ ...c, from: v }))} />
                </div>
                <div>
                  <Label className="text-sm mb-2 block">To</Label>
                  <DatePickerField value={custom.to} min={custom.from || undefined} onChange={(v) => setCustom((c) => ({ ...c, to: v }))} />
                </div>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={generate} disabled={loading} className="bg-gradient-primary hover:bg-gradient-primary-hover">
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
              {loading ? "Generating..." : "Generate Report"}
            </Button>
            {generated && (
              <Button variant="outline" onClick={exportCsv} disabled={rowCount === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {generated && (
        <>
          {/* Summary */}
          <div className="bg-white border border-border shadow-md rounded-lg px-8 py-3">
            <div className="flex items-center gap-0 overflow-x-auto">
              <div className="flex items-center gap-1.5 font-semibold text-primary text-sm pr-4 shrink-0">
                <BarChart3 className="h-4 w-4" />
                Summary
              </div>
              {summary.map((s) => (
                <div key={s.label} className="flex items-center gap-1.5 text-sm px-4 border-l shrink-0">
                  <s.icon className={`h-3.5 w-3.5 ${s.color} shrink-0`} />
                  <span className="text-muted-foreground whitespace-nowrap">{s.label}</span>
                  <span className={`font-bold ml-1 ${s.color}`}>
                    {s.money ? <><CurrencyGlyph /> {num(s.value).toLocaleString()}</> : num(s.value).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Results */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {ALL_MEMBERSHIP_REPORT_TYPES.find((t) => t.value === reportType)?.label}
                <Badge variant="secondary" className="ml-1">{rowCount}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rowCount === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">No records found for this period.</div>
              ) : (
                <div className="overflow-x-auto">
                  {reportType === "freeze" ? (
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Freeze Start</TableHead>
                          <TableHead>Planned End</TableHead>
                          <TableHead>Unfrozen On</TableHead>
                          <TableHead>Days Frozen</TableHead>
                          <TableHead>Free / Charged Days</TableHead>
                          <TableHead>Charge</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {freezeRows.slice(pageStart, pageStart + PAGE_SIZE).map((r, i) => (
                          <TableRow key={r.id}>
                            <TableCell>{pageStart + i + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium">{r.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{r.memberId}</div>
                            </TableCell>
                            <TableCell>{r.phone || "—"}</TableCell>
                            <TableCell>{r.plan || "—"}</TableCell>
                            <TableCell>{fmtDate(r.freezeStart)}</TableCell>
                            <TableCell>{fmtDate(r.plannedEnd)}</TableCell>
                            <TableCell>{fmtDate(r.endedAt)}</TableCell>
                            <TableCell className="font-semibold">{r.daysFrozen}</TableCell>
                            <TableCell>{r.freeDays} / {r.chargedDays}</TableCell>
                            <TableCell>{num(r.chargeAmount) > 0 ? <><CurrencyGlyph /> {num(r.chargeAmount).toLocaleString()}</> : "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate" title={r.reason || ""}>{r.reason || "—"}</TableCell>
                            <TableCell>
                              <Badge className={r.status === "Frozen" ? "bg-sky-100 text-sky-800" : "bg-green-100 text-green-800"}>{r.status}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : isReceiptReport ? (
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Receipt No.</TableHead>
                          {reportType === "transactions" && <TableHead>Type</TableHead>}
                          <TableHead>Member</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Paid</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>New Expiry</TableHead>
                          <TableHead>Processed By</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {renewalRows.slice(pageStart, pageStart + PAGE_SIZE).map((r, i) => (
                          <TableRow key={r.id}>
                            <TableCell>{pageStart + i + 1}</TableCell>
                            <TableCell>{fmtDate(r.transaction_date)}</TableCell>
                            <TableCell className="font-medium">{r.receipt_no}</TableCell>
                            {reportType === "transactions" && <TableCell><Badge variant="outline">{r.transaction_type || "—"}</Badge></TableCell>}
                            <TableCell>
                              <div className="font-medium">{r.member_name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{r.member_id}</div>
                            </TableCell>
                            <TableCell>{r.member_phone || "—"}</TableCell>
                            <TableCell>{r.plan_name || "—"}</TableCell>
                            <TableCell className="font-semibold"><CurrencyGlyph /> {num(r.amount).toLocaleString()}</TableCell>
                            <TableCell className="text-emerald-600"><CurrencyGlyph /> {num(r.paid_amount ?? r.amount).toLocaleString()}</TableCell>
                            <TableCell><Badge variant="outline">{r.payment_method || "—"}</Badge></TableCell>
                            <TableCell>{fmtDate(r.valid_till)}</TableCell>
                            <TableCell>{r.processed_by || "—"}</TableCell>
                            <TableCell>
                              <Badge className={(r.status || "").toLowerCase() === "paid" ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}>{r.status}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => downloadReceiptInvoice(r, currencyCode)}>
                                <Printer className="h-4 w-4 mr-1" />
                                Print
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Membership Type</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>{reportType === "joined" ? "Join Date" : "Start Date"}</TableHead>
                          <TableHead>Expiry Date</TableHead>
                          {reportType !== "joined" && <TableHead>{reportType === "expired" ? "Expired" : "Expires In"}</TableHead>}
                          <TableHead>Outstanding</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {memberRows.slice(pageStart, pageStart + PAGE_SIZE).map((r, i) => (
                          <TableRow key={r.memberDbId}>
                            <TableCell>{pageStart + i + 1}</TableCell>
                            <TableCell>
                              <div className="font-medium">{r.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{r.memberId}</div>
                            </TableCell>
                            <TableCell>{r.phone || "—"}</TableCell>
                            <TableCell><Badge variant="outline">{r.membershipType || "—"}</Badge></TableCell>
                            <TableCell>{r.plan || "—"}</TableCell>
                            <TableCell>{fmtDate(reportType === "joined" ? r.joinDate : r.startDate)}</TableCell>
                            <TableCell>{fmtDate(r.expiryDate)}</TableCell>
                            {reportType !== "joined" && (
                              <TableCell className={reportType === "expired" ? "text-red-600 font-medium" : "text-amber-600 font-medium"}>
                                {r.daysFromToday == null ? "—"
                                  : reportType === "expired" ? `${Math.abs(r.daysFromToday)} day(s) ago`
                                  : r.daysFromToday === 0 ? "Today" : `${r.daysFromToday} day(s)`}
                              </TableCell>
                            )}
                            <TableCell className={num(r.outstandingBalance) > 0 ? "text-amber-600" : ""}>
                              {num(r.outstandingBalance) > 0 ? <><CurrencyGlyph /> {num(r.outstandingBalance).toLocaleString()}</> : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                (r.status || "").toLowerCase() === "active" ? "bg-green-100 text-green-800"
                                : (r.status || "").toLowerCase() === "expired" ? "bg-red-100 text-red-800"
                                : (r.status || "").toLowerCase() === "frozen" ? "bg-sky-100 text-sky-800"
                                : "bg-gray-100 text-gray-800"
                              }>{r.status || "—"}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}

              {rowCount > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-4 mt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {pageStart + 1}–{Math.min(pageStart + PAGE_SIZE, rowCount)} of {rowCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                    <span className="text-sm">{page} / {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
