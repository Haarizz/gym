import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Building2, CalendarDays, ClipboardList, Clock, Download, FileSpreadsheet, FileText, HandCoins, Loader2, Printer,
  RefreshCw, Search, UserRound, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { PageHeader } from "../components/workforce/ui";
import {
  PeriodFilter, PersonCell, ReportTable, exportCsv, exportXlsx, fmtNum, fmtPct, pi as styles, presetRange, printReport,
  type Col, type MonthRange, type Preset,
} from "../components/workforce/payroll-insights";
import { useCurrency } from "../utils/currency";
import { useBranch } from "../utils/branch-context";
import {
  groupBy, payrollErrorMessage, payrollReportService, rangeText, share, totals, ym,
  type OpenAdvance, type PayrollDataset, type PayrollRecord, type SalaryPaymentRow, type Totals,
} from "../utils/supabase/payroll-report-service";

interface Props { onNavigate?: (section: string, params?: Record<string, any>) => void }

type ReportId = "register" | "employees" | "departments" | "monthly" | "payments" | "attendance" | "advances";
type StatusFilter = "final" | "Paid" | "Unpaid" | "Draft" | "all";

const REPORTS: { id: ReportId; name: string; desc: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "register", name: "Payroll register", desc: "Every employee, every month, line by line", icon: ClipboardList },
  { id: "employees", name: "Employee earnings", desc: "Totals per employee for the period", icon: UserRound },
  { id: "departments", name: "Department summary", desc: "Cost and headcount per department", icon: Building2 },
  { id: "monthly", name: "Monthly summary", desc: "Month-by-month totals and status", icon: CalendarDays },
  { id: "payments", name: "Salary payments", desc: "What was paid, when and how", icon: Wallet },
  { id: "attendance", name: "Attendance & overtime", desc: "Days, hours, OT and absence cost", icon: Clock },
  { id: "advances", name: "Advances outstanding", desc: "Open salary advances and balances", icon: HandCoins },
];

const STATUS_TONE: Record<string, string> = { Paid: "green", Unpaid: "amber", Draft: "gray" };

interface EmployeeRow { code: string; name: string; department: string; designation: string | null; t: Totals; avg: number }
interface DeptRow { department: string; t: Totals; perHead: number; share: number }
interface MonthRow { month: string; label: string; source: string; t: Totals }
interface AttendanceRow {
  code: string; name: string; department: string; months: number;
  scheduledDays: number; presentDays: number; absentDays: number; paidLeaveDays: number; unpaidLeaveDays: number;
  lateCount: number; scheduledHours: number; actualHours: number; otHours: number; otPay: number; absenceCost: number; rate: number | null;
}

