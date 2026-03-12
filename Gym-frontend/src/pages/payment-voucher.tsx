import React, { useState, useMemo, useCallback } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { toast } from "sonner";
import {
  CalendarIcon,
  Plus,
  Search,
  Filter,
  Download,
  FileText,
  Printer,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Building2,
  CreditCard,
  Banknote,
  Wallet,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Calendar as CalendarBig,
  Users,
  Receipt
} from "lucide-react";
import { cn } from "../components/ui/utils";

interface PaymentVoucher {
  id: string;
  voucherNo: string;
  supplierName: string;
  supplierType: "Supplier" | "Vendor" | "Employee";
  billNo?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: "Cash" | "Bank Transfer" | "Cheque" | "Digital Wallet";
  status: "Paid" | "Pending" | "Overdue" | "Partial";
  description: string;
  createdBy: string;
  createdAt: string;
  bills?: BillEntry[];
  paymentHistory?: PaymentHistory[];
  bankAccount?: string;
  chequeNo?: string;
  chequeDate?: string;
  notes?: string;
}

interface BillEntry {
  id: string;
  billNo: string;
  billDate: string;
  originalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  dueDate: string;
  status: "Paid" | "Pending" | "Overdue" | "Partial";
}

interface PaymentHistory {
  id: string;
  date: string;
  amount: number;
  method: string;
  reference: string;
  createdBy: string;
}

// Sample data
const samplePaymentVouchers: PaymentVoucher[] = [
  {
    id: "PV001",
    voucherNo: "PV-2025-0001",
    supplierName: "FitEquip Solutions",
    supplierType: "Supplier",
    billNo: "INV-FE-2025-001",
    paymentDate: "2025-01-28",
    amount: 7500.00,
    paymentMethod: "Bank Transfer",
    status: "Paid",
    description: "Payment for gym equipment purchase",
    createdBy: "John Admin",
    createdAt: "2025-01-28T10:30:00Z",
    bankAccount: "Emirates NBD Current",
    bills: [
      {
        id: "BILL001",
        billNo: "INV-FE-2025-001",
        billDate: "2025-01-15",
        originalAmount: 12500.00,
        paidAmount: 7500.00,
        remainingBalance: 5000.00,
        dueDate: "2025-02-14",
        status: "Partial"
      }
    ],
    paymentHistory: [
      {
        id: "PAY001",
        date: "2025-01-28",
        amount: 7500.00,
        method: "Bank Transfer",
        reference: "PV-2025-0001",
        createdBy: "John Admin"
      }
    ]
  },
  {
    id: "PV002",
    voucherNo: "PV-2025-0002",
    supplierName: "ProNutrition Wholesale",
    supplierType: "Supplier",
    billNo: "INV-PN-2025-045",
    paymentDate: "2025-01-29",
    amount: 8750.25,
    paymentMethod: "Cheque",
    status: "Pending",
    description: "Supplement inventory payment",
    createdBy: "Sarah Manager",
    createdAt: "2025-01-29T14:20:00Z",
    chequeNo: "CHQ-001234",
    chequeDate: "2025-01-30",
    bills: [
      {
        id: "BILL002",
        billNo: "INV-PN-2025-045",
        billDate: "2025-01-20",
        originalAmount: 8750.25,
        paidAmount: 0,
        remainingBalance: 8750.25,
        dueDate: "2025-02-19",
        status: "Pending"
      }
    ]
  },
  {
    id: "PV003",
    voucherNo: "PV-2025-0003",
    supplierName: "Emirates Maintenance Co.",
    supplierType: "Vendor",
    billNo: "SRV-EM-2025-012",
    paymentDate: "2025-01-25",
    amount: 2340.00,
    paymentMethod: "Cash",
    status: "Overdue",
    description: "Monthly maintenance service",
    createdBy: "Mike Finance",
    createdAt: "2025-01-25T09:15:00Z",
    bills: [
      {
        id: "BILL003",
        billNo: "SRV-EM-2025-012",
        billDate: "2025-01-25",
        originalAmount: 2340.00,
        paidAmount: 0,
        remainingBalance: 2340.00,
        dueDate: "2025-01-25",
        status: "Overdue"
      }
    ]
  },
  {
    id: "PV004",
    voucherNo: "PV-2025-0004",
    supplierName: "CleanPro Services",
    supplierType: "Vendor",
    billNo: "CLN-CP-2025-008",
    paymentDate: "2025-01-30",
    amount: 1850.75,
    paymentMethod: "Digital Wallet",
    status: "Paid",
    description: "Cleaning services for January",
    createdBy: "Lisa Admin",
    createdAt: "2025-01-30T16:45:00Z",
    bills: [
      {
        id: "BILL004",
        billNo: "CLN-CP-2025-008",
        billDate: "2025-01-30",
        originalAmount: 1850.75,
        paidAmount: 1850.75,
        remainingBalance: 0,
        dueDate: "2025-02-28",
        status: "Paid"
      }
    ]
  },
  {
    id: "PV005",
    voucherNo: "PV-2025-0005",
    supplierName: "Ahmed Khan",
    supplierType: "Employee",
    paymentDate: "2025-01-31",
    amount: 500.00,
    paymentMethod: "Bank Transfer",
    status: "Paid",
    description: "Travel expense reimbursement",
    createdBy: "HR Manager",
    createdAt: "2025-01-31T11:00:00Z",
    bankAccount: "FAB Operational Account"
  }
];

