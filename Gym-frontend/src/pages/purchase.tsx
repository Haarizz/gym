import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import {
  EMPTY_SPLIT_PAYMENT, EMPTY_SPLIT_DETAILS, isSplitPaymentDetailsValid, buildSplitPaymentBreakdown,
  CARD_TYPE_OPTIONS
} from "../components/shared/split-payment-fields";
import type { SplitPaymentValue, SplitPaymentDetails } from "../components/shared/split-payment-fields";
import { accountHeadsService, AccountHead } from "../utils/supabase/account-heads-service";

// Maps this page's Payment Method select value to the SplitPaymentValue key
// so Credit Card/Cheque/Bank Transfer's method-specific details can be
// validated/built by reusing the same helpers Mixed Payment legs use
// elsewhere in the app.
const PURCHASE_METHOD_TO_LEG_KEY: Partial<Record<string, keyof SplitPaymentValue>> = {
  cash: 'cash', credit_card: 'card', cheque: 'cheque', bank_transfer: 'bankTransfer'
};
import {
  ShoppingBag,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Truck,
  FileText,
  Receipt,
  Mail,
  Phone,
  MapPin,
  User,
  Building,
  DollarSign,
  Hash,
  X,
  Save,
  RefreshCw,
  PrinterIcon,
  Loader2,
  TrendingUp,
  ShoppingCart,
  Users,
  AlertTriangle,
  Star,
  Settings,
  CreditCard,
  Wallet,
  BarChart3,
  PieChart,
  LineChart,
  Zap,
  Box,
} from 'lucide-react';
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "../components/ui/utils";
import {
  LineChart as RechartsLineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  supplierBillService,
  SupplierBill,
  SupplierBillRequest,
} from '../utils/supabase/supplier-bill-service';
import { purchaseService, Supplier } from '../utils/supabase/purchase-service';
import { productsService, Product, Warehouse } from '../utils/supabase/products-service';

// â”€â”€ Default bill form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type BillFormItem = {
  productId?: number;
  productName: string;
  productSku: string;
  unitOfMeasure: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  taxPercent: number;
  notes: string;
};

const defaultBillForm = () => ({
  supplierId: 0,
  purchaseNumber: '',
  invoiceNumber: '',
  referenceNumber: '',
  billDate: format(new Date(), 'yyyy-MM-dd'),
  dueDate: '',
  priority: 'MEDIUM',
  paymentStatus: 'UNPAID',
  shippingCost: 0,
  warehouseId: undefined as number | undefined,
  notes: '',
  receivedBy: '',
  items: [] as BillFormItem[],
});

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CHART_COLORS = ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#d97706', '#0891b2'];

const getStatusBadge = (status: string) => {
  const cfg: Record<string, { label: string; className: string }> = {
    DRAFT:     { label: 'Draft',     className: 'bg-gray-100 text-gray-800' },
    CONFIRMED: { label: 'Confirmed', className: 'bg-blue-100 text-blue-800' },
    CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
  };
  const c = cfg[status] ?? cfg.DRAFT;
  return <Badge className={c.className}>{c.label}</Badge>;
};

