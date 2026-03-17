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
import { productsService, ProductCategory } from "../utils/supabase/products-service";
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
  return (
    <Badge className={`text-xs font-medium ${map[type] ?? "bg-muted text-muted-foreground"}`}>
      {type}
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Layers className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Product Categories</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Organise products into categories for better inventory tracking and reporting.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadCategories} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Add Category
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <Tag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.types} distinct types</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Products</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Category Types</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.types}</div>
            <p className="text-xs text-muted-foreground mt-1">Unique types in use</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Category</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{stats.topCat?.name ?? "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.topCat?.productCount ?? 0} products</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + view toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search categories by name..."
                className="pl-10"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {typeUnique.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border rounded-md overflow-hidden shrink-0">
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
        <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading categories...
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed border-2 shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-20 text-center">
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
               { (search || typeFilter !== "all") ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(cat => {
            const IconComp = getIconComponent(cat.iconName);
            const hex      = getColorHex(cat.color);
            return (
              <Card key={cat.id} className="group hover:shadow-md transition-all duration-300 border-l-4" style={{ borderLeftColor: hex }}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-sm ring-4 ring-muted group-hover:scale-110 transition-transform duration-300"
                      style={{ backgroundColor: hex }}
                    >
                      <IconComp className="h-6 w-6" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-muted">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openEdit(cat)}>
                          <Edit className="mr-2 h-4 w-4" /> Edit Category
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
                  </div>
                  <div>
                    <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors">{cat.name}</h3>
                    <div className="flex items-baseline gap-1.5 mt-2">
                      <span className="text-2xl font-bold">{cat.productCount ?? 0}</span>
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Products</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    {typeBadge(cat.categoryType)}
                    <Button variant="outline" size="sm" className="h-8 text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-all">
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
        <Card className="overflow-hidden border-none shadow-md">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px] font-semibold">Category Display</TableHead>
                <TableHead className="font-semibold">Category Type</TableHead>
                <TableHead className="text-center font-semibold">Product Count</TableHead>
                <TableHead className="text-right font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(cat => {
                const IconComp = getIconComponent(cat.iconName);
                const hex      = getColorHex(cat.color);
                return (
                  <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: hex }}
                        >
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div>
                          <span className="font-semibold text-sm block">{cat.name}</span>
                          <span className="text-xs text-muted-foreground uppercase">ID: #{cat.id}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{typeBadge(cat.categoryType)}</TableCell>
                    <TableCell className="text-center">
                       <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm">
                         {cat.productCount ?? 0}
                       </span>
                    </TableCell>
                    <TableCell className="text-right">
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
        </Card>
      )}

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
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ backgroundColor: hex }}
                  >
                    <IconComp className="h-5 w-5" />
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
                    <SelectItem key={t} value={t}>{t}</SelectItem>
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
