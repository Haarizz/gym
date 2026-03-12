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
import { Checkbox } from "../components/ui/checkbox";
import { Switch } from "../components/ui/switch";
import { Separator } from "../components/ui/separator";
import { ScrollArea } from "../components/ui/scroll-area";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Edit,
  Trash2,
  Eye,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Settings,
  Image as ImageIcon,
  QrCode,
  Printer,
  ShoppingCart,
  Utensils,
  Dumbbell,
  Shirt,
  Coffee,
  Tag,
  Calculator,
  RefreshCw,
  FileText,
  DollarSign,
  Package2,
  Zap,
  Activity,
  Users,
  Clock,
  Star,
  Info,
  ChevronDown,
  MoreHorizontal,
  Copy,
  Move
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  type: string;
  price: number;
  costPrice: number;
  currentStock: number;
  lowStockThreshold: number;
  unit: string;
  status: 'active' | 'inactive' | 'out-of-stock';
  hasVariants: boolean;
  hasRecipe: boolean;
  image?: string;
  barcode?: string;
  taxCategory: string;
  description?: string;
  variants?: number;
  lastUpdated: string;
  supplier?: string;
  totalValue: number;
}

interface ProductCategory {
  id: string;
  name: string;
  type: 'supplements' | 'equipment' | 'merchandise' | 'cafe';
  icon: React.ComponentType<any>;
  count: number;
  color: string;
}

interface ProductStats {
  totalProducts: number;
  activeProducts: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  categoriesCount: number;
  variantsCount: number;
  recipesCount: number;
}

interface ProductsProps {
  onNavigate?: (section: string) => void;
}

