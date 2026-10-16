import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Wallet, Plus, Edit, Eye, CheckCircle, XCircle, Clock, AlertCircle,
  ChevronRight, Filter, Search, Download, CalendarDays, RefreshCw,
  DollarSign, Users, TrendingDown, FileText, Banknote, X, Save,
  RotateCcw, Info, ArrowRight, BarChart3, Pencil, Pause, Play,
  SkipForward, CreditCard, Receipt, Settings2,
} from "lucide-react";
import { cn } from "./ui/utils";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

type AdvStatus    = "Draft" | "Pending Approval" | "Approved" | "Active" | "Fully Repaid" | "Rejected" | "Cancelled";
type InstStatus   = "Upcoming" | "Due" | "Processed" | "Partially Paid" | "Overdue" | "Skipped" | "Cancelled";
type DedStatus    = "Draft" | "Pending" | "Active" | "Paused" | "Completed" | "Rejected" | "Cancelled";
type DedFrequency = "One-Time" | "Monthly" | "Custom";
type AdvType      = "Salary Advance" | "Emergency Advance" | "Personal Loan" | "Other";

interface Advance {
  id: string; empId: string; empName: string; initials: string;
  dept: string; branch: string; basicSalary: number;
  date: string; type: AdvType; amount: number; approvedAmount: number;
  totalRepaid: number; monthlyInstallment: number; nextDue: string;
  status: AdvStatus; reason: string; installments: number; completedInst: number;
}

interface Installment {
  id: string; advId: string; empId: string; empName: string; num: number;
  dueDate: string; scheduledAmount: number; actualDeduction: number;
  balanceBefore: number; balanceAfter: number; payrollPeriod: string;
  status: InstStatus;
}

interface DeductionType {
  id: string; name: string; code: string;
  calcMethod: "Fixed" | "Percentage" | "Per Day" | "Per Hour";
  recurring: boolean; requiresApproval: boolean; active: boolean;
}

