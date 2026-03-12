import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import { Progress } from "../components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Separator } from "../components/ui/separator";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Checkbox } from "../components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
import { ScrollArea } from "../components/ui/scroll-area";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import {
  Search,
  Filter,
  Plus,
  Download,
  Calendar as CalendarIcon,
  Settings,
  BookOpen,
  Building2,
  Target,
  Activity,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Banknote,
  Wallet,
  PieChart,
  BarChart3,
  FileText,
  Receipt,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
  X,
  Check,
  AlertCircle,
  Info,
  User,
  MapPin,
  Clock,
  ExternalLink,
  Paperclip,
  RefreshCw,
  Archive,
  Copy,
  Move,
  Split,
  Merge,
  Calculator,
  Printer,
  Share2,
  Upload,
  FolderOpen,
  Hash,
  Tag,
  Layers,
  Users,
  Building,
  Factory,
  Package,
  ShoppingCart,
  Truck,
  Globe,
  Zap,
  Shield,
  Award,
  Star,
  CheckCircle2,
  XCircle,
  Timer,
  Gauge
} from 'lucide-react';

// Mock data for Chart of Accounts
const chartOfAccountsData = [
  // Assets
  {
    id: 'ACC-1000',
    code: '1000',
    name: 'Cash in Hand',
    group: 'Assets',
    subGroup: 'Current Assets',
    branch: 'Dubai Branch',
    costCenter: 'CC-001',
    openingBalance: 25000,
    balanceType: 'Dr',
    currentBalance: 32500,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 156,
    lastTransaction: '2024-01-20'
  },
  {
    id: 'ACC-1001',
    code: '1001',
    name: 'Bank Account - Emirates NBD',
    group: 'Assets',
    subGroup: 'Current Assets',
    branch: 'Dubai Branch',
    costCenter: 'CC-001',
    openingBalance: 150000,
    balanceType: 'Dr',
    currentBalance: 167800,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 89,
    lastTransaction: '2024-01-21'
  },
  {
    id: 'ACC-1200',
    code: '1200',
    name: 'Accounts Receivable',
    group: 'Assets',
    subGroup: 'Current Assets',
    branch: 'All Branches',
    costCenter: 'CC-001',
    openingBalance: 45000,
    balanceType: 'Dr',
    currentBalance: 52300,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 234,
    lastTransaction: '2024-01-21'
  },
  {
    id: 'ACC-1500',
    code: '1500',
    name: 'Gym Equipment',
    group: 'Assets',
    subGroup: 'Fixed Assets',
    branch: 'All Branches',
    costCenter: 'CC-002',
    openingBalance: 450000,
    balanceType: 'Dr',
    currentBalance: 398000,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 67,
    lastTransaction: '2024-01-18'
  },
  
  // Liabilities
  {
    id: 'ACC-2000',
    code: '2000',
    name: 'Accounts Payable',
    group: 'Liabilities',
    subGroup: 'Current Liabilities',
    branch: 'All Branches',
    costCenter: 'CC-001',
    openingBalance: 35000,
    balanceType: 'Cr',
    currentBalance: 41200,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 123,
    lastTransaction: '2024-01-20'
  },
  {
    id: 'ACC-2100',
    code: '2100',
    name: 'Membership Deposits',
    group: 'Liabilities',
    subGroup: 'Current Liabilities',
    branch: 'All Branches',
    costCenter: 'CC-003',
    openingBalance: 18500,
    balanceType: 'Cr',
    currentBalance: 22800,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 78,
    lastTransaction: '2024-01-21'
  },

  // Income
  {
    id: 'ACC-4000',
    code: '4000',
    name: 'Membership Revenue',
    group: 'Income',
    subGroup: 'Operating Income',
    branch: 'All Branches',
    costCenter: 'CC-003',
    openingBalance: 0,
    balanceType: 'Cr',
    currentBalance: 125600,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 445,
    lastTransaction: '2024-01-21'
  },
  {
    id: 'ACC-4100',
    code: '4100',
    name: 'Personal Training Revenue',
    group: 'Income',
    subGroup: 'Operating Income',
    branch: 'All Branches',
    costCenter: 'CC-004',
    openingBalance: 0,
    balanceType: 'Cr',
    currentBalance: 38900,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 167,
    lastTransaction: '2024-01-21'
  },
  {
    id: 'ACC-4200',
    code: '4200',
    name: 'Retail Sales Revenue',
    group: 'Income',
    subGroup: 'Operating Income',
    branch: 'All Branches',
    costCenter: 'CC-005',
    openingBalance: 0,
    balanceType: 'Cr',
    currentBalance: 15670,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 89,
    lastTransaction: '2024-01-20'
  },

  // Expenses
  {
    id: 'ACC-5000',
    code: '5000',
    name: 'Rent Expense',
    group: 'Expenses',
    subGroup: 'Operating Expenses',
    branch: 'Dubai Branch',
    costCenter: 'CC-001',
    openingBalance: 0,
    balanceType: 'Dr',
    currentBalance: 24000,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 12,
    lastTransaction: '2024-01-01'
  },
  {
    id: 'ACC-5100',
    code: '5100',
    name: 'Utilities Expense',
    group: 'Expenses',
    subGroup: 'Operating Expenses',
    branch: 'All Branches',
    costCenter: 'CC-001',
    openingBalance: 0,
    balanceType: 'Dr',
    currentBalance: 8560,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 34,
    lastTransaction: '2024-01-15'
  },
  {
    id: 'ACC-5200',
    code: '5200',
    name: 'Staff Salaries',
    group: 'Expenses',
    subGroup: 'Operating Expenses',
    branch: 'All Branches',
    costCenter: 'CC-006',
    openingBalance: 0,
    balanceType: 'Dr',
    currentBalance: 67800,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 56,
    lastTransaction: '2024-01-20'
  },

  // Equity
  {
    id: 'ACC-3000',
    code: '3000',
    name: 'Owner Equity',
    group: 'Equity',
    subGroup: 'Capital',
    branch: 'All Branches',
    costCenter: 'CC-001',
    openingBalance: 500000,
    balanceType: 'Cr',
    currentBalance: 500000,
    status: 'active',
    isParent: false,
    parentId: null,
    level: 0,
    transactions: 5,
    lastTransaction: '2023-12-31'
  }
];

