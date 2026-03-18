import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Edit,
  Trash2,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Image as ImageIcon,
  QrCode,
  Printer,
  Tag,
  RefreshCw,
  FileText,
  DollarSign,
  Package2,
  Copy,
} from "lucide-react";
import {
  FaBagShopping,
  FaBolt,
  FaBoxOpen,
  FaDumbbell,
  FaHeart,
  FaLayerGroup,
  FaMugHot,
  FaPills,
  FaShirt,
  FaStar,
  FaTags,
} from "react-icons/fa6";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { productsService, Product, ProductCategory, ProductStats, Warehouse } from "../utils/supabase/products-service";
import { useNavigate } from "react-router-dom";
import { Warehouse as WarehouseIcon, MapPin, Globe, Building2 } from "lucide-react";

interface CategoryDisplay {
  id: number;
  name: string;
  iconName: string;
  count: number;
  color: string;
}

interface ProductsProps {
  onNavigate?: (section: string, params?: Record<string, any>) => void;
}

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  dumbbell: FaDumbbell,
  Dumbbell: FaDumbbell,
  shirt: FaShirt,
  Shirt: FaShirt,
  coffee: FaMugHot,
  Coffee: FaMugHot,
  zap: FaBolt,
  Zap: FaBolt,
  package: FaBoxOpen,
  Package: FaBoxOpen,
  pill: FaPills,
  Pill: FaPills,
  tag: FaTags,
  Tag: FaTags,
  layers: FaLayerGroup,
  Layers: FaLayerGroup,
  star: FaStar,
  Star: FaStar,
  heart: FaHeart,
  Heart: FaHeart,
  shoppingbag: FaBagShopping,
  ShoppingBag: FaBagShopping,
  box: FaBoxOpen,
  Box: FaBoxOpen,
};

const COLOR_MAP: Record<string, string> = {
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
};

