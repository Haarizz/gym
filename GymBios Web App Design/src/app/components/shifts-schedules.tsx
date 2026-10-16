import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import {
  Clock, Users, Calendar, Plus, ChevronRight, Building2, Filter,
  Copy, Search, AlertCircle, CheckCircle, Save, Pencil, Eye,
  Settings2, RotateCcw, ArrowLeft, Zap, Sun, Moon, Sunrise,
  TimerOff, MoreVertical, RefreshCw, X, Info,
} from "lucide-react";
import { cn } from "./ui/utils";
import { format, addDays, startOfWeek } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────

type ShiftType = "fixed" | "flexible" | "rotational" | "split" | "overnight";
type ShiftStatus = "active" | "draft" | "inactive";
type RuleStatus = "present" | "late" | "absent" | "half-day" | "overtime";

interface Shift {
  id: string; name: string; code: string; type: ShiftType;
  checkIn: string; checkOut: string;
  breakStart: string; breakEnd: string;
  netHours: number; graceIn: number; graceOut: number;
  overtimeEligible: boolean; overnight: boolean;
  workDays: string[]; branches: string[]; departments: string[];
  status: ShiftStatus; assignedCount: number;
}

interface ScheduleEntry { empId: string; date: string; shiftId: string; status: string; }

// ── Mock Data ─────────────────────────────────────────────────────────────────

const BRANCHES = ["Downtown Dubai", "Marina Branch", "JLT Branch"];
const DEPARTMENTS = ["Personal Training", "Group Classes", "Customer Service", "Sales", "Management"];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const SHIFTS: Shift[] = [
  {
    id: "s1", name: "Morning Shift", code: "MRN", type: "fixed",
    checkIn: "06:00", checkOut: "14:00", breakStart: "10:00", breakEnd: "10:30",
    netHours: 7.5, graceIn: 10, graceOut: 15,
    overtimeEligible: true, overnight: false,
    workDays: ["Mon","Tue","Wed","Thu","Fri"],
    branches: ["Downtown Dubai","Marina Branch"], departments: ["Personal Training","Group Classes"],
    status: "active", assignedCount: 8,
  },
  {
    id: "s2", name: "Afternoon Shift", code: "AFT", type: "fixed",
    checkIn: "14:00", checkOut: "22:00", breakStart: "18:00", breakEnd: "18:30",
    netHours: 7.5, graceIn: 10, graceOut: 15,
    overtimeEligible: true, overnight: false,
    workDays: ["Mon","Tue","Wed","Thu","Fri","Sat"],
    branches: ["Downtown Dubai"], departments: ["Personal Training","Customer Service"],
    status: "active", assignedCount: 6,
  },
  {
    id: "s3", name: "Evening Shift", code: "EVN", type: "fixed",
    checkIn: "16:00", checkOut: "24:00", breakStart: "20:00", breakEnd: "20:30",
    netHours: 7.5, graceIn: 10, graceOut: 15,
    overtimeEligible: true, overnight: true,
    workDays: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"],
    branches: ["Marina Branch","JLT Branch"], departments: ["Personal Training"],
    status: "active", assignedCount: 4,
  },
  {
    id: "s4", name: "Admin Flexible", code: "FLX", type: "flexible",
    checkIn: "09:00", checkOut: "18:00", breakStart: "13:00", breakEnd: "14:00",
    netHours: 8, graceIn: 30, graceOut: 30,
    overtimeEligible: false, overnight: false,
    workDays: ["Mon","Tue","Wed","Thu","Fri"],
    branches: ["Downtown Dubai"], departments: ["Management","Sales"],
    status: "active", assignedCount: 3,
  },
  {
    id: "s5", name: "Weekend Split", code: "WKS", type: "split",
    checkIn: "08:00", checkOut: "20:00", breakStart: "13:00", breakEnd: "16:00",
    netHours: 9, graceIn: 15, graceOut: 15,
    overtimeEligible: true, overnight: false,
    workDays: ["Sat","Sun"],
    branches: ["Downtown Dubai","Marina Branch"], departments: ["Personal Training","Group Classes"],
    status: "draft", assignedCount: 0,
  },
];

