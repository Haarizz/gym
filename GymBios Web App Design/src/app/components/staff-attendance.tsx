import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Progress } from "./ui/progress";
import { Separator } from "./ui/separator";
import { Label } from "./ui/label";
import {
  Clock, Users, CheckCircle, AlertCircle, Calendar, Filter,
  ChevronRight, Search, Download, Eye, Pencil, Save,
  XCircle, TrendingUp, UserCheck, TimerOff, RefreshCw,
} from "lucide-react";
import { cn } from "./ui/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type AttStatus = "Present" | "Late" | "Early Departure" | "Absent" | "Half Day" |
  "Weekly Off" | "Holiday" | "On Leave" | "Incomplete Punch" | "Overtime";
type ApprovalStatus = "Auto-Approved" | "Pending" | "Approved" | "Rejected";

interface DailyRecord {
  id: string; empId: string; date: string; shift: string;
  scheduledIn: string; actualIn: string;
  scheduledOut: string; actualOut: string;
  breakDuration: number; netHours: number;
  lateMin: number; earlyDepMin: number; otHours: number;
  status: AttStatus; approvalStatus: ApprovalStatus;
}

interface MonthSummary {
  empId: string; scheduledDays: number; present: number; absent: number;
  paidLeave: number; unpaidLeave: number; weeklyOff: number; holidays: number;
  scheduledHours: number; actualHours: number; lateHours: number;
  earlyDepHours: number; regularHours: number; approvedOT: number;
}

// ── Mock Data ─────────────────────────────────────────────────────────────────

const EMPLOYEES = [
  { id: "1", name: "Ahmed Al-Rashid",    initials: "AA", role: "Senior Trainer",   branch: "Downtown Dubai", shift: "Morning (06:00-14:00)" },
  { id: "2", name: "Sara Johnson",       initials: "SJ", role: "Fitness Trainer",  branch: "Marina Branch",  shift: "Afternoon (14:00-22:00)" },
  { id: "3", name: "Mohammed Hassan",    initials: "MH", role: "Receptionist",     branch: "Downtown Dubai", shift: "Admin Flexible (09:00-18:00)" },
  { id: "4", name: "Fatima Al-Zahra",   initials: "FZ", role: "CrossFit Trainer",  branch: "Marina Branch",  shift: "Morning (06:00-14:00)" },
  { id: "5", name: "Khalid Al-Mansoori",initials: "KM", role: "Sales Executive",   branch: "Downtown Dubai", shift: "Admin Flexible (09:00-18:00)" },
  { id: "6", name: "Looka Ibrahim",      initials: "LI", role: "Trainer",           branch: "JLT Branch",     shift: "Evening (16:00-24:00)" },
];

