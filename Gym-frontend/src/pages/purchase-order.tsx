import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { purchaseService, Supplier as SupplierType, PurchaseOrder as POType, PurchaseOrderRequest, ReceiveItemRequest } from '../utils/supabase/purchase-service';
import { productsService, Product as APIProduct } from '../utils/supabase/products-service';
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Progress } from "../components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Package,
  Truck,
  FileText,
  Send,
  Mail,
  Phone,
  MapPin,
  Calendar,
  User,
  Building,
  DollarSign,
  Percent,
  Hash,
  MoreHorizontal,
  X,
  Save,
  RefreshCw,
  PrinterIcon,
  Copy,
  ExternalLink,
  Loader2,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Factory,
  Users,
  Target,
  Activity,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Check,
  ChevronsUpDown,
  Calculator,
  Star,
  Info,
  Bell,
  Settings,
  Archive,
  RotateCcw,
  Zap,
  Crown,
  Grid3X3,
  List
} from 'lucide-react';
import { toast } from "sonner";
import { format, addDays, subDays, isToday, isYesterday, isTomorrow, addWeeks, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "../components/ui/utils";

// Types and interfaces
interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  taxId: string;
  paymentTerms: string;
  creditLimit: number;
  isActive: boolean;
  rating: number;
  totalOrders: number;
  totalSpent: number;
}

interface PurchaseOrderItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  sku: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitPrice: number;
  discount: number;
  taxPercent: number;
  totalAmount: number;
  notes?: string;
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplier: Supplier;
  orderDate: Date;
  expectedDeliveryDate: Date;
  actualDeliveryDate?: Date;
  status: 'draft' | 'pending_approval' | 'approved' | 'ordered' | 'partially_received' | 'received' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  items: PurchaseOrderItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  paymentTerms: string;
  deliveryAddress: string;
  notes?: string;
  attachments: string[];
  createdBy: string;
  approvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  approvalWorkflow?: {
    level: number;
    approvers: string[];
    currentApprover?: string;
    approvalHistory: {
      approver: string;
      action: 'approved' | 'rejected' | 'requested_changes';
      date: Date;
      comments?: string;
    }[];
  };
}

interface Product {
  id: string;
  name: string;
  code: string;
  sku: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  currentStock: number;
  reorderPoint: number;
  averageUnitCost: number;
  lastPurchasePrice: number;
  preferredSupplier?: string;
}

