import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  BadgeDollarSign, Banknote, Brain, Building2, CalendarClock, Clock, Download, FileText, HandCoins, Loader2, Printer,
  Receipt, RefreshCw, Sparkles, TrendingUp, Users, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { PageHeader } from "../components/workforce/ui";
import {
  BarRows, ChartTip, Delta, EARNING_PARTS, HeroKpi, Insights, Legend, PeriodFilter, PersonCell, ReportTable, Seg, SmallKpi,
  compactNumber, compareRange, fmtNum, fmtPct, pi as styles, presetRange, usePayrollPalette,
  type Col, type CompareMode, type InsightItem, type MonthRange, type Preset,
} from "../components/workforce/payroll-insights";
import { useCurrency } from "../utils/currency";
import { useBranch } from "../utils/branch-context";
import { buildXlsx, downloadBlob, type XlsxCell } from "../utils/xlsx-export";
import { printHtml } from "../utils/print-html";
import {
  addMonths, avgHeadcount, costPerHead, groupBy, pctChange, payrollErrorMessage, payrollReportService,
  rangeText, share, totals, ym, type PayrollDataset, type PayrollRecord, type Totals,
} from "../utils/supabase/payroll-report-service";

interface Props { onNavigate?: (section: string, params?: Record<string, any>) => void }

type TrendView = "breakdown" | "compare" | "perHead" | "headcount" | "table";

interface MonthRow {
  month: string;
  label: string;
  basic: number; allowances: number; overtime: number; commission: number; unitemised: number;
  gross: number; deductions: number; net: number; paid: number; unpaid: number;
  headcount: number; perHead: number;
  previousGross: number | null; previousPerHead: number | null;
}

interface DeptRow {
  department: string; headcount: number; gross: number; share: number; perHead: number;
  overtime: number; otShare: number; net: number; previousGross: number; changePct: number | null;
}

