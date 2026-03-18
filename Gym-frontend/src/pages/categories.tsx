import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import {
  Plus, Search, Edit, Trash2, Tag, Package, Layers,
  Pill, Dumbbell, ShoppingBag, Coffee, Shirt, Star, Heart,
  Zap, Box, Grid3X3, List, RefreshCw, MoreHorizontal,
  TrendingUp, BarChart3,
} from "lucide-react";
import { productsService, Product, ProductCategory } from "../utils/supabase/products-service";
import { toast } from "sonner";

// ── Icon catalogue ────────────────────────────────────────────────────────────

const ICON_OPTIONS = [
  { label: "Package",      value: "Package",     Icon: Package },
  { label: "Pill",         value: "Pill",         Icon: Pill },
  { label: "Dumbbell",     value: "Dumbbell",     Icon: Dumbbell },
  { label: "Shopping Bag", value: "ShoppingBag",  Icon: ShoppingBag },
  { label: "Coffee",       value: "Coffee",       Icon: Coffee },
  { label: "Shirt",        value: "Shirt",        Icon: Shirt },
  { label: "Tag",          value: "Tag",          Icon: Tag },
  { label: "Layers",       value: "Layers",       Icon: Layers },
  { label: "Star",         value: "Star",         Icon: Star },
  { label: "Heart",        value: "Heart",        Icon: Heart },
  { label: "Zap",          value: "Zap",          Icon: Zap },
  { label: "Box",          value: "Box",          Icon: Box },
];

const COLOR_OPTIONS = [
  { label: "Blue",    value: "bg-blue-500",   hex: "#3b82f6" },
  { label: "Purple",  value: "bg-purple-500", hex: "#a855f7" },
  { label: "Green",   value: "bg-green-500",  hex: "#22c55e" },
  { label: "Yellow",  value: "bg-yellow-500", hex: "#eab308" },
  { label: "Pink",    value: "bg-pink-500",   hex: "#ec4899" },
  { label: "Red",     value: "bg-red-500",    hex: "#ef4444" },
  { label: "Orange",  value: "bg-orange-500", hex: "#f97316" },
  { label: "Teal",    value: "bg-teal-500",   hex: "#14b8a6" },
  { label: "Indigo",  value: "bg-indigo-500", hex: "#6366f1" },
  { label: "Gray",    value: "bg-gray-500",   hex: "#6b7280" },
];

