import React, { useState, useMemo } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Switch } from "../components/ui/switch";
import { motion } from "motion/react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Download,
  Filter,
  Users,
  Clock,
  TrendingUp,
  Calendar as CalendarIcon,
  UserCheck,
  AlertCircle,
  Lightbulb,
  FileText,
  Mail,
  CheckCircle,
  Activity,
  Dumbbell,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Target,
  Zap,
  BarChart3,
  TrendingDown,
} from "lucide-react";
import { format, addDays, subDays } from "date-fns";
import { DateRange } from "react-day-picker";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../components/ui/breadcrumb";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

interface AttendanceReportsProps {
  onNavigate?: (section: string) => void;
}

// Sample data for daily attendance
const dailyAttendanceData = [
  { date: "Oct 1", attendance: 320, checkins: 285, missed: 35 },
  { date: "Oct 2", attendance: 345, checkins: 310, missed: 35 },
  { date: "Oct 3", attendance: 380, checkins: 355, missed: 25 },
  { date: "Oct 4", attendance: 420, checkins: 395, missed: 25 },
  { date: "Oct 5", attendance: 390, checkins: 360, missed: 30 },
  { date: "Oct 6", attendance: 410, checkins: 385, missed: 25 },
  { date: "Oct 7", attendance: 365, checkins: 340, missed: 25 },
];

// Class type attendance data
const classTypeData = [
  { type: "Gym", attendance: 850, checkins: 780, percentage: 92 },
  { type: "Zumba", attendance: 420, checkins: 395, percentage: 94 },
  { type: "Martial Arts", attendance: 320, checkins: 285, percentage: 89 },
  { type: "Personal Training", attendance: 560, checkins: 545, percentage: 97 },
  { type: "Yoga", attendance: 380, checkins: 360, percentage: 95 },
];

// Trainer performance data
const trainerData = [
  { name: "Sarah Ahmed", sessions: 45, avgAttendance: 92, noShowRate: 5, retention: 94 },
  { name: "Mike Johnson", sessions: 38, avgAttendance: 89, noShowRate: 7, retention: 91 },
  { name: "Fatima Ali", sessions: 52, avgAttendance: 95, noShowRate: 3, retention: 96 },
  { name: "Ahmed Hassan", sessions: 41, avgAttendance: 88, noShowRate: 8, retention: 89 },
];

// Peak hours data
const peakHoursData = [
  { hour: "6am", Mon: 45, Tue: 48, Wed: 42, Thu: 50, Fri: 46, Sat: 35, Sun: 20 },
  { hour: "9am", Mon: 65, Tue: 68, Wed: 70, Thu: 72, Fri: 65, Sat: 55, Sun: 35 },
  { hour: "12pm", Mon: 40, Tue: 42, Wed: 38, Thu: 45, Fri: 40, Sat: 30, Sun: 25 },
  { hour: "3pm", Mon: 35, Tue: 38, Wed: 40, Thu: 42, Fri: 35, Sat: 28, Sun: 22 },
  { hour: "6pm", Mon: 95, Tue: 98, Wed: 100, Thu: 105, Fri: 90, Sat: 70, Sun: 40 },
  { hour: "9pm", Mon: 55, Tue: 58, Wed: 60, Thu: 62, Fri: 50, Sat: 35, Sun: 20 },
];

// Facility utilization data
const facilityData = [
  { name: "Cardio Area", value: 35, color: "#0047AB" },
  { name: "Weight Area", value: 30, color: "#00c5cb" },
  { name: "Pool", value: 15, color: "#4CAF50" },
  { name: "Studio", value: 20, color: "#FFC107" },
];

// Member consistency data
const topConsistentMembers = [
  { name: "John Smith", attendance: 98, streak: 45 },
  { name: "Emma Wilson", attendance: 96, streak: 38 },
  { name: "Omar Abdullah", attendance: 95, streak: 42 },
  { name: "Lisa Chen", attendance: 94, streak: 35 },
  { name: "David Lee", attendance: 93, streak: 40 },
];

const irregularMembers = [
  { name: "Tom Brown", attendance: 45, missedDays: 12 },
  { name: "Maria Garcia", attendance: 52, missedDays: 10 },
  { name: "Ali Hassan", attendance: 58, missedDays: 9 },
  { name: "Sophie Martin", attendance: 61, missedDays: 8 },
  { name: "James Wilson", attendance: 65, missedDays: 7 },
];

