import React, { useState, useMemo, useEffect } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import { staffService, StaffTarget } from '../utils/supabase/staff-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Separator } from "../components/ui/separator";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  Target,
  Users,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar as CalendarIcon,
  Filter,
  RefreshCw,
  Download,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  Eye,
  Bell,
  Activity,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Star,
  Gauge,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Crown,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Trophy,
  Flame,
  ArrowUp,
  ArrowDown
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart
} from "recharts";
import { cn } from "../components/ui/utils";
import { format } from "date-fns";

const COLORS = {
  primary: "#0047AB",
  secondary: "#009688", 
  success: "#4CAF50",
  warning: "#FFC107",
  error: "#F44336",
  muted: "#9E9E9E"
};

interface TargetsOverviewProps {
  onNavigate: (section: string) => void;
}

export function TargetsOverview({ onNavigate }: TargetsOverviewProps) {
  const { currencyCode } = useCurrency();
  const [dateFilter, setDateFilter] = useState("month");
  const [customDate, setCustomDate] = useState<Date | undefined>(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState("all");
  const [selectedRole, setSelectedRole] = useState("all");
  const [viewMode, setViewMode] = useState<"revenue" | "units">("revenue");
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [activeAlert, setActiveAlert] = useState(true);
  const [targets, setTargets] = useState<StaffTarget[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const now = new Date();
    loadTargets(now.getFullYear(), now.getMonth() + 1);
  }, []);

  const loadTargets = async (year: number, month: number) => {
    setIsLoading(true);
    try {
      const data = await staffService.getTargets(year, month);
      setTargets(data);
    } catch (e) { console.error('Failed to load targets', e); }
    finally { setIsLoading(false); }
  };

  const individualTargets = targets.filter(t => t.scope === 'individual');
  const institutionTargetData = targets.find(t => t.scope === 'institution');

  const instTarget = {
    monthly: institutionTargetData?.revenue_target || 0,
    achieved: institutionTargetData?.revenue_achieved || 0,
    percentage: institutionTargetData?.percentage || 0,
    remaining: Math.max(0, (institutionTargetData?.revenue_target || 0) - (institutionTargetData?.revenue_achieved || 0)),
    daysLeft: 0,
    dailyRequired: 0
  };

  // Compute department performance from individual targets
  const departmentPerformance = useMemo(() => {
    const deptMap: Record<string, {department: string; target: number; achieved: number; staff: number}> = {};
    individualTargets.forEach(t => {
      const dept = t.staff_department || 'Unknown';
      if (!deptMap[dept]) deptMap[dept] = { department: dept, target: 0, achieved: 0, staff: 0 };
      deptMap[dept].target += t.revenue_target || 0;
      deptMap[dept].achieved += t.revenue_achieved || 0;
      deptMap[dept].staff += 1;
    });
    return Object.values(deptMap);
  }, [individualTargets]);

  // Trend data is not available week-by-week from the API; use empty array
  const trendData: Array<{date: string; target: number; actual: number; forecast: number}> = [];

  const toggleRowExpansion = (staffId: string) => {
    setExpandedRows(prev =>
      prev.includes(staffId)
        ? prev.filter(id => id !== staffId)
        : [...prev, staffId]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "excellent": return "bg-green-100 text-green-800";
      case "good": return "bg-blue-100 text-blue-800";
      case "on-track": return "bg-yellow-100 text-yellow-800";
      case "behind": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "excellent": return <Crown className="h-4 w-4" />;
      case "good": return <ThumbsUp className="h-4 w-4" />;
      case "on-track": return <Clock className="h-4 w-4" />;
      case "behind": return <AlertTriangle className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 85) return "bg-green-500";
    if (percentage >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const filteredStaffData = useMemo(() => {
    const filtered = individualTargets.filter(t => {
      const matchesDepartment = selectedDepartment === "all" || t.staff_department === selectedDepartment;
      const matchesRole = selectedRole === "all" || (t.staff_role || '').toLowerCase().includes(selectedRole.toLowerCase());
      return matchesDepartment && matchesRole;
    });
    // Deduplicate by staff_db_id — keep the one with the highest revenue_target
    const seen = new Map<number, typeof filtered[0]>();
    filtered.forEach(t => {
      const existing = seen.get(t.staff_db_id);
      if (!existing || (t.revenue_target || 0) > (existing.revenue_target || 0)) {
        seen.set(t.staff_db_id, t);
      }
    });
    return Array.from(seen.values());
  }, [individualTargets, selectedDepartment, selectedRole]);

  const totalCommission = filteredStaffData.reduce((sum, t) => sum + (t.commission_earned || 0), 0);
  const totalRevenue = filteredStaffData.reduce((sum, t) => sum + (t.revenue_achieved || 0), 0);
  const commissionROI = totalRevenue > 0 ? ((totalRevenue - totalCommission) / totalRevenue * 100) : 0;

  // Alerts derived from real target data — staff behind pace or already exceeding targets
  const alerts = useMemo(() => {
    const now = new Date();
    const generated: Array<{ type: string; title: string; message: string; priority: string; staffName?: string }> = [];

    filteredStaffData.forEach(t => {
      const pct = t.percentage || 0;
      let daysLeft = 0;
      if (t.end_date) {
        daysLeft = Math.max(0, Math.ceil((new Date(t.end_date).getTime() - now.getTime()) / 86400000));
      } else if (t.timeframe === "monthly" && t.year && t.month) {
        daysLeft = Math.max(0, Math.ceil((new Date(t.year, t.month, 0).getTime() - now.getTime()) / 86400000));
      }

      if (pct >= 100) {
        generated.push({
          type: "success",
          title: `${t.staff_name} exceeded target`,
          message: `${t.staff_name} has reached ${pct.toFixed(0)}% of their target.`,
          priority: "low",
          staffName: t.staff_name
        });
      } else if (pct < 70 && daysLeft > 0 && daysLeft <= 7) {
        generated.push({
          type: "error",
          title: `${t.staff_name} needs attention`,
          message: `${t.staff_name} is at ${pct.toFixed(0)}% of target with ${daysLeft} days left. Intervention recommended.`,
          priority: "urgent",
          staffName: t.staff_name
        });
      } else if (pct < 70) {
        generated.push({
          type: "warning",
          title: `${t.staff_name} is behind`,
          message: `${t.staff_name} is at ${pct.toFixed(0)}% progress vs target.`,
          priority: "medium",
          staffName: t.staff_name
        });
      }
    });

    if (instTarget.percentage > 0) {
      generated.push({
        type: "info",
        title: "Institution progress",
        message: `Institution is currently at ${instTarget.percentage.toFixed(0)}% of its monthly target.`,
        priority: "medium"
      });
    }

    return generated;
  }, [filteredStaffData, instTarget.percentage]);

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="space-y-4">
        {/* Title Section */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Gauge className="h-6 w-6 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Targets Overview</h1>
            </div>
            <p className="text-muted-foreground">
              Comprehensive dashboard for managing staff targets, performance tracking, and commission analytics
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[140px]">
                <CalendarIcon className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button variant="outline" onClick={() => onNavigate("staffs-trainers")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Staff
            </Button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Staff</p>
                <p className="text-2xl font-bold text-foreground">{new Set(individualTargets.map(t => t.staff_db_id)).size}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Commission</p>
                <p className="text-2xl font-bold text-foreground"><CurrencyGlyph /> {totalCommission.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Commission ROI</p>
                <p className="text-2xl font-bold text-foreground">{commissionROI.toFixed(1)}%</p>
              </div>
              <div className="p-3 rounded-full bg-primary/10">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Institution Target Summary */}
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground flex items-center">
            <Target className="h-6 w-6 mr-3 text-primary" />
            Institution Target Summary
          </CardTitle>
          <CardDescription>Monthly performance overview with progress tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Progress Ring */}
            <div className="flex justify-center">
              <div className="relative w-48 h-48">
                <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#E5E7EB"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke={instTarget.percentage >= 85 ? COLORS.success : 
                           instTarget.percentage >= 70 ? COLORS.warning : COLORS.error}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${instTarget.percentage * 2.51} 251`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">
                    {instTarget.percentage.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground">Complete</span>
                </div>
              </div>
            </div>

            {/* Target Details */}
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Monthly Target</span>
                  <span className="font-bold text-foreground">
                    <CurrencyGlyph /> {instTarget.monthly.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Achieved</span>
                  <span className="font-bold text-primary">
                    <CurrencyGlyph /> {instTarget.achieved.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Remaining</span>
                  <span className="font-bold text-error">
                    <CurrencyGlyph /> {instTarget.remaining.toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Days Left</span>
                  <Badge variant="outline">{instTarget.daysLeft} days</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Daily Required</span>
                  <span className="font-medium text-warning">
                    <CurrencyGlyph /> {instTarget.dailyRequired.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* Filters Section */}
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>

            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {[...new Set(individualTargets.map(t => t.staff_department).filter(Boolean))].map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="trainer">Trainers</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="reception">Reception</SelectItem>
                <SelectItem value="management">Management</SelectItem>
              </SelectContent>
            </Select>

            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as "revenue" | "units")}>
              <TabsList>
                <TabsTrigger value="revenue">Revenue View</TabsTrigger>
                <TabsTrigger value="units">Units View</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Staff Performance Leaderboard */}
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground flex items-center">
            <Trophy className="h-6 w-6 mr-3 text-primary" />
            Staff Performance Leaderboard
          </CardTitle>
          <CardDescription>Detailed performance tracking with expandable unit breakdowns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table className="[&_tr]:border-0">
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent border-0">
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Target ({currencyCode})</TableHead>
                  <TableHead>Achieved ({currencyCode})</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Commission</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Forecast</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Loading targets...
                    </TableCell>
                  </TableRow>
                ) : filteredStaffData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No targets set for this period.
                    </TableCell>
                  </TableRow>
                ) : filteredStaffData.map((t) => {
                  const pct = t.percentage || 0;
                  const forecast = t.forecast || 0;
                  const achieved = t.revenue_achieved || 0;
                  const commission = t.commission_earned || 0;
                  const staffROI = achieved > 0 ? ((achieved - commission) / achieved * 100) : 0;
                  let unitTargets: Array<{service: string; target_units: number; achieved_units: number}> = [];
                  try { unitTargets = JSON.parse(t.unit_targets_json || '[]'); } catch {}

                  return (
                    <React.Fragment key={t.id}>
                      <TableRow className="hover:bg-slate-50/50 transition-colors border-0">
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleRowExpansion(t.id)}
                          >
                            {expandedRows.includes(t.id) ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-medium text-primary">
                                {(t.staff_name || '?').split(' ').map((n: string) => n[0]).join('')}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{t.staff_name}</p>
                              <p className="text-xs text-muted-foreground">{t.timeframe}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{t.staff_role}</p>
                            <p className="text-xs text-muted-foreground">{t.staff_department}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium"><CurrencyGlyph /> {(t.revenue_target || 0).toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium"><CurrencyGlyph /> {achieved.toLocaleString()}</span>
                            {t.trend === "up" ? (
                              <ArrowUp className="h-4 w-4 text-success" />
                            ) : (
                              <ArrowDown className="h-4 w-4 text-error" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">{pct.toFixed(1)}%</span>
                              <span className="text-xs text-muted-foreground">
                                <BarChart3 className="h-3 w-3 mr-1 inline" />
                                {pct >= 85 ? "Excellent" : pct >= 70 ? "Good" : "Needs Attention"}
                              </span>
                            </div>
                            <Progress
                              value={pct}
                              className="h-2"
                              style={{ '--progress-background': getProgressColor(pct) } as React.CSSProperties}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-foreground">
                            <CurrencyGlyph /> {commission.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("text-xs", getStatusColor(pct >= 85 ? "excellent" : pct >= 70 ? "good" : pct >= 50 ? "on-track" : "behind"))}>
                            <span className="flex items-center space-x-1">
                              {getStatusIcon(pct >= 85 ? "excellent" : pct >= 70 ? "good" : pct >= 50 ? "on-track" : "behind")}
                              <span className="capitalize">{pct >= 85 ? "Excellent" : pct >= 70 ? "Good" : pct >= 50 ? "On Track" : "Behind"}</span>
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium">{forecast.toFixed(0)}%</span>
                            <Badge variant={forecast >= 95 ? "default" : "secondary"} className="text-xs">
                              {forecast >= 95 ? (
                                <><Target className="h-3 w-3 mr-1 inline" />Target</>
                              ) : (
                                <><TrendingUp className="h-3 w-3 mr-1 inline" />Forecast</>
                              )}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Award className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* Expandable Row Details */}
                      {expandedRows.includes(t.id) && (
                        <TableRow className="border-0">
                          <TableCell colSpan={10} className="bg-muted/20">
                            <div className="p-4 space-y-4">
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Unit Targets Breakdown */}
                                <div className="space-y-3">
                                  <h4 className="font-medium text-foreground flex items-center">
                                    <Target className="h-4 w-4 mr-2 text-primary" />
                                    Unit Targets
                                  </h4>
                                  {unitTargets.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No unit targets set</p>
                                  ) : unitTargets.map((unit, index) => {
                                    const unitPct = unit.target_units > 0 ? Math.round((unit.achieved_units / unit.target_units) * 100) : 0;
                                    return (
                                      <div key={index} className="p-3 rounded-lg border border-primary/10 shadow-md hover:shadow-lg transition-shadow">
                                        <div className="flex justify-between items-center mb-2">
                                          <span className="text-sm font-medium">{unit.service}</span>
                                          <span className="text-sm text-muted-foreground">
                                            {unit.achieved_units}/{unit.target_units}
                                          </span>
                                        </div>
                                        <Progress value={unitPct} className="h-1" />
                                        <div className="text-xs text-muted-foreground mt-1">
                                          {unitPct}% complete
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                {/* Performance Insights */}
                                <div className="space-y-3 lg:col-span-2">
                                  <h4 className="font-medium text-foreground flex items-center">
                                    <Activity className="h-4 w-4 mr-2 text-success" />
                                    Performance Insights
                                  </h4>
                                  <div className="space-y-2">
                                    <div className="p-2 rounded bg-primary/5 text-xs">
                                      <strong>Trend:</strong>{" "}
                                      {t.trend === "up" ? (
                                        <><TrendingUp className="h-3 w-3 mr-1 inline" />Improving</>
                                      ) : t.trend === "down" ? (
                                        <><TrendingDown className="h-3 w-3 mr-1 inline" />Declining</>
                                      ) : (
                                        <>Stable</>
                                      )}
                                    </div>
                                    <div className="p-2 rounded bg-secondary/5 text-xs">
                                      <strong>Forecast:</strong> Expected to reach {forecast.toFixed(0)}% by month-end
                                    </div>
                                    <div className="p-2 rounded bg-success/5 text-xs">
                                      <strong>Commission Rate:</strong> {achieved > 0 ? ((commission / achieved) * 100).toFixed(1) : '0.0'}% of sales
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Analytics & Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend & Forecast */}
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground flex items-center">
              <LineChart className="h-5 w-5 mr-2 text-primary" />
              Revenue vs Targets Trend
            </CardTitle>
            <CardDescription>Weekly progress with predictive forecasting</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsLineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  formatter={(value: number) => [`${currencyCode} ${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="target" 
                  stroke={COLORS.muted} 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Target" 
                />
                <Line 
                  type="monotone" 
                  dataKey="actual" 
                  stroke={COLORS.primary} 
                  strokeWidth={3}
                  name="Actual" 
                />
                <Line 
                  type="monotone" 
                  dataKey="forecast" 
                  stroke={COLORS.secondary} 
                  strokeWidth={2}
                  strokeDasharray="3 3"
                  name="Forecast" 
                />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Performance */}
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-secondary" />
              Department Performance
            </CardTitle>
            <CardDescription>Performance comparison across departments</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsBarChart data={departmentPerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="department" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  formatter={(value: number) => [`${currencyCode} ${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Bar dataKey="target" fill={COLORS.muted} name="Target" />
                <Bar dataKey="achieved" fill={COLORS.primary} name="Achieved" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Commission & ROI Analysis */}
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground flex items-center">
            <Calculator className="h-6 w-6 mr-3 text-primary" />
            Commission & Incentives Tracking
          </CardTitle>
          <CardDescription>Financial analysis of commission costs vs revenue generation</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Revenue Generated</p>
                    <p className="text-2xl font-bold text-foreground"><CurrencyGlyph /> {totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <DollarSign className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Commission Payable</p>
                    <p className="text-2xl font-bold text-foreground"><CurrencyGlyph /> {totalCommission.toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-full bg-orange-50">
                    <Wallet className="h-6 w-6 text-orange-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Net Revenue</p>
                    <p className="text-2xl font-bold text-foreground"><CurrencyGlyph /> {(totalRevenue - totalCommission).toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-full bg-green-50">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Commission ROI</p>
                    <p className="text-2xl font-bold text-foreground">{commissionROI.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 rounded-full bg-primary/10">
                    <Calculator className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-foreground">ROI per Staff Member</h4>
            {filteredStaffData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available</p>
            ) : filteredStaffData.map((t) => {
              const rev = t.revenue_achieved || 0;
              const comm = t.commission_earned || 0;
              const staffROI = rev > 0 ? ((rev - comm) / rev * 100) : 0;
              return (
                <div key={t.id} className="flex justify-between items-center p-3 rounded-lg border border-primary/10 shadow-md hover:shadow-lg transition-shadow">
                  <span className="text-sm font-medium">{t.staff_name}</span>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{staffROI.toFixed(1)}%</span>
                    <Badge variant={staffROI >= 90 ? "default" : "secondary"} className="text-xs">
                      {staffROI >= 90 ? "Excellent" : "Good"}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Additional Alerts & Notifications */}
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground flex items-center">
            <Bell className="h-6 w-6 mr-3 text-primary" />
            Alerts & Notifications
          </CardTitle>
          <CardDescription>Proactive insights and recommended actions</CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No alerts right now — everyone's tracking fine.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {alerts.map((alert, index) => (
                <div key={index} className={cn(
                  "p-4 rounded-lg border",
                  alert.type === "error" && "bg-red-50 border-red-200",
                  alert.type === "warning" && "bg-yellow-50 border-yellow-200",
                  alert.type === "success" && "bg-green-50 border-green-200",
                  alert.type === "info" && "bg-blue-50 border-blue-200"
                )}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {alert.type === "error" && <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />}
                      {alert.type === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />}
                      {alert.type === "success" && <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />}
                      {alert.type === "info" && <Zap className="h-5 w-5 text-blue-600 mt-0.5" />}
                      <div>
                        <h4 className="font-medium text-foreground">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      alert.priority === "urgent" && "border-red-300 text-red-700",
                      alert.priority === "high" && "border-yellow-300 text-yellow-700",
                      alert.priority === "medium" && "border-blue-300 text-blue-700",
                      alert.priority === "low" && "border-green-300 text-green-700"
                    )}>
                      {alert.priority}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

