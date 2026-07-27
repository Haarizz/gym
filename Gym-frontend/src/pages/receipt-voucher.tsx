import React, { useState, useEffect, useCallback } from 'react';
import { useCurrency, CurrencyValue } from '../utils/currency';
import { toast } from 'sonner';
import { receiptVoucherService, type ReceiptVoucher as RVType } from '../utils/supabase/receipt-voucher-service';
import { SplitPaymentFields, isSplitPaymentValid, buildSplitPaymentBreakdown } from '../components/shared/split-payment-fields';
import type { SplitPaymentValue } from '../components/shared/split-payment-fields';
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
  BookOpen,
  FileCheck,
  Split
} from 'lucide-react';


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
    icon: CalendarDays,
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
  const { currencyCode } = useCurrency();
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReceipts = useCallback(async (filters?: {
    search?: string; status?: string; branch?: string; sourceCategory?: string;
  }) => {
    try {
      setLoading(true);
      const data = await receiptVoucherService.getReceiptVouchers(filters ?? {});
      // Map API response to the shape expected by existing UI (member, id as voucherNo)
      setReceipts(data.map((rv: RVType) => ({
        id: rv.voucherNo,
        _dbId: rv.id,
        date: rv.date,
        source: rv.source,
        sourceCategory: rv.sourceCategory,
        member: rv.memberName,
        memberId: rv.memberId ? String(rv.memberId) : '',
        amount: rv.amount,
        paymentMode: rv.paymentMode,
        paymentBreakdown: rv.paymentBreakdown ?? [],
        status: rv.status,
        branch: rv.branch,
        reference: rv.reference,
        createdBy: rv.createdAt ?? '',
        createdAt: rv.createdAt ?? '',
        notes: rv.notes,
        attachments: [],
        approvedBy: rv.approvedBy ?? '',
        voucherType: rv.voucherType ?? rv.sourceCategory,
        cashierName: '',
        transactionId: rv.transactionId ?? '',
      })));
    } catch (err: any) {
      toast.error(err.message || 'Failed to load receipt vouchers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadReceipts(); }, [loadReceipts]);

  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);
  const [showAddReceipt, setShowAddReceipt] = useState(false);
  const [showReceiptDetails, setShowReceiptDetails] = useState(false);
  const [showEditReceipt, setShowEditReceipt] = useState(false);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedReceipts, setSelectedReceipts] = useState<string[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(undefined);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentModeFilter, setPaymentModeFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  const emptyForm = {
    date: new Date().toISOString().split('T')[0],
    member: '',
    source: '',
    sourceCategory: '',
    amount: '',
    paymentMode: '',
    reference: '',
    notes: '',
    branch: 'Dubai Branch',
    transactionId: '',
    approvedBy: '',
    status: 'completed',
  };

  // New receipt form state
  const [newReceipt, setNewReceipt] = useState({ ...emptyForm });

  // Edit receipt form state
  const [editForm, setEditForm] = useState({ ...emptyForm });

  // Mixed payment split state (shared between Add and Edit dialogs)
  const [newReceiptSplit, setNewReceiptSplit] = useState<SplitPaymentValue>({ cash: 0, card: 0, cheque: 0 });
  const [newReceiptChequeRef, setNewReceiptChequeRef] = useState('');
  const [editReceiptSplit, setEditReceiptSplit] = useState<SplitPaymentValue>({ cash: 0, card: 0, cheque: 0 });
  const [editReceiptChequeRef, setEditReceiptChequeRef] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
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
      case 'Cheque':
        return <FileCheck className="h-4 w-4 text-gray-600" />;
      case 'Mixed':
        return <Split className="h-4 w-4 text-orange-600" />;
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

  const calendarDateStr = calendarDate ? calendarDate.toISOString().split('T')[0] : '';
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
    const matchesCalendar = !calendarDateStr || receipt.date === calendarDateStr;
    
    return matchesSearch && matchesSource && matchesStatus && matchesPaymentMode && matchesBranch && matchesCalendar;
  });

  // Calculate dashboard metrics
  const today = new Date().toISOString().split('T')[0];
  const currentMonthPrefix = today.substring(0, 7); // "YYYY-MM"

  const todayTotal = receipts
    .filter(r => r.date === today && r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

  const thisMonthTotal = receipts
    .filter(r => r.date.startsWith(currentMonthPrefix) && r.status === 'completed')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingAmount = receipts
    .filter(r => r.status === 'pending' || r.status === 'partially-paid')
    .reduce((sum, r) => sum + r.amount, 0);

  const completedToday = receipts
    .filter(r => r.date === today && r.status === 'completed')
    .length;

  const printDate = selectedReceipt?.date
    ? new Date(selectedReceipt.date).toLocaleDateString()
    : '-';
  const printCreatedAt = selectedReceipt?.createdAt
    ? new Date(selectedReceipt.createdAt).toLocaleString()
    : '-';

  const applyFilters = () => {
    loadReceipts({
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      branch: branchFilter !== 'all' ? branchFilter : undefined,
      sourceCategory: sourceFilter !== 'all' ? sourceFilter : undefined,
    });
  };

  const handleAddReceipt = async () => {
    if (!newReceipt.member || !newReceipt.source || !newReceipt.amount || !newReceipt.paymentMode) {
      toast.error('Please fill in all required fields');
      return;
    }
    const amount = parseFloat(newReceipt.amount);
    if (newReceipt.paymentMode === 'Mixed' && !isSplitPaymentValid(newReceiptSplit, amount)) {
      toast.error('Split payment amounts must add up to the total amount');
      return;
    }
    try {
      await receiptVoucherService.createReceiptVoucher({
        date: newReceipt.date,
        source: newReceipt.source,
        sourceCategory: newReceipt.sourceCategory,
        memberName: newReceipt.member,
        amount,
        paymentMode: newReceipt.paymentMode,
        paymentBreakdown: newReceipt.paymentMode === 'Mixed'
          ? buildSplitPaymentBreakdown(newReceiptSplit, newReceiptChequeRef || undefined)
          : undefined,
        status: newReceipt.status || 'completed',
        branch: newReceipt.branch,
        reference: newReceipt.reference,
        notes: newReceipt.notes,
        transactionId: newReceipt.transactionId || undefined,
        approvedBy: newReceipt.approvedBy || undefined,
        voucherType: newReceipt.sourceCategory,
      });
      toast.success('Receipt voucher created');
      await loadReceipts();
      setShowAddReceipt(false);
      setNewReceipt({ ...emptyForm });
      setNewReceiptSplit({ cash: 0, card: 0, cheque: 0 });
      setNewReceiptChequeRef('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to create receipt voucher');
    }
  };

  const openEditReceipt = (receipt: any) => {
    setEditForm({
      date: receipt.date,
      member: receipt.member,
      source: receipt.source,
      sourceCategory: receipt.sourceCategory,
      amount: String(receipt.amount),
      paymentMode: receipt.paymentMode,
      reference: receipt.reference,
      notes: receipt.notes,
      branch: receipt.branch,
      transactionId: receipt.transactionId || '',
      approvedBy: receipt.approvedBy || '',
      status: receipt.status,
    });
    const legs: { method: string; amount: number; reference?: string }[] = receipt.paymentBreakdown || [];
    const chequeLeg = legs.find(l => l.method === 'Cheque');
    setEditReceiptSplit({
      cash: legs.find(l => l.method === 'Cash')?.amount || 0,
      card: legs.find(l => l.method === 'Card')?.amount || 0,
      cheque: chequeLeg?.amount || 0,
    });
    setEditReceiptChequeRef(chequeLeg?.reference || '');
    setSelectedReceipt(receipt);
    setShowEditReceipt(true);
  };

  const handleEditReceipt = async () => {
    if (!editForm.member || !editForm.source || !editForm.amount || !editForm.paymentMode) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!selectedReceipt?._dbId) return;
    const editAmount = parseFloat(editForm.amount);
    if (editForm.paymentMode === 'Mixed' && !isSplitPaymentValid(editReceiptSplit, editAmount)) {
      toast.error('Split payment amounts must add up to the total amount');
      return;
    }
    try {
      await receiptVoucherService.updateReceiptVoucher(selectedReceipt._dbId, {
        date: editForm.date,
        source: editForm.source,
        sourceCategory: editForm.sourceCategory,
        memberName: editForm.member,
        amount: editAmount,
        paymentMode: editForm.paymentMode,
        paymentBreakdown: editForm.paymentMode === 'Mixed'
          ? buildSplitPaymentBreakdown(editReceiptSplit, editReceiptChequeRef || undefined)
          : undefined,
        status: editForm.status,
        branch: editForm.branch,
        reference: editForm.reference,
        notes: editForm.notes,
        transactionId: editForm.transactionId || undefined,
        approvedBy: editForm.approvedBy || undefined,
        voucherType: editForm.sourceCategory,
      });
      toast.success('Receipt voucher updated');
      await loadReceipts();
      setShowEditReceipt(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update receipt voucher');
    }
  };

  const handleDeleteReceipt = async (dbId: string) => {
    try {
      await receiptVoucherService.deleteReceiptVoucher(dbId);
      toast.success('Receipt voucher deleted');
      setDeleteConfirmId(null);
      setShowReceiptDetails(false);
      await loadReceipts();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete receipt voucher');
    }
  };

  const handleStatusUpdate = async (receipt: any, newStatus: string) => {
    if (!receipt._dbId) return;
    try {
      await receiptVoucherService.updateStatus(receipt._dbId, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      await loadReceipts();
      // Refresh the selected receipt view
      setSelectedReceipt((prev: any) => prev ? { ...prev, status: newStatus } : null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status');
    }
  };

  const handleBulkAction = (action: string) => {
    if (action === 'delete') {
      Promise.all(
        selectedReceipts.map(id => {
          const r = receipts.find(r => r.id === id);
          return r?._dbId ? receiptVoucherService.deleteReceiptVoucher(r._dbId) : Promise.resolve();
        })
      ).then(() => {
        toast.success(`Deleted ${selectedReceipts.length} receipt(s)`);
        loadReceipts();
      }).catch(() => toast.error('Failed to delete some receipts'));
    }
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
      <style>{`
        @media print {
          body { background: #fff; }
          body * { visibility: hidden; }
          .print-receipt, .print-receipt * { visibility: visible !important; }
          .print-receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 24px;
            display: block !important;
          }
        }
        .print-receipt { display: none; color: #0f172a; font-family: Arial, sans-serif; }
        .print-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #e2e8f0;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .print-brand h1 { margin: 0; font-size: 22px; font-weight: 700; }
        .print-brand p { margin: 4px 0 0; font-size: 12px; color: #64748b; }
        .print-badge {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #f8fafc;
          color: #0f172a;
        }
        .print-meta {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin: 16px 0;
        }
        .print-meta .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .print-meta .value { font-size: 14px; font-weight: 600; margin-top: 4px; }
        .print-card {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 12px;
          background: #fff;
        }
        .print-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }
        .print-amount {
          border: 2px solid #0f172a;
          border-radius: 10px;
          padding: 14px;
          text-align: right;
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 16px;
        }
        .print-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }
        .print-table th {
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #64748b;
          padding: 8px 6px;
          border-bottom: 1px solid #e2e8f0;
        }
        .print-table td {
          padding: 10px 6px;
          font-size: 13px;
          border-bottom: 1px solid #f1f5f9;
        }
        .print-footer {
          margin-top: 16px;
          font-size: 11px;
          color: #64748b;
          text-align: center;
        }
      `}</style>

      <div className="print-receipt">
        <div className="print-header">
          <div className="print-brand">
            <h1>GymBios</h1>
            <p>Receipt Voucher</p>
          </div>
          <div className="print-badge">{selectedReceipt?.status ?? 'N/A'}</div>
        </div>

        <div className="print-meta">
          <div>
            <div className="label">Voucher ID</div>
            <div className="value">{selectedReceipt?.id ?? '-'}</div>
          </div>
          <div>
            <div className="label">Date</div>
            <div className="value">{printDate}</div>
          </div>
          <div>
            <div className="label">Branch</div>
            <div className="value">{selectedReceipt?.branch ?? '-'}</div>
          </div>
        </div>

        <div className="print-grid">
          <div className="print-card">
            <div className="label">Member</div>
            <div className="value">{selectedReceipt?.member ?? '-'}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              ID: {selectedReceipt?.memberId ?? '-'}
            </div>
          </div>
          <div className="print-card">
            <div className="label">Payment</div>
            <div className="value">{selectedReceipt?.paymentMode ?? '-'}</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              Reference: {selectedReceipt?.reference ?? '-'}
            </div>
          </div>
        </div>

        <div className="print-amount">
          {selectedReceipt ? formatCurrency(selectedReceipt.amount) : `${currencyCode} 0`}
        </div>

        <div className="print-card">
          <div className="label">Receipt Details</div>
          <table className="print-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Category</th>
                <th>Transaction</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{selectedReceipt?.source ?? '-'}</td>
                <td>{selectedReceipt?.sourceCategory ?? '-'}</td>
                <td>{selectedReceipt?.transactionId ?? '-'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="print-card" style={{ marginTop: '12px' }}>
          <div className="label">Notes</div>
          <div style={{ fontSize: '12px', marginTop: '6px' }}>
            {selectedReceipt?.notes ?? '—'}
          </div>
        </div>

        <div className="print-footer">
          Created at: {printCreatedAt}
        </div>
      </div>

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
            <Button size="sm" onClick={() => setShowAddReceipt(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Receipt
            </Button>
          </div>
        </div>

        {/* Dashboard Preview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Today's Receipts</CardTitle>
              <div className="bg-blue-50 p-2 rounded-lg">
                <DollarSign className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-700"><CurrencyValue amount={todayTotal} /></div>
              <p className="text-xs text-muted-foreground mt-1">{completedToday} transactions</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">This Month</CardTitle>
              <div className="bg-green-50 p-2 rounded-lg">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-700"><CurrencyValue amount={thisMonthTotal} /></div>
              <p className="text-xs text-muted-foreground mt-1">
                {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Pending Amount</CardTitle>
              <div className="bg-amber-50 p-2 rounded-lg">
                <Timer className="h-4 w-4 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-700"><CurrencyValue amount={pendingAmount} /></div>
              <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Total Receipts</CardTitle>
              <div className="bg-purple-50 p-2 rounded-lg">
                <Receipt className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-700">{filteredReceipts.length}</div>
              <p className="text-xs text-muted-foreground mt-1">This period</p>
            </CardContent>
          </Card>
        </div>

        {/* Income Sources Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 bg-white border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Income Source Distribution</CardTitle>
              <CardDescription>Revenue breakdown by source category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                      <div className="text-lg font-bold"><CurrencyValue amount={sourceTotal} /></div>
                      <div className="text-xs text-gray-600">{sourceReceipts.length} receipts</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-sm self-start">
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
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Sort by Date</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setCalendarDate(undefined)}
                    disabled={!calendarDate}
                  >
                    Clear
                  </Button>
                </div>
                <div className="w-full rounded-lg border border-gray-200 bg-white p-2 shadow-sm">
                  <Calendar
                    mode="single"
                    selected={calendarDate}
                    onSelect={setCalendarDate}
                    className="w-full [&_table]:w-full [&_table]:table-fixed [&_caption]:w-full"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-white border-0 shadow-sm">
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
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
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
            <div className="flex justify-end mt-4 space-x-2">
              <Button variant="outline" onClick={() => {
                setSearchTerm(''); setStatusFilter('all'); setSourceFilter('all');
                setPaymentModeFilter('all'); setBranchFilter('all');
                loadReceipts();
              }}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={applyFilters}>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Receipt Vouchers Table */}
        <Card className="bg-white border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Receipt Vouchers</CardTitle>
            <CardDescription>
              All receipt vouchers and income records ({filteredReceipts.length} receipts)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-lg bg-white">
              <Table className="min-w-full">
                <TableHeader className="bg-slate-50">
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
                    <TableHead className="text-right">Amount ({currencyCode})</TableHead>
                    <TableHead>Payment Mode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        <RefreshCw className="h-5 w-5 animate-spin inline mr-2" />
                        Loading receipt vouchers...
                      </TableCell>
                    </TableRow>
                  ) : filteredReceipts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No receipt vouchers found.
                      </TableCell>
                    </TableRow>
                  ) : filteredReceipts.map((receipt, index) => (
                    <TableRow key={receipt.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-slate-50/80 transition-colors`}>
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
                          <CurrencyValue amount={receipt.amount} />
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          {getPaymentModeIcon(receipt.paymentMode)}
                          <span className="text-sm">{receipt.paymentMode}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Badge className={getStatusColor(receipt.status)}>
                            <div className="flex items-center space-x-1">
                              {getStatusIcon(receipt.status)}
                              <span className="capitalize">{receipt.status.replace('-', ' ')}</span>
                            </div>
                          </Badge>
                          {receipt.status === 'completed' && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  variant="outline"
                                  className={
                                    receipt.journalVoucherId
                                      ? "text-xs text-green-700 border-green-300"
                                      : "text-xs text-amber-700 border-amber-300"
                                  }
                                >
                                  {receipt.journalVoucherId ? "Posted" : "Not posted"}
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>
                                {receipt.journalVoucherId
                                  ? `Posted to the general ledger (JV #${receipt.journalVoucherId})`
                                  : "Completed before ledger posting was enabled for Receipt Vouchers — not reflected in account balances or reports."}
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
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
                              <DropdownMenuItem onClick={() => openEditReceipt(receipt)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Receipt
                              </DropdownMenuItem>
                              {receipt.status === 'draft' || receipt.status === 'pending' ? (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(receipt, 'completed')}>
                                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                  Mark Completed
                                </DropdownMenuItem>
                              ) : null}
                              {receipt.status !== 'cancelled' ? (
                                <DropdownMenuItem onClick={() => handleStatusUpdate(receipt, 'cancelled')}>
                                  <XCircle className="h-4 w-4 mr-2 text-orange-500" />
                                  Cancel
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem onClick={() => { openReceiptDetails(receipt); setTimeout(() => window.print(), 300); }}>
                                <Printer className="h-4 w-4 mr-2" />
                                Print Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => setDeleteConfirmId(receipt._dbId)}
                              >
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
                  <Label>Amount ({currencyCode}) *</Label>
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
                      <SelectItem value="Cheque">
                        <div className="flex items-center space-x-2">
                          <FileCheck className="h-4 w-4 text-gray-600" />
                          <span>Cheque</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="Mixed">
                        <div className="flex items-center space-x-2">
                          <Split className="h-4 w-4 text-orange-600" />
                          <span>Mixed</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {newReceipt.paymentMode === 'Mixed' && (
                <SplitPaymentFields
                  total={parseFloat(newReceipt.amount) || 0}
                  value={newReceiptSplit}
                  onChange={setNewReceiptSplit}
                  chequeReference={newReceiptChequeRef}
                  onChequeReferenceChange={setNewReceiptChequeRef}
                  currencyCode={currencyCode}
                />
              )}

              <div className="space-y-2">
                <Label>Reference / Description *</Label>
                <Input
                  placeholder="e.g., Monthly membership fee, Personal training session"
                  value={newReceipt.reference}
                  onChange={(e) => setNewReceipt({...newReceipt, reference: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={newReceipt.status} onValueChange={(v) => setNewReceipt({...newReceipt, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="partially-paid">Partially Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Transaction ID</Label>
                  <Input
                    placeholder="TXN-XXXXXX"
                    value={newReceipt.transactionId}
                    onChange={(e) => setNewReceipt({...newReceipt, transactionId: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Approved By</Label>
                  <Input
                    placeholder="Approver name"
                    value={newReceipt.approvedBy}
                    onChange={(e) => setNewReceipt({...newReceipt, approvedBy: e.target.value})}
                  />
                </div>
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

        {/* Edit Receipt Dialog */}
        <Dialog open={showEditReceipt} onOpenChange={setShowEditReceipt}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Edit className="h-5 w-5" />
                <span>Edit Receipt — {selectedReceipt?.id}</span>
              </DialogTitle>
              <DialogDescription>Update receipt voucher details</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Voucher Date *</Label>
                  <Input type="date" value={editForm.date} onChange={(e) => setEditForm({...editForm, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Branch</Label>
                  <Select value={editForm.branch} onValueChange={(v) => setEditForm({...editForm, branch: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Dubai Branch">Dubai Branch</SelectItem>
                      <SelectItem value="Marina Branch">Marina Branch</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Member Name *</Label>
                  <Input placeholder="Member name" value={editForm.member} onChange={(e) => setEditForm({...editForm, member: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Income Source Category *</Label>
                  <Select value={editForm.sourceCategory} onValueChange={(v) => {
                    const src = incomeSourcesConfig.find(s => s.id === v);
                    setEditForm({...editForm, sourceCategory: v, source: src?.name || ''});
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select income source" /></SelectTrigger>
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
                  <Label>Amount ({currencyCode}) *</Label>
                  <Input type="number" placeholder="0.00" value={editForm.amount} onChange={(e) => setEditForm({...editForm, amount: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Payment Mode *</Label>
                  <Select value={editForm.paymentMode} onValueChange={(v) => setEditForm({...editForm, paymentMode: v})}>
                    <SelectTrigger><SelectValue placeholder="Select payment mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash"><div className="flex items-center space-x-2"><Banknote className="h-4 w-4 text-green-600" /><span>Cash</span></div></SelectItem>
                      <SelectItem value="Card"><div className="flex items-center space-x-2"><CreditCard className="h-4 w-4 text-blue-600" /><span>Card</span></div></SelectItem>
                      <SelectItem value="Online Transfer"><div className="flex items-center space-x-2"><Smartphone className="h-4 w-4 text-purple-600" /><span>Online Transfer</span></div></SelectItem>
                      <SelectItem value="Cheque"><div className="flex items-center space-x-2"><FileCheck className="h-4 w-4 text-gray-600" /><span>Cheque</span></div></SelectItem>
                      <SelectItem value="Mixed"><div className="flex items-center space-x-2"><Split className="h-4 w-4 text-orange-600" /><span>Mixed</span></div></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {editForm.paymentMode === 'Mixed' && (
                <SplitPaymentFields
                  total={parseFloat(editForm.amount) || 0}
                  value={editReceiptSplit}
                  onChange={setEditReceiptSplit}
                  chequeReference={editReceiptChequeRef}
                  onChequeReferenceChange={setEditReceiptChequeRef}
                  currencyCode={currencyCode}
                />
              )}

              <div className="space-y-2">
                <Label>Reference / Description *</Label>
                <Input placeholder="Reference or description" value={editForm.reference} onChange={(e) => setEditForm({...editForm, reference: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={editForm.status} onValueChange={(v) => setEditForm({...editForm, status: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="partially-paid">Partially Paid</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Transaction ID</Label>
                  <Input placeholder="TXN-XXXXXX" value={editForm.transactionId} onChange={(e) => setEditForm({...editForm, transactionId: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Approved By</Label>
                  <Input placeholder="Approver name" value={editForm.approvedBy} onChange={(e) => setEditForm({...editForm, approvedBy: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea placeholder="Additional notes..." value={editForm.notes} onChange={(e) => setEditForm({...editForm, notes: e.target.value})} rows={3} />
              </div>
              <div className="flex items-center justify-end space-x-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowEditReceipt(false)}>Cancel</Button>
                <Button onClick={handleEditReceipt}>Save Changes</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2 text-red-600">
                <Trash2 className="h-5 w-5" />
                <span>Delete Receipt?</span>
              </DialogTitle>
              <DialogDescription>
                This action cannot be undone. The receipt voucher will be permanently deleted.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end space-x-3 pt-4">
              <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
              <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteReceipt(deleteConfirmId)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Receipt Details Sheet */}
        <Sheet open={showReceiptDetails} onOpenChange={setShowReceiptDetails}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-gray-50 p-0">
            {selectedReceipt && (
              <div className="min-h-full">
                <div className="px-6 py-5 bg-white border-b">
                  <SheetHeader>
                    <SheetTitle className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-purple-50">
                        <Receipt className="h-5 w-5 text-purple-600" />
                      </div>
                      <span>Receipt Details</span>
                    </SheetTitle>
                    <SheetDescription>
                      {selectedReceipt.id} - {selectedReceipt.source}
                    </SheetDescription>
                  </SheetHeader>
                </div>

                <div className="px-6 py-6 space-y-6">
                  {/* Receipt Overview */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-primary/10 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-600"><CurrencyValue amount={selectedReceipt.amount} /></div>
                        <div className="text-sm text-gray-600">Receipt Amount</div>
                      </CardContent>
                    </Card>

                    <Card className="border-primary/10 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <Badge className={getStatusColor(selectedReceipt.status)}>
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(selectedReceipt.status)}
                            <span className="capitalize">{selectedReceipt.status.replace('-', ' ')}</span>
                          </div>
                        </Badge>
                        <div className="text-sm text-gray-600 mt-1">Status</div>
                        {selectedReceipt.status === 'completed' && (
                          <div className={`text-xs mt-1 ${selectedReceipt.journalVoucherId ? 'text-green-700' : 'text-amber-700'}`}>
                            {selectedReceipt.journalVoucherId
                              ? `Posted to ledger (JV #${selectedReceipt.journalVoucherId})`
                              : 'Not posted to ledger'}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Receipt Information */}
                  <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 space-y-4">
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
                  <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 space-y-2">
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
                    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 space-y-2">
                      <h3 className="font-semibold">Notes</h3>
                      <div className="p-3 bg-gray-50 rounded-lg text-sm">
                        {selectedReceipt.notes}
                      </div>
                    </div>
                  )}

                  {/* Audit Information */}
                  <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 space-y-2">
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
                    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4 space-y-2">
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

                  {/* Status Actions */}
                  {(selectedReceipt.status === 'draft' || selectedReceipt.status === 'pending') && (
                    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                      <div className="flex space-x-2">
                        <Button
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleStatusUpdate(selectedReceipt, 'completed')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark Completed
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                          onClick={() => handleStatusUpdate(selectedReceipt, 'cancelled')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Receipt
                        </Button>
                      </div>
                    </div>
                  )}
                  {selectedReceipt.status === 'completed' && (
                    <div className="rounded-xl bg-white border border-gray-100 shadow-sm p-4">
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          className="flex-1 border-orange-300 text-orange-600 hover:bg-orange-50"
                          onClick={() => handleStatusUpdate(selectedReceipt, 'cancelled')}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Receipt
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Main Actions */}
                  <div className="flex space-x-2 pt-2 border-t border-gray-200">
                    <Button
                      className="flex-1"
                      onClick={() => { setShowReceiptDetails(false); openEditReceipt(selectedReceipt); }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Receipt
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={() => window.print()}>
                      <Printer className="h-4 w-4 mr-2" />
                      Print
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => { setShowReceiptDetails(false); setDeleteConfirmId(selectedReceipt._dbId); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