// Cost Centers data
const costCentersData = [
  {
    id: 'CC-001',
    code: 'CC-001',
    name: 'Administration',
    branch: 'Dubai Branch',
    description: 'Administrative and management operations',
    linkedAccounts: 8,
    status: 'active',
    manager: 'Sarah Ahmed',
    budget: 50000,
    spent: 32560,
    utilization: 65
  },
  {
    id: 'CC-002',
    code: 'CC-002',
    name: 'Equipment & Assets',
    branch: 'All Branches',
    description: 'Gym equipment and facility assets',
    linkedAccounts: 12,
    status: 'active',
    manager: 'Ahmed Hassan',
    budget: 75000,
    spent: 45800,
    utilization: 61
  },
  {
    id: 'CC-003',
    code: 'CC-003',
    name: 'Membership Services',
    branch: 'All Branches',
    description: 'Member-related revenue and services',
    linkedAccounts: 6,
    status: 'active',
    manager: 'Lisa Wang',
    budget: 25000,
    spent: 18900,
    utilization: 76
  },
  {
    id: 'CC-004',
    code: 'CC-004',
    name: 'Personal Training',
    branch: 'All Branches',
    description: 'Personal training services and revenue',
    linkedAccounts: 4,
    status: 'active',
    manager: 'Mike Johnson',
    budget: 30000,
    spent: 22100,
    utilization: 74
  },
  {
    id: 'CC-005',
    code: 'CC-005',
    name: 'Retail Operations',
    branch: 'All Branches',
    description: 'Supplement and merchandise sales',
    linkedAccounts: 5,
    status: 'active',
    manager: 'John Smith',
    budget: 20000,
    spent: 12300,
    utilization: 62
  },
  {
    id: 'CC-006',
    code: 'CC-006',
    name: 'Human Resources',
    branch: 'All Branches',
    description: 'Staff salaries and HR operations',
    linkedAccounts: 3,
    status: 'active',
    manager: 'Sarah Ahmed',
    budget: 80000,
    spent: 67800,
    utilization: 85
  }
];

