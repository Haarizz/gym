import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calculator, Users, CheckCircle, FileText, Download, Send, Eye, Calendar as CalendarIcon, RefreshCw, BarChart3,
  PieChart, AlertCircle, Plus, Search, Printer, Trash2, Wallet, Clock, TrendingUp, TimerOff, ClipboardEdit, Percent, Undo2, Lock,
} from "lucide-react";
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { useCurrency } from "../utils/currency";
import { hasPermission } from "../utils/permissions";
import { useBranch } from "../utils/branch-context";
import { exportAsCsv } from "../utils/export-utils";
import { printHtml } from "../utils/print-html";
import { getCompanyDetails } from "../utils/company-details";
import { payrollRunService, PayrollRun, PayrollLine, PayrollReadiness } from "../utils/supabase/workforce-service";
import {
  PageHeader, Kpi, Badge, Note, Panel, TabBar, Person, Empty, Field, Stat, Money, Line, ProgressBar, Tone, cx, wf as s,
  formatDate, hoursLabel, errorMessage, useMoneyText, MONTHS,
} from "../components/workforce/ui";

interface PayrollProps { onNavigate?: (section: string, params?: Record<string, any>) => void; }

type TabId = "dashboard" | "review" | "history" | "reports";

const RUN_TONE: Record<string, Tone> = { Draft: "gray", Approved: "blue", "Partially Paid": "amber", Paid: "green", Disbursed: "green" };
const isPaid = (r: PayrollRun) => r.status === "Paid" || r.status === "Disbursed";
const awaitingPayment = (r: PayrollRun) => r.status === "Approved" || r.status === "Partially Paid";
const CHART_COLORS = ["#2B7A78", "#3B82F6", "#8B5CF6", "#F59E0B", "#EC4899", "#10B981", "#EF4444", "#0EA5E9"];

const sum = (lines: PayrollLine[], key: keyof PayrollLine) => lines.reduce((t, l) => t + Number(l[key] || 0), 0);
const lineDeductions = (l: PayrollLine) => Number(l.attendance_deduction) + Number(l.advance_repayment) + Number(l.other_deductions);

