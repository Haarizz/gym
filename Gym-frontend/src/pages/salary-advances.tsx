import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Wallet, Plus, Eye, CheckCircle, XCircle, Clock, AlertCircle, Search, Download, CalendarDays, TrendingDown,
  Receipt, Settings2, Pause, Play, SkipForward, Banknote, BarChart3, Trash2, Pencil, Undo2, Ban, Send, ArrowRight,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { hasPermission } from "../utils/permissions";
import { useBranch } from "../utils/branch-context";
import { exportAsCsv } from "../utils/export-utils";
import { salaryAdvancesService, SalaryAdvance } from "../utils/supabase/salary-advances-service";
import { staffService, Staff } from "../utils/supabase/staff-service";
import {
  deductionsService, advanceScheduleService, DeductionType, EmployeeDeduction, AdvanceInstallment, WorkforceTransaction, DeductionStatus,
} from "../utils/supabase/workforce-service";
import {
  PageHeader, Kpi, Badge, Note, Panel, TabBar, Person, Empty, Field, Stat, ProgressBar, Money, Line, Tone, cx, wf as s,
  toISODate, formatDate, periodLabel, errorMessage, useMoneyText, MONTHS,
} from "../components/workforce/ui";

interface SalaryAdvancesProps { onNavigate?: (section: string, params?: Record<string, any>) => void; }

type TabId = "overview" | "advances" | "deductions" | "schedule" | "transactions";

const ADVANCE_TYPES = ["Salary Advance", "Emergency Advance", "Personal Loan", "Other"];
const ADV_TONE: Record<string, Tone> = {
  "Pending Approval": "amber", "Approved": "blue", "Active": "green", "Fully Repaid": "teal", "Rejected": "red", "Cancelled": "gray",
};
const DED_TONE: Record<DeductionStatus, Tone> = {
  Draft: "gray", Pending: "amber", Active: "green", Paused: "orange", Completed: "teal", Rejected: "red", Cancelled: "gray",
};
const INST_TONE: Record<string, Tone> = { Upcoming: "blue", Due: "amber", Overdue: "red", Processed: "green", Skipped: "violet" };
const TX_TONE: Record<string, Tone> = { "Advance Issued": "blue", "Advance Repayment": "green", "Other Deduction": "red", "Attendance Deduction": "rose" };

