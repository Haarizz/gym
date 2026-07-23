import React, { useState, useEffect, useCallback } from 'react';
import { useCurrency, CurrencyValue } from '../utils/currency';
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
import { financialAnalyticsService } from '../utils/supabase/financial-analytics-service';
import { ledgersService, LedgerTransaction } from '../utils/supabase/ledgers-service';

// Chart colours for expense breakdown
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export function Financials() {
  const { currencyCode } = useCurrency();
  // ── Live data state ────────────────────────────────────────────────────────
  const [kpiData, setKpiData] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    grossProfit: 0,
    netBalance: 0,
    pendingReconciliations: 0,
    outstandingPayments: 0,
  });
  const [monthlyTrends, setMonthlyTrends] = useState<
    { month: string; income: number; expenses: number; profit: number }[]
  >([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<
    { name: string; value: number; color: string }[]
  >([]);
  const [recentTransactions, setRecentTransactions] = useState<
    { id: string | number; date: string; description: string; category: string; amount: number; type: string; status: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, trend, expCat, ledger] = await Promise.all([
        financialAnalyticsService.getDashboard(),
        financialAnalyticsService.getMonthlyTrend(6),
        financialAnalyticsService.getExpenseByCategory(),
        ledgersService.getTransactions(),
      ]);

      setKpiData({
        totalIncome: dashboard.totalRevenue,
        totalExpenses: dashboard.totalExpenses,
        grossProfit: dashboard.netIncome,
        netBalance: dashboard.netIncome,
        pendingReconciliations: dashboard.pendingTaxObligations,
        outstandingPayments: 0,
      });

      setMonthlyTrends(
        trend.map((t) => ({
          month: t.month,
          income: t.revenue,
          expenses: t.expenses,
          profit: t.profit,
        }))
      );

      setExpenseBreakdown(
        expCat.map((e, i) => ({
          name: e.category,
          value: e.amount,
          color: PIE_COLORS[i % PIE_COLORS.length],
        }))
      );

      // Map ledger entries → transaction rows (most recent 20)
      setRecentTransactions(
        ledger.slice(0, 20).map((t: LedgerTransaction) => {
          const isCredit = t.credit > 0;
          return {
            id: t.id,
            date: t.date,
            description: t.description ?? t.type,
            category: isCredit ? 'Income' : 'Expenses',
            amount: isCredit ? t.credit : -t.debit,
            type: isCredit ? 'Credit' : 'Debit',
            status: t.status ?? 'Completed',
          };
        })
      );
    } catch (err) {
      console.error('Failed to load financials data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getCurrentPeriod = () =>
    new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Pending':   return 'bg-yellow-100 text-yellow-800';
      case 'Action Required': return 'bg-red-100 text-red-800';
      case 'Pending Review':  return 'bg-blue-100 text-blue-800';
      case 'Minor Variance':  return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Reconciliations and outstanding vendor payments have no backend API yet
  const pendingReconciliations: { id: number; account: string; bank: string; lastReconciled: string; difference: number; status: string }[] = [];
  const outstandingPayments: { id: number; vendor: string; description: string; amount: number; dueDate: string; overdue: boolean }[] = [];

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
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
                  <CurrencyValue amount={kpiData.totalIncome} />
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
                  <CurrencyValue amount={kpiData.totalExpenses} />
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
                  <CurrencyValue amount={kpiData.grossProfit} />
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
                  <CurrencyValue amount={kpiData.netBalance} />
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
                  <CurrencyValue amount={kpiData.outstandingPayments} />
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
                <Tooltip formatter={(value) => [`${currencyCode} ${value.toLocaleString()}`, '']} />
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
                <Tooltip formatter={(value) => [`${currencyCode} ${value.toLocaleString()}`, '']} />
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
                          {transaction.amount > 0 ? '+' : ''}<CurrencyValue amount={Math.abs(transaction.amount)} />
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
                          {recon.difference >= 0 ? '+' : ''}<CurrencyValue amount={Math.abs(recon.difference)} />
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
                      <TableCell><CurrencyValue amount={payment.amount} /></TableCell>
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

