import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  ArrowLeftRight,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  FileText,
  DollarSign,
  Calendar,
  User,
  Building,
  Tag,
  Scan,
  Calculator,
  RefreshCw,
  Save,
  Send,
  X,
  Check,
  XCircle,
  Info,
  ChevronDown,
  MoreHorizontal,
  Copy,
  Printer,
  Settings,
  TrendingUp,
  Activity,
  Archive,
  ShoppingCart,
  Users,
  MapPin,
  ClipboardList
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { DatePicker } from "../components/ui/calendar";
import { toast } from "sonner";

interface ProductItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  batchNo?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  unit: string;
  reasonSpecific?: string;
  availableStock: number;
}

interface WastageReturnVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  type: 'wastage' | 'goods-return';
  associatedParty?: string;
  partyType?: 'supplier' | 'customer' | 'none';
  reason: string;
  status: 'draft' | 'pending-approval' | 'approved' | 'completed' | 'cancelled' | 'rejected';
  location: string;
  recordedBy: string;
  approvedBy?: string;
  products: ProductItem[];
  totalItems: number;
  totalValue: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  approvalDate?: string;
  rejectionReason?: string;
}

interface WastageReturnStats {
  totalVouchers: number;
  pendingApproval: number;
  totalWastageValue: number;
  totalReturnValue: number;
  monthlyWastage: number;
  monthlyReturns: number;
  topWastedProducts: { name: string; value: number; quantity: number }[];
  topReturnReasons: { reason: string; count: number; value: number }[];
}

interface InventoryProduct {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  unit: string;
  unitCost: number;
  category: string;
  location: string;
  batchNo?: string;
  expiryDate?: string;
}

const WASTAGE_REASONS = [
  'Expired',
  'Damaged in Storage',
  'Damaged in Transit',
  'Manufacturing Defect',
  'Contaminated',
  'Spoiled',
  'Broken/Cracked',
  'Quality Issues',
  'Overstock Disposal',
  'Other'
];

const RETURN_REASONS = [
  'Returned to Supplier - Defective',
  'Returned to Supplier - Wrong Item',
  'Returned to Supplier - Quality Issues',
  'Customer Return - Wrong Size',
  'Customer Return - Defective',
  'Customer Return - Not Satisfied',
  'Customer Return - Wrong Color',
  'Customer Return - Changed Mind',
  'Warranty Return',
  'Exchange Return',
  'Other'
];

const LOCATIONS = [
  'Main Store',
  'Warehouse A',
  'Warehouse B',
  'Retail Floor',
  'Café Storage',
  'Equipment Room',
  'Reception',
  'Other'
];

