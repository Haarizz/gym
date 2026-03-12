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
  ShoppingCart,
  Wrench,
  ClipboardList,
  TrendingDown,
  Trash2,
  ArrowUpDown,
  DollarSign,
  UserPlus,
  RotateCcw,
  Shield,
  RefreshCw,
  Building2,
  Settings,
  Eye,
  Edit,
  MoreHorizontal,
  User,
  MapPin,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Timer,
  Package,
  Truck,
  Users,
  Banknote,
  Receipt,
  Activity,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Info,
  ExternalLink,
  Paperclip,
  Calendar as CalendarDays,
  Move,
  Zap,
  Award,
  Target,
  Gauge,
  Dumbbell,
  Monitor,
  Wifi,
  Car,
  Sofa,
  Smartphone,
  Laptop,
  ChevronDown,
  ChevronRight,
  X
} from 'lucide-react';

// Mock transaction data with comprehensive asset transaction types
const assetTransactionsData = [
  {
    id: 'TXN-001-2024',
    type: 'purchase',
    assetId: 'AST-001',
    assetName: 'Treadmill X Professional',
    transactionDate: '2023-02-12',
    value: 5500,
    status: 'completed',
    location: 'Dubai Branch – Cardio Zone',
    assignedTo: null,
    vendor: 'FitnessTech Solutions',
    invoiceNumber: 'INV-FTS-001',
    description: 'Purchase of new professional treadmill for cardio zone',
    approvedBy: 'Sarah Ahmed',
    createdBy: 'Ahmed Hassan',
    notes: 'Includes 2-year warranty and installation',
    linkedDocuments: ['purchase_order.pdf', 'invoice.pdf', 'warranty_cert.pdf']
  },
  {
    id: 'TXN-002-2024',
    type: 'maintenance',
    assetId: 'AST-001',
    assetName: 'Treadmill X Professional',
    transactionDate: '2023-08-20',
    value: 450,
    status: 'completed',
    location: 'Dubai Branch – Cardio Zone',
    assignedTo: 'Ahmed Hassan',
    vendor: 'FitnessTech Services',
    invoiceNumber: 'SRV-001-2023',
    description: 'Motor belt replacement and calibration',
    approvedBy: 'Sarah Ahmed',
    createdBy: 'Ahmed Hassan',
    notes: 'Preventive maintenance completed successfully',
    linkedDocuments: ['service_report.pdf', 'parts_invoice.pdf']
  },
  {
    id: 'TXN-003-2024',
    type: 'transfer',
    assetId: 'AST-002',
    assetName: 'Weight Plates Set Professional',
    transactionDate: '2023-09-15',
    value: 0,
    status: 'completed',
    location: 'Marina Branch – Free Weights',
    assignedTo: 'Mike Johnson',
    vendor: null,
    invoiceNumber: null,
    description: 'Transfer from Dubai Branch to Marina Branch',
    approvedBy: 'John Smith',
    createdBy: 'Mike Johnson',
    notes: 'Equipment transferred due to higher demand at Marina location',
    linkedDocuments: ['transfer_form.pdf']
  },
  {
    id: 'TXN-004-2024',
    type: 'assignment',
    assetId: 'AST-007',
    assetName: 'MacBook Pro 16" M3',
    transactionDate: '2023-11-20',
    value: 0,
    status: 'active',
    location: 'Dubai Branch – Admin Office',
    assignedTo: 'Sarah Ahmed',
    vendor: null,
    invoiceNumber: null,
    description: 'Laptop assigned to Fitness Manager',
    approvedBy: 'John Smith',
    createdBy: 'IT Support',
    notes: 'Employee acknowledgment signed digitally',
    linkedDocuments: ['assignment_form.pdf', 'digital_signature.pdf']
  },
  {
    id: 'TXN-005-2024',
    type: 'depreciation',
    assetId: 'AST-001',
    assetName: 'Treadmill X Professional',
    transactionDate: '2023-12-31',
    value: -550,
    status: 'completed',
    location: 'Dubai Branch – Cardio Zone',
    assignedTo: null,
    vendor: null,
    invoiceNumber: null,
    description: 'Annual depreciation calculation (10% straight-line)',
    approvedBy: 'Finance Team',
    createdBy: 'System',
    notes: 'Automated yearly depreciation entry',
    linkedDocuments: ['depreciation_schedule.pdf']
  },
  {
    id: 'TXN-006-2024',
    type: 'disposal',
    assetId: 'AST-006',
    assetName: 'CrossFit Rig Station',
    transactionDate: '2024-01-15',
    value: -8500,
    status: 'completed',
    location: 'Disposal Facility',
    assignedTo: null,
    vendor: 'Green Recycling UAE',
    invoiceNumber: 'DISP-001-2024',
    description: 'Equipment disposal due to structural safety concerns',
    approvedBy: 'John Smith',
    createdBy: 'Safety Officer',
    notes: 'Failed safety inspection, immediate disposal required',
    linkedDocuments: ['safety_report.pdf', 'disposal_certificate.pdf']
  },
  {
    id: 'TXN-007-2024',
    type: 'sale',
    assetId: 'AST-008',
    assetName: 'Rowing Machine Pro',
    transactionDate: '2024-01-25',
    value: 1200,
    status: 'pending',
    location: 'Warehouse',
    assignedTo: null,
    vendor: null,
    invoiceNumber: 'SALE-001-2024',
    description: 'Sale to Gold Gym Downtown - used equipment',
    approvedBy: 'Pending',
    createdBy: 'Sales Team',
    notes: 'Buyer inspection completed, payment pending',
    linkedDocuments: ['sale_agreement.pdf', 'inspection_report.pdf']
  },
  {
    id: 'TXN-008-2024',
    type: 'insurance',
    assetId: 'AST-009',
    assetName: 'HVAC System Central',
    transactionDate: '2024-02-10',
    value: 2500,
    status: 'in-review',
    location: 'Dubai Branch – Mechanical Room',
    assignedTo: null,
    vendor: 'Emirates Insurance',
    invoiceNumber: 'CLAIM-2024-001',
    description: 'Insurance claim for water damage repair',
    approvedBy: 'Pending Review',
    createdBy: 'Facilities Team',
    notes: 'Water leak caused compressor damage, claim submitted',
    linkedDocuments: ['damage_photos.pdf', 'claim_form.pdf', 'repair_estimate.pdf']
  }
];

