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
  Receipt,
  Users,
  CreditCard,
  Banknote,
  Smartphone,
  DollarSign,
  TrendingUp,
  Activity,
  BarChart3,
  PieChart,
  FileText,
  Edit,
  Trash2,
  Eye,
  MoreHorizontal,
  User,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  Timer,
  Package,
  Printer,
  Mail,
  Copy,
  Archive,
  Upload,
  ChevronDown,
  ChevronRight,
  X,
  Paperclip,
  Building2,
  Target,
  Wallet,
  Globe,
  Tag,
  Zap,
  RefreshCw,
  ExternalLink,
  Info,
  AlertTriangle,
  Hash,
  ArrowUpDown,
  Send,
  Star,
  Calendar as CalendarDays,
  ShoppingCart,
  Gift,
  Coffee,
  Dumbbell,
  Shirt,
  Utensils,
  Car,
  Home,
  BookOpen
} from 'lucide-react';

// Mock receipt voucher data
const receiptVouchersData = [
  {
    id: 'RV-2024-001',
    date: '2024-01-21',
    source: 'Membership Revenue',
    sourceCategory: 'membership',
    member: 'Ahmed Hassan',
    memberId: 'MEM-2024-001',
    amount: 1560,
    paymentMode: 'Card',
    status: 'completed',
    branch: 'Dubai Branch',
    reference: 'Monthly Membership - Premium',
    createdBy: 'Lisa Wang',
    createdAt: '2024-01-21 09:15:00',
    notes: 'Monthly membership fee for January 2024',
    attachments: ['receipt_001.pdf'],
    approvedBy: 'Sarah Ahmed',
    voucherType: 'membership',
    cashierName: 'Lisa Wang',
    transactionId: 'TXN-001-2024'
  },
  {
    id: 'RV-2024-002',
    date: '2024-01-21',
    source: 'Personal Training',
    sourceCategory: 'services',
    member: 'Maria Santos',
    memberId: 'MEM-2024-002',
    amount: 450,
    paymentMode: 'Cash',
    status: 'completed',
    branch: 'Dubai Branch',
    reference: '3 PT Sessions Package',
    createdBy: 'Mike Johnson',
    createdAt: '2024-01-21 11:30:00',
    notes: 'Personal training package - 3 sessions',
    attachments: ['receipt_002.pdf'],
    approvedBy: 'Sarah Ahmed',
    voucherType: 'services',
    cashierName: 'Mike Johnson',
    transactionId: 'TXN-002-2024'
  },
  {
    id: 'RV-2024-003',
    date: '2024-01-21',
    source: 'Merchandise Sales',
    sourceCategory: 'retail',
    member: 'John Smith',
    memberId: 'MEM-2024-003',
    amount: 125,
    paymentMode: 'Online Transfer',
    status: 'completed',
    branch: 'Dubai Branch',
    reference: 'Protein Powder + Shaker',
    createdBy: 'Lisa Wang',
    createdAt: '2024-01-21 14:20:00',
    notes: 'Whey protein 2kg + gym shaker bottle',
    attachments: ['receipt_003.pdf'],
    approvedBy: 'Sarah Ahmed',
    voucherType: 'retail',
    cashierName: 'Lisa Wang',
    transactionId: 'TXN-003-2024'
  },
  {
    id: 'RV-2024-004',
    date: '2024-01-20',
    source: 'Event Registration',
    sourceCategory: 'events',
    member: 'Sarah Johnson',
    memberId: 'MEM-2024-004',
    amount: 89,
    paymentMode: 'Card',
    status: 'pending',
    branch: 'Marina Branch',
    reference: 'Fitness Challenge 2024',
    createdBy: 'Ahmed Hassan',
    createdAt: '2024-01-20 16:45:00',
    notes: 'Registration for 30-day fitness challenge',
    attachments: [],
    approvedBy: 'Pending',
    voucherType: 'events',
    cashierName: 'Ahmed Hassan',
    transactionId: 'TXN-004-2024'
  },
  {
    id: 'RV-2024-005',
    date: '2024-01-20',
    source: 'Cafe Sales',
    sourceCategory: 'fnb',
    member: 'David Wilson',
    memberId: 'MEM-2024-005',
    amount: 35,
    paymentMode: 'Cash',
    status: 'completed',
    branch: 'Dubai Branch',
    reference: 'Post-workout smoothie + energy bar',
    createdBy: 'Lisa Wang',
    createdAt: '2024-01-20 18:10:00',
    notes: 'Protein smoothie and energy bar',
    attachments: ['receipt_005.pdf'],
    approvedBy: 'Sarah Ahmed',
    voucherType: 'fnb',
    cashierName: 'Lisa Wang',
    transactionId: 'TXN-005-2024'
  },
  {
    id: 'RV-2024-006',
    date: '2024-01-19',
    source: 'Equipment Rental',
    sourceCategory: 'rental',
    member: 'Emma Davis',
    memberId: 'MEM-2024-006',
    amount: 75,
    paymentMode: 'Card',
    status: 'partially-paid',
    branch: 'Marina Branch',
    reference: 'Yoga mat rental - 1 week',
    createdBy: 'Ahmed Hassan',
    createdAt: '2024-01-19 10:20:00',
    notes: 'Weekly yoga mat rental, partial payment received',
    attachments: [],
    approvedBy: 'Pending',
    voucherType: 'rental',
    cashierName: 'Ahmed Hassan',
    transactionId: 'TXN-006-2024'
  },
  {
    id: 'RV-2024-007',
    date: '2024-01-19',
    source: 'Locker Rental',
    sourceCategory: 'facilities',
    member: 'Robert Brown',
    memberId: 'MEM-2024-007',
    amount: 150,
    paymentMode: 'Online Transfer',
    status: 'completed',
    branch: 'Dubai Branch',
    reference: 'Monthly locker rental - Premium',
    createdBy: 'Mike Johnson',
    createdAt: '2024-01-19 13:15:00',
    notes: 'Premium locker rental for January 2024',
    attachments: ['receipt_007.pdf', 'locker_agreement.pdf'],
    approvedBy: 'Sarah Ahmed',
    voucherType: 'facilities',
    cashierName: 'Mike Johnson',
    transactionId: 'TXN-007-2024'
  },
  {
    id: 'RV-2024-008',
    date: '2024-01-18',
    source: 'Day Pass',
    sourceCategory: 'membership',
    member: 'Jennifer Lee',
    memberId: 'GUEST-001',
    amount: 45,
    paymentMode: 'Cash',
    status: 'completed',
    branch: 'Marina Branch',
    reference: 'Single day gym access',
    createdBy: 'Ahmed Hassan',
    createdAt: '2024-01-18 08:30:00',
    notes: 'Guest day pass with full facility access',
    attachments: ['receipt_008.pdf'],
    approvedBy: 'Sarah Ahmed',
    voucherType: 'membership',
    cashierName: 'Ahmed Hassan',
    transactionId: 'TXN-008-2024'
  }
];

