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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Separator } from "../components/ui/separator";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import {
  CalendarIcon,
  Search,
  Download,
  FileText,
  Printer,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Filter,
  RefreshCcw,
  Landmark,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  Calculator,
  Zap,
  SplitSquareHorizontal,
  Plus,
  Minus,
  DollarSign,
  ExternalLink,
  Archive
} from "lucide-react";
import { cn } from "../components/ui/utils";
import exampleImage from 'figma:asset/3e2ee368daae11dc50719d7a210c270ea8102954.png';

interface BankTransaction {
  id: string;
  date: string;
  description: string;
  reference: string;
  bankAmount: number;
  ledgerAmount: number;
  status: "Matched" | "Unmatched" | "Pending" | "Partial";
  category: string;
  bankReference?: string;
  ledgerReference?: string;
  notes?: string;
  matchedBy?: string;
  matchedDate?: string;
  type: "Credit" | "Debit";
}

interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bank: string;
  currentBalance: number;
  ledgerBalance: number;
  lastReconciled: string;
}

interface ReconciliationSummary {
  totalBankAmount: number;
  totalLedgerAmount: number;
  difference: number;
  matchedTransactions: number;
  unmatchedTransactions: number;
  pendingTransactions: number;
}

// Sample bank accounts
const sampleBankAccounts: BankAccount[] = [
  {
    id: "BANK001",
    name: "Emirates NBD Current",
    accountNumber: "****-****-4521",
    bank: "Emirates NBD",
    currentBalance: 5000.00,
    ledgerBalance: 4800.00,
    lastReconciled: "2025-01-25"
  },
  {
    id: "BANK002", 
    name: "ADCB Business Account",
    accountNumber: "****-****-8967",
    bank: "ADCB",
    currentBalance: 12500.75,
    ledgerBalance: 12500.75,
    lastReconciled: "2025-01-28"
  },
  {
    id: "BANK003",
    name: "FAB Operational Account", 
    accountNumber: "****-****-1234",
    bank: "FAB",
    currentBalance: 8750.50,
    ledgerBalance: 8650.50,
    lastReconciled: "2025-01-20"
  }
];

// Sample transaction data
const sampleTransactions: BankTransaction[] = [
  {
    id: "TXN001",
    date: "2025-09-29",
    description: "Membership Payment",
    reference: "INV-1234",
    bankAmount: 500.00,
    ledgerAmount: 500.00,
    status: "Matched",
    category: "Revenue",
    bankReference: "TXN-BANK-001",
    ledgerReference: "LED-001",
    type: "Credit",
    matchedBy: "John Admin",
    matchedDate: "2025-09-29"
  },
  {
    id: "TXN002",
    date: "2025-09-28", 
    description: "Equipment Purchase",
    reference: "PAY-567",
    bankAmount: 200.00,
    ledgerAmount: 200.00,
    status: "Matched",
    category: "Equipment",
    bankReference: "TXN-BANK-002",
    ledgerReference: "LED-002",
    type: "Debit",
    matchedBy: "Sarah Manager",
    matchedDate: "2025-09-28"
  },
  {
    id: "TXN003",
    date: "2025-09-27",
    description: "Refund",
    reference: "REF-890",
    bankAmount: 100.00,
    ledgerAmount: 0,
    status: "Unmatched",
    category: "Refunds",
    bankReference: "TXN-BANK-003",
    type: "Debit",
    notes: "Bank refund processed, no corresponding ledger entry found"
  },
  {
    id: "TXN004",
    date: "2025-09-27",
    description: "Gym Rental",
    reference: "EXP-234",
    bankAmount: 300.00,
    ledgerAmount: 300.00,
    status: "Matched",
    category: "Expenses",
    bankReference: "TXN-BANK-004",
    ledgerReference: "LED-004",
    type: "Debit",
    matchedBy: "Mike Finance",
    matchedDate: "2025-09-27"
  },
  {
    id: "TXN005",
    date: "2025-09-26",
    description: "Supplement Sales",
    reference: "SAL-156",
    bankAmount: 0,
    ledgerAmount: 150.00,
    status: "Unmatched",
    category: "Revenue",
    ledgerReference: "LED-005",
    type: "Credit",
    notes: "Ledger entry exists but bank transaction not found"
  },
  {
    id: "TXN006",
    date: "2025-09-25",
    description: "Partial Payment - PT Sessions",
    reference: "PAR-789",
    bankAmount: 250.00,
    ledgerAmount: 300.00,
    status: "Partial",
    category: "Services",
    bankReference: "TXN-BANK-006",
    ledgerReference: "LED-006",
    type: "Credit",
    notes: "Partial payment received, balance pending"
  },
  {
    id: "TXN007",
    date: "2025-09-24",
    description: "Utility Bill Payment",
    reference: "UTL-445",
    bankAmount: 180.00,
    ledgerAmount: 180.00,
    status: "Pending",
    category: "Utilities",
    bankReference: "TXN-BANK-007",
    ledgerReference: "LED-007",
    type: "Debit",
    notes: "Awaiting final confirmation"
  }
];

