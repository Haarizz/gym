import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import {
  Target,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Award,
  Calendar,
  Users,
  Star,
  Trophy,
  Flame,
  CheckCircle,
  Clock,
  Zap,
  Activity,
  Eye,
  ArrowUp,
  ArrowDown,
  Crown,
  ThumbsUp,
  AlertTriangle,
  Gift,
  Sparkles,
  Bell,
  RefreshCw,
  BarChart3,
  PieChart,
  LineChart,
  Gauge,
  Heart,
  Coffee,
  Dumbbell
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie
} from "recharts";
import { cn } from "../components/ui/utils";

// Mock data for current employee (would come from auth service)
const currentEmployee = {
  id: "EMP001",
  name: "Sara Al-Rashid",
  email: "sara.alrashid@gymbios.com",
  avatar: "/staff/sara.jpg",
  role: "Karate & Martial Arts Trainer",
  department: "Martial Arts",
  joinDate: "2022-03-15",
  commissionPlan: {
    type: "percentage", // "percentage" or "fixed"
    rate: 5, // 5% or fixed amount
    threshold: 10000, // minimum revenue for commission
    description: "5% on revenue above AED 10,000"
  },
  currentMonth: {
    target: 10000,
    achieved: 7200,
    percentage: 72,
    commission: 360,
    projectedCommission: 500,
    daysLeft: 8,
    dailyRequired: 350,
    streak: 5 // consecutive days of progress
  },
  unitTargets: [
    {
      id: "1",
      service: "Karate",
      target: 10,
      achieved: 6,
      percentage: 60,
      status: "in-progress",
      icon: "🥋"
    },
    {
      id: "2", 
      service: "Martial Arts",
      target: 12,
      achieved: 8,
      percentage: 67,
      status: "in-progress",
      icon: "🥊"
    },
    {
      id: "3",
      service: "Self Defense",
      target: 8,
      achieved: 8,
      percentage: 100,
      status: "completed",
      icon: "🛡️"
    },
    {
      id: "4",
      service: "Youth Training",
      target: 15,
      achieved: 10,
      percentage: 67,
      status: "in-progress",
      icon: "👦"
    }
  ],
  weeklyProgress: [
    { day: "Mon", revenue: 850, target: 1250 },
    { day: "Tue", revenue: 1200, target: 1250 },
    { day: "Wed", revenue: 950, target: 1250 },
    { day: "Thu", revenue: 1350, target: 1250 },
    { day: "Fri", revenue: 1400, target: 1250 },
    { day: "Sat", revenue: 1450, target: 1250 },
    { day: "Sun", revenue: 0, target: 1250 }
  ],
  salesBreakdown: [
    { category: "Membership Sales", amount: 4500, percentage: 62.5 },
    { category: "Personal Training", amount: 1800, percentage: 25.0 },
    { category: "Add-on Services", amount: 900, percentage: 12.5 }
  ],
  ranking: {
    position: 2,
    totalStaff: 10,
    category: "trainers",
    improvement: "+1" // improved by 1 position
  },
  achievements: [
    { 
      id: "1",
      title: "5-Day Streak",
      description: "Met daily targets for 5 consecutive days",
      icon: "🔥",
      date: "Today",
      type: "streak"
    },
    {
      id: "2",
      title: "Unit Target Champion",
      description: "First to complete Self Defense target",
      icon: "🏆",
      date: "Yesterday",
      type: "achievement"
    },
    {
      id: "3",
      title: "Weekend Warrior",
      description: "Exceeded weekend target by 16%",
      icon: "⚡",
      date: "2 days ago",
      type: "performance"
    }
  ]
};

// Institution staff for comparison
const institutionLeaderboard = [
  { name: "Ahmed Al-Mansoori", role: "Personal Trainer", achievement: 102, position: 1 },
  { name: "Sara Al-Rashid", role: "Karate Trainer", achievement: 72, position: 2 },
  { name: "Looka Johnson", role: "Yoga Instructor", achievement: 75, position: 3 },
  { name: "Mery Wilson", role: "Reception Sales", achievement: 68, position: 4 },
  { name: "Arshi Hassan", role: "MMA Trainer", achievement: 65, position: 5 }
];

