import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Separator } from "./ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Avatar, AvatarFallback } from "./ui/avatar";
import {
  Target, Plus, X, ChevronRight, ArrowLeft, Save, Users, Building2,
  Percent, TrendingUp, TrendingDown, DollarSign, CheckCircle, Clock,
  AlertCircle, BarChart3, Settings2, Eye, Copy, Filter, Award,
  Dumbbell, ShoppingBag, Coffee, Wrench, Landmark, PartyPopper,
  CreditCard, Info, ChevronDown, Banknote, Star, Zap,
  RotateCcw, XCircle, Pencil, MoreVertical, Activity,
} from "lucide-react";
import { cn } from "./ui/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type SegKey = "sessions" | "memberships" | "merchandise" | "fnb" | "equipment" | "facilities" | "events";
type EarnStatus = "estimated" | "pending" | "approved" | "paid" | "rejected" | "adjusted";
type RuleStatus = "active" | "draft" | "inactive";

interface Employee { id: string; name: string; initials: string; role: string; dept: string; branch: string; }
interface SegPerf { units: number; unitTarget: number; amount: number; amountTarget: number; commission: number; }
interface CommTier { from: number; to: number | null; rate: number; rateType: "pct" | "fixed"; }
interface CommRule {
  id: string; name: string; category: SegKey; roles: string[];
  basis: string; calcBasis: string; tiers: CommTier[];
  effectiveFrom: string; effectiveTo: string; status: RuleStatus; priority: number;
}
interface Earning {
  id: string; empId: string; category: SegKey;
  units: number; unitTarget: number; amount: number; profit: number;
  achievement: number; rule: string; commission: number; status: EarnStatus;
  note?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SEGS: { key: SegKey; label: string; short: string; color: string; icon: React.ReactNode }[] = [
  { key: "sessions",    label: "Individual Sessions",   short: "Sessions",   color: "#327F74", icon: <Dumbbell className="h-3.5 w-3.5" /> },
  { key: "memberships", label: "Memberships",           short: "Member",     color: "#2B7A78", icon: <CreditCard className="h-3.5 w-3.5" /> },
  { key: "merchandise", label: "Merchandise",           short: "Merch",      color: "#4BA3A0", icon: <ShoppingBag className="h-3.5 w-3.5" /> },
  { key: "fnb",         label: "Food & Beverages",      short: "F&B",        color: "#1D6A65", icon: <Coffee className="h-3.5 w-3.5" /> },
  { key: "equipment",   label: "Equipment Sales",       short: "Equip",      color: "#5BB5B2", icon: <Wrench className="h-3.5 w-3.5" /> },
  { key: "facilities",  label: "Facilities & Lockers",  short: "Facilities", color: "#76C7C4", icon: <Landmark className="h-3.5 w-3.5" /> },
  { key: "events",      label: "Events & Workshops",    short: "Events",     color: "#0E5954", icon: <PartyPopper className="h-3.5 w-3.5" /> },
];

const BRANCHES = ["Main Branch", "Branch 2", "Branch 3"];
const ROLES    = ["Trainer", "Receptionist", "Sales Executive", "Manager"];
const DEPTS    = ["Martial Arts", "Wellness", "Fitness", "Front Desk", "Personal Training", "Sales"];

// ── Mock Data ─────────────────────────────────────────────────────────────────

const EMPLOYEES: Employee[] = [
  { id: "1", name: "Sara Al-Rashid",     initials: "SA", role: "Trainer",         dept: "Martial Arts",     branch: "Main Branch" },
  { id: "2", name: "Looka Johnson",      initials: "LJ", role: "Trainer",         dept: "Wellness",         branch: "Main Branch" },
  { id: "3", name: "Arshi Hassan",       initials: "AH", role: "Trainer",         dept: "Fitness",          branch: "Branch 2"    },
  { id: "4", name: "Mery Wilson",        initials: "MW", role: "Receptionist",    dept: "Front Desk",       branch: "Main Branch" },
  { id: "5", name: "Ahmed Al-Mansoori", initials: "AM", role: "Trainer",         dept: "Personal Training",branch: "Main Branch" },
  { id: "6", name: "Fatima Al-Zahra",   initials: "FZ", role: "Sales Executive", dept: "Sales",            branch: "Branch 2"    },
];

const PERF: Record<string, Record<SegKey, SegPerf>> = {
  "1": {
    sessions:    { units: 128, unitTarget: 150, amount: 12800, amountTarget: 15000, commission: 1280 },
    memberships: { units: 9,   unitTarget: 10,  amount: 9000,  amountTarget: 10000, commission: 450  },
    merchandise: { units: 22,  unitTarget: 30,  amount: 2200,  amountTarget: 3000,  commission: 88   },
    fnb:         { units: 45,  unitTarget: 60,  amount: 1800,  amountTarget: 2400,  commission: 45   },
    equipment:   { units: 3,   unitTarget: 5,   amount: 3000,  amountTarget: 5000,  commission: 90   },
    facilities:  { units: 8,   unitTarget: 10,  amount: 1600,  amountTarget: 2000,  commission: 64   },
    events:      { units: 1,   unitTarget: 2,   amount: 5000,  amountTarget: 8000,  commission: 200  },
  },
  "2": {
    sessions:    { units: 95,  unitTarget: 100, amount: 9500,  amountTarget: 10000, commission: 665  },
    memberships: { units: 7,   unitTarget: 8,   amount: 7000,  amountTarget: 8000,  commission: 350  },
    merchandise: { units: 18,  unitTarget: 20,  amount: 1800,  amountTarget: 2000,  commission: 72   },
    fnb:         { units: 60,  unitTarget: 50,  amount: 2400,  amountTarget: 2000,  commission: 60   },
    equipment:   { units: 2,   unitTarget: 3,   amount: 2000,  amountTarget: 3000,  commission: 60   },
    facilities:  { units: 12,  unitTarget: 10,  amount: 2400,  amountTarget: 2000,  commission: 120  },
    events:      { units: 2,   unitTarget: 2,   amount: 8000,  amountTarget: 8000,  commission: 320  },
  },
  "3": {
    sessions:    { units: 160, unitTarget: 150, amount: 16000, amountTarget: 15000, commission: 1600 },
    memberships: { units: 12,  unitTarget: 10,  amount: 12000, amountTarget: 10000, commission: 600  },
    merchandise: { units: 28,  unitTarget: 25,  amount: 2800,  amountTarget: 2500,  commission: 168  },
    fnb:         { units: 35,  unitTarget: 40,  amount: 1400,  amountTarget: 1600,  commission: 35   },
    equipment:   { units: 6,   unitTarget: 5,   amount: 6000,  amountTarget: 5000,  commission: 240  },
    facilities:  { units: 5,   unitTarget: 8,   amount: 1000,  amountTarget: 1600,  commission: 40   },
    events:      { units: 3,   unitTarget: 2,   amount: 12000, amountTarget: 8000,  commission: 480  },
  },
  "4": {
    sessions:    { units: 0,   unitTarget: 0,   amount: 0,     amountTarget: 0,     commission: 0    },
    memberships: { units: 18,  unitTarget: 20,  amount: 18000, amountTarget: 20000, commission: 900  },
    merchandise: { units: 35,  unitTarget: 40,  amount: 3500,  amountTarget: 4000,  commission: 140  },
    fnb:         { units: 80,  unitTarget: 80,  amount: 3200,  amountTarget: 3200,  commission: 80   },
    equipment:   { units: 1,   unitTarget: 2,   amount: 1000,  amountTarget: 2000,  commission: 20   },
    facilities:  { units: 20,  unitTarget: 20,  amount: 4000,  amountTarget: 4000,  commission: 200  },
    events:      { units: 0,   unitTarget: 1,   amount: 0,     amountTarget: 4000,  commission: 0    },
  },
  "5": {
    sessions:    { units: 180, unitTarget: 200, amount: 18000, amountTarget: 20000, commission: 1800 },
    memberships: { units: 6,   unitTarget: 8,   amount: 6000,  amountTarget: 8000,  commission: 300  },
    merchandise: { units: 15,  unitTarget: 20,  amount: 1500,  amountTarget: 2000,  commission: 60   },
    fnb:         { units: 25,  unitTarget: 30,  amount: 1000,  amountTarget: 1200,  commission: 25   },
    equipment:   { units: 4,   unitTarget: 5,   amount: 4000,  amountTarget: 5000,  commission: 120  },
    facilities:  { units: 6,   unitTarget: 8,   amount: 1200,  amountTarget: 1600,  commission: 48   },
    events:      { units: 1,   unitTarget: 1,   amount: 5000,  amountTarget: 5000,  commission: 200  },
  },
  "6": {
    sessions:    { units: 0,   unitTarget: 0,   amount: 0,     amountTarget: 0,     commission: 0    },
    memberships: { units: 25,  unitTarget: 25,  amount: 25000, amountTarget: 25000, commission: 1250 },
    merchandise: { units: 50,  unitTarget: 45,  amount: 5000,  amountTarget: 4500,  commission: 300  },
    fnb:         { units: 70,  unitTarget: 60,  amount: 2800,  amountTarget: 2400,  commission: 70   },
    equipment:   { units: 8,   unitTarget: 8,   amount: 8000,  amountTarget: 8000,  commission: 320  },
    facilities:  { units: 15,  unitTarget: 12,  amount: 3000,  amountTarget: 2400,  commission: 150  },
    events:      { units: 2,   unitTarget: 2,   amount: 8000,  amountTarget: 8000,  commission: 320  },
  },
};

const INST_TARGETS: Record<SegKey, { units: number; unitTarget: number; amount: number; amountTarget: number }> = {
  sessions:    { units: 563,  unitTarget: 600,  amount: 56300,  amountTarget: 60000  },
  memberships: { units: 77,   unitTarget: 100,  amount: 77000,  amountTarget: 80000  },
  merchandise: { units: 168,  unitTarget: 200,  amount: 16800,  amountTarget: 20000  },
  fnb:         { units: 315,  unitTarget: 400,  amount: 12600,  amountTarget: 16000  },
  equipment:   { units: 24,   unitTarget: 30,   amount: 24000,  amountTarget: 30000  },
  facilities:  { units: 66,   unitTarget: 80,   amount: 13200,  amountTarget: 16000  },
  events:      { units: 9,    unitTarget: 10,   amount: 38000,  amountTarget: 40000  },
};

const RULES: CommRule[] = [
  { id: "r1", name: "PT Sessions — Tiered Fixed", category: "sessions", roles: ["Trainer"],
    basis: "Units completed", calcBasis: "Fixed per unit",
    tiers: [{ from: 0, to: 49, rate: 5, rateType: "fixed" }, { from: 50, to: 99, rate: 7, rateType: "fixed" }, { from: 100, to: null, rate: 10, rateType: "fixed" }],
    effectiveFrom: "2026-10-01", effectiveTo: "2026-12-31", status: "active", priority: 1 },
  { id: "r2", name: "Membership Incentive Plan", category: "memberships", roles: ["Trainer", "Receptionist", "Sales Executive"],
    basis: "Units (conversions)", calcBasis: "Fixed per unit",
    tiers: [{ from: 0, to: 9, rate: 50, rateType: "fixed" }, { from: 10, to: 19, rate: 75, rateType: "fixed" }, { from: 20, to: null, rate: 100, rateType: "fixed" }],
    effectiveFrom: "2026-10-01", effectiveTo: "2026-12-31", status: "active", priority: 1 },
  { id: "r3", name: "Merchandise — Profit %", category: "merchandise", roles: ["Trainer", "Receptionist", "Sales Executive"],
    basis: "Eligible profit amount", calcBasis: "% of profit (tiered slab)",
    tiers: [{ from: 0, to: 999, rate: 2, rateType: "pct" }, { from: 1000, to: 2999, rate: 4, rateType: "pct" }, { from: 3000, to: 4999, rate: 6, rateType: "pct" }, { from: 5000, to: null, rate: 8, rateType: "pct" }],
    effectiveFrom: "2026-10-01", effectiveTo: "2026-12-31", status: "active", priority: 1 },
  { id: "r4", name: "Equipment Sales — Tiered %", category: "equipment", roles: ["Trainer", "Sales Executive"],
    basis: "Collection amount", calcBasis: "% of collection (tiered)",
    tiers: [{ from: 0, to: 4999, rate: 2, rateType: "pct" }, { from: 5000, to: 9999, rate: 4, rateType: "pct" }, { from: 10000, to: null, rate: 6, rateType: "pct" }],
    effectiveFrom: "2026-10-01", effectiveTo: "2026-12-31", status: "active", priority: 1 },
  { id: "r5", name: "F&B — Fixed Per Unit", category: "fnb", roles: ["Receptionist", "Trainer"],
    basis: "Units sold", calcBasis: "Fixed per unit",
    tiers: [{ from: 0, to: null, rate: 1, rateType: "fixed" }],
    effectiveFrom: "2026-10-01", effectiveTo: "2026-12-31", status: "active", priority: 1 },
  { id: "r6", name: "Events — 4% Collection", category: "events", roles: ["Trainer", "Sales Executive"],
    basis: "Collection amount", calcBasis: "% of collection",
    tiers: [{ from: 0, to: null, rate: 4, rateType: "pct" }],
    effectiveFrom: "2026-10-01", effectiveTo: "2026-12-31", status: "active", priority: 1 },
  { id: "r7", name: "Facilities — 3% Revenue", category: "facilities", roles: ["Receptionist", "Sales Executive"],
    basis: "Collection amount", calcBasis: "% of collection",
    tiers: [{ from: 0, to: null, rate: 3, rateType: "pct" }],
    effectiveFrom: "2026-10-01", effectiveTo: "2026-12-31", status: "draft", priority: 2 },
];

const EARNINGS_DATA: Earning[] = [
  { id: "e1",  empId: "1", category: "sessions",    units: 128, unitTarget: 150, amount: 12800, profit: 0,    achievement: 85,  rule: "PT Sessions — Tiered Fixed",    commission: 1280, status: "estimated" },
  { id: "e2",  empId: "1", category: "memberships", units: 9,   unitTarget: 10,  amount: 9000,  profit: 0,    achievement: 90,  rule: "Membership Incentive Plan",      commission: 450,  status: "pending"   },
  { id: "e3",  empId: "2", category: "sessions",    units: 95,  unitTarget: 100, amount: 9500,  profit: 0,    achievement: 95,  rule: "PT Sessions — Tiered Fixed",    commission: 665,  status: "approved"  },
  { id: "e4",  empId: "2", category: "fnb",         units: 60,  unitTarget: 50,  amount: 2400,  profit: 800,  achievement: 120, rule: "F&B — Fixed Per Unit",          commission: 60,   status: "paid"      },
  { id: "e5",  empId: "3", category: "sessions",    units: 160, unitTarget: 150, amount: 16000, profit: 0,    achievement: 107, rule: "PT Sessions — Tiered Fixed",    commission: 1600, status: "approved"  },
  { id: "e6",  empId: "3", category: "equipment",   units: 6,   unitTarget: 5,   amount: 6000,  profit: 2400, achievement: 120, rule: "Equipment Sales — Tiered %",    commission: 240,  status: "pending"   },
  { id: "e7",  empId: "4", category: "memberships", units: 18,  unitTarget: 20,  amount: 18000, profit: 0,    achievement: 90,  rule: "Membership Incentive Plan",      commission: 900,  status: "approved"  },
  { id: "e8",  empId: "5", category: "sessions",    units: 180, unitTarget: 200, amount: 18000, profit: 0,    achievement: 90,  rule: "PT Sessions — Tiered Fixed",    commission: 1800, status: "pending"   },
  { id: "e9",  empId: "6", category: "memberships", units: 25,  unitTarget: 25,  amount: 25000, profit: 0,    achievement: 100, rule: "Membership Incentive Plan",      commission: 1250, status: "paid"      },
  { id: "e10", empId: "6", category: "merchandise", units: 50,  unitTarget: 45,  amount: 5000,  profit: 2000, achievement: 111, rule: "Merchandise — Profit %",        commission: 120,  status: "estimated" },
  { id: "e11", empId: "3", category: "memberships", units: 12,  unitTarget: 10,  amount: 12000, profit: 0,    achievement: 120, rule: "Membership Incentive Plan",      commission: 600,  status: "approved"  },
  { id: "e12", empId: "6", category: "events",      units: 2,   unitTarget: 2,   amount: 8000,  profit: 0,    achievement: 100, rule: "Events — 4% Collection",        commission: 320,  status: "pending"   },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));
