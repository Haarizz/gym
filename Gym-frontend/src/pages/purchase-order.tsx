import React, { useState, useMemo, useCallback, useRef } from 'react';
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "../components/ui/sheet";
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
  Crown
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

  // Sample data - in real app this would come from your backend
  const suppliers: Supplier[] = [
    {
      id: '1',
      name: 'Sports Nutrition Ltd',
      contactPerson: 'Ahmed Hassan',
      email: 'ahmed@sportsnutrition.ae',
      phone: '+971-4-123-4567',
      address: '123 Business Bay',
      city: 'Dubai',
      country: 'UAE',
      taxId: 'TRN123456789',
      paymentTerms: 'NET 30',
      creditLimit: 50000,
      isActive: true,
      rating: 4.8,
      totalOrders: 45,
      totalSpent: 125000
    },
    {
      id: '2',
      name: 'Fitness Equipment Co',
      contactPerson: 'Sarah Johnson',
      email: 'sarah@fitnessequip.ae',
      phone: '+971-4-234-5678',
      address: '456 Industrial Area',
      city: 'Sharjah',
      country: 'UAE',
      taxId: 'TRN234567890',
      paymentTerms: 'NET 15',
      creditLimit: 100000,
      isActive: true,
      rating: 4.6,
      totalOrders: 23,
      totalSpent: 89000
    },
    {
      id: '3',
      name: 'Beverage Suppliers Inc',
      contactPerson: 'Mike Chen',
      email: 'mike@beverages.ae',
      phone: '+971-4-345-6789',
      address: '789 Food District',
      city: 'Abu Dhabi',
      country: 'UAE',
      taxId: 'TRN345678901',
      paymentTerms: 'NET 7',
      creditLimit: 25000,
      isActive: true,
      rating: 4.5,
      totalOrders: 67,
      totalSpent: 45000
    }
  ];

  const products: Product[] = [
    {
      id: '1',
      name: 'Whey Protein Isolate',
      code: 'SUP001',
      sku: 'WPI-CHOC-2KG',
      description: 'Premium whey protein isolate for muscle building',
      category: 'Supplements',
      unitOfMeasure: 'kg',
      currentStock: 23,
      reorderPoint: 15,
      averageUnitCost: 85,
      lastPurchasePrice: 85,
      preferredSupplier: '1'
    },
    {
      id: '2',
      name: 'Adjustable Dumbbell Set',
      code: 'EQP001',
      sku: 'ADB-SET-50',
      description: 'Professional adjustable dumbbell set 5-50kg',
      category: 'Equipment',
      unitOfMeasure: 'set',
      currentStock: 3,
      reorderPoint: 5,
      averageUnitCost: 450,
      lastPurchasePrice: 450,
      preferredSupplier: '2'
    },
    {
      id: '3',
      name: 'Protein Smoothie Mix',
      code: 'CAF001',
      sku: 'PSM-BERRY-500ML',
      description: 'Ready-to-blend protein smoothie mix',
      category: 'Café & Bar',
      unitOfMeasure: 'bottle',
      currentStock: 45,
      reorderPoint: 50,
      averageUnitCost: 3.50,
      lastPurchasePrice: 3.50,
      preferredSupplier: '3'
    }
  ];

  const purchaseOrders: PurchaseOrder[] = [
    {
      id: '1',
      poNumber: 'PO-2024-001',
      supplier: suppliers[0],
      orderDate: new Date(),
      expectedDeliveryDate: addDays(new Date(), 7),
      status: 'pending_approval',
      priority: 'high',
      items: [
        {
          id: '1-1',
          productId: '1',
          productName: 'Whey Protein Isolate',
          productCode: 'SUP001',
          sku: 'WPI-CHOC-2KG',
          description: 'Premium whey protein isolate',
          category: 'Supplements',
          unitOfMeasure: 'kg',
          quantityOrdered: 50,
          quantityReceived: 0,
          unitPrice: 85,
          discount: 0,
          taxPercent: 5,
          totalAmount: 4462.50,
          notes: 'Chocolate flavor preferred'
        }
      ],
      subtotal: 4250,
      discountAmount: 0,
      taxAmount: 212.50,
      shippingCost: 100,
      totalAmount: 4562.50,
      paymentTerms: 'NET 30',
      deliveryAddress: 'GymBios Main Branch\n123 Fitness Street\nDubai, UAE',
      notes: 'Urgent restock needed for protein supplements',
      attachments: [],
      createdBy: 'John Smith',
      createdAt: new Date(),
      updatedAt: new Date(),
      approvalWorkflow: {
        level: 1,
        approvers: ['Manager', 'Finance'],
        currentApprover: 'Manager',
        approvalHistory: []
      }
    },
    {
      id: '2',
      poNumber: 'PO-2024-002',
      supplier: suppliers[1],
      orderDate: subDays(new Date(), 2),
      expectedDeliveryDate: addDays(new Date(), 10),
      status: 'ordered',
      priority: 'medium',
      items: [
        {
          id: '2-1',
          productId: '2',
          productName: 'Adjustable Dumbbell Set',
          productCode: 'EQP001',
          sku: 'ADB-SET-50',
          description: 'Professional adjustable dumbbell set',
          category: 'Equipment',
          unitOfMeasure: 'set',
          quantityOrdered: 5,
          quantityReceived: 0,
          unitPrice: 450,
          discount: 100,
          taxPercent: 5,
          totalAmount: 2487.50,
          notes: 'Include installation manual'
        }
      ],
      subtotal: 2250,
      discountAmount: 100,
      taxAmount: 107.50,
      shippingCost: 200,
      totalAmount: 2457.50,
      paymentTerms: 'NET 15',
      deliveryAddress: 'GymBios Main Branch\n123 Fitness Street\nDubai, UAE',
      createdBy: 'Sarah Johnson',
      approvedBy: 'Manager',
      createdAt: subDays(new Date(), 2),
      updatedAt: subDays(new Date(), 1)
    },
    {
      id: '3',
      poNumber: 'PO-2024-003',
      supplier: suppliers[2],
      orderDate: subDays(new Date(), 5),
      expectedDeliveryDate: addDays(new Date(), 2),
      actualDeliveryDate: subDays(new Date(), 1),
      status: 'received',
      priority: 'low',
      items: [
        {
          id: '3-1',
          productId: '3',
          productName: 'Protein Smoothie Mix',
          productCode: 'CAF001',
          sku: 'PSM-BERRY-500ML',
          description: 'Ready-to-blend protein smoothie mix',
          category: 'Café & Bar',
          unitOfMeasure: 'bottle',
          quantityOrdered: 100,
          quantityReceived: 100,
          unitPrice: 3.50,
          discount: 0,
          taxPercent: 5,
          totalAmount: 367.50,
          notes: 'Mixed berry flavor'
        }
      ],
      subtotal: 350,
      discountAmount: 0,
      taxAmount: 17.50,
      shippingCost: 50,
      totalAmount: 417.50,
      paymentTerms: 'NET 7',
      deliveryAddress: 'GymBios Main Branch\n123 Fitness Street\nDubai, UAE',
      createdBy: 'Mike Chen',
      approvedBy: 'Manager',
      createdAt: subDays(new Date(), 5),
      updatedAt: subDays(new Date(), 1)
    }
  ];

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
    const totalOrders = purchaseOrders.length;
    const pendingApprovals = purchaseOrders.filter(po => po.status === 'pending_approval').length;
    const totalSpendThisMonth = purchaseOrders
      .filter(po => po.orderDate >= startOfMonth(new Date()) && po.orderDate <= endOfMonth(new Date()))
      .reduce((sum, po) => sum + po.totalAmount, 0);
    
    const supplierCounts = purchaseOrders.reduce((acc, po) => {
      acc[po.supplier.name] = (acc[po.supplier.name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const topSupplier = Object.entries(supplierCounts).sort(([,a], [,b]) => b - a)[0];
    
    const urgentOrders = purchaseOrders.filter(po => 
      po.priority === 'urgent' || po.priority === 'high'
    ).length;
    
    const overdueOrders = purchaseOrders.filter(po => 
      po.status !== 'received' && po.status !== 'cancelled' && 
      po.expectedDeliveryDate < new Date()
    ).length;

    return {
      totalOrders,
      pendingApprovals,
      totalSpendThisMonth,
      topSupplier: topSupplier ? topSupplier[0] : 'N/A',
      urgentOrders,
      overdueOrders
    };
  }, [purchaseOrders]);

  // Filter purchase orders
  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(order => {
      const matchesSearch = searchTerm === '' || 
        order.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = selectedStatus === 'all' || order.status === selectedStatus;
      const matchesSupplier = selectedSupplier === 'all' || order.supplier.id === selectedSupplier;
      const matchesPriority = selectedPriority === 'all' || order.priority === selectedPriority;
      
      return matchesSearch && matchesStatus && matchesSupplier && matchesPriority;
    });
  }, [purchaseOrders, searchTerm, selectedStatus, selectedSupplier, selectedPriority]);

  // Handle order creation/editing
  const handleSaveOrder = useCallback(() => {
    if (!orderForm.selectedSupplier || !orderForm.items || orderForm.items.length === 0) {
      toast.error('Please select a supplier and add at least one item');
      return;
    }

    // Calculate totals
    const subtotal = orderForm.items.reduce((sum, item) => sum + (item.quantityOrdered * item.unitPrice - item.discount), 0);
    const taxAmount = orderForm.items.reduce((sum, item) => sum + ((item.quantityOrdered * item.unitPrice - item.discount) * item.taxPercent / 100), 0);
    const totalAmount = subtotal + taxAmount + (orderForm.shippingCost || 0);

    const updatedOrder = {
      ...orderForm,
      supplier: orderForm.selectedSupplier,
      subtotal,
      taxAmount,
      totalAmount,
      poNumber: orderForm.poNumber || `PO-${new Date().getFullYear()}-${String(purchaseOrders.length + 1).padStart(3, '0')}`
    };

    if (editingOrder) {
      toast.success('Purchase order updated successfully!');
    } else {
      toast.success('Purchase order created successfully!');
    }

    setShowOrderForm(false);
    resetForm();
  }, [orderForm, editingOrder, purchaseOrders.length]);

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

  // Handle bulk actions
  const handleBulkAction = useCallback((action: string) => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders first');
      return;
    }

    switch (action) {
      case 'approve':
        toast.success(`${selectedOrders.length} orders approved`);
        break;
      case 'cancel':
        toast.success(`${selectedOrders.length} orders cancelled`);
        break;
      case 'export':
        setIsExporting(true);
        setTimeout(() => {
          setIsExporting(false);
          toast.success(`${selectedOrders.length} orders exported`);
        }, 2000);
        break;
      case 'print':
        toast.success(`${selectedOrders.length} orders sent to printer`);
        break;
    }
    setSelectedOrders([]);
  }, [selectedOrders]);

  // Add item to order
  const addItemToOrder = useCallback((product: Product, quantity: number = 1) => {
    const newItem: PurchaseOrderItem = {
      id: `item-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      sku: product.sku,
      description: product.description,
      category: product.category,
      unitOfMeasure: product.unitOfMeasure,
      quantityOrdered: quantity,
      quantityReceived: 0,
      unitPrice: product.lastPurchasePrice,
      discount: 0,
      taxPercent: 5,
      totalAmount: quantity * product.lastPurchasePrice,
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

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      pending_approval: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800' },
      ordered: { label: 'Ordered', className: 'bg-purple-100 text-purple-800' },
      partially_received: { label: 'Partially Received', className: 'bg-orange-100 text-orange-800' },
      received: { label: 'Received', className: 'bg-green-100 text-green-800' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  // Get priority badge
  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { label: 'Low', className: 'bg-green-100 text-green-800' },
      medium: { label: 'Medium', className: 'bg-blue-100 text-blue-800' },
      high: { label: 'High', className: 'bg-orange-100 text-orange-800' },
      urgent: { label: 'Urgent', className: 'bg-red-100 text-red-800' }
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
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
          <Button onClick={() => {
            setIsCreatingOrder(true);
            resetForm();
            setShowOrderForm(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Create New PO
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total POs</p>
                <p className="text-2xl font-bold">{analytics.totalOrders}</p>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
              <ClipboardList className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                <p className="text-2xl font-bold text-yellow-600">{analytics.pendingApprovals}</p>
                <p className="text-sm text-muted-foreground">Need approval</p>
              </div>
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Spend</p>
                <p className="text-2xl font-bold text-green-600">AED {analytics.totalSpendThisMonth.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Supplier</p>
                <p className="text-lg font-bold text-purple-600">{analytics.topSupplier}</p>
                <p className="text-sm text-muted-foreground">Most orders</p>
              </div>
              <Building className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Urgent Orders</p>
                <p className="text-2xl font-bold text-red-600">{analytics.urgentOrders}</p>
                <p className="text-sm text-muted-foreground">High priority</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-orange-600">{analytics.overdueOrders}</p>
                <p className="text-sm text-muted-foreground">Past due date</p>
              </div>
              <Truck className="h-6 w-6 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
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

            <div className="flex gap-2 flex-wrap">
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
                    <SelectItem key={supplier.id} value={supplier.id}>
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
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              >
                <Filter className="mr-2 h-4 w-4" />
                Advanced
              </Button>
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
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Purchase Orders</CardTitle>
              <CardDescription>
                {filteredOrders.length} of {purchaseOrders.length} orders
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedOrders.length === filteredOrders.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedOrders(filteredOrders.map(po => po.id));
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
                {filteredOrders.map((order) => (
                  <TableRow 
                    key={order.id}
                    className={cn(
                      order.priority === 'urgent' && "bg-red-50 dark:bg-red-950/20",
                      order.status === 'pending_approval' && "bg-yellow-50 dark:bg-yellow-950/20",
                      order.expectedDeliveryDate < new Date() && order.status !== 'received' && order.status !== 'cancelled' && "bg-orange-50 dark:bg-orange-950/20"
                    )}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedOrders.includes(order.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedOrders([...selectedOrders, order.id]);
                          } else {
                            setSelectedOrders(selectedOrders.filter(id => id !== order.id));
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
                        <p className="font-medium">{order.supplier.name}</p>
                        <p className="text-sm text-muted-foreground">{order.supplier.contactPerson}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{format(order.orderDate, 'MMM dd, yyyy')}</p>
                      <p className="text-sm text-muted-foreground">
                        {isToday(order.orderDate) ? 'Today' :
                         isYesterday(order.orderDate) ? 'Yesterday' :
                         format(order.orderDate, 'EEE')}
                      </p>
                    </TableCell>
                    <TableCell>
                      <p className={cn(
                        "font-medium",
                        order.expectedDeliveryDate < new Date() && order.status !== 'received' && order.status !== 'cancelled' ? "text-red-600" : ""
                      )}>
                        {format(order.expectedDeliveryDate, 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {isTomorrow(order.expectedDeliveryDate) ? 'Tomorrow' :
                         isToday(order.expectedDeliveryDate) ? 'Today' :
                         format(order.expectedDeliveryDate, 'EEE')}
                      </p>
                      {order.expectedDeliveryDate < new Date() && order.status !== 'received' && order.status !== 'cancelled' && (
                        <Badge variant="destructive" className="text-xs mt-1">Overdue</Badge>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">AED {order.totalAmount.toLocaleString()}</p>
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
                        {order.status === 'draft' || order.status === 'pending_approval' ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingOrder(order);
                              setOrderForm({
                                ...order,
                                selectedSupplier: order.supplier
                              });
                              setShowOrderForm(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        ) : null}
                        <Button size="sm" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Order Sheet */}
      <Sheet open={showOrderForm} onOpenChange={setShowOrderForm}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingOrder ? 'Edit Purchase Order' : 'Create New Purchase Order'}
            </SheetTitle>
            <SheetDescription>
              {editingOrder ? 'Update purchase order details' : 'Create a new purchase order with supplier and product information'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
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
                      value={orderForm.poNumber || ''}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, poNumber: e.target.value }))}
                      placeholder="Auto-generated if empty"
                    />
                  </div>
                  <div>
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={orderForm.priority} onValueChange={(value) => setOrderForm(prev => ({ ...prev, priority: value as any }))}>
                      <SelectTrigger>
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
                        className="w-full justify-between"
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
                      value={orderForm.orderDate ? format(orderForm.orderDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, orderDate: new Date(e.target.value) }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="expectedDeliveryDate">Expected Delivery Date</Label>
                    <Input
                      id="expectedDeliveryDate"
                      type="date"
                      value={orderForm.expectedDeliveryDate ? format(orderForm.expectedDeliveryDate, 'yyyy-MM-dd') : ''}
                      onChange={(e) => setOrderForm(prev => ({ ...prev, expectedDeliveryDate: new Date(e.target.value) }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="deliveryAddress">Delivery Address</Label>
                  <Textarea
                    id="deliveryAddress"
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
                          {products.map((product) => (
                            <CommandItem
                              key={product.id}
                              onSelect={() => {
                                addItemToOrder(product);
                                setShowProductSelector(false);
                              }}
                            >
                              <div className="flex-1">
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-muted-foreground">{product.code} - {product.category}</p>
                                <p className="text-sm font-medium">AED {product.lastPurchasePrice}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">Stock: {product.currentStock}</p>
                                {product.currentStock <= product.reorderPoint && (
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
                                  <Label className="text-xs">Unit Price (AED)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.unitPrice}
                                    onChange={(e) => updateOrderItem(item.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Discount (AED)</Label>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    value={item.discount}
                                    onChange={(e) => updateOrderItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
                                  />
                                </div>
                                <div>
                                  <Label className="text-xs">Total</Label>
                                  <p className="font-medium p-2">AED {item.totalAmount.toFixed(2)}</p>
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
                        <span>AED {orderForm.subtotal?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Discount:</span>
                        <span>AED {orderForm.discountAmount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>AED {orderForm.taxAmount?.toFixed(2) || '0.00'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping:</span>
                        <div className="text-right">
                          <Input
                            type="number"
                            step="0.01"
                            value={orderForm.shippingCost || 0}
                            onChange={(e) => setOrderForm(prev => ({ ...prev, shippingCost: parseFloat(e.target.value) || 0 }))}
                            className="w-24 text-right"
                          />
                        </div>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>Total:</span>
                        <span>AED {orderForm.totalAmount?.toFixed(2) || '0.00'}</span>
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

            {/* Navigation */}
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
                    <Button variant="outline" onClick={handleSaveOrder}>
                      <Save className="mr-2 h-4 w-4" />
                      Save as Draft
                    </Button>
                    <Button onClick={handleSaveOrder}>
                      <Send className="mr-2 h-4 w-4" />
                      Submit Order
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

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

              <div className="space-y-6">
                {/* Order Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Supplier Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">Company</Label>
                        <p className="font-medium">{selectedOrderForDetail.supplier.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Contact Person</Label>
                        <p className="font-medium">{selectedOrderForDetail.supplier.contactPerson}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Email</Label>
                          <p className="font-medium text-sm">{selectedOrderForDetail.supplier.email}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Phone</Label>
                          <p className="font-medium text-sm">{selectedOrderForDetail.supplier.phone}</p>
                        </div>
                      </div>
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
                          <p className="font-medium">{format(selectedOrderForDetail.orderDate, 'MMM dd, yyyy')}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Expected Delivery</Label>
                          <p className="font-medium">{format(selectedOrderForDetail.expectedDeliveryDate, 'MMM dd, yyyy')}</p>
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
                        {selectedOrderForDetail.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.productName}</p>
                                <p className="text-sm text-muted-foreground">{item.productCode} - {item.sku}</p>
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
                            <TableCell>AED {item.unitPrice.toFixed(2)}</TableCell>
                            <TableCell>
                              {item.discount > 0 ? `AED ${item.discount.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="font-medium">AED {item.totalAmount.toFixed(2)}</TableCell>
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
                        <span>AED {selectedOrderForDetail.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedOrderForDetail.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-AED {selectedOrderForDetail.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>AED {selectedOrderForDetail.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping:</span>
                        <span>AED {selectedOrderForDetail.shippingCost.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>Total Amount:</span>
                        <span>AED {selectedOrderForDetail.totalAmount.toFixed(2)}</span>
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
                    <Button variant="outline">
                      <PrinterIcon className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                    <Button variant="outline">
                      <Download className="mr-2 h-4 w-4" />
                      Export PDF
                    </Button>
                    <Button variant="outline">
                      <Mail className="mr-2 h-4 w-4" />
                      Email to Supplier
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    {selectedOrderForDetail.status === 'pending_approval' && (
                      <>
                        <Button variant="outline">
                          <XCircle className="mr-2 h-4 w-4" />
                          Reject
                        </Button>
                        <Button>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </>
                    )}
                    {selectedOrderForDetail.status === 'ordered' && (
                      <Button>
                        <Package className="mr-2 h-4 w-4" />
                        Mark as Received
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
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