const COLORS = {
  primary: "#0047AB",
  secondary: "#009688",
  success: "#4CAF50", 
  warning: "#FFC107",
  error: "#F44336",
  muted: "#9E9E9E"
};

export function MyTargets() {
  const [activeTab, setActiveTab] = useState("overview");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed": return "bg-green-100 text-green-800";
      case "in-progress": return "bg-blue-100 text-blue-800";
      case "behind": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const motivationalMessage = useMemo(() => {
    const { percentage, daysLeft, streak } = currentEmployee.currentMonth;
    
    if (percentage >= 100) {
      return {
        type: "success",
        icon: <Crown className="h-5 w-5" />,
        title: "🎉 Target Achieved!",
        message: "Congratulations! You've exceeded your monthly target. Keep up the excellent work!"
      };
    } else if (percentage >= 85) {
      return {
        type: "success", 
        icon: <Trophy className="h-5 w-5" />,
        title: "🔥 Almost There!",
        message: `You're at ${percentage}% of your target with ${daysLeft} days left. You're on fire!`
      };
    } else if (percentage >= 70) {
      return {
        type: "info",
        icon: <ThumbsUp className="h-5 w-5" />,
        title: "💪 Good Progress!",
        message: `You've achieved ${percentage}% of your target. Keep pushing forward!`
      };
    } else if (daysLeft <= 5) {
      return {
        type: "warning",
        icon: <Clock className="h-5 w-5" />,
        title: "⏰ Time Running Out!",
        message: `Only ${daysLeft} days left! You need AED ${currentEmployee.currentMonth.dailyRequired}/day to reach your target.`
      };
    } else {
      return {
        type: "info",
        icon: <Target className="h-5 w-5" />,
        title: "🎯 Stay Focused!",
        message: `You're ${percentage}% there. Consistent effort will get you to your goal!`
      };
    }
  }, []);

  const streakMessage = useMemo(() => {
    const { streak } = currentEmployee.currentMonth;
    if (streak >= 7) {
      return {
        type: "success",
        title: "🔥 Incredible Streak!",
        message: `${streak} days of consistent progress! You're unstoppable!`
      };
    } else if (streak >= 3) {
      return {
        type: "info", 
        title: "⚡ Great Momentum!",
        message: `${streak} day streak! Keep the momentum going!`
      };
    }
    return null;
  }, []);

  return (
    <div className="p-6 space-y-6 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Targets</h1>
          <p className="text-muted-foreground mt-1">
            Track your progress, targets, and earnings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Details
          </Button>
        </div>
      </div>

      {/* Motivational Banners */}
      <div className="space-y-4">
        <Alert className={cn(
          "border-l-4",
          motivationalMessage.type === "success" && "border-l-green-500 bg-green-50 border-green-200",
          motivationalMessage.type === "warning" && "border-l-yellow-500 bg-yellow-50 border-yellow-200",
          motivationalMessage.type === "info" && "border-l-blue-500 bg-blue-50 border-blue-200"
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

        {streakMessage && (
          <Alert className="border-l-4 border-l-orange-500 bg-orange-50 border-orange-200">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-orange-100 text-orange-600">
                <Flame className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-medium">{streakMessage.title}</h4>
                <AlertDescription className="mt-1">
                  {streakMessage.message}
                </AlertDescription>
              </div>
            </div>
          </Alert>
        )}
      </div>

      {/* Personal Overview Card */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground">Personal Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row items-start lg:items-center space-y-4 lg:space-y-0 lg:space-x-6">
            {/* Profile Section */}
            <div className="flex items-center space-x-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={currentEmployee.avatar} />
                <AvatarFallback className="text-lg">
                  {currentEmployee.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-bold text-foreground">{currentEmployee.name}</h3>
                <p className="text-muted-foreground">{currentEmployee.role}</p>
                <p className="text-sm text-muted-foreground">{currentEmployee.department}</p>
                <div className="flex items-center space-x-2 mt-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Joined {new Date(currentEmployee.joinDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            <Separator orientation="vertical" className="hidden lg:block h-20" />

            {/* Commission Plan */}
            <div className="flex-1 lg:max-w-sm">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <h4 className="font-medium text-foreground mb-2 flex items-center">
                  <DollarSign className="h-4 w-4 mr-2 text-primary" />
                  Commission Plan
                </h4>
                <p className="text-sm text-muted-foreground mb-2">
                  {currentEmployee.commissionPlan.description}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Current Rate</span>
                  <Badge variant="outline" className="text-primary border-primary">
                    {currentEmployee.commissionPlan.rate}%
                  </Badge>
                </div>
              </div>
            </div>

            {/* Ranking */}
            <div className="flex-1 lg:max-w-sm">
              <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                <h4 className="font-medium text-foreground mb-2 flex items-center">
                  <Trophy className="h-4 w-4 mr-2 text-secondary" />
                  Current Ranking
                </h4>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-foreground">
                      #{currentEmployee.ranking.position}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      out of {currentEmployee.ranking.totalStaff} {currentEmployee.ranking.category}
                    </p>
                  </div>
                  <Badge variant="default" className="bg-green-500">
                    <ArrowUp className="h-3 w-3 mr-1" />
                    {currentEmployee.ranking.improvement}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Target Progress */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground flex items-center">
            <Target className="h-6 w-6 mr-3 text-primary" />
            Revenue Target Progress
          </CardTitle>
          <CardDescription>Your monthly revenue target and current achievement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Circular Progress */}
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
                    stroke={currentEmployee.currentMonth.percentage >= 75 ? COLORS.success : 
                           currentEmployee.currentMonth.percentage >= 50 ? COLORS.warning : COLORS.error}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={`${currentEmployee.currentMonth.percentage * 2.51} 251`}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">
                    {currentEmployee.currentMonth.percentage}%
                  </span>
                  <span className="text-sm text-muted-foreground">Complete</span>
                </div>
              </div>
            </div>

            {/* Target Details */}
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Target</span>
                  <span className="font-bold text-foreground">
                    AED {currentEmployee.currentMonth.target.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Achieved</span>
                  <span className="font-bold text-primary">
                    AED {currentEmployee.currentMonth.achieved.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Remaining</span>
                  <span className="font-bold text-error">
                    AED {(currentEmployee.currentMonth.target - currentEmployee.currentMonth.achieved).toLocaleString()}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Days Left</span>
                  <Badge variant="outline">{currentEmployee.currentMonth.daysLeft} days</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Daily Required</span>
                  <span className="font-medium text-warning">
                    AED {currentEmployee.currentMonth.dailyRequired.toLocaleString()}
                  </span>
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
                    <span className="text-sm text-muted-foreground">Current Bonus</span>
                    <span className="font-bold text-success">
                      AED {currentEmployee.currentMonth.commission.toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Potential Bonus</span>
                    <span className="font-bold text-warning">
                      AED {currentEmployee.currentMonth.projectedCommission.toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    If target fully achieved
                  </p>
                </div>
                <div className="text-xs text-muted-foreground">
                  💡 {currentEmployee.commissionPlan.description}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Unit Targets */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground flex items-center">
            <Activity className="h-6 w-6 mr-3 text-secondary" />
            Unit Targets
          </CardTitle>
          <CardDescription>Service-specific targets and achievement progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {currentEmployee.unitTargets.map((unit) => (
              <div key={unit.id} className="p-4 rounded-lg border border-border/50 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{unit.icon}</span>
                    <div>
                      <h4 className="font-medium text-foreground">{unit.service}</h4>
                      <p className="text-sm text-muted-foreground">
                        {unit.achieved}/{unit.target} units
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-foreground">{unit.percentage}%</span>
                    <Badge className={cn("ml-2", getStatusColor(unit.status))}>
                      {unit.status === "completed" ? (
                        <>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Done ✅
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 mr-1" />
                          In Progress
                        </>
                      )}
                    </Badge>
                  </div>
                </div>
                <Progress 
                  value={unit.percentage} 
                  className="h-3"
                  style={{
                    '--progress-background': getProgressColor(unit.percentage)
                  } as React.CSSProperties}
                />
                <div className="mt-2 text-xs text-muted-foreground">
                  {unit.percentage === 100 ? "🎉 Target achieved!" : 
                   `${unit.target - unit.achieved} more units needed`}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analytics & Comparisons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Performance Trend */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground flex items-center">
              <LineChart className="h-5 w-5 mr-2 text-primary" />
              Weekly Performance
            </CardTitle>
            <CardDescription>Daily revenue vs target comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsBarChart data={currentEmployee.weeklyProgress}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="day" stroke="#666" />
                <YAxis stroke="#666" />
                <Tooltip 
                  formatter={(value: number) => [`AED ${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Bar dataKey="target" fill={COLORS.muted} name="Target" />
                <Bar dataKey="revenue" fill={COLORS.primary} name="Actual" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leaderboard Comparison */}
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-foreground flex items-center">
              <Trophy className="h-5 w-5 mr-2 text-secondary" />
              Institution Leaderboard
            </CardTitle>
            <CardDescription>Your ranking among all staff members</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {institutionLeaderboard.map((staff, index) => (
                <div 
                  key={index} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    staff.name === currentEmployee.name ? "bg-primary/5 border-primary/20" : "border-border/50"
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 && "bg-yellow-100 text-yellow-700",
                      index === 1 && "bg-gray-100 text-gray-700", 
                      index === 2 && "bg-orange-100 text-orange-700",
                      index > 2 && "bg-muted text-muted-foreground"
                    )}>
                      {staff.position}
                    </div>
                    <div>
                      <p className={cn(
                        "font-medium",
                        staff.name === currentEmployee.name ? "text-primary" : "text-foreground"
                      )}>
                        {staff.name === currentEmployee.name ? "You" : staff.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{staff.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-foreground">{staff.achievement}%</span>
                    {index === 0 && <Crown className="h-4 w-4 text-yellow-500 ml-1 inline" />}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Breakdown */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground flex items-center">
            <PieChart className="h-6 w-6 mr-3 text-secondary" />
            Sales Breakdown
          </CardTitle>
          <CardDescription>Revenue distribution across different categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Categories List */}
            <div className="space-y-4">
              {currentEmployee.salesBreakdown.map((category, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                  <div>
                    <p className="font-medium text-foreground">{category.category}</p>
                    <p className="text-sm text-muted-foreground">{category.percentage}% of total</p>
                  </div>
                  <span className="font-bold text-foreground">
                    AED {category.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            {/* Pie Chart */}
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <RechartsPieChart>
                  <Pie
                    data={currentEmployee.salesBreakdown}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={5}
                    dataKey="amount"
                  >
                    {currentEmployee.salesBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={[COLORS.primary, COLORS.secondary, COLORS.success][index]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`AED ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Achievements */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl text-foreground flex items-center">
            <Award className="h-6 w-6 mr-3 text-warning" />
            Recent Achievements
          </CardTitle>
          <CardDescription>Your latest accomplishments and milestones</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {currentEmployee.achievements.map((achievement) => (
              <div key={achievement.id} className="p-4 rounded-lg border border-border/50 hover:shadow-sm transition-shadow">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1">
                    <h4 className="font-medium text-foreground">{achievement.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{achievement.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-muted-foreground">{achievement.date}</span>
                      <Badge variant="outline" className="text-xs">
                        {achievement.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