export function WastageReturns() {
  const [activeTab, setActiveTab] = useState("vouchers");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [vouchers, setVouchers] = useState<WastageReturnVoucher[]>([]);
  const [stats, setStats] = useState<WastageReturnStats | null>(null);
  const [inventory, setInventory] = useState<InventoryProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<WastageReturnVoucher | null>(null);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason] = useState("");

  // New voucher form state
  const [newVoucher, setNewVoucher] = useState({
    type: 'wastage' as 'wastage' | 'goods-return',
    date: new Date().toISOString().split('T')[0],
    associatedParty: '',
    partyType: 'none' as 'supplier' | 'customer' | 'none',
    reason: '',
    location: '',
    notes: '',
    products: [] as ProductItem[]
  });

  // Product search state
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [selectedProductForAdd, setSelectedProductForAdd] = useState<InventoryProduct | null>(null);
  const [productQuantity, setProductQuantity] = useState<number>(0);
  const [productReasonSpecific, setProductReasonSpecific] = useState("");

  // Sample data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Sample inventory products
      const inventoryData: InventoryProduct[] = [
        {
          id: '1',
          name: 'Whey Protein Isolate',
          sku: 'SUP-001',
          currentStock: 156,
          unit: 'container',
          unitCost: 180.00,
          category: 'Supplements',
          location: 'Main Store',
          batchNo: 'B2024001',
          expiryDate: '2025-06-30'
        },
        {
          id: '2',
          name: 'Adjustable Dumbbell Set',
          sku: 'EQP-001',
          currentStock: 12,
          unit: 'set',
          unitCost: 800.00,
          category: 'Equipment',
          location: 'Warehouse A'
        },
        {
          id: '3',
          name: 'Premium Gym T-Shirt',
          sku: 'MER-001',
          currentStock: 8,
          unit: 'piece',
          unitCost: 35.00,
          category: 'Merchandise',
          location: 'Retail Floor'
        },
        {
          id: '4',
          name: 'BCAA Energy Drink',
          sku: 'SUP-002',
          currentStock: 234,
          unit: 'bottle',
          unitCost: 22.00,
          category: 'Supplements',
          location: 'Main Store',
          batchNo: 'B2024015',
          expiryDate: '2024-12-31'
        },
        {
          id: '5',
          name: 'Protein Bar',
          sku: 'SUP-003',
          currentStock: 89,
          unit: 'piece',
          unitCost: 8.50,
          category: 'Supplements',
          location: 'Café Storage',
          batchNo: 'B2024012',
          expiryDate: '2024-11-15'
        }
      ];

      // Sample vouchers
      const voucherData: WastageReturnVoucher[] = [
        {
          id: '1',
          voucherNumber: 'WRV-20250129-0001',
          date: '2025-01-29',
          type: 'wastage',
          reason: 'Expired',
          status: 'completed',
          location: 'Main Store',
          recordedBy: 'John Smith',
          approvedBy: 'Manager Sarah',
          products: [
            {
              id: '1',
              productId: '4',
              productName: 'BCAA Energy Drink',
              sku: 'SUP-002',
              batchNo: 'B2024015',
              quantity: 15,
              unitCost: 22.00,
              totalCost: 330.00,
              unit: 'bottle',
              availableStock: 234
            }
          ],
          totalItems: 15,
          totalValue: 330.00,
          notes: 'Found expired batch during routine inventory check',
          createdAt: '2025-01-29T09:15:00Z',
          updatedAt: '2025-01-29T11:30:00Z',
          approvalDate: '2025-01-29T11:30:00Z'
        },
        {
          id: '2',
          voucherNumber: 'WRV-20250128-0002',
          date: '2025-01-28',
          type: 'goods-return',
          associatedParty: 'Fitness Equipment Suppliers LLC',
          partyType: 'supplier',
          reason: 'Returned to Supplier - Defective',
          status: 'pending-approval',
          location: 'Warehouse A',
          recordedBy: 'Mike Johnson',
          products: [
            {
              id: '2',
              productId: '2',
              productName: 'Adjustable Dumbbell Set',
              sku: 'EQP-001',
              quantity: 2,
              unitCost: 800.00,
              totalCost: 1600.00,
              unit: 'set',
              reasonSpecific: 'Weight plates not adjusting properly',
              availableStock: 12
            }
          ],
          totalItems: 2,
          totalValue: 1600.00,
          notes: 'Customer reported mechanical issues with adjustment mechanism',
          createdAt: '2025-01-28T14:20:00Z',
          updatedAt: '2025-01-28T14:20:00Z'
        },
        {
          id: '3',
          voucherNumber: 'WRV-20250127-0003',
          date: '2025-01-27',
          type: 'wastage',
          reason: 'Damaged in Storage',
          status: 'approved',
          location: 'Retail Floor',
          recordedBy: 'Lisa Wang',
          approvedBy: 'Manager Sarah',
          products: [
            {
              id: '3',
              productId: '3',
              productName: 'Premium Gym T-Shirt',
              sku: 'MER-001',
              quantity: 5,
              unitCost: 35.00,
              totalCost: 175.00,
              unit: 'piece',
              reasonSpecific: 'Water damage from ceiling leak',
              availableStock: 8
            }
          ],
          totalItems: 5,
          totalValue: 175.00,
          notes: 'Ceiling leak in retail section damaged merchandise',
          createdAt: '2025-01-27T16:45:00Z',
          updatedAt: '2025-01-27T17:15:00Z',
          approvalDate: '2025-01-27T17:15:00Z'
        }
      ];

      // Calculate stats
      const statsData: WastageReturnStats = {
        totalVouchers: voucherData.length,
        pendingApproval: voucherData.filter(v => v.status === 'pending-approval').length,
        totalWastageValue: voucherData.filter(v => v.type === 'wastage').reduce((sum, v) => sum + v.totalValue, 0),
        totalReturnValue: voucherData.filter(v => v.type === 'goods-return').reduce((sum, v) => sum + v.totalValue, 0),
        monthlyWastage: 505.00,
        monthlyReturns: 1600.00,
        topWastedProducts: [
          { name: 'BCAA Energy Drink', value: 330.00, quantity: 15 },
          { name: 'Premium Gym T-Shirt', value: 175.00, quantity: 5 }
        ],
        topReturnReasons: [
          { reason: 'Returned to Supplier - Defective', count: 1, value: 1600.00 },
          { reason: 'Expired', count: 1, value: 330.00 }
        ]
      };

      setInventory(inventoryData);
      setVouchers(voucherData);
      setStats(statsData);
      setLoading(false);
    };

    loadData();
  }, []);

  const filteredVouchers = vouchers.filter(voucher => {
    const matchesSearch = voucher.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         voucher.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         voucher.recordedBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || voucher.type === selectedType;
    const matchesStatus = selectedStatus === 'all' || voucher.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const filteredInventory = inventory.filter(product => 
    product.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="bg-gray-100 text-gray-700">Draft</Badge>;
      case 'pending-approval':
        return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Pending Approval</Badge>;
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Approved</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Cancelled</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    return type === 'wastage' 
      ? <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Wastage</Badge>
      : <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">Goods Return</Badge>;
  };

  const generateVoucherNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');
    const sequence = String(vouchers.length + 1).padStart(4, '0');
    return `WRV-${dateStr}-${sequence}`;
  };

  const addProductToVoucher = () => {
    if (!selectedProductForAdd || productQuantity <= 0) {
      toast.error("Please select a product and enter a valid quantity");
      return;
    }

    if (productQuantity > selectedProductForAdd.currentStock) {
      toast.error("Quantity cannot exceed available stock");
      return;
    }

    const newProduct: ProductItem = {
      id: Date.now().toString(),
      productId: selectedProductForAdd.id,
      productName: selectedProductForAdd.name,
      sku: selectedProductForAdd.sku,
      batchNo: selectedProductForAdd.batchNo,
      quantity: productQuantity,
      unitCost: selectedProductForAdd.unitCost,
      totalCost: productQuantity * selectedProductForAdd.unitCost,
      unit: selectedProductForAdd.unit,
      reasonSpecific: productReasonSpecific,
      availableStock: selectedProductForAdd.currentStock
    };

    setNewVoucher(prev => ({
      ...prev,
      products: [...prev.products, newProduct]
    }));

    // Reset form
    setSelectedProductForAdd(null);
    setProductQuantity(0);
    setProductReasonSpecific("");
    setShowProductSearch(false);
    setProductSearchQuery("");
    
    toast.success("Product added to voucher");
  };

  const removeProductFromVoucher = (productId: string) => {
    setNewVoucher(prev => ({
      ...prev,
      products: prev.products.filter(p => p.id !== productId)
    }));
    toast.success("Product removed from voucher");
  };

  const calculateVoucherTotals = () => {
    const totalItems = newVoucher.products.reduce((sum, p) => sum + p.quantity, 0);
    const totalValue = newVoucher.products.reduce((sum, p) => sum + p.totalCost, 0);
    return { totalItems, totalValue };
  };

  const saveVoucherAsDraft = () => {
    if (!newVoucher.reason || !newVoucher.location || newVoucher.products.length === 0) {
      toast.error("Please fill in all required fields and add at least one product");
      return;
    }

    const { totalItems, totalValue } = calculateVoucherTotals();
    
    const voucher: WastageReturnVoucher = {
      id: Date.now().toString(),
      voucherNumber: generateVoucherNumber(),
      date: newVoucher.date,
      type: newVoucher.type,
      associatedParty: newVoucher.associatedParty || undefined,
      partyType: newVoucher.partyType !== 'none' ? newVoucher.partyType : undefined,
      reason: newVoucher.reason,
      status: 'draft',
      location: newVoucher.location,
      recordedBy: 'Current User', // In real app, get from auth
      products: newVoucher.products,
      totalItems,
      totalValue,
      notes: newVoucher.notes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setVouchers(prev => [voucher, ...prev]);
    resetNewVoucherForm();
    setShowCreateDialog(false);
    toast.success("Voucher saved as draft");
  };

  const submitVoucherForApproval = () => {
    if (!newVoucher.reason || !newVoucher.location || newVoucher.products.length === 0) {
      toast.error("Please fill in all required fields and add at least one product");
      return;
    }

    const { totalItems, totalValue } = calculateVoucherTotals();
    
    // Check if approval is needed (e.g., if value > 500 AED)
    const needsApproval = totalValue > 500;
    
    const voucher: WastageReturnVoucher = {
      id: Date.now().toString(),
      voucherNumber: generateVoucherNumber(),
      date: newVoucher.date,
      type: newVoucher.type,
      associatedParty: newVoucher.associatedParty || undefined,
      partyType: newVoucher.partyType !== 'none' ? newVoucher.partyType : undefined,
      reason: newVoucher.reason,
      status: needsApproval ? 'pending-approval' : 'completed',
      location: newVoucher.location,
      recordedBy: 'Current User',
      products: newVoucher.products,
      totalItems,
      totalValue,
      notes: newVoucher.notes || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setVouchers(prev => [voucher, ...prev]);
    resetNewVoucherForm();
    setShowCreateDialog(false);
    
    if (needsApproval) {
      toast.success("Voucher submitted for approval");
    } else {
      toast.success("Voucher completed successfully");
    }
  };

  const resetNewVoucherForm = () => {
    setNewVoucher({
      type: 'wastage',
      date: new Date().toISOString().split('T')[0],
      associatedParty: '',
      partyType: 'none',
      reason: '',
      location: '',
      notes: '',
      products: []
    });
  };

  const handleApprovalAction = () => {
    if (!selectedVoucher) return;

    if (approvalAction === 'reject' && !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason");
      return;
    }

    const updatedVoucher = {
      ...selectedVoucher,
      status: approvalAction === 'approve' ? 'completed' as const : 'rejected' as const,
      approvedBy: approvalAction === 'approve' ? 'Current User' : undefined,
      approvalDate: approvalAction === 'approve' ? new Date().toISOString() : undefined,
      rejectionReason: approvalAction === 'reject' ? rejectionReason : undefined,
      updatedAt: new Date().toISOString()
    };

    setVouchers(prev => prev.map(v => v.id === selectedVoucher.id ? updatedVoucher : v));
    setShowApprovalDialog(false);
    setSelectedVoucher(null);
    setRejectionReason("");
    
    toast.success(`Voucher ${approvalAction === 'approve' ? 'approved' : 'rejected'} successfully`);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="h-8 w-8 text-primary" />
          <div>
            <h1>Wastage / Returns</h1>
            <p className="text-muted-foreground">Loading wastage and returns data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ArrowLeftRight className="h-8 w-8 text-primary" />
          <div>
            <h1>Wastage / Returns</h1>
            <p className="text-muted-foreground">
              Document product wastage and goods returns with inventory integration and approval workflows
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            New Voucher
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Vouchers</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVouchers}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingApproval} pending approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Wastage Value</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">AED {stats.totalWastageValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                AED {stats.monthlyWastage.toFixed(2)} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Returns Value</CardTitle>
              <RefreshCw className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">AED {stats.totalReturnValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                AED {stats.monthlyReturns.toFixed(2)} this month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
              <Clock className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.pendingApproval}</div>
              <p className="text-xs text-muted-foreground">
                Requires manager approval
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="vouchers">Vouchers</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="vouchers" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search vouchers by number, reason, or user..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="wastage">Wastage</SelectItem>
                    <SelectItem value="goods-return">Goods Return</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending-approval">Pending Approval</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Vouchers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Wastage / Return Vouchers</CardTitle>
              <CardDescription>
                {filteredVouchers.length} of {vouchers.length} vouchers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Voucher #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recorded By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVouchers.map((voucher) => (
                      <TableRow key={voucher.id}>
                        <TableCell className="font-mono text-sm">{voucher.voucherNumber}</TableCell>
                        <TableCell>{new Date(voucher.date).toLocaleDateString()}</TableCell>
                        <TableCell>{getTypeBadge(voucher.type)}</TableCell>
                        <TableCell>{voucher.reason}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            {voucher.totalItems}
                          </div>
                        </TableCell>
                        <TableCell>AED {voucher.totalValue.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                        <TableCell>{voucher.recordedBy}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              {voucher.status === 'pending-approval' && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedVoucher(voucher);
                                    setApprovalAction('approve');
                                    setShowApprovalDialog(true);
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {voucher.status === 'pending-approval' && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedVoucher(voucher);
                                    setApprovalAction('reject');
                                    setShowApprovalDialog(true);
                                  }}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Reject
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem>
                                <Printer className="h-4 w-4 mr-2" />
                                Print
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {voucher.status === 'draft' && (
                                <DropdownMenuItem>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                              )}
                              {voucher.status === 'draft' && (
                                <DropdownMenuItem className="text-red-600">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Wasted Products</CardTitle>
                <CardDescription>Products with highest wastage value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.topWastedProducts.map((product, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-red-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.quantity} items</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">AED {product.value.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Return Reasons Analysis</CardTitle>
                <CardDescription>Most common return reasons</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats?.topReturnReasons.map((reason, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{reason.reason}</p>
                          <p className="text-sm text-muted-foreground">{reason.count} cases</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-blue-600">AED {reason.value.toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Wastage Report
                </CardTitle>
                <CardDescription>Detailed wastage analysis and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-blue-500" />
                  Returns Report
                </CardTitle>
                <CardDescription>Goods return tracking and analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-green-500" />
                  Audit Trail
                </CardTitle>
                <CardDescription>Complete voucher activity log</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Approval Settings</CardTitle>
              <CardDescription>Configure approval thresholds and workflows</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label>Approval Threshold (AED)</Label>
                  <Input type="number" placeholder="500" defaultValue="500" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Vouchers above this value require manager approval
                  </p>
                </div>
                
                <div>
                  <Label>Auto-approve Wastage Below</Label>
                  <Input type="number" placeholder="100" defaultValue="100" />
                  <p className="text-sm text-muted-foreground mt-1">
                    Automatically approve wastage vouchers below this amount
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Default Locations</Label>
                <div className="grid grid-cols-2 gap-4">
                  {LOCATIONS.map((location) => (
                    <div key={location} className="flex items-center space-x-2">
                      <input type="checkbox" defaultChecked />
                      <Label className="text-sm">{location}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Voucher Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Wastage / Goods Return Voucher</DialogTitle>
            <DialogDescription>
              Create a new voucher to document product wastage or goods returns
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Voucher Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Voucher Type</Label>
                <RadioGroup 
                  value={newVoucher.type} 
                  onValueChange={(value: 'wastage' | 'goods-return') => setNewVoucher(prev => ({ ...prev, type: value }))}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="wastage" id="wastage" />
                    <Label htmlFor="wastage" className="text-red-600 font-medium">WASTAGE</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="goods-return" id="goods-return" />
                    <Label htmlFor="goods-return" className="text-blue-600 font-medium">GOODS RETURN</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={newVoucher.date}
                  onChange={(e) => setNewVoucher(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
            </div>

            {/* Associated Party (for returns) */}
            {newVoucher.type === 'goods-return' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Party Type</Label>
                  <Select 
                    value={newVoucher.partyType} 
                    onValueChange={(value: 'supplier' | 'customer' | 'none') => setNewVoucher(prev => ({ ...prev, partyType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="customer">Customer</SelectItem>
                      <SelectItem value="none">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {newVoucher.partyType !== 'none' && (
                  <div className="space-y-2">
                    <Label>
                      {newVoucher.partyType === 'supplier' ? 'Supplier Name' : 'Customer Name'}
                    </Label>
                    <Input
                      placeholder={`Enter ${newVoucher.partyType} name`}
                      value={newVoucher.associatedParty}
                      onChange={(e) => setNewVoucher(prev => ({ ...prev, associatedParty: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Reason *</Label>
                <Select 
                  value={newVoucher.reason} 
                  onValueChange={(value) => setNewVoucher(prev => ({ ...prev, reason: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {(newVoucher.type === 'wastage' ? WASTAGE_REASONS : RETURN_REASONS).map((reason) => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Location *</Label>
                <Select 
                  value={newVoucher.location} 
                  onValueChange={(value) => setNewVoucher(prev => ({ ...prev, location: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((location) => (
                      <SelectItem key={location} value={location}>{location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Product Selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Products *</Label>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowProductSearch(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </div>

              {newVoucher.products.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newVoucher.products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.productName}</p>
                              {product.batchNo && (
                                <p className="text-sm text-muted-foreground">Batch: {product.batchNo}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell>{product.quantity} {product.unit}</TableCell>
                          <TableCell>AED {product.unitCost.toFixed(2)}</TableCell>
                          <TableCell>AED {product.totalCost.toFixed(2)}</TableCell>
                          <TableCell>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => removeProductFromVoucher(product.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* Summary */}
            {newVoucher.products.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Total Items</Label>
                      <div className="text-2xl font-bold">{calculateVoucherTotals().totalItems}</div>
                    </div>
                    <div>
                      <Label>Total Value</Label>
                      <div className="text-2xl font-bold">AED {calculateVoucherTotals().totalValue.toFixed(2)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes / Comments</Label>
              <Textarea
                placeholder="Enter any additional notes or comments"
                value={newVoucher.notes}
                onChange={(e) => setNewVoucher(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button variant="outline" onClick={saveVoucherAsDraft}>
                <Save className="h-4 w-4 mr-2" />
                Save as Draft
              </Button>
              <Button onClick={submitVoucherForApproval}>
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Search Dialog */}
      <Dialog open={showProductSearch} onOpenChange={setShowProductSearch}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Product to Voucher</DialogTitle>
            <DialogDescription>
              Search and select products from inventory
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search products by name or SKU..."
                value={productSearchQuery}
                onChange={(e) => setProductSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Product List */}
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {filteredInventory.map((product) => (
                  <div 
                    key={product.id} 
                    className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      selectedProductForAdd?.id === product.id ? 'border-primary bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedProductForAdd(product)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.sku} • {product.category}</p>
                        {product.batchNo && (
                          <p className="text-sm text-muted-foreground">Batch: {product.batchNo}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{product.currentStock} {product.unit}</p>
                        <p className="text-sm text-muted-foreground">AED {product.unitCost.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Product Details Form */}
            {selectedProductForAdd && (
              <>
                <Separator />
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Quantity *</Label>
                      <Input
                        type="number"
                        placeholder="Enter quantity"
                        value={productQuantity === 0 ? '' : productQuantity.toString()}
                        onChange={(e) => {
                          const value = e.target.value;
                          const numValue = value === '' ? 0 : parseInt(value, 10);
                          setProductQuantity(isNaN(numValue) ? 0 : numValue);
                        }}
                        max={selectedProductForAdd.currentStock}
                      />
                      <p className="text-xs text-muted-foreground">
                        Available: {selectedProductForAdd.currentStock} {selectedProductForAdd.unit}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Unit Cost</Label>
                      <Input
                        value={`AED ${selectedProductForAdd.unitCost.toFixed(2)}`}
                        disabled
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Specific Reason (Optional)</Label>
                    <Input
                      placeholder="Additional details about this specific item"
                      value={productReasonSpecific}
                      onChange={(e) => setProductReasonSpecific(e.target.value)}
                    />
                  </div>

                  {productQuantity > 0 && (
                    <Alert>
                      <Calculator className="h-4 w-4" />
                      <AlertDescription>
                        Total Cost: AED {(productQuantity * selectedProductForAdd.unitCost).toFixed(2)}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowProductSearch(false)}>
                Cancel
              </Button>
              <Button onClick={addProductToVoucher} disabled={!selectedProductForAdd || productQuantity <= 0}>
                <Plus className="h-4 w-4 mr-2" />
                Add to Voucher
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === 'approve' ? 'Approve Voucher' : 'Reject Voucher'}
            </DialogTitle>
            <DialogDescription>
              {selectedVoucher?.voucherNumber} - AED {selectedVoucher?.totalValue.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedVoucher && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <p className="text-sm">{selectedVoucher.type === 'wastage' ? 'Wastage' : 'Goods Return'}</p>
                  </div>
                  <div>
                    <Label>Reason</Label>
                    <p className="text-sm">{selectedVoucher.reason}</p>
                  </div>
                </div>
                <div>
                  <Label>Products</Label>
                  <div className="text-sm space-y-1">
                    {selectedVoucher.products.map((product) => (
                      <p key={product.id}>
                        {product.productName} - {product.quantity} {product.unit} (AED {product.totalCost.toFixed(2)})
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {approvalAction === 'reject' && (
              <div className="space-y-2">
                <Label>Rejection Reason *</Label>
                <Textarea
                  placeholder="Please provide a reason for rejection"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleApprovalAction}
                className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
              >
                {approvalAction === 'approve' ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

