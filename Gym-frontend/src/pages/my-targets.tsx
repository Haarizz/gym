import React, { useEffect, useMemo, useState } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Trophy,
  Clock,
  CheckCircle,
  Activity,
  RefreshCw,
  Crown,
  ThumbsUp,
  Sparkles,
  Dumbbell,
  Shield,
  Info
} from "lucide-react";
import { cn } from "../components/ui/utils";

const COLORS = {
  success: "#4CAF50",
  warning: "#FFC107",
  error: "#F44336"
};

interface UnitTargetRow {
  service: string;
  target_units: number;
  achieved_units: number;
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

  const [profile, setProfile] = useState<Staff | null>(null);
  const [myTarget, setMyTarget] = useState<StaffTarget | null>(null);
  const [peerTargets, setPeerTargets] = useState<StaffTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin accounts (no linked Staff record) don't have personal targets — instead
  // they get a roster view of every staff member's target for the current period.
  const [isAdminView, setIsAdminView] = useState(false);
  const [allStaff, setAllStaff] = useState<Staff[]>([]);
  const [allTargets, setAllTargets] = useState<StaffTarget[]>([]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const myProfile = await staffService.getMyProfile();
      setProfile(myProfile);
      if (myProfile?.id) {
        setIsAdminView(false);
        const [myTargets, individualTargets] = await Promise.all([
          staffService.getMyTargets(year, month),
          staffService.getTargets(year, month, "individual"),
        ]);
        setMyTarget(myTargets[0] ?? null);
        setPeerTargets(individualTargets);
      } else {
        setIsAdminView(true);
        setMyTarget(null);
        setPeerTargets([]);
        // Fetch every target (not just the current month) so a staff member without a
        // target yet for this month still shows their most recent one, rather than blank.
        const [staffPage, targets] = await Promise.all([
          staffService.getStaff({}, 1, 500),
          staffService.getTargets()
        ]);
        setAllStaff(staffPage.items);
        setAllTargets(targets);
      }
    } catch (e) {
      console.error("Failed to load targets", e);
      setError("Failed to load your targets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One row per staff member: the current month's target if set, else their most recent one.
  const staffRoster = useMemo(() => {
    return allStaff.map(s => {
      const targetsForStaff = allTargets.filter(t => String(t.staff_db_id) === String(s.id));
      let target: StaffTarget | null = null;
      if (targetsForStaff.length > 0) {
        const current = targetsForStaff.find(
          t => t.timeframe === "monthly" && t.year === year && t.month === month
        );
        target = current || [...targetsForStaff].sort((a, b) => (b.year - a.year) || ((b.month || 0) - (a.month || 0)))[0];
      }
      return { staff: s, target };
    });
  }, [allStaff, allTargets, year, month]);

  const unitTargets: UnitTargetRow[] = useMemo(() => {
    if (!myTarget?.unit_targets_json) return [];
    try {
      return JSON.parse(myTarget.unit_targets_json);
    } catch {
      return [];
    }
  }, [myTarget]);

  const revenueTarget = myTarget?.revenue_target || 0;
  const revenueAchieved = myTarget?.revenue_achieved || 0;
  const percentage =
    myTarget?.percentage ?? (revenueTarget > 0 ? Math.round((revenueAchieved / revenueTarget) * 100) : 0);
  const remaining = Math.max(0, revenueTarget - revenueAchieved);
  const commission = myTarget?.commission_earned || 0;

  const daysLeft = useMemo(() => {
    const today = new Date();
    if (today.getFullYear() !== year || today.getMonth() + 1 !== month) return 0;
    const endOfMonth = new Date(year, month, 0);
    return Math.max(0, endOfMonth.getDate() - today.getDate());
  }, [year, month]);

  const dailyRequired = daysLeft > 0 ? Math.ceil(remaining / daysLeft) : remaining;

  const ranking = useMemo(() => {
    if (!profile) return null;
    const rows = [...peerTargets].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    const position = rows.findIndex(t => t.staff_db_id === profile.id);
    return { position: position === -1 ? null : position + 1, total: rows.length, rows };
  }, [peerTargets, profile]);

  const getProgressColor = (pct: number) => {
    if (pct >= 100) return "bg-green-500";
    if (pct >= 75) return "bg-blue-500";
    if (pct >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const motivationalMessage = useMemo(() => {
    if (percentage >= 100) {
      return {
        type: "success" as const,
        icon: <Crown className="h-5 w-5" />,
        title: "Target Achieved!",
        message: "Congratulations! You've reached your target for this period. Keep up the excellent work!"
      };
    } else if (percentage >= 85) {
      return {
        type: "success" as const,
        icon: <Trophy className="h-5 w-5" />,
        title: "Almost There!",
        message: `You're at ${percentage}% of your target with ${daysLeft} day${daysLeft === 1 ? "" : "s"} left. Keep going!`
      };
    } else if (percentage >= 70) {
      return {
        type: "info" as const,
        icon: <ThumbsUp className="h-5 w-5" />,
        title: "Good Progress!",
        message: `You've achieved ${percentage}% of your target. Keep pushing forward!`
      };
    } else if (daysLeft > 0 && daysLeft <= 5) {
      return {
        type: "warning" as const,
        icon: <Clock className="h-5 w-5" />,
        title: "Time Running Out!",
        message: `Only ${daysLeft} day${daysLeft === 1 ? "" : "s"} left! You need ${currencyCode} ${dailyRequired.toLocaleString()}/day to reach your target.`
      };
    } else {
      return {
        type: "info" as const,
        icon: <Target className="h-5 w-5" />,
        title: "Stay Focused!",
        message: `You're ${percentage}% there. Consistent effort will get you to your goal!`
      };
    }
  }, [percentage, daysLeft, dailyRequired, currencyCode]);

  const unitIconFor = (service: string) => {
    const key = (service || "").toLowerCase();
    if (key.includes("karate") || key.includes("mma") || key.includes("martial")) {
      return { Icon: Dumbbell, shell: "bg-blue-50", color: "text-blue-600" };
    }
    if (key.includes("defense")) {
      return { Icon: Shield, shell: "bg-emerald-50", color: "text-emerald-600" };
    }
    if (key.includes("youth") || key.includes("group") || key.includes("membership")) {
      return { Icon: Users, shell: "bg-amber-50", color: "text-amber-600" };
    }
    return { Icon: Activity, shell: "bg-purple-50", color: "text-purple-600" };
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading targets...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{isAdminView ? "Staff Targets" : "My Targets"}</h1>
          <p className="text-gray-600 mt-1">
            {isAdminView ? "Every staff member's target and progress for the current period" : "Track your progress, targets, and earnings"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Alert className="border-l-4 border-l-red-500 bg-white border-red-200">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isAdminView ? (
        <Card className={panelCardShell}>
          <CardHeader className="pb-4">
            <CardTitle className="text-xl text-foreground flex items-center">
              <Users className="h-6 w-6 mr-3 text-primary" />
              Staff Targets
            </CardTitle>
            <CardDescription>Each staff member's current-month target, or their most recent one if this month isn't set yet</CardDescription>
          </CardHeader>
          <CardContent>
            {staffRoster.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No staff members found.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Achieved</TableHead>
                    <TableHead className="text-right">Progress</TableHead>
                    <TableHead className="text-right">Commission</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffRoster.map(({ staff: s, target: t }) => {
                    const rTarget = t?.revenue_target || 0;
                    const rAchieved = t?.revenue_achieved || 0;
                    const pct = t?.percentage ?? (rTarget > 0 ? Math.round((rAchieved / rTarget) * 100) : 0);
                    const isCurrentPeriod = t && t.year === year && t.month === month;
                    return (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={s.photo_url} />
                              <AvatarFallback className="text-xs">
                                {(s.name || "?").split(" ").map(n => n[0]).join("")}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium text-foreground">{s.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{s.role || "—"}</TableCell>
                        {t ? (
                          <>
                            <TableCell>
                              <Badge variant={isCurrentPeriod ? "default" : "outline"} className="font-normal">
                                {periodLabel(t)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right"><CurrencyGlyph /> {rTarget.toLocaleString()}</TableCell>
                            <TableCell className="text-right"><CurrencyGlyph /> {rAchieved.toLocaleString()}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <span className="text-sm font-medium">{pct}%</span>
                                <Progress value={Math.min(100, pct)} className="h-2 w-16" />
                              </div>
                            </TableCell>
                            <TableCell className="text-right"><CurrencyGlyph /> {(t.commission_earned || 0).toLocaleString()}</TableCell>
                          </>
                        ) : (
                          <TableCell colSpan={5} className="text-right text-muted-foreground">No target set</TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : !myTarget ? (
        <Card className={panelCardShell}>
          <CardContent className="py-12 text-center space-y-2">
            <Target className="h-10 w-10 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-medium text-foreground">No target set for this month</h3>
            <p className="text-sm text-muted-foreground">Ask your admin to assign one from Set Targets.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className={cn("grid w-full", unitTargets.length > 0 ? "grid-cols-3" : "grid-cols-2")}>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            {unitTargets.length > 0 && <TabsTrigger value="units">Unit Targets</TabsTrigger>}
            <TabsTrigger value="team">Team</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className={tabContentShell}>
            {/* Motivational Banner */}
            <Alert
              className={cn(
                "border-l-4 bg-white",
                motivationalMessage.type === "success" && "border-l-green-500 border-green-200",
                motivationalMessage.type === "warning" && "border-l-yellow-500 border-yellow-200",
                motivationalMessage.type === "info" && "border-l-blue-500 border-blue-200"
              )}
            >
              <div className="flex items-center space-x-3">
                <div
                  className={cn(
                    "p-2 rounded-full",
                    motivationalMessage.type === "success" && "bg-green-100 text-green-600",
                    motivationalMessage.type === "warning" && "bg-yellow-100 text-yellow-600",
                    motivationalMessage.type === "info" && "bg-blue-100 text-blue-600"
                  )}
                >
                  {motivationalMessage.icon}
                </div>
                <div>
                  <h4 className="font-medium">{motivationalMessage.title}</h4>
                  <AlertDescription className="mt-1">{motivationalMessage.message}</AlertDescription>
                </div>
              </div>
            </Alert>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              <Card className={statCardShell}>
                <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-sm font-medium text-primary">Target</CardTitle>
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <Target className="h-4 w-4 text-blue-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-700">
                    <CurrencyGlyph /> {revenueTarget.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">This month</p>
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
                  <div className="text-2xl font-bold text-emerald-700">
                    <CurrencyGlyph /> {revenueAchieved.toLocaleString()}
                  </div>
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
                  <div className="text-2xl font-bold text-amber-700">
                    <CurrencyGlyph /> {commission.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Commission earned</p>
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
                  <div className="text-2xl font-bold text-slate-700">{daysLeft}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {remaining > 0 ? (
                      <>
                        Daily required: <CurrencyGlyph /> {dailyRequired.toLocaleString()}
                      </>
                    ) : (
                      "Target met"
                    )}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Personal Overview */}
            <Card className={panelCardShell}>
              <CardHeader className="pb-4">
                <CardTitle className="text-xl text-foreground">Personal Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage src={profile?.photo_url} />
                      <AvatarFallback className="text-lg">
                        {(profile?.name || "?").split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{profile?.name}</h3>
                      <p className="text-muted-foreground">{profile?.role}</p>
                      <p className="text-sm text-muted-foreground">{profile?.department}</p>
                    </div>
                  </div>

                  <Separator orientation="vertical" className="hidden lg:block h-20" />

                  {ranking && ranking.position && (
                    <div className="flex-1 lg:max-w-sm">
                      <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                        <h4 className="font-medium text-foreground mb-2 flex items-center">
                          <Trophy className="h-4 w-4 mr-2 text-secondary" />
                          Current Ranking
                        </h4>
                        <div>
                          <span className="text-2xl font-bold text-foreground">#{ranking.position}</span>
                          <p className="text-xs text-muted-foreground">out of {ranking.total} staff with targets</p>
                        </div>
                      </div>
                    </div>
                  )}
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
                <CardDescription>Your target and current achievement for this period</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                          strokeDasharray={`${Math.min(percentage, 100) * 2.51} 251`}
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

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Target</span>
                        <span className="font-bold text-foreground">
                          <CurrencyGlyph /> {revenueTarget.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Achieved</span>
                        <span className="font-bold text-primary">
                          <CurrencyGlyph /> {revenueAchieved.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Remaining</span>
                        <span className="font-bold text-error">
                          <CurrencyGlyph /> {remaining.toLocaleString()}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Commission Earned</span>
                        <span className="font-medium text-warning">
                          <CurrencyGlyph /> {commission.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
                        <Info className="h-4 w-4" />
                        <span>Commission is calculated from your assigned commission plan against achieved revenue.</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {unitTargets.length > 0 && (
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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {unitTargets.map((unit, index) => {
                      const meta = unitIconFor(unit.service);
                      const UnitIcon = meta.Icon;
                      const pct = unit.target_units > 0 ? Math.round((unit.achieved_units / unit.target_units) * 100) : 0;
                      const remainingUnits = Math.max(0, unit.target_units - unit.achieved_units);
                      const completed = pct >= 100;
                      return (
                        <div key={index} className="p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <div className={`${meta.shell} w-10 h-10 rounded-lg flex items-center justify-center`}>
                                <UnitIcon className={`h-5 w-5 ${meta.color}`} />
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
                              <Badge className={cn("ml-2", completed ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800")}>
                                {completed ? (
                                  <>
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Done
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 mr-1" />
                                    In progress
                                  </>
                                )}
                              </Badge>
                            </div>
                          </div>
                          <Progress
                            value={pct}
                            className="h-3"
                            style={{ "--progress-background": getProgressColor(pct) } as React.CSSProperties}
                          />
                          <div className="mt-2 text-xs text-muted-foreground">
                            {completed ? "Target achieved!" : `${remainingUnits} more units needed`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="team" className={tabContentShell}>
            <Card className={panelCardShell}>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-foreground flex items-center">
                  <Trophy className="h-5 w-5 mr-2 text-secondary" />
                  Team Leaderboard
                </CardTitle>
                <CardDescription>Ranking by target completion this period</CardDescription>
              </CardHeader>
              <CardContent>
                {!ranking || ranking.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No staff targets found for this period.</p>
                ) : (
                  <div className="space-y-3">
                    {ranking.rows.map((t, index) => {
                      const isMe = t.staff_db_id === profile?.id;
                      return (
                        <div
                          key={t.id}
                          className={cn("flex items-center justify-between p-3 rounded-xl", isMe ? "bg-primary/5" : "bg-gray-50")}
                        >
                          <div className="flex items-center space-x-3">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                                index === 0 && "bg-yellow-100 text-yellow-700",
                                index === 1 && "bg-gray-100 text-gray-700",
                                index === 2 && "bg-orange-100 text-orange-700",
                                index > 2 && "bg-muted text-muted-foreground"
                              )}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <p className={cn("font-medium", isMe ? "text-primary" : "text-foreground")}>
                                {isMe ? "You" : t.staff_name}
                              </p>
                              <p className="text-xs text-muted-foreground">{t.staff_role}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-foreground">{t.percentage || 0}%</span>
                            {index === 0 && <Crown className="h-4 w-4 text-yellow-500 ml-1 inline" />}
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
