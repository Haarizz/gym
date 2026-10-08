import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line,
  Legend 
} from 'recharts';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar as CalendarIcon,
  CreditCard,
  Banknote,
  Receipt,
  ShoppingBag,
  Dumbbell,
  Coffee,
  Package,
  Building,
  UserPlus,
  RotateCcw,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear } from 'date-fns';

// Types
interface DateRange {
  from: Date;
  to: Date;
}

// Color palette for GymBios
const COLORS = {
  primary: '#2B7A78',
  accent: '#E63946',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  cash: '#10B981',
  card: '#3B82F6',
};

const CHART_COLORS = ['#2B7A78', '#3B82F6', '#10B981', '#F59E0B', '#E63946', '#8B5CF6', '#EC4899'];

export function RevenueDashboard() {
  const [dateFilterType, setDateFilterType] = useState<'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom'>('daily');
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });
  const [activeTab, setActiveTab] = useState('total-collection');

  // Mock data - replace with actual API calls
  const mockData = {
    totalCollection: {
      total: 3005,
      cash: 1075,
      card: 1930,
      trend: 12.5,
      receipts: 45
    },
    totalExpenses: {
      total: 450,
      cash: 200,
      card: 250,
      trend: -5.2,
      receipts: 15
    },
    netRevenue: {
      total: 2555,
      trend: 18.3
    },
    activeMembers: {
      count: 248,
      trend: 8.5
    },
    membershipRevenue: {
      total: 1605,
      cash: 500,
      card: 1105,
      receipts: 20,
      breakdown: {
        newMemberships: 7,
        renewals: 5,
        upgrades: 3,
        addons: 1,
        credits: 2
      }
    },
    personalTraining: {
      total: 450,
      cash: 200,
      card: 250,
      receipts: 10,
      breakdown: {
        '30 Days PT': 5,
        'MMA': 3,
        'Pilates': 2
      }
    },
    merchandise: {
      total: 675,
      cash: 375,
      card: 300,
      receipts: 17
    },
    events: {
      total: 0,
      cash: 0,
      card: 0,
      receipts: 0
    },
    cafe: {
      total: 275,
      cash: 0,
      card: 275,
      receipts: 8
    },
    equipment: {
      total: 0,
      cash: 0,
      card: 0,
      receipts: 0
    },
    facilities: {
      total: 0,
      cash: 0,
      card: 0,
      receipts: 0
    },
    expenses: {
      total: 450,
      cash: 200,
      card: 250,
      receipts: 15,
      breakdown: {
        'Office Expenses': 5,
        'Snacks': 3,
        'Purchases': 2
      }
    }
  };

  // Calculate date range based on filter type
  const updateDateRange = (type: typeof dateFilterType) => {
    const now = new Date();
    switch (type) {
      case 'hourly':
      case 'daily':
        setDateRange({ from: now, to: now });
        break;
      case 'weekly':
        setDateRange({ from: startOfWeek(now), to: endOfWeek(now) });
        break;
      case 'monthly':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'quarterly':
        setDateRange({ from: startOfQuarter(now), to: endOfQuarter(now) });
        break;
      case 'yearly':
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
    }
  };

  const handleDateFilterChange = (type: typeof dateFilterType) => {
    setDateFilterType(type);
    if (type !== 'custom') {
      updateDateRange(type);
    }
  };

  // Sample chart data
  const cashVsCardData = [
    { name: 'Cash', value: mockData.totalCollection.cash, color: COLORS.cash },
    { name: 'Card', value: mockData.totalCollection.card, color: COLORS.card }
  ];

  const membershipTypeData = [
    { type: 'New Memberships', amount: 850, count: 7 },
    { type: 'Renewals', amount: 425, count: 5 },
    { type: 'Upgrades', amount: 230, count: 3 },
    { type: 'Add-ons', amount: 75, count: 1 },
    { type: 'Credits', amount: 25, count: 2 }
  ];

  const trendData = [
    { day: 'Mon', revenue: 420 },
    { day: 'Tue', revenue: 380 },
    { day: 'Wed', revenue: 550 },
    { day: 'Thu', revenue: 480 },
    { day: 'Fri', revenue: 620 },
    { day: 'Sat', revenue: 750 },
    { day: 'Sun', revenue: 805 }
  ];

  const serviceTypeData = [
    { service: '30 Days PT', amount: 250, count: 5 },
    { service: 'MMA', amount: 120, count: 3 },
    { service: 'Pilates', amount: 80, count: 2 }
  ];

  const merchandiseCategoryData = [
    { category: 'Supplements', value: 275, color: CHART_COLORS[0] },
    { category: 'Apparel', value: 200, color: CHART_COLORS[1] },
    { category: 'Equipment', value: 150, color: CHART_COLORS[2] },
    { category: 'Accessories', value: 50, color: CHART_COLORS[3] }
  ];

  const expensesCategoryData = [
    { category: 'Office Expenses', amount: 200, count: 5 },
    { category: 'Snacks', amount: 150, count: 3 },
    { category: 'Purchases', amount: 100, count: 2 }
  ];

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{payload[0].name || payload[0].payload.name}</p>
          <p className="text-sm" style={{ color: payload[0].color }}>
            AED {payload[0].value.toLocaleString()}
          </p>
        </div>
      );
    }
    return null;
  };

  // KPI Card Component
  const KPICard = ({ 
    title, 
    value, 
    trend, 
    icon: Icon, 
    iconColor, 
    iconBg,
    subtitle,
    cash,
    card
  }: { 
    title: string; 
    value: number; 
    trend?: number; 
    icon: React.ElementType; 
    iconColor: string; 
    iconBg: string;
    subtitle?: string;
    cash?: number;
    card?: number;
  }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <p className="text-3xl font-bold mb-2">AED {value.toLocaleString()}</p>
            
            {cash !== undefined && card !== undefined && (
              <div className="flex items-center gap-4 mb-2">
                <div className="flex items-center gap-1">
                  <Banknote className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-muted-foreground">Cash: AED {cash}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CreditCard className="h-3 w-3 text-blue-600" />
                  <span className="text-xs text-muted-foreground">Card: AED {card}</span>
                </div>
              </div>
            )}
            
            {trend !== undefined && (
              <div className="flex items-center">
                {trend >= 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={cn(
                  "text-sm font-medium",
                  trend >= 0 ? "text-green-500" : "text-red-500"
                )}>
                  {trend >= 0 ? '+' : ''}{trend}%
                </span>
                <span className="text-sm text-muted-foreground ml-1">vs previous period</span>
              </div>
            )}
            
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-3 rounded-full", iconBg)}>
            <Icon className={cn("h-6 w-6", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Empty state component
  const EmptyState = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
        <Activity className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">No Data Yet</h3>
      <p className="text-sm text-muted-foreground">
        {title} will appear here once transactions are recorded
      </p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Revenue Dashboard</h2>
            <p className="text-muted-foreground">
              Comprehensive revenue analytics and insights
            </p>
          </div>
          <Badge variant="outline" className="text-sm">
            {dateFilterType === 'custom' 
              ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`
              : dateFilterType.charAt(0).toUpperCase() + dateFilterType.slice(1)
            }
          </Badge>
        </div>

        {/* Date Filter Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {(['hourly', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const).map((type) => (
              <Button
                key={type}
                variant={dateFilterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => handleDateFilterChange(type)}
                className={dateFilterType === type ? "bg-[#2B7A78] hover:bg-[#236663]" : ""}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Button>
            ))}
          </div>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant={dateFilterType === 'custom' ? "default" : "outline"} 
                size="sm"
                className={dateFilterType === 'custom' ? "bg-[#2B7A78] hover:bg-[#236663]" : ""}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                Custom Range
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range: any) => {
                  if (range?.from && range?.to) {
                    setDateRange({ from: range.from, to: range.to });
                    setDateFilterType('custom');
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Top KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Collection"
          value={mockData.totalCollection.total}
          trend={mockData.totalCollection.trend}
          icon={DollarSign}
          iconColor="text-green-600"
          iconBg="bg-green-100 dark:bg-green-950/20"
          cash={mockData.totalCollection.cash}
          card={mockData.totalCollection.card}
          subtitle={`${mockData.totalCollection.receipts} receipts`}
        />
        <KPICard
          title="Total Expenses"
          value={mockData.totalExpenses.total}
          trend={mockData.totalExpenses.trend}
          icon={Receipt}
          iconColor="text-red-600"
          iconBg="bg-red-100 dark:bg-red-950/20"
          cash={mockData.totalExpenses.cash}
          card={mockData.totalExpenses.card}
          subtitle={`${mockData.totalExpenses.receipts} transactions`}
        />
        <KPICard
          title="Net Revenue"
          value={mockData.netRevenue.total}
          trend={mockData.netRevenue.trend}
          icon={TrendingUp}
          iconColor="text-[#2B7A78]"
          iconBg="bg-[#2B7A78]/10"
        />
        <KPICard
          title="Active Members"
          value={mockData.activeMembers.count}
          trend={mockData.activeMembers.trend}
          icon={Users}
          iconColor="text-blue-600"
          iconBg="bg-blue-100 dark:bg-blue-950/20"
        />
      </div>

      {/* Revenue Breakdown Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-1 h-auto p-1 bg-muted/50">
          <TabsTrigger value="total-collection" className="text-xs">Total Collection</TabsTrigger>
          <TabsTrigger value="membership" className="text-xs">Membership</TabsTrigger>
          <TabsTrigger value="personal-training" className="text-xs">PT & Services</TabsTrigger>
          <TabsTrigger value="merchandise" className="text-xs">Merchandise</TabsTrigger>
          <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
          <TabsTrigger value="cafe" className="text-xs">Cafe & F&B</TabsTrigger>
          <TabsTrigger value="equipment" className="text-xs">Equipment</TabsTrigger>
          <TabsTrigger value="facilities" className="text-xs">Facilities</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">Expenses</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          {/* Total Collection Tab */}
          <TabsContent key="total-collection-tab" value="total-collection" className="space-y-4">
            <motion.div
              key="total-collection-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Cash vs Card Distribution</CardTitle>
                  <CardDescription>Payment method breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="flex items-center gap-3 p-4 border rounded-lg">
                      <Banknote className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Cash</p>
                        <p className="text-xl font-bold">AED {mockData.totalCollection.cash}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-4 border rounded-lg">
                      <CreditCard className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-sm text-muted-foreground">Card</p>
                        <p className="text-xl font-bold">AED {mockData.totalCollection.card}</p>
                      </div>
                    </div>
                  </div>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={cashVsCardData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {cashVsCardData.map((entry, index) => (
                          <Cell key={`cash-card-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Daily Revenue Trend</CardTitle>
                  <CardDescription>Revenue performance over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={COLORS.primary} 
                        strokeWidth={2}
                        dot={{ fill: COLORS.primary, r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Membership Revenue Tab */}
          <TabsContent key="membership-tab" value="membership" className="space-y-4">
            <motion.div
              key="membership-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Membership Revenue</CardTitle>
                  <CardDescription>Total: AED {mockData.membershipRevenue.total}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-muted-foreground">Cash</p>
                      </div>
                      <p className="text-lg font-bold">AED {mockData.membershipRevenue.cash}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-muted-foreground">Card</p>
                      </div>
                      <p className="text-lg font-bold">AED {mockData.membershipRevenue.card}</p>
                    </div>
                  </div>
                  
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <p className="text-xs text-muted-foreground mb-1">Total Receipts</p>
                    <p className="text-2xl font-bold">{mockData.membershipRevenue.receipts}</p>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Transaction Breakdown</p>
                    <div className="space-y-2">
                      {Object.entries(mockData.membershipRevenue.breakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 border rounded-md">
                          <span className="text-sm text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </span>
                          <Badge variant="secondary">{value}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue by Membership Type</CardTitle>
                  <CardDescription>Breakdown by transaction type</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={membershipTypeData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="type" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" fill={COLORS.primary} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Personal Training & Services Tab */}
          <TabsContent key="personal-training-tab" value="personal-training" className="space-y-4">
            <motion.div
              key="personal-training-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>PT & Services Revenue</CardTitle>
                  <CardDescription>Total: AED {mockData.personalTraining.total}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-muted-foreground">Cash</p>
                      </div>
                      <p className="text-lg font-bold">AED {mockData.personalTraining.cash}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-muted-foreground">Card</p>
                      </div>
                      <p className="text-lg font-bold">AED {mockData.personalTraining.card}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Service Breakdown</p>
                    <div className="space-y-2">
                      {Object.entries(mockData.personalTraining.breakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 border rounded-md">
                          <div className="flex items-center gap-2">
                            <Dumbbell className="h-4 w-4 text-[#2B7A78]" />
                            <span className="text-sm">{key}</span>
                          </div>
                          <Badge variant="secondary">{value} sessions</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Revenue by Service Type</CardTitle>
                  <CardDescription>Service-wise revenue breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={serviceTypeData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="service" type="category" />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" fill={COLORS.info}>
                        {serviceTypeData.map((entry, index) => (
                          <Cell key={`service-cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Merchandise & Retail Tab */}
          <TabsContent key="merchandise-tab" value="merchandise" className="space-y-4">
            <motion.div
              key="merchandise-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Merchandise Revenue</CardTitle>
                  <CardDescription>Total: AED {mockData.merchandise.total}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-muted-foreground">Cash</p>
                      </div>
                      <p className="text-lg font-bold">AED {mockData.merchandise.cash}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-muted-foreground">Card</p>
                      </div>
                      <p className="text-lg font-bold">AED {mockData.merchandise.card}</p>
                    </div>
                  </div>
                  
                  <div className="p-3 border rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 mb-1">
                      <Receipt className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Total Receipts</p>
                    </div>
                    <p className="text-2xl font-bold">{mockData.merchandise.receipts}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Category-wise Revenue</CardTitle>
                  <CardDescription>Sales by product category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={merchandiseCategoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {merchandiseCategoryData.map((entry, index) => (
                          <Cell key={`merchandise-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Events & Workshops Tab */}
          <TabsContent key="events-tab" value="events">
            <motion.div
              key="events-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-8">
                  <EmptyState title="Events & workshops revenue" />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Cafe & F&B Tab */}
          <TabsContent key="cafe-tab" value="cafe" className="space-y-4">
            <motion.div
              key="cafe-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Cafe & F&B Revenue</CardTitle>
                  <CardDescription>Total: AED {mockData.cafe.total}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-4 border rounded-lg text-center">
                      <Coffee className="h-6 w-6 mx-auto mb-2 text-amber-600" />
                      <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
                      <p className="text-xl font-bold">AED {mockData.cafe.total}</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <CreditCard className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                      <p className="text-xs text-muted-foreground mb-1">Card Payments</p>
                      <p className="text-xl font-bold">AED {mockData.cafe.card}</p>
                    </div>
                    <div className="p-4 border rounded-lg text-center">
                      <Receipt className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                      <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
                      <p className="text-xl font-bold">{mockData.cafe.receipts}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Equipment Rental Tab */}
          <TabsContent key="equipment-tab" value="equipment">
            <motion.div
              key="equipment-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-8">
                  <EmptyState title="Equipment rental revenue" />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Facilities & Lockers Tab */}
          <TabsContent key="facilities-tab" value="facilities">
            <motion.div
              key="facilities-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Card>
                <CardContent className="p-8">
                  <EmptyState title="Facilities & locker revenue" />
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Expenses Tab */}
          <TabsContent key="expenses-tab" value="expenses" className="space-y-4">
            <motion.div
              key="expenses-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Expense Summary</CardTitle>
                  <CardDescription>Total: AED {mockData.expenses.total}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Banknote className="h-4 w-4 text-green-600" />
                        <p className="text-xs text-muted-foreground">Cash</p>
                      </div>
                      <p className="text-lg font-bold">AED {mockData.expenses.cash}</p>
                    </div>
                    <div className="p-3 border rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <CreditCard className="h-4 w-4 text-blue-600" />
                        <p className="text-xs text-muted-foreground">Card</p>
                      </div>
                      <p className="text-lg font-bold">AED {mockData.expenses.card}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Expense Categories</p>
                    <div className="space-y-2">
                      {Object.entries(mockData.expenses.breakdown).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between p-2 border rounded-md">
                          <span className="text-sm">{key}</span>
                          <Badge variant="secondary">{value} items</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Expenses by Category</CardTitle>
                  <CardDescription>Category-wise expense breakdown</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={expensesCategoryData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" />
                      <YAxis />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="amount" fill={COLORS.accent} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}