// Income sources configuration
const incomeSourcesConfig = [
  {
    id: 'membership',
    name: 'Membership Revenue',
    icon: Dumbbell,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    iconColor: 'text-blue-600'
  },
  {
    id: 'services',
    name: 'Personal Training & Services',
    icon: User,
    color: 'bg-green-100 text-green-800 border-green-200',
    iconColor: 'text-green-600'
  },
  {
    id: 'retail',
    name: 'Merchandise & Retail',
    icon: ShoppingCart,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    iconColor: 'text-purple-600'
  },
  {
    id: 'events',
    name: 'Events & Workshops',
    icon: Calendar,
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    iconColor: 'text-orange-600'
  },
  {
    id: 'fnb',
    name: 'Cafe & F&B',
    icon: Coffee,
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    iconColor: 'text-amber-600'
  },
  {
    id: 'rental',
    name: 'Equipment Rental',
    icon: Package,
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    iconColor: 'text-teal-600'
  },
  {
    id: 'facilities',
    name: 'Facilities & Lockers',
    icon: Building2,
    color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    iconColor: 'text-indigo-600'
  }
];

// Members data for dropdown
const membersData = [
  { id: 'MEM-2024-001', name: 'Ahmed Hassan', membershipType: 'Premium', phone: '+971-50-123-4567' },
  { id: 'MEM-2024-002', name: 'Maria Santos', membershipType: 'Standard', phone: '+971-55-234-5678' },
  { id: 'MEM-2024-003', name: 'John Smith', membershipType: 'Premium', phone: '+971-50-345-6789' },
  { id: 'MEM-2024-004', name: 'Sarah Johnson', membershipType: 'Standard', phone: '+971-55-456-7890' },
  { id: 'MEM-2024-005', name: 'David Wilson', membershipType: 'Basic', phone: '+971-50-567-8901' },
  { id: 'MEM-2024-006', name: 'Emma Davis', membershipType: 'Premium', phone: '+971-55-678-9012' },
  { id: 'MEM-2024-007', name: 'Robert Brown', membershipType: 'Standard', phone: '+971-50-789-0123' }
];

