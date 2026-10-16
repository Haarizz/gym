import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "./ui/dialog";
import { Separator } from "./ui/separator";
import { Progress } from "./ui/progress";
import {
  Calculator,
  Users,
  Clock,
  CheckCircle,
  DollarSign,
  TrendingUp,
  FileText,
  Download,
  Send,
  Eye,
  Calendar as CalendarIcon,
  RefreshCw,
  BarChart3,
  PieChart,
  AlertCircle,
  XCircle,
  Edit,
  Wallet,
  CreditCard,
  Building,
  Receipt,
  ArrowRight,
  Plus,
  Search,
  Filter
} from "lucide-react";
import { format, addMonths, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns";
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { toast } from "sonner@2.0.3";

interface PayrollProps {
  onNavigate?: (section: string) => void;
}

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  designation: string;
  department: string;
  basicSalary: number;
  allowances: number;
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateArrivals: number;
  overtimeHours: number;
  paidLeaves: number;
  unpaidLeaves: number;
  email: string;
  bankAccount: string;
}

interface PayrollCycle {
  id: string;
  month: string;
  year: number;
  period: string;
  totalEmployees: number;
  totalWorkingDays: number;
  status: "Draft" | "Pending" | "Approved" | "Disbursed";
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  createdAt: Date;
  approvedAt?: Date;
  disbursedAt?: Date;
  approvedBy?: string;
}

interface EmployeePayroll {
  employeeId: string;
  employeeName: string;
  designation: string;
  department: string;
  basicSalary: number;
  allowances: number;
  overtimePay: number;
  grossSalary: number;
  deductions: number;
  lateArrivalDeduction: number;
  absenceDeduction: number;
  netSalary: number;
  presentDays: number;
  workingDays: number;
  overtimeHours: number;
  paidLeaves: number;
  unpaidLeaves: number;
  lateArrivals: number;
  status: "Draft" | "Approved" | "Paid";
  paymentMethod: string;
  paymentDate?: Date;
}

// Sample employee data with attendance
const sampleEmployees: Employee[] = [
  {
    id: "1",
    name: "Ahmed Hassan",
    employeeId: "EMP001",
    designation: "Senior Trainer",
    department: "Personal Training",
    basicSalary: 8000,
    allowances: 1500,
    workingDays: 26,
    presentDays: 24,
    absentDays: 2,
    lateArrivals: 3,
    overtimeHours: 8,
    paidLeaves: 0,
    unpaidLeaves: 2,
    email: "ahmed.hassan@gymbios.com",
    bankAccount: "ADCB ****1234"
  },
  {
    id: "2",
    name: "Sarah Johnson",
    employeeId: "EMP002",
    designation: "Receptionist",
    department: "Front Desk",
    basicSalary: 4500,
    allowances: 800,
    workingDays: 26,
    presentDays: 26,
    absentDays: 0,
    lateArrivals: 1,
    overtimeHours: 4,
    paidLeaves: 0,
    unpaidLeaves: 0,
    email: "sarah.johnson@gymbios.com",
    bankAccount: "ENBD ****5678"
  },
  {
    id: "3",
    name: "Mohammed Ali",
    employeeId: "EMP003",
    designation: "Yoga Instructor",
    department: "Group Classes",
    basicSalary: 5500,
    allowances: 1000,
    workingDays: 26,
    presentDays: 25,
    absentDays: 1,
    lateArrivals: 2,
    overtimeHours: 6,
    paidLeaves: 0,
    unpaidLeaves: 1,
    email: "mohammed.ali@gymbios.com",
    bankAccount: "FAB ****9012"
  },
  {
    id: "4",
    name: "Fatima Ahmed",
    employeeId: "EMP004",
    designation: "Operations Manager",
    department: "Management",
    basicSalary: 12000,
    allowances: 2000,
    workingDays: 26,
    presentDays: 26,
    absentDays: 0,
    lateArrivals: 0,
    overtimeHours: 10,
    paidLeaves: 0,
    unpaidLeaves: 0,
    email: "fatima.ahmed@gymbios.com",
    bankAccount: "ADIB ****3456"
  },
  {
    id: "5",
    name: "John Smith",
    employeeId: "EMP005",
    designation: "Fitness Trainer",
    department: "Personal Training",
    basicSalary: 6500,
    allowances: 1200,
    workingDays: 26,
    presentDays: 23,
    absentDays: 3,
    lateArrivals: 5,
    overtimeHours: 5,
    paidLeaves: 0,
    unpaidLeaves: 3,
    email: "john.smith@gymbios.com",
    bankAccount: "HSBC ****7890"
  },
  {
    id: "6",
    name: "Aisha Khan",
    employeeId: "EMP006",
    designation: "Nutritionist",
    department: "Nutrition",
    basicSalary: 7000,
    allowances: 1300,
    workingDays: 26,
    presentDays: 24,
    absentDays: 2,
    lateArrivals: 1,
    overtimeHours: 7,
    paidLeaves: 0,
    unpaidLeaves: 2,
    email: "aisha.khan@gymbios.com",
    bankAccount: "RAK ****2468"
  },
  {
    id: "7",
    name: "Omar Rashid",
    employeeId: "EMP007",
    designation: "Facility Manager",
    department: "Maintenance",
    basicSalary: 5000,
    allowances: 900,
    workingDays: 26,
    presentDays: 26,
    absentDays: 0,
    lateArrivals: 0,
    overtimeHours: 3,
    paidLeaves: 0,
    unpaidLeaves: 0,
    email: "omar.rashid@gymbios.com",
    bankAccount: "DIB ****1357"
  },
  {
    id: "8",
    name: "Lisa Williams",
    employeeId: "EMP008",
    designation: "Sales Executive",
    department: "Sales",
    basicSalary: 7500,
    allowances: 1400,
    workingDays: 26,
    presentDays: 25,
    absentDays: 1,
    lateArrivals: 2,
    overtimeHours: 9,
    paidLeaves: 0,
    unpaidLeaves: 1,
    email: "lisa.williams@gymbios.com",
    bankAccount: "CBD ****8642"
  }
];

