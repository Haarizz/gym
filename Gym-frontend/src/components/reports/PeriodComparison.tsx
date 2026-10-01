import React, { useCallback, useEffect, useMemo, useState } from "react";
import { addDays, format, startOfMonth, subDays, subMonths, endOfMonth, differenceInCalendarDays } from "date-fns";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Loader2,
  Minus,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { CurrencyGlyph, useCurrency } from "../../utils/currency";
import { dashboardService, type RevenueGranularity, type RevenueSummary } from "../../utils/supabase/dashboard-service";

const ISO = "yyyy-MM-dd";
const CURRENT = "#2B7A78";
const PREVIOUS = "#94a3b8";
const EXPENSE = "#E63946";

const num = (v: unknown) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const money = (v: unknown) => num(v).toLocaleString(undefined, { maximumFractionDigits: 2 });

async function fetchSummary(from: Date, to: Date, granularity: RevenueGranularity): Promise<RevenueSummary> {
  const res = await dashboardService.getRevenueSummary(format(from, ISO), format(to, ISO), granularity);
  if (!res?.success || !res.data) throw new Error(res?.error || "Could not load analytics");
  return res.data;
}

interface Periods {
  today: RevenueSummary;
  yesterday: RevenueSummary;
  thisMonth: RevenueSummary;
  lastMonthSame: RevenueSummary;
  lastMonthFull: RevenueSummary;
}

type MetricKey =
  | "collection" | "cash" | "card" | "other" | "expenses" | "net" | "transactions"
  | "membership" | "services" | "merchandise" | "cafe" | "newMembers";

const METRICS: { key: MetricKey; label: string; money: boolean; lowerIsBetter?: boolean; bold?: boolean }[] = [
  { key: "collection", label: "Total Collection", money: true, bold: true },
  { key: "cash", label: "  Cash", money: true },
  { key: "card", label: "  Card", money: true },
  { key: "other", label: "  Online / Other", money: true },
  { key: "membership", label: "Membership Revenue", money: true },
  { key: "services", label: "PT & Services Revenue", money: true },
  { key: "merchandise", label: "Merchandise (POS)", money: true },
  { key: "cafe", label: "Cafe & F&B (POS)", money: true },
  { key: "expenses", label: "Expenses", money: true, lowerIsBetter: true },
  { key: "net", label: "Net Profit", money: true, bold: true },
  { key: "transactions", label: "Transactions", money: false },
  { key: "newMembers", label: "New Members", money: false },
];

function metric(s: RevenueSummary, key: MetricKey): number {
  switch (key) {
    case "collection": return num(s.totalCollection?.total);
    case "cash": return num(s.totalCollection?.cash);
    case "card": return num(s.totalCollection?.card);
    case "other": return num(s.totalCollection?.other);
    case "expenses": return num(s.expenses?.total);
    case "net": return num(s.netRevenue?.total);
    case "transactions": return num(s.totalCollection?.count);
    case "membership": return num(s.streams?.membership?.total);
    case "services": return num(s.streams?.services?.total);
    case "merchandise": return num(s.streams?.merchandise?.total);
    case "cafe": return num(s.streams?.cafe?.total);
    case "newMembers": return num(s.activeMembers?.newInPeriod);
  }
}

function changePct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null; // no baseline
  return ((current - previous) / Math.abs(previous)) * 100;
}

