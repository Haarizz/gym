import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Flame,
  Target,
  Award,
  Activity,
  Dumbbell,
  Heart,
  Users,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  LineChart,
  PieChart,
  Zap,
  Trophy,
  Star,
  ChevronRight,
  Plus,
  Edit,
  Camera,
  Timer,
  Weight,
  Ruler,
  CircleDot,
  MapPin,
  User,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar as CalendarIcon,
  Sun,
  Moon,
  Sunset,
  ChevronLeft,
  ChevronDown,
  Info,
  Sparkles,
  Medal,
  Flag
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { LineChart as RechartsLineChart, Line, BarChart as RechartsBarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';

// Mock data
const memberData = {
  name: "Sarah Johnson",
  photo: null,
  memberId: "GYM-2024-1234",
  currentStreak: 5,
  bestStreak: 12,
  monthlyAttendance: 12,
  monthlyGoal: 16,
  goalProgress: 75
};

// Attendance data for charts
const weeklyVisitsData = [
  { week: 'Week 1', visits: 3, minutes: 180, calories: 450 },
  { week: 'Week 2', visits: 4, minutes: 240, calories: 600 },
  { week: 'Week 3', visits: 2, minutes: 120, calories: 300 },
  { week: 'Week 4', visits: 3, minutes: 210, calories: 525 },
];

const monthlyVisitsData = [
  { month: 'Sep', visits: 12, minutes: 720, calories: 1800 },
  { month: 'Oct', visits: 14, minutes: 840, calories: 2100 },
  { month: 'Nov', visits: 11, minutes: 660, calories: 1650 },
  { month: 'Dec', visits: 13, minutes: 780, calories: 1950 },
  { month: 'Jan', visits: 12, minutes: 720, calories: 1800 },
];

// Weight trend data
const weightTrendData = [
  { date: '1 Jan', weight: 72.5, target: 68 },
  { date: '7 Jan', weight: 71.8, target: 68 },
  { date: '14 Jan', weight: 71.2, target: 68 },
  { date: '21 Jan', weight: 70.5, target: 68 },
  { date: '28 Jan', weight: 70.1, target: 68 },
];

// Workout distribution data
const workoutTypeData = [
  { name: 'Strength', value: 45, color: '#327F74' },
  { name: 'Cardio', value: 30, color: '#E63946' },
  { name: 'Mobility', value: 15, color: '#FFA500' },
  { name: 'Classes', value: 10, color: '#3B82F6' },
];

// Weekday attendance data
const weekdayData = [
  { day: 'Mon', visits: 5 },
  { day: 'Tue', visits: 3 },
  { day: 'Wed', visits: 6 },
  { day: 'Thu', visits: 2 },
  { day: 'Fri', visits: 4 },
  { day: 'Sat', visits: 3 },
  { day: 'Sun', visits: 1 },
];

// Mock attendance history
const attendanceHistory = [
  {
    id: 1,
    date: '2026-01-20',
    checkIn: '07:30 AM',
    checkOut: '08:45 AM',
    duration: '1h 15m',
    source: 'Gate'
  },
  {
    id: 2,
    date: '2026-01-19',
    checkIn: '06:00 PM',
    checkOut: '07:30 PM',
    duration: '1h 30m',
    source: 'Front Desk'
  },
  {
    id: 3,
    date: '2026-01-18',
    checkIn: '07:15 AM',
    checkOut: '08:30 AM',
    duration: '1h 15m',
    source: 'Class'
  },
  {
    id: 4,
    date: '2026-01-16',
    checkIn: '06:30 PM',
    checkOut: '08:00 PM',
    duration: '1h 30m',
    source: 'Gate'
  },
  {
    id: 5,
    date: '2026-01-15',
    checkIn: '07:00 AM',
    checkOut: '08:15 AM',
    duration: '1h 15m',
    source: 'Gate'
  },
];

// Mock workout logs
const workoutLogs = [
  {
    id: 1,
    name: 'Upper Body Strength',
    date: '2026-01-20',
    duration: 60,
    calories: 380,
    sets: 15,
    type: 'Strength',
    notes: 'Increased weight on bench press'
  },
  {
    id: 2,
    name: 'HIIT Cardio',
    date: '2026-01-19',
    duration: 45,
    calories: 420,
    sets: 0,
    type: 'Cardio',
    notes: 'New personal best on treadmill'
  },
  {
    id: 3,
    name: 'Leg Day',
    date: '2026-01-18',
    duration: 75,
    calories: 450,
    sets: 18,
    type: 'Strength',
    notes: 'Squats felt strong today'
  },
  {
    id: 4,
    name: 'Yoga & Flexibility',
    date: '2026-01-16',
    duration: 60,
    calories: 180,
    sets: 0,
    type: 'Mobility',
    notes: 'Good recovery session'
  },
  {
    id: 5,
    name: 'Full Body Circuit',
    date: '2026-01-15',
    duration: 50,
    calories: 400,
    sets: 12,
    type: 'Strength',
    notes: 'Completed all circuits'
  },
];

// Mock class history
const classHistory = [
  {
    id: 1,
    name: 'Spin Class',
    trainer: 'Mike Thompson',
    date: '2026-01-18',
    time: '07:00 AM',
    status: 'Attended'
  },
  {
    id: 2,
    name: 'Yoga Flow',
    trainer: 'Emma Wilson',
    date: '2026-01-16',
    time: '06:00 PM',
    status: 'Attended'
  },
  {
    id: 3,
    name: 'HIIT Bootcamp',
    trainer: 'John Davis',
    date: '2026-01-14',
    time: '07:30 AM',
    status: 'Attended'
  },
  {
    id: 4,
    name: 'Power Yoga',
    trainer: 'Emma Wilson',
    date: '2026-01-12',
    time: '06:30 PM',
    status: 'Attended'
  },
];

// Mock measurements
const measurements = {
  weight: { current: 70.1, previous: 72.5, unit: 'kg', change: -2.4 },
  bmi: { current: 24.2, previous: 25.1, unit: '', change: -0.9 },
  bodyFat: { current: 18.5, previous: 21.2, unit: '%', change: -2.7 },
  chest: { current: 98, previous: 102, unit: 'cm', change: -4 },
  waist: { current: 82, previous: 87, unit: 'cm', change: -5 },
  hips: { current: 95, previous: 98, unit: 'cm', change: -3 },
  arms: { current: 32, previous: 31, unit: 'cm', change: 1 },
  thighs: { current: 56, previous: 58, unit: 'cm', change: -2 },
};

// Mock challenges
const activeChallenges = [
  {
    id: 1,
    name: '30-Day Consistency Challenge',
    progress: 18,
    goal: 30,
    type: 'Attendance',
    reward: '500 Points',
    endsIn: '12 days'
  },
  {
    id: 2,
    name: 'Weight Loss Journey',
    progress: 2.4,
    goal: 5,
    type: 'Weight',
    reward: 'Free PT Session',
    endsIn: '45 days'
  },
];

const badges = [
  { id: 1, name: '7-Day Streak', icon: '🔥', earned: true },
  { id: 2, name: 'Early Bird', icon: '🌅', earned: true },
  { id: 3, name: 'Class Regular', icon: '👥', earned: true },
  { id: 4, name: 'Consistency King', icon: '👑', earned: false },
  { id: 5, name: 'Goal Crusher', icon: '🎯', earned: false },
];

interface MyStatsProps {
  onNavigate?: (section: string) => void;
}

export function MyStats({ onNavigate }: MyStatsProps = {}) {
  const [mainTab, setMainTab] = useState<'overview' | 'attendance' | 'body' | 'workouts' | 'classes' | 'challenges'>('overview');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | '3months' | 'custom'>('month');
  const [chartMetric, setChartMetric] = useState<'visits' | 'minutes' | 'calories'>('visits');
  const [showGoalsSheet, setShowGoalsSheet] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showMeasurementSheet, setShowMeasurementSheet] = useState(false);

  // Generate calendar heatmap data (simplified for January 2026)
  const generateCalendarData = () => {
    const daysInMonth = 31;
    const calendar = [];
    const attendedDates = [1, 3, 5, 8, 10, 12, 15, 16, 18, 19, 20];
    
    for (let i = 1; i <= daysInMonth; i++) {
      calendar.push({
        day: i,
        attended: attendedDates.includes(i),
        date: `2026-01-${i.toString().padStart(2, '0')}`
      });
    }
    return calendar;
  };

  const calendarData = generateCalendarData();

  const getMetricValue = (data: any) => {
    switch (chartMetric) {
      case 'visits':
        return data.visits;
      case 'minutes':
        return data.minutes;
      case 'calories':
        return data.calories;
      default:
        return data.visits;
    }
  };

  const getMetricLabel = () => {
    switch (chartMetric) {
      case 'visits':
        return 'Visits';
      case 'minutes':
        return 'Minutes';
      case 'calories':
        return 'Calories';
      default:
        return 'Visits';
    }
  };

  const getTimeIcon = (time: string) => {
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 5 && hour < 12) return <Sun className="h-4 w-4 text-orange-500" />;
    if (hour >= 12 && hour < 17) return <Sunset className="h-4 w-4 text-orange-400" />;
    return <Moon className="h-4 w-4 text-blue-500" />;
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <ArrowUp className="h-4 w-4 text-red-500" />;
    if (change < 0) return <ArrowDown className="h-4 w-4 text-green-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };

  const handleDownloadReport = () => {
    toast.success('Generating Report', {
      description: 'Your stats report is being prepared...',
      duration: 3000,
    });
  };

  const handleShareProgress = () => {
    toast.success('Sharing Progress', {
      description: 'Opening share dialog...',
      duration: 2000,
    });
  };

  const handleSetGoal = () => {
    setShowGoalsSheet(false);
    toast.success('Goal Updated!', {
      description: 'Your fitness goal has been set',
      duration: 3000,
    });
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 border-4" style={{ borderColor: '#327F74' }}>
              <AvatarImage src={memberData.photo} />
              <AvatarFallback className="text-xl bg-[#327F74] text-white">
                {memberData.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-[#1E293B]">My Stats</h1>
              <p className="text-gray-600">Track your fitness journey</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Date Range Selector */}
            <div className="flex gap-2">
              {(['today', 'week', 'month', '3months'] as const).map((range) => (
                <Badge
                  key={range}
                  variant={dateRange === range ? 'default' : 'outline'}
                  className="cursor-pointer capitalize"
                  style={dateRange === range ? { backgroundColor: '#327F74' } : {}}
                  onClick={() => setDateRange(range)}
                >
                  {range === '3months' ? '3 Months' : range}
                </Badge>
              ))}
            </div>

            {/* Quick Actions */}
            <Button variant="outline" size="sm" onClick={handleDownloadReport}>
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={handleShareProgress}>
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={(val) => setMainTab(val as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="body">Body</TabsTrigger>
            <TabsTrigger value="workouts">Workouts</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="challenges">Challenges</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="h-5 w-5 text-[#327F74]" />
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold">12</p>
                  <p className="text-xs text-gray-600">Check-ins</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Timer className="h-5 w-5 text-[#327F74]" />
                  </div>
                  <p className="text-2xl font-bold">720</p>
                  <p className="text-xs text-gray-600">Workout Mins</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Zap className="h-5 w-5 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold">1,800</p>
                  <p className="text-xs text-gray-600">Calories</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-5 w-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold">4</p>
                  <p className="text-xs text-gray-600">Classes</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Dumbbell className="h-5 w-5 text-purple-500" />
                  </div>
                  <p className="text-2xl font-bold">2/2</p>
                  <p className="text-xs text-gray-600">PT Sessions</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-red-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Flame className="h-5 w-5 text-orange-600" />
                    <Badge className="bg-orange-600 text-white">New!</Badge>
                  </div>
                  <p className="text-2xl font-bold">5 🔥</p>
                  <p className="text-xs text-gray-600">Day Streak</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress Rings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Attendance Goal</CardTitle>
                  <CardDescription>Monthly visits target</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="relative w-32 h-32 mb-4">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#E5E7EB"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#327F74"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - memberData.goalProgress / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-2xl font-bold">{memberData.monthlyAttendance}</p>
                      <p className="text-xs text-gray-600">of {memberData.monthlyGoal}</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-[#327F74]">{memberData.goalProgress}% Complete</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowGoalsSheet(true)}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Adjust Goal
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Weight Goal</CardTitle>
                  <CardDescription>Target weight progress</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="relative w-32 h-32 mb-4">
                    <svg className="w-32 h-32 transform -rotate-90">
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#E5E7EB"
                        strokeWidth="12"
                        fill="none"
                      />
                      <circle
                        cx="64"
                        cy="64"
                        r="56"
                        stroke="#E63946"
                        strokeWidth="12"
                        fill="none"
                        strokeDasharray={`${2 * Math.PI * 56}`}
                        strokeDashoffset={`${2 * Math.PI * 56 * (1 - 48 / 100)}`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className="text-2xl font-bold">-2.4kg</p>
                      <p className="text-xs text-gray-600">of -5kg</p>
                    </div>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: '#E63946' }}>48% Complete</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setShowGoalsSheet(true)}
                  >
                    <Weight className="h-4 w-4 mr-2" />
                    Update Goal
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Current Streak</CardTitle>
                  <CardDescription>Keep the momentum going</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center">
                  <div className="text-center mb-4">
                    <div className="text-6xl mb-2">🔥</div>
                    <p className="text-3xl font-bold text-orange-600">{memberData.currentStreak}</p>
                    <p className="text-sm text-gray-600">days</p>
                  </div>
                  <div className="text-center text-sm">
                    <p className="text-gray-600">Best Streak</p>
                    <p className="font-bold text-[#327F74]">{memberData.bestStreak} days</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Trend Chart */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Activity Trend</CardTitle>
                    <CardDescription>Your {dateRange} performance</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    {(['visits', 'minutes', 'calories'] as const).map((metric) => (
                      <Badge
                        key={metric}
                        variant={chartMetric === metric ? 'default' : 'outline'}
                        className="cursor-pointer capitalize"
                        style={chartMetric === metric ? { backgroundColor: '#327F74' } : {}}
                        onClick={() => setChartMetric(metric)}
                      >
                        {metric}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsBarChart data={dateRange === 'month' ? weeklyVisitsData : monthlyVisitsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey={dateRange === 'month' ? 'week' : 'month'} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey={chartMetric} fill="#327F74" radius={[8, 8, 0, 0]} />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-900 mb-1">Best Week</p>
                      <p className="text-sm text-blue-700">Week 2 with 4 check-ins and 240 minutes</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-purple-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-purple-900 mb-1">Peak Time</p>
                      <p className="text-sm text-purple-700">You visit most on Mon/Wed mornings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-semibold text-green-900 mb-1">Improvement</p>
                      <p className="text-sm text-green-700">Consistency up 18% vs last month</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ATTENDANCE TAB */}
          <TabsContent value="attendance" className="mt-6 space-y-6">
            {/* Calendar Heatmap */}
            <Card>
              <CardHeader>
                <CardTitle>Attendance Calendar</CardTitle>
                <CardDescription>January 2026 • {memberData.monthlyAttendance} visits this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm text-gray-600">Attended</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 rounded"></div>
                    <span className="text-sm text-gray-600">No Visit</span>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center text-xs font-semibold text-gray-600 pb-2">
                      {day}
                    </div>
                  ))}
                  {/* Empty cells for days before month starts (Jan 1, 2026 is Wednesday) */}
                  {[...Array(3)].map((_, i) => (
                    <div key={`empty-${i}`} />
                  ))}
                  {calendarData.map(day => (
                    <div
                      key={day.day}
                      className={`aspect-square rounded-lg flex items-center justify-center text-sm font-semibold cursor-pointer transition-all ${
                        day.attended
                          ? 'bg-green-500 text-white hover:bg-green-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      {day.day}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Attendance Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>By Weekday</CardTitle>
                  <CardDescription>Your preferred workout days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={250}>
                    <RechartsBarChart data={weekdayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="visits" fill="#327F74" radius={[8, 8, 0, 0]} />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>By Time Slot</CardTitle>
                  <CardDescription>Morning, afternoon, or evening</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sun className="h-5 w-5 text-orange-500" />
                          <span className="font-semibold">Morning (5 AM - 12 PM)</span>
                        </div>
                        <span className="font-bold text-[#327F74]">7</span>
                      </div>
                      <Progress value={58} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sunset className="h-5 w-5 text-orange-400" />
                          <span className="font-semibold">Afternoon (12 PM - 5 PM)</span>
                        </div>
                        <span className="font-bold text-[#327F74]">2</span>
                      </div>
                      <Progress value={17} className="h-2" />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Moon className="h-5 w-5 text-blue-500" />
                          <span className="font-semibold">Evening (5 PM - 11 PM)</span>
                        </div>
                        <span className="font-bold text-[#327F74]">3</span>
                      </div>
                      <Progress value={25} className="h-2" />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">Avg Session Duration</span>
                      <span className="font-bold text-[#327F74]">1h 20m</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Attendance History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Check-ins</CardTitle>
                <CardDescription>Your latest visits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {attendanceHistory.map(record => (
                    <Card key={record.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 rounded-lg">
                              <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-3 mb-1">
                                <p className="font-semibold">{new Date(record.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                                <Badge variant="outline">{record.source}</Badge>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  {getTimeIcon(record.checkIn)}
                                  {record.checkIn}
                                </span>
                                <span>→</span>
                                <span>{record.checkOut}</span>
                                <span className="flex items-center gap-1 font-semibold text-[#327F74]">
                                  <Timer className="h-4 w-4" />
                                  {record.duration}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* BODY & MEASUREMENTS TAB */}
          <TabsContent value="body" className="mt-6 space-y-6">
            {/* Current Snapshot */}
            <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Current Metrics</CardTitle>
                    <CardDescription>Last updated: Jan 20, 2026</CardDescription>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowMeasurementSheet(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Update
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="text-center">
                    <Weight className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <p className="text-3xl font-bold text-purple-900">{measurements.weight.current}</p>
                    <p className="text-sm text-gray-600">kg</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {getChangeIcon(measurements.weight.change)}
                      <span className="text-sm font-semibold text-green-600">
                        {Math.abs(measurements.weight.change)} kg
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <Activity className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <p className="text-3xl font-bold text-blue-900">{measurements.bmi.current}</p>
                    <p className="text-sm text-gray-600">BMI</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {getChangeIcon(measurements.bmi.change)}
                      <span className="text-sm font-semibold text-green-600">
                        {Math.abs(measurements.bmi.change)}
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <Heart className="h-8 w-8 mx-auto mb-2 text-red-600" />
                    <p className="text-3xl font-bold text-red-900">{measurements.bodyFat.current}</p>
                    <p className="text-sm text-gray-600">% Body Fat</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      {getChangeIcon(measurements.bodyFat.change)}
                      <span className="text-sm font-semibold text-green-600">
                        {Math.abs(measurements.bodyFat.change)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-center">
                    <Dumbbell className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p className="text-3xl font-bold text-green-900">68.5</p>
                    <p className="text-sm text-gray-600">kg Muscle</p>
                    <div className="flex items-center justify-center gap-1 mt-2">
                      <ArrowUp className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-semibold text-green-600">0.8 kg</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weight Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Weight Progress</CardTitle>
                <CardDescription>Tracking towards your goal of 68 kg</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={weightTrendData}>
                    <defs>
                      <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#327F74" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#327F74" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[67, 73]} />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="weight" 
                      stroke="#327F74" 
                      fill="url(#colorWeight)" 
                      strokeWidth={3}
                      name="Current Weight"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="target" 
                      stroke="#E63946" 
                      strokeDasharray="5 5" 
                      name="Target Weight"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Measurements Tracker */}
            <Card>
              <CardHeader>
                <CardTitle>Body Measurements</CardTitle>
                <CardDescription>Track changes in all areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(measurements).slice(3).map(([key, data]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Ruler className="h-5 w-5 text-[#327F74]" />
                        <div>
                          <p className="font-semibold capitalize">{key}</p>
                          <p className="text-sm text-gray-600">
                            Previous: {data.previous} {data.unit}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold">{data.current} {data.unit}</p>
                        <div className="flex items-center justify-end gap-1">
                          {getChangeIcon(data.change)}
                          <span className={`text-sm font-semibold ${data.change < 0 ? 'text-green-600' : data.change > 0 ? 'text-red-600' : 'text-gray-600'}`}>
                            {Math.abs(data.change)} {data.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Progress Photos */}
            <Card>
              <CardHeader>
                <CardTitle>Progress Photos</CardTitle>
                <CardDescription>Visual transformation journey (private)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No progress photos yet</p>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload First Photo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WORKOUTS TAB */}
          <TabsContent value="workouts" className="mt-6 space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Dumbbell className="h-8 w-8 text-[#327F74]" />
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold mb-1">18</p>
                  <p className="text-gray-600">Total Workouts</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Timer className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold mb-1">1,350</p>
                  <p className="text-gray-600">Total Minutes</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Trophy className="h-8 w-8 text-orange-600" />
                  </div>
                  <p className="text-3xl font-bold mb-1">3</p>
                  <p className="text-gray-600">Personal Records</p>
                </CardContent>
              </Card>
            </div>

            {/* Workout Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Workout Distribution</CardTitle>
                <CardDescription>How you split your training</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={workoutTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {workoutTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>

                  <div className="space-y-4">
                    {workoutTypeData.map(type => (
                      <div key={type.name}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: type.color }}></div>
                            <span className="font-semibold">{type.name}</span>
                          </div>
                          <span className="font-bold">{type.value}%</span>
                        </div>
                        <Progress value={type.value} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Workout Log */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Workouts</CardTitle>
                <CardDescription>Your training history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {workoutLogs.map(workout => (
                    <Card key={workout.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className="p-3 bg-purple-100 rounded-lg">
                              <Activity className="h-6 w-6 text-purple-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">{workout.name}</h4>
                              <p className="text-sm text-gray-600">
                                {new Date(workout.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <Badge style={{ backgroundColor: workoutTypeData.find(t => t.name === workout.type)?.color }}>
                            {workout.type}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 mb-3">
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <Timer className="h-4 w-4 mx-auto mb-1 text-gray-600" />
                            <p className="text-sm font-bold">{workout.duration} min</p>
                          </div>
                          <div className="text-center p-2 bg-gray-50 rounded">
                            <Zap className="h-4 w-4 mx-auto mb-1 text-orange-500" />
                            <p className="text-sm font-bold">{workout.calories} cal</p>
                          </div>
                          {workout.sets > 0 && (
                            <div className="text-center p-2 bg-gray-50 rounded">
                              <Dumbbell className="h-4 w-4 mx-auto mb-1 text-[#327F74]" />
                              <p className="text-sm font-bold">{workout.sets} sets</p>
                            </div>
                          )}
                        </div>

                        {workout.notes && (
                          <p className="text-sm text-gray-600 italic">"{workout.notes}"</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CLASSES TAB */}
          <TabsContent value="classes" className="mt-6 space-y-6">
            {/* Classes Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <p className="text-3xl font-bold mb-1">4</p>
                  <p className="text-gray-600">Classes This Month</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Star className="h-8 w-8 text-yellow-500" />
                  </div>
                  <p className="text-3xl font-bold mb-1">Spin Class</p>
                  <p className="text-gray-600">Favorite Class</p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <Award className="h-8 w-8 text-purple-600" />
                  </div>
                  <p className="text-3xl font-bold mb-1">92%</p>
                  <p className="text-gray-600">Attendance Rate</p>
                </CardContent>
              </Card>
            </div>

            {/* Class History */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Classes</CardTitle>
                <CardDescription>Your group class participation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classHistory.map(classItem => (
                    <Card key={classItem.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-lg">
                              <Users className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h4 className="font-semibold mb-1">{classItem.name}</h4>
                              <div className="flex items-center gap-3 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <User className="h-4 w-4" />
                                  {classItem.trainer}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(classItem.date).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {classItem.time}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {classItem.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Favorite Class Types */}
            <Card>
              <CardHeader>
                <CardTitle>Favorite Class Types</CardTitle>
                <CardDescription>What you enjoy most</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {['Spin Class', 'Yoga', 'HIIT', 'Power Yoga', 'Bootcamp'].map(tag => (
                    <Badge key={tag} variant="outline" className="px-4 py-2">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* CHALLENGES TAB */}
          <TabsContent value="challenges" className="mt-6 space-y-6">
            {/* Active Challenges */}
            <Card>
              <CardHeader>
                <CardTitle>Active Challenges</CardTitle>
                <CardDescription>Your current fitness challenges</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeChallenges.map(challenge => (
                    <Card key={challenge.id} className="bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-bold text-lg mb-2">{challenge.name}</h3>
                            <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                              <Badge variant="outline">{challenge.type}</Badge>
                              <span className="flex items-center gap-1">
                                <Trophy className="h-4 w-4" />
                                {challenge.reward}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                Ends in {challenge.endsIn}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Progress</span>
                            <span className="font-bold">
                              {challenge.progress} / {challenge.goal} {challenge.type === 'Attendance' ? 'days' : 'kg'}
                            </span>
                          </div>
                          <Progress value={(challenge.progress / challenge.goal) * 100} className="h-3" />
                          <p className="text-sm text-gray-600">
                            {((challenge.progress / challenge.goal) * 100).toFixed(0)}% complete
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Badges Earned */}
            <Card>
              <CardHeader>
                <CardTitle>Badges & Achievements</CardTitle>
                <CardDescription>Your fitness milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {badges.map(badge => (
                    <div
                      key={badge.id}
                      className={`p-6 rounded-lg text-center transition-all ${
                        badge.earned
                          ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300'
                          : 'bg-gray-100 opacity-50'
                      }`}
                    >
                      <div className="text-4xl mb-2">{badge.icon}</div>
                      <p className="text-sm font-semibold">{badge.name}</p>
                      {badge.earned && (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mx-auto mt-2" />
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard */}
            <Card>
              <CardHeader>
                <CardTitle>Challenge Leaderboard</CardTitle>
                <CardDescription>See how you rank this month</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { rank: 1, name: 'John Davis', points: 1250, isYou: false },
                    { rank: 2, name: 'You (Sarah Johnson)', points: 1180, isYou: true },
                    { rank: 3, name: 'Mike Thompson', points: 1150, isYou: false },
                    { rank: 4, name: 'Emma Wilson', points: 1100, isYou: false },
                    { rank: 5, name: 'Chris Lee', points: 1050, isYou: false },
                  ].map(player => (
                    <div
                      key={player.rank}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        player.isYou ? 'bg-green-50 border-2 border-green-300' : 'bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                          player.rank === 1 ? 'bg-yellow-400 text-yellow-900' :
                          player.rank === 2 ? 'bg-gray-300 text-gray-700' :
                          player.rank === 3 ? 'bg-orange-400 text-orange-900' :
                          'bg-gray-200 text-gray-600'
                        }`}>
                          {player.rank}
                        </div>
                        <p className={`font-semibold ${player.isYou ? 'text-green-900' : ''}`}>
                          {player.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Trophy className={`h-5 w-5 ${player.isYou ? 'text-green-600' : 'text-gray-400'}`} />
                        <span className="font-bold">{player.points}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Goals Sheet */}
      <Sheet open={showGoalsSheet} onOpenChange={setShowGoalsSheet}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Set Your Goals</SheetTitle>
            <SheetDescription>Define your fitness targets</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            <div>
              <Label htmlFor="attendanceGoal">Monthly Attendance Goal</Label>
              <Input
                id="attendanceGoal"
                type="number"
                defaultValue={memberData.monthlyGoal}
                className="mt-2"
              />
              <p className="text-sm text-gray-600 mt-1">Number of visits per month</p>
            </div>

            <div>
              <Label htmlFor="weightGoal">Target Weight (kg)</Label>
              <Input
                id="weightGoal"
                type="number"
                step="0.1"
                defaultValue="68"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="goalDate">Target Date</Label>
              <Input
                id="goalDate"
                type="date"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="weeklyMinutes">Weekly Workout Minutes</Label>
              <Input
                id="weeklyMinutes"
                type="number"
                defaultValue="300"
                className="mt-2"
              />
            </div>

            <Button
              className="w-full h-12"
              style={{ backgroundColor: '#327F74' }}
              onClick={handleSetGoal}
            >
              <Flag className="h-5 w-5 mr-2" />
              Save Goals
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Measurement Update Sheet */}
      <Sheet open={showMeasurementSheet} onOpenChange={setShowMeasurementSheet}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Update Measurements</SheetTitle>
            <SheetDescription>Track your body progress</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  defaultValue={measurements.weight.current}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="bodyFat">Body Fat (%)</Label>
                <Input
                  id="bodyFat"
                  type="number"
                  step="0.1"
                  defaultValue={measurements.bodyFat.current}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="chest">Chest (cm)</Label>
                <Input
                  id="chest"
                  type="number"
                  defaultValue={measurements.chest.current}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="waist">Waist (cm)</Label>
                <Input
                  id="waist"
                  type="number"
                  defaultValue={measurements.waist.current}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="hips">Hips (cm)</Label>
                <Input
                  id="hips"
                  type="number"
                  defaultValue={measurements.hips.current}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="arms">Arms (cm)</Label>
                <Input
                  id="arms"
                  type="number"
                  defaultValue={measurements.arms.current}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="thighs">Thighs (cm)</Label>
                <Input
                  id="thighs"
                  type="number"
                  defaultValue={measurements.thighs.current}
                  className="mt-2"
                />
              </div>
            </div>

            <Button
              className="w-full h-12"
              style={{ backgroundColor: '#327F74' }}
              onClick={() => {
                setShowMeasurementSheet(false);
                toast.success('Measurements Updated!', {
                  description: 'Your progress has been recorded',
                  duration: 3000,
                });
              }}
            >
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Save Measurements
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