const fmtAED = (n: number) => `AED ${n.toLocaleString()}`;
const achColor  = (p: number) => p >= 100 ? "text-emerald-600" : p >= 80 ? "text-amber-600" : "text-red-500";
const achBg     = (p: number) => p >= 100 ? "#10b981"           : p >= 80 ? "#f59e0b"         : "#ef4444";
const earnBadge: Record<EarnStatus, string> = {
  estimated: "bg-blue-50 text-blue-700 border-blue-200",
  pending:   "bg-amber-50 text-amber-700 border-amber-200",
  approved:  "bg-green-50 text-green-700 border-green-200",
  paid:      "bg-teal-50 text-teal-700 border-teal-200",
  rejected:  "bg-red-50 text-red-600 border-red-200",
  adjusted:  "bg-purple-50 text-purple-700 border-purple-200",
};
const ruleBadge: Record<RuleStatus, string> = {
  active:   "bg-green-50 text-green-700 border-green-200",
  draft:    "bg-amber-50 text-amber-700 border-amber-200",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
};
const segByKey = (k: SegKey) => SEGS.find(s => s.key === k)!;

// ── Props ─────────────────────────────────────────────────────────────────────

interface SetTargetsProps { onNavigate: (section: string) => void; }

// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════

export function SetTargets({ onNavigate }: SetTargetsProps) {

  // ── Filters ────────────────────────────────────────────────────────────────
  const [period,   setPeriod]   = useState("monthly");
  const [branchF,  setBranchF]  = useState("all");
  const [deptF,    setDeptF]    = useState("all");
  const [empF,     setEmpF]     = useState("all");
  const [catF,     setCatF]     = useState("all");
  const [statusF,  setStatusF]  = useState("all");

  // ── Navigation ─────────────────────────────────────────────────────────────
  const [tab, setTab] = useState("overview");

  // ── Modals ─────────────────────────────────────────────────────────────────
  const [empDetail,     setEmpDetail]     = useState<string | null>(null);
  const [earnDetail,    setEarnDetail]    = useState<Earning | null>(null);
  const [ruleDetail,    setRuleDetail]    = useState<CommRule | null>(null);
  const [showInstForm,  setShowInstForm]  = useState(false);
  const [showIndForm,   setShowIndForm]   = useState(false);
  const [showRuleForm,  setShowRuleForm]  = useState(false);
  const [rejectNote,    setRejectNote]    = useState("");

  // ── Local rule form state ──────────────────────────────────────────────────
  const [ruleForm, setRuleForm] = useState({
    name: "", category: "sessions" as SegKey, roles: [] as string[],
    basis: "units", calcBasis: "tiered",
    tiers: [{ from: 0, to: null as number | null, rate: 5, rateType: "fixed" as "pct" | "fixed" }],
    effectiveFrom: "2026-10-01", effectiveTo: "2026-12-31",
  });

  // ── Period multiplier (for simulating different time ranges) ──────────────
  const mult = period === "monthly" ? 1 : period === "quarterly" ? 3 : 12;

  // ── Filtered employees ────────────────────────────────────────────────────
  const filteredEmps = useMemo(() => EMPLOYEES.filter(e => {
    if (branchF !== "all" && e.branch !== branchF) return false;
    if (deptF   !== "all" && e.dept   !== deptF)   return false;
    if (empF    !== "all" && e.id     !== empF)     return false;
    return true;
  }), [branchF, deptF, empF]);

  // ── Aggregate totals ───────────────────────────────────────────────────────
  const totals = useMemo(() => {
    let revTarget = 0, revActual = 0, commEst = 0, unitsTarget = 0, unitsActual = 0;
    filteredEmps.forEach(e => {
      SEGS.forEach(s => {
        const p = PERF[e.id]?.[s.key];
        if (!p) return;
        revTarget   += p.amountTarget * mult;
        revActual   += p.amount       * mult;
        unitsTarget += p.unitTarget   * mult;
        unitsActual += p.units        * mult;
        commEst     += p.commission   * mult;
      });
    });
    const achPct = pct(revActual, revTarget);
    const approvedComm = EARNINGS_DATA.filter(e => e.status === "approved").reduce((s, e) => s + e.commission, 0) * mult;
    const pendingComm  = EARNINGS_DATA.filter(e => e.status === "pending").reduce((s, e) => s + e.commission, 0) * mult;
    return { revTarget, revActual, commEst, unitsTarget, unitsActual, achPct, approvedComm, pendingComm };
  }, [filteredEmps, mult]);

  // ── Per-employee aggregates for performance table ─────────────────────────
  const empPerf = useMemo(() => filteredEmps.map(emp => {
    let revT = 0, revA = 0, uT = 0, uA = 0, comm = 0;
    SEGS.forEach(s => {
      const p = PERF[emp.id]?.[s.key];
      if (!p) return;
      revT += p.amountTarget * mult; revA += p.amount * mult;
      uT += p.unitTarget * mult;      uA += p.units * mult;
      comm += p.commission * mult;
    });
    const achPct = pct(revA, revT);
    return { emp, revT, revA, uT, uA, comm, achPct };
  }), [filteredEmps, mult]);

  // ── Filtered earnings ─────────────────────────────────────────────────────
  const filteredEarnings = useMemo(() => EARNINGS_DATA.filter(e => {
    if (empF    !== "all" && e.empId    !== empF)    return false;
    if (catF    !== "all" && e.category !== catF)    return false;
    if (statusF !== "all" && e.status   !== statusF) return false;
    return true;
  }), [empF, catF, statusF]);

  const earnTotals = useMemo(() => ({
    estimated: EARNINGS_DATA.filter(e => e.status === "estimated").reduce((s, e) => s + e.commission, 0),
    pending:   EARNINGS_DATA.filter(e => e.status === "pending")  .reduce((s, e) => s + e.commission, 0),
    approved:  EARNINGS_DATA.filter(e => e.status === "approved") .reduce((s, e) => s + e.commission, 0),
    paid:      EARNINGS_DATA.filter(e => e.status === "paid")     .reduce((s, e) => s + e.commission, 0),
  }), []);

  // ── Earnings state (for approve/reject/pay actions in modal) ──────────────
  const [earnings, setEarnings] = useState<Earning[]>(EARNINGS_DATA);
  const updateEarning = (id: string, patch: Partial<Earning>) =>
    setEarnings(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e));

  // ══════════════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="p-6 space-y-5 bg-background min-h-screen">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Payroll & Employees</span>
          <ChevronRight className="h-3 w-3" />
          <span>Staffs & Trainers</span>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">Target & Commission Management</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#327F7418" }}>
              <Target className="h-5 w-5" style={{ color: "#327F74" }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Target & Commission Management</h1>
              <p className="text-sm text-muted-foreground">Set targets · Configure commission rules · Track performance · Manage payouts</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" style={{ borderColor: "#327F74", color: "#327F74" }}
              onClick={() => { setShowInstForm(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Set Target
            </Button>
            <Button size="sm" variant="outline" onClick={() => onNavigate("staffs-trainers")}>
              <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
            </Button>
          </div>
        </div>
      </div>

      {/* ── Global Filter Bar ─────────────────────────────────────────────── */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              <Filter className="h-3.5 w-3.5" /> Filters:
            </div>
            {[
              { label: "Period",     val: period,  set: setPeriod,  opts: [["monthly","Monthly"],["quarterly","Quarterly"],["yearly","Yearly"]] },
              { label: "Branch",     val: branchF, set: setBranchF, opts: [["all","All Branches"], ...BRANCHES.map(b => [b, b])] },
              { label: "Department", val: deptF,   set: setDeptF,   opts: [["all","All Depts"],    ...DEPTS.map(d => [d, d])] },
              { label: "Employee",   val: empF,    set: setEmpF,    opts: [["all","All Employees"],...EMPLOYEES.map(e => [e.id, e.name])] },
            ].map(({ label, val, set, opts }) => (
              <Select key={label} value={val} onValueChange={set as (v: string) => void}>
                <SelectTrigger className="h-7 text-xs w-auto min-w-28 max-w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opts.map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
              onClick={() => { setPeriod("monthly"); setBranchF("all"); setDeptF("all"); setEmpF("all"); setCatF("all"); setStatusF("all"); }}>
              <RotateCcw className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Tabs ─────────────────────────────────────────────────────────── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview"    className="text-xs gap-1"><BarChart3 className="h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="institution" className="text-xs gap-1"><Building2 className="h-3.5 w-3.5" />Institution</TabsTrigger>
          <TabsTrigger value="individual"  className="text-xs gap-1"><Users className="h-3.5 w-3.5" />Individual</TabsTrigger>
          <TabsTrigger value="commission"  className="text-xs gap-1"><Percent className="h-3.5 w-3.5" />Rules</TabsTrigger>
          <TabsTrigger value="earnings"    className="text-xs gap-1"><Banknote className="h-3.5 w-3.5" />Earnings</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 1 — OVERVIEW
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="overview" className="space-y-5 mt-4">

          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Revenue Target",       value: fmtAED(totals.revTarget),   icon: <Target className="h-4 w-4" />,      color: "#327F74", sub: `${period}` },
              { label: "Actual Revenue",        value: fmtAED(totals.revActual),   icon: <DollarSign className="h-4 w-4" />,  color: totals.revActual >= totals.revTarget ? "#10b981" : "#f59e0b", sub: `${pct(totals.revActual, totals.revTarget)}% of target` },
              { label: "Achievement",           value: `${totals.achPct}%`,        icon: <Award className="h-4 w-4" />,       color: achBg(totals.achPct), sub: totals.achPct >= 100 ? "Target reached!" : `${100 - totals.achPct}% remaining` },
              { label: "Units Target",          value: totals.unitsTarget.toLocaleString(), icon: <Activity className="h-4 w-4" />, color: "#2B7A78", sub: "all categories" },
              { label: "Units Achieved",        value: totals.unitsActual.toLocaleString(), icon: <CheckCircle className="h-4 w-4" />, color: "#10b981", sub: `${pct(totals.unitsActual, totals.unitsTarget)}% complete` },
              { label: "Est. Commission",       value: fmtAED(totals.commEst),     icon: <Percent className="h-4 w-4" />,     color: "#4BA3A0", sub: "calculated" },
              { label: "Approved Commission",   value: fmtAED(totals.approvedComm),icon: <CheckCircle className="h-4 w-4" />,color: "#10b981", sub: "ready for payout" },
              { label: "Pending Commission",    value: fmtAED(totals.pendingComm), icon: <Clock className="h-4 w-4" />,       color: "#f59e0b", sub: "under review" },
            ].map((kpi, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                    <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${kpi.color}18`, color: kpi.color }}>
                      {kpi.icon}
                    </div>
                  </div>
                  <p className="text-xl font-bold text-foreground">{kpi.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">{kpi.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Performance Table */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Staff Performance Overview</CardTitle>
                  <CardDescription className="text-xs">Click any row to view detailed category breakdown</CardDescription>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7">
                  <ArrowLeft className="h-3 w-3 mr-1 rotate-180" /> Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4">Employee</TableHead>
                    <TableHead className="text-xs">Role</TableHead>
                    <TableHead className="text-xs text-right">Rev Target</TableHead>
                    <TableHead className="text-xs text-right">Actual Rev</TableHead>
                    <TableHead className="text-xs text-right">Units</TableHead>
                    <TableHead className="text-xs">Achievement</TableHead>
                    <TableHead className="text-xs text-right">Commission</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {empPerf.map(({ emp, revT, revA, uT, uA, comm, achPct: ap }) => (
                    <TableRow key={emp.id} className="cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => setEmpDetail(emp.id)}>
                      <TableCell className="pl-4">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] font-bold" style={{ backgroundColor: "#327F7420", color: "#327F74" }}>
                              {emp.initials}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium leading-tight">{emp.name}</p>
                            <p className="text-[10px] text-muted-foreground">{emp.dept}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-normal">{emp.role}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">{fmtAED(revT)}</TableCell>
                      <TableCell className="text-right text-xs font-medium">{fmtAED(revA)}</TableCell>
                      <TableCell className="text-right text-xs">{uA} / {uT}</TableCell>
                      <TableCell className="min-w-32">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className={cn("text-xs font-semibold", achColor(ap))}>{ap}%</span>
                            {ap >= 100 && <Star className="h-3 w-3 text-amber-500" />}
                          </div>
                          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ap)}%`, backgroundColor: achBg(ap) }} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold" style={{ color: "#327F74" }}>{fmtAED(comm)}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[10px] border", ap >= 100 ? "bg-green-50 text-green-700 border-green-200" : ap >= 80 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-600 border-red-200")}>
                          {ap >= 100 ? "On Track" : ap >= 80 ? "Near" : "Below"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Category-wise institution snapshot */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Institution — Category Performance</CardTitle>
              <CardDescription className="text-xs">Overall facility performance across all segments</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {SEGS.map(seg => {
                const d = INST_TARGETS[seg.key];
                const ap = pct(d.amount * mult, d.amountTarget * mult);
                const up = pct(d.units * mult, d.unitTarget * mult);
                return (
                  <div key={seg.key} className="p-3 rounded-xl border border-border/40" style={{ backgroundColor: `${seg.color}06` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: seg.color }}>{seg.icon}</span>
                      <p className="text-xs font-semibold">{seg.short}</p>
                      <span className={cn("ml-auto text-xs font-bold", achColor(ap))}>{ap}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(100, ap)}%`, backgroundColor: seg.color }} />
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                      <span>Units: <strong className="text-foreground">{d.units}/{d.unitTarget}</strong></span>
                      <span className="text-right" style={{ color: seg.color }}>AED {(d.amount / 1000).toFixed(0)}k</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 2 — INSTITUTION TARGETS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="institution" className="space-y-5 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Institution-wide Targets</h2>
              <p className="text-xs text-muted-foreground">Category targets set for the entire facility</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-8">
                <Copy className="h-3.5 w-3.5 mr-1" /> Duplicate Period
              </Button>
              <Button size="sm" className="text-xs h-8 text-white" style={{ backgroundColor: "#327F74" }}
                onClick={() => setShowInstForm(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Set New Target
              </Button>
            </div>
          </div>

          {/* Allocation summary bar */}
          <Card className="border-[#327F7430]" style={{ backgroundColor: "#327F7406" }}>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 divide-x divide-border/50 text-center">
                {[
                  { label: "Institution Target", value: fmtAED(SEGS.reduce((s, seg) => s + INST_TARGETS[seg.key].amountTarget, 0) * mult), sub: "Total set" },
                  { label: "Allocated to Teams", value: fmtAED(SEGS.reduce((s, seg) => s + INST_TARGETS[seg.key].amountTarget * 0.9, 0) * mult), sub: "90% distributed" },
                  { label: "Unallocated", value: fmtAED(SEGS.reduce((s, seg) => s + INST_TARGETS[seg.key].amountTarget * 0.1, 0) * mult), sub: "Remaining to assign" },
                ].map((item, i) => (
                  <div key={i} className="px-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                    <p className="text-lg font-bold mt-0.5" style={{ color: "#327F74" }}>{item.value}</p>
                    <p className="text-[10px] text-muted-foreground">{item.sub}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Category table */}
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4">Category</TableHead>
                    <TableHead className="text-xs text-right">Units Target</TableHead>
                    <TableHead className="text-xs text-right">Units Achieved</TableHead>
                    <TableHead className="text-xs text-right">Amt Target</TableHead>
                    <TableHead className="text-xs text-right">Collected</TableHead>
                    <TableHead className="text-xs">Achievement</TableHead>
                    <TableHead className="text-xs text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {SEGS.map(seg => {
                    const d = INST_TARGETS[seg.key];
                    const ap = pct(d.amount * mult, d.amountTarget * mult);
                    return (
                      <TableRow key={seg.key} className="hover:bg-muted/20">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${seg.color}18`, color: seg.color }}>
                              {seg.icon}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{seg.label}</p>
                              <p className="text-[10px] text-muted-foreground capitalize">{period}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs">{(d.unitTarget * mult).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs font-medium">{(d.units * mult).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-xs">{fmtAED(d.amountTarget * mult)}</TableCell>
                        <TableCell className="text-right text-xs font-medium" style={{ color: seg.color }}>{fmtAED(d.amount * mult)}</TableCell>
                        <TableCell className="min-w-28">
                          <div className="space-y-0.5">
                            <span className={cn("text-xs font-semibold", achColor(ap))}>{ap}%</span>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, ap)}%`, backgroundColor: seg.color }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowInstForm(true)}>
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                              <Copy className="h-3 w-3" />
                            </Button>
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

        {/* ══════════════════════════════════════════════════════════════════
            TAB 3 — INDIVIDUAL TARGETS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="individual" className="space-y-5 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Individual Target Assignments</h2>
              <p className="text-xs text-muted-foreground">Targets allocated to each staff member by category</p>
            </div>
            <Button size="sm" className="text-xs h-8 text-white" style={{ backgroundColor: "#327F74" }}
              onClick={() => setShowIndForm(true)}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Assign Target
            </Button>
          </div>

          {/* Allocation flow */}
          <Card className="border-border/50 bg-muted/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-xs">
                {["Institution Target", "→", "Branch Target", "→", "Team Target", "→", "Individual Target", "→", "Actual Achievement"].map((item, i) => (
                  <span key={i} className={i % 2 === 0 ? "font-semibold text-foreground" : "text-muted-foreground text-lg"}>{item}</span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Individual performance detail per employee per category */}
          <div className="space-y-3">
            {filteredEmps.map(emp => {
              const empTotRevT = SEGS.reduce((s, seg) => s + (PERF[emp.id]?.[seg.key]?.amountTarget ?? 0), 0) * mult;
              const empTotRevA = SEGS.reduce((s, seg) => s + (PERF[emp.id]?.[seg.key]?.amount ?? 0), 0) * mult;
              const empAch = pct(empTotRevA, empTotRevT);
              return (
                <Card key={emp.id} className="border-border/50">
                  <CardHeader className="pb-2 pt-4 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: "#327F7420", color: "#327F74" }}>
                            {emp.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold text-sm">{emp.name}</p>
                          <p className="text-[10px] text-muted-foreground">{emp.role} · {emp.dept} · {emp.branch}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className={cn("text-sm font-bold", achColor(empAch))}>{empAch}%</p>
                          <p className="text-[10px] text-muted-foreground">overall</p>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setEmpDetail(emp.id)}>
                          <Eye className="h-3 w-3 mr-1" /> Detail
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowIndForm(true)}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 mt-1">
                      {SEGS.map(seg => {
                        const p = PERF[emp.id]?.[seg.key];
                        if (!p || (p.amountTarget === 0 && p.unitTarget === 0)) return null;
                        const ap = pct(p.amount, p.amountTarget);
                        return (
                          <div key={seg.key} className="p-2 rounded-lg border border-border/40 text-center" style={{ backgroundColor: `${seg.color}08` }}>
                            <div className="flex items-center justify-center gap-0.5 mb-1" style={{ color: seg.color }}>{seg.icon}<span className="text-[9px] font-medium ml-0.5">{seg.short}</span></div>
                            <p className={cn("text-xs font-bold", achColor(ap))}>{ap}%</p>
                            <p className="text-[9px] text-muted-foreground">{p.units}/{p.unitTarget} units</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 4 — COMMISSION RULES
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="commission" className="space-y-5 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Commission Rule Engine</h2>
              <p className="text-xs text-muted-foreground">Configure threshold-based commission plans per category and role</p>
            </div>
            <Button size="sm" className="text-xs h-8 text-white" style={{ backgroundColor: "#327F74" }}
              onClick={() => { setRuleDetail(null); setShowRuleForm(true); }}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create Rule
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {RULES.map(rule => {
              const seg = segByKey(rule.category);
              return (
                <Card key={rule.id} className="border-border/50 hover:border-[#327F7430] transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: `${seg.color}18`, color: seg.color }}>
                        {seg.icon}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold text-sm">{rule.name}</p>
                          <Badge className={cn("text-[10px] border", ruleBadge[rule.status])}>{rule.status}</Badge>
                          <Badge variant="outline" className="text-[10px]">{seg.label}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground mb-3">
                          <span>Basis: <strong className="text-foreground">{rule.basis}</strong></span>
                          <span>Calc: <strong className="text-foreground">{rule.calcBasis}</strong></span>
                          <span>Roles: <strong className="text-foreground">{rule.roles.join(", ")}</strong></span>
                          <span>Priority: <strong className="text-foreground">#{rule.priority}</strong></span>
                          <span>Valid: <strong className="text-foreground">{rule.effectiveFrom} → {rule.effectiveTo}</strong></span>
                        </div>
                        {/* Tier visualization */}
                        <div className="flex flex-wrap gap-2">
                          {rule.tiers.map((tier, i) => (
                            <div key={i} className="flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px]" style={{ backgroundColor: `${seg.color}0a`, borderColor: `${seg.color}30` }}>
                              <span className="text-muted-foreground">{tier.from}–{tier.to === null ? "∞" : tier.to}:</span>
                              <strong style={{ color: seg.color }}>{tier.rate}{tier.rateType === "pct" ? "%" : " AED"}</strong>
                              {tier.rateType === "fixed" && <span className="text-muted-foreground">/ unit</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setRuleDetail(rule); setShowRuleForm(true); }}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setRuleDetail(rule); setShowRuleForm(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════
            TAB 5 — COMMISSION EARNINGS
        ══════════════════════════════════════════════════════════════════ */}
        <TabsContent value="earnings" className="space-y-5 mt-4">

          {/* Earning KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Estimated",         value: fmtAED(earnTotals.estimated), color: "#3b82f6", badge: "estimated" as EarnStatus },
              { label: "Pending Verification", value: fmtAED(earnTotals.pending),  color: "#f59e0b", badge: "pending"   as EarnStatus },
              { label: "Approved",          value: fmtAED(earnTotals.approved), color: "#10b981", badge: "approved"  as EarnStatus },
              { label: "Paid",              value: fmtAED(earnTotals.paid),     color: "#327F74", badge: "paid"      as EarnStatus },
            ].map((kpi, i) => (
              <Card key={i} className="border-border/50 cursor-pointer hover:border-[#327F7440]"
                onClick={() => setStatusF(kpi.badge === statusF ? "all" : kpi.badge)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${kpi.color}18`, color: kpi.color }}>
                    <Banknote className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">{kpi.label}</p>
                    <p className="text-base font-bold">{kpi.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Earnings sub-filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Category", val: catF, set: setCatF, opts: [["all","All Categories"], ...SEGS.map(s => [s.key, s.label])] as [string,string][] },
              { label: "Status",   val: statusF, set: setStatusF, opts: [["all","All Statuses"],["estimated","Estimated"],["pending","Pending"],["approved","Approved"],["paid","Paid"],["rejected","Rejected"]] as [string,string][] },
            ].map(({ label, val, set, opts }) => (
              <Select key={label} value={val} onValueChange={set as (v: string) => void}>
                <SelectTrigger className="h-7 text-xs w-auto min-w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {opts.map(([v, l]) => <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
          </div>

          {/* Earnings table */}
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4">Employee</TableHead>
                    <TableHead className="text-xs">Category</TableHead>
                    <TableHead className="text-xs text-right">Units</TableHead>
                    <TableHead className="text-xs text-right">Collection</TableHead>
                    <TableHead className="text-xs text-right">Profit</TableHead>
                    <TableHead className="text-xs">Achievement</TableHead>
                    <TableHead className="text-xs">Applied Rule</TableHead>
                    <TableHead className="text-xs text-right">Commission</TableHead>
                    <TableHead className="text-xs text-center">Status</TableHead>
                    <TableHead className="text-xs text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(earnings.filter(e => {
                    if (empF    !== "all" && e.empId    !== empF)    return false;
                    if (catF    !== "all" && e.category !== catF)    return false;
                    if (statusF !== "all" && e.status   !== statusF) return false;
                    return true;
                  })).map(e => {
                    const emp = EMPLOYEES.find(em => em.id === e.empId)!;
                    const seg = segByKey(e.category);
                    return (
                      <TableRow key={e.id} className="cursor-pointer hover:bg-muted/30"
                        onClick={() => setEarnDetail(e)}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[9px] font-bold" style={{ backgroundColor: "#327F7415", color: "#327F74" }}>
                                {emp?.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium">{emp?.name}</p>
                              <p className="text-[9px] text-muted-foreground">{emp?.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1" style={{ color: seg.color }}>
                            {seg.icon}
                            <span className="text-xs">{seg.short}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs">{e.units} / {e.unitTarget}</TableCell>
                        <TableCell className="text-right text-xs">{fmtAED(e.amount)}</TableCell>
                        <TableCell className="text-right text-xs">{e.profit > 0 ? fmtAED(e.profit) : "—"}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5 min-w-20">
                            <span className={cn("text-xs font-semibold", achColor(e.achievement))}>{e.achievement}%</span>
                            <div className="h-1 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${Math.min(100, e.achievement)}%`, backgroundColor: achBg(e.achievement) }} />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] text-muted-foreground max-w-32 truncate">{e.rule}</TableCell>
                        <TableCell className="text-right text-xs font-bold" style={{ color: "#327F74" }}>{fmtAED(e.commission)}</TableCell>
                        <TableCell className="text-center">
                          <Badge className={cn("text-[9px] border", earnBadge[e.status])}>{e.status}</Badge>
                        </TableCell>
                        <TableCell className="text-center" onClick={ev => ev.stopPropagation()}>
                          <div className="flex items-center justify-center gap-0.5">
                            {e.status === "pending" && (
                              <>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                                  onClick={() => updateEarning(e.id, { status: "approved" })}>
                                  <CheckCircle className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:text-red-600"
                                  onClick={() => updateEarning(e.id, { status: "rejected" })}>
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {e.status === "approved" && (
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" style={{ color: "#327F74" }}
                                onClick={() => updateEarning(e.id, { status: "paid" })}>
                                <Banknote className="h-3.5 w-3.5" />
                              </Button>
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
      </Tabs>

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── Employee Detail Dialog ──────────────────────────────────────────── */}
      {empDetail && (() => {
        const emp = EMPLOYEES.find(e => e.id === empDetail)!;
        if (!emp) return null;
        return (
          <Dialog open={!!empDetail} onOpenChange={() => setEmpDetail(null)}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="font-bold" style={{ backgroundColor: "#327F7420", color: "#327F74" }}>
                      {emp.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{emp.name}</DialogTitle>
                    <DialogDescription>{emp.role} · {emp.dept} · {emp.branch}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                {SEGS.map(seg => {
                  const p = PERF[emp.id]?.[seg.key];
                  if (!p || (p.amountTarget === 0 && p.unitTarget === 0)) return null;
                  const ap = pct(p.amount * mult, p.amountTarget * mult);
                  return (
                    <div key={seg.key} className="p-4 rounded-xl border border-border/40" style={{ backgroundColor: `${seg.color}06` }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span style={{ color: seg.color }}>{seg.icon}</span>
                          <p className="font-semibold text-sm">{seg.label}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={cn("text-sm font-bold", achColor(ap))}>{ap}%</span>
                          <Badge className={cn("text-[10px] border", ap >= 100 ? "bg-green-50 text-green-700 border-green-200" : ap >= 80 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-600 border-red-200")}>
                            {ap >= 100 ? "On Track" : ap >= 80 ? "Near Target" : "Below Target"}
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden mb-3">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, ap)}%`, backgroundColor: seg.color }} />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {[
                          { label: "Units Target", value: (p.unitTarget * mult).toString() },
                          { label: "Units Done",   value: (p.units * mult).toString() },
                          { label: "Amt Target",   value: fmtAED(p.amountTarget * mult) },
                          { label: "Collected",    value: fmtAED(p.amount * mult) },
                        ].map((item, i) => (
                          <div key={i} className="p-2 bg-white/60 rounded-lg">
                            <p className="text-[10px] text-muted-foreground">{item.label}</p>
                            <p className="font-semibold mt-0.5">{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {p.commission > 0 && (
                        <div className="mt-2 flex items-center gap-2 text-xs">
                          <Banknote className="h-3.5 w-3.5" style={{ color: seg.color }} />
                          <span className="text-muted-foreground">Est. Commission:</span>
                          <strong style={{ color: seg.color }}>{fmtAED(p.commission * mult)}</strong>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setEmpDetail(null)}>Close</Button>
                <Button style={{ backgroundColor: "#327F74" }} className="text-white" onClick={() => { setEmpDetail(null); setTab("earnings"); setEmpF(empDetail!); }}>
                  View Earnings
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── Earning Breakdown Dialog ────────────────────────────────────────── */}
      {earnDetail && (() => {
        const emp = EMPLOYEES.find(e => e.id === earnDetail.empId)!;
        const seg = segByKey(earnDetail.category);
        const rule = RULES.find(r => r.name === earnDetail.rule);
        return (
          <Dialog open={!!earnDetail} onOpenChange={() => { setEarnDetail(null); setRejectNote(""); }}>
            <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Commission Breakdown</DialogTitle>
                <DialogDescription>{emp?.name} · {seg.label}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                {/* Status */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <span className="text-sm font-medium">Current Status</span>
                  <Badge className={cn("border text-xs", earnBadge[earnDetail.status])}>{earnDetail.status}</Badge>
                </div>
                {/* Breakdown grid */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Units Target",    value: earnDetail.unitTarget.toString() },
                    { label: "Units Achieved",  value: earnDetail.units.toString() },
                    { label: "Collection",      value: fmtAED(earnDetail.amount) },
                    { label: "Eligible Profit", value: earnDetail.profit > 0 ? fmtAED(earnDetail.profit) : "N/A" },
                    { label: "Achievement %",   value: `${earnDetail.achievement}%` },
                    { label: "Applied Rule",    value: earnDetail.rule },
                  ].map((item, i) => (
                    <div key={i} className="p-3 rounded-lg border border-border/40 bg-muted/10">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</p>
                      <p className="font-semibold mt-0.5 text-sm">{item.value}</p>
                    </div>
                  ))}
                </div>
                {/* Applied tiers */}
                {rule && (
                  <div className="p-3 rounded-lg border border-border/40">
                    <p className="text-xs font-semibold mb-2 text-muted-foreground">Applied Tiers — {rule.calcBasis}</p>
                    <div className="space-y-1">
                      {rule.tiers.map((tier, i) => {
                        const active = earnDetail.units >= tier.from && (tier.to === null || earnDetail.units <= tier.to);
                        return (
                          <div key={i} className={cn("flex items-center justify-between px-3 py-1.5 rounded text-xs", active ? "font-bold" : "")}
                            style={active ? { backgroundColor: `${seg.color}15`, color: seg.color } : { color: "#888" }}>
                            <span>{tier.from} – {tier.to ?? "∞"}</span>
                            <span>{tier.rate}{tier.rateType === "pct" ? "%" : " AED / unit"}</span>
                            {active && <Badge className="text-[9px] border ml-2" style={{ backgroundColor: `${seg.color}20`, color: seg.color, borderColor: `${seg.color}40` }}>Applied</Badge>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Commission result */}
                <div className="p-4 rounded-xl border-2 flex items-center justify-between" style={{ borderColor: `${seg.color}40`, backgroundColor: `${seg.color}08` }}>
                  <div>
                    <p className="text-xs text-muted-foreground">Final Commission</p>
                    <p className="text-2xl font-bold" style={{ color: seg.color }}>{fmtAED(earnDetail.commission)}</p>
                  </div>
                  <Award className="h-8 w-8 opacity-40" style={{ color: seg.color }} />
                </div>
                {/* Reject note */}
                {earnDetail.status === "pending" && (
                  <div className="space-y-1">
                    <Label className="text-xs">Rejection Reason (if rejecting)</Label>
                    <input
                      className="w-full rounded-md border border-input px-3 py-2 text-sm"
                      placeholder="Optional reason..."
                      value={rejectNote}
                      onChange={e => setRejectNote(e.target.value)}
                    />
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4 flex-wrap gap-2">
                <Button variant="outline" onClick={() => { setEarnDetail(null); setRejectNote(""); }}>Close</Button>
                {earnDetail.status === "pending" && <>
                  <Button variant="outline" className="text-red-600 border-red-200" onClick={() => { updateEarning(earnDetail.id, { status: "rejected", note: rejectNote }); setEarnDetail(null); }}>
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                  <Button style={{ backgroundColor: "#327F74" }} className="text-white" onClick={() => { updateEarning(earnDetail.id, { status: "approved" }); setEarnDetail(null); }}>
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                </>}
                {earnDetail.status === "approved" && (
                  <Button style={{ backgroundColor: "#327F74" }} className="text-white" onClick={() => { updateEarning(earnDetail.id, { status: "paid" }); setEarnDetail(null); }}>
                    <Banknote className="h-3.5 w-3.5 mr-1" /> Mark as Paid
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* ── Institution Target Form Dialog ──────────────────────────────────── */}
      <Dialog open={showInstForm} onOpenChange={setShowInstForm}>
        <DialogContent className="sm:max-w-[620px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Institution Target</DialogTitle>
            <DialogDescription>Configure category-wise targets for the facility</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Branch", opts: ["All Branches", ...BRANCHES] },
                { label: "Period", opts: ["Monthly", "Quarterly", "Yearly"] },
              ].map(({ label, opts }) => (
                <div key={label} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Select defaultValue={opts[0]}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>{opts.map(o => <SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">Start Date</Label>
                <Input type="date" defaultValue="2026-10-01" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End Date</Label>
                <Input type="date" defaultValue="2026-10-31" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Responsible Manager</Label>
                <Select defaultValue="all">
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYEES.map(e => <SelectItem key={e.id} value={e.id} className="text-sm">{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Notes</Label>
                <Input placeholder="Optional notes..." className="h-9 text-sm" />
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category Targets</p>
            <div className="space-y-3">
              {SEGS.map(seg => (
                <div key={seg.key} className="grid grid-cols-3 gap-3 items-center p-3 rounded-lg border border-border/40" style={{ backgroundColor: `${seg.color}06` }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: seg.color }}>{seg.icon}</span>
                    <Label className="text-xs font-medium">{seg.short}</Label>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Units Target</Label>
                    <Input type="number" defaultValue={INST_TARGETS[seg.key].unitTarget} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] text-muted-foreground">Amount (AED)</Label>
                    <Input type="number" defaultValue={INST_TARGETS[seg.key].amountTarget} className="h-7 text-xs" />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowInstForm(false)}>Save as Draft</Button>
            <Button style={{ backgroundColor: "#327F74" }} className="text-white" onClick={() => setShowInstForm(false)}>
              <Save className="h-3.5 w-3.5 mr-1" /> Publish Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Individual Target Form Dialog ───────────────────────────────────── */}
      <Dialog open={showIndForm} onOpenChange={setShowIndForm}>
        <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Individual Target</DialogTitle>
            <DialogDescription>Set targets for a specific staff member</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Employee</Label>
                <Select defaultValue="1">
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{EMPLOYEES.map(e => <SelectItem key={e.id} value={e.id} className="text-sm">{e.name} ({e.role})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Commission Plan</Label>
                <Select defaultValue="r1">
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{RULES.map(r => <SelectItem key={r.id} value={r.id} className="text-sm">{r.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Period</Label>
                <Select defaultValue="monthly">
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="quarterly">Quarterly</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <Separator />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category Targets</p>
            <div className="space-y-2">
              {SEGS.map(seg => (
                <div key={seg.key} className="grid grid-cols-3 gap-3 items-center p-2.5 rounded-lg border border-border/40" style={{ backgroundColor: `${seg.color}06` }}>
                  <div className="flex items-center gap-1.5">
                    <span style={{ color: seg.color }}>{seg.icon}</span>
                    <Label className="text-xs">{seg.short}</Label>
                  </div>
                  <Input type="number" placeholder="Units" className="h-7 text-xs" defaultValue={PERF["1"]?.[seg.key]?.unitTarget ?? 0} />
                  <Input type="number" placeholder="AED" className="h-7 text-xs" defaultValue={PERF["1"]?.[seg.key]?.amountTarget ?? 0} />
                </div>
              ))}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Input placeholder="Optional notes..." className="h-9 text-sm" />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="text-xs" onClick={() => {}}>
              <Copy className="h-3.5 w-3.5 mr-1" /> Copy from Previous Period
            </Button>
            <Button style={{ backgroundColor: "#327F74" }} className="text-white text-xs" onClick={() => setShowIndForm(false)}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save Target
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Commission Rule Form / Detail Dialog ────────────────────────────── */}
      <Dialog open={showRuleForm} onOpenChange={setShowRuleForm}>
        <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{ruleDetail ? "Edit Rule" : "Create Commission Rule"}</DialogTitle>
            <DialogDescription>Configure threshold-based commission tiers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Rule Name</Label>
                <Input defaultValue={ruleDetail?.name ?? ""} placeholder="e.g. PT Sessions — Tiered Fixed" className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select defaultValue={ruleDetail?.category ?? "sessions"}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{SEGS.map(s => <SelectItem key={s.key} value={s.key} className="text-sm">{s.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Measurement Basis</Label>
                <Select defaultValue={ruleDetail?.basis ?? "units"}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="units">Units Achieved</SelectItem>
                    <SelectItem value="amount">Collection Amount</SelectItem>
                    <SelectItem value="profit">Eligible Profit</SelectItem>
                    <SelectItem value="achievement_pct">Achievement %</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Calculation Method</Label>
                <Select defaultValue={ruleDetail?.calcBasis ?? "tiered"}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tiered">Tiered Slab</SelectItem>
                    <SelectItem value="fixed_per_unit">Fixed per Unit</SelectItem>
                    <SelectItem value="pct_collection">% of Collection</SelectItem>
                    <SelectItem value="pct_profit">% of Profit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Eligible Roles</Label>
                <Select defaultValue="all">
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {ROLES.map(r => <SelectItem key={r} value={r} className="text-sm">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Effective From</Label>
                <Input type="date" defaultValue={ruleDetail?.effectiveFrom ?? "2026-10-01"} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Effective To</Label>
                <Input type="date" defaultValue={ruleDetail?.effectiveTo ?? "2026-12-31"} className="h-9 text-sm" />
              </div>
            </div>

            <Separator />
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Commission Tiers</p>
              <Button size="sm" variant="outline" className="text-xs h-7"
                onClick={() => setRuleForm(prev => ({ ...prev, tiers: [...prev.tiers, { from: 0, to: null, rate: 5, rateType: "fixed" }] }))}>
                <Plus className="h-3 w-3 mr-0.5" /> Add Tier
              </Button>
            </div>

            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 px-1">
              {["From", "To (blank=∞)", "Type", "Rate", ""].map(h => (
                <p key={h} className="text-[10px] text-muted-foreground uppercase font-semibold">{h}</p>
              ))}
            </div>
            {(ruleDetail?.tiers ?? ruleForm.tiers).map((tier, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 items-center p-3 rounded-lg bg-muted/20 border border-border/40">
                <Input type="number" defaultValue={tier.from} className="h-8 text-sm" placeholder="0" />
                <Input type="number" defaultValue={tier.to ?? ""} className="h-8 text-sm" placeholder="∞" />
                <Select defaultValue={tier.rateType}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pct">% Rate</SelectItem>
                    <SelectItem value="fixed">Fixed AED</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Input type="number" defaultValue={tier.rate} className="h-8 text-sm pr-7" />
                  <span className="absolute right-2 top-1.5 text-[10px] text-muted-foreground">{tier.rateType === "pct" ? "%" : "AED"}</span>
                </div>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {/* Example preview */}
            {ruleDetail && (
              <div className="p-3 rounded-lg bg-muted/30 text-xs space-y-1">
                <p className="font-medium flex items-center gap-1"><Zap className="h-3 w-3" /> Example calculation</p>
                {ruleDetail.tiers.map((t, i) => (
                  <p key={i} className="text-muted-foreground">• {t.from}–{t.to ?? "∞"}: <strong>{t.rate}{t.rateType === "pct" ? "%" : " AED/unit"}</strong> commission</p>
                ))}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowRuleForm(false)}>Save as Draft</Button>
            <Button style={{ backgroundColor: "#327F74" }} className="text-white" onClick={() => setShowRuleForm(false)}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Save & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
