import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Plus, Search, MoreHorizontal, Edit, Trash2, RefreshCw, Percent } from "lucide-react";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import { taxCodeService, type TaxCode, type TaxCodeRequest } from "../utils/supabase/tax-code-service";

const defaultForm: TaxCodeRequest = {
  code: "",
  name: "",
  rate: 0,
  salesTaxAccountCode: "",
  purchaseTaxAccountCode: "",
  active: true,
  description: "",
  taxType: "STANDARD",
  secondaryTaxCode: "",
};

const taxTypeColors: Record<string, string> = {
  STANDARD: "bg-blue-100 text-blue-800",
  ZERO_RATED: "bg-gray-100 text-gray-800",
  EXEMPT: "bg-gray-100 text-gray-800",
  CGST: "bg-purple-100 text-purple-800",
  SGST: "bg-indigo-100 text-indigo-800",
  IGST: "bg-teal-100 text-teal-800",
};

export function TaxCodesPage() {
  const [codes, setCodes] = useState<TaxCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<TaxCodeRequest>(defaultForm);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setCodes(await taxCodeService.getAll());
    } catch (err: any) {
      toast.error(err.message || "Failed to load tax codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = codes.filter((c) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q);
  });

  const resetForm = () => { setForm(defaultForm); setEditingId(null); };
  const openCreate = () => { resetForm(); setIsFormOpen(true); };
  const openEdit = (c: TaxCode) => {
    setEditingId(c.id);
    setForm({
      code: c.code, name: c.name, rate: c.rate,
      salesTaxAccountCode: c.salesTaxAccountCode ?? "", purchaseTaxAccountCode: c.purchaseTaxAccountCode ?? "",
      active: c.active, description: c.description ?? "", taxType: c.taxType, secondaryTaxCode: c.secondaryTaxCode ?? "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.code || !form.name) { toast.error("Code and name are required"); return; }
    try {
      if (editingId) {
        await taxCodeService.update(editingId, form);
        toast.success("Tax code updated");
      } else {
        await taxCodeService.create(form);
        toast.success("Tax code created");
      }
      resetForm();
      setIsFormOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save tax code");
    }
  };

  const handleDelete = async (id: string) => {
    try { await taxCodeService.delete(id); toast.success("Tax code deleted"); load(); }
    catch (err: any) { toast.error(err.message || "Failed to delete tax code"); }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tax Codes</h1>
          <p className="text-gray-600 mt-1">
            Configure VAT/GST rates, zero-rated/exempt classifications, and CGST/SGST/IGST pairs
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />Refresh
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />New Tax Code
          </Button>
        </div>
      </div>

      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input placeholder="Search tax codes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="text-lg">Tax Codes</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg bg-white overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Rate (%)</TableHead>
                  <TableHead>Paired With</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm font-medium">{c.code}</TableCell>
                    <TableCell>{c.name}</TableCell>
                    <TableCell><Badge variant="secondary" className={taxTypeColors[c.taxType] ?? "bg-gray-100 text-gray-800"}>{c.taxType}</Badge></TableCell>
                    <TableCell className="text-right">{c.rate.toFixed(2)}</TableCell>
                    <TableCell className="font-mono text-sm">{c.secondaryTaxCode || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={c.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                        {c.active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(c)}><Edit className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(c.id)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-10">
              <Percent className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tax codes found</h3>
              <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 mt-2"><Plus className="h-4 w-4 mr-2" />New Tax Code</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Tax Code" : "New Tax Code"}</DialogTitle>
            <DialogDescription>
              Pairing a tax type (e.g. CGST) with a secondary code (e.g. SGST) splits the posted
              tax amount evenly across both accounts.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. VAT5" disabled={!!editingId} />
              </div>
              <div className="space-y-2">
                <Label>Rate (%)</Label>
                <Input type="number" step="0.01" min="0" value={form.rate || ""} onChange={(e) => setForm({ ...form, rate: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Standard VAT 5%" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tax Type</Label>
                <Select value={form.taxType ?? "STANDARD"} onValueChange={(v) => setForm({ ...form, taxType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="ZERO_RATED">Zero Rated</SelectItem>
                    <SelectItem value="EXEMPT">Exempt</SelectItem>
                    <SelectItem value="CGST">CGST</SelectItem>
                    <SelectItem value="SGST">SGST</SelectItem>
                    <SelectItem value="IGST">IGST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Secondary Tax Code (pair)</Label>
                <Input value={form.secondaryTaxCode ?? ""} onChange={(e) => setForm({ ...form, secondaryTaxCode: e.target.value })} placeholder="e.g. SGST9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Sales/Output Account Code</Label>
                <Input value={form.salesTaxAccountCode ?? ""} onChange={(e) => setForm({ ...form, salesTaxAccountCode: e.target.value })} placeholder="e.g. 2100" />
              </div>
              <div className="space-y-2">
                <Label>Purchase/Input Account Code</Label>
                <Input value={form.purchaseTaxAccountCode ?? ""} onChange={(e) => setForm({ ...form, purchaseTaxAccountCode: e.target.value })} placeholder="e.g. 2200" />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <Label className="mb-0">Active</Label>
              <Switch checked={form.active ?? true} onCheckedChange={(v) => setForm({ ...form, active: v })} />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <Button variant="outline" onClick={() => { setIsFormOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">{editingId ? "Save Changes" : "Create Tax Code"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
