import React, { useMemo, useRef, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth, startOfWeek, subDays, subMonths } from "date-fns";
import {
  AlertCircle, BarChart3, CalendarDays, ClipboardList, Copy, CreditCard, Download, FileText, Loader2, Printer,
  Receipt, ShoppingBag, ShoppingCart, Snowflake, TrendingDown, TrendingUp, UserCheck, UserPlus, Users, Wallet,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell as PieCell, ComposedChart, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DatePickerField } from "../shared/DatePickerField";
import { CurrencyGlyph, useCurrency } from "../../utils/currency";
import { authService } from "../../utils/supabase/auth-service";
import { buildXlsx, downloadBlob } from "../../utils/xlsx-export";
import {
  type Block, type DayReportData, type Row, blocksToText, blocksToXlsx, buildBlocks, cellText, hourLabel,
  money, num, periodLabel, rightAligned, sum,
} from "./dayReportBlocks";
import styles from "./DayReport.module.css";

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const TEAL = "#0F766E";
const CHART_COLORS = ["#0F766E", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#10B981"];
const VIEW_KEY = "dayReport.view";

type Preset = "today" | "yesterday" | "last7" | "thisWeek" | "thisMonth" | "lastMonth" | "custom";
type View = "graph" | "text";

const PRESETS: { id: Exclude<Preset, "custom">; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "last7", label: "Last 7 days" },
  { id: "thisWeek", label: "This week" },
  { id: "thisMonth", label: "This month" },
  { id: "lastMonth", label: "Last month" },
];

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

function presetRange(p: Exclude<Preset, "custom">): [string, string] {
  const today = new Date();
  switch (p) {
    case "today": return [ymd(today), ymd(today)];
    case "yesterday": return [ymd(subDays(today, 1)), ymd(subDays(today, 1))];
    case "last7": return [ymd(subDays(today, 6)), ymd(today)];
    case "thisWeek": return [ymd(startOfWeek(today, { weekStartsOn: 1 })), ymd(today)];
    case "thisMonth": return [ymd(startOfMonth(today)), ymd(today)];
    case "lastMonth": {
      const last = subMonths(today, 1);
      return [ymd(startOfMonth(last)), ymd(endOfMonth(last))];
    }
  }
}

const readView = (): View => {
  try { return localStorage.getItem(VIEW_KEY) === "text" ? "text" : "graph"; } catch { return "graph"; }
};

const Money = ({ v }: { v: unknown }) => <><CurrencyGlyph /> {money(v)}</>;

/** A titled card holding one section, with count/total and its own error state */
function Section({
  title, icon: Icon, description, count, total, error, children,
}: {
  title: string; icon: React.ElementType; description?: string; count?: number; total?: number | null;
  error?: string; children: React.ReactNode;
}) {
  return (
    <Card className="border-primary/10 shadow-md" data-slot="card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Icon className="h-5 w-5 text-primary" />
              {title}
              {count !== undefined && <Badge variant="secondary">{count}</Badge>}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {total !== undefined && total !== null && (
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="font-bold text-primary"><Money v={total} /></div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="flex items-center gap-2 text-sm text-red-600"><AlertCircle className="h-4 w-4" />{error}</div>
        ) : children}
      </CardContent>
    </Card>
  );
}

const Empty = ({ text }: { text?: string }) => (
  <p className="text-sm text-muted-foreground py-4 text-center">{text || "Nothing recorded."}</p>
);

