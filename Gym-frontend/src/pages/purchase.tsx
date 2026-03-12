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
  ShoppingBag,
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
  Receipt,
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
  Paperclip,
  Image,
  FilePlus,
  BarChart3,
  PieChart,
  LineChart,
  Camera,
  ScanLine,
  Sparkles,
  TrendingUpDown,
  Layers,
  Box,
  Boxes
} from 'lucide-react';
import { toast } from "sonner";
import { format, addDays, subDays, isToday, isYesterday, isTomorrow, addWeeks, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { cn } from "../components/ui/utils";
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
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
  ResponsiveContainer
} from 'recharts';

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
  totalPurchases: number;
  totalSpent: number;
  lastPurchaseDate: Date;
}

interface PurchaseItem {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  sku: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  quantityPurchased: number;
  unitCost: number;
  discount: number;
  taxPercent: number;
  totalAmount: number;
  expiryDate?: Date;
  batchNumber?: string;
  notes?: string;
}

interface Purchase {
  id: string;
  purchaseNumber: string;
  supplier: Supplier;
  purchaseDate: Date;
  deliveryDate?: Date;
  status: 'draft' | 'pending_approval' | 'approved' | 'ordered' | 'received' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  items: PurchaseItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shippingCost: number;
  totalAmount: number;
  paymentTerms: string;
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  invoiceNumber?: string;
  referenceNumber?: string;
  notes?: string;
  attachments: string[];
  createdBy: string;
  approvedBy?: string;
  receivedBy?: string;
  createdAt: Date;
  updatedAt: Date;
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
  isActive: boolean;
}