// Assets data for dropdowns
const assetsData = [
  { id: 'AST-001', name: 'Treadmill X Professional', category: 'Cardio', location: 'Dubai Branch – Cardio Zone' },
  { id: 'AST-002', name: 'Weight Plates Set Professional', category: 'Strength', location: 'Marina Branch – Free Weights' },
  { id: 'AST-003', name: 'Elliptical Machine Elite', category: 'Cardio', location: 'Dubai Branch – Cardio Zone' },
  { id: 'AST-004', name: 'Dumbbell Set 5-50kg', category: 'Strength', location: 'Dubai Branch – Free Weights' },
  { id: 'AST-005', name: 'Reception Desk Oak Wood', category: 'Furniture', location: 'Dubai Branch – Reception' },
  { id: 'AST-006', name: 'CrossFit Rig Station', category: 'Functional', location: 'Disposed' },
  { id: 'AST-007', name: 'MacBook Pro 16" M3', category: 'Technology', location: 'Dubai Branch – Admin Office' },
  { id: 'AST-008', name: 'Rowing Machine Pro', category: 'Cardio', location: 'Warehouse' },
  { id: 'AST-009', name: 'HVAC System Central', category: 'Facility', location: 'Dubai Branch – Mechanical Room' }
];

// Staff data for assignments
const staffData = [
  { id: 'STAFF-001', name: 'Sarah Ahmed', role: 'Fitness Manager', department: 'Operations' },
  { id: 'STAFF-002', name: 'Ahmed Hassan', role: 'Maintenance Technician', department: 'Facilities' },
  { id: 'STAFF-003', name: 'Mike Johnson', role: 'Personal Trainer', department: 'Training' },
  { id: 'STAFF-004', name: 'John Smith', role: 'General Manager', department: 'Management' },
  { id: 'STAFF-005', name: 'Lisa Wang', role: 'Receptionist', department: 'Front Desk' }
];

