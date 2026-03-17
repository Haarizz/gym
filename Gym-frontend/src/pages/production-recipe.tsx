import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { ScrollArea } from "../components/ui/scroll-area";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import {
  Plus, Search, Edit, Trash2, Eye, RefreshCw, MoreHorizontal,
  ChefHat, Package, Play, CheckCircle, X, Clock, DollarSign,
  FlaskConical, ListOrdered, BarChart3, Printer,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import {
  productionRecipeService,
  Recipe, RecipeRequest, RecipeIngredientRequest,
  ProductionOrder, ProductionOrderRequest,
  ProductionStats,
} from "../utils/supabase/production-recipe-service";
import { productsService, Product, Warehouse } from "../utils/supabase/products-service";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function recipeStatusBadge(s: string) {
  return s === 'ACTIVE'
    ? <Badge className="bg-green-100 text-green-800 text-xs">Active</Badge>
    : <Badge className="bg-gray-100 text-gray-600 text-xs">Inactive</Badge>;
}

function orderStatusBadge(s: string) {
  const map: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    IN_PROGRESS: 'bg-blue-100 text-blue-800',
    COMPLETED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    DRAFT: 'Draft', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled',
  };
  return <Badge className={`text-xs ${map[s] ?? 'bg-muted'}`}>{labels[s] ?? s}</Badge>;
}

// ── Form defaults ─────────────────────────────────────────────────────────────

interface IngredientRow extends RecipeIngredientRequest { _key: string }

