import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { PackagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import {
  DEFAULT_PRODUCT_SETTINGS, productsService, type Product, type ProductCategory, type ProductSettings, type Warehouse,
} from "../../utils/supabase/products-service";
import { usePos } from "../PosContext";
import s from "../pos.module.css";

const primaryBtn = "bg-[#2B7A78] hover:bg-[#236862] text-white";

interface Form {
  name: string;
  sku: string;
  barcode: string;
  categoryId: string;
  sellingPrice: string;
  costPrice: string;
  taxRate: string;
  openingStock: string;
  reorderLevel: string;
  warehouseId: string;
  unit: string;
}

/** Fallback product rate stored alongside "use branch tax" (only used if the branch has no rate). */
const st0 = (st: ProductSettings) => (st.defaultTaxRate === "exempt" ? 0 : Number(st.defaultTaxRate) || 0);

const EMPTY: Form = {
  name: "", sku: "", barcode: "", categoryId: "", sellingPrice: "", costPrice: "", taxRate: "",
  openingStock: "", reorderLevel: "5", warehouseId: "", unit: "PCS",
};

/**
 * BillBull "Quick Add Product" at the till: create a product without leaving the sale; it is added
 * to the cart straight away. Uses the Products module, so SKU rules, stock and the ledger behave as
 * for any product.
 */
export function QuickAddProductDialog({ open, onOpenChange, initialName = "", onCreated }: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** What the cashier had typed in the search box — a barcode becomes the barcode, text the name. */
  initialName?: string;
  onCreated: (p: Product) => void;
}) {
  const { currencyCode } = usePos();
  const [form, setForm] = useState<Form>(EMPTY);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [settings, setSettings] = useState<ProductSettings>(DEFAULT_PRODUCT_SETTINGS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const typed = initialName.trim();
    const looksLikeBarcode = /^\d{6,}$/.test(typed);
    setForm({ ...EMPTY, name: looksLikeBarcode ? "" : typed, barcode: looksLikeBarcode ? typed : "" });
    Promise.all([
      productsService.getCategories().catch(() => [] as ProductCategory[]),
      productsService.getAllWarehouses().catch(() => [] as Warehouse[]),
      productsService.getSettings().catch(() => DEFAULT_PRODUCT_SETTINGS),
    ]).then(([cats, whs, st]) => {
      setCategories(cats);
      setWarehouses(whs);
      setSettings(st);
      setForm((f) => ({
        ...f,
        categoryId: f.categoryId || (cats[0] ? String(cats[0].id) : ""),
        warehouseId: f.warehouseId || (whs[0] ? String(whs[0].id) : ""),
      }));
    });
  }, [open, initialName]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const autoSku = settings.autoGenerateSku !== "false";
  const price = parseFloat(form.sellingPrice);
  const stock = parseInt(form.openingStock, 10) || 0;
  const valid = form.name.trim().length > 0 && Boolean(form.categoryId) && price > 0
    && (autoSku || form.sku.trim().length > 0) && (stock === 0 || Boolean(form.warehouseId));

  const save = async () => {
    setBusy(true);
    try {
      const created = await productsService.createProduct({
        name: form.name.trim(),
        categoryId: Number(form.categoryId),
        isActive: true,
        hasVariants: false,
        hasRecipe: false,
        isManufactured: false,
        enabledForPos: true,
        imageUrls: [],
        barcode: form.barcode.trim() || undefined,
        defaultUnit: form.unit.trim() || undefined,
        sellingPrice: Math.round(price * 100) / 100,
        costPrice: Math.round((parseFloat(form.costPrice) || 0) * 100) / 100,
        // Blank VAT = follow the branch tax (Settings › Tax Configuration); a value is the product's own rate.
        useDefaultTax: form.taxRate.trim() === "",
        taxRate: form.taxRate.trim() === "" ? (st0(settings)) : Math.max(0, parseFloat(form.taxRate) || 0),
        openingStock: Math.max(0, stock),
        reorderLevel: Math.max(0, parseInt(form.reorderLevel, 10) || 0),
        warehouseId: Number(form.warehouseId) || 0,
        sku: autoSku ? undefined : form.sku.trim(),
      });
      toast.success(`${created.name} created and added to the sale`);
      onCreated(created);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent style={{ maxWidth: 620, maxHeight: "92vh", overflowY: "auto" }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><PackagePlus className="h-5 w-5 text-[#2B7A78]" />Quick add product</DialogTitle>
          <DialogDescription>Creates the product in Products and adds it to this sale.</DialogDescription>
        </DialogHeader>
        <div className={s.stack}>
          <div className={s.field}>
            <Label>Product name *</Label>
            <Input autoFocus value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Enter item name" />
          </div>
          <div className={s.grid2} style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className={s.field}>
              <Label>Item code / SKU{autoSku ? "" : " *"}</Label>
              <Input value={form.sku} disabled={autoSku} onChange={(e) => set("sku", e.target.value)} placeholder={autoSku ? "Generated automatically" : "e.g. PRD-001"} />
            </div>
            <div className={s.field}>
              <Label>Barcode (EAN / UPC)</Label>
              <Input value={form.barcode} onChange={(e) => set("barcode", e.target.value)} placeholder="Scan or type barcode" />
            </div>
            <div className={s.field}>
              <Label>Category *</Label>
              <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
                <SelectTrigger><SelectValue placeholder={categories.length ? "Select category" : "No categories — add one in Products"} /></SelectTrigger>
                <SelectContent>{categories.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className={s.field}>
              <Label>Unit</Label>
              <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="PCS" />
            </div>
            <div className={s.field}>
              <Label>Selling price ({currencyCode}) *</Label>
              <Input type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} placeholder="0.00" />
            </div>
            <div className={s.field}>
              <Label>Purchase cost ({currencyCode})</Label>
              <Input type="number" min="0" step="0.01" value={form.costPrice} onChange={(e) => set("costPrice", e.target.value)} placeholder="0.00" />
            </div>
            <div className={s.field}>
              <Label>VAT (%)</Label>
              <Input type="number" min="0" max="100" step="0.01" value={form.taxRate} placeholder="Branch tax" onChange={(e) => set("taxRate", e.target.value)} />
            </div>
            <div className={s.field}>
              <Label>Opening stock</Label>
              <Input type="number" min="0" step="1" value={form.openingStock} onChange={(e) => set("openingStock", e.target.value)} placeholder="0" />
            </div>
            {stock > 0 && (
              <div className={s.field}>
                <Label>Warehouse *</Label>
                <Select value={form.warehouseId} onValueChange={(v) => set("warehouseId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select warehouse" /></SelectTrigger>
                  <SelectContent>{warehouses.map((w) => <SelectItem key={w.id} value={String(w.id)}>{w.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className={s.field}>
              <Label>Low stock alert</Label>
              <Input type="number" min="0" step="1" value={form.reorderLevel} onChange={(e) => set("reorderLevel", e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className={primaryBtn} disabled={!valid || busy} onClick={save}>{busy ? "Saving…" : "Create & add to sale"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