export function Products({ onNavigate }: ProductsProps) {
  const [activeTab, setActiveTab] = useState("inventory");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [stats, setStats] = useState<ProductStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showStockDialog, setShowStockDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState({ type: 'add', quantity: 0, reason: '' });

  // Sample data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      // Sample categories
      const categoryData: ProductCategory[] = [
        { id: 'supplements', name: 'Supplements', type: 'supplements', icon: Zap, count: 45, color: 'bg-blue-500' },
        { id: 'equipment', name: 'Equipment', type: 'equipment', icon: Dumbbell, count: 23, color: 'bg-green-500' },
        { id: 'merchandise', name: 'Merchandise', type: 'merchandise', icon: Shirt, count: 18, color: 'bg-purple-500' },
        { id: 'cafe', name: 'Café Items', type: 'cafe', icon: Coffee, count: 31, color: 'bg-orange-500' }
      ];
      
      // Sample products
      const productData: Product[] = [
        {
          id: '1',
          name: 'Whey Protein Isolate',
          sku: 'SUP-001',
          category: 'Supplements',
          type: 'supplements',
          price: 299.00,
          costPrice: 180.00,
          currentStock: 156,
          lowStockThreshold: 20,
          unit: 'container',
          status: 'active',
          hasVariants: true,
          hasRecipe: false,
          barcode: '1234567890123',
          taxCategory: 'Standard 5%',
          description: 'Premium whey protein isolate for muscle building',
          variants: 3,
          lastUpdated: '2024-01-15',
          supplier: 'NutriSupply Co.',
          totalValue: 46644.00
        },
        {
          id: '2',
          name: 'Adjustable Dumbbell Set',
          sku: 'EQP-001',
          category: 'Equipment',
          type: 'equipment',
          price: 1299.00,
          costPrice: 800.00,
          currentStock: 12,
          lowStockThreshold: 5,
          unit: 'set',
          status: 'active',
          hasVariants: false,
          hasRecipe: false,
          barcode: '2345678901234',
          taxCategory: 'Standard 5%',
          description: 'Professional adjustable dumbbell set 5-50kg',
          variants: 0,
          lastUpdated: '2024-01-14',
          supplier: 'FitPro Equipment',
          totalValue: 15588.00
        },
        {
          id: '3',
          name: 'Premium Gym T-Shirt',
          sku: 'MER-001',
          category: 'Merchandise',
          type: 'merchandise',
          price: 89.00,
          costPrice: 35.00,
          currentStock: 8,
          lowStockThreshold: 15,
          unit: 'piece',
          status: 'active',
          hasVariants: true,
          hasRecipe: false,
          barcode: '3456789012345',
          taxCategory: 'Standard 5%',
          description: 'High-quality moisture-wicking gym t-shirt',
          variants: 12,
          lastUpdated: '2024-01-13',
          supplier: 'Athletic Wear Ltd.',
          totalValue: 712.00
        },
        {
          id: '4',
          name: 'Protein Smoothie',
          sku: 'CAF-001',
          category: 'Café',
          type: 'cafe',
          price: 35.00,
          costPrice: 12.00,
          currentStock: 0,
          lowStockThreshold: 10,
          unit: 'serving',
          status: 'out-of-stock',
          hasVariants: true,
          hasRecipe: true,
          taxCategory: 'Standard 5%',
          description: 'Fresh protein smoothie with fruits',
          variants: 4,
          lastUpdated: '2024-01-12',
          totalValue: 0
        },
        {
          id: '5',
          name: 'BCAA Energy Drink',
          sku: 'SUP-002',
          category: 'Supplements',
          type: 'supplements',
          price: 45.00,
          costPrice: 22.00,
          currentStock: 234,
          lowStockThreshold: 50,
          unit: 'bottle',
          status: 'active',
          hasVariants: true,
          hasRecipe: false,
          barcode: '4567890123456',
          taxCategory: 'Standard 5%',
          description: 'BCAA energy drink for workout performance',
          variants: 5,
          lastUpdated: '2024-01-11',
          supplier: 'Energy Plus',
          totalValue: 10530.00
        }
      ];

      // Calculate stats
      const statsData: ProductStats = {
        totalProducts: productData.length,
        activeProducts: productData.filter(p => p.status === 'active').length,
        lowStockItems: productData.filter(p => p.currentStock <= p.lowStockThreshold && p.currentStock > 0).length,
        outOfStockItems: productData.filter(p => p.currentStock === 0).length,
        totalValue: productData.reduce((sum, p) => sum + p.totalValue, 0),
        categoriesCount: categoryData.length,
        variantsCount: productData.reduce((sum, p) => sum + (p.variants || 0), 0),
        recipesCount: productData.filter(p => p.hasRecipe).length
      };

      setCategories(categoryData);
      setProducts(productData);
      setStats(statsData);
      setLoading(false);
    };

    loadData();
  }, []);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'out-of-stock':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Out of Stock</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.currentStock === 0) {
      return <div className="flex items-center gap-1 text-red-600"><AlertTriangle className="h-4 w-4" /> Out of Stock</div>;
    } else if (product.currentStock <= product.lowStockThreshold) {
      return <div className="flex items-center gap-1 text-yellow-600"><AlertTriangle className="h-4 w-4" /> Low Stock</div>;
    } else {
      return <div className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> In Stock</div>;
    }
  };

  const handleStockAdjustment = (product: Product) => {
    setSelectedProduct(product);
    setStockAdjustment({ type: 'add', quantity: 0, reason: '' });
    setShowStockDialog(true);
  };

  const handleAddProduct = () => {
    if (onNavigate) {
      onNavigate('add-product');
    }
  };

  const processStockAdjustment = () => {
    if (!selectedProduct || !stockAdjustment.quantity || stockAdjustment.quantity <= 0 || isNaN(stockAdjustment.quantity)) {
      toast.error("Please enter a valid quantity");
      return;
    }

    const adjustmentQuantity = Math.floor(stockAdjustment.quantity); // Ensure integer
    const newQuantity = stockAdjustment.type === 'add' 
      ? selectedProduct.currentStock + adjustmentQuantity
      : Math.max(0, selectedProduct.currentStock - adjustmentQuantity);

    const updatedProducts = products.map(p => 
      p.id === selectedProduct.id 
        ? { 
            ...p, 
            currentStock: newQuantity, 
            lastUpdated: new Date().toISOString().split('T')[0],
            totalValue: newQuantity * p.costPrice
          }
        : p
    );

    setProducts(updatedProducts);
    setShowStockDialog(false);
    setSelectedProduct(null);
    setStockAdjustment({ type: 'add', quantity: 0, reason: '' });
    
    toast.success(`Stock ${stockAdjustment.type === 'add' ? 'added' : 'removed'} successfully`);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1>Products</h1>
            <p className="text-muted-foreground">Loading product inventory...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
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
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1>Products</h1>
            <p className="text-muted-foreground">
              Manage your gym's complete product inventory including supplements, equipment, merchandise, and café items.
            </p>
          </div>
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Products</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeProducts} active, {stats.totalProducts - stats.activeProducts} inactive
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">AED {stats.totalValue.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Total stock valuation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Stock Alerts</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.lowStockItems + stats.outOfStockItems}</div>
              <p className="text-xs text-muted-foreground">
                {stats.lowStockItems} low stock, {stats.outOfStockItems} out of stock
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Product Variants</CardTitle>
              <Package2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.variantsCount}</div>
              <p className="text-xs text-muted-foreground">
                {stats.recipesCount} with recipes
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Categories Overview */}
      <Card>
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
              const IconComponent = category.icon;
              return (
                <div key={category.id} className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
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

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-6">
          {/* Filters */}
          <Card>
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
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="supplements">Supplements</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="merchandise">Merchandise</SelectItem>
                    <SelectItem value="café">Café Items</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon">
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <CardTitle>Product Inventory</CardTitle>
              <CardDescription>
                {filteredProducts.length} of {products.length} products
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
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
                    {filteredProducts.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                              {product.image ? (
                                <img src={product.image} alt={product.name} className="w-8 h-8 object-cover rounded" />
                              ) : (
                                <Package className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                {product.hasVariants && (
                                  <Badge variant="outline" className="text-xs">
                                    {product.variants} variants
                                  </Badge>
                                )}
                                {product.hasRecipe && (
                                  <Badge variant="outline" className="text-xs">
                                    Recipe
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>AED {product.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{product.currentStock}</span>
                              <span className="text-muted-foreground">{product.unit}</span>
                            </div>
                            {getStockStatus(product)}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(product.status)}</TableCell>
                        <TableCell>AED {product.totalValue.toLocaleString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleAddProduct()}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Product
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStockAdjustment(product)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Adjust Stock
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <QrCode className="h-4 w-4 mr-2" />
                                Print Barcode
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="h-4 w-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Top Selling Products</CardTitle>
                <CardDescription>Best performing products by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products.slice(0, 5).map((product, index) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                          <span className="text-sm font-bold text-primary">#{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">AED {product.totalValue.toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">{product.currentStock} units</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Products requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products.filter(p => p.currentStock <= p.lowStockThreshold).map((product) => (
                    <div key={product.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-red-600">{product.currentStock} {product.unit}</p>
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
                  <FileText className="h-5 w-5" />
                  Stock Report
                </CardTitle>
                <CardDescription>Current inventory levels and valuation</CardDescription>
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
                  <BarChart3 className="h-5 w-5" />
                  Sales Report
                </CardTitle>
                <CardDescription>Product performance and sales analytics</CardDescription>
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
                  <QrCode className="h-5 w-5" />
                  Barcode List
                </CardTitle>
                <CardDescription>Export product list with barcodes</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Barcodes
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Settings</CardTitle>
              <CardDescription>Configure product management preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-generate SKU</Label>
                    <p className="text-sm text-muted-foreground">Automatically generate SKU codes for new products</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Low stock alerts</Label>
                    <p className="text-sm text-muted-foreground">Send notifications when products reach low stock threshold</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Auto-deduct recipe ingredients</Label>
                    <p className="text-sm text-muted-foreground">Automatically reduce ingredient stock when recipes are used</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <Label>Default Tax Category</Label>
                <Select defaultValue="standard">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard 5%</SelectItem>
                    <SelectItem value="zero">Zero Rated</SelectItem>
                    <SelectItem value="exempt">Exempt</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <Label>Currency</Label>
                <Select defaultValue="aed">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aed">AED - UAE Dirham</SelectItem>
                    <SelectItem value="usd">USD - US Dollar</SelectItem>
                    <SelectItem value="eur">EUR - Euro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Current Stock</Label>
                <div className="text-2xl font-bold">{selectedProduct?.currentStock} {selectedProduct?.unit}</div>
              </div>
              <div>
                <Label>Low Stock Threshold</Label>
                <div className="text-lg">{selectedProduct?.lowStockThreshold} {selectedProduct?.unit}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select 
                value={stockAdjustment.type} 
                onValueChange={(value: 'add' | 'remove') => setStockAdjustment(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="remove">Remove Stock</SelectItem>
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
                  setStockAdjustment(prev => ({ 
                    ...prev, 
                    quantity: isNaN(numValue) ? 0 : numValue 
                  }));
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason (Optional)</Label>
              <Textarea
                placeholder="Enter reason for stock adjustment"
                value={stockAdjustment.reason}
                onChange={(e) => setStockAdjustment(prev => ({ ...prev, reason: e.target.value }))}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowStockDialog(false)}>
                Cancel
              </Button>
              <Button onClick={processStockAdjustment}>
                Update Stock
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