export function PaymentVoucher() {
  // State management
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDateRange, setSelectedDateRange] = useState<{from?: Date; to?: Date}>({});
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("paymentDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedVoucher, setSelectedVoucher] = useState<PaymentVoucher | null>(null);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Quick summary calculations
  const summaryData = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const thisMonthVouchers = samplePaymentVouchers.filter(voucher => {
      const voucherDate = new Date(voucher.paymentDate);
      return voucherDate.getMonth() === currentMonth && voucherDate.getFullYear() === currentYear;
    });
    
    const totalPaidThisMonth = thisMonthVouchers
      .filter(v => v.status === "Paid")
      .reduce((sum, v) => sum + v.amount, 0);
    
    const totalPending = samplePaymentVouchers
      .filter(v => v.status === "Pending" || v.status === "Partial")
      .reduce((sum, v) => sum + v.amount, 0);
    
    const overdueCount = samplePaymentVouchers
      .filter(v => v.status === "Overdue").length;
    
    const upcomingPayments = samplePaymentVouchers
      .filter(v => {
        const paymentDate = new Date(v.paymentDate);
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        return paymentDate <= nextWeek && v.status === "Pending";
      }).length;

    return {
      totalPaidThisMonth,
      totalPending,
      overdueCount,
      upcomingPayments
    };
  }, []);

  // Filter and sort data
  const filteredAndSortedVouchers = useMemo(() => {
    let filtered = samplePaymentVouchers.filter(voucher => {
      // Category filter
      if (selectedCategory !== "all") {
        if (selectedCategory === "pending" && voucher.status !== "Pending" && voucher.status !== "Partial") return false;
        if (selectedCategory === "paid" && voucher.status !== "Paid") return false;
        if (selectedCategory === "overdue" && voucher.status !== "Overdue") return false;
        if (selectedCategory === "supplier" && voucher.supplierType !== "Supplier") return false;
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !voucher.voucherNo.toLowerCase().includes(query) &&
          !voucher.supplierName.toLowerCase().includes(query) &&
          !voucher.billNo?.toLowerCase().includes(query) &&
          !voucher.description.toLowerCase().includes(query)
        ) return false;
      }

      // Status filter
      if (selectedStatus !== "all" && voucher.status.toLowerCase() !== selectedStatus) return false;

      // Payment method filter
      if (selectedPaymentMethod !== "all" && voucher.paymentMethod.toLowerCase().replace(" ", "-") !== selectedPaymentMethod) return false;

      // Date range filter
      if (selectedDateRange.from || selectedDateRange.to) {
        const voucherDate = new Date(voucher.paymentDate);
        if (selectedDateRange.from && voucherDate < selectedDateRange.from) return false;
        if (selectedDateRange.to && voucherDate > selectedDateRange.to) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof PaymentVoucher];
      let bVal: any = b[sortField as keyof PaymentVoucher];

      if (sortField === "amount") {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else if (sortField === "paymentDate") {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      } else {
        aVal = String(aVal).toLowerCase();
        bVal = String(bVal).toLowerCase();
      }

      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [selectedCategory, searchQuery, selectedStatus, selectedPaymentMethod, selectedDateRange, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedVouchers.length / itemsPerPage);
  const paginatedVouchers = filteredAndSortedVouchers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Handlers
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleViewDetails = (voucher: PaymentVoucher) => {
    setSelectedVoucher(voucher);
    setIsDetailsOpen(true);
  };

  const handleExport = () => {
    toast.success("Exporting payment vouchers...");
    // Export logic here
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "Paid": { className: "bg-gymbios-success text-white", icon: CheckCircle },
      "Pending": { className: "bg-gymbios-warning text-white", icon: Clock },
      "Overdue": { className: "bg-gymbios-error text-white", icon: AlertTriangle },
      "Partial": { className: "bg-orange-500 text-white", icon: Clock }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge className={cn("flex items-center space-x-1", config.className)}>
        <Icon className="h-3 w-3" />
        <span>{status}</span>
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons = {
      "Cash": Banknote,
      "Bank Transfer": Building2,
      "Cheque": FileText,
      "Digital Wallet": Wallet
    };
    return icons[method as keyof typeof icons] || CreditCard;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gymbios-heading">Payment Voucher / Ledger Management</h1>
              <p className="text-muted-foreground">Manage and track all payment vouchers, supplier ledgers, and financial transactions</p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowAdvancedFilter(!showAdvancedFilter)}
                className="btn-secondary"
              >
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filter
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="btn-secondary">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExport}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button className="btn-primary">
                <Plus className="h-4 w-4 mr-2" />
                New Payment
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by voucher number, supplier, bill number, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-focus"
              />
            </div>
            
            <div className="flex space-x-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32 input-focus">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger className="w-40 input-focus">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="digital-wallet">Digital Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filter */}
          {showAdvancedFilter && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="form-label">Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left input-focus">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDateRange.from ? (
                          selectedDateRange.to ? (
                            `${selectedDateRange.from.toLocaleDateString()} - ${selectedDateRange.to.toLocaleDateString()}`
                          ) : (
                            selectedDateRange.from.toLocaleDateString()
                          )
                        ) : (
                          "Pick date range"
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={selectedDateRange}
                        onSelect={(range) => setSelectedDateRange(range || {})}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="form-label">Amount Range</Label>
                  <div className="flex space-x-2">
                    <Input placeholder="Min" className="input-focus" />
                    <Input placeholder="Max" className="input-focus" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="form-label">Created By</Label>
                  <Select>
                    <SelectTrigger className="input-focus">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      <SelectItem value="john">John Admin</SelectItem>
                      <SelectItem value="sarah">Sarah Manager</SelectItem>
                      <SelectItem value="mike">Mike Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => {
                  setSearchQuery("");
                  setSelectedDateRange({});
                  setSelectedStatus("all");
                  setSelectedPaymentMethod("all");
                }}>
                  Clear Filters
                </Button>
                <Button className="btn-primary">Apply Filters</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Left Panel - Categories & Summary */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Ledger Categories */}
            <Card>
              <CardHeader>
                <CardTitle className="text-gymbios-primary">Ledger Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { id: "all", label: "All Payments", icon: Receipt, count: samplePaymentVouchers.length },
                  { id: "pending", label: "Pending Payments", icon: Clock, count: samplePaymentVouchers.filter(v => v.status === "Pending" || v.status === "Partial").length },
                  { id: "paid", label: "Paid", icon: CheckCircle, count: samplePaymentVouchers.filter(v => v.status === "Paid").length },
                  { id: "overdue", label: "Overdue", icon: AlertTriangle, count: samplePaymentVouchers.filter(v => v.status === "Overdue").length },
                  { id: "supplier", label: "Supplier-wise Ledger", icon: Building2, count: samplePaymentVouchers.filter(v => v.supplierType === "Supplier").length }
                ].map((category) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start",
                        selectedCategory === category.id ? "btn-primary" : "hover:bg-muted"
                      )}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      <span className="flex-1 text-left">{category.label}</span>
                      <Badge variant="secondary" className="ml-2">{category.count}</Badge>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            {/* Quick Summary Tiles */}
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gymbios-success/10 p-3 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-gymbios-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Paid This Month</p>
                      <p className="font-bold text-lg">AED {summaryData.totalPaidThisMonth.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gymbios-warning/10 p-3 rounded-lg">
                      <Clock className="h-5 w-5 text-gymbios-warning" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Pending</p>
                      <p className="font-bold text-lg">AED {summaryData.totalPending.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gymbios-error/10 p-3 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-gymbios-error" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Overdue Payments</p>
                      <p className="font-bold text-lg">{summaryData.overdueCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <CalendarBig className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Upcoming (7 days)</p>
                      <p className="font-bold text-lg">{summaryData.upcomingPayments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content - Table */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gymbios-primary">
                    Payment Vouchers ({filteredAndSortedVouchers.length})
                  </CardTitle>
                  
                  <div className="flex items-center space-x-2">
                    <Label className="text-sm text-muted-foreground">Show:</Label>
                    <Select value={itemsPerPage.toString()} onValueChange={(value) => setItemsPerPage(parseInt(value))}>
                      <SelectTrigger className="w-20 input-focus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead 
                          className="table-header cursor-pointer hover:bg-muted" 
                          onClick={() => handleSort("voucherNo")}
                        >
                          <div className="flex items-center space-x-2">
                            <span>Voucher No</span>
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="table-header cursor-pointer hover:bg-muted"
                          onClick={() => handleSort("supplierName")}
                        >
                          <div className="flex items-center space-x-2">
                            <span>Supplier/Vendor</span>
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead className="table-header">Bill No</TableHead>
                        <TableHead 
                          className="table-header cursor-pointer hover:bg-muted"
                          onClick={() => handleSort("paymentDate")}
                        >
                          <div className="flex items-center space-x-2">
                            <span>Payment Date</span>
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="table-header text-right cursor-pointer hover:bg-muted"
                          onClick={() => handleSort("amount")}
                        >
                          <div className="flex items-center justify-end space-x-2">
                            <span>Amount</span>
                            <ArrowUpDown className="h-4 w-4" />
                          </div>
                        </TableHead>
                        <TableHead className="table-header">Payment Method</TableHead>
                        <TableHead className="table-header">Status</TableHead>
                        <TableHead className="table-header">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedVouchers.map((voucher) => {
                        const PaymentIcon = getPaymentMethodIcon(voucher.paymentMethod);
                        return (
                          <TableRow 
                            key={voucher.id} 
                            className="hover:bg-muted/30 cursor-pointer"
                            onClick={() => handleViewDetails(voucher)}
                          >
                            <TableCell className="font-medium">
                              <Button variant="link" className="p-0 h-auto font-medium text-gymbios-primary">
                                {voucher.voucherNo}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="bg-muted p-2 rounded">
                                  <Users className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-medium">{voucher.supplierName}</p>
                                  <p className="text-sm text-muted-foreground">{voucher.supplierType}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {voucher.billNo ? (
                                <Button variant="link" className="p-0 h-auto text-gymbios-secondary">
                                  {voucher.billNo}
                                </Button>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(voucher.paymentDate).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold">
                              AED {voucher.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">{voucher.paymentMethod}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(voucher.status)}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDetails(voucher);
                                  }}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                    <Printer className="h-4 w-4 mr-2" />
                                    Print PDF
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm text-muted-foreground">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                      {Math.min(currentPage * itemsPerPage, filteredAndSortedVouchers.length)} of{' '}
                      {filteredAndSortedVouchers.length} results
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={currentPage === page ? "btn-primary" : ""}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Right Panel - Details Drawer */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:w-[600px] overflow-y-auto">
          {selectedVoucher && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center justify-between">
                  <div>
                    <span className="text-gymbios-primary">{selectedVoucher.voucherNo}</span>
                    <span className="text-muted-foreground ml-2">• {selectedVoucher.supplierName}</span>
                  </div>
                  {getStatusBadge(selectedVoucher.status)}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Voucher Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Voucher Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="form-label">Payment Date</Label>
                        <p className="font-medium">{new Date(selectedVoucher.paymentDate).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <Label className="form-label">Amount</Label>
                        <p className="font-bold text-lg text-gymbios-primary">AED {selectedVoucher.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="form-label">Payment Method</Label>
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const Icon = getPaymentMethodIcon(selectedVoucher.paymentMethod);
                            return <Icon className="h-4 w-4" />;
                          })()}
                          <span>{selectedVoucher.paymentMethod}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="form-label">Created By</Label>
                        <p>{selectedVoucher.createdBy}</p>
                      </div>
                    </div>
                    
                    {selectedVoucher.bankAccount && (
                      <div>
                        <Label className="form-label">Bank Account</Label>
                        <p>{selectedVoucher.bankAccount}</p>
                      </div>
                    )}
                    
                    {selectedVoucher.chequeNo && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="form-label">Cheque Number</Label>
                          <p>{selectedVoucher.chequeNo}</p>
                        </div>
                        <div>
                          <Label className="form-label">Cheque Date</Label>
                          <p>{selectedVoucher.chequeDate ? new Date(selectedVoucher.chequeDate).toLocaleDateString() : '-'}</p>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <Label className="form-label">Description</Label>
                      <p>{selectedVoucher.description}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Bill Breakdown */}
                {selectedVoucher.bills && selectedVoucher.bills.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Bill Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedVoucher.bills.map((bill) => (
                          <div key={bill.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-medium text-gymbios-primary">{bill.billNo}</p>
                                <p className="text-sm text-muted-foreground">
                                  Due: {new Date(bill.dueDate).toLocaleDateString()}
                                </p>
                              </div>
                              {getStatusBadge(bill.status)}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <Label className="text-xs text-muted-foreground">Original Amount</Label>
                                <p className="font-medium">AED {bill.originalAmount.toFixed(2)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Paid Amount</Label>
                                <p className="font-medium text-gymbios-success">AED {bill.paidAmount.toFixed(2)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Remaining</Label>
                                <p className="font-medium text-gymbios-warning">AED {bill.remainingBalance.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Payment History */}
                {selectedVoucher.paymentHistory && selectedVoucher.paymentHistory.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Payment History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {selectedVoucher.paymentHistory.map((payment) => (
                          <div key={payment.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium">{payment.reference}</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(payment.date).toLocaleDateString()} • {payment.method} • by {payment.createdBy}
                              </p>
                            </div>
                            <p className="font-bold">AED {payment.amount.toFixed(2)}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex flex-col space-y-3">
                  <Button className="btn-primary w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="btn-secondary">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Voucher
                    </Button>
                    <Button variant="outline" className="btn-secondary">
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                  </div>
                  
                  <Button variant="outline" className="btn-secondary">
                    <Printer className="h-4 w-4 mr-2" />
                    Print Voucher
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Footer Summary */}
      <div className="border-t bg-card mt-6">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Paid</p>
                <p className="font-bold text-gymbios-success">
                  AED {samplePaymentVouchers.filter(v => v.status === "Paid").reduce((sum, v) => sum + v.amount, 0).toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="font-bold text-gymbios-warning">
                  AED {summaryData.totalPending.toFixed(2)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="font-bold text-gymbios-primary">
                  AED {samplePaymentVouchers.reduce((sum, v) => sum + v.amount, 0).toFixed(2)}
                </p>
              </div>
            </div>
            
            <p className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

