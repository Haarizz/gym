import React, { useState, useEffect, useCallback } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import {
  Plus, Search, MoreHorizontal, Eye, CalendarIcon, CheckCircle, XCircle, RefreshCw, FileMinus,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import {
  debitNoteService, type DebitNote, type DebitNoteCreateRequest,
} from "../utils/supabase/debit-note-service";

const defaultForm: DebitNoteCreateRequest = {
  date: format(new Date(), "yyyy-MM-dd"),
  supplierName: "",
  reason: "",
  subtotal: 0,
  taxAmount: 0,
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  POSTED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export function DebitNotePage() {
  const [notes, setNotes] = useState<DebitNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewing, setViewing] = useState<DebitNote | null>(null);
  const [form, setForm] = useState<DebitNoteCreateRequest>(defaultForm);
  const [formDate, setFormDate] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setNotes(await debitNoteService.getAll());
    } catch (err: any) {
      toast.error(err.message || "Failed to load debit notes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = notes.filter((n) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return n.voucherNo.toLowerCase().includes(q) || (n.supplierName ?? "").toLowerCase().includes(q);
  });

  const totalAmount = notes.reduce((s, n) => s + n.totalAmount, 0);
  const postedCount = notes.filter((n) => n.status === "POSTED").length;

  const resetForm = () => { setForm(defaultForm); setFormDate(new Date()); };
  const openCreate = () => { resetForm(); setIsFormOpen(true); };
  const openView = (n: DebitNote) => { setViewing(n); setIsViewOpen(true); };

  const handleSubmit = async () => {
    if (!form.supplierName) { toast.error("Supplier name is required"); return; }
    if (!form.subtotal || form.subtotal <= 0) { toast.error("Subtotal must be greater than zero"); return; }
    try {
      await debitNoteService.create({ ...form, date: format(formDate, "yyyy-MM-dd") });
      toast.success("Debit note created");
      resetForm();
      setIsFormOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create debit note");
    }
  };

  const handlePost = async (id: string) => {
    try { await debitNoteService.post(id); toast.success("Debit note posted"); load(); }
    catch (err: any) { toast.error(err.message || "Failed to post debit note"); }
  };

  const handleCancel = async (id: string) => {
    try { await debitNoteService.cancel(id); toast.success("Debit note cancelled"); load(); }
    catch (err: any) { toast.error(err.message || "Failed to cancel debit note"); }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Debit Notes</h1>
          <p className="text-gray-600 mt-1">Supplier-side returns and adjustments</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />Refresh
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />New Debit Note
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/10 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Total Notes</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg"><FileMinus className="h-4 w-4 text-orange-600" /></div>
          </CardHeader>
          <CardContent><div className="text-2xl font-bold text-orange-700">{notes.length}</div></CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-primary">Total Amount</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-blue-700"><CurrencyGlyph /> {totalAmount.toFixed(2)}</div></CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-primary">Posted</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-700">{postedCount}</div></CardContent>
        </Card>
      </div>

      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input placeholder="Search debit notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="text-lg">Debit Notes</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg bg-white overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((n) => (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono text-sm">{n.voucherNo}</TableCell>
                    <TableCell>{n.date}</TableCell>
                    <TableCell>{n.supplierName || "—"}</TableCell>
                    <TableCell className="max-w-[220px] truncate" title={n.reason}>{n.reason || "—"}</TableCell>
                    <TableCell className="text-right font-medium">{n.totalAmount.toFixed(2)}</TableCell>
                    <TableCell><Badge variant="secondary" className={statusColors[n.status] ?? "bg-gray-100 text-gray-800"}>{n.status}</Badge></TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openView(n)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                          {n.status === "DRAFT" && (
                            <>
                              <DropdownMenuItem onClick={() => handlePost(n.id)} className="text-green-700"><CheckCircle className="mr-2 h-4 w-4" />Post</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancel(n.id)} className="text-orange-600"><XCircle className="mr-2 h-4 w-4" />Cancel</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-5">
                <FileMinus className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No debit notes found</h3>
              <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 mt-4"><Plus className="h-4 w-4 mr-2" />New Debit Note</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Debit Note</DialogTitle>
            <DialogDescription>Record a supplier return or adjustment against a bill.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />{format(formDate, "PPP")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar mode="single" selected={formDate} onSelect={(d) => setFormDate(d || new Date())} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Input value={form.supplierName ?? ""} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} placeholder="Supplier name" />
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={form.reason ?? ""} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2} placeholder="e.g. damaged goods returned" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subtotal</Label>
                <Input type="number" step="0.01" min="0" value={form.subtotal || ""} onChange={(e) => setForm({ ...form, subtotal: parseFloat(e.target.value) || 0 })} />
              </div>
              <div className="space-y-2">
                <Label>Tax Amount</Label>
                <Input type="number" step="0.01" min="0" value={form.taxAmount || ""} onChange={(e) => setForm({ ...form, taxAmount: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div className="text-sm text-gray-600">
              Total: <strong><CurrencyGlyph /> {((form.subtotal || 0) + (form.taxAmount || 0)).toFixed(2)}</strong>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <Button variant="outline" onClick={() => { setIsFormOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">Create Debit Note</Button>
          </div>
        </DialogContent>
      </Dialog>

      {viewing && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {viewing.voucherNo}
                <Badge className={statusColors[viewing.status] ?? "bg-gray-100 text-gray-800"}>{viewing.status}</Badge>
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <div><span className="text-gray-500">Date:</span> <strong>{viewing.date}</strong></div>
              <div><span className="text-gray-500">Supplier:</span> <strong>{viewing.supplierName || "—"}</strong></div>
              <div><span className="text-gray-500">Reason:</span> <strong>{viewing.reason || "—"}</strong></div>
              <div><span className="text-gray-500">Subtotal:</span> <strong>{viewing.subtotal.toFixed(2)}</strong></div>
              <div><span className="text-gray-500">Tax:</span> <strong>{viewing.taxAmount.toFixed(2)}</strong></div>
              <div><span className="text-gray-500">Total:</span> <strong><CurrencyGlyph /> {viewing.totalAmount.toFixed(2)}</strong></div>
            </div>
            {viewing.status === "DRAFT" && (
              <div className="flex gap-3 pt-2">
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { handlePost(viewing.id); setIsViewOpen(false); }}>
                  <CheckCircle className="h-4 w-4 mr-2" />Post
                </Button>
                <Button variant="outline" className="text-orange-600 border-orange-300" onClick={() => { handleCancel(viewing.id); setIsViewOpen(false); }}>
                  <XCircle className="h-4 w-4 mr-2" />Cancel
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
