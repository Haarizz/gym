import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { TrendingUp, Users, Calendar, DollarSign, Download, Filter, RefreshCw, BarChart3, FileText, ArrowUpRight, ArrowDownRight, TrendingDown } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { toast } from "sonner@2.0.3";
import { useState } from "react";
import { MembershipReportContent } from "./membership-report-content";

interface ReportsAnalyticsProps {
  onNavigate?: (section: string) => void;
}

const membershipTrends = [
  { month: 'Jan', newMembers: 45, cancelledMembers: 12, totalMembers: 320 },
  { month: 'Feb', newMembers: 52, cancelledMembers: 8, totalMembers: 364 },
  { month: 'Mar', newMembers: 38, cancelledMembers: 15, totalMembers: 387 },
  { month: 'Apr', newMembers: 61, cancelledMembers: 9, totalMembers: 439 },
  { month: 'May', newMembers: 44, cancelledMembers: 18, totalMembers: 465 },
  { month: 'Jun', newMembers: 67, cancelledMembers: 11, totalMembers: 521 },
];

const revenueBreakdown = [
  { name: 'Memberships', value: 65, amount: 325000, color: '#8884d8' },
  { name: 'Personal Training', value: 20, amount: 100000, color: '#82ca9d' },
  { name: 'Group Classes', value: 10, amount: 50000, color: '#ffc658' },
  { name: 'Merchandise', value: 3, amount: 15000, color: '#ff7c7c' },
  { name: 'Other Services', value: 2, amount: 10000, color: '#8dd1e1' },
];

const classAttendance = [
  { class: 'HIIT', Jan: 85, Feb: 90, Mar: 88, Apr: 92, May: 89, Jun: 95 },
  { class: 'Yoga', Jan: 78, Feb: 82, Mar: 85, Apr: 87, May: 83, Jun: 89 },
  { class: 'Pilates', Jan: 65, Feb: 70, Mar: 72, Apr: 75, May: 78, Jun: 82 },
  { class: 'Strength', Jan: 92, Feb: 89, Mar: 91, Apr: 88, May: 94, Jun: 96 },
  { class: 'Cardio', Jan: 88, Feb: 85, Mar: 90, Apr: 87, May: 91, Jun: 93 },
];

const memberDemographics = [
  { ageGroup: '18-25', count: 120, percentage: 23 },
  { ageGroup: '26-35', count: 180, percentage: 35 },
  { ageGroup: '36-45', count: 135, percentage: 26 },
  { ageGroup: '46-55', count: 65, percentage: 12 },
  { ageGroup: '55+', count: 21, percentage: 4 },
];

const peakHours = [
  { hour: '6AM', usage: 45 },
  { hour: '7AM', usage: 85 },
  { hour: '8AM', usage: 120 },
  { hour: '9AM', usage: 95 },
  { hour: '10AM', usage: 60 },
  { hour: '11AM', usage: 75 },
  { hour: '12PM', usage: 110 },
  { hour: '1PM', usage: 85 },
  { hour: '2PM', usage: 55 },
  { hour: '3PM', usage: 65 },
  { hour: '4PM', usage: 90 },
  { hour: '5PM', usage: 140 },
  { hour: '6PM', usage: 160 },
  { hour: '7PM', usage: 135 },
  { hour: '8PM', usage: 100 },
  { hour: '9PM', usage: 70 },
];

const kpiData = [
  {
    title: "Member Retention Rate",
    value: "94.2%",
    change: "+2.1%",
    trend: "up",
    description: "Monthly retention rate"
  },
  {
    title: "Average Revenue Per Member",
    value: "$127",
    change: "+8.5%",
    trend: "up",
    description: "Per member monthly"
  },
  {
    title: "Class Utilization Rate",
    value: "78%",
    change: "-3.2%",
    trend: "down",
    description: "Average across all classes"
  },
  {
    title: "Equipment Downtime",
    value: "2.3%",
    change: "-1.1%",
    trend: "up",
    description: "Equipment availability"
  }
];