const getPaymentBadge = (status: string) => {
  const cfg: Record<string, { label: string; className: string }> = {
    UNPAID:  { label: 'Unpaid',  className: 'bg-orange-100 text-orange-800' },
    PARTIAL: { label: 'Partial', className: 'bg-yellow-100 text-yellow-800' },
    PAID:    { label: 'Paid',    className: 'bg-green-100 text-green-800' },
  };
  const c = cfg[status] ?? cfg.UNPAID;
  return <Badge variant="outline" className={c.className}>{c.label}</Badge>;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  const { currencyCode } = useCurrency();
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border rounded-lg p-3 shadow-lg">
        <p className="font-medium">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number'
              ? `${currencyCode} ${entry.value.toLocaleString()}`
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function Purchase() {
  const { currencyCode } = useCurrency();
  // â”€â”€ Data state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [bills, setBills]             = useState<SupplierBill[]>([]);
  const [suppliers, setSuppliers]     = useState<Supplier[]>([]);
  const [warehouses, setWarehouses]   = useState<Warehouse[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalBills, setTotalBills]   = useState(0);

  // â”€â”€ Filter state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [searchTerm, setSearchTerm]         = useState('');
  const [statusFilter, setStatusFilter]     = useState('');
  // â”€â”€ Bill form / dialogs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showBillForm, setShowBillForm]                 = useState(false);
  const [editingBill, setEditingBill]                   = useState<SupplierBill | null>(null);
  const [showBillDetail, setShowBillDetail]             = useState(false);
  const [selectedBill, setSelectedBill]                 = useState<SupplierBill | null>(null);
  const [showPaymentDialog, setShowPaymentDialog]       = useState(false);
  const [payingBill, setPayingBill]                     = useState<SupplierBill | null>(null);
  const [payAmount, setPayAmount]                       = useState('');
  const [payMethod, setPayMethod]                       = useState('cash');
  const [payMethodDetails, setPayMethodDetails]         = useState<SplitPaymentDetails>(EMPTY_SPLIT_DETAILS);
  const [payNotes, setPayNotes]                         = useState('');
  const [confirmingId, setConfirmingId]                 = useState<number | null>(null);
  const [bankAccounts, setBankAccounts]                 = useState<AccountHead[]>([]);
  useEffect(() => {
    accountHeadsService.getBankAccounts()
      .then(setBankAccounts)
      .catch(err => console.error('Failed to load bank accounts:', err));
  }, []);

  // â”€â”€ Bill form data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [billForm, setBillForm] = useState(defaultBillForm);

  // â”€â”€ Supplier form â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [showSupplierForm, setShowSupplierForm]     = useState(false);
  const [editingSupplier, setEditingSupplier]       = useState<Supplier | null>(null);
  const [savingSupplier, setSavingSupplier]         = useState(false);
  const [supplierForm, setSupplierForm] = useState<Partial<Supplier>>({
    name: '', contactPerson: '', email: '', phone: '',
    address: '', city: '', country: '', taxId: '',
    paymentTerms: '', creditLimit: 0, isActive: true, notes: '',
  });

  // â”€â”€ Product search (for bill form line items) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [apiProducts, setApiProducts]       = useState<Product[]>([]);
  const [productSearch, setProductSearch]   = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);

  // â”€â”€ Load data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [billsPage, suppliersData, productsData, warehousesData] = await Promise.all([
        supplierBillService.getBills({
          page,
          size: 20,
          status: statusFilter || undefined,
          search: searchTerm || undefined,
        }),
        purchaseService.getAllSuppliers(),
        productsService.getProducts({ size: 200 }),
        productsService.getActiveWarehouses(),
      ]);
      setBills(billsPage.bills);
      setTotalPages(billsPage.pagination.totalPages);
      setTotalBills(billsPage.pagination.total);
      setSuppliers(suppliersData);
      setApiProducts(productsData.products ?? []);
      setWarehouses(warehousesData);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchTerm]);

  useEffect(() => { loadData(); }, [loadData]);

  // â”€â”€ Bill form helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addItem = (preset?: Partial<BillFormItem>) => {
    setBillForm(prev => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productName: '',
          productSku: '',
          unitOfMeasure: 'pcs',
          quantity: 1,
          unitPrice: 0,
          discountPercent: 0,
          taxPercent: 0,
          notes: '',
          ...preset,
        },
      ],
    }));
  };

  const removeItem = (idx: number) => {
    setBillForm(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== idx) }));
  };

  const updateItem = (idx: number, updates: Partial<BillFormItem>) => {
    setBillForm(prev => ({
      ...prev,
      items: prev.items.map((item, i) => (i === idx ? { ...item, ...updates } : item)),
    }));
  };

  // â”€â”€ Live totals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const billTotals = useMemo(() => {
    const subtotal = billForm.items.reduce((sum, item) => {
      const lineBase = item.quantity * item.unitPrice;
      const afterDiscount = lineBase * (1 - item.discountPercent / 100);
      return sum + afterDiscount;
    }, 0);

    const discountAmount = billForm.items.reduce((sum, item) => {
      const lineBase = item.quantity * item.unitPrice;
      return sum + lineBase * (item.discountPercent / 100);
    }, 0);

    const taxAmount = billForm.items.reduce((sum, item) => {
      const lineBase = item.quantity * item.unitPrice;
      const afterDiscount = lineBase * (1 - item.discountPercent / 100);
      return sum + afterDiscount * (item.taxPercent / 100);
    }, 0);

    const total = subtotal + taxAmount + (billForm.shippingCost || 0);
    return { subtotal, discountAmount, taxAmount, total };
  }, [billForm.items, billForm.shippingCost]);

  // â”€â”€ Save bill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSaveBill = async () => {
    if (!billForm.supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (!billForm.warehouseId) {
      toast.error('Please select a warehouse');
      return;
    }
    if (billForm.items.length === 0) {
      toast.error('Please add at least one line item');
      return;
    }
    if (billForm.items.some(i => !i.productName.trim())) {
      toast.error('All items must have a product name');
      return;
    }

    setSaving(true);
    try {
      const req: SupplierBillRequest = {
        supplierId: billForm.supplierId,
        invoiceNumber: billForm.invoiceNumber || undefined,
        billDate: billForm.billDate,
        dueDate: billForm.dueDate || undefined,
        priority: billForm.priority,
        shippingCost: billForm.shippingCost,
        warehouseId: billForm.warehouseId,
        notes: billForm.notes || undefined,
        receivedBy: billForm.receivedBy || undefined,
        items: billForm.items.map(i => ({
          productId: i.productId,
          productName: i.productName,
          productSku: i.productSku || undefined,
          unitOfMeasure: i.unitOfMeasure || undefined,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountPercent: i.discountPercent,
          taxPercent: i.taxPercent,
          notes: i.notes || undefined,
        })),
      };

      if (editingBill) {
        await supplierBillService.updateBill(editingBill.id, req);
        toast.success('Bill updated successfully');
      } else {
        await supplierBillService.createBill(req);
        toast.success('Bill created successfully');
      }
      setShowBillForm(false);
      setEditingBill(null);
      setBillForm(defaultBillForm());
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bill');
    } finally {
      setSaving(false);
    }
  };

  // â”€â”€ Confirm bill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleConfirm = async (bill: SupplierBill) => {
    setConfirmingId(bill.id);
    try {
      await supplierBillService.confirmBill(bill.id);
      toast.success('Bill confirmed â€” stock updated');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to confirm bill');
    } finally {
      setConfirmingId(null);
    }
  };

  // â”€â”€ Cancel bill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleCancelBill = async (bill: SupplierBill) => {
    try {
      await supplierBillService.cancelBill(bill.id);
      toast.success('Bill cancelled');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel bill');
    }
  };

  // â”€â”€ Delete bill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleDelete = async (bill: SupplierBill) => {
    try {
      await supplierBillService.deleteBill(bill.id);
      toast.success('Bill deleted');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete bill');
    }
  };

  // â”€â”€ Record payment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleRecordPayment = async () => {
    if (!payingBill) return;
    const amount = parseFloat(payAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }
    const legKey = PURCHASE_METHOD_TO_LEG_KEY[payMethod];
    if (legKey && legKey !== 'cash') {
      const probe: SplitPaymentValue = { ...EMPTY_SPLIT_PAYMENT, [legKey]: amount };
      if (!isSplitPaymentDetailsValid(probe, payMethodDetails)) {
        toast.error('Please fill in the required payment details');
        return;
      }
    }
    setSaving(true);
    try {
      const paymentBreakdown = legKey && legKey !== 'cash'
        ? buildSplitPaymentBreakdown({ ...EMPTY_SPLIT_PAYMENT, [legKey]: amount }, payMethodDetails, bankAccounts)
        : undefined;
      await supplierBillService.recordPayment(payingBill.id, amount, payMethod, payNotes || undefined, paymentBreakdown);
      toast.success('Payment recorded successfully');
      setShowPaymentDialog(false);
      setPayingBill(null);
      setPayAmount('');
      setPayMethod('cash');
      setPayMethodDetails(EMPTY_SPLIT_DETAILS);
      setPayNotes('');
      await loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  // â”€â”€ Open edit bill dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openEditBill = (bill: SupplierBill) => {
    setEditingBill(bill);
    setBillForm({
      supplierId: bill.supplierId,
      invoiceNumber: bill.invoiceNumber ?? '',
      billDate: bill.billDate,
      dueDate: bill.dueDate ?? '',
      shippingCost: bill.shippingCost,
      warehouseId: bill.warehouseId,
      notes: bill.notes ?? '',
      receivedBy: bill.receivedBy ?? '',
      items: bill.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        productSku: item.productSku ?? '',
        unitOfMeasure: item.unitOfMeasure ?? '',
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discountPercent: item.discountPercent,
        taxPercent: item.taxPercent,
        notes: item.notes ?? '',
      })),
    });
    setShowBillForm(true);
  };

  // â”€â”€ Print bill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const printBill = (bill: SupplierBill) => {
    const supplier = suppliers.find(s => s.id === bill.supplierId);
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>Bill ${bill.billNumber}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 24px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #f5f5f5; }
        .header { display: flex; justify-content: space-between; margin-bottom: 24px; }
        .totals { text-align: right; margin-top: 16px; }
      </style></head><body>
      <div class="header">
        <div><h2>Supplier Bill</h2><p>${bill.billNumber}</p></div>
        <div><p>Date: ${bill.billDate}</p>${bill.dueDate ? `<p>Due: ${bill.dueDate}</p>` : ''}</div>
      </div>
      <p><strong>Supplier:</strong> ${bill.supplierName}</p>
      ${bill.invoiceNumber ? `<p><strong>Invoice #:</strong> ${bill.invoiceNumber}</p>` : ''}
      <table>
        <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Price</th><th>Disc%</th><th>Tax%</th><th>Total</th></tr></thead>
        <tbody>
          ${bill.items.map(i => `<tr>
            <td>${i.productName}</td>
            <td>${i.productSku ?? ''}</td>
            <td>${i.quantity} ${i.unitOfMeasure ?? ''}</td>
            <td>${currencyCode} ${i.unitPrice.toFixed(2)}</td>
            <td>${i.discountPercent}%</td>
            <td>${i.taxPercent}%</td>
            <td>${currencyCode} ${i.totalAmount.toFixed(2)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="totals">
        <p>Subtotal: ${currencyCode} ${bill.subtotal.toFixed(2)}</p>
        ${bill.discountAmount > 0 ? `<p>Discount: -${currencyCode} ${bill.discountAmount.toFixed(2)}</p>` : ''}
        <p>Tax: ${currencyCode} ${bill.taxAmount.toFixed(2)}</p>
        <p>Shipping: ${currencyCode} ${bill.shippingCost.toFixed(2)}</p>
        <hr/>
        <p><strong>Total: ${currencyCode} ${bill.totalAmount.toFixed(2)}</strong></p>
      </div>
      </body></html>
    `);
    win.document.close();
    win.print();
  };

  // â”€â”€ Supplier management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const openCreateSupplier = () => {
    setEditingSupplier(null);
    setSupplierForm({
      name: '', contactPerson: '', email: '', phone: '',
      address: '', city: '', country: '', taxId: '',
      paymentTerms: '', creditLimit: 0, isActive: true, notes: '',
    });
    setShowSupplierForm(true);
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({ ...s });
    setShowSupplierForm(true);
  };

  const handleSaveSupplier = async () => {
    if (!supplierForm.name?.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    setSavingSupplier(true);
    try {
      if (editingSupplier) {
        await purchaseService.updateSupplier(editingSupplier.id, supplierForm);
        toast.success('Supplier updated');
      } else {
        await purchaseService.createSupplier(supplierForm);
        toast.success('Supplier created');
      }
      setShowSupplierForm(false);
      setEditingSupplier(null);
      const updated = await purchaseService.getAllSuppliers();
      setSuppliers(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save supplier');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleDeleteSupplier = async (s: Supplier) => {
    try {
      await purchaseService.deleteSupplier(s.id);
      toast.success('Supplier deleted');
      const updated = await purchaseService.getAllSuppliers();
      setSuppliers(updated);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier');
    }
  };

  // â”€â”€ Summary cards computed from live bills â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const summary = useMemo(() => {
    const totalAmount = bills.reduce((s, b) => s + b.totalAmount, 0);
    const unpaidAmount = bills
      .filter(b => b.paymentStatus !== 'PAID')
      .reduce((s, b) => s + (b.totalAmount - b.amountPaid), 0);
    const paidAmount = bills.reduce((s, b) => s + b.amountPaid, 0);
    return { totalAmount, unpaidAmount, paidAmount };
  }, [bills]);

  // â”€â”€ Supplier distribution chart data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const supplierChartData = useMemo(() => {
    const map: Record<string, number> = {};
    bills.forEach(b => {
      map[b.supplierName] = (map[b.supplierName] ?? 0) + b.totalAmount;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value], i) => ({ name, value, color: CHART_COLORS[i] }));
  }, [bills]);

  // â”€â”€ Payment status chart data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const paymentChartData = useMemo(() => {
    const unpaid  = bills.filter(b => b.paymentStatus === 'UNPAID').length;
    const partial = bills.filter(b => b.paymentStatus === 'PARTIAL').length;
    const paid    = bills.filter(b => b.paymentStatus === 'PAID').length;
    return [
      { name: 'Unpaid',  value: unpaid,  color: '#f97316' },
      { name: 'Partial', value: partial, color: '#eab308' },
      { name: 'Paid',    value: paid,    color: '#22c55e' },
    ].filter(d => d.value > 0);
  }, [bills]);

  // â”€â”€ Status filter bar chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const statusChartData = useMemo(() => {
    const draft     = bills.filter(b => b.status === 'DRAFT').length;
    const confirmed = bills.filter(b => b.status === 'CONFIRMED').length;
    const cancelled = bills.filter(b => b.status === 'CANCELLED').length;
    return [
      { name: 'Draft',     count: draft },
      { name: 'Confirmed', count: confirmed },
      { name: 'Cancelled', count: cancelled },
    ];
  }, [bills]);

  // â”€â”€ Extra computed stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const extraStats = useMemo(() => {
    const now = new Date();
    const monthlyBills = bills.filter(b => {
      if (!b.billDate) return false;
      const d = new Date(b.billDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const monthlySpend = monthlyBills.reduce((s, b) => s + b.totalAmount, 0);
    const inventoryAdded = bills
      .filter(b => b.status === 'CONFIRMED')
      .reduce((s, b) => s + b.items.reduce((si, i) => si + (i.quantity || 0), 0), 0);
    const supplierTotals: Record<string, number> = {};
    bills.forEach(b => { supplierTotals[b.supplierName] = (supplierTotals[b.supplierName] ?? 0) + b.totalAmount; });
    const topEntry = Object.entries(supplierTotals).sort(([, a], [, b]) => b - a)[0];
    const urgentCount = bills.filter(b => b.priority === 'HIGH' || b.priority === 'URGENT').length;
    const pendingApprovals = bills.filter(b => b.status === 'DRAFT').length;
    return { monthlySpend, inventoryAdded, topSupplier: topEntry?.[0] ?? 'â€”', topAmount: topEntry?.[1] ?? 0, urgentCount, pendingApprovals };
  }, [bills]);

  const [supplierFilter, setSupplierFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const filteredBills = useMemo(() => bills.filter(b => {
    if (supplierFilter && String(b.supplierId) !== supplierFilter) return false;
    if (priorityFilter && b.priority !== priorityFilter) return false;
    return true;
  }), [bills, supplierFilter, priorityFilter]);

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Purchase Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage all purchases including supplier transactions and inventory acquisitions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <TrendingUp className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button variant="outline" size="sm">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" onClick={() => {
            setEditingBill(null);
            setBillForm(defaultBillForm());
            setShowBillForm(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes purchaseFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .purchase-panel {
          animation: purchaseFadeIn 0.22s ease-out;
        }
      `}</style>
      {/* Stats row — 6 cards */}
      <div className="purchase-panel grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Purchases</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{totalBills}</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Pending Approvals</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-700">{extraStats.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground mt-1">Need approval</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Monthly Spend</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-green-700">
              <CurrencyGlyph /> {extraStats.monthlySpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Inventory Added</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <Package className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{extraStats.inventoryAdded}</div>
            <p className="text-xs text-muted-foreground mt-1">Items received</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Top Supplier</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-blue-700 truncate">{extraStats.topSupplier}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <CurrencyGlyph /> {extraStats.topAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Urgent Purchases</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{extraStats.urgentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">High priority</p>
          </CardContent>
        </Card>
      </div>

      {/* Main content + sidebar */}
      <div className="flex gap-6">

        {/* â”€â”€ Main content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex-1 min-w-0 space-y-6">

          {/* Filter bar */}
          <Card className="purchase-panel border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="flex-1 min-w-[200px] relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by purchase number, supplier, or invoice..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-11 h-10"
                  />
                </div>
                <Select value={statusFilter || 'all'} onValueChange={v => setStatusFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="DRAFT">Pending Approval</SelectItem>
                    <SelectItem value="CONFIRMED">Received</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={supplierFilter || 'all'} onValueChange={v => setSupplierFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Suppliers</SelectItem>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter || 'all'} onValueChange={v => setPriorityFilter(v === 'all' ? '' : v)}>
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue placeholder="All Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" className="h-9">
                  <Search className="mr-2 h-4 w-4" />
                  Advanced
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Purchase list table */}
          <Card className="purchase-panel border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Purchase List</CardTitle>
                  <CardDescription>{filteredBills.length} of {totalBills} purchases</CardDescription>
                </div>
                <Button variant="ghost" size="sm">
                  <Settings className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredBills.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
                  <p className="font-medium">No purchases found</p>
                  <p className="text-sm mb-4">Create your first purchase to get started</p>
                  <Button onClick={() => { setEditingBill(null); setBillForm({ ...defaultBillForm(), warehouseId: warehouses[0]?.id }); setShowBillForm(true); }}>
                    <Plus className="mr-2 h-4 w-4" /> New Purchase
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-10 pl-4">
                          <input type="checkbox" className="rounded" />
                        </TableHead>
                        <TableHead>Purchase #</TableHead>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Total Amount</TableHead>
                        <TableHead className="text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBills.map(bill => {
                        const supplier = suppliers.find(s => s.id === bill.supplierId);
                        const dateObj = bill.billDate ? new Date(bill.billDate) : null;
                        const dateStr = dateObj ? format(dateObj, 'MMM dd, yyyy') : 'â€”';
                        const dayStr  = dateObj ? format(dateObj, 'EEE') : '';
                        return (
                          <TableRow key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell className="pl-4">
                              <input type="checkbox" className="rounded" />
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{bill.billNumber}</p>
                                {bill.createdBy && (
                                  <p className="text-xs text-muted-foreground">by {bill.createdBy}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{bill.supplierName}</p>
                                {supplier?.contactPerson && (
                                  <p className="text-xs text-muted-foreground">{supplier.contactPerson}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">{dateStr}</p>
                                <p className="text-xs text-muted-foreground">{dayStr}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {bill.status === 'DRAFT' && (
                                <Badge className="text-xs bg-orange-100 text-orange-800 hover:bg-orange-100">Pending Approval</Badge>
                              )}
                              {bill.status === 'CONFIRMED' && (
                                <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">Received</Badge>
                              )}
                              {bill.status === 'CANCELLED' && (
                                <Badge className="text-xs bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {bill.priority === 'LOW' && <Badge className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-100">Low</Badge>}
                              {bill.priority === 'MEDIUM' && <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">Medium</Badge>}
                              {bill.priority === 'HIGH' && <Badge className="text-xs bg-orange-100 text-orange-700 hover:bg-orange-100">High</Badge>}
                              {bill.priority === 'URGENT' && <Badge className="text-xs bg-red-100 text-red-700 hover:bg-red-100">Urgent</Badge>}
                              {!bill.priority && <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">Medium</Badge>}
                            </TableCell>
                            <TableCell>
                              {bill.paymentStatus === 'PAID' && <Badge className="text-xs bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>}
                              {bill.paymentStatus === 'PARTIAL' && <Badge className="text-xs bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Partial</Badge>}
                              {bill.paymentStatus === 'UNPAID' && <Badge className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-100">Pending</Badge>}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm"><CurrencyGlyph /> {bill.totalAmount.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">{bill.items.length} item{bill.items.length !== 1 ? 's' : ''}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <div className="flex items-center justify-end gap-1">
                              {/* View */}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                title="View details"
                                onClick={() => { setSelectedBill(bill); setShowBillDetail(true); }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {/* Edit (DRAFT only) */}
                              {bill.status === 'DRAFT' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Edit bill"
                                  onClick={() => openEditBill(bill)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Confirm (DRAFT only) */}
                              {bill.status === 'DRAFT' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Confirm bill"
                                  disabled={confirmingId === bill.id}
                                  onClick={() => handleConfirm(bill)}
                                  className="text-blue-600 hover:text-blue-700"
                                >
                                  {confirmingId === bill.id
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : <CheckCircle className="h-4 w-4" />
                                  }
                                </Button>
                              )}

                              {/* Record Payment (CONFIRMED + not fully paid) */}
                              {bill.status === 'CONFIRMED' && bill.paymentStatus !== 'PAID' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  title="Record payment"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => {
                                    setPayingBill(bill);
                                    setPayAmount(String(bill.totalAmount - bill.amountPaid));
                                    setShowPaymentDialog(true);
                                  }}
                                >
                                  <Wallet className="h-4 w-4" />
                                </Button>
                              )}

                              {/* Cancel (DRAFT or CONFIRMED) */}
                              {(bill.status === 'DRAFT' || bill.status === 'CONFIRMED') && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Cancel bill"
                                      className="text-orange-600 hover:text-orange-700"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Cancel Bill</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Are you sure you want to cancel bill {bill.billNumber}? This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Keep Bill</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleCancelBill(bill)}>
                                        Cancel Bill
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}

                              {/* Delete (DRAFT only) */}
                              {bill.status === 'DRAFT' && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      title="Delete bill"
                                      className="text-red-600 hover:text-red-700"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Bill</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Permanently delete bill {bill.billNumber}? This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Keep</AlertDialogCancel>
                                      <AlertDialogAction
                                        className="bg-red-600 hover:bg-red-700"
                                        onClick={() => handleDelete(bill)}
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}

                              {/* Print */}
                              <Button
                                size="sm"
                                variant="ghost"
                                title="Print bill"
                                onClick={() => printBill(bill)}
                              >
                                <PrinterIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 p-4">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
                  <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>{/* end main content */}

        {/* â”€â”€ Right Sidebar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="w-72 shrink-0 space-y-6">

          {/* Quick Actions */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 p-4 pt-0">
              <Button
                className="w-full justify-start bg-emerald-600 hover:bg-emerald-700 text-white"
                size="sm"
                onClick={() => { setEditingBill(null); setBillForm({ ...defaultBillForm(), warehouseId: warehouses[0]?.id }); setShowBillForm(true); }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Purchase
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <TrendingUp className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Receipt className="mr-2 h-4 w-4" />
                Scan Receipt
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={openCreateSupplier}
              >
                <User className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </CardContent>
          </Card>

          {/* Inventory Snapshot */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-500" />
                Inventory Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {apiProducts.slice(0, 6).map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.categoryName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{p.totalStock} {p.defaultUnit ?? 'pcs'}</p>
                    {p.stockStatus === 'LOW_STOCK' && (
                      <p className="text-xs text-orange-600">Low Stock</p>
                    )}
                    {p.stockStatus === 'OUT_OF_STOCK' && (
                      <p className="text-xs text-red-600">Out of Stock</p>
                    )}
                  </div>
                </div>
              ))}
              {apiProducts.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No products loaded</p>
              )}
            </CardContent>
          </Card>

          {/* Suppliers quick list */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  Suppliers ({suppliers.length})
                </CardTitle>
                <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={openCreateSupplier}>
                  <Plus className="h-3 w-3 mr-1" />Add
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {suppliers.slice(0, 5).map(s => (
                <div key={s.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    {s.contactPerson && <p className="text-xs text-muted-foreground">{s.contactPerson}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => openEditSupplier(s)}>
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {suppliers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No suppliers yet</p>
              )}
            </CardContent>
          </Card>

        </div>{/* end sidebar */}

      </div>{/* end two-column layout */}

      {/* â”€â”€ Create / Edit Bill Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={showBillForm} onOpenChange={open => {
        setShowBillForm(open);
        if (!open) { setEditingBill(null); setBillForm(defaultBillForm()); setProductSearch(''); setShowProductSearch(false); }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingBill ? 'Edit Purchase' : 'Create New Purchase'}</DialogTitle>
            <DialogDescription>
              Create a new purchase record with supplier and product information
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">

            {/* Row 1: Purchase Number + Purchase Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Purchase Number</Label>
                <Input
                  placeholder="Auto-generated if empty"
                  value={billForm.purchaseNumber}
                  onChange={e => setBillForm(prev => ({ ...prev, purchaseNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Purchase Date</Label>
                <Input
                  type="date"
                  value={billForm.billDate}
                  onChange={e => setBillForm(prev => ({ ...prev, billDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Row 2: Priority + Payment Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Priority</Label>
                <Select
                  value={billForm.priority}
                  onValueChange={v => setBillForm(prev => ({ ...prev, priority: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Payment Status</Label>
                <Select
                  value={billForm.paymentStatus}
                  onValueChange={v => setBillForm(prev => ({ ...prev, paymentStatus: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNPAID">Pending</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Supplier */}
            <div>
              <Label className="text-xs text-muted-foreground">Supplier *</Label>
              <Select
                value={billForm.supplierId ? String(billForm.supplierId) : ''}
                onValueChange={v => setBillForm(prev => ({ ...prev, supplierId: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Warehouse */}
            <div>
              <Label className="text-xs text-muted-foreground">Warehouse *</Label>
              <Select
                value={billForm.warehouseId ? String(billForm.warehouseId) : ''}
                onValueChange={v => setBillForm(prev => ({ ...prev, warehouseId: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse..." />
                </SelectTrigger>
                <SelectContent>
                  {warehouses.map(w => (
                    <SelectItem key={w.id} value={String(w.id)}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Stock from confirmed items in this bill will be added to the selected warehouse.
              </p>
            </div>

            {/* Purchase Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-muted-foreground font-semibold">Purchase Items</Label>
                <Button
                  size="sm"
                  variant="default"
                  className="h-8 text-xs"
                  onClick={() => { setShowProductSearch(true); setProductSearch(''); }}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Add Product
                </Button>
              </div>

              {/* Product search dropdown */}
              {showProductSearch && (
                <div className="relative mb-3">
                  <div className="border rounded-lg shadow-lg bg-background z-50">
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          autoFocus
                          placeholder="Search products..."
                          value={productSearch}
                          onChange={e => setProductSearch(e.target.value)}
                          className="pl-8 h-8 text-sm"
                        />
                      </div>
                    </div>
                    <div className="max-h-52 overflow-y-auto">
                      {(() => {
                        const filtered = apiProducts.filter(p =>
                          p.isActive && (
                            !productSearch ||
                            p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
                            p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
                            (p.categoryName ?? '').toLowerCase().includes(productSearch.toLowerCase())
                          )
                        );
                        if (filtered.length === 0) {
                          return (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No products found
                            </div>
                          );
                        }
                        return filtered.map(p => (
                          <button
                            key={p.id}
                            className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted text-left transition-colors"
                            onClick={() => {
                              addItem({
                                productId: p.id,
                                productName: p.name,
                                productSku: p.sku ?? '',
                                unitOfMeasure: p.defaultUnit ?? 'pcs',
                                unitPrice: p.costPrice ?? 0,
                                taxPercent: p.taxRate ?? 0,
                                quantity: 1,
                              });
                              setShowProductSearch(false);
                              setProductSearch('');
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">{p.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {p.sku} â€¢ {p.categoryName}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 ml-3 shrink-0">
                              <span className="text-sm font-semibold"><CurrencyGlyph /> {(p.costPrice ?? 0).toFixed(0)}</span>
                              {p.stockStatus === 'OUT_OF_STOCK' && (
                                <Badge className="text-[10px] px-1 py-0 bg-red-100 text-red-700">Out of Stock</Badge>
                              )}
                              {p.stockStatus === 'LOW_STOCK' && (
                                <Badge className="text-[10px] px-1 py-0 bg-yellow-100 text-yellow-700">Low Stock</Badge>
                              )}
                              {p.stockStatus === 'ACTIVE' && (
                                <Badge className="text-[10px] px-1 py-0 bg-green-100 text-green-700">Stock: {p.totalStock}</Badge>
                              )}
                            </div>
                          </button>
                        ));
                      })()}
                    </div>
                    <div className="p-2 border-t">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-xs"
                        onClick={() => {
                          addItem();
                          setShowProductSearch(false);
                          setProductSearch('');
                        }}
                      >
                        + Add custom item manually
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Line items list */}
              {billForm.items.length === 0 && !showProductSearch ? (
                <div
                  className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => setShowProductSearch(true)}
                >
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Click "Add Product" to add items</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {billForm.items.map((item, idx) => (
                    <div key={idx} className="border rounded-lg p-3 bg-muted/30">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <Input
                            placeholder="Product name *"
                            value={item.productName}
                            onChange={e => updateItem(idx, { productName: e.target.value })}
                            className="font-medium text-sm h-8"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                          onClick={() => removeItem(idx)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">SKU</Label>
                          <Input
                            placeholder="SKU"
                            value={item.productSku}
                            onChange={e => updateItem(idx, { productSku: e.target.value })}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Unit</Label>
                          <Input
                            placeholder="pcs, kg..."
                            value={item.unitOfMeasure}
                            onChange={e => updateItem(idx, { unitOfMeasure: e.target.value })}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Qty *</Label>
                          <Input
                            type="number"
                            min="0.01"
                            step="any"
                            value={item.quantity}
                            onChange={e => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Unit Price ({currencyCode}) *</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={e => updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Discount %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.discountPercent}
                            onChange={e => updateItem(idx, { discountPercent: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Tax %</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            value={item.taxPercent}
                            onChange={e => updateItem(idx, { taxPercent: parseFloat(e.target.value) || 0 })}
                            className="h-7 text-xs"
                          />
                        </div>
                      </div>
                      <div className="mt-2 text-right text-xs font-semibold text-primary">
                        Line Total: <CurrencyGlyph /> {(
                          item.quantity * item.unitPrice
                          * (1 - item.discountPercent / 100)
                          * (1 + item.taxPercent / 100)
                        ).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Invoice Number + Reference Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Invoice Number</Label>
                <Input
                  placeholder="Invoice number from supplier"
                  value={billForm.invoiceNumber}
                  onChange={e => setBillForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Reference Number</Label>
                <Input
                  placeholder="Internal reference number"
                  value={billForm.referenceNumber}
                  onChange={e => setBillForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                placeholder="Additional notes or comments..."
                rows={2}
                value={billForm.notes}
                onChange={e => setBillForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* Totals summary */}
            {billForm.items.length > 0 && (
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span><CurrencyGlyph /> {billTotals.subtotal.toFixed(2)}</span>
                    </div>
                    {billTotals.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Discount</span>
                        <span>-<CurrencyGlyph /> {billTotals.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {billTotals.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span><CurrencyGlyph /> {billTotals.taxAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span className="text-primary"><CurrencyGlyph /> {billTotals.total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Form actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                variant="ghost"
                onClick={() => { setShowBillForm(false); setEditingBill(null); setBillForm(defaultBillForm()); }}
              >
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSaveBill}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save as Draft
                </Button>
                <Button onClick={handleSaveBill} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  {editingBill ? 'Update Purchase' : 'Create Purchase'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Bill Detail Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={showBillDetail} onOpenChange={setShowBillDetail}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          {selectedBill && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Receipt className="h-5 w-5" />
                  {selectedBill.billNumber}
                  {getStatusBadge(selectedBill.status)}
                  {getPaymentBadge(selectedBill.paymentStatus)}
                </DialogTitle>
                <DialogDescription>Supplier bill details and line items</DialogDescription>
              </DialogHeader>

              <div className="space-y-5">
                {/* Info cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Supplier Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Supplier: </span>
                        <span className="font-medium">{selectedBill.supplierName}</span>
                      </div>
                      {selectedBill.invoiceNumber && (
                        <div>
                          <span className="text-muted-foreground">Invoice #: </span>
                          <span className="font-medium">{selectedBill.invoiceNumber}</span>
                        </div>
                      )}
                      {selectedBill.receivedBy && (
                        <div>
                          <span className="text-muted-foreground">Received by: </span>
                          <span className="font-medium">{selectedBill.receivedBy}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Bill Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Bill Date: </span>
                        <span className="font-medium">{selectedBill.billDate}</span>
                      </div>
                      {selectedBill.dueDate && (
                        <div>
                          <span className="text-muted-foreground">Due Date: </span>
                          <span className="font-medium">{selectedBill.dueDate}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Created: </span>
                        <span className="font-medium">{selectedBill.createdAt}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Amount Paid: </span>
                        <span className="font-medium text-green-600"><CurrencyGlyph /> {selectedBill.amountPaid.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Line items table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Line Items ({selectedBill.items.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Disc%</TableHead>
                          <TableHead>Tax%</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedBill.items.map(item => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <p className="font-medium">{item.productName}</p>
                              {item.notes && <p className="text-xs text-muted-foreground italic">{item.notes}</p>}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{item.productSku ?? 'â€”'}</TableCell>
                            <TableCell>{item.quantity} {item.unitOfMeasure ?? ''}</TableCell>
                            <TableCell><CurrencyGlyph /> {item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell>{item.discountPercent}%</TableCell>
                            <TableCell>{item.taxPercent}%</TableCell>
                            <TableCell className="font-medium"><CurrencyGlyph /> {item.totalAmount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Financial summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm max-w-xs ml-auto">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span><CurrencyGlyph /> {selectedBill.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedBill.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>-<CurrencyGlyph /> {selectedBill.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax</span>
                        <span><CurrencyGlyph /> {selectedBill.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span><CurrencyGlyph /> {selectedBill.shippingCost.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total</span>
                        <span><CurrencyGlyph /> {selectedBill.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Paid</span>
                        <span><CurrencyGlyph /> {selectedBill.amountPaid.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-semibold text-orange-600">
                        <span>Balance Due</span>
                        <span><CurrencyGlyph /> {(selectedBill.totalAmount - selectedBill.amountPaid).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {selectedBill.notes && (
                  <Card>
                    <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm">{selectedBill.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Dialog actions */}
                <div className="flex justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => printBill(selectedBill)}>
                      <PrinterIcon className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {selectedBill.status === 'DRAFT' && (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowBillDetail(false);
                            openEditBill(selectedBill);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          disabled={confirmingId === selectedBill.id}
                          onClick={() => handleConfirm(selectedBill)}
                        >
                          {confirmingId === selectedBill.id
                            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            : <CheckCircle className="mr-2 h-4 w-4" />
                          }
                          Confirm Bill
                        </Button>
                      </>
                    )}
                    {selectedBill.status === 'CONFIRMED' && selectedBill.paymentStatus !== 'PAID' && (
                      <Button
                        onClick={() => {
                          setPayingBill(selectedBill);
                          setPayAmount(String(selectedBill.totalAmount - selectedBill.amountPaid));
                          setShowBillDetail(false);
                          setShowPaymentDialog(true);
                        }}
                      >
                        <Wallet className="mr-2 h-4 w-4" />
                        Record Payment
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Record Payment Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={showPaymentDialog} onOpenChange={open => {
        setShowPaymentDialog(open);
        if (!open) { setPayingBill(null); setPayAmount(''); setPayMethod('cash'); setPayMethodDetails(EMPTY_SPLIT_DETAILS); setPayNotes(''); }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              Record Payment
            </DialogTitle>
            <DialogDescription>
              {payingBill && `Bill ${payingBill.billNumber} â€” Balance: ${currencyCode} ${(payingBill.totalAmount - payingBill.amountPaid).toFixed(2)}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Amount ({currencyCode}) *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Enter payment amount"
                value={payAmount}
                onChange={e => setPayAmount(e.target.value)}
              />
            </div>

            <div>
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={(v) => { setPayMethod(v); setPayMethodDetails(EMPTY_SPLIT_DETAILS); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="credit_card">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {payMethod === 'credit_card' && (
              <div>
                <Label>Card Type *</Label>
                <Select value={payMethodDetails.cardType} onValueChange={(v) => setPayMethodDetails(d => ({ ...d, cardType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select card type" /></SelectTrigger>
                  <SelectContent>
                    {CARD_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {payMethod === 'cheque' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cheque Number *</Label>
                  <Input
                    value={payMethodDetails.chequeNumber}
                    onChange={e => setPayMethodDetails(d => ({ ...d, chequeNumber: e.target.value }))}
                    placeholder="Cheque number"
                  />
                </div>
                <div>
                  <Label>Bank Name (optional)</Label>
                  <Input
                    value={payMethodDetails.chequeBankName}
                    onChange={e => setPayMethodDetails(d => ({ ...d, chequeBankName: e.target.value }))}
                    placeholder="e.g. SBI"
                  />
                </div>
              </div>
            )}

            {payMethod === 'bank_transfer' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Reference *</Label>
                  <Input
                    value={payMethodDetails.bankTransferReference}
                    onChange={e => setPayMethodDetails(d => ({ ...d, bankTransferReference: e.target.value }))}
                    placeholder="Transaction ID"
                  />
                </div>
                <div>
                  <Label>Bank Account (Ledger)</Label>
                  <Select value={payMethodDetails.bankTransferAccountId} onValueChange={(v) => setPayMethodDetails(d => ({ ...d, bankTransferAccountId: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder={bankAccounts.length ? 'Select bank account' : 'No bank accounts in ledger'} />
                    </SelectTrigger>
                    <SelectContent>
                      {bankAccounts.map(account => (
                        <SelectItem key={account.id} value={String(account.id)}>{account.code} — {account.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div>
              <Label>Notes</Label>
              <Textarea
                placeholder="Payment reference or notes..."
                rows={2}
                value={payNotes}
                onChange={e => setPayNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} disabled={saving}>
                {saving
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <CreditCard className="mr-2 h-4 w-4" />
                }
                Record Payment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* â”€â”€ Supplier Form Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Dialog open={showSupplierForm} onOpenChange={open => {
        setShowSupplierForm(open);
        if (!open) setEditingSupplier(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? 'Update supplier information' : 'Create a new supplier record'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input
                  placeholder="Company name"
                  value={supplierForm.name ?? ''}
                  onChange={e => setSupplierForm(p => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input
                  placeholder="Contact name"
                  value={supplierForm.contactPerson ?? ''}
                  onChange={e => setSupplierForm(p => ({ ...p, contactPerson: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="email@company.com"
                  value={supplierForm.email ?? ''}
                  onChange={e => setSupplierForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  placeholder="+971-4-xxx-xxxx"
                  value={supplierForm.phone ?? ''}
                  onChange={e => setSupplierForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  placeholder="City"
                  value={supplierForm.city ?? ''}
                  onChange={e => setSupplierForm(p => ({ ...p, city: e.target.value }))}
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  placeholder="Country"
                  value={supplierForm.country ?? ''}
                  onChange={e => setSupplierForm(p => ({ ...p, country: e.target.value }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Address</Label>
                <Input
                  placeholder="Street address"
                  value={supplierForm.address ?? ''}
                  onChange={e => setSupplierForm(p => ({ ...p, address: e.target.value }))}
                />
              </div>
              <div>
                <Label>Tax ID / TRN</Label>
                <Input
                  placeholder="Tax ID"
                  value={supplierForm.taxId ?? ''}
                  onChange={e => setSupplierForm(p => ({ ...p, taxId: e.target.value }))}
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Select
                  value={supplierForm.paymentTerms ?? ''}
                  onValueChange={v => setSupplierForm(p => ({ ...p, paymentTerms: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IMMEDIATE">Immediate</SelectItem>
                    <SelectItem value="NET 7">NET 7</SelectItem>
                    <SelectItem value="NET 15">NET 15</SelectItem>
                    <SelectItem value="NET 30">NET 30</SelectItem>
                    <SelectItem value="NET 60">NET 60</SelectItem>
                    <SelectItem value="NET 90">NET 90</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Credit Limit ({currencyCode})</Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={supplierForm.creditLimit ?? 0}
                  onChange={e => setSupplierForm(p => ({ ...p, creditLimit: parseFloat(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Rating (0â€“5)</Label>
                <Input
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={supplierForm.rating ?? ''}
                  onChange={e => setSupplierForm(p => ({ ...p, rating: parseFloat(e.target.value) || undefined }))}
                />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Notes about this supplier..."
                  rows={2}
                  value={supplierForm.notes ?? ''}
                  onChange={e => setSupplierForm(p => ({ ...p, notes: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowSupplierForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveSupplier} disabled={savingSupplier}>
                {savingSupplier
                  ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  : <Save className="mr-2 h-4 w-4" />
                }
                {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => {
            setEditingBill(null);
            setBillForm(defaultBillForm());
            setShowBillForm(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}