export function PayrollAnalytics({ onNavigate }: Props) {
  const { formatCurrency, formatCurrencyText, currencyCode } = useCurrency();
  const { activeBranchId, activeBranchName, isAllBranches } = useBranch();
  const palette = usePayrollPalette();

  const now = ym(new Date());
  const [preset, setPreset] = useState<Preset>("last-6");
  const [custom, setCustom] = useState<MonthRange>({ from: addMonths(now, -5), to: now });
  const [compare, setCompare] = useState<CompareMode>("previous");
  const [department, setDepartment] = useState("all");
  const [includeDraft, setIncludeDraft] = useState(false);
  const [data, setData] = useState<PayrollDataset | null>(null);
  const [prev, setPrev] = useState<PayrollDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trendView, setTrendView] = useState<TrendView>("breakdown");

  const range = useMemo(() => presetRange(preset, custom), [preset, custom]);
  const cmp = useMemo(() => compareRange(range, compare), [range, compare]);
  const cmpText = rangeText(cmp.from, cmp.to);

  const money = useCallback((n: number | null | undefined) =>
    n == null ? "—" : formatCurrency(Number(n), { maximumFractionDigits: 0 }), [formatCurrency]);
  const money2 = useCallback((n: number | null | undefined) =>
    n == null ? "—" : formatCurrency(Number(n), { maximumFractionDigits: 2 }), [formatCurrency]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, b] = await Promise.all([
        payrollReportService.get(range.from, range.to),
        payrollReportService.get(cmp.from, cmp.to),
      ]);
      setData(a);
      setPrev(b);
    } catch (err) {
      setError(payrollErrorMessage(err, "Couldn't load payroll analytics"));
    } finally {
      setLoading(false);
    }
  }, [range, cmp]);

  useEffect(() => { load(); }, [load, activeBranchId]);

  // ── Scope ──────────────────────────────────────────────────────────────
  const departments = useMemo(() => {
    const set = new Set<string>();
    data?.records.forEach(r => set.add(r.department));
    prev?.records.forEach(r => set.add(r.department));
    data?.staff.departments.forEach(d => set.add(d.department));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data, prev]);

  const inScope = useCallback((r: PayrollRecord) =>
    (includeDraft || r.status !== "Draft") && (department === "all" || r.department === department), [includeDraft, department]);

  const cur = useMemo(() => (data?.records ?? []).filter(inScope), [data, inScope]);
  const before = useMemo(() => (prev?.records ?? []).filter(inScope), [prev, inScope]);
  const T = useMemo(() => totals(cur), [cur]);
  const P = useMemo(() => totals(before), [before]);
  // Averages are over months that had payroll, so an unpaid current month doesn't halve them.
  const monthCount = T.months || 1;
  const prevMonthCount = P.months || 1;

  const monthly: MonthRow[] = useMemo(() => {
    if (!data) return [];
    const byMonth = groupBy(cur, r => r.month);
    const prevByMonth = groupBy(before, r => r.month);
    return data.months.map((m, i) => {
      const t = totals(byMonth.get(m.month) ?? []);
      const pm = prev?.months[i]?.month;
      const pt = pm ? totals(prevByMonth.get(pm) ?? []) : null;
      return {
        month: m.month, label: m.label,
        basic: t.basic, allowances: t.allowances, overtime: t.overtime, commission: t.commission, unitemised: t.unitemised,
        gross: t.gross, deductions: t.totalDeductions, net: t.net, paid: t.paid, unpaid: t.unpaid,
        headcount: t.employees, perHead: t.employees ? t.gross / t.employees : 0,
        previousGross: pt ? pt.gross : null,
        previousPerHead: pt && pt.employees ? pt.gross / pt.employees : pt ? 0 : null,
      };
    });
  }, [data, prev, cur, before]);

  const deptRows: DeptRow[] = useMemo(() => {
    const now = groupBy(cur, r => r.department);
    const was = groupBy(before, r => r.department);
    const names = new Set([...now.keys(), ...was.keys()]);
    return [...names].map(d => {
      const t = totals(now.get(d) ?? []);
      const p = totals(was.get(d) ?? []);
      return {
        department: d, headcount: avgHeadcount(t, monthCount), gross: t.gross, share: share(t.gross, T.gross),
        perHead: costPerHead(t), overtime: t.overtime, otShare: share(t.overtime, t.gross), net: t.net,
        previousGross: p.gross, changePct: pctChange(t.gross, p.gross),
      };
    }).filter(r => r.gross || r.previousGross).sort((a, b) => b.gross - a.gross);
  }, [cur, before, T.gross, monthCount]);

  const employees = useMemo(() => {
    const now = groupBy(cur, r => r.employeeCode);
    const was = groupBy(before, r => r.employeeCode);
    return [...now.entries()].map(([code, rows]) => {
      const t = totals(rows);
      const p = totals(was.get(code) ?? []);
      const avg = t.rows ? t.gross / t.rows : 0;
      const prevAvg = p.rows ? p.gross / p.rows : 0;
      return {
        code, name: rows[0].name, department: rows[0].department, designation: rows[0].designation,
        t, avg, prevAvg, changePct: pctChange(avg, prevAvg),
      };
    });
  }, [cur, before]);

  const topEarners = useMemo(() => [...employees].sort((a, b) => b.t.gross - a.t.gross).slice(0, 8), [employees]);
  const otLeaders = useMemo(() => employees.filter(e => e.t.overtime > 0 || e.t.otHours > 0)
    .sort((a, b) => b.t.overtime - a.t.overtime).slice(0, 8), [employees]);

  const methods = useMemo(() => {
    const m = new Map<string, { amount: number; count: number }>();
    for (const r of cur) {
      if (r.status !== "Paid") continue;
      for (const x of r.methods) {
        const v = m.get(x.mode) ?? { amount: 0, count: 0 };
        v.amount += x.amount; v.count += 1;
        m.set(x.mode, v);
      }
    }
    const total = [...m.values()].reduce((s, v) => s + v.amount, 0);
    return [...m.entries()].map(([mode, v]) => ({ mode, ...v, share: share(v.amount, total) })).sort((a, b) => b.amount - a.amount);
  }, [cur]);

  const statusByMonth = useMemo(() => {
    if (!data) return [];
    const runs = new Map(data.runs.map(r => [r.month, r]));
    const byMonth = groupBy((data.records ?? []).filter(r => department === "all" || r.department === department), r => r.month);
    return data.months.map(m => {
      const rows = byMonth.get(m.month) ?? [];
      const t = totals(rows);
      const run = runs.get(m.month);
      return {
        month: m.month, label: m.label, run, employees: t.employees,
        net: t.net, paid: t.paid, unpaid: t.unpaid, draft: t.draft,
        manual: rows.filter(r => r.source === "manual").length,
      };
    }).reverse();
  }, [data, department]);

  const advances = useMemo(() => {
    const open = (data?.advances.open ?? []).filter(a => department === "all" || a.department === department);
    return { open, outstanding: open.reduce((s, a) => s + a.balance, 0) };
  }, [data, department]);

  const draftRows = (data?.records ?? []).filter(r => r.status === "Draft" && (department === "all" || r.department === department));
  const unpaidRows = cur.filter(r => r.status === "Unpaid");
  const netOnly = cur.filter(r => r.netOnly).length;

  // ── Insights ───────────────────────────────────────────────────────────
  const insights: InsightItem[] = useMemo(() => {
    if (!data) return [];
    const list: InsightItem[] = [];
    if (!T.rows) {
      list.push({
        type: "info", rank: 1, title: "No payroll recorded for this period",
        detail: draftRows.length
          ? "There's a draft payroll run — approve it (or tick “Include drafts”) to see it here."
          : "Generate payroll or record salary payments and the analysis appears here.",
      });
      return list;
    }
    if (unpaidRows.length) {
      const months = [...new Set(unpaidRows.map(r => r.monthLabel))].join(", ");
      const names = unpaidRows.slice(0, 3).map(r => `${r.name} (${money(r.net)})`).join(", ");
      list.push({
        type: "critical", rank: 1, title: `${unpaidRows.length} approved ${unpaidRows.length === 1 ? "salary is" : "salaries are"} still unpaid`,
        detail: `${money(T.unpaid)} for ${months}: ${names}${unpaidRows.length > 3 ? ` and ${unpaidRows.length - 3} more` : ""}.`,
      });
    }
    if (draftRows.length && !includeDraft) {
      const months = [...new Set(draftRows.map(r => r.monthLabel))].join(", ");
      list.push({
        type: "info", rank: 3, title: `Payroll for ${months} is still a draft`,
        detail: `${money(draftRows.reduce((s, r) => s + r.gross, 0))} gross for ${draftRows.length} ${draftRows.length === 1 ? "employee" : "employees"} isn't counted in these figures until the run is approved.`,
      });
    }
    // Every insight is computed from the rows above and states the records it's based on —
    // no estimates, no assumed breakdowns.
    const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
    const monthsOf = (rows: PayrollRecord[]) => {
      const labels = [...new Set([...rows].sort((a, b) => a.month.localeCompare(b.month)).map(r => r.monthLabel))];
      return labels.length > 3 ? plural(labels.length, "month") : labels.join(", ");
    };
    const basis = (t: Totals, rows: PayrollRecord[]) =>
      `${money(t.gross)} for ${plural(t.employees, "employee")} (${monthsOf(rows)})`;
    const itemised = T.unitemised === 0 && P.unitemised === 0;

    const change = P.rows ? pctChange(T.gross, P.gross) : null;
    if (change != null && Math.abs(change) >= 3) {
      const diffs = EARNING_PARTS.map(p => ({ label: p.label.toLowerCase(), d: (T as any)[p.key] - (P as any)[p.key] }))
        .sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
      const driver = diffs[0];
      // Only name a driver when both periods have a full breakdown.
      const why = itemised && driver && Math.abs(driver.d) > 0
        ? ` Largest change: ${driver.label} (${driver.d > 0 ? "+" : "−"}${money(Math.abs(driver.d))}).` : "";
      list.push({
        type: change > 0 ? (change > 10 ? "warning" : "info") : "positive", rank: 2,
        title: `Payroll cost ${change > 0 ? "up" : "down"} ${Math.abs(change)}% vs ${cmpText}`,
        detail: `${basis(T, cur)}, against ${basis(P, before)}.${why}`,
      });
    }
    const perHead = P.rows ? pctChange(costPerHead(T), costPerHead(P)) : null;
    if (perHead != null && Math.abs(perHead) >= 5) {
      list.push({
        type: "info", rank: 5, title: `Cost per employee ${perHead > 0 ? "rose" : "fell"} ${Math.abs(perHead)}%`,
        detail: `${money(costPerHead(T))} per employee per month from ${plural(T.rows, "salary", "salaries")}, against ${money(costPerHead(P))} from ${plural(P.rows, "salary", "salaries")} in ${cmpText}.`,
      });
    }
    const otShare = share(T.overtime, T.gross);
    if (otShare >= 8) {
      const top = otLeaders[0];
      list.push({
        type: "warning", rank: 4, title: `Overtime is ${otShare}% of payroll cost`,
        detail: `${money(T.overtime)} for ${fmtNum(T.otHours)}h approved overtime.${top ? ` Most: ${top.name} (${money(top.t.overtime)}, ${fmtNum(top.t.otHours)}h).` : ""}`,
      });
    }
    if (deptRows.length > 1 && deptRows[0].share >= 50 && department === "all") {
      const d = deptRows[0];
      list.push({
        type: "info", rank: 6, title: `${d.department} takes ${d.share}% of payroll`,
        detail: `${money(d.gross)} of ${money(T.gross)} this period.`,
      });
    }
    const growing = deptRows.filter(d => d.changePct != null && d.changePct >= 15 && d.previousGross > 0)
      .sort((a, b) => (b.changePct ?? 0) - (a.changePct ?? 0))[0];
    if (growing && department === "all") {
      list.push({
        type: "warning", rank: 6, title: `${growing.department} payroll grew ${growing.changePct}%`,
        detail: `${basis(totals(cur.filter(r => r.department === growing.department)), cur.filter(r => r.department === growing.department))}, against ${basis(totals(before.filter(r => r.department === growing.department)), before.filter(r => r.department === growing.department))}.`,
      });
    }
    const jump = employees.filter(e => e.changePct != null && e.changePct >= 20 && e.prevAvg > 0)
      .sort((a, b) => (b.avg - b.prevAvg) - (a.avg - a.prevAvg))[0];
    if (jump) {
      const was = before.filter(r => r.employeeCode === jump.code);
      list.push({
        type: "info", rank: 7, title: `${jump.name}'s monthly pay rose ${jump.changePct}%`,
        detail: `${money(jump.avg)} a month (${monthsOf(cur.filter(r => r.employeeCode === jump.code))}), up from ${money(jump.prevAvg)} (${monthsOf(was)}).`,
      });
    }
    if (T.attendanceDeduction > 0) {
      const parts = [
        T.absentDays ? plural(T.absentDays, "absent day") : null,
        T.unpaidLeaveDays ? plural(T.unpaidLeaveDays, "unpaid leave day") : null,
        T.lateCount ? plural(T.lateCount, "late arrival") : null,
      ].filter(Boolean).join(", ");
      list.push({
        type: "info", rank: 8, title: `${money(T.attendanceDeduction)} deducted for absences`,
        detail: `${parts || "Absence deductions"} on approved payroll this period.`,
      });
    }
    if (advances.outstanding > 0) {
      const top = advances.open[0];
      list.push({
        type: "info", rank: 9, title: `${money(advances.outstanding)} in salary advances outstanding`,
        detail: `${plural(advances.open.length, "open advance")}${top ? `; largest ${top.name} (${money(top.balance)} of ${money(top.approved)})` : ""}.`,
      });
    }
    if (netOnly) {
      list.push({
        type: "info", rank: 10, title: `${plural(netOnly, "payment")} without a breakdown`,
        detail: `These salary payments only recorded the net amount (${money(cur.filter(r => r.netOnly).reduce((s, r) => s + r.net, 0))}), so they're shown as “Not itemised”, not split into basic, allowances or overtime.`,
      });
    }
    if (T.paid > 0 && !unpaidRows.length && list.every(i => i.type !== "warning")) {
      list.push({ type: "positive", rank: 9, title: "Every approved salary is paid", detail: `${money(T.paid)} paid out across ${T.months} ${T.months === 1 ? "month" : "months"}.` });
    }
    return list;
  }, [data, T, P, cur, before, cmpText, money, unpaidRows, draftRows, includeDraft, otLeaders, deptRows, department, employees, advances, netOnly]);

  // ── Export ─────────────────────────────────────────────────────────────
  const branchTitle = isAllBranches ? "All branches" : activeBranchName;
  const periodTitle = `${rangeText(range.from, range.to)} (vs ${cmpText})${department !== "all" ? ` · ${department}` : ""}`;

  const exportExcel = () => {
    if (!data) return;
    const r2 = (n: number | null) => (n == null ? "" : Math.round(n * 100) / 100);
    const rows: XlsxCell[][] = [
      [`Payroll Analytics — ${branchTitle}`], [periodTitle], [`Amounts in ${currencyCode}`], [],
      ["Metric", "This period", "Comparison", "Change %"],
      ["Payroll cost (gross)", r2(T.gross), r2(P.gross), pctChange(T.gross, P.gross) ?? ""],
      ["Net pay", r2(T.net), r2(P.net), pctChange(T.net, P.net) ?? ""],
      ["Paid out", r2(T.paid), r2(P.paid), pctChange(T.paid, P.paid) ?? ""],
      ["Approved, unpaid", r2(T.unpaid), r2(P.unpaid), ""],
      ["Avg cost per employee / month", r2(costPerHead(T)), r2(costPerHead(P)), pctChange(costPerHead(T), costPerHead(P)) ?? ""],
      ["Avg monthly headcount", r2(avgHeadcount(T, monthCount)), r2(avgHeadcount(P, prevMonthCount)), ""],
      ["Basic salary", r2(T.basic), r2(P.basic), pctChange(T.basic, P.basic) ?? ""],
      ["Allowances", r2(T.allowances), r2(P.allowances), pctChange(T.allowances, P.allowances) ?? ""],
      ["Overtime", r2(T.overtime), r2(P.overtime), pctChange(T.overtime, P.overtime) ?? ""],
      ["Commission", r2(T.commission), r2(P.commission), pctChange(T.commission, P.commission) ?? ""],
      ["Not itemised (old payments, net only)", r2(T.unitemised), r2(P.unitemised), ""],
      ["Deductions", r2(T.totalDeductions), r2(P.totalDeductions), pctChange(T.totalDeductions, P.totalDeductions) ?? ""],
      ["Overtime hours", r2(T.otHours), r2(P.otHours), ""],
      ["Advances outstanding (now)", r2(advances.outstanding), "", ""],
      [],
      ["Month", "Headcount", "Basic", "Allowances", "Overtime", "Commission", "Not itemised", "Gross", "Deductions", "Net", "Paid", "Unpaid"],
      ...monthly.map(m => [m.label, m.headcount, r2(m.basic), r2(m.allowances), r2(m.overtime), r2(m.commission), r2(m.unitemised), r2(m.gross), r2(m.deductions), r2(m.net), r2(m.paid), r2(m.unpaid)]),
      [],
      ["Department", "Avg headcount", "Gross", "Share %", "Per employee / month", "Overtime", "Comparison gross", "Change %"],
      ...deptRows.map(d => [d.department, r2(d.headcount), r2(d.gross), d.share, r2(d.perHead), r2(d.overtime), r2(d.previousGross), d.changePct ?? ""]),
      [],
      ["Employee", "Department", "Months", "Gross", "Avg / month", "Overtime", "OT hours", "Deductions", "Net", "Change %"],
      ...[...employees].sort((a, b) => b.t.gross - a.t.gross).map(e => [e.name, e.department, e.t.rows, r2(e.t.gross), r2(e.avg), r2(e.t.overtime), r2(e.t.otHours), r2(e.t.totalDeductions), r2(e.t.net), e.changePct ?? ""]),
      [],
      ["Insight", "Detail"], ...insights.map(i => [i.title, i.detail]),
    ];
    // bold: the title and each table's header row (the row after a blank line)
    const bold = [0, ...rows.map((r, i) => (i > 0 && rows[i - 1].length === 0 && r.length > 1 ? i : -1)).filter(i => i >= 0)];
    downloadBlob(buildXlsx("Payroll analytics", rows, { boldRows: bold, moneyColumns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], columnWidths: [30, 16, 16, 16, 18, 16, 16, 16, 16, 14, 14] }),
      `payroll-analytics_${range.from}_${range.to}.xlsx`);
    toast.success("Exported to Excel");
  };

  const print = () => {
    if (!data) return;
    const m = (n: number | null | undefined) => (n == null ? "—" : formatCurrencyText(Number(n), { maximumFractionDigits: 0 }));
    const e = (s: unknown) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const pct = (n: number | null) => (n == null ? "—" : `${n > 0 ? "+" : ""}${n}%`);
    const table = (head: string[], body: unknown[][]) =>
      `<table><thead><tr>${head.map((h, i) => `<th class="${i ? "n" : ""}">${e(h)}</th>`).join("")}</tr></thead><tbody>${body.map(r => `<tr>${r.map((c, i) => `<td class="${i ? "n" : ""}">${e(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    printHtml(`<!doctype html><html><head><meta charset="utf-8"><title>Payroll Analytics</title><style>
      @page{size:A4;margin:14mm}body{color:#0b0b0b;font-size:11px;margin:0}
      h1{font-size:19px;margin:0}h2{font-size:13px;margin:20px 0 6px}.sub{color:#52514e;margin:4px 0 14px}
      table{width:100%;border-collapse:collapse}th,td{padding:5px 7px;border-bottom:1px solid #e1e0d9;text-align:left}
      th{color:#52514e;font-weight:600}td.n,th.n{text-align:right;font-variant-numeric:tabular-nums}li{margin:3px 0}</style></head><body>
      <h1>Payroll Analytics — ${e(branchTitle)}</h1><div class="sub">${e(periodTitle)} · generated ${e(new Date().toLocaleString())}</div>
      <h2>Summary</h2>${table(["Metric", "This period", "Comparison", "Change"], [
        ["Payroll cost (gross)", m(T.gross), m(P.gross), pct(pctChange(T.gross, P.gross))],
        ["Net pay", m(T.net), m(P.net), pct(pctChange(T.net, P.net))],
        ["Paid out", m(T.paid), m(P.paid), pct(pctChange(T.paid, P.paid))],
        ["Approved, unpaid", m(T.unpaid), m(P.unpaid), ""],
        ["Cost per employee / month", m(costPerHead(T)), m(costPerHead(P)), pct(pctChange(costPerHead(T), costPerHead(P)))],
        ["Avg monthly headcount", fmtNum(avgHeadcount(T, monthCount)), fmtNum(avgHeadcount(P, prevMonthCount)), ""],
        ["Overtime", m(T.overtime), m(P.overtime), pct(pctChange(T.overtime, P.overtime))],
        ["Commission", m(T.commission), m(P.commission), pct(pctChange(T.commission, P.commission))],
        ["Deductions", m(T.totalDeductions), m(P.totalDeductions), pct(pctChange(T.totalDeductions, P.totalDeductions))],
      ])}
      <h2>Insights</h2><ul>${insights.map(i => `<li><b>${e(i.title)}</b> — ${e(i.detail)}</li>`).join("")}</ul>
      <h2>By month</h2>${table(["Month", "Headcount", "Basic", "Allowances", "Overtime", "Commission", "Gross", "Net", "Unpaid"],
        monthly.map(r => [r.label, r.headcount, m(r.basic), m(r.allowances), m(r.overtime), m(r.commission), m(r.gross), m(r.net), m(r.unpaid)]))}
      <h2>By department</h2>${table(["Department", "Headcount", "Gross", "Share", "Per employee", "Change"],
        deptRows.map(d => [d.department, fmtNum(d.headcount), m(d.gross), fmtPct(d.share), m(d.perHead), pct(d.changePct)]))}
      <h2>Top earners</h2>${table(["Employee", "Department", "Gross", "Avg / month", "Overtime"],
        topEarners.map(x => [x.name, x.department, m(x.t.gross), m(x.avg), m(x.t.overtime)]))}
      </body></html>`);
  };

  // ── Render helpers ─────────────────────────────────────────────────────
  const axis = { stroke: palette.axis, fontSize: 11, tickLine: false, axisLine: false } as const;
  const partColor: Record<string, string> = { basic: palette.basic, allowances: palette.allowances, overtime: palette.overtime, commission: palette.commission, unitemised: palette.compare };
  // Old payments saved without a breakdown get their own (neutral) part instead of a guessed split.
  const parts: { key: string; label: string }[] = [...EARNING_PARTS, ...(T.unitemised ? [{ key: "unitemised", label: "Not itemised" }] : [])];

  const monthCols: Col<MonthRow>[] = [
    { key: "label", label: "Month", value: r => r.label, kind: "text" },
    { key: "headcount", label: "Staff", value: r => r.headcount, kind: "number" },
    { key: "basic", label: "Basic", value: r => r.basic, kind: "money", total: true },
    { key: "allowances", label: "Allowances", value: r => r.allowances, kind: "money", total: true },
    { key: "overtime", label: "Overtime", value: r => r.overtime, kind: "money", total: true },
    { key: "commission", label: "Commission", value: r => r.commission, kind: "money", total: true },
    ...(T.unitemised ? [{ key: "unitemised", label: "Not itemised", value: (r: MonthRow) => r.unitemised, kind: "money" as const, total: true }] : []),
    { key: "gross", label: "Gross", value: r => r.gross, kind: "money", total: true, className: styles.strong },
    { key: "deductions", label: "Deductions", value: r => r.deductions, kind: "money", total: true, sign: "-" },
    { key: "net", label: "Net", value: r => r.net, kind: "money", total: true, className: styles.strong },
    { key: "previousGross", label: "Comparison gross", value: r => r.previousGross, kind: "money", total: true },
  ];

  const deptCols: Col<DeptRow>[] = [
    { key: "department", label: "Department", value: r => r.department, kind: "text", render: r => <span className={styles.strong}>{r.department}</span> },
    { key: "headcount", label: "Avg staff", value: r => r.headcount, kind: "number", total: rows => rows.reduce((s, r) => s + r.headcount, 0) },
    { key: "gross", label: "Payroll cost", value: r => r.gross, kind: "money", total: true },
    {
      key: "share", label: "Share", value: r => r.share, kind: "percent",
      render: r => <span>{fmtPct(r.share)}<span className={styles.miniBar}><span className={styles.miniFill} style={{ display: "block", width: `${r.share}%`, ["--fill" as any]: palette.basic }} /></span></span>,
    },
    { key: "perHead", label: "Per employee / mo", value: r => r.perHead, kind: "money" },
    { key: "overtime", label: "Overtime", value: r => r.overtime, kind: "money", total: true },
    { key: "otShare", label: "OT %", value: r => r.otShare, kind: "percent" },
    { key: "previousGross", label: "Comparison", value: r => r.previousGross, kind: "money", total: true },
    { key: "changePct", label: "Change", value: r => r.changePct, kind: "percent", render: r => <Delta pct={r.changePct} /> },
  ];

  const trendChart = () => {
    if (!monthly.some(m => m.gross || (m.previousGross ?? 0))) {
      return <div className={styles.empty} style={{ minHeight: 260 }}><Sparkles size={22} />No payroll cost in this period yet.</div>;
    }
    if (trendView === "table") return <ReportTable columns={monthCols} rows={monthly} rowKey={r => r.month} money={money2} />;
    if (trendView === "headcount" || trendView === "perHead") {
      const key = trendView === "headcount" ? "headcount" : "perHead";
      const fmt = trendView === "headcount" ? (v: number) => `${fmtNum(v)} staff` : money;
      return (
        <>
          <Legend items={[{ label: trendView === "headcount" ? "Employees paid" : "Cost per employee", color: palette.net, line: true },
            ...(trendView === "perHead" ? [{ label: `Comparison (${cmpText})`, color: palette.compare, line: true }] : [])]} />
          <div className={styles.chartFill}>
            <ResponsiveContainer>
              <LineChart data={monthly} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={palette.grid} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} width={52} allowDecimals={trendView !== "headcount"} tickFormatter={v => (trendView === "headcount" ? String(v) : compactNumber(v))} />
                <Tooltip content={<ChartTip money={money} format={fmt} />} />
                {trendView === "perHead" && <Line isAnimationActive={false} type="monotone" dataKey="previousPerHead" name="Comparison" stroke={palette.compare} strokeWidth={2} strokeDasharray="4 4" dot={false} />}
                <Line isAnimationActive={false} type="monotone" dataKey={key} name={trendView === "headcount" ? "Employees paid" : "Cost per employee"} stroke={palette.net} strokeWidth={2}
                  dot={{ r: 4, strokeWidth: 2, stroke: palette.surface, fill: palette.net }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      );
    }
    if (trendView === "compare") {
      return (
        <>
          <Legend items={[{ label: `Comparison (${cmpText})`, color: palette.compare }, { label: `This period`, color: palette.net }]} />
          <div className={styles.chartFill}>
            <ResponsiveContainer>
              <BarChart data={monthly} margin={{ top: 8, right: 12, bottom: 0, left: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke={palette.grid} />
                <XAxis dataKey="label" {...axis} />
                <YAxis {...axis} width={52} tickFormatter={compactNumber} />
                <Tooltip cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} content={<ChartTip money={money} />} />
                <Bar isAnimationActive={false} dataKey="previousGross" name="Comparison" fill={palette.compare} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar isAnimationActive={false} dataKey="gross" name="This period" fill={palette.net} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      );
    }
    return (
      <>
        <Legend items={parts.map(p => ({ label: p.label, color: partColor[p.key] }))} />
        <div className={styles.chartFill}>
          <ResponsiveContainer>
            <BarChart data={monthly} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={palette.grid} />
              <XAxis dataKey="label" {...axis} />
              <YAxis {...axis} width={52} tickFormatter={compactNumber} />
              <Tooltip cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} content={<ChartTip money={money} total="Gross" />} />
              {parts.map((p, i) => (
                <Bar key={p.key} isAnimationActive={false} stackId="g" dataKey={p.key} name={p.label} fill={partColor[p.key]}
                  stroke={palette.surface} strokeWidth={1} maxBarSize={36}
                  radius={i === parts.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </>
    );
  };

  const composition = parts.map(p => ({
    ...p, value: (T as any)[p.key] as number, previous: (P as any)[p.key] as number,
  }));

  const deductionRows = [
    { key: "attendance", label: "Absence / unpaid leave", value: T.attendanceDeduction, previous: P.attendanceDeduction },
    { key: "advance", label: "Advance recovery", value: T.advanceRecovery, previous: P.advanceRecovery },
    { key: "other", label: "Other deductions", value: T.otherDeductions, previous: P.otherDeductions },
  ];

  // ── Page ───────────────────────────────────────────────────────────────
  return (
    <div className={styles.root}>
      <PageHeader
        crumbs={[{ label: "Payroll & Employees", to: "payroll-employees" }, { label: "Payroll Analytics" }]}
        onCrumb={to => onNavigate?.(to)}
        icon={Brain}
        title="Payroll Analytics"
        subtitle={`Workforce cost, pay mix, overtime and payment status · ${branchTitle}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.("payroll-reports")}><FileText className="h-4 w-4 mr-1" />Reports</Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
            <Button variant="outline" size="sm" onClick={print} disabled={!data}><Printer className="h-4 w-4 mr-1" />Print</Button>
            <Button size="sm" onClick={exportExcel} disabled={!data}><Download className="h-4 w-4 mr-1" />Export Excel</Button>
          </>
        }
      />

      <PeriodFilter preset={preset} onPreset={setPreset} custom={custom} onCustom={setCustom}>
        <Select value={department} onValueChange={setDepartment}>
          <SelectTrigger className="w-[170px]" aria-label="Department"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
          </SelectContent>
        </Select>
        <span className={styles.filterLabel}>Compare with</span>
        <Seg value={compare} onChange={setCompare} options={[["previous", "Previous period"], ["year", "Last year"]]} />
        <label className={styles.toggle}><input type="checkbox" checked={includeDraft} onChange={e => setIncludeDraft(e.target.checked)} />Include drafts</label>
      </PeriodFilter>

      {error && <div className={`${styles.card} ${styles.errorBox}`}>{error}</div>}
      {!data && loading && <div className={`${styles.card} ${styles.centered}`}><Loader2 className="h-6 w-6 animate-spin" /></div>}

      {data && (
        <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className={styles.heroKpis}>
            <HeroKpi icon={Wallet} tone="teal" label="Payroll cost" value={money(T.gross)}
              delta={<Delta pct={pctChange(T.gross, P.gross)} />} foot={`vs ${money(P.gross)}`}
              spark={monthly.map(m => m.gross)} sparkColor={palette.net} />
            <HeroKpi icon={Banknote} tone="blue" label="Net pay" value={money(T.net)}
              delta={<Delta pct={pctChange(T.net, P.net)} />} foot={`${money(T.paid)} paid out`}
              spark={monthly.map(m => m.net)} sparkColor={palette.net} />
            <HeroKpi icon={Building2} tone="violet" label="Cost per employee" value={money(costPerHead(T))}
              delta={<Delta pct={pctChange(costPerHead(T), costPerHead(P))} />} foot="a month"
              spark={monthly.map(m => m.perHead)} sparkColor={palette.net} />
            <HeroKpi icon={Users} tone="green" label="Avg headcount" value={fmtNum(avgHeadcount(T, monthCount))}
              delta={<Delta neutral pct={pctChange(avgHeadcount(T, monthCount), avgHeadcount(P, prevMonthCount))} />}
              foot={`${T.employees} on payroll · ${data.staff.active} active staff`}
              spark={monthly.map(m => m.headcount)} sparkColor={palette.net} />
          </div>

          <div className={styles.kpis}>
            <SmallKpi icon={Clock} tone="teal" label="Overtime" value={money(T.overtime)}
              hint={<>{fmtPct(share(T.overtime, T.gross))} of cost · {fmtNum(T.otHours)}h · <Delta pct={pctChange(T.overtime, P.overtime)} /></>} />
            <SmallKpi icon={BadgeDollarSign} tone="amber" label="Commission" value={money(T.commission)}
              hint={<>{fmtPct(share(T.commission, T.gross))} of cost · <Delta neutral pct={pctChange(T.commission, P.commission)} /></>} />
            <SmallKpi icon={TrendingUp} tone="orange" label="Allowances" value={money(T.allowances)}
              hint={<>{fmtPct(share(T.allowances, T.gross))} of cost · <Delta pct={pctChange(T.allowances, P.allowances)} /></>} />
            <SmallKpi icon={Receipt} tone="gray" label="Deductions" value={money(T.totalDeductions)}
              hint={`${money(T.attendanceDeduction)} absence · ${money(T.advanceRecovery)} advances`} />
            <SmallKpi icon={CalendarClock} tone={T.unpaid > 0 ? "red" : "green"} label="Approved, unpaid" value={money(T.unpaid)}
              hint={T.unpaid > 0
                ? <button type="button" className={styles.chip} style={{ padding: "0.15rem 0.5rem" }} onClick={() => onNavigate?.("salary-payments")}>{unpaidRows.length} to pay →</button>
                : "Nothing waiting"} />
            <SmallKpi icon={HandCoins} tone="violet" label="Advances due back" value={money(advances.outstanding)}
              hint={`${advances.open.length} open · balance today`} />
          </div>

          <div className={styles.row2}>
            <section className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h2 className={styles.panelTitle}>Payroll cost by month</h2>
                  <div className={styles.panelSub}>Gross pay = basic + allowances + overtime + commission</div>
                </div>
                <Seg value={trendView} onChange={setTrendView} options={[
                  ["breakdown", "Breakdown"], ["compare", "Vs comparison"], ["perHead", "Per employee"], ["headcount", "Headcount"], ["table", "Table"],
                ]} />
              </div>
              {trendChart()}
            </section>
            <section className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h2 className={styles.panelTitle}>Insights</h2>
                  <div className={styles.panelSub}>What changed and what needs attention</div>
                </div>
              </div>
              <Insights items={insights} />
            </section>
          </div>

          <div className={styles.cols2}>
            <section className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h2 className={styles.panelTitle}>Where the money goes</h2>
                  <div className={styles.panelSub}>Pay mix this period, change vs {cmpText}</div>
                </div>
              </div>
              {T.gross > 0 ? (
                <>
                  <div className={styles.stackBar} role="img" aria-label="Gross pay composition">
                    {composition.map(c => c.value > 0 && (
                      <div key={c.key} className={styles.stackSeg} title={`${c.label}: ${fmtPct(share(c.value, T.gross))}`}
                        style={{ width: `${share(c.value, T.gross)}%`, ["--fill" as any]: partColor[c.key] }} />
                    ))}
                  </div>
                  <div className={styles.stackLegend}>
                    {composition.map(c => (
                      <div key={c.key} className={styles.stackCell}>
                        <span className={styles.legendItem} style={{ fontSize: "var(--text-xs)", color: "var(--muted-foreground)" }}>
                          <span className={styles.swatch} style={{ ["--sw" as any]: partColor[c.key] }} />{c.label}
                        </span>
                        <span className={styles.barVal}>{money(c.value)}</span>
                        <span className={styles.kpiHint}>{fmtPct(share(c.value, T.gross))} · <Delta pct={pctChange(c.value, c.previous)} neutral={c.key === "commission"} /></span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.block}>
                    <div className={styles.blockTitle}>Deductions · {money(T.totalDeductions)}</div>
                    <BarRows color={palette.allowances} empty="No deductions this period."
                      rows={deductionRows.filter(d => d.value || d.previous).map(d => ({
                        key: d.key, label: d.label, value: d.value, display: money(d.value),
                        meta: <>{fmtPct(share(d.value, T.totalDeductions))} · <Delta neutral pct={pctChange(d.value, d.previous)} /></>,
                      }))} />
                  </div>
                </>
              ) : <div className={styles.empty}>No pay in this period.</div>}
            </section>

            <section className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h2 className={styles.panelTitle}>Payment status by month</h2>
                  <div className={styles.panelSub}>Payroll runs and salary payments (drafts included here)</div>
                </div>
                {T.unpaid > 0 && <Button size="sm" variant="outline" onClick={() => onNavigate?.("salary-payments")}><Wallet className="h-4 w-4 mr-1" />Pay salaries</Button>}
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Month</th><th>Source</th><th className={styles.num}>Staff</th><th className={styles.num}>Net</th><th>Paid</th></tr></thead>
                  <tbody>
                    {statusByMonth.map(r => {
                      const total = r.paid + r.unpaid + r.draft;
                      const pct = total ? Math.round((r.paid / total) * 100) : 0;
                      const tone = r.run?.status === "Draft" ? "gray" : r.unpaid > 0 ? "amber" : r.paid > 0 ? "green" : "gray";
                      return (
                        <tr key={r.month}>
                          <td className={styles.strong} style={{ whiteSpace: "nowrap" }}>{r.label}</td>
                          <td>
                            {r.run ? <span className={styles.pill} data-tone={r.run.status === "Draft" ? "gray" : r.run.status === "Approved" ? "blue" : r.run.status === "Partially Paid" ? "amber" : "green"}>Payroll · {r.run.status}</span>
                              : r.manual ? <span className={styles.pill} data-tone="violet">Manual payments</span>
                                : <span className={styles.muted}>Nothing yet</span>}
                          </td>
                          <td className={styles.num}>{r.employees || "—"}</td>
                          <td className={styles.num}>{total ? money(r.net) : "—"}</td>
                          <td style={{ minWidth: 150, whiteSpace: "nowrap" }}>
                            {total ? (
                              <span className={styles.legendItem} style={{ fontSize: "var(--text-xs)" }}>
                                <span className={styles.miniBar} style={{ marginLeft: 0, width: "5rem" }}>
                                  <span className={styles.miniFill} style={{ display: "block", width: `${pct}%`, ["--fill" as any]: tone === "green" ? "var(--status-good)" : tone === "amber" ? "var(--status-warning)" : palette.compare }} />
                                </span>
                                {r.draft && !r.paid ? "Draft" : `${pct}%`}{r.unpaid > 0 && <span className={styles.minus}>· {money(r.unpaid)} due</span>}
                              </span>
                            ) : <span className={styles.muted}>—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          <section className={`${styles.card} ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Departments</h2>
                <div className={styles.panelSub}>Cost, headcount and overtime per department, vs {cmpText}</div>
              </div>
            </div>
            <ReportTable columns={deptCols} rows={deptRows} rowKey={r => r.department} money={money}
              initialSort={{ key: "gross", dir: "desc" }} empty="No departments with pay in this period." />
          </section>

          <div className={styles.cols2}>
            <section className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h2 className={styles.panelTitle}>Highest payroll cost</h2>
                  <div className={styles.panelSub}>Gross pay this period · change in monthly average</div>
                </div>
              </div>
              <BarRows color={palette.basic} empty="No one was paid in this period."
                rows={topEarners.map(e => ({
                  key: e.code, value: e.t.gross, display: money(e.t.gross), title: e.name,
                  label: <PersonCell name={e.name} sub={`${e.department}${e.designation ? ` · ${e.designation}` : ""}`} />,
                  meta: <>{money(e.avg)}/mo · <Delta pct={e.changePct} neutral /></>,
                }))} />
            </section>
            <section className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h2 className={styles.panelTitle}>Overtime & attendance</h2>
                  <div className={styles.panelSub}>Approved overtime pay and hours, absences and late arrivals (payroll runs)</div>
                </div>
              </div>
              <BarRows color={palette.overtime} empty={<><Clock size={22} />No approved overtime in this period.</>}
                rows={otLeaders.map(e => ({
                  key: e.code, value: e.t.overtime, display: money(e.t.overtime), title: e.name,
                  label: <PersonCell name={e.name} sub={e.department} />,
                  meta: <>{fmtNum(e.t.otHours)}h OT · {fmtNum(e.t.absentDays)} absent · {e.t.lateCount} late</>,
                }))} />
            </section>
          </div>

          <div className={styles.cols2}>
            <section className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h2 className={styles.panelTitle}>How salaries were paid</h2>
                  <div className={styles.panelSub}>Paid salaries by payment method</div>
                </div>
              </div>
              <BarRows color={palette.basic} empty="No salaries paid in this period."
                rows={methods.map(m => ({
                  key: m.mode, label: m.mode, value: m.amount, display: money(m.amount),
                  meta: `${fmtPct(m.share)} · ${m.count} ${m.count === 1 ? "payment" : "payments"}`,
                }))} />
            </section>
            <section className={`${styles.card} ${styles.panel}`}>
              <div className={styles.panelHead}>
                <div>
                  <h2 className={styles.panelTitle}>Salary advances</h2>
                  <div className={styles.panelSub}>Issued vs recovered each month · open balances today</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => onNavigate?.("salary-advances")}><HandCoins className="h-4 w-4 mr-1" />Advances</Button>
              </div>
              {data.advances.monthly.some(m => m.issued || m.recovered) ? (
                <>
                  <Legend items={[{ label: "Issued", color: palette.issued }, { label: "Recovered", color: palette.recovered }]} />
                  <div className={styles.chartSm}>
                    <ResponsiveContainer>
                      <BarChart data={data.advances.monthly} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={2}>
                        <CartesianGrid vertical={false} stroke={palette.grid} />
                        <XAxis dataKey="label" {...axis} />
                        <YAxis {...axis} width={48} tickFormatter={compactNumber} />
                        <Tooltip cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} content={<ChartTip money={money} />} />
                        <Bar isAnimationActive={false} dataKey="issued" name="Issued" fill={palette.issued} radius={[4, 4, 0, 0]} maxBarSize={20} />
                        <Bar isAnimationActive={false} dataKey="recovered" name="Recovered" fill={palette.recovered} radius={[4, 4, 0, 0]} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              ) : null}
              <BarRows color={palette.commission} empty="No advances outstanding."
                rows={advances.open.slice(0, 5).map(a => ({
                  key: String(a.id), value: a.balance, display: money(a.balance), title: a.name,
                  label: <PersonCell name={a.name} sub={a.department} />,
                  meta: `${money(a.recovered)} of ${money(a.approved)} back${a.installment ? ` · ${money(a.installment)}/mo` : ""}`,
                }))} />
            </section>
          </div>

          {!data.payrollUsed && (
            <div className={styles.noteBar}>
              <Sparkles size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              These figures come from Salary Payments. Running monthly payroll adds attendance, overtime hours and approval status to the analysis.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