/** Graphical view: one detail block as a card with a styled table */
function BlockCard({ block, icon }: { block: Block; icon: React.ElementType }) {
  const right = rightAligned(block);
  return (
    <Section title={block.title} icon={icon} description={block.description} count={block.count} total={block.amount} error={block.error}>
      {block.rows.length === 0 ? <Empty text={block.empty} /> : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              {block.header.map((h, i) => (
                <TableHead key={h} className={right[i] ? "text-right" : undefined}>{h}</TableHead>
              ))}
            </TableRow></TableHeader>
            <TableBody>
              {block.rows.map((r, ri) => (
                <TableRow key={ri}>
                  {block.header.map((_, i) => (
                    <TableCell key={i} className={right[i] ? "text-right" : undefined}>{cellText(r[i])}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  );
}

/** Text view: the whole report as plain tables of numbers and words */
function TextReport({ title, subtitle, blocks }: { title: string; subtitle: string; blocks: Block[] }) {
  return (
    <div className={styles.doc}>
      <h2 className={styles.docTitle}>{title}</h2>
      <p className={styles.docMeta}>{subtitle}</p>
      {blocks.map((b) => {
        const right = rightAligned(b);
        return (
          <section key={b.id} className={styles.section}>
            <h3 className={styles.sectionTitle}>{b.title}</h3>
            {b.description && <p className={styles.sectionNote}>{b.description}</p>}
            {b.error ? <p className={styles.plain}>{b.error}</p>
              : b.rows.length === 0 ? <p className={styles.plain}>{b.empty}</p>
              : (
                <div className={styles.tableWrap}>
                  <table className={`${styles.table} ${b.id === "summary" ? styles.summary : ""}`}>
                    <thead><tr>{b.header.map((h, i) => <th key={h} className={right[i] ? styles.num : undefined}>{h}</th>)}</tr></thead>
                    <tbody>
                      {b.rows.map((r, ri) => (
                        <tr key={ri}>
                          {b.header.map((h, i) => (
                            <td key={i} className={right[i] ? styles.num : h === "Notes" || h === "Reason" ? styles.wrap : undefined}>
                              {cellText(r[i])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {b.total && (
                      <tfoot><tr>{b.total.map((c, i) => <td key={i} className={right[i] ? styles.num : undefined}>{cellText(c)}</td>)}</tr></tfoot>
                    )}
                  </table>
                </div>
              )}
          </section>
        );
      })}
    </div>
  );
}

/**
 * Reports → Day Report: pick a day (today, yesterday, any date) or a range (last 7 days,
 * this/last month, custom) and see everything that happened — collections, member receipts,
 * POS sales, invoices, purchases, expenses, payments out, membership activity, attendance
 * and leads. Graphical view (charts) or Text view (numbers and words only); printable,
 * copyable as text and exportable to Excel.
 */
export function DayReport() {
  const { currencyCode, currencyPrefix } = useCurrency();
  const today = ymd(new Date());
  const [preset, setPreset] = useState<Preset>("today");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [view, setViewState] = useState<View>(readView);
  const [data, setData] = useState<DayReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  const setView = (v: View) => {
    setViewState(v);
    try { localStorage.setItem(VIEW_KEY, v); } catch { /* per-viewer convenience only */ }
  };

  const generate = async (f = from, t = to) => {
    if (!f || !t) { toast.error("Pick the dates first"); return; }
    if (t < f) { toast.error("The end date is before the start date"); return; }
    const id = ++requestId.current;
    setLoading(true);
    try {
      const res = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/reports/day?from=${f}&to=${t}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(typeof body?.data === "string" ? body.data
          : res.status === 500 ? "The server couldn't build this report (is the backend up to date?)" : `Request failed (${res.status})`);
      }
      if (id === requestId.current) setData(body.data as DayReportData);
    } catch (e: any) {
      if (id === requestId.current) toast.error("Failed to generate the report", { description: e?.message });
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  };

  const pickPreset = (p: Exclude<Preset, "custom">) => {
    const [f, t] = presetRange(p);
    setPreset(p); setFrom(f); setTo(t);
    generate(f, t);
  };

  const blocks = useMemo(() => (data ? buildBlocks(data) : []), [data]);
  const block = (id: string) => blocks.find((b) => b.id === id)!;

  const range = !!data && (data.from || data.date) !== (data.to || data.date);
  const period = data ? periodLabel(data) : "";
  const reportTitle = range ? `Report — ${period}` : `Day Report — ${period}`;
  const subtitle = `Generated ${format(new Date(), "dd/MM/yyyy hh:mm a")} · Amounts in ${currencyCode}`;
  const fileBase = data ? (range ? `report-${data.from}_to_${data.to}` : `day-report-${data.from || data.date}`) : "day-report";

  const exportExcel = () => {
    if (!data) return;
    const { rows, bold } = blocksToXlsx(range ? "Report" : "Day Report", period, currencyCode, blocks);
    const blob = buildXlsx("Day Report", rows, { boldRows: bold, columnWidths: [22, 22, 24, 16, 16, 14, 14, 14, 14, 16, 16] });
    downloadBlob(blob, `${fileBase}.xlsx`);
    toast.success("Report exported");
  };
  const plainText = () => blocksToText(reportTitle, subtitle, blocks);
  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(plainText());
      toast.success("Report copied as text");
    } catch {
      toast.error("Couldn't copy — use Download .txt instead");
    }
  };
  const downloadText = () => {
    downloadBlob(new Blob([plainText()], { type: "text/plain;charset=utf-8" }), `${fileBase}.txt`);
  };

  // ── Graphical view data ──
  const err = (k: string) => data?.errors?.[k];
  const rev = data?.revenue;
  const collection = num(rev?.totalCollection?.total);
  const expensesTotal = sum(data?.expenses, "amount");
  const purchasesTotal = sum(data?.supplierBills, "total");
  const paymentsOut = sum(data?.paymentVouchers, "amount");
  const net = collection - expensesTotal;
  const periodWord = range ? "period" : "day";

  const hourCollection = data?.collectionByHour || (range ? [] : (rev?.trend || []).map((t: Row, h: number) => ({ hour: h, collection: t.revenue })));
  const hourly = data
    ? Array.from({ length: 24 }, (_, h) => ({
        hour: hourLabel(h),
        Collection: num(hourCollection[h]?.collection),
        "Check-ins": num(data.attendance?.byHour?.[h]?.checkIns),
      })).filter((x, h) => h >= 5 || x.Collection > 0 || x["Check-ins"] > 0)
    : [];
  const checkInsByDay = new Map((data?.attendance?.byDay || []).map((d) => [d.date, num(d.checkIns)]));
  const daily = range
    ? (rev?.trend || []).map((t: Row) => {
        const d = String(t.start || "").slice(0, 10);
        return { day: t.label, Collection: num(t.revenue), Expenses: num(t.expenses), "Check-ins": checkInsByDay.get(d) ?? 0 };
      })
    : [];
  const methods = (rev?.paymentMethods || []).map((m: Row) => ({ name: m.name, value: num(m.amount) })).filter((m: Row) => m.value > 0);
  const streams = rev?.streams
    ? [
        { stream: "Membership", amount: num(rev.streams.membership?.total) },
        { stream: "PT & Services", amount: num(rev.streams.services?.total) },
        { stream: "Merchandise", amount: num(rev.streams.merchandise?.total) },
        { stream: "Cafe & F&B", amount: num(rev.streams.cafe?.total) },
        { stream: "Equipment", amount: num(rev.streams.equipment?.total) },
      ]
    : [];

  return (
    <div className="space-y-6" id="day-report-print">
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden !important; }
          #day-report-print, #day-report-print * { visibility: visible !important; }
          #day-report-print { position: absolute; left: 0; top: 0; width: 100%; background: #fff; }
          #day-report-print [data-print-hide] { display: none !important; }
          #day-report-print .shadow-md { box-shadow: none !important; }
          #day-report-print [data-slot="card"] { break-inside: avoid; border: 1px solid #e5e7eb !important; }
          #day-report-print tr { break-inside: avoid; }
        }
      `}</style>

      {/* Controls */}
      <Card className="border-primary/10 shadow-md" data-print-hide>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Day Report</CardTitle>
              <CardDescription>Everything that happened on a day or over a period — sales, purchases, expenses, members, attendance and more</CardDescription>
            </div>
            <div className={styles.segmented} role="group" aria-label="Report view">
              <button type="button" aria-pressed={view === "graph"} onClick={() => setView("graph")}>
                <BarChart3 className="h-4 w-4" />Graphical
              </button>
              <button type="button" aria-pressed={view === "text"} onClick={() => setView("text")}>
                <FileText className="h-4 w-4" />Text
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className={styles.presets}>
            {PRESETS.map((p) => (
              <Button key={p.id} size="sm" variant={preset === p.id ? "default" : "outline"}
                className={preset === p.id ? "bg-primary text-white" : undefined}
                onClick={() => pickPreset(p.id)} disabled={loading}>
                {p.label}
              </Button>
            ))}
            <Button size="sm" variant={preset === "custom" ? "default" : "outline"}
              className={preset === "custom" ? "bg-primary text-white" : undefined}
              onClick={() => setPreset("custom")}>
              Custom range
            </Button>
          </div>

          <div className={styles.controlsRow}>
            {preset === "custom" && (
              <>
                <div style={{ width: 200 }}>
                  <Label className="mb-2 block">From</Label>
                  <DatePickerField value={from} onChange={(v) => { setFrom(v); if (v > to) setTo(v); }} max={today} clearable={false} />
                </div>
                <div style={{ width: 200 }}>
                  <Label className="mb-2 block">To</Label>
                  <DatePickerField value={to} onChange={setTo} min={from} max={today} clearable={false} />
                </div>
                <Button onClick={() => generate()} disabled={loading || !from || !to} className="bg-primary text-white">
                  {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
                  Generate Report
                </Button>
              </>
            )}
            {preset !== "custom" && loading && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</span>
            )}
            {data && (
              <>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />Print
                </Button>
                <Button variant="outline" onClick={exportExcel}>
                  <Download className="h-4 w-4 mr-2" />Export Excel
                </Button>
                {view === "text" && (
                  <>
                    <Button variant="outline" onClick={copyText}>
                      <Copy className="h-4 w-4 mr-2" />Copy Text
                    </Button>
                    <Button variant="outline" onClick={downloadText}>
                      <FileText className="h-4 w-4 mr-2" />Download .txt
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!data ? (
        <Card className="border-primary/10 shadow-md">
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 text-primary" />
            <p>Pick <strong>Today</strong>, <strong>Yesterday</strong> or another period above — or a <strong>Custom range</strong> — to see the report.</p>
          </CardContent>
        </Card>
      ) : view === "text" ? (
        <TextReport title={reportTitle} subtitle={subtitle} blocks={blocks} />
      ) : (
        <>
          <div>
            <h2 className="text-xl font-bold">{reportTitle}</h2>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>

          {/* Headline figures */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Collection", value: <Money v={collection} />, sub: `${num(rev?.totalCollection?.count)} transactions`, icon: Wallet, tone: "text-emerald-700", chip: "bg-emerald-50" },
              { label: "Expenses", value: <Money v={expensesTotal} />, sub: `${(data.expenses || []).length} expenses`, icon: TrendingDown, tone: "text-red-700", chip: "bg-red-50" },
              { label: "Net (Collection − Expenses)", value: <Money v={net} />, sub: net >= 0 ? `Profit for the ${periodWord}` : `Loss for the ${periodWord}`, icon: TrendingUp, tone: net >= 0 ? "text-teal-700" : "text-red-700", chip: "bg-teal-50" },
              { label: "Purchases", value: <Money v={purchasesTotal} />, sub: `${(data.supplierBills || []).length} bills · ${(data.purchaseOrders || []).length} POs`, icon: ShoppingCart, tone: "text-amber-700", chip: "bg-amber-50" },
              { label: "Payments Out", value: <Money v={paymentsOut} />, sub: `${(data.paymentVouchers || []).length} vouchers`, icon: CreditCard, tone: "text-purple-700", chip: "bg-purple-50" },
              { label: "Check-ins", value: num(data.attendance?.total), sub: `${num(data.attendance?.uniqueMembers)} members · ${num(data.attendance?.walkIns)} walk-ins`, icon: UserCheck, tone: "text-blue-700", chip: "bg-blue-50" },
              { label: "New Members", value: (data.membership?.newMembers || []).length, sub: `${num(data.membership?.renewals)} renewals`, icon: UserPlus, tone: "text-emerald-700", chip: "bg-emerald-50" },
              { label: "Leads", value: (data.leads?.created || []).length, sub: `${num(data.leads?.followUpsCompleted)} follow-ups done of ${num(data.leads?.followUpsDue)} due`, icon: Users, tone: "text-blue-700", chip: "bg-blue-50" },
            ].map((k) => (
              <Card key={k.label} className="border-primary/10 shadow-md" data-slot="card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary">{k.label}</CardTitle>
                  <span className={`p-2 rounded-lg ${k.chip}`}><k.icon className={`h-4 w-4 ${k.tone}`} /></span>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${k.tone}`}>{k.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          {range && (
            <Section title="Collection, Expenses & Check-ins by Day" icon={CalendarDays} error={err("revenue") || err("attendance")}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} minTickGap={8} />
                  <YAxis yAxisId="money" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any, name: any) => (name === "Check-ins" ? v : `${currencyPrefix}${money(v)}`)} />
                  <Legend />
                  <Bar yAxisId="money" dataKey="Collection" fill={TEAL} isAnimationActive={false} />
                  <Bar yAxisId="money" dataKey="Expenses" fill="#F59E0B" isAnimationActive={false} />
                  <Line yAxisId="count" type="monotone" dataKey="Check-ins" stroke="#3B82F6" strokeWidth={2} dot={false} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </Section>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title={range ? "Busiest Hours (all days combined)" : "Collection & Check-ins by Hour"} icon={BarChart3} error={err("revenue") || err("attendance")}>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={hourly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} minTickGap={8} />
                  <YAxis yAxisId="money" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="count" orientation="right" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="money" dataKey="Collection" fill={TEAL} isAnimationActive={false} />
                  <Bar yAxisId="count" dataKey="Check-ins" fill="#93c5fd" isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </Section>
            <Section title="Payment Methods" icon={Wallet} error={err("revenue")}>
              {methods.length === 0 ? <Empty text={`No payments received in this ${periodWord}.`} /> : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={methods} dataKey="value" nameKey="name" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} isAnimationActive={false}>
                      {methods.map((_: Row, i: number) => <PieCell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: any) => `${currencyPrefix}${money(v)}`} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Section>
          </div>

          <Section title="Revenue by Stream" icon={TrendingUp} error={err("revenue")}>
            {streams.every((s) => s.amount === 0) ? <Empty text={`No revenue recorded in this ${periodWord}.`} /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={streams}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stream" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => `${currencyPrefix}${money(v)}`} />
                  <Bar dataKey="amount" name="Revenue" fill={TEAL} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Sales */}
          <BlockCard block={block("receipts")} icon={Receipt} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BlockCard block={block("posSales")} icon={ShoppingBag} />
            <BlockCard block={block("salesInvoices")} icon={FileText} />
          </div>

          {/* Purchases & spending */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BlockCard block={block("supplierBills")} icon={ShoppingCart} />
            <BlockCard block={block("purchaseOrders")} icon={ClipboardList} />
            <BlockCard block={block("expenses")} icon={TrendingDown} />
            <BlockCard block={block("paymentVouchers")} icon={CreditCard} />
          </div>

          {/* Members */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <BlockCard block={block("newMembers")} icon={UserPlus} />
            <BlockCard block={block("ending")} icon={AlertCircle} />
            <BlockCard block={block("freezes")} icon={Snowflake} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Attendance" icon={UserCheck} error={err("attendance")}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Total check-ins</div><div className="text-xl font-bold">{num(data.attendance?.total)}</div></div>
                <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Unique members</div><div className="text-xl font-bold">{num(data.attendance?.uniqueMembers)}</div></div>
                <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Walk-ins</div><div className="text-xl font-bold">{num(data.attendance?.walkIns)}</div></div>
                <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Walk-in fees</div><div className="text-xl font-bold"><Money v={data.attendance?.walkInAmount} /></div></div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={hourly}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} minTickGap={8} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Check-ins" stroke="#3B82F6" strokeWidth={2} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </Section>

            <div className="space-y-6">
              <Section title="Follow-ups" icon={Users} error={err("leads")}>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Follow-ups due</div><div className="text-xl font-bold">{num(data.leads?.followUpsDue)}</div></div>
                  <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Follow-ups completed</div><div className="text-xl font-bold">{num(data.leads?.followUpsCompleted)}</div></div>
                </div>
              </Section>
              <BlockCard block={block("leads")} icon={Users} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
