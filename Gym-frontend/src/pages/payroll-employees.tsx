import React from 'react';
import { useCurrency, CurrencyValue } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  Users, 
  GraduationCap, 
  Calendar, 
  DollarSign, 
  CreditCard, 
  TrendingUp,
  TrendingDown,
  UserPlus,
  Clock,
  AlertCircle,
  CheckCircle,
  Eye,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Activity,
  Award,
  BookOpen,
  UserCheck,
  Wallet,
  BarChart3
} from 'lucide-react';

import { useEffect, useState } from 'react';
import { payrollAnalyticsService, PayrollDashboardData } from '../utils/supabase/payroll-analytics-service';

export function PayrollEmployees() {
  const { currencyCode } = useCurrency();
  const [data, setData] = useState<PayrollDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await payrollAnalyticsService.getDashboardData();
      setData(res);
    } catch (error) {
      console.error("Failed to load dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-500 font-medium">Loading payroll and employee data...</p>
        </div>
      </div>
    );
  }

  const {
    kpiData,
    classBookingTrends,
    payrollDistribution,
    staffByDepartment,
    recentHires,
    upcomingPayments,
    salaryAdvances,
    topPerformingClasses
  } = data;

  const getCurrentPeriod = () => {
    return new Date().toLocaleDateString('en-GB', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
      case 'Approved': 
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Pending': 
      case 'Probation': return 'bg-yellow-100 text-yellow-800';
      case 'Overdue': 
      case 'Terminated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payroll & Employees</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive staff management and payroll system for {getCurrentPeriod()}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Staff & Trainers</p>
                <p className="text-2xl font-bold text-blue-600">
                  {kpiData.totalStaffTrainers}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+3 this month</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Trainings & Classes</p>
                <p className="text-2xl font-bold text-green-600">
                  {kpiData.activeTrainingsClasses}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+2 new classes</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <GraduationCap className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Upcoming Bookings</p>
                <p className="text-2xl font-bold text-orange-600">
                  {kpiData.upcomingBookings}
                </p>
                <div className="flex items-center mt-2">
                  <Clock className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600">Next 7 days</span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Calendar className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Monthly Payroll</p>
                <p className="text-2xl font-bold text-purple-600">
                  <CurrencyValue amount={kpiData.monthlyPayroll} />
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600">+7.2% vs last month</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Salary Payments</p>
                <p className="text-2xl font-bold text-red-600">
                  {kpiData.pendingSalaryPayments}
                </p>
                <div className="flex items-center mt-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">Due by month-end</span>
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Salary Advances Outstanding</p>
                <p className="text-2xl font-bold text-cyan-600">
                  <CurrencyValue amount={kpiData.salaryAdvancesOutstanding} />
                </p>
                <div className="flex items-center mt-2">
                  <Wallet className="h-4 w-4 text-cyan-500 mr-1" />
                  <span className="text-sm text-cyan-600">3 employees</span>
                </div>
              </div>
              <div className="p-3 bg-cyan-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classes, Bookings & Payroll Trends */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>Classes, Bookings & Payroll Trends</span>
                </CardTitle>
                <CardDescription>Monthly performance over the last 6 months</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={classBookingTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'payroll') return [`${currencyCode} ${value.toLocaleString()}`, 'Payroll'];
                    return [value, name === 'classes' ? 'Active Classes' : 'Bookings'];
                  }} 
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="classes" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Active Classes"
                />
                <Line 
                  type="monotone" 
                  dataKey="bookings" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Bookings"
                />
                <Line 
                  type="monotone" 
                  dataKey="payroll" 
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  name={`Payroll (${currencyCode})`}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Staff Distribution by Department */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <span>Staff Distribution by Department</span>
                </CardTitle>
                <CardDescription>Current headcount across departments</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={staffByDepartment}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({department, count}) => `${department}: ${count}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {staffByDepartment.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Distribution Chart */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-purple-600" />
                <span>Monthly Payroll Distribution</span>
              </CardTitle>
              <CardDescription>Salary distribution across departments for {getCurrentPeriod()}</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={payrollDistribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip formatter={(value) => [`${currencyCode} ${value.toLocaleString()}`, 'Payroll']} />
              <Bar dataKey="amount" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bottom Section - Tables */}
      <Tabs defaultValue="hires" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="hires">Recent Hires</TabsTrigger>
          <TabsTrigger value="payments">Upcoming Payments</TabsTrigger>
          <TabsTrigger value="advances">Salary Advances</TabsTrigger>
          <TabsTrigger value="classes">Top Classes</TabsTrigger>
        </TabsList>

        {/* Recent Hires */}
        <TabsContent value="hires" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <UserPlus className="h-5 w-5 text-blue-600" />
                    <span>Recent Hires</span>
                  </CardTitle>
                  <CardDescription>New employees joined in the last 30 days</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Hire Date</TableHead>
                    <TableHead>Salary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentHires.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.position}</TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>
                        {new Date(employee.hireDate).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell><CurrencyValue amount={employee.salary} /></TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(employee.status)}>
                          {employee.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Upcoming Payments */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-red-600" />
                    <span>Upcoming Salary Payments</span>
                  </CardTitle>
                  <CardDescription>Salary payments due in the next 7 days</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Process Payments
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {upcomingPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.employee}</TableCell>
                      <TableCell>{payment.position}</TableCell>
                      <TableCell><CurrencyValue amount={payment.amount} /></TableCell>
                      <TableCell>
                        {new Date(payment.dueDate).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>{payment.type}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Salary Advances */}
        <TabsContent value="advances" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5 text-cyan-600" />
                    <span>Active Salary Advances</span>
                  </CardTitle>
                  <CardDescription>Outstanding salary advances and repayment tracking</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Advance
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Advance Amount</TableHead>
                    <TableHead>Remaining Balance</TableHead>
                    <TableHead>Monthly Deduction</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaryAdvances.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell className="font-medium">{advance.employee}</TableCell>
                      <TableCell>{advance.position}</TableCell>
                      <TableCell><CurrencyValue amount={advance.advanceAmount} /></TableCell>
                      <TableCell className="text-red-600 font-semibold">
                        <CurrencyValue amount={advance.remainingBalance} />
                      </TableCell>
                      <TableCell><CurrencyValue amount={advance.monthlyDeduction} /></TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(advance.status)}>
                          {advance.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Performing Classes */}
        <TabsContent value="classes" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Award className="h-5 w-5 text-green-600" />
                    <span>Top Performing Classes</span>
                  </CardTitle>
                  <CardDescription>Most popular classes and instructor performance</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Class
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Bookings</TableHead>
                    <TableHead>Capacity</TableHead>
                    <TableHead>Revenue</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPerformingClasses.map((classData) => (
                    <TableRow key={classData.id}>
                      <TableCell className="font-medium">{classData.className}</TableCell>
                      <TableCell>{classData.instructor}</TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <span>{classData.bookings}</span>
                          <Progress 
                            value={(classData.bookings / classData.capacity) * 100} 
                            className="w-16 h-2"
                          />
                        </div>
                      </TableCell>
                      <TableCell>{classData.capacity}</TableCell>
                      <TableCell><CurrencyValue amount={classData.revenue} /></TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <span className="text-yellow-500">⭐</span>
                          <span>{classData.rating}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

