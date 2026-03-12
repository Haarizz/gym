import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Checkbox } from "../components/ui/checkbox";
import { Separator } from "../components/ui/separator";
import { Switch } from "../components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Wallet,
  DollarSign,
  CreditCard,
  Banknote,
  Smartphone,
  FileText,
  Plus,
  Minus,
  Download,
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Receipt,
  TrendingUp,
  Building,
  User,
  BarChart3,
  PieChart,
  Send,
  ArrowLeftRight,
  Upload,
  X,
  Trash2,
  Split
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { BarChart, Bar, PieChart as RechartsPie, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { toast } from "sonner";

interface SalaryPaymentsProps {
  onNavigate?: (section: string) => void;
}

interface Employee {
  id: string;
  name: string;
  employeeId: string;
  department: string;
  designation: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  paymentStatus: "Paid" | "Pending" | "On Hold";
  lastPaymentDate: Date | null;
  bankAccount?: string;
  email?: string;
}

interface SplitPayment {
  id: string;
  mode: string;
  amount: number;
  reference: string;
}

interface PaymentHistory {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string;
  year: number;
  netSalary: number;
  splitPayments: SplitPayment[];
  paymentDate: Date;
  notes: string;
  status: "Paid";
  processedBy: string;
}

// Sample employee data
const sampleEmployees: Employee[] = [
  {
    id: "1",
    name: "Ahmed Hassan",
    employeeId: "EMP001",
    department: "Personal Training",
    designation: "Senior Trainer",
    baseSalary: 8000,
    allowances: 1000,
    deductions: 500,
    netSalary: 8500,
    paymentStatus: "Paid",
    lastPaymentDate: new Date(2025, 9, 5),
    bankAccount: "ADCB ****1234",
    email: "ahmed.hassan@gymbios.com"
  },
  {
    id: "2",
    name: "Sarah Johnson",
    employeeId: "EMP002",
    department: "Front Desk",
    designation: "Receptionist",
    baseSalary: 4000,
    allowances: 500,
    deductions: 200,
    netSalary: 4300,
    paymentStatus: "Pending",
    lastPaymentDate: new Date(2025, 8, 5),
    bankAccount: "ENBD ****5678",
    email: "sarah.j@gymbios.com"
  },
  {
    id: "3",
    name: "Mohammed Ali",
    employeeId: "EMP003",
    department: "Group Classes",
    designation: "Yoga Instructor",
    baseSalary: 5000,
    allowances: 800,
    deductions: 300,
    netSalary: 5500,
    paymentStatus: "Pending",
    lastPaymentDate: new Date(2025, 8, 5),
    bankAccount: "FAB ****9012",
    email: "mohammed.ali@gymbios.com"
  },
  {
    id: "4",
    name: "Fatima Ahmed",
    employeeId: "EMP004",
    department: "Management",
    designation: "Operations Manager",
    baseSalary: 11000,
    allowances: 1500,
    deductions: 500,
    netSalary: 12000,
    paymentStatus: "Paid",
    lastPaymentDate: new Date(2025, 9, 5),
    bankAccount: "ADIB ****3456",
    email: "fatima.ahmed@gymbios.com"
  },
  {
    id: "5",
    name: "John Smith",
    employeeId: "EMP005",
    department: "Personal Training",
    designation: "Fitness Trainer",
    baseSalary: 6000,
    allowances: 700,
    deductions: 200,
    netSalary: 6500,
    paymentStatus: "Pending",
    lastPaymentDate: new Date(2025, 8, 5),
    bankAccount: "HSBC ****7890",
    email: "john.smith@gymbios.com"
  },
  {
    id: "6",
    name: "Aisha Khan",
    employeeId: "EMP006",
    department: "Nutrition",
    designation: "Nutritionist",
    baseSalary: 6500,
    allowances: 800,
    deductions: 300,
    netSalary: 7000,
    paymentStatus: "On Hold",
    lastPaymentDate: new Date(2025, 7, 5),
    bankAccount: "RAK ****2468",
    email: "aisha.khan@gymbios.com"
  },
  {
    id: "7",
    name: "Omar Rashid",
    employeeId: "EMP007",
    department: "Maintenance",
    designation: "Facility Manager",
    baseSalary: 4500,
    allowances: 600,
    deductions: 100,
    netSalary: 5000,
    paymentStatus: "Paid",
    lastPaymentDate: new Date(2025, 9, 5),
    bankAccount: "DIB ****1357",
    email: "omar.rashid@gymbios.com"
  },
  {
    id: "8",
    name: "Lisa Williams",
    employeeId: "EMP008",
    department: "Sales",
    designation: "Sales Executive",
    baseSalary: 7000,
    allowances: 800,
    deductions: 300,
    netSalary: 7500,
    paymentStatus: "Pending",
    lastPaymentDate: new Date(2025, 8, 5),
    bankAccount: "CBD ****8642",
    email: "lisa.williams@gymbios.com"
  }
];

// Sample payment history
const samplePaymentHistory: PaymentHistory[] = [
  {
    id: "1",
    employeeId: "1",
    employeeName: "Ahmed Hassan",
    month: "October",
    year: 2025,
    netSalary: 8500,
    splitPayments: [
      { id: "1", mode: "Bank Transfer", amount: 6500, reference: "TXN001234567" },
      { id: "2", mode: "Cash", amount: 2000, reference: "Paid by Admin" }
    ],
    paymentDate: new Date(2025, 9, 5),
    notes: "Split payment requested by employee",
    status: "Paid",
    processedBy: "HR Manager"
  },
  {
    id: "2",
    employeeId: "4",
    employeeName: "Fatima Ahmed",
    month: "October",
    year: 2025,
    netSalary: 12000,
    splitPayments: [
      { id: "1", mode: "Bank Transfer", amount: 12000, reference: "TXN001234568" }
    ],
    paymentDate: new Date(2025, 9, 5),
    notes: "",
    status: "Paid",
    processedBy: "HR Manager"
  }
];

export function SalaryPayments({ onNavigate }: SalaryPaymentsProps) {
  const [activeTab, setActiveTab] = useState("individual");
  const [employees, setEmployees] = useState<Employee[]>(sampleEmployees);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>(samplePaymentHistory);
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("October");
  const [yearFilter, setYearFilter] = useState("2025");
  
  // Individual payment state
  const [showIndividualPaymentModal, setShowIndividualPaymentModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [enableSplitPayment, setEnableSplitPayment] = useState(false);
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([
    { id: "1", mode: "Bank Transfer", amount: 0, reference: "" }
  ]);
  const [paymentFormData, setPaymentFormData] = useState({
    month: "November",
    year: "2025",
    paymentDate: format(new Date(), "yyyy-MM-dd"),
    notes: ""
  });

  // Bulk payment state
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false);
  const [bulkEnableSplit, setBulkEnableSplit] = useState(false);
  const [bulkSplitPayments, setBulkSplitPayments] = useState<SplitPayment[]>([
    { id: "1", mode: "Bank Transfer", amount: 0, reference: "" }
  ]);

  // Get unique departments
  const departments = Array.from(new Set(employees.map(e => e.department)));

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDepartment = departmentFilter === "all" || emp.department === departmentFilter;
      const matchesStatus = statusFilter === "all" || emp.paymentStatus === statusFilter;
      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [employees, searchTerm, departmentFilter, statusFilter]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalEmployees = employees.length;
    const totalSalary = employees.reduce((sum, emp) => sum + emp.netSalary, 0);
    const paidCount = employees.filter(e => e.paymentStatus === "Paid").length;
    const pendingCount = employees.filter(e => e.paymentStatus === "Pending").length;
    const onHoldCount = employees.filter(e => e.paymentStatus === "On Hold").length;
    const pendingAmount = employees
      .filter(e => e.paymentStatus === "Pending")
      .reduce((sum, e) => sum + e.netSalary, 0);

    // Payment mode distribution
    const modeDistribution = paymentHistory.reduce((acc, payment) => {
      payment.splitPayments.forEach(split => {
        acc[split.mode] = (acc[split.mode] || 0) + split.amount;
      });
      return acc;
    }, {} as Record<string, number>);

    return {
      totalEmployees,
      totalSalary,
      paidCount,
      pendingCount,
      onHoldCount,
      pendingAmount,
      modeDistribution
    };
  }, [employees, paymentHistory]);

  // Calculate split payment total
  const calculateSplitTotal = (splits: SplitPayment[]) => {
    return splits.reduce((sum, split) => sum + (split.amount || 0), 0);
  };

  // Validate split payment
  const validateSplitPayment = (netSalary: number, splits: SplitPayment[]) => {
    const total = calculateSplitTotal(splits);
    const hasEmptyFields = splits.some(s => !s.mode || s.amount <= 0);
    return {
      isValid: total === netSalary && !hasEmptyFields,
      total,
      difference: netSalary - total
    };
  };

  const handleOpenIndividualPayment = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEnableSplitPayment(false);
    setSplitPayments([
      { id: "1", mode: "Bank Transfer", amount: employee.netSalary, reference: "" }
    ]);
    setPaymentFormData({
      month: "November",
      year: "2025",
      paymentDate: format(new Date(), "yyyy-MM-dd"),
      notes: ""
    });
    setShowIndividualPaymentModal(true);
  };

  const handleAddSplitPayment = (isBulk = false) => {
    const setter = isBulk ? setBulkSplitPayments : setSplitPayments;
    setter(prev => [
      ...prev,
      { id: Date.now().toString(), mode: "Cash", amount: 0, reference: "" }
    ]);
  };

  const handleRemoveSplitPayment = (id: string, isBulk = false) => {
    const setter = isBulk ? setBulkSplitPayments : setSplitPayments;
    setter(prev => prev.filter(s => s.id !== id));
  };

  const handleUpdateSplitPayment = (id: string, field: keyof SplitPayment, value: any, isBulk = false) => {
    const setter = isBulk ? setBulkSplitPayments : setSplitPayments;
    setter(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleProcessIndividualPayment = () => {
    if (!selectedEmployee) return;

    const paymentsToUse = enableSplitPayment ? splitPayments : [{
      id: "1",
      mode: splitPayments[0]?.mode || "Bank Transfer",
      amount: selectedEmployee.netSalary,
      reference: splitPayments[0]?.reference || ""
    }];

    const validation = validateSplitPayment(selectedEmployee.netSalary, paymentsToUse);
    
    if (enableSplitPayment && !validation.isValid) {
      toast.error(`Split payment total must equal net salary. Difference: AED ${Math.abs(validation.difference)}`);
      return;
    }

    const newPayment: PaymentHistory = {
      id: Date.now().toString(),
      employeeId: selectedEmployee.id,
      employeeName: selectedEmployee.name,
      month: paymentFormData.month,
      year: parseInt(paymentFormData.year),
      netSalary: selectedEmployee.netSalary,
      splitPayments: paymentsToUse,
      paymentDate: new Date(paymentFormData.paymentDate),
      notes: paymentFormData.notes,
      status: "Paid",
      processedBy: "HR Manager"
    };

    setPaymentHistory([...paymentHistory, newPayment]);

    // Update employee status
    setEmployees(employees.map(emp =>
      emp.id === selectedEmployee.id
        ? { ...emp, paymentStatus: "Paid", lastPaymentDate: new Date(paymentFormData.paymentDate) }
        : emp
    ));

    toast.success(`Payment processed successfully for ${selectedEmployee.name}!`);
    setShowIndividualPaymentModal(false);
  };

  const handleProcessBulkPayment = () => {
    const selectedCount = selectedEmployees.length;
    if (selectedCount === 0) {
      toast.error("Please select at least one employee");
      return;
    }

    const selectedEmps = employees.filter(e => selectedEmployees.includes(e.id));
    const totalAmount = selectedEmps.reduce((sum, e) => sum + e.netSalary, 0);

    if (bulkEnableSplit) {
      const validation = validateSplitPayment(totalAmount, bulkSplitPayments);
      if (!validation.isValid) {
        toast.error(`Split payment total must equal total salary. Difference: AED ${Math.abs(validation.difference)}`);
        return;
      }
    }

    // Process bulk payment
    const paymentDate = new Date();
    const newPayments: PaymentHistory[] = selectedEmps.map(emp => ({
      id: Date.now().toString() + emp.id,
      employeeId: emp.id,
      employeeName: emp.name,
      month: paymentFormData.month,
      year: parseInt(paymentFormData.year),
      netSalary: emp.netSalary,
      splitPayments: bulkEnableSplit 
        ? bulkSplitPayments.map(s => ({...s}))
        : [{ id: "1", mode: "Bank Transfer", amount: emp.netSalary, reference: `Bulk-${Date.now()}` }],
      paymentDate,
      notes: "Bulk payment processing",
      status: "Paid",
      processedBy: "HR Manager"
    }));

    setPaymentHistory([...paymentHistory, ...newPayments]);

    const updatedEmployees = employees.map(emp =>
      selectedEmployees.includes(emp.id)
        ? { ...emp, paymentStatus: "Paid" as const, lastPaymentDate: paymentDate }
        : emp
    );

    setEmployees(updatedEmployees);
    setSelectedEmployees([]);
    toast.success(`Bulk payment processed for ${selectedCount} employees!`);
    setShowBulkPaymentModal(false);
  };

  const handleToggleEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === filteredEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredEmployees.map(e => e.id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":
        return "bg-green-100 text-green-800 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "On Hold":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Paid":
        return <CheckCircle className="h-4 w-4" />;
      case "Pending":
        return <Clock className="h-4 w-4" />;
      case "On Hold":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getPaymentModeIcon = (mode: string) => {
    switch (mode) {
      case "Cash":
        return <Banknote className="h-4 w-4" />;
      case "Bank Transfer":
        return <CreditCard className="h-4 w-4" />;
      case "Cheque":
        return <FileText className="h-4 w-4" />;
      case "Digital Wallet":
        return <Smartphone className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  // Chart data for payment mode distribution
  const modeChartData = useMemo(() => {
    return Object.entries(summaryStats.modeDistribution).map(([name, value]) => ({
      name,
      value
    }));
  }, [summaryStats.modeDistribution]);

  const COLORS = ['#2B7A78', '#E63946', '#F4A261', '#2A9D8F', '#E76F51'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3">
            <Wallet className="h-8 w-8" style={{ color: '#2B7A78' }} />
            Salary Payments
          </h1>
          <p className="text-muted-foreground">
            {monthFilter} {yearFilter} - Process individual and bulk salary payments with split payment options
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4" style={{ borderLeftColor: '#2B7A78' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active staff members
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: '#2B7A78' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payable</CardTitle>
            <DollarSign className="h-4 w-4" style={{ color: '#2B7A78' }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">AED {summaryStats.totalSalary.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4" style={{ borderLeftColor: '#E63946' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-4 w-4" style={{ color: '#E63946' }} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              AED {summaryStats.pendingAmount.toLocaleString()} to process
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryStats.paidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Successfully processed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="individual">
            <CreditCard className="mr-2 h-4 w-4" />
            Individual Payment
          </TabsTrigger>
          <TabsTrigger value="bulk">
            <Users className="mr-2 h-4 w-4" />
            Bulk Payment
          </TabsTrigger>
          <TabsTrigger value="summary">
            <BarChart3 className="mr-2 h-4 w-4" />
            Payment Summary
          </TabsTrigger>
        </TabsList>

        {/* Individual Payment Tab */}
        <TabsContent value="individual" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or employee ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="On Hold">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Employee List */}
          <Card>
            <CardHeader>
              <CardTitle>Select Employee for Payment</CardTitle>
              <CardDescription>Click "Pay" to process individual salary payment</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department / Designation</TableHead>
                    <TableHead>Base Salary</TableHead>
                    <TableHead>Allowances</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net Payable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.employeeId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.department}</div>
                          <div className="text-sm text-muted-foreground">{employee.designation}</div>
                        </div>
                      </TableCell>
                      <TableCell>AED {employee.baseSalary.toLocaleString()}</TableCell>
                      <TableCell className="text-green-600">+{employee.allowances.toLocaleString()}</TableCell>
                      <TableCell className="text-red-600">-{employee.deductions.toLocaleString()}</TableCell>
                      <TableCell>
                        <span className="font-bold" style={{ color: '#2B7A78' }}>
                          AED {employee.netSalary.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(employee.paymentStatus)}>
                          {getStatusIcon(employee.paymentStatus)}
                          <span className="ml-1">{employee.paymentStatus}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          onClick={() => handleOpenIndividualPayment(employee)}
                          style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
                        >
                          <Send className="mr-1 h-4 w-4" />
                          Pay
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bulk Payment Tab */}
        <TabsContent value="bulk" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-4 flex-1">
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
                    <SelectTrigger className="w-[180px]">
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

                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowBulkPaymentModal(true)}
                    disabled={selectedEmployees.length === 0}
                    style={{ background: 'linear-gradient(135deg, #E63946 0%, #E63946 100%)', color: 'white' }}
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Process Payment ({selectedEmployees.length})
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => toast.info("Export feature coming soon")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Selection Table */}
          <Card>
            <CardHeader>
              <CardTitle>Select Employees for Bulk Payment</CardTitle>
              <CardDescription>Select multiple employees to process payments in batch</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedEmployees.length === filteredEmployees.filter(e => e.paymentStatus === "Pending").length && filteredEmployees.filter(e => e.paymentStatus === "Pending").length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Net Payable</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.filter(e => e.paymentStatus === "Pending").map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => handleToggleEmployee(employee.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          <div className="text-sm text-muted-foreground">{employee.employeeId}</div>
                        </div>
                      </TableCell>
                      <TableCell>{employee.department}</TableCell>
                      <TableCell>
                        <span className="font-bold" style={{ color: '#2B7A78' }}>
                          AED {employee.netSalary.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(employee.paymentStatus)}>
                          {employee.paymentStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {selectedEmployees.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Total Selected: {selectedEmployees.length} employees</span>
                    </div>
                    <div>
                      <span className="font-bold" style={{ color: '#2B7A78' }}>
                        Total Amount: AED {employees
                          .filter(e => selectedEmployees.includes(e.id))
                          .reduce((sum, e) => sum + e.netSalary, 0)
                          .toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Summary Tab */}
        <TabsContent value="summary" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Mode Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Payment Mode Distribution
                </CardTitle>
                <CardDescription>Breakdown by payment method</CardDescription>
              </CardHeader>
              <CardContent>
                {modeChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPie>
                      <Pie
                        data={modeChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: AED ${value.toLocaleString()}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {modeChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => `AED ${value.toLocaleString()}`} />
                    </RechartsPie>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No payment data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Payment Statistics
                </CardTitle>
                <CardDescription>Current month overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: '#2B7A78' }}>
                          {paymentHistory.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Total Payments</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold" style={{ color: '#2B7A78' }}>
                          AED {paymentHistory.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-muted-foreground">Amount Paid</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Separator />

                <div className="space-y-3">
                  <h4 className="font-medium">Payment Mode Breakdown</h4>
                  {Object.entries(summaryStats.modeDistribution).map(([mode, amount]) => (
                    <div key={mode} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center gap-2">
                        {getPaymentModeIcon(mode)}
                        <span className="font-medium">{mode}</span>
                      </div>
                      <span className="font-bold" style={{ color: '#2B7A78' }}>
                        AED {amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Payment Transactions</CardTitle>
                  <CardDescription>Latest salary payments processed</CardDescription>
                </div>
                <Button
                  variant="outline"
                  onClick={() => toast.info("Exporting payment report...")}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Month</TableHead>
                    <TableHead>Net Salary</TableHead>
                    <TableHead>Payment Mode(s)</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paymentHistory.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="font-medium">{payment.employeeName}</div>
                      </TableCell>
                      <TableCell>{payment.month} {payment.year}</TableCell>
                      <TableCell>
                        <span className="font-bold">AED {payment.netSalary.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {payment.splitPayments.map((split, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {getPaymentModeIcon(split.mode)}
                              <span className="ml-1">{split.mode}: {split.amount}</span>
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{format(payment.paymentDate, "dd MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toast.info("Generating voucher...")}
                        >
                          <Receipt className="h-4 w-4" />
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

      {/* Individual Payment Modal */}
      <Dialog open={showIndividualPaymentModal} onOpenChange={setShowIndividualPaymentModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Individual Salary Payment</DialogTitle>
            <DialogDescription>
              {selectedEmployee && `${selectedEmployee.name} - ${selectedEmployee.employeeId}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {selectedEmployee && (
              <>
                {/* Employee Salary Breakdown */}
                <Card className="bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">Salary Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Salary:</span>
                        <span className="font-medium">AED {selectedEmployee.baseSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Allowances:</span>
                        <span className="font-medium">+ AED {selectedEmployee.allowances.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Deductions:</span>
                        <span className="font-medium">- AED {selectedEmployee.deductions.toLocaleString()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="font-bold">Net Payable:</span>
                        <span className="text-xl font-bold" style={{ color: '#2B7A78' }}>
                          AED {selectedEmployee.netSalary.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Month and Payment Date */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Salary Month *</Label>
                    <Select
                      value={paymentFormData.month}
                      onValueChange={(value) => setPaymentFormData({ ...paymentFormData, month: value })}
                    >
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
                    <Select
                      value={paymentFormData.year}
                      onValueChange={(value) => setPaymentFormData({ ...paymentFormData, year: value })}
                    >
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
                  <div className="space-y-2">
                    <Label>Payment Date *</Label>
                    <Input
                      type="date"
                      value={paymentFormData.paymentDate}
                      onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                    />
                  </div>
                </div>

                {/* Split Payment Toggle */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Split className="h-5 w-5" style={{ color: '#2B7A78' }} />
                        <div>
                          <Label htmlFor="split-toggle" className="cursor-pointer">Enable Split Payment</Label>
                          <p className="text-sm text-muted-foreground">
                            Divide payment between multiple modes (e.g., cash + bank)
                          </p>
                        </div>
                      </div>
                      <Switch
                        id="split-toggle"
                        checked={enableSplitPayment}
                        onCheckedChange={setEnableSplitPayment}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Mode Section */}
                {enableSplitPayment ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Split Payment Configuration</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddSplitPayment(false)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Payment Mode
                      </Button>
                    </div>

                    {splitPayments.map((split, index) => (
                      <Card key={split.id} className="border-2" style={{ borderColor: '#2B7A78' }}>
                        <CardContent className="pt-6">
                          <div className="flex gap-3 items-start">
                            <div className="flex-1 space-y-4">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                  <Label>Payment Mode *</Label>
                                  <Select
                                    value={split.mode}
                                    onValueChange={(value) => handleUpdateSplitPayment(split.id, "mode", value, false)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Cash">💵 Cash</SelectItem>
                                      <SelectItem value="Bank Transfer">🏦 Bank Transfer</SelectItem>
                                      <SelectItem value="Cheque">📄 Cheque</SelectItem>
                                      <SelectItem value="Digital Wallet">📱 Digital Wallet</SelectItem>
                                      <SelectItem value="Other">⚙️ Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label>Amount (AED) *</Label>
                                  <Input
                                    type="number"
                                    placeholder="0.00"
                                    value={split.amount || ""}
                                    onChange={(e) => handleUpdateSplitPayment(split.id, "amount", parseFloat(e.target.value) || 0, false)}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Reference / Note</Label>
                                <Input
                                  placeholder="Transaction ID, cheque number, or note"
                                  value={split.reference}
                                  onChange={(e) => handleUpdateSplitPayment(split.id, "reference", e.target.value, false)}
                                />
                              </div>
                            </div>
                            {splitPayments.length > 1 && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleRemoveSplitPayment(split.id, false)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}

                    {/* Split Validation */}
                    <Card className={
                      validateSplitPayment(selectedEmployee.netSalary, splitPayments).isValid
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Total Split Amount:</span>
                          <span className="text-xl font-bold">
                            AED {calculateSplitTotal(splitPayments).toLocaleString()}
                          </span>
                        </div>
                        {!validateSplitPayment(selectedEmployee.netSalary, splitPayments).isValid && (
                          <p className="text-sm text-red-600 mt-2">
                            ⚠️ Total must equal Net Payable (AED {selectedEmployee.netSalary.toLocaleString()})
                            - Difference: AED {Math.abs(validateSplitPayment(selectedEmployee.netSalary, splitPayments).difference).toLocaleString()}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Payment Mode *</Label>
                        <Select
                          value={splitPayments[0]?.mode || "Bank Transfer"}
                          onValueChange={(value) => handleUpdateSplitPayment(splitPayments[0]?.id || "1", "mode", value, false)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">💵 Cash</SelectItem>
                            <SelectItem value="Bank Transfer">🏦 Bank Transfer</SelectItem>
                            <SelectItem value="Cheque">📄 Cheque</SelectItem>
                            <SelectItem value="Digital Wallet">📱 Digital Wallet</SelectItem>
                            <SelectItem value="Other">⚙️ Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Reference / Note</Label>
                        <Input
                          placeholder="Transaction ID or reference"
                          value={splitPayments[0]?.reference || ""}
                          onChange={(e) => handleUpdateSplitPayment(splitPayments[0]?.id || "1", "reference", e.target.value, false)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Attachment */}
                <div className="space-y-2">
                  <Label>Attachment (Optional)</Label>
                  <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <div className="text-sm text-muted-foreground">
                      Upload receipt or payment proof
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      PDF, JPG, PNG up to 5MB
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <Label>Remarks (Optional)</Label>
                  <Textarea
                    placeholder="Additional notes or comments..."
                    value={paymentFormData.notes}
                    onChange={(e) => setPaymentFormData({ ...paymentFormData, notes: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIndividualPaymentModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProcessIndividualPayment}
              style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
            >
              <Send className="mr-2 h-4 w-4" />
              Process Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Payment Modal */}
      <Dialog open={showBulkPaymentModal} onOpenChange={setShowBulkPaymentModal}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Salary Payment</DialogTitle>
            <DialogDescription>
              Process salary payments for {selectedEmployees.length} selected employees
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Summary */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Selected Employees:</span>
                    <span className="font-medium">{selectedEmployees.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold">Total Amount:</span>
                    <span className="text-xl font-bold" style={{ color: '#2B7A78' }}>
                      AED {employees
                        .filter(e => selectedEmployees.includes(e.id))
                        .reduce((sum, e) => sum + e.netSalary, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Period */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Month *</Label>
                <Select
                  value={paymentFormData.month}
                  onValueChange={(value) => setPaymentFormData({ ...paymentFormData, month: value })}
                >
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
                <Select
                  value={paymentFormData.year}
                  onValueChange={(value) => setPaymentFormData({ ...paymentFormData, year: value })}
                >
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
              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={paymentFormData.paymentDate}
                  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentDate: e.target.value })}
                />
              </div>
            </div>

            {/* Split Payment Toggle */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <ArrowLeftRight className="h-5 w-5" style={{ color: '#2B7A78' }} />
                    <div>
                      <Label htmlFor="bulk-split-toggle" className="cursor-pointer">Enable Split Payment</Label>
                      <p className="text-sm text-muted-foreground">
                        Apply same split configuration to all selected employees
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="bulk-split-toggle"
                    checked={bulkEnableSplit}
                    onCheckedChange={setBulkEnableSplit}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Configuration */}
            {!bulkEnableSplit ? (
              <div className="space-y-2">
                <Label>Payment Method *</Label>
                <Select defaultValue="Bank Transfer">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">💵 Cash</SelectItem>
                    <SelectItem value="Bank Transfer">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">📄 Cheque</SelectItem>
                    <SelectItem value="Digital Wallet">📱 Digital Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Split Configuration (Applied to All)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddSplitPayment(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Mode
                  </Button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Configure percentage split that will be applied to each employee's salary
                </p>

                {bulkSplitPayments.map((split) => (
                  <Card key={split.id} className="border-2" style={{ borderColor: '#2B7A78' }}>
                    <CardContent className="pt-6">
                      <div className="flex gap-3 items-start">
                        <div className="flex-1 grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>Payment Mode *</Label>
                            <Select
                              value={split.mode}
                              onValueChange={(value) => handleUpdateSplitPayment(split.id, "mode", value, true)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Cash">💵 Cash</SelectItem>
                                <SelectItem value="Bank Transfer">🏦 Bank Transfer</SelectItem>
                                <SelectItem value="Cheque">📄 Cheque</SelectItem>
                                <SelectItem value="Digital Wallet">📱 Digital Wallet</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Amount (AED) *</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={split.amount || ""}
                              onChange={(e) => handleUpdateSplitPayment(split.id, "amount", parseFloat(e.target.value) || 0, true)}
                            />
                          </div>
                        </div>
                        {bulkSplitPayments.length > 1 && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveSplitPayment(split.id, true)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Employee List */}
            <div className="space-y-2">
              <Label>Employees to be Processed</Label>
              <div className="max-h-[200px] overflow-y-auto border rounded-lg p-3 space-y-2">
                {employees
                  .filter(e => selectedEmployees.includes(e.id))
                  .map(emp => (
                    <div key={emp.id} className="flex justify-between p-2 bg-muted rounded">
                      <span className="font-medium">{emp.name}</span>
                      <span style={{ color: '#2B7A78' }}>AED {emp.netSalary.toLocaleString()}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkPaymentModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleProcessBulkPayment}
              style={{ background: 'linear-gradient(135deg, #E63946 0%, #E63946 100%)', color: 'white' }}
            >
              <Send className="mr-2 h-4 w-4" />
              Process Bulk Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