// General Ledger transactions
const generalLedgerData = [
  {
    id: 'GL-001',
    date: '2024-01-21',
    voucherNo: 'RV-2024-001',
    voucherType: 'Receipt Voucher',
    accountCode: '4000',
    accountName: 'Membership Revenue',
    particulars: 'Monthly membership fees - January 2024',
    debit: 0,
    credit: 15600,
    runningBalance: 141200,
    balanceType: 'Cr',
    reference: 'MEM-2024-001',
    costCenter: 'CC-003',
    branch: 'Dubai Branch',
    createdBy: 'Lisa Wang'
  },
  {
    id: 'GL-002',
    date: '2024-01-21',
    voucherNo: 'RV-2024-001',
    voucherType: 'Receipt Voucher',
    accountCode: '1001',
    accountName: 'Bank Account - Emirates NBD',
    particulars: 'Monthly membership fees - January 2024',
    debit: 15600,
    credit: 0,
    runningBalance: 167800,
    balanceType: 'Dr',
    reference: 'MEM-2024-001',
    costCenter: 'CC-001',
    branch: 'Dubai Branch',
    createdBy: 'Lisa Wang'
  },
  {
    id: 'GL-003',
    date: '2024-01-20',
    voucherNo: 'PV-2024-012',
    voucherType: 'Payment Voucher',
    accountCode: '5200',
    accountName: 'Staff Salaries',
    particulars: 'Monthly salary payment - January 2024',
    debit: 22600,
    credit: 0,
    runningBalance: 67800,
    balanceType: 'Dr',
    reference: 'SAL-2024-001',
    costCenter: 'CC-006',
    branch: 'All Branches',
    createdBy: 'Sarah Ahmed'
  },
  {
    id: 'GL-004',
    date: '2024-01-20',
    voucherNo: 'PV-2024-012',
    voucherType: 'Payment Voucher',
    accountCode: '1001',
    accountName: 'Bank Account - Emirates NBD',
    particulars: 'Monthly salary payment - January 2024',
    debit: 0,
    credit: 22600,
    runningBalance: 152200,
    balanceType: 'Dr',
    reference: 'SAL-2024-001',
    costCenter: 'CC-001',
    branch: 'Dubai Branch',
    createdBy: 'Sarah Ahmed'
  },
  {
    id: 'GL-005',
    date: '2024-01-18',
    voucherNo: 'JV-2024-003',
    voucherType: 'Journal Voucher',
    accountCode: '1500',
    accountName: 'Gym Equipment',
    particulars: 'Depreciation on gym equipment - January 2024',
    debit: 0,
    credit: 3750,
    runningBalance: 398000,
    balanceType: 'Dr',
    reference: 'DEP-2024-001',
    costCenter: 'CC-002',
    branch: 'All Branches',
    createdBy: 'System'
  },
  {
    id: 'GL-006',
    date: '2024-01-15',
    voucherNo: 'PV-2024-011',
    voucherType: 'Payment Voucher',
    accountCode: '5100',
    accountName: 'Utilities Expense',
    particulars: 'Electricity bill - December 2023',
    debit: 2840,
    credit: 0,
    runningBalance: 8560,
    balanceType: 'Dr',
    reference: 'UTIL-2023-012',
    costCenter: 'CC-001',
    branch: 'Dubai Branch',
    createdBy: 'Ahmed Hassan'
  }
];