export function ReportsAnalytics({ onNavigate }: ReportsAnalyticsProps = {}) {
  const [selectedDateRange, setSelectedDateRange] = useState('month');
  const [selectedReportType, setSelectedReportType] = useState('revenue');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [showReport, setShowReport] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Generate dynamic revenue data based on date range
  const generateRevenueData = () => {
    const months = selectedDateRange === 'week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] :
                   selectedDateRange === 'month' ? ['Week 1', 'Week 2', 'Week 3', 'Week 4'] :
                   selectedDateRange === 'quarter' ? ['Jan', 'Feb', 'Mar'] :
                   ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return months.map(period => {
      const memberships = Math.floor(Math.random() * 50000) + 30000;
      const personalTraining = Math.floor(Math.random() * 20000) + 10000;
      const groupClasses = Math.floor(Math.random() * 15000) + 5000;
      const merchandise = Math.floor(Math.random() * 8000) + 2000;
      const other = Math.floor(Math.random() * 5000) + 1000;
      const total = memberships + personalTraining + groupClasses + merchandise + other;
      
      // Payment mode distribution (Cash: 35-45%, Card: 40-50%, Credit Pending: 10-15%)
      const cashPercentage = 0.35 + Math.random() * 0.10;
      const cardPercentage = 0.40 + Math.random() * 0.10;
      const creditPercentage = 1 - cashPercentage - cardPercentage;
      
      return {
        period,
        memberships,
        personalTraining,
        groupClasses,
        merchandise,
        other,
        cash: Math.floor(total * cashPercentage),
        card: Math.floor(total * cardPercentage),
        creditPending: Math.floor(total * creditPercentage),
      };
    });
  };

  const handleGenerateReport = () => {
    setIsGenerating(true);
    
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false);
      setShowReport(true);
      toast.success('Report Generated Successfully', {
        description: `Your ${selectedReportType === 'revenue' ? 'Revenue Analysis' : selectedReportType} report is ready.`
      });
    }, 1500);
  };

  const handleDownloadReport = () => {
    toast.success(`Downloading ${selectedFormat.toUpperCase()} Report`, {
      description: 'Your report download will begin shortly.'
    });
  };

  const revenueData = generateRevenueData();
  const totalRevenue = revenueData.reduce((sum, item) => 
    sum + item.memberships + item.personalTraining + item.groupClasses + item.merchandise + item.other, 0
  );

  // Generate dynamic membership data based on date range
  const generateMembershipData = () => {
    const periods = selectedDateRange === 'week' ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] :
                   selectedDateRange === 'month' ? ['Week 1', 'Week 2', 'Week 3', 'Week 4'] :
                   selectedDateRange === 'quarter' ? ['Jan', 'Feb', 'Mar'] :
                   ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return periods.map((period, index) => ({
      period,
      newMembers: Math.floor(Math.random() * 30) + 15,
      renewals: Math.floor(Math.random() * 40) + 20,
      cancellations: Math.floor(Math.random() * 10) + 2,
      totalActive: 450 + (index * 10) + Math.floor(Math.random() * 20),
      freezed: Math.floor(Math.random() * 15) + 5,
      suspended: Math.floor(Math.random() * 8) + 2,
    }));
  };

  const membershipData = generateMembershipData();
  const totalMembers = membershipData[membershipData.length - 1].totalActive;
  const totalNewMembers = membershipData.reduce((sum, item) => sum + item.newMembers, 0);
  const totalCancellations = membershipData.reduce((sum, item) => sum + item.cancellations, 0);
  const retentionRate = ((1 - (totalCancellations / (totalMembers + totalCancellations))) * 100).toFixed(1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive business intelligence and performance metrics.</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            className="btn-primary"
            onClick={() => onNavigate?.('custom-reports')}
          >
            <FileText className="mr-2 h-4 w-4" />
            Custom Reports
          </Button>
          <Button variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh Data
          </Button>
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Custom Filter
          </Button>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <TrendingUp className={`h-4 w-4 ${kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">
                <span className={kpi.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                  {kpi.change}
                </span>{' '}
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="membership">Membership</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="custom">Custom Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Membership Growth Trend</CardTitle>
                <CardDescription>Member acquisition and retention over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={membershipTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="totalMembers" stackId="1" stroke="#8884d8" fill="#8884d8" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>Revenue breakdown by service type</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={revenueBreakdown}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {revenueBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Peak Usage Hours</CardTitle>
              <CardDescription>Gym utilization throughout the day</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={peakHours}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="usage" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="membership" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Member Acquisition vs Churn</CardTitle>
                <CardDescription>Monthly new members vs cancellations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={membershipTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="newMembers" fill="#82ca9d" name="New Members" />
                    <Bar dataKey="cancelledMembers" fill="#ff7c7c" name="Cancelled" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Member Demographics</CardTitle>
                <CardDescription>Age distribution of members</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {memberDemographics.map((demo, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-medium">{demo.ageGroup}</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${demo.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{demo.count}</span>
                      <Badge variant="secondary">{demo.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Membership Metrics</CardTitle>
              <CardDescription>Key membership performance indicators</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">94.2%</div>
                  <div className="text-sm text-muted-foreground">Retention Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">4.2</div>
                  <div className="text-sm text-muted-foreground">Avg. Visits/Week</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">18 months</div>
                  <div className="text-sm text-muted-foreground">Avg. Membership Length</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Revenue Trends</CardTitle>
                  <CardDescription>Monthly revenue by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={membershipTrends.map((item, index) => ({
                      ...item,
                      revenue: revenueBreakdown.reduce((sum, r) => sum + r.amount, 0) / 6 + Math.random() * 10000
                    }))}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Summary</CardTitle>
                <CardDescription>This month's performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {revenueBreakdown.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{item.name}</span>
                    <div className="text-right">
                      <div className="font-medium">${item.amount.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{item.value}%</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Class Attendance Trends</CardTitle>
                <CardDescription>Attendance rates by class type over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={[
                    { month: 'Jan', HIIT: 85, Yoga: 78, Pilates: 65, Strength: 92 },
                    { month: 'Feb', HIIT: 90, Yoga: 82, Pilates: 70, Strength: 89 },
                    { month: 'Mar', HIIT: 88, Yoga: 85, Pilates: 72, Strength: 91 },
                    { month: 'Apr', HIIT: 92, Yoga: 87, Pilates: 75, Strength: 88 },
                    { month: 'May', HIIT: 89, Yoga: 83, Pilates: 78, Strength: 94 },
                    { month: 'Jun', HIIT: 95, Yoga: 89, Pilates: 82, Strength: 96 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="HIIT" stroke="#8884d8" />
                    <Line type="monotone" dataKey="Yoga" stroke="#82ca9d" />
                    <Line type="monotone" dataKey="Pilates" stroke="#ffc658" />
                    <Line type="monotone" dataKey="Strength" stroke="#ff7c7c" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Operational Metrics</CardTitle>
                <CardDescription>Key operational performance indicators</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Equipment Utilization</span>
                    <span className="text-sm font-medium">87%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '87%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Staff Efficiency</span>
                    <span className="text-sm font-medium">92%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Customer Satisfaction</span>
                    <span className="text-sm font-medium">4.7/5</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '94%' }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Custom Report Builder</CardTitle>
              <CardDescription>Create custom reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date Range</label>
                  <Select defaultValue="month" value={selectedDateRange} onValueChange={setSelectedDateRange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">Last 7 days</SelectItem>
                      <SelectItem value="month">Last 30 days</SelectItem>
                      <SelectItem value="quarter">Last 3 months</SelectItem>
                      <SelectItem value="year">Last 12 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Report Type</label>
                  <Select defaultValue="revenue" value={selectedReportType} onValueChange={setSelectedReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">Revenue Analysis</SelectItem>
                      <SelectItem value="membership">Membership Report</SelectItem>
                      <SelectItem value="attendance">Class Attendance</SelectItem>
                      <SelectItem value="equipment">Equipment Usage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Format</label>
                  <Select defaultValue="pdf" value={selectedFormat} onValueChange={setSelectedFormat}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pdf">PDF Report</SelectItem>
                      <SelectItem value="excel">Excel Spreadsheet</SelectItem>
                      <SelectItem value="csv">CSV Data</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex space-x-4">
                <Button onClick={handleGenerateReport} disabled={isGenerating}>
                  <BarChart3 className="mr-2 h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Generate Report'}
                </Button>
                <Button variant="outline">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule Report
                </Button>
              </div>

              {showReport && selectedReportType === 'revenue' && (
                <div className="mt-8 space-y-6">
                  {/* Revenue Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Revenue</p>
                            <p className="text-2xl font-bold" style={{ color: '#327F74' }}>
                              {totalRevenue.toLocaleString()} AED
                            </p>
                            <p className="text-xs text-green-600 flex items-center mt-1">
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                              +12.5% from last period
                            </p>
                          </div>
                          <DollarSign className="h-8 w-8" style={{ color: '#327F74' }} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Avg Per Transaction</p>
                            <p className="text-2xl font-bold" style={{ color: '#327F74' }}>
                              {Math.floor(totalRevenue / revenueData.length).toLocaleString()} AED
                            </p>
                            <p className="text-xs text-green-600 flex items-center mt-1">
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                              +8.2% from last period
                            </p>
                          </div>
                          <TrendingUp className="h-8 w-8" style={{ color: '#327F74' }} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Membership Revenue</p>
                            <p className="text-2xl font-bold" style={{ color: '#327F74' }}>
                              {revenueData.reduce((sum, item) => sum + item.memberships, 0).toLocaleString()} AED
                            </p>
                            <p className="text-xs text-green-600 flex items-center mt-1">
                              <ArrowUpRight className="h-3 w-3 mr-1" />
                              +15.3% from last period
                            </p>
                          </div>
                          <Users className="h-8 w-8" style={{ color: '#327F74' }} />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Training Revenue</p>
                            <p className="text-2xl font-bold" style={{ color: '#327F74' }}>
                              {revenueData.reduce((sum, item) => sum + item.personalTraining, 0).toLocaleString()} AED
                            </p>
                            <p className="text-xs text-red-600 flex items-center mt-1">
                              <ArrowDownRight className="h-3 w-3 mr-1" />
                              -2.1% from last period
                            </p>
                          </div>
                          <DollarSign className="h-8 w-8" style={{ color: '#327F74' }} />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Revenue Trend Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Revenue Trend Analysis</CardTitle>
                      <CardDescription>
                        Revenue breakdown by category over {selectedDateRange === 'week' ? 'the last 7 days' : 
                        selectedDateRange === 'month' ? 'the last 30 days' : 
                        selectedDateRange === 'quarter' ? 'the last 3 months' : 'the last 12 months'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={revenueData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip formatter={(value) => `${Number(value).toLocaleString()} AED`} />
                          <Area type="monotone" dataKey="memberships" stackId="1" stroke="#327F74" fill="#327F74" name="Memberships" />
                          <Area type="monotone" dataKey="personalTraining" stackId="1" stroke="#82ca9d" fill="#82ca9d" name="Personal Training" />
                          <Area type="monotone" dataKey="groupClasses" stackId="1" stroke="#ffc658" fill="#ffc658" name="Group Classes" />
                          <Area type="monotone" dataKey="merchandise" stackId="1" stroke="#ff7c7c" fill="#ff7c7c" name="Merchandise" />
                          <Area type="monotone" dataKey="other" stackId="1" stroke="#8dd1e1" fill="#8dd1e1" name="Other" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Payment Mode Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Payment Mode Performance</CardTitle>
                      <CardDescription>Revenue collection breakdown by payment method</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Payment Mode Distribution Pie Chart */}
                        <div>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Cash', value: revenueData.reduce((s, i) => s + i.cash, 0), color: '#327F74' },
                                  { name: 'Card', value: revenueData.reduce((s, i) => s + i.card, 0), color: '#82ca9d' },
                                  { name: 'Credit Pending', value: revenueData.reduce((s, i) => s + i.creditPending, 0), color: '#ffc658' }
                                ]}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {[
                                  { name: 'Cash', value: revenueData.reduce((s, i) => s + i.cash, 0), color: '#327F74' },
                                  { name: 'Card', value: revenueData.reduce((s, i) => s + i.card, 0), color: '#82ca9d' },
                                  { name: 'Credit Pending', value: revenueData.reduce((s, i) => s + i.creditPending, 0), color: '#ffc658' }
                                ].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => `${Number(value).toLocaleString()} AED`} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>

                        {/* Payment Mode Breakdown */}
                        <div className="space-y-4">
                          {[
                            { 
                              name: 'Cash Payments', 
                              value: revenueData.reduce((s, i) => s + i.cash, 0), 
                              color: '#327F74',
                              percentage: ((revenueData.reduce((s, i) => s + i.cash, 0) / totalRevenue) * 100).toFixed(1),
                              change: '+5.2%',
                              trend: 'up'
                            },
                            { 
                              name: 'Card Payments', 
                              value: revenueData.reduce((s, i) => s + i.card, 0), 
                              color: '#82ca9d',
                              percentage: ((revenueData.reduce((s, i) => s + i.card, 0) / totalRevenue) * 100).toFixed(1),
                              change: '+8.1%',
                              trend: 'up'
                            },
                            { 
                              name: 'Credit Pending', 
                              value: revenueData.reduce((s, i) => s + i.creditPending, 0), 
                              color: '#ffc658',
                              percentage: ((revenueData.reduce((s, i) => s + i.creditPending, 0) / totalRevenue) * 100).toFixed(1),
                              change: '-2.3%',
                              trend: 'down'
                            }
                          ].map((item, index) => (
                            <div key={index} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">{item.name}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm font-bold">{item.value.toLocaleString()} AED</span>
                                  <Badge 
                                    variant="secondary" 
                                    className={item.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                  >
                                    {item.change}
                                  </Badge>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="h-2 rounded-full" 
                                  style={{ 
                                    width: `${item.percentage}%`,
                                    backgroundColor: item.color
                                  }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{item.percentage}% of total revenue</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Payment Mode Trend Chart */}
                      <div className="mt-6">
                        <h4 className="text-sm font-medium mb-4">Payment Mode Trends Over Time</h4>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={revenueData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="period" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${Number(value).toLocaleString()} AED`} />
                            <Line type="monotone" dataKey="cash" stroke="#327F74" strokeWidth={2} name="Cash" />
                            <Line type="monotone" dataKey="card" stroke="#82ca9d" strokeWidth={2} name="Card" />
                            <Line type="monotone" dataKey="creditPending" stroke="#ffc658" strokeWidth={2} name="Credit Pending" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Payment Mode Summary Table */}
                      <div className="mt-6">
                        <h4 className="text-sm font-medium mb-4">Period-wise Payment Mode Breakdown</h4>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Period</TableHead>
                              <TableHead className="text-right">Cash</TableHead>
                              <TableHead className="text-right">Card</TableHead>
                              <TableHead className="text-right">Credit Pending</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {revenueData.map((item, index) => {
                              const periodTotal = item.cash + item.card + item.creditPending;
                              return (
                                <TableRow key={index}>
                                  <TableCell className="font-medium">{item.period}</TableCell>
                                  <TableCell className="text-right">{item.cash.toLocaleString()} AED</TableCell>
                                  <TableCell className="text-right">{item.card.toLocaleString()} AED</TableCell>
                                  <TableCell className="text-right">{item.creditPending.toLocaleString()} AED</TableCell>
                                  <TableCell className="text-right font-bold" style={{ color: '#327F74' }}>
                                    {periodTotal.toLocaleString()} AED
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                            <TableRow className="bg-muted/50">
                              <TableCell className="font-bold">Total</TableCell>
                              <TableCell className="text-right font-bold">
                                {revenueData.reduce((s, i) => s + i.cash, 0).toLocaleString()} AED
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {revenueData.reduce((s, i) => s + i.card, 0).toLocaleString()} AED
                              </TableCell>
                              <TableCell className="text-right font-bold">
                                {revenueData.reduce((s, i) => s + i.creditPending, 0).toLocaleString()} AED
                              </TableCell>
                              <TableCell className="text-right font-bold text-lg" style={{ color: '#327F74' }}>
                                {totalRevenue.toLocaleString()} AED
                              </TableCell>
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Revenue Distribution */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Revenue by Category</CardTitle>
                        <CardDescription>Percentage breakdown of revenue sources</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Memberships', value: revenueData.reduce((s, i) => s + i.memberships, 0), color: '#327F74' },
                                { name: 'Personal Training', value: revenueData.reduce((s, i) => s + i.personalTraining, 0), color: '#82ca9d' },
                                { name: 'Group Classes', value: revenueData.reduce((s, i) => s + i.groupClasses, 0), color: '#ffc658' },
                                { name: 'Merchandise', value: revenueData.reduce((s, i) => s + i.merchandise, 0), color: '#ff7c7c' },
                                { name: 'Other', value: revenueData.reduce((s, i) => s + i.other, 0), color: '#8dd1e1' }
                              ]}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {[
                                { name: 'Memberships', value: revenueData.reduce((s, i) => s + i.memberships, 0), color: '#327F74' },
                                { name: 'Personal Training', value: revenueData.reduce((s, i) => s + i.personalTraining, 0), color: '#82ca9d' },
                                { name: 'Group Classes', value: revenueData.reduce((s, i) => s + i.groupClasses, 0), color: '#ffc658' },
                                { name: 'Merchandise', value: revenueData.reduce((s, i) => s + i.merchandise, 0), color: '#ff7c7c' },
                                { name: 'Other', value: revenueData.reduce((s, i) => s + i.other, 0), color: '#8dd1e1' }
                              ].map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => `${Number(value).toLocaleString()} AED`} />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Category Performance</CardTitle>
                        <CardDescription>Detailed revenue breakdown by source</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {[
                          { name: 'Memberships', value: revenueData.reduce((s, i) => s + i.memberships, 0), color: '#327F74', change: '+15.3%', trend: 'up' },
                          { name: 'Personal Training', value: revenueData.reduce((s, i) => s + i.personalTraining, 0), color: '#82ca9d', change: '-2.1%', trend: 'down' },
                          { name: 'Group Classes', value: revenueData.reduce((s, i) => s + i.groupClasses, 0), color: '#ffc658', change: '+8.7%', trend: 'up' },
                          { name: 'Merchandise', value: revenueData.reduce((s, i) => s + i.merchandise, 0), color: '#ff7c7c', change: '+5.2%', trend: 'up' },
                          { name: 'Other Services', value: revenueData.reduce((s, i) => s + i.other, 0), color: '#8dd1e1', change: '+3.1%', trend: 'up' }
                        ].map((item, index) => (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">{item.name}</span>
                              <div className="flex items-center space-x-2">
                                <span className="text-sm font-bold">{item.value.toLocaleString()} AED</span>
                                <Badge 
                                  variant="secondary" 
                                  className={item.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}
                                >
                                  {item.change}
                                </Badge>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full" 
                                style={{ 
                                  width: `${(item.value / totalRevenue) * 100}%`,
                                  backgroundColor: item.color
                                }}
                              ></div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Detailed Revenue Table */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Detailed Revenue Breakdown</CardTitle>
                      <CardDescription>Period-by-period revenue analysis</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Period</TableHead>
                            <TableHead className="text-right">Memberships</TableHead>
                            <TableHead className="text-right">Personal Training</TableHead>
                            <TableHead className="text-right">Group Classes</TableHead>
                            <TableHead className="text-right">Merchandise</TableHead>
                            <TableHead className="text-right">Other</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {revenueData.map((item, index) => {
                            const periodTotal = item.memberships + item.personalTraining + item.groupClasses + item.merchandise + item.other;
                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">{item.period}</TableCell>
                                <TableCell className="text-right">{item.memberships.toLocaleString()} AED</TableCell>
                                <TableCell className="text-right">{item.personalTraining.toLocaleString()} AED</TableCell>
                                <TableCell className="text-right">{item.groupClasses.toLocaleString()} AED</TableCell>
                                <TableCell className="text-right">{item.merchandise.toLocaleString()} AED</TableCell>
                                <TableCell className="text-right">{item.other.toLocaleString()} AED</TableCell>
                                <TableCell className="text-right font-bold" style={{ color: '#327F74' }}>
                                  {periodTotal.toLocaleString()} AED
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow className="bg-muted/50">
                            <TableCell className="font-bold">Total</TableCell>
                            <TableCell className="text-right font-bold">
                              {revenueData.reduce((s, i) => s + i.memberships, 0).toLocaleString()} AED
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {revenueData.reduce((s, i) => s + i.personalTraining, 0).toLocaleString()} AED
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {revenueData.reduce((s, i) => s + i.groupClasses, 0).toLocaleString()} AED
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {revenueData.reduce((s, i) => s + i.merchandise, 0).toLocaleString()} AED
                            </TableCell>
                            <TableCell className="text-right font-bold">
                              {revenueData.reduce((s, i) => s + i.other, 0).toLocaleString()} AED
                            </TableCell>
                            <TableCell className="text-right font-bold text-lg" style={{ color: '#327F74' }}>
                              {totalRevenue.toLocaleString()} AED
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  {/* Download Action */}
                  <div className="flex items-center justify-center space-x-4 pt-4">
                    <Button onClick={handleDownloadReport} size="lg" style={{ backgroundColor: '#327F74' }}>
                      <Download className="mr-2 h-5 w-5" />
                      Download {selectedFormat.toUpperCase()} Report
                    </Button>
                    <Button variant="outline" size="lg" onClick={() => setShowReport(false)}>
                      <RefreshCw className="mr-2 h-5 w-5" />
                      Generate New Report
                    </Button>
                  </div>
                </div>
              )}

              {showReport && selectedReportType === 'membership' && (
                <MembershipReportContent
                  membershipData={membershipData}
                  totalMembers={totalMembers}
                  totalNewMembers={totalNewMembers}
                  totalCancellations={totalCancellations}
                  retentionRate={retentionRate}
                  selectedDateRange={selectedDateRange}
                  selectedFormat={selectedFormat}
                  memberDemographics={memberDemographics}
                  onDownload={handleDownloadReport}
                  onGenerateNew={() => setShowReport(false)}
                />
              )}

              {showReport && selectedReportType !== 'revenue' && selectedReportType !== 'membership' && (
                <div className="mt-8 text-center py-12 border rounded-lg bg-muted/30">
                  <BarChart3 className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                  <h3 className="text-xl font-semibold mb-2">Report Generated Successfully</h3>
                  <p className="text-muted-foreground mb-4">
                    Your {selectedReportType} report for {selectedDateRange} has been generated.
                  </p>
                  <div className="space-y-2 max-w-md mx-auto mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Report Type:</span>
                      <span className="font-medium">{selectedReportType === 'attendance' ? 'Class Attendance' : 'Equipment Usage'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Date Range:</span>
                      <span className="font-medium">{selectedDateRange === 'week' ? 'Last 7 days' : 
                        selectedDateRange === 'month' ? 'Last 30 days' : 
                        selectedDateRange === 'quarter' ? 'Last 3 months' : 'Last 12 months'}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Format:</span>
                      <span className="font-medium">{selectedFormat.toUpperCase()}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center space-x-4">
                    <Button onClick={handleDownloadReport} style={{ backgroundColor: '#327F74' }}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Report
                    </Button>
                    <Button variant="outline" onClick={() => setShowReport(false)}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Generate New Report
                    </Button>
                  </div>
                </div>
              )}

              {!showReport && (
                <div className="mt-8 text-center py-8 text-muted-foreground border-t">
                  <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Advanced Report Builder</h3>
                  <p>Create custom reports with drag-and-drop functionality and advanced filtering options. This feature is under development.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}