function Change({ current, previous, lowerIsBetter }: { current: number; previous: number; lowerIsBetter?: boolean }) {
  const pct = changePct(current, previous);
  if (pct === null) return <span className="text-xs text-muted-foreground">New</span>;
  if (Math.abs(pct) < 0.05) {
    return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3 w-3" />0%</span>;
  }
  const up = pct > 0;
  const good = lowerIsBetter ? !up : up;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${good ? "text-green-600" : "text-red-600"}`}>
      {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {up ? "+" : ""}{pct.toFixed(1)}%
    </span>
  );
}

const Value = ({ v, isMoney }: { v: number; isMoney: boolean }) =>
  isMoney ? <><CurrencyGlyph /> {money(v)}</> : <>{v.toLocaleString()}</>;

/**
 * Detailed period comparisons for Custom Reports: today vs yesterday and this month vs
 * last month (same period and full month), with collection, expenses and net profit
 * broken down by stream and payment method, plus trend charts.
 */
export function PeriodComparison() {
  const { currencyCode } = useCurrency();
  const [data, setData] = useState<Periods | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const dates = useMemo(() => {
    const today = new Date();
    const thisMonthStart = startOfMonth(today);
    const lastMonthStart = startOfMonth(subMonths(today, 1));
    const lastMonthEnd = endOfMonth(lastMonthStart);
    const elapsed = differenceInCalendarDays(today, thisMonthStart);
    const lastMonthSameEnd = addDays(lastMonthStart, elapsed) > lastMonthEnd ? lastMonthEnd : addDays(lastMonthStart, elapsed);
    return { today, yesterday: subDays(today, 1), thisMonthStart, lastMonthStart, lastMonthEnd, lastMonthSameEnd };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = dates;
      const [today, yesterday, thisMonth, lastMonthSame, lastMonthFull] = await Promise.all([
        fetchSummary(d.today, d.today, "hourly"),
        fetchSummary(d.yesterday, d.yesterday, "hourly"),
        fetchSummary(d.thisMonthStart, d.today, "daily"),
        fetchSummary(d.lastMonthStart, d.lastMonthSameEnd, "daily"),
        fetchSummary(d.lastMonthStart, d.lastMonthEnd, "daily"),
      ]);
      setData({ today, yesterday, thisMonth, lastMonthSame, lastMonthFull });
    } catch (e: any) {
      setError(e?.message || "Could not load analytics");
    } finally {
      setLoading(false);
    }
  }, [dates]);

  useEffect(() => { load(); }, [load]);

  const hourly = useMemo(() => {
    if (!data) return [];
    return data.today.trend.map((p, i) => ({
      hour: p.label,
      Today: num(p.revenue),
      Yesterday: num(data.yesterday.trend[i]?.revenue),
    }));
  }, [data]);

  const daily = useMemo(() => {
    if (!data) return [];
    const days = Math.max(data.thisMonth.trend.length, data.lastMonthFull.trend.length);
    let cumThis = 0;
    let cumLast = 0;
    return Array.from({ length: days }, (_, i) => {
      const t = data.thisMonth.trend[i];
      const l = data.lastMonthFull.trend[i];
      if (t) cumThis += num(t.revenue);
      if (l) cumLast += num(l.revenue);
      return {
        day: String(i + 1),
        "This Month": t ? num(t.revenue) : null,
        "Last Month": l ? num(l.revenue) : null,
        "This Month (cumulative)": t ? cumThis : null,
        "Last Month (cumulative)": l ? cumLast : null,
      };
    });
  }, [data]);

  const streams = useMemo(() => {
    if (!data) return [];
    const keys: { key: MetricKey; label: string }[] = [
      { key: "membership", label: "Membership" },
      { key: "services", label: "PT & Services" },
      { key: "merchandise", label: "Merchandise" },
      { key: "cafe", label: "Cafe & F&B" },
    ];
    return keys.map(({ key, label }) => ({
      stream: label,
      "This Month": metric(data.thisMonth, key),
      "Last Month (same period)": metric(data.lastMonthSame, key),
    }));
  }, [data]);

  const profit = useMemo(() => {
    if (!data) return [];
    const row = (name: string, s: RevenueSummary) => ({
      period: name,
      Collection: metric(s, "collection"),
      Expenses: metric(s, "expenses"),
      "Net Profit": metric(s, "net"),
    });
    return [
      row("Last Month (full)", data.lastMonthFull),
      row("Last Month (same period)", data.lastMonthSame),
      row("This Month", data.thisMonth),
    ];
  }, [data]);

  const tooltipMoney = (v: unknown) => `${currencyCode} ${money(v)}`;
  const d = dates;

  if (loading && !data) {
    return (
      <Card className="border-primary/10 shadow-md mb-6">
        <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading comparisons…
        </CardContent>
      </Card>
    );
  }
  if (error || !data) {
    return (
      <Card className="border-primary/10 shadow-md mb-6">
        <CardContent className="py-8 flex items-center justify-between gap-3">
          <span className="text-sm text-red-600">{error || "Could not load analytics"}</span>
          <Button size="sm" variant="outline" onClick={load} data-print-hide>Retry</Button>
        </CardContent>
      </Card>
    );
  }

  const monthLabel = format(d.thisMonthStart, "MMMM yyyy");
  const lastMonthLabel = format(d.lastMonthStart, "MMMM yyyy");

  return (
    <div className="space-y-6 mb-6">
      {/* Headline cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Today's Collection", cur: metric(data.today, "collection"), prev: metric(data.yesterday, "collection"), vs: "vs yesterday" },
          { title: "This Month's Collection", cur: metric(data.thisMonth, "collection"), prev: metric(data.lastMonthSame, "collection"), vs: "vs same period last month" },
          { title: "This Month's Net Profit", cur: metric(data.thisMonth, "net"), prev: metric(data.lastMonthSame, "net"), vs: "vs same period last month" },
          { title: "Last Month's Net Profit", cur: metric(data.lastMonthFull, "net"), prev: null, vs: lastMonthLabel },
        ].map((c) => (
          <Card key={c.title} className="border-primary/10 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">{c.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${c.cur < 0 ? "text-red-700" : "text-teal-700"}`}><CurrencyGlyph /> {money(c.cur)}</div>
              <div className="flex items-center gap-2 mt-1">
                {c.prev !== null && <Change current={c.cur} previous={c.prev} />}
                <span className="text-xs text-muted-foreground">{c.vs}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Today vs Yesterday */}
      <Card className="border-primary/10 shadow-md">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" />Today vs Yesterday</CardTitle>
            <CardDescription>{format(d.today, "dd/MM/yyyy")} compared with {format(d.yesterday, "dd/MM/yyyy")}</CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading} data-print-hide>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead>Metric</TableHead>
                <TableHead className="text-right">Today</TableHead>
                <TableHead className="text-right">Yesterday</TableHead>
                <TableHead className="text-right">Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {METRICS.map((m) => {
                const cur = metric(data.today, m.key);
                const prev = metric(data.yesterday, m.key);
                return (
                  <TableRow key={m.key}>
                    <TableCell className={m.bold ? "font-semibold" : m.label.startsWith("  ") ? "pl-6 text-muted-foreground" : ""}>{m.label.trim()}</TableCell>
                    <TableCell className={`text-right ${m.bold ? "font-semibold" : ""}`}><Value v={cur} isMoney={m.money} /></TableCell>
                    <TableCell className="text-right text-muted-foreground"><Value v={prev} isMoney={m.money} /></TableCell>
                    <TableCell className="text-right"><Change current={cur} previous={prev} lowerIsBetter={m.lowerIsBetter} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div>
            <p className="text-sm font-medium mb-2">Collection by hour</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={hourly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" minTickGap={18} tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={tooltipMoney} />
                <Legend />
                <Line type="monotone" dataKey="Today" stroke={CURRENT} strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="Yesterday" stroke={PREVIOUS} strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* This Month vs Last Month */}
      <Card className="border-primary/10 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />This Month vs Last Month</CardTitle>
          <CardDescription>
            {monthLabel} so far ({format(d.thisMonthStart, "dd/MM")}–{format(d.today, "dd/MM")}) compared with the same days of {lastMonthLabel}
            ({format(d.lastMonthStart, "dd/MM")}–{format(d.lastMonthSameEnd, "dd/MM")}) and the whole of {lastMonthLabel}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Metric</TableHead>
                  <TableHead className="text-right">This Month (to date)</TableHead>
                  <TableHead className="text-right">Last Month (same period)</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                  <TableHead className="text-right">Last Month (full)</TableHead>
                  <TableHead className="text-right">This Month vs Full</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {METRICS.map((m) => {
                  const cur = metric(data.thisMonth, m.key);
                  const same = metric(data.lastMonthSame, m.key);
                  const full = metric(data.lastMonthFull, m.key);
                  return (
                    <TableRow key={m.key}>
                      <TableCell className={m.bold ? "font-semibold" : m.label.startsWith("  ") ? "pl-6 text-muted-foreground" : ""}>{m.label.trim()}</TableCell>
                      <TableCell className={`text-right ${m.bold ? "font-semibold" : ""}`}><Value v={cur} isMoney={m.money} /></TableCell>
                      <TableCell className="text-right text-muted-foreground"><Value v={same} isMoney={m.money} /></TableCell>
                      <TableCell className="text-right"><Change current={cur} previous={same} lowerIsBetter={m.lowerIsBetter} /></TableCell>
                      <TableCell className="text-right text-muted-foreground"><Value v={full} isMoney={m.money} /></TableCell>
                      <TableCell className="text-right">
                        {full === 0 ? <span className="text-xs text-muted-foreground">—</span>
                          : <span className="text-xs text-muted-foreground">{((cur / full) * 100).toFixed(0)}% reached</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium mb-2">Cumulative collection by day of month</p>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={tooltipMoney} labelFormatter={(l) => `Day ${l}`} />
                  <Legend />
                  <Line type="monotone" dataKey="This Month (cumulative)" stroke={CURRENT} strokeWidth={2} dot={false} connectNulls={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="Last Month (cumulative)" stroke={PREVIOUS} strokeWidth={2} strokeDasharray="5 5" dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Daily collection</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={tooltipMoney} labelFormatter={(l) => `Day ${l}`} />
                  <Legend />
                  <Bar dataKey="This Month" fill={CURRENT} isAnimationActive={false} />
                  <Bar dataKey="Last Month" fill={PREVIOUS} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Revenue by stream</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={streams}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stream" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={tooltipMoney} />
                  <Legend />
                  <Bar dataKey="This Month" fill={CURRENT} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="Last Month (same period)" fill={PREVIOUS} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <p className="text-sm font-medium mb-2 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" />Profit comparison</p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={profit}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={tooltipMoney} />
                  <Legend />
                  <Bar dataKey="Collection" fill={CURRENT} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="Expenses" fill={EXPENSE} radius={[4, 4, 0, 0]} isAnimationActive={false} />
                  <Bar dataKey="Net Profit" fill="#0f766e" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