const DAILY_RECORDS: DailyRecord[] = [
  { id:"d1",  empId:"1", date:"2026-10-13", shift:"Morning",   scheduledIn:"06:00", actualIn:"06:08", scheduledOut:"14:00", actualOut:"14:02", breakDuration:30, netHours:7.5, lateMin:0,  earlyDepMin:0, otHours:0,   status:"Present",          approvalStatus:"Auto-Approved" },
  { id:"d2",  empId:"1", date:"2026-10-14", shift:"Morning",   scheduledIn:"06:00", actualIn:"06:22", scheduledOut:"14:00", actualOut:"14:05", breakDuration:30, netHours:7.2, lateMin:22, earlyDepMin:0, otHours:0,   status:"Late",             approvalStatus:"Auto-Approved" },
  { id:"d3",  empId:"1", date:"2026-10-15", shift:"Morning",   scheduledIn:"06:00", actualIn:"06:00", scheduledOut:"14:00", actualOut:"16:00", breakDuration:30, netHours:9.5, lateMin:0,  earlyDepMin:0, otHours:2,   status:"Overtime",         approvalStatus:"Pending" },
  { id:"d4",  empId:"2", date:"2026-10-13", shift:"Afternoon", scheduledIn:"14:00", actualIn:"14:05", scheduledOut:"22:00", actualOut:"21:30", breakDuration:30, netHours:7,   lateMin:5,  earlyDepMin:30,otHours:0,   status:"Early Departure",  approvalStatus:"Pending" },
  { id:"d5",  empId:"2", date:"2026-10-14", shift:"Afternoon", scheduledIn:"14:00", actualIn:"14:00", scheduledOut:"22:00", actualOut:"22:00", breakDuration:30, netHours:7.5, lateMin:0,  earlyDepMin:0, otHours:0,   status:"Present",          approvalStatus:"Auto-Approved" },
  { id:"d6",  empId:"3", date:"2026-10-13", shift:"Admin",     scheduledIn:"09:00", actualIn:"—",     scheduledOut:"18:00", actualOut:"—",     breakDuration:60, netHours:0,   lateMin:0,  earlyDepMin:0, otHours:0,   status:"Absent",           approvalStatus:"Pending" },
  { id:"d7",  empId:"3", date:"2026-10-14", shift:"Admin",     scheduledIn:"09:00", actualIn:"09:15", scheduledOut:"18:00", actualOut:"18:00", breakDuration:60, netHours:8,   lateMin:15, earlyDepMin:0, otHours:0,   status:"Late",             approvalStatus:"Auto-Approved" },
  { id:"d8",  empId:"4", date:"2026-10-13", shift:"Morning",   scheduledIn:"06:00", actualIn:"06:00", scheduledOut:"14:00", actualOut:"14:00", breakDuration:30, netHours:7.5, lateMin:0,  earlyDepMin:0, otHours:0,   status:"Present",          approvalStatus:"Auto-Approved" },
  { id:"d9",  empId:"4", date:"2026-10-14", shift:"Morning",   scheduledIn:"06:00", actualIn:"06:00", scheduledOut:"14:00", actualOut:"14:00", breakDuration:30, netHours:7.5, lateMin:0,  earlyDepMin:0, otHours:0,   status:"Present",          approvalStatus:"Auto-Approved" },
  { id:"d10", empId:"5", date:"2026-10-13", shift:"Admin",     scheduledIn:"09:00", actualIn:"09:00", scheduledOut:"18:00", actualOut:"18:00", breakDuration:60, netHours:8,   lateMin:0,  earlyDepMin:0, otHours:0,   status:"Present",          approvalStatus:"Auto-Approved" },
  { id:"d11", empId:"6", date:"2026-10-13", shift:"Evening",   scheduledIn:"16:00", actualIn:"—",     scheduledOut:"24:00", actualOut:"—",     breakDuration:30, netHours:0,   lateMin:0,  earlyDepMin:0, otHours:0,   status:"Incomplete Punch", approvalStatus:"Pending" },
  { id:"d12", empId:"6", date:"2026-10-14", shift:"Evening",   scheduledIn:"16:00", actualIn:"16:00", scheduledOut:"24:00", actualOut:"24:00", breakDuration:30, netHours:7.5, lateMin:0,  earlyDepMin:0, otHours:0,   status:"Present",          approvalStatus:"Auto-Approved" },
];