// Member trends data (monthly consistency)
const memberTrendsData = [
  { month: "May", consistency: 78 },
  { month: "Jun", consistency: 82 },
  { month: "Jul", consistency: 80 },
  { month: "Aug", consistency: 85 },
  { month: "Sep", consistency: 88 },
  { month: "Oct", consistency: 86 },
];

// AI insights
const aiInsights = [
  {
    id: 1,
    type: "success",
    title: "Peak Engagement Detected",
    message: "Your facility sees peak engagement on Thursdays — schedule group classes for better retention.",
    icon: TrendingUp,
  },
  {
    id: 2,
    type: "warning",
    title: "Morning Slot Decline",
    message: "Average attendance dropped 10% in the morning slot; consider push notifications or early-bird promotions.",
    icon: AlertCircle,
  },
  {
    id: 3,
    type: "info",
    title: "Off-Peak Opportunity",
    message: "Least busy slot: Friday mornings. Consider offering promotional sessions during off-peak hours.",
    icon: Lightbulb,
  },
];

export function AttendanceReports({ onNavigate }: AttendanceReportsProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [filterType, setFilterType] = useState("all");
  const [selectedTrainer, setSelectedTrainer] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");
  const [automatedReports, setAutomatedReports] = useState(false);

  const handleExportPDF = () => {
    toast.success("Exporting Report", {
      description: "Your PDF report is being generated and will download shortly.",
    });
  };

  const handleExportExcel = () => {
    toast.success("Exporting Data", {
      description: "Your Excel file is being generated and will download shortly.",
    });
  };

  const handleScheduleReports = () => {
    if (automatedReports) {
      toast.success("Automated Reports Enabled", {
        description: "You will receive weekly attendance reports via email every Monday.",
      });
    } else {
      toast.info("Automated Reports Disabled", {
        description: "Automated report delivery has been turned off.",
      });
    }
  };

  // Calculate summary statistics
  const totalAttendance = useMemo(() => {
    return dailyAttendanceData.reduce((sum, day) => sum + day.attendance, 0);
  }, []);

  const avgDailyCheckins = useMemo(() => {
    const total = dailyAttendanceData.reduce((sum, day) => sum + day.checkins, 0);
    return Math.round(total / dailyAttendanceData.length);
  }, []);

  const attendanceRate = useMemo(() => {
    const totalCheckins = dailyAttendanceData.reduce((sum, day) => sum + day.checkins, 0);
    const totalExpected = dailyAttendanceData.reduce((sum, day) => sum + day.attendance, 0);
    return Math.round((totalCheckins / totalExpected) * 100);
  }, []);

  const absentMembers = useMemo(() => {
    return dailyAttendanceData.reduce((sum, day) => sum + day.missed, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gymbios-main-bg">
      {/* Gradient Header */}
      <div className="bg-gradient-primary text-white py-8 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb className="mb-4">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => onNavigate?.("community")}
                  className="cursor-pointer text-white/80 hover:text-white"
                >
                  Community
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbItem>
                <BreadcrumbLink
                  onClick={() => onNavigate?.("attendance")}
                  className="cursor-pointer text-white/80 hover:text-white"
                >
                  Attendance
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator className="text-white/60" />
              <BreadcrumbItem>
                <BreadcrumbPage className="text-white font-medium">
                  Reports
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Attendance Reports</h1>
              <p className="text-white/90">
                Generate detailed attendance reports and advanced analytics
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "LLL dd")} - {format(dateRange.to, "LLL dd")}
                        </>
                      ) : (
                        format(dateRange.from, "LLL dd, y")
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[180px] bg-white/10 text-white border-white/20">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  <SelectItem value="trainer">Specific Trainer</SelectItem>
                  <SelectItem value="class">Specific Class</SelectItem>
                  <SelectItem value="branch">Branch</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleExportPDF}
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Export PDF
              </Button>

              <Button
                onClick={handleExportExcel}
                className="bg-white hover:bg-white/90 text-primary"
              >
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* KPI Summary Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* Total Attendance */}
          <Card className="border-primary/10 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <Badge className="bg-green-100 text-green-800 border-0">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12%
                </Badge>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-primary mb-1">420</h3>
                <p className="text-sm text-gray-600">Total Members Checked-In</p>
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={40}>
                    <LineChart data={dailyAttendanceData}>
                      <Line
                        type="monotone"
                        dataKey="attendance"
                        stroke="#0047AB"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Check-in Time */}
          <Card className="border-primary/10 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <Badge className="bg-green-100 text-green-800 border-0">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +5%
                </Badge>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-primary mb-1">7:42 AM</h3>
                <p className="text-sm text-gray-600">Average Check-in Time</p>
                <div className="mt-3 flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm text-gray-600">Peak: 6-8 PM</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Rate */}
          <Card className="border-primary/10 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <Activity className="h-6 w-6 text-primary" />
                </div>
                <Badge className="bg-yellow-100 text-yellow-800 border-0">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +8%
                </Badge>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-primary mb-1">{attendanceRate}%</h3>
                <p className="text-sm text-gray-600">Attendance Rate</p>
                <div className="mt-3">
                  <div className="relative w-24 h-24 mx-auto">
                    <svg className="transform -rotate-90" width="96" height="96">
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="#E5E7EB"
                        strokeWidth="8"
                        fill="none"
                      />
                      <circle
                        cx="48"
                        cy="48"
                        r="40"
                        stroke="url(#progressGradient)"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(attendanceRate / 100) * 251} 251`}
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
                      <span className="text-lg font-bold text-primary">{attendanceRate}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Peak Facility Hours */}
          <Card className="border-primary/10 bg-white shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-light p-3 rounded-lg">
                  <Dumbbell className="h-6 w-6 text-primary" />
                </div>
                <Badge className="bg-blue-100 text-blue-800 border-0">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Optimal
                </Badge>
              </div>
              <div>
                <h3 className="text-3xl font-bold text-primary mb-1">6–8 PM</h3>
                <p className="text-sm text-gray-600">Peak Facility Hours</p>
                <div className="mt-3">
                  <ResponsiveContainer width="100%" height={40}>
                    <BarChart data={peakHoursData.slice(0, 4)}>
                      <Bar dataKey="Mon" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0047AB" />
                          <stop offset="100%" stopColor="#00c5cb" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Analytics Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card className="border-primary/10 shadow-lg">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader className="border-b border-primary/10">
                <TabsList className="grid grid-cols-2 lg:grid-cols-5 w-full bg-gradient-light">
                  <TabsTrigger
                    value="overview"
                    className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger
                    value="member-trends"
                    className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Member Trends
                  </TabsTrigger>
                  <TabsTrigger
                    value="trainer-reports"
                    className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Trainer Reports
                  </TabsTrigger>
                  <TabsTrigger
                    value="peak-hours"
                    className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Peak Hours
                  </TabsTrigger>
                  <TabsTrigger
                    value="facility"
                    className="data-[state=active]:bg-gradient-primary data-[state=active]:text-white"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Facility
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="p-6">
                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-4">
                      Daily Attendance Over Time
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={dailyAttendanceData}>
                        <defs>
                          <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0047AB" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#00c5cb" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="date" stroke="#555555" />
                        <YAxis stroke="#555555" />
                        <Tooltip
                          contentStyle={{
                            background: "white",
                            border: "1px solid #0047AB20",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="checkins"
                          stroke="#0047AB"
                          fill="url(#areaGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-4">
                      Attendance by Class Type
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={classTypeData}>
                        <defs>
                          <linearGradient id="classBarGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0047AB" />
                            <stop offset="100%" stopColor="#00c5cb" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="type" stroke="#555555" />
                        <YAxis stroke="#555555" />
                        <Tooltip
                          contentStyle={{
                            background: "white",
                            border: "1px solid #0047AB20",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="checkins" fill="url(#classBarGradient)" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-4">
                      Summary Table
                    </h3>
                    <div className="overflow-x-auto rounded-lg border border-primary/10">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-light">
                            <TableHead className="text-primary">Date</TableHead>
                            <TableHead className="text-primary">Total Members</TableHead>
                            <TableHead className="text-primary">Check-ins</TableHead>
                            <TableHead className="text-primary">Missed</TableHead>
                            <TableHead className="text-primary">% Attendance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dailyAttendanceData.map((day, index) => (
                            <TableRow key={index} className="hover:bg-gray-50">
                              <TableCell className="font-medium">{day.date}</TableCell>
                              <TableCell>{day.attendance}</TableCell>
                              <TableCell className="text-green-600 font-semibold">
                                {day.checkins}
                              </TableCell>
                              <TableCell className="text-red-600">{day.missed}</TableCell>
                              <TableCell>
                                <Badge
                                  className={
                                    ((day.checkins / day.attendance) * 100) >= 90
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }
                                >
                                  {Math.round((day.checkins / day.attendance) * 100)}%
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>

                {/* Member Trends Tab */}
                <TabsContent value="member-trends" className="space-y-6 mt-0">
                  {/* Filters */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gradient-light rounded-lg">
                    <div>
                      <Label htmlFor="member-name" className="text-primary mb-2 block">
                        Member Name
                      </Label>
                      <Input id="member-name" placeholder="Search member..." />
                    </div>
                    <div>
                      <Label htmlFor="membership-plan" className="text-primary mb-2 block">
                        Membership Plan
                      </Label>
                      <Select>
                        <SelectTrigger id="membership-plan">
                          <SelectValue placeholder="Select plan" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Plans</SelectItem>
                          <SelectItem value="premium">Premium</SelectItem>
                          <SelectItem value="standard">Standard</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="trainer-filter" className="text-primary mb-2 block">
                        Trainer
                      </Label>
                      <Select>
                        <SelectTrigger id="trainer-filter">
                          <SelectValue placeholder="Select trainer" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Trainers</SelectItem>
                          <SelectItem value="sarah">Sarah Ahmed</SelectItem>
                          <SelectItem value="mike">Mike Johnson</SelectItem>
                          <SelectItem value="fatima">Fatima Ali</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Attendance Consistency Graph */}
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-4">
                      Attendance Consistency (Month-to-Month)
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={memberTrendsData}>
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
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="consistency"
                          stroke="url(#lineGradient)"
                          strokeWidth={3}
                          dot={{ fill: "#0047AB", r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-primary flex items-center">
                          <TrendingUp className="h-5 w-5 mr-2" />
                          Top 5 Most Consistent Members
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {topConsistentMembers.map((member, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="bg-gradient-light p-2 rounded-full">
                                    <User className="h-4 w-4 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{member.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {member.streak} day streak 🔥
                                    </p>
                                  </div>
                                </div>
                                <Badge className="bg-green-100 text-green-800">
                                  {member.attendance}%
                                </Badge>
                              </div>
                              <Progress value={member.attendance} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-primary flex items-center">
                          <AlertCircle className="h-5 w-5 mr-2" />
                          Top 5 Irregular Members
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {irregularMembers.map((member, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="bg-red-50 p-2 rounded-full">
                                    <User className="h-4 w-4 text-red-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{member.name}</p>
                                    <p className="text-xs text-gray-500">
                                      {member.missedDays} missed days
                                    </p>
                                  </div>
                                </div>
                                <Badge className="bg-red-100 text-red-800">
                                  {member.attendance}%
                                </Badge>
                              </div>
                              <Progress value={member.attendance} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Trainer Reports Tab */}
                <TabsContent value="trainer-reports" className="space-y-6 mt-0">
                  <div className="mb-4">
                    <Label htmlFor="trainer-select" className="text-primary mb-2 block">
                      Select Trainer
                    </Label>
                    <Select value={selectedTrainer} onValueChange={setSelectedTrainer}>
                      <SelectTrigger className="w-[300px] border-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Trainers</SelectItem>
                        <SelectItem value="sarah">Sarah Ahmed</SelectItem>
                        <SelectItem value="mike">Mike Johnson</SelectItem>
                        <SelectItem value="fatima">Fatima Ali</SelectItem>
                        <SelectItem value="ahmed">Ahmed Hassan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-primary/10">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gradient-light">
                          <TableHead className="text-primary">Trainer Name</TableHead>
                          <TableHead className="text-primary">Total Sessions</TableHead>
                          <TableHead className="text-primary">Avg. Attendance</TableHead>
                          <TableHead className="text-primary">No-Show Rate</TableHead>
                          <TableHead className="text-primary">Retention Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trainerData.map((trainer, index) => (
                          <TableRow key={index} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <div className="bg-gradient-light p-2 rounded-full">
                                  <User className="h-4 w-4 text-primary" />
                                </div>
                                <span className="font-medium">{trainer.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">{trainer.sessions}</TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  trainer.avgAttendance >= 90
                                    ? "bg-green-100 text-green-800"
                                    : "bg-yellow-100 text-yellow-800"
                                }
                              >
                                {trainer.avgAttendance}%
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span
                                className={
                                  trainer.noShowRate <= 5
                                    ? "text-green-600 font-semibold"
                                    : "text-yellow-600 font-semibold"
                                }
                              >
                                {trainer.noShowRate}%
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Progress value={trainer.retention} className="h-2 flex-1" />
                                <span className="text-sm font-medium">{trainer.retention}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Peak Hours Tab */}
                <TabsContent value="peak-hours" className="space-y-6 mt-0">
                  <div>
                    <h3 className="text-lg font-semibold text-primary mb-4">
                      Attendance Distribution by Hour
                    </h3>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={peakHoursData}>
                        <defs>
                          <linearGradient id="peakGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#0047AB" />
                            <stop offset="100%" stopColor="#00c5cb" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="hour" stroke="#555555" />
                        <YAxis stroke="#555555" />
                        <Tooltip
                          contentStyle={{
                            background: "white",
                            border: "1px solid #0047AB20",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="Mon" fill="url(#peakGradient)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Wed" fill="#00c5cb" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Fri" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-primary/20 bg-green-50">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-3">
                          <div className="bg-green-100 p-3 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-green-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-green-800 mb-1">Peak Traffic</h4>
                            <p className="text-sm text-green-700">
                              Highest traffic on Mon/Wed 6–8 PM
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/20 bg-blue-50">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-3">
                          <div className="bg-blue-100 p-3 rounded-lg">
                            <Lightbulb className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h4 className="font-semibold text-blue-800 mb-1">Off-Peak Hours</h4>
                            <p className="text-sm text-blue-700">
                              Least busy slot: Friday mornings
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Facility Utilization Tab */}
                <TabsContent value="facility" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold text-primary mb-4">
                        Facility Usage by Area
                      </h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={facilityData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {facilityData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-primary mb-4">
                        Area Breakdown
                      </h3>
                      {facilityData.map((area, index) => (
                        <div key={index} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: area.color }}
                              />
                              <span className="font-medium">{area.name}</span>
                            </div>
                            <span className="text-sm text-gray-600">{area.value}%</span>
                          </div>
                          <Progress value={area.value} className="h-2" />
                        </div>
                      ))}
                    </div>
                  </div>

                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-3">
                        <div className="bg-yellow-100 p-3 rounded-lg">
                          <AlertCircle className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-yellow-800 mb-1">
                            Capacity Alert
                          </h4>
                          <p className="text-sm text-yellow-700">
                            ⚠️ Yoga Studio reached 95% utilization on weekends. Consider adding
                            more sessions or expanding capacity.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </motion.div>

        {/* Insights & Recommendations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <Card className="border-primary/10 shadow-lg">
            <CardHeader>
              <CardTitle className="text-primary flex items-center space-x-2">
                <Lightbulb className="h-5 w-5" />
                <span>Insights & Recommendations</span>
              </CardTitle>
              <CardDescription>
                AI-driven suggestions based on attendance patterns
              </CardDescription>
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

        {/* Footer Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="border-primary/10 shadow-lg">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="flex items-center space-x-4">
                  <div className="bg-gradient-light p-3 rounded-lg">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-primary mb-1">
                      Schedule Automated Reports
                    </h4>
                    <p className="text-sm text-gray-600">
                      Receive weekly attendance reports via email every Monday
                    </p>
                  </div>
                  <Switch
                    checked={automatedReports}
                    onCheckedChange={(checked) => {
                      setAutomatedReports(checked);
                      handleScheduleReports();
                    }}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="outline"
                    className="border-primary/30"
                    onClick={handleExportPDF}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Detailed Report
                  </Button>
                  <Button className="btn-primary" onClick={handleExportExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default AttendanceReports;

