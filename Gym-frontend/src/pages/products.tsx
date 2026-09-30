import React, { useState, useEffect, useCallback } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
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
import { MoreHorizontal, Eye } from "lucide-react";
import { ProductDetailsDialog } from "../components/products/ProductDetailsDialog";
import { toast } from "sonner";
import { productsService, Product, ProductCategory, ProductStats, Warehouse, ProductSettings, DEFAULT_PRODUCT_SETTINGS } from "../utils/supabase/products-service";
import { useNavigate } from "react-router-dom";
import { Warehouse as WarehouseIcon } from "lucide-react";
import type { BarcodePrintRequest } from "./barcode-print";
import { useGlobalSearchPrefill } from "../components/global-search/use-global-search";

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
  const { currencyCode } = useCurrency();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  useGlobalSearchPrefill(setSearchQuery);
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Products › Settings tab — persisted server-side (GET/PUT /api/products/settings).
  const [productSettings, setProductSettings] = useState<ProductSettings>(DEFAULT_PRODUCT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [savingSetting, setSavingSetting] = useState<keyof ProductSettings | null>(null);

  useEffect(() => {
    productsService.getSettings()
      .then(setProductSettings)
      .catch(() => toast.error("Couldn't load product settings"))
      .finally(() => setSettingsLoaded(true));
  }, []);

  const updateProductSetting = async (key: keyof ProductSettings, value: string, label: string) => {
    const previous = productSettings;
    setProductSettings({ ...previous, [key]: value });
    setSavingSetting(key);
    try {
      setProductSettings(await productsService.updateSettings({ [key]: value }));
      toast.success(`${label} saved`);
    } catch (err: any) {
      setProductSettings(previous);
      toast.error(err?.message || `Couldn't save ${label.toLowerCase()}`);
    } finally {
      setSavingSetting(null);
    }
  };
  const [products, setProducts] = useState<Product[]>([]);
  // Product whose details box is open (clicking a row).
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<CategoryDisplay[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false);

  const loadData = useCallback(async (filters?: { search?: string; categoryId?: number; status?: string }, silent = false) => {
    if (!silent) setLoading(true);
    else setIsFiltering(true);
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
      if (!silent) setLoading(false);
      else setIsFiltering(false);
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
      loadData({ search: searchQuery || undefined, categoryId, status }, true);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedCategoryId, selectedStatus]);

  const getStatusBadge = (product: Product) => {
    const status = product.isActive ? product.stockStatus : 'INACTIVE';
    switch (status) {
      case 'ACTIVE':
      case 'IN_STOCK':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">In Stock</Badge>;
      case 'INACTIVE':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'OUT_OF_STOCK':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Insufficient</Badge>;
      case 'LOW_STOCK':
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">Low Stock</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.totalStock <= 0) {
      return <div className="flex items-center gap-1 text-red-600"><AlertTriangle className="h-4 w-4" /> Insufficient</div>;
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

  // Labels are designed and printed in Sales & Purchases › Barcode Print.
  const openBarcodePrint = (productIds: number[]) => {
    const request: BarcodePrintRequest = { productIds };
    navigate('/barcode-print', { state: { barcodePrint: request } });
  };

  const handlePrintBarcode = (product: Product) => {
    if (!product.barcode && !product.sku) {
      toast.error("No barcode available for this product");
      return;
    }
    openBarcodePrint([product.id]);
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
    const header = ['SKU', 'Product Name', 'Category', `Selling Price (${currencyCode})`, `Cost Price (${currencyCode})`, 'Unit', 'Total Stock', 'Reorder Level', 'Stock Status', `Inventory Value (${currencyCode})`, 'Supplier'];
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
    const printable = products.filter(p => p.barcode || p.sku);
    if (printable.length === 0) { toast.error('No products with a barcode or SKU to print'); return; }
    openBarcodePrint(printable.map(p => p.id));
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
              <div className="text-2xl font-bold text-emerald-600"><CurrencyGlyph /> {stats.totalInventoryValue.toLocaleString()}</div>
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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
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
                <div className="flex-1 relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search products by name, SKU, category, etc..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onFocus={() => setIsSearchFocused(true)}
                      onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                      className="pl-10"
                    />
                  </div>
                  
                  {isSearchFocused && searchQuery && (
                    <div className="absolute z-50 mt-1 w-full bg-white rounded-md border shadow-lg max-h-[300px] overflow-y-auto">
                      {isFiltering ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
                      ) : products.length > 0 ? (
                        <div className="py-2">
                          {products.slice(0, 8).map(product => (
                            <div 
                              key={product.id}
                              className="px-4 py-2 hover:bg-slate-50 cursor-pointer flex items-center gap-3"
                              onClick={() => {
                                setSearchQuery(product.sku || product.name);
                                setIsSearchFocused(false);
                              }}
                            >
                              <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center shrink-0 overflow-hidden">
                                {product.imageUrls?.[0] ? (
                                  <img src={product.imageUrls[0]} alt={product.name} className="w-full h-full object-cover" />
                                ) : (
                                  <Package className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <div className="font-medium text-sm truncate text-gray-900">{product.name}</div>
                                <div className="text-xs text-muted-foreground flex gap-2">
                                  <span>{product.sku}</span>
                                  <span>•</span>
                                  <span className="truncate">{product.categoryName}</span>
                                </div>
                              </div>
                              <div className="text-sm font-medium text-gray-900">
                                <CurrencyGlyph /> {product.sellingPrice.toFixed(2)}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No products found for "{searchQuery}"
                        </div>
                      )}
                    </div>
                  )}
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
                    <SelectItem value="OUT_OF_STOCK">Insufficient</SelectItem>
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
                        <TableHead>POS</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow
                          key={product.id}
                          className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                          tabIndex={0}
                          aria-label={`View details of ${product.name}`}
                          onClick={() => setViewingProduct(product)}
                          onKeyDown={(e) => { if (e.key === "Enter" && e.target === e.currentTarget) setViewingProduct(product); }}
                        >
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
                          <TableCell><CurrencyGlyph /> {product.sellingPrice.toFixed(2)}</TableCell>
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
                          <TableCell>
                            {product.enabledForPos ? (
                              <Badge className="bg-success">Visible</Badge>
                            ) : (
                              <Badge variant="secondary">Hidden</Badge>
                            )}
                          </TableCell>
                          <TableCell><CurrencyGlyph /> {product.inventoryValue.toLocaleString()}</TableCell>
                          {/* The actions menu must not also open the details box. */}
                          <TableCell onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setViewingProduct(product)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleEditProduct(product)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit Product
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
              <ProductDetailsDialog
                product={viewingProduct}
                onClose={() => setViewingProduct(null)}
                onEdit={(p) => { setViewingProduct(null); handleEditProduct(p); }}
                onPrintBarcode={handlePrintBarcode}
              />
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
                          <p className="font-medium"><CurrencyGlyph /> {product.inventoryValue.toLocaleString()}</p>
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
                            onClick={() => navigate('/purchase-order')}
                          >
                            Order Stock
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
                <CardDescription>Design and print labels for every product in this list</CardDescription>
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
          {/* Warehouses moved to their own module (Sales & Purchases › Warehouses) */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="flex items-center justify-between gap-4 p-6">
              <div>
                <CardTitle className="flex items-center gap-2"><WarehouseIcon className="h-5 w-5" /> Warehouses</CardTitle>
                <CardDescription className="mt-1">Storage locations are now managed in Sales &amp; Purchases › Warehouses.</CardDescription>
              </div>
              <Button variant="outline" onClick={() => navigate('/warehouses')}>Open Warehouses</Button>
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
                    <p className="text-sm text-muted-foreground">
                      {productSettings.autoGenerateSku === 'true'
                        ? 'SKU codes are generated from the category (e.g. SUP-0001)'
                        : "You enter each product's SKU yourself — it must be unique"}
                    </p>
                  </div>
                  <Switch
                    checked={productSettings.autoGenerateSku === 'true'}
                    disabled={!settingsLoaded || savingSetting === 'autoGenerateSku'}
                    onCheckedChange={v => updateProductSetting('autoGenerateSku', String(v), 'Auto-generate SKU')}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-slate-50/40 p-3">
                  <div>
                    <Label>Low stock alerts</Label>
                    <p className="text-sm text-muted-foreground">Notify admins and managers when a product falls to its reorder level or runs out</p>
                  </div>
                  <Switch
                    checked={productSettings.lowStockAlerts === 'true'}
                    disabled={!settingsLoaded || savingSetting === 'lowStockAlerts'}
                    onCheckedChange={v => updateProductSetting('lowStockAlerts', String(v), 'Low stock alerts')}
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-slate-50/40 p-3">
                  <div>
                    <Label>Auto-deduct recipe ingredients</Label>
                    <p className="text-sm text-muted-foreground">Reduce ingredient stock automatically when a production order is completed</p>
                  </div>
                  <Switch
                    checked={productSettings.autoDeductRecipeIngredients === 'true'}
                    disabled={!settingsLoaded || savingSetting === 'autoDeductRecipeIngredients'}
                    onCheckedChange={v => updateProductSetting('autoDeductRecipeIngredients', String(v), 'Auto-deduct recipe ingredients')}
                  />
                </div>
              </div>
              <Separator />
              <div className="space-y-2 rounded-lg border border-primary/10 bg-slate-50/40 p-3">
                <Label>Default Tax Rate</Label>
                <p className="text-sm text-muted-foreground">Pre-filled on new products — each product can still set its own rate</p>
                <Select
                  value={productSettings.defaultTaxRate}
                  disabled={!settingsLoaded || savingSetting === 'defaultTaxRate'}
                  onValueChange={v => updateProductSetting('defaultTaxRate', v, 'Default tax rate')}
                >
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

    </div>
  );
}