const MONTH_SUMMARIES: MonthSummary[] = [
  { empId:"1", scheduledDays:23, present:21, absent:0, paidLeave:2, unpaidLeave:0, weeklyOff:8, holidays:1, scheduledHours:172.5, actualHours:168, lateHours:0.5, earlyDepHours:0, regularHours:165, approvedOT:6 },
  { empId:"2", scheduledDays:25, present:22, absent:1, paidLeave:1, unpaidLeave:1, weeklyOff:5, holidays:1, scheduledHours:187.5, actualHours:163, lateHours:1.2, earlyDepHours:0.5, regularHours:160, approvedOT:0 },
  { empId:"3", scheduledDays:23, present:20, absent:2, paidLeave:1, unpaidLeave:0, weeklyOff:8, holidays:1, scheduledHours:184, actualHours:162, lateHours:2,   earlyDepHours:0, regularHours:160, approvedOT:0 },
  { empId:"4", scheduledDays:23, present:23, absent:0, paidLeave:0, unpaidLeave:0, weeklyOff:8, holidays:1, scheduledHours:172.5, actualHours:174, lateHours:0,   earlyDepHours:0, regularHours:172.5, approvedOT:2 },
  { empId:"5", scheduledDays:23, present:21, absent:0, paidLeave:2, unpaidLeave:0, weeklyOff:8, holidays:1, scheduledHours:184, actualHours:168, lateHours:0,   earlyDepHours:1, regularHours:168, approvedOT:0 },
  { empId:"6", scheduledDays:24, present:20, absent:2, paidLeave:0, unpaidLeave:2, weeklyOff:6, holidays:1, scheduledHours:180, actualHours:150, lateHours:0,   earlyDepHours:0, regularHours:150, approvedOT:0 },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const statusBadge: Record<AttStatus, string> = {
  "Present":          "bg-green-50 text-green-700 border-green-200",
  "Late":             "bg-amber-50 text-amber-700 border-amber-200",
  "Early Departure":  "bg-orange-50 text-orange-700 border-orange-200",
  "Absent":           "bg-red-50 text-red-600 border-red-200",
  "Half Day":         "bg-yellow-50 text-yellow-700 border-yellow-200",
  "Weekly Off":       "bg-gray-50 text-gray-500 border-gray-200",
  "Holiday":          "bg-blue-50 text-blue-700 border-blue-200",
  "On Leave":         "bg-purple-50 text-purple-700 border-purple-200",
  "Incomplete Punch": "bg-rose-50 text-rose-700 border-rose-200",
  "Overtime":         "bg-teal-50 text-teal-700 border-teal-200",
};

const approvalBadge: Record<ApprovalStatus, string> = {
  "Auto-Approved": "bg-green-50 text-green-700 border-green-200",
  "Pending":       "bg-amber-50 text-amber-700 border-amber-200",
  "Approved":      "bg-teal-50 text-teal-700 border-teal-200",
  "Rejected":      "bg-red-50 text-red-600 border-red-200",
};

interface StaffAttendanceProps { onNavigate?: (section: string) => void; }

// ═════════════════════════════════════════════════════════════════════════════
export function StaffAttendance({ onNavigate }: StaffAttendanceProps) {
  const [tab, setTab] = useState("daily");
  const [dateFilter, setDateFilter] = useState("2026-10-14");
  const [empFilter, setEmpFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<DailyRecord | null>(null);
  const [showCorrectionDialog, setShowCorrectionDialog] = useState(false);
  const [records, setRecords] = useState<DailyRecord[]>(DAILY_RECORDS);

  const kpis = useMemo(() => {
    const today = records.filter(r => r.date === dateFilter);
    return {
      present:   today.filter(r => r.status === "Present" || r.status === "Overtime").length,
      late:      today.filter(r => r.status === "Late").length,
      absent:    today.filter(r => r.status === "Absent").length,
      incomplete:today.filter(r => r.status === "Incomplete Punch").length,
      pending:   today.filter(r => r.approvalStatus === "Pending").length,
      ot:        today.reduce((s,r)=>s+r.otHours,0),
    };
  }, [records, dateFilter]);

  const filteredRecords = useMemo(() => records.filter(r => {
    if (empFilter !== "all" && r.empId !== empFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  }), [records, empFilter, statusFilter]);

  const updateRecord = (id: string, patch: Partial<DailyRecord>) =>
    setRecords(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));

  return (
    <div className="p-6 space-y-5 bg-background min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>Payroll & Employees</span><ChevronRight className="h-3 w-3"/>
        <span className="text-foreground font-medium">Staff Attendance</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#2B7A7818" }}>
            <UserCheck className="h-5 w-5" style={{ color: "#2B7A78" }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Staff Attendance</h1>
            <p className="text-sm text-muted-foreground">Shift-generated attendance · Corrections · Monthly summary · Payroll feed</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="text-xs h-8"><Download className="h-3.5 w-3.5 mr-1"/>Export</Button>
          <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => setShowCorrectionDialog(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1"/>Manual Entry
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label:"Present",         value: kpis.present,   color: "#10b981", icon: <CheckCircle className="h-4 w-4"/> },
          { label:"Late",            value: kpis.late,      color: "#f59e0b", icon: <Clock className="h-4 w-4"/> },
          { label:"Absent",          value: kpis.absent,    color: "#ef4444", icon: <XCircle className="h-4 w-4"/> },
          { label:"Incomplete Punch",value: kpis.incomplete,color: "#f97316", icon: <TimerOff className="h-4 w-4"/> },
          { label:"Pending Approval",value: kpis.pending,   color: "#8b5cf6", icon: <RefreshCw className="h-4 w-4"/> },
          { label:"OT Hours (Today)",value: `${kpis.ot}h`,  color: "#2B7A78", icon: <TrendingUp className="h-4 w-4"/> },
        ].map((k,i)=>(
          <Card key={i} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{backgroundColor:`${k.color}18`,color:k.color}}>{k.icon}</div>
              <div><p className="text-lg font-bold leading-tight">{k.value}</p><p className="text-[10px] text-muted-foreground">{k.label}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <Card className="border-border/50">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Filter className="h-3.5 w-3.5 text-muted-foreground"/>
            <Input type="date" value={dateFilter} onChange={e=>setDateFilter(e.target.value)} className="h-7 text-xs w-36"/>
            <Select value={empFilter} onValueChange={setEmpFilter}>
              <SelectTrigger className="h-7 text-xs w-40"><SelectValue/></SelectTrigger>
              <SelectContent><SelectItem value="all" className="text-xs">All Employees</SelectItem>{EMPLOYEES.map(e=><SelectItem key={e.id} value={e.id} className="text-xs">{e.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-7 text-xs w-40"><SelectValue/></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
                {["Present","Late","Early Departure","Absent","Half Day","Incomplete Punch","Overtime","On Leave"].map(s=>(
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground"
              onClick={() => { setEmpFilter("all"); setStatusFilter("all"); }}>
              <RefreshCw className="h-3 w-3 mr-1"/>Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 w-auto">
          <TabsTrigger value="daily" className="text-xs">Daily Records</TabsTrigger>
          <TabsTrigger value="monthly" className="text-xs">Monthly Summary</TabsTrigger>
        </TabsList>

        {/* ─ Daily Records ─────────────────────────────────────────────────── */}
        <TabsContent value="daily" className="mt-4">
          <Card className="border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4">Employee</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Shift</TableHead>
                    <TableHead className="text-xs">Sched. In</TableHead>
                    <TableHead className="text-xs">Actual In</TableHead>
                    <TableHead className="text-xs">Sched. Out</TableHead>
                    <TableHead className="text-xs">Actual Out</TableHead>
                    <TableHead className="text-xs text-right">Net Hrs</TableHead>
                    <TableHead className="text-xs text-right">Late</TableHead>
                    <TableHead className="text-xs text-right">OT</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Approval</TableHead>
                    <TableHead className="text-xs text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map(rec => {
                    const emp = EMPLOYEES.find(e=>e.id===rec.empId)!;
                    return (
                      <TableRow key={rec.id} className="cursor-pointer hover:bg-muted/20" onClick={() => setSelectedRecord(rec)}>
                        <TableCell className="pl-4">
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[9px] font-bold" style={{backgroundColor:"#2B7A7815",color:"#2B7A78"}}>{emp?.initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-xs font-medium leading-tight">{emp?.name}</p>
                              <p className="text-[9px] text-muted-foreground">{emp?.role}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{rec.date}</TableCell>
                        <TableCell className="text-xs">{rec.shift}</TableCell>
                        <TableCell className="text-xs">{rec.scheduledIn}</TableCell>
                        <TableCell className={cn("text-xs font-medium", rec.actualIn==="—"?"text-red-500":rec.lateMin>0?"text-amber-600":"text-green-700")}>{rec.actualIn}</TableCell>
                        <TableCell className="text-xs">{rec.scheduledOut}</TableCell>
                        <TableCell className={cn("text-xs font-medium", rec.actualOut==="—"?"text-red-500":"")}>{rec.actualOut}</TableCell>
                        <TableCell className="text-right text-xs font-medium">{rec.netHours > 0 ? `${rec.netHours}h` : "—"}</TableCell>
                        <TableCell className={cn("text-right text-xs", rec.lateMin>0?"text-amber-600":"")}>{rec.lateMin>0?`${rec.lateMin}m`:"—"}</TableCell>
                        <TableCell className={cn("text-right text-xs font-medium", rec.otHours>0?"text-teal-600":"")}>{rec.otHours>0?`${rec.otHours}h`:"—"}</TableCell>
                        <TableCell><Badge className={cn("text-[9px] border", statusBadge[rec.status])}>{rec.status}</Badge></TableCell>
                        <TableCell><Badge className={cn("text-[9px] border", approvalBadge[rec.approvalStatus])}>{rec.approvalStatus}</Badge></TableCell>
                        <TableCell className="text-center" onClick={e=>e.stopPropagation()}>
                          <div className="flex justify-center gap-0.5">
                            {rec.approvalStatus === "Pending" && (
                              <>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={()=>updateRecord(rec.id,{approvalStatus:"Approved"})}><CheckCircle className="h-3 w-3"/></Button>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500" onClick={()=>updateRecord(rec.id,{approvalStatus:"Rejected"})}><XCircle className="h-3 w-3"/></Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground" onClick={()=>{setSelectedRecord(rec);setShowCorrectionDialog(true);}}><Pencil className="h-3 w-3"/></Button>
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

        {/* ─ Monthly Summary ─────────────────────────────────────────────── */}
        <TabsContent value="monthly" className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">October 2026 — Monthly Attendance Summary</h3>
            <Badge className="bg-teal-50 text-teal-700 border border-teal-200 text-[10px]">Ready for Payroll Export</Badge>
          </div>
          <Card className="border-border/50">
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-xs pl-4 sticky left-0 bg-muted/30">Employee</TableHead>
                    <TableHead className="text-xs text-center">Sched. Days</TableHead>
                    <TableHead className="text-xs text-center">Present</TableHead>
                    <TableHead className="text-xs text-center">Absent</TableHead>
                    <TableHead className="text-xs text-center">Paid Leave</TableHead>
                    <TableHead className="text-xs text-center">Unpaid</TableHead>
                    <TableHead className="text-xs text-center">Weekly Off</TableHead>
                    <TableHead className="text-xs text-center">Holiday</TableHead>
                    <TableHead className="text-xs text-right">Sched. Hrs</TableHead>
                    <TableHead className="text-xs text-right">Actual Hrs</TableHead>
                    <TableHead className="text-xs text-right">Late Hrs</TableHead>
                    <TableHead className="text-xs text-right">Regular Hrs</TableHead>
                    <TableHead className="text-xs text-right">Appr. OT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MONTH_SUMMARIES.map(m => {
                    const emp = EMPLOYEES.find(e=>e.id===m.empId)!;
                    const attRate = Math.round((m.present / m.scheduledDays)*100);
                    return (
                      <TableRow key={m.empId} className="hover:bg-muted/20 cursor-pointer">
                        <TableCell className="pl-4 sticky left-0 bg-background">
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-[10px] font-bold" style={{backgroundColor:"#2B7A7818",color:"#2B7A78"}}>{emp?.initials}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{emp?.name}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
                                  <div className="h-full rounded-full" style={{width:`${attRate}%`,backgroundColor: attRate>=95?"#10b981":attRate>=80?"#f59e0b":"#ef4444"}}/>
                                </div>
                                <span className="text-[9px] text-muted-foreground">{attRate}%</span>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center text-xs">{m.scheduledDays}</TableCell>
                        <TableCell className="text-center text-xs font-medium text-green-700">{m.present}</TableCell>
                        <TableCell className="text-center text-xs text-red-500">{m.absent > 0 ? m.absent : "—"}</TableCell>
                        <TableCell className="text-center text-xs">{m.paidLeave > 0 ? m.paidLeave : "—"}</TableCell>
                        <TableCell className="text-center text-xs text-red-500">{m.unpaidLeave > 0 ? m.unpaidLeave : "—"}</TableCell>
                        <TableCell className="text-center text-xs text-muted-foreground">{m.weeklyOff}</TableCell>
                        <TableCell className="text-center text-xs text-blue-600">{m.holidays}</TableCell>
                        <TableCell className="text-right text-xs">{m.scheduledHours}h</TableCell>
                        <TableCell className="text-right text-xs font-medium">{m.actualHours}h</TableCell>
                        <TableCell className={cn("text-right text-xs", m.lateHours>0?"text-amber-600":"")}>{m.lateHours > 0 ? `${m.lateHours}h` : "—"}</TableCell>
                        <TableCell className="text-right text-xs">{m.regularHours}h</TableCell>
                        <TableCell className={cn("text-right text-xs font-semibold", m.approvedOT>0?"text-teal-700":"")}>{m.approvedOT > 0 ? `${m.approvedOT}h` : "—"}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="mt-3 p-3 rounded-lg bg-[#2B7A7808] border border-[#2B7A7820] text-xs flex gap-2 items-start">
            <AlertCircle className="h-3.5 w-3.5 text-[#2B7A78] mt-0.5 flex-shrink-0"/>
            <span style={{color:"#2B7A78"}}>Monthly summary feeds into Create Payroll. Approved overtime hours and actual working hours are used for salary calculation. Unapproved OT is excluded from payable earnings.</span>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─ Record Detail Dialog ─────────────────────────────────────────────── */}
      {selectedRecord && !showCorrectionDialog && (
        <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
          <DialogContent className="sm:max-w-[520px]">
            <DialogHeader>
              <DialogTitle>Attendance Record Detail</DialogTitle>
              <DialogDescription>{EMPLOYEES.find(e=>e.id===selectedRecord.empId)?.name} · {selectedRecord.date}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Shift", selectedRecord.shift],
                  ["Date", selectedRecord.date],
                  ["Scheduled In", selectedRecord.scheduledIn],
                  ["Actual In", selectedRecord.actualIn],
                  ["Scheduled Out", selectedRecord.scheduledOut],
                  ["Actual Out", selectedRecord.actualOut],
                  ["Break Duration", `${selectedRecord.breakDuration} min`],
                  ["Net Hours", `${selectedRecord.netHours}h`],
                  ["Late (min)", selectedRecord.lateMin > 0 ? `${selectedRecord.lateMin} min` : "—"],
                  ["Early Departure", selectedRecord.earlyDepMin > 0 ? `${selectedRecord.earlyDepMin} min` : "—"],
                  ["Overtime", selectedRecord.otHours > 0 ? `${selectedRecord.otHours}h` : "—"],
                ].map(([l,v])=>(
                  <div key={l} className="p-2 rounded-lg bg-muted/20 border border-border/40">
                    <p className="text-[10px] text-muted-foreground">{l}</p>
                    <p className="text-sm font-medium">{v}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border">
                <span className="text-xs font-medium">Status</span>
                <Badge className={cn("text-xs border", statusBadge[selectedRecord.status])}>{selectedRecord.status}</Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/20 border">
                <span className="text-xs font-medium">Approval</span>
                <Badge className={cn("text-xs border", approvalBadge[selectedRecord.approvalStatus])}>{selectedRecord.approvalStatus}</Badge>
              </div>
            </div>
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setSelectedRecord(null)}>Close</Button>
              <Button variant="outline" onClick={() => { setShowCorrectionDialog(true); }}>
                <Pencil className="h-3.5 w-3.5 mr-1"/>Correct Record
              </Button>
              {selectedRecord.approvalStatus === "Pending" && (
                <Button style={{backgroundColor:"#2B7A78"}} className="text-white"
                  onClick={() => { updateRecord(selectedRecord.id, {approvalStatus:"Approved"}); setSelectedRecord(null); }}>
                  <CheckCircle className="h-3.5 w-3.5 mr-1"/>Approve
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ─ Correction Dialog ────────────────────────────────────────────────── */}
      <Dialog open={showCorrectionDialog} onOpenChange={v => { setShowCorrectionDialog(v); if (!v) setSelectedRecord(null); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Attendance Correction</DialogTitle>
            <DialogDescription>Enter corrected check-in/check-out times. Changes require manager approval.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><Label className="text-xs">Employee</Label>
                <Select defaultValue={selectedRecord?.empId ?? "1"}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue/></SelectTrigger>
                  <SelectContent>{EMPLOYEES.map(e=><SelectItem key={e.id} value={e.id} className="text-sm">{e.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Date</Label>
                <Input type="date" defaultValue={selectedRecord?.date ?? dateFilter} className="h-9 text-sm"/>
              </div>
              <div className="space-y-1"><Label className="text-xs">Corrected Check-In</Label>
                <Input type="time" defaultValue={selectedRecord?.actualIn ?? ""} className="h-9 text-sm"/>
              </div>
              <div className="space-y-1"><Label className="text-xs">Corrected Check-Out</Label>
                <Input type="time" defaultValue={selectedRecord?.actualOut ?? ""} className="h-9 text-sm"/>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Reason for Correction</Label>
              <Input placeholder="e.g. System error, missed punch, field visit..." className="h-9 text-sm"/>
            </div>
            <div className="p-2 bg-amber-50 rounded border border-amber-100 text-[10px] text-amber-700">
              Correction will be submitted for manager approval. The attendance record will remain as-is until approved.
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setShowCorrectionDialog(false); setSelectedRecord(null); }}>Cancel</Button>
            <Button style={{backgroundColor:"#2B7A78"}} className="text-white" onClick={() => { setShowCorrectionDialog(false); setSelectedRecord(null); }}>
              <Save className="h-3.5 w-3.5 mr-1"/>Submit Correction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