const CATEGORY_TYPES = [
  "SUPPLEMENTS", "EQUIPMENT", "MERCHANDISE",
  "CAFE", "APPAREL", "ACCESSORIES", "OTHER",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function getIconComponent(iconName: string) {
  return ICON_OPTIONS.find(o => o.value === iconName)?.Icon ?? Package;
}

function getColorHex(colorClass: string) {
  return COLOR_OPTIONS.find(o => o.value === colorClass)?.hex ?? "#3b82f6";
}

function defaultForm(): Partial<ProductCategory> {
  return { name: "", categoryType: "SUPPLEMENTS", color: "bg-blue-500", iconName: "Package" };
}

function typeBadge(type: string) {
  const map: Record<string, string> = {
    SUPPLEMENTS:  "bg-blue-100 text-blue-800",
    EQUIPMENT:    "bg-gray-100 text-gray-800",
    MERCHANDISE:  "bg-purple-100 text-purple-800",
    CAFE:         "bg-yellow-100 text-yellow-800",
    APPAREL:      "bg-pink-100 text-pink-800",
    ACCESSORIES:  "bg-teal-100 text-teal-800",
    OTHER:        "bg-orange-100 text-orange-800",
  };
  const label = type
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <Badge className={`text-xs font-medium ${map[type] ?? "bg-muted text-muted-foreground"}`}>
      {label}
    </Badge>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Categories() {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [viewMode, setViewMode]     = useState<"grid" | "list">("grid");
  const [showForm, setShowForm]     = useState(false);
  const [editingCat, setEditingCat] = useState<ProductCategory | null>(null);
  const [form, setForm]             = useState<Partial<ProductCategory>>(defaultForm());
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showProducts, setShowProducts] = useState(false);
  const [viewingCategory, setViewingCategory] = useState<ProductCategory | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ── Load ──────────────────────────────────────────────────────────────────

  async function loadCategories() {
    setLoading(true);
    try {
      const data = await productsService.getCategories();
      setCategories(data);
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadCategories(); }, []);

  // ── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const totalProducts = categories.reduce((s, c) => s + (c.productCount ?? 0), 0);
    const topCat = categories.reduce<ProductCategory | null>((best, c) =>
      !best || (c.productCount ?? 0) > (best.productCount ?? 0) ? c : best, null);
    const types = new Set(categories.map(c => c.categoryType)).size;
    return { total: categories.length, totalProducts, topCat, types };
  }, [categories]);

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => categories.filter(c => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase());
    const matchType   = typeFilter === "all" || c.categoryType === typeFilter;
    return matchSearch && matchType;
  }), [categories, search, typeFilter]);

  const typeUnique = Array.from(new Set(categories.map(c => c.categoryType)));

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditingCat(null);
    setForm(defaultForm());
    setShowForm(true);
  }

  function openEdit(cat: ProductCategory) {
    setEditingCat(cat);
    setForm({ name: cat.name, categoryType: cat.categoryType, color: cat.color, iconName: cat.iconName });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.name?.trim()) { toast.error("Category name is required"); return; }
    setSaving(true);
    try {
      if (editingCat) {
        await productsService.updateCategory(editingCat.id, form);
        toast.success("Category updated");
      } else {
        await productsService.createCategory(form);
        toast.success("Category created");
      }
      setShowForm(false);
      loadCategories();
    } catch (e: any) {
      toast.error(e.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  }

  function askDelete(id: number) {
    setDeletingId(id);
    setShowDeleteDialog(true);
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await productsService.deleteCategory(deletingId);
      toast.success("Category deleted");
      setShowDeleteDialog(false);
      loadCategories();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete category");
    }
  }

  async function openViewProducts(cat: ProductCategory) {
    setViewingCategory(cat);
    setShowProducts(true);
    setLoadingProducts(true);
    setCategoryProducts([]);
    try {
      const res = await productsService.getProducts({ categoryId: cat.id, size: 60 });
      setCategoryProducts(res.products);
    } catch (e: any) {
      toast.error(e.message || "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Product Categories</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Organise products into categories for better inventory tracking and reporting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={loadCategories} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" className="h-9" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes catFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .category-panel {
          animation: catFadeIn 0.22s ease-out;
        }
      `}</style>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Categories</CardTitle>
            <div className="bg-indigo-50 p-2 rounded-lg">
              <Tag className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.types} distinct types</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Products</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Category Types</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <BarChart3 className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.types}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique types in use</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Top Category</CardTitle>
            <div className="bg-emerald-50 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate text-emerald-700">{stats.topCat?.name ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.topCat?.productCount ?? 0} products</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + view toggle */}
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-[3]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search categories by name..."
                className="pl-11 h-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[120px] h-9 text-xs">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {typeUnique.map(t => (
                  <SelectItem key={t} value={t}>
                    {t.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border border-primary/10 rounded-md overflow-hidden shrink-0">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-10 px-3"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                className="rounded-none h-10 px-3"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow category-panel">
          <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading categories...
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow category-panel">
          <CardContent className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
              <Tag className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-xl font-bold mb-2">No categories found</h3>
            <p className="text-muted-foreground max-w-xs mx-auto mb-8">
              {search || typeFilter !== "all"
                ? "We couldn't find any categories matching your current filters."
                : "Get started by creating your first product category to organize your inventory."}
            </p>
            <div className="flex gap-3">
              {(search || typeFilter !== "all") ? (
                <Button variant="outline" onClick={() => { setSearch(""); setTypeFilter("all"); }}>
                  Clear Filters
                </Button>
              ) : (
                <Button onClick={openCreate} className="shadow-lg">
                  <Plus className="mr-2 h-4 w-4" /> Add Your First Category
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (

        /* ── Grid view ──────────────────────────────────────────────────────── */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 category-panel">
          {filtered.map(cat => {
            const IconComp = getIconComponent(cat.iconName);
            const hex      = getColorHex(cat.color);
            return (
              <Card key={cat.id} className="group border-primary/10 shadow-md hover:shadow-lg transition-all">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary truncate">{cat.name}</CardTitle>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${hex}1A` }}>
                    <IconComp className="h-4 w-4" style={{ color: hex }} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: hex }}>{cat.productCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Products in this category</p>
                  <div className="mt-4 pt-3 border-t flex items-center justify-between">
                    {typeBadge(cat.categoryType)}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all"
                      onClick={() => openViewProducts(cat)}
                    >
                      View All
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

      ) : (

        /* ── List view ──────────────────────────────────────────────────────── */
        <Card className="overflow-hidden border-primary/10 shadow-md hover:shadow-lg transition-shadow category-panel">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Categories</CardTitle>
                <CardDescription>Add and manage categories for your inventory</CardDescription>
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[45%] font-semibold pl-6">Category Display</TableHead>
                  <TableHead className="w-[22%] font-semibold">Category Type</TableHead>
                  <TableHead className="w-[18%] text-center font-semibold">Product Count</TableHead>
                  <TableHead className="w-[15%] text-left font-semibold pl-4">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(cat => {
                  const IconComp = getIconComponent(cat.iconName);
                  const hex      = getColorHex(cat.color);
                  return (
                    <TableRow key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="pl-6">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${hex}1A` }}>
                            <IconComp className="h-4 w-4" style={{ color: hex }} />
                          </div>
                          <div>
                            <span className="font-semibold text-sm block">{cat.name}</span>
                            <span className="text-xs text-muted-foreground uppercase">ID: #{cat.id}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="inline-flex">{typeBadge(cat.categoryType)}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm min-w-[56px]">
                          {cat.productCount ?? 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-left pl-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => openEdit(cat)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Category
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openViewProducts(cat)}>
                              <Package className="mr-2 h-4 w-4" /> View Products
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => askDelete(cat.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Category
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}


      {/* View Category Products Dialog */}
      <Dialog open={showProducts} onOpenChange={setShowProducts}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewingCategory?.name || "Category"} Products</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {viewingCategory?.productCount ?? categoryProducts.length} product(s) in this category
            </p>
            {loadingProducts ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground text-sm">
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading products...
              </div>
            ) : categoryProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-center">
                <Package className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">No products found in this category</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-1">
                {categoryProducts.map(p => (
                  <div key={p.id} className="border rounded-lg p-3 flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                      {p.imageUrls?.[0] ? (
                        <img src={p.imageUrls[0]} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{p.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{p.sku}</p>
                      <p className="text-xs text-muted-foreground">AED {p.sellingPrice.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      {/* ── Create / Edit Dialog ───────────────────────────────────────────── */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCat ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">

            {/* Live preview */}
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              {(() => {
                const IconComp = getIconComponent(form.iconName ?? "Package");
                const hex      = getColorHex(form.color ?? "bg-blue-500");
                return (
                  <div className="p-2 rounded-lg shrink-0" style={{ backgroundColor: `${hex}1A` }}>
                    <IconComp className="h-4 w-4" style={{ color: hex }} />
                  </div>
                );
              })()}
              <div>
                <p className="font-semibold text-sm">{form.name || "Category Name"}</p>
                <p className="text-xs text-muted-foreground">{form.categoryType || "Type"}</p>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Supplements"
                value={form.name ?? ""}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* Category Type */}
            <div className="space-y-1.5">
              <Label>Category Type</Label>
              <Select
                value={form.categoryType ?? "SUPPLEMENTS"}
                onValueChange={v => setForm(f => ({ ...f, categoryType: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORY_TYPES.map(t => (
                    <SelectItem key={t} value={t}>
                      {t.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => setForm(f => ({ ...f, color: opt.value }))}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      form.color === opt.value ? "border-foreground scale-110" : "border-transparent"
                    }`}
                    style={{ backgroundColor: opt.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Icon picker */}
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map(opt => {
                  const hex = getColorHex(form.color ?? "bg-blue-500");
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      title={opt.label}
                      onClick={() => setForm(f => ({ ...f, iconName: opt.value }))}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center border-2 transition-all ${
                        form.iconName === opt.value
                          ? "border-foreground text-white"
                          : "border-transparent bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                      style={form.iconName === opt.value ? { backgroundColor: hex } : undefined}
                    >
                      <opt.Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingCat ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ────────────────────────────────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure? Products in this category will lose their category association.
            This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