// Vendor data for purchases and services
const vendorData = [
  { id: 'VEN-001', name: 'FitnessTech Solutions', type: 'Equipment Supplier' },
  { id: 'VEN-002', name: 'FitnessTech Services', type: 'Maintenance Provider' },
  { id: 'VEN-003', name: 'Green Recycling UAE', type: 'Disposal Service' },
  { id: 'VEN-004', name: 'Emirates Insurance', type: 'Insurance Provider' },
  { id: 'VEN-005', name: 'Tech Solutions UAE', type: 'IT Equipment' }
];

export function AssetTransactions() {
  const [transactions, setTransactions] = useState(assetTransactionsData);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [selectedTransactionType, setSelectedTransactionType] = useState('');
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  // New transaction form state
  const [newTransaction, setNewTransaction] = useState({
    type: '',
    assetId: '',
    transactionDate: new Date().toISOString().split('T')[0],
    value: '',
    location: '',
    assignedTo: '',
    vendor: '',
    invoiceNumber: '',
    description: '',
    notes: '',
    approvalRequired: false
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return <ShoppingCart className="h-5 w-5 text-green-600" />;
      case 'maintenance':
        return <Wrench className="h-5 w-5 text-orange-600" />;
      case 'transfer':
        return <ArrowUpDown className="h-5 w-5 text-blue-600" />;
      case 'assignment':
        return <UserPlus className="h-5 w-5 text-purple-600" />;
      case 'depreciation':
        return <TrendingDown className="h-5 w-5 text-red-600" />;
      case 'disposal':
        return <Trash2 className="h-5 w-5 text-gray-600" />;
      case 'sale':
        return <DollarSign className="h-5 w-5 text-green-700" />;
      case 'insurance':
        return <Shield className="h-5 w-5 text-indigo-600" />;
      case 'return':
        return <RotateCcw className="h-5 w-5 text-yellow-600" />;
      case 'revaluation':
        return <RefreshCw className="h-5 w-5 text-cyan-600" />;
      default:
        return <Activity className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Timer className="h-4 w-4 text-yellow-600" />;
      case 'in-review':
        return <AlertCircle className="h-4 w-4 text-blue-600" />;
      case 'active':
        return <Activity className="h-4 w-4 text-teal-600" />;
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
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in-review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'active':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Cardio':
        return <Activity className="h-4 w-4 text-red-600" />;
      case 'Strength':
        return <Dumbbell className="h-4 w-4 text-blue-600" />;
      case 'Technology':
        return <Monitor className="h-4 w-4 text-purple-600" />;
      case 'Furniture':
        return <Sofa className="h-4 w-4 text-orange-600" />;
      case 'Facility':
        return <Building2 className="h-4 w-4 text-gray-600" />;
      case 'Functional':
        return <Target className="h-4 w-4 text-green-600" />;
      default:
        return <Package className="h-4 w-4 text-gray-600" />;
    }
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = 
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    const matchesLocation = locationFilter === 'all' || 
      transaction.location.toLowerCase().includes(locationFilter.toLowerCase());
    
    return matchesSearch && matchesStatus && matchesType && matchesLocation;
  });

  const handleAddTransaction = () => {
    if (!newTransaction.type || !newTransaction.assetId || !newTransaction.description) {
      alert('Please fill in all required fields');
      return;
    }

    const transaction = {
      id: `TXN-${String(transactions.length + 1).padStart(3, '0')}-2024`,
      type: newTransaction.type,
      assetId: newTransaction.assetId,
      assetName: assetsData.find(a => a.id === newTransaction.assetId)?.name || '',
      transactionDate: newTransaction.transactionDate,
      value: parseFloat(newTransaction.value) || 0,
      status: newTransaction.approvalRequired ? 'pending' : 'completed',
      location: newTransaction.location,
      assignedTo: newTransaction.assignedTo || null,
      vendor: newTransaction.vendor || null,
      invoiceNumber: newTransaction.invoiceNumber || null,
      description: newTransaction.description,
      approvedBy: newTransaction.approvalRequired ? 'Pending' : 'System',
      createdBy: 'Current User',
      notes: newTransaction.notes,
      linkedDocuments: []
    };

    setTransactions([...transactions, transaction]);
    setShowAddTransaction(false);
    
    // Reset form
    setNewTransaction({
      type: '',
      assetId: '',
      transactionDate: new Date().toISOString().split('T')[0],
      value: '',
      location: '',
      assignedTo: '',
      vendor: '',
      invoiceNumber: '',
      description: '',
      notes: '',
      approvalRequired: false
    });
  };

  const exportTransactionLedger = () => {
    // Mock export functionality
    console.log('Exporting Asset Transaction Ledger...', filteredTransactions);
    alert('Asset Transaction Ledger will be downloaded shortly.');
  };

  const openTransactionDetails = (transaction: any) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Asset Transactions</h1>
            <p className="text-gray-600 mt-1">
              Complete lifecycle transaction management and audit trail for all asset activities
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={exportTransactionLedger}>
              <Download className="h-4 w-4 mr-2" />
              Export Ledger
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Transaction
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => { setSelectedTransactionType('purchase'); setShowAddTransaction(true); }}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Asset Purchase
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedTransactionType('maintenance'); setShowAddTransaction(true); }}>
                  <Wrench className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedTransactionType('transfer'); setShowAddTransaction(true); }}>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Asset Transfer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedTransactionType('assignment'); setShowAddTransaction(true); }}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to Staff
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedTransactionType('depreciation'); setShowAddTransaction(true); }}>
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Depreciation Entry
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedTransactionType('disposal'); setShowAddTransaction(true); }}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Asset Disposal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedTransactionType('sale'); setShowAddTransaction(true); }}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Asset Sale
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedTransactionType('insurance'); setShowAddTransaction(true); }}>
                  <Shield className="h-4 w-4 mr-2" />
                  Insurance Claim
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* KPI Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-700">Total Purchases</p>
                  <p className="text-2xl font-bold text-green-800">
                    {formatCurrency(
                      transactions
                        .filter(t => t.type === 'purchase' && t.status === 'completed')
                        .reduce((sum, t) => sum + t.value, 0)
                    )}
                  </p>
                </div>
                <div className="bg-green-200 p-2 rounded-lg">
                  <ShoppingCart className="h-6 w-6 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-700">Maintenance Costs</p>
                  <p className="text-2xl font-bold text-orange-800">
                    {formatCurrency(
                      transactions
                        .filter(t => t.type === 'maintenance' && t.status === 'completed')
                        .reduce((sum, t) => sum + t.value, 0)
                    )}
                  </p>
                </div>
                <div className="bg-orange-200 p-2 rounded-lg">
                  <Wrench className="h-6 w-6 text-orange-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">Active Assignments</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {transactions.filter(t => t.type === 'assignment' && t.status === 'active').length}
                  </p>
                </div>
                <div className="bg-blue-200 p-2 rounded-lg">
                  <UserPlus className="h-6 w-6 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-700">Pending Reviews</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {transactions.filter(t => t.status === 'pending' || t.status === 'in-review').length}
                  </p>
                </div>
                <div className="bg-purple-200 p-2 rounded-lg">
                  <Timer className="h-6 w-6 text-purple-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
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
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="depreciation">Depreciation</SelectItem>
                    <SelectItem value="disposal">Disposal</SelectItem>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
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
                    <SelectItem value="in-review">In Review</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location</Label>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="dubai">Dubai Branch</SelectItem>
                    <SelectItem value="marina">Marina Branch</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="admin">Admin Office</SelectItem>
                  </SelectContent>
                </Select>
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
                    <SelectItem value="quarter">This Quarter</SelectItem>
                    <SelectItem value="year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle>Asset Transaction Ledger</CardTitle>
            <CardDescription>
              Complete audit trail of all asset lifecycle transactions ({filteredTransactions.length} records)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Assigned To</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <div className="bg-teal-100 p-1 rounded">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <span>{transaction.id}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="capitalize">{transaction.type.replace('-', ' ')}</div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.assetName}</div>
                          <div className="text-sm text-gray-600">{transaction.assetId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <CalendarIcon className="h-4 w-4 text-gray-400" />
                          <span>{new Date(transaction.transactionDate).toLocaleDateString()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.value !== 0 && (
                          <span className={`font-medium ${transaction.value > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transaction.value > 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.value))}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(transaction.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(transaction.status)}
                            <span className="capitalize">{transaction.status}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-sm">{transaction.location}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {transaction.assignedTo ? (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3 text-gray-400" />
                            <span className="text-sm">{transaction.assignedTo}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => openTransactionDetails(transaction)}
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
                                Edit Transaction
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Report
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Paperclip className="h-4 w-4 mr-2" />
                                Attach Documents
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

        {/* Add Transaction Modal */}
        <Dialog open={showAddTransaction} onOpenChange={setShowAddTransaction}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <div className="bg-teal-100 p-2 rounded-lg">
                  {selectedTransactionType && getTransactionIcon(selectedTransactionType)}
                </div>
                <div>
                  <div>New Asset Transaction</div>
                  <div className="text-sm text-gray-600 font-normal">
                    {selectedTransactionType && `Type: ${selectedTransactionType.charAt(0).toUpperCase() + selectedTransactionType.slice(1).replace('-', ' ')}`}
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription>
                Create a new asset transaction record for complete lifecycle tracking
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Transaction Type *</Label>
                  <Select 
                    value={newTransaction.type || selectedTransactionType} 
                    onValueChange={(value) => setNewTransaction({...newTransaction, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="purchase">Asset Purchase</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="transfer">Asset Transfer</SelectItem>
                      <SelectItem value="assignment">Assign to Staff</SelectItem>
                      <SelectItem value="depreciation">Depreciation Entry</SelectItem>
                      <SelectItem value="disposal">Asset Disposal</SelectItem>
                      <SelectItem value="sale">Asset Sale</SelectItem>
                      <SelectItem value="insurance">Insurance Claim</SelectItem>
                      <SelectItem value="return">Asset Return</SelectItem>
                      <SelectItem value="revaluation">Revaluation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Asset *</Label>
                  <Select value={newTransaction.assetId} onValueChange={(value) => setNewTransaction({...newTransaction, assetId: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select asset" />
                    </SelectTrigger>
                    <SelectContent>
                      {assetsData.map((asset) => (
                        <SelectItem key={asset.id} value={asset.id}>
                          <div className="flex items-center space-x-2">
                            {getCategoryIcon(asset.category)}
                            <span>{asset.name} ({asset.id})</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Transaction Date *</Label>
                  <Input
                    type="date"
                    value={newTransaction.transactionDate}
                    onChange={(e) => setNewTransaction({...newTransaction, transactionDate: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Value (AED)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={newTransaction.value}
                    onChange={(e) => setNewTransaction({...newTransaction, value: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select value={newTransaction.location} onValueChange={(value) => setNewTransaction({...newTransaction, location: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dubai Branch – Cardio Zone">Dubai Branch – Cardio Zone</SelectItem>
                      <SelectItem value="Dubai Branch – Free Weights">Dubai Branch – Free Weights</SelectItem>
                      <SelectItem value="Dubai Branch – Reception">Dubai Branch – Reception</SelectItem>
                      <SelectItem value="Dubai Branch – Admin Office">Dubai Branch – Admin Office</SelectItem>
                      <SelectItem value="Marina Branch – Cardio Zone">Marina Branch – Cardio Zone</SelectItem>
                      <SelectItem value="Marina Branch – Free Weights">Marina Branch – Free Weights</SelectItem>
                      <SelectItem value="Warehouse">Warehouse</SelectItem>
                      <SelectItem value="Disposal Facility">Disposal Facility</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assigned To / Staff Member</Label>
                  <Select value={newTransaction.assignedTo} onValueChange={(value) => setNewTransaction({...newTransaction, assignedTo: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {staffData.map((staff) => (
                        <SelectItem key={staff.id} value={staff.name}>
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4" />
                            <span>{staff.name} - {staff.role}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Vendor / Service Provider</Label>
                  <Select value={newTransaction.vendor} onValueChange={(value) => setNewTransaction({...newTransaction, vendor: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendorData.map((vendor) => (
                        <SelectItem key={vendor.id} value={vendor.name}>
                          <div className="flex items-center space-x-2">
                            <Building2 className="h-4 w-4" />
                            <span>{vendor.name} - {vendor.type}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Invoice / Reference Number</Label>
                  <Input
                    placeholder="INV-2024-001"
                    value={newTransaction.invoiceNumber}
                    onChange={(e) => setNewTransaction({...newTransaction, invoiceNumber: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Describe the transaction details..."
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Any additional notes or comments..."
                  value={newTransaction.notes}
                  onChange={(e) => setNewTransaction({...newTransaction, notes: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="approval-required"
                  checked={newTransaction.approvalRequired}
                  onCheckedChange={(checked) => setNewTransaction({...newTransaction, approvalRequired: !!checked})}
                />
                <Label htmlFor="approval-required">Requires Management Approval</Label>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowAddTransaction(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTransaction}>
                  Create Transaction
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transaction Details Modal */}
        <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedTransaction && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-3">
                    <div className="bg-teal-100 p-2 rounded-lg">
                      {getTransactionIcon(selectedTransaction.type)}
                    </div>
                    <div>
                      <div>Transaction Details</div>
                      <div className="text-sm text-gray-600 font-normal">
                        {selectedTransaction.id} - {selectedTransaction.type.charAt(0).toUpperCase() + selectedTransaction.type.slice(1).replace('-', ' ')}
                      </div>
                    </div>
                  </DialogTitle>
                  <DialogDescription>
                    Complete information about this asset transaction
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-6">
                  {/* Transaction Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-gray-50">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-800">{selectedTransaction.id}</div>
                          <div className="text-sm text-gray-600">Transaction ID</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-50">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-800">
                            {new Date(selectedTransaction.transactionDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600">Transaction Date</div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-50">
                      <CardContent className="p-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-800">
                            {selectedTransaction.value !== 0 ? (
                              <span className={selectedTransaction.value > 0 ? 'text-green-600' : 'text-red-600'}>
                                {selectedTransaction.value > 0 ? '+' : ''}{formatCurrency(Math.abs(selectedTransaction.value))}
                              </span>
                            ) : '—'}
                          </div>
                          <div className="text-sm text-gray-600">Transaction Value</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Transaction Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label>Asset Information</Label>
                        <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                          <div className="font-medium">{selectedTransaction.assetName}</div>
                          <div className="text-sm text-gray-600">{selectedTransaction.assetId}</div>
                        </div>
                      </div>

                      <div>
                        <Label>Transaction Type</Label>
                        <div className="mt-1 flex items-center space-x-2">
                          {getTransactionIcon(selectedTransaction.type)}
                          <span className="capitalize">{selectedTransaction.type.replace('-', ' ')}</span>
                        </div>
                      </div>

                      <div>
                        <Label>Status</Label>
                        <div className="mt-1">
                          <Badge className={getStatusColor(selectedTransaction.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(selectedTransaction.status)}
                              <span className="capitalize">{selectedTransaction.status}</span>
                            </div>
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <Label>Location</Label>
                        <div className="mt-1 flex items-center space-x-1">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{selectedTransaction.location}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Assigned To</Label>
                        <div className="mt-1">
                          {selectedTransaction.assignedTo ? (
                            <div className="flex items-center space-x-1">
                              <User className="h-4 w-4 text-gray-400" />
                              <span>{selectedTransaction.assignedTo}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">Not assigned</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label>Vendor / Service Provider</Label>
                        <div className="mt-1">
                          {selectedTransaction.vendor ? (
                            <div className="flex items-center space-x-1">
                              <Building2 className="h-4 w-4 text-gray-400" />
                              <span>{selectedTransaction.vendor}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">No vendor</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label>Invoice Number</Label>
                        <div className="mt-1">
                          {selectedTransaction.invoiceNumber ? (
                            <div className="flex items-center space-x-1">
                              <Receipt className="h-4 w-4 text-gray-400" />
                              <span>{selectedTransaction.invoiceNumber}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500">No invoice</span>
                          )}
                        </div>
                      </div>

                      <div>
                        <Label>Approved By</Label>
                        <div className="mt-1">
                          <span>{selectedTransaction.approvedBy}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Description</Label>
                    <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                      {selectedTransaction.description}
                    </div>
                  </div>

                  {selectedTransaction.notes && (
                    <div>
                      <Label>Additional Notes</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                        {selectedTransaction.notes}
                      </div>
                    </div>
                  )}

                  {selectedTransaction.linkedDocuments && selectedTransaction.linkedDocuments.length > 0 && (
                    <div>
                      <Label>Linked Documents</Label>
                      <div className="mt-1 space-y-2">
                        {selectedTransaction.linkedDocuments.map((doc: string, index: number) => (
                          <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                            <Paperclip className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{doc}</span>
                            <Button variant="ghost" size="sm" className="ml-auto">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