const EMPLOYEES = [
  { id: "1", name: "Ahmed Al-Rashid",     initials: "AA", role: "Trainer",         dept: "Personal Training",  branch: "Downtown Dubai", shiftId: "s1" },
  { id: "2", name: "Sara Johnson",        initials: "SJ", role: "Trainer",         dept: "Group Classes",      branch: "Marina Branch",  shiftId: "s2" },
  { id: "3", name: "Mohammed Hassan",     initials: "MH", role: "Receptionist",    dept: "Customer Service",   branch: "Downtown Dubai", shiftId: "s4" },
  { id: "4", name: "Fatima Al-Zahra",     initials: "FZ", role: "Trainer",         dept: "Personal Training",  branch: "Marina Branch",  shiftId: "s1" },
  { id: "5", name: "Khalid Al-Mansoori", initials: "KM", role: "Sales Executive",  dept: "Sales",              branch: "Downtown Dubai", shiftId: "s4" },
  { id: "6", name: "Looka Ibrahim",       initials: "LI", role: "Trainer",         dept: "Group Classes",      branch: "JLT Branch",     shiftId: "s3" },
];

const TODAY_EXCEPTIONS = [
  { emp: "Ahmed Al-Rashid",  type: "Late Arrival",        time: "06:24",  shift: "Morning",   note: "10 min late" },
  { emp: "Sara Johnson",     type: "Early Departure",     time: "13:30",  shift: "Afternoon", note: "Left 30 min early" },
  { emp: "Fatima Al-Zahra",  type: "Incomplete Punch",    time: "—",      shift: "Morning",   note: "Missing check-out" },
  { emp: "Looka Ibrahim",    type: "Absent",              time: "—",      shift: "Evening",   note: "No check-in" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const shiftTypeIcon = (t: ShiftType) => ({
  fixed:       <Sun className="h-3.5 w-3.5" />,
  flexible:    <Clock className="h-3.5 w-3.5" />,
  rotational:  <RefreshCw className="h-3.5 w-3.5" />,
  split:       <Zap className="h-3.5 w-3.5" />,
  overnight:   <Moon className="h-3.5 w-3.5" />,
})[t];

const shiftTypeColor = (t: ShiftType) => ({
  fixed: "#2B7A78", flexible: "#4BA3A0", rotational: "#1D6A65",
  split: "#5BB5B2", overnight: "#0E5954",
})[t];

const statusBadge: Record<ShiftStatus, string> = {
  active:   "bg-green-50 text-green-700 border-green-200",
  draft:    "bg-amber-50 text-amber-700 border-amber-200",
  inactive: "bg-gray-50 text-gray-500 border-gray-200",
};

interface ShiftsSchedulesProps { onNavigate?: (section: string) => void; }

// ── Weekly Roster Grid ────────────────────────────────────────────────────────

function WeeklyRoster({ shifts }: { shifts: Shift[] }) {
  const weekStart = startOfWeek(new Date("2026-10-13"), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const findShift = (empShiftId: string) => shifts.find(s => s.id === empShiftId);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/30">
            <th className="text-left px-3 py-2.5 font-semibold text-foreground w-40 border-b border-r border-border/40">Employee</th>
            {weekDays.map(d => (
              <th key={d.toISOString()} className="px-2 py-2.5 text-center font-semibold border-b border-r border-border/40 min-w-28">
                <div>{format(d, 'EEE')}</div>
                <div className="text-muted-foreground font-normal">{format(d, 'd MMM')}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {EMPLOYEES.map(emp => {
            const shift = findShift(emp.shiftId);
            return (
              <tr key={emp.id} className="hover:bg-muted/10 border-b border-border/30">
                <td className="px-3 py-2 border-r border-border/40">
                  <div className="flex items-center gap-1.5">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[9px] font-bold" style={{ backgroundColor: "#2B7A7818", color: "#2B7A78" }}>{emp.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-[11px] leading-tight">{emp.name}</p>
                      <p className="text-[9px] text-muted-foreground">{emp.role}</p>
                    </div>
                  </div>
                </td>
                {weekDays.map((d, di) => {
                  const dayName = format(d, 'EEE');
                  const isOff = shift && !shift.workDays.includes(dayName);
                  return (
                    <td key={d.toISOString()} className="px-1 py-1 text-center border-r border-border/30 align-middle">
                      {isOff ? (
                        <div className="px-1 py-1 rounded text-[9px] font-medium bg-muted/40 text-muted-foreground">OFF</div>
                      ) : shift ? (
                        <div className="px-1.5 py-1 rounded text-[9px] font-medium" style={{ backgroundColor: `${shiftTypeColor(shift.type)}15`, color: shiftTypeColor(shift.type) }}>
                          <div className="font-semibold">{shift.code}</div>
                          <div className="opacity-80">{shift.checkIn}–{shift.checkOut}</div>
                        </div>
                      ) : (
                        <div className="text-[9px] text-red-500 font-medium">No Shift</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// Main Component
// ═════════════════════════════════════════════════════════════════════════════

export function ShiftsSchedules({ onNavigate }: ShiftsSchedulesProps) {
  const [tab, setTab] = useState("templates");
  const [showCreateShift, setShowCreateShift] = useState(false);
  const [showAssignShift, setShowAssignShift] = useState(false);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [searchEmp, setSearchEmp] = useState("");
  const [filterBranch, setFilterBranch] = useState("all");
  const [filterDept, setFilterDept] = useState("all");

  // Shift form state
  const [shiftForm, setShiftForm] = useState({
    name: "", code: "", type: "fixed" as ShiftType, branches: [] as string[],
    checkIn: "08:00", checkOut: "17:00", breakStart: "13:00", breakEnd: "14:00",
    graceIn: "10", graceOut: "15", overtimeEligible: true, overnight: false,
    workDays: ["Mon","Tue","Wed","Thu","Fri"],
  });

  const computedHours = useMemo(() => {
    const [inH, inM] = shiftForm.checkIn.split(":").map(Number);
    const [outH, outM] = shiftForm.checkOut.split(":").map(Number);
    const [bsH, bsM] = shiftForm.breakStart.split(":").map(Number);
    const [beH, beM] = shiftForm.breakEnd.split(":").map(Number);
    let total = (outH * 60 + outM) - (inH * 60 + inM);
    if (total < 0) total += 24 * 60;
    const breakDur = (beH * 60 + beM) - (bsH * 60 + bsM);
    const net = Math.max(0, total - breakDur) / 60;
    return net.toFixed(1);
  }, [shiftForm.checkIn, shiftForm.checkOut, shiftForm.breakStart, shiftForm.breakEnd]);

  const filteredEmps = EMPLOYEES.filter(e => {
    if (filterBranch !== "all" && e.branch !== filterBranch) return false;
    if (filterDept !== "all" && e.dept !== filterDept) return false;
    if (searchEmp && !e.name.toLowerCase().includes(searchEmp.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 space-y-5 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Payroll & Employees</span><ChevronRight className="h-3 w-3"/>
        <span className="text-foreground font-medium">Shifts & Schedules</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#2B7A7818" }}>
            <Clock className="h-5 w-5" style={{ color: "#2B7A78" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Shifts & Schedules</h1>
            <p className="text-sm text-muted-foreground">Create shifts · Assign employees · Manage rosters · Track attendance rules</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowAssignShift(true)}>
            <Users className="h-3.5 w-3.5 mr-1" /> Assign Employees
          </Button>
          <Button size="sm" className="text-white" style={{ backgroundColor: "#2B7A78" }} onClick={() => { setSelectedShift(null); setShowCreateShift(true); }}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Create Shift
          </Button>
          <Button size="sm" variant="outline" onClick={() => onNavigate?.("staffs-trainers")}>
            <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Shift Templates",        value: SHIFTS.length,                   icon: <Settings2 className="h-4 w-4"/>, color: "#2B7A78" },
          { label: "Employees Assigned",     value: EMPLOYEES.length,                icon: <Users className="h-4 w-4"/>,    color: "#10b981" },
          { label: "Without Shift",          value: 0,                               icon: <TimerOff className="h-4 w-4"/>, color: "#6b7280" },
          { label: "Today Scheduled",        value: 18,                              icon: <CheckCircle className="h-4 w-4"/>, color: "#3b82f6" },
          { label: "Att. Exceptions",        value: TODAY_EXCEPTIONS.length,         icon: <AlertCircle className="h-4 w-4"/>, color: "#f59e0b" },
          { label: "Pending Changes",        value: 2,                               icon: <RefreshCw className="h-4 w-4"/>,  color: "#8b5cf6" },
        ].map((kpi, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${kpi.color}18`, color: kpi.color }}>
                {kpi.icon}
              </div>
              <div>
                <p className="text-lg font-bold leading-tight">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground">{kpi.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="templates"  className="text-xs gap-1"><Settings2 className="h-3.5 w-3.5"/>Templates</TabsTrigger>
          <TabsTrigger value="schedules"  className="text-xs gap-1"><Users className="h-3.5 w-3.5"/>Schedules</TabsTrigger>
          <TabsTrigger value="weekly"     className="text-xs gap-1"><Calendar className="h-3.5 w-3.5"/>Weekly</TabsTrigger>
          <TabsTrigger value="monthly"    className="text-xs gap-1"><Calendar className="h-3.5 w-3.5"/>Monthly</TabsTrigger>
          <TabsTrigger value="exceptions" className="text-xs gap-1"><AlertCircle className="h-3.5 w-3.5"/>Exceptions</TabsTrigger>
        </TabsList>

        {/* ─ TAB: Shift Templates ─────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-3 mt-4">
          <div className="grid grid-cols-1 gap-4">
            {SHIFTS.map(shift => (
              <Card key={shift.id} className="border-border/50 hover:border-[#2B7A7830] transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${shiftTypeColor(shift.type)}18`, color: shiftTypeColor(shift.type) }}>
                      {shiftTypeIcon(shift.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm">{shift.name}</p>
                        <Badge variant="outline" className="text-[10px]">{shift.code}</Badge>
                        <Badge className={cn("text-[10px] border capitalize", statusBadge[shift.status])}>{shift.status}</Badge>
                        <Badge variant="outline" className="text-[10px] capitalize">{shift.type}</Badge>
                        {shift.overnight && <Badge className="text-[10px] bg-purple-50 text-purple-700 border-purple-200 border"><Moon className="h-2.5 w-2.5 mr-0.5"/>Overnight</Badge>}
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-2">
                        <span>⏰ {shift.checkIn} – {shift.checkOut}</span>
                        <span>☕ Break: {shift.breakStart} – {shift.breakEnd}</span>
                        <span>⏱ {shift.netHours}h net</span>
                        <span>🏢 {shift.assignedCount} employees</span>
                        <span>⚡ Grace: +{shift.graceIn}min in / +{shift.graceOut}min out</span>
                        {shift.overtimeEligible && <span>🕐 OT eligible</span>}
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {shift.workDays.map(d => (
                          <span key={d} className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                            style={{ backgroundColor: `${shiftTypeColor(shift.type)}15`, color: shiftTypeColor(shift.type) }}>{d}</span>
                        ))}
                        {DAYS.filter(d => !shift.workDays.includes(d)).map(d => (
                          <span key={d} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">{d}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setSelectedShift(shift); setShowCreateShift(true); }}>
                        <Pencil className="h-3.5 w-3.5"/>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <Copy className="h-3.5 w-3.5"/>
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowAssignShift(true)}>
                        <Users className="h-3.5 w-3.5"/>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ─ TAB: Employee Schedules ──────────────────────────────────────── */}
        <TabsContent value="schedules" className="space-y-4 mt-4">
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-40 max-w-64">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground"/>
              <Input className="pl-8 h-8 text-xs" placeholder="Search employee..." value={searchEmp} onChange={e => setSearchEmp(e.target.value)}/>
            </div>
            {[{val:filterBranch,set:setFilterBranch,opts:[["all","All Branches"],...BRANCHES.map(b=>[b,b])]},{val:filterDept,set:setFilterDept,opts:[["all","All Departments"],...DEPARTMENTS.map(d=>[d,d])]}].map(({val,set,opts},i)=>(
              <Select key={i} value={val} onValueChange={set as any}>
                <SelectTrigger className="h-8 text-xs w-40"><SelectValue/></SelectTrigger>
                <SelectContent>{opts.map(([v,l])=><SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>)}</SelectContent>
              </Select>
            ))}
          </div>
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4">Employee</TableHead>
                    <TableHead className="text-xs">Branch</TableHead>
                    <TableHead className="text-xs">Department</TableHead>
                    <TableHead className="text-xs">Assigned Shift</TableHead>
                    <TableHead className="text-xs">Work Days</TableHead>
                    <TableHead className="text-xs">Net Hours/Day</TableHead>
                    <TableHead className="text-xs text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmps.map(emp => {
                    const shift = SHIFTS.find(s => s.id === emp.shiftId);
                    return (
                      <TableRow key={emp.id} className="hover:bg-muted/20">
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] font-bold" style={{ backgroundColor: "#2B7A7818", color: "#2B7A78" }}>{emp.initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{emp.name}</p>
                              <p className="text-[10px] text-muted-foreground">{emp.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{emp.branch}</TableCell>
                        <TableCell className="text-xs">{emp.dept}</TableCell>
                        <TableCell>
                          {shift ? (
                            <div className="flex items-center gap-1">
                              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: shiftTypeColor(shift.type) }}/>
                              <span className="text-xs">{shift.name}</span>
                            </div>
                          ) : <span className="text-xs text-red-500">Unassigned</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-0.5 flex-wrap">
                            {shift?.workDays.map(d => (
                              <span key={d} className="text-[9px] px-1 rounded" style={{ backgroundColor: `${shiftTypeColor(shift.type)}18`, color: shiftTypeColor(shift.type) }}>{d}</span>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{shift?.netHours}h</TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => setShowAssignShift(true)}><Pencil className="h-3 w-3"/></Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0"><Copy className="h-3 w-3"/></Button>
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

        {/* ─ TAB: Weekly Roster ──────────────────────────────────────────── */}
        <TabsContent value="weekly" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Week of 13 Oct – 19 Oct 2026</h3>
              <p className="text-xs text-muted-foreground">Click any cell to reassign shift for that day</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-7"><Copy className="h-3 w-3 mr-1"/>Copy Last Week</Button>
              <Button size="sm" variant="outline" className="text-xs h-7"><RefreshCw className="h-3 w-3 mr-1"/>Refresh</Button>
            </div>
          </div>
          <Card className="border-border/50">
            <CardContent className="p-0 overflow-hidden">
              <WeeklyRoster shifts={SHIFTS}/>
            </CardContent>
          </Card>
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {SHIFTS.filter(s=>s.status==='active').map(s=>(
              <span key={s.id} className="flex items-center gap-1">
                <span className="h-3 w-3 rounded" style={{ backgroundColor: `${shiftTypeColor(s.type)}30`, border: `1px solid ${shiftTypeColor(s.type)}60` }}/>
                {s.code} — {s.name}
              </span>
            ))}
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-muted border border-border/40"/>OFF</span>
          </div>
        </TabsContent>

        {/* ─ TAB: Monthly Roster ─────────────────────────────────────────── */}
        <TabsContent value="monthly" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">October 2026 — Monthly Roster</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-xs h-7"><Copy className="h-3 w-3 mr-1"/>Apply to All</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] border-collapse">
              <thead>
                <tr className="bg-muted/30">
                  <th className="text-left px-3 py-2 font-semibold border-b border-r border-border/40 w-36 sticky left-0 bg-muted/30">Employee</th>
                  {Array.from({length:31},(_,i)=>i+1).map(d=>(
                    <th key={d} className="px-1 py-2 text-center font-semibold border-b border-r border-border/30 min-w-8">{d}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {EMPLOYEES.map(emp => {
                  const shift = SHIFTS.find(s=>s.id===emp.shiftId);
                  return (
                    <tr key={emp.id} className="border-b border-border/30 hover:bg-muted/10">
                      <td className="px-3 py-1.5 border-r border-border/40 sticky left-0 bg-background">
                        <p className="font-medium text-[11px]">{emp.name.split(' ')[0]} {emp.name.split(' ')[1]?.[0]}.</p>
                        <p className="text-[9px] text-muted-foreground">{shift?.code ?? '—'}</p>
                      </td>
                      {Array.from({length:31},(_,i)=>i+1).map(d => {
                        const date = new Date(2026,9,d);
                        const dayName = format(date,'EEE');
                        const isOff = shift && !shift.workDays.includes(dayName);
                        const isWeekend = dayName === 'Sat' || dayName === 'Sun';
                        return (
                          <td key={d} className={`text-center py-1.5 px-0.5 border-r border-border/20 ${isWeekend?'bg-muted/30':''}`}>
                            {isOff ? (
                              <span className="text-[8px] text-muted-foreground">—</span>
                            ) : shift ? (
                              <span className="text-[8px] font-bold" style={{color:shiftTypeColor(shift.type)}}>{shift.code}</span>
                            ) : <span className="text-[8px] text-red-400">!</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* ─ TAB: Exceptions ─────────────────────────────────────────────── */}
        <TabsContent value="exceptions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Today's Attendance Exceptions</h3>
              <p className="text-xs text-muted-foreground">Review and approve attendance corrections</p>
            </div>
            <Badge className="bg-amber-50 text-amber-700 border border-amber-200">{TODAY_EXCEPTIONS.length} exceptions</Badge>
          </div>
          <div className="space-y-3">
            {TODAY_EXCEPTIONS.map((ex, i) => (
              <Card key={i} className="border-amber-100">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full flex items-center justify-center bg-amber-50">
                      <AlertCircle className="h-4 w-4 text-amber-600"/>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{ex.emp}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{ex.type}</span>
                        <span>·</span>
                        <span>Shift: {ex.shift}</span>
                        <span>·</span>
                        <span>Time: {ex.time}</span>
                      </div>
                      <p className="text-xs text-amber-700 mt-0.5">{ex.note}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-7"><Eye className="h-3 w-3 mr-1"/>Review</Button>
                    <Button size="sm" className="text-xs h-7 text-white" style={{backgroundColor:"#2B7A78"}}><CheckCircle className="h-3 w-3 mr-1"/>Approve</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Attendance Rules Config */}
          <Card className="border-border/50 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Attendance Rules Configuration</CardTitle>
              <CardDescription className="text-xs">Define how each attendance event is treated and whether it requires approval</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4">Event</TableHead>
                    <TableHead className="text-xs">Grace Period</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Notify</TableHead>
                    <TableHead className="text-xs">Approval Req.</TableHead>
                    <TableHead className="text-xs">Payroll Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { event: "Late Arrival",       grace: "10 min",     status: "Late",             notify: "Manager", approval: "No",  payroll: "Flag only" },
                    { event: "Early Departure",     grace: "15 min",     status: "Early Departure",  notify: "Manager", approval: "Yes", payroll: "Deduct if > 30min" },
                    { event: "Missed Check-In",     grace: "—",          status: "Incomplete Punch", notify: "HR + Manager", approval: "Yes", payroll: "Hold" },
                    { event: "Missed Check-Out",    grace: "—",          status: "Incomplete Punch", notify: "Manager", approval: "Yes", payroll: "Hold" },
                    { event: "Overtime",            grace: "After 0 min",status: "OT (Pending)",     notify: "Manager", approval: "Yes", payroll: "After approval only" },
                    { event: "Absence",             grace: "—",          status: "Absent",           notify: "HR + Manager", approval: "N/A", payroll: "Deduct" },
                    { event: "Break Overrun",       grace: "5 min",      status: "Break Overrun",    notify: "Supervisor", approval: "No", payroll: "Flag only" },
                  ].map(row => (
                    <TableRow key={row.event} className="hover:bg-muted/20">
                      <TableCell className="pl-4 text-xs font-medium">{row.event}</TableCell>
                      <TableCell className="text-xs">{row.grace}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{row.status}</Badge></TableCell>
                      <TableCell className="text-xs">{row.notify}</TableCell>
                      <TableCell className="text-xs">{row.approval}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{row.payroll}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ══════════════════════════════════════════════════════════════════════
          CREATE / EDIT SHIFT DIALOG
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={showCreateShift} onOpenChange={setShowCreateShift}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedShift ? "Edit Shift" : "Create New Shift"}</DialogTitle>
            <DialogDescription>Configure shift times, breaks, attendance rules, and overtime policy</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Shift Name</Label>
                <Input defaultValue={selectedShift?.name ?? ""} placeholder="e.g. Morning Shift" className="h-9 text-sm"/>
              </div>
              <div className="space-y-1"><Label className="text-xs">Shift Code</Label>
                <Input defaultValue={selectedShift?.code ?? ""} placeholder="e.g. MRN" maxLength={6} className="h-9 text-sm"/>
              </div>
              <div className="space-y-1"><Label className="text-xs">Shift Type</Label>
                <Select defaultValue={selectedShift?.type ?? "fixed"}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{["fixed","flexible","rotational","split","overnight"].map(t=><SelectItem key={t} value={t} className="text-sm capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Shift Status</Label>
                <Select defaultValue={selectedShift?.status ?? "active"}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{["active","draft","inactive"].map(t=><SelectItem key={t} value={t} className="text-sm capitalize">{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Applicable Branches</Label>
                <Select defaultValue="all"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Branches</SelectItem>{BRANCHES.map(b=><SelectItem key={b} value={b} className="text-sm">{b}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Applicable Departments</Label>
                <Select defaultValue="all"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="all">All Departments</SelectItem>{DEPARTMENTS.map(d=><SelectItem key={d} value={d} className="text-sm">{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Effective From</Label><Input type="date" defaultValue="2026-10-01" className="h-9 text-sm"/></div>
              <div className="space-y-1"><Label className="text-xs">Effective To</Label><Input type="date" className="h-9 text-sm"/></div>
            </div>

            <Separator/>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Time Configuration</p>

            <div className="grid grid-cols-2 gap-4">
              {[["Check-In Time","checkIn"],["Check-Out Time","checkOut"],["Break Start","breakStart"],["Break End","breakEnd"]].map(([l,k])=>(
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{l}</Label>
                  <Input type="time" defaultValue={(selectedShift as any)?.[k] ?? shiftForm[k as keyof typeof shiftForm] as string}
                    onChange={e => setShiftForm(prev => ({ ...prev, [k]: e.target.value }))}
                    className="h-9 text-sm"/>
                </div>
              ))}
            </div>

            {/* Net hours preview */}
            <div className="p-3 rounded-lg border flex items-center gap-3" style={{ backgroundColor: "#2B7A7808", borderColor: "#2B7A7830" }}>
              <Clock className="h-4 w-4" style={{ color: "#2B7A78" }}/>
              <div>
                <p className="text-xs text-muted-foreground">Net Scheduled Working Hours</p>
                <p className="text-base font-bold" style={{ color: "#2B7A78" }}>{computedHours} hours / day</p>
              </div>
              <div className="ml-auto text-xs text-muted-foreground">
                {shiftForm.checkIn} → {shiftForm.checkOut} (break deducted)
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[["Late Check-In Grace (min)","10"],["Early Check-Out Tolerance (min)","15"],["Overtime Start After (min)","0"],["Max Daily OT (hrs)","3"],["Max Weekly Hours","48"]].map(([l,d])=>(
                <div key={l} className="space-y-1"><Label className="text-xs">{l}</Label><Input type="number" defaultValue={d} className="h-9 text-sm"/></div>
              ))}
              <div className="space-y-1"><Label className="text-xs">OT Eligibility</Label>
                <Select defaultValue="eligible"><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent><SelectItem value="eligible">Eligible</SelectItem><SelectItem value="not">Not Eligible</SelectItem><SelectItem value="approval">Manager Approval</SelectItem></SelectContent>
                </Select>
              </div>
            </div>

            <Separator/>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Work Days</p>
            <div className="flex gap-2 flex-wrap">
              {DAYS.map((d, i) => {
                const selected = selectedShift ? selectedShift.workDays.includes(d) : i < 5;
                return (
                  <button key={d} className={cn("px-3 py-1.5 rounded-lg border text-xs font-medium transition-all", selected ? "border-[#2B7A78] text-white" : "border-border text-muted-foreground hover:border-[#2B7A7850]")}
                    style={selected ? { backgroundColor: "#2B7A78" } : {}}>
                    {d}
                  </button>
                );
              })}
            </div>

            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-700 flex gap-2">
              <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5"/>
              Early arrival does NOT automatically count as overtime. Overtime is calculated after the scheduled check-out time per the configured policy, subject to manager approval.
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowCreateShift(false)}>Save as Draft</Button>
            <Button style={{ backgroundColor: "#2B7A78" }} className="text-white" onClick={() => setShowCreateShift(false)}>
              <Save className="h-3.5 w-3.5 mr-1"/> Save Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Assign Employees Dialog ──────────────────────────────────────────── */}
      <Dialog open={showAssignShift} onOpenChange={setShowAssignShift}>
        <DialogContent className="sm:max-w-[580px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Shift to Employees</DialogTitle>
            <DialogDescription>Assign or reassign shift templates to one or more employees</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              {[
                {l:"Shift Template", opts:SHIFTS.map(s=>s.name), def:"Morning Shift"},
                {l:"Effective From", type:"date", def:"2026-10-01"},
                {l:"Effective To", type:"date", def:""},
                {l:"Branch", opts:["All Branches",...BRANCHES], def:"All Branches"},
              ].map((f,i)=>(
                <div key={i} className="space-y-1"><Label className="text-xs">{f.l}</Label>
                  {f.opts ? (
                    <Select defaultValue={f.def}><SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                      <SelectContent>{f.opts.map(o=><SelectItem key={o} value={o} className="text-sm">{o}</SelectItem>)}</SelectContent>
                    </Select>
                  ) : <Input type={f.type ?? "text"} defaultValue={f.def} className="h-9 text-sm"/>}
                </div>
              ))}
            </div>
            <Separator/>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Select Employees</p>
            <Input className="h-8 text-xs" placeholder="Search employees..." onChange={e=>setSearchEmp(e.target.value)}/>
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {EMPLOYEES.map(emp => (
                <label key={emp.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 cursor-pointer">
                  <input type="checkbox" className="rounded" defaultChecked={false}/>
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-[9px] font-bold" style={{ backgroundColor: "#2B7A7818", color: "#2B7A78" }}>{emp.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-xs font-medium">{emp.name}</p>
                    <p className="text-[10px] text-muted-foreground">{emp.role} · {emp.branch}</p>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {SHIFTS.find(s=>s.id===emp.shiftId)?.name ?? "Unassigned"}
                  </div>
                </label>
              ))}
            </div>
            <div className="p-2 bg-amber-50 rounded border border-amber-100 text-[10px] text-amber-700 flex gap-1.5">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0"/>
              Any overlapping shifts will be flagged. Existing schedules for the selected date range will be overwritten.
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" className="text-xs" onClick={() => setShowAssignShift(false)}>Cancel</Button>
            <Button style={{ backgroundColor: "#2B7A78" }} className="text-white text-xs" onClick={() => setShowAssignShift(false)}>
              <CheckCircle className="h-3.5 w-3.5 mr-1"/> Assign Shift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