// Sample payroll cycles
const samplePayrollCycles: PayrollCycle[] = [
  {
    id: "1",
    month: "November",
    year: 2025,
    period: "November 2025",
    totalEmployees: 8,
    totalWorkingDays: 26,
    status: "Draft",
    grossSalary: 58500,
    totalDeductions: 2340,
    netSalary: 56160,
    createdAt: new Date(2025, 10, 1)
  },
  {
    id: "2",
    month: "October",
    year: 2025,
    period: "October 2025",
    totalEmployees: 8,
    totalWorkingDays: 27,
    status: "Disbursed",
    grossSalary: 57800,
    totalDeductions: 2312,
    netSalary: 55488,
    createdAt: new Date(2025, 9, 1),
    approvedAt: new Date(2025, 9, 28),
    disbursedAt: new Date(2025, 9, 30),
    approvedBy: "HR Manager"
  },
  {
    id: "3",
    month: "September",
    year: 2025,
    period: "September 2025",
    totalEmployees: 8,
    totalWorkingDays: 26,
    status: "Disbursed",
    grossSalary: 58200,
    totalDeductions: 2328,
    netSalary: 55872,
    createdAt: new Date(2025, 8, 1),
    approvedAt: new Date(2025, 8, 27),
    disbursedAt: new Date(2025, 8, 30),
    approvedBy: "HR Manager"
  }
];

