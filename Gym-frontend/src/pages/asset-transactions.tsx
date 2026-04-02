import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { Alert, AlertDescription } from "../components/ui/alert";
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

type AssetTransactionRecord = (typeof assetTransactionsData)[number];

type TransactionFormState = {
  type: string;
  assetId: string;
  transactionDate: string;
  value: string;
  location: string;
  assignedTo: string;
  vendor: string;
  invoiceNumber: string;
  description: string;
  notes: string;
  approvalRequired: boolean;
  status: string;
  approvedBy: string;
};

type DocumentAttachmentFormState = {
  name: string;
  category: string;
};

const transactionTypeOptions = [
  { value: 'purchase', label: 'Asset Purchase' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'transfer', label: 'Asset Transfer' },
  { value: 'assignment', label: 'Assign to Staff' },
  { value: 'depreciation', label: 'Depreciation Entry' },
  { value: 'disposal', label: 'Asset Disposal' },
  { value: 'sale', label: 'Asset Sale' },
  { value: 'insurance', label: 'Insurance Claim' },
  { value: 'return', label: 'Asset Return' },
  { value: 'revaluation', label: 'Revaluation' }
];

const transactionLocationOptions = Array.from(
  new Set([
    ...assetTransactionsData.map((transaction) => transaction.location),
    ...assetsData.map((asset) => asset.location),
  ])
);

const createTransactionFormState = (transaction?: AssetTransactionRecord | null): TransactionFormState => ({
  type: transaction?.type ?? '',
  assetId: transaction?.assetId ?? '',
  transactionDate: transaction?.transactionDate ?? new Date().toISOString().split('T')[0],
  value: transaction ? String(transaction.value) : '',
  location: transaction?.location ?? '',
  assignedTo: transaction?.assignedTo ?? '',
  vendor: transaction?.vendor ?? '',
  invoiceNumber: transaction?.invoiceNumber ?? '',
  description: transaction?.description ?? '',
  notes: transaction?.notes ?? '',
  approvalRequired: transaction ? transaction.status === 'pending' || transaction.status === 'in-review' : false,
  status: transaction?.status ?? 'completed',
  approvedBy: transaction?.approvedBy ?? 'System'
});

const createDocumentAttachmentForm = (): DocumentAttachmentFormState => ({
  name: '',
  category: 'supporting'
});