export function Products({ onNavigate }: ProductsProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({
    type: 'ADD' as 'ADD' | 'SUBTRACT',
    quantity: 0,
    reason: '',
  });
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [selectedStockWarehouseId, setSelectedStockWarehouseId] = useState<number | null>(null);
  // Warehouse management state
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(false);
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [warehouseForm, setWarehouseForm] = useState({ name: '', type: 'BRANCH', location: '', isActive: true });
  const [isSavingWarehouse, setIsSavingWarehouse] = useState(false);

  const loadData = useCallback(async (filters?: { search?: string; categoryId?: number; status?: string }) => {
    setLoading(true);
    try {
      const [productsPage, statsData, categoriesData] = await Promise.all([
        productsService.getProducts({
          search: filters?.search,
          categoryId: filters?.categoryId,
          status: filters?.status,
          size: 100,
        }),
        productsService.getStats(),
        productsService.getCategories(),
      ]);

      setProducts(productsPage.products);
      setTotalProducts(productsPage.pagination.total);
      setStats(statsData);

      const displayCategories: CategoryDisplay[] = categoriesData.map((cat) => ({
        id: cat.id,
        name: cat.name,
        iconName: cat.iconName || 'package',
        count: cat.productCount,
        color: COLOR_MAP[cat.color] || 'bg-blue-500',
      }));
      setCategories(displayCategories);
    } catch (error) {
      console.error('Failed to load products data:', error);
      toast.error('Failed to load products. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Re-fetch when filters change (debounce search)
  useEffect(() => {
    const timer = setTimeout(() => {
      const categoryId = selectedCategoryId !== 'all' ? Number(selectedCategoryId) : undefined;
      const status = selectedStatus !== 'all' ? selectedStatus : undefined;
      loadData({ search: searchQuery || undefined, categoryId, status });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategoryId, selectedStatus]);

  const getStatusBadge = (product: Product) => {
    const status = product.isActive ? product.stockStatus : 'INACTIVE';
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'OUT_OF_STOCK':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Out of Stock</Badge>;
      case 'LOW_STOCK':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Low Stock</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.totalStock === 0) {
      return <div className="flex items-center gap-1 text-red-600"><AlertTriangle className="h-4 w-4" /> Out of Stock</div>;
    } else if (product.stockStatus === 'LOW_STOCK') {
      return <div className="flex items-center gap-1 text-yellow-600"><AlertTriangle className="h-4 w-4" /> Low Stock</div>;
    } else {
      return <div className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> In Stock</div>;
    }
  };

  const handleEditProduct = (product: Product) => {
    if (onNavigate) {
      onNavigate('add-product', { productId: product.id });
    } else {
      navigate('/add-product', { state: { productId: product.id } });
    }
  };

  const handleAddProduct = () => {
    if (onNavigate) {
      onNavigate('add-product');
    } else {
      navigate('/add-product');
    }
  };

  const loadWarehouses = useCallback(async () => {
    setWarehousesLoading(true);
    try {
      const data = await productsService.getAllWarehouses();
      setWarehouses(data);
    } catch {
      toast.error('Failed to load warehouses');
    } finally {
      setWarehousesLoading(false);
    }
  }, []);

  const openWarehouseDialog = (warehouse?: Warehouse) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setWarehouseForm({ name: warehouse.name, type: warehouse.type, location: warehouse.location ?? '', isActive: warehouse.isActive });
    } else {
      setEditingWarehouse(null);
      setWarehouseForm({ name: '', type: 'BRANCH', location: '', isActive: true });
    }
    setShowWarehouseDialog(true);
  };

  const saveWarehouse = async () => {
    if (!warehouseForm.name.trim()) { toast.error('Warehouse name is required'); return; }
    setIsSavingWarehouse(true);
    try {
      if (editingWarehouse) {
        await productsService.updateWarehouse(editingWarehouse.id, warehouseForm);
        toast.success('Warehouse updated successfully');
      } else {
        await productsService.createWarehouse(warehouseForm);
        toast.success('Warehouse created successfully');
      }
      setShowWarehouseDialog(false);
      loadWarehouses();
    } catch {
      toast.error('Failed to save warehouse');
    } finally {
      setIsSavingWarehouse(false);
    }
  };

  const deleteWarehouse = async (warehouse: Warehouse) => {
    if (!window.confirm(`Delete warehouse "${warehouse.name}"? Products in this warehouse will lose their stock allocation.`)) return;
    try {
      await productsService.deleteWarehouse(warehouse.id);
      toast.success('Warehouse deleted');
      loadWarehouses();
    } catch {
      toast.error('Failed to delete warehouse');
    }
  };

  const handleStockAdjustment = (product: Product) => {
    setSelectedProduct(product);
    const firstWarehouseId = product.stockByWarehouse?.[0]?.warehouseId ?? null;
    setSelectedStockWarehouseId(firstWarehouseId);
    setStockAdjustment({ type: 'ADD', quantity: 0, reason: '' });
    setShowStockDialog(true);
  };

  const processStockAdjustment = async () => {
    if (!selectedProduct) return;
    if (!stockAdjustment.quantity || stockAdjustment.quantity <= 0 || isNaN(stockAdjustment.quantity)) {
      toast.error("Please enter a valid quantity");
      return;
    }

    setIsAdjusting(true);
    try {
      const warehouseId = selectedStockWarehouseId ?? selectedProduct.stockByWarehouse?.[0]?.warehouseId ?? 1;
      await productsService.adjustStock(selectedProduct.id, {
        warehouseId,
        adjustmentType: stockAdjustment.type,
        quantity: Math.floor(stockAdjustment.quantity),
        reason: stockAdjustment.reason || undefined,
      });

      toast.success(`Stock ${stockAdjustment.type === 'ADD' ? 'added' : 'removed'} successfully`);
      setShowStockDialog(false);
      setSelectedProduct(null);
      setStockAdjustment({ type: 'ADD', quantity: 0, reason: '' });

      // Reload products
      const categoryId = selectedCategoryId !== 'all' ? Number(selectedCategoryId) : undefined;
      const status = selectedStatus !== 'all' ? selectedStatus : undefined;
      loadData({ search: searchQuery || undefined, categoryId, status });
    } catch (error) {
      console.error('Stock adjustment failed:', error);
      toast.error('Failed to adjust stock. Please try again.');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handlePrintBarcode = (product: Product) => {
    if (!product.barcode && !product.sku) {
      toast.error("No barcode available for this product");
      return;
    }
    const barcodeValue = product.barcode || product.sku;
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>Barcode - ${product.name}</title></head>
          <body style="text-align:center;font-family:monospace;padding:20px;">
            <h3>${product.name}</h3>
            <p style="font-size:24px;letter-spacing:4px;border:1px solid #000;padding:10px;display:inline-block;">${barcodeValue}</p>
            <p>SKU: ${product.sku}</p>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleDuplicate = async (product: Product) => {
    try {
      await productsService.duplicateProduct(product.id);
      toast.success(`"${product.name}" duplicated successfully`);
      const categoryId = selectedCategoryId !== 'all' ? Number(selectedCategoryId) : undefined;
      const status = selectedStatus !== 'all' ? selectedStatus : undefined;
      loadData({ search: searchQuery || undefined, categoryId, status });
    } catch (error) {
      console.error('Duplicate failed:', error);
      toast.error('Failed to duplicate product. Please try again.');
    }
  };

  // ── Reports ────────────────────────────────────────────────────────────────

  const handleStockReportDownload = () => {
    if (products.length === 0) { toast.error('No products to export'); return; }
    const header = ['SKU', 'Product Name', 'Category', 'Selling Price (AED)', 'Cost Price (AED)', 'Unit', 'Total Stock', 'Reorder Level', 'Stock Status', 'Inventory Value (AED)', 'Supplier'];
    const rows = products.map(p => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.categoryName,
      p.sellingPrice.toFixed(2),
      p.costPrice.toFixed(2),
      p.defaultUnit || '',
      p.totalStock,
      p.stockByWarehouse?.[0]?.reorderLevel ?? 0,
      p.stockStatus,
      p.inventoryValue.toFixed(2),
      p.supplier || '',
    ]);
    const csv = [header.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Stock report downloaded');
  };

  const handlePrintAllBarcodes = () => {
    if (products.length === 0) { toast.error('No products to print'); return; }
    const productsWithBarcode = products.filter(p => p.barcode || p.sku);
    if (productsWithBarcode.length === 0) { toast.error('No barcodes found'); return; }
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) { toast.error('Popup blocked — please allow popups'); return; }
    const items = productsWithBarcode.map(p => `
      <div style="display:inline-block;border:1px solid #ddd;border-radius:6px;padding:12px;margin:6px;text-align:center;width:160px;vertical-align:top;">
        <div style="font-size:11px;font-weight:600;margin-bottom:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p.name}</div>
        <div style="font-family:monospace;font-size:15px;letter-spacing:2px;border:1px solid #333;padding:6px;background:#f9f9f9;border-radius:3px;">${p.barcode || p.sku}</div>
        <div style="font-size:10px;color:#666;margin-top:4px;">SKU: ${p.sku}</div>
        <div style="font-size:10px;color:#444;font-weight:500;">AED ${p.sellingPrice.toFixed(2)}</div>
      </div>`).join('');
    printWindow.document.write(`<html><head><title>Barcode List — GymBios</title>
      <style>@media print { body { margin: 10px; } button { display: none; } }</style>
      </head><body>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:2px solid #333;padding-bottom:10px;">
        <h2 style="margin:0;font-family:sans-serif;">Product Barcode List</h2>
        <span style="font-size:12px;color:#666;">Generated: ${new Date().toLocaleString()} | ${productsWithBarcode.length} products</span>
      </div>
      <div>${items}</div>
      <script>window.onload=()=>window.print();<\/script>
      </body></html>`);
    printWindow.document.close();
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await productsService.deleteProduct(product.id);
      toast.success(`"${product.name}" deleted successfully`);
      const categoryId = selectedCategoryId !== 'all' ? Number(selectedCategoryId) : undefined;
      const status = selectedStatus !== 'all' ? selectedStatus : undefined;
      loadData({ search: searchQuery || undefined, categoryId, status });
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete product. Please try again.');
    }
  };

  if (loading && products.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Products</h1>
            <p className="text-muted-foreground">Comprehensive product management and operations.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse border-primary/10 shadow-md">
              <CardHeader className="pb-3">
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-muted-foreground">Comprehensive product management and operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleAddProduct} className="bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Total Products</CardTitle>
              <div className="bg-gradient-light p-2 rounded-lg">
                <Package className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeProducts} active, {stats.totalProducts - stats.activeProducts} inactive
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Inventory Value</CardTitle>
              <div className="bg-emerald-50 p-2 rounded-lg">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">AED {stats.totalInventoryValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total stock valuation</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Stock Alerts</CardTitle>
              <div className="bg-red-50 p-2 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.lowStockItems + stats.outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">
                {stats.lowStockItems} low stock, {stats.outOfStockItems} out of stock
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-primary">Categories</CardTitle>
              <div className="bg-purple-50 p-2 rounded-lg">
                <Package2 className="h-4 w-4 text-purple-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{stats.categoriesCount}</div>
              <p className="text-xs text-muted-foreground">Product categories</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Categories Overview */}
      {categories.length > 0 && (
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Product Categories
            </CardTitle>
            <CardDescription>Quick overview of product categories and stock levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {categories.map((category) => {
                const IconComponent = ICON_MAP[category.iconName] || FaBoxOpen;
                return (
                  <div
                    key={category.id}
                    className="flex items-center gap-3 p-4 border border-primary/10 rounded-lg bg-white hover:bg-slate-50/50 shadow-sm transition-colors cursor-pointer"
                    onClick={() => setSelectedCategoryId(String(category.id))}
                  >
                    <div className={`p-2 rounded-lg ${category.color} text-white`}>
                      <IconComponent className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <p className="text-sm text-muted-foreground">{category.count} products</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <style>{`
        @keyframes tabSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [role="tabpanel"][data-state="active"] {
          animation: tabSlideIn 0.22s ease-out;
        }
      `}</style>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); if (v === 'settings') loadWarehouses(); }} className="space-y-6">
        <TabsList className="w-full flex">
          <TabsTrigger value="inventory" className="flex-1">Inventory</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1">Analytics</TabsTrigger>
          <TabsTrigger value="reports" className="flex-1">Reports</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Filters */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search products by name or SKU..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={String(cat.id)}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                    <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Product Inventory</CardTitle>
              <CardDescription>
                {loading ? 'Loading...' : `${products.length} of ${totalProducts} products`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span className="text-muted-foreground">Loading products...</span>
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-muted-foreground">No products found</p>
                  <Button onClick={handleAddProduct} className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add your first product
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                {product.imageUrls?.[0] ? (
                                  <img src={product.imageUrls[0]} alt={product.name} className="w-8 h-8 object-cover rounded" />
                                ) : (
                                  <Package className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  {product.hasVariants && (
                                    <Badge variant="outline" className="text-xs">Variants</Badge>
                                  )}
                                  {product.hasRecipe && (
                                    <Badge variant="outline" className="text-xs">Recipe</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                          <TableCell>{product.categoryName}</TableCell>
                          <TableCell>AED {product.sellingPrice.toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{product.totalStock}</span>
                                {product.defaultUnit && (
                                  <span className="text-muted-foreground">{product.defaultUnit}</span>
                                )}
                              </div>
                              {getStockStatus(product)}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(product)}</TableCell>
                          <TableCell>AED {product.inventoryValue.toLocaleString()}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Product
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleStockAdjustment(product)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Adjust Stock
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrintBarcode(product)}>
                                  <QrCode className="h-4 w-4 mr-2" />
                                  Print Barcode
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(product)}>
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => handleDelete(product)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Top Products by Value</CardTitle>
                <CardDescription>Best performing products by inventory value</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products
                    .slice()
                    .sort((a, b) => b.inventoryValue - a.inventoryValue)
                    .slice(0, 5)
                    .map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                            <span className="text-sm font-bold text-primary">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.categoryName}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">AED {product.inventoryValue.toLocaleString()}</p>
                          <p className="text-sm text-muted-foreground">{product.totalStock} units</p>
                        </div>
                      </div>
                    ))}
                  {products.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No products to display</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Products requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products
                    .filter((p) => p.stockStatus === 'LOW_STOCK' || p.stockStatus === 'OUT_OF_STOCK')
                    .map((product) => (
                      <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-500" />
                          <div>
                            <p className="font-medium">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.sku}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-red-600">{product.totalStock} {product.defaultUnit || 'units'}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStockAdjustment(product)}
                          >
                            Add Stock
                          </Button>
                        </div>
                      </div>
                    ))}
                  {products.filter((p) => p.stockStatus === 'LOW_STOCK' || p.stockStatus === 'OUT_OF_STOCK').length === 0 && (
                    <div className="flex items-center justify-center py-8 text-center">
                      <div>
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-muted-foreground">All products are well stocked</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Stock Report
                </CardTitle>
                <CardDescription>Current inventory levels and valuation — exports as CSV</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-0" onClick={handleStockReportDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow opacity-70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Sales Report
                </CardTitle>
                <CardDescription>Product performance by sales — requires POS module</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-0" onClick={() => toast.info('Sales Report will be available after the POS module is set up')}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Coming Soon
                </Button>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="h-5 w-5" />
                  Barcode List
                </CardTitle>
                <CardDescription>Print barcodes for all products</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full border-0" onClick={handlePrintAllBarcodes}>
                  <Printer className="h-4 w-4 mr-2" />
                  Print Barcodes
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          {/* Warehouse Management */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <WarehouseIcon className="h-5 w-5" />
                    Warehouse Management
                  </CardTitle>
                  <CardDescription>Add and manage storage locations for your inventory</CardDescription>
                </div>
                <Button onClick={() => openWarehouseDialog()} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Warehouse
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {warehousesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary mr-2" />
                  <span className="text-muted-foreground">Loading warehouses...</span>
                </div>
              ) : warehouses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <WarehouseIcon className="h-10 w-10 text-gray-300 mb-3" />
                  <p className="text-muted-foreground mb-3">No warehouses found</p>
                  <Button variant="outline" onClick={() => openWarehouseDialog()}>
                    <Plus className="h-4 w-4 mr-2" /> Create First Warehouse
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Warehouse Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {warehouses.map((wh) => (
                      <TableRow key={wh.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {wh.type === 'ONLINE' ? (
                              <Globe className="h-4 w-4 text-blue-500" />
                            ) : wh.type === 'MAIN_WAREHOUSE' ? (
                              <Building2 className="h-4 w-4 text-primary" />
                            ) : (
                              <WarehouseIcon className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium">{wh.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {wh.type === 'MAIN_WAREHOUSE' ? 'Main Warehouse'
                              : wh.type === 'BRANCH' ? 'Branch'
                              : 'Online'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {wh.location ? (
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {wh.location}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {wh.isActive
                            ? <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                            : <Badge variant="secondary">Inactive</Badge>
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" onClick={() => openWarehouseDialog(wh)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => deleteWarehouse(wh)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* General Settings */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Product Settings</CardTitle>
              <CardDescription>Configure product management preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-slate-50/40 p-3">
                  <div>
                    <Label>Auto-generate SKU</Label>
                    <p className="text-sm text-muted-foreground">Automatically generate SKU codes for new products</p>
                  </div>
                  <Switch />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-slate-50/40 p-3">
                  <div>
                    <Label>Low stock alerts</Label>
                    <p className="text-sm text-muted-foreground">Send notifications when products reach low stock threshold</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-slate-50/40 p-3">
                  <div>
                    <Label>Auto-deduct recipe ingredients</Label>
                    <p className="text-sm text-muted-foreground">Automatically reduce ingredient stock when recipes are used</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>
              <Separator />
              <div className="space-y-2 rounded-lg border border-primary/10 bg-slate-50/40 p-3">
                <Label>Default Tax Rate</Label>
                <Select defaultValue="5">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">Standard 5% (UAE VAT)</SelectItem>
                    <SelectItem value="0">Zero Rated</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Warehouse Create/Edit Dialog */}
      <Dialog open={showWarehouseDialog} onOpenChange={setShowWarehouseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingWarehouse ? 'Edit Warehouse' : 'Add New Warehouse'}</DialogTitle>
            <DialogDescription>
              {editingWarehouse ? 'Update warehouse details' : 'Create a new storage location for your inventory'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Warehouse Name *</Label>
              <Input
                placeholder="e.g. Main Warehouse, Downtown Store"
                value={warehouseForm.name}
                onChange={(e) => setWarehouseForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={warehouseForm.type} onValueChange={(v) => setWarehouseForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MAIN_WAREHOUSE">Main Warehouse</SelectItem>
                  <SelectItem value="BRANCH">Branch / Store</SelectItem>
                  <SelectItem value="ONLINE">Online Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Location / Address</Label>
              <Input
                placeholder="e.g. Dubai Marina, JBR Walk"
                value={warehouseForm.location}
                onChange={(e) => setWarehouseForm((p) => ({ ...p, location: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Inactive warehouses won't appear in product forms</p>
              </div>
              <Switch
                checked={warehouseForm.isActive}
                onCheckedChange={(v) => setWarehouseForm((p) => ({ ...p, isActive: v }))}
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowWarehouseDialog(false)} disabled={isSavingWarehouse}>
                Cancel
              </Button>
              <Button onClick={saveWarehouse} disabled={isSavingWarehouse}>
                {isSavingWarehouse ? (
                  <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                ) : editingWarehouse ? 'Update Warehouse' : 'Create Warehouse'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Dialog */}
      <Dialog open={showStockDialog} onOpenChange={setShowStockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedProduct?.name}</DialogTitle>
            <DialogDescription>
              Update inventory levels for this product
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Warehouse</Label>
              <Select
                value={selectedStockWarehouseId ? String(selectedStockWarehouseId) : ''}
                onValueChange={(v) => setSelectedStockWarehouseId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select warehouse" />
                </SelectTrigger>
                <SelectContent>
                  {selectedProduct?.stockByWarehouse?.map((s) => (
                    <SelectItem key={s.warehouseId} value={String(s.warehouseId)}>
                      {s.warehouseName} — Current: {s.currentStock} {selectedProduct.defaultUnit || 'units'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Stock (Total)</Label>
                <div className="text-2xl font-bold">
                  {selectedProduct?.totalStock ?? 0} {selectedProduct?.defaultUnit || 'units'}
                </div>
              </div>
              <div>
                <Label>Selected Warehouse Stock</Label>
                <div className="text-2xl font-bold text-primary">
                  {selectedProduct?.stockByWarehouse?.find(s => s.warehouseId === selectedStockWarehouseId)?.currentStock ?? 0}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select
                value={stockAdjustment.type}
                onValueChange={(value: 'ADD' | 'SUBTRACT') =>
                  setStockAdjustment((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADD">Add Stock</SelectItem>
                  <SelectItem value="SUBTRACT">Remove Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                placeholder="Enter quantity"
                value={stockAdjustment.quantity === 0 ? '' : stockAdjustment.quantity.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  const numValue = value === '' ? 0 : parseInt(value, 10);
                  setStockAdjustment((prev) => ({
                    ...prev,
                    quantity: isNaN(numValue) ? 0 : numValue,
                  }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="Enter reason for stock adjustment"
                value={stockAdjustment.reason}
                onChange={(e) => setStockAdjustment((prev) => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowStockDialog(false)} disabled={isAdjusting}>
                Cancel
              </Button>
              <Button onClick={processStockAdjustment} disabled={isAdjusting}>
                {isAdjusting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Stock'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

