import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
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
import { toast } from "sonner";

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
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";
  
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
          <h1 className="text-3xl font-bold flex items-center gap-3">
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
      <style>{`
        @keyframes tabSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [role="tabpanel"][data-state="active"] {
          animation: tabSlideIn 0.22s ease-out;
        }
      `}</style>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full flex">
          <TabsTrigger value="dashboard" className="flex-1">
            <BarChart3 className="mr-2 h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="review" className="flex-1">
            <Eye className="mr-2 h-4 w-4" />
            Review Payroll
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Payroll History
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex-1">
            <FileText className="mr-2 h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className={cardShell}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <div className="bg-gradient-light p-2 rounded-lg">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{dashboardStats.totalEmployees}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active staff members
                </p>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payrolls</CardTitle>
                <div className="bg-yellow-50 p-2 rounded-lg">
                  <Clock className="h-4 w-4 text-yellow-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{dashboardStats.pendingPayrolls}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Awaiting approval
                </p>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Approved Payrolls</CardTitle>
                <div className="bg-blue-50 p-2 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{dashboardStats.approvedPayrolls}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ready for disbursement
                </p>
              </CardContent>
            </Card>

            <Card className={cardShell}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disbursed Payrolls</CardTitle>
                <div className="bg-green-50 p-2 rounded-lg">
                  <Wallet className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dashboardStats.disbursedPayrolls}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Successfully paid
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions & Recent Payrolls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Quick Actions */}
            <Card className={cardShell}>
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
            <Card className={`${cardShell} lg:col-span-2`}>
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
          <Card className={cardShell}>
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
              <Card className={cardShell}>
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
              <Card className={cardShell}>
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
              <Card className={cardShell}>
                <CardHeader>
                  <CardTitle>Employee Payroll Details</CardTitle>
                  <CardDescription>Auto-calculated from attendance records</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Attendance</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>Allowances</TableHead>
                        <TableHead>Overtime</TableHead>
                        <TableHead>Gross</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayroll.map((payroll) => (
                        <TableRow key={payroll.employeeId}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{payroll.employeeName}</div>
                              <div className="text-sm text-muted-foreground">{payroll.employeeId} • {payroll.designation}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{payroll.presentDays}/{payroll.workingDays} days</div>
                              <div className="text-muted-foreground">{payroll.overtimeHours}h OT</div>
                            </div>
                          </TableCell>
                          <TableCell>AED {payroll.basicSalary.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600">+{payroll.allowances.toLocaleString()}</TableCell>
                          <TableCell className="text-green-600">+{payroll.overtimePay.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className="font-medium">AED {payroll.grossSalary.toLocaleString()}</span>
                          </TableCell>
                          <TableCell className="text-red-600">-{payroll.deductions.toLocaleString()}</TableCell>
                          <TableCell>
                            <span className="font-bold" style={{ color: '#2B7A78' }}>
                              AED {payroll.netSalary.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEmployee(payroll);
                                setShowPayslipDialog(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
            <Card className={cardShell}>
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
          <Card className={cardShell}>
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
            <Card className={cardShell}>
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
            <Card className={cardShell}>
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
            <Card className={`${cardShell} cursor-pointer`}>
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

            <Card className={`${cardShell} cursor-pointer`}>
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

            <Card className={`${cardShell} cursor-pointer`}>
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
          {selectedEmployee && selectedCycle && (
            <div className="space-y-6 py-4">
              {/* Company Header */}
              <div className="text-center border-b pb-4">
                <h2 className="font-bold text-xl">GymBios Fitness Center</h2>
                <p className="text-sm text-muted-foreground">Payslip for {selectedCycle.period}</p>
              </div>

              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Employee Name:</span>
                  <div className="font-medium">{selectedEmployee.employeeName}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Employee ID:</span>
                  <div className="font-medium">{selectedEmployee.employeeId}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Designation:</span>
                  <div className="font-medium">{selectedEmployee.designation}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Department:</span>
                  <div className="font-medium">{selectedEmployee.department}</div>
                </div>
              </div>

              <Separator />

              {/* Attendance Summary */}
              <div>
                <h3 className="font-medium mb-3">Attendance Summary</h3>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="text-muted-foreground">Working Days</div>
                    <div className="text-lg font-bold">{selectedEmployee.workingDays}</div>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <div className="text-muted-foreground">Present Days</div>
                    <div className="text-lg font-bold text-green-600">{selectedEmployee.presentDays}</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <div className="text-muted-foreground">Overtime Hours</div>
                    <div className="text-lg font-bold text-blue-600">{selectedEmployee.overtimeHours}</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Earnings & Deductions */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-3 text-green-600">Earnings</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Basic Salary</span>
                      <span className="font-medium">AED {selectedEmployee.basicSalary.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Allowances</span>
                      <span className="font-medium">AED {selectedEmployee.allowances.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overtime Pay</span>
                      <span className="font-medium">AED {selectedEmployee.overtimePay.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Gross Salary</span>
                      <span>AED {selectedEmployee.grossSalary.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-3 text-red-600">Deductions</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Late Arrivals</span>
                      <span className="font-medium">AED {selectedEmployee.lateArrivalDeduction.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Absences</span>
                      <span className="font-medium">AED {selectedEmployee.absenceDeduction.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold">
                      <span>Total Deductions</span>
                      <span>AED {selectedEmployee.deductions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Net Payable */}
              <Card style={{ backgroundColor: '#2B7A78', color: 'white' }}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg">Net Payable Amount:</span>
                    <span className="text-3xl font-bold">AED {selectedEmployee.netSalary.toLocaleString()}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
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