export function Ledgers() {
  const [activeTab, setActiveTab] = useState('chart-of-accounts');
  
  // Chart of Accounts state
  const [accounts, setAccounts] = useState(chartOfAccountsData);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  
  // Cost Centers state
  const [costCenters, setCostCenters] = useState(costCentersData);
  const [selectedCostCenter, setSelectedCostCenter] = useState<any>(null);
  const [showAddCostCenter, setShowAddCostCenter] = useState(false);
  
  // General Ledger state
  const [ledgerEntries, setLedgerEntries] = useState(generalLedgerData);
  const [selectedGLAccount, setSelectedGLAccount] = useState('all');
  const [glDateFrom, setGlDateFrom] = useState('2024-01-01');
  const [glDateTo, setGlDateTo] = useState('2024-01-31');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // New account form state
  const [newAccount, setNewAccount] = useState({
    name: '',
    code: '',
    group: '',
    subGroup: '',
    branch: '',
    costCenter: '',
    openingBalance: '',
    balanceType: 'Dr',
    status: true,
    description: ''
  });

  // New cost center form state
  const [newCostCenter, setNewCostCenter] = useState({
    name: '',
    code: '',
    branch: '',
    description: '',
    manager: '',
    budget: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getGroupIcon = (group: string) => {
    switch (group) {
      case 'Assets':
        return <Building2 className="h-4 w-4 text-blue-600" />;
      case 'Liabilities':
        return <CreditCard className="h-4 w-4 text-red-600" />;
      case 'Income':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'Expenses':
        return <TrendingDown className="h-4 w-4 text-orange-600" />;
      case 'Equity':
        return <PieChart className="h-4 w-4 text-purple-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getGroupColor = (group: string) => {
    switch (group) {
      case 'Assets':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Liabilities':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Income':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Expenses':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Equity':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getBalanceDisplay = (account: any) => {
    const isCredit = account.balanceType === 'Cr';
    const colorClass = isCredit ? 'text-red-600' : 'text-green-600';
    
    return (
      <div className={`font-medium ${colorClass} flex items-center space-x-1`}>
        {isCredit ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
        <span>{formatCurrency(account.currentBalance)} {account.balanceType}</span>
      </div>
    );
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = 
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.code.includes(searchTerm.toLowerCase());
    
    const matchesGroup = groupFilter === 'all' || account.group === groupFilter;
    const matchesBranch = branchFilter === 'all' || 
      account.branch.toLowerCase().includes(branchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && account.status === 'active') ||
      (statusFilter === 'inactive' && account.status === 'inactive');
    
    return matchesSearch && matchesGroup && matchesBranch && matchesStatus;
  });

  const filteredCostCenters = costCenters.filter(cc => {
    const matchesSearch = 
      cc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cc.code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBranch = branchFilter === 'all' || 
      cc.branch.toLowerCase().includes(branchFilter.toLowerCase());
    const matchesStatus = statusFilter === 'all' || cc.status === statusFilter;
    
    return matchesSearch && matchesBranch && matchesStatus;
  });

  const filteredGLEntries = ledgerEntries.filter(entry => {
    const matchesAccount = selectedGLAccount === 'all' || entry.accountCode === selectedGLAccount;
    const entryDate = new Date(entry.date);
    const fromDate = new Date(glDateFrom);
    const toDate = new Date(glDateTo);
    
    return matchesAccount && entryDate >= fromDate && entryDate <= toDate;
  });

  const handleAddAccount = () => {
    if (!newAccount.name || !newAccount.group) {
      alert('Please fill in all required fields');
      return;
    }

    const nextCode = newAccount.code || `${Math.floor(Math.random() * 9000) + 1000}`;
    
    const account = {
      id: `ACC-${nextCode}`,
      code: nextCode,
      name: newAccount.name,
      group: newAccount.group,
      subGroup: newAccount.subGroup || 'General',
      branch: newAccount.branch || 'All Branches',
      costCenter: newAccount.costCenter || 'CC-001',
      openingBalance: parseFloat(newAccount.openingBalance) || 0,
      balanceType: newAccount.balanceType,
      currentBalance: parseFloat(newAccount.openingBalance) || 0,
      status: newAccount.status ? 'active' : 'inactive',
      isParent: false,
      parentId: null,
      level: 0,
      transactions: 0,
      lastTransaction: new Date().toISOString().split('T')[0]
    };

    setAccounts([...accounts, account]);
    setShowAddAccount(false);
    
    // Reset form
    setNewAccount({
      name: '',
      code: '',
      group: '',
      subGroup: '',
      branch: '',
      costCenter: '',
      openingBalance: '',
      balanceType: 'Dr',
      status: true,
      description: ''
    });
  };

  const handleAddCostCenter = () => {
    if (!newCostCenter.name || !newCostCenter.branch) {
      alert('Please fill in all required fields');
      return;
    }

    const nextCode = newCostCenter.code || `CC-${String(costCenters.length + 1).padStart(3, '0')}`;
    
    const costCenter = {
      id: nextCode,
      code: nextCode,
      name: newCostCenter.name,
      branch: newCostCenter.branch,
      description: newCostCenter.description,
      linkedAccounts: 0,
      status: 'active',
      manager: newCostCenter.manager,
      budget: parseFloat(newCostCenter.budget) || 0,
      spent: 0,
      utilization: 0
    };

    setCostCenters([...costCenters, costCenter]);
    setShowAddCostCenter(false);
    
    // Reset form
    setNewCostCenter({
      name: '',
      code: '',
      branch: '',
      description: '',
      manager: '',
      budget: ''
    });
  };

  const exportLedger = (format: string) => {
    console.log(`Exporting ledger as ${format}`);
    alert(`Ledger will be exported as ${format.toUpperCase()}`);
  };

  const openAccountDetails = (account: any) => {
    setSelectedAccount(account);
    setShowAccountDetails(true);
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Ledgers</h1>
            <p className="text-gray-600 mt-1">
              Manage chart of accounts, general ledger, cost centers, and financial transactions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => exportLedger('excel')}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportLedger('pdf')}>
              <Printer className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Quick Add
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowAddAccount(true)}>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Add Account
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAddCostCenter(true)}>
                  <Target className="h-4 w-4 mr-2" />
                  Add Cost Center
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Main Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="chart-of-accounts" className="flex items-center space-x-2">
              <BookOpen className="h-4 w-4" />
              <span>Chart of Accounts</span>
            </TabsTrigger>
            <TabsTrigger value="general-ledger" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>General Ledger</span>
            </TabsTrigger>
            <TabsTrigger value="cost-centers" className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <span>Cost Centers</span>
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center space-x-2">
              <Activity className="h-4 w-4" />
              <span>Transactions</span>
            </TabsTrigger>
          </TabsList>

          {/* Chart of Accounts Tab */}
          <TabsContent value="chart-of-accounts" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Account Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Search accounts..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Account Group</Label>
                    <Select value={groupFilter} onValueChange={setGroupFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Groups</SelectItem>
                        <SelectItem value="Assets">Assets</SelectItem>
                        <SelectItem value="Liabilities">Liabilities</SelectItem>
                        <SelectItem value="Income">Income</SelectItem>
                        <SelectItem value="Expenses">Expenses</SelectItem>
                        <SelectItem value="Equity">Equity</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Select value={branchFilter} onValueChange={setBranchFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Branches</SelectItem>
                        <SelectItem value="dubai">Dubai Branch</SelectItem>
                        <SelectItem value="marina">Marina Branch</SelectItem>
                        <SelectItem value="warehouse">Warehouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button onClick={() => setShowAddAccount(true)} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      New Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Accounts Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {['Assets', 'Liabilities', 'Income', 'Expenses', 'Equity'].map((group) => {
                const groupAccounts = accounts.filter(acc => acc.group === group);
                const totalBalance = groupAccounts.reduce((sum, acc) => {
                  return acc.balanceType === 'Dr' ? sum + acc.currentBalance : sum - acc.currentBalance;
                }, 0);
                
                return (
                  <Card key={group} className={`border-2 ${group === 'Assets' ? 'border-blue-200' : group === 'Liabilities' ? 'border-red-200' : group === 'Income' ? 'border-green-200' : group === 'Expenses' ? 'border-orange-200' : 'border-purple-200'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          {getGroupIcon(group)}
                          <span className="font-medium">{group}</span>
                        </div>
                        <Badge variant="secondary">{groupAccounts.length}</Badge>
                      </div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(Math.abs(totalBalance))}
                      </div>
                      <div className="text-sm text-gray-600">
                        {groupAccounts.filter(acc => acc.status === 'active').length} active accounts
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Accounts Table */}
            <Card>
              <CardHeader>
                <CardTitle>Chart of Accounts</CardTitle>
                <CardDescription>
                  Complete listing of all accounts ({filteredAccounts.length} accounts)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Account Code</TableHead>
                        <TableHead>Account Name</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Cost Center</TableHead>
                        <TableHead>Current Balance</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAccounts.map((account) => (
                        <TableRow key={account.id} className="hover:bg-gray-50">
                          <TableCell className="font-mono font-medium">
                            {account.code}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              {getGroupIcon(account.group)}
                              <div>
                                <div className="font-medium">{account.name}</div>
                                <div className="text-sm text-gray-600">{account.subGroup}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getGroupColor(account.group)}>
                              {account.group}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Building className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{account.branch}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <Target className="h-3 w-3 text-gray-400" />
                              <span className="text-sm">{account.costCenter}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {getBalanceDisplay(account)}
                          </TableCell>
                          <TableCell>
                            <Badge className={account.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {account.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => openAccountDetails(account)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Transactions</TooltipContent>
                              </Tooltip>
                              
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Account
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Copy className="h-4 w-4 mr-2" />
                                    Duplicate Account
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Archive className="h-4 w-4 mr-2" />
                                    Archive Account
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* General Ledger Tab */}
          <TabsContent value="general-ledger" className="space-y-6">
            {/* GL Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Ledger Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Account</Label>
                    <Select value={selectedGLAccount} onValueChange={setSelectedGLAccount}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accounts.map((account) => (
                          <SelectItem key={account.code} value={account.code}>
                            {account.code} - {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input
                      type="date"
                      value={glDateFrom}
                      onChange={(e) => setGlDateFrom(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input
                      type="date"
                      value={glDateTo}
                      onChange={(e) => setGlDateTo(e.target.value)}
                    />
                  </div>

                  <div className="flex items-end space-x-2">
                    <Button onClick={() => exportLedger('pdf')} className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* General Ledger Table */}
            <Card>
              <CardHeader>
                <CardTitle>General Ledger Entries</CardTitle>
                <CardDescription>
                  All journal entries and transactions ({filteredGLEntries.length} entries)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Voucher No.</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Particulars</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredGLEntries.map((entry) => (
                        <TableRow key={entry.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium">
                            {new Date(entry.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{entry.voucherType.slice(0, 2)}</Badge>
                              <span className="font-mono text-sm">{entry.voucherNo}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{entry.accountCode}</div>
                              <div className="text-sm text-gray-600">{entry.accountName}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="text-sm">{entry.particulars}</div>
                              {entry.reference && (
                                <div className="text-xs text-gray-500">Ref: {entry.reference}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.debit > 0 && (
                              <div className="flex items-center justify-end space-x-1">
                                <ArrowUp className="h-3 w-3 text-green-600" />
                                <span className="font-medium text-green-600">
                                  {formatCurrency(entry.debit)}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.credit > 0 && (
                              <div className="flex items-center justify-end space-x-1">
                                <ArrowDown className="h-3 w-3 text-red-600" />
                                <span className="font-medium text-red-600">
                                  {formatCurrency(entry.credit)}
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={`font-medium ${entry.balanceType === 'Dr' ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(entry.runningBalance)} {entry.balanceType}
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

          {/* Cost Centers Tab */}
          <TabsContent value="cost-centers" className="space-y-6">
            {/* Cost Centers Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Cost Centers</h2>
                <p className="text-gray-600">Manage departmental cost allocation and budgeting</p>
              </div>
              <Button onClick={() => setShowAddCostCenter(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Cost Center
              </Button>
            </div>

            {/* Cost Centers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCostCenters.map((costCenter) => (
                <Card key={costCenter.id} className="border-2 hover:border-teal-200 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="bg-teal-100 p-2 rounded-lg">
                          <Target className="h-5 w-5 text-teal-600" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{costCenter.name}</CardTitle>
                          <div className="text-sm text-gray-600">{costCenter.code}</div>
                        </div>
                      </div>
                      <Badge className={costCenter.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                        {costCenter.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-600 mb-1">{costCenter.description}</div>
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Building className="h-3 w-3 text-gray-400" />
                          <span>{costCenter.branch}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3 text-gray-400" />
                          <span>{costCenter.manager}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Budget Utilization</span>
                        <span className="text-sm font-medium">{costCenter.utilization}%</span>
                      </div>
                      <Progress value={costCenter.utilization} className="h-2" />
                      
                      <div className="flex justify-between text-sm">
                        <div>
                          <div className="text-gray-600">Spent</div>
                          <div className="font-medium text-orange-600">{formatCurrency(costCenter.spent)}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-600">Budget</div>
                          <div className="font-medium">{formatCurrency(costCenter.budget)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          <BookOpen className="h-4 w-4 text-gray-400" />
                          <span className="text-sm">{costCenter.linkedAccounts} linked accounts</span>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Cost Center
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Archive className="h-4 w-4 mr-2" />
                              Archive
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>
                  Latest financial transactions across all accounts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="bg-gray-100 p-4 rounded-lg inline-block mb-4">
                    <Activity className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Transaction Management</h3>
                  <p className="text-gray-600 mb-4">
                    This section will show all financial transactions with filtering and search capabilities.
                  </p>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Add Account Modal */}
        <Dialog open={showAddAccount} onOpenChange={setShowAddAccount}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5" />
                <span>Add New Account</span>
              </DialogTitle>
              <DialogDescription>
                Create a new account in your chart of accounts
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Account Name *</Label>
                  <Input
                    placeholder="Enter account name"
                    value={newAccount.name}
                    onChange={(e) => setNewAccount({...newAccount, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Account Code</Label>
                  <Input
                    placeholder="Auto-generated"
                    value={newAccount.code}
                    onChange={(e) => setNewAccount({...newAccount, code: e.target.value})}
                  />
                  <div className="text-sm text-gray-600">Leave empty for auto-generation</div>
                </div>

                <div className="space-y-2">
                  <Label>Account Group *</Label>
                  <Select value={newAccount.group} onValueChange={(value) => setNewAccount({...newAccount, group: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account group" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Assets">Assets</SelectItem>
                      <SelectItem value="Liabilities">Liabilities</SelectItem>
                      <SelectItem value="Income">Income</SelectItem>
                      <SelectItem value="Expenses">Expenses</SelectItem>
                      <SelectItem value="Equity">Equity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Sub Group</Label>
                  <Input
                    placeholder="e.g., Current Assets, Fixed Assets"
                    value={newAccount.subGroup}
                    onChange={(e) => setNewAccount({...newAccount, subGroup: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={newAccount.branch} onValueChange={(value) => setNewAccount({...newAccount, branch: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Branches">All Branches</SelectItem>
                      <SelectItem value="Dubai Branch">Dubai Branch</SelectItem>
                      <SelectItem value="Marina Branch">Marina Branch</SelectItem>
                      <SelectItem value="Warehouse">Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Cost Center</Label>
                  <Select value={newAccount.costCenter} onValueChange={(value) => setNewAccount({...newAccount, costCenter: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select cost center" />
                    </SelectTrigger>
                    <SelectContent>
                      {costCenters.map((cc) => (
                        <SelectItem key={cc.code} value={cc.code}>
                          {cc.code} - {cc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Opening Balance</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newAccount.openingBalance}
                    onChange={(e) => setNewAccount({...newAccount, openingBalance: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Balance Type</Label>
                  <Select value={newAccount.balanceType} onValueChange={(value) => setNewAccount({...newAccount, balanceType: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dr">Debit (Dr)</SelectItem>
                      <SelectItem value="Cr">Credit (Cr)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Optional description for this account"
                  value={newAccount.description}
                  onChange={(e) => setNewAccount({...newAccount, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="account-active"
                  checked={newAccount.status}
                  onCheckedChange={(checked) => setNewAccount({...newAccount, status: !!checked})}
                />
                <Label htmlFor="account-active">Account is Active</Label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddAccount(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAccount}>
                  Create Account
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Cost Center Modal */}
        <Dialog open={showAddCostCenter} onOpenChange={setShowAddCostCenter}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5" />
                <span>Add New Cost Center</span>
              </DialogTitle>
              <DialogDescription>
                Create a new cost center for departmental budgeting and allocation
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Cost Center Name *</Label>
                  <Input
                    placeholder="Enter cost center name"
                    value={newCostCenter.name}
                    onChange={(e) => setNewCostCenter({...newCostCenter, name: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Cost Center Code</Label>
                  <Input
                    placeholder="Auto-generated"
                    value={newCostCenter.code}
                    onChange={(e) => setNewCostCenter({...newCostCenter, code: e.target.value})}
                  />
                  <div className="text-sm text-gray-600">Leave empty for auto-generation</div>
                </div>

                <div className="space-y-2">
                  <Label>Branch *</Label>
                  <Select value={newCostCenter.branch} onValueChange={(value) => setNewCostCenter({...newCostCenter, branch: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All Branches">All Branches</SelectItem>
                      <SelectItem value="Dubai Branch">Dubai Branch</SelectItem>
                      <SelectItem value="Marina Branch">Marina Branch</SelectItem>
                      <SelectItem value="Warehouse">Warehouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Manager</Label>
                  <Select value={newCostCenter.manager} onValueChange={(value) => setNewCostCenter({...newCostCenter, manager: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sarah Ahmed">Sarah Ahmed</SelectItem>
                      <SelectItem value="Ahmed Hassan">Ahmed Hassan</SelectItem>
                      <SelectItem value="Lisa Wang">Lisa Wang</SelectItem>
                      <SelectItem value="Mike Johnson">Mike Johnson</SelectItem>
                      <SelectItem value="John Smith">John Smith</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Budget Amount (AED)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newCostCenter.budget}
                    onChange={(e) => setNewCostCenter({...newCostCenter, budget: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Describe the purpose and scope of this cost center"
                  value={newCostCenter.description}
                  onChange={(e) => setNewCostCenter({...newCostCenter, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddCostCenter(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddCostCenter}>
                  Create Cost Center
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Account Details Modal */}
        <Dialog open={showAccountDetails} onOpenChange={setShowAccountDetails}>
          <DialogContent className="max-w-4xl">
            {selectedAccount && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-2">
                    {getGroupIcon(selectedAccount.group)}
                    <span>{selectedAccount.name} Transactions</span>
                  </DialogTitle>
                  <DialogDescription>
                    Account: {selectedAccount.code} - {selectedAccount.name}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-6">
                  {/* Account Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{selectedAccount.transactions}</div>
                        <div className="text-sm text-gray-600">Total Transactions</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{formatCurrency(selectedAccount.currentBalance)}</div>
                        <div className="text-sm text-gray-600">Current Balance</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{selectedAccount.lastTransaction}</div>
                        <div className="text-sm text-gray-600">Last Transaction</div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="text-center py-8">
                    <div className="bg-gray-100 p-4 rounded-lg inline-block mb-4">
                      <FileText className="h-8 w-8 text-gray-400" />
                    </div>
                    <p className="text-gray-600">Account transaction history will be displayed here</p>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

