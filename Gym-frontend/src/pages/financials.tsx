import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Progress } from "../components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Receipt, 
  AlertCircle, 
  CreditCard, 
  Calendar, 
  ArrowUpRight, 
  ArrowDownRight,
  Eye,
  Plus,
  Filter,
  Download,
  RefreshCw,
  Wallet,
  PieChart as PieChartIcon,
  BarChart3,
  Activity
} from 'lucide-react';

// Sample financial data
const kpiData = {
  totalIncome: 125000,
  totalExpenses: 78500,
  grossProfit: 46500,
  netBalance: 42300,
  pendingReconciliations: 5,
  outstandingPayments: 12500
};

const monthlyTrends = [
  { month: 'Jan', income: 95000, expenses: 65000, profit: 30000 },
  { month: 'Feb', income: 108000, expenses: 72000, profit: 36000 },
  { month: 'Mar', income: 118000, expenses: 75000, profit: 43000 },
  { month: 'Apr', income: 125000, expenses: 78500, profit: 46500 },
  { month: 'May', income: 132000, expenses: 82000, profit: 50000 },
  { month: 'Jun', income: 140000, expenses: 85000, profit: 55000 }
];

const expenseBreakdown = [
  { name: 'Salaries & Benefits', value: 35000, color: '#3b82f6' },
  { name: 'Rent & Utilities', value: 18000, color: '#10b981' },
  { name: 'Equipment & Maintenance', value: 12500, color: '#f59e0b' },
  { name: 'Marketing & Advertising', value: 8000, color: '#ef4444' },
  { name: 'Supplies & Inventory', value: 5000, color: '#8b5cf6' }
];

const recentTransactions = [
  {
    id: 1,
    date: '2024-09-25',
    description: 'Membership Payments - Premium Plan',
    category: 'Income',
    amount: 15000,
    type: 'Credit',
    status: 'Completed'
  },
  {
    id: 2,
    date: '2024-09-24',
    description: 'Equipment Maintenance - Treadmill Service',
    category: 'Expenses',
    amount: -2500,
    type: 'Debit',
    status: 'Completed'
  },
  {
    id: 3,
    date: '2024-09-24',
    description: 'Personal Training Sessions',
    category: 'Income',
    amount: 8500,
    type: 'Credit',
    status: 'Completed'
  },
  {
    id: 4,
    date: '2024-09-23',
    description: 'Electricity Bill - Monthly',
    category: 'Expenses',
    amount: -3200,
    type: 'Debit',
    status: 'Pending'
  },
  {
    id: 5,
    date: '2024-09-23',
    description: 'Supplement Sales',
    category: 'Income',
    amount: 4200,
    type: 'Credit',
    status: 'Completed'
  }
];

const pendingReconciliations = [
  {
    id: 1,
    account: 'Main Business Account',
    bank: 'Emirates NBD',
    lastReconciled: '2024-09-20',
    difference: 1250,
    status: 'Pending Review'
  },
  {
    id: 2,
    account: 'Petty Cash Account',
    bank: 'ADCB',
    lastReconciled: '2024-09-18',
    difference: -350,
    status: 'Action Required'
  },
  {
    id: 3,
    account: 'Credit Card Processing',
    bank: 'HSBC',
    lastReconciled: '2024-09-22',
    difference: 75,
    status: 'Minor Variance'
  }
];

const outstandingPayments = [
  {
    id: 1,
    vendor: 'Fitness Equipment Co.',
    description: 'New Rowing Machines',
    amount: 8500,
    dueDate: '2024-09-30',
    overdue: false
  },
  {
    id: 2,
    vendor: 'Elite Cleaning Services',
    description: 'Monthly Cleaning Contract',
    amount: 2200,
    dueDate: '2024-09-28',
    overdue: false
  },
  {
    id: 3,
    vendor: 'Marketing Plus Agency',
    description: 'Digital Marketing Campaign',
    amount: 1800,
    dueDate: '2024-09-20',
    overdue: true
  }
];

