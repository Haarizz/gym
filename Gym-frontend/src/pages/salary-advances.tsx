import React, { useEffect, useMemo, useState } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Progress } from "../components/ui/progress";
import { 
  Wallet,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Calendar as CalendarIcon,
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Filter,
  Search,
  FileSpreadsheet,
  Eye,
  XCircle,
  Check,
  X,
  DollarSign,
  Users,
  BarChart3,
  FileText,
  CreditCard,
  History,
  Bell,
  ChevronRight,
  ArrowRight,
  Calculator
} from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { toast } from "sonner";
import { salaryAdvancesService, SalaryAdvance } from "../utils/supabase/salary-advances-service";
import { staffService } from "../utils/supabase/staff-service";

interface EmployeeOption {
  id: string;
  name: string;
  department: string;
  designation: string;
}

interface SalaryAdvancesProps {
  onNavigate?: (section: string) => void;
}

export function SalaryAdvances({ onNavigate }: SalaryAdvancesProps) {
  const { currencyCode } = useCurrency();
  const [activeTab, setActiveTab] = useState("requests");
  const [advances, setAdvances] = useState<SalaryAdvance[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedAdvance, setSelectedAdvance] = useState<SalaryAdvance | null>(null);
  const [deleteConfirmAdvance, setDeleteConfirmAdvance] = useState<SalaryAdvance | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-all";

  // Form data for advance request
  const [requestFormData, setRequestFormData] = useState({
    employeeId: "",
    employeeName: "",
    department: "",
    requestDate: format(new Date(), "yyyy-MM-dd"),
    advanceType: "Salary Advance",
    requestedAmount: "",
    remarks: ""
  });

  // Form data for approval
  const [approvalFormData, setApprovalFormData] = useState({
    approvedAmount: "",
    approvalStatus: "Approved",
    installmentCount: "",
    deductionMode: "Monthly",
    startMonth: format(new Date(), "yyyy-MM-dd"),
    autoDeduct: true,
    approvalRemarks: ""
  });

  const resetRequestForm = () => {
    setRequestFormData({
      employeeId: "",
      employeeName: "",
      department: "",
      requestDate: format(new Date(), "yyyy-MM-dd"),
      advanceType: "Salary Advance",
      requestedAmount: "",
      remarks: ""
    });
  };

  const resetApprovalForm = () => {
    setApprovalFormData({
      approvedAmount: "",
      approvalStatus: "Approved",
      installmentCount: "",
      deductionMode: "Monthly",
      startMonth: format(new Date(), "yyyy-MM-dd"),
      autoDeduct: true,
      approvalRemarks: ""
    });
    setSelectedAdvance(null);
  };

  const loadAdvances = async () => {
    setLoading(true);
    try {
      const data = await salaryAdvancesService.getAdvances();
      setAdvances(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load salary advances");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const staffPage = await staffService.getStaff({}, 1, 200);
      const mapped = (staffPage.items ?? []).map((staff) => ({
        id: staff.staff_id,
        name: staff.name,
        department: staff.department,
        designation: staff.role,
      }));
      setEmployees(mapped);
    } catch (err: any) {
      toast.error(err.message || "Failed to load employees");
    }
  };

  useEffect(() => {
    loadAdvances();
    loadEmployees();
  }, []);

  const handleEmployeeSelect = (employeeId: string) => {
    const employee = employees.find(e => e.id === employeeId);
    if (employee) {
      setRequestFormData((prev) => ({
        ...prev,
        employeeId: employee.id,
        employeeName: employee.name,
        department: employee.department
      }));
    }
  };

  const handleAddRequest = async () => {
    if (!requestFormData.employeeId || !requestFormData.requestedAmount) {
      toast.error("Please select an employee and enter the requested amount.");
      return;
    }

    try {
      await salaryAdvancesService.createAdvance({
        employeeId: requestFormData.employeeId,
        employeeName: requestFormData.employeeName,
        department: requestFormData.department,
        requestDate: requestFormData.requestDate,
        advanceType: requestFormData.advanceType,
        requestedAmount: parseFloat(requestFormData.requestedAmount) || 0,
        remarks: requestFormData.remarks,
      });
      toast.success("Advance request submitted successfully.");
      setShowRequestDialog(false);
      resetRequestForm();
      await loadAdvances();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit advance request");
    }
  };

  const handleApproveRequest = async () => {
    if (!selectedAdvance) return;

    const isApproved = approvalFormData.approvalStatus === "Approved";
    const approvedAmount = isApproved ? (parseFloat(approvalFormData.approvedAmount) || 0) : 0;
    const installmentCount = isApproved ? (parseInt(approvalFormData.installmentCount) || 1) : 0;

    try {
      await salaryAdvancesService.approveAdvance(selectedAdvance.id, {
        approvedAmount,
        approvalStatus: approvalFormData.approvalStatus,
        installmentCount,
        deductionMode: approvalFormData.deductionMode,
        startMonth: isApproved ? approvalFormData.startMonth : undefined,
        autoDeduct: approvalFormData.autoDeduct,
        approvalRemarks: approvalFormData.approvalRemarks,
        approvedBy: "HR Manager",
      });
      toast.success(`Request ${approvalFormData.approvalStatus.toLowerCase()} successfully.`);
      setShowApprovalDialog(false);
      resetApprovalForm();
      await loadAdvances();
    } catch (err: any) {
      toast.error(err.message || "Failed to update approval status");
    }
  };

  const handleDeleteRequest = async (id: number) => {
    try {
      await salaryAdvancesService.deleteAdvance(id);
      toast.success("Advance request deleted.");
      await loadAdvances();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete advance request");
    }
  };

  const handleOpenApprovalDialog = (advance: SalaryAdvance) => {
    setSelectedAdvance(advance);
    setApprovalFormData({
      approvedAmount: advance.requestedAmount.toString(),
      approvalStatus: "Approved",
      installmentCount: "6",
      deductionMode: "Monthly",
      startMonth: format(addMonths(new Date(), 1), "yyyy-MM-dd"),
      autoDeduct: true,
      approvalRemarks: ""
    });
    setShowApprovalDialog(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
      case "Active":
      case "Completed":
        return "bg-green-100 text-green-800 border-green-200";
      case "Pending":
      case "Pending Approval":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Rejected":
      case "Overdue":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Approved":
      case "Active":
      case "Completed":
        return <CheckCircle className="h-4 w-4" />;
      case "Pending":
      case "Pending Approval":
        return <Clock className="h-4 w-4" />;
      case "Rejected":
      case "Overdue":
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const filteredAdvances = useMemo(() => {
    return advances.filter(advance => {
      const matchesSearch = advance.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            advance.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === "all" || advance.status.toLowerCase().includes(filterStatus.toLowerCase());
      const matchesDepartment = filterDepartment === "all" || advance.department === filterDepartment;
      return matchesSearch && matchesStatus && matchesDepartment;
    });
  }, [advances, searchTerm, filterStatus, filterDepartment]);

  const calculateRepaymentProgress = (advance: SalaryAdvance) => {
    if (!advance.approvedAmount) return 0;
    return (advance.totalDeducted / advance.approvedAmount) * 100;
  };

  // Calculate summary stats
  const totalActiveAdvances = advances.filter(a => a.status === "Active").length;
  const totalOutstandingAmount = advances
    .filter(a => a.status === "Active")
    .reduce((sum, a) => sum + a.balance, 0);
  const totalApprovedThisMonth = advances.filter(a => {
    if (!a.approvedDate) return false;
    const now = new Date();
    return a.approvedDate.getMonth() === now.getMonth() &&
           a.approvedDate.getFullYear() === now.getFullYear();
  }).length;
  const pendingRequests = advances.filter(a => a.status === "Pending Approval").length;

  const departments = Array.from(new Set(advances.map(a => a.department).filter(Boolean)));

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Salary Advances</h1>
          <p className="text-muted-foreground">
            Manage employee salary advance requests, loan tracking, and automatic deduction schedules
          </p>
        </div>
        <Button 
          onClick={() => setShowRequestDialog(true)}
          disabled={loading}
          style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
        >
          <Plus className="mr-2 h-4 w-4" />
          New Advance Request
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Advances</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <CreditCard className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveAdvances}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently being repaid
            </p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Outstanding Amount</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold"><CurrencyGlyph /> {totalOutstandingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total balance across all advances
            </p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Pending Requests</CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Bell className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting approval
            </p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Approved This Month</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalApprovedThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              New advances approved
            </p>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes tabSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [role="tabpanel"][data-state="active"] {
          animation: tabSlideIn 0.22s ease-out;
        }
      `}</style>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests">
            <FileText className="mr-2 h-4 w-4" />
            Advance Requests
          </TabsTrigger>
          <TabsTrigger value="schedule">
            <CalendarIcon className="mr-2 h-4 w-4" />
            Repayment Schedule
          </TabsTrigger>
          <TabsTrigger value="reports">
            <BarChart3 className="mr-2 h-4 w-4" />
            Reports
          </TabsTrigger>
        </TabsList>

        {/* Requests Tab */}
        <TabsContent value="requests" className="space-y-6">
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Advance & Loan Requests</CardTitle>
              <CardDescription>View and manage all salary advance and loan requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by employee name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 h-10"
                  />
                </div>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending Approval</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Departments" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map(dept => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Request Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdvances.map((advance) => (
                    <TableRow key={advance.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{advance.employeeName}</div>
                          <div className="text-sm text-muted-foreground">{advance.employeeId} • {advance.department}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {advance.advanceType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium"><CurrencyGlyph /> {advance.requestedAmount.toLocaleString()}</span>
                      </TableCell>
                      <TableCell>
                        {advance.approvedAmount > 0 ? (
                          <span className="font-medium" style={{ color: '#2B7A78' }}>
                            <CurrencyGlyph /> {advance.approvedAmount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {format(advance.requestDate, "dd MMM yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(advance.status)}>
                          {getStatusIcon(advance.status)}
                          <span className="ml-1">{advance.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {advance.status === "Pending Approval" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleOpenApprovalDialog(advance)}
                              style={{ color: '#2B7A78', borderColor: '#2B7A78' }}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedAdvance(advance);
                              setShowScheduleDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {advance.status === "Pending Approval" && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setDeleteConfirmAdvance(advance)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Repayment Schedule Tab */}
        <TabsContent value="schedule" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {advances
              .filter(a => a.status === "Active" || a.status === "Completed")
              .map((advance) => {
                const progress = calculateRepaymentProgress(advance);
                const remainingInstallments = advance.installmentCount - (advance.totalDeducted / advance.installmentAmount);
                
                return (
                  <Card key={advance.id} className={cardShell}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{advance.employeeName}</CardTitle>
                          <CardDescription>
                            {advance.employeeId} • {advance.department} • {advance.advanceType}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(advance.status)}>
                          {advance.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">Repayment Progress</span>
                          <span className="text-sm font-medium">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                          <span><CurrencyGlyph /> {advance.totalDeducted.toLocaleString()} paid</span>
                          <span><CurrencyGlyph /> {advance.balance.toLocaleString()} remaining</span>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Total Amount</div>
                          <div className="text-lg font-bold" style={{ color: '#2B7A78' }}>
                            <CurrencyGlyph /> {advance.approvedAmount.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Installment Amount</div>
                          <div className="text-lg font-bold">
                            <CurrencyGlyph /> {advance.installmentAmount.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Deduction Mode</div>
                          <Badge variant="outline">{advance.deductionMode}</Badge>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Remaining Installments</div>
                          <div className="text-lg font-bold">
                            {Math.ceil(remainingInstallments)} of {advance.installmentCount}
                          </div>
                        </div>
                      </div>

                      {/* Schedule Timeline */}
                      {advance.nextDeductionDate && (
                        <div className="rounded-lg p-4 bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <CalendarIcon className="h-5 w-5" style={{ color: '#2B7A78' }} />
                              <div>
                                <div className="font-medium">Next Deduction</div>
                                <div className="text-sm text-muted-foreground">
                                  {format(advance.nextDeductionDate, "dd MMMM yyyy")}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-medium"><CurrencyGlyph /> {advance.installmentAmount.toLocaleString()}</div>
                              <div className="text-sm text-muted-foreground">
                                {advance.autoDeduct ? "Auto-deduct enabled" : "Manual payment"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Additional Info */}
                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="text-sm text-muted-foreground">
                          Approved by {advance.approvedBy} on {advance.approvedDate && format(advance.approvedDate, "dd MMM yyyy")}
                        </div>
                        <Button variant="outline" size="sm">
                          <FileText className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className={`${cardShell} cursor-pointer`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Advance Summary Report
                </CardTitle>
                <CardDescription>By employee, department, or period</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Requests</span>
                    <span className="font-medium">{advances.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Approved</span>
                    <span className="font-medium">{advances.filter(a => a.approvalStatus === "Approved").length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount Disbursed</span>
                    <span className="font-medium">
                      <CurrencyGlyph /> {advances.filter(a => a.approvalStatus === "Approved").reduce((sum, a) => sum + a.approvedAmount, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <Button className="w-full" variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card className={`${cardShell} cursor-pointer`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Deduction Audit Report
                </CardTitle>
                <CardDescription>Tracks payroll deduction history</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Deductions</span>
                    <span className="font-medium">{advances.filter(a => a.status === "Active").length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Deducted</span>
                    <span className="font-medium">
                      <CurrencyGlyph /> {advances.reduce((sum, a) => sum + a.totalDeducted, 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Completed</span>
                    <span className="font-medium">{advances.filter(a => a.status === "Completed").length}</span>
                  </div>
                </div>
                <Button className="w-full" variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </CardContent>
            </Card>

            <Card className={`${cardShell} cursor-pointer`}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" style={{ color: '#E63946' }} />
                  Outstanding Loan Report
                </CardTitle>
                <CardDescription>Lists all active or overdue advances</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active Loans</span>
                    <span className="font-medium">{advances.filter(a => a.status === "Active" && a.advanceType === "Loan").length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Outstanding Balance</span>
                    <span className="font-medium" style={{ color: '#E63946' }}>
                      <CurrencyGlyph /> {totalOutstandingAmount.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Avg. Deduction/Month</span>
                    <span className="font-medium">
                      <CurrencyGlyph /> {(advances.filter(a => a.status === "Active").reduce((sum, a) => sum + a.installmentAmount, 0) / Math.max(advances.filter(a => a.status === "Active").length, 1)).toFixed(0)}
                    </span>
                  </div>
                </div>
                <Button className="w-full" variant="outline" size="sm">
                  <Download className="mr-2 h-4 w-4" />
                  Download Report
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Department-wise Breakdown */}
          <Card className={cardShell}>
            <CardHeader>
              <CardTitle>Department-wise Advance Distribution</CardTitle>
              <CardDescription>Breakdown of advances by department</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Total Requests</TableHead>
                    <TableHead>Approved</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map(dept => {
                    const deptAdvances = advances.filter(a => a.department === dept);
                    const approvedCount = deptAdvances.filter(a => a.approvalStatus === "Approved").length;
                    const activeCount = deptAdvances.filter(a => a.status === "Active").length;
                    const totalAmount = deptAdvances.filter(a => a.approvalStatus === "Approved").reduce((sum, a) => sum + a.approvedAmount, 0);
                    const outstanding = deptAdvances.filter(a => a.status === "Active").reduce((sum, a) => sum + a.balance, 0);
                    
                    return (
                      <TableRow key={dept}>
                        <TableCell>
                          <div className="font-medium">{dept}</div>
                        </TableCell>
                        <TableCell>{deptAdvances.length}</TableCell>
                        <TableCell>{approvedCount}</TableCell>
                        <TableCell>
                          <Badge variant="outline" style={{ color: '#2B7A78', borderColor: '#2B7A78' }}>
                            {activeCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium"><CurrencyGlyph /> {totalAmount.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium" style={{ color: '#E63946' }}>
                            <CurrencyGlyph /> {outstanding.toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Request Dialog */}
      <Dialog open={showRequestDialog} onOpenChange={(open) => {
        setShowRequestDialog(open);
        if (!open) resetRequestForm();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>New Advance Request</DialogTitle>
            <DialogDescription>
              Create a new salary advance or loan request for an employee
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Employee *</Label>
                <Select 
                  value={requestFormData.employeeId} 
                  onValueChange={handleEmployeeSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.length === 0 ? (
                      <SelectItem value="none" disabled>
                        No employees found
                      </SelectItem>
                    ) : (
                      employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name} ({emp.id})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="employeeId">Employee ID</Label>
                <Input
                  id="employeeId"
                  value={requestFormData.employeeId}
                  disabled
                  placeholder="Auto-filled"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={requestFormData.department}
                disabled
                placeholder="Auto-filled"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="requestDate">Request Date *</Label>
                <Input
                  id="requestDate"
                  type="date"
                  value={requestFormData.requestDate}
                  onChange={(e) => setRequestFormData({...requestFormData, requestDate: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advanceType">Advance Type *</Label>
                <Select 
                  value={requestFormData.advanceType} 
                  onValueChange={(value) => setRequestFormData({...requestFormData, advanceType: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Salary Advance">Salary Advance</SelectItem>
                    <SelectItem value="Loan">Loan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="requestedAmount">Requested Amount ({currencyCode}) *</Label>
              <Input
                id="requestedAmount"
                type="number"
                placeholder="0.00"
                value={requestFormData.requestedAmount}
                onChange={(e) => setRequestFormData({...requestFormData, requestedAmount: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks / Justification</Label>
              <Textarea
                id="remarks"
                placeholder="Reason for advance request..."
                value={requestFormData.remarks}
                onChange={(e) => setRequestFormData({...requestFormData, remarks: e.target.value})}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Attachment (Optional)</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  Click to upload supporting documents
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, or image files
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowRequestDialog(false);
                resetRequestForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddRequest}
              disabled={!requestFormData.employeeId || !requestFormData.requestedAmount}
              style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={(open) => {
        setShowApprovalDialog(open);
        if (!open) resetApprovalForm();
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Approve Advance Request</DialogTitle>
            <DialogDescription>
              {selectedAdvance && `${selectedAdvance.employeeName} - ${selectedAdvance.advanceType}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {selectedAdvance && (
              <div className="p-4 border rounded-lg bg-muted/50 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Requested Amount:</span>
                  <span className="font-medium"><CurrencyGlyph /> {selectedAdvance.requestedAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Request Date:</span>
                  <span className="font-medium">{format(selectedAdvance.requestDate, "dd MMM yyyy")}</span>
                </div>
                {selectedAdvance.remarks && (
                  <div className="text-sm pt-2 border-t">
                    <span className="text-muted-foreground">Remarks: </span>
                    <span>{selectedAdvance.remarks}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="approvalStatus">Decision *</Label>
              <Select 
                value={approvalFormData.approvalStatus} 
                onValueChange={(value) => setApprovalFormData({...approvalFormData, approvalStatus: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Approved">Approve</SelectItem>
                  <SelectItem value="Rejected">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {approvalFormData.approvalStatus === "Approved" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="approvedAmount">Approved Amount ({currencyCode}) *</Label>
                  <Input
                    id="approvedAmount"
                    type="number"
                    placeholder="0.00"
                    value={approvalFormData.approvedAmount}
                    onChange={(e) => setApprovalFormData({...approvalFormData, approvedAmount: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="installmentCount">Installment Count *</Label>
                    <Input
                      id="installmentCount"
                      type="number"
                      placeholder="e.g., 6"
                      value={approvalFormData.installmentCount}
                      onChange={(e) => setApprovalFormData({...approvalFormData, installmentCount: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Installment Amount</Label>
                    <div className="flex items-center h-10 px-3 border rounded-md bg-muted text-muted-foreground">
                      <CurrencyGlyph /> {approvalFormData.approvedAmount && approvalFormData.installmentCount 
                        ? (parseFloat(approvalFormData.approvedAmount) / parseInt(approvalFormData.installmentCount)).toFixed(2)
                        : "0.00"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="deductionMode">Deduction Mode *</Label>
                    <Select 
                      value={approvalFormData.deductionMode} 
                      onValueChange={(value) => setApprovalFormData({...approvalFormData, deductionMode: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="startMonth">Start Month *</Label>
                    <Input
                      id="startMonth"
                      type="date"
                      value={approvalFormData.startMonth}
                      onChange={(e) => setApprovalFormData({...approvalFormData, startMonth: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <Label htmlFor="autoDeduct" className="cursor-pointer">Auto Deduct from Payroll</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically deduct installments during payroll processing
                    </p>
                  </div>
                  <Switch
                    id="autoDeduct"
                    checked={approvalFormData.autoDeduct}
                    onCheckedChange={(checked) => setApprovalFormData({...approvalFormData, autoDeduct: checked})}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="approvalRemarks">Approval Notes (Optional)</Label>
              <Textarea
                id="approvalRemarks"
                placeholder="Add any notes or conditions..."
                value={approvalFormData.approvalRemarks}
                onChange={(e) => setApprovalFormData({...approvalFormData, approvalRemarks: e.target.value})}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setShowApprovalDialog(false);
                resetApprovalForm();
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApproveRequest}
              style={{ 
                background: approvalFormData.approvalStatus === "Approved" 
                  ? 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)' 
                  : 'linear-gradient(135deg, #E63946 0%, #E63946 100%)', 
                color: 'white' 
              }}
            >
              {approvalFormData.approvalStatus === "Approved" ? "Approve Request" : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Details Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Advance Details & Repayment Schedule</DialogTitle>
            <DialogDescription>
              {selectedAdvance && `${selectedAdvance.employeeName} - ${selectedAdvance.advanceType}`}
            </DialogDescription>
          </DialogHeader>
          {selectedAdvance && (
            <div className="space-y-6 py-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Approved Amount</div>
                      <div className="text-xl font-bold" style={{ color: '#2B7A78' }}>
                        <CurrencyGlyph /> {selectedAdvance.approvedAmount.toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Deducted</div>
                      <div className="text-xl font-bold">
                        <CurrencyGlyph /> {selectedAdvance.totalDeducted.toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">Balance</div>
                      <div className="text-xl font-bold" style={{ color: '#E63946' }}>
                        <CurrencyGlyph /> {selectedAdvance.balance.toLocaleString()}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Progress */}
              {selectedAdvance.approvedAmount > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Repayment Progress</span>
                    <span className="text-sm font-medium">{calculateRepaymentProgress(selectedAdvance).toFixed(0)}%</span>
                  </div>
                  <Progress value={calculateRepaymentProgress(selectedAdvance)} className="h-3" />
                </div>
              )}

              {/* Request Details */}
              <div className="space-y-3 p-4 border rounded-lg">
                <h3 className="font-medium">Request Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Employee ID:</span>
                    <div className="font-medium">{selectedAdvance.employeeId}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Department:</span>
                    <div className="font-medium">{selectedAdvance.department}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Request Date:</span>
                    <div className="font-medium">{format(selectedAdvance.requestDate, "dd MMM yyyy")}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Advance Type:</span>
                    <div className="font-medium">{selectedAdvance.advanceType}</div>
                  </div>
                  {selectedAdvance.approvedBy && (
                    <>
                      <div>
                        <span className="text-muted-foreground">Approved By:</span>
                        <div className="font-medium">{selectedAdvance.approvedBy}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Approved On:</span>
                        <div className="font-medium">
                          {selectedAdvance.approvedDate && format(selectedAdvance.approvedDate, "dd MMM yyyy")}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                {selectedAdvance.remarks && (
                  <div className="pt-2 border-t">
                    <span className="text-sm text-muted-foreground">Remarks: </span>
                    <span className="text-sm">{selectedAdvance.remarks}</span>
                  </div>
                )}
              </div>

              {/* Repayment Details */}
              {selectedAdvance.approvedAmount > 0 && (
                <div className="space-y-3 p-4 border rounded-lg">
                  <h3 className="font-medium">Repayment Schedule</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Installment Amount:</span>
                      <div className="font-medium"><CurrencyGlyph /> {selectedAdvance.installmentAmount.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Total Installments:</span>
                      <div className="font-medium">{selectedAdvance.installmentCount}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Deduction Mode:</span>
                      <div className="font-medium">{selectedAdvance.deductionMode}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Auto Deduct:</span>
                      <div className="font-medium">{selectedAdvance.autoDeduct ? "Enabled" : "Disabled"}</div>
                    </div>
                    {selectedAdvance.nextDeductionDate && (
                      <div>
                        <span className="text-muted-foreground">Next Deduction:</span>
                        <div className="font-medium">{format(selectedAdvance.nextDeductionDate, "dd MMM yyyy")}</div>
                      </div>
                    )}
                    {selectedAdvance.startMonth && (
                      <div>
                        <span className="text-muted-foreground">Start Month:</span>
                        <div className="font-medium">{format(selectedAdvance.startMonth, "MMMM yyyy")}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {selectedAdvance.attachment && (
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span className="text-sm font-medium">{selectedAdvance.attachment}</span>
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Close
            </Button>
            <Button variant="outline">
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Export Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmAdvance} onOpenChange={(open) => {
        if (!open) setDeleteConfirmAdvance(null);
      }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Advance Request</DialogTitle>
            <DialogDescription>
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2 text-sm">
            <div className="text-muted-foreground">Employee</div>
            <div className="font-medium">
              {deleteConfirmAdvance?.employeeName} ({deleteConfirmAdvance?.employeeId})
            </div>
            <div className="text-muted-foreground mt-2">Requested Amount</div>
            <div className="font-medium">
              <CurrencyGlyph /> {deleteConfirmAdvance?.requestedAmount?.toLocaleString()}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmAdvance(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteConfirmAdvance) {
                  handleDeleteRequest(deleteConfirmAdvance.id);
                  setDeleteConfirmAdvance(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