export function BankReconciliation() {
  // State management
  const [selectedAccount, setSelectedAccount] = useState<BankAccount>(sampleBankAccounts[0]);
  const [dateFilter, setDateFilter] = useState<string>("today");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [customDateRange, setCustomDateRange] = useState<{from?: Date; to?: Date}>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [newNote, setNewNote] = useState<string>("");

  // Filter and sort transactions
  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = sampleTransactions.filter(transaction => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !transaction.description.toLowerCase().includes(query) &&
          !transaction.reference.toLowerCase().includes(query) &&
          !transaction.bankReference?.toLowerCase().includes(query) &&
          !transaction.ledgerReference?.toLowerCase().includes(query)
        ) return false;
      }

      // Status filter
      if (statusFilter !== "all" && transaction.status.toLowerCase() !== statusFilter) return false;

      // Date filter
      const transactionDate = new Date(transaction.date);
      const today = new Date();
      
      if (dateFilter === "today") {
        if (transactionDate.toDateString() !== today.toDateString()) return false;
      } else if (dateFilter === "last7days") {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        if (transactionDate < sevenDaysAgo) return false;
      } else if (dateFilter === "custom" && (customDateRange.from || customDateRange.to)) {
        if (customDateRange.from && transactionDate < customDateRange.from) return false;
        if (customDateRange.to && transactionDate > customDateRange.to) return false;
      }

      return true;
    });

    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof BankTransaction];
      let bVal: any = b[sortField as keyof BankTransaction];

      if (sortField === "bankAmount" || sortField === "ledgerAmount") {
        aVal = Number(aVal);
        bVal = Number(bVal);
      } else if (sortField === "date") {
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
  }, [searchQuery, statusFilter, dateFilter, customDateRange, sortField, sortDirection]);

  // Calculate reconciliation summary
  const reconciliationSummary = useMemo((): ReconciliationSummary => {
    return filteredAndSortedTransactions.reduce((summary, transaction) => ({
      totalBankAmount: summary.totalBankAmount + transaction.bankAmount,
      totalLedgerAmount: summary.totalLedgerAmount + transaction.ledgerAmount,
      difference: (summary.totalBankAmount + transaction.bankAmount) - (summary.totalLedgerAmount + transaction.ledgerAmount),
      matchedTransactions: summary.matchedTransactions + (transaction.status === "Matched" ? 1 : 0),
      unmatchedTransactions: summary.unmatchedTransactions + (transaction.status === "Unmatched" ? 1 : 0),
      pendingTransactions: summary.pendingTransactions + (transaction.status === "Pending" || transaction.status === "Partial" ? 1 : 0)
    }), {
      totalBankAmount: 0,
      totalLedgerAmount: 0,
      difference: 0,
      matchedTransactions: 0,
      unmatchedTransactions: 0,
      pendingTransactions: 0
    });
  }, [filteredAndSortedTransactions]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredAndSortedTransactions.slice(
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

  const handleViewTransaction = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setIsDetailsOpen(true);
  };

  const handleMatchTransaction = (transactionId: string) => {
    toast.success("Transaction matched successfully");
    console.log("Matching transaction:", transactionId);
  };

  const handleIgnoreTransaction = (transactionId: string) => {
    toast.info("Transaction marked as ignored");
    console.log("Ignoring transaction:", transactionId);
  };

  const handleAutoMatch = () => {
    toast.success("Auto-matching completed - 3 transactions matched");
    console.log("Running auto-match algorithm");
  };

  const handleExport = (format: string) => {
    toast.success(`Exporting reconciliation as ${format.toUpperCase()}`);
    console.log("Exporting as:", format);
  };

  const handleFinalizeReconciliation = () => {
    if (Math.abs(reconciliationSummary.difference) > 0.01) {
      toast.error("Cannot finalize - differences exist that need to be resolved");
      return;
    }
    toast.success("Reconciliation finalized successfully");
    console.log("Finalizing reconciliation");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      "Matched": { className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      "Unmatched": { className: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
      "Pending": { className: "bg-orange-100 text-orange-800 border-orange-200", icon: Clock },
      "Partial": { className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <Badge className={cn("flex items-center space-x-1.5 px-2.5 py-1 border font-medium", config.className)}>
        <Icon className="h-3 w-3" />
        <span className="text-xs">{status}</span>
      </Badge>
    );
  };

  const getAmountDisplay = (amount: number, type: "Credit" | "Debit") => {
    const isCredit = type === "Credit";
    return (
      <div className={cn("font-mono font-bold", isCredit ? "text-gymbios-success" : "text-gymbios-error")}>
        {isCredit ? "+" : "-"}AED {Math.abs(amount).toFixed(2)}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gymbios-main-bg">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gymbios-primary">Bank Reconciliation</h1>
              <p className="text-gymbios-body">Match bank statements with accounting ledger entries for accurate financial records</p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleAutoMatch}
                className="bg-gymbios-secondary hover:bg-gymbios-secondary/90 text-white"
              >
                <Zap className="h-4 w-4 mr-2" />
                Auto-Match Suggestion
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-gymbios-primary text-gymbios-primary hover:bg-gymbios-primary hover:text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("excel")}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gymbios-primary">Date Filter</Label>
              <div className="flex items-center space-x-2">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="flex-1 border-gray-300 focus:border-gymbios-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {dateFilter === "custom" && (
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="border-gray-300 hover:border-gymbios-primary">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={customDateRange}
                        onSelect={(range) => setCustomDateRange(range || {})}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            {/* Bank Account Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gymbios-primary">Bank Account</Label>
              <Select value={selectedAccount.id} onValueChange={(value) => {
                const account = sampleBankAccounts.find(acc => acc.id === value);
                if (account) setSelectedAccount(account);
              }}>
                <SelectTrigger className="border-gray-300 focus:border-gymbios-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sampleBankAccounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} • {account.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gymbios-primary">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-gray-300 focus:border-gymbios-primary"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gymbios-primary">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-gray-300 focus:border-gymbios-primary">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Top Summary Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Bank Balance */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <Landmark className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">Bank Balance</p>
                  <p className="text-xl font-bold text-gray-900">AED {selectedAccount.currentBalance.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Actual balance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ledger Balance */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-green-50 p-3 rounded-lg">
                  <Calculator className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">Ledger Balance</p>
                  <p className="text-xl font-bold text-gray-900">AED {selectedAccount.ledgerBalance.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Accounting records</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Difference */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className={cn(
                  "p-3 rounded-lg",
                  Math.abs(selectedAccount.currentBalance - selectedAccount.ledgerBalance) < 0.01 
                    ? "bg-green-50" 
                    : "bg-red-50"
                )}>
                  {Math.abs(selectedAccount.currentBalance - selectedAccount.ledgerBalance) < 0.01 ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">Difference</p>
                  <p className={cn(
                    "text-xl font-bold",
                    Math.abs(selectedAccount.currentBalance - selectedAccount.ledgerBalance) < 0.01 
                      ? "text-green-600" 
                      : "text-red-600"
                  )}>
                    {Math.abs(selectedAccount.currentBalance - selectedAccount.ledgerBalance) < 0.01 
                      ? "Balanced ✓" 
                      : `AED ${Math.abs(selectedAccount.currentBalance - selectedAccount.ledgerBalance).toFixed(2)}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {Math.abs(selectedAccount.currentBalance - selectedAccount.ledgerBalance) < 0.01 
                      ? "No discrepancy" 
                      : "Requires attention"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Unmatched Transactions */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-50 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">Unmatched</p>
                  <p className="text-xl font-bold text-gray-900">{reconciliationSummary.unmatchedTransactions}</p>
                  <p className="text-xs text-gray-500">Transactions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto-Match Button */}
          <Card className="bg-gradient-to-r from-gymbios-secondary to-gymbios-secondary/80 shadow-sm border-0 cursor-pointer hover:shadow-md transition-shadow">
            <CardContent className="p-4 h-full flex items-center justify-center">
              <Button
                onClick={handleAutoMatch}
                className="w-full h-full bg-transparent hover:bg-white/10 text-white border-white/30 flex flex-col items-center justify-center space-y-1"
                variant="outline"
              >
                <Zap className="h-6 w-6" />
                <span className="text-sm font-medium">Auto-Match</span>
                <span className="text-xs opacity-90">Suggestions</span>
              </Button>
            </CardContent>
          </Card>
        </div>



        {/* Main Transaction Table */}
        <Card className="bg-white shadow-sm border border-gray-200">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-gymbios-primary font-semibold">
              Bank Reconciliation Transactions ({filteredAndSortedTransactions.length})
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Review and match bank statement entries with ledger records
            </p>
          </CardHeader>
          
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead 
                      className="font-semibold text-gymbios-primary cursor-pointer hover:bg-gray-100 px-6 py-4" 
                      onClick={() => handleSort("date")}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Date</span>
                        <ArrowUpDown className="h-4 w-4 opacity-60" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-gymbios-primary cursor-pointer hover:bg-gray-100 px-6 py-4"
                      onClick={() => handleSort("description")}
                    >
                      <div className="flex items-center space-x-2">
                        <span>Description</span>
                        <ArrowUpDown className="h-4 w-4 opacity-60" />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gymbios-primary px-6 py-4">Reference</TableHead>
                    <TableHead 
                      className="font-semibold text-gymbios-primary text-right cursor-pointer hover:bg-gray-100 px-6 py-4"
                      onClick={() => handleSort("bankAmount")}
                    >
                      <div className="flex items-center justify-end space-x-2">
                        <span>Bank Amount</span>
                        <ArrowUpDown className="h-4 w-4 opacity-60" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="font-semibold text-gymbios-primary text-right cursor-pointer hover:bg-gray-100 px-6 py-4"
                      onClick={() => handleSort("ledgerAmount")}
                    >
                      <div className="flex items-center justify-end space-x-2">
                        <span>Ledger Amount</span>
                        <ArrowUpDown className="h-4 w-4 opacity-60" />
                      </div>
                    </TableHead>
                    <TableHead className="font-semibold text-gymbios-primary px-6 py-4">Status</TableHead>
                    <TableHead className="font-semibold text-gymbios-primary px-6 py-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((transaction, index) => (
                    <TableRow 
                      key={transaction.id} 
                      className={cn(
                        "hover:bg-blue-50/30 cursor-pointer transition-colors border-b border-gray-100",
                        index % 2 === 0 ? "bg-white" : "bg-gray-50/30",
                        transaction.status === "Unmatched" && "bg-red-50 hover:bg-red-100/50",
                        transaction.status === "Partial" && "bg-orange-50 hover:bg-orange-100/50"
                      )}
                      onClick={() => handleViewTransaction(transaction)}
                    >
                      <TableCell className="px-6 py-4 font-medium text-gray-900">
                        {new Date(transaction.date).toLocaleDateString('en-AE', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">{transaction.description}</p>
                          <p className="text-sm text-gray-500">{transaction.category}</p>
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="text-sm font-mono font-medium text-gymbios-primary">{transaction.reference}</div>
                          {transaction.bankReference && (
                            <div className="text-xs text-gray-500">Bank: {transaction.bankReference}</div>
                          )}
                          {transaction.ledgerReference && (
                            <div className="text-xs text-gray-500">Ledger: {transaction.ledgerReference}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {transaction.bankAmount > 0 ? (
                          <div className={cn(
                            "font-mono font-bold",
                            transaction.type === "Credit" ? "text-green-600" : "text-red-600"
                          )}>
                            {transaction.type === "Credit" ? "+" : "-"}AED {Math.abs(transaction.bankAmount).toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No entry</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4 text-right">
                        {transaction.ledgerAmount > 0 ? (
                          <div className={cn(
                            "font-mono font-bold",
                            transaction.type === "Credit" ? "text-green-600" : "text-red-600"
                          )}>
                            {transaction.type === "Credit" ? "+" : "-"}AED {Math.abs(transaction.ledgerAmount).toFixed(2)}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">No entry</span>
                        )}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        {getStatusBadge(transaction.status)}
                      </TableCell>
                      <TableCell className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {transaction.status === "Unmatched" && (
                            <>
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMatchTransaction(transaction.id);
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
                              >
                                Match
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleIgnoreTransaction(transaction.id);
                                }}
                                className="border-gray-300 text-gray-600 hover:bg-gray-50 px-3 py-1 text-xs"
                              >
                                Ignore
                              </Button>
                            </>
                          )}
                          
                          {transaction.status === "Matched" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleViewTransaction(transaction);
                              }}
                              className="border-blue-300 text-blue-600 hover:bg-blue-50 px-3 py-1 text-xs"
                            >
                              View / Edit
                            </Button>
                          )}
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100">
                                <MoreHorizontal className="h-4 w-4 text-gray-600" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={(e) => {
                                e.stopPropagation();
                                handleViewTransaction(transaction);
                              }}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {transaction.status === "Matched" && (
                                <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                  <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                                  Split Transaction
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add New Entry
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)} of{' '}
                  {filteredAndSortedTransactions.length} results
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

        {/* Bottom Reconciliation Summary */}
        <Card className="mt-6 bg-white shadow-sm border border-gray-200">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-gymbios-primary font-semibold">Reconciliation Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 font-medium mb-1">Total Bank Amount</p>
                <p className="text-2xl font-bold text-blue-900 font-mono">AED {reconciliationSummary.totalBankAmount.toFixed(2)}</p>
                <p className="text-xs text-blue-600 mt-1">Sum of bank transactions</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 font-medium mb-1">Total Ledger Amount</p>
                <p className="text-2xl font-bold text-green-900 font-mono">AED {reconciliationSummary.totalLedgerAmount.toFixed(2)}</p>
                <p className="text-xs text-green-600 mt-1">Sum of ledger entries</p>
              </div>
              <div className={cn(
                "text-center p-4 rounded-lg",
                Math.abs(reconciliationSummary.difference) < 0.01 ? "bg-green-50" : "bg-red-50"
              )}>
                <p className={cn(
                  "text-sm font-medium mb-1",
                  Math.abs(reconciliationSummary.difference) < 0.01 ? "text-green-700" : "text-red-700"
                )}>Difference</p>
                <p className={cn(
                  "text-2xl font-bold font-mono",
                  Math.abs(reconciliationSummary.difference) < 0.01 ? "text-green-900" : "text-red-900"
                )}>
                  {Math.abs(reconciliationSummary.difference) < 0.01 
                    ? "Balanced ✓" 
                    : `AED ${reconciliationSummary.difference.toFixed(2)}`}
                </p>
                <p className={cn(
                  "text-xs mt-1",
                  Math.abs(reconciliationSummary.difference) < 0.01 ? "text-green-600" : "text-red-600"
                )}>
                  {Math.abs(reconciliationSummary.difference) < 0.01 ? "Ready to finalize" : "Requires reconciliation"}
                </p>
              </div>
              <div className="text-center">
                <Button
                  onClick={handleFinalizeReconciliation}
                  disabled={Math.abs(reconciliationSummary.difference) > 0.01}
                  className={cn(
                    "w-full h-16 text-base font-medium",
                    Math.abs(reconciliationSummary.difference) < 0.01 
                      ? "bg-green-600 hover:bg-green-700 text-white" 
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {Math.abs(reconciliationSummary.difference) < 0.01 
                    ? "Finalize Reconciliation" 
                    : "Cannot Finalize - Differences Exist"}
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  {Math.abs(reconciliationSummary.difference) < 0.01 
                    ? "All transactions are balanced" 
                    : "Resolve discrepancies before finalizing"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Sidebar: Details / Quick Actions */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:w-[600px] overflow-y-auto bg-white">
          {selectedTransaction && (
            <>
              <SheetHeader className="border-b border-gray-200 pb-4">
                <SheetTitle className="flex items-center justify-between">
                  <div>
                    <span className="text-gymbios-primary font-bold">{selectedTransaction.reference}</span>
                    <p className="text-sm text-gray-600 mt-1">{selectedTransaction.description}</p>
                  </div>
                  {getStatusBadge(selectedTransaction.status)}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Transaction Details */}
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-200">
                    <CardTitle className="text-lg text-gymbios-primary">Transaction Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Date</Label>
                        <p className="text-base font-medium text-gray-900">
                          {new Date(selectedTransaction.date).toLocaleDateString('en-AE', { 
                            weekday: 'long',
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Category</Label>
                        <p className="text-base font-medium text-gray-900">{selectedTransaction.category}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Bank Amount</Label>
                        {selectedTransaction.bankAmount > 0 ? (
                          <div className={cn(
                            "text-lg font-bold font-mono",
                            selectedTransaction.type === "Credit" ? "text-green-600" : "text-red-600"
                          )}>
                            {selectedTransaction.type === "Credit" ? "+" : "-"}AED {Math.abs(selectedTransaction.bankAmount).toFixed(2)}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No bank entry</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-gray-700">Ledger Amount</Label>
                        {selectedTransaction.ledgerAmount > 0 ? (
                          <div className={cn(
                            "text-lg font-bold font-mono",
                            selectedTransaction.type === "Credit" ? "text-green-600" : "text-red-600"
                          )}>
                            {selectedTransaction.type === "Credit" ? "+" : "-"}AED {Math.abs(selectedTransaction.ledgerAmount).toFixed(2)}
                          </div>
                        ) : (
                          <p className="text-gray-500 italic">No ledger entry</p>
                        )}
                      </div>
                    </div>

                    <Separator />
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-gray-700">Description</Label>
                      <p className="text-base text-gray-900 bg-gray-50 p-3 rounded-md">{selectedTransaction.description}</p>
                    </div>
                    
                    {(selectedTransaction.bankReference || selectedTransaction.ledgerReference) && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-1 gap-4">
                          {selectedTransaction.bankReference && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Bank Reference</Label>
                              <p className="font-mono text-sm bg-blue-50 text-blue-800 p-2 rounded">{selectedTransaction.bankReference}</p>
                            </div>
                          )}
                          
                          {selectedTransaction.ledgerReference && (
                            <div className="space-y-2">
                              <Label className="text-sm font-medium text-gray-700">Ledger Reference</Label>
                              <p className="font-mono text-sm bg-green-50 text-green-800 p-2 rounded">{selectedTransaction.ledgerReference}</p>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {selectedTransaction.matchedBy && (
                      <>
                        <Separator />
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Matched By</Label>
                            <p className="text-base text-gray-900">{selectedTransaction.matchedBy}</p>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium text-gray-700">Matched Date</Label>
                            <p className="text-base text-gray-900">
                              {selectedTransaction.matchedDate ? new Date(selectedTransaction.matchedDate).toLocaleDateString() : '-'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Reconciliation Actions */}
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader className="bg-gymbios-secondary/10 border-b border-gray-200">
                    <CardTitle className="text-lg text-gymbios-primary">Quick Reconciliation</CardTitle>
                    <p className="text-sm text-gray-600">Perform reconciliation actions on this transaction</p>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {selectedTransaction.status === "Unmatched" && (
                      <>
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-medium">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Match with Ledger
                        </Button>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <Button variant="outline" className="border-gymbios-secondary text-gymbios-secondary hover:bg-gymbios-secondary hover:text-white h-10">
                            <SplitSquareHorizontal className="h-4 w-4 mr-2" />
                            Split Transaction
                          </Button>
                          
                          <Button variant="outline" className="border-gymbios-primary text-gymbios-primary hover:bg-gymbios-primary hover:text-white h-10">
                            <Plus className="h-4 w-4 mr-2" />
                            Add New Entry
                          </Button>
                        </div>
                      </>
                    )}
                    
                    {selectedTransaction.status === "Matched" && (
                      <>
                        <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white h-12 text-base font-medium">
                          <Edit className="h-5 w-5 mr-2" />
                          Edit Match
                        </Button>
                        
                        <Button variant="outline" className="w-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white h-10">
                          <X className="h-4 w-4 mr-2" />
                          Unmatch Transaction
                        </Button>
                      </>
                    )}

                    {selectedTransaction.status === "Pending" && (
                      <>
                        <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-base font-medium">
                          <Clock className="h-5 w-5 mr-2" />
                          Approve Pending Match
                        </Button>
                        
                        <Button variant="outline" className="w-full border-gray-400 text-gray-600 hover:bg-gray-100 h-10">
                          <X className="h-4 w-4 mr-2" />
                          Reject Match
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Notes Section */}
                <Card className="shadow-sm border border-gray-200">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-200">
                    <CardTitle className="text-lg text-gymbios-primary">Notes & Remarks</CardTitle>
                    <p className="text-sm text-gray-600">Add audit notes and view transaction history</p>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {selectedTransaction.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <Label className="text-sm font-medium text-yellow-800 mb-2 block">Existing Note</Label>
                        <p className="text-sm text-yellow-900">{selectedTransaction.notes}</p>
                      </div>
                    )}
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">Add Audit Remark</Label>
                      <Textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add remarks for audit purposes, reconciliation notes, or additional context..."
                        rows={4}
                        className="border-gray-300 focus:border-gymbios-primary resize-none"
                      />
                      <Button 
                        size="sm" 
                        className="bg-gymbios-primary hover:bg-gymbios-primary-hover text-white"
                        disabled={!newNote.trim()}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