export function PurchaseOrder() {
  const { currencyCode } = useCurrency();
  const [activeTab, setActiveTab] = useState('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const [selectedOrderForDetail, setSelectedOrderForDetail] = useState<PurchaseOrder | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [showSupplierSelector, setShowSupplierSelector] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [ordersView, setOrdersView] = useState<'table' | 'grid'>('table');

  // API-loaded data
  const [suppliers, setSuppliers] = useState<SupplierType[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<POType[]>([]);
  const [apiProductList, setApiProductList] = useState<APIProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Supplier management state
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierType | null>(null);
  const [savingSupplier, setSavingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    name: '', contactPerson: '', email: '', phone: '',
    address: '', city: '', country: 'UAE', taxId: '',
    paymentTerms: 'NET30', creditLimit: 0, isActive: true, notes: ''
  });
  const [supplierSearch, setSupplierSearch] = useState('');

  // Load all data on mount
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        const [suppliersData, ordersData, productsData] = await Promise.all([
          purchaseService.getAllSuppliers(),
          purchaseService.getOrders({ size: 100 }),
          productsService.getProducts({ size: 200 }),
        ]);
        setSuppliers(suppliersData);
        setPurchaseOrders(ordersData.orders);
        setApiProductList(productsData.products);
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Purchase Order Form State
  const [orderForm, setOrderForm] = useState<Partial<PurchaseOrder & { selectedSupplier: Supplier | null }>>({
    poNumber: '',
    selectedSupplier: null,
    orderDate: new Date(),
    expectedDeliveryDate: addDays(new Date(), 7),
    status: 'draft',
    priority: 'medium',
    items: [],
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    shippingCost: 0,
    totalAmount: 0,
    paymentTerms: 'NET 30',
    deliveryAddress: 'GymBios Main Branch\n123 Fitness Street\nDubai, UAE',
    notes: ''
  });

  // Calculate analytics
  const analytics = useMemo(() => {
    const now = new Date();
    const totalOrders = purchaseOrders.length;
    const pendingApprovals = purchaseOrders.filter(po =>
      po.status === 'PENDING_APPROVAL' || po.status === 'pending_approval'
    ).length;
    const totalSpendThisMonth = purchaseOrders
      .filter(po => {
        const d = po.orderDate ? new Date(po.orderDate) : null;
        return d && d >= startOfMonth(now) && d <= endOfMonth(now);
      })
      .reduce((sum, po) => sum + po.totalAmount, 0);

    const supplierCounts = purchaseOrders.reduce((acc, po) => {
      const name = po.supplierName || (po as any).supplier?.name || '';
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topSupplier = Object.entries(supplierCounts).sort(([,a], [,b]) => b - a)[0];

    const urgentOrders = purchaseOrders.filter(po =>
      po.priority === 'URGENT' || po.priority === 'HIGH' ||
      po.priority === 'urgent' || po.priority === 'high'
    ).length;

    const overdueOrders = purchaseOrders.filter(po => {
      const expDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate) : null;
      const status = po.status?.toLowerCase();
      return expDate && expDate < now && status !== 'received' && status !== 'cancelled';
    }).length;

    return {
      totalOrders,
      pendingApprovals,
      totalSpendThisMonth,
      topSupplier: topSupplier ? topSupplier[0] : 'N/A',
      urgentOrders,
      overdueOrders
    };
  }, [purchaseOrders]);

  // Compute live order totals from items (for form review step)
  const orderTotals = useMemo(() => {
    const items = orderForm.items || [];
    const subtotal = items.reduce((sum, item) => sum + (item.quantityOrdered || 0) * (item.unitPrice || 0), 0);
    const discountAmount = items.reduce((sum, item) => {
      const line = (item.quantityOrdered || 0) * (item.unitPrice || 0);
      return sum + line * ((item.discount || 0) / 100);
    }, 0);
    const taxAmount = items.reduce((sum, item) => {
      const line = (item.quantityOrdered || 0) * (item.unitPrice || 0);
      const afterDiscount = line - line * ((item.discount || 0) / 100);
      return sum + afterDiscount * ((item.taxPercent || 0) / 100);
    }, 0);
    const shippingCost = orderForm.shippingCost || 0;
    return { subtotal, discountAmount, taxAmount, shippingCost, totalAmount: subtotal - discountAmount + taxAmount + shippingCost };
  }, [orderForm.items, orderForm.shippingCost]);

  // Filter purchase orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(order => {
      const supplierName = order.supplierName || (order as any).supplier?.name || '';
      const supplierId = String(order.supplierId ?? (order as any).supplier?.id ?? '');
      const matchesSearch = searchTerm === '' ||
        order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = selectedStatus === 'all' ||
        order.status?.toLowerCase() === selectedStatus.toLowerCase();
      const matchesSupplier = selectedSupplier === 'all' || supplierId === selectedSupplier;
      const matchesPriority = selectedPriority === 'all' ||
        order.priority?.toLowerCase() === selectedPriority.toLowerCase();

      return matchesSearch && matchesStatus && matchesSupplier && matchesPriority;
    });
  }, [purchaseOrders, searchTerm, selectedStatus, selectedSupplier, selectedPriority]);

  // Handle order creation/editing
  const handleSaveOrder = useCallback(async (submitStatus: 'DRAFT' | 'PENDING_APPROVAL' = 'DRAFT') => {
    if (!orderForm.selectedSupplier || !orderForm.items || orderForm.items.length === 0) {
      toast.error('Please select a supplier and add at least one item');
      return;
    }

    const req: PurchaseOrderRequest = {
      supplierId: Number(orderForm.selectedSupplier.id),
      orderDate: orderForm.orderDate ? format(orderForm.orderDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      expectedDeliveryDate: orderForm.expectedDeliveryDate ? format(orderForm.expectedDeliveryDate, 'yyyy-MM-dd') : undefined,
      priority: (orderForm.priority || 'medium').toUpperCase(),
      paymentTerms: orderForm.paymentTerms || orderForm.selectedSupplier.paymentTerms,
      deliveryAddress: orderForm.deliveryAddress,
      notes: orderForm.notes,
      createdBy: 'Admin',
      shippingCost: orderForm.shippingCost || 0,
      items: (orderForm.items || []).map(item => ({
        productId: item.productId ? Number(item.productId) : undefined,
        productName: item.productName,
        productSku: item.sku || item.productCode,
        unitOfMeasure: item.unitOfMeasure,
        quantityOrdered: item.quantityOrdered,
        unitPrice: item.unitPrice,
        discountPercent: item.discount || 0,
        taxPercent: item.taxPercent || 0,
        notes: item.notes,
      })),
    };

    try {
      let order: POType;
      if (editingOrder) {
        order = await purchaseService.updateOrder(Number((editingOrder as any).id), req);
        setPurchaseOrders(prev => prev.map(o => o.id === order.id ? order : o));
        toast.success('Purchase order updated successfully!');
      } else {
        order = await purchaseService.createOrder(req);
        // If submitting (not draft), immediately update status to PENDING_APPROVAL
        if (submitStatus === 'PENDING_APPROVAL') {
          try {
            order = await purchaseService.updateStatus(order.id, 'PENDING_APPROVAL');
          } catch { /* ignore — order saved even if status update fails */ }
        }
        setPurchaseOrders(prev => [order, ...prev]);
        toast.success(submitStatus === 'PENDING_APPROVAL' ? 'Order submitted for approval!' : 'Order saved as draft!');
      }
      setShowOrderForm(false);
      resetForm();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save order');
    }
  }, [orderForm, editingOrder]);

  // Reset form
  const resetForm = useCallback(() => {
    setOrderForm({
      poNumber: '',
      selectedSupplier: null,
      orderDate: new Date(),
      expectedDeliveryDate: addDays(new Date(), 7),
      status: 'draft',
      priority: 'medium',
      items: [],
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      shippingCost: 0,
      totalAmount: 0,
      paymentTerms: 'NET 30',
      deliveryAddress: 'GymBios Main Branch\n123 Fitness Street\nDubai, UAE',
      notes: ''
    });
    setCurrentStep(1);
    setEditingOrder(null);
  }, []);

  const openCreateOrder = useCallback(() => {
    setIsCreatingOrder(true);
    resetForm();
    setShowOrderForm(true);
  }, [resetForm]);

  // Supplier handlers
  const openCreateSupplier = useCallback(() => {
    setEditingSupplier(null);
    setSupplierForm({ name: '', contactPerson: '', email: '', phone: '', address: '', city: '', country: 'UAE', taxId: '', paymentTerms: 'NET30', creditLimit: 0, isActive: true, notes: '' });
    setShowSupplierForm(true);
  }, []);

  const openEditSupplier = useCallback((supplier: SupplierType) => {
    setEditingSupplier(supplier);
    setSupplierForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country || 'UAE',
      taxId: supplier.taxId || '',
      paymentTerms: supplier.paymentTerms || 'NET30',
      creditLimit: supplier.creditLimit || 0,
      isActive: supplier.isActive,
      notes: supplier.notes || '',
    });
    setShowSupplierForm(true);
  }, []);

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) { toast.error('Supplier name is required'); return; }
    setSavingSupplier(true);
    try {
      if (editingSupplier) {
        const updated = await purchaseService.updateSupplier(editingSupplier.id, supplierForm);
        setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
        toast.success('Supplier updated successfully');
      } else {
        const created = await purchaseService.createSupplier(supplierForm);
        setSuppliers(prev => [created, ...prev]);
        toast.success('Supplier created successfully');
      }
      setShowSupplierForm(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save supplier');
    } finally {
      setSavingSupplier(false);
    }
  };

  const handleDeleteSupplier = async (id: number) => {
    if (!confirm('Delete this supplier? This cannot be undone.')) return;
    try {
      await purchaseService.deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
      toast.success('Supplier deleted');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier');
    }
  };

  // Handle bulk actions
  const handleBulkAction = useCallback(async (action: string) => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders first');
      return;
    }

    switch (action) {
      case 'approve':
        try {
          const results = await Promise.allSettled(
            selectedOrders.map(id => purchaseService.updateStatus(Number(id), 'APPROVED'))
          );
          const succeeded = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<any>).value);
          if (succeeded.length > 0) {
            setPurchaseOrders(prev => prev.map(o => {
              const updated = succeeded.find((u: any) => u.id === o.id);
              return updated || o;
            }));
          }
          toast.success(`${succeeded.length} order(s) approved`);
        } catch { toast.error('Failed to approve orders'); }
        break;
      case 'cancel':
        try {
          const results = await Promise.allSettled(
            selectedOrders.map(id => purchaseService.updateStatus(Number(id), 'CANCELLED'))
          );
          const succeeded = results.filter(r => r.status === 'fulfilled').map(r => (r as PromiseFulfilledResult<any>).value);
          if (succeeded.length > 0) {
            setPurchaseOrders(prev => prev.map(o => {
              const updated = succeeded.find((u: any) => u.id === o.id);
              return updated || o;
            }));
          }
          toast.success(`${succeeded.length} order(s) cancelled`);
        } catch { toast.error('Failed to cancel orders'); }
        break;
      case 'export':
        setIsExporting(true);
        setTimeout(() => {
          setIsExporting(false);
          toast.success(`${selectedOrders.length} orders exported`);
        }, 1500);
        break;
      case 'print':
        toast.success(`${selectedOrders.length} orders sent to printer`);
        break;
    }
    setSelectedOrders([]);
  }, [selectedOrders]);

  // Add item to order — accepts both local Product and APIProduct shapes
  const addItemToOrder = useCallback((product: any, quantity: number = 1) => {
    const price = product.costPrice ?? product.lastPurchasePrice ?? product.sellingPrice ?? 0;
    const newItem: PurchaseOrderItem = {
      id: `item-${Date.now()}`,
      productId: String(product.id),
      productName: product.name,
      productCode: product.sku || product.code || '',
      sku: product.sku || '',
      description: product.description || '',
      category: product.categoryName || product.category || '',
      unitOfMeasure: product.defaultUnit || product.unitOfMeasure || 'unit',
      quantityOrdered: quantity,
      quantityReceived: 0,
      unitPrice: price,
      discount: 0,
      taxPercent: product.taxRate ?? 5,
      totalAmount: quantity * price,
      notes: ''
    };

    setOrderForm(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));

    toast.success(`${product.name} added to order`);
  }, []);

  // Remove item from order
  const removeItemFromOrder = useCallback((itemId: string) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.id !== itemId) || []
    }));
  }, []);

  // Update item in order
  const updateOrderItem = useCallback((itemId: string, updates: Partial<PurchaseOrderItem>) => {
    setOrderForm(prev => ({
      ...prev,
      items: prev.items?.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              ...updates, 
              totalAmount: (updates.quantityOrdered || item.quantityOrdered) * (updates.unitPrice || item.unitPrice) - (updates.discount || item.discount)
            }
          : item
      ) || []
    }));
  }, []);

  // Get status badge — accepts both UPPER_CASE (API) and lower_case (form)
  const getStatusBadge = (status: string) => {
    const key = status?.toLowerCase() ?? 'draft';
    const statusConfig: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      pending_approval: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800' },
      ordered: { label: 'Ordered', className: 'bg-purple-100 text-purple-800' },
      partially_received: { label: 'Partially Received', className: 'bg-orange-100 text-orange-800' },
      received: { label: 'Received', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[key] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Get priority badge — accepts both UPPER_CASE (API) and lower_case (form)
  const getPriorityBadge = (priority: string) => {
    const key = priority?.toLowerCase() ?? 'medium';
    const priorityConfig: Record<string, { label: string; className: string }> = {
      low: { label: 'Low', className: 'bg-green-100 text-green-800' },
      medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' }
    };

    const config = priorityConfig[key] || priorityConfig.medium;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft':
        return <FileText className="h-4 w-4 text-gray-600" />;
      case 'pending_approval':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'ordered':
        return <ShoppingCart className="h-4 w-4 text-purple-600" />;
      case 'partially_received':
        return <Package className="h-4 w-4 text-orange-600" />;
      case 'received':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage purchase orders for inventory restocking and equipment procurement
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => handleBulkAction('export')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={openCreateOrder}>
            <Plus className="mr-2 h-4 w-4" />
            Create New PO
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes poFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [role="tabpanel"][data-state="active"] {
          animation: poFadeIn 0.22s ease-out;
        }
        .po-panel {
          animation: poFadeIn 0.22s ease-out;
        }
      `}</style>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total POs</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{analytics.totalOrders}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Pending Approvals</CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{analytics.pendingApprovals}</div>
            <p className="text-xs text-muted-foreground">Need approval</p>
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
            <div className="text-2xl font-bold text-green-600"><CurrencyGlyph /> {analytics.totalSpendThisMonth.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Top Supplier</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <Building className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-purple-600 truncate">{analytics.topSupplier}</div>
            <p className="text-xs text-muted-foreground">Most orders</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Urgent Orders</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{analytics.urgentOrders}</div>
            <p className="text-xs text-muted-foreground">High priority</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Overdue</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <Truck className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{analytics.overdueOrders}</div>
            <p className="text-xs text-muted-foreground">Past due date</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full flex">
          <TabsTrigger value="orders" className="flex-1">
            <ClipboardList className="h-4 w-4 mr-2" />
            Purchase Orders
          </TabsTrigger>
          <TabsTrigger value="suppliers" className="flex-1">
            <Building className="h-4 w-4 mr-2" />
            Suppliers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
      {/* Filters */}
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by PO number, supplier, or product..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2 flex-wrap items-center">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_approval">Pending Approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="ordered">Ordered</SelectItem>
                  <SelectItem value="partially_received">Partially Received</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Supplier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Suppliers</SelectItem>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={String(supplier.id)}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Advanced
              </Button>

              <div className="flex border rounded-md overflow-hidden">
                <Button
                  variant={ordersView === "table" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-10 px-3"
                  onClick={() => setOrdersView("table")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={ordersView === "grid" ? "default" : "ghost"}
                  size="sm"
                  className="rounded-none h-10 px-3"
                  onClick={() => setOrdersView("grid")}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedOrders.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {selectedOrders.length} order(s) selected
                </p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('approve')}>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('print')}>
                    <PrinterIcon className="mr-2 h-4 w-4" />
                    Print
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('export')}>
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleBulkAction('cancel')}>
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      {ordersView === "table" && (
      <Card className="po-panel border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>
                {filteredOrders.length} of {purchaseOrders.length} orders
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-40" />
              <p className="font-medium">No purchases found</p>
              <p className="text-sm mb-4">Create your first purchase to get started</p>
              <Button onClick={openCreateOrder}>
                <Plus className="mr-2 h-4 w-4" /> New Purchase
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedOrders.length === filteredOrders.length && filteredOrders.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOrders(filteredOrders.map(po => String(po.id)));
                          } else {
                            setSelectedOrders([]);
                          }
                        }}
                      />
                    </TableHead>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Order Date</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const orderDateObj = order.orderDate ? new Date(order.orderDate) : null;
                    const expDateObj = order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : null;
                    const orderStatus = order.status?.toLowerCase() ?? '';
                    const orderPriority = order.priority?.toLowerCase() ?? '';
                    const isOverdue = expDateObj && expDateObj < new Date() && orderStatus !== 'received' && orderStatus !== 'cancelled';
                    const supplierName = order.supplierName || (order as any).supplier?.name || '-';
                    return (
                    <TableRow
                      key={order.id}
                      className={cn(
                        "hover:bg-slate-50/50 transition-colors",
                        orderPriority === 'urgent' && "bg-red-50 dark:bg-red-950/20",
                        orderStatus === 'pending_approval' && "bg-yellow-50 dark:bg-yellow-950/20",
                        isOverdue && "bg-orange-50 dark:bg-orange-950/20"
                      )}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedOrders.includes(String(order.id))}
                          onCheckedChange={(checked) => {
                            const sid = String(order.id);
                            if (checked) {
                              setSelectedOrders([...selectedOrders, sid]);
                            } else {
                              setSelectedOrders(selectedOrders.filter(id => id !== sid));
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(order.status)}
                          <div>
                            <p className="font-medium">{order.poNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              by {order.createdBy}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{supplierName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{orderDateObj ? format(orderDateObj, 'MMM dd, yyyy') : '-'}</p>
                        <p className="text-sm text-muted-foreground">
                          {orderDateObj ? (isToday(orderDateObj) ? 'Today' :
                           isYesterday(orderDateObj) ? 'Yesterday' :
                           format(orderDateObj, 'EEE')) : ''}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className={cn(
                          "font-medium",
                          isOverdue ? "text-red-600" : ""
                        )}>
                          {expDateObj ? format(expDateObj, 'MMM dd, yyyy') : '-'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {expDateObj ? (isTomorrow(expDateObj) ? 'Tomorrow' :
                           isToday(expDateObj) ? 'Today' :
                           format(expDateObj, 'EEE')) : ''}
                        </p>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs mt-1">Overdue</Badge>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium"><CurrencyGlyph /> {order.totalAmount.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedOrderForDetail(order);
                              setShowOrderDetail(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(orderStatus === 'draft' || orderStatus === 'pending_approval') && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingOrder(order as any);
                                  const matchedSupplier = suppliers.find(s => s.id === order.supplierId) || null;
                                  setOrderForm({
                                    poNumber: order.poNumber,
                                    selectedSupplier: matchedSupplier,
                                    orderDate: order.orderDate ? new Date(order.orderDate) : new Date(),
                                    expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : addDays(new Date(), 7),
                                    status: orderStatus as any,
                                    priority: orderPriority as any,
                                    items: (order.items || []).map(i => ({
                                      id: String(i.id),
                                      productId: String(i.productId ?? ''),
                                      productName: i.productName,
                                      productCode: i.productSku ?? '',
                                      sku: i.productSku ?? '',
                                      description: '',
                                      category: '',
                                      unitOfMeasure: i.unitOfMeasure ?? 'unit',
                                      quantityOrdered: i.quantityOrdered,
                                      quantityReceived: i.quantityReceived,
                                      unitPrice: i.unitPrice,
                                      discount: i.discountPercent,
                                      taxPercent: i.taxPercent,
                                      totalAmount: i.totalAmount,
                                      notes: i.notes,
                                    })),
                                    subtotal: order.subtotal,
                                    discountAmount: order.discountAmount,
                                    taxAmount: order.taxAmount,
                                    shippingCost: order.shippingCost,
                                    totalAmount: order.totalAmount,
                                    paymentTerms: order.paymentTerms,
                                    deliveryAddress: order.deliveryAddress,
                                    notes: order.notes,
                                  });
                                  setShowOrderForm(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                                onClick={async () => {
                                  if (!confirm('Delete this purchase order?')) return;
                                  try {
                                    await purchaseService.deleteOrder(Number(order.id));
                                    setPurchaseOrders(prev => prev.filter(o => o.id !== order.id));
                                    toast.success('Order deleted');
                                  } catch (err: any) {
                                    toast.error(err.message || 'Failed to delete order');
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {orderStatus === 'pending_approval' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Approve"
                              onClick={async () => {
                                try {
                                  const updated = await purchaseService.updateStatus(Number(order.id), 'APPROVED');
                                  setPurchaseOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                                  toast.success('Order approved');
                                } catch (err: any) {
                                  toast.error(err.message || 'Failed to approve');
                                }
                              }}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {orderStatus === 'approved' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Mark as Ordered"
                              onClick={async () => {
                                try {
                                  const updated = await purchaseService.updateStatus(Number(order.id), 'ORDERED');
                                  setPurchaseOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                                  toast.success('Order marked as ordered');
                                } catch (err: any) {
                                  toast.error(err.message || 'Failed to update status');
                                }
                              }}
                            >
                              <Truck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost">
                            <MoreHorizontal className="h-4 w-4" />
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
        </CardContent>
      </Card>
      )}

      {ordersView === "grid" && (
      <div className="po-panel grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredOrders.length === 0 ? (
          <Card className="border-dashed border-2 shadow-none md:col-span-2 xl:col-span-3">
            <CardContent className="flex flex-col items-center justify-center pt-12 pb-10 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                <ClipboardList className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="font-medium">No purchases found</p>
              <p className="text-sm text-muted-foreground max-w-xs mb-4">
                Create your first purchase to get started
              </p>
              <Button onClick={openCreateOrder}>
                <Plus className="mr-2 h-4 w-4" /> New Purchase
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => {
            const orderDateObj = order.orderDate ? new Date(order.orderDate) : null;
            const expDateObj = order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : null;
            const orderStatus = order.status?.toLowerCase() ?? '';
            const orderPriority = order.priority?.toLowerCase() ?? '';
            const isOverdue = expDateObj && expDateObj < new Date() && orderStatus !== 'received' && orderStatus !== 'cancelled';
            const supplierName = order.supplierName || (order as any).supplier?.name || '-';
            return (
              <Card key={order.id} className="border-primary/10 shadow-md hover:shadow-lg transition-all">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center">
                        {getStatusIcon(order.status)}
                      </div>
                      <div>
                        <p className="font-semibold">{order.poNumber}</p>
                        <p className="text-xs text-muted-foreground">{supplierName}</p>
                      </div>
                    </div>
                    <Checkbox
                      checked={selectedOrders.includes(String(order.id))}
                      onCheckedChange={(checked) => {
                        const sid = String(order.id);
                        if (checked) {
                          setSelectedOrders([...selectedOrders, sid]);
                        } else {
                          setSelectedOrders(selectedOrders.filter(id => id !== sid));
                        }
                      }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {getStatusBadge(order.status)}
                    {getPriorityBadge(order.priority)}
                    {isOverdue && (
                      <Badge variant="destructive" className="text-xs">Overdue</Badge>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{orderDateObj ? format(orderDateObj, 'MMM dd, yyyy') : '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className={cn(isOverdue && "text-red-600")}>
                        {expDateObj ? format(expDateObj, 'MMM dd, yyyy') : '-'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                      <span>{order.items.length} item{order.items.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold"><CurrencyGlyph /> {order.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">by {order.createdBy}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedOrderForDetail(order);
                          setShowOrderDetail(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(orderStatus === 'draft' || orderStatus === 'pending_approval') && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingOrder(order as any);
                              const matchedSupplier = suppliers.find(s => s.id === order.supplierId) || null;
                              setOrderForm({
                                poNumber: order.poNumber,
                                selectedSupplier: matchedSupplier,
                                orderDate: order.orderDate ? new Date(order.orderDate) : new Date(),
                                expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : addDays(new Date(), 7),
                                status: orderStatus as any,
                                priority: orderPriority as any,
                                items: (order.items || []).map(i => ({
                                  id: String(i.id),
                                  productId: String(i.productId ?? ''),
                                  productName: i.productName,
                                  productCode: i.productSku ?? '',
                                  sku: i.productSku ?? '',
                                  description: '',
                                  category: '',
                                  unitOfMeasure: i.unitOfMeasure ?? 'unit',
                                  quantityOrdered: i.quantityOrdered,
                                  quantityReceived: i.quantityReceived,
                                  unitPrice: i.unitPrice,
                                  discount: i.discountPercent,
                                  taxPercent: i.taxPercent,
                                  totalAmount: i.totalAmount,
                                  notes: i.notes,
                                })),
                                subtotal: order.subtotal,
                                discountAmount: order.discountAmount,
                                taxAmount: order.taxAmount,
                                shippingCost: order.shippingCost,
                                totalAmount: order.totalAmount,
                                paymentTerms: order.paymentTerms,
                                deliveryAddress: order.deliveryAddress,
                                notes: order.notes,
                              });
                              setShowOrderForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-700"
                            onClick={async () => {
                              if (!confirm('Delete this purchase order?')) return;
                              try {
                                await purchaseService.deleteOrder(Number(order.id));
                                setPurchaseOrders(prev => prev.filter(o => o.id !== order.id));
                                toast.success('Order deleted');
                              } catch (err: any) {
                                toast.error(err.message || 'Failed to delete order');
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {orderStatus === 'pending_approval' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Approve"
                          onClick={async () => {
                            try {
                              const updated = await purchaseService.updateStatus(Number(order.id), 'APPROVED');
                              setPurchaseOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                              toast.success('Order approved');
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to approve');
                            }
                          }}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      {orderStatus === 'approved' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Mark as Ordered"
                          onClick={async () => {
                            try {
                              const updated = await purchaseService.updateStatus(Number(order.id), 'ORDERED');
                              setPurchaseOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                              toast.success('Order marked as ordered');
                            } catch (err: any) {
                              toast.error(err.message || 'Failed to update status');
                            }
                          }}
                        >
                          <Truck className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      )}

        </TabsContent>{/* end orders tab */}

        <TabsContent value="suppliers" className="space-y-4">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Suppliers</CardTitle>
                  <CardDescription>
                    Add and manage suppliers for your inventory
                  </CardDescription>
                </div>
                <Button onClick={openCreateSupplier}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Supplier
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative max-w-sm mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search suppliers..."
                  value={supplierSearch}
                  onChange={e => setSupplierSearch(e.target.value)}
                  className="pl-11 h-10"
                />
              </div>

              {(() => {
                const filtered = suppliers.filter(s =>
                  !supplierSearch ||
                  s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
                  (s.contactPerson ?? '').toLowerCase().includes(supplierSearch.toLowerCase())
                );

                if (filtered.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                      <Building className="h-10 w-10 mb-3 opacity-30" />
                      <p className="text-sm">No suppliers found</p>
                      <Button variant="outline" className="mt-3" onClick={openCreateSupplier}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add your first supplier
                      </Button>
                    </div>
                  );
                }

                return (
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Supplier Name</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Payment Terms</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map(supplier => (
                        <TableRow key={supplier.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <div>
                              <p className="font-medium">{supplier.name}</p>
                              {supplier.address && (
                                <p className="text-xs text-muted-foreground">{supplier.city}, {supplier.country}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{supplier.contactPerson || '-'}</TableCell>
                          <TableCell>{supplier.email || '-'}</TableCell>
                          <TableCell>{supplier.phone || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{supplier.paymentTerms || '-'}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={supplier.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {supplier.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="ghost" onClick={() => openEditSupplier(supplier)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => handleDeleteSupplier(supplier.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>{/* end suppliers tab */}

      </Tabs>

      {/* Create/Edit Order Modal */}
      <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
        <DialogContent className="max-w-4xl p-0">
          <div className="flex flex-col max-h-[90vh]">
            <div className="px-6 pt-6 pb-4 border-b">
              <DialogHeader>
                <DialogTitle>
                  {editingOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}
                </DialogTitle>
                <DialogDescription>
                  {editingOrder ? 'Update purchase order details' : 'Create a new purchase order with supplier and product information'}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              <div className="space-y-6">
            {/* Step Indicator */}
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                    currentStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={cn(
                      "w-16 h-1 mx-2",
                      currentStep > step ? "bg-primary" : "bg-muted"
                    )} />
                  )}
                </div>
              ))}
            </div>

            <div className="text-sm text-muted-foreground">
              Step {currentStep} of 3: {
                currentStep === 1 ? 'Supplier Selection' :
                currentStep === 2 ? 'Add Items' :
                'Review & Submit'
              }
            </div>

            {/* Step 1: Supplier Selection */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="poNumber">PO Number</Label>
                    <Input
                      id="poNumber"
                      className="mt-2"
                      value={orderForm.poNumber || ''}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, poNumber: e.target.value }))}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={orderForm.priority} onValueChange={(value) => setOrderForm(prev => ({ ...prev, priority: value as any }))}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Supplier *</Label>
                  <Popover open={showSupplierSelector} onOpenChange={setShowSupplierSelector}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={showSupplierSelector}
                        className="w-full justify-between mt-2"
                      >
                        {orderForm.selectedSupplier ? orderForm.selectedSupplier.name : "Select supplier..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Search suppliers..." />
                        <CommandEmpty>No supplier found.</CommandEmpty>
                        <CommandGroup>
                          {suppliers.map((supplier) => (
                            <CommandItem
                              key={supplier.id}
                              onSelect={() => {
                                setOrderForm(prev => ({ 
                                  ...prev, 
                                  selectedSupplier: supplier, 
                                  paymentTerms: supplier.paymentTerms 
                                }));
                                setShowSupplierSelector(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  orderForm.selectedSupplier?.id === supplier.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div>
                                <p className="font-medium">{supplier.name}</p>
                                <p className="text-sm text-muted-foreground">{supplier.contactPerson}</p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {orderForm.selectedSupplier && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Supplier Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Contact Person</Label>
                          <p className="font-medium">{orderForm.selectedSupplier.contactPerson}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Email</Label>
                          <p className="font-medium">{orderForm.selectedSupplier.email}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Phone</Label>
                          <p className="font-medium">{orderForm.selectedSupplier.phone}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Payment Terms</Label>
                          <p className="font-medium">{orderForm.selectedSupplier.paymentTerms}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Address</Label>
                        <p className="font-medium">{orderForm.selectedSupplier.address}, {orderForm.selectedSupplier.city}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="orderDate">Order Date</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      className="mt-2"
                      value={orderForm.orderDate ? format(orderForm.orderDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, orderDate: new Date(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                    <Input
                      id="expectedDeliveryDate"
                      type="date"
                      className="mt-2"
                      value={orderForm.expectedDeliveryDate ? format(orderForm.expectedDeliveryDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, expectedDeliveryDate: new Date(e.target.value) }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="deliveryAddress">Delivery Address</Label>
                  <Textarea
                    id="deliveryAddress"
                    className="mt-2"
                    value={orderForm.deliveryAddress || ''}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 2: Add Items */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Order Items</h3>
                  <Popover open={showProductSelector} onOpenChange={setShowProductSelector}>
                    <PopoverTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Product
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-96 p-0">
                      <Command>
                        <CommandInput placeholder="Search products..." />
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup>
                          {apiProductList.map((product) => (
                            <CommandItem
                              key={product.id}
                              onSelect={() => {
                                addItemToOrder(product);
                                setShowProductSelector(false);
                              }}
                            >
                              <div className="flex-1">
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">{product.sku} - {product.categoryName}</p>
                                <p className="text-sm font-medium"><CurrencyGlyph /> {product.costPrice}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Stock: {product.totalStock}</p>
                                {product.stockStatus === 'LOW_STOCK' && (
                                  <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                                )}
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {orderForm.items && orderForm.items.length > 0 ? (
                  <div className="space-y-4">
                    {orderForm.items.map((item, index) => (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              <div>
                                <h4 className="font-medium">{item.productName}</h4>
                                <p className="text-sm text-muted-foreground">{item.productCode} - {item.sku}</p>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                <div>
                                  <Label className="text-xs">Quantity</Label>
                                  <Input
                                    type="number"
                                    value={item.quantityOrdered || 0}
                                    onChange={(e) => updateOrderItem(item.id, { quantityOrdered: parseInt(e.target.value) || 0 })}
                                    min="1"
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Unit Price ({currencyCode})</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => updateOrderItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Discount ({currencyCode})</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.discount}
                                    onChange={(e) => updateOrderItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Total</Label>
                                  <p className="font-medium p-2"><CurrencyGlyph /> {item.totalAmount.toFixed(2)}</p>
                                </div>
                              </div>

                              <div>
                                <Label className="text-xs">Notes</Label>
                                <Input
                                  value={item.notes || ''}
                                  onChange={(e) => updateOrderItem(item.id, { notes: e.target.value })}
                                  placeholder="Item-specific notes..."
                                />
                              </div>
                            </div>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeItemFromOrder(item.id)}
                              className="ml-4"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No items added yet</p>
                    <p className="text-sm">Click "Add Product" to start building your order</p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Review & Submit */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Order Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>PO Number:</span>
                        <span className="font-medium">{orderForm.poNumber || 'Auto-generated'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Supplier:</span>
                        <span className="font-medium">{orderForm.selectedSupplier?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Items:</span>
                        <span className="font-medium">{orderForm.items?.length || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expected Delivery:</span>
                        <span className="font-medium">
                          {orderForm.expectedDeliveryDate ? format(orderForm.expectedDeliveryDate, 'MMM dd, yyyy') : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Priority:</span>
                        {getPriorityBadge(orderForm.priority || 'medium')}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Financial Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Financial Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span><CurrencyGlyph /> {orderTotals.subtotal.toFixed(2)}</span>
                      </div>
                      {orderTotals.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-<CurrencyGlyph /> {orderTotals.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span><CurrencyGlyph /> {orderTotals.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>Shipping:</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={orderForm.shippingCost || 0}
                          onChange={(e) => setOrderForm(prev => ({ ...prev, shippingCost: parseFloat(e.target.value) || 0 }))}
                          className="w-28 text-right"
                        />
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-lg">
                        <span>Total:</span>
                        <span><CurrencyGlyph /> {orderTotals.totalAmount.toFixed(2)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <Label htmlFor="notes">Order Notes</Label>
                  <Textarea
                    id="notes"
                    value={orderForm.notes || ''}
                    onChange={(e) => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes or special instructions..."
                    rows={3}
                  />
                </div>
              </div>
            )}

              </div>
            </div>

            {/* Navigation */}
            <div className="px-6 py-4 border-t bg-background">
              <div className="flex justify-between">
                <div>
                  {currentStep > 1 && (
                    <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                      Previous
                    </Button>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => setShowOrderForm(false)}>
                    Cancel
                  </Button>
                  
                  {currentStep < 3 ? (
                    <Button 
                      onClick={() => setCurrentStep(currentStep + 1)}
                      disabled={
                        (currentStep === 1 && !orderForm.selectedSupplier) ||
                        (currentStep === 2 && (!orderForm.items || orderForm.items.length === 0))
                      }
                    >
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={() => handleSaveOrder('DRAFT')}>
                        <Save className="mr-2 h-4 w-4" />
                        Save as Draft
                      </Button>
                      <Button onClick={() => handleSaveOrder('PENDING_APPROVAL')}>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Order
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Detail Dialog */}
      <Dialog open={showOrderDetail} onOpenChange={setShowOrderDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedOrderForDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-3">
                    {getStatusIcon(selectedOrderForDetail.status)}
                    <span>{selectedOrderForDetail.poNumber}</span>
                    {getPriorityBadge(selectedOrderForDetail.priority)}
                  </span>
                  {getStatusBadge(selectedOrderForDetail.status)}
                </DialogTitle>
                <DialogDescription>
                  Purchase order details and line items
                </DialogDescription>
              </DialogHeader>

              <div id="po-detail-print" className="space-y-6">
                {/* Order Information */}
                {(() => {
                  const d = selectedOrderForDetail as any;
                  const detailSupplierName = d.supplierName || d.supplier?.name || '';
                  const detailSupplierContact = d.supplier?.contactPerson || '';
                  const detailSupplierEmail = d.supplier?.email || '';
                  const detailSupplierPhone = d.supplier?.phone || '';
                  const detailOrderDate = d.orderDate ? new Date(d.orderDate) : null;
                  const detailExpDate = d.expectedDeliveryDate ? new Date(d.expectedDeliveryDate) : null;
                  return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Supplier Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">Company</Label>
                        <p className="font-medium">{detailSupplierName}</p>
                      </div>
                      {detailSupplierContact && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Contact Person</Label>
                          <p className="font-medium">{detailSupplierContact}</p>
                        </div>
                      )}
                      {(detailSupplierEmail || detailSupplierPhone) && (
                        <div className="grid grid-cols-2 gap-3">
                          {detailSupplierEmail && (
                            <div>
                              <Label className="text-sm text-muted-foreground">Email</Label>
                              <p className="font-medium text-sm">{detailSupplierEmail}</p>
                            </div>
                          )}
                          {detailSupplierPhone && (
                            <div>
                              <Label className="text-sm text-muted-foreground">Phone</Label>
                              <p className="font-medium text-sm">{detailSupplierPhone}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Order Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Order Date</Label>
                          <p className="font-medium">{detailOrderDate ? format(detailOrderDate, 'MMM dd, yyyy') : '-'}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Expected Delivery</Label>
                          <p className="font-medium">{detailExpDate ? format(detailExpDate, 'MMM dd, yyyy') : '-'}</p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Created By</Label>
                        <p className="font-medium">{selectedOrderForDetail.createdBy}</p>
                      </div>
                      {selectedOrderForDetail.approvedBy && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Approved By</Label>
                          <p className="font-medium">{selectedOrderForDetail.approvedBy}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm text-muted-foreground">Payment Terms</Label>
                        <p className="font-medium">{selectedOrderForDetail.paymentTerms}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                  );
                })()}

                {/* Line Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Order Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Price</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedOrderForDetail.items.map((item: any) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(item.productSku || item.productCode || item.sku) && `${item.productSku || item.productCode || item.sku}`}
                                </p>
                                {item.notes && (
                                  <p className="text-sm text-muted-foreground italic">{item.notes}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.quantityOrdered} {item.unitOfMeasure}</p>
                                {item.quantityReceived > 0 && (
                                  <p className="text-sm text-green-600">Received: {item.quantityReceived}</p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell><CurrencyGlyph /> {Number(item.unitPrice).toFixed(2)}</TableCell>
                            <TableCell>
                              {(item.discountPercent || item.discount || 0) > 0
                                ? `${(item.discountPercent || item.discount || 0)}%`
                                : '-'}
                            </TableCell>
                            <TableCell className="font-medium"><CurrencyGlyph /> {Number(item.totalAmount).toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Financial Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Financial Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Subtotal:</span>
                        <span><CurrencyGlyph /> {selectedOrderForDetail.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedOrderForDetail.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-<CurrencyGlyph /> {selectedOrderForDetail.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span><CurrencyGlyph /> {selectedOrderForDetail.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping:</span>
                        <span><CurrencyGlyph /> {selectedOrderForDetail.shippingCost.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>Total Amount:</span>
                        <span><CurrencyGlyph /> {selectedOrderForDetail.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                {selectedOrderForDetail.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground">{selectedOrderForDetail.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {/* Actions */}
                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={() => {
                      const el = document.getElementById('po-detail-print');
                      if (!el) return;
                      const w = window.open('', '_blank');
                      if (!w) return;
                      w.document.write(`<!DOCTYPE html><html><head><title>PO ${selectedOrderForDetail?.poNumber}</title>
                        <style>body{font-family:Arial,sans-serif;margin:20px;color:#1E293B}table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd}th{background:#f9fafb}.total{font-weight:bold;font-size:16px}@media print{button{display:none}}</style></head>
                        <body>${el.innerHTML}</body></html>`);
                      w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
                    }}>
                      <PrinterIcon className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                    <Button variant="outline" onClick={() => {
                      const el = document.getElementById('po-detail-print');
                      if (!el) return;
                      const w = window.open('', '_blank');
                      if (!w) return;
                      w.document.write(`<!DOCTYPE html><html><head><title>PO ${selectedOrderForDetail?.poNumber}</title>
                        <style>body{font-family:Arial,sans-serif;margin:20px;color:#1E293B}table{width:100%;border-collapse:collapse}th,td{padding:8px;text-align:left;border-bottom:1px solid #ddd}th{background:#f9fafb}.total{font-weight:bold;font-size:16px}</style></head>
                        <body>${el.innerHTML}</body></html>`);
                      w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
                    }}>
                      <Download className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                    <Button variant="outline" onClick={() => {
                      const po = selectedOrderForDetail;
                      if (!po) return;
                      const subject = encodeURIComponent(`Purchase Order ${po.poNumber}`);
                      const body = encodeURIComponent(`Dear ${po.paymentTerms ? 'Supplier' : 'Team'},\n\nPlease find attached Purchase Order ${po.poNumber} for ${po.items.length} item(s) totalling ${currencyCode} ${po.totalAmount.toFixed(2)}.\n\nDelivery expected by: ${po.expectedDeliveryDate || 'TBD'}\n\nThank you.`);
                      window.open(`mailto:?subject=${subject}&body=${body}`);
                    }}>
                      <Mail className="mr-2 h-4 w-4" />
                      Email to Supplier
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    {(() => {
                      const detailStatus = (selectedOrderForDetail.status ?? '').toLowerCase();
                      return (
                        <>
                          {detailStatus === 'pending_approval' && (
                            <>
                              <Button
                                variant="outline"
                                onClick={async () => {
                                  try {
                                    const updated = await purchaseService.updateStatus(Number(selectedOrderForDetail.id), 'CANCELLED');
                                    setPurchaseOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                                    setSelectedOrderForDetail(updated as any);
                                    toast.success('Order rejected/cancelled');
                                  } catch (err: any) { toast.error(err.message); }
                                }}
                              >
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </Button>
                              <Button
                                onClick={async () => {
                                  try {
                                    const updated = await purchaseService.updateStatus(Number(selectedOrderForDetail.id), 'APPROVED');
                                    setPurchaseOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                                    setSelectedOrderForDetail(updated as any);
                                    toast.success('Order approved');
                                  } catch (err: any) { toast.error(err.message); }
                                }}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Approve
                              </Button>
                            </>
                          )}
                          {(detailStatus === 'ordered' || detailStatus === 'partially_received') && (
                            <Button
                              onClick={async () => {
                                try {
                                  const updated = await purchaseService.updateStatus(Number(selectedOrderForDetail.id), 'RECEIVED');
                                  setPurchaseOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                                  setSelectedOrderForDetail(updated as any);
                                  toast.success('Order marked as received');
                                } catch (err: any) { toast.error(err.message); }
                              }}
                            >
                              <Package className="mr-2 h-4 w-4" />
                              Mark as Received
                            </Button>
                          )}
                          {detailStatus === 'draft' && (
                            <Button
                              onClick={async () => {
                                try {
                                  const updated = await purchaseService.updateStatus(Number(selectedOrderForDetail.id), 'PENDING_APPROVAL');
                                  setPurchaseOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
                                  setSelectedOrderForDetail(updated as any);
                                  toast.success('Order submitted for approval');
                                } catch (err: any) { toast.error(err.message); }
                              }}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Submit for Approval
                            </Button>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Supplier Create/Edit Dialog */}
      <Dialog open={showSupplierForm} onOpenChange={setShowSupplierForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
            <DialogDescription>
              {editingSupplier ? 'Update supplier information' : 'Create a new supplier for purchase orders'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Company Name *</Label>
                <Input
                  value={supplierForm.name}
                  onChange={e => setSupplierForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g., Sports Nutrition Ltd"
                />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input
                  value={supplierForm.contactPerson}
                  onChange={e => setSupplierForm(f => ({ ...f, contactPerson: e.target.value }))}
                  placeholder="Contact name"
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={supplierForm.email}
                  onChange={e => setSupplierForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="supplier@email.com"
                />
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={supplierForm.phone}
                  onChange={e => setSupplierForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+971 XX XXX XXXX"
                />
              </div>
              <div>
                <Label>Tax ID / TRN</Label>
                <Input
                  value={supplierForm.taxId}
                  onChange={e => setSupplierForm(f => ({ ...f, taxId: e.target.value }))}
                  placeholder="Tax registration number"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Input
                  value={supplierForm.address}
                  onChange={e => setSupplierForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Street address"
                />
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={supplierForm.city}
                  onChange={e => setSupplierForm(f => ({ ...f, city: e.target.value }))}
                  placeholder="City"
                />
              </div>
              <div>
                <Label>Country</Label>
                <Input
                  value={supplierForm.country}
                  onChange={e => setSupplierForm(f => ({ ...f, country: e.target.value }))}
                  placeholder="UAE"
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Select value={supplierForm.paymentTerms} onValueChange={v => setSupplierForm(f => ({ ...f, paymentTerms: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COD">COD (Cash on Delivery)</SelectItem>
                    <SelectItem value="NET15">NET 15</SelectItem>
                    <SelectItem value="NET30">NET 30</SelectItem>
                    <SelectItem value="NET45">NET 45</SelectItem>
                    <SelectItem value="NET60">NET 60</SelectItem>
                    <SelectItem value="NET90">NET 90</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Credit Limit ({currencyCode})</Label>
                <Input
                  type="number"
                  value={supplierForm.creditLimit}
                  onChange={e => setSupplierForm(f => ({ ...f, creditLimit: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                />
              </div>
              <div className="md:col-span-2">
                <Label>Notes</Label>
                <Textarea
                  value={supplierForm.notes}
                  onChange={e => setSupplierForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Additional notes about this supplier..."
                  rows={2}
                />
              </div>
              <div className="flex items-center space-x-3">
                <Switch
                  checked={supplierForm.isActive}
                  onCheckedChange={v => setSupplierForm(f => ({ ...f, isActive: v }))}
                />
                <Label>Active Supplier</Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={() => setShowSupplierForm(false)}>Cancel</Button>
            <Button onClick={handleSaveSupplier} disabled={savingSupplier}>
              <Save className="mr-2 h-4 w-4" />
              {savingSupplier ? 'Saving...' : (editingSupplier ? 'Update Supplier' : 'Create Supplier')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Loading Dialog */}
      <Dialog open={isExporting} onOpenChange={setIsExporting}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Exporting Orders</span>
            </DialogTitle>
            <DialogDescription>
              Preparing your purchase order data for export...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div>
                <p className="font-medium">Processing orders...</p>
                <p className="text-sm text-muted-foreground">This may take a few moments</p>
              </div>
            </div>
            <Progress value={65} className="w-full" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => {
            setIsCreatingOrder(true);
            resetForm();
            setShowOrderForm(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

