import React, { useEffect, useMemo, useState } from "react";
import {
  Award, CheckCircle2, Edit, ExternalLink, Grid3X3, List, MoreHorizontal, Package, Plus, Power, RefreshCw, Search, Trash2, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { CurrencyGlyph } from "../../utils/currency";
import { productsService, Product, ProductBrand } from "../../utils/supabase/products-service";

// Same palette as product categories so the catalogue looks consistent.
const COLOR_OPTIONS = [
  { label: "Blue",   value: "bg-blue-500",   hex: "#3b82f6" },
  { label: "Purple", value: "bg-purple-500", hex: "#a855f7" },
  { label: "Green",  value: "bg-green-500",  hex: "#22c55e" },
  { label: "Yellow", value: "bg-yellow-500", hex: "#eab308" },
  { label: "Pink",   value: "bg-pink-500",   hex: "#ec4899" },
  { label: "Red",    value: "bg-red-500",    hex: "#ef4444" },
  { label: "Orange", value: "bg-orange-500", hex: "#f97316" },
  { label: "Teal",   value: "bg-teal-500",   hex: "#14b8a6" },
  { label: "Indigo", value: "bg-indigo-500", hex: "#6366f1" },
  { label: "Gray",   value: "bg-gray-500",   hex: "#6b7280" },
];

const hexOf = (c?: string) => COLOR_OPTIONS.find(o => o.value === c)?.hex ?? "#3b82f6";
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join("") || "?";
const withProtocol = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

type Form = { name: string; description: string; website: string; color: string; isActive: boolean };
const emptyForm = (): Form => ({ name: "", description: "", website: "", color: "bg-blue-500", isActive: true });

function BrandMark({ brand, size = 36 }: { brand: Pick<ProductBrand, "name" | "color">; size?: number }) {
  const hex = hexOf(brand.color);
  return (
    <div
      className="rounded-lg shrink-0"
      style={{ width: size, height: size, backgroundColor: `${hex}1A`, color: hex, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: size * 0.36 }}
    >
      {initials(brand.name)}
    </div>
  );
}

export function BrandsTab({ createNonce }: { createNonce: number }) {
  const [brands, setBrands] = useState<ProductBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductBrand | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [deleting, setDeleting] = useState<ProductBrand | null>(null);
  const [viewing, setViewing] = useState<ProductBrand | null>(null);
  const [brandProducts, setBrandProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  async function loadBrands() {
    setLoading(true);
    try {
      setBrands(await productsService.getBrands());
    } catch (e: any) {
      toast.error(e.message || "Failed to load brands");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadBrands(); }, []);
  useEffect(() => { if (createNonce) openCreate(); }, [createNonce]);

  const stats = useMemo(() => {
    const active = brands.filter(b => b.isActive).length;
    const branded = brands.reduce((s, b) => s + (b.productCount ?? 0), 0);
    const top = brands.reduce<ProductBrand | null>((best, b) => (!best || b.productCount > best.productCount ? b : best), null);
    return { total: brands.length, active, branded, top };
  }, [brands]);

  const filtered = useMemo(() => brands.filter(b => {
    if (statusFilter === "active" && !b.isActive) return false;
    if (statusFilter === "inactive" && b.isActive) return false;
    if (statusFilter === "unused" && b.productCount > 0) return false;
    const q = search.trim().toLowerCase();
    return !q || b.name.toLowerCase().includes(q) || (b.description ?? "").toLowerCase().includes(q);
  }), [brands, search, statusFilter]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  }

  function openEdit(b: ProductBrand) {
    setEditing(b);
    setForm({ name: b.name, description: b.description ?? "", website: b.website ?? "", color: b.color || "bg-blue-500", isActive: b.isActive });
    setShowForm(true);
  }

  async function handleSave() {
    const name = form.name.trim();
    if (!name) { toast.error("Brand name is required"); return; }
    if (brands.some(b => b.id !== editing?.id && b.name.trim().toLowerCase() === name.toLowerCase())) {
      toast.error("A brand with this name already exists");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, name, website: form.website.trim(), description: form.description.trim() };
      if (editing) {
        await productsService.updateBrand(editing.id, payload);
        toast.success(editing.name !== name && editing.productCount > 0
          ? `Brand renamed — ${editing.productCount} product(s) updated`
          : "Brand updated");
      } else {
        await productsService.createBrand(payload);
        toast.success("Brand created");
      }
      setShowForm(false);
      loadBrands();
    } catch (e: any) {
      toast.error(e.message || "Failed to save brand");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(b: ProductBrand) {
    try {
      await productsService.updateBrand(b.id, { ...b, isActive: !b.isActive });
      toast.success(`${b.name} ${b.isActive ? "deactivated" : "activated"}`);
      loadBrands();
    } catch (e: any) {
      toast.error(e.message || "Failed to update brand");
    }
  }

  function askDelete(b: ProductBrand) {
    if (b.productCount > 0) {
      toast.error(`${b.name} is used by ${b.productCount} product(s). Reassign them or deactivate the brand instead.`);
      return;
    }
    setDeleting(b);
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      await productsService.deleteBrand(deleting.id);
      toast.success("Brand deleted");
      setDeleting(null);
      loadBrands();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete brand");
    }
  }

  async function openProducts(b: ProductBrand) {
    setViewing(b);
    setLoadingProducts(true);
    setBrandProducts([]);
    try {
      const res = await productsService.getProducts({ size: 500 });
      setBrandProducts((res.products ?? []).filter(p => (p.brand ?? "").trim().toLowerCase() === b.name.toLowerCase()));
    } catch (e: any) {
      toast.error(e.message || "Failed to load products");
    } finally {
      setLoadingProducts(false);
    }
  }

  const statusBadge = (b: ProductBrand) => (b.isActive
    ? <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
    : <Badge variant="secondary" className="text-xs">Inactive</Badge>);

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Brands</CardTitle>
            <div className="bg-indigo-50 p-2 rounded-lg"><Award className="h-4 w-4 text-indigo-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-600">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">In your catalogue</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Brands</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg"><CheckCircle2 className="h-4 w-4 text-green-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">Available on product forms</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Branded Products</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg"><Package className="h-4 w-4 text-blue-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.branded}</div>
            <p className="text-xs text-muted-foreground mt-1">Products linked to a brand</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Top Brand</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg"><TrendingUp className="h-4 w-4 text-orange-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate text-orange-700">{stats.top && stats.top.productCount > 0 ? stats.top.name : "—"}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.top?.productCount ?? 0} products</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative" style={{ flex: "1 1 auto", minWidth: 0 }}>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input placeholder="Search brands by name..." className="pl-11 h-10" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10" style={{ flex: "0 0 180px", width: 180 }}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="unused">Not used yet</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex border border-primary/10 rounded-md overflow-hidden shrink-0">
              <Button variant={viewMode === "grid" ? "default" : "ghost"} size="sm" className="h-10 px-3" style={{ borderRadius: 0 }} onClick={() => setViewMode("grid")}>
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button variant={viewMode === "list" ? "default" : "ghost"} size="sm" className="h-10 px-3" style={{ borderRadius: 0 }} onClick={() => setViewMode("list")}>
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {loading ? (
        <Card className="border-primary/10 shadow-md">
          <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading brands...
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-primary/10 shadow-md">
          <CardContent className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-6">
              <Award className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-xl font-bold mb-2">No brands found</h3>
            <p className="text-muted-foreground mb-8">
              {search || statusFilter !== "all"
                ? "We couldn't find any brands matching your current filters."
                : "Add the brands you stock so products can be tagged and reported by brand."}
            </p>
            {search || statusFilter !== "all" ? (
              <Button variant="outline" onClick={() => { setSearch(""); setStatusFilter("all"); }}>Clear Filters</Button>
            ) : (
              <Button onClick={openCreate} className="shadow-lg"><Plus className="mr-2 h-4 w-4" /> Add Your First Brand</Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(b => {
            const hex = hexOf(b.color);
            return (
              <Card key={b.id} className="group border-primary/10 shadow-md hover:shadow-lg transition-all" style={b.isActive ? undefined : { opacity: 0.7 }}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-primary truncate">{b.name}</CardTitle>
                  <BrandMark brand={b} size={34} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" style={{ color: hex }}>{b.productCount ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{b.description || "Products of this brand"}</p>
                  <div className="mt-4 pt-3 border-t flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusBadge(b)}
                      {b.website && (
                        <a href={withProtocol(b.website)} target="_blank" rel="noreferrer" title={b.website} className="text-muted-foreground" onClick={e => e.stopPropagation()}>
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-8 px-2 text-xs font-semibold" onClick={() => openProducts(b)}>View All</Button>
                      <BrandMenu brand={b} onEdit={openEdit} onToggle={toggleActive} onDelete={askDelete} onProducts={openProducts} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Product Brands</CardTitle>
                <CardDescription>Add and manage the brands you stock</CardDescription>
              </div>
              <Button size="sm" onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Add Brand</Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader style={{ background: "color-mix(in oklab, var(--muted) 60%, transparent)" }}>
                <TableRow>
                  <TableHead className="font-semibold pl-6">Brand</TableHead>
                  <TableHead className="font-semibold">Website</TableHead>
                  <TableHead className="text-center font-semibold">Products</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(b => (
                  <TableRow key={b.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-4">
                        <BrandMark brand={b} />
                        <div className="min-w-0">
                          <span className="font-semibold text-sm block">{b.name}</span>
                          <span className="text-xs text-muted-foreground truncate block" style={{ maxWidth: 340 }}>{b.description || `ID: #${b.id}`}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {b.website
                        ? <a href={withProtocol(b.website)} target="_blank" rel="noreferrer" className="text-sm text-primary">{b.website}</a>
                        : <span className="text-muted-foreground text-sm">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-primary/10 text-primary font-bold text-sm" style={{ minWidth: 56 }}>
                        {b.productCount ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>{statusBadge(b)}</TableCell>
                    <TableCell>
                      <BrandMenu brand={b} onEdit={openEdit} onToggle={toggleActive} onDelete={askDelete} onProducts={openProducts} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Products of a brand */}
      <Dialog open={!!viewing} onOpenChange={o => { if (!o) setViewing(null); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{viewing?.name} Products</DialogTitle>
            <DialogDescription>{viewing?.productCount ?? brandProducts.length} product(s) of this brand</DialogDescription>
          </DialogHeader>
          {loadingProducts ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Loading products...
            </div>
          ) : brandProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-center">
              <Package className="h-10 w-10 mb-3 opacity-30" />
              <p className="text-sm">No products use this brand yet. Pick it in a product’s Brand field.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" style={{ maxHeight: "60vh", overflowY: "auto", paddingRight: 4 }}>
              {brandProducts.map(p => (
                <div key={p.id} className="border rounded-lg p-3 flex items-center gap-3">
                  <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden flex items-center justify-center shrink-0">
                    {p.imageUrls?.[0] ? <img src={p.imageUrls[0]} alt={p.name} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{p.categoryName}</p>
                    <p className="text-xs text-muted-foreground"><CurrencyGlyph /> {p.sellingPrice.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / edit */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Brand" : "Add Brand"}</DialogTitle>
            <DialogDescription>
              {editing && editing.productCount > 0
                ? `Renaming also updates the ${editing.productCount} product(s) using this brand.`
                : "Brands appear in the Brand field when adding or editing products."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <BrandMark brand={{ name: form.name || "Brand", color: form.color }} />
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{form.name || "Brand Name"}</p>
                <p className="text-xs text-muted-foreground truncate">{form.website || "brand website"}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input placeholder="e.g. Optimum Nutrition" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Website</Label>
              <Input placeholder="e.g. optimumnutrition.com" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={2} placeholder="Optional notes about this brand" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    title={opt.label}
                    onClick={() => setForm(f => ({ ...f, color: opt.value }))}
                    className="rounded-full transition-all"
                    style={{ width: 28, height: 28, backgroundColor: opt.hex, border: `2px solid ${form.color === opt.value ? "var(--foreground)" : "transparent"}`, transform: form.color === opt.value ? "scale(1.1)" : undefined }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-sm text-muted-foreground">Inactive brands are hidden on product forms</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={!!deleting} onOpenChange={o => { if (!o) setDeleting(null); }}>
        <DialogContent style={{ maxWidth: 384 }}>
          <DialogHeader>
            <DialogTitle>Delete Brand</DialogTitle>
            <DialogDescription>Delete “{deleting?.name}”? No products use it. This can’t be undone.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrandMenu({ brand, onEdit, onToggle, onDelete, onProducts }: {
  brand: ProductBrand;
  onEdit: (b: ProductBrand) => void;
  onToggle: (b: ProductBrand) => void;
  onDelete: (b: ProductBrand) => void;
  onProducts: (b: ProductBrand) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full"><MoreHorizontal className="h-4 w-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onEdit(brand)}><Edit className="mr-2 h-4 w-4" /> Edit Brand</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onProducts(brand)}><Package className="mr-2 h-4 w-4" /> View Products</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onToggle(brand)}><Power className="mr-2 h-4 w-4" /> {brand.isActive ? "Deactivate" : "Activate"}</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive" onClick={() => onDelete(brand)}>
          <Trash2 className="mr-2 h-4 w-4" /> Delete Brand
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
