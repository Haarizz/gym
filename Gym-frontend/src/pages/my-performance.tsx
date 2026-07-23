import React, { useState, useMemo } from "react";
import { CurrencyGlyph } from "../utils/currency";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import { motion } from "motion/react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Users,
  DollarSign,
  Activity,
  Star,
  Calendar,
  Target,
  Award,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  PieChart as PieChartIcon,
  Filter,
  Lightbulb,
  Trophy,
  Flame,
  Heart,
  ThumbsUp,
  ArrowUpRight,
  ArrowDownRight,
  Dumbbell,
  UserCheck,
  ShoppingBag,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

interface MyPerformanceProps {
  onNavigate?: (section: string) => void;
}

// Sample data for session trends
const sessionTrendData = [
  { day: "Mon", sessions: 8, revenue: 960 },
  { day: "Tue", sessions: 10, revenue: 1200 },
  { day: "Wed", sessions: 7, revenue: 840 },
  { day: "Thu", sessions: 12, revenue: 1440 },
  { day: "Fri", sessions: 9, revenue: 1080 },
  { day: "Sat", sessions: 6, revenue: 720 },
  { day: "Sun", sessions: 2, revenue: 240 },
];

// Session breakdown by type
const sessionTypeData = [
  { type: "Personal Training", count: 32, duration: 45, feedback: 4.8, revenue: 3840 },
  { type: "Group Class", count: 15, duration: 60, feedback: 4.6, revenue: 2250 },
  { type: "Nutrition Consult", count: 7, duration: 30, feedback: 4.9, revenue: 1230 },
];

// Sales conversion data
const conversionData = [
  { stage: "Leads", count: 45, percentage: 100 },
  { stage: "Consultations", count: 32, percentage: 71 },
  { stage: "Proposals", count: 24, percentage: 53 },
  { stage: "Converted", count: 18, percentage: 40 },
];

// Attendance heatmap data
const attendanceHeatmap = [
  { day: "Mon", "6am": 5, "9am": 8, "12pm": 3, "3pm": 4, "6pm": 9, "9pm": 2 },
  { day: "Tue", "6am": 6, "9am": 7, "12pm": 4, "3pm": 5, "6pm": 10, "9pm": 1 },
  { day: "Wed", "6am": 4, "9am": 9, "12pm": 2, "3pm": 6, "6pm": 8, "9pm": 3 },
  { day: "Thu", "6am": 7, "9am": 6, "12pm": 5, "3pm": 7, "6pm": 12, "9pm": 2 },
  { day: "Fri", "6am": 5, "9am": 8, "12pm": 3, "3pm": 4, "6pm": 9, "9pm": 1 },
  { day: "Sat", "6am": 3, "9am": 5, "12pm": 2, "3pm": 3, "6pm": 6, "9pm": 0 },
  { day: "Sun", "6am": 1, "9am": 2, "12pm": 1, "3pm": 1, "6pm": 2, "9pm": 0 },
];

// Historical monthly data
const monthlyHistoricalData = [
  { month: "Apr", revenue: 6200, sessions: 48, feedback: 4.5, attendance: 92 },
  { month: "May", revenue: 6800, sessions: 52, feedback: 4.6, attendance: 94 },
  { month: "Jun", revenue: 7100, sessions: 54, feedback: 4.7, attendance: 95 },
  { month: "Jul", revenue: 7320, sessions: 54, feedback: 4.7, attendance: 93 },
];

// Target progress data
const targetProgressData = [
  { name: "Membership Plan Sales", current: 16, target: 20, percentage: 80, category: "Sales" },
  { name: "POS Products Sold", current: 45, target: 75, percentage: 60, category: "Sales" },
  { name: "Session Completion Rate", current: 95, target: 100, percentage: 95, category: "Performance" },
  { name: "Member Retention", current: 34, target: 38, percentage: 89, category: "Engagement" },
  { name: "New Client Acquisition", current: 12, target: 15, percentage: 80, category: "Growth" },
];

// Achievement badges
const achievementBadges = [
  { id: 1, title: "Top Performer", description: "Highest revenue this month", icon: Trophy, color: "#FFD700" },
  { id: 2, title: "Consistency Star", description: "Perfect attendance for 30 days", icon: Star, color: "#0047AB" },
  { id: 3, title: "Member Favorite", description: "4.7+ rating average", icon: Heart, color: "#F44336" },
  { id: 4, title: "Sales Champion", description: "150% of sales target", icon: Award, color: "#4CAF50" },
];

