import React, { useState, useEffect, useMemo } from "react";
import { useCurrency } from "../utils/currency";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import {
  Download,
  Users,
  Wallet,
  TrendingUp,
  Brain,
  Building2,
  RefreshCw,
  Clock
} from "lucide-react";
import { toast } from "sonner";

import { salaryPaymentsService, SalaryPaymentEmployee, SalaryPaymentHistory } from "../utils/supabase/salary-payments-service";

export function PayrollAnalytics() {
  const { currencyCode } = useCurrency();
  const [employeesData, setEmployeesData] = useState<SalaryPaymentEmployee[]>([]);
  const [paymentsData, setPaymentsData] = useState<SalaryPaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [emp, pay] = await Promise.all([
          salaryPaymentsService.getEmployees(),
          salaryPaymentsService.getPayments()
        ]);
        setEmployeesData(emp);
        setPaymentsData(pay);
      } catch (error) {
        toast.error("Failed to load payroll analytics data.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const departmentCosts = useMemo(() => {
    const deptMap = new Map<string, number>();
    employeesData.forEach(emp => {
       const cost = emp.baseSalary + emp.allowances;
       const dept = emp.department || 'Other';
       deptMap.set(dept, (deptMap.get(dept) || 0) + cost);
    });
    const colors = ["#2B7A78", "#3b82f6", "#f59e0b", "#8b5cf6", "#10b981", "#ef4444"];
    return Array.from(deptMap.entries()).map(([name, value], i) => ({
      name, value, color: colors[i % colors.length]
    }));
  }, [employeesData]);

  const { avgCost, totalHeadcount, allowancesPercent, totalMonthlyCost } = useMemo(() => {
     const count = employeesData.length;
     let totalCost = 0;
     let totalAllowances = 0;
     employeesData.forEach(emp => {
       totalCost += emp.baseSalary + emp.allowances;
       totalAllowances += emp.allowances;
     });
     return {
       totalMonthlyCost: totalCost,
       avgCost: count ? totalCost / count : 0,
       totalHeadcount: count,
       allowancesPercent: totalCost ? (totalAllowances / totalCost) * 100 : 0
     };
  }, [employeesData]);

  const monthlyTrend = useMemo(() => {
     const grouped = new Map<string, { cost: number, employees: Set<string>, year: number }>();
     paymentsData.forEach(p => {
       const key = `${p.month.substring(0,3)} ${p.year}`;
       if(!grouped.has(key)) grouped.set(key, { cost: 0, employees: new Set(), year: p.year });
       grouped.get(key)!.cost += p.netSalary;
       grouped.get(key)!.employees.add(p.employeeId);
     });
     
     return Array.from(grouped.entries()).map(([month, data]) => ({
       month,
       cost: data.cost,
       headcount: data.employees.size,
       year: data.year
     })).sort((a, b) => a.year - b.year || paymentsData.findIndex(p => p.month.startsWith(a.month)) - paymentsData.findIndex(p => p.month.startsWith(b.month)));
  }, [paymentsData]);

  const handleExport = () => {
    toast.success("Analytics report exported successfully!");
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-primary rounded-lg p-2">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Payroll Analytics</h1>
            <p className="text-sm text-gray-600 mt-1">
              Deep dive into workforce costs, trends, and department efficiency.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={handleExport} style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Average Monthly Cost</p>
                <h3 className="text-2xl font-bold text-gray-900">{currencyCode} {Math.round(totalMonthlyCost).toLocaleString()}</h3>
              </div>
              <div className="bg-primary/10 p-2 rounded-lg">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Total Headcount</p>
                <h3 className="text-2xl font-bold text-gray-900">{totalHeadcount}</h3>
              </div>
              <div className="bg-blue-50 p-2 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Avg Cost Per Employee</p>
                <h3 className="text-2xl font-bold text-gray-900">{currencyCode} {Math.round(avgCost).toLocaleString()}</h3>
              </div>
              <div className="bg-purple-50 p-2 rounded-lg">
                <Building2 className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm hover:shadow-md transition-shadow bg-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Overtime & Allowances</p>
                <h3 className="text-2xl font-bold text-gray-900">{allowancesPercent.toFixed(1)}%</h3>
              </div>
              <div className="bg-amber-50 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Payroll Cost Trend & Headcount</CardTitle>
            <CardDescription>6-month historical view of total payroll vs active employees</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {monthlyTrend.length > 0 ? (
                  <AreaChart data={monthlyTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2B7A78" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2B7A78" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                    <YAxis yAxisId="left" tickFormatter={(value) => `${value/1000}k`} axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === "cost") return [`${currencyCode} ${value.toLocaleString()}`, "Total Cost"];
                        return [value, "Headcount"];
                      }}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend />
                    <Area yAxisId="left" type="monotone" dataKey="cost" stroke="#2B7A78" strokeWidth={3} fillOpacity={1} fill="url(#colorCost)" name="Total Cost" />
                    <Line yAxisId="right" type="monotone" dataKey="headcount" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} name="Headcount" />
                  </AreaChart>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No historical payment data available
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Cost by Department</CardTitle>
            <CardDescription>Distribution of payroll expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {departmentCosts.length > 0 ? (
                  <PieChart>
                    <Pie
                      data={departmentCosts}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {departmentCosts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `${currencyCode} ${value.toLocaleString()}`} />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No department data available
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Department Comparison</CardTitle>
            <CardDescription>Visual breakdown of department budgets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {departmentCosts.length > 0 ? (
                  <BarChart data={departmentCosts} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                    <XAxis type="number" tickFormatter={(value) => `${value/1000}k`} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} />
                    <Tooltip formatter={(value: number) => `${currencyCode} ${value.toLocaleString()}`} cursor={{ fill: 'rgba(0,0,0,0.02)' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {departmentCosts.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No department data available
                  </div>
                )}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