export function Payroll({ onNavigate }: PayrollProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [payrollCycles, setPayrollCycles] = useState<PayrollCycle[]>(samplePayrollCycles);
  const [selectedCycle, setSelectedCycle] = useState<PayrollCycle | null>(null);
  const [generatedPayroll, setGeneratedPayroll] = useState<EmployeePayroll[]>([]);
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showPayslipDialog, setShowPayslipDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeePayroll | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  
  // Generation form
  const [generationMonth, setGenerationMonth] = useState("November");
  const [generationYear, setGenerationYear] = useState("2025");

  // Calculate salary for an employee
  const calculateSalary = (employee: Employee): EmployeePayroll => {
    const perDaySalary = employee.basicSalary / employee.workingDays;
    const earnedSalary = perDaySalary * employee.presentDays;
    
    // Overtime calculation (assuming AED 50 per hour)
    const overtimePay = employee.overtimeHours * 50;
    
    // Deductions
    const absenceDeduction = perDaySalary * employee.unpaidLeaves;
    const lateArrivalDeduction = employee.lateArrivals * 100; // AED 100 per late arrival
    const totalDeductions = absenceDeduction + lateArrivalDeduction;
    
    // Gross and Net
    const grossSalary = earnedSalary + employee.allowances + overtimePay;
    const netSalary = grossSalary - totalDeductions;

    return {
      employeeId: employee.employeeId,
      employeeName: employee.name,
      designation: employee.designation,
      department: employee.department,
      basicSalary: employee.basicSalary,
      allowances: employee.allowances,
      overtimePay,
      grossSalary,
      deductions: totalDeductions,
      lateArrivalDeduction,
      absenceDeduction,
      netSalary,
      presentDays: employee.presentDays,
      workingDays: employee.workingDays,
      overtimeHours: employee.overtimeHours,
      paidLeaves: employee.paidLeaves,
      unpaidLeaves: employee.unpaidLeaves,
      lateArrivals: employee.lateArrivals,
      status: "Draft",
      paymentMethod: "Bank Transfer",
      paymentDate: undefined
    };
  };

  // Generate payroll for selected period
  const handleGeneratePayroll = () => {
    const payrollData = sampleEmployees.map(emp => calculateSalary(emp));
    setGeneratedPayroll(payrollData);
    
    const totalGross = payrollData.reduce((sum, p) => sum + p.grossSalary, 0);
    const totalDed = payrollData.reduce((sum, p) => sum + p.deductions, 0);
    const totalNet = payrollData.reduce((sum, p) => sum + p.netSalary, 0);
    
    const newCycle: PayrollCycle = {
      id: Date.now().toString(),
      month: generationMonth,
      year: parseInt(generationYear),
      period: `${generationMonth} ${generationYear}`,
      totalEmployees: sampleEmployees.length,
      totalWorkingDays: 26,
      status: "Draft",
      grossSalary: totalGross,
      totalDeductions: totalDed,
      netSalary: totalNet,
      createdAt: new Date()
    };
    
    setSelectedCycle(newCycle);
    setShowGenerateDialog(false);
    setActiveTab("review");
    toast.success("Payroll generated successfully from attendance data!");
  };

  // Approve payroll
  const handleApprovePayroll = () => {
    if (!selectedCycle) return;
    
    const updatedCycle = {
      ...selectedCycle,
      status: "Approved" as const,
      approvedAt: new Date(),
      approvedBy: "HR Manager"
    };
    
    setSelectedCycle(updatedCycle);
    
    const updatedPayroll = generatedPayroll.map(p => ({
      ...p,
      status: "Approved" as const
    }));
    
    setGeneratedPayroll(updatedPayroll);
    setShowApprovalDialog(false);
    toast.success("Payroll approved successfully!");
  };

  // Disburse payroll
  const handleDisbursePayroll = () => {
    if (!selectedCycle) return;
    
    const updatedCycle = {
      ...selectedCycle,
      status: "Disbursed" as const,
      disbursedAt: new Date()
    };
    
    setPayrollCycles([updatedCycle, ...payrollCycles]);
    setSelectedCycle(null);
    setGeneratedPayroll([]);
    setActiveTab("dashboard");
    toast.success("Payroll disbursed successfully! Payslips generated.");
  };

  // Summary stats
  const dashboardStats = useMemo(() => {
    const totalEmp = sampleEmployees.length;
    const pendingPayrolls = payrollCycles.filter(c => c.status === "Pending").length;
    const approvedPayrolls = payrollCycles.filter(c => c.status === "Approved").length;
    const disbursedPayrolls = payrollCycles.filter(c => c.status === "Disbursed").length;
    
    return {
      totalEmployees: totalEmp,
      pendingPayrolls,
      approvedPayrolls,
      disbursedPayrolls
    };
  }, [payrollCycles]);

  // Filtered payroll data
  const filteredPayroll = useMemo(() => {
    return generatedPayroll.filter(p => {
      const matchesSearch = p.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           p.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDept = departmentFilter === "all" || p.department === departmentFilter;
      return matchesSearch && matchesDept;
    });
  }, [generatedPayroll, searchTerm, departmentFilter]);

  const departments = Array.from(new Set(sampleEmployees.map(e => e.department)));

  // Chart data
  const departmentChartData = useMemo(() => {
    const deptMap = new Map<string, number>();
    generatedPayroll.forEach(p => {
      deptMap.set(p.department, (deptMap.get(p.department) || 0) + p.netSalary);
    });
    return Array.from(deptMap.entries()).map(([name, value]) => ({ name, value }));
  }, [generatedPayroll]);

  const deductionChartData = useMemo(() => {
    const totalLate = generatedPayroll.reduce((sum, p) => sum + p.lateArrivalDeduction, 0);
    const totalAbsence = generatedPayroll.reduce((sum, p) => sum + p.absenceDeduction, 0);
    return [
      { name: "Late Arrivals", value: totalLate },
      { name: "Absences", value: totalAbsence }
    ];
  }, [generatedPayroll]);

  const monthlyTrendData = [
    { month: "Sep", amount: 55872 },
    { month: "Oct", amount: 55488 },
    { month: "Nov", amount: 56160 }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Draft":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Disbursed":
      case "Paid":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Draft":
        return <Edit className="h-4 w-4" />;
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "Approved":
        return <CheckCircle className="h-4 w-4" />;
      case "Disbursed":
      case "Paid":
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const COLORS = ['#2B7A78', '#E63946', '#F4A261', '#2A9D8F', '#E76F51', '#264653'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <Calculator className="h-8 w-8" style={{ color: '#2B7A78' }} />
            Payroll Management
          </h1>
          <p className="text-muted-foreground">
            Automated salary processing based on attendance, shifts, and leave records
          </p>
        </div>
        <Button
          onClick={() => setShowGenerateDialog(true)}
          style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Generate Payroll
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="review">
            <Eye className="mr-2 h-4 w-4" />
            Review Payroll
          </TabsTrigger>
          <TabsTrigger value="history">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Payroll History
          </TabsTrigger>
          <TabsTrigger value="reports">
            <FileText className="mr-2 h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="border-l-4" style={{ borderLeftColor: '#2B7A78' }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4" style={{ color: '#2B7A78' }} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active staff members
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payrolls</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.pendingPayrolls}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Awaiting approval
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Payrolls</CardTitle>
                <CheckCircle className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.approvedPayrolls}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ready for disbursement
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disbursed Payrolls</CardTitle>
                <Wallet className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.disbursedPayrolls}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Successfully paid
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Recent Payrolls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full justify-start"
                  style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                  onClick={() => setShowGenerateDialog(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Generate New Payroll
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => setActiveTab("history")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  View History
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => toast.info("Exporting payroll report...")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </CardContent>
            </Card>

            {/* Recent Payroll Cycles */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Recent Payroll Cycles
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {payrollCycles.slice(0, 3).map((cycle) => (
                    <div key={cycle.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="font-medium">{cycle.period}</div>
                        <div className="text-sm text-muted-foreground">
                          {cycle.totalEmployees} employees • AED {cycle.netSalary.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(cycle.status)}>
                          {getStatusIcon(cycle.status)}
                          <span className="ml-1">{cycle.status}</span>
                        </Badge>
                        {cycle.status === "Draft" && (
                          <Button size="sm" variant="outline">
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" style={{ color: '#2B7A78' }} />
                Monthly Payroll Trend
              </CardTitle>
              <CardDescription>Net payroll amount over the last 3 months</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `AED ${value.toLocaleString()}`} />
                  <Line type="monotone" dataKey="amount" stroke="#2B7A78" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Payroll Tab */}
        <TabsContent value="review" className="space-y-6">
          {selectedCycle ? (
            <>
              {/* Cycle Summary */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Payroll Summary - {selectedCycle.period}</CardTitle>
                      <CardDescription>
                        Generated from attendance data • {selectedCycle.totalWorkingDays} working days
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(selectedCycle.status)} style={{ fontSize: '14px', padding: '8px 16px' }}>
                      {getStatusIcon(selectedCycle.status)}
                      <span className="ml-2">{selectedCycle.status}</span>
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground mb-1">Total Employees</div>
                          <div className="text-2xl font-bold">{selectedCycle.totalEmployees}</div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground mb-1">Gross Salary</div>
                          <div className="text-2xl font-bold" style={{ color: '#2B7A78' }}>
                            AED {selectedCycle.grossSalary.toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground mb-1">Total Deductions</div>
                          <div className="text-2xl font-bold text-red-600">
                            AED {selectedCycle.totalDeductions.toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/50">
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <div className="text-sm text-muted-foreground mb-1">Net Payable</div>
                          <div className="text-2xl font-bold" style={{ color: '#2B7A78' }}>
                            AED {selectedCycle.netSalary.toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>

              {/* Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4 items-center">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search employees..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Employee Payroll Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Employee Payroll Details</CardTitle>
                  <CardDescription>Auto-calculated from attendance records</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="text-xs pl-4 sticky left-0 bg-muted/30">Employee</TableHead>
                        <TableHead className="text-xs">Basic</TableHead>
                        <TableHead className="text-xs">Allowances</TableHead>
                        <TableHead className="text-xs">Gross Fixed</TableHead>
                        <TableHead className="text-xs text-center">Sched. Hrs</TableHead>
                        <TableHead className="text-xs text-center">Actual Hrs</TableHead>
                        <TableHead className="text-xs text-center">Regular Hrs</TableHead>
                        <TableHead className="text-xs text-center">Appr. OT Hrs</TableHead>
                        <TableHead className="text-xs text-right">OT Earnings</TableHead>
                        <TableHead className="text-xs text-right">Commission</TableHead>
                        <TableHead className="text-xs text-right">Attend. Ded.</TableHead>
                        <TableHead className="text-xs text-right">Adv. Repay.</TableHead>
                        <TableHead className="text-xs text-right">Other Ded.</TableHead>
                        <TableHead className="text-xs text-right">Gross Pay</TableHead>
                        <TableHead className="text-xs text-right">Net Pay</TableHead>
                        <TableHead className="text-xs text-center">Status</TableHead>
                        <TableHead className="text-xs text-center">Detail</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayroll.map((payroll) => {
                        const schedHrs = payroll.workingDays * 8;
                        const actualHrs = payroll.presentDays * 8 + payroll.overtimeHours;
                        const regularHrs = payroll.presentDays * 8;
                        const commission = payroll.employeeId.includes("001") ? 3250 : payroll.employeeId.includes("002") ? 800 : 0;
                        const advRepay = payroll.employeeId.includes("001") ? 1000 : payroll.employeeId.includes("002") ? 500 : 0;
                        const otherDed = payroll.employeeId.includes("001") ? 765 : payroll.employeeId.includes("002") ? 100 : payroll.employeeId.includes("003") ? 200 : 200;
                        const grossPay = payroll.grossSalary + commission;
                        const netPay = grossPay - payroll.deductions - advRepay - otherDed;
                        return (
                        <TableRow key={payroll.employeeId} className="hover:bg-muted/20 cursor-pointer" onClick={() => { setSelectedEmployee(payroll); setShowPayslipDialog(true); }}>
                          <TableCell className="pl-4 sticky left-0 bg-background">
                            <div className="font-medium text-sm">{payroll.employeeName}</div>
                            <div className="text-[10px] text-muted-foreground">{payroll.employeeId} · {payroll.designation}</div>
                          </TableCell>
                          <TableCell className="text-xs">AED {payroll.basicSalary.toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-green-700">+{payroll.allowances.toLocaleString()}</TableCell>
                          <TableCell className="text-xs font-medium">AED {(payroll.basicSalary + payroll.allowances).toLocaleString()}</TableCell>
                          <TableCell className="text-center text-xs">{schedHrs}h</TableCell>
                          <TableCell className="text-center text-xs">{actualHrs}h</TableCell>
                          <TableCell className="text-center text-xs">{regularHrs}h</TableCell>
                          <TableCell className="text-center text-xs font-medium text-teal-700">{payroll.overtimeHours}h</TableCell>
                          <TableCell className="text-right text-xs text-green-700">+{payroll.overtimePay.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs text-green-700">{commission > 0 ? `+${commission.toLocaleString()}` : "—"}</TableCell>
                          <TableCell className="text-right text-xs text-red-600">-{payroll.deductions.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs text-orange-600">{advRepay > 0 ? `-${advRepay.toLocaleString()}` : "—"}</TableCell>
                          <TableCell className="text-right text-xs text-purple-600">-{otherDed.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs font-medium">AED {grossPay.toLocaleString()}</TableCell>
                          <TableCell className="text-right text-xs font-bold" style={{ color: '#2B7A78' }}>AED {netPay.toLocaleString()}</TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-[10px] border ${payroll.status === "Approved" ? "bg-green-50 text-green-700 border-green-200" : payroll.status === "Paid" ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                              {payroll.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0"
                              onClick={() => { setSelectedEmployee(payroll); setShowPayslipDialog(true); }}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Action Buttons */}
              {selectedCycle.status === "Draft" && (
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedCycle(null);
                      setGeneratedPayroll([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => setShowApprovalDialog(true)}
                    style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve Payroll
                  </Button>
                </div>
              )}

              {selectedCycle.status === "Approved" && (
                <div className="flex justify-end gap-3">
                  <Button
                    onClick={handleDisbursePayroll}
                    style={{ background: 'linear-gradient(135deg, #E63946 0%, #E63946 100%)', color: 'white' }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Disburse & Generate Payslips
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calculator className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">No Payroll Generated</h3>
                <p className="text-muted-foreground mb-4">
                  Generate a new payroll cycle to review employee salaries
                </p>
                <Button
                  onClick={() => setShowGenerateDialog(true)}
                  style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Payroll
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Payroll History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payroll History</CardTitle>
              <CardDescription>View all past payroll cycles and their status</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Gross Amount</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Disbursed</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollCycles.map((cycle) => (
                    <TableRow key={cycle.id}>
                      <TableCell>
                        <div className="font-medium">{cycle.period}</div>
                      </TableCell>
                      <TableCell>{cycle.totalEmployees}</TableCell>
                      <TableCell>AED {cycle.grossSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-red-600">-{cycle.totalDeductions.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="font-medium" style={{ color: '#2B7A78' }}>
                          AED {cycle.netSalary.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(cycle.status)}>
                          {getStatusIcon(cycle.status)}
                          <span className="ml-1">{cycle.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>{format(cycle.createdAt, "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        {cycle.disbursedAt ? format(cycle.disbursedAt, "dd MMM yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Department-wise Payroll */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Department-wise Payroll
                </CardTitle>
                <CardDescription>Net salary distribution by department</CardDescription>
              </CardHeader>
              <CardContent>
                {departmentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={departmentChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {departmentChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `AED ${value.toLocaleString()}`} />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Deduction Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Deduction Breakdown
                </CardTitle>
                <CardDescription>Total deductions by type</CardDescription>
              </CardHeader>
              <CardContent>
                {deductionChartData.length > 0 && deductionChartData.some(d => d.value > 0) ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={deductionChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: number) => `AED ${value.toLocaleString()}`} />
                      <Bar dataKey="value" fill="#E63946" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No deduction data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Report Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Monthly Payroll Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Comprehensive summary of current month payroll
                </p>
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Attendance vs Salary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Detailed attendance and salary correlation
                </p>
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download Excel
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Overtime Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Analysis of overtime hours and costs
                </p>
                <Button variant="outline" className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Generate Payroll Dialog */}
      <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate New Payroll</DialogTitle>
            <DialogDescription>
              Automatically fetch attendance data and calculate salaries
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Payroll Month *</Label>
                <Select value={generationMonth} onValueChange={setGenerationMonth}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(month => (
                      <SelectItem key={month} value={month}>{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year *</Label>
                <Select value={generationYear} onValueChange={setGenerationYear}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["2024", "2025", "2026"].map(year => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <RefreshCw className="h-4 w-4" style={{ color: '#2B7A78' }} />
                  Auto-Fetch from Attendance
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Working days & present days
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Overtime hours calculation
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Late arrivals & absences
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Paid & unpaid leave tracking
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card style={{ backgroundColor: '#2B7A78', color: 'white' }}>
              <CardContent className="pt-6">
                <div className="text-sm opacity-90 mb-1">Salary Calculation Formula:</div>
                <div className="font-mono text-xs">
                  Net = (Base ÷ Working Days × Present Days) + Allowances + Overtime - Deductions
                </div>
              </CardContent>
            </Card>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGeneratePayroll}
              style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate & Calculate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payslip Dialog */}
      <Dialog open={showPayslipDialog} onOpenChange={setShowPayslipDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payslip Preview</DialogTitle>
            <DialogDescription>
              {selectedEmployee && `${selectedEmployee.employeeName} - ${selectedEmployee.employeeId}`}
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && selectedCycle && (() => {
            const commission = selectedEmployee.employeeId.includes("001") ? 3250 : selectedEmployee.employeeId.includes("002") ? 800 : 0;
            const scheduledHrs = selectedEmployee.workingDays * 8;
            const regularHrs = selectedEmployee.presentDays * 8;
            const actualHrs = regularHrs + selectedEmployee.overtimeHours;
            const unpaidLeaveDeduct = selectedEmployee.absenceDeduction;
            const totalGrossFixed = selectedEmployee.basicSalary + selectedEmployee.allowances;
            const variableEarnings = selectedEmployee.overtimePay + commission;
            const totalGross = totalGrossFixed + variableEarnings;
            const advanceRepayment = selectedEmployee.employeeId.includes("001") ? 1000 : selectedEmployee.employeeId.includes("002") ? 500 : 0;
            const otherDeductions = selectedEmployee.employeeId.includes("001") ? 765 : selectedEmployee.employeeId.includes("002") ? 100 : selectedEmployee.employeeId.includes("003") ? 200 : 200;
            const totalAllDeductions = selectedEmployee.deductions + advanceRepayment + otherDeductions;
            const netPay = totalGross - totalAllDeductions;
            const row = (l: string, v: string, bold?: boolean, color?: string) => (
              <div className={`flex justify-between py-1.5 text-sm ${bold ? "font-bold border-t mt-1 pt-2.5" : ""}`} key={l}>
                <span className="text-muted-foreground">{l}</span>
                <span style={color ? { color } : {}}>{v}</span>
              </div>
            );
            return (
            <div className="space-y-4 py-2">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b">
                <div>
                  <p className="font-bold text-lg">{selectedEmployee.employeeName}</p>
                  <p className="text-xs text-muted-foreground">{selectedEmployee.employeeId} · {selectedEmployee.designation} · {selectedEmployee.department}</p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Period: {selectedCycle.period}</p>
                  <p>Working Days: {selectedEmployee.workingDays}</p>
                </div>
              </div>

              {/* A. Fixed Salary */}
              <div className="p-3 rounded-xl border border-border/40 bg-muted/10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">A. Fixed Salary Components</p>
                {row("Basic Salary", `AED ${selectedEmployee.basicSalary.toLocaleString()}`)}
                {row("Housing Allowance", "AED 1,500")}
                {row("Food Allowance", "AED 500")}
                {row("Transport Allowance", `AED ${(selectedEmployee.allowances - 2000).toLocaleString()}`)}
                {row("Other Allowances", "—")}
                {row("Gross Fixed Earnings", `AED ${totalGrossFixed.toLocaleString()}`, true, "#2B7A78")}
              </div>

              {/* B. Attendance */}
              <div className="p-3 rounded-xl border border-border/40 bg-muted/10">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">B. Attendance & Working Hours</p>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  {[
                    ["Sched. Days", selectedEmployee.workingDays],
                    ["Present", selectedEmployee.presentDays],
                    ["Absent", selectedEmployee.workingDays - selectedEmployee.presentDays - (selectedEmployee.paidLeaves ?? 0)],
                    ["Paid Leave", selectedEmployee.paidLeaves ?? 0],
                    ["Unpaid Leave", selectedEmployee.unpaidLeaves ?? 0],
                    ["Late Arrivals", selectedEmployee.lateArrivals],
                  ].map(([l,v])=>(
                    <div key={String(l)} className="p-2 bg-white/60 rounded text-center border border-border/30">
                      <p className="text-[9px] text-muted-foreground">{l}</p>
                      <p className="text-sm font-bold">{v}</p>
                    </div>
                  ))}
                </div>
                {row("Scheduled Hours", `${scheduledHrs}h`)}
                {row("Actual Hours Worked", `${actualHrs}h`)}
                {row("Regular Hours", `${regularHrs}h`)}
                {row("Approved OT Hours", `${selectedEmployee.overtimeHours}h`)}
              </div>

              {/* C. Variable Earnings */}
              <div className="p-3 rounded-xl border border-border/40 bg-green-50/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">C. Variable Earnings</p>
                {row("Approved OT Earnings", `AED ${selectedEmployee.overtimePay.toLocaleString()}`, false, "#10b981")}
                {row("Trainer Commission", commission > 0 ? `AED ${commission.toLocaleString()}` : "—", false, "#10b981")}
                {row("Performance Incentives", "—")}
                {row("Total Variable Earnings", `AED ${variableEarnings.toLocaleString()}`, true, "#10b981")}
              </div>

              {/* D. Deductions */}
              <div className="p-3 rounded-xl border border-border/40 bg-red-50/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">D. Deductions</p>
                {row("Unpaid Leave Deduction", unpaidLeaveDeduct > 0 ? `AED ${unpaidLeaveDeduct.toLocaleString()}` : "—", false, "#ef4444")}
                {row("Late Arrival Deduction", selectedEmployee.lateArrivalDeduction > 0 ? `AED ${selectedEmployee.lateArrivalDeduction.toLocaleString()}` : "—", false, "#ef4444")}
                {row("Total Attendance Deductions", `AED ${selectedEmployee.deductions.toLocaleString()}`, true, "#ef4444")}
              </div>

              {/* D2. Advance Repayments */}
              <div className="p-3 rounded-xl border border-border/40 bg-orange-50/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">D2. Advance Repayments</p>
                {advanceRepayment > 0 ? <>
                  {row("Active Advance Repayment", `AED ${advanceRepayment.toLocaleString()}`, false, "#f97316")}
                  {row("Total Advance Repayments", `AED ${advanceRepayment.toLocaleString()}`, true, "#f97316")}
                </> : row("No active advance repayments", "—")}
              </div>

              {/* D3. Other Deductions */}
              <div className="p-3 rounded-xl border border-border/40 bg-purple-50/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">D3. Other Deductions</p>
                {row("Insurance Contribution", "AED 200", false, "#7c3aed")}
                {otherDeductions > 200 && row("Additional Deductions", `AED ${(otherDeductions - 200).toLocaleString()}`, false, "#7c3aed")}
                {row("Total Other Deductions", `AED ${otherDeductions.toLocaleString()}`, true, "#7c3aed")}
              </div>

              {/* E. Final Summary */}
              <div className="p-4 rounded-xl border-2" style={{ borderColor: "#2B7A7840", backgroundColor: "#2B7A7808" }}>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">E. Final Summary</p>
                {row("Gross Fixed Salary", `AED ${totalGrossFixed.toLocaleString()}`)}
                {row("Variable Earnings", `AED ${variableEarnings.toLocaleString()}`, false, "#10b981")}
                {row("Total Gross Pay", `AED ${totalGross.toLocaleString()}`)}
                {row("Attendance Deductions", `− AED ${selectedEmployee.deductions.toLocaleString()}`, false, "#ef4444")}
                {row("Advance Repayments", advanceRepayment > 0 ? `− AED ${advanceRepayment.toLocaleString()}` : "—", false, "#f97316")}
                {row("Other Deductions", `− AED ${otherDeductions.toLocaleString()}`, false, "#7c3aed")}
                <div className="flex justify-between py-2 mt-2 border-t-2 border-[#2B7A78]">
                  <span className="text-base font-bold">Net Pay</span>
                  <span className="text-xl font-bold" style={{ color: "#2B7A78" }}>AED {netPay.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 bg-amber-50 rounded border border-amber-100">
                <AlertCircle className="h-3.5 w-3.5 text-amber-600 flex-shrink-0"/>
                Unapproved OT is excluded from variable earnings. Final net salary is subject to any last-minute adjustments and manager approval.
              </div>
            </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayslipDialog(false)}>
              Close
            </Button>
            <Button
              onClick={() => toast.success("Payslip downloaded successfully!")}
              style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Confirmation Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Approve Payroll</DialogTitle>
            <DialogDescription>
              Confirm approval for {selectedCycle?.period} payroll
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedCycle && (
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Period:</span>
                      <span className="font-medium">{selectedCycle.period}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Employees:</span>
                      <span className="font-medium">{selectedCycle.totalEmployees}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Gross Amount:</span>
                      <span className="font-medium">AED {selectedCycle.grossSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deductions:</span>
                      <span className="font-medium text-red-600">-AED {selectedCycle.totalDeductions.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Net Payable:</span>
                      <span style={{ color: '#2B7A78' }}>AED {selectedCycle.netSalary.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-900">Important</p>
                  <p className="text-yellow-700">
                    Once approved, this payroll will be ready for disbursement. Please ensure all calculations are correct.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApprovePayroll}
              style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Payroll
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