// AI insights
const aiInsights = [
  {
    id: 1,
    type: "success",
    title: "Peak Performance Window",
    message: "Your weekday sessions show 20% higher retention—consider adding another slot on Thursdays.",
    icon: TrendingUp,
  },
  {
    id: 2,
    type: "warning",
    title: "Feedback Attention Needed",
    message: "Average feedback dropped slightly this month. Try following up with new members after their first session.",
    icon: AlertCircle,
  },
  {
    id: 3,
    type: "info",
    title: "Revenue Opportunity",
    message: "Personal training sessions have the highest satisfaction rate. Focus on converting group class members to PT.",
    icon: Lightbulb,
  },
];

export function MyPerformance({ onNavigate }: MyPerformanceProps) {
    const [dateRange, setDateRange] = useState("month");
  const [compareWithPrevious, setCompareWithPrevious] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState("revenue");
  const [activeTab, setActiveTab] = useState("activity");

  // Calculate KPI changes
  const kpiData = useMemo(() => ({
    sessions: { current: 54, previous: 52, change: 3.8 },
    revenue: { current: 7320, previous: 7100, change: 3.1 },
    members: { current: 38, previous: 36, change: 5.6 },
    feedback: { current: 4.7, previous: 4.6, change: 2.2 },
  }), []);

  const handleExportReport = () => {
    toast.success("Report Export", {
      description: "Your performance report is being generated and will download shortly.",
    });
  };

  const handleSetNewGoals = () => {
    toast.info("Set New Goals", {
      description: "Goal setting feature coming soon!",
    });
  };

  const handleViewFullReport = () => {
    toast.info("Full Report", {
      description: "Detailed analytics view coming soon!",
    });
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? "text-green-600" : "text-red-600";
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? TrendingUp : TrendingDown;
  };

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
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              My Performance
            </h1>
            <p className="text-gray-600 mt-2">
              Detailed analytics, progress history, and personalized insights for continuous growth.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px] border-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="fortnight">Last 15 Days</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCompareWithPrevious(!compareWithPrevious)}
              className={compareWithPrevious ? "bg-gradient-light border-primary/30" : ""}
            >
              <Filter className="h-4 w-4 mr-2" />
              {compareWithPrevious ? "Comparing" : "Compare"}
            </Button>

            <Button
              onClick={handleExportReport}
              className="btn-primary"
            >
              <Download className="h-4 w-4 mr-2" />
              Export Report (PDF)
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Performance Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Sessions Conducted */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className="border-primary/10 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                {compareWithPrevious && (
                  <Badge className={`${getChangeColor(kpiData.sessions.change)} bg-transparent border-0`}>
                    {React.createElement(getChangeIcon(kpiData.sessions.change), { className: "h-3 w-3 mr-1" })}
                    {kpiData.sessions.change}%
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-primary">{kpiData.sessions.current}</h3>
                <p className="text-sm text-gray-600">Sessions Conducted</p>
                {compareWithPrevious && (
                  <p className="text-xs text-gray-500">vs. {kpiData.sessions.previous} last period</p>
                )}
              </div>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={40}>
                  <LineChart data={sessionTrendData}>
                    <Line type="monotone" dataKey="sessions" stroke="#0047AB" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Revenue Generated */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-primary/10 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                {compareWithPrevious && (
                  <Badge className={`${getChangeColor(kpiData.revenue.change)} bg-transparent border-0`}>
                    {React.createElement(getChangeIcon(kpiData.revenue.change), { className: "h-3 w-3 mr-1" })}
                    {kpiData.revenue.change}%
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-primary"><CurrencyGlyph /> {kpiData.revenue.current.toLocaleString()}</h3>
                <p className="text-sm text-gray-600">Revenue Generated</p>
                {compareWithPrevious && (
                  <p className="text-xs text-gray-500">vs. <CurrencyGlyph /> {kpiData.revenue.previous.toLocaleString()} last period</p>
                )}
              </div>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={40}>
                  <AreaChart data={sessionTrendData}>
                    <defs>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0047AB" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0047AB" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="revenue" stroke="#0047AB" fill="url(#revenueGradient)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Members Trained */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <Card className="border-primary/10 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                {compareWithPrevious && (
                  <Badge className={`${getChangeColor(kpiData.members.change)} bg-transparent border-0`}>
                    {React.createElement(getChangeIcon(kpiData.members.change), { className: "h-3 w-3 mr-1" })}
                    {kpiData.members.change}%
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-primary">{kpiData.members.current}</h3>
                <p className="text-sm text-gray-600">Active Members Trained</p>
                {compareWithPrevious && (
                  <p className="text-xs text-gray-500">vs. {kpiData.members.previous} last period</p>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <UserCheck className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-600">92% retention</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ArrowUpRight className="h-4 w-4 text-blue-600" />
                  <span className="text-xs text-blue-600">+5 new</span>
                </div>
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
          <Card className="border-primary/10 hover:shadow-lg transition-shadow duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                {compareWithPrevious && (
                  <Badge className={`${getChangeColor(kpiData.feedback.change)} bg-transparent border-0`}>
                    {React.createElement(getChangeIcon(kpiData.feedback.change), { className: "h-3 w-3 mr-1" })}
                    {kpiData.feedback.change}%
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-primary">{kpiData.feedback.current} / 5</h3>
                <p className="text-sm text-gray-600">Member Feedback Score</p>
                {compareWithPrevious && (
                  <p className="text-xs text-gray-500">vs. {kpiData.feedback.previous} last period</p>
                )}
              </div>
              <div className="mt-4">
                <div className="relative w-20 h-20 mx-auto">
                  <svg className="transform -rotate-90" width="80" height="80">
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      stroke="#E5E7EB"
                      strokeWidth="6"
                      fill="none"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="35"
                      stroke="url(#progressGradient)"
                      strokeWidth="6"
                      fill="none"
                      strokeDasharray={`${(kpiData.feedback.current / 5) * 220} 220`}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0047AB" />
                        <stop offset="100%" stopColor="#00c5cb" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">{((kpiData.feedback.current / 5) * 100).toFixed(0)}%</span>
                  </div>
                </div>
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
        <Card className="border-primary/10">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <CardHeader className="border-b border-primary/10">
              <TabsList className="grid grid-cols-2 lg:grid-cols-4 w-full bg-gradient-light">
                <TabsTrigger value="activity" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                  <Activity className="h-4 w-4 mr-2" />
                  Activity
                </TabsTrigger>
                <TabsTrigger value="sales" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Sales
                </TabsTrigger>
                <TabsTrigger value="engagement" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                  <Heart className="h-4 w-4 mr-2" />
                  Engagement
                </TabsTrigger>
                <TabsTrigger value="targets" className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white">
                  <Target className="h-4 w-4 mr-2" />
                  Targets
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="p-6">
              {/* Activity Performance Tab */}
              <TabsContent value="activity" className="space-y-6 mt-0">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Sessions by Day</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sessionTrendData}>
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0047AB" />
                          <stop offset="100%" stopColor="#00c5cb" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="day" stroke="#555555" />
                      <YAxis stroke="#555555" />
                      <Tooltip 
                        contentStyle={{ 
                          background: "white", 
                          border: "1px solid #0047AB20",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
                        }}
                      />
                      <Legend />
                      <Bar dataKey="sessions" fill="url(#barGradient)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Session Breakdown</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-light">
                        <tr>
                          <th className="text-left p-4 text-primary">Session Type</th>
                          <th className="text-left p-4 text-primary">Count</th>
                          <th className="text-left p-4 text-primary">Avg. Duration</th>
                          <th className="text-left p-4 text-primary">Feedback</th>
                          <th className="text-left p-4 text-primary">Revenue</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionTypeData.map((session, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-4 font-medium">{session.type}</td>
                            <td className="p-4">{session.count}</td>
                            <td className="p-4">{session.duration} min</td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                                <span className="font-medium">{session.feedback}</span>
                              </div>
                            </td>
                            <td className="p-4 font-semibold text-primary"><CurrencyGlyph /> {session.revenue.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Sales & Conversions Tab */}
              <TabsContent value="sales" className="space-y-6 mt-0">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Sales Conversion Funnel</h3>
                  <div className="space-y-4">
                    {conversionData.map((stage, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{stage.stage}</span>
                          <span className="text-sm text-gray-600">{stage.count} ({stage.percentage}%)</span>
                        </div>
                        <Progress value={stage.percentage} className="h-3" />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-primary/20 bg-gradient-light">
                    <CardContent className="p-6 text-center">
                      <ShoppingBag className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h4 className="font-semibold text-2xl text-primary">24</h4>
                      <p className="text-sm text-gray-600">Total Packages Sold</p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20 bg-gradient-light">
                    <CardContent className="p-6 text-center">
                      <RefreshCw className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h4 className="font-semibold text-2xl text-primary">16</h4>
                      <p className="text-sm text-gray-600">Renewals Secured</p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20 bg-gradient-light">
                    <CardContent className="p-6 text-center">
                      <TrendingUp className="h-8 w-8 text-primary mx-auto mb-2" />
                      <h4 className="font-semibold text-2xl text-primary">65%</h4>
                      <p className="text-sm text-gray-600">Upsell Rate</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Engagement & Attendance Tab */}
              <TabsContent value="engagement" className="space-y-6 mt-0">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Attendance Heatmap</h3>
                  <div className="overflow-x-auto">
                    <div className="min-w-[600px]">
                      <div className="grid grid-cols-7 gap-2 mb-2">
                        <div></div>
                        {["6am", "9am", "12pm", "3pm", "6pm", "9pm"].map((time) => (
                          <div key={time} className="text-center text-xs font-medium text-gray-600">{time}</div>
                        ))}
                      </div>
                      {attendanceHeatmap.map((dayData, index) => (
                        <div key={index} className="grid grid-cols-7 gap-2 mb-2">
                          <div className="text-sm font-medium text-gray-600 flex items-center">{dayData.day}</div>
                          {["6am", "9am", "12pm", "3pm", "6pm", "9pm"].map((time) => {
                            const value = dayData[time as keyof typeof dayData] as number;
                            const intensity = value > 8 ? "bg-primary" : value > 5 ? "bg-accent" : value > 2 ? "bg-primary/40" : "bg-gray-200";
                            return (
                              <div
                                key={time}
                                className={`h-12 rounded-lg flex items-center justify-center ${intensity} text-white font-medium`}
                              >
                                {value}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-primary">Member Attendance</h4>
                        <TrendingUp className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="text-3xl font-bold text-primary mb-2">93%</div>
                      <p className="text-sm text-gray-600">Average attendance rate</p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-primary">No-Show Rate</h4>
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="text-3xl font-bold text-primary mb-2">7%</div>
                      <p className="text-sm text-gray-600">Below industry average</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Targets & Achievements Tab */}
              <TabsContent value="targets" className="space-y-6 mt-0">
                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Monthly Target Progress</h3>
                  <div className="space-y-4">
                    {targetProgressData.map((target, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{target.name}</span>
                            <Badge className="ml-2 bg-gradient-light text-primary border-primary/20 text-xs">
                              {target.category}
                            </Badge>
                          </div>
                          <span className="text-sm text-gray-600">
                            {target.current} / {target.target} ({target.percentage}%)
                          </span>
                        </div>
                        <Progress 
                          value={target.percentage} 
                          className={`h-3 ${target.percentage >= 90 ? 'bg-green-100' : target.percentage >= 70 ? 'bg-yellow-100' : 'bg-red-100'}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold text-primary mb-4">Achievement Badges</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {achievementBadges.map((badge) => (
                      <motion.div
                        key={badge.id}
                        whileHover={{ scale: 1.05 }}
                        className="cursor-pointer"
                      >
                        <Card className="border-primary/20 hover:shadow-lg transition-shadow">
                          <CardContent className="p-6 text-center">
                            <div 
                              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                              style={{ background: `linear-gradient(135deg, ${badge.color}20 0%, ${badge.color}40 100%)` }}
                            >
                              {React.createElement(badge.icon, { 
                                className: "h-8 w-8",
                                style: { color: badge.color }
                              })}
                            </div>
                            <h4 className="font-semibold text-sm mb-1">{badge.title}</h4>
                            <p className="text-xs text-gray-600">{badge.description}</p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </motion.div>

      {/* Insights & Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="text-primary flex items-center space-x-2">
              <Lightbulb className="h-5 w-5" />
              <span>Insights & Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {aiInsights.map((insight) => (
              <motion.div
                key={insight.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * insight.id }}
                className={`p-4 rounded-lg border-l-4 ${
                  insight.type === "success"
                    ? "bg-green-50 border-green-500"
                    : insight.type === "warning"
                    ? "bg-yellow-50 border-yellow-500"
                    : "bg-blue-50 border-blue-500"
                }`}
              >
                <div className="flex items-start space-x-3">
                  {React.createElement(insight.icon, {
                    className: `h-5 w-5 mt-0.5 ${
                      insight.type === "success"
                        ? "text-green-600"
                        : insight.type === "warning"
                        ? "text-yellow-600"
                        : "text-blue-600"
                    }`,
                  })}
                  <div className="flex-1">
                    <h4 className="font-semibold mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-700">{insight.message}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </motion.div>

      {/* Historical Data Trend */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.7 }}
      >
        <Card className="border-primary/10">
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <CardTitle className="text-primary flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Historical Performance Trend</span>
              </CardTitle>
              <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                <SelectTrigger className="w-[180px] border-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="attendance">Attendance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyHistoricalData}>
                <defs>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0047AB" />
                    <stop offset="100%" stopColor="#00c5cb" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#555555" />
                <YAxis stroke="#555555" />
                <Tooltip
                  contentStyle={{
                    background: "white",
                    border: "1px solid #0047AB20",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={selectedMetric}
                  stroke="url(#lineGradient)"
                  strokeWidth={3}
                  dot={{ fill: "#0047AB", strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Footer Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="flex flex-col sm:flex-row items-center justify-center gap-4"
      >
        <Button variant="outline" size="lg" onClick={handleViewFullReport} className="border-primary/30">
          <BarChart3 className="h-4 w-4 mr-2" />
          View Full Report
        </Button>
        <Button variant="outline" size="lg" className="border-primary/30">
          <Users className="h-4 w-4 mr-2" />
          Share with Admin
        </Button>
        <Button size="lg" className="btn-primary" onClick={handleSetNewGoals}>
          <Target className="h-4 w-4 mr-2" />
          Set New Goals
        </Button>
      </motion.div>
    </div>
  );
}