export function PayrollReports({ onNavigate }: Props) {
  const { formatCurrency, formatCurrencyText, currencyCode } = useCurrency();
  const { activeBranchId, activeBranchName, isAllBranches } = useBranch();

  const now = ym(new Date());
  const [report, setReport] = useState<ReportId>("register");
  const [preset, setPreset] = useState<Preset>("this-month");
  const [custom, setCustom] = useState<MonthRange>({ from: now, to: now });
  const [department, setDepartment] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("final");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<PayrollDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => presetRange(preset, custom), [preset, custom]);
  const money = useCallback((n: number) => formatCurrency(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [formatCurrency]);
  const moneyText = useCallback((n: number) => formatCurrencyText(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), [formatCurrencyText]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await payrollReportService.get(range.from, range.to));
    } catch (err) {
      setError(payrollErrorMessage(err, "Couldn't load payroll reports"));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { load(); }, [load, activeBranchId]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    data?.records.forEach(r => set.add(r.department));
    data?.staff.departments.forEach(d => set.add(d.department));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [data]);

  const q = search.trim().toLowerCase();
  const matches = useCallback((...values: Array<string | null | undefined>) =>
    !q || values.some(v => (v ?? "").toLowerCase().includes(q)), [q]);

  const records = useMemo(() => (data?.records ?? []).filter(r =>
    (department === "all" || r.department === department)
    && (status === "all" || (status === "final" ? r.status !== "Draft" : r.status === status))
    && matches(r.name, r.employeeCode, r.designation)), [data, department, status, matches]);

  const T = useMemo(() => totals(records), [records]);

  // ── Report rows ────────────────────────────────────────────────────────
  const employeeRows: EmployeeRow[] = useMemo(() => [...groupBy(records, r => r.employeeCode).entries()].map(([code, rows]) => {
    const t = totals(rows);
    return { code, name: rows[0].name, department: rows[0].department, designation: rows[0].designation, t, avg: t.rows ? t.gross / t.rows : 0 };
  }), [records]);

  const deptRows: DeptRow[] = useMemo(() => [...groupBy(records, r => r.department).entries()].map(([department, rows]) => {
    const t = totals(rows);
    return { department, t, perHead: t.rows ? t.gross / t.rows : 0, share: share(t.gross, T.gross) };
  }), [records, T.gross]);

  const monthRows: MonthRow[] = useMemo(() => {
    if (!data) return [];
    const byMonth = groupBy(records, r => r.month);
    const runs = new Map(data.runs.map(r => [r.month, r]));
    return data.months.map(m => {
      const rows = byMonth.get(m.month) ?? [];
      const run = runs.get(m.month);
      const manual = rows.some(r => r.source === "manual");
      return {
        month: m.month, label: m.label, t: totals(rows),
        source: run ? `Payroll · ${run.status}${manual ? " + manual" : ""}` : manual ? "Manual payments" : "—",
      };
    });
  }, [data, records]);

  const paymentRows: SalaryPaymentRow[] = useMemo(() => (data?.payments ?? []).filter(p =>
    (department === "all" || p.department === department) && matches(p.name, p.employeeCode, p.processedBy)), [data, department, matches]);

  const attendanceRows: AttendanceRow[] = useMemo(() => {
    const withAtt = records.filter(r => r.attendance);
    return [...groupBy(withAtt, r => r.employeeCode).entries()].map(([code, rows]) => {
      const sum = (k: keyof NonNullable<PayrollRecord["attendance"]>) => rows.reduce((s, r) => s + Number(r.attendance?.[k] ?? 0), 0);
      const scheduledDays = sum("scheduledDays");
      const presentDays = sum("presentDays");
      return {
        code, name: rows[0].name, department: rows[0].department, months: rows.length,
        scheduledDays, presentDays, absentDays: sum("absentDays"), paidLeaveDays: sum("paidLeaveDays"), unpaidLeaveDays: sum("unpaidLeaveDays"),
        lateCount: sum("lateCount"), scheduledHours: sum("scheduledHours"), actualHours: sum("actualHours"), otHours: sum("otHours"),
        otPay: rows.reduce((s, r) => s + r.overtime, 0), absenceCost: rows.reduce((s, r) => s + r.attendanceDeduction, 0),
        rate: scheduledDays ? Math.round((presentDays / scheduledDays) * 1000) / 10 : null,
      };
    });
  }, [records]);

  const advanceRows: OpenAdvance[] = useMemo(() => (data?.advances.open ?? []).filter(a =>
    (department === "all" || a.department === department) && matches(a.name, a.employeeCode, a.type)), [data, department, matches]);

  // ── Columns ────────────────────────────────────────────────────────────
  const statusPill = (s: string) => <span className={styles.pill} data-tone={STATUS_TONE[s] ?? "gray"}>{s}</span>;
  const person = (name: string, sub?: string | null) => <PersonCell name={name} sub={sub ?? undefined} />;
  const sumOf = <R,>(get: (r: R) => number) => (rows: R[]) => rows.reduce((s, r) => s + get(r), 0);
  // Old payments saved with only a net amount: shown as their own column, never split into basic etc.
  const anyUnitemised = T.unitemised > 0;
  const unitemisedCol = <R,>(get: (r: R) => number): Col<R>[] => anyUnitemised
    ? [{ key: "unitemised", label: "Not itemised", value: get, kind: "money", total: true }] : [];

  const registerCols: Col<PayrollRecord>[] = [
    { key: "month", label: "Month", value: r => r.month, render: r => r.monthLabel, kind: "text" },
    { key: "code", label: "Employee ID", value: r => r.employeeCode, kind: "text", exportOnly: true },
    { key: "name", label: "Employee", value: r => r.name, kind: "text", render: r => person(r.name, [r.employeeCode, r.designation].filter(Boolean).join(" · ")) },
    { key: "designation", label: "Designation", value: r => r.designation, kind: "text", exportOnly: true },
    { key: "department", label: "Department", value: r => r.department, kind: "text" },
    { key: "basic", label: "Basic", value: r => r.basic, kind: "money", total: true },
    { key: "allowances", label: "Allowances", value: r => r.allowances, kind: "money", total: true, sign: "+" },
    { key: "overtime", label: "Overtime", value: r => r.overtime, kind: "money", total: true, sign: "+" },
    { key: "commission", label: "Commission", value: r => r.commission, kind: "money", total: true, sign: "+" },
    ...unitemisedCol<PayrollRecord>(r => r.unitemised),
    { key: "gross", label: "Gross", value: r => r.gross, kind: "money", total: true, className: styles.strong },
    { key: "attendanceDeduction", label: "Absence", value: r => r.attendanceDeduction, kind: "money", total: true, sign: "-" },
    { key: "advanceRecovery", label: "Advance", value: r => r.advanceRecovery, kind: "money", total: true, sign: "-" },
    { key: "otherDeductions", label: "Other ded.", value: r => r.otherDeductions, kind: "money", total: true, sign: "-" },
    { key: "net", label: "Net pay", value: r => r.net, kind: "money", total: true, className: styles.strong },
    { key: "status", label: "Status", value: r => r.status, kind: "text", render: r => statusPill(r.status) },
    { key: "paidDate", label: "Paid on", value: r => r.paidDate, kind: "text", render: r => r.paidDate ? fmtDate(r.paidDate) : <span className={styles.muted}>—</span> },
    { key: "methods", label: "Paid by", value: r => r.methods.map(m => m.mode).join(", "), kind: "text", exportOnly: true },
    { key: "source", label: "Source", value: r => (r.source === "payroll" ? "Payroll run" : "Manual payment"), kind: "text", exportOnly: true },
  ];

  const employeeCols: Col<EmployeeRow>[] = [
    { key: "code", label: "Employee ID", value: r => r.code, kind: "text", exportOnly: true },
    { key: "name", label: "Employee", value: r => r.name, kind: "text", render: r => person(r.name, [r.code, r.designation].filter(Boolean).join(" · ")) },
    { key: "department", label: "Department", value: r => r.department, kind: "text" },
    { key: "months", label: "Months", value: r => r.t.rows, kind: "number", total: true },
    { key: "basic", label: "Basic", value: r => r.t.basic, kind: "money", total: true },
    { key: "allowances", label: "Allowances", value: r => r.t.allowances, kind: "money", total: true },
    { key: "overtime", label: "Overtime", value: r => r.t.overtime, kind: "money", total: true },
    { key: "commission", label: "Commission", value: r => r.t.commission, kind: "money", total: true },
    ...unitemisedCol<EmployeeRow>(r => r.t.unitemised),
    { key: "gross", label: "Gross", value: r => r.t.gross, kind: "money", total: true, className: styles.strong },
    { key: "deductions", label: "Deductions", value: r => r.t.totalDeductions, kind: "money", total: true, sign: "-" },
    { key: "net", label: "Net pay", value: r => r.t.net, kind: "money", total: true, className: styles.strong },
    { key: "paid", label: "Paid", value: r => r.t.paid, kind: "money", total: true },
    { key: "unpaid", label: "Unpaid", value: r => r.t.unpaid, kind: "money", total: true },
    { key: "avg", label: "Avg gross / mo", value: r => r.avg, kind: "money" },
    { key: "otHours", label: "OT hours", value: r => r.t.otHours, kind: "hours", total: true },
  ];

  const deptCols: Col<DeptRow>[] = [
    { key: "department", label: "Department", value: r => r.department, kind: "text", render: r => <span className={styles.strong}>{r.department}</span> },
    { key: "employees", label: "Employees", value: r => r.t.employees, kind: "number", total: true },
    { key: "basic", label: "Basic", value: r => r.t.basic, kind: "money", total: true },
    { key: "allowances", label: "Allowances", value: r => r.t.allowances, kind: "money", total: true },
    { key: "overtime", label: "Overtime", value: r => r.t.overtime, kind: "money", total: true },
    { key: "commission", label: "Commission", value: r => r.t.commission, kind: "money", total: true },
    ...unitemisedCol<DeptRow>(r => r.t.unitemised),
    { key: "gross", label: "Gross", value: r => r.t.gross, kind: "money", total: true, className: styles.strong },
    { key: "deductions", label: "Deductions", value: r => r.t.totalDeductions, kind: "money", total: true, sign: "-" },
    { key: "net", label: "Net pay", value: r => r.t.net, kind: "money", total: true, className: styles.strong },
    { key: "share", label: "Share of cost", value: r => r.share, kind: "percent" },
    { key: "perHead", label: "Per employee / mo", value: r => r.perHead, kind: "money" },
  ];

  const monthCols: Col<MonthRow>[] = [
    { key: "month", label: "Month", value: r => r.month, render: r => <span className={styles.strong}>{r.label}</span>, kind: "text" },
    { key: "source", label: "Source", value: r => r.source, kind: "text" },
    { key: "employees", label: "Employees", value: r => r.t.employees, kind: "number" },
    { key: "basic", label: "Basic", value: r => r.t.basic, kind: "money", total: true },
    { key: "allowances", label: "Allowances", value: r => r.t.allowances, kind: "money", total: true },
    { key: "overtime", label: "Overtime", value: r => r.t.overtime, kind: "money", total: true },
    { key: "commission", label: "Commission", value: r => r.t.commission, kind: "money", total: true },
    ...unitemisedCol<MonthRow>(r => r.t.unitemised),
    { key: "gross", label: "Gross", value: r => r.t.gross, kind: "money", total: true, className: styles.strong },
    { key: "deductions", label: "Deductions", value: r => r.t.totalDeductions, kind: "money", total: true, sign: "-" },
    { key: "net", label: "Net pay", value: r => r.t.net, kind: "money", total: true, className: styles.strong },
    { key: "paid", label: "Paid", value: r => r.t.paid, kind: "money", total: true },
    { key: "unpaid", label: "Unpaid", value: r => r.t.unpaid, kind: "money", total: true },
  ];

  const paymentCols: Col<SalaryPaymentRow>[] = [
    { key: "date", label: "Paid on", value: r => r.date, kind: "text", render: r => fmtDate(r.date) },
    { key: "code", label: "Employee ID", value: r => r.employeeCode, kind: "text", exportOnly: true },
    { key: "name", label: "Employee", value: r => r.name, kind: "text", render: r => person(r.name, r.employeeCode) },
    { key: "department", label: "Department", value: r => r.department, kind: "text" },
    { key: "month", label: "Salary for", value: r => r.month, kind: "text", render: r => r.monthLabel },
    { key: "amount", label: "Amount", value: r => r.amount, kind: "money", total: true, className: styles.strong },
    { key: "methods", label: "Paid by", value: r => r.methods.map(m => (r.methods.length > 1 ? `${m.mode} ${moneyText(m.amount)}` : m.mode)).join(", "), kind: "text" },
    { key: "source", label: "Source", value: r => (r.source === "payroll" ? "Payroll run" : "Manual"), kind: "text",
      render: r => <span className={styles.pill} data-tone={r.source === "payroll" ? "blue" : "violet"}>{r.source === "payroll" ? "Payroll run" : "Manual"}</span> },
    { key: "processedBy", label: "Processed by", value: r => r.processedBy, kind: "text" },
    { key: "notes", label: "Notes", value: r => r.notes, kind: "text", exportOnly: true },
  ];

  const attendanceCols: Col<AttendanceRow>[] = [
    { key: "name", label: "Employee", value: r => r.name, kind: "text", render: r => person(r.name, r.department) },
    { key: "department", label: "Department", value: r => r.department, kind: "text", exportOnly: true },
    { key: "scheduledDays", label: "Scheduled days", value: r => r.scheduledDays, kind: "number", total: true },
    { key: "presentDays", label: "Present", value: r => r.presentDays, kind: "number", total: true },
    { key: "absentDays", label: "Absent", value: r => r.absentDays, kind: "number", total: true },
    { key: "paidLeaveDays", label: "Paid leave", value: r => r.paidLeaveDays, kind: "number", total: true },
    { key: "unpaidLeaveDays", label: "Unpaid leave", value: r => r.unpaidLeaveDays, kind: "number", total: true },
    { key: "lateCount", label: "Late", value: r => r.lateCount, kind: "number", total: true },
    { key: "rate", label: "Attendance", value: r => r.rate, kind: "percent",
      total: rows => { const s = sumOf<AttendanceRow>(r => r.scheduledDays)(rows); return s ? Math.round((sumOf<AttendanceRow>(r => r.presentDays)(rows) / s) * 1000) / 10 : null; } },
    { key: "scheduledHours", label: "Sched. hrs", value: r => r.scheduledHours, kind: "hours", total: true },
    { key: "actualHours", label: "Worked hrs", value: r => r.actualHours, kind: "hours", total: true },
    { key: "otHours", label: "OT hrs", value: r => r.otHours, kind: "hours", total: true },
    { key: "otPay", label: "OT pay", value: r => r.otPay, kind: "money", total: true, sign: "+" },
    { key: "absenceCost", label: "Absence ded.", value: r => r.absenceCost, kind: "money", total: true, sign: "-" },
  ];

  const advanceCols: Col<OpenAdvance>[] = [
    { key: "code", label: "Employee ID", value: r => r.employeeCode, kind: "text", exportOnly: true },
    { key: "name", label: "Employee", value: r => r.name, kind: "text", render: r => person(r.name, r.department) },
    { key: "department", label: "Department", value: r => r.department, kind: "text", exportOnly: true },
    { key: "type", label: "Type", value: r => r.type, kind: "text" },
    { key: "issuedOn", label: "Issued", value: r => r.issuedOn, kind: "text", render: r => fmtDate(r.issuedOn) },
    { key: "approved", label: "Approved", value: r => r.approved, kind: "money", total: true },
    { key: "recovered", label: "Recovered", value: r => r.recovered, kind: "money", total: true },
    { key: "balance", label: "Balance", value: r => r.balance, kind: "money", total: true, className: styles.strong },
    { key: "progress", label: "Repaid", value: r => (r.approved ? Math.round((r.recovered / r.approved) * 1000) / 10 : null), kind: "percent",
      render: r => {
        const pct = r.approved ? Math.round((r.recovered / r.approved) * 100) : 0;
        return <span>{pct}%<span className={styles.miniBar}><span className={styles.miniFill} style={{ display: "block", width: `${pct}%`, ["--fill" as any]: "var(--status-good)" }} /></span></span>;
      } },
    { key: "installment", label: "Per month", value: r => r.installment, kind: "money" },
    { key: "nextDeduction", label: "Next deduction", value: r => r.nextDeduction, kind: "text", render: r => fmtDate(r.nextDeduction) },
    { key: "status", label: "Status", value: r => r.status, kind: "text" },
  ];

  // ── Current report ─────────────────────────────────────────────────────
  const meta = REPORTS.find(r => r.id === report)!;
  const periodText = rangeText(range.from, range.to);
  const branchTitle = isAllBranches ? "All branches" : activeBranchName;
  const filterText = [
    report === "advances" ? "Open balances today" : periodText,
    department !== "all" ? department : null,
    report !== "payments" && report !== "advances" && status !== "all" ? (status === "final" ? "Approved & paid" : status) : null,
  ].filter(Boolean).join(" · ");

  const current = (() => {
    switch (report) {
      case "employees": return { columns: employeeCols, rows: employeeRows, key: (r: any) => r.code, sort: { key: "gross", dir: "desc" as const } };
      case "departments": return { columns: deptCols, rows: deptRows, key: (r: any) => r.department, sort: { key: "gross", dir: "desc" as const } };
      case "monthly": return { columns: monthCols, rows: monthRows, key: (r: any) => r.month, sort: { key: "month", dir: "asc" as const } };
      case "payments": return { columns: paymentCols, rows: paymentRows, key: (r: any) => String(r.id), sort: { key: "date", dir: "desc" as const } };
      case "attendance": return { columns: attendanceCols, rows: attendanceRows, key: (r: any) => r.code, sort: { key: "otHours", dir: "desc" as const } };
      case "advances": return { columns: advanceCols, rows: advanceRows, key: (r: any) => String(r.id), sort: { key: "balance", dir: "desc" as const } };
      default: return { columns: registerCols, rows: records, key: (r: any) => `${r.month}|${r.employeeCode}|${r.paymentId ?? r.runId ?? ""}`, sort: { key: "name", dir: "asc" as const } };
    }
  })() as { columns: Col<any>[]; rows: any[]; key: (r: any) => string; sort: { key: string; dir: "asc" | "desc" } };

  const spec = () => ({
    title: `${meta.name} — ${branchTitle}`,
    subtitle: `${filterText} · generated ${new Date().toLocaleString()}`,
    filename: `payroll-${report}_${report === "advances" ? ym(new Date()) : `${range.from}_${range.to}`}`,
    columns: current.columns, rows: sortedForExport(current.rows, current.columns, current.sort),
    currencyCode, moneyText,
  });
  const doExport = (kind: "xlsx" | "csv" | "print") => {
    if (!current.rows.length) return toast.error("Nothing to export for these filters");
    if (kind === "xlsx") { exportXlsx(spec()); toast.success("Exported to Excel"); }
    else if (kind === "csv") { exportCsv(spec()); toast.success("Exported CSV"); }
    else printReport(spec());
  };

  // Summary strip: what the current report adds up to.
  const summary: [string, string][] = (() => {
    if (report === "payments") {
      const total = paymentRows.reduce((s, p) => s + p.amount, 0);
      const people = new Set(paymentRows.map(p => p.employeeCode)).size;
      const manual = paymentRows.filter(p => p.source === "manual").length;
      return [["Payments", String(paymentRows.length)], ["Employees", String(people)], ["Total paid", money(total)],
        ["From payroll", String(paymentRows.length - manual)], ["Manual", String(manual)],
        ["Average", money(paymentRows.length ? total / paymentRows.length : 0)]];
    }
    if (report === "advances") {
      const bal = advanceRows.reduce((s, a) => s + a.balance, 0);
      const appr = advanceRows.reduce((s, a) => s + a.approved, 0);
      const monthly = advanceRows.reduce((s, a) => s + a.installment, 0);
      return [["Open advances", String(advanceRows.length)], ["Employees", String(new Set(advanceRows.map(a => a.employeeCode)).size)],
        ["Approved", money(appr)], ["Recovered", money(appr - bal)], ["Balance", money(bal)], ["Due monthly", money(monthly)]];
    }
    if (report === "attendance") {
      const s = (k: keyof AttendanceRow) => attendanceRows.reduce((t, r) => t + Number(r[k] ?? 0), 0);
      const sched = s("scheduledDays");
      return [["Employees", String(attendanceRows.length)], ["Attendance", sched ? fmtPct((s("presentDays") / sched) * 100) : "—"],
        ["Absent days", fmtNum(s("absentDays"))], ["Late arrivals", fmtNum(s("lateCount"))], ["OT hours", `${fmtNum(s("otHours"))}h`],
        ["OT pay", money(s("otPay"))]];
    }
    return [["Employees", String(T.employees)], ["Gross pay", money(T.gross)], ["Deductions", money(T.totalDeductions)],
      ["Net pay", money(T.net)], ["Paid", money(T.paid)],
      T.draft > 0 && T.unpaid === 0 ? ["Draft (not approved)", money(T.draft)] : ["Approved, unpaid", money(T.unpaid)]];
  })();

  const expandRegister = (r: PayrollRecord) => {
    const earnings = r.items.filter(i => i.kind === "earning");
    const deductions = r.items.filter(i => i.kind === "deduction");
    const a = r.attendance;
    return (
      <div className={styles.expandBody}>
        <div>
          <div className={styles.blockTitle}>Earnings</div>
          {r.netOnly
            ? <div className={styles.kv}><span>Not itemised (only the net was recorded)</span><span>{money(r.unitemised)}</span></div>
            : <div className={styles.kv}><span>Basic salary</span><span>{money(r.basic)}</span></div>}
          {earnings.map((i, n) => <div key={n} className={styles.kv}><span>{i.label}</span><span className={styles.plus}>+{money(i.amount)}</span></div>)}
          <div className={styles.kv}><span className={styles.strong}>Gross</span><span>{money(r.gross)}</span></div>
        </div>
        <div>
          <div className={styles.blockTitle}>Deductions</div>
          {deductions.length ? deductions.map((i, n) => <div key={n} className={styles.kv}><span>{i.label}</span><span className={styles.minus}>−{money(i.amount)}</span></div>)
            : <div className={styles.kv}><span>None</span><span /></div>}
          <div className={styles.kv}><span className={styles.strong}>Net pay</span><span>{money(r.net)}</span></div>
          {r.netOnly && <div className={styles.kpiHint} style={{ marginTop: 6 }}>Older payment — only the net amount was recorded.</div>}
        </div>
        <div>
          {a ? (
            <>
              <div className={styles.blockTitle}>Attendance</div>
              <div className={styles.kv}><span>Present / scheduled</span><span>{fmtNum(a.presentDays)} / {fmtNum(a.scheduledDays)} days</span></div>
              <div className={styles.kv}><span>Absent · unpaid leave</span><span>{fmtNum(a.absentDays)} · {fmtNum(a.unpaidLeaveDays)}</span></div>
              <div className={styles.kv}><span>Paid leave · late</span><span>{fmtNum(a.paidLeaveDays)} · {a.lateCount}</span></div>
              <div className={styles.kv}><span>Hours worked / scheduled</span><span>{fmtNum(a.actualHours)}h / {fmtNum(a.scheduledHours)}h</span></div>
              <div className={styles.kv}><span>Approved overtime</span><span>{fmtNum(a.otHours)}h</span></div>
            </>
          ) : <div className={styles.blockTitle}>Payment</div>}
          {r.methods.length > 0 && (
            <>
              {a && <div className={styles.blockTitle} style={{ marginTop: 10 }}>Payment</div>}
              {r.methods.map((m, n) => <div key={n} className={styles.kv}><span>{m.mode}</span><span>{money(m.amount)}</span></div>)}
              <div className={styles.kv}><span>Paid on</span><span>{fmtDate(r.paidDate)}</span></div>
            </>
          )}
          {!a && !r.methods.length && <div className={styles.kv}><span>Not paid yet</span><span /></div>}
        </div>
      </div>
    );
  };

  const showStatus = report !== "payments" && report !== "advances";
  const periodBound = report !== "advances";

  return (
    <div className={styles.root}>
      <PageHeader
        crumbs={[{ label: "Payroll & Employees", to: "payroll-employees" }, { label: "Payroll Reports" }]}
        onCrumb={to => onNavigate?.(to)}
        icon={FileText}
        title="Payroll Reports"
        subtitle={`Registers, summaries and payment logs from payroll runs and salary payments · ${branchTitle}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.("payroll-analytics")}><FileSpreadsheet className="h-4 w-4 mr-1" />Analytics</Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          </>
        }
      />

      <div className={styles.reportNav} role="tablist" aria-label="Report">
        {REPORTS.map(r => (
          <button key={r.id} type="button" role="tab" aria-selected={report === r.id} className={styles.reportCard}
            data-active={report === r.id} onClick={() => setReport(r.id)}>
            <span className={styles.reportIcon}><r.icon size={16} /></span>
            <span className={styles.reportName}>{r.name}</span>
            <span className={styles.reportDesc}>{r.desc}</span>
          </button>
        ))}
      </div>

      {periodBound ? (
        <PeriodFilter preset={preset} onPreset={setPreset} custom={custom} onCustom={setCustom}>
          <DeptSelect value={department} onChange={setDepartment} departments={departments} />
          {showStatus && (
            <Select value={status} onValueChange={v => setStatus(v as StatusFilter)}>
              <SelectTrigger className="w-[170px]" aria-label="Status"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="final">Approved & paid</SelectItem>
                <SelectItem value="Paid">Paid only</SelectItem>
                <SelectItem value="Unpaid">Unpaid only</SelectItem>
                <SelectItem value="Draft">Drafts only</SelectItem>
                <SelectItem value="all">Everything</SelectItem>
              </SelectContent>
            </Select>
          )}
        </PeriodFilter>
      ) : (
        <div className={`${styles.card} ${styles.filters}`}>
          <span className={styles.filterLabel}>Balances as of today — not tied to a period</span>
          <div className={styles.filterEnd}><DeptSelect value={department} onChange={setDepartment} departments={departments} /></div>
        </div>
      )}

      {error && <div className={`${styles.card} ${styles.errorBox}`}>{error}</div>}

      <section className={`${styles.card} ${styles.panel} ${loading && data ? styles.loadingVeil : ""}`}>
        <div className={styles.panelHead}>
          <div>
            <h2 className={styles.panelTitle}>{meta.name}</h2>
            <div className={styles.panelSub}>{filterText}{report === "register" ? " · click a row for the payslip breakdown" : ""}</div>
          </div>
          <div className={styles.toolbar}>
            <div className={styles.search}>
              <Search size={14} />
              <Input placeholder="Search employee or ID…" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search" />
            </div>
            <Button variant="outline" size="sm" onClick={() => doExport("print")} disabled={!data}><Printer className="h-4 w-4 mr-1" />Print</Button>
            <Button variant="outline" size="sm" onClick={() => doExport("csv")} disabled={!data}><Download className="h-4 w-4 mr-1" />CSV</Button>
            <Button size="sm" onClick={() => doExport("xlsx")} disabled={!data}><FileSpreadsheet className="h-4 w-4 mr-1" />Excel</Button>
          </div>
        </div>

        {!data && loading ? (
          <div className={styles.centered}><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : data && (
          <>
            <div className={styles.summaryStrip}>
              {summary.map(([label, value]) => (
                <div key={label} className={styles.summaryCell}>
                  <div className={styles.summaryLabel}>{label}</div>
                  <div className={styles.summaryValue} title={value}>{value}</div>
                </div>
              ))}
            </div>
            {report === "attendance" && !attendanceRows.length && records.length > 0 && (
              <div className={styles.noteBar}>Attendance and overtime come from payroll runs. Months paid only through Salary Payments have no attendance detail.</div>
            )}
            <ReportTable
              key={report}
              columns={current.columns}
              rows={current.rows}
              rowKey={current.key}
              money={money}
              initialSort={current.sort}
              expand={report === "register" ? expandRegister : undefined}
              empty={emptyText(report, data)}
            />
          </>
        )}
      </section>
    </div>
  );
}

function DeptSelect({ value, onChange, departments }: { value: string; onChange: (v: string) => void; departments: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[170px]" aria-label="Department"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All departments</SelectItem>
        {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function emptyText(report: ReportId, data: PayrollDataset): string {
  if (report === "advances") return "No salary advances are outstanding.";
  if (report === "payments") return "No salary payments for this period.";
  if (!data.records.length) return "No payroll or salary payments recorded for this period.";
  return "No rows match these filters.";
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

/** Exports follow the on-screen default order. */
function sortedForExport<T>(rows: T[], columns: Col<T>[], sort: { key: string; dir: "asc" | "desc" }): T[] {
  const c = columns.find(x => x.key === sort.key);
  if (!c) return rows;
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = c.value(a), y = c.value(b);
    if (x == null) return 1;
    if (y == null) return -1;
    return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * dir;
  });
}
