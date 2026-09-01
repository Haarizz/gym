import React, { useState, useMemo, useEffect } from "react";
import { CurrencyGlyph } from "../utils/currency";
import { staffService, StaffTarget, StaffPerformance } from "../utils/supabase/staff-service";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import { Alert, AlertDescription } from "../components/ui/alert";
import { motion } from "motion/react";
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Star,
  Target,
  Zap,
  BarChart3,
  Heart,
  ShoppingBag,
  Dumbbell,
  RefreshCw,
} from "lucide-react";

interface MyPerformanceProps {
  onNavigate?: (section: string) => void;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function targetPeriodLabel(t: StaffTarget): string {
  return t.month ? `${MONTH_NAMES[t.month - 1]} ${t.year}` : `${t.year || ""}`;
}

export function MyPerformance({ onNavigate }: MyPerformanceProps) {
  const statCardShell = "border-0 shadow-md hover:shadow-lg transition-shadow duration-300";
  const panelCardShell = "border-0 shadow-sm";

  const [activeTab, setActiveTab] = useState("activity");

  const [performance, setPerformance] = useState<StaffPerformance | null>(null);
  const [loadingPerformance, setLoadingPerformance] = useState(false);

  const [myTargets, setMyTargets] = useState<StaffTarget[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  const loadPerformance = async () => {
    setLoadingPerformance(true);
    try {
      const data = await staffService.getMyPerformance();
      setPerformance(data);
    } catch (error) {
      console.error("Failed to load my performance:", error);
    } finally {
      setLoadingPerformance(false);
    }
  };

  useEffect(() => {
    loadPerformance();

    let cancelled = false;
    (async () => {
      setLoadingTargets(true);
      try {
        const profile = await staffService.getMyProfile();
        if (!profile) { if (!cancelled) setMyTargets([]); return; }
        const targets = await staffService.getTargets(undefined, undefined, undefined, Number(profile.id));
        if (!cancelled) setMyTargets(targets);
      } catch (error) {
        console.error("Failed to load my targets:", error);
      } finally {
        if (!cancelled) setLoadingTargets(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getChangeColor = (change: number) => (change >= 0 ? "text-green-600" : "text-red-600");
  const getChangeIcon = (change: number) => (change >= 0 ? TrendingUp : TrendingDown);

  const revenueAchieved = performance?.revenue_target?.achieved ?? 0;
  const conversionsAchieved = performance?.conversion_target?.achieved ?? 0;
  const rating = performance?.summary?.rating ?? 0;
  const growthPercentage = performance?.summary?.growth_percentage ?? 0;
  const leadCount = performance?.summary?.lead_count ?? 0;
  const periodLabel = performance?.period.label ?? '';

  return (
    <div className="min-h-screen bg-gymbios-main-bg p-6 space-y-6">
      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-4"
      >
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              My Performance
            </h1>
            <p className="text-gray-600 mt-2">
              {performance?.period.label
                ? `Performance summary for ${performance.period.label}.`
                : "Detailed analytics and progress for continuous growth."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={loadPerformance}
              disabled={loadingPerformance}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loadingPerformance ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {loadingPerformance ? (
        <div className="py-16 text-center text-muted-foreground">Loading your performance...</div>
      ) : !performance ? (
        <Alert className="border-l-4 border-l-blue-500 bg-white border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-full bg-blue-100 text-blue-600">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h4 className="font-medium">No performance data available</h4>
              <AlertDescription className="mt-1">
                This account isn't linked to a staff record, so there's no personal performance data to show.
              </AlertDescription>
            </div>
          </div>
        </Alert>
      ) : (
      <>
      {/* Performance Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue Generated */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className={statCardShell}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <Badge className={`${getChangeColor(growthPercentage)} bg-transparent border-0`}>
                  {React.createElement(getChangeIcon(growthPercentage), { className: "h-3 w-3 mr-1" })}
                  {growthPercentage}%
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-blue-700"><CurrencyGlyph /> {revenueAchieved.toLocaleString()}</h3>
                <p className="text-sm text-gray-600">Revenue Generated</p>
                <p className="text-xs text-gray-500">vs. last period</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Conversions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className={statCardShell}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-emerald-50 p-3 rounded-lg">
                  <Dumbbell className="h-6 w-6 text-emerald-600" />
                </div>
                <Badge className="text-emerald-700 bg-transparent border-0">
                  {performance.conversion_target.percentage}%
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-emerald-700">{conversionsAchieved}</h3>
                <p className="text-sm text-gray-600">Conversions</p>
                <p className="text-xs text-gray-500">
                  {performance.conversion_target.target > 0
                    ? `Target: ${performance.conversion_target.target}`
                    : "No target set"}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leads */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className={statCardShell}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-indigo-700">{leadCount}</h3>
                <p className="text-sm text-gray-600">Leads Assigned</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Member Feedback Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className={statCardShell}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-amber-50 p-3 rounded-lg">
                  <Star className="h-6 w-6 text-amber-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-amber-700">
                  {rating > 0 ? `${rating} / 5` : "No ratings yet"}
                </h3>
                <p className="text-sm text-gray-600">Member Feedback Score</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Analytics Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <Card className={panelCardShell}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="border-b border-border">
              <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full">
                <TabsTrigger value="activity">
                  <Activity className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="sales">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="engagement">
                  <Heart className="h-4 w-4 mr-2" />
                  Engagement
                </TabsTrigger>
                <TabsTrigger value="targets">
                  <Target className="h-4 w-4 mr-2" />
                  Targets
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              {/* Activity / Trend Tab */}
              <TabsContent value="activity" className="space-y-6 mt-0">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-2">Revenue Target Progress</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    {periodLabel} — <CurrencyGlyph /> {revenueAchieved.toLocaleString()}
                    {performance.revenue_target.target > 0 ? ` / ${performance.revenue_target.target.toLocaleString()}` : ''}
                    {' '}({performance.revenue_target.percentage}%)
                  </p>
                  <Progress value={Math.min(100, performance.revenue_target.percentage)} className="h-3" />
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Revenue & Conversions — Last 6 Months</h3>
                  {performance.trend.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">No trend data available yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={performance.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="label" stroke="#555555" />
                        <YAxis yAxisId="revenue" stroke="#0047AB" />
                        <YAxis yAxisId="conversions" orientation="right" stroke="#00c5cb" allowDecimals={false} />
                        <Tooltip
                          contentStyle={{
                            background: "white",
                            border: "1px solid #0047AB20",
                            borderRadius: "8px",
                            boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                          }}
                          formatter={(value: number, name: string) =>
                            name === "Revenue" ? [`${value.toLocaleString()}`, name] : [value, name]
                          }
                        />
                        <Legend />
                        <Bar yAxisId="revenue" dataKey="revenue" fill="#0047AB" name="Revenue" radius={[8, 8, 0, 0]} />
                        <Line yAxisId="conversions" type="monotone" dataKey="conversions" stroke="#00c5cb" strokeWidth={2.5} name="Conversions" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {performance.trend.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-4">Monthly Breakdown</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-left text-gray-500">
                              <th className="py-2 font-medium">Month</th>
                              <th className="py-2 font-medium text-right">Revenue</th>
                              <th className="py-2 font-medium text-right">Conversions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {performance.trend.map((row) => (
                              <tr key={row.period} className="border-b border-border/60 last:border-0">
                                <td className="py-2">{row.label}</td>
                                <td className="py-2 text-right"><CurrencyGlyph /> {row.revenue.toLocaleString()}</td>
                                <td className="py-2 text-right">{row.conversions}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Sales & Conversions Tab */}
              <TabsContent value="sales" className="space-y-6 mt-0">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Conversion Progress</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Leads → Conversions</span>
                      <span className="text-sm text-gray-600">
                        {conversionsAchieved}
                        {performance.conversion_target.target > 0 ? ` / ${performance.conversion_target.target}` : ''}
                        {' '}({performance.conversion_target.percentage}%)
                      </span>
                    </div>
                    <Progress value={Math.min(100, performance.conversion_target.percentage)} className="h-3" />
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-0 shadow-sm bg-blue-50">
                    <CardContent className="p-6 text-center">
                      <ShoppingBag className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-2xl text-blue-700"><CurrencyGlyph /> {revenueAchieved.toLocaleString()}</h4>
                      <p className="text-sm text-gray-600">Revenue This Month</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-amber-50">
                    <CardContent className="p-6 text-center">
                      <Zap className="h-8 w-8 text-amber-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-2xl text-amber-700">{performance.breakdown.conversion_rate}%</h4>
                      <p className="text-sm text-gray-600">Lead Conversion Rate</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-indigo-50">
                    <CardContent className="p-6 text-center">
                      <Users className="h-8 w-8 text-indigo-600 mx-auto mb-2" />
                      <h4 className="font-semibold text-2xl text-indigo-700">{leadCount}</h4>
                      <p className="text-sm text-gray-600">Leads Assigned</p>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50">
                  <div className="flex items-center gap-2">
                    {React.createElement(getChangeIcon(growthPercentage), { className: `h-5 w-5 ${getChangeColor(growthPercentage)}` })}
                    <span className="text-sm text-gray-700">Revenue/conversions vs. last month</span>
                  </div>
                  <span className={`text-sm font-semibold ${getChangeColor(growthPercentage)}`}>
                    {growthPercentage >= 0 ? '+' : ''}{growthPercentage}%
                  </span>
                </div>
              </TabsContent>

              {/* Engagement Tab */}
              <TabsContent value="engagement" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-0 shadow-sm bg-emerald-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-emerald-800">Follow-up Completion</h4>
                        <TrendingUp className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="text-3xl font-bold text-emerald-700 mb-2">{performance.breakdown.follow_up_completion}%</div>
                      <p className="text-sm text-gray-600">Of assigned follow-ups completed</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-rose-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-rose-800">Customer Satisfaction</h4>
                        <Heart className="h-5 w-5 text-rose-600" />
                      </div>
                      <div className="text-3xl font-bold text-rose-700 mb-2">{performance.breakdown.customer_satisfaction}%</div>
                      <p className="text-sm text-gray-600">Based on member feedback ratings</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm bg-amber-50">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-amber-800">Member Rating</h4>
                        <Star className="h-5 w-5 text-amber-500" />
                      </div>
                      <div className="text-3xl font-bold text-amber-700 mb-2">
                        {rating > 0 ? `${rating} / 5` : "—"}
                      </div>
                      <p className="text-sm text-gray-600">
                        {rating > 0 ? "Average across your session feedback" : "No ratings received yet"}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {rating > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Satisfaction level</span>
                      <span className="font-medium text-primary">{performance.breakdown.customer_satisfaction}%</span>
                    </div>
                    <Progress value={performance.breakdown.customer_satisfaction} className="h-2" />
                  </div>
                )}
              </TabsContent>

              {/* Targets & Achievements Tab */}
              <TabsContent value="targets" className="space-y-6 mt-0">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Target Progress</h3>
                  <div className="space-y-4">
                    {loadingTargets ? (
                      <p className="text-sm text-gray-500">Loading targets...</p>
                    ) : myTargets.length === 0 ? (
                      <p className="text-sm text-gray-500">No targets assigned yet. Your admin hasn't set any targets for you.</p>
                    ) : (
                      myTargets.map((target) => {
                        const pct = target.percentage ?? 0;
                        return (
                          <div key={target.id} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="font-medium">Revenue — {targetPeriodLabel(target)}</span>
                                <Badge className="ml-2 bg-gradient-light text-primary border-primary/20 text-xs">
                                  {target.scope === 'institution' ? 'Institution' : 'Individual'}
                                </Badge>
                              </div>
                              <span className="text-sm text-gray-600">
                                <CurrencyGlyph /> {Number(target.revenue_achieved || 0).toLocaleString()} / <CurrencyGlyph /> {Number(target.revenue_target || 0).toLocaleString()} ({pct}%)
                              </span>
                            </div>
                            <Progress
                              value={Math.min(pct, 100)}
                              className={`h-3 ${pct >= 90 ? 'bg-green-100' : pct >= 70 ? 'bg-yellow-100' : 'bg-red-100'}`}
                            />
                            {(target.sessions_target || target.new_clients_target) && (
                              <div className="text-xs text-gray-600">
                                {target.sessions_target ? `${target.sessions_achieved || 0}/${target.sessions_target} sessions` : ''}
                                {target.sessions_target && target.new_clients_target ? ' · ' : ''}
                                {target.new_clients_target ? `${target.new_clients_achieved || 0}/${target.new_clients_target} new clients` : ''}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </motion.div>

      {/* Motivation */}
      {performance.motivation && (() => {
        const status = performance.motivation.status;
        const motivationColors: Record<string, { border: string; iconBg: string; icon: string }> = {
          ACHIEVED:  { border: "border-l-green-500",  iconBg: "bg-green-100",  icon: "text-green-600" },
          ON_TRACK:  { border: "border-l-blue-500",   iconBg: "bg-blue-100",   icon: "text-blue-600" },
          AHEAD:     { border: "border-l-amber-500",  iconBg: "bg-amber-100",  icon: "text-amber-600" },
          AT_RISK:   { border: "border-l-rose-500",   iconBg: "bg-rose-100",   icon: "text-rose-600" },
        };
        const colors = motivationColors[status] || motivationColors.ON_TRACK;
        return (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <Card className={`border-0 border-l-4 ${colors.border} shadow-sm`}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-3">
                  <div className={`${colors.iconBg} p-2 rounded-full`}>
                    <Target className={`h-5 w-5 ${colors.icon}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">{status.replace(/_/g, ' ')}</h4>
                    <p className="text-sm text-gray-700">{performance.motivation.message}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })()}

      {/* Branch Leaderboard */}
      {performance.leaderboard.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-primary flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Branch Leaderboard</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {performance.leaderboard.map((entry) => (
                  <div
                    key={entry.staff_id}
                    className={`flex items-center justify-between p-3 rounded-lg ${entry.current_user ? 'bg-primary/5 border border-primary/20' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="w-6 text-center font-semibold text-gray-600">{entry.rank}</span>
                      <span className={`font-medium ${entry.current_user ? 'text-primary' : ''}`}>
                        {entry.current_user ? 'You' : entry.staff_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span>{entry.conversion_count} conversions</span>
                      <span className="font-medium text-primary"><CurrencyGlyph /> {entry.revenue.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
      </>
      )}
    </div>
  );
}
