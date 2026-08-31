import React, { useState, useEffect, useMemo } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import { staffService, Staff, StaffTarget } from "../utils/supabase/staff-service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Target,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Trophy,
  Flame,
  CheckCircle,
  Clock,
  Zap,
  Activity,
  ArrowUp,
  Crown,
  ThumbsUp,
  Sparkles,
  RefreshCw,
  BarChart3,
  LineChart,
  Info
} from "lucide-react";
import { cn } from "../components/ui/utils";

const COLORS = {
  primary: "#0047AB",
  secondary: "#009688",
  success: "#4CAF50",
  warning: "#FFC107",
  error: "#F44336",
  muted: "#9E9E9E"
};

interface UnitTargetEntry {
  service: string;
  target_units: number;
  achieved_units: number;
}

function parseUnitTargets(json: string | undefined): UnitTargetEntry[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function periodLabel(t: StaffTarget): string {
  if (t.timeframe === "monthly" && t.year && t.month) return `${MONTH_NAMES[t.month - 1]} ${t.year}`;
  if (t.timeframe === "yearly" && t.year) return String(t.year);
  if (t.start_date && t.end_date) return `${t.start_date} – ${t.end_date}`;
  return t.year ? String(t.year) : "Current period";
}

export function MyTargets() {
  const { currencyCode } = useCurrency();
  const panelCardShell = "bg-white border-0 shadow-sm";
  const statCardShell =
    "bg-white border-0 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none";
  const tabContentShell = "space-y-6 animate-in fade-in-0 zoom-in-95 duration-200";

  const [staffProfile, setStaffProfile] = useState<Staff | null>(null);
  const [myTargets, setMyTargets] = useState<StaffTarget[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const profile = await staffService.getMyProfile();
      setStaffProfile(profile);
      if (profile?.id) {
        const targets = await staffService.getTargets(undefined, undefined, undefined, Number(profile.id));
        setMyTargets(targets);
      } else {
        setMyTargets([]);
      }
    } catch (error) {
      console.error("Failed to load my targets:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Active target = current month/year target, falling back to the most recent one
  const activeTarget = useMemo(() => {
    if (myTargets.length === 0) return null;
    const now = new Date();
    const current = myTargets.find(
      t => t.timeframe === "monthly" && t.year === now.getFullYear() && t.month === now.getMonth() + 1
    );
    if (current) return current;
    return [...myTargets].sort((a, b) => (b.year - a.year) || ((b.month || 0) - (a.month || 0)))[0];
  }, [myTargets]);

  const unitTargets = useMemo(() => parseUnitTargets(activeTarget?.unit_targets_json), [activeTarget]);

  const daysLeftInPeriod = useMemo(() => {
    if (!activeTarget) return 0;
    const now = new Date();
    if (activeTarget.end_date) {
      const end = new Date(activeTarget.end_date);
      return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
    }
    if (activeTarget.timeframe === "monthly" && activeTarget.year && activeTarget.month) {
      const end = new Date(activeTarget.year, activeTarget.month, 0);
      return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
    }
    return 0;
  }, [activeTarget]);

  const target = activeTarget?.revenue_target || 0;
  const achieved = activeTarget?.revenue_achieved || 0;
  const percentage = activeTarget?.percentage ?? (target > 0 ? Math.round((achieved / target) * 100) : 0);
  const remaining = Math.max(0, target - achieved);
  const commission = activeTarget?.commission_earned || 0;
  const dailyRequired = daysLeftInPeriod > 0 ? Math.ceil(remaining / daysLeftInPeriod) : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const motivationalMessage = useMemo(() => {
    if (!activeTarget) {
      return {
        type: "info",
        icon: <Target className="h-5 w-5" />,
        title: "No target set yet",
        message: "Your admin hasn't assigned you a target for this period."
      };
    }
    if (percentage >= 100) {
      return {
        type: "success",
        icon: <Crown className="h-5 w-5" />,
        title: "Target Achieved!",
        message: "Congratulations! You've reached your target. Keep up the excellent work!"
      };
    } else if (percentage >= 85) {
      return {
        type: "success",
        icon: <Trophy className="h-5 w-5" />,
        title: "Almost There!",
        message: `You're at ${percentage}% of your target with ${daysLeftInPeriod} days left. You're on fire!`
      };
    } else if (percentage >= 70) {
      return {
        type: "info",
        icon: <ThumbsUp className="h-5 w-5" />,
        title: "Good Progress!",
        message: `You've achieved ${percentage}% of your target. Keep pushing forward!`
      };
    } else if (daysLeftInPeriod > 0 && daysLeftInPeriod <= 5) {
      return {
        type: "warning",
        icon: <Clock className="h-5 w-5" />,
        title: "Time Running Out!",
        message: `Only ${daysLeftInPeriod} days left! You need ${currencyCode} ${dailyRequired.toLocaleString()}/day to reach your target.`
      };
    } else {
      return {
        type: "info",
        icon: <Target className="h-5 w-5" />,
        title: "Stay Focused!",
        message: `You're ${percentage}% there. Consistent effort will get you to your goal!`
      };
    }
  }, [activeTarget, percentage, daysLeftInPeriod, dailyRequired, currencyCode]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Targets</h1>
          <p className="text-gray-600 mt-1">
            Track your progress, targets, and earnings
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">Loading your targets...</div>
      ) : !activeTarget ? (
        <Alert className="border-l-4 border-l-blue-500 bg-white border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium">No targets assigned yet</h4>
              <AlertDescription className="mt-1">
                Your admin hasn't set any targets for you. Check back once one is assigned.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="units">Unit Targets</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className={tabContentShell}>
            {/* Motivational Banner */}
            <Alert className={cn(
              "border-l-4 bg-white",
              motivationalMessage.type === "success" && "border-l-green-500 border-green-200",
              motivationalMessage.type === "warning" && "border-l-yellow-500 border-yellow-200",
              motivationalMessage.type === "info" && "border-l-blue-500 border-blue-200"
            )}>
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "p-2 rounded-full",
                  motivationalMessage.type === "success" && "bg-green-100 text-green-600",
                  motivationalMessage.type === "warning" && "bg-yellow-100 text-yellow-600",
                  motivationalMessage.type === "info" && "bg-blue-100 text-blue-600"
                )}>
                  {motivationalMessage.icon}
                </div>
                <div>
                  <h4 className="font-medium">{motivationalMessage.title}</h4>
                  <AlertDescription className="mt-1">
                    {motivationalMessage.message}
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
              <Card className={statCardShell}>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-primary">Target</CardTitle>
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700"><CurrencyGlyph /> {target.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">{periodLabel(activeTarget)}</p>
                </CardContent>
              </Card>

              <Card className={statCardShell}>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-primary">Achieved</CardTitle>
                  <div className="bg-emerald-50 p-2 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-700"><CurrencyGlyph /> {achieved.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">{percentage}% complete</p>
                </CardContent>
              </Card>

              <Card className={statCardShell}>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-primary">Remaining</CardTitle>
                  <div className="bg-rose-50 p-2 rounded-lg">
                    <TrendingDown className="h-4 w-4 text-rose-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-rose-700">
                    <CurrencyGlyph /> {remaining.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">To hit target</p>
                </CardContent>
              </Card>

              <Card className={statCardShell}>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-primary">Earnings</CardTitle>
                  <div className="bg-amber-50 p-2 rounded-lg">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-amber-700"><CurrencyGlyph /> {commission.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground mt-1">Current commission</p>
                </CardContent>
              </Card>

              <Card className={statCardShell}>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-primary">Sessions</CardTitle>
                  <div className="bg-indigo-50 p-2 rounded-lg">
                    <Activity className="h-4 w-4 text-indigo-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-indigo-700">
                    {(activeTarget.sessions_achieved || 0)}/{activeTarget.sessions_target || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Sessions completed</p>
                </CardContent>
              </Card>

              <Card className={statCardShell}>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-primary">Days Left</CardTitle>
                  <div className="bg-slate-50 p-2 rounded-lg">
                    <Calendar className="h-4 w-4 text-slate-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-700">{daysLeftInPeriod}</div>
                  <p className="text-xs text-muted-foreground mt-1">Daily required: <CurrencyGlyph /> {dailyRequired.toLocaleString()}</p>
                </CardContent>
              </Card>
            </div>

            {/* Personal Overview Card */}
            <Card className={panelCardShell}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground">Personal Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
                  {/* Profile Section */}
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={staffProfile?.photo_url} />
                      <AvatarFallback className="text-lg">
                        {(staffProfile?.name || "?").split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{staffProfile?.name || "—"}</h3>
                      <p className="text-muted-foreground">{staffProfile?.role || "—"}</p>
                      <p className="text-sm text-muted-foreground">{staffProfile?.department || "—"}</p>
                      {staffProfile?.join_date && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Joined {new Date(staffProfile.join_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator orientation="vertical" className="hidden lg:block h-20" />

                  {/* Scope / Timeframe */}
                  <div className="flex-1 lg:max-w-sm">
                    <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                      <h4 className="font-medium text-foreground mb-2 flex items-center">
                        <DollarSign className="h-4 w-4 mr-2 text-primary" />
                        Target Scope
                      </h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {activeTarget.scope === "institution" ? "Institution-wide target" : "Individual target"} — {activeTarget.timeframe}
                      </p>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">Period</span>
                        <Badge variant="outline" className="text-primary border-primary">
                          {periodLabel(activeTarget)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Target Progress */}
            <Card className={panelCardShell}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground flex items-center">
                  <Target className="h-6 w-6 mr-3 text-primary" />
                  Revenue Target Progress
                </CardTitle>
                <CardDescription>Your target and current achievement for {periodLabel(activeTarget)}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Circular Progress */}
                  <div className="flex justify-center">
                    <div className="relative w-48 h-48">
                      <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" stroke="#E5E7EB" strokeWidth="8" fill="transparent" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke={percentage >= 75 ? COLORS.success : percentage >= 50 ? COLORS.warning : COLORS.error}
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={`${Math.min(100, percentage) * 2.51} 251`}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-bold text-foreground">{percentage}%</span>
                        <span className="text-sm text-muted-foreground">Complete</span>
                      </div>
                    </div>
                  </div>

                  {/* Target Details */}
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Target</span>
                        <span className="font-bold text-foreground"><CurrencyGlyph /> {target.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Achieved</span>
                        <span className="font-bold text-primary"><CurrencyGlyph /> {achieved.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Remaining</span>
                        <span className="font-bold text-error"><CurrencyGlyph /> {remaining.toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Days Left</span>
                        <Badge variant="outline">{daysLeftInPeriod} days</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Daily Required</span>
                        <span className="font-medium text-warning"><CurrencyGlyph /> {dailyRequired.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Commission Tracker */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground flex items-center">
                      <Sparkles className="h-4 w-4 mr-2 text-primary" />
                      Commission Tracker
                    </h4>
                    <div className="space-y-3">
                      <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Current Commission</span>
                          <span className="font-bold text-success"><CurrencyGlyph /> {commission.toLocaleString()}</span>
                        </div>
                      </div>
                      {activeTarget.new_clients_target ? (
                        <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">New Clients</span>
                            <span className="font-bold text-warning">
                              {activeTarget.new_clients_achieved || 0}/{activeTarget.new_clients_target}
                            </span>
                          </div>
                        </div>
                      ) : null}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Info className="h-4 w-4" />
                        <span>Commission is calculated by your admin based on revenue achieved.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="units" className={tabContentShell}>
            <Card className={panelCardShell}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground flex items-center">
                  <Activity className="h-6 w-6 mr-3 text-secondary" />
                  Unit Targets
                </CardTitle>
                <CardDescription>Service-specific targets and achievement progress</CardDescription>
              </CardHeader>
              <CardContent>
                {unitTargets.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No unit targets set for this period.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {unitTargets.map((unit, index) => {
                      const pct = unit.target_units > 0 ? Math.round((unit.achieved_units / unit.target_units) * 100) : 0;
                      const status = pct >= 100 ? "completed" : "in-progress";
                      const remainingUnits = Math.max(0, unit.target_units - unit.achieved_units);
                      return (
                        <div key={index} className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className="bg-slate-50 w-10 h-10 rounded-lg flex items-center justify-center">
                                <Target className="h-5 w-5 text-slate-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-foreground">{unit.service}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {unit.achieved_units}/{unit.target_units} units
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-foreground">{pct}%</span>
                              <Badge className={cn("ml-2", getStatusColor(status))}>
                                {status === "completed" ? (
                                  <><CheckCircle className="h-3 w-3 mr-1" />Done</>
                                ) : (
                                  <><Clock className="h-3 w-3 mr-1" />In progress</>
                                )}
                              </Badge>
                            </div>
                          </div>
                          <Progress value={Math.min(100, pct)} className="h-3" />
                          <div className="mt-2 text-xs text-muted-foreground">
                            {pct >= 100 ? "Target achieved!" : `${remainingUnits} more units needed`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
