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
  Plus, Search, MoreHorizontal, Eye, CalendarIcon, CheckCircle, XCircle,
  RefreshCw, ArrowLeftRight,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import {
  contraVoucherService, type ContraVoucher, type ContraVoucherCreateRequest,
} from "../utils/supabase/contra-voucher-service";
import { ledgersService, type AccountHead } from "../utils/supabase/ledgers-service";

const defaultForm: ContraVoucherCreateRequest = {
  date: format(new Date(), "yyyy-MM-dd"),
  fromAccountCode: "",
  fromAccountName: "",
  toAccountCode: "",
  toAccountName: "",
  amount: 0,
  narration: "",
  reference: "",
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  POSTED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export function ContraVoucherPage() {
  const [vouchers, setVouchers] = useState<ContraVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewing, setViewing] = useState<ContraVoucher | null>(null);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [form, setForm] = useState<ContraVoucherCreateRequest>(defaultForm);
  const [formDate, setFormDate] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await contraVoucherService.getAll();
      setVouchers(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load contra vouchers");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    ledgersService.getAccountHeads({ isActive: true }).then(setAccountHeads).catch(() => {});
  }, []);

  const filtered = vouchers.filter((v) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return v.voucherNo.toLowerCase().includes(q) || (v.narration ?? "").toLowerCase().includes(q);
  });

  const totalAmount = vouchers.reduce((s, v) => s + v.amount, 0);
  const postedCount = vouchers.filter((v) => v.status === "POSTED").length;
  const draftCount = vouchers.filter((v) => v.status === "DRAFT").length;

  const resetForm = () => { setForm(defaultForm); setFormDate(new Date()); };

  const openCreate = () => { resetForm(); setIsFormOpen(true); };
  const openView = (v: ContraVoucher) => { setViewing(v); setIsViewOpen(true); };

  const handleSubmit = async () => {
    if (!form.fromAccountCode || !form.toAccountCode) { toast.error("Both accounts are required"); return; }
    if (form.fromAccountCode === form.toAccountCode) { toast.error("From and To accounts must be different"); return; }
    if (!form.amount || form.amount <= 0) { toast.error("Amount must be greater than zero"); return; }
    try {
      await contraVoucherService.create({ ...form, date: format(formDate, "yyyy-MM-dd") });
      toast.success("Contra voucher created");
      resetForm();
      setIsFormOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to create contra voucher");
    }
  };

  const handlePost = async (id: string) => {
    try {
      await contraVoucherService.post(id);
      toast.success("Contra voucher posted");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to post contra voucher");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await contraVoucherService.cancel(id);
      toast.success("Contra voucher cancelled");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel contra voucher");
    }
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Contra Vouchers</h1>
          <p className="text-gray-600 mt-1">Cash ↔ Bank transfers, deposits and withdrawals</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Contra Voucher
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-primary/10 shadow-md">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Total Vouchers</CardTitle>
            <div className="bg-indigo-50 p-2 rounded-lg"><ArrowLeftRight className="h-4 w-4 text-indigo-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">{vouchers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{draftCount} draft / {postedCount} posted</p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md">
          <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-primary">Total Transferred</CardTitle></CardHeader>
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
            <Input placeholder="Search vouchers..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-0 shadow-sm">
        <CardHeader><CardTitle className="text-lg">Contra Vouchers</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg bg-white overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-mono text-sm">{v.voucherNo}</TableCell>
                    <TableCell>{v.date}</TableCell>
                    <TableCell>{v.fromAccountName || v.fromAccountCode}</TableCell>
                    <TableCell>{v.toAccountName || v.toAccountCode}</TableCell>
                    <TableCell className="text-right font-medium">{v.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColors[v.status] ?? "bg-gray-100 text-gray-800"}>{v.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openView(v)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                          {v.status === "DRAFT" && (
                            <>
                              <DropdownMenuItem onClick={() => handlePost(v.id)} className="text-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" />Post
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancel(v.id)} className="text-orange-600">
                                <XCircle className="mr-2 h-4 w-4" />Cancel
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
          </div>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-10">
              <ArrowLeftRight className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No contra vouchers found</h3>
              <Button onClick={openCreate} className="bg-primary hover:bg-primary/90 mt-2">
                <Plus className="h-4 w-4 mr-2" />New Contra Voucher
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Contra Voucher</DialogTitle>
            <DialogDescription>Record a cash/bank transfer between two accounts.</DialogDescription>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>From Account (credited)</Label>
                <Input
                  list="contra-accounts"
                  value={form.fromAccountCode}
                  onChange={(e) => {
                    const match = accountHeads.find((a) => a.code === e.target.value);
                    setForm({ ...form, fromAccountCode: e.target.value, fromAccountName: match?.name ?? form.fromAccountName });
                  }}
                  placeholder="e.g. 1000"
                />
              </div>
              <div className="space-y-2">
                <Label>To Account (debited)</Label>
                <Input
                  list="contra-accounts"
                  value={form.toAccountCode}
                  onChange={(e) => {
                    const match = accountHeads.find((a) => a.code === e.target.value);
                    setForm({ ...form, toAccountCode: e.target.value, toAccountName: match?.name ?? form.toAccountName });
                  }}
                  placeholder="e.g. 1001"
                />
              </div>
            </div>
            <datalist id="contra-accounts">
              {accountHeads.map((a) => <option key={a.id} value={a.code}>{a.name}</option>)}
            </datalist>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                type="number" step="0.01" min="0"
                value={form.amount || ""}
                onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-2">
              <Label>Reference</Label>
              <Input value={form.reference ?? ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="e.g. bank slip no." />
            </div>
            <div className="space-y-2">
              <Label>Narration</Label>
              <Textarea value={form.narration ?? ""} onChange={(e) => setForm({ ...form, narration: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-3">
            <Button variant="outline" onClick={() => { setIsFormOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleSubmit} className="bg-primary hover:bg-primary/90">Create Voucher</Button>
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
              <div><span className="text-gray-500">From:</span> <strong>{viewing.fromAccountName || viewing.fromAccountCode}</strong></div>
              <div><span className="text-gray-500">To:</span> <strong>{viewing.toAccountName || viewing.toAccountCode}</strong></div>
              <div><span className="text-gray-500">Amount:</span> <strong><CurrencyGlyph /> {viewing.amount.toFixed(2)}</strong></div>
              <div><span className="text-gray-500">Reference:</span> <strong>{viewing.reference || "—"}</strong></div>
              <div><span className="text-gray-500">Narration:</span> <strong>{viewing.narration || "—"}</strong></div>
            </div>
            {viewing.status === "DRAFT" && (
              <div className="flex gap-3 pt-2">
                <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { handlePost(viewing.id); setIsViewOpen(false); }}>
                  <CheckCircle className="h-4 w-4 mr-2" />Post Voucher
                </Button>
                <Button variant="outline" className="text-orange-600 border-orange-300" onClick={() => { handleCancel(viewing.id); setIsViewOpen(false); }}>
                  <XCircle className="h-4 w-4 mr-2" />Cancel Voucher
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