export function ReceiptVoucher() {
  const [receipts, setReceipts] = useState(receiptVouchersData);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showAddReceipt, setShowAddReceipt] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // New receipt form state
  const [newReceipt, setNewReceipt] = useState({
    date: new Date().toISOString().split('T')[0],
    member: '',
    source: '',
    sourceCategory: '',
    amount: '',
    paymentMode: '',
    reference: '',
    notes: '',
    branch: 'Dubai Branch'
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSourceIcon = (sourceCategory: string) => {
    const source = incomeSourcesConfig.find(s => s.id === sourceCategory);
    return source ? source.icon : Receipt;
  };

  const getSourceColor = (sourceCategory: string) => {
    const source = incomeSourcesConfig.find(s => s.id === sourceCategory);
    return source ? source.color : 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getSourceIconColor = (sourceCategory: string) => {
    const source = incomeSourcesConfig.find(s => s.id === sourceCategory);
    return source ? source.iconColor : 'text-gray-600';
  };

  const getPaymentModeIcon = (mode: string) => {
    switch (mode) {
      case 'Cash':
        return <Banknote className="h-4 w-4 text-green-600" />;
      case 'Card':
        return <CreditCard className="h-4 w-4 text-blue-600" />;
      case 'Online Transfer':
        return <Smartphone className="h-4 w-4 text-purple-600" />;
      default:
        return <Wallet className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Timer className="h-4 w-4 text-amber-600" />;
      case 'partially-paid':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'partially-paid':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = 
      receipt.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.member.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.source.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.reference.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesSource = sourceFilter === 'all' || receipt.sourceCategory === sourceFilter;
    const matchesStatus = statusFilter === 'all' || receipt.status === statusFilter;
    const matchesPaymentMode = paymentModeFilter === 'all' || receipt.paymentMode === paymentModeFilter;
    const matchesBranch = branchFilter === 'all' || receipt.branch.toLowerCase().includes(branchFilter.toLowerCase());
    
    return matchesSearch && matchesSource && matchesStatus && matchesPaymentMode && matchesBranch;
  });

  // Calculate dashboard metrics
  const todayTotal = receipts
    .filter(r => r.date === new Date().toISOString().split('T')[0] && r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

  const thisMonthTotal = receipts
    .filter(r => r.date.startsWith('2024-01') && r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingAmount = receipts
    .filter(r => r.status === 'pending' || r.status === 'partially-paid')
    .reduce((sum, r) => sum + r.amount, 0);

  const completedToday = receipts
    .filter(r => r.date === new Date().toISOString().split('T')[0] && r.status === 'completed')
    .length;

  const handleAddReceipt = () => {
    if (!newReceipt.member || !newReceipt.source || !newReceipt.amount) {
      alert('Please fill in all required fields');
      return;
    }

    const nextId = `RV-2024-${String(receipts.length + 1).padStart(3, '0')}`;
    
    const receipt = {
      id: nextId,
      date: newReceipt.date,
      source: newReceipt.source,
      sourceCategory: newReceipt.sourceCategory,
      member: newReceipt.member,
      memberId: membersData.find(m => m.name === newReceipt.member)?.id || 'MEM-NEW',
      amount: parseFloat(newReceipt.amount),
      paymentMode: newReceipt.paymentMode,
      status: 'completed',
      branch: newReceipt.branch,
      reference: newReceipt.reference,
      createdBy: 'Current User',
      createdAt: new Date().toISOString(),
      notes: newReceipt.notes,
      attachments: [],
      approvedBy: 'System',
      voucherType: newReceipt.sourceCategory,
      cashierName: 'Current User',
      transactionId: `TXN-${String(receipts.length + 1).padStart(3, '0')}-2024`
    };

    setReceipts([...receipts, receipt]);
    setShowAddReceipt(false);
    
    // Reset form
    setNewReceipt({
      date: new Date().toISOString().split('T')[0],
      member: '',
      source: '',
      sourceCategory: '',
      amount: '',
      paymentMode: '',
      reference: '',
      notes: '',
      branch: 'Dubai Branch'
    });
  };

  const handleBulkAction = (action: string) => {
    console.log(`Performing ${action} on receipts:`, selectedReceipts);
    // Implementation for bulk actions
    setSelectedReceipts([]);
    setShowBulkActions(false);
  };

  const exportReceipts = (format: string) => {
    console.log(`Exporting receipts as ${format}`);
    alert(`Receipt vouchers will be exported as ${format.toUpperCase()}`);
  };

  const openReceiptDetails = (receipt: any) => {
    setSelectedReceipt(receipt);
    setShowReceiptDetails(true);
  };

  const toggleReceiptSelection = (receiptId: string) => {
    setSelectedReceipts(prev => 
      prev.includes(receiptId) 
        ? prev.filter(id => id !== receiptId)
        : [...prev, receiptId]
    );
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Receipt Vouchers</h1>
            <p className="text-gray-600 mt-1">
              Record and manage all money received from members, sales, and other income sources
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {selectedReceipts.length > 0 && (
              <DropdownMenu open={showBulkActions} onOpenChange={setShowBulkActions}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Package className="h-4 w-4 mr-2" />
                    Bulk Actions ({selectedReceipts.length})
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleBulkAction('print')}>
                    <Printer className="h-4 w-4 mr-2" />
                    Print Selected
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('email')}>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Email
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkAction('delete')}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <Button variant="outline" size="sm" onClick={() => exportReceipts('excel')}>
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportReceipts('pdf')}>
              <Printer className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={() => setShowAddReceipt(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Receipt
            </Button>
          </div>
        </div>

        {/* Dashboard Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">Today's Receipts</p>
                  <p className="text-2xl font-bold text-blue-800">{formatCurrency(todayTotal)}</p>
                  <p className="text-xs text-blue-600">{completedToday} transactions</p>
                </div>
                <div className="bg-blue-200 p-2 rounded-lg">
                  <DollarSign className="h-6 w-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">This Month</p>
                  <p className="text-2xl font-bold text-green-800">{formatCurrency(thisMonthTotal)}</p>
                  <p className="text-xs text-green-600">January 2024</p>
                </div>
                <div className="bg-green-200 p-2 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-amber-50 to-amber-100 border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-amber-700">Pending Amount</p>
                  <p className="text-2xl font-bold text-amber-800">{formatCurrency(pendingAmount)}</p>
                  <p className="text-xs text-amber-600">Awaiting payment</p>
                </div>
                <div className="bg-amber-200 p-2 rounded-lg">
                  <Timer className="h-6 w-6 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700">Total Receipts</p>
                  <p className="text-2xl font-bold text-purple-800">{filteredReceipts.length}</p>
                  <p className="text-xs text-purple-600">This period</p>
                </div>
                <div className="bg-purple-200 p-2 rounded-lg">
                  <Receipt className="h-6 w-6 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income Sources Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Income Source Distribution</CardTitle>
              <CardDescription>Revenue breakdown by source category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {incomeSourcesConfig.map((source) => {
                  const sourceReceipts = receipts.filter(r => r.sourceCategory === source.id && r.status === 'completed');
                  const sourceTotal = sourceReceipts.reduce((sum, r) => sum + r.amount, 0);
                  const IconComponent = source.icon;
                  
                  return (
                    <div key={source.id} className="text-center">
                      <div className={`p-3 rounded-lg inline-block mb-2 ${source.color}`}>
                        <IconComponent className={`h-6 w-6 ${source.iconColor}`} />
                      </div>
                      <div className="text-sm font-medium">{source.name}</div>
                      <div className="text-lg font-bold">{formatCurrency(sourceTotal)}</div>
                      <div className="text-xs text-gray-600">{sourceReceipts.length} receipts</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
              <CardDescription>Recent receipt overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Completed Today</span>
                <Badge className="bg-green-100 text-green-800">
                  {receipts.filter(r => r.date === new Date().toISOString().split('T')[0] && r.status === 'completed').length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Pending Approval</span>
                <Badge className="bg-amber-100 text-amber-800">
                  {receipts.filter(r => r.status === 'pending').length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Partially Paid</span>
                <Badge className="bg-orange-100 text-orange-800">
                  {receipts.filter(r => r.status === 'partially-paid').length}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Most Used Payment</span>
                <Badge variant="outline">Card</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5" />
              <span>Receipt Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search receipts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Date Range</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="month">This Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Income Source</Label>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {incomeSourcesConfig.map((source) => (
                      <SelectItem key={source.id} value={source.id}>
                        {source.name}
                      </SelectItem>
                    ))}
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
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partially-paid">Partially Paid</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <Select value={paymentModeFilter} onValueChange={setPaymentModeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payments</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                    <SelectItem value="Card">Card</SelectItem>
                    <SelectItem value="Online Transfer">Online Transfer</SelectItem>
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
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Vouchers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Receipt Vouchers</CardTitle>
            <CardDescription>
              All receipt vouchers and income records ({filteredReceipts.length} receipts)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedReceipts.length === filteredReceipts.length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedReceipts(filteredReceipts.map(r => r.id));
                          } else {
                            setSelectedReceipts([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>Voucher ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Amount (AED)</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts.map((receipt) => (
                    <TableRow key={receipt.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Checkbox
                          checked={selectedReceipts.includes(receipt.id)}
                          onCheckedChange={() => toggleReceiptSelection(receipt.id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <div className="bg-indigo-100 p-1 rounded">
                            <Receipt className="h-4 w-4 text-indigo-600" />
                          </div>
                          <span className="font-mono">{receipt.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span>{new Date(receipt.date).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {React.createElement(getSourceIcon(receipt.sourceCategory), {
                            className: `h-4 w-4 ${getSourceIconColor(receipt.sourceCategory)}`
                          })}
                          <div>
                            <div className="font-medium">{receipt.source}</div>
                            <div className="text-sm text-gray-600">{receipt.reference}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <div>
                            <div className="font-medium">{receipt.member}</div>
                            <div className="text-sm text-gray-600">{receipt.memberId}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-medium text-green-600">
                          {formatCurrency(receipt.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {getPaymentModeIcon(receipt.paymentMode)}
                          <span className="text-sm">{receipt.paymentMode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(receipt.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(receipt.status)}
                            <span className="capitalize">{receipt.status.replace('-', ' ')}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openReceiptDetails(receipt)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Details</TooltipContent>
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
                                Edit Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Printer className="h-4 w-4 mr-2" />
                                Print Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Mail className="h-4 w-4 mr-2" />
                                Email Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
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

        {/* Add Receipt Modal */}
        <Dialog open={showAddReceipt} onOpenChange={setShowAddReceipt}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Receipt className="h-5 w-5" />
                <span>Add New Receipt</span>
              </DialogTitle>
              <DialogDescription>
                Record a new income receipt and voucher entry
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Voucher Date *</Label>
                  <Input
                    type="date"
                    value={newReceipt.date}
                    onChange={(e) => setNewReceipt({...newReceipt, date: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={newReceipt.branch} onValueChange={(value) => setNewReceipt({...newReceipt, branch: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dubai Branch">Dubai Branch</SelectItem>
                      <SelectItem value="Marina Branch">Marina Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Member Name *</Label>
                  <Select value={newReceipt.member} onValueChange={(value) => setNewReceipt({...newReceipt, member: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select member" />
                    </SelectTrigger>
                    <SelectContent>
                      {membersData.map((member) => (
                        <SelectItem key={member.id} value={member.name}>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <div>
                              <div>{member.name}</div>
                              <div className="text-xs text-gray-600">{member.id} - {member.membershipType}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Income Source Category *</Label>
                  <Select 
                    value={newReceipt.sourceCategory} 
                    onValueChange={(value) => {
                      const source = incomeSourcesConfig.find(s => s.id === value);
                      setNewReceipt({
                        ...newReceipt, 
                        sourceCategory: value,
                        source: source?.name || ''
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select income source" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeSourcesConfig.map((source) => {
                        const IconComponent = source.icon;
                        return (
                          <SelectItem key={source.id} value={source.id}>
                            <div className="flex items-center space-x-2">
                              <IconComponent className={`h-4 w-4 ${source.iconColor}`} />
                              <span>{source.name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount (AED) *</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newReceipt.amount}
                    onChange={(e) => setNewReceipt({...newReceipt, amount: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Payment Mode *</Label>
                  <Select value={newReceipt.paymentMode} onValueChange={(value) => setNewReceipt({...newReceipt, paymentMode: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">
                        <div className="flex items-center space-x-2">
                          <Banknote className="h-4 w-4 text-green-600" />
                          <span>Cash</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Card">
                        <div className="flex items-center space-x-2">
                          <CreditCard className="h-4 w-4 text-blue-600" />
                          <span>Card</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Online Transfer">
                        <div className="flex items-center space-x-2">
                          <Smartphone className="h-4 w-4 text-purple-600" />
                          <span>Online Transfer</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reference / Description *</Label>
                <Input
                  placeholder="e.g., Monthly membership fee, Personal training session"
                  value={newReceipt.reference}
                  onChange={(e) => setNewReceipt({...newReceipt, reference: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Additional notes about this receipt..."
                  value={newReceipt.notes}
                  onChange={(e) => setNewReceipt({...newReceipt, notes: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 mb-1">Attach Receipt or Invoice</p>
                <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Paperclip className="h-4 w-4 mr-2" />
                  Choose File
                </Button>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddReceipt(false)}>
                  Cancel
                </Button>
                <Button variant="outline" onClick={handleAddReceipt}>
                  <Printer className="h-4 w-4 mr-2" />
                  Save & Print
                </Button>
                <Button onClick={handleAddReceipt}>
                  Save Receipt
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Receipt Details Sheet */}
        <Sheet open={showReceiptDetails} onOpenChange={setShowReceiptDetails}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            {selectedReceipt && (
              <>
                <SheetHeader>
                  <SheetTitle className="flex items-center space-x-2">
                    <Receipt className="h-5 w-5" />
                    <span>Receipt Details</span>
                  </SheetTitle>
                  <SheetDescription>
                    {selectedReceipt.id} - {selectedReceipt.source}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  {/* Receipt Overview */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedReceipt.amount)}</div>
                        <div className="text-sm text-gray-600">Receipt Amount</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4 text-center">
                        <Badge className={getStatusColor(selectedReceipt.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(selectedReceipt.status)}
                            <span className="capitalize">{selectedReceipt.status.replace('-', ' ')}</span>
                          </div>
                        </Badge>
                        <div className="text-sm text-gray-600 mt-1">Status</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Receipt Information */}
                  <div className="space-y-4">
                    <h3 className="font-semibold">Receipt Information</h3>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Voucher ID</div>
                        <div className="font-medium font-mono">{selectedReceipt.id}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Date</div>
                        <div className="font-medium">{new Date(selectedReceipt.date).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Member</div>
                        <div className="font-medium">{selectedReceipt.member}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Member ID</div>
                        <div className="font-medium">{selectedReceipt.memberId}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Payment Mode</div>
                        <div className="flex items-center space-x-1">
                          {getPaymentModeIcon(selectedReceipt.paymentMode)}
                          <span className="font-medium">{selectedReceipt.paymentMode}</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Branch</div>
                        <div className="font-medium">{selectedReceipt.branch}</div>
                      </div>
                    </div>
                  </div>

                  {/* Income Source */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">Income Source</h3>
                    <div className="flex items-center space-x-2">
                      {React.createElement(getSourceIcon(selectedReceipt.sourceCategory), {
                        className: `h-5 w-5 ${getSourceIconColor(selectedReceipt.sourceCategory)}`
                      })}
                      <div>
                        <div className="font-medium">{selectedReceipt.source}</div>
                        <div className="text-sm text-gray-600">{selectedReceipt.reference}</div>
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedReceipt.notes && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Notes</h3>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm">
                        {selectedReceipt.notes}
                      </div>
                    </div>
                  )}

                  {/* Audit Information */}
                  <div className="space-y-2">
                    <h3 className="font-semibold">Audit Trail</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">Created By</div>
                        <div className="font-medium">{selectedReceipt.createdBy}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Created At</div>
                        <div className="font-medium">{new Date(selectedReceipt.createdAt).toLocaleString()}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Approved By</div>
                        <div className="font-medium">{selectedReceipt.approvedBy}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Transaction ID</div>
                        <div className="font-medium font-mono">{selectedReceipt.transactionId}</div>
                      </div>
                    </div>
                  </div>

                  {/* Attachments */}
                  {selectedReceipt.attachments && selectedReceipt.attachments.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Attachments</h3>
                      <div className="space-y-2">
                        {selectedReceipt.attachments.map((attachment: string, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <Paperclip className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{attachment}</span>
                            </div>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-4 border-t">
                    <Button className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Receipt
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Mail className="h-4 w-4 mr-2" />
                      Email
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

