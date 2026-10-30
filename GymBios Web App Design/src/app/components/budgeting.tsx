import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Wallet,
  Plus,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  Filter,
  Search,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  DollarSign,
  Target,
  BarChart3,
  PieChart,
  Building,
  Users,
  Package,
  ShoppingBag,
  Lightbulb,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  Eye,
  FileText,
  Settings,
  ChevronRight,
  Sparkles,
  Printer,
} from "lucide-react";
import { Progress } from "./ui/progress";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RePieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts";
import { toast } from "sonner@2.0.3";

interface BudgetItem {
  id: string;
  category: string;
  department: string;
  budgetType: string;
  budgetAmount: number;
  spent: number;
  remaining: number;
  percentage: number;
  responsiblePerson: string;
  alertThreshold: number;
  status: "Safe" | "At Risk" | "Overspent" | "Critical";
  branch?: string;
}

export function Budgeting() {
  const [selectedBranch, setSelectedBranch] = useState("all");
  const [selectedPeriod, setSelectedPeriod] = useState("monthly");
  const [activeTab, setActiveTab] = useState("overview");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [budgetSearch, setBudgetSearch] = useState("");
  const [editingBudgetId, setEditingBudgetId] = useState<string | null>(null);
  const [selectedBudget, setSelectedBudget] = useState<BudgetItem | null>(null);
  const [reportType, setReportType] = useState("performance");
  const [reportStatus, setReportStatus] = useState("all");
  const [budgetForm, setBudgetForm] = useState({
    budgetType: "Monthly",
    department: "",
    category: "",
    branch: "",
    budgetAmount: "",
    alertThreshold: "80",
    responsiblePerson: "",
    notes: "",
  });

  // Sample Budget Data
  const [budgets, setBudgets] = useState<BudgetItem[]>([
    {
      id: "BDG001",
      category: "Utilities",
      department: "Operations",
      budgetType: "Monthly",
      budgetAmount: 3000,
      spent: 2200,
      remaining: 800,
      percentage: 73,
      responsiblePerson: "Ahmed Hassan",
      alertThreshold: 80,
      status: "Safe",
      branch: "Dubai Marina",
    },
    {
      id: "BDG002",
      category: "Inventory",
      department: "Retail & F&B",
      budgetType: "Monthly",
      budgetAmount: 10000,
      spent: 11500,
      remaining: -1500,
      percentage: 115,
      responsiblePerson: "Sarah Johnson",
      alertThreshold: 90,
      status: "Overspent",
      branch: "Dubai Marina",
    },
    {
      id: "BDG003",
      category: "Marketing",
      department: "Marketing",
      budgetType: "Quarterly",
      budgetAmount: 6000,
      spent: 3600,
      remaining: 2400,
      percentage: 60,
      responsiblePerson: "Mike Wilson",
      alertThreshold: 85,
      status: "Safe",
      branch: "Dubai Marina",
    },
    {
      id: "BDG004",
      category: "Equipment Maintenance",
      department: "Maintenance",
      budgetType: "Monthly",
      budgetAmount: 2500,
      spent: 2100,
      remaining: 400,
      percentage: 84,
      responsiblePerson: "Omar Al-Rashid",
      alertThreshold: 80,
      status: "At Risk",
      branch: "Sharjah",
    },
    {
      id: "BDG005",
      category: "Staff Training",
      department: "HR",
      budgetType: "Quarterly",
      budgetAmount: 4000,
      spent: 1800,
      remaining: 2200,
      percentage: 45,
      responsiblePerson: "Fatima Ali",
      alertThreshold: 75,
      status: "Safe",
      branch: "Sharjah",
    },
    {
      id: "BDG006",
      category: "Office Supplies",
      department: "Admin",
      budgetType: "Monthly",
      budgetAmount: 800,
      spent: 750,
      remaining: 50,
      percentage: 94,
      responsiblePerson: "David Lee",
      alertThreshold: 90,
      status: "Critical",
      branch: "Abu Dhabi",
    },
    {
      id: "BDG007",
      category: "Electricity",
      department: "Utilities",
      budgetType: "Monthly",
      budgetAmount: 5000,
      spent: 5400,
      remaining: -400,
      percentage: 108,
      responsiblePerson: "Ahmed Hassan",
      alertThreshold: 80,
      status: "Overspent",
      branch: "Abu Dhabi",
    },
    {
      id: "BDG008",
      category: "Snacks & Beverages",
      department: "F&B",
      budgetType: "Monthly",
      budgetAmount: 1500,
      spent: 1650,
      remaining: -150,
      percentage: 110,
      responsiblePerson: "Lisa Martinez",
      alertThreshold: 85,
      status: "Overspent",
      branch: "Dubai Marina",
    },
  ]);

  // Branch Budget Summary
  const branchSummary = [
    { branch: "Dubai Marina", budget: 45000, spent: 39500, remaining: 5500, status: "Safe" },
    { branch: "Sharjah", budget: 20000, spent: 24000, remaining: -4000, status: "Overspent" },
    { branch: "Abu Dhabi", budget: 28500, spent: 25700, remaining: 2800, status: "Good" },
  ];

  // Pending Approvals
  const [pendingApprovals, setPendingApprovals] = useState([
    {
      id: "BGT-102",
      category: "Inventory",
      amount: 10000,
      submittedBy: "John D.",
      status: "Pending",
      date: "2024-11-18",
    },
    {
      id: "BGT-103",
      category: "Marketing",
      amount: 5000,
      submittedBy: "Sarah M.",
      status: "Pending",
      date: "2024-11-19",
    },
    {
      id: "BGT-104",
      category: "Equipment",
      amount: 15000,
      submittedBy: "Mike W.",
      status: "Revision Requested",
      date: "2024-11-17",
    },
  ]);

  // AI Insights
  const aiInsights = [
    {
      type: "warning",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      title: "Overspending Alert",
      message: "F&B budget exceeded by 18%. Reduce ingredient purchases or adjust pricing.",
    },
    {
      type: "suggestion",
      icon: Lightbulb,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      title: "Vendor Optimization",
      message: "Supplier B is 6% cheaper consistently — update preferred vendor.",
    },
    {
      type: "forecast",
      icon: Zap,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      title: "Seasonal Impact",
      message: "Electricity expected to rise 22% in July — adjust budget accordingly.",
    },
    {
      type: "success",
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      title: "Cost Savings",
      message: "Abu Dhabi branch saved AED 1,200 through supplier optimization.",
    },
  ];

  // Budget vs Actual Chart Data
  const bvaData = [
    { month: "Jan", budget: 25000, actual: 23500 },
    { month: "Feb", budget: 25000, actual: 26200 },
    { month: "Mar", budget: 25000, actual: 24800 },
    { month: "Apr", budget: 25000, actual: 27100 },
    { month: "May", budget: 28000, actual: 26500 },
    { month: "Jun", budget: 28000, actual: 29300 },
  ];

  // Category Performance Data
  const categoryData = [
    { name: "Utilities", value: 28, color: "#2B7A78" },
    { name: "Inventory", value: 35, color: "#E63946" },
    { name: "Marketing", value: 18, color: "#FFA500" },
    { name: "Maintenance", value: 12, color: "#3498db" },
    { name: "Admin", value: 7, color: "#9b59b6" },
  ];

  // Expense Trend Data
  const expenseTrend = [
    { month: "Jan", utilities: 2200, inventory: 9500, marketing: 1200 },
    { month: "Feb", utilities: 2400, inventory: 10200, marketing: 1400 },
    { month: "Mar", utilities: 2100, inventory: 9800, marketing: 1100 },
    { month: "Apr", utilities: 2600, inventory: 11000, marketing: 1500 },
    { month: "May", utilities: 2300, inventory: 10500, marketing: 1300 },
    { month: "Jun", utilities: 2500, inventory: 11500, marketing: 1600 },
  ];

  // Calculate Totals
  const filteredBudgets =
    selectedBranch === "all"
      ? budgets.filter((budget) =>
          [budget.id, budget.category, budget.department, budget.responsiblePerson]
            .join(" ")
            .toLowerCase()
            .includes(budgetSearch.toLowerCase()),
        )
      : budgets.filter(
          (budget) =>
            budget.branch === selectedBranch &&
            [budget.id, budget.category, budget.department, budget.responsiblePerson]
              .join(" ")
              .toLowerCase()
              .includes(budgetSearch.toLowerCase()),
        );

  const totalBudget = filteredBudgets.reduce((sum, b) => sum + b.budgetAmount, 0);
  const totalSpent = filteredBudgets.reduce((sum, b) => sum + b.spent, 0);
  const totalRemaining = totalBudget - totalSpent;
  const totalOverspend = filteredBudgets
    .filter((b) => b.remaining < 0)
    .reduce((sum, b) => sum + Math.abs(b.remaining), 0);
  const totalSavings = filteredBudgets
    .filter((b) => b.remaining > 0)
    .reduce((sum, b) => sum + b.remaining, 0);

  const reportBudgets =
    reportStatus === "all"
      ? filteredBudgets
      : filteredBudgets.filter((budget) => budget.status.toLowerCase() === reportStatus);
  const reportAllocation = reportBudgets.reduce((sum, budget) => sum + budget.budgetAmount, 0);
  const reportSpend = reportBudgets.reduce((sum, budget) => sum + budget.spent, 0);
  const reportVariance = reportAllocation - reportSpend;
  const reportUtilization = reportAllocation > 0 ? (reportSpend / reportAllocation) * 100 : 0;
  const departmentReportRows = Object.values(
    reportBudgets.reduce<
      Record<
        string,
        {
          department: string;
          budgetCount: number;
          allocation: number;
          spend: number;
          variance: number;
          utilization: number;
          exceptions: number;
        }
      >
    >((groups, budget) => {
      const current = groups[budget.department] || {
        department: budget.department,
        budgetCount: 0,
        allocation: 0,
        spend: 0,
        variance: 0,
        utilization: 0,
        exceptions: 0,
      };
      current.budgetCount += 1;
      current.allocation += budget.budgetAmount;
      current.spend += budget.spent;
      current.variance = current.allocation - current.spend;
      current.utilization = current.allocation > 0 ? (current.spend / current.allocation) * 100 : 0;
      if (budget.status !== "Safe") current.exceptions += 1;
      groups[budget.department] = current;
      return groups;
    }, {}),
  ).sort((a, b) => b.allocation - a.allocation);
  const reportTitle =
    reportType === "variance"
      ? "Detailed Variance Analysis"
      : reportType === "utilization"
        ? "Budget Utilization & Threshold Report"
        : reportType === "department"
          ? "Department Budget Consolidation"
          : "Detailed Budget Performance";
  const reportDescription =
    reportType === "variance"
      ? "Compares approved allocation with actual expenditure and classifies favourable and unfavourable variance."
      : reportType === "utilization"
        ? "Tracks consumption, available headroom, alert thresholds, threshold gaps, and accountable budget owners."
        : reportType === "department"
          ? "Consolidates all filtered budget lines by department with spend, variance, utilization, and control exceptions."
          : "Provides the complete budget ledger with allocation, actual spend, remaining value, utilization, status, and ownership.";
  const reportCommentary =
    reportType === "variance"
      ? `${reportBudgets.filter((budget) => budget.remaining < 0).length} budget lines have unfavourable variance. The net variance is AED ${reportVariance.toLocaleString()}.`
      : reportType === "utilization"
        ? `${reportBudgets.filter((budget) => budget.percentage >= budget.alertThreshold).length} budget lines have reached or exceeded their configured alert threshold. Overall utilization is ${reportUtilization.toFixed(1)}%.`
        : reportType === "department"
          ? `${departmentReportRows.filter((department) => department.exceptions > 0).length} departments contain control exceptions. Review departments with utilization above 100% first.`
          : `Overall utilization is ${reportUtilization.toFixed(1)}%. ${reportBudgets.filter((budget) => budget.status !== "Safe").length} budget lines require finance review.`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Safe":
        return "bg-green-100 text-green-800";
      case "At Risk":
        return "bg-yellow-100 text-yellow-800";
      case "Overspent":
        return "bg-red-100 text-red-800";
      case "Critical":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Safe":
        return <CheckCircle className="h-4 w-4" />;
      case "At Risk":
        return <AlertCircle className="h-4 w-4" />;
      case "Overspent":
        return <XCircle className="h-4 w-4" />;
      case "Critical":
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const resetBudgetForm = () => {
    setBudgetForm({
      budgetType: "Monthly",
      department: "",
      category: "",
      branch: "",
      budgetAmount: "",
      alertThreshold: "80",
      responsiblePerson: "",
      notes: "",
    });
    setEditingBudgetId(null);
  };

  const openCreateBudget = () => {
    resetBudgetForm();
    setShowCreateDialog(true);
  };

  const openEditBudget = (budget: BudgetItem) => {
    setEditingBudgetId(budget.id);
    setBudgetForm({
      budgetType: budget.budgetType,
      department: budget.department,
      category: budget.category,
      branch: budget.branch || "",
      budgetAmount: String(budget.budgetAmount),
      alertThreshold: String(budget.alertThreshold),
      responsiblePerson: budget.responsiblePerson,
      notes: "",
    });
    setShowCreateDialog(true);
  };

  const saveBudget = () => {
    const amount = Number(budgetForm.budgetAmount);
    if (
      !budgetForm.department ||
      !budgetForm.category ||
      !budgetForm.branch ||
      !budgetForm.responsiblePerson ||
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      toast.error("Complete all required budget fields");
      return;
    }

    if (editingBudgetId) {
      setBudgets((current) =>
        current.map((budget) => {
          if (budget.id !== editingBudgetId) return budget;
          const percentage = Math.round((budget.spent / amount) * 100);
          return {
            ...budget,
            category: budgetForm.category,
            department: budgetForm.department,
            budgetType: budgetForm.budgetType,
            budgetAmount: amount,
            remaining: amount - budget.spent,
            percentage,
            responsiblePerson: budgetForm.responsiblePerson,
            alertThreshold: Number(budgetForm.alertThreshold) || 80,
            branch: budgetForm.branch,
            status:
              percentage > 100
                ? "Overspent"
                : percentage >= (Number(budgetForm.alertThreshold) || 80)
                  ? "At Risk"
                  : "Safe",
          };
        }),
      );
      toast.success("Budget updated successfully");
    } else {
      const newBudget: BudgetItem = {
        id: `BDG${String(budgets.length + 1).padStart(3, "0")}`,
        category: budgetForm.category,
        department: budgetForm.department,
        budgetType: budgetForm.budgetType,
        budgetAmount: amount,
        spent: 0,
        remaining: amount,
        percentage: 0,
        responsiblePerson: budgetForm.responsiblePerson,
        alertThreshold: Number(budgetForm.alertThreshold) || 80,
        status: "Safe",
        branch: budgetForm.branch,
      };
      setBudgets((current) => [...current, newBudget]);
      toast.success(`${newBudget.id} created successfully`);
    }
    setShowCreateDialog(false);
    resetBudgetForm();
  };

  const exportBudgets = () => {
    const rows = [
      ["ID", "Category", "Department", "Branch", "Type", "Budget AED", "Spent AED", "Remaining AED", "Status"],
      ...filteredBudgets.map((budget) => [
        budget.id,
        budget.category,
        budget.department,
        budget.branch || "",
        budget.budgetType,
        budget.budgetAmount,
        budget.spent,
        budget.remaining,
        budget.status,
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `GymBios-Budgets-${selectedBranch === "all" ? "All-Branches" : selectedBranch}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Budget report exported");
  };

  const handleApproval = (id: string, action: "approve" | "reject" | "revise") => {
    if (action === "revise") {
      setPendingApprovals((current) =>
        current.map((approval) =>
          approval.id === id ? { ...approval, status: "Revision Requested" } : approval,
        ),
      );
      toast.success(`${id} returned for revision`);
      return;
    }
    setPendingApprovals((current) => current.filter((approval) => approval.id !== id));
    toast.success(`${id} ${action === "approve" ? "approved" : "rejected"}`);
  };

  const generateReviewReport = () => {
    const report = `GymBios Monthly Budget Review\n\nTotal Budget: AED ${totalBudget.toLocaleString()}\nTotal Spent: AED ${totalSpent.toLocaleString()}\nRemaining: AED ${totalRemaining.toLocaleString()}\nOverspend: AED ${totalOverspend.toLocaleString()}\nPending Approvals: ${pendingApprovals.length}`;
    const url = URL.createObjectURL(new Blob([report], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "GymBios-Monthly-Budget-Review.txt";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success("Monthly review report generated");
  };

  const downloadManagementReport = () => {
    const reportNames: Record<string, string> = {
      performance: "Budget Performance",
      variance: "Budget Variance",
      utilization: "Budget Utilization",
      department: "Department Budget",
    };
    const reportHeaders: Record<string, Array<string | number>> = {
      performance: ["Budget ID", "Category", "Department", "Branch", "Allocated AED", "Actual AED", "Variance AED", "Utilization %", "Status", "Owner"],
      variance: ["Budget ID", "Category", "Department", "Allocated AED", "Actual AED", "Variance AED", "Variance %", "Variance Type", "Status"],
      utilization: ["Budget ID", "Category", "Owner", "Allocated AED", "Used AED", "Available AED", "Utilization %", "Alert Threshold %", "Threshold Gap %", "Status"],
      department: ["Department", "Budget Lines", "Allocated AED", "Actual AED", "Variance AED", "Utilization %", "Control Exceptions"],
    };
    const detailRows: Array<Array<string | number>> =
      reportType === "department"
        ? departmentReportRows.map((department) => [
            department.department,
            department.budgetCount,
            department.allocation,
            department.spend,
            department.variance,
            department.utilization.toFixed(1),
            department.exceptions,
          ])
        : reportBudgets.map((budget) => {
            if (reportType === "variance") {
              const variancePercent = budget.budgetAmount > 0 ? (budget.remaining / budget.budgetAmount) * 100 : 0;
              return [
                budget.id,
                budget.category,
                budget.department,
                budget.budgetAmount,
                budget.spent,
                budget.remaining,
                variancePercent.toFixed(1),
                budget.remaining < 0 ? "Unfavourable" : "Favourable",
                budget.status,
              ];
            }
            if (reportType === "utilization") {
              return [
                budget.id,
                budget.category,
                budget.responsiblePerson,
                budget.budgetAmount,
                budget.spent,
                budget.remaining,
                budget.percentage,
                budget.alertThreshold,
                budget.alertThreshold - budget.percentage,
                budget.status,
              ];
            }
            return [
              budget.id,
              budget.category,
              budget.department,
              budget.branch || "",
              budget.budgetAmount,
              budget.spent,
              budget.remaining,
              budget.percentage,
              budget.status,
              budget.responsiblePerson,
            ];
          });
    const rows: Array<Array<string | number>> = [
      [`GymBios ${reportNames[reportType]} Report`],
      [`Period: ${selectedPeriod}`, `Branch: ${selectedBranch === "all" ? "All Branches" : selectedBranch}`],
      [`Status Filter: ${reportStatus === "all" ? "All Statuses" : reportStatus}`, `Generated: ${new Date().toLocaleString("en-AE")}`],
      [],
      reportHeaders[reportType],
      ...detailRows,
      [],
      ["Report Totals", reportAllocation, reportSpend, reportVariance, reportUtilization.toFixed(1)],
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `GymBios-${reportNames[reportType].replaceAll(" ", "-")}-${selectedPeriod}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success(`${reportNames[reportType]} report downloaded`);
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
            <span>Financials</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Budgeting & Expense Control</span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-[#2B7A78] to-[#1a4d4b] p-3 rounded-xl text-white shadow-lg">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Budget Management</h1>
              <p className="text-sm text-muted-foreground">
                Enterprise-grade budgeting with AI-powered insights and forecasting
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" onClick={exportBudgets}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setActiveTab("governance")}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Dialog
            open={showCreateDialog}
            onOpenChange={(open) => {
              setShowCreateDialog(open);
              if (!open) resetBudgetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openCreateBudget} className="bg-[#2B7A78] hover:bg-[#1a4d4b] text-white">
                <Plus className="h-4 w-4 mr-2" />
                Create Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingBudgetId ? "Edit Budget" : "Create New Budget"}</DialogTitle>
                <DialogDescription>
                  {editingBudgetId
                    ? "Update allocation, ownership, and alert controls."
                    : "Set up a new budget for a department or expense category."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Budget Type</Label>
                    <Select value={budgetForm.budgetType} onValueChange={(value) => setBudgetForm({ ...budgetForm, budgetType: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Yearly">Yearly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select value={budgetForm.department} onValueChange={(value) => setBudgetForm({ ...budgetForm, department: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HR">HR</SelectItem>
                        <SelectItem value="Inventory">Inventory</SelectItem>
                        <SelectItem value="F&B">F&B</SelectItem>
                        <SelectItem value="Retail & F&B">Retail & F&B</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={budgetForm.category} onValueChange={(value) => setBudgetForm({ ...budgetForm, category: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Utilities">Utilities</SelectItem>
                        <SelectItem value="Consumables">Consumables</SelectItem>
                        <SelectItem value="Equipment Maintenance">Equipment Maintenance</SelectItem>
                        <SelectItem value="Marketing">Marketing</SelectItem>
                        <SelectItem value="Inventory">Inventory Purchases</SelectItem>
                        <SelectItem value="Staff Training">HR & Staff</SelectItem>
                        <SelectItem value="Office Supplies">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select value={budgetForm.branch} onValueChange={(value) => setBudgetForm({ ...budgetForm, branch: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Dubai Marina">Dubai Marina</SelectItem>
                        <SelectItem value="Sharjah">Sharjah</SelectItem>
                        <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Budget Amount (AED)</Label>
                    <Input type="number" placeholder="0.00" value={budgetForm.budgetAmount} onChange={(event) => setBudgetForm({ ...budgetForm, budgetAmount: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Alert Threshold (%)</Label>
                    <Input type="number" placeholder="80" value={budgetForm.alertThreshold} onChange={(event) => setBudgetForm({ ...budgetForm, alertThreshold: event.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Responsible Person</Label>
                  <Select value={budgetForm.responsiblePerson} onValueChange={(value) => setBudgetForm({ ...budgetForm, responsiblePerson: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Assign to" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ahmed Hassan">Ahmed Hassan</SelectItem>
                      <SelectItem value="Sarah Johnson">Sarah Johnson</SelectItem>
                      <SelectItem value="Mike Wilson">Mike Wilson</SelectItem>
                      <SelectItem value="Omar Al-Rashid">Omar Al-Rashid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes (Optional)</Label>
                  <Input placeholder="Add any additional details..." value={budgetForm.notes} onChange={(event) => setBudgetForm({ ...budgetForm, notes: event.target.value })} />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={saveBudget} className="bg-[#2B7A78] hover:bg-[#1a4d4b]">
                  {editingBudgetId ? "Save Changes" : "Create Budget"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Branch Selector & Period Filter */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Building className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Branches</SelectItem>
              <SelectItem value="Dubai Marina">Dubai Marina</SelectItem>
              <SelectItem value="Sharjah">Sharjah</SelectItem>
              <SelectItem value="Abu Dhabi">Abu Dhabi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Dialog open={Boolean(selectedBudget)} onOpenChange={(open) => !open && setSelectedBudget(null)}>
        <DialogContent className="max-w-xl">
          {selectedBudget && (
            <>
              <DialogHeader>
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-mono text-xs text-[#2B7A78]">{selectedBudget.id}</span>
                  <Badge className={getStatusColor(selectedBudget.status)}>{selectedBudget.status}</Badge>
                </div>
                <DialogTitle>{selectedBudget.category} Budget</DialogTitle>
                <DialogDescription>
                  {selectedBudget.department} · {selectedBudget.branch}
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-3 py-3">
                <div className="rounded-lg bg-[#DFF5F4] p-4">
                  <p className="text-xs text-muted-foreground">Approved Budget</p>
                  <p className="text-xl font-bold text-[#1F5A52]">AED {selectedBudget.budgetAmount.toLocaleString()}</p>
                </div>
                <div className="rounded-lg bg-red-50 p-4">
                  <p className="text-xs text-muted-foreground">Actual Spend</p>
                  <p className="text-xl font-bold text-red-600">AED {selectedBudget.spent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Remaining</p>
                  <p className={selectedBudget.remaining < 0 ? "font-semibold text-red-600" : "font-semibold text-green-600"}>
                    AED {selectedBudget.remaining.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Utilization</p>
                  <p className="font-semibold">{selectedBudget.percentage}%</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Budget Cycle</p>
                  <p className="font-semibold">{selectedBudget.budgetType}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Budget Owner</p>
                  <p className="font-semibold">{selectedBudget.responsiblePerson}</p>
                </div>
              </div>
              <Progress value={Math.min(selectedBudget.percentage, 100)} className="h-2" />
              <div className="flex justify-end gap-2 border-t pt-4">
                <Button variant="outline" onClick={() => setSelectedBudget(null)}>Close</Button>
                <Button
                  className="bg-[#2B7A78] hover:bg-[#1a4d4b]"
                  onClick={() => {
                    const budget = selectedBudget;
                    setSelectedBudget(null);
                    openEditBudget(budget);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Budget
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white p-1 rounded-lg shadow-sm">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="budgets">Budget Master</TabsTrigger>
          <TabsTrigger value="approvals">
            Approvals
            <Badge className="ml-2 bg-red-500 text-white">{pendingApprovals.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="branches">Multi-Branch</TabsTrigger>
          <TabsTrigger value="analytics">BvA Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="intelligence">AI Intelligence</TabsTrigger>
          <TabsTrigger value="governance">Governance</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card className="bg-gradient-to-br from-[#2B7A78] to-[#1a4d4b] text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="h-8 w-8 opacity-80" />
                  <TrendingUp className="h-5 w-5" />
                </div>
                <p className="text-sm opacity-90 mb-1">Total Budget</p>
                <p className="text-3xl font-bold">AED {totalBudget.toLocaleString()}</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <TrendingDown className="h-8 w-8 opacity-80" />
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <p className="text-sm opacity-90 mb-1">Total Spent</p>
                <p className="text-3xl font-bold">AED {totalSpent.toLocaleString()}</p>
                <p className="text-xs opacity-80 mt-1">
                  {((totalSpent / totalBudget) * 100).toFixed(1)}% utilized
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Wallet className="h-8 w-8 opacity-80" />
                  <CheckCircle className="h-5 w-5" />
                </div>
                <p className="text-sm opacity-90 mb-1">Remaining</p>
                <p className="text-3xl font-bold">AED {totalRemaining.toLocaleString()}</p>
                <p className="text-xs opacity-80 mt-1">
                  {((totalRemaining / totalBudget) * 100).toFixed(1)}% available
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="h-8 w-8 opacity-80" />
                  <XCircle className="h-5 w-5" />
                </div>
                <p className="text-sm opacity-90 mb-1">Overspend</p>
                <p className="text-3xl font-bold">AED {totalOverspend.toLocaleString()}</p>
                <p className="text-xs opacity-80 mt-1">
                  {filteredBudgets.filter((b) => b.remaining < 0).length} categories
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <Target className="h-8 w-8 opacity-80" />
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="text-sm opacity-90 mb-1">Savings</p>
                <p className="text-3xl font-bold">AED {totalSavings.toLocaleString()}</p>
                <p className="text-xs opacity-80 mt-1">
                  {filteredBudgets.filter((b) => b.percentage < 70).length} under-utilized
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Budget vs Actual Chart */}
          <Card className="shadow-lg border-[#2B7A78]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-[#2B7A78]" />
                Budget vs Actual Comparison
              </CardTitle>
              <CardDescription>Monthly budget performance tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={bvaData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="budget" fill="#2B7A78" name="Budget" />
                  <Bar dataKey="actual" fill="#E63946" name="Actual" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Performance */}
            <Card className="shadow-lg border-[#2B7A78]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-[#2B7A78]" />
                  Budget Allocation by Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <RePieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RePieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Expense Trend */}
            <Card className="shadow-lg border-[#2B7A78]/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-[#2B7A78]" />
                  Expense Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={expenseTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="utilities"
                      stackId="1"
                      stroke="#2B7A78"
                      fill="#2B7A78"
                    />
                    <Area
                      type="monotone"
                      dataKey="inventory"
                      stackId="1"
                      stroke="#E63946"
                      fill="#E63946"
                    />
                    <Area
                      type="monotone"
                      dataKey="marketing"
                      stackId="1"
                      stroke="#FFA500"
                      fill="#FFA500"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights Panel */}
          <Card className="shadow-lg border-[#2B7A78]/20 bg-gradient-to-r from-[#DFF5F4] to-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#2B7A78]" />
                AI-Powered Insights & Recommendations
              </CardTitle>
              <CardDescription>Real-time intelligence for budget optimization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {aiInsights.map((insight, index) => (
                  <div
                    key={index}
                    className={`${insight.bgColor} border border-current/20 rounded-lg p-4`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`${insight.color} mt-1`}>
                        <insight.icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className={`font-semibold ${insight.color} mb-1`}>
                          {insight.title}
                        </h4>
                        <p className="text-sm text-gray-700">{insight.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Budget Master Tab */}
        <TabsContent value="budgets" className="space-y-6">
          <Card className="shadow-lg border-[#2B7A78]/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Budget Master - All Categories</CardTitle>
                  <CardDescription>
                    Manage all budget allocations and track spending
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search budgets..."
                      className="pl-10 w-64"
                      value={budgetSearch}
                      onChange={(event) => setBudgetSearch(event.target.value)}
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBudgetSearch("");
                      setSelectedBranch("all");
                    }}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-[#2B7A78]/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-[#DFF5F4] to-white">
                      <TableHead className="text-[#2B7A78]">ID</TableHead>
                      <TableHead className="text-[#2B7A78]">Category</TableHead>
                      <TableHead className="text-[#2B7A78]">Department</TableHead>
                      <TableHead className="text-[#2B7A78]">Type</TableHead>
                      <TableHead className="text-[#2B7A78]">Budget</TableHead>
                      <TableHead className="text-[#2B7A78]">Spent</TableHead>
                      <TableHead className="text-[#2B7A78]">Remaining</TableHead>
                      <TableHead className="text-[#2B7A78]">Utilization</TableHead>
                      <TableHead className="text-[#2B7A78]">Status</TableHead>
                      <TableHead className="text-[#2B7A78]">Responsible</TableHead>
                      <TableHead className="text-[#2B7A78]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBudgets.map((budget) => (
                      <TableRow key={budget.id} className="hover:bg-gray-50">
                        <TableCell className="font-mono text-sm">{budget.id}</TableCell>
                        <TableCell className="font-medium">{budget.category}</TableCell>
                        <TableCell>{budget.department}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{budget.budgetType}</Badge>
                        </TableCell>
                        <TableCell className="font-semibold">
                          AED {budget.budgetAmount.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-semibold text-red-600">
                          AED {budget.spent.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`font-semibold ${
                            budget.remaining < 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          AED {budget.remaining.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress
                              value={budget.percentage}
                              className={`h-2 ${
                                budget.percentage > 100
                                  ? "[&>div]:bg-red-500"
                                  : budget.percentage > 80
                                  ? "[&>div]:bg-yellow-500"
                                  : "[&>div]:bg-green-500"
                              }`}
                            />
                            <span className="text-xs text-gray-600">{budget.percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(budget.status)}>
                            {getStatusIcon(budget.status)}
                            <span className="ml-1">{budget.status}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{budget.responsiblePerson}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openEditBudget(budget)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedBudget(budget)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Approvals Tab */}
        <TabsContent value="approvals" className="space-y-6">
          <Card className="shadow-lg border-[#2B7A78]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#2B7A78]" />
                Budget Approval Workflow
              </CardTitle>
              <CardDescription>Review and approve budget requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingApprovals.map((approval) => (
                  <div
                    key={approval.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-mono font-semibold text-[#2B7A78]">
                            {approval.id}
                          </span>
                          <Badge
                            className={
                              approval.status === "Pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : "bg-orange-100 text-orange-800"
                            }
                          >
                            {approval.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Category:</span>
                            <span className="font-medium ml-2">{approval.category}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">Amount:</span>
                            <span className="font-semibold text-[#2B7A78] ml-2">
                              AED {approval.amount.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">Submitted By:</span>
                            <span className="font-medium ml-2">{approval.submittedBy}</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-600 mt-2">
                          Submitted: {approval.date}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproval(approval.id, "approve")}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleApproval(approval.id, "reject")}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleApproval(approval.id, "revise")}>
                          <RefreshCcw className="h-4 w-4 mr-2" />
                          Revise
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multi-Branch Tab */}
        <TabsContent value="branches" className="space-y-6">
          <Card className="shadow-lg border-[#2B7A78]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5 text-[#2B7A78]" />
                Multi-Branch Budget Comparison
              </CardTitle>
              <CardDescription>Compare budget performance across all branches</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border border-[#2B7A78]/10">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-[#DFF5F4] to-white">
                      <TableHead className="text-[#2B7A78]">Branch</TableHead>
                      <TableHead className="text-[#2B7A78]">Budget</TableHead>
                      <TableHead className="text-[#2B7A78]">Spent</TableHead>
                      <TableHead className="text-[#2B7A78]">Remaining</TableHead>
                      <TableHead className="text-[#2B7A78]">Variance</TableHead>
                      <TableHead className="text-[#2B7A78]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branchSummary.map((branch, index) => (
                      <TableRow key={index} className="hover:bg-gray-50">
                        <TableCell className="font-semibold">{branch.branch}</TableCell>
                        <TableCell className="font-semibold">
                          AED {branch.budget.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-semibold text-red-600">
                          AED {branch.spent.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`font-semibold ${
                            branch.remaining < 0 ? "text-red-600" : "text-green-600"
                          }`}
                        >
                          AED {branch.remaining.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {branch.remaining < 0 ? (
                              <ArrowDownRight className="h-4 w-4 text-red-600" />
                            ) : (
                              <ArrowUpRight className="h-4 w-4 text-green-600" />
                            )}
                            <span
                              className={
                                branch.remaining < 0 ? "text-red-600" : "text-green-600"
                              }
                            >
                              {Math.abs((branch.remaining / branch.budget) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              branch.status === "Overspent"
                                ? "bg-red-100 text-red-800"
                                : branch.status === "Safe"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }
                          >
                            {branch.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">Branch Intelligence</h4>
                    <div className="space-y-1 text-sm text-blue-800">
                      <p>• Sharjah branch overspent due to unexpected F&B restocking.</p>
                      <p>• Abu Dhabi branch saved AED 1,200 through supplier optimization.</p>
                      <p>• Dubai Marina branch maintaining healthy budget performance.</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BvA Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-lg border-[#2B7A78]/20">
              <CardHeader>
                <CardTitle>Cumulative Spend Curve</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={bvaData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="budget"
                      stroke="#2B7A78"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#E63946"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-[#2B7A78]/20">
              <CardHeader>
                <CardTitle>Budget Deviation Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                    <div>
                      <p className="text-sm text-red-700 font-medium">Negative Deviation</p>
                      <p className="text-xs text-red-600">Overspend - Requires attention</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-red-700">AED 2,050</p>
                      <p className="text-xs text-red-600">3 categories affected</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm text-green-700 font-medium">Positive Deviation</p>
                      <p className="text-xs text-green-600">Under-budget - Savings opportunity</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-700">AED 5,450</p>
                      <p className="text-xs text-green-600">5 categories under-utilized</p>
                    </div>
                  </div>
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      Root Cause Analysis
                    </h4>
                    <p className="text-sm text-purple-800">
                      "Inventory overspent by 15%. Root cause: high F&B purchase and increased
                      retail restocking."
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-6">
          <Card className="border-[#2B7A78]/20 shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-[#DFF5F4] to-white">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-[#2B7A78]" />
                    Budget Management Reports
                  </CardTitle>
                  <CardDescription>
                    Generate audit-ready budget, variance, utilization, and departmental reports.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button className="bg-[#2B7A78] text-white hover:bg-[#1a4d4b]" onClick={downloadManagementReport}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-2">
                  <Label>Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="performance">Budget Performance</SelectItem>
                      <SelectItem value="variance">Variance Analysis</SelectItem>
                      <SelectItem value="utilization">Utilization Report</SelectItem>
                      <SelectItem value="department">Department Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Budget Status</Label>
                  <Select value={reportStatus} onValueChange={setReportStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="safe">Safe</SelectItem>
                      <SelectItem value="at risk">At Risk</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="overspent">Overspent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Branch Scope</Label>
                  <div className="flex h-9 items-center rounded-md border bg-muted/20 px-3 text-sm">
                    {selectedBranch === "all" ? "All Branches" : selectedBranch}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Reporting Period</Label>
                  <div className="flex h-9 items-center rounded-md border bg-muted/20 px-3 text-sm capitalize">
                    {selectedPeriod}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-[#2B7A78]/15">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Total Allocation</p>
                    <p className="mt-1 text-xl font-bold text-[#1F5A52]">AED {reportAllocation.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{reportBudgets.length} budget lines</p>
                  </CardContent>
                </Card>
                <Card className="border-[#2B7A78]/15">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Actual Expenditure</p>
                    <p className="mt-1 text-xl font-bold">AED {reportSpend.toLocaleString()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{reportUtilization.toFixed(1)}% utilized</p>
                  </CardContent>
                </Card>
                <Card className="border-[#2B7A78]/15">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Net Variance</p>
                    <p className={`mt-1 text-xl font-bold ${reportVariance < 0 ? "text-red-600" : "text-green-600"}`}>
                      AED {reportVariance.toLocaleString()}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">{reportVariance < 0 ? "Unfavourable" : "Favourable"} variance</p>
                  </CardContent>
                </Card>
                <Card className="border-[#2B7A78]/15">
                  <CardContent className="p-4">
                    <p className="text-xs text-muted-foreground">Control Exceptions</p>
                    <p className="mt-1 text-xl font-bold text-orange-600">
                      {reportBudgets.filter((budget) => budget.status !== "Safe").length}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Require finance review</p>
                  </CardContent>
                </Card>
              </div>

              <div className="overflow-hidden rounded-lg border">
                <div className="flex items-center justify-between border-b bg-[#F7FAF9] px-4 py-3">
                  <div>
                    <p className="font-semibold">{reportTitle}</p>
                    <p className="max-w-3xl text-xs text-muted-foreground">{reportDescription}</p>
                  </div>
                  <Badge variant="outline">{reportType === "department" ? departmentReportRows.length : reportBudgets.length} records</Badge>
                </div>
                <div className="overflow-x-auto">
                  {reportType === "department" ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>Department</TableHead><TableHead>Budget Lines</TableHead><TableHead className="text-right">Allocated</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Variance</TableHead><TableHead>Utilization</TableHead><TableHead>Exceptions</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {departmentReportRows.length > 0 ? departmentReportRows.map((department) => (
                          <TableRow key={department.department}>
                            <TableCell className="font-medium">{department.department}</TableCell>
                            <TableCell>{department.budgetCount}</TableCell>
                            <TableCell className="text-right font-medium">AED {department.allocation.toLocaleString()}</TableCell>
                            <TableCell className="text-right">AED {department.spend.toLocaleString()}</TableCell>
                            <TableCell className={`text-right font-medium ${department.variance < 0 ? "text-red-600" : "text-green-600"}`}>AED {department.variance.toLocaleString()}</TableCell>
                            <TableCell><div className="min-w-24 space-y-1"><Progress value={Math.min(department.utilization, 100)} className="h-1.5" /><span className="text-xs text-muted-foreground">{department.utilization.toFixed(1)}%</span></div></TableCell>
                            <TableCell><Badge className={department.exceptions > 0 ? "bg-orange-100 text-orange-700" : "bg-green-100 text-green-700"}>{department.exceptions}</Badge></TableCell>
                          </TableRow>
                        )) : <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">No departments match the selected filters.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  ) : reportType === "variance" ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>Budget</TableHead><TableHead>Department</TableHead><TableHead className="text-right">Allocated</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Variance</TableHead><TableHead>Variance %</TableHead><TableHead>Classification</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {reportBudgets.length > 0 ? reportBudgets.map((budget) => {
                          const variancePercent = budget.budgetAmount > 0 ? (budget.remaining / budget.budgetAmount) * 100 : 0;
                          return <TableRow key={budget.id}>
                            <TableCell><button className="text-left" onClick={() => setSelectedBudget(budget)}><span className="block font-medium">{budget.category}</span><span className="font-mono text-xs text-muted-foreground">{budget.id}</span></button></TableCell>
                            <TableCell>{budget.department}</TableCell>
                            <TableCell className="text-right">AED {budget.budgetAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">AED {budget.spent.toLocaleString()}</TableCell>
                            <TableCell className={`text-right font-semibold ${budget.remaining < 0 ? "text-red-600" : "text-green-600"}`}>AED {budget.remaining.toLocaleString()}</TableCell>
                            <TableCell className={variancePercent < 0 ? "text-red-600" : "text-green-600"}>{variancePercent.toFixed(1)}%</TableCell>
                            <TableCell><Badge variant="outline" className={budget.remaining < 0 ? "border-red-200 text-red-700" : "border-green-200 text-green-700"}>{budget.remaining < 0 ? "Unfavourable" : "Favourable"}</Badge></TableCell>
                            <TableCell><Badge className={getStatusColor(budget.status)}>{budget.status}</Badge></TableCell>
                          </TableRow>;
                        }) : <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">No variance records match the selected filters.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  ) : reportType === "utilization" ? (
                    <Table>
                      <TableHeader><TableRow><TableHead>Budget</TableHead><TableHead>Owner</TableHead><TableHead className="text-right">Allocated</TableHead><TableHead className="text-right">Used</TableHead><TableHead className="text-right">Available</TableHead><TableHead>Utilization</TableHead><TableHead>Alert Threshold</TableHead><TableHead>Threshold Gap</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {reportBudgets.length > 0 ? reportBudgets.map((budget) => (
                          <TableRow key={budget.id}>
                            <TableCell><button className="text-left" onClick={() => setSelectedBudget(budget)}><span className="block font-medium">{budget.category}</span><span className="font-mono text-xs text-muted-foreground">{budget.id}</span></button></TableCell>
                            <TableCell>{budget.responsiblePerson}</TableCell>
                            <TableCell className="text-right">AED {budget.budgetAmount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">AED {budget.spent.toLocaleString()}</TableCell>
                            <TableCell className={`text-right ${budget.remaining < 0 ? "text-red-600" : "text-green-600"}`}>AED {budget.remaining.toLocaleString()}</TableCell>
                            <TableCell><div className="min-w-28 space-y-1"><Progress value={Math.min(budget.percentage, 100)} className={`h-1.5 ${budget.percentage >= budget.alertThreshold ? "[&>div]:bg-orange-500" : "[&>div]:bg-[#2B7A78]"}`} /><span className="text-xs">{budget.percentage}%</span></div></TableCell>
                            <TableCell>{budget.alertThreshold}%</TableCell>
                            <TableCell className={budget.alertThreshold - budget.percentage < 0 ? "font-medium text-red-600" : "font-medium text-green-600"}>{budget.alertThreshold - budget.percentage > 0 ? "+" : ""}{budget.alertThreshold - budget.percentage}%</TableCell>
                            <TableCell><Badge className={getStatusColor(budget.status)}>{budget.status}</Badge></TableCell>
                          </TableRow>
                        )) : <TableRow><TableCell colSpan={9} className="py-10 text-center text-muted-foreground">No utilization records match the selected filters.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  ) : (
                    <Table>
                      <TableHeader><TableRow><TableHead>Budget</TableHead><TableHead>Department</TableHead><TableHead>Branch</TableHead><TableHead>Cycle</TableHead><TableHead className="text-right">Allocated</TableHead><TableHead className="text-right">Actual</TableHead><TableHead className="text-right">Variance</TableHead><TableHead>Utilization</TableHead><TableHead>Status</TableHead><TableHead>Owner</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {reportBudgets.length > 0 ? reportBudgets.map((budget) => (
                          <TableRow key={budget.id}>
                            <TableCell><button className="text-left" onClick={() => setSelectedBudget(budget)}><span className="block font-medium">{budget.category}</span><span className="font-mono text-xs text-muted-foreground">{budget.id}</span></button></TableCell>
                            <TableCell>{budget.department}</TableCell><TableCell>{budget.branch}</TableCell><TableCell>{budget.budgetType}</TableCell>
                            <TableCell className="text-right font-medium">AED {budget.budgetAmount.toLocaleString()}</TableCell><TableCell className="text-right">AED {budget.spent.toLocaleString()}</TableCell>
                            <TableCell className={`text-right font-medium ${budget.remaining < 0 ? "text-red-600" : "text-green-600"}`}>AED {budget.remaining.toLocaleString()}</TableCell>
                            <TableCell><div className="min-w-24 space-y-1"><Progress value={Math.min(budget.percentage, 100)} className="h-1.5" /><span className="text-xs text-muted-foreground">{budget.percentage}%</span></div></TableCell>
                            <TableCell><Badge className={getStatusColor(budget.status)}>{budget.status}</Badge></TableCell><TableCell>{budget.responsiblePerson}</TableCell>
                          </TableRow>
                        )) : <TableRow><TableCell colSpan={10} className="py-10 text-center text-muted-foreground">No budget records match the selected report filters.</TableCell></TableRow>}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
                    <div>
                      <p className="font-semibold text-red-900">Exception Summary</p>
                      <p className="mt-1 text-sm text-red-700">
                        {reportBudgets.filter((budget) => budget.remaining < 0).length} budgets exceed allocation by a combined AED{" "}
                        {reportBudgets.filter((budget) => budget.remaining < 0).reduce((sum, budget) => sum + Math.abs(budget.remaining), 0).toLocaleString()}.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-[#2B7A78]/20 bg-[#DFF5F4] p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 h-5 w-5 text-[#2B7A78]" />
                    <div>
                      <p className="font-semibold text-[#1F5A52]">AI Report Commentary</p>
                      <p className="mt-1 text-sm text-[#1F5A52]/80">
                        {reportCommentary} Prioritize records above their configured threshold and review all unfavourable variances before the next approval cycle.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Intelligence Tab */}
        <TabsContent value="intelligence" className="space-y-6">
          <Card className="shadow-lg border-[#2B7A78]/20 bg-gradient-to-r from-purple-50 to-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                AI Budget Intelligence Engine
              </CardTitle>
              <CardDescription>
                Advanced AI-powered forecasting and optimization recommendations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Predictive Forecasting */}
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    Predictive Budget Forecasting
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                      <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-purple-900">Next Month Projection</p>
                        <p className="text-sm text-purple-700 mt-1">
                          "Projected electricity cost will exceed budget by 17% next month due to
                          seasonal usage."
                        </p>
                        <Button
                          size="sm"
                          className="mt-3 bg-purple-600 hover:bg-purple-700"
                          onClick={() => {
                            const electricityBudget = budgets.find((budget) => budget.category === "Electricity");
                            if (electricityBudget) openEditBudget(electricityBudget);
                          }}
                        >
                          Adjust Budget
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg">
                      <Zap className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-orange-900">Spike Detection</p>
                        <p className="text-sm text-orange-700 mt-1">
                          "Electricity bill spike caused by increased treadmill usage hours."
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                      <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium text-blue-900">Cost Optimization</p>
                        <p className="text-sm text-blue-700 mt-1">
                          "Protein shake ingredient waste is high — implement portion control to
                          save AED 350/month."
                        </p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3 border-blue-600 text-blue-600"
                          onClick={() => {
                            setBudgetSearch("F&B");
                            setActiveTab("budgets");
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cost Optimization Suggestions */}
                <div className="bg-white rounded-lg p-6 shadow-md">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Cost Optimization Opportunities
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-green-900">Bulk Purchase Savings</p>
                          <p className="text-sm text-green-700 mt-1">
                            "Buying protein shake ingredients in bulk saves 12%."
                          </p>
                          <p className="text-lg font-bold text-green-800 mt-2">Save AED 650/mo</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Users className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-900">Scheduling Efficiency</p>
                          <p className="text-sm text-blue-700 mt-1">
                            "Trainer scheduling inefficiency increasing OT — optimize shifts."
                          </p>
                          <p className="text-lg font-bold text-blue-800 mt-2">Save AED 890/mo</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <ShoppingBag className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-yellow-900">Vendor Switch</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            "Supplier B is 6% cheaper for cleaning supplies."
                          </p>
                          <p className="text-lg font-bold text-yellow-800 mt-2">Save AED 240/mo</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Package className="h-5 w-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-purple-900">Wastage Reduction</p>
                          <p className="text-sm text-purple-700 mt-1">
                            "Reduce F&B stock by 12% — wastage detected."
                          </p>
                          <p className="text-lg font-bold text-purple-800 mt-2">Save AED 420/mo</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Governance Tab */}
        <TabsContent value="governance" className="space-y-6">
          <Card className="shadow-lg border-[#2B7A78]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-[#2B7A78]" />
                Budget Governance Dashboard
              </CardTitle>
              <CardDescription>Control center for budget policies and rules</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Budget Health Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-green-700">Healthy Budgets</p>
                          <p className="text-3xl font-bold text-green-900">5</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-yellow-700">Pending Approvals</p>
                          <p className="text-3xl font-bold text-yellow-900">
                            {pendingApprovals.length}
                          </p>
                        </div>
                        <Clock className="h-8 w-8 text-yellow-600" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-red-700">Overspent Categories</p>
                          <p className="text-3xl font-bold text-red-900">3</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-red-600" />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Budget Rules Engine */}
                <div className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
                  <h3 className="font-semibold text-lg mb-4">Budget Rule Engine</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">Rule #1: Utilities Budget Cap</p>
                          <p className="text-sm text-gray-600">
                            Electricity cannot exceed 30% of total utilities budget
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium">Rule #2: F&B Purchase Review</p>
                          <p className="text-sm text-gray-600">
                            F&B purchase must be reviewed if &gt; AED 2,000 per week
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-green-100 text-green-800">Active</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600" />
                        <div>
                          <p className="font-medium">Rule #3: Marketing Spend Limit</p>
                          <p className="text-sm text-gray-600">
                            Marketing expenses require approval above AED 5,000
                          </p>
                        </div>
                      </div>
                      <Badge className="bg-yellow-100 text-yellow-800">Pending Setup</Badge>
                    </div>
                  </div>
                  <Button className="mt-4 bg-[#2B7A78] hover:bg-[#1a4d4b]" onClick={() => toast.success("New governance rule draft created")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Rule
                  </Button>
                </div>

                {/* Monthly Review Summary */}
                <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
                  <h3 className="font-semibold text-lg mb-4 text-blue-900">
                    Monthly Budget Review Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-700 mb-2">Review Period</p>
                      <p className="text-lg font-semibold text-blue-900">November 2024</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 mb-2">Next Review Date</p>
                      <p className="text-lg font-semibold text-blue-900">December 1, 2024</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 mb-2">Reviewed By</p>
                      <p className="text-lg font-semibold text-blue-900">Finance Manager</p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-700 mb-2">Action Items</p>
                      <p className="text-lg font-semibold text-blue-900">
                        3 pending adjustments
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" className="mt-4 border-blue-600 text-blue-600" onClick={generateReviewReport}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Review Report
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