export function Purchase() {
  const [activeTab, setActiveTab] = useState('purchases');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedSupplier, setSelectedSupplier] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [dateRange, setDateRange] = useState('month');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedPurchases, setSelectedPurchases] = useState<string[]>([]);
  const [isCreatingPurchase, setIsCreatingPurchase] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showPurchaseDetail, setShowPurchaseDetail] = useState(false);
  const [selectedPurchaseForDetail, setSelectedPurchaseForDetail] = useState<Purchase | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showSupplierSelector, setShowSupplierSelector] = useState(false);
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

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
      totalPurchases: 45,
      totalSpent: 125000,
      lastPurchaseDate: subDays(new Date(), 5)
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
      totalPurchases: 23,
      totalSpent: 89000,
      lastPurchaseDate: subDays(new Date(), 10)
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
      totalPurchases: 67,
      totalSpent: 45000,
      lastPurchaseDate: subDays(new Date(), 2)
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
      preferredSupplier: '1',
      isActive: true
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
      preferredSupplier: '2',
      isActive: true
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
      preferredSupplier: '3',
      isActive: true
    }
  ];

  const purchases: Purchase[] = [
    {
      id: '1',
      purchaseNumber: 'PUR-2024-001',
      supplier: suppliers[0],
      purchaseDate: new Date(),
      deliveryDate: addDays(new Date(), 3),
      status: 'received',
      priority: 'medium',
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
          quantityPurchased: 20,
          unitCost: 85,
          discount: 0,
          taxPercent: 5,
          totalAmount: 1785,
          expiryDate: addDays(new Date(), 365),
          batchNumber: 'WPI-2024-001',
          notes: 'Chocolate flavor'
        }
      ],
      subtotal: 1700,
      discountAmount: 0,
      taxAmount: 85,
      shippingCost: 100,
      totalAmount: 1885,
      paymentTerms: 'NET 30',
      paymentStatus: 'paid',
      invoiceNumber: 'INV-2024-001',
      referenceNumber: 'REF-001',
      notes: 'Received in good condition',
      attachments: ['invoice.pdf', 'delivery_receipt.jpg'],
      createdBy: 'John Smith',
      approvedBy: 'Manager',
      receivedBy: 'Warehouse Team',
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: '2',
      purchaseNumber: 'PUR-2024-002',
      supplier: suppliers[1],
      purchaseDate: subDays(new Date(), 2),
      status: 'pending_approval',
      priority: 'high',
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
          quantityPurchased: 3,
          unitCost: 450,
          discount: 50,
          taxPercent: 5,
          totalAmount: 1417.5,
          notes: 'Include installation manual'
        }
      ],
      subtotal: 1350,
      discountAmount: 50,
      taxAmount: 67.5,
      shippingCost: 200,
      totalAmount: 1567.5,
      paymentTerms: 'NET 15',
      paymentStatus: 'pending',
      referenceNumber: 'REF-002',
      notes: 'Urgent requirement for new branch',
      attachments: ['quote.pdf'],
      createdBy: 'Sarah Johnson',
      createdAt: subDays(new Date(), 2),
      updatedAt: subDays(new Date(), 1)
    },
    {
      id: '3',
      purchaseNumber: 'PUR-2024-003',
      supplier: suppliers[2],
      purchaseDate: subDays(new Date(), 5),
      deliveryDate: subDays(new Date(), 1),
      status: 'ordered',
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
          quantityPurchased: 50,
          unitCost: 3.50,
          discount: 0,
          taxPercent: 5,
          totalAmount: 183.75,
          expiryDate: addDays(new Date(), 180),
          batchNumber: 'PSM-2024-003',
          notes: 'Mixed berry flavor'
        }
      ],
      subtotal: 175,
      discountAmount: 0,
      taxAmount: 8.75,
      shippingCost: 25,
      totalAmount: 208.75,
      paymentTerms: 'NET 7',
      paymentStatus: 'pending',
      invoiceNumber: 'INV-2024-003',
      referenceNumber: 'REF-003',
      notes: 'For café restocking',
      attachments: ['order_confirmation.pdf'],
      createdBy: 'Mike Chen',
      approvedBy: 'Manager',
      createdAt: subDays(new Date(), 5),
      updatedAt: subDays(new Date(), 3)
    }
  ];

  // Purchase Form State
  const [purchaseForm, setPurchaseForm] = useState<Partial<Purchase & { selectedSupplier: Supplier | null }>>({
    purchaseNumber: '',
    selectedSupplier: null,
    purchaseDate: new Date(),
    deliveryDate: undefined,
    status: 'draft',
    priority: 'medium',
    items: [],
    subtotal: 0,
    discountAmount: 0,
    taxAmount: 0,
    shippingCost: 0,
    totalAmount: 0,
    paymentTerms: 'NET 30',
    paymentStatus: 'pending',
    invoiceNumber: '',
    referenceNumber: '',
    notes: '',
    attachments: []
  });

  // Analytics data for charts
  const monthlyPurchaseData = [
    { month: 'Jul', amount: 15000, items: 45 },
    { month: 'Aug', amount: 18500, items: 52 },
    { month: 'Sep', amount: 22000, items: 38 },
    { month: 'Oct', amount: 25500, items: 67 },
    { month: 'Nov', amount: 29000, items: 73 },
    { month: 'Dec', amount: 32000, items: 61 }
  ];

  const supplierDistribution = [
    { name: 'Sports Nutrition Ltd', value: 45, amount: 125000, color: '#2563eb' },
    { name: 'Fitness Equipment Co', value: 23, amount: 89000, color: '#059669' },
    { name: 'Beverage Suppliers Inc', value: 67, amount: 45000, color: '#dc2626' },
    { name: 'Others', value: 15, amount: 25000, color: '#7c3aed' }
  ];

  const categorySpending = [
    { category: 'Supplements', amount: 125000, purchases: 45 },
    { category: 'Equipment', amount: 89000, purchases: 23 },
    { category: 'Café & Bar', amount: 45000, purchases: 67 },
    { category: 'Merchandise', amount: 25000, purchases: 15 }
  ];

  // Calculate analytics
  const analytics = useMemo(() => {
    const totalPurchases = purchases.length;
    const pendingApprovals = purchases.filter(p => p.status === 'pending_approval').length;
    const totalSpendThisMonth = purchases
      .filter(p => p.purchaseDate >= startOfMonth(new Date()) && p.purchaseDate <= endOfMonth(new Date()))
      .reduce((sum, p) => sum + p.totalAmount, 0);
    
    const inventoryAdded = purchases
      .filter(p => p.status === 'received')
      .reduce((sum, p) => sum + p.items.reduce((itemSum, item) => itemSum + item.quantityPurchased, 0), 0);
    
    const supplierCounts = purchases.reduce((acc, p) => {
      acc[p.supplier.name] = (acc[p.supplier.name] || 0) + p.totalAmount;
      return acc;
    }, {} as Record<string, number>);
    
    const topSupplier = Object.entries(supplierCounts).sort(([,a], [,b]) => b - a)[0];
    
    const urgentPurchases = purchases.filter(p => p.priority === 'urgent' || p.priority === 'high').length;
    const overduePurchases = purchases.filter(p => p.paymentStatus === 'overdue').length;

    return {
      totalPurchases,
      pendingApprovals,
      totalSpendThisMonth,
      inventoryAdded,
      topSupplier: topSupplier ? { name: topSupplier[0], amount: topSupplier[1] } : null,
      urgentPurchases,
      overduePurchases
    };
  }, [purchases]);

  // Filter purchases
  const filteredPurchases = useMemo(() => {
    return purchases.filter(purchase => {
      const matchesSearch = searchTerm === '' || 
        purchase.purchaseNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        purchase.items.some(item => item.productName.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesStatus = selectedStatus === 'all' || purchase.status === selectedStatus;
      const matchesSupplier = selectedSupplier === 'all' || purchase.supplier.id === selectedSupplier;
      const matchesPriority = selectedPriority === 'all' || purchase.priority === selectedPriority;
      
      return matchesSearch && matchesStatus && matchesSupplier && matchesPriority;
    });
  }, [purchases, searchTerm, selectedStatus, selectedSupplier, selectedPriority]);

  // Handle purchase creation/editing
  const handleSavePurchase = useCallback(() => {
    if (!purchaseForm.selectedSupplier || !purchaseForm.items || purchaseForm.items.length === 0) {
      toast.error('Please select a supplier and add at least one item');
      return;
    }

    // Calculate totals
    const subtotal = purchaseForm.items.reduce((sum, item) => sum + (item.quantityPurchased * item.unitCost - item.discount), 0);
    const taxAmount = purchaseForm.items.reduce((sum, item) => sum + ((item.quantityPurchased * item.unitCost - item.discount) * item.taxPercent / 100), 0);
    const totalAmount = subtotal + taxAmount + (purchaseForm.shippingCost || 0);

    const updatedPurchase = {
      ...purchaseForm,
      supplier: purchaseForm.selectedSupplier,
      subtotal,
      taxAmount,
      totalAmount,
      purchaseNumber: purchaseForm.purchaseNumber || `PUR-${new Date().getFullYear()}-${String(purchases.length + 1).padStart(3, '0')}`
    };

    if (editingPurchase) {
      toast.success('Purchase updated successfully!');
    } else {
      toast.success('Purchase created successfully!');
    }

    setShowPurchaseForm(false);
    resetForm();
  }, [purchaseForm, editingPurchase, purchases.length]);

  // Reset form
  const resetForm = useCallback(() => {
    setPurchaseForm({
      purchaseNumber: '',
      selectedSupplier: null,
      purchaseDate: new Date(),
      deliveryDate: undefined,
      status: 'draft',
      priority: 'medium',
      items: [],
      subtotal: 0,
      discountAmount: 0,
      taxAmount: 0,
      shippingCost: 0,
      totalAmount: 0,
      paymentTerms: 'NET 30',
      paymentStatus: 'pending',
      invoiceNumber: '',
      referenceNumber: '',
      notes: '',
      attachments: []
    });
    setEditingPurchase(null);
  }, []);

  // Handle bulk actions
  const handleBulkAction = useCallback((action: string) => {
    if (selectedPurchases.length === 0) {
      toast.error('Please select purchases first');
      return;
    }

    switch (action) {
      case 'approve':
        toast.success(`${selectedPurchases.length} purchases approved`);
        break;
      case 'cancel':
        toast.success(`${selectedPurchases.length} purchases cancelled`);
        break;
      case 'export':
        setIsExporting(true);
        setTimeout(() => {
          setIsExporting(false);
          toast.success(`${selectedPurchases.length} purchases exported`);
        }, 2000);
        break;
      case 'print':
        toast.success(`${selectedPurchases.length} purchases sent to printer`);
        break;
      case 'receive':
        toast.success(`${selectedPurchases.length} purchases marked as received`);
        break;
    }
    setSelectedPurchases([]);
  }, [selectedPurchases]);

  // Add item to purchase
  const addItemToPurchase = useCallback((product: Product, quantity: number = 1) => {
    const newItem: PurchaseItem = {
      id: `item-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      sku: product.sku,
      description: product.description,
      category: product.category,
      unitOfMeasure: product.unitOfMeasure,
      quantityPurchased: quantity,
      unitCost: product.lastPurchasePrice,
      discount: 0,
      taxPercent: 5,
      totalAmount: quantity * product.lastPurchasePrice,
      notes: '',
      expiryDate: undefined,
      batchNumber: ''
    };

    setPurchaseForm(prev => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));

    toast.success(`${product.name} added to purchase`);
  }, []);

  // Remove item from purchase
  const removeItemFromPurchase = useCallback((itemId: string) => {
    setPurchaseForm(prev => ({
      ...prev,
      items: prev.items?.filter(item => item.id !== itemId) || []
    }));
  }, []);

  // Update item in purchase
  const updatePurchaseItem = useCallback((itemId: string, updates: Partial<PurchaseItem>) => {
    setPurchaseForm(prev => ({
      ...prev,
      items: prev.items?.map(item => 
        item.id === itemId 
          ? { 
              ...item, 
              ...updates, 
              totalAmount: (updates.quantityPurchased || item.quantityPurchased) * (updates.unitCost || item.unitCost) - (updates.discount || item.discount)
            }
          : item
      ) || []
    }));
  }, []);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'bulk' | 'attachment') => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (type === 'bulk') {
      setIsUploading(true);
      // Simulate bulk upload process
      setTimeout(() => {
        setIsUploading(false);
        setShowBulkUpload(false);
        toast.success(`Successfully imported ${Math.floor(Math.random() * 50) + 10} purchases!`);
      }, 3000);
    } else {
      // Handle attachment upload
      const newAttachments = Array.from(files).map(file => file.name);
      setPurchaseForm(prev => ({
        ...prev,
        attachments: [...(prev.attachments || []), ...newAttachments]
      }));
      toast.success(`${files.length} file(s) attached`);
    }
  }, []);

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      pending_approval: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', className: 'bg-blue-100 text-blue-800' },
      ordered: { label: 'Ordered', className: 'bg-purple-100 text-purple-800' },
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

  // Get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      partial: { label: 'Partial', className: 'bg-orange-100 text-orange-800' },
      paid: { label: 'Paid', className: 'bg-green-100 text-green-800' },
      overdue: { label: 'Overdue', className: 'bg-red-100 text-red-800' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.dataKey}: {typeof entry.value === 'number' && entry.dataKey.includes('amount') 
                ? `AED ${entry.value.toLocaleString()}` 
                : entry.value.toLocaleString()
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Purchase Management</h1>
          <p className="text-muted-foreground mt-2">
            Track and manage all purchases including supplier transactions and inventory acquisitions
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button variant="outline" onClick={() => handleBulkAction('export')}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => {
            setIsCreatingPurchase(true);
            resetForm();
            setShowPurchaseForm(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            New Purchase
          </Button>
        </div>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Purchases</p>
                <p className="text-2xl font-bold">{analytics.totalPurchases}</p>
                <p className="text-sm text-muted-foreground">This month</p>
              </div>
              <ShoppingBag className="h-6 w-6 text-blue-600" />
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
                <p className="text-sm font-medium text-muted-foreground">Inventory Added</p>
                <p className="text-2xl font-bold text-purple-600">{analytics.inventoryAdded}</p>
                <p className="text-sm text-muted-foreground">Items received</p>
              </div>
              <Package className="h-6 w-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Supplier</p>
                <p className="text-lg font-bold text-indigo-600">
                  {analytics.topSupplier ? analytics.topSupplier.name.split(' ')[0] : 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {analytics.topSupplier ? `AED ${analytics.topSupplier.amount.toLocaleString()}` : 'No data'}
                </p>
              </div>
              <Building className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Urgent Purchases</p>
                <p className="text-2xl font-bold text-red-600">{analytics.urgentPurchases}</p>
                <p className="text-sm text-muted-foreground">High priority</p>
              </div>
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Panel - Purchase List & Filters */}
        <div className="xl:col-span-3 space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[250px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by purchase number, supplier, or item..."
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
              {selectedPurchases.length > 0 && (
                <>
                  <Separator className="my-4" />
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      {selectedPurchases.length} purchase(s) selected
                    </p>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleBulkAction('approve')}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleBulkAction('receive')}>
                        <Package className="mr-2 h-4 w-4" />
                        Mark Received
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

          {/* Purchase List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Purchase List</CardTitle>
                  <CardDescription>
                    {filteredPurchases.length} of {purchases.length} purchases
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
                          checked={selectedPurchases.length === filteredPurchases.length}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedPurchases(filteredPurchases.map(p => p.id));
                            } else {
                              setSelectedPurchases([]);
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Purchase #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPurchases.map((purchase) => (
                      <TableRow 
                        key={purchase.id}
                        className={cn(
                          purchase.priority === 'urgent' && "bg-red-50 dark:bg-red-950/20",
                          purchase.status === 'pending_approval' && "bg-yellow-50 dark:bg-yellow-950/20",
                          purchase.paymentStatus === 'overdue' && "bg-orange-50 dark:bg-orange-950/20"
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedPurchases.includes(purchase.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedPurchases([...selectedPurchases, purchase.id]);
                              } else {
                                setSelectedPurchases(selectedPurchases.filter(id => id !== purchase.id));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{purchase.purchaseNumber}</p>
                            <p className="text-sm text-muted-foreground">
                              by {purchase.createdBy}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{purchase.supplier.name}</p>
                            <p className="text-sm text-muted-foreground">{purchase.supplier.contactPerson}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{format(purchase.purchaseDate, 'MMM dd, yyyy')}</p>
                          <p className="text-sm text-muted-foreground">
                            {isToday(purchase.purchaseDate) ? 'Today' :
                             isYesterday(purchase.purchaseDate) ? 'Yesterday' :
                             format(purchase.purchaseDate, 'EEE')}
                          </p>
                        </TableCell>
                        <TableCell>{getStatusBadge(purchase.status)}</TableCell>
                        <TableCell>{getPriorityBadge(purchase.priority)}</TableCell>
                        <TableCell>{getPaymentStatusBadge(purchase.paymentStatus)}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">AED {purchase.totalAmount.toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">
                              {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedPurchaseForDetail(purchase);
                                setShowPurchaseDetail(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {purchase.status === 'draft' || purchase.status === 'pending_approval' ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPurchase(purchase);
                                  setPurchaseForm({
                                    ...purchase,
                                    selectedSupplier: purchase.supplier
                                  });
                                  setShowPurchaseForm(true);
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
        </div>

        {/* Right Panel - Quick Actions & Inventory Snapshot */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Zap className="mr-2 h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start" 
                onClick={() => {
                  setIsCreatingPurchase(true);
                  resetForm();
                  setShowPurchaseForm(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                New Purchase
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setShowBulkUpload(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <ScanLine className="mr-2 h-4 w-4" />
                Scan Receipt
              </Button>
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                Add Supplier
              </Button>
            </CardContent>
          </Card>

          {/* Inventory Snapshot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Box className="mr-2 h-5 w-5" />
                Inventory Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {products.slice(0, 3).map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{product.currentStock} {product.unitOfMeasure}</p>
                    {product.currentStock <= product.reorderPoint && (
                      <Badge variant="destructive" className="text-xs">Low Stock</Badge>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                View All Inventory
              </Button>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="mr-2 h-5 w-5 text-yellow-600" />
                Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div>
                  <p className="font-medium text-sm">Protein Smoothie Mix</p>
                  <p className="text-xs text-muted-foreground">45 bottles remaining</p>
                </div>
                <Button size="sm" variant="outline">
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <div>
                  <p className="font-medium text-sm">Adjustable Dumbbells</p>
                  <p className="text-xs text-muted-foreground">3 sets remaining</p>
                </div>
                <Button size="sm" variant="outline">
                  <ShoppingCart className="h-4 w-4" />
                </Button>
              </div>
              <Button variant="outline" className="w-full" size="sm">
                <Bell className="mr-2 h-4 w-4" />
                View All Alerts
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Section - Analytics & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Purchase Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <LineChart className="mr-2 h-5 w-5" />
              Purchase Trends
            </CardTitle>
            <CardDescription>Monthly spending over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsLineChart data={monthlyPurchaseData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="amount" stroke="#2563eb" strokeWidth={3} name="Amount (AED)" />
              </RechartsLineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Supplier Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="mr-2 h-5 w-5" />
              Supplier Distribution
            </CardTitle>
            <CardDescription>Purchase distribution by suppliers</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPieChart>
                <Pie
                  data={supplierDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {supplierDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Spending */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="mr-2 h-5 w-5" />
              Category Spending
            </CardTitle>
            <CardDescription>Purchase amounts by product category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={categorySpending}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="amount" fill="#059669" name="Amount (AED)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Form Dialog */}
      <Dialog open={showPurchaseForm} onOpenChange={setShowPurchaseForm}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPurchase ? 'Edit Purchase' : 'Create New Purchase'}
            </DialogTitle>
            <DialogDescription>
              {editingPurchase ? 'Update purchase details' : 'Create a new purchase record with supplier and product information'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchaseNumber">Purchase Number</Label>
                <Input
                  id="purchaseNumber"
                  value={purchaseForm.purchaseNumber}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, purchaseNumber: e.target.value }))}
                  placeholder="Auto-generated if empty"
                />
              </div>
              <div>
                <Label htmlFor="purchaseDate">Purchase Date</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={purchaseForm.purchaseDate ? format(purchaseForm.purchaseDate, 'yyyy-MM-dd') : ''}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, purchaseDate: new Date(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={purchaseForm.priority} onValueChange={(value) => setPurchaseForm(prev => ({ ...prev, priority: value as any }))}>
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
              <div>
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select value={purchaseForm.paymentStatus} onValueChange={(value) => setPurchaseForm(prev => ({ ...prev, paymentStatus: value as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="partial">Partial</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Supplier Selection */}
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
                    {purchaseForm.selectedSupplier ? purchaseForm.selectedSupplier.name : "Select supplier..."}
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
                            setPurchaseForm(prev => ({ 
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
                              purchaseForm.selectedSupplier?.id === supplier.id ? "opacity-100" : "opacity-0"
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

            {/* Items Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <Label>Purchase Items</Label>
                <Popover open={showProductSelector} onOpenChange={setShowProductSelector}>
                  <PopoverTrigger asChild>
                    <Button size="sm">
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
                              addItemToPurchase(product);
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

              {purchaseForm.items && purchaseForm.items.length > 0 ? (
                <div className="space-y-4">
                  {purchaseForm.items.map((item, index) => (
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
                                  value={item.quantityPurchased || 0}
                                  onChange={(e) => updatePurchaseItem(item.id, { quantityPurchased: parseInt(e.target.value) || 0 })}
                                  min="1"
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Unit Cost (AED)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.unitCost || 0}
                                  onChange={(e) => updatePurchaseItem(item.id, { unitCost: parseFloat(e.target.value) || 0 })}
                                />
                              </div>
                              <div>
                                <Label className="text-xs">Discount (AED)</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={item.discount || 0}
                                  onChange={(e) => updatePurchaseItem(item.id, { discount: parseFloat(e.target.value) || 0 })}
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
                                onChange={(e) => updatePurchaseItem(item.id, { notes: e.target.value })}
                                placeholder="Item-specific notes..."
                              />
                            </div>
                          </div>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeItemFromPurchase(item.id)}
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
                  <p className="text-sm">Click "Add Product" to start building your purchase</p>
                </div>
              )}
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    value={purchaseForm.invoiceNumber || ''}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="Invoice number from supplier"
                  />
                </div>
                <div>
                  <Label htmlFor="referenceNumber">Reference Number</Label>
                  <Input
                    id="referenceNumber"
                    value={purchaseForm.referenceNumber || ''}
                    onChange={(e) => setPurchaseForm(prev => ({ ...prev, referenceNumber: e.target.value }))}
                    placeholder="Internal reference number"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={purchaseForm.notes || ''}
                  onChange={(e) => setPurchaseForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes or comments..."
                  rows={3}
                />
              </div>

              <div>
                <Label>Attachments</Label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => attachmentInputRef.current?.click()}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    Attach Files
                  </Button>
                  {purchaseForm.attachments && purchaseForm.attachments.length > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {purchaseForm.attachments.length} file(s) attached
                    </span>
                  )}
                </div>
                <input
                  type="file"
                  ref={attachmentInputRef}
                  onChange={(e) => handleFileUpload(e, 'attachment')}
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  className="hidden"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setShowPurchaseForm(false)}>
                Cancel
              </Button>
              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleSavePurchase}>
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                <Button onClick={handleSavePurchase}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {editingPurchase ? 'Update Purchase' : 'Create Purchase'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Purchase Detail Dialog */}
      <Dialog open={showPurchaseDetail} onOpenChange={setShowPurchaseDetail}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedPurchaseForDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span className="flex items-center space-x-3">
                    <ShoppingBag className="h-5 w-5" />
                    <span>{selectedPurchaseForDetail.purchaseNumber}</span>
                    {getPriorityBadge(selectedPurchaseForDetail.priority)}
                  </span>
                  {getStatusBadge(selectedPurchaseForDetail.status)}
                </DialogTitle>
                <DialogDescription>
                  Purchase details and line items
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Purchase Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Supplier Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-sm text-muted-foreground">Company</Label>
                        <p className="font-medium">{selectedPurchaseForDetail.supplier.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Contact Person</Label>
                        <p className="font-medium">{selectedPurchaseForDetail.supplier.contactPerson}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Email</Label>
                          <p className="font-medium text-sm">{selectedPurchaseForDetail.supplier.email}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Phone</Label>
                          <p className="font-medium text-sm">{selectedPurchaseForDetail.supplier.phone}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Purchase Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Purchase Date</Label>
                          <p className="font-medium">{format(selectedPurchaseForDetail.purchaseDate, 'MMM dd, yyyy')}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Delivery Date</Label>
                          <p className="font-medium">
                            {selectedPurchaseForDetail.deliveryDate 
                              ? format(selectedPurchaseForDetail.deliveryDate, 'MMM dd, yyyy')
                              : 'Not specified'
                            }
                          </p>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm text-muted-foreground">Created By</Label>
                        <p className="font-medium">{selectedPurchaseForDetail.createdBy}</p>
                      </div>
                      {selectedPurchaseForDetail.approvedBy && (
                        <div>
                          <Label className="text-sm text-muted-foreground">Approved By</Label>
                          <p className="font-medium">{selectedPurchaseForDetail.approvedBy}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm text-muted-foreground">Payment Status</Label>
                        {getPaymentStatusBadge(selectedPurchaseForDetail.paymentStatus)}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Purchase Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Purchase Items</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead>Discount</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedPurchaseForDetail.items.map((item) => (
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
                              <p className="font-medium">{item.quantityPurchased} {item.unitOfMeasure}</p>
                            </TableCell>
                            <TableCell>AED {item.unitCost.toFixed(2)}</TableCell>
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
                        <span>AED {selectedPurchaseForDetail.subtotal.toFixed(2)}</span>
                      </div>
                      {selectedPurchaseForDetail.discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount:</span>
                          <span>-AED {selectedPurchaseForDetail.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Tax:</span>
                        <span>AED {selectedPurchaseForDetail.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Shipping:</span>
                        <span>AED {selectedPurchaseForDetail.shippingCost.toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-medium text-lg">
                        <span>Total Amount:</span>
                        <span>AED {selectedPurchaseForDetail.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Notes and Attachments */}
                {(selectedPurchaseForDetail.notes || selectedPurchaseForDetail.attachments.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedPurchaseForDetail.notes && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Notes</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-muted-foreground">{selectedPurchaseForDetail.notes}</p>
                        </CardContent>
                      </Card>
                    )}

                    {selectedPurchaseForDetail.attachments.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle>Attachments</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {selectedPurchaseForDetail.attachments.map((attachment, index) => (
                              <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                                <span className="text-sm">{attachment}</span>
                                <Button size="sm" variant="ghost">
                                  <Download className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
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
                      Email
                    </Button>
                  </div>
                  
                  <div className="flex space-x-2">
                    {selectedPurchaseForDetail.status === 'pending_approval' && (
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
                    {selectedPurchaseForDetail.status === 'ordered' && (
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

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Bulk Upload Purchases</span>
            </DialogTitle>
            <DialogDescription>
              Upload multiple purchases using CSV or Excel file
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Drag and drop your file here, or click to browse
              </p>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={(e) => handleFileUpload(e, 'bulk')}
                accept=".csv,.xlsx,.xls"
                className="hidden"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Supported formats:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>CSV files (.csv)</li>
                <li>Excel files (.xlsx, .xls)</li>
              </ul>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBulkUpload(false)}>
                Cancel
              </Button>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Progress Dialog */}
      <Dialog open={isUploading} onOpenChange={setIsUploading}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Uploading Purchases</span>
            </DialogTitle>
            <DialogDescription>
              Processing your purchase data, please wait...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div>
                <p className="font-medium">Uploading purchases...</p>
                <p className="text-sm text-muted-foreground">This may take a few moments</p>
              </div>
            </div>
            <Progress value={65} className="w-full" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Loading Dialog */}
      <Dialog open={isExporting} onOpenChange={setIsExporting}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Exporting Purchases</span>
            </DialogTitle>
            <DialogDescription>
              Preparing your purchase data for export...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <div>
                <p className="font-medium">Processing purchases...</p>
                <p className="text-sm text-muted-foreground">This may take a few moments</p>
              </div>
            </div>
            <Progress value={75} className="w-full" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={() => {
            setIsCreatingPurchase(true);
            resetForm();
            setShowPurchaseForm(true);
          }}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
}