function emptyRecipeForm(): RecipeRequest & { _items: IngredientRow[] } {
  return {
    name: '', description: '', categoryName: '', outputProductName: '',
    outputQuantity: 1, outputUnit: 'serving', prepTimeMinutes: undefined,
    status: 'ACTIVE', notes: '', items: [], _items: [],
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ProductionRecipe() {
  // data
  const [recipes, setRecipes]           = useState<Recipe[]>([]);
  const [orders, setOrders]             = useState<ProductionOrder[]>([]);
  const [stats, setStats]               = useState<ProductionStats | null>(null);
  const [apiProducts, setApiProducts]   = useState<Product[]>([]);
  const [warehouses, setWarehouses]     = useState<Warehouse[]>([]);
  const [loading, setLoading]           = useState(true);

  // pagination
  const [recipePage, setRecipePage]     = useState(1);
  const [recipeTotalPages, setRecipeTotalPages] = useState(1);
  const [orderPage, setOrderPage]       = useState(1);
  const [orderTotalPages, setOrderTotalPages]   = useState(1);

  // filters
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeStatus, setRecipeStatus] = useState('all');
  const [orderSearch, setOrderSearch]   = useState('');
  const [orderStatus, setOrderStatus]   = useState('all');

  // recipe form
  const [showRecipeForm, setShowRecipeForm] = useState(false);
  const [editingRecipe, setEditingRecipe]   = useState<Recipe | null>(null);
  const [recipeForm, setRecipeForm]         = useState(emptyRecipeForm());
  const [savingRecipe, setSavingRecipe]     = useState(false);

  // recipe ingredient search
  const [showIngSearch, setShowIngSearch]     = useState(false);
  const [ingSearchQ, setIngSearchQ]           = useState('');
  const [selectedIngProduct, setSelectedIngProduct] = useState<Product | null>(null);
  const [ingQty, setIngQty]                   = useState(1);
  const [ingUnit, setIngUnit]                 = useState('unit');
  const [ingUnitCost, setIngUnitCost]         = useState(0);
  const [ingNotes, setIngNotes]               = useState('');

  // view recipe
  const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
  const [showViewRecipe, setShowViewRecipe] = useState(false);

  // production order form
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [orderForm, setOrderForm]         = useState<Partial<ProductionOrderRequest>>({});
  const [savingOrder, setSavingOrder]     = useState(false);
  const [selectedRecipeForOrder, setSelectedRecipeForOrder] = useState<Recipe | null>(null);

  // view order
  const [viewingOrder, setViewingOrder]   = useState<ProductionOrder | null>(null);
  const [showViewOrder, setShowViewOrder] = useState(false);

  // delete / acting
  const [acting, setActing]               = useState(false);
  const [showDeleteRecipe, setShowDeleteRecipe] = useState(false);
  const [deletingRecipeId, setDeletingRecipeId] = useState<number | null>(null);
  const [showDeleteOrder, setShowDeleteOrder]   = useState(false);
  const [deletingOrderId, setDeletingOrderId]   = useState<number | null>(null);

  // ── load ──────────────────────────────────────────────────────────────────

  async function loadRecipes(p = recipePage) {
    try {
      const res = await productionRecipeService.getRecipes({
        page: p, size: 20,
        status: recipeStatus !== 'all' ? recipeStatus : undefined,
        search: recipeSearch || undefined,
      });
      setRecipes(res.recipes);
      setRecipeTotalPages(res.pagination.totalPages);
    } catch (e: any) { toast.error(e.message); }
  }

  async function loadOrders(p = orderPage) {
    try {
      const res = await productionRecipeService.getOrders({
        page: p, size: 20,
        status: orderStatus !== 'all' ? orderStatus : undefined,
        search: orderSearch || undefined,
      });
      setOrders(res.orders);
      setOrderTotalPages(res.pagination.totalPages);
    } catch (e: any) { toast.error(e.message); }
  }

  async function loadAll() {
    setLoading(true);
    try {
      const [products, whs, statsData] = await Promise.all([
        productsService.getProducts({ size: 300 }),
        productsService.getActiveWarehouses(),
        productionRecipeService.getStats(),
      ]);
      setApiProducts(products.products);
      setWarehouses(whs);
      setStats(statsData);
      await Promise.all([loadRecipes(1), loadOrders(1)]);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadAll(); }, []);
  useEffect(() => { loadRecipes(1); setRecipePage(1); }, [recipeSearch, recipeStatus]);
  useEffect(() => { loadOrders(1); setOrderPage(1); }, [orderSearch, orderStatus]);

  // ── ingredient search ────────────────────────────────────────────────────

  const filteredIngProducts = useMemo(() =>
    apiProducts.filter(p =>
      !ingSearchQ ||
      p.name.toLowerCase().includes(ingSearchQ.toLowerCase()) ||
      p.sku.toLowerCase().includes(ingSearchQ.toLowerCase())
    ), [apiProducts, ingSearchQ]);

  function openIngSearch() {
    setIngSearchQ(''); setSelectedIngProduct(null);
    setIngQty(1); setIngUnit('unit'); setIngUnitCost(0); setIngNotes('');
    setShowIngSearch(true);
  }

  function pickIngProduct(p: Product) {
    setSelectedIngProduct(p);
    setIngUnit(p.defaultUnit || 'unit');
    setIngUnitCost(p.costPrice || 0);
  }

  function addIngredient() {
    if (!selectedIngProduct) { toast.error('Select a product'); return; }
    if (ingQty <= 0) { toast.error('Quantity must be > 0'); return; }
    setRecipeForm(f => ({
      ...f,
      _items: [...f._items, {
        _key: Math.random().toString(36),
        productId: selectedIngProduct.id,
        productName: selectedIngProduct.name,
        sku: selectedIngProduct.sku,
        quantity: ingQty,
        unit: ingUnit,
        unitCost: ingUnitCost,
        notes: ingNotes || undefined,
      }],
    }));
    setShowIngSearch(false);
  }

  function removeIngredient(key: string) {
    setRecipeForm(f => ({ ...f, _items: f._items.filter(i => i._key !== key) }));
  }

  // ── recipe CRUD ──────────────────────────────────────────────────────────

  function openCreateRecipe() {
    setEditingRecipe(null);
    setRecipeForm(emptyRecipeForm());
    setShowRecipeForm(true);
  }

  function openEditRecipe(r: Recipe) {
    setEditingRecipe(r);
    setRecipeForm({
      name: r.name, description: r.description ?? '',
      categoryName: r.categoryName ?? '', categoryId: r.categoryId,
      outputProductId: r.outputProductId, outputProductName: r.outputProductName ?? '',
      outputQuantity: r.outputQuantity, outputUnit: r.outputUnit,
      prepTimeMinutes: r.prepTimeMinutes, status: r.status, notes: r.notes ?? '',
      items: [],
      _items: r.items.map(i => ({
        _key: Math.random().toString(36),
        productId: i.productId, productName: i.productName, sku: i.sku,
        quantity: i.quantity, unit: i.unit, unitCost: i.unitCost, notes: i.notes,
      })),
    });
    setShowRecipeForm(true);
  }

  async function saveRecipe() {
    if (!recipeForm.name.trim()) { toast.error('Recipe name is required'); return; }
    if (recipeForm._items.length === 0) { toast.error('Add at least one ingredient'); return; }
    setSavingRecipe(true);
    try {
      const req: RecipeRequest = {
        name: recipeForm.name, description: recipeForm.description,
        categoryId: recipeForm.categoryId, categoryName: recipeForm.categoryName,
        outputProductId: recipeForm.outputProductId, outputProductName: recipeForm.outputProductName,
        outputQuantity: recipeForm.outputQuantity, outputUnit: recipeForm.outputUnit,
        prepTimeMinutes: recipeForm.prepTimeMinutes, status: recipeForm.status, notes: recipeForm.notes,
        items: recipeForm._items.map(i => ({
          productId: i.productId, productName: i.productName, sku: i.sku,
          quantity: i.quantity, unit: i.unit, unitCost: i.unitCost, notes: i.notes,
        })),
      };
      if (editingRecipe) {
        await productionRecipeService.updateRecipe(editingRecipe.id, req);
        toast.success('Recipe updated');
      } else {
        await productionRecipeService.createRecipe(req);
        toast.success('Recipe created');
      }
      setShowRecipeForm(false);
      loadRecipes(1); loadStats();
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingRecipe(false); }
  }

  async function handleToggleStatus(r: Recipe) {
    try {
      await productionRecipeService.toggleRecipeStatus(r.id);
      toast.success(`Recipe ${r.status === 'ACTIVE' ? 'deactivated' : 'activated'}`);
      loadRecipes(); loadStats();
    } catch (e: any) { toast.error(e.message); }
  }

  async function handleDeleteRecipe() {
    if (!deletingRecipeId) return;
    try {
      await productionRecipeService.deleteRecipe(deletingRecipeId);
      toast.success('Recipe deleted');
      setShowDeleteRecipe(false);
      loadRecipes(1); loadStats();
    } catch (e: any) { toast.error(e.message); }
  }

  // ── production order ─────────────────────────────────────────────────────

  function openCreateOrder(recipe?: Recipe) {
    setSelectedRecipeForOrder(recipe ?? null);
    setOrderForm({
      recipeId: recipe?.id,
      quantityToProduce: recipe?.outputQuantity ?? 1,
      outputUnit: recipe?.outputUnit,
      scheduledDate: new Date().toISOString().split('T')[0],
      warehouseId: warehouses[0]?.id,
    });
    setShowOrderForm(true);
  }

  async function saveOrder() {
    if (!orderForm.recipeId) { toast.error('Select a recipe'); return; }
    if (!orderForm.quantityToProduce || orderForm.quantityToProduce <= 0) { toast.error('Quantity must be > 0'); return; }
    setSavingOrder(true);
    try {
      await productionRecipeService.createOrder(orderForm as ProductionOrderRequest);
      toast.success('Production order created');
      setShowOrderForm(false);
      loadOrders(1); loadStats();
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingOrder(false); }
  }

  async function handleStartProduction(o: ProductionOrder) {
    setActing(true);
    try {
      await productionRecipeService.startProduction(o.id);
      toast.success('Production started');
      loadOrders(); loadStats();
    } catch (e: any) { toast.error(e.message); }
    finally { setActing(false); }
  }

  async function handleCompleteProduction(o: ProductionOrder) {
    setActing(true);
    try {
      await productionRecipeService.completeProduction(o.id);
      toast.success('Production completed — stock updated');
      loadOrders(); loadStats();
    } catch (e: any) { toast.error(e.message); }
    finally { setActing(false); }
  }

  async function handleCancelOrder(o: ProductionOrder) {
    setActing(true);
    try {
      await productionRecipeService.cancelOrder(o.id);
      toast.success('Order cancelled');
      loadOrders(); loadStats();
    } catch (e: any) { toast.error(e.message); }
    finally { setActing(false); }
  }

  async function handleDeleteOrder() {
    if (!deletingOrderId) return;
    try {
      await productionRecipeService.deleteOrder(deletingOrderId);
      toast.success('Order deleted');
      setShowDeleteOrder(false);
      loadOrders(1); loadStats();
    } catch (e: any) { toast.error(e.message); }
  }

  async function loadStats() {
    try {
      const s = await productionRecipeService.getStats();
      setStats(s);
    } catch {}
  }

  function printRecipe(r: Recipe) {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>${r.name}</title>
    <style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}
    td,th{border:1px solid #ccc;padding:6px 10px;font-size:12px}</style></head><body>
    <h2>${r.name}</h2>
    <p><b>Output:</b> ${r.outputQuantity} ${r.outputUnit}${r.outputProductName ? ` of ${r.outputProductName}` : ''}</p>
    ${r.prepTimeMinutes ? `<p><b>Prep Time:</b> ${r.prepTimeMinutes} min</p>` : ''}
    ${r.description ? `<p>${r.description}</p>` : ''}
    <h3>Ingredients</h3>
    <table><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
    <tbody>${r.items.map(i => `<tr><td>${i.productName}</td><td>${i.sku}</td>
    <td>${i.quantity} ${i.unit}</td><td>${fmt(i.unitCost)}</td>
    <td>${fmt(i.quantity * i.unitCost)}</td></tr>`).join('')}</tbody></table>
    <p><b>Estimated Cost:</b> AED ${fmt(r.estimatedCost)}</p>
    </body></html>`);
    win.document.close(); win.print();
  }

  function printOrder(o: ProductionOrder) {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>${o.orderNumber}</title>
    <style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}
    td,th{border:1px solid #ccc;padding:6px 10px;font-size:12px}</style></head><body>
    <h2>Production Order — ${o.orderNumber}</h2>
    <p><b>Recipe:</b> ${o.recipeName}</p>
    <p><b>Qty:</b> ${o.quantityToProduce} ${o.outputUnit}</p>
    <p><b>Status:</b> ${o.status}</p>
    ${o.scheduledDate ? `<p><b>Scheduled:</b> ${o.scheduledDate}</p>` : ''}
    <h3>Scaled Ingredients</h3>
    <table><thead><tr><th>Product</th><th>SKU</th><th>Required Qty</th><th>Unit</th></tr></thead>
    <tbody>${o.ingredients.map(i => `<tr><td>${i.productName}</td><td>${i.sku}</td>
    <td>${i.quantity}</td><td>${i.unit}</td></tr>`).join('')}</tbody></table>
    <p><b>Total Ingredient Cost:</b> AED ${fmt(o.totalIngredientCost)}</p>
    </body></html>`);
    win.document.close(); win.print();
  }

  // ── recipe form cost preview
  const formEstimatedCost = recipeForm._items.reduce((s, i) => s + i.quantity * i.unitCost, 0);

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ChefHat className="h-6 w-6" /> Production & Recipes
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage recipes, ingredients, and production runs
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { loadRecipes(1); loadOrders(1); loadStats(); }}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <Button onClick={openCreateRecipe}>
            <Plus className="mr-2 h-4 w-4" /> New Recipe
          </Button>
          <Button variant="secondary" onClick={() => openCreateOrder()}>
            <ListOrdered className="mr-2 h-4 w-4" /> New Order
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Recipes',    value: stats?.totalRecipes ?? 0,      icon: ChefHat,       color: 'text-purple-500' },
          { label: 'Active Recipes',   value: stats?.activeRecipes ?? 0,     icon: CheckCircle,   color: 'text-green-500' },
          { label: 'Total Orders',     value: stats?.totalOrders ?? 0,       icon: ListOrdered,   color: 'text-blue-500' },
          { label: 'In Progress',      value: stats?.inProgressOrders ?? 0,  icon: Play,          color: 'text-orange-500' },
          { label: 'Completed',        value: stats?.completedOrders ?? 0,   icon: CheckCircle,   color: 'text-green-600' },
          { label: 'Draft Orders',     value: stats?.draftOrders ?? 0,       icon: Clock,         color: 'text-gray-500' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`h-3.5 w-3.5 ${color}`} />
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="recipes">
        <TabsList>
          <TabsTrigger value="recipes"><ChefHat className="mr-1.5 h-3.5 w-3.5" />Recipes</TabsTrigger>
          <TabsTrigger value="orders"><ListOrdered className="mr-1.5 h-3.5 w-3.5" />Production Orders</TabsTrigger>
        </TabsList>

        {/* ── Recipes Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="recipes" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search recipes..." className="pl-8"
                value={recipeSearch} onChange={e => setRecipeSearch(e.target.value)} />
            </div>
            <Select value={recipeStatus} onValueChange={setRecipeStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">Loading recipes...</div>
          ) : recipes.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ChefHat className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No recipes found</p>
                <Button className="mt-4" onClick={openCreateRecipe}><Plus className="mr-2 h-4 w-4" />New Recipe</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {recipes.map(r => (
                <Card key={r.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{r.name}</CardTitle>
                        {r.categoryName && <p className="text-xs text-muted-foreground mt-0.5">{r.categoryName}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {recipeStatusBadge(r.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setViewingRecipe(r); setShowViewRecipe(true); }}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditRecipe(r)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openCreateOrder(r)}>
                              <Play className="mr-2 h-4 w-4 text-blue-600" /> Start Production
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => printRecipe(r)}>
                              <Printer className="mr-2 h-4 w-4" /> Print Recipe
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggleStatus(r)}>
                              <FlaskConical className="mr-2 h-4 w-4" />
                              {r.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive"
                              onClick={() => { setDeletingRecipeId(r.id); setShowDeleteRecipe(true); }}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-2">
                    {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Yields</p>
                        <p className="font-medium">{r.outputQuantity} {r.outputUnit}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Est. Cost</p>
                        <p className="font-medium text-orange-600">AED {fmt(r.estimatedCost)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Ingredients</p>
                        <p className="font-medium">{r.items.length}</p>
                      </div>
                      {r.prepTimeMinutes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Prep Time</p>
                          <p className="font-medium">{r.prepTimeMinutes} min</p>
                        </div>
                      )}
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-1" onClick={() => openCreateOrder(r)}>
                      <Play className="mr-2 h-3.5 w-3.5" /> Create Production Order
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {recipeTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={recipePage <= 1}
                onClick={() => { setRecipePage(p => p - 1); loadRecipes(recipePage - 1); }}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {recipePage} of {recipeTotalPages}</span>
              <Button variant="outline" size="sm" disabled={recipePage >= recipeTotalPages}
                onClick={() => { setRecipePage(p => p + 1); loadRecipes(recipePage + 1); }}>Next</Button>
            </div>
          )}
        </TabsContent>

        {/* ── Orders Tab ──────────────────────────────────────────────────── */}
        <TabsContent value="orders" className="space-y-4 mt-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search order number, recipe..." className="pl-8"
                value={orderSearch} onChange={e => setOrderSearch(e.target.value)} />
            </div>
            <Select value={orderStatus} onValueChange={setOrderStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            {loading ? (
              <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Loading orders...
              </CardContent>
            ) : orders.length === 0 ? (
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <ListOrdered className="h-10 w-10 mb-3 opacity-30" />
                <p className="font-medium">No production orders found</p>
                <Button className="mt-4" onClick={() => openCreateOrder()}>
                  <Plus className="mr-2 h-4 w-4" /> New Order
                </Button>
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Recipe</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead>Scheduled</TableHead>
                    <TableHead className="text-right">Cost (AED)</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Output Product</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map(o => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-sm font-medium">{o.orderNumber}</TableCell>
                      <TableCell className="font-medium">{o.recipeName}</TableCell>
                      <TableCell className="text-right text-sm">{o.quantityToProduce} {o.outputUnit}</TableCell>
                      <TableCell className="text-sm">{o.scheduledDate ?? '—'}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(o.totalIngredientCost)}</TableCell>
                      <TableCell>{orderStatusBadge(o.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{o.outputProductName ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setViewingOrder(o); setShowViewOrder(true); }}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            {o.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => handleStartProduction(o)}>
                                <Play className="mr-2 h-4 w-4 text-blue-600" /> Start Production
                              </DropdownMenuItem>
                            )}
                            {o.status === 'IN_PROGRESS' && (
                              <DropdownMenuItem onClick={() => handleCompleteProduction(o)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-green-600" /> Mark Complete
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => printOrder(o)}>
                              <Printer className="mr-2 h-4 w-4" /> Print Order
                            </DropdownMenuItem>
                            {(o.status === 'DRAFT' || o.status === 'IN_PROGRESS') && (
                              <DropdownMenuItem onClick={() => handleCancelOrder(o)} className="text-destructive">
                                <X className="mr-2 h-4 w-4" /> Cancel
                              </DropdownMenuItem>
                            )}
                            {o.status === 'DRAFT' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive"
                                  onClick={() => { setDeletingOrderId(o.id); setShowDeleteOrder(true); }}>
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {orderTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={orderPage <= 1}
                onClick={() => { setOrderPage(p => p - 1); loadOrders(orderPage - 1); }}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {orderPage} of {orderTotalPages}</span>
              <Button variant="outline" size="sm" disabled={orderPage >= orderTotalPages}
                onClick={() => { setOrderPage(p => p + 1); loadOrders(orderPage + 1); }}>Next</Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Recipe Form Dialog ────────────────────────────────────────────── */}
      <Dialog open={showRecipeForm} onOpenChange={setShowRecipeForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecipe ? `Edit Recipe — ${editingRecipe.name}` : 'New Recipe'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">

            {/* Name + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Recipe Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g. Protein Shake" value={recipeForm.name}
                  onChange={e => setRecipeForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Input placeholder="e.g. Supplements, Cafe" value={recipeForm.categoryName ?? ''}
                  onChange={e => setRecipeForm(f => ({ ...f, categoryName: e.target.value }))} />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea rows={2} placeholder="Brief description of this recipe..."
                value={recipeForm.description ?? ''}
                onChange={e => setRecipeForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* Output + Prep Time + Status */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label>Output Qty <span className="text-destructive">*</span></Label>
                <Input type="number" min={0.01} step="0.01"
                  value={recipeForm.outputQuantity}
                  onChange={e => setRecipeForm(f => ({ ...f, outputQuantity: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Output Unit</Label>
                <Input placeholder="serving / litre / kg"
                  value={recipeForm.outputUnit}
                  onChange={e => setRecipeForm(f => ({ ...f, outputUnit: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Prep Time (min)</Label>
                <Input type="number" min={0} placeholder="e.g. 10"
                  value={recipeForm.prepTimeMinutes ?? ''}
                  onChange={e => setRecipeForm(f => ({ ...f, prepTimeMinutes: e.target.value ? Number(e.target.value) : undefined }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={recipeForm.status ?? 'ACTIVE'}
                  onValueChange={v => setRecipeForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Output Product */}
            <div className="space-y-1.5">
              <Label>Output Product (optional)</Label>
              <Input placeholder="Product name that this recipe produces (for stock tracking)"
                value={recipeForm.outputProductName ?? ''}
                onChange={e => setRecipeForm(f => ({ ...f, outputProductName: e.target.value }))} />
            </div>

            {/* Ingredients */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Ingredients <span className="text-destructive">*</span></Label>
                <Button type="button" variant="outline" size="sm" onClick={openIngSearch}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Ingredient
                </Button>
              </div>
              {recipeForm._items.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No ingredients added yet</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Product</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-20">Unit</TableHead>
                        <TableHead className="w-28">Unit Cost</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recipeForm._items.map(item => (
                        <TableRow key={item._key}>
                          <TableCell>
                            <p className="text-sm font-medium">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">{item.sku}</p>
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0.01} step="0.01" className="h-7 w-20"
                              value={item.quantity}
                              onChange={e => setRecipeForm(f => ({
                                ...f, _items: f._items.map(i =>
                                  i._key === item._key ? { ...i, quantity: Number(e.target.value) } : i)
                              }))} />
                          </TableCell>
                          <TableCell>
                            <Input className="h-7 w-18" value={item.unit}
                              onChange={e => setRecipeForm(f => ({
                                ...f, _items: f._items.map(i =>
                                  i._key === item._key ? { ...i, unit: e.target.value } : i)
                              }))} />
                          </TableCell>
                          <TableCell>
                            <Input type="number" min={0} step="0.01" className="h-7 w-24"
                              value={item.unitCost}
                              onChange={e => setRecipeForm(f => ({
                                ...f, _items: f._items.map(i =>
                                  i._key === item._key ? { ...i, unitCost: Number(e.target.value) } : i)
                              }))} />
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {fmt(item.quantity * item.unitCost)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => removeIngredient(item._key)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {recipeForm._items.length > 0 && (
                <div className="flex justify-end">
                  <div className="bg-muted rounded-lg px-4 py-2 text-sm">
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Estimated Cost (per batch)</span>
                      <span className="font-bold">AED {fmt(formEstimatedCost)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Instructions, tips, special notes..."
                value={recipeForm.notes ?? ''}
                onChange={e => setRecipeForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowRecipeForm(false)}>Cancel</Button>
              <Button onClick={saveRecipe} disabled={savingRecipe}>
                {savingRecipe ? 'Saving...' : editingRecipe ? 'Update Recipe' : 'Create Recipe'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Ingredient Search Dialog ──────────────────────────────────────── */}
      <Dialog open={showIngSearch} onOpenChange={setShowIngSearch}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Select Ingredient</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or SKU..." className="pl-8" autoFocus
                value={ingSearchQ} onChange={e => setIngSearchQ(e.target.value)} />
            </div>
            <ScrollArea className="h-52 border rounded-lg">
              {filteredIngProducts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">No products found</div>
              ) : filteredIngProducts.map(p => (
                <div key={p.id}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b last:border-0 hover:bg-muted/50 transition-colors ${
                    selectedIngProduct?.id === p.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''}`}
                  onClick={() => pickIngProduct(p)}>
                  <div>
                    <p className="text-sm font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.sku} · {p.categoryName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Stock: {p.totalStock}</p>
                    <p className="text-xs font-medium">AED {fmt(p.costPrice)}</p>
                  </div>
                </div>
              ))}
            </ScrollArea>
            {selectedIngProduct && (
              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <p className="text-sm font-semibold">{selectedIngProduct.name}</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantity</Label>
                    <Input type="number" min={0.01} step="0.01" value={ingQty}
                      onChange={e => setIngQty(Number(e.target.value))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit</Label>
                    <Input value={ingUnit} onChange={e => setIngUnit(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit Cost (AED)</Label>
                    <Input type="number" min={0} step="0.01" value={ingUnitCost}
                      onChange={e => setIngUnitCost(Number(e.target.value))} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Notes (optional)</Label>
                  <Input placeholder="e.g. sieved / chilled" value={ingNotes}
                    onChange={e => setIngNotes(e.target.value)} />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowIngSearch(false)}>Cancel</Button>
              <Button onClick={addIngredient} disabled={!selectedIngProduct}>Add Ingredient</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Recipe Dialog ────────────────────────────────────────────── */}
      <Dialog open={showViewRecipe} onOpenChange={setShowViewRecipe}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChefHat className="h-5 w-5" /> {viewingRecipe?.name}
            </DialogTitle>
          </DialogHeader>
          {viewingRecipe && (
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">{recipeStatusBadge(viewingRecipe.status)}</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Category:</span> <span className="font-medium ml-1">{viewingRecipe.categoryName || '—'}</span></div>
                <div><span className="text-muted-foreground">Yields:</span> <span className="font-medium ml-1">{viewingRecipe.outputQuantity} {viewingRecipe.outputUnit}</span></div>
                {viewingRecipe.outputProductName && <div><span className="text-muted-foreground">Output Product:</span> <span className="font-medium ml-1">{viewingRecipe.outputProductName}</span></div>}
                {viewingRecipe.prepTimeMinutes && <div><span className="text-muted-foreground">Prep Time:</span> <span className="font-medium ml-1">{viewingRecipe.prepTimeMinutes} min</span></div>}
              </div>
              {viewingRecipe.description && <p className="text-sm text-muted-foreground border rounded p-2 bg-muted/30">{viewingRecipe.description}</p>}
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Ingredient</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingRecipe.items.map((ing, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{ing.productName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{ing.sku}</TableCell>
                        <TableCell className="text-right text-sm">{ing.quantity} {ing.unit}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(ing.unitCost)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{fmt(ing.quantity * ing.unitCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-end">
                <div className="bg-muted rounded-lg px-4 py-2 text-sm">
                  <div className="flex justify-between gap-8">
                    <span className="text-muted-foreground">Estimated Cost per Batch</span>
                    <span className="font-bold text-orange-600">AED {fmt(viewingRecipe.estimatedCost)}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => printRecipe(viewingRecipe)}><Printer className="mr-2 h-4 w-4" />Print</Button>
                <Button variant="secondary" onClick={() => { setShowViewRecipe(false); openEditRecipe(viewingRecipe); }}><Edit className="mr-2 h-4 w-4" />Edit</Button>
                <Button onClick={() => { setShowViewRecipe(false); openCreateOrder(viewingRecipe); }}><Play className="mr-2 h-4 w-4" />Start Production</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Production Order Form Dialog ──────────────────────────────────── */}
      <Dialog open={showOrderForm} onOpenChange={setShowOrderForm}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Production Order</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Recipe <span className="text-destructive">*</span></Label>
              <Select
                value={orderForm.recipeId ? String(orderForm.recipeId) : ''}
                onValueChange={v => {
                  const r = recipes.find(x => x.id === Number(v));
                  setSelectedRecipeForOrder(r ?? null);
                  setOrderForm(f => ({ ...f, recipeId: Number(v), outputUnit: r?.outputUnit, quantityToProduce: r?.outputQuantity ?? 1 }));
                }}>
                <SelectTrigger><SelectValue placeholder="Select a recipe" /></SelectTrigger>
                <SelectContent>
                  {recipes.filter(r => r.status === 'ACTIVE').map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedRecipeForOrder && (
              <div className="bg-muted/50 border rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium">{selectedRecipeForOrder.name}</p>
                <p className="text-muted-foreground">Base batch: {selectedRecipeForOrder.outputQuantity} {selectedRecipeForOrder.outputUnit} · {selectedRecipeForOrder.items.length} ingredients</p>
                <p className="text-muted-foreground">Est. cost per batch: AED {fmt(selectedRecipeForOrder.estimatedCost)}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Quantity to Produce <span className="text-destructive">*</span></Label>
                <Input type="number" min={0.01} step="0.01"
                  value={orderForm.quantityToProduce ?? ''}
                  onChange={e => setOrderForm(f => ({ ...f, quantityToProduce: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Unit</Label>
                <Input placeholder="serving / kg / L"
                  value={orderForm.outputUnit ?? ''}
                  onChange={e => setOrderForm(f => ({ ...f, outputUnit: e.target.value }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Scheduled Date</Label>
                <Input type="date"
                  value={orderForm.scheduledDate ?? ''}
                  onChange={e => setOrderForm(f => ({ ...f, scheduledDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Warehouse</Label>
                <Select
                  value={orderForm.warehouseId ? String(orderForm.warehouseId) : ''}
                  onValueChange={v => setOrderForm(f => ({ ...f, warehouseId: Number(v) }))}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>
                    {warehouses.map(w => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedRecipeForOrder && orderForm.quantityToProduce && orderForm.quantityToProduce > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800 mb-1">Estimated cost for this run</p>
                <p className="text-blue-700 font-bold">
                  AED {fmt(
                    selectedRecipeForOrder.estimatedCost *
                    (orderForm.quantityToProduce / selectedRecipeForOrder.outputQuantity)
                  )}
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={2} placeholder="Special instructions for this production run..."
                value={orderForm.notes ?? ''}
                onChange={e => setOrderForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            <div className="flex justify-end gap-2 border-t pt-2">
              <Button variant="outline" onClick={() => setShowOrderForm(false)}>Cancel</Button>
              <Button onClick={saveOrder} disabled={savingOrder}>
                {savingOrder ? 'Creating...' : 'Create Order'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Order Dialog ─────────────────────────────────────────────── */}
      <Dialog open={showViewOrder} onOpenChange={setShowViewOrder}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5" /> {viewingOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {viewingOrder && (
            <div className="space-y-4 pt-2">
              {orderStatusBadge(viewingOrder.status)}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Recipe:</span> <span className="font-medium ml-1">{viewingOrder.recipeName}</span></div>
                <div><span className="text-muted-foreground">Quantity:</span> <span className="font-medium ml-1">{viewingOrder.quantityToProduce} {viewingOrder.outputUnit}</span></div>
                {viewingOrder.scheduledDate && <div><span className="text-muted-foreground">Scheduled:</span> <span className="font-medium ml-1">{viewingOrder.scheduledDate}</span></div>}
                {viewingOrder.completedDate && <div><span className="text-muted-foreground">Completed:</span> <span className="font-medium ml-1">{viewingOrder.completedDate}</span></div>}
                {viewingOrder.outputProductName && <div><span className="text-muted-foreground">Output:</span> <span className="font-medium ml-1">{viewingOrder.outputProductName}</span></div>}
              </div>

              {viewingOrder.ingredients.length > 0 && (
                <>
                  <p className="text-sm font-semibold">Required Ingredients (scaled)</p>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Ingredient</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Required Qty</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {viewingOrder.ingredients.map((ing, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium text-sm">{ing.productName}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{ing.sku}</TableCell>
                            <TableCell className="text-right text-sm">{ing.quantity} {ing.unit}</TableCell>
                            <TableCell className="text-right text-sm">{fmt(ing.unitCost)}</TableCell>
                            <TableCell className="text-right text-sm font-medium">{fmt(ing.quantity * ing.unitCost)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              <div className="flex justify-end">
                <div className="bg-muted rounded-lg px-4 py-2 text-sm">
                  <div className="flex justify-between gap-8">
                    <span className="text-muted-foreground">Total Ingredient Cost</span>
                    <span className="font-bold">AED {fmt(viewingOrder.totalIngredientCost)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => printOrder(viewingOrder)}><Printer className="mr-2 h-4 w-4" />Print</Button>
                {viewingOrder.status === 'DRAFT' && (
                  <Button onClick={() => { setShowViewOrder(false); handleStartProduction(viewingOrder); }}>
                    <Play className="mr-2 h-4 w-4" />Start Production
                  </Button>
                )}
                {viewingOrder.status === 'IN_PROGRESS' && (
                  <Button className="bg-green-600 hover:bg-green-700" onClick={() => { setShowViewOrder(false); handleCompleteProduction(viewingOrder); }}>
                    <CheckCircle className="mr-2 h-4 w-4" />Mark Complete
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialogs ────────────────────────────────────────────────── */}
      <Dialog open={showDeleteRecipe} onOpenChange={setShowDeleteRecipe}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Recipe</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Are you sure? This recipe and all its ingredients will be permanently deleted.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteRecipe(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteRecipe}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteOrder} onOpenChange={setShowDeleteOrder}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Production Order</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">Are you sure? Only draft orders can be deleted.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteOrder(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteOrder}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
