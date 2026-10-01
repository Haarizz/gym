import React, { useState } from "react";
import { format, isValid, parseISO, subDays } from "date-fns";
import {
  AlertCircle, BarChart3, CalendarDays, ClipboardList, CreditCard, Download, FileText, Loader2, Printer,
  Receipt, ShoppingBag, ShoppingCart, Snowflake, TrendingDown, TrendingUp, UserCheck, UserPlus, Users, Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DatePickerField } from "../shared/DatePickerField";
import { CurrencyGlyph, useCurrency } from "../../utils/currency";
import { authService } from "../../utils/supabase/auth-service";
import { buildXlsx, downloadBlob, type XlsxCell } from "../../utils/xlsx-export";

const backendBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";
const TEAL = "#2B7A78";
const CHART_COLORS = ["#2B7A78", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899", "#10B981"];

type Row = Record<string, any>;
interface DayReportData {
  date: string;
  revenue: any | null;
  receipts: Row[] | null;
  posSales: Row[] | null;
  salesInvoices: Row[] | null;
  supplierBills: Row[] | null;
  purchaseOrders: Row[] | null;
  expenses: Row[] | null;
  paymentVouchers: Row[] | null;
  membership: { newMembers: Row[]; expired: Row[]; renewals: number; freezes: Row[] } | null;
  attendance: { total: number; uniqueMembers: number; walkIns: number; walkInAmount: number; byHour: { hour: number; checkIns: number }[] } | null;
  leads: { created: Row[]; followUpsDue: number; followUpsCompleted: number } | null;
  errors: Record<string, string>;
}

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const money = (v: unknown) => num(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const time = (v?: string | null) => {
  if (!v) return "—";
  const d = parseISO(v);
  return isValid(d) ? format(d, "hh:mm a") : "—";
};
const sum = (rows: Row[] | null | undefined, key: string) => (rows || []).reduce((s, r) => s + num(r[key]), 0);
const hourLabel = (h: number) => format(new Date(2000, 0, 1, h), "h a");

const Money = ({ v }: { v: unknown }) => <><CurrencyGlyph /> {money(v)}</>;

/** A titled card holding one section's table, with count/total and its own empty and error states */
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

const Empty = ({ text = "Nothing recorded on this day." }: { text?: string }) => (
  <p className="text-sm text-muted-foreground py-4 text-center">{text}</p>
);

/**
 * Reports → Day Report: pick a date and generate everything that happened that day —
 * collections, member receipts, POS sales, invoices, purchases, expenses, payments out,
 * membership activity, attendance and leads. Printable and exportable to Excel.
 */
export function DayReport() {
  const { currencyCode } = useCurrency();
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [data, setData] = useState<DayReportData | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!date) { toast.error("Pick a date first"); return; }
    setLoading(true);
    try {
      const res = await authService.makeAuthenticatedRequest(`${backendBaseUrl}/reports/day?date=${date}`);
      if (!res.ok) throw new Error(res.status === 500 ? "The server couldn't build this report (is the backend up to date?)" : `Request failed (${res.status})`);
      const body = await res.json();
      setData(body.data as DayReportData);
    } catch (e: any) {
      toast.error("Failed to generate the day report", { description: e?.message });
    } finally {
      setLoading(false);
    }
  };

  const err = (k: string) => data?.errors?.[k];
  const rev = data?.revenue;
  const collection = num(rev?.totalCollection?.total);
  const expensesTotal = sum(data?.expenses, "amount");
  const purchasesTotal = sum(data?.supplierBills, "total");
  const paymentsOut = sum(data?.paymentVouchers, "amount");
  const net = collection - expensesTotal;
  const dateLabel = data ? format(parseISO(data.date), "EEEE, dd MMMM yyyy") : "";

  const hourly = data
    ? Array.from({ length: 24 }, (_, h) => ({
        hour: hourLabel(h),
        Collection: num(rev?.trend?.[h]?.revenue),
        "Check-ins": num(data.attendance?.byHour?.[h]?.checkIns),
      })).filter((_, h) => h >= 5 || num(rev?.trend?.[h]?.revenue) > 0 || num(data.attendance?.byHour?.[h]?.checkIns) > 0)
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

  const exportExcel = () => {
    if (!data) return;
    const rows: XlsxCell[][] = [["Day Report", dateLabel], ["Currency", currencyCode], []];
    const bold: number[] = [0];
    const add = (title: string, header: string[], body: XlsxCell[][]) => {
      rows.push([title]); bold.push(rows.length - 1);
      rows.push(header); bold.push(rows.length - 1);
      if (body.length === 0) rows.push(["Nothing recorded"]); else rows.push(...body);
      rows.push([]);
    };
    add("Summary", ["Metric", "Value"], [
      ["Total Collection", collection], ["Expenses", expensesTotal], ["Net (collection − expenses)", net],
      ["Purchases (supplier bills)", purchasesTotal], ["Payments Out (vouchers)", paymentsOut],
      ["Member Receipts", (data.receipts || []).length], ["POS Sales", (data.posSales || []).length],
      ["Check-ins", num(data.attendance?.total)], ["New Members", (data.membership?.newMembers || []).length],
      ["Renewals", num(data.membership?.renewals)],
    ]);
    add("Member Receipts", ["Time", "Receipt No", "Member", "Type", "Plan", "Amount", "Paid", "Method", "Status", "Processed By"],
      (data.receipts || []).map((r) => [time(r.time), r.receiptNo, r.memberName, r.type, r.plan, num(r.amount), num(r.paid), r.method, r.status, r.processedBy]));
    add("POS Sales", ["Time", "Number", "Customer", "Subtotal", "Discount", "Tax", "Total", "Method", "Status"],
      (data.posSales || []).map((r) => [time(r.time), r.number, r.customer, num(r.subtotal), num(r.discount), num(r.tax), num(r.total), r.method, r.status]));
    add("Sales Invoices", ["Number", "Customer", "Total", "Paid", "Method", "Status"],
      (data.salesInvoices || []).map((r) => [r.number, r.customer, num(r.total), num(r.paid), r.method, r.status]));
    add("Purchases — Supplier Bills", ["Bill No", "Supplier Invoice", "Supplier", "Total", "Paid", "Status"],
      (data.supplierBills || []).map((r) => [r.number, r.supplierInvoice, r.supplier, num(r.total), num(r.paid), r.status]));
    add("Purchase Orders", ["PO No", "Supplier", "Total", "Status"],
      (data.purchaseOrders || []).map((r) => [r.number, r.supplier, num(r.total), r.status]));
    add("Expenses", ["Vendor", "Category", "Amount", "Status", "Payment", "Notes"],
      (data.expenses || []).map((r) => [r.vendor, r.category, num(r.amount), r.status, r.paymentStatus, r.notes]));
    add("Payment Vouchers", ["Voucher No", "Payee", "Bill No", "Amount", "Method", "Status"],
      (data.paymentVouchers || []).map((r) => [r.number, r.payee, r.billNo, num(r.amount), r.method, r.status]));
    add("New Members", ["Member ID", "Name", "Phone", "Plan", "Status"],
      (data.membership?.newMembers || []).map((r) => [r.memberId, r.name, r.phone, r.plan, r.status]));
    add("Memberships Expiring Today", ["Member ID", "Name", "Phone", "Plan", "Status"],
      (data.membership?.expired || []).map((r) => [r.memberId, r.name, r.phone, r.plan, r.status]));
    add("Freezes", ["Member ID", "Name", "Action", "Until", "Days", "Reason"],
      (data.membership?.freezes || []).map((r) => [r.memberId, r.memberName, r.action, r.plannedEnd, r.days, r.reason]));
    add("Leads Created", ["Name", "Source", "Status"], (data.leads?.created || []).map((r) => [r.name, r.source, r.status]));
    const blob = buildXlsx("Day Report", rows, { boldRows: bold, columnWidths: [22, 22, 24, 16, 16, 14, 14, 14, 14, 16] });
    downloadBlob(blob, `day-report-${data.date}.xlsx`);
    toast.success("Day report exported");
  };

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
          <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Day Report</CardTitle>
          <CardDescription>Everything that happened on a single day — sales, purchases, expenses, members, attendance and more</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-3">
            <div style={{ width: 220 }}>
              <Label className="mb-2 block">Date</Label>
              <DatePickerField value={date} onChange={setDate} max={format(new Date(), "yyyy-MM-dd")} clearable={false} />
            </div>
            <Button variant="outline" size="sm" onClick={() => setDate(format(new Date(), "yyyy-MM-dd"))}>Today</Button>
            <Button variant="outline" size="sm" onClick={() => setDate(format(subDays(new Date(), 1), "yyyy-MM-dd"))}>Yesterday</Button>
            <Button onClick={generate} disabled={loading || !date} className="bg-primary text-white">
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              Generate Report
            </Button>
            {data && (
              <>
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="h-4 w-4 mr-2" />Print
                </Button>
                <Button variant="outline" onClick={exportExcel}>
                  <Download className="h-4 w-4 mr-2" />Export Excel
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {!data ? (
        <Card className="border-primary/10 shadow-md">
          <CardContent className="py-16 text-center text-muted-foreground">
            <CalendarDays className="h-10 w-10 mx-auto mb-3 text-primary" />
            <p>Pick a date and click <strong>Generate Report</strong> to see everything for that day.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div>
            <h2 className="text-xl font-bold">Day Report — {dateLabel}</h2>
            <p className="text-sm text-muted-foreground">Generated {format(new Date(), "dd/MM/yyyy hh:mm a")} · Currency {currencyCode}</p>
          </div>

          {/* Headline figures */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Collection", value: <Money v={collection} />, sub: `${num(rev?.totalCollection?.count)} transactions`, icon: Wallet, tone: "text-emerald-700", chip: "bg-emerald-50" },
              { label: "Expenses", value: <Money v={expensesTotal} />, sub: `${(data.expenses || []).length} expenses`, icon: TrendingDown, tone: "text-red-700", chip: "bg-red-50" },
              { label: "Net (Collection − Expenses)", value: <Money v={net} />, sub: net >= 0 ? "Profit for the day" : "Loss for the day", icon: TrendingUp, tone: net >= 0 ? "text-teal-700" : "text-red-700", chip: "bg-teal-50" },
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Collection & Check-ins by Hour" icon={BarChart3} error={err("revenue") || err("attendance")}>
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
            <div className="grid grid-cols-1 gap-6">
              <Section title="Payment Methods" icon={Wallet} error={err("revenue")}>
                {methods.length === 0 ? <Empty text="No payments received on this day." /> : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={methods} dataKey="value" nameKey="name" outerRadius={70} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} isAnimationActive={false}>
                        {methods.map((_: Row, i: number) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `${currencyCode} ${money(v)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Section>
            </div>
          </div>

          <Section title="Revenue by Stream" icon={TrendingUp} error={err("revenue")}>
            {streams.every((s) => s.amount === 0) ? <Empty text="No revenue recorded on this day." /> : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={streams}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stream" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => `${currencyCode} ${money(v)}`} />
                  <Bar dataKey="amount" name="Revenue" fill={TEAL} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Section>

          {/* Sales */}
          <Section title="Member Receipts" icon={Receipt} description="Memberships, renewals, add-ons, day passes and balance payments"
            count={(data.receipts || []).length} total={sum(data.receipts, "paid")} error={err("receipts")}>
            {(data.receipts || []).length === 0 ? <Empty /> : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Time</TableHead><TableHead>Receipt No</TableHead><TableHead>Member</TableHead><TableHead>Type</TableHead>
                    <TableHead>Plan</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Paid</TableHead>
                    <TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead>Processed By</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(data.receipts || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{time(r.time)}</TableCell>
                        <TableCell className="font-mono text-sm">{r.receiptNo}</TableCell>
                        <TableCell><div className="font-medium">{r.memberName}</div><div className="text-xs text-muted-foreground">{r.memberId}</div></TableCell>
                        <TableCell><Badge variant="outline">{r.type || "—"}</Badge></TableCell>
                        <TableCell>{r.plan || "—"}</TableCell>
                        <TableCell className="text-right"><Money v={r.amount} /></TableCell>
                        <TableCell className="text-right text-emerald-700 font-medium"><Money v={r.paid} /></TableCell>
                        <TableCell>{r.method || "—"}</TableCell>
                        <TableCell>{r.status || "—"}</TableCell>
                        <TableCell>{r.processedBy || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Section>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="POS Sales" icon={ShoppingBag} count={(data.posSales || []).length} total={sum(data.posSales, "total")} error={err("posSales")}>
              {(data.posSales || []).length === 0 ? <Empty /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Time</TableHead><TableHead>Number</TableHead><TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead><TableHead>Method</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(data.posSales || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{time(r.time)}</TableCell>
                        <TableCell className="font-mono text-sm">{r.number}</TableCell>
                        <TableCell>{r.customer || "Walk-in"}</TableCell>
                        <TableCell className="text-right font-medium"><Money v={r.total} /></TableCell>
                        <TableCell>{r.method || "—"}</TableCell>
                        <TableCell>{r.status || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>

            <Section title="Sales Invoices" icon={FileText} count={(data.salesInvoices || []).length} total={sum(data.salesInvoices, "total")} error={err("salesInvoices")}>
              {(data.salesInvoices || []).length === 0 ? <Empty /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Number</TableHead><TableHead>Customer</TableHead><TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(data.salesInvoices || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.number}</TableCell>
                        <TableCell>{r.customer || "—"}</TableCell>
                        <TableCell className="text-right"><Money v={r.total} /></TableCell>
                        <TableCell className="text-right"><Money v={r.paid} /></TableCell>
                        <TableCell>{r.status || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>
          </div>

          {/* Purchases & spending */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Section title="Purchases — Supplier Bills" icon={ShoppingCart} count={(data.supplierBills || []).length} total={purchasesTotal} error={err("supplierBills")}>
              {(data.supplierBills || []).length === 0 ? <Empty /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Bill No</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(data.supplierBills || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.number}{r.supplierInvoice ? <div className="text-xs text-muted-foreground">Inv {r.supplierInvoice}</div> : null}</TableCell>
                        <TableCell>{r.supplier || "—"}</TableCell>
                        <TableCell className="text-right"><Money v={r.total} /></TableCell>
                        <TableCell className="text-right"><Money v={r.paid} /></TableCell>
                        <TableCell>{r.status || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>

            <Section title="Purchase Orders" icon={ClipboardList} count={(data.purchaseOrders || []).length} total={sum(data.purchaseOrders, "total")} error={err("purchaseOrders")}>
              {(data.purchaseOrders || []).length === 0 ? <Empty /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>PO No</TableHead><TableHead>Supplier</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(data.purchaseOrders || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.number}</TableCell>
                        <TableCell>{r.supplier || "—"}</TableCell>
                        <TableCell className="text-right"><Money v={r.total} /></TableCell>
                        <TableCell>{r.status || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>

            <Section title="Expenses" icon={TrendingDown} count={(data.expenses || []).length} total={expensesTotal} error={err("expenses")}>
              {(data.expenses || []).length === 0 ? <Empty /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Vendor</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(data.expenses || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.vendor || "—"}{r.notes ? <div className="text-xs text-muted-foreground truncate max-w-[220px]">{r.notes}</div> : null}</TableCell>
                        <TableCell>{r.category || "—"}</TableCell>
                        <TableCell className="text-right text-red-700"><Money v={r.amount} /></TableCell>
                        <TableCell>{r.status || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>

            <Section title="Payment Vouchers (Money Out)" icon={CreditCard} count={(data.paymentVouchers || []).length} total={paymentsOut} error={err("paymentVouchers")}>
              {(data.paymentVouchers || []).length === 0 ? <Empty /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Voucher No</TableHead><TableHead>Payee</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Method</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {(data.paymentVouchers || []).map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-sm">{r.number}</TableCell>
                        <TableCell>{r.payee || "—"}{r.billNo ? <div className="text-xs text-muted-foreground">Bill {r.billNo}</div> : null}</TableCell>
                        <TableCell className="text-right"><Money v={r.amount} /></TableCell>
                        <TableCell>{r.method || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Section>
          </div>

          {/* Members */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Section title="New Members" icon={UserPlus} count={(data.membership?.newMembers || []).length} error={err("membership")}>
              {(data.membership?.newMembers || []).length === 0 ? <Empty text="No new members on this day." /> : (
                <ul className="space-y-2">
                  {(data.membership?.newMembers || []).map((m) => (
                    <li key={m.id} className="flex items-center justify-between text-sm">
                      <span><span className="font-medium">{m.name}</span> <span className="text-muted-foreground text-xs">{m.memberId}</span></span>
                      <Badge variant="outline">{m.plan || "—"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Memberships Ending" icon={AlertCircle} description="Memberships whose expiry date is this day" count={(data.membership?.expired || []).length} error={err("membership")}>
              {(data.membership?.expired || []).length === 0 ? <Empty text="No memberships end on this day." /> : (
                <ul className="space-y-2">
                  {(data.membership?.expired || []).map((m) => (
                    <li key={m.id} className="flex items-center justify-between text-sm">
                      <span><span className="font-medium">{m.name}</span> <span className="text-muted-foreground text-xs">{m.phone || m.memberId}</span></span>
                      <Badge variant="outline">{m.status || "—"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Freezes / Unfreezes" icon={Snowflake} count={(data.membership?.freezes || []).length} error={err("membership")}>
              {(data.membership?.freezes || []).length === 0 ? <Empty text="No freezes on this day." /> : (
                <ul className="space-y-2">
                  {(data.membership?.freezes || []).map((f, i) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span><span className="font-medium">{f.memberName}</span>{f.reason ? <span className="text-muted-foreground text-xs"> · {f.reason}</span> : null}</span>
                      <Badge className={f.action === "Freeze" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>{f.action}{f.action === "Freeze" && f.days ? ` ${f.days}d` : ""}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
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

            <Section title="Leads & Follow-ups" icon={Users} count={(data.leads?.created || []).length} error={err("leads")}>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Follow-ups due</div><div className="text-xl font-bold">{num(data.leads?.followUpsDue)}</div></div>
                <div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">Follow-ups completed</div><div className="text-xl font-bold">{num(data.leads?.followUpsCompleted)}</div></div>
              </div>
              {(data.leads?.created || []).length === 0 ? <Empty text="No new leads on this day." /> : (
                <ul className="space-y-2">
                  {(data.leads?.created || []).map((l) => (
                    <li key={l.id} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{l.name || "—"}</span>
                      <span className="flex gap-2"><Badge variant="outline">{l.source || "—"}</Badge><Badge variant="secondary">{l.status || "—"}</Badge></span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}
    </div>
  );
}
