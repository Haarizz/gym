import React, { useState, useEffect, useCallback } from 'react';
import { useCurrency, CurrencyValue } from '../utils/currency';
import { toast } from 'sonner';
import { ledgersService, AccountHead as ApiAccountHead, CostCenter as ApiCostCenter, LedgerTransaction } from '../utils/supabase/ledgers-service';
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



export function Ledgers() {
  const { currencyCode } = useCurrency();
  const [activeTab, setActiveTab] = useState('chart-of-accounts');
  
  // Chart of Accounts state
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  
  // Cost Centers state
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [selectedCostCenter, setSelectedCostCenter] = useState<any>(null);
  const [showAddCostCenter, setShowAddCostCenter] = useState(false);
  const [showEditCostCenter, setShowEditCostCenter] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<any>(null);

  // Transactions state
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [txDateFrom, setTxDateFrom] = useState('');
  const [txDateTo, setTxDateTo] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('all');
  const [txSearch, setTxSearch] = useState('');
  const [txLoading, setTxLoading] = useState(false);

  // Edit Account state
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  
  // General Ledger state
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [selectedGLAccount, setSelectedGLAccount] = useState('all');
  const [glDateFrom, setGlDateFrom] = useState('2026-01-01');
  const [glDateTo, setGlDateTo] = useState('2026-12-31');
  
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

  const typeToGroup: Record<string, string> = {
    ASSET: 'Assets',
    LIABILITY: 'Liabilities',
    EQUITY: 'Equity',
    REVENUE: 'Income',
    EXPENSE: 'Expenses',
  };

  const mapApiAccount = (a: ApiAccountHead) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    group: typeToGroup[a.type] ?? a.type,
    subGroup: a.subGroup ?? 'General',
    branch: a.branch ?? 'All Branches',
    costCenter: a.costCenter ?? '',
    openingBalance: a.openingBalance,
    balanceType: ['ASSET', 'EXPENSE'].includes(a.type) ? 'Dr' : 'Cr',
    currentBalance: a.currentBalance,
    status: a.isActive ? 'active' : 'inactive',
    isParent: false,
    parentId: a.parentId,
    level: a.level ?? 0,
    transactions: 0,
    lastTransaction: a.updatedAt?.split('T')[0] ?? '',
  });

  const loadAccounts = useCallback(async () => {
    try {
      const data = await ledgersService.getAccountHeads();
      setAccounts(data.map(mapApiAccount));
    } catch {
      toast.error('Failed to load account heads');
    }
  }, []);

  const loadLedgerEntries = useCallback(async (code: string, from: string, to: string) => {
    try {
      const data = code === 'all'
        ? await ledgersService.getAllLedgerEntries(from, to)
        : await ledgersService.getLedgerEntries(code, from, to);
      setLedgerEntries(data.map((e, idx) => ({
        id: `${e.sourceType}-${e.sourceId}-${e.date}-${idx}`,
        date: e.date,
        voucherNo: e.reference,
        voucherType: e.sourceType === 'JOURNAL_VOUCHER' ? 'Journal Voucher' : e.sourceType,
        accountCode: e.accountCode ?? code,
        accountName: e.accountName ?? accounts.find(a => a.code === code)?.name ?? code,
        particulars: e.description,
        debit: e.debit,
        credit: e.credit,
        runningBalance: e.balance,
        balanceType: e.balance >= 0 ? 'Dr' : 'Cr',
        reference: e.reference,
        costCenter: '',
        branch: '',
        createdBy: '',
      })));
    } catch {
      toast.error('Failed to load ledger entries');
    }
  }, [accounts]);

  const loadCostCenters = useCallback(async () => {
    try {
      const data = await ledgersService.getCostCenters();
      setCostCenters(data.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        branch: c.branch ?? 'All Branches',
        description: c.description ?? '',
        linkedAccounts: c.linkedAccounts,
        status: c.isActive ? 'active' : 'inactive',
        manager: c.manager ?? '',
        budget: c.budget,
        spent: c.spent,
        utilization: c.utilization,
      })));
    } catch {
      toast.error('Failed to load cost centers');
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const data = await ledgersService.getTransactions({
        from: txDateFrom || undefined,
        to: txDateTo || undefined,
        type: txTypeFilter !== 'all' ? txTypeFilter : undefined,
        search: txSearch || undefined,
      });
      setTransactions(data);
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setTxLoading(false);
    }
  }, [txDateFrom, txDateTo, txTypeFilter, txSearch]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadCostCenters(); }, [loadCostCenters]);

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab, loadTransactions]);

  useEffect(() => {
    if (glDateFrom && glDateTo) {
      loadLedgerEntries(selectedGLAccount, glDateFrom, glDateTo);
    }
  }, [selectedGLAccount, glDateFrom, glDateTo, loadLedgerEntries]);

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
        <span><CurrencyValue amount={account.currentBalance} /> {account.balanceType}</span>
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

  const groupToType: Record<string, string> = {
    Assets: 'ASSET',
    Liabilities: 'LIABILITY',
    Equity: 'EQUITY',
    Income: 'REVENUE',
    Expenses: 'EXPENSE',
  };

  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.group || !newAccount.code) {
      toast.error('Please fill in name, code, and group');
      return;
    }
    try {
      await ledgersService.createAccountHead({
        code: newAccount.code,
        name: newAccount.name,
        type: groupToType[newAccount.group] ?? newAccount.group,
        subGroup: newAccount.subGroup || undefined,
        branch: newAccount.branch || undefined,
        costCenter: newAccount.costCenter || undefined,
        openingBalance: parseFloat(newAccount.openingBalance) || 0,
        isActive: newAccount.status,
        description: newAccount.description || undefined,
      });
      toast.success('Account head created');
      await loadAccounts();
      setShowAddAccount(false);
      setNewAccount({ name: '', code: '', group: '', subGroup: '', branch: '', costCenter: '', openingBalance: '', balanceType: 'Dr', status: true, description: '' });
    } catch (e: any) {
      toast.error(e.message || 'Failed to create account head');
    }
  };

  const handleAddCostCenter = async () => {
    if (!newCostCenter.name || !newCostCenter.branch) {
      toast.error('Please fill in name and branch');
      return;
    }
    try {
      await ledgersService.createCostCenter({
        code: newCostCenter.code || undefined,
        name: newCostCenter.name,
        branch: newCostCenter.branch,
        manager: newCostCenter.manager || undefined,
        description: newCostCenter.description || undefined,
        budget: parseFloat(newCostCenter.budget) || undefined,
        isActive: true,
      });
      toast.success('Cost center created');
      await loadCostCenters();
      setShowAddCostCenter(false);
      setNewCostCenter({ name: '', code: '', branch: '', description: '', manager: '', budget: '' });
    } catch (e: any) {
      toast.error(e.message || 'Failed to create cost center');
    }
  };

  const handleEditCostCenter = async () => {
    if (!editingCostCenter) return;
    try {
      await ledgersService.updateCostCenter(editingCostCenter.id, {
        code: editingCostCenter.code,
        name: editingCostCenter.name,
        branch: editingCostCenter.branch,
        manager: editingCostCenter.manager || undefined,
        description: editingCostCenter.description || undefined,
        budget: parseFloat(editingCostCenter.budget) || undefined,
        isActive: editingCostCenter.status === 'active',
      });
      toast.success('Cost center updated');
      await loadCostCenters();
      setShowEditCostCenter(false);
      setEditingCostCenter(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update cost center');
    }
  };

  const handleToggleCostCenter = async (cc: any) => {
    try {
      await ledgersService.toggleCostCenterActive(cc.id);
      toast.success(`Cost center ${cc.status === 'active' ? 'archived' : 'activated'}`);
      await loadCostCenters();
    } catch (e: any) {
      toast.error(e.message || 'Failed to toggle cost center');
    }
  };

  const handleDeleteCostCenter = async (cc: any) => {
    if (!confirm(`Delete cost center "${cc.name}"?`)) return;
    try {
      await ledgersService.deleteCostCenter(cc.id);
      toast.success('Cost center deleted');
      await loadCostCenters();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete cost center');
    }
  };

  const handleEditAccount = async () => {
    if (!editingAccount) return;
    try {
      await ledgersService.updateAccountHead(editingAccount.id, {
        code: editingAccount.code,
        name: editingAccount.name,
        type: groupToType[editingAccount.group] ?? editingAccount.group,
        subGroup: editingAccount.subGroup || undefined,
        branch: editingAccount.branch || undefined,
        costCenter: editingAccount.costCenter || undefined,
        openingBalance: parseFloat(editingAccount.openingBalance) || 0,
        isActive: editingAccount.status === 'active',
        description: editingAccount.description || undefined,
      });
      toast.success('Account updated');
      await loadAccounts();
      setShowEditAccount(false);
      setEditingAccount(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update account');
    }
  };

  const handleArchiveAccount = async (account: any) => {
    try {
      await ledgersService.toggleActive(account.id);
      toast.success(`Account ${account.status === 'active' ? 'archived' : 'activated'}`);
      await loadAccounts();
    } catch (e: any) {
      toast.error(e.message || 'Failed to toggle account');
    }
  };

  const handleDeleteAccount = async (account: any) => {
    if (!confirm(`Delete account "${account.name}"?`)) return;
    try {
      await ledgersService.deleteAccountHead(account.id);
      toast.success('Account deleted');
      await loadAccounts();
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete account');
    }
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
            <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all" onClick={() => exportLedger('excel')}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all" onClick={() => exportLedger('pdf')}>
              <Printer className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5">
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

        {/* Ledger Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {['Assets', 'Liabilities', 'Income', 'Expenses', 'Equity'].map((group) => {
            const groupAccounts = accounts.filter(acc => acc.group === group);
            const totalBalance = groupAccounts.reduce((sum, acc) => {
              return acc.balanceType === 'Dr' ? sum + acc.currentBalance : sum - acc.currentBalance;
            }, 0);
            const groupTint =
              group === 'Assets' ? 'bg-blue-50' :
              group === 'Liabilities' ? 'bg-red-50' :
              group === 'Income' ? 'bg-green-50' :
              group === 'Expenses' ? 'bg-orange-50' :
              'bg-purple-50';
            const groupText =
              group === 'Assets' ? 'text-blue-700' :
              group === 'Liabilities' ? 'text-red-700' :
              group === 'Income' ? 'text-green-700' :
              group === 'Expenses' ? 'text-orange-700' :
              'text-purple-700';

            return (
              <Card key={group} className="border-primary/10 shadow-md hover:shadow-lg transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary">{group}</CardTitle>
                  <div className={`${groupTint} p-2 rounded-lg`}>
                    {getGroupIcon(group)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${groupText}`}>
                    <CurrencyValue amount={Math.abs(totalBalance)} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {groupAccounts.filter(acc => acc.status === 'active').length} active accounts
                  </p>
                </CardContent>
              </Card>
            );
          })}
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
          <TabsContent value="chart-of-accounts" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Filters */}
            <Card className="bg-white border-0 shadow-sm">
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

            {/* Accounts Table */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Chart of Accounts</CardTitle>
                <CardDescription>
                  Complete listing of all accounts ({filteredAccounts.length} accounts)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg bg-white">
                  <Table className="min-w-full">
                    <TableHeader className="bg-slate-50">
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
                      {filteredAccounts.map((account, index) => (
                        <TableRow key={account.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50/80 transition-colors`}>
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
                                  <DropdownMenuItem onClick={() => { setEditingAccount({...account, openingBalance: String(account.openingBalance)}); setShowEditAccount(true); }}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit Account
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleArchiveAccount(account)}>
                                    <Archive className="h-4 w-4 mr-2" />
                                    {account.status === 'active' ? 'Archive Account' : 'Activate Account'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteAccount(account)} className="text-red-600">
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Delete Account
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
          <TabsContent value="general-ledger" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
            {/* GL Filters */}
            <Card className="bg-white border-0 shadow-sm">
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
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle>General Ledger Entries</CardTitle>
                <CardDescription>
                  All journal entries and transactions ({filteredGLEntries.length} entries)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-lg bg-white">
                  <Table className="min-w-full">
                    <TableHeader className="bg-slate-50">
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
                      {filteredGLEntries.map((entry, index) => (
                        <TableRow key={entry.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50/80 transition-colors`}>
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
                                  <CurrencyValue amount={entry.debit} />
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {entry.credit > 0 && (
                              <div className="flex items-center justify-end space-x-1">
                                <ArrowDown className="h-3 w-3 text-red-600" />
                                <span className="font-medium text-red-600">
                                  <CurrencyValue amount={entry.credit} />
                                </span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className={`font-medium ${entry.balanceType === 'Dr' ? 'text-green-600' : 'text-red-600'}`}>
                              <CurrencyValue amount={entry.runningBalance} /> {entry.balanceType}
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
          <TabsContent value="cost-centers" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Cost Centers Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Cost Centers</h2>
                <p className="text-gray-600">Manage departmental cost allocation and budgeting</p>
              </div>
              <Button onClick={() => setShowAddCostCenter(true)} className="shadow-sm hover:shadow-md transition-all">
                <Plus className="h-4 w-4 mr-2" />
                New Cost Center
              </Button>
            </div>

            {/* Cost Centers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCostCenters.map((costCenter) => (
                <Card key={costCenter.id} className="border-0 bg-white shadow-sm hover:shadow-md transition-shadow">
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
                          <div className="font-medium text-orange-600"><CurrencyValue amount={costCenter.spent} /></div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-600">Budget</div>
                          <div className="font-medium"><CurrencyValue amount={costCenter.budget} /></div>
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
                            <DropdownMenuItem onClick={() => { setEditingCostCenter({...costCenter, budget: String(costCenter.budget)}); setShowEditCostCenter(true); }}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Cost Center
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleCostCenter(costCenter)}>
                              <Archive className="h-4 w-4 mr-2" />
                              {costCenter.status === 'active' ? 'Archive' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteCostCenter(costCenter)} className="text-red-600">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
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
          <TabsContent value="transactions" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Filters */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <span>Transaction Filters</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Reference, description..."
                        value={txSearch}
                        onChange={(e) => setTxSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={txTypeFilter} onValueChange={setTxTypeFilter}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="receipt">Receipt Voucher</SelectItem>
                        <SelectItem value="payment">Payment Voucher</SelectItem>
                        <SelectItem value="journal">Journal Voucher</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>From Date</Label>
                    <Input type="date" value={txDateFrom} onChange={(e) => setTxDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>To Date</Label>
                    <Input type="date" value={txDateTo} onChange={(e) => setTxDateTo(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={loadTransactions} className="w-full">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transactions Table */}
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle>All Transactions</CardTitle>
                <CardDescription>
                  Financial transactions from all vouchers and expenses ({transactions.length} records)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {txLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading transactions...</div>
                ) : transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="bg-gray-100 p-4 rounded-lg inline-block mb-4">
                      <Activity className="h-12 w-12 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                    <p className="text-gray-600">Adjust filters or add vouchers/expenses to see transactions here.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-lg bg-white">
                    <Table className="min-w-full">
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Reference</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead>Branch</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((tx, index) => (
                          <TableRow key={tx.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50/80 transition-colors`}>
                            <TableCell className="font-medium">
                              {tx.date ? new Date(tx.date).toLocaleDateString() : '-'}
                            </TableCell>
                            <TableCell className="font-mono text-sm">{tx.referenceNo}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                tx.type === 'Receipt Voucher' ? 'border-green-300 text-green-700' :
                                tx.type === 'Payment Voucher' ? 'border-red-300 text-red-700' :
                                tx.type === 'Journal Voucher' ? 'border-blue-300 text-blue-700' :
                                'border-orange-300 text-orange-700'
                              }>
                                {tx.type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm max-w-xs truncate">{tx.description ?? '-'}</TableCell>
                            <TableCell className="text-right">
                              {tx.debit > 0 && (
                                <span className="font-medium text-red-600"><CurrencyValue amount={tx.debit} /></span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {tx.credit > 0 && (
                                <span className="font-medium text-green-600"><CurrencyValue amount={tx.credit} /></span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{tx.branch ?? '-'}</TableCell>
                            <TableCell>
                              <Badge className={
                                tx.status?.toLowerCase() === 'completed' || tx.status === 'POSTED' || tx.status === 'APPROVED'
                                  ? 'bg-green-100 text-green-800'
                                  : tx.status?.toLowerCase() === 'pending' || tx.status === 'DRAFT'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-gray-100 text-gray-800'
                              }>
                                {tx.status ?? '-'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
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
                  <Label>Budget Amount ({currencyCode})</Label>
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

        {/* Edit Account Modal */}
        <Dialog open={showEditAccount} onOpenChange={setShowEditAccount}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Edit className="h-5 w-5" />
                <span>Edit Account</span>
              </DialogTitle>
            </DialogHeader>
            {editingAccount && (
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Account Name *</Label>
                    <Input value={editingAccount.name} onChange={(e) => setEditingAccount({...editingAccount, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Code *</Label>
                    <Input value={editingAccount.code} onChange={(e) => setEditingAccount({...editingAccount, code: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Group *</Label>
                    <Select value={editingAccount.group} onValueChange={(v) => setEditingAccount({...editingAccount, group: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Input value={editingAccount.subGroup ?? ''} onChange={(e) => setEditingAccount({...editingAccount, subGroup: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch</Label>
                    <Input value={editingAccount.branch ?? ''} onChange={(e) => setEditingAccount({...editingAccount, branch: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Opening Balance</Label>
                    <Input type="number" value={editingAccount.openingBalance} onChange={(e) => setEditingAccount({...editingAccount, openingBalance: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={editingAccount.description ?? ''} onChange={(e) => setEditingAccount({...editingAccount, description: e.target.value})} rows={3} />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => { setShowEditAccount(false); setEditingAccount(null); }}>Cancel</Button>
                  <Button onClick={handleEditAccount}>Save Changes</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Cost Center Modal */}
        <Dialog open={showEditCostCenter} onOpenChange={setShowEditCostCenter}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Edit className="h-5 w-5" />
                <span>Edit Cost Center</span>
              </DialogTitle>
            </DialogHeader>
            {editingCostCenter && (
              <div className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Name *</Label>
                    <Input value={editingCostCenter.name} onChange={(e) => setEditingCostCenter({...editingCostCenter, name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Code</Label>
                    <Input value={editingCostCenter.code} onChange={(e) => setEditingCostCenter({...editingCostCenter, code: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch *</Label>
                    <Select value={editingCostCenter.branch} onValueChange={(v) => setEditingCostCenter({...editingCostCenter, branch: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <Input value={editingCostCenter.manager ?? ''} onChange={(e) => setEditingCostCenter({...editingCostCenter, manager: e.target.value})} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Budget ({currencyCode})</Label>
                    <Input type="number" value={editingCostCenter.budget} onChange={(e) => setEditingCostCenter({...editingCostCenter, budget: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={editingCostCenter.description ?? ''} onChange={(e) => setEditingCostCenter({...editingCostCenter, description: e.target.value})} rows={3} />
                </div>
                <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => { setShowEditCostCenter(false); setEditingCostCenter(null); }}>Cancel</Button>
                  <Button onClick={handleEditCostCenter}>Save Changes</Button>
                </div>
              </div>
            )}
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
                    <Card className="bg-white border-0 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold">{selectedAccount.transactions}</div>
                        <div className="text-sm text-gray-600">Total Transactions</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border-0 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold"><CurrencyValue amount={selectedAccount.currentBalance} /></div>
                        <div className="text-sm text-gray-600">Current Balance</div>
                      </CardContent>
                    </Card>
                    <Card className="bg-white border-0 shadow-sm">
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