interface Deduction {
  id: string; empId: string; empName: string; initials: string;
  dept: string; typeId: string; typeName: string;
  amount: number; frequency: DedFrequency; startDate: string; endDate?: string;
  installments: number; completedInst: number; reason: string;
  effectiveMonth: string; status: DedStatus;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

export const ADVANCES: Advance[] = [
  { id:"ADV001", empId:"EMP001", empName:"Ahmed Hassan",    initials:"AH", dept:"Personal Training", branch:"Downtown Dubai", basicSalary:8000,  date:"2026-08-01", type:"Salary Advance",    amount:5000, approvedAmount:5000, totalRepaid:2000, monthlyInstallment:1000, nextDue:"2026-11-01", status:"Active",        reason:"Medical emergency", installments:5, completedInst:2 },
  { id:"ADV002", empId:"EMP002", empName:"Sarah Johnson",   initials:"SJ", dept:"Front Desk",        branch:"Downtown Dubai", basicSalary:4500,  date:"2026-09-15", type:"Emergency Advance",  amount:2000, approvedAmount:2000, totalRepaid:500,  monthlyInstallment:500,  nextDue:"2026-11-01", status:"Active",        reason:"Family emergency",  installments:4, completedInst:1 },
  { id:"ADV003", empId:"EMP003", empName:"Mohammed Hassan", initials:"MH", dept:"Customer Service",  branch:"Marina Branch",  basicSalary:4800,  date:"2026-07-10", type:"Personal Loan",      amount:8000, approvedAmount:6000, totalRepaid:6000, monthlyInstallment:1000, nextDue:"—",         status:"Fully Repaid",  reason:"Home renovation",   installments:6, completedInst:6 },
  { id:"ADV004", empId:"EMP004", empName:"Fatima Al-Zahra", initials:"FZ", dept:"Personal Training", branch:"Marina Branch",  basicSalary:5000,  date:"2026-10-01", type:"Salary Advance",    amount:3000, approvedAmount:3000, totalRepaid:0,    monthlyInstallment:750,  nextDue:"2026-11-01", status:"Approved",      reason:"Vehicle repair",    installments:4, completedInst:0 },
  { id:"ADV005", empId:"EMP005", empName:"Khalid Al-Mansoori",initials:"KM",dept:"Sales",           branch:"Downtown Dubai", basicSalary:6000,  date:"2026-10-10", type:"Salary Advance",    amount:4000, approvedAmount:0,    totalRepaid:0,    monthlyInstallment:0,    nextDue:"—",         status:"Pending Approval",reason:"Education fees",    installments:4, completedInst:0 },
  { id:"ADV006", empId:"EMP006", empName:"Looka Ibrahim",   initials:"LI", dept:"Group Classes",    branch:"JLT Branch",     basicSalary:5500,  date:"2026-09-20", type:"Salary Advance",    amount:2500, approvedAmount:0,    totalRepaid:0,    monthlyInstallment:0,    nextDue:"—",         status:"Rejected",      reason:"General",           installments:3, completedInst:0 },
];

export const INSTALLMENTS: Installment[] = [
  { id:"INS001", advId:"ADV001", empId:"EMP001", empName:"Ahmed Hassan",    num:1, dueDate:"2026-09-01", scheduledAmount:1000, actualDeduction:1000, balanceBefore:5000, balanceAfter:4000, payrollPeriod:"Sep 2026", status:"Processed" },
  { id:"INS002", advId:"ADV001", empId:"EMP001", empName:"Ahmed Hassan",    num:2, dueDate:"2026-10-01", scheduledAmount:1000, actualDeduction:1000, balanceBefore:4000, balanceAfter:3000, payrollPeriod:"Oct 2026", status:"Processed" },
  { id:"INS003", advId:"ADV001", empId:"EMP001", empName:"Ahmed Hassan",    num:3, dueDate:"2026-11-01", scheduledAmount:1000, actualDeduction:0,    balanceBefore:3000, balanceAfter:3000, payrollPeriod:"Nov 2026", status:"Upcoming"  },
  { id:"INS004", advId:"ADV001", empId:"EMP001", empName:"Ahmed Hassan",    num:4, dueDate:"2026-12-01", scheduledAmount:1000, actualDeduction:0,    balanceBefore:2000, balanceAfter:2000, payrollPeriod:"Dec 2026", status:"Upcoming"  },
  { id:"INS005", advId:"ADV001", empId:"EMP001", empName:"Ahmed Hassan",    num:5, dueDate:"2027-01-01", scheduledAmount:1000, actualDeduction:0,    balanceBefore:1000, balanceAfter:0,    payrollPeriod:"Jan 2027", status:"Upcoming"  },
  { id:"INS006", advId:"ADV002", empId:"EMP002", empName:"Sarah Johnson",   num:1, dueDate:"2026-10-01", scheduledAmount:500,  actualDeduction:500,  balanceBefore:2000, balanceAfter:1500, payrollPeriod:"Oct 2026", status:"Processed" },
  { id:"INS007", advId:"ADV002", empId:"EMP002", empName:"Sarah Johnson",   num:2, dueDate:"2026-11-01", scheduledAmount:500,  actualDeduction:0,    balanceBefore:1500, balanceAfter:1500, payrollPeriod:"Nov 2026", status:"Due"       },
  { id:"INS008", advId:"ADV002", empId:"EMP002", empName:"Sarah Johnson",   num:3, dueDate:"2026-12-01", scheduledAmount:500,  actualDeduction:0,    balanceBefore:1000, balanceAfter:1000, payrollPeriod:"Dec 2026", status:"Upcoming"  },
  { id:"INS009", advId:"ADV004", empId:"EMP004", empName:"Fatima Al-Zahra", num:1, dueDate:"2026-11-01", scheduledAmount:750,  actualDeduction:0,    balanceBefore:3000, balanceAfter:3000, payrollPeriod:"Nov 2026", status:"Upcoming"  },
  { id:"INS010", advId:"ADV004", empId:"EMP004", empName:"Fatima Al-Zahra", num:2, dueDate:"2026-12-01", scheduledAmount:750,  actualDeduction:0,    balanceBefore:2250, balanceAfter:2250, payrollPeriod:"Dec 2026", status:"Upcoming"  },
];

const DEDUCTION_TYPES: DeductionType[] = [
  { id:"DT1", name:"Salary Advance Repayment",     code:"SAR",  calcMethod:"Fixed",      recurring:true,  requiresApproval:false, active:true  },
  { id:"DT2", name:"Unpaid Leave Deduction",       code:"ULD",  calcMethod:"Per Day",    recurring:false, requiresApproval:true,  active:true  },
  { id:"DT3", name:"Late Attendance Deduction",    code:"LAD",  calcMethod:"Fixed",      recurring:false, requiresApproval:false, active:true  },
  { id:"DT4", name:"Insurance Contribution",       code:"INS",  calcMethod:"Percentage", recurring:true,  requiresApproval:false, active:true  },
  { id:"DT5", name:"Employee Loan Repayment",      code:"ELR",  calcMethod:"Fixed",      recurring:true,  requiresApproval:true,  active:true  },
  { id:"DT6", name:"Early Departure Deduction",    code:"EDD",  calcMethod:"Per Hour",   recurring:false, requiresApproval:false, active:true  },
  { id:"DT7", name:"Other Authorized Deduction",   code:"OAD",  calcMethod:"Fixed",      recurring:false, requiresApproval:true,  active:true  },
];

export const OTHER_DEDUCTIONS: Deduction[] = [
  { id:"DED001", empId:"EMP001", empName:"Ahmed Hassan",     initials:"AH", dept:"Personal Training", typeId:"DT2", typeName:"Unpaid Leave",      amount:615,  frequency:"One-Time", startDate:"2026-10-01", installments:1, completedInst:1, reason:"2 days absent",         effectiveMonth:"Oct 2026", status:"Completed" },
  { id:"DED002", empId:"EMP002", empName:"Sarah Johnson",    initials:"SJ", dept:"Front Desk",        typeId:"DT3", typeName:"Late Attendance",    amount:100,  frequency:"Monthly",  startDate:"2026-10-01", installments:1, completedInst:1, reason:"3 late arrivals",       effectiveMonth:"Oct 2026", status:"Completed" },
  { id:"DED003", empId:"EMP003", empName:"Mohammed Hassan",  initials:"MH", dept:"Customer Service",  typeId:"DT4", typeName:"Insurance",          amount:200,  frequency:"Monthly",  startDate:"2026-01-01", installments:12,completedInst:10,reason:"Health insurance",       effectiveMonth:"Nov 2026", status:"Active" },
  { id:"DED004", empId:"EMP004", empName:"Fatima Al-Zahra",  initials:"FZ", dept:"Personal Training", typeId:"DT6", typeName:"Early Departure",    amount:150,  frequency:"One-Time", startDate:"2026-10-15", installments:1, completedInst:0, reason:"Left 1hr early ×3",     effectiveMonth:"Nov 2026", status:"Active" },
  { id:"DED005", empId:"EMP005", empName:"Khalid Al-Mansoori",initials:"KM",dept:"Sales",            typeId:"DT4", typeName:"Insurance",          amount:200,  frequency:"Monthly",  startDate:"2026-01-01", installments:12,completedInst:10,reason:"Health insurance",       effectiveMonth:"Nov 2026", status:"Active" },
  { id:"DED006", empId:"EMP001", empName:"Ahmed Hassan",     initials:"AH", dept:"Personal Training", typeId:"DT3", typeName:"Late Attendance",    amount:150,  frequency:"One-Time", startDate:"2026-11-01", installments:1, completedInst:0, reason:"Late × 3 in Oct",       effectiveMonth:"Nov 2026", status:"Pending" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtAED = (n: number) => `AED ${n.toLocaleString()}`;

const advBadge: Record<AdvStatus, string> = {
  "Draft":            "bg-gray-50 text-gray-500 border-gray-200",
  "Pending Approval": "bg-amber-50 text-amber-700 border-amber-200",
  "Approved":         "bg-blue-50 text-blue-700 border-blue-200",
  "Active":           "bg-green-50 text-green-700 border-green-200",
  "Fully Repaid":     "bg-teal-50 text-teal-700 border-teal-200",
  "Rejected":         "bg-red-50 text-red-600 border-red-200",
  "Cancelled":        "bg-gray-50 text-gray-400 border-gray-200",
};

const instBadge: Record<InstStatus, string> = {
  "Upcoming":      "bg-blue-50 text-blue-700 border-blue-200",
  "Due":           "bg-amber-50 text-amber-700 border-amber-200",
  "Processed":     "bg-green-50 text-green-700 border-green-200",
  "Partially Paid":"bg-yellow-50 text-yellow-700 border-yellow-200",
  "Overdue":       "bg-red-50 text-red-600 border-red-200",
  "Skipped":       "bg-purple-50 text-purple-700 border-purple-200",
  "Cancelled":     "bg-gray-50 text-gray-400 border-gray-200",
};

const dedBadge: Record<DedStatus, string> = {
  "Draft":     "bg-gray-50 text-gray-500 border-gray-200",
  "Pending":   "bg-amber-50 text-amber-700 border-amber-200",
  "Active":    "bg-green-50 text-green-700 border-green-200",
  "Paused":    "bg-orange-50 text-orange-700 border-orange-200",
  "Completed": "bg-teal-50 text-teal-700 border-teal-200",
  "Rejected":  "bg-red-50 text-red-600 border-red-200",
  "Cancelled": "bg-gray-50 text-gray-400 border-gray-200",
};

interface SalaryAdvancesProps { onNavigate?: (section: string) => void; }

// ═════════════════════════════════════════════════════════════════════════════
export function SalaryAdvances({ onNavigate }: SalaryAdvancesProps) {
  const [tab, setTab] = useState("overview");
  const [empFilter, setEmpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");

  // Dialogs
  const [showAdvForm, setShowAdvForm] = useState(false);
  const [showDedForm, setShowDedForm] = useState(false);
  const [showAdvDetail, setShowAdvDetail] = useState<Advance | null>(null);
  const [showInstDetail, setShowInstDetail] = useState<Installment | null>(null);
  const [showDedDetail, setShowDedDetail] = useState<Deduction | null>(null);
  const [showDedTypeForm, setShowDedTypeForm] = useState(false);

  // Advance form
  const [advForm, setAdvForm] = useState({
    empId: "EMP001", advType: "Salary Advance" as AdvType,
    amount: "", installments: "4", reason: "", startMonth: "2026-11-01",
  });

  // Local state for approvals
  const [advances, setAdvances]           = useState<Advance[]>(ADVANCES);
  const [installments, setInstallments]   = useState<Installment[]>(INSTALLMENTS);
  const [deductions, setDeductions]       = useState<Deduction[]>(OTHER_DEDUCTIONS);

  const updateAdv = (id: string, patch: Partial<Advance>) =>
    setAdvances(prev => prev.map(a => a.id === id ? { ...a, ...patch } : a));
  const updateInst = (id: string, patch: Partial<Installment>) =>
    setInstallments(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  const updateDed = (id: string, patch: Partial<Deduction>) =>
    setDeductions(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d));

  // KPIs
  const kpis = useMemo(() => {
    const active = advances.filter(a => a.status === "Active" || a.status === "Approved");
    const totalAdv = advances.filter(a => a.status !== "Rejected" && a.status !== "Cancelled").reduce((s,a) => s + a.approvedAmount, 0);
    const outstanding = active.reduce((s,a) => s + (a.approvedAmount - a.totalRepaid), 0);
    const repaidThisMonth = installments.filter(i => i.payrollPeriod === "Oct 2026" && i.status === "Processed").reduce((s,i) => s + i.actualDeduction, 0);
    const dedThisMonth = deductions.filter(d => d.effectiveMonth === "Oct 2026" && d.status !== "Rejected" && d.status !== "Cancelled").reduce((s,d) => s + d.amount, 0);
    const pending = advances.filter(a => a.status === "Pending Approval").length + deductions.filter(d => d.status === "Pending").length;
    return { totalAdv, outstanding, repaidThisMonth, dedThisMonth, pending };
  }, [advances, installments, deductions]);

  const calcInstallment = (amount: number, numInst: number) => Math.ceil(amount / numInst);
  const calcCompletion = (start: string, n: number) => {
    const d = new Date(start);
    d.setMonth(d.getMonth() + n - 1);
    return format(d, "MMM yyyy");
  };

  const advFormAmount = parseFloat(advForm.amount) || 0;
  const advFormInst   = parseInt(advForm.installments) || 4;
  const advInstAmt    = advFormAmount > 0 ? calcInstallment(advFormAmount, advFormInst) : 0;
  const advCompletion = advFormAmount > 0 ? calcCompletion(advForm.startMonth, advFormInst) : "—";

  const filteredAdvances = advances.filter(a => {
    if (empFilter !== "all" && a.empId !== empFilter) return false;
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (searchQ && !a.empName.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const filteredDeds = deductions.filter(d => {
    if (empFilter !== "all" && d.empId !== empFilter) return false;
    if (searchQ && !d.empName.toLowerCase().includes(searchQ.toLowerCase())) return false;
    return true;
  });

  const EMPLOYEES_LIST = [
    { id:"EMP001", name:"Ahmed Hassan",     initials:"AH", dept:"Personal Training", basic:8000 },
    { id:"EMP002", name:"Sarah Johnson",    initials:"SJ", dept:"Front Desk",        basic:4500 },
    { id:"EMP003", name:"Mohammed Hassan",  initials:"MH", dept:"Customer Service",  basic:4800 },
    { id:"EMP004", name:"Fatima Al-Zahra",  initials:"FZ", dept:"Personal Training", basic:5000 },
    { id:"EMP005", name:"Khalid Al-Mansoori",initials:"KM",dept:"Sales",            basic:6000 },
    { id:"EMP006", name:"Looka Ibrahim",    initials:"LI", dept:"Group Classes",     basic:5500 },
  ];

  const selEmp = EMPLOYEES_LIST.find(e => e.id === advForm.empId);
  const empActiveAdv = advances.filter(a => a.empId === advForm.empId && (a.status === "Active" || a.status === "Approved"));

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="p-6 space-y-5 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Payroll & Employees</span><ChevronRight className="h-3 w-3"/>
        <span className="text-foreground font-medium">Advances & Deductions</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#2B7A7818" }}>
            <Wallet className="h-5 w-5" style={{ color: "#2B7A78" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Advances & Deductions</h1>
            <p className="text-sm text-muted-foreground">Employee advances · Repayment schedules · Payroll deductions · Payroll integration</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowDedForm(true)}>
            <TrendingDown className="h-3.5 w-3.5 mr-1"/> Add Deduction
          </Button>
          <Button size="sm" className="text-xs h-8 text-white" style={{ backgroundColor: "#2B7A78" }} onClick={() => setShowAdvForm(true)}>
            <Plus className="h-3.5 w-3.5 mr-1"/> Create Advance
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label:"Total Advances",         value: fmtAED(kpis.totalAdv),        color:"#2B7A78", icon:<Wallet className="h-4 w-4"/>        },
          { label:"Outstanding Balance",    value: fmtAED(kpis.outstanding),     color:"#f59e0b", icon:<DollarSign className="h-4 w-4"/>     },
          { label:"Repayments This Month",  value: fmtAED(kpis.repaidThisMonth), color:"#10b981", icon:<CheckCircle className="h-4 w-4"/>    },
          { label:"Deductions This Month",  value: fmtAED(kpis.dedThisMonth),    color:"#ef4444", icon:<TrendingDown className="h-4 w-4"/>   },
          { label:"Pending Approvals",      value: kpis.pending,                 color:"#8b5cf6", icon:<Clock className="h-4 w-4"/>          },
        ].map((k,i)=>(
          <Card key={i} className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:`${k.color}18`,color:k.color}}>{k.icon}</div>
              <div>
                <p className="text-[11px] text-muted-foreground leading-tight">{k.label}</p>
                <p className="text-base font-bold leading-tight">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-3.5 w-3.5 text-muted-foreground"/>
            <div className="relative">
              <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground"/>
              <Input className="pl-8 h-7 text-xs w-40" placeholder="Search employee..." value={searchQ} onChange={e=>setSearchQ(e.target.value)}/>
            </div>
            <Select value={empFilter} onValueChange={setEmpFilter}>
              <SelectTrigger className="h-7 text-xs w-40"><SelectValue placeholder="All Employees"/></SelectTrigger>
              <SelectContent><SelectItem value="all" className="text-xs">All Employees</SelectItem>{EMPLOYEES_LIST.map(e=><SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="All Statuses"/></SelectTrigger>
              <SelectContent>
                {["all","Draft","Pending Approval","Approved","Active","Fully Repaid","Rejected","Cancelled"].map(s=>(
                  <SelectItem key={s} value={s} className="text-xs">{s === "all" ? "All Statuses" : s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
              onClick={() => { setEmpFilter("all"); setStatusFilter("all"); setSearchQ(""); }}>
              <RotateCcw className="h-3 w-3 mr-1"/>Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview"    className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5"/>Overview</TabsTrigger>
          <TabsTrigger value="advances"    className="text-xs gap-1"><Wallet className="h-3.5 w-3.5"/>Employee Advances</TabsTrigger>
          <TabsTrigger value="deductions"  className="text-xs gap-1"><TrendingDown className="h-3.5 w-3.5"/>Other Deductions</TabsTrigger>
          <TabsTrigger value="schedule"    className="text-xs gap-1"><CalendarDays className="h-3.5 w-3.5"/>Repayment Schedule</TabsTrigger>
          <TabsTrigger value="transactions" className="text-xs gap-1"><Receipt className="h-3.5 w-3.5"/>Transactions</TabsTrigger>
        </TabsList>

        {/* ══ TAB: Overview ════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {/* Status summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:"Active Advances",  value: advances.filter(a=>a.status==="Active").length,    color:"#10b981" },
              { label:"Pending Approval", value: advances.filter(a=>a.status==="Pending Approval").length, color:"#f59e0b" },
              { label:"Fully Repaid",     value: advances.filter(a=>a.status==="Fully Repaid").length,  color:"#2B7A78" },
              { label:"Active Deductions",value: deductions.filter(d=>d.status==="Active").length,  color:"#8b5cf6" },
            ].map((s,i)=>(
              <div key={i} className="p-3 rounded-xl border border-border/40 flex items-center gap-2">
                <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm" style={{backgroundColor:`${s.color}18`,color:s.color}}>{s.value}</div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Active advances summary */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Active Advances — Balance Tracker</CardTitle>
                <Button size="sm" variant="outline" className="text-xs h-7" onClick={()=>setTab("advances")}>View All</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {advances.filter(a=>a.status==="Active"||a.status==="Approved").map(adv=>{
                const outstanding = adv.approvedAmount - adv.totalRepaid;
                const pct = Math.round((adv.totalRepaid/adv.approvedAmount)*100);
                return (
                  <div key={adv.id} className="p-3 rounded-lg border border-border/40 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-7 w-7"><AvatarFallback className="text-[10px] font-bold" style={{backgroundColor:"#2B7A7818",color:"#2B7A78"}}>{adv.initials}</AvatarFallback></Avatar>
                        <div>
                          <p className="text-sm font-medium">{adv.empName}</p>
                          <p className="text-[10px] text-muted-foreground">{adv.id} · {adv.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold" style={{color:"#2B7A78"}}>{fmtAED(outstanding)}</p>
                        <p className="text-[10px] text-muted-foreground">outstanding of {fmtAED(adv.approvedAmount)}</p>
                      </div>
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Repaid: {fmtAED(adv.totalRepaid)}</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full" style={{width:`${pct}%`,backgroundColor:"#2B7A78"}}/>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>Monthly: {fmtAED(adv.monthlyInstallment)}</span>
                      <span>Next Due: {adv.nextDue}</span>
                      <Badge className={cn("text-[9px] border",advBadge[adv.status])}>{adv.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Pending approvals */}
          {advances.filter(a=>a.status==="Pending Approval").length > 0 && (
            <Card className="border-amber-100">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-amber-700 flex items-center gap-2"><AlertCircle className="h-4 w-4"/>Pending Advance Approvals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {advances.filter(a=>a.status==="Pending Approval").map(adv=>(
                  <div key={adv.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <div>
                      <p className="text-sm font-medium">{adv.empName} — {adv.type}</p>
                      <p className="text-xs text-muted-foreground">{fmtAED(adv.amount)} · {adv.installments} installments · Reason: {adv.reason}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs h-7 text-red-600 border-red-200" onClick={()=>updateAdv(adv.id,{status:"Rejected"})}>
                        <XCircle className="h-3 w-3 mr-1"/>Reject
                      </Button>
                      <Button size="sm" className="text-xs h-7 text-white" style={{backgroundColor:"#2B7A78"}}
                        onClick={()=>updateAdv(adv.id,{status:"Approved",approvedAmount:adv.amount})}>
                        <CheckCircle className="h-3 w-3 mr-1"/>Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ══ TAB: Employee Advances ════════════════════════════════════════ */}
        <TabsContent value="advances" className="space-y-4 mt-4">
          <Card className="border-border/50">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4">Advance ID</TableHead>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs text-right">Repaid</TableHead>
                    <TableHead className="text-xs text-right">Outstanding</TableHead>
                    <TableHead className="text-xs text-right">Monthly</TableHead>
                    <TableHead className="text-xs">Next Due</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-xs text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdvances.map(adv => {
                    const outstanding = adv.approvedAmount - adv.totalRepaid;
                    return (
                      <TableRow key={adv.id} className="hover:bg-muted/20 cursor-pointer" onClick={()=>setShowAdvDetail(adv)}>
                        <TableCell className="pl-4 text-xs font-mono text-muted-foreground">{adv.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] font-bold" style={{backgroundColor:"#2B7A7818",color:"#2B7A78"}}>{adv.initials}</AvatarFallback></Avatar>
                            <div><p className="text-xs font-medium">{adv.empName}</p><p className="text-[9px] text-muted-foreground">{adv.empId}</p></div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{adv.date}</TableCell>
                        <TableCell><Badge variant="outline" className="text-[9px]">{adv.type}</Badge></TableCell>
                        <TableCell className="text-right text-xs">{fmtAED(adv.approvedAmount)}</TableCell>
                        <TableCell className="text-right text-xs text-green-700">{fmtAED(adv.totalRepaid)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold" style={{color: outstanding>0?"#f59e0b":"#10b981"}}>{outstanding > 0 ? fmtAED(outstanding) : "—"}</TableCell>
                        <TableCell className="text-right text-xs">{adv.monthlyInstallment > 0 ? fmtAED(adv.monthlyInstallment) : "—"}</TableCell>
                        <TableCell className="text-xs">{adv.nextDue}</TableCell>
                        <TableCell className="text-center"><Badge className={cn("text-[9px] border",advBadge[adv.status])}>{adv.status}</Badge></TableCell>
                        <TableCell className="text-center" onClick={e=>e.stopPropagation()}>
                          <div className="flex justify-center gap-0.5">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={()=>setShowAdvDetail(adv)}><Eye className="h-3 w-3"/></Button>
                            {adv.status === "Pending Approval" && <>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={()=>updateAdv(adv.id,{status:"Approved",approvedAmount:adv.amount})}><CheckCircle className="h-3 w-3"/></Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500"  onClick={()=>updateAdv(adv.id,{status:"Rejected"})}><XCircle className="h-3 w-3"/></Button>
                            </>}
                            {adv.status === "Approved" && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-[#2B7A78]" onClick={()=>updateAdv(adv.id,{status:"Active"})}><Play className="h-3 w-3"/></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ TAB: Other Deductions ════════════════════════════════════════ */}
        <TabsContent value="deductions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Other Deductions</h3>
            <Button size="sm" variant="outline" className="text-xs h-7" onClick={()=>setShowDedTypeForm(true)}>
              <Settings2 className="h-3.5 w-3.5 mr-1"/>Deduction Types
            </Button>
          </div>

          {/* Deduction types reference */}
          <Card className="border-border/50 bg-muted/10">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Configured Deduction Types</p>
              <div className="flex flex-wrap gap-2">
                {DEDUCTION_TYPES.filter(d=>d.active).map(dt=>(
                  <div key={dt.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border/40 text-[10px]">
                    <span className="font-mono text-muted-foreground">{dt.code}</span>
                    <span className="font-medium">{dt.name}</span>
                    <span className="text-muted-foreground">· {dt.calcMethod}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4">Deduction ID</TableHead>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Frequency</TableHead>
                    <TableHead className="text-xs">Effective Month</TableHead>
                    <TableHead className="text-xs">Reason</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-xs text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDeds.map(ded=>(
                    <TableRow key={ded.id} className="hover:bg-muted/20 cursor-pointer" onClick={()=>setShowDedDetail(ded)}>
                      <TableCell className="pl-4 text-xs font-mono text-muted-foreground">{ded.id}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Avatar className="h-6 w-6"><AvatarFallback className="text-[9px] font-bold" style={{backgroundColor:"#2B7A7818",color:"#2B7A78"}}>{ded.initials}</AvatarFallback></Avatar>
                          <p className="text-xs font-medium">{ded.empName}</p>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[9px]">{ded.typeName}</Badge></TableCell>
                      <TableCell className="text-right text-xs font-medium text-red-600">− {fmtAED(ded.amount)}</TableCell>
                      <TableCell className="text-xs">{ded.frequency}</TableCell>
                      <TableCell className="text-xs">{ded.effectiveMonth}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-32 truncate">{ded.reason}</TableCell>
                      <TableCell className="text-center"><Badge className={cn("text-[9px] border",dedBadge[ded.status])}>{ded.status}</Badge></TableCell>
                      <TableCell className="text-center" onClick={e=>e.stopPropagation()}>
                        <div className="flex justify-center gap-0.5">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0"><Eye className="h-3 w-3"/></Button>
                          {ded.status === "Pending" && <>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={()=>updateDed(ded.id,{status:"Active"})}><CheckCircle className="h-3 w-3"/></Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={()=>updateDed(ded.id,{status:"Rejected"})}><XCircle className="h-3 w-3"/></Button>
                          </>}
                          {ded.status === "Active" && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-orange-500" onClick={()=>updateDed(ded.id,{status:"Paused"})}><Pause className="h-3 w-3"/></Button>
                          )}
                          {ded.status === "Paused" && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={()=>updateDed(ded.id,{status:"Active"})}><Play className="h-3 w-3"/></Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ TAB: Repayment Schedule ═══════════════════════════════════════ */}
        <TabsContent value="schedule" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Installment Repayment Schedule</h3>
              <p className="text-xs text-muted-foreground">All advance installments across all employees · Click any row to manage</p>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px]">
                {installments.filter(i=>i.status==="Due").length} Due
              </Badge>
              <Badge className="bg-red-50 text-red-600 border border-red-200 text-[10px]">
                {installments.filter(i=>i.status==="Overdue").length} Overdue
              </Badge>
            </div>
          </div>
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4">#</TableHead>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Advance ID</TableHead>
                    <TableHead className="text-xs">Due Date</TableHead>
                    <TableHead className="text-xs text-right">Scheduled</TableHead>
                    <TableHead className="text-xs text-right">Actual Deduction</TableHead>
                    <TableHead className="text-xs text-right">Balance After</TableHead>
                    <TableHead className="text-xs">Payroll Period</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-xs text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {installments.map(inst => (
                    <TableRow key={inst.id} className="hover:bg-muted/20 cursor-pointer" onClick={()=>setShowInstDetail(inst)}>
                      <TableCell className="pl-4 text-xs font-mono">{inst.num}</TableCell>
                      <TableCell className="text-xs">{inst.empName}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{inst.advId}</TableCell>
                      <TableCell className="text-xs">{inst.dueDate}</TableCell>
                      <TableCell className="text-right text-xs">{fmtAED(inst.scheduledAmount)}</TableCell>
                      <TableCell className={cn("text-right text-xs font-medium", inst.actualDeduction > 0 ? "text-green-700" : "text-muted-foreground")}>
                        {inst.actualDeduction > 0 ? fmtAED(inst.actualDeduction) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs">{inst.balanceAfter > 0 ? fmtAED(inst.balanceAfter) : "—"}</TableCell>
                      <TableCell className="text-xs">{inst.payrollPeriod}</TableCell>
                      <TableCell className="text-center"><Badge className={cn("text-[9px] border",instBadge[inst.status])}>{inst.status}</Badge></TableCell>
                      <TableCell className="text-center" onClick={e=>e.stopPropagation()}>
                        <div className="flex justify-center gap-0.5">
                          {inst.status === "Due" && (
                            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] text-[#2B7A78]" onClick={()=>updateInst(inst.id,{status:"Processed",actualDeduction:inst.scheduledAmount})}>
                              Record
                            </Button>
                          )}
                          {inst.status === "Upcoming" && (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={()=>updateInst(inst.id,{status:"Skipped"})}>
                              <SkipForward className="h-3 w-3"/>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══ TAB: Transactions ════════════════════════════════════════════ */}
        <TabsContent value="transactions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Transaction History</h3>
            <Button size="sm" variant="outline" className="text-xs h-7"><Download className="h-3.5 w-3.5 mr-1"/>Export</Button>
          </div>
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4">Date</TableHead>
                    <TableHead className="text-xs">Employee</TableHead>
                    <TableHead className="text-xs">Reference</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Payroll Period</TableHead>
                    <TableHead className="text-xs text-center">Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { date:"2026-10-31", emp:"Ahmed Hassan",    ref:"INS002", desc:"Advance Repayment Inst. #2", amount:-1000, period:"Oct 2026", type:"Advance Repayment" },
                    { date:"2026-10-31", emp:"Ahmed Hassan",    ref:"DED001", desc:"Unpaid Leave — 2 days",     amount:-615,  period:"Oct 2026", type:"Other Deduction" },
                    { date:"2026-10-31", emp:"Sarah Johnson",   ref:"INS006", desc:"Advance Repayment Inst. #1", amount:-500,  period:"Oct 2026", type:"Advance Repayment" },
                    { date:"2026-10-31", emp:"Sarah Johnson",   ref:"DED002", desc:"Late Attendance Deduction",  amount:-100,  period:"Oct 2026", type:"Other Deduction" },
                    { date:"2026-09-30", emp:"Ahmed Hassan",    ref:"INS001", desc:"Advance Repayment Inst. #1", amount:-1000, period:"Sep 2026", type:"Advance Repayment" },
                    { date:"2026-08-01", emp:"Ahmed Hassan",    ref:"ADV001", desc:"Advance Disbursed",           amount:5000,  period:"Aug 2026", type:"Advance Issued" },
                    { date:"2026-09-15", emp:"Sarah Johnson",   ref:"ADV002", desc:"Advance Disbursed",           amount:2000,  period:"Sep 2026", type:"Advance Issued" },
                  ].map((tx,i)=>(
                    <TableRow key={i} className="hover:bg-muted/20">
                      <TableCell className="pl-4 text-xs">{tx.date}</TableCell>
                      <TableCell className="text-xs font-medium">{tx.emp}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{tx.ref}</TableCell>
                      <TableCell className="text-xs">{tx.desc}</TableCell>
                      <TableCell className={cn("text-right text-xs font-semibold", tx.amount < 0 ? "text-red-600" : "text-green-700")}>
                        {tx.amount < 0 ? `− AED ${Math.abs(tx.amount).toLocaleString()}` : `+ AED ${tx.amount.toLocaleString()}`}
                      </TableCell>
                      <TableCell className="text-xs">{tx.period}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn("text-[9px]", tx.type==="Advance Issued"?"text-blue-700":"text-red-600")}>{tx.type}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Create Advance Dialog ─────────────────────────────────────────── */}
      <Dialog open={showAdvForm} onOpenChange={setShowAdvForm}>
        <DialogContent className="sm:max-w-[680px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Employee Advance</DialogTitle>
            <DialogDescription>Set up advance amount, type, and repayment schedule</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Select Employee</Label>
                <Select value={advForm.empId} onValueChange={v=>setAdvForm(p=>({...p,empId:v}))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{EMPLOYEES_LIST.map(e=><SelectItem key={e.id} value={e.id} className="text-sm">{e.name} ({e.id})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {selEmp && (
                <div className="col-span-2 p-3 rounded-lg bg-muted/20 border border-border/40 grid grid-cols-3 gap-3 text-xs">
                  <div><p className="text-muted-foreground">Department</p><p className="font-medium">{selEmp.dept}</p></div>
                  <div><p className="text-muted-foreground">Basic Salary</p><p className="font-medium">{fmtAED(selEmp.basic)}</p></div>
                  <div><p className="text-muted-foreground">Existing Outstanding</p>
                    <p className="font-semibold" style={{color: empActiveAdv.length > 0 ? "#f59e0b" : "#10b981"}}>
                      {empActiveAdv.length > 0 ? fmtAED(empActiveAdv.reduce((s,a)=>s+(a.approvedAmount-a.totalRepaid),0)) : "None"}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <Separator/>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Advance Details</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Advance Date</Label><Input type="date" defaultValue="2026-11-01" className="h-9 text-sm"/></div>
              <div className="space-y-1"><Label className="text-xs">Advance Type</Label>
                <Select value={advForm.advType} onValueChange={v=>setAdvForm(p=>({...p,advType:v as AdvType}))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{["Salary Advance","Emergency Advance","Personal Loan","Other"].map(t=><SelectItem key={t} value={t} className="text-sm">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Requested Amount (AED)</Label>
                <Input type="number" placeholder="e.g. 3000" value={advForm.amount} onChange={e=>setAdvForm(p=>({...p,amount:e.target.value}))} className="h-9 text-sm"/>
              </div>
              <div className="space-y-1"><Label className="text-xs">Approved Amount (AED)</Label>
                <Input type="number" placeholder="Leave blank if pending" className="h-9 text-sm"/>
              </div>
              <div className="space-y-1 col-span-2"><Label className="text-xs">Reason / Notes</Label>
                <Textarea placeholder="Reason for advance request..." rows={2} className="text-sm resize-none" value={advForm.reason} onChange={e=>setAdvForm(p=>({...p,reason:e.target.value}))}/>
              </div>
            </div>
            <Separator/>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Repayment Configuration</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Repayment Start Month</Label>
                <Input type="date" value={advForm.startMonth} onChange={e=>setAdvForm(p=>({...p,startMonth:e.target.value}))} className="h-9 text-sm"/>
              </div>
              <div className="space-y-1"><Label className="text-xs">Repayment Frequency</Label>
                <Select defaultValue="Monthly"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Weekly">Weekly</SelectItem><SelectItem value="Custom">Custom</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Number of Installments</Label>
                <Input type="number" value={advForm.installments} onChange={e=>setAdvForm(p=>({...p,installments:e.target.value}))} className="h-9 text-sm" min={1} max={24}/>
              </div>
              <div className="space-y-1"><Label className="text-xs">Payroll Deduction</Label>
                <Select defaultValue="Enabled"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="Enabled">Enabled</SelectItem><SelectItem value="Disabled">Disabled (Manual)</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {/* Auto-calculated preview */}
            {advFormAmount > 0 && (
              <div className="p-4 rounded-xl border border-[#2B7A7830]" style={{backgroundColor:"#2B7A7808"}}>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Calculated Repayment Preview</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Advance Amount",       fmtAED(advFormAmount)],
                    ["Installment Amount",   fmtAED(advInstAmt)],
                    ["Final Installment",    fmtAED(advFormAmount - advInstAmt * (advFormInst - 1))],
                    ["Expected Completion",  advCompletion],
                    ["Total Installments",   advFormInst.toString()],
                    ["Outstanding Balance",  fmtAED(advFormAmount)],
                  ].map(([l,v])=>(
                    <div key={l} className="flex justify-between">
                      <span className="text-muted-foreground text-xs">{l}</span>
                      <span className="font-semibold text-xs" style={{color:"#2B7A78"}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="p-2 bg-blue-50 rounded border border-blue-100 text-[10px] text-blue-700 flex gap-1.5">
              <Info className="h-3.5 w-3.5 flex-shrink-0"/>
              Advance will only apply payroll deductions after approval and activation. Draft or pending advances are excluded from payroll calculations.
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={()=>setShowAdvForm(false)}>Save as Draft</Button>
            <Button style={{backgroundColor:"#2B7A78"}} className="text-white" onClick={()=>{
              setAdvances(prev=>[...prev,{
                id:`ADV00${prev.length+1}`, empId:advForm.empId,
                empName: EMPLOYEES_LIST.find(e=>e.id===advForm.empId)?.name ?? "",
                initials: EMPLOYEES_LIST.find(e=>e.id===advForm.empId)?.initials ?? "??",
                dept: EMPLOYEES_LIST.find(e=>e.id===advForm.empId)?.dept ?? "",
                branch:"Downtown Dubai", basicSalary: EMPLOYEES_LIST.find(e=>e.id===advForm.empId)?.basic ?? 0,
                date:advForm.startMonth, type:advForm.advType,
                amount:advFormAmount, approvedAmount:0, totalRepaid:0,
                monthlyInstallment:advInstAmt, nextDue:"—",
                status:"Pending Approval", reason:advForm.reason,
                installments:advFormInst, completedInst:0,
              }]);
              setShowAdvForm(false);
              setTab("advances");
            }}>
              <ArrowRight className="h-3.5 w-3.5 mr-1"/> Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Deduction Dialog ──────────────────────────────────────────── */}
      <Dialog open={showDedForm} onOpenChange={setShowDedForm}>
        <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Deduction</DialogTitle>
            <DialogDescription>Configure a payroll deduction for an employee</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2"><Label className="text-xs">Employee</Label>
                <Select defaultValue="EMP001"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{EMPLOYEES_LIST.map(e=><SelectItem key={e.id} value={e.id} className="text-sm">{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Deduction Type</Label>
                <Select defaultValue="DT2"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{DEDUCTION_TYPES.filter(d=>d.active).map(d=><SelectItem key={d.id} value={d.id} className="text-sm">{d.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Amount (AED)</Label>
                <Input type="number" placeholder="e.g. 500" className="h-9 text-sm"/>
              </div>
              <div className="space-y-1"><Label className="text-xs">Recurrence</Label>
                <Select defaultValue="One-Time"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="One-Time">One-Time</SelectItem><SelectItem value="Monthly">Monthly</SelectItem><SelectItem value="Custom">Custom</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Effective Payroll Month</Label>
                <Select defaultValue="Nov 2026"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="Nov 2026">November 2026</SelectItem><SelectItem value="Dec 2026">December 2026</SelectItem><SelectItem value="Jan 2027">January 2027</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Number of Installments</Label>
                <Input type="number" defaultValue="1" min={1} className="h-9 text-sm"/>
              </div>
              <div className="space-y-1 col-span-2"><Label className="text-xs">Reason / Notes</Label>
                <Textarea placeholder="Reason for deduction..." rows={2} className="text-sm resize-none"/>
              </div>
            </div>
            <div className="p-2 bg-amber-50 rounded border border-amber-100 text-[10px] text-amber-700 flex gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0"/>
              Deductions are applied to payroll only after approval. One-time deductions are applied to the selected payroll period only. Recurring deductions continue until cancelled or completed.
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={()=>setShowDedForm(false)}>Cancel</Button>
            <Button variant="outline">Save as Draft</Button>
            <Button style={{backgroundColor:"#2B7A78"}} className="text-white" onClick={()=>{
              setDeductions(prev=>[...prev,{
                id:`DED00${prev.length+1}`, empId:"EMP001", empName:"Ahmed Hassan", initials:"AH",
                dept:"Personal Training", typeId:"DT2", typeName:"Unpaid Leave",
                amount:500, frequency:"One-Time", startDate:"2026-11-01",
                installments:1, completedInst:0, reason:"New deduction",
                effectiveMonth:"Nov 2026", status:"Pending",
              }]);
              setShowDedForm(false);
            }}>
              Submit for Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Advance Detail Dialog ─────────────────────────────────────────── */}
      {showAdvDetail && (
        <Dialog open={!!showAdvDetail} onOpenChange={()=>setShowAdvDetail(null)}>
          <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Advance Detail — {showAdvDetail.id}</DialogTitle>
              <DialogDescription>{showAdvDetail.empName} · {showAdvDetail.type}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ["Employee", showAdvDetail.empName],
                  ["Employee ID", showAdvDetail.empId],
                  ["Department", showAdvDetail.dept],
                  ["Branch", showAdvDetail.branch],
                  ["Advance Date", showAdvDetail.date],
                  ["Advance Type", showAdvDetail.type],
                  ["Requested Amount", fmtAED(showAdvDetail.amount)],
                  ["Approved Amount", showAdvDetail.approvedAmount > 0 ? fmtAED(showAdvDetail.approvedAmount) : "Pending"],
                  ["Total Repaid", fmtAED(showAdvDetail.totalRepaid)],
                  ["Outstanding Balance", fmtAED(showAdvDetail.approvedAmount - showAdvDetail.totalRepaid)],
                  ["Monthly Installment", showAdvDetail.monthlyInstallment > 0 ? fmtAED(showAdvDetail.monthlyInstallment) : "—"],
                  ["Installments", `${showAdvDetail.completedInst} / ${showAdvDetail.installments}`],
                ].map(([l,v])=>(
                  <div key={l} className="p-2 rounded-lg bg-muted/20 border border-border/40">
                    <p className="text-[10px] text-muted-foreground">{l}</p>
                    <p className="text-sm font-medium">{v}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border">
                <span className="text-xs font-medium">Status</span>
                <Badge className={cn("text-xs border",advBadge[showAdvDetail.status])}>{showAdvDetail.status}</Badge>
              </div>
              {showAdvDetail.approvedAmount > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Repayment Progress</p>
                  <Progress value={Math.round((showAdvDetail.totalRepaid/showAdvDetail.approvedAmount)*100)} className="h-2"/>
                  <p className="text-xs text-muted-foreground text-right">{Math.round((showAdvDetail.totalRepaid/showAdvDetail.approvedAmount)*100)}%</p>
                </div>
              )}
              {showAdvDetail.reason && (
                <div className="p-2 rounded bg-muted/20 text-xs"><span className="font-medium">Reason: </span>{showAdvDetail.reason}</div>
              )}
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={()=>setShowAdvDetail(null)}>Close</Button>
              {showAdvDetail.status === "Pending Approval" && <>
                <Button variant="outline" className="text-red-600 border-red-200" onClick={()=>{ updateAdv(showAdvDetail.id,{status:"Rejected"}); setShowAdvDetail(null); }}>Reject</Button>
                <Button style={{backgroundColor:"#2B7A78"}} className="text-white" onClick={()=>{ updateAdv(showAdvDetail.id,{status:"Approved",approvedAmount:showAdvDetail.amount}); setShowAdvDetail(null); }}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1"/>Approve
                </Button>
              </>}
              {showAdvDetail.status === "Approved" && (
                <Button style={{backgroundColor:"#2B7A78"}} className="text-white" onClick={()=>{ updateAdv(showAdvDetail.id,{status:"Active"}); setShowAdvDetail(null); }}>
                  <Play className="h-3.5 w-3.5 mr-1"/>Activate
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Installment Detail Dialog ─────────────────────────────────────── */}
      {showInstDetail && (
        <Dialog open={!!showInstDetail} onOpenChange={()=>setShowInstDetail(null)}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Installment #{showInstDetail.num} — {showInstDetail.advId}</DialogTitle>
              <DialogDescription>{showInstDetail.empName} · Due: {showInstDetail.dueDate}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Scheduled Amount", fmtAED(showInstDetail.scheduledAmount)],
                  ["Actual Deduction", showInstDetail.actualDeduction > 0 ? fmtAED(showInstDetail.actualDeduction) : "—"],
                  ["Balance Before",   fmtAED(showInstDetail.balanceBefore)],
                  ["Balance After",    showInstDetail.balanceAfter > 0 ? fmtAED(showInstDetail.balanceAfter) : "Fully Repaid"],
                  ["Payroll Period",   showInstDetail.payrollPeriod],
                  ["Status",          showInstDetail.status],
                ].map(([l,v])=>(
                  <div key={l} className="p-2 rounded-lg bg-muted/20 border border-border/40">
                    <p className="text-[10px] text-muted-foreground">{l}</p>
                    <p className="text-sm font-medium">{v}</p>
                  </div>
                ))}
              </div>
              {showInstDetail.status === "Due" && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-700 flex gap-2">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0"/>
                  This installment is due for the current payroll period. It will be automatically deducted when payroll is processed.
                </div>
              )}
            </div>
            <DialogFooter className="mt-4 gap-2">
              <Button variant="outline" onClick={()=>setShowInstDetail(null)}>Close</Button>
              {showInstDetail.status === "Due" && (
                <Button style={{backgroundColor:"#2B7A78"}} className="text-white"
                  onClick={()=>{ updateInst(showInstDetail.id,{status:"Processed",actualDeduction:showInstDetail.scheduledAmount}); setShowInstDetail(null); }}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1"/>Record Repayment
                </Button>
              )}
              {(showInstDetail.status === "Upcoming" || showInstDetail.status === "Due") && (
                <Button variant="outline" className="text-orange-600 border-orange-200"
                  onClick={()=>{ updateInst(showInstDetail.id,{status:"Skipped"}); setShowInstDetail(null); }}>
                  <SkipForward className="h-3.5 w-3.5 mr-1"/>Skip Installment
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Deduction Type Config Dialog ──────────────────────────────────── */}
      <Dialog open={showDedTypeForm} onOpenChange={setShowDedTypeForm}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Deduction Type Configuration</DialogTitle>
            <DialogDescription>Manage configurable deduction types available for payroll</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {DEDUCTION_TYPES.map(dt=>(
              <div key={dt.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 hover:bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-12 rounded text-[10px] font-mono font-bold flex items-center justify-center" style={{backgroundColor:"#2B7A7818",color:"#2B7A78"}}>{dt.code}</div>
                  <div>
                    <p className="text-sm font-medium">{dt.name}</p>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      <span>{dt.calcMethod}</span>
                      <span>·</span>
                      <span>{dt.recurring ? "Recurring" : "One-Time"}</span>
                      <span>·</span>
                      <span>{dt.requiresApproval ? "Approval required" : "Auto-approved"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[9px] border", dt.active ? "bg-green-50 text-green-700 border-green-200" : "bg-gray-50 text-gray-500 border-gray-200")}>
                    {dt.active ? "Active" : "Inactive"}
                  </Badge>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0"><Pencil className="h-3 w-3"/></Button>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full text-xs border-dashed h-8">
              <Plus className="h-3.5 w-3.5 mr-1"/>Add Deduction Type
            </Button>
          </div>
          <DialogFooter className="mt-4">
            <Button style={{backgroundColor:"#2B7A78"}} className="text-white text-xs" onClick={()=>setShowDedTypeForm(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