const firstOfMonth = (d = new Date()) => toISODate(new Date(d.getFullYear(), d.getMonth(), 1));
const nextMonth = () => { const d = new Date(); return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 1)); };
const monthOptions = () => {
  const now = new Date();
  return Array.from({ length: 8 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 1 + i, 1))
    .map(d => ({ value: toISODate(d), label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` }));
};
const outstandingOf = (a: SalaryAdvance) =>
  ["Active", "Approved"].includes(a.status) ? Number(a.balance || 0) : 0;

interface AdvanceForm { staffId: string; requestDate: string; type: string; amount: string; installments: string; startMonth: string; autoDeduct: boolean; reason: string; }
interface DeductionForm { id?: number; staffId: string; typeId: string; amount: string; quantity: string; frequency: "One-Time" | "Monthly"; installments: string; startMonth: string; reason: string; }

export function SalaryAdvances({ onNavigate }: SalaryAdvancesProps) {
  const { activeBranchId } = useBranch();
  const money = useMoneyText();
  const canCreate = hasPermission("SALARY_ADVANCES_CREATE") || hasPermission("PAYROLL_CREATE");
  const canEdit = hasPermission("SALARY_ADVANCES_EDIT") || hasPermission("PAYROLL_EDIT");
  const canApprove = hasPermission("SALARY_ADVANCES_APPROVE") || hasPermission("PAYROLL_APPROVE");
  const canDelete = hasPermission("SALARY_ADVANCES_DELETE") || hasPermission("PAYROLL_DELETE");

  const [tab, setTab] = useState<TabId>("overview");
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [deductions, setDeductions] = useState<EmployeeDeduction[]>([]);
  const [types, setTypes] = useState<DeductionType[]>([]);
  const [schedule, setSchedule] = useState<AdvanceInstallment[]>([]);
  const [transactions, setTransactions] = useState<WorkforceTransaction[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [empFilter, setEmpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [advOpen, setAdvOpen] = useState(false);
  const [adv, setAdv] = useState<AdvanceForm>({ staffId: "", requestDate: toISODate(new Date()), type: "Salary Advance", amount: "", installments: "4", startMonth: nextMonth(), autoDeduct: true, reason: "" });
  const [advDetail, setAdvDetail] = useState<SalaryAdvance | null>(null);
  const [approveFor, setApproveFor] = useState<SalaryAdvance | null>(null);
  const [approval, setApproval] = useState({ amount: "", installments: "4", startMonth: nextMonth(), autoDeduct: true, remarks: "" });
  const [rejectFor, setRejectFor] = useState<SalaryAdvance | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [deleteAdv, setDeleteAdv] = useState<SalaryAdvance | null>(null);

  const [dedOpen, setDedOpen] = useState(false);
  const [ded, setDed] = useState<DeductionForm>({ staffId: "", typeId: "", amount: "", quantity: "1", frequency: "One-Time", installments: "1", startMonth: firstOfMonth(), reason: "" });
  const [dedDetail, setDedDetail] = useState<EmployeeDeduction | null>(null);
  const [typesOpen, setTypesOpen] = useState(false);
  const [typeEdit, setTypeEdit] = useState<Partial<DeductionType> | null>(null);

  const [instAction, setInstAction] = useState<{ inst: AdvanceInstallment; mode: "record" | "skip" } | null>(null);
  const [instAmount, setInstAmount] = useState("");
  const [instNote, setInstNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, d, t, sc, tx, st] = await Promise.all([
        salaryAdvancesService.getAdvances(),
        deductionsService.list(),
        deductionsService.types(),
        advanceScheduleService.schedule(),
        advanceScheduleService.transactions(),
        staffService.getStaff({}, 1, 200).then(r => r.items).catch(() => [] as Staff[]),
      ]);
      setAdvances(a); setDeductions(d); setTypes(t); setSchedule(sc); setTransactions(tx); setStaff(st);
    } catch (e) {
      toast.error(errorMessage(e, "Failed to load advances & deductions"));
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load, activeBranchId]);

  const staffByCode = useMemo(() => new Map(staff.map(x => [x.staff_id, x])), [staff]);
  const thisMonth = firstOfMonth().slice(0, 7);

  const kpis = useMemo(() => {
    const issued = advances.filter(a => !["Rejected", "Cancelled", "Pending Approval"].includes(a.status)).reduce((t, a) => t + Number(a.approvedAmount || 0), 0);
    const outstanding = advances.reduce((t, a) => t + outstandingOf(a), 0);
    const repaidThisMonth = transactions.filter(x => x.type === "Advance Repayment" && x.period === thisMonth).reduce((t, x) => t + Math.abs(x.amount), 0);
    const dueThisMonth = deductions.filter(d => d.status === "Active" && d.start_month.slice(0, 7) <= thisMonth
      && (d.frequency === "Monthly" ? (d.installments <= 0 || d.completed_installments < d.installments) : d.completed_installments === 0))
      .reduce((t, d) => t + Number(d.monthly_amount || 0), 0);
    const pending = advances.filter(a => a.status === "Pending Approval").length + deductions.filter(d => d.status === "Pending").length;
    return { issued, outstanding, repaidThisMonth, dueThisMonth, pending };
  }, [advances, deductions, transactions, thisMonth]);

  const matchesEmployee = (code?: string | null, name?: string | null, staffId?: number) => {
    if (empFilter !== "all") {
      const st = staff.find(x => String(x.id) === empFilter);
      if (!st) return false;
      if (staffId != null ? String(staffId) !== empFilter : code !== st.staff_id) return false;
    }
    if (search && !`${name ?? ""} ${code ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  };

  const filteredAdvances = advances.filter(a => matchesEmployee(a.employeeId, a.employeeName)
    && (statusFilter === "all" || a.status === statusFilter));
  const filteredDeds = deductions.filter(d => matchesEmployee(d.staff_code, d.staff_name, d.staff_id)
    && (statusFilter === "all" || d.status === statusFilter));
  const filteredSchedule = schedule.filter(i => matchesEmployee(i.employee_id, i.employee_name));
  const filteredTx = transactions.filter(x => !search || x.employee_name.toLowerCase().includes(search.toLowerCase()));

  // ── Advance create ───────────────────────────────────────────────────────
  const selStaff = staff.find(x => String(x.id) === adv.staffId);
  const selOutstanding = selStaff ? advances.filter(a => a.employeeId === selStaff.staff_id).reduce((t, a) => t + outstandingOf(a), 0) : 0;
  const advAmount = Number(adv.amount) || 0;
  const advInst = Math.max(1, Number(adv.installments) || 1);
  const advInstAmount = advAmount ? Math.round((advAmount / advInst) * 100) / 100 : 0;
  const advFinal = advAmount ? Math.round((advAmount - advInstAmount * (advInst - 1)) * 100) / 100 : 0;
  const completion = (start: string, n: number) => {
    const d = new Date(`${start}T00:00:00`);
    d.setMonth(d.getMonth() + n - 1);
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  };

  const openAdvance = () => {
    setAdv({ staffId: "", requestDate: toISODate(new Date()), type: "Salary Advance", amount: "", installments: "4", startMonth: nextMonth(), autoDeduct: true, reason: "" });
    setAdvOpen(true);
  };

  const submitAdvance = async () => {
    if (!selStaff) { toast.error("Pick an employee"); return; }
    if (advAmount <= 0) { toast.error("Enter the advance amount"); return; }
    setSaving(true);
    try {
      await salaryAdvancesService.createAdvance({
        employeeId: selStaff.staff_id, employeeName: selStaff.name, department: selStaff.department,
        requestDate: adv.requestDate, advanceType: adv.type, requestedAmount: advAmount,
        remarks: adv.reason.trim() || undefined, installmentCount: advInst, startMonth: adv.startMonth, autoDeduct: adv.autoDeduct,
      });
      toast.success("Advance submitted for approval");
      setAdvOpen(false);
      setTab("advances");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to create advance"));
    } finally {
      setSaving(false);
    }
  };

  const openApprove = (a: SalaryAdvance) => {
    setApproveFor(a);
    setApproval({
      amount: String(a.requestedAmount || ""),
      installments: String(a.installmentCount || 4),
      startMonth: a.startMonth ? toISODate(new Date(a.startMonth)) : nextMonth(),
      autoDeduct: a.autoDeduct,
      remarks: "",
    });
  };

  const submitApprove = async () => {
    if (!approveFor) return;
    const amount = Number(approval.amount);
    if (!amount || amount <= 0) { toast.error("Enter the approved amount"); return; }
    setSaving(true);
    try {
      await salaryAdvancesService.approveAdvance(approveFor.id, {
        approvedAmount: amount, approvalStatus: "Approved", installmentCount: Math.max(1, Number(approval.installments) || 1),
        deductionMode: "Monthly", startMonth: approval.startMonth, autoDeduct: approval.autoDeduct, approvalRemarks: approval.remarks || undefined,
      });
      toast.success("Advance approved — repayments start " + completion(approval.startMonth, 1));
      setApproveFor(null);
      setAdvDetail(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to approve advance"));
    } finally {
      setSaving(false);
    }
  };

  const submitReject = async () => {
    if (!rejectFor) return;
    setSaving(true);
    try {
      await salaryAdvancesService.approveAdvance(rejectFor.id, {
        approvedAmount: 0, approvalStatus: "Rejected", installmentCount: 0, deductionMode: "Monthly",
        startMonth: firstOfMonth(), autoDeduct: false, approvalRemarks: rejectNote || undefined,
      });
      toast.success("Advance rejected");
      setRejectFor(null);
      setAdvDetail(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to reject advance"));
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteAdvance = async () => {
    if (!deleteAdv) return;
    try { await salaryAdvancesService.deleteAdvance(deleteAdv.id); toast.success("Advance request deleted"); setDeleteAdv(null); setAdvDetail(null); load(); }
    catch (e) { toast.error(errorMessage(e, "Failed to delete advance")); }
  };

  // ── Deductions ───────────────────────────────────────────────────────────
  const activeTypes = types.filter(t => t.active);
  const dedType = types.find(t => String(t.id) === ded.typeId);
  const dedStaff = staff.find(x => String(x.id) === ded.staffId);
  const dedPreview = (() => {
    const amount = Number(ded.amount) || 0;
    if (!dedType) return amount;
    if (dedType.calc_method === "Percentage") return Math.round((Number(dedStaff?.base_salary || 0) * amount) / 100 * 100) / 100;
    if (dedType.calc_method === "Per Day" || dedType.calc_method === "Per Hour") return Math.round(amount * (Number(ded.quantity) || 1) * 100) / 100;
    return amount;
  })();

  const openDeduction = (d?: EmployeeDeduction) => {
    if (d) {
      setDed({ id: d.id, staffId: String(d.staff_id), typeId: String(d.type_id), amount: String(d.amount), quantity: String(d.quantity ?? 1),
        frequency: d.frequency, installments: String(d.installments ?? 1), startMonth: d.start_month, reason: d.reason ?? "" });
    } else {
      const first = activeTypes[0];
      setDed({ staffId: "", typeId: first ? String(first.id) : "", amount: "", quantity: "1", frequency: first?.recurring ? "Monthly" : "One-Time",
        installments: first?.recurring ? "0" : "1", startMonth: firstOfMonth(), reason: "" });
    }
    setDedDetail(null);
    setDedOpen(true);
  };

  const submitDeduction = async (draft = false) => {
    if (!ded.staffId) { toast.error("Pick an employee"); return; }
    if (!ded.typeId) { toast.error("Pick a deduction type"); return; }
    if (!(Number(ded.amount) > 0)) { toast.error("Enter an amount above zero"); return; }
    setSaving(true);
    try {
      const body = {
        staff_id: Number(ded.staffId), type_id: Number(ded.typeId), amount: Number(ded.amount), quantity: Number(ded.quantity) || 1,
        frequency: ded.frequency, installments: ded.frequency === "Monthly" ? Math.max(0, Number(ded.installments) || 0) : 1,
        start_month: ded.startMonth, reason: ded.reason.trim() || null, draft,
      };
      if (ded.id) await deductionsService.update(ded.id, body);
      else await deductionsService.create(body);
      toast.success(ded.id ? "Deduction saved" : draft ? "Saved as draft" : dedType?.requires_approval ? "Deduction submitted for approval" : "Deduction added");
      setDedOpen(false);
      setTab("deductions");
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to save deduction"));
    } finally {
      setSaving(false);
    }
  };

  const dedAction = async (d: EmployeeDeduction, action: "submit" | "approve" | "reject" | "pause" | "resume" | "cancel") => {
    const verbs = { submit: "submitted", approve: "approved", reject: "rejected", pause: "paused", resume: "resumed", cancel: "cancelled" };
    try { await deductionsService.action(d.id, action); toast.success(`Deduction ${verbs[action]}`); setDedDetail(null); load(); }
    catch (e) { toast.error(errorMessage(e, `Failed to ${action} deduction`)); }
  };

  const removeDeduction = async (d: EmployeeDeduction) => {
    try { await deductionsService.remove(d.id); toast.success("Deduction deleted"); setDedDetail(null); load(); }
    catch (e) { toast.error(errorMessage(e, "Failed to delete deduction")); }
  };

  const saveType = async () => {
    if (!typeEdit?.name?.trim()) { toast.error("Give the type a name"); return; }
    try {
      if (typeEdit.id) await deductionsService.updateType(typeEdit.id, typeEdit);
      else await deductionsService.createType(typeEdit);
      toast.success("Deduction type saved");
      setTypeEdit(null);
      setTypes(await deductionsService.types());
    } catch (e) { toast.error(errorMessage(e, "Failed to save deduction type")); }
  };

  // ── Installments ─────────────────────────────────────────────────────────
  const submitInstallment = async () => {
    if (!instAction) return;
    setSaving(true);
    try {
      if (instAction.mode === "record") {
        await advanceScheduleService.recordRepayment(instAction.inst.advance_id, {
          period_month: instAction.inst.due_month, amount: Number(instAmount) || undefined, note: instNote || undefined,
        });
        toast.success("Repayment recorded");
      } else {
        await advanceScheduleService.skip(instAction.inst.advance_id, { period_month: instAction.inst.due_month, note: instNote || undefined });
        toast.success("Installment skipped — the schedule moves a month");
      }
      setInstAction(null);
      load();
    } catch (e) {
      toast.error(errorMessage(e, "Failed to update installment"));
    } finally {
      setSaving(false);
    }
  };

  const exportTx = () => exportAsCsv("advances-deductions-transactions.csv",
    ["Date", "Employee", "Reference", "Description", "Amount", "Payroll Period", "Type"],
    filteredTx.map(x => [x.date, x.employee_name, x.reference, x.description, x.amount, x.period, x.type]));

  // Next pending installment per advance (for the advance table / detail)
  const nextDueByAdvance = useMemo(() => {
    const m = new Map<number, AdvanceInstallment>();
    schedule.forEach(i => { if (["Due", "Overdue", "Upcoming"].includes(i.status) && !m.has(i.advance_id)) m.set(i.advance_id, i); });
    return m;
  }, [schedule]);
  const repaidCount = (id: number) => schedule.filter(i => i.advance_id === id && i.status === "Processed").length;

  const activeAdvances = advances.filter(a => a.status === "Active" || a.status === "Approved");
  const pendingAdvances = advances.filter(a => a.status === "Pending Approval");
  const pendingDeds = deductions.filter(d => d.status === "Pending");

  const statusOptions = tab === "deductions"
    ? ["Draft", "Pending", "Active", "Paused", "Completed", "Rejected", "Cancelled"]
    : ["Pending Approval", "Active", "Fully Repaid", "Rejected", "Cancelled"];

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className={s.page}>
      <PageHeader
        crumbs={[{ label: "Payroll & Employees", to: "payroll-employees" }, { label: "Advances & Deductions" }]}
        onCrumb={to => onNavigate?.(to)}
        icon={Wallet}
        title="Advances & Deductions"
        subtitle="Employee advances · Repayment schedules · Payroll deductions — all applied automatically when salaries are paid from payroll"
        actions={
          <>
            {canCreate && <Button variant="outline" size="sm" onClick={() => openDeduction()} disabled={!activeTypes.length}><TrendingDown className="h-4 w-4 mr-1" />Add Deduction</Button>}
            {canCreate && <Button size="sm" onClick={openAdvance}><Plus className="h-4 w-4 mr-1" />Create Advance</Button>}
          </>
        }
      />

      <div className={s.kpis}>
        <Kpi icon={Wallet} label="Advances issued" value={<Money value={kpis.issued} />} tone="teal" />
        <Kpi icon={Banknote} label="Outstanding balance" value={<Money value={kpis.outstanding} />} tone={kpis.outstanding ? "amber" : "gray"} onClick={() => setTab("schedule")} />
        <Kpi icon={CheckCircle} label="Repaid this month" value={<Money value={kpis.repaidThisMonth} />} tone="green" onClick={() => setTab("transactions")} />
        <Kpi icon={TrendingDown} label="Deductions this month" value={<Money value={kpis.dueThisMonth} />} tone="red" onClick={() => setTab("deductions")} />
        <Kpi icon={Clock} label="Pending approvals" value={kpis.pending} tone={kpis.pending ? "violet" : "gray"} onClick={() => setTab("overview")} />
      </div>

      <TabBar<TabId>
        value={tab}
        onChange={v => { setTab(v); setStatusFilter("all"); }}
        tabs={[
          { id: "overview", label: "Overview", icon: BarChart3, count: pendingAdvances.length + pendingDeds.length, countTone: "violet" },
          { id: "advances", label: "Employee Advances", icon: Wallet },
          { id: "deductions", label: "Other Deductions", icon: TrendingDown },
          { id: "schedule", label: "Repayment Schedule", icon: CalendarDays },
          { id: "transactions", label: "Transactions", icon: Receipt },
        ]}
      />

      {tab !== "overview" && (
        <Panel flush>
          <div className={s.filterBar}>
            <div className={s.search}>
              <Search size={14} />
              <Input className="h-9" placeholder="Search employee…" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            {tab !== "transactions" && (
              <Select value={empFilter} onValueChange={setEmpFilter}>
                <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All employees</SelectItem>
                  {staff.map(x => <SelectItem key={x.id} value={String(x.id)}>{x.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {(tab === "advances" || tab === "deductions") && (
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className={cx("h-9", s.select)}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {statusOptions.map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {(search || empFilter !== "all" || statusFilter !== "all") && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => { setSearch(""); setEmpFilter("all"); setStatusFilter("all"); }}><Undo2 className="h-4 w-4 mr-1" />Reset</Button>
            )}
            {tab === "deductions" && (
              <Button variant="outline" size="sm" className="h-9" style={{ marginLeft: "auto" }} onClick={() => setTypesOpen(true)}><Settings2 className="h-4 w-4 mr-1" />Deduction Types</Button>
            )}
            {tab === "transactions" && (
              <Button variant="outline" size="sm" className="h-9" style={{ marginLeft: "auto" }} onClick={exportTx}><Download className="h-4 w-4 mr-1" />Export</Button>
            )}
          </div>
        </Panel>
      )}

      {/* ── Overview ──────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <>
          <div className={s.grid4}>
            {[
              { label: "Active advances", value: activeAdvances.length, tone: "green" as Tone, to: "advances" as TabId },
              { label: "Advances pending approval", value: pendingAdvances.length, tone: "amber" as Tone, to: "advances" as TabId },
              { label: "Fully repaid", value: advances.filter(a => a.status === "Fully Repaid").length, tone: "teal" as Tone, to: "advances" as TabId },
              { label: "Active deductions", value: deductions.filter(d => d.status === "Active").length, tone: "violet" as Tone, to: "deductions" as TabId },
            ].map(x => (
              <button key={x.label} type="button" className={s.kpi} data-tone={x.tone} onClick={() => setTab(x.to)}>
                <div className={s.kpiIcon} style={{ fontWeight: 700 }}>{x.value}</div>
                <div className={s.kpiLabel} style={{ marginTop: 0 }}>{x.label}</div>
              </button>
            ))}
          </div>

          {(pendingAdvances.length > 0 || pendingDeds.length > 0) && (
            <Panel title={<span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><AlertCircle size={16} />Waiting for approval</span>}
              description="Pending items are not deducted from payroll until approved.">
              <div className={s.stack} style={{ gap: "0.5rem" }}>
                {pendingAdvances.map(a => (
                  <div key={`a${a.id}`} className={s.listCard} data-tone="amber" style={{ alignItems: "center" }}>
                    <div className={s.listIcon}><Wallet size={18} /></div>
                    <div className={s.listMain} style={{ gap: "0.125rem" }}>
                      <span className={s.strong}>{a.employeeName} — {a.advanceType}</span>
                      <span className={cx(s.small, s.muted)}>
                        {money(a.requestedAmount)} · {a.installmentCount || "?"} installments{a.remarks ? ` · ${a.remarks}` : ""} · requested {formatDate(toISODate(new Date(a.requestDate)))}
                      </span>
                    </div>
                    {canApprove && (
                      <div className={s.actions}>
                        <Button variant="outline" size="sm" onClick={() => { setRejectFor(a); setRejectNote(""); }}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                        <Button size="sm" onClick={() => openApprove(a)}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                      </div>
                    )}
                  </div>
                ))}
                {pendingDeds.map(d => (
                  <div key={`d${d.id}`} className={s.listCard} data-tone="violet" style={{ alignItems: "center" }}>
                    <div className={s.listIcon}><TrendingDown size={18} /></div>
                    <div className={s.listMain} style={{ gap: "0.125rem" }}>
                      <span className={s.strong}>{d.staff_name} — {d.type_name}</span>
                      <span className={cx(s.small, s.muted)}>{money(d.monthly_amount)} · {d.frequency} from {periodLabel(d.start_month)}{d.reason ? ` · ${d.reason}` : ""}</span>
                    </div>
                    {canApprove && (
                      <div className={s.actions}>
                        <Button variant="outline" size="sm" onClick={() => dedAction(d, "reject")}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                        <Button size="sm" onClick={() => dedAction(d, "approve")}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <Panel title="Active advances — balance tracker" actions={<Button variant="outline" size="sm" onClick={() => setTab("advances")}>View all<ArrowRight className="h-4 w-4 ml-1" /></Button>}>
            {activeAdvances.length === 0 ? (
              <Empty icon={Wallet} title="No advances being repaid">Approved advances appear here with their remaining balance.</Empty>
            ) : (
              <div className={s.stack} style={{ gap: "0.625rem" }}>
                {activeAdvances.map(a => {
                  const approved = Number(a.approvedAmount || 0);
                  const repaid = Number(a.totalDeducted || 0);
                  const pct = approved ? Math.round((repaid / approved) * 100) : 0;
                  const next = nextDueByAdvance.get(a.id);
                  const st = staffByCode.get(a.employeeId);
                  return (
                    <button key={a.id} type="button" className={s.listCard} style={{ textAlign: "left", cursor: "pointer", flexDirection: "column", gap: "0.5rem" }} onClick={() => setAdvDetail(a)}>
                      <div className={s.spread} style={{ width: "100%" }}>
                        <Person name={a.employeeName} sub={`ADV-${a.id} · ${a.advanceType}`} photo={st?.photo_url} />
                        <div className={s.right}>
                          <div className={cx(s.strong, s.num)} style={{ color: "var(--primary)" }}><Money value={outstandingOf(a)} /></div>
                          <div className={s.cellSub}>outstanding of {money(approved)}</div>
                        </div>
                      </div>
                      <div style={{ width: "100%" }}>
                        <div className={s.spread} style={{ marginBottom: 4 }}>
                          <span className={s.cellSub}>Repaid {money(repaid)} · {repaidCount(a.id)} / {a.installmentCount} installments</span>
                          <span className={s.cellSub}>{pct}%</span>
                        </div>
                        <ProgressBar value={pct} tone="teal" />
                      </div>
                      <div className={s.spread} style={{ width: "100%" }}>
                        <span className={s.cellSub}>Monthly {money(a.installmentAmount)}{!a.autoDeduct && " · manual (not via payroll)"}</span>
                        <span className={s.cellSub}>{next ? `Next: ${periodLabel(next.due_month)} · ${money(next.scheduled_amount)}` : "—"}</span>
                        {next && <Badge tone={INST_TONE[next.status]}>{next.status}</Badge>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </Panel>
        </>
      )}

      {/* ── Advances ──────────────────────────────────────────────────────── */}
      {tab === "advances" && (
        <Panel flush>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Advance</th><th>Employee</th><th>Date</th><th>Type</th>
                  <th className={s.right}>Amount</th><th className={s.right}>Repaid</th><th className={s.right}>Outstanding</th>
                  <th className={s.right}>Monthly</th><th>Next Due</th><th>Status</th><th className={s.right}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAdvances.map(a => {
                  const st = staffByCode.get(a.employeeId);
                  const next = nextDueByAdvance.get(a.id);
                  const pending = a.status === "Pending Approval";
                  return (
                    <tr key={a.id} className={s.clickable} onClick={() => setAdvDetail(a)}>
                      <td className={cx(s.mono, s.muted)}>ADV-{a.id}</td>
                      <td><Person name={a.employeeName} sub={a.employeeId} photo={st?.photo_url} size="sm" /></td>
                      <td>{formatDate(toISODate(new Date(a.requestDate)))}</td>
                      <td><Badge plain>{a.advanceType}</Badge></td>
                      <td className={s.right}><Money value={pending ? a.requestedAmount : a.approvedAmount} />{pending && <div className={s.cellSub}>requested</div>}</td>
                      <td className={s.right}><span data-tone="green" className={s.toneText}><Money value={a.totalDeducted} dash /></span></td>
                      <td className={s.right}><span data-tone={outstandingOf(a) ? "amber" : "green"} className={cx(s.toneText, s.strong)}><Money value={outstandingOf(a)} dash /></span></td>
                      <td className={s.right}><Money value={a.installmentAmount} dash /></td>
                      <td>{next ? <span>{periodLabel(next.due_month)}{next.status === "Overdue" && <Badge tone="red">Overdue</Badge>}</span> : <span className={s.muted}>—</span>}</td>
                      <td><Badge tone={ADV_TONE[a.status] ?? "gray"}>{a.status}</Badge></td>
                      <td className={s.right} onClick={e => e.stopPropagation()}>
                        <div className={s.rowActions}>
                          <button className={s.iconBtn} title="View" onClick={() => setAdvDetail(a)}><Eye size={14} /></button>
                          {pending && canApprove && (
                            <>
                              <button className={s.iconBtn} data-tone="green" title="Approve" onClick={() => openApprove(a)}><CheckCircle size={15} /></button>
                              <button className={s.iconBtn} data-tone="red" title="Reject" onClick={() => { setRejectFor(a); setRejectNote(""); }}><XCircle size={15} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && filteredAdvances.length === 0 && <Empty icon={Wallet} title="No advances">{canCreate && "Use Create Advance to record a salary advance or loan."}</Empty>}
          </div>
        </Panel>
      )}

      {/* ── Other deductions ──────────────────────────────────────────────── */}
      {tab === "deductions" && (
        <>
          <div className={s.chips} style={{ gap: "0.375rem" }}>
            {activeTypes.map(t => (
              <span key={t.id} className={s.badge} data-tone="teal" title={`${t.calc_method} · ${t.recurring ? "Recurring" : "One-time"} · ${t.requires_approval ? "Needs approval" : "Auto-approved"}`}>
                <span className={s.mono}>{t.code}</span>{t.name}<span style={{ opacity: 0.7, fontWeight: 500 }}>· {t.calc_method}</span>
              </span>
            ))}
          </div>
          <Panel flush>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Ref</th><th>Employee</th><th>Type</th><th className={s.right}>Per Month</th><th>Frequency</th>
                    <th>From</th><th>Progress</th><th>Reason</th><th>Status</th><th className={s.right}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDeds.map(d => (
                    <tr key={d.id} className={s.clickable} onClick={() => setDedDetail(d)}>
                      <td className={cx(s.mono, s.muted)}>DED-{d.id}</td>
                      <td><Person name={d.staff_name} sub={d.department ?? d.staff_code} photo={d.photo_url} size="sm" /></td>
                      <td><Badge plain>{d.type_name}</Badge></td>
                      <td className={s.right}><span data-tone="red" className={cx(s.toneText, s.strong)}><Money value={d.monthly_amount} signed="-" /></span>
                        {d.calc_method === "Percentage" && <div className={s.cellSub}>{d.amount}% of basic</div>}
                        {(d.calc_method === "Per Day" || d.calc_method === "Per Hour") && <div className={s.cellSub}>{money(d.amount)} × {d.quantity}</div>}
                      </td>
                      <td>{d.frequency}</td>
                      <td>{periodLabel(d.start_month)}</td>
                      <td>{d.frequency === "Monthly" && d.installments <= 0 ? `${d.completed_installments} applied · ongoing` : `${d.completed_installments} / ${d.installments}`}</td>
                      <td className={s.muted} style={{ maxWidth: "14rem", overflow: "hidden", textOverflow: "ellipsis" }}>{d.reason || "—"}</td>
                      <td><Badge tone={DED_TONE[d.status]}>{d.status}</Badge></td>
                      <td className={s.right} onClick={e => e.stopPropagation()}>
                        <div className={s.rowActions}>
                          {d.status === "Pending" && canApprove && (
                            <>
                              <button className={s.iconBtn} data-tone="green" title="Approve" onClick={() => dedAction(d, "approve")}><CheckCircle size={15} /></button>
                              <button className={s.iconBtn} data-tone="red" title="Reject" onClick={() => dedAction(d, "reject")}><XCircle size={15} /></button>
                            </>
                          )}
                          {d.status === "Draft" && canEdit && <button className={s.iconBtn} data-tone="teal" title="Submit" onClick={() => dedAction(d, "submit")}><Send size={14} /></button>}
                          {d.status === "Active" && canEdit && <button className={s.iconBtn} data-tone="orange" title="Pause" onClick={() => dedAction(d, "pause")}><Pause size={14} /></button>}
                          {d.status === "Paused" && canEdit && <button className={s.iconBtn} data-tone="green" title="Resume" onClick={() => dedAction(d, "resume")}><Play size={14} /></button>}
                          {["Draft", "Pending", "Active", "Paused"].includes(d.status) && canEdit && (
                            <button className={s.iconBtn} title="Edit" onClick={() => openDeduction(d)}><Pencil size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!loading && filteredDeds.length === 0 && <Empty icon={TrendingDown} title="No deductions">Fines, insurance contributions, loan repayments and other deductions show here.</Empty>}
            </div>
          </Panel>
        </>
      )}

      {/* ── Repayment schedule ────────────────────────────────────────────── */}
      {tab === "schedule" && (
        <Panel
          title="Installment repayment schedule"
          description="Every advance installment. Due installments are deducted automatically when the employee's salary for that month is paid."
          actions={
            <div className={s.row}>
              <Badge tone="amber">{filteredSchedule.filter(i => i.status === "Due").length} due</Badge>
              <Badge tone="red">{filteredSchedule.filter(i => i.status === "Overdue").length} overdue</Badge>
            </div>
          }
          flush
        >
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>#</th><th>Employee</th><th>Advance</th><th>Payroll month</th>
                  <th className={s.right}>Scheduled</th><th className={s.right}>Deducted</th><th className={s.right}>Balance after</th>
                  <th>Status</th><th className={s.right}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedule.map(i => {
                  const actionable = ["Due", "Overdue", "Upcoming"].includes(i.status);
                  const firstOpen = nextDueByAdvance.get(i.advance_id)?.id === i.id;
                  return (
                    <tr key={i.id}>
                      <td className={s.mono}>{i.installment_no == null ? <span className={s.muted}>skip</span> : <>{i.installment_no}{i.installments ? <span className={s.muted}>/{i.installments}</span> : null}</>}</td>
                      <td>{i.employee_name}</td>
                      <td className={cx(s.mono, s.muted)}>ADV-{i.advance_id}</td>
                      <td>{periodLabel(i.due_month)}</td>
                      <td className={s.right}><Money value={i.scheduled_amount} /></td>
                      <td className={s.right}>{i.status === "Processed" ? <span data-tone="green" className={cx(s.toneText, s.strong)}><Money value={i.actual_amount} /></span> : <span className={s.muted}>—</span>}
                        {i.source && i.status === "Processed" && <div className={s.cellSub}>{i.source === "payroll" ? "via payroll" : "repaid directly"}</div>}
                      </td>
                      <td className={s.right}>{i.balance_after > 0 ? <Money value={i.balance_after} /> : <Badge tone="teal">Cleared</Badge>}</td>
                      <td><Badge tone={INST_TONE[i.status] ?? "gray"}>{i.status}</Badge></td>
                      <td className={s.right}>
                        {actionable && firstOpen && canEdit && (
                          <div className={s.rowActions}>
                            <Button variant="ghost" size="sm" className="h-8" onClick={() => { setInstAction({ inst: i, mode: "record" }); setInstAmount(String(i.scheduled_amount)); setInstNote(""); }}>Record</Button>
                            <button className={s.iconBtn} data-tone="violet" title="Skip this month" onClick={() => { setInstAction({ inst: i, mode: "skip" }); setInstNote(""); }}><SkipForward size={14} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!loading && filteredSchedule.length === 0 && <Empty icon={CalendarDays} title="No installments">Approve an advance to build its repayment schedule.</Empty>}
          </div>
        </Panel>
      )}

      {/* ── Transactions ──────────────────────────────────────────────────── */}
      {tab === "transactions" && (
        <Panel title="Transaction history" description="Advances issued, installments recovered and deductions taken when payroll salaries are paid." flush>
          <div className={s.tableWrap}>
            <table className={s.table}>
              <thead>
                <tr><th>Date</th><th>Employee</th><th>Reference</th><th>Description</th><th className={s.right}>Amount</th><th>Payroll period</th><th>Type</th></tr>
              </thead>
              <tbody>
                {filteredTx.map((x, i) => (
                  <tr key={`${x.reference}-${i}`}>
                    <td>{formatDate(x.date)}</td>
                    <td className={s.strong}>{x.employee_name}</td>
                    <td className={cx(s.mono, s.muted)}>{x.reference}</td>
                    <td style={{ whiteSpace: "normal", minWidth: "14rem" }}>{x.description}</td>
                    <td className={s.right}><span data-tone={x.amount < 0 ? "red" : "green"} className={cx(s.toneText, s.strong)}><Money value={x.amount} signed={x.amount < 0 ? "-" : "+"} /></span></td>
                    <td>{periodLabel(x.period)}</td>
                    <td><Badge tone={TX_TONE[x.type] ?? "gray"}>{x.type}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && filteredTx.length === 0 && <Empty icon={Receipt} title="No transactions yet" />}
          </div>
        </Panel>
      )}

      {/* ══ Create advance ════════════════════════════════════════════════ */}
      <Dialog open={advOpen} onOpenChange={setAdvOpen}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          <DialogHeader>
            <DialogTitle>Create employee advance</DialogTitle>
            <DialogDescription>Amount, type and the proposed repayment plan. It is deducted from payroll only after approval.</DialogDescription>
          </DialogHeader>
          <div className={s.dialogBody}>
            <span className={s.sectionLabel}>Employee</span>
            <Field label="Employee" required>
              <Select value={adv.staffId} onValueChange={v => setAdv(f => ({ ...f, staffId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>{staff.map(x => <SelectItem key={x.id} value={String(x.id)}>{x.name} ({x.staff_id})</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {selStaff && (
              <div className={s.stats}>
                <Stat label="Department" value={selStaff.department || "—"} />
                <Stat label="Basic salary" value={<Money value={selStaff.base_salary} dash />} />
                <Stat label="Existing outstanding" value={selOutstanding ? <span data-tone="amber" className={s.toneText}><Money value={selOutstanding} /></span> : "None"} />
              </div>
            )}
            <hr className={s.divider} />
            <span className={s.sectionLabel}>Advance details</span>
            <div className={s.grid2}>
              <Field label="Advance date"><Input type="date" value={adv.requestDate} onChange={e => setAdv(f => ({ ...f, requestDate: e.target.value }))} /></Field>
              <Field label="Advance type">
                <Select value={adv.type} onValueChange={v => setAdv(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ADVANCE_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Requested amount" required><Input type="number" min={0} value={adv.amount} placeholder="e.g. 3000" onChange={e => setAdv(f => ({ ...f, amount: e.target.value }))} /></Field>
              <Field label="Number of installments"><Input type="number" min={1} max={36} value={adv.installments} onChange={e => setAdv(f => ({ ...f, installments: e.target.value }))} /></Field>
              <Field label="Repayment starts">
                <Select value={adv.startMonth} onValueChange={v => setAdv(f => ({ ...f, startMonth: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{monthOptions().map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Payroll deduction" hint={adv.autoDeduct ? "Installments are taken from salary" : "Employee repays directly (record it manually)"}>
                <div className={s.row} style={{ height: "2.25rem" }}>
                  <Switch checked={adv.autoDeduct} onCheckedChange={v => setAdv(f => ({ ...f, autoDeduct: v }))} />
                  <span className={s.small}>{adv.autoDeduct ? "Enabled" : "Disabled"}</span>
                </div>
              </Field>
              <Field label="Reason / notes" span2>
                <Textarea rows={2} value={adv.reason} placeholder="Reason for the advance…" onChange={e => setAdv(f => ({ ...f, reason: e.target.value }))} />
              </Field>
            </div>
            {advAmount > 0 && (
              <div className={s.section} data-tone="teal">
                <div className={s.sectionTitle}>Repayment preview</div>
                <div className={s.grid2} style={{ gap: "0 1.5rem" }}>
                  <Line label="Advance amount" value={money(advAmount)} />
                  <Line label="Installments" value={advInst} />
                  <Line label="Monthly installment" value={money(advInstAmount)} tone="teal" />
                  <Line label="Final installment" value={money(advFinal)} />
                  <Line label="First deduction" value={completion(adv.startMonth, 1)} />
                  <Line label="Expected completion" value={completion(adv.startMonth, advInst)} />
                </div>
                {selStaff?.base_salary && advInstAmount > Number(selStaff.base_salary) * 0.5 && (
                  <div style={{ marginTop: "0.5rem" }}><Note tone="amber">The installment is more than half of this employee's basic salary.</Note></div>
                )}
              </div>
            )}
          </div>
          <div className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setAdvOpen(false)}>Cancel</Button>
            <Button disabled={saving} onClick={submitAdvance}><ArrowRight className="h-4 w-4 mr-1" />{saving ? "Submitting…" : "Submit for approval"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ Approve advance ═══════════════════════════════════════════════ */}
      <Dialog open={!!approveFor} onOpenChange={v => !v && setApproveFor(null)}>
        <DialogContent className={cx(s.dialogMd, s.dialogScroll)}>
          {approveFor && (
            <>
              <DialogHeader>
                <DialogTitle>Approve advance</DialogTitle>
                <DialogDescription>{approveFor.employeeName} requested {money(approveFor.requestedAmount)} ({approveFor.advanceType})</DialogDescription>
              </DialogHeader>
              <div className={s.dialogBody}>
                <div className={s.grid2}>
                  <Field label="Approved amount" required><Input type="number" min={0} value={approval.amount} onChange={e => setApproval(a => ({ ...a, amount: e.target.value }))} /></Field>
                  <Field label="Installments"><Input type="number" min={1} value={approval.installments} onChange={e => setApproval(a => ({ ...a, installments: e.target.value }))} /></Field>
                  <Field label="First deduction">
                    <Select value={approval.startMonth} onValueChange={v => setApproval(a => ({ ...a, startMonth: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{monthOptions().map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </Field>
                  <Field label="Payroll deduction">
                    <div className={s.row} style={{ height: "2.25rem" }}>
                      <Switch checked={approval.autoDeduct} onCheckedChange={v => setApproval(a => ({ ...a, autoDeduct: v }))} />
                      <span className={s.small}>{approval.autoDeduct ? "Enabled" : "Disabled"}</span>
                    </div>
                  </Field>
                  <Field label="Approval note" span2><Input value={approval.remarks} placeholder="Optional" onChange={e => setApproval(a => ({ ...a, remarks: e.target.value }))} /></Field>
                </div>
                {Number(approval.amount) > 0 && (
                  <div className={s.section} data-tone="teal">
                    <Line label="Monthly installment" value={money(Math.round(Number(approval.amount) / Math.max(1, Number(approval.installments) || 1) * 100) / 100)} tone="teal" />
                    <Line label="Completes" value={completion(approval.startMonth, Math.max(1, Number(approval.installments) || 1))} />
                  </div>
                )}
                <Note tone="blue">Approving pays out the advance: it is posted to Salary Advance Receivable and Cash at Bank in Financials.</Note>
              </div>
              <div className={s.dialogFooter}>
                <Button variant="outline" onClick={() => setApproveFor(null)}>Cancel</Button>
                <Button disabled={saving} onClick={submitApprove}><CheckCircle className="h-4 w-4 mr-1" />Approve & disburse</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectFor} onOpenChange={v => !v && setRejectFor(null)}>
        <DialogContent className={s.dialogMd}>
          <DialogHeader>
            <DialogTitle>Reject advance</DialogTitle>
            <DialogDescription>{rejectFor?.employeeName} · {rejectFor ? money(rejectFor.requestedAmount) : ""}</DialogDescription>
          </DialogHeader>
          <Field label="Reason (optional)"><Input value={rejectNote} onChange={e => setRejectNote(e.target.value)} /></Field>
          <div className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setRejectFor(null)}>Cancel</Button>
            <Button variant="destructive" disabled={saving} onClick={submitReject}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ Advance detail ════════════════════════════════════════════════ */}
      <Dialog open={!!advDetail} onOpenChange={v => !v && setAdvDetail(null)}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          {advDetail && (() => {
            const approved = Number(advDetail.approvedAmount || 0);
            const repaid = Number(advDetail.totalDeducted || 0);
            const pct = approved ? Math.round((repaid / approved) * 100) : 0;
            const items = schedule.filter(i => i.advance_id === advDetail.id);
            return (
              <>
                <DialogHeader>
                  <DialogTitle>ADV-{advDetail.id} · {advDetail.employeeName}</DialogTitle>
                  <DialogDescription>{advDetail.advanceType} · {advDetail.department || "—"}</DialogDescription>
                </DialogHeader>
                <div className={s.dialogBody}>
                  <div className={s.row}><Badge tone={ADV_TONE[advDetail.status] ?? "gray"}>{advDetail.status}</Badge>{!advDetail.autoDeduct && <Badge plain>Repaid directly</Badge>}</div>
                  <div className={s.stats}>
                    <Stat label="Requested" value={<Money value={advDetail.requestedAmount} />} />
                    <Stat label="Approved" value={approved ? <Money value={approved} /> : "Pending"} />
                    <Stat label="Repaid" value={<Money value={repaid} />} />
                    <Stat label="Outstanding" value={<Money value={outstandingOf(advDetail)} />} />
                    <Stat label="Monthly installment" value={<Money value={advDetail.installmentAmount} dash />} />
                    <Stat label="Installments" value={`${repaidCount(advDetail.id)} / ${advDetail.installmentCount || "—"}`} />
                    <Stat label="Requested on" value={formatDate(toISODate(new Date(advDetail.requestDate)))} />
                    <Stat label="Approved by" value={advDetail.approvedBy || "—"} />
                  </div>
                  {approved > 0 && (
                    <div>
                      <div className={s.spread} style={{ marginBottom: 4 }}><span className={s.cellSub}>Repayment progress</span><span className={s.cellSub}>{pct}%</span></div>
                      <ProgressBar value={pct} tone="teal" />
                    </div>
                  )}
                  {advDetail.remarks && <div className={cx(s.small)} style={{ whiteSpace: "pre-wrap" }}><span className={s.strong}>Notes: </span>{advDetail.remarks}</div>}
                  {items.length > 0 && (
                    <div className={s.panel} style={{ boxShadow: "none" }}>
                      <div className={s.tableWrap}>
                        <table className={s.table}>
                          <thead><tr><th>#</th><th>Month</th><th className={s.right}>Amount</th><th className={s.right}>Balance after</th><th>Status</th></tr></thead>
                          <tbody>
                            {items.map(i => (
                              <tr key={i.id}>
                                <td className={s.mono}>{i.installment_no ?? "—"}</td>
                                <td>{periodLabel(i.due_month)}</td>
                                <td className={s.right}><Money value={i.status === "Processed" ? i.actual_amount : i.scheduled_amount} /></td>
                                <td className={s.right}><Money value={i.balance_after} dash /></td>
                                <td><Badge tone={INST_TONE[i.status] ?? "gray"}>{i.status}</Badge></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
                <div className={s.dialogFooter}>
                  {advDetail.status === "Pending Approval" && canDelete && (
                    <Button variant="ghost" onClick={() => setDeleteAdv(advDetail)}><Trash2 className="h-4 w-4 mr-1" />Delete request</Button>
                  )}
                  <Button variant="outline" onClick={() => setAdvDetail(null)}>Close</Button>
                  {advDetail.status === "Pending Approval" && canApprove && (
                    <>
                      <Button variant="outline" onClick={() => { setRejectFor(advDetail); setRejectNote(""); }}><XCircle className="h-4 w-4 mr-1" />Reject</Button>
                      <Button onClick={() => openApprove(advDetail)}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>
                    </>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteAdv} onOpenChange={v => !v && setDeleteAdv(null)}>
        <DialogContent className={s.dialogMd}>
          <DialogHeader>
            <DialogTitle>Delete this advance request?</DialogTitle>
            <DialogDescription>{deleteAdv?.employeeName} · {deleteAdv ? money(deleteAdv.requestedAmount) : ""}. This can't be undone.</DialogDescription>
          </DialogHeader>
          <div className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setDeleteAdv(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDeleteAdvance}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ Add / edit deduction ══════════════════════════════════════════ */}
      <Dialog open={dedOpen} onOpenChange={setDedOpen}>
        <DialogContent className={cx(s.dialogMd, s.dialogScroll)}>
          <DialogHeader>
            <DialogTitle>{ded.id ? "Edit deduction" : "Add deduction"}</DialogTitle>
            <DialogDescription>Charged to the employee's payroll from the chosen month</DialogDescription>
          </DialogHeader>
          <div className={s.dialogBody}>
            <div className={s.grid2}>
              <Field label="Employee" required span2>
                <Select value={ded.staffId} onValueChange={v => setDed(f => ({ ...f, staffId: v }))} disabled={!!ded.id}>
                  <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                  <SelectContent>{staff.map(x => <SelectItem key={x.id} value={String(x.id)}>{x.name} ({x.staff_id})</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Deduction type" required>
                <Select value={ded.typeId} onValueChange={v => {
                  const t = types.find(x => String(x.id) === v);
                  setDed(f => ({ ...f, typeId: v, frequency: t?.recurring ? "Monthly" : "One-Time", installments: t?.recurring ? "0" : "1" }));
                }}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>{activeTypes.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label={dedType?.calc_method === "Percentage" ? "Percent of basic (%)" : dedType?.calc_method === "Per Day" ? "Amount per day" : dedType?.calc_method === "Per Hour" ? "Amount per hour" : "Amount"} required>
                <Input type="number" min={0} value={ded.amount} onChange={e => setDed(f => ({ ...f, amount: e.target.value }))} />
              </Field>
              {(dedType?.calc_method === "Per Day" || dedType?.calc_method === "Per Hour") && (
                <Field label={dedType.calc_method === "Per Day" ? "Number of days" : "Number of hours"}>
                  <Input type="number" min={0} step="0.5" value={ded.quantity} onChange={e => setDed(f => ({ ...f, quantity: e.target.value }))} />
                </Field>
              )}
              <Field label="Frequency">
                <Select value={ded.frequency} onValueChange={v => setDed(f => ({ ...f, frequency: v as DeductionForm["frequency"], installments: v === "Monthly" ? "0" : "1" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="One-Time">One-time</SelectItem><SelectItem value="Monthly">Every month</SelectItem></SelectContent>
                </Select>
              </Field>
              <Field label="Payroll month">
                <Select value={ded.startMonth} onValueChange={v => setDed(f => ({ ...f, startMonth: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{monthOptions().map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              {ded.frequency === "Monthly" && (
                <Field label="Number of months" hint="0 = until cancelled">
                  <Input type="number" min={0} value={ded.installments} onChange={e => setDed(f => ({ ...f, installments: e.target.value }))} />
                </Field>
              )}
              <Field label="Reason / notes" span2>
                <Textarea rows={2} value={ded.reason} placeholder="Reason for the deduction…" onChange={e => setDed(f => ({ ...f, reason: e.target.value }))} />
              </Field>
            </div>
            {Number(ded.amount) > 0 && (
              <div className={s.section} data-tone="red">
                <Line label="Deducted per payroll" value={money(dedPreview)} tone="red" />
                {ded.frequency === "Monthly" && Number(ded.installments) > 0 && <Line label="Total over the period" value={money(dedPreview * Number(ded.installments))} />}
              </div>
            )}
            <Note tone="amber">
              {dedType?.requires_approval ? "This type needs approval — it is applied to payroll only once approved. " : "This type is applied without approval. "}
              One-time deductions are taken once; monthly ones continue until completed or cancelled.
            </Note>
          </div>
          <div className={s.dialogFooter}>
            <Button variant="outline" onClick={() => setDedOpen(false)}>Cancel</Button>
            {!ded.id && <Button variant="outline" disabled={saving} onClick={() => submitDeduction(true)}>Save as draft</Button>}
            <Button disabled={saving} onClick={() => submitDeduction(false)}>{ded.id ? "Save changes" : dedType?.requires_approval ? "Submit for approval" : "Add deduction"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ Deduction detail ══════════════════════════════════════════════ */}
      <Dialog open={!!dedDetail} onOpenChange={v => !v && setDedDetail(null)}>
        <DialogContent className={s.dialogMd}>
          {dedDetail && (
            <>
              <DialogHeader>
                <DialogTitle>DED-{dedDetail.id} · {dedDetail.staff_name}</DialogTitle>
                <DialogDescription>{dedDetail.type_name} · {dedDetail.frequency}</DialogDescription>
              </DialogHeader>
              <div className={s.dialogBody}>
                <div className={s.row}><Badge tone={DED_TONE[dedDetail.status]}>{dedDetail.status}</Badge></div>
                <div className={s.stats}>
                  <Stat label="Per payroll" value={<Money value={dedDetail.monthly_amount} />} />
                  <Stat label="Method" value={dedDetail.calc_method} />
                  <Stat label="From" value={periodLabel(dedDetail.start_month)} />
                  <Stat label="Applied" value={dedDetail.frequency === "Monthly" && dedDetail.installments <= 0 ? `${dedDetail.completed_installments} (ongoing)` : `${dedDetail.completed_installments} / ${dedDetail.installments}`} />
                  <Stat label="Approved by" value={dedDetail.approved_by || "—"} />
                </div>
                {dedDetail.reason && <div className={s.small}><span className={s.strong}>Reason: </span>{dedDetail.reason}</div>}
              </div>
              <div className={s.dialogFooter}>
                {canDelete && dedDetail.completed_installments === 0 && <Button variant="ghost" onClick={() => removeDeduction(dedDetail)}><Trash2 className="h-4 w-4 mr-1" />Delete</Button>}
                {canEdit && ["Draft", "Pending", "Active", "Paused"].includes(dedDetail.status) && (
                  <Button variant="outline" onClick={() => dedAction(dedDetail, "cancel")}><Ban className="h-4 w-4 mr-1" />Cancel deduction</Button>
                )}
                {canEdit && ["Draft", "Pending", "Active", "Paused"].includes(dedDetail.status) && <Button variant="outline" onClick={() => openDeduction(dedDetail)}><Pencil className="h-4 w-4 mr-1" />Edit</Button>}
                {dedDetail.status === "Pending" && canApprove && <Button onClick={() => dedAction(dedDetail, "approve")}><CheckCircle className="h-4 w-4 mr-1" />Approve</Button>}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ══ Deduction types ═══════════════════════════════════════════════ */}
      <Dialog open={typesOpen} onOpenChange={v => { setTypesOpen(v); if (!v) setTypeEdit(null); }}>
        <DialogContent className={cx(s.dialogLg, s.dialogScroll)}>
          <DialogHeader>
            <DialogTitle>Deduction types</DialogTitle>
            <DialogDescription>The deductions available when charging an employee's payroll</DialogDescription>
          </DialogHeader>
          <div className={s.stack} style={{ gap: "0.5rem" }}>
            {types.map(t => (
              <div key={t.id} className={s.itemRow} style={{ gridTemplateColumns: "auto 1fr auto auto" }}>
                <span className={s.badge} data-tone="teal"><span className={s.mono}>{t.code}</span></span>
                <div className={s.cellStack}>
                  <span className={s.strong}>{t.name}</span>
                  <span className={s.cellSub}>{t.calc_method} · {t.recurring ? "Recurring" : "One-time"} · {t.requires_approval ? "Needs approval" : "Auto-approved"}</span>
                </div>
                <Badge tone={t.active ? "green" : "gray"}>{t.active ? "Active" : "Inactive"}</Badge>
                {canEdit && <button className={s.iconBtn} title="Edit" onClick={() => setTypeEdit({ ...t })}><Pencil size={14} /></button>}
              </div>
            ))}
            {canEdit && !typeEdit && (
              <Button variant="outline" className={s.dashedBtn} onClick={() => setTypeEdit({ name: "", code: "", calc_method: "Fixed", recurring: false, requires_approval: true, active: true })}>
                <Plus className="h-4 w-4 mr-1" />Add deduction type
              </Button>
            )}
            {typeEdit && (
              <div className={s.section} data-tone="teal">
                <div className={s.sectionTitle}>{typeEdit.id ? "Edit type" : "New type"}</div>
                <div className={s.grid2}>
                  <Field label="Name" required><Input value={typeEdit.name ?? ""} onChange={e => setTypeEdit(t => ({ ...t!, name: e.target.value }))} /></Field>
                  <Field label="Code" hint="Up to 6 letters"><Input value={typeEdit.code ?? ""} maxLength={6} onChange={e => setTypeEdit(t => ({ ...t!, code: e.target.value.toUpperCase() }))} /></Field>
                  <Field label="Calculation">
                    <Select value={typeEdit.calc_method ?? "Fixed"} onValueChange={v => setTypeEdit(t => ({ ...t!, calc_method: v as DeductionType["calc_method"] }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Fixed">Fixed amount</SelectItem>
                        <SelectItem value="Percentage">% of basic salary</SelectItem>
                        <SelectItem value="Per Day">Per day</SelectItem>
                        <SelectItem value="Per Hour">Per hour</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className={s.stack} style={{ gap: "0.5rem", justifyContent: "flex-end" }}>
                    <label className={s.row}><Switch checked={!!typeEdit.recurring} onCheckedChange={v => setTypeEdit(t => ({ ...t!, recurring: v }))} /><span className={s.small}>Recurring by default</span></label>
                    <label className={s.row}><Switch checked={!!typeEdit.requires_approval} onCheckedChange={v => setTypeEdit(t => ({ ...t!, requires_approval: v }))} /><span className={s.small}>Needs approval</span></label>
                    <label className={s.row}><Switch checked={typeEdit.active !== false} onCheckedChange={v => setTypeEdit(t => ({ ...t!, active: v }))} /><span className={s.small}>Active</span></label>
                  </div>
                </div>
                <div className={s.dialogFooter}>
                  <Button variant="ghost" size="sm" onClick={() => setTypeEdit(null)}>Cancel</Button>
                  <Button size="sm" onClick={saveType}>Save type</Button>
                </div>
              </div>
            )}
          </div>
          <div className={s.dialogFooter}><Button onClick={() => setTypesOpen(false)}>Done</Button></div>
        </DialogContent>
      </Dialog>

      {/* ══ Record / skip installment ═════════════════════════════════════ */}
      <Dialog open={!!instAction} onOpenChange={v => !v && setInstAction(null)}>
        <DialogContent className={s.dialogMd}>
          {instAction && (
            <>
              <DialogHeader>
                <DialogTitle>{instAction.mode === "record" ? "Record repayment" : "Skip installment"}</DialogTitle>
                <DialogDescription>{instAction.inst.employee_name} · ADV-{instAction.inst.advance_id} · installment {instAction.inst.installment_no} ({periodLabel(instAction.inst.due_month)})</DialogDescription>
              </DialogHeader>
              <div className={s.dialogBody}>
                {instAction.mode === "record" ? (
                  <>
                    <Field label="Amount repaid" hint={`Scheduled ${money(instAction.inst.scheduled_amount)} · balance ${money(instAction.inst.balance_before)}`}>
                      <Input type="number" min={0} value={instAmount} onChange={e => setInstAmount(e.target.value)} />
                    </Field>
                    <Note tone="blue">Use this when the employee repays directly (cash or transfer). Installments taken through payroll are recorded automatically when the employee's payroll salary is paid.</Note>
                  </>
                ) : (
                  <Note tone="violet">Nothing is deducted for {periodLabel(instAction.inst.due_month)}; the remaining installments move one month later.</Note>
                )}
                <Field label="Note"><Input value={instNote} placeholder="Optional" onChange={e => setInstNote(e.target.value)} /></Field>
              </div>
              <div className={s.dialogFooter}>
                <Button variant="outline" onClick={() => setInstAction(null)}>Cancel</Button>
                <Button disabled={saving} onClick={submitInstallment}>{instAction.mode === "record" ? <><CheckCircle className="h-4 w-4 mr-1" />Record repayment</> : <><SkipForward className="h-4 w-4 mr-1" />Skip installment</>}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