export function Payroll({ onNavigate }: PayrollProps) {
  const { activeBranchId } = useBranch();
  const { currencyCode } = useCurrency();
  const money = useMoneyText();
  const canCreate = hasPermission("PAYROLL_CREATE") || hasPermission("PAYROLL_EDIT");
  const canApprove = hasPermission("PAYROLL_APPROVE");
  const canEdit = hasPermission("PAYROLL_EDIT");
  const canPay = hasPermission("SALARY_PAYMENTS_VIEW");

  const now = new Date();
  const [tab, setTab] = useState<TabId>("dashboard");
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selected, setSelected] = useState<PayrollRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [runLoading, setRunLoading] = useState(false);

  // The month most payroll is run for: last month until the 25th, then this month.
  const defaultPeriod = now.getDate() >= 25 ? { y: now.getFullYear(), m: now.getMonth() + 1 } : { y: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(), m: now.getMonth() === 0 ? 12 : now.getMonth() };
  const [genYear, setGenYear] = useState(String(defaultPeriod.y));
  const [genMonth, setGenMonth] = useState(String(defaultPeriod.m));
  const [genOpen, setGenOpen] = useState(false);
  const [readiness, setReadiness] = useState<PayrollReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const [search, setSearch] = useState("");
  const [dept, setDept] = useState("all");
  const [payslip, setPayslip] = useState<PayrollLine | null>(null);
  const [confirm, setConfirm] = useState<"approve" | "reopen" | "delete" | null>(null);

  const loadRuns = useCallback(async (selectId?: number) => {
    setLoading(true);
    try {
      const list = await payrollRunService.list();
      setRuns(list);
      const pick = selectId ?? selected?.id ?? list[0]?.id;
      if (pick) {
        setRunLoading(true);
        setSelected(await payrollRunService.get(pick).catch(() => null));
      } else {
        setSelected(null);
      }
    } catch (e) {
      toast.error(errorMessage(e, "Failed to load payroll"));
    } finally {
      setLoading(false);
      setRunLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns, activeBranchId]);

  const loadReadiness = useCallback(async (y: number, m: number) => {
    setReadinessLoading(true);
    try { setReadiness(await payrollRunService.readiness(y, m)); }
    catch { setReadiness(null); }
    finally { setReadinessLoading(false); }
  }, []);

  useEffect(() => { loadReadiness(Number(genYear), Number(genMonth)); }, [genYear, genMonth, loadReadiness, activeBranchId]);

  const openRun = async (id: number) => {
    setRunLoading(true);
    setTab("review");
    try { setSelected(await payrollRunService.get(id)); }
    catch (e) { toast.error(errorMessage(e, "Failed to load payroll run")); }
    finally { setRunLoading(false); }
  };

  const generate = async () => {
    setBusy(true);
    try {
      const run = await payrollRunService.generate(Number(genYear), Number(genMonth));
      toast.success(`Payroll for ${run.period_label} calculated — review it before approving`);
      setGenOpen(false);
      setSelected(run);
      setTab("review");
      loadRuns(run.id);
    } catch (e) {
      toast.error(errorMessage(e, "Failed to generate payroll"));
    } finally {
      setBusy(false);
    }
  };

  const recalc = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const run = await payrollRunService.generate(selected.year, selected.month, selected.notes ?? undefined);
      toast.success("Payroll recalculated with the latest attendance, commission and deductions");
      setSelected(run);
      loadRuns(run.id);
    } catch (e) {
      toast.error(errorMessage(e, "Failed to recalculate"));
    } finally {
      setBusy(false);
    }
  };

  const doConfirm = async () => {
    if (!selected || !confirm) return;
    setBusy(true);
    try {
      if (confirm === "approve") {
        setSelected(await payrollRunService.approve(selected.id));
        toast.success("Payroll approved — pay the salaries in Salary Payments");
      } else if (confirm === "reopen") {
        setSelected(await payrollRunService.reopen(selected.id));
        toast.success("Payroll reopened as a draft — recalculate and approve it again");
      } else {
        await payrollRunService.remove(selected.id);
        toast.success("Draft payroll deleted");
        setSelected(null);
      }
      setConfirm(null);
      loadRuns(confirm === "delete" ? undefined : selected.id);
    } catch (e) {
      toast.error(errorMessage(e, "Action failed"));
    } finally {
      setBusy(false);
    }
  };

  // Salary Payments opens on this run's month and pays each employee their approved net pay.
  const paySalaries = (r: PayrollRun) => onNavigate?.("salary-payments", { month: MONTHS[r.month - 1], year: String(r.year) });

  // ── Derived ───────────────────────────────────────────────────────────────
  const lines = selected?.lines ?? [];
  const departments = useMemo(() => Array.from(new Set(lines.map(l => l.department).filter(Boolean) as string[])).sort(), [lines]);
  const filtered = useMemo(() => lines.filter(l =>
    (dept === "all" || l.department === dept) &&
    (!search || `${l.employee_name} ${l.employee_code ?? ""}`.toLowerCase().includes(search.toLowerCase()))), [lines, dept, search]);

  const stats = useMemo(() => ({
    drafts: runs.filter(r => r.status === "Draft").length,
    awaiting: runs.filter(awaitingPayment).length,
    paid: runs.filter(isPaid).length,
    lastNet: runs.find(isPaid)?.total_net ?? 0,
  }), [runs]);

  const trend = useMemo(() => {
    const byPeriod = new Map<string, PayrollRun>();
    runs.forEach(r => { if (!byPeriod.has(r.period)) byPeriod.set(r.period, r); });
    return Array.from(byPeriod.values()).sort((a, b) => a.period.localeCompare(b.period)).slice(-12)
      .map(r => ({ month: `${MONTHS[r.month - 1].slice(0, 3)} ${String(r.year).slice(2)}`, net: Number(r.total_net), gross: Number(r.total_gross) }));
  }, [runs]);

  const deptChart = useMemo(() => {
    const m = new Map<string, number>();
    lines.forEach(l => m.set(l.department || "Unassigned", (m.get(l.department || "Unassigned") || 0) + Number(l.net_pay)));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [lines]);

  const deductionChart = useMemo(() => [
    { name: "Attendance", value: sum(lines, "attendance_deduction") },
    { name: "Advances", value: sum(lines, "advance_repayment") },
    { name: "Other", value: sum(lines, "other_deductions") },
  ], [lines]);

  const totals = useMemo(() => ({
    basic: sum(filtered, "basic_salary"), allowances: sum(filtered, "allowances"), ot: sum(filtered, "ot_pay"),
    commission: sum(filtered, "commission"), attendance: sum(filtered, "attendance_deduction"), advance: sum(filtered, "advance_repayment"),
    other: sum(filtered, "other_deductions"), gross: sum(filtered, "gross_pay"), net: sum(filtered, "net_pay"),
    schedHrs: sum(filtered, "scheduled_hours"), actualHrs: sum(filtered, "actual_hours"), regHrs: sum(filtered, "regular_hours"), otHrs: sum(filtered, "approved_ot_hours"),
  }), [filtered]);

  // ── Exports & print ───────────────────────────────────────────────────────
  const exportRegister = () => {
    if (!selected) return;
    exportAsCsv(`payroll-register-${selected.period}.csv`,
      ["Employee", "Code", "Designation", "Department", "Basic", "Allowances", "Gross Fixed", "Scheduled Hrs", "Actual Hrs", "Regular Hrs", "Approved OT Hrs",
        "OT Earnings", "Commission", "Attendance Deduction", "Advance Repayment", "Other Deductions", "Gross Pay", "Net Pay"],
      lines.map(l => [l.employee_name, l.employee_code, l.designation, l.department, l.basic_salary, l.allowances, Number(l.basic_salary) + Number(l.allowances),
        l.scheduled_hours, l.actual_hours, l.regular_hours, l.approved_ot_hours, l.ot_pay, l.commission, l.attendance_deduction, l.advance_repayment,
        l.other_deductions, l.gross_pay, l.net_pay]));
  };
  const exportAttendance = () => {
    if (!selected) return;
    exportAsCsv(`attendance-vs-salary-${selected.period}.csv`,
      ["Employee", "Scheduled Days", "Present", "Absent", "Paid Leave", "Unpaid Leave", "Late Arrivals", "Attendance Deduction", "Net Pay"],
      lines.map(l => [l.employee_name, l.scheduled_days, l.present_days, l.absent_days, l.paid_leave_days, l.unpaid_leave_days, l.late_count, l.attendance_deduction, l.net_pay]));
  };
  const exportOvertime = () => {
    if (!selected) return;
    exportAsCsv(`overtime-${selected.period}.csv`,
      ["Employee", "Scheduled Hrs", "Actual Hrs", "Total OT Hrs", "Approved OT Hrs", "OT Rate", "OT Earnings"],
      lines.map(l => [l.employee_name, l.scheduled_hours, l.actual_hours, l.breakdown?.attendance?.ot_hours ?? "", l.approved_ot_hours, l.breakdown?.ot_rate ?? "", l.ot_pay]));
  };

  const printPayslip = async (l: PayrollLine) => {
    if (!selected) return;
    const company = await getCompanyDetails().catch(() => null);
    const b = l.breakdown;
    const esc = (v: unknown) => String(v ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
    const row = (label: string, value: string, strong = false) =>
      `<tr${strong ? ' class="t"' : ""}><td>${esc(label)}</td><td class="r">${esc(value)}</td></tr>`;
    const block = (title: string, rows: string) => `<h3>${esc(title)}</h3><table>${rows}</table>`;
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Payslip ${esc(l.employee_name)} ${esc(selected.period_label)}</title>
<style>@page{size:A4;margin:14mm}body{font-family:'Plus Jakarta Sans Variable',Segoe UI,Arial,sans-serif;color:#1e293b;font-size:12px}
header{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #2B7A78;padding-bottom:10px;margin-bottom:14px}
header img{max-height:48px}h1{font-size:18px;margin:0;color:#2B7A78}h2{font-size:14px;margin:0}h3{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#64748b;margin:14px 0 4px}
table{width:100%;border-collapse:collapse}td{padding:4px 0;border-bottom:1px solid #eef2f7}.r{text-align:right}.t td{font-weight:700;border-top:1px solid #cbd5e1}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:8px 0}.meta div{background:#f1f5f9;border-radius:6px;padding:6px}.meta b{display:block;font-size:13px}
.net{margin-top:16px;padding:12px;border:2px solid #2B7A78;border-radius:8px;display:flex;justify-content:space-between;font-size:16px;font-weight:800;color:#2B7A78}
footer{margin-top:24px;color:#64748b;font-size:10px}</style></head><body>
<header><div>${company?.logo ? `<img src="${company.logo}" alt="">` : ""}<h1>${esc(company?.name || "GymBios")}</h1><div>${esc(company?.address || "")}</div></div>
<div class="r"><h2>Payslip</h2><div>${esc(selected.period_label)}</div><div>Status: ${esc(selected.status)}</div></div></header>
<h2>${esc(l.employee_name)}</h2><div>${esc([l.employee_code, l.designation, l.department].filter(Boolean).join(" · "))}</div>
<div class="meta"><div>Scheduled days<b>${l.scheduled_days}</b></div><div>Present<b>${l.present_days}</b></div><div>Absent<b>${l.absent_days}</b></div><div>Unpaid leave<b>${l.unpaid_leave_days}</b></div></div>
${block("A. Fixed salary", row("Basic salary", money(l.basic_salary)) + (b?.allowances ?? []).map(a => row(a.name, money(a.amount))).join("") + row("Gross fixed", money(Number(l.basic_salary) + Number(l.allowances)), true))}
${block("B. Working hours", row("Scheduled hours", hoursLabel(l.scheduled_hours)) + row("Actual hours", hoursLabel(l.actual_hours)) + row("Regular hours", hoursLabel(l.regular_hours)) + row("Approved overtime", hoursLabel(l.approved_ot_hours)))}
${block("C. Variable earnings", row("Overtime earnings", money(l.ot_pay)) + Object.entries(b?.commission ?? {}).map(([k, v]) => row(k === "pos" ? "POS commission" : "Membership commission", money(v))).join("") + row("Total variable", money(Number(l.ot_pay) + Number(l.commission)), true))}
${block("D. Deductions", row("Absence / unpaid leave", money(l.attendance_deduction)) + (b?.advances ?? []).map(a => row(`Advance installment ${a.installment_no}/${a.installments}`, money(a.amount))).join("") + (b?.deductions ?? []).map(d => row(d.type, money(d.amount))).join("") + row("Total deductions", money(lineDeductions(l)), true))}
${block("E. Summary", row("Gross pay", money(l.gross_pay)) + row("Total deductions", "− " + money(lineDeductions(l))))}
<div class="net"><span>Net pay</span><span>${esc(money(l.net_pay))}</span></div>
<footer>Generated by GymBios on ${new Date().toLocaleString()}. Overtime is paid on approved hours only.</footer></body></html>`;
    printHtml(html);
  };

  const periodText = `${MONTHS[Number(genMonth) - 1]} ${genYear}`;
  const existingForPeriod = runs.find(r => r.year === Number(genYear) && r.month === Number(genMonth));
  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(String);

  const readinessItems = readiness ? [
    { icon: AlertCircle, tone: "red" as Tone, n: readiness.deductible_absence_days, label: `absence / unpaid leave ${readiness.deductible_absence_days === 1 ? "day" : "days"} will be deducted — check they are real absences`, to: "staff-attendance", params: { tab: "monthly" } },
    { icon: Clock, tone: "violet" as Tone, n: readiness.pending_ot_days, label: `${readiness.pending_ot_days === 1 ? "day" : "days"} with overtime waiting for approval`, to: "staff-attendance", params: { tab: "daily" } },
    { icon: TimerOff, tone: "rose" as Tone, n: readiness.incomplete_punches, label: "incomplete punches (missing clock-out)", to: "staff-attendance", params: { tab: "daily" } },
    { icon: ClipboardEdit, tone: "amber" as Tone, n: readiness.pending_corrections, label: "attendance corrections pending", to: "staff-attendance", params: { tab: "corrections" } },
    { icon: Percent, tone: "blue" as Tone, n: readiness.undecided_commission_staff, label: `${readiness.undecided_commission_staff === 1 ? "employee" : "employees"} with unapproved commission (${money(readiness.undecided_commission_total)}) — only approved commission is paid`, to: "set-targets", params: { tab: "earnings" } },
    { icon: Users, tone: "gray" as Tone, n: readiness.employees_without_shift, label: `${readiness.employees_without_shift === 1 ? "employee" : "employees"} without a shift (paid fixed salary, no attendance deductions)`, to: "shifts-schedules" },
  ] : [];

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className={s.page}>
      <PageHeader
        crumbs={[{ label: "Payroll & Employees", to: "payroll-employees" }, { label: "Payroll" }]}
        onCrumb={to => onNavigate?.(to)}
        icon={Calculator}
        title="Payroll Management"
        subtitle="Salaries from shifts, attendance, approved overtime, commission, advances and deductions"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.("staff-attendance")}><Clock className="h-4 w-4 mr-1" />Staff Attendance</Button>
            <Button variant="outline" size="sm" onClick={() => onNavigate?.("salary-advances")}><Wallet className="h-4 w-4 mr-1" />Advances & Deductions</Button>
            {canCreate && <Button size="sm" onClick={() => setGenOpen(true)}><Plus className="h-4 w-4 mr-1" />Generate Payroll</Button>}
          </>
        }
      />

      <TabBar<TabId>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "dashboard", label: "Dashboard", icon: BarChart3 },
          { id: "review", label: "Review Payroll", icon: Eye },
          { id: "history", label: "Payroll History", icon: CalendarIcon, count: runs.length, countTone: "gray" },
          { id: "reports", label: "Reports", icon: FileText },
        ]}
      />

      {/* ── Dashboard ─────────────────────────────────────────────────────── */}
      {tab === "dashboard" && (
        <>
          <div className={s.kpis}>
            <Kpi icon={Users} label="Employees on payroll" value={readiness?.employees ?? "—"} tone="teal" />
            <Kpi icon={FileText} label="Draft payrolls" value={stats.drafts} tone="gray" onClick={() => setTab("history")} />
            <Kpi icon={CheckCircle} label="Approved, awaiting payment" value={stats.awaiting} tone="blue" onClick={() => setTab("history")} />
            <Kpi icon={Wallet} label="Paid payrolls" value={stats.paid} tone="green" onClick={() => setTab("history")} />
            <Kpi icon={TrendingUp} label="Last paid net" value={<Money value={stats.lastNet} />} tone="violet" />
          </div>

          <div className={cx(s.grid2, s.grid2Wide)}>
            <Panel
              title={`Before you run ${periodText}`}
              description="Open items that change what employees are paid"
              actions={
                <div className={s.row}>
                  <Select value={genMonth} onValueChange={setGenMonth}>
                    <SelectTrigger className="h-8" style={{ width: "8.5rem" }}><SelectValue /></SelectTrigger>
                    <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={genYear} onValueChange={setGenYear}>
                    <SelectTrigger className="h-8" style={{ width: "5.5rem" }}><SelectValue /></SelectTrigger>
                    <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              }
            >
              {readinessLoading ? <Empty icon={RefreshCw} title="Checking…" /> : (
                <div className={s.stack} style={{ gap: "0.5rem" }}>
                  {readiness?.month_running && <Note tone="amber">{periodText} hasn't ended — attendance after today counts as scheduled, not absent.</Note>}
                  {readinessItems.filter(i => i.n > 0).length === 0 ? (
                    <Note tone="green">Everything is in order for {periodText}.</Note>
                  ) : readinessItems.filter(i => i.n > 0).map(i => (
                    <button key={i.label} type="button" className={s.itemRow} data-tone={i.tone}
                      style={{ gridTemplateColumns: "auto auto 1fr", textAlign: "left", cursor: "pointer" }}
                      onClick={() => onNavigate?.(i.to, i.params)}>
                      <span className={s.kpiIcon} style={{ width: "1.75rem", height: "1.75rem" }}><i.icon size={14} /></span>
                      <span className={s.strong}>{i.n}</span>
                      <span className={s.small}>{i.label}</span>
                    </button>
                  ))}
                  {existingForPeriod && (
                    <Note tone="blue">A {existingForPeriod.status.toLowerCase()} payroll exists for {periodText}.
                      {" "}<button type="button" className={s.strong} style={{ background: "none", border: 0, padding: 0, color: "var(--primary)", cursor: "pointer" }} onClick={() => openRun(existingForPeriod.id)}>Open it</button></Note>
                  )}
                  {canCreate && (!existingForPeriod || existingForPeriod.status === "Draft") && (
                    <Button onClick={() => setGenOpen(true)}><RefreshCw className="h-4 w-4 mr-1" />{existingForPeriod ? "Recalculate" : "Generate"} {periodText}</Button>
                  )}
                </div>
              )}
            </Panel>

            <Panel title="Recent payroll runs" actions={<Button variant="outline" size="sm" onClick={() => setTab("history")}>View all</Button>}>
              {runs.length === 0 ? (
                <Empty icon={Calculator} title="No payroll runs yet">Generate a month to calculate every employee's pay from attendance.</Empty>
              ) : (
                <div className={s.stack} style={{ gap: "0.5rem" }}>
                  {runs.slice(0, 5).map(r => (
                    <button key={r.id} type="button" className={s.itemRow} style={{ gridTemplateColumns: "1fr auto auto", textAlign: "left", cursor: "pointer" }} onClick={() => openRun(r.id)}>
                      <div className={s.cellStack}>
                        <span className={s.strong}>{r.period_label}</span>
                        <span className={s.cellSub}>{r.employee_count} employees · gross {money(r.total_gross)}</span>
                      </div>
                      <span className={cx(s.strong, s.num)} style={{ color: "var(--primary)" }}><Money value={r.total_net} /></span>
                      <Badge tone={RUN_TONE[r.status]}>{r.status === "Partially Paid" ? `Paid ${r.paid_count}/${r.employee_count}` : r.status}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <Panel title="Monthly payroll trend" description="Net and gross pay of each month's latest run">
            {trend.length === 0 ? <Empty icon={TrendingUp} title="No data yet" /> : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={trend} margin={{ left: 8, right: 16, top: 8 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v: number) => `${currencyCode} ${Number(v).toLocaleString()}`} cursor={{ fill: "rgba(43,122,120,0.06)" }} />
                  <Bar dataKey="gross" name="Gross" fill="#94a3b8" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="net" name="Net" fill="#2B7A78" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Panel>
        </>
      )}

      {/* ── Review ───────────────────────────────────────────────────────── */}
      {tab === "review" && (
        !selected ? (
          <Panel>
            <Empty icon={Calculator} title={runLoading || loading ? "Loading…" : "No payroll selected"}>
              {!runLoading && !loading && "Generate a payroll month or open one from the history."}
              {canCreate && !runLoading && <div style={{ marginTop: "0.75rem" }}><Button size="sm" onClick={() => setGenOpen(true)}><Plus className="h-4 w-4 mr-1" />Generate Payroll</Button></div>}
            </Empty>
          </Panel>
        ) : (
          <>
            <Panel
              title={<span className={s.row}>Payroll — {selected.period_label} <Badge tone={RUN_TONE[selected.status]}>{selected.status}</Badge></span>}
              description={`Calculated ${formatDate(selected.created_at)}${selected.created_by ? ` by ${selected.created_by}` : ""}${selected.approved_by ? ` · approved by ${selected.approved_by}` : ""}${selected.disbursed_at ? ` · ${selected.status === "Disbursed" ? "disbursed" : "fully paid"} ${formatDate(selected.disbursed_at)}` : ""}`}
              actions={
                <>
                  <Select value={String(selected.id)} onValueChange={v => openRun(Number(v))}>
                    <SelectTrigger className="h-9" style={{ width: "15rem" }}><SelectValue /></SelectTrigger>
                    <SelectContent>{runs.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.period_label} · {r.status}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={exportRegister}><Download className="h-4 w-4 mr-1" />Export</Button>
                </>
              }
            >
              <div className={s.kpis}>
                <Kpi icon={Users} label="Employees" value={selected.employee_count} tone="teal" />
                <Kpi icon={Wallet} label="Gross pay" value={<Money value={selected.total_gross} />} tone="blue" />
                <Kpi icon={AlertCircle} label="Total deductions" value={<Money value={selected.total_deductions} />} tone="red" />
                <Kpi icon={CheckCircle} label="Net payable" value={<Money value={selected.total_net} />} tone="green" />
              </div>
              {selected.status !== "Draft" && selected.status !== "Disbursed" && (
                <div className={s.stack} style={{ gap: "0.4rem", marginTop: "1rem" }}>
                  <div className={s.spread}>
                    <span className={s.small}><span className={s.strong}>{selected.paid_count} of {selected.employee_count}</span> employees paid</span>
                    <span className={cx(s.small, s.muted)}><Money value={selected.paid_total} /> of <Money value={selected.total_net} /></span>
                  </div>
                  <ProgressBar value={selected.employee_count ? (selected.paid_count / selected.employee_count) * 100 : 0} tone={isPaid(selected) ? "green" : "teal"} />
                </div>
              )}
            </Panel>
            {awaitingPayment(selected) && (
              <Note tone="blue">
                Approved — pay each employee in <strong>Salary Payments</strong>. The amounts come from this payroll, and paying an employee
                records their advance installments, deductions and commission. The payroll closes as Paid when everyone is paid.
              </Note>
            )}

            <Panel flush>
              <div className={s.filterBar}>
                <div className={s.search}>
                  <Search size={14} />
                  <Input className="h-9" placeholder="Search employees…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={dept} onValueChange={setDept}>
                  <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All departments</SelectItem>
                    {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <span className={cx(s.small, s.muted)} style={{ marginLeft: "auto" }}>Click a row for the payslip</span>
              </div>
              <div className={s.tableWrap}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th className={s.stickyCol}>Employee</th>
                      <th className={s.right}>Basic</th>
                      <th className={s.right}>Allowances</th>
                      <th className={s.right}>Gross Fixed</th>
                      <th className={s.center}>Sched. Hrs</th>
                      <th className={s.center}>Actual Hrs</th>
                      <th className={s.center}>Regular Hrs</th>
                      <th className={s.center}>Appr. OT</th>
                      <th className={s.right}>OT Earnings</th>
                      <th className={s.right}>Commission</th>
                      <th className={s.right}>Attend. Ded.</th>
                      <th className={s.right}>Adv. Repay.</th>
                      <th className={s.right}>Other Ded.</th>
                      <th className={s.right}>Gross Pay</th>
                      <th className={cx(s.right, s.stickyRight)}>Net Pay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(l => (
                      <tr key={l.id} className={s.clickable} onClick={() => setPayslip(l)}>
                        <td className={s.stickyCol}>
                          <Person name={l.employee_name} sub={[l.employee_code, l.designation].filter(Boolean).join(" · ")} size="sm" />
                          {l.breakdown && !l.breakdown.has_shift && <span className={s.cellSub}>No shift — fixed salary</span>}
                        </td>
                        <td className={s.right}><Money value={l.basic_salary} /></td>
                        <td className={s.right}><span data-tone="green" className={s.toneText}><Money value={l.allowances} signed="+" dash /></span></td>
                        <td className={cx(s.right, s.strong)}><Money value={Number(l.basic_salary) + Number(l.allowances)} /></td>
                        <td className={cx(s.center, s.num)}>{hoursLabel(l.scheduled_hours)}</td>
                        <td className={cx(s.center, s.num)}>{hoursLabel(l.actual_hours)}</td>
                        <td className={cx(s.center, s.num)}>{hoursLabel(l.regular_hours)}</td>
                        <td className={cx(s.center, s.num)}><span data-tone="teal" className={Number(l.approved_ot_hours) ? cx(s.toneText, s.strong) : s.muted}>{hoursLabel(l.approved_ot_hours)}</span></td>
                        <td className={s.right}><span data-tone="green" className={s.toneText}><Money value={l.ot_pay} signed="+" dash /></span></td>
                        <td className={s.right}><span data-tone="green" className={s.toneText}><Money value={l.commission} signed="+" dash /></span></td>
                        <td className={s.right}><span data-tone="red" className={s.toneText}><Money value={l.attendance_deduction} signed="-" dash /></span></td>
                        <td className={s.right}><span data-tone="orange" className={s.toneText}><Money value={l.advance_repayment} signed="-" dash /></span></td>
                        <td className={s.right}><span data-tone="violet" className={s.toneText}><Money value={l.other_deductions} signed="-" dash /></span></td>
                        <td className={cx(s.right, s.strong)}><Money value={l.gross_pay} /></td>
                        <td className={cx(s.right, s.stickyRight)}>
                          <span className={s.strong} style={{ color: "var(--primary)" }}><Money value={l.net_pay} /></span>
                          {selected.status !== "Draft" && selected.status !== "Disbursed" && (
                            <div className={s.cellSub}>{l.paid_at ? <Badge tone="green" plain title={`Paid ${formatDate(l.paid_at)}`}>Paid</Badge> : <Badge tone="amber" plain>Pending</Badge>}</div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {filtered.length > 0 && (
                    <tfoot>
                      <tr>
                        <td className={s.stickyCol}>Total ({filtered.length})</td>
                        <td className={s.right}><Money value={totals.basic} /></td>
                        <td className={s.right}><Money value={totals.allowances} /></td>
                        <td className={s.right}><Money value={totals.basic + totals.allowances} /></td>
                        <td className={s.center}>{hoursLabel(totals.schedHrs)}</td>
                        <td className={s.center}>{hoursLabel(totals.actualHrs)}</td>
                        <td className={s.center}>{hoursLabel(totals.regHrs)}</td>
                        <td className={s.center}>{hoursLabel(totals.otHrs)}</td>
                        <td className={s.right}><Money value={totals.ot} /></td>
                        <td className={s.right}><Money value={totals.commission} /></td>
                        <td className={s.right}><Money value={totals.attendance} /></td>
                        <td className={s.right}><Money value={totals.advance} /></td>
                        <td className={s.right}><Money value={totals.other} /></td>
                        <td className={s.right}><Money value={totals.gross} /></td>
                        <td className={cx(s.right, s.stickyRight)} style={{ color: "var(--primary)" }}><Money value={totals.net} /></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
                {filtered.length === 0 && <Empty icon={Users} title="No employees match" />}
              </div>
            </Panel>

            <div className={s.spread}>
              <div className={cx(s.small, s.muted)} style={{ maxWidth: "40rem" }}>
                Net = basic + allowances + approved overtime (1.25× hourly rate) + approved commission − absence/unpaid leave (daily rate) − advance installments − other deductions.
              </div>
              <div className={s.actions}>
                {selected.status === "Draft" && canEdit && <Button variant="ghost" onClick={() => setConfirm("delete")}><Trash2 className="h-4 w-4 mr-1" />Delete draft</Button>}
                {selected.status === "Draft" && canCreate && <Button variant="outline" disabled={busy} onClick={recalc}><RefreshCw className="h-4 w-4 mr-1" />Recalculate</Button>}
                {selected.status === "Draft" && canApprove && <Button onClick={() => setConfirm("approve")}><CheckCircle className="h-4 w-4 mr-1" />Approve Payroll</Button>}
                {selected.status === "Approved" && selected.paid_count === 0 && canApprove && <Button variant="outline" onClick={() => setConfirm("reopen")}><Undo2 className="h-4 w-4 mr-1" />Reopen</Button>}
                {awaitingPayment(selected) && canPay && <Button onClick={() => paySalaries(selected)}><Send className="h-4 w-4 mr-1" />Pay salaries</Button>}
                {isPaid(selected) && <Badge tone="green"><Lock size={11} />{selected.status === "Paid" ? "Paid & locked" : "Locked"}</Badge>}
              </div>
            </div>
            {selected.status === "Draft" && !canApprove && <Note tone="amber">Approving payroll needs the Payroll approve permission.</Note>}
          </>
        )
      )}

      {/* ── History ──────────────────────────────────────────────────────── */}
      {tab === "history" && (
        <Panel title="Payroll history" description="Every calculated month and where it stands" flush>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Period</th><th className={s.center}>Employees</th><th className={s.right}>Gross</th><th className={s.right}>Deductions</th>
                  <th className={s.right}>Net</th><th>Status</th><th>Calculated</th><th>Approved</th><th>Paid</th><th className={s.right}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(r => (
                  <tr key={r.id} className={s.clickable} onClick={() => openRun(r.id)}>
                    <td className={s.strong}>{r.period_label}</td>
                    <td className={s.center}>{r.employee_count}</td>
                    <td className={s.right}><Money value={r.total_gross} /></td>
                    <td className={s.right}><span data-tone="red" className={s.toneText}><Money value={r.total_deductions} signed="-" dash /></span></td>
                    <td className={s.right}><span className={s.strong} style={{ color: "var(--primary)" }}><Money value={r.total_net} /></span></td>
                    <td><Badge tone={RUN_TONE[r.status]}>{r.status}</Badge></td>
                    <td>{formatDate(r.created_at)}<div className={s.cellSub}>{r.created_by}</div></td>
                    <td>{r.approved_at ? formatDate(r.approved_at) : "—"}<div className={s.cellSub}>{r.approved_by}</div></td>
                    <td>
                      {r.disbursed_at ? formatDate(r.disbursed_at) : r.status === "Draft" ? "—" : `${r.paid_count} of ${r.employee_count}`}
                      <div className={s.cellSub}>{r.disbursed_at ? r.disbursed_by : r.status === "Draft" ? "" : <Money value={r.paid_total} />}</div>
                    </td>
                    <td className={s.right}>
                      <div className={s.actions} style={{ justifyContent: "flex-end" }}>
                        {awaitingPayment(r) && canPay && <button className={s.iconBtn} title="Pay salaries" onClick={e => { e.stopPropagation(); paySalaries(r); }}><Send size={14} /></button>}
                        <button className={s.iconBtn} title="Open" onClick={e => { e.stopPropagation(); openRun(r.id); }}><Eye size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && runs.length === 0 && <Empty icon={CalendarIcon} title="No payroll runs yet" />}
          </div>
        </Panel>
      )}

      {/* ── Reports ──────────────────────────────────────────────────────── */}
      {tab === "reports" && (
        !selected ? <Panel><Empty icon={FileText} title="Generate or open a payroll run to see its reports" /></Panel> : (
          <>
            <div className={s.grid2}>
              <Panel title={<span className={s.row}><PieChart size={16} />Net pay by department</span>} description={selected.period_label}>
                {deptChart.length === 0 ? <Empty title="No data" /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <RechartsPie>
                      <Pie data={deptChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={55} paddingAngle={2}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {deptChart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => `${currencyCode} ${Number(v).toLocaleString()}`} />
                    </RechartsPie>
                  </ResponsiveContainer>
                )}
              </Panel>
              <Panel title={<span className={s.row}><BarChart3 size={16} />Deductions by type</span>} description={selected.period_label}>
                {deductionChart.every(d => !d.value) ? <Empty title="No deductions this month" /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={deductionChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => `${currencyCode} ${Number(v).toLocaleString()}`} />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                        {deductionChart.map((_, i) => <Cell key={i} fill={["#E63946", "#F59E0B", "#8B5CF6"][i]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Panel>
            </div>
            <div className={s.grid3}>
              {[
                { icon: FileText, title: "Payroll register", desc: "Every employee's earnings, deductions and net pay", action: exportRegister },
                { icon: Users, title: "Attendance vs salary", desc: "Days present, absences, leave and what they cost", action: exportAttendance },
                { icon: TrendingUp, title: "Overtime", desc: "Total vs approved overtime hours and earnings", action: exportOvertime },
              ].map(r => (
                <Panel key={r.title}>
                  <div className={s.stack} style={{ gap: "0.5rem" }}>
                    <div className={s.row}><span className={s.titleIcon} style={{ width: "2.25rem", height: "2.25rem" }}><r.icon size={18} /></span><span className={s.strong}>{r.title}</span></div>
                    <p className={cx(s.small, s.muted)} style={{ margin: 0 }}>{r.desc} — {selected.period_label}</p>
                    <Button variant="outline" onClick={r.action}><Download className="h-4 w-4 mr-1" />Download CSV</Button>
                  </div>
                </Panel>
              ))}
            </div>
          </>
        )
      )}

      {/* ══ Generate ══════════════════════════════════════════════════════ */}
      <Dialog open={genOpen} onOpenChange={setGenOpen}>
        <DialogContent className={cx(s.dialogMd, s.dialogScroll)}>
          <DialogHeader>
            <DialogTitle>Generate payroll</DialogTitle>
            <DialogDescription>Calculates every active employee's pay for the month and saves it as a draft to review.</DialogDescription>
          </DialogHeader>
          <div className={s.dialogBody}>
            <div className={s.grid2}>
              <Field label="Payroll month">
                <Select value={genMonth} onValueChange={setGenMonth}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Year">
                <Select value={genYear} onValueChange={setGenYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
            {existingForPeriod && existingForPeriod.status !== "Draft" && (
              <Note tone="red">{periodText} is already {existingForPeriod.status.toLowerCase()} and can't be recalculated.</Note>
            )}
            {existingForPeriod?.status === "Draft" && <Note tone="amber">The existing draft for {periodText} will be replaced with fresh figures.</Note>}
            <div className={s.section} data-tone="teal">
              <div className={s.sectionTitle}>Pulled in automatically</div>
              {[
                "Scheduled days and hours from each employee's shift and roster",
                "Absences, unpaid leave, late arrivals and actual hours from Staff Attendance",
                "Approved overtime only, paid at 1.25× the hourly rate",
                "Approved commission (memberships and POS) from Target & Commission",
                "Advance installments and active deductions due this month",
              ].map(t => <div key={t} className={s.line}><span className={s.row} style={{ gap: "0.4rem" }}><CheckCircle size={14} color="var(--primary)" />{t}</span></div>)}
            </div>
            {readinessItems.filter(i => i.n > 0).length > 0 && (
              <Note tone="amber">
                {readinessItems.filter(i => i.n > 0).map(i => `${i.n} ${i.label.split(" (")[0].split(" —")[0]}`).join(" · ")}. You can still generate now and recalculate after fixing them.
              </Note>
            )}
          </div>
          <div className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button disabled={busy || (!!existingForPeriod && existingForPeriod.status !== "Draft")} onClick={generate}>
              <RefreshCw className="h-4 w-4 mr-1" />{busy ? "Calculating…" : "Generate & calculate"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ Payslip ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!payslip} onOpenChange={v => !v && setPayslip(null)}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          {payslip && selected && (() => {
            const l = payslip;
            const b = l.breakdown;
            const att = b?.attendance;
            const grossFixed = Number(l.basic_salary) + Number(l.allowances);
            const variable = Number(l.ot_pay) + Number(l.commission);
            const perDay = Number(b?.per_day_rate || 0);
            const absentDed = perDay * Number(l.absent_days);
            const unpaidDed = perDay * Number(l.unpaid_leave_days);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>Payslip — {l.employee_name}</DialogTitle>
                  <DialogDescription>{[l.employee_code, l.designation, l.department].filter(Boolean).join(" · ")} · {selected.period_label}</DialogDescription>
                </DialogHeader>
                <div className={s.dialogBody}>
                  {b && !b.has_shift && <Note tone="blue">No shift was assigned this month, so attendance isn't tracked: the fixed salary is paid in full.</Note>}

                  <div className={s.section}>
                    <div className={s.sectionTitle}>A. Fixed salary</div>
                    <Line label="Basic salary" value={money(l.basic_salary)} />
                    {(b?.allowances ?? []).map(a => <Line key={a.name} label={a.name} value={money(a.amount)} />)}
                    <Line label="Gross fixed earnings" value={money(grossFixed)} total tone="teal" />
                  </div>

                  <div className={s.section}>
                    <div className={s.sectionTitle}>B. Attendance & working hours</div>
                    <div className={s.stats} style={{ marginBottom: "0.5rem" }}>
                      <Stat label="Scheduled days" value={l.scheduled_days} />
                      <Stat label="Present" value={l.present_days} />
                      <Stat label="Absent" value={l.absent_days} />
                      <Stat label="Paid leave" value={l.paid_leave_days} />
                      <Stat label="Unpaid leave" value={l.unpaid_leave_days} />
                      <Stat label="Late arrivals" value={l.late_count} />
                    </div>
                    <Line label="Scheduled hours" value={hoursLabel(l.scheduled_hours)} />
                    <Line label="Actual hours worked" value={hoursLabel(l.actual_hours)} />
                    <Line label="Regular hours" value={hoursLabel(l.regular_hours)} />
                    <Line label={`Overtime worked${att && Number(att.ot_hours) > Number(l.approved_ot_hours) ? " (approved / total)" : ""}`}
                      value={att && Number(att.ot_hours) > Number(l.approved_ot_hours) ? `${hoursLabel(l.approved_ot_hours)} / ${hoursLabel(att.ot_hours)}` : hoursLabel(l.approved_ot_hours)} />
                  </div>

                  <div className={s.section} data-tone="green">
                    <div className={s.sectionTitle}>C. Variable earnings</div>
                    <Line label={`Overtime (${hoursLabel(l.approved_ot_hours)} × ${money(b?.ot_rate)})`} value={money(l.ot_pay)} tone="green" />
                    {Object.entries(b?.commission ?? {}).map(([k, v]) => (
                      <Line key={k} label={k === "pos" ? "POS sales commission" : "Membership commission"} value={money(v)} tone="green" />
                    ))}
                    {!Object.keys(b?.commission ?? {}).length && <Line label="Commission" value="— (none approved)" />}
                    <Line label="Total variable earnings" value={money(variable)} total tone="green" />
                  </div>

                  <div className={s.section} data-tone="red">
                    <div className={s.sectionTitle}>D. Attendance deductions</div>
                    {b?.rate_days ? <div className={s.cellSub} style={{ marginBottom: 4 }}>Daily rate = basic {money(l.basic_salary)} ÷ {b.rate_days} working days in a full month on this shift</div> : null}
                    <Line label={`Absence (${l.absent_days} day${Number(l.absent_days) === 1 ? "" : "s"} × ${money(perDay)})`} value={absentDed ? money(absentDed) : "—"} tone="red" />
                    <Line label={`Unpaid leave (${l.unpaid_leave_days} day${Number(l.unpaid_leave_days) === 1 ? "" : "s"} × ${money(perDay)})`} value={unpaidDed ? money(unpaidDed) : "—"} tone="red" />
                    <Line label="Total attendance deductions" value={money(l.attendance_deduction)} total tone="red" />
                  </div>

                  <div className={s.section} data-tone="orange">
                    <div className={s.sectionTitle}>D2. Advance repayments</div>
                    {(b?.advances ?? []).length === 0 ? <Line label="No advance installments this month" value="—" /> :
                      (b?.advances ?? []).map(a => <Line key={a.advance_id} label={`${a.advance_type} ADV-${a.advance_id} · installment ${a.installment_no}/${a.installments}`} value={money(a.amount)} tone="orange" />)}
                    {(b?.advances ?? []).length > 0 && <Line label="Total advance repayments" value={money(l.advance_repayment)} total tone="orange" />}
                  </div>

                  <div className={s.section} data-tone="violet">
                    <div className={s.sectionTitle}>D3. Other deductions</div>
                    {(b?.deductions ?? []).length === 0 ? <Line label="No other deductions this month" value="—" /> :
                      (b?.deductions ?? []).map(d => <Line key={d.deduction_id} label={`${d.type}${d.reason ? ` — ${d.reason}` : ""}`} value={money(d.amount)} tone="violet" />)}
                    {(b?.deductions ?? []).length > 0 && <Line label="Total other deductions" value={money(l.other_deductions)} total tone="violet" />}
                  </div>

                  <div className={s.section} data-tone="teal" style={{ background: "color-mix(in srgb, var(--primary) 10%, var(--card))" }}>
                    <div className={s.sectionTitle}>E. Final summary</div>
                    <Line label="Gross fixed salary" value={money(grossFixed)} />
                    <Line label="Variable earnings" value={`+ ${money(variable)}`} tone="green" />
                    <Line label="Total gross pay" value={money(l.gross_pay)} />
                    <Line label="Attendance deductions" value={`− ${money(l.attendance_deduction)}`} tone="red" />
                    <Line label="Advance repayments" value={`− ${money(l.advance_repayment)}`} tone="orange" />
                    <Line label="Other deductions" value={`− ${money(l.other_deductions)}`} tone="violet" />
                    <div className={s.netRow}><span className={s.netLabel}>Net pay</span><span className={s.netValue}>{money(l.net_pay)}</span></div>
                  </div>
                  {b?.net_floored_by ? <Note tone="red">Deductions exceeded earnings by {money(b.net_floored_by)}; net pay is shown as zero.</Note> : null}
                  <Note tone="amber">Unapproved overtime and commission are not included. Recalculate a draft after approving them.</Note>
                </div>
                <div className={s.dialogFooter}>
                  <Button variant="outline" onClick={() => setPayslip(null)}>Close</Button>
                  <Button onClick={() => printPayslip(l)}><Printer className="h-4 w-4 mr-1" />Print / PDF</Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ══ Confirm ═══════════════════════════════════════════════════════ */}
      <Dialog open={!!confirm} onOpenChange={v => !v && setConfirm(null)}>
        <DialogContent className={s.dialogMd}>
          {selected && confirm && (
            <>
              <DialogHeader>
                <DialogTitle>{confirm === "approve" ? "Approve payroll" : confirm === "reopen" ? "Reopen payroll" : "Delete draft payroll"}</DialogTitle>
                <DialogDescription>{selected.period_label} · {selected.employee_count} employees</DialogDescription>
              </DialogHeader>
              <div className={s.dialogBody}>
                <div className={s.section}>
                  <Line label="Gross pay" value={money(selected.total_gross)} />
                  <Line label="Deductions" value={`− ${money(selected.total_deductions)}`} tone="red" />
                  <Line label="Net payable" value={money(selected.total_net)} total tone="teal" />
                </div>
                {confirm === "approve" && (
                  <Note tone="amber">
                    Approved payroll is paid in <strong>Salary Payments</strong> at these amounts and can't be recalculated. Make sure attendance,
                    overtime and commission are final. Employees already paid manually for this month are matched to their line.
                  </Note>
                )}
                {confirm === "reopen" && <Note tone="blue">The payroll goes back to Draft so it can be recalculated. Nobody on it has been paid yet.</Note>}
                {confirm === "delete" && <Note tone="red">The draft and its calculations are removed. Nothing else changes.</Note>}
              </div>
              <div className={s.dialogFooter}>
                <Button variant="outline" onClick={() => setConfirm(null)}><Undo2 className="h-4 w-4 mr-1" />Cancel</Button>
                <Button variant={confirm === "delete" ? "destructive" : "default"} disabled={busy} onClick={doConfirm}>
                  {confirm === "approve" ? <><CheckCircle className="h-4 w-4 mr-1" />Approve</> : confirm === "reopen" ? <><Undo2 className="h-4 w-4 mr-1" />Reopen</> : <><Trash2 className="h-4 w-4 mr-1" />Delete</>}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