export function AssetTransactions() {
  const [transactions, setTransactions] = useState<AssetTransactionRecord[]>(assetTransactionsData);
  const [selectedTransaction, setSelectedTransaction] = useState<AssetTransactionRecord | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showEditTransaction, setShowEditTransaction] = useState(false);
  const [showTransactionDetails, setShowTransactionDetails] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showAttachDocuments, setShowAttachDocuments] = useState(false);
  const [selectedTransactionType, setSelectedTransactionType] = useState('');
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [reportTransaction, setReportTransaction] = useState<AssetTransactionRecord | null>(null);
  const [attachmentTransaction, setAttachmentTransaction] = useState<AssetTransactionRecord | null>(null);
  const [reportFormat, setReportFormat] = useState('pdf');
  const [reportDetailLevel, setReportDetailLevel] = useState('full');
  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [dateRange, setDateRange] = useState('all');

  // New transaction form state
  const [newTransaction, setNewTransaction] = useState<TransactionFormState>(createTransactionFormState());
  const [editTransactionForm, setEditTransactionForm] = useState<TransactionFormState>(createTransactionFormState());
  const [documentForm, setDocumentForm] = useState<DocumentAttachmentFormState>(createDocumentAttachmentForm());

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

  const formatTransactionType = (type: string) => {
    if (!type) return 'Unknown';
    return type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' ');
  };

  const locationOptions = Array.from(new Set(transactions.map((transaction) => transaction.location)));

  const matchesDateRange = (transactionDate: string) => {
    if (dateRange === 'all') return true;

    const current = new Date(transactionDate);
    const today = new Date();
    const start = new Date(today);

    switch (dateRange) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(today.getDate() - 7);
        break;
      case 'month':
        start.setMonth(today.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(today.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      default:
        return true;
    }

    return current >= start;
  };

  const filteredTransactions = transactions
    .filter(transaction => {
    const matchesSearch = 
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.assignedTo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.vendor || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter;
    const matchesType = typeFilter === 'all' || transaction.type === typeFilter;
    const matchesLocation = locationFilter === 'all' || transaction.location === locationFilter;
    const matchesDate = matchesDateRange(transaction.transactionDate);
    
    return matchesSearch && matchesStatus && matchesType && matchesLocation && matchesDate;
  })
    .sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

  const visibleSelectedTransactions = selectedTransactions.filter((id) =>
    filteredTransactions.some((transaction) => transaction.id === id)
  );

  const allVisibleTransactionsSelected =
    filteredTransactions.length > 0 &&
    visibleSelectedTransactions.length === filteredTransactions.length;

  const syncTransactionState = (updatedTransaction: AssetTransactionRecord) => {
    setTransactions((currentTransactions) =>
      currentTransactions.map((transaction) =>
        transaction.id === updatedTransaction.id ? updatedTransaction : transaction
      )
    );
    setSelectedTransaction((currentTransaction) =>
      currentTransaction?.id === updatedTransaction.id ? updatedTransaction : currentTransaction
    );
    setReportTransaction((currentTransaction) =>
      currentTransaction?.id === updatedTransaction.id ? updatedTransaction : currentTransaction
    );
    setAttachmentTransaction((currentTransaction) =>
      currentTransaction?.id === updatedTransaction.id ? updatedTransaction : currentTransaction
    );
  };

  const closeAddTransactionDialog = (open: boolean) => {
    setShowAddTransaction(open);
    if (!open) {
      setSelectedTransactionType('');
      setNewTransaction(createTransactionFormState());
    }
  };

  const closeEditTransactionDialog = (open: boolean) => {
    setShowEditTransaction(open);
    if (!open) {
      setEditingTransactionId(null);
      setEditTransactionForm(createTransactionFormState());
    }
  };

  const closeReportDialog = (open: boolean) => {
    setShowReportDialog(open);
    if (!open) {
      setReportTransaction(null);
      setReportFormat('pdf');
      setReportDetailLevel('full');
    }
  };

  const closeAttachDocumentsDialog = (open: boolean) => {
    setShowAttachDocuments(open);
    if (!open) {
      setAttachmentTransaction(null);
      setDocumentForm(createDocumentAttachmentForm());
    }
  };

  const openAddTransactionDialog = (type: string) => {
    setSelectedTransactionType(type);
    setNewTransaction({
      ...createTransactionFormState(),
      type
    });
    setShowAddTransaction(true);
  };

  const handleAddTransaction = () => {
    if (!newTransaction.type || !newTransaction.assetId || !newTransaction.description) {
      toast.error('Please fill in the required transaction fields.');
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

    setTransactions((currentTransactions) => [...currentTransactions, transaction]);
    toast.success('Mock transaction created successfully.', {
      description: `${transaction.id} is now visible in the ledger.`
    });
    closeAddTransactionDialog(false);
  };

  const exportTransactionLedger = () => {
    console.log('Exporting Asset Transaction Ledger...', filteredTransactions);
    toast.success('Ledger export prepared.', {
      description: `${filteredTransactions.length} transaction(s) included in the current view.`
    });
  };

  const openTransactionDetails = (transaction: AssetTransactionRecord) => {
    setSelectedTransaction(transaction);
    setShowTransactionDetails(true);
  };

  const openEditTransactionDialog = (transaction: AssetTransactionRecord) => {
    setEditingTransactionId(transaction.id);
    setEditTransactionForm(createTransactionFormState(transaction));
    setShowEditTransaction(true);
  };

  const handleSaveEditedTransaction = () => {
    if (!editingTransactionId) {
      return;
    }

    if (!editTransactionForm.type || !editTransactionForm.assetId || !editTransactionForm.description) {
      toast.error('Please complete the key transaction details before saving.');
      return;
    }

    const existingTransaction = transactions.find((transaction) => transaction.id === editingTransactionId);
    if (!existingTransaction) {
      return;
    }

    const updatedTransaction: AssetTransactionRecord = {
      ...existingTransaction,
      type: editTransactionForm.type,
      assetId: editTransactionForm.assetId,
      assetName: assetsData.find((asset) => asset.id === editTransactionForm.assetId)?.name || existingTransaction.assetName,
      transactionDate: editTransactionForm.transactionDate,
      value: parseFloat(editTransactionForm.value) || 0,
      status: editTransactionForm.status,
      location: editTransactionForm.location,
      assignedTo: editTransactionForm.assignedTo || null,
      vendor: editTransactionForm.vendor || null,
      invoiceNumber: editTransactionForm.invoiceNumber || null,
      description: editTransactionForm.description,
      approvedBy: editTransactionForm.approvedBy || existingTransaction.approvedBy,
      notes: editTransactionForm.notes,
    };

    syncTransactionState(updatedTransaction);
    toast.success('Transaction updated.', {
      description: `${updatedTransaction.id} now reflects the latest mock changes.`
    });
    closeEditTransactionDialog(false);
  };

  const openReportDialog = (transaction: AssetTransactionRecord) => {
    setReportTransaction(transaction);
    setShowReportDialog(true);
  };

  const handleGenerateTransactionReport = () => {
    if (!reportTransaction) {
      return;
    }

    toast.success('Mock report generated.', {
      description: `${reportTransaction.id} prepared as a ${reportFormat.toUpperCase()} ${reportDetailLevel} report.`
    });
    closeReportDialog(false);
  };

  const openAttachDocumentsDialog = (transaction: AssetTransactionRecord) => {
    setAttachmentTransaction(transaction);
    setDocumentForm(createDocumentAttachmentForm());
    setShowAttachDocuments(true);
  };

  const handleAttachDocument = () => {
    if (!attachmentTransaction) {
      return;
    }

    const trimmedName = documentForm.name.trim();
    if (!trimmedName) {
      toast.error('Enter a document name to attach.');
      return;
    }

    const normalizedDocumentName = trimmedName.includes('.')
      ? trimmedName
      : `${trimmedName.toLowerCase().replace(/\s+/g, '_')}.${documentForm.category === 'image' ? 'png' : 'pdf'}`;

    if (attachmentTransaction.linkedDocuments.includes(normalizedDocumentName)) {
      toast.error('That document is already linked to this transaction.');
      return;
    }

    const updatedTransaction: AssetTransactionRecord = {
      ...attachmentTransaction,
      linkedDocuments: [...attachmentTransaction.linkedDocuments, normalizedDocumentName]
    };

    syncTransactionState(updatedTransaction);
    toast.success('Mock document attached.', {
      description: `${normalizedDocumentName} was added to ${attachmentTransaction.id}.`
    });
    closeAttachDocumentsDialog(false);
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
                <DropdownMenuItem onClick={() => openAddTransactionDialog('purchase')}>
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Asset Purchase
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAddTransactionDialog('maintenance')}>
                  <Wrench className="h-4 w-4 mr-2" />
                  Schedule Maintenance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAddTransactionDialog('transfer')}>
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  Asset Transfer
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAddTransactionDialog('assignment')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Assign to Staff
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAddTransactionDialog('depreciation')}>
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Depreciation Entry
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAddTransactionDialog('disposal')}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Asset Disposal
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAddTransactionDialog('sale')}>
                  <DollarSign className="h-4 w-4 mr-2" />
                  Asset Sale
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openAddTransactionDialog('insurance')}>
                  <Shield className="h-4 w-4 mr-2" />
                  Insurance Claim
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* KPI Overview Cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Total Purchases</CardTitle>
              <div className="bg-green-50 p-2 rounded-lg">
                <ShoppingCart className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(
                  transactions
                    .filter(t => t.type === 'purchase' && t.status === 'completed')
                    .reduce((sum, t) => sum + t.value, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">Completed acquisition value</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Maintenance Costs</CardTitle>
              <div className="bg-amber-50 p-2 rounded-lg">
                <Wrench className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                {formatCurrency(
                  transactions
                    .filter(t => t.type === 'maintenance' && t.status === 'completed')
                    .reduce((sum, t) => sum + t.value, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">Closed service transactions</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Active Assignments</CardTitle>
              <div className="bg-blue-50 p-2 rounded-lg">
                <UserPlus className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {transactions.filter(t => t.type === 'assignment' && t.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">Assets currently with staff</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Pending Reviews</CardTitle>
              <div className="bg-purple-50 p-2 rounded-lg">
                <Timer className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {transactions.filter(t => t.status === 'pending' || t.status === 'in-review').length}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting approval or review</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className={cardShell}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions by ID, asset, vendor, or staff..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
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

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Status" />
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

                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-[190px]">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    {locationOptions.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[145px]">
                    <SelectValue placeholder="Date Range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 Days</SelectItem>
                    <SelectItem value="month">Last 30 Days</SelectItem>
                    <SelectItem value="quarter">Last Quarter</SelectItem>
                    <SelectItem value="year">Last Year</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setLocationFilter('all');
                    setDateRange('all');
                    setSelectedTransactions([]);
                  }}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {visibleSelectedTransactions.length > 0 && (
          <Alert className="border-primary/10 shadow-sm">
            <AlertDescription className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>{visibleSelectedTransactions.length} transactions selected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="ghost" onClick={exportTransactionLedger}>
                  Export Selected
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    toast.success('Bulk review mocked.', {
                      description: `${visibleSelectedTransactions.length} selected transaction(s) flagged for review.`
                    })
                  }
                >
                  Mark Reviewed
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedTransactions([])}>
                  Clear
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Transactions Table */}
        <Card className={cardShell}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Asset Transaction Ledger ({filteredTransactions.length})</span>
              <Badge variant="outline" className="text-xs font-normal">
                Complete lifecycle activity
              </Badge>
            </CardTitle>
            <CardDescription>
              Complete audit trail of purchases, transfers, assignments, and financial asset events.
            </CardDescription>
          </CardHeader>
          <CardContent>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={allVisibleTransactionsSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedTransactions(filteredTransactions.map((transaction) => transaction.id));
                          } else {
                            setSelectedTransactions([]);
                          }
                        }}
                      />
                    </TableHead>
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
                    <TableRow key={transaction.id} className="cursor-pointer hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <Checkbox
                          checked={selectedTransactions.includes(transaction.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedTransactions([...selectedTransactions, transaction.id]);
                            } else {
                              setSelectedTransactions(selectedTransactions.filter((id) => id !== transaction.id));
                            }
                          }}
                        />
                      </TableCell>
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
                              <DropdownMenuItem onClick={() => openEditTransactionDialog(transaction)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Transaction
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openReportDialog(transaction)}>
                                <FileText className="h-4 w-4 mr-2" />
                                Generate Report
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openAttachDocumentsDialog(transaction)}>
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
          </CardContent>
        </Card>

        {/* Add Transaction Modal */}
        <Dialog open={showAddTransaction} onOpenChange={closeAddTransactionDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <div className="bg-teal-100 p-2 rounded-lg">
                  {(newTransaction.type || selectedTransactionType) && getTransactionIcon(newTransaction.type || selectedTransactionType)}
                </div>
                <div>
                  <div>New Asset Transaction</div>
                  <div className="text-sm text-gray-600 font-normal">
                    {(newTransaction.type || selectedTransactionType) && `Type: ${formatTransactionType(newTransaction.type || selectedTransactionType)}`}
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
                    value={newTransaction.type}
                    onValueChange={(value) => setNewTransaction({...newTransaction, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Asset *</Label>
                  <Select
                    value={newTransaction.assetId}
                    onValueChange={(value) => {
                      const asset = assetsData.find((entry) => entry.id === value);
                      setNewTransaction({
                        ...newTransaction,
                        assetId: value,
                        location: newTransaction.location || asset?.location || ''
                      });
                    }}
                  >
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
                <Button variant="outline" onClick={() => closeAddTransactionDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddTransaction}>
                  Create Transaction
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEditTransaction} onOpenChange={closeEditTransactionDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-3">
                <div className="bg-blue-100 p-2 rounded-lg">
                  {getTransactionIcon(editTransactionForm.type || 'purchase')}
                </div>
                <div>
                  <div>Edit Transaction</div>
                  <div className="text-sm text-gray-600 font-normal">
                    {editingTransactionId ? `${editingTransactionId} - ${formatTransactionType(editTransactionForm.type)}` : 'Update mock transaction details'}
                  </div>
                </div>
              </DialogTitle>
              <DialogDescription>
                Adjust this transaction in the UI and immediately reflect the change in the mock ledger.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-50 border-primary/10">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Transaction</p>
                    <p className="mt-2 text-lg font-semibold">{editingTransactionId || 'Draft edit'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-primary/10">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Status</p>
                    <p className="mt-2 text-lg font-semibold capitalize">{editTransactionForm.status || 'completed'}</p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-50 border-primary/10">
                  <CardContent className="p-4">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Attached Docs</p>
                    <p className="mt-2 text-lg font-semibold">
                      {transactions.find((transaction) => transaction.id === editingTransactionId)?.linkedDocuments.length || 0}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Transaction Type *</Label>
                  <Select
                    value={editTransactionForm.type}
                    onValueChange={(value) => setEditTransactionForm({ ...editTransactionForm, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select transaction type" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Asset *</Label>
                  <Select
                    value={editTransactionForm.assetId}
                    onValueChange={(value) => {
                      const asset = assetsData.find((entry) => entry.id === value);
                      setEditTransactionForm({
                        ...editTransactionForm,
                        assetId: value,
                        location: editTransactionForm.location || asset?.location || ''
                      });
                    }}
                  >
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
                  <Label>Status</Label>
                  <Select
                    value={editTransactionForm.status}
                    onValueChange={(value) => setEditTransactionForm({ ...editTransactionForm, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in-review">In Review</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Transaction Date *</Label>
                  <Input
                    type="date"
                    value={editTransactionForm.transactionDate}
                    onChange={(e) => setEditTransactionForm({ ...editTransactionForm, transactionDate: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Value (AED)</Label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={editTransactionForm.value}
                    onChange={(e) => setEditTransactionForm({ ...editTransactionForm, value: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Approved By</Label>
                  <Input
                    placeholder="Approver name"
                    value={editTransactionForm.approvedBy}
                    onChange={(e) => setEditTransactionForm({ ...editTransactionForm, approvedBy: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <Select
                    value={editTransactionForm.location}
                    onValueChange={(value) => setEditTransactionForm({ ...editTransactionForm, location: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionLocationOptions.map((location) => (
                        <SelectItem key={location} value={location}>
                          {location}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Assigned To / Staff Member</Label>
                  <Select
                    value={editTransactionForm.assignedTo}
                    onValueChange={(value) => setEditTransactionForm({ ...editTransactionForm, assignedTo: value })}
                  >
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
                  <Select
                    value={editTransactionForm.vendor}
                    onValueChange={(value) => setEditTransactionForm({ ...editTransactionForm, vendor: value })}
                  >
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
                    value={editTransactionForm.invoiceNumber}
                    onChange={(e) => setEditTransactionForm({ ...editTransactionForm, invoiceNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description *</Label>
                <Textarea
                  placeholder="Describe the transaction details..."
                  value={editTransactionForm.description}
                  onChange={(e) => setEditTransactionForm({ ...editTransactionForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  placeholder="Any additional notes or comments..."
                  value={editTransactionForm.notes}
                  onChange={(e) => setEditTransactionForm({ ...editTransactionForm, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => closeEditTransactionDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEditedTransaction}>
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showReportDialog} onOpenChange={closeReportDialog}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
            {reportTransaction && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-3">
                    <div className="bg-emerald-100 p-2 rounded-lg">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <div>Generate Transaction Report</div>
                      <div className="text-sm text-gray-600 font-normal">
                        {reportTransaction.id} - {reportTransaction.assetName}
                      </div>
                    </div>
                  </DialogTitle>
                  <DialogDescription>
                    Review the mock report output before exporting a shareable transaction summary.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-6">
                  <Alert className="border-primary/10 bg-primary/5">
                    <AlertDescription>
                      This report flow is UI-only for now. Format choices and previews are mocked, but they reflect the transaction's live in-page data.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="border-primary/10 bg-slate-50">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Transaction Value</p>
                        <p className="mt-2 text-lg font-semibold">
                          {reportTransaction.value === 0 ? 'No financial impact' : formatCurrency(Math.abs(reportTransaction.value))}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-primary/10 bg-slate-50">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Linked Files</p>
                        <p className="mt-2 text-lg font-semibold">{reportTransaction.linkedDocuments.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-primary/10 bg-slate-50">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Approval Owner</p>
                        <p className="mt-2 text-lg font-semibold">{reportTransaction.approvedBy}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-primary/10 bg-slate-50">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Report Date</p>
                        <p className="mt-2 text-lg font-semibold">{new Date().toLocaleDateString()}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Report Format</Label>
                      <Select value={reportFormat} onValueChange={setReportFormat}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pdf">PDF Summary</SelectItem>
                          <SelectItem value="xlsx">Spreadsheet Pack</SelectItem>
                          <SelectItem value="csv">CSV Audit Extract</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Detail Level</Label>
                      <Select value={reportDetailLevel} onValueChange={setReportDetailLevel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select detail level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="summary">Summary</SelectItem>
                          <SelectItem value="full">Full Report</SelectItem>
                          <SelectItem value="audit">Audit Pack</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="documents">Documents</TabsTrigger>
                      <TabsTrigger value="audit">Audit Trail</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-primary/10">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Transaction Snapshot</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm">
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Type</span>
                              <span className="font-medium">{formatTransactionType(reportTransaction.type)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Status</span>
                              <Badge className={getStatusColor(reportTransaction.status)}>
                                {formatTransactionType(reportTransaction.status)}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Location</span>
                              <span className="font-medium text-right">{reportTransaction.location}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-muted-foreground">Created By</span>
                              <span className="font-medium">{reportTransaction.createdBy}</span>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="border-primary/10">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">Narrative</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                              {reportTransaction.description}
                            </div>
                            <div className="rounded-lg border border-dashed border-primary/10 p-3 text-sm text-muted-foreground">
                              {reportTransaction.notes || 'No additional notes have been recorded for this transaction.'}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </TabsContent>

                    <TabsContent value="documents" className="space-y-4">
                      <Card className="border-primary/10">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Included Documents</CardTitle>
                          <CardDescription>Supporting files that would be listed in the exported report.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {reportTransaction.linkedDocuments.length > 0 ? (
                            reportTransaction.linkedDocuments.map((doc, index) => (
                              <div key={index} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                                <div className="flex items-center gap-3">
                                  <Paperclip className="h-4 w-4 text-slate-500" />
                                  <span className="text-sm font-medium">{doc}</span>
                                </div>
                                <Badge variant="outline">Included</Badge>
                              </div>
                            ))
                          ) : (
                            <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-muted-foreground">
                              No documents linked yet. Attach files first to enrich the mock report pack.
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>

                    <TabsContent value="audit" className="space-y-4">
                      <Card className="border-primary/10">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Mock Audit Timeline</CardTitle>
                          <CardDescription>Key report events derived from the transaction state in this UI.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-medium">Transaction logged</p>
                                <p className="text-sm text-muted-foreground">{reportTransaction.createdBy} created this entry for {reportTransaction.assetName}.</p>
                              </div>
                              <span className="text-xs text-muted-foreground">{new Date(reportTransaction.transactionDate).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-medium">Approval checkpoint</p>
                                <p className="text-sm text-muted-foreground">Current approver on record: {reportTransaction.approvedBy}.</p>
                              </div>
                              <Badge className={getStatusColor(reportTransaction.status)}>{formatTransactionType(reportTransaction.status)}</Badge>
                            </div>
                          </div>
                          <div className="rounded-lg border border-slate-200 p-3">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="font-medium">Report package ready</p>
                                <p className="text-sm text-muted-foreground">
                                  The UI will generate a mock {reportFormat.toUpperCase()} package with {reportDetailLevel} detail.
                                </p>
                              </div>
                              <Clock className="h-4 w-4 text-slate-500" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => closeReportDialog(false)}>
                      Close
                    </Button>
                    <Button onClick={handleGenerateTransactionReport}>
                      Generate Mock Report
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showAttachDocuments} onOpenChange={closeAttachDocumentsDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {attachmentTransaction && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center space-x-3">
                    <div className="bg-amber-100 p-2 rounded-lg">
                      <Paperclip className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <div>Attach Documents</div>
                      <div className="text-sm text-gray-600 font-normal">
                        {attachmentTransaction.id} - {attachmentTransaction.assetName}
                      </div>
                    </div>
                  </DialogTitle>
                  <DialogDescription>
                    Add mock supporting files to this transaction so the details modal and reports reflect them.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-6">
                  <Alert className="border-primary/10 bg-primary/5">
                    <AlertDescription>
                      Attachments are mocked in the UI only. Saving here appends document names to the transaction's local state.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-primary/10 bg-slate-50">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Documents</p>
                        <p className="mt-2 text-lg font-semibold">{attachmentTransaction.linkedDocuments.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-primary/10 bg-slate-50">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
                        <p className="mt-2 text-lg font-semibold capitalize">{attachmentTransaction.status}</p>
                      </CardContent>
                    </Card>
                    <Card className="border-primary/10 bg-slate-50">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Reference</p>
                        <p className="mt-2 text-lg font-semibold">{attachmentTransaction.invoiceNumber || 'No invoice'}</p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Document Name *</Label>
                      <Input
                        placeholder="inspection_report"
                        value={documentForm.name}
                        onChange={(e) => setDocumentForm({ ...documentForm, name: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Document Category</Label>
                      <Select
                        value={documentForm.category}
                        onValueChange={(value) => setDocumentForm({ ...documentForm, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="supporting">Supporting PDF</SelectItem>
                          <SelectItem value="invoice">Invoice</SelectItem>
                          <SelectItem value="report">Service Report</SelectItem>
                          <SelectItem value="approval">Approval Note</SelectItem>
                          <SelectItem value="image">Image Evidence</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Suggested File Names</Label>
                    <div className="flex flex-wrap gap-2">
                      {['inspection_report', 'approval_note', 'service_invoice', 'handover_form'].map((suggestion) => (
                        <Button
                          key={suggestion}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDocumentForm({ ...documentForm, name: suggestion })}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <Card className="border-primary/10">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Linked Documents</CardTitle>
                      <CardDescription>Existing files already attached to this mock transaction.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {attachmentTransaction.linkedDocuments.length > 0 ? (
                        attachmentTransaction.linkedDocuments.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                            <div className="flex items-center gap-3">
                              <Paperclip className="h-4 w-4 text-slate-500" />
                              <span className="text-sm font-medium">{doc}</span>
                            </div>
                            <Badge variant="outline">Linked</Badge>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-lg border border-dashed border-slate-200 p-6 text-center text-sm text-muted-foreground">
                          No mock documents attached yet.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => closeAttachDocumentsDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAttachDocument}>
                      Attach Mock Document
                    </Button>
                  </div>
                </div>
              </>
            )}
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