export function Financials() {
  const getCurrentPeriod = () => {
    return new Date().toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} AED`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Action Required': return 'bg-red-100 text-red-800';
      case 'Pending Review': return 'bg-blue-100 text-blue-800';
      case 'Minor Variance': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financials</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive financial overview for {getCurrentPeriod()}
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
                <p className="text-sm font-medium text-gray-600">Total Income</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(kpiData.totalIncome)}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">+12.5%</span>
                </div>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <ArrowUpRight className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(kpiData.totalExpenses)}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                  <span className="text-sm text-red-600">+8.2%</span>
                </div>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <ArrowDownRight className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Gross Profit</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(kpiData.grossProfit)}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-blue-500 mr-1" />
                  <span className="text-sm text-blue-600">+18.3%</span>
                </div>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Net Balance</p>
                <p className="text-2xl font-bold text-cyan-600">
                  {formatCurrency(kpiData.netBalance)}
                </p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="h-4 w-4 text-cyan-500 mr-1" />
                  <span className="text-sm text-cyan-600">+15.7%</span>
                </div>
              </div>
              <div className="p-3 bg-cyan-100 rounded-lg">
                <Wallet className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending Reconciliations</p>
                <p className="text-2xl font-bold text-orange-600">
                  {kpiData.pendingReconciliations}
                </p>
                <div className="flex items-center mt-2">
                  <AlertCircle className="h-4 w-4 text-orange-500 mr-1" />
                  <span className="text-sm text-orange-600">Requires attention</span>
                </div>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Receipt className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-0 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Outstanding Payments</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(kpiData.outstandingPayments)}
                </p>
                <div className="flex items-center mt-2">
                  <Calendar className="h-4 w-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600">Due soon</span>
                </div>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Trend */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5 text-blue-600" />
                  <span>Income vs Expenses Trend</span>
                </CardTitle>
                <CardDescription>Monthly comparison over the last 6 months</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => [`${value.toLocaleString()} AED`, '']} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  name="Income"
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  name="Expenses"
                />
                <Line 
                  type="monotone" 
                  dataKey="profit" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Profit"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Breakdown */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <PieChartIcon className="h-5 w-5 text-orange-600" />
                  <span>Expense Breakdown</span>
                </CardTitle>
                <CardDescription>Current month expense distribution</CardDescription>
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
                  data={expenseBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expenseBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value.toLocaleString()} AED`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Section - Tables */}
      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="reconciliations">Pending Reconciliations</TabsTrigger>
          <TabsTrigger value="payments">Outstanding Payments</TabsTrigger>
        </TabsList>

        {/* Recent Transactions */}
        <TabsContent value="transactions" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span>Recent Transactions</span>
                  </CardTitle>
                  <CardDescription>Latest financial transactions and activities</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        {new Date(transaction.date).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {transaction.description}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          transaction.category === 'Income' 
                            ? 'border-green-200 text-green-700 bg-green-50' 
                            : 'border-red-200 text-red-700 bg-red-50'
                        }>
                          {transaction.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={
                          transaction.amount > 0 
                            ? 'text-green-600 font-semibold' 
                            : 'text-red-600 font-semibold'
                        }>
                          {transaction.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status}
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

        {/* Pending Reconciliations */}
        <TabsContent value="reconciliations" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <span>Pending Reconciliations</span>
                  </CardTitle>
                  <CardDescription>Bank accounts requiring reconciliation</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Start Reconciliation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Bank</TableHead>
                    <TableHead>Last Reconciled</TableHead>
                    <TableHead>Difference</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReconciliations.map((recon) => (
                    <TableRow key={recon.id}>
                      <TableCell className="font-medium">{recon.account}</TableCell>
                      <TableCell>{recon.bank}</TableCell>
                      <TableCell>
                        {new Date(recon.lastReconciled).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <span className={
                          recon.difference >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }>
                          {recon.difference >= 0 ? '+' : ''}{formatCurrency(Math.abs(recon.difference))}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(recon.status)}>
                          {recon.status}
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

        {/* Outstanding Payments */}
        <TabsContent value="payments" className="space-y-4">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5 text-purple-600" />
                    <span>Outstanding Payments</span>
                  </CardTitle>
                  <CardDescription>Payments due to vendors and suppliers</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Record Payment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">{payment.vendor}</TableCell>
                      <TableCell>{payment.description}</TableCell>
                      <TableCell>{formatCurrency(payment.amount)}</TableCell>
                      <TableCell>
                        {new Date(payment.dueDate).toLocaleDateString('en-GB')}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          payment.overdue 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-green-100 text-green-800'
                        }>
                          {payment.overdue ? 'Overdue' : 'Pending'}
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
      </Tabs>
    </div>
  );
}

