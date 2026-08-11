import React, { useState, useEffect, useCallback } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "../components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Separator } from "../components/ui/separator";
import {
  Plus, Search, Download, MoreHorizontal, Edit, Trash2, Eye,
  CalendarIcon, FileText, CheckCircle, XCircle, Clock, RefreshCw,
  BookOpen, DollarSign, ArrowUpDown, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "../components/ui/utils";
import { toast } from "sonner";
import {
  journalVoucherService,
  type JournalVoucher,
  type JournalVoucherLine,
  type JournalVoucherCreateRequest,
} from "../utils/supabase/journal-voucher-service";
import { ledgersService, type AccountHead } from "../utils/supabase/ledgers-service";

const emptyLine = (): JournalVoucherLine => ({
  accountCode: "",
  accountName: "",
  debit: 0,
  credit: 0,
  description: "",
  costCenter: "",
});

const defaultForm: JournalVoucherCreateRequest = {
  date: format(new Date(), "yyyy-MM-dd"),
  narration: "",
  status: "DRAFT",
  reference: "",
  lines: [emptyLine(), emptyLine()],
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-800",
  POSTED: "bg-green-100 text-green-800",
  CANCELLED: "bg-red-100 text-red-800",
};

export function JournalVoucherPage() {
  const { currencyCode } = useCurrency();
  const [vouchers, setVouchers] = useState<JournalVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingVoucher, setViewingVoucher] = useState<JournalVoucher | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [accountHeads, setAccountHeads] = useState<AccountHead[]>([]);
  const [accountSearch, setAccountSearch] = useState<Record<number, string>>({});
  const [form, setForm] = useState<JournalVoucherCreateRequest>(defaultForm);
  const [formDate, setFormDate] = useState<Date>(new Date());

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await journalVoucherService.getJournalVouchers({
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
      });
      setVouchers(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load journal vouchers");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const totalDebit = vouchers.reduce((s, v) => s + v.totalDebit, 0);
  const totalCredit = vouchers.reduce((s, v) => s + v.totalCredit, 0);
  const postedCount = vouchers.filter((v) => v.status === "POSTED").length;
  const draftCount = vouchers.filter((v) => v.status === "DRAFT").length;

  const formTotalDebit = form.lines.reduce((s, l) => s + (l.debit || 0), 0);
  const formTotalCredit = form.lines.reduce((s, l) => s + (l.credit || 0), 0);
  const isBalanced = Math.abs(formTotalDebit - formTotalCredit) < 0.01;

  const resetForm = () => {
    setForm(defaultForm);
    setFormDate(new Date());
    setEditingId(null);
  };

  const loadAccountHeads = async () => {
    try {
      const data = await ledgersService.getAccountHeads({ isActive: true });
      setAccountHeads(data);
    } catch {
      // non-critical — user can still type account codes manually
    }
  };

  const openCreate = () => {
    resetForm();
    setAccountSearch({});
    loadAccountHeads();
    setIsFormOpen(true);
  };

  const openEdit = (v: JournalVoucher) => {
    loadAccountHeads();
    setAccountSearch({});
    setEditingId(v.id);
    // parse "yyyy-MM-dd" as local date to avoid UTC midnight timezone shift
    if (v.date) {
      const [y, m, d] = v.date.split("-").map(Number);
      setFormDate(new Date(y, m - 1, d));
    } else {
      setFormDate(new Date());
    }
    setForm({
      date: v.date,
      narration: v.narration,
      status: v.status,
      reference: v.reference ?? "",
      lines: v.lines.length > 0 ? v.lines.map((l) => ({ ...l })) : [emptyLine(), emptyLine()],
    });
    setIsFormOpen(true);
  };

  const openView = (v: JournalVoucher) => {
    setViewingVoucher(v);
    setIsViewOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.narration) { toast.error("Narration is required"); return; }
    if (form.lines.length < 2) { toast.error("At least 2 lines are required"); return; }
    if (!isBalanced) { toast.error("Total Debit must equal Total Credit"); return; }

    const payload: JournalVoucherCreateRequest = {
      ...form,
      date: format(formDate, "yyyy-MM-dd"),
    };
    try {
      if (editingId) {
        await journalVoucherService.updateJournalVoucher(editingId, payload);
        toast.success("Journal voucher updated");
      } else {
        await journalVoucherService.createJournalVoucher(payload);
        toast.success("Journal voucher created");
      }
      resetForm();
      setIsFormOpen(false);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to save journal voucher");
    }
  };

  const handlePost = async (id: string) => {
    try {
      await journalVoucherService.postJournalVoucher(id);
      toast.success("Journal voucher posted");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to post journal voucher");
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await journalVoucherService.cancelJournalVoucher(id);
      toast.success("Journal voucher cancelled");
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel journal voucher");
    }
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await journalVoucherService.deleteJournalVoucher(deleteConfirmId);
      toast.success("Journal voucher deleted");
      setDeleteConfirmId(null);
      load();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete journal voucher");
      setDeleteConfirmId(null);
    }
  };

  const updateLine = (index: number, field: keyof JournalVoucherLine, value: any) => {
    const updated = [...form.lines];
    updated[index] = { ...updated[index], [field]: value };
    setForm({ ...form, lines: updated });
  };

  const addLine = () => setForm({ ...form, lines: [...form.lines, emptyLine()] });

  const removeLine = (index: number) => {
    if (form.lines.length <= 2) { toast.error("Minimum 2 lines required"); return; }
    setForm({ ...form, lines: form.lines.filter((_, i) => i !== index) });
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Journal Vouchers</h1>
          <p className="text-gray-600 mt-1">
            Create and manage double-entry journal entries for financial adjustments
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="shadow-sm hover:shadow-md transition-all">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button size="sm" className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Journal Voucher
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Total Vouchers</CardTitle>
            <div className="bg-indigo-50 p-2 rounded-lg">
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-700">{vouchers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">{draftCount} draft / {postedCount} posted</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Total Debit</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <ArrowUpDown className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700"><CurrencyGlyph /> {totalDebit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All vouchers</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Total Credit</CardTitle>
            <div className="bg-emerald-50 p-2 rounded-lg">
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700"><CurrencyGlyph /> {totalCredit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">All vouchers</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Posted</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{postedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">{draftCount} pending</p>
          </CardContent>
        </Card>
      </div>
      {/* Filters */}
      <Card className="bg-white border-0 shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search vouchers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">
            Journal Vouchers
            {loading && <span className="ml-2 text-sm font-normal text-gray-500">(loading...)</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-white overflow-x-auto">
            <Table className="min-w-full">
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-semibold text-primary">Voucher No</TableHead>
                  <TableHead className="font-semibold text-primary">Date</TableHead>
                  <TableHead className="font-semibold text-primary">Narration</TableHead>
                  <TableHead className="font-semibold text-primary">Reference</TableHead>
                  <TableHead className="font-semibold text-primary text-right">Total Debit</TableHead>
                  <TableHead className="font-semibold text-primary text-right">Total Credit</TableHead>
                  <TableHead className="font-semibold text-primary">Status</TableHead>
                  <TableHead className="font-semibold text-primary">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vouchers.map((v, index) => (
                  <TableRow key={v.id} className={`${index % 2 === 0 ? "bg-white" : "bg-slate-50/40"} hover:bg-slate-50/80 transition-colors`}>
                    <TableCell className="font-mono text-sm font-medium">{v.voucherNo}</TableCell>
                    <TableCell>{v.date ? v.date.split("T")[0].split("-").reverse().join("/") : "-"}</TableCell>
                    <TableCell className="max-w-[250px] truncate" title={v.narration}>
                      {v.narration}
                    </TableCell>
                    <TableCell className="text-gray-600">{v.reference || "-"}</TableCell>
                    <TableCell className="text-right font-medium">{v.totalDebit.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{v.totalCredit.toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={statusColors[v.status] ?? "bg-gray-100 text-gray-800"}
                      >
                        {v.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openView(v)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {v.status === "DRAFT" && (
                            <>
                              <DropdownMenuItem onClick={() => openEdit(v)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePost(v.id)} className="text-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Post
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleCancel(v.id)} className="text-orange-600">
                                <XCircle className="mr-2 h-4 w-4" />
                                Cancel
                              </DropdownMenuItem>
                            </>
                          )}
                          {(v.status === "DRAFT" || v.status === "CANCELLED") && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleDelete(v.id)} className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
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

          {!loading && vouchers.length === 0 && (
            <div className="text-center py-14">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 mb-5">
                <BookOpen className="h-7 w-7 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No journal vouchers found</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || statusFilter !== "all"
                  ? "No vouchers match your filters."
                  : "Create your first journal voucher."}
              </p>
              {!searchTerm && statusFilter === "all" && (
                <Button onClick={openCreate} className="bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  New Journal Voucher
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog open={isFormOpen} onOpenChange={(open) => { setIsFormOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Journal Voucher" : "New Journal Voucher"}</DialogTitle>
            <DialogDescription>
              Enter the journal entry details. Debit total must equal Credit total.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Header Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(formDate, "PPP")}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formDate}
                      onSelect={(d) => setFormDate(d || new Date())}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Reference</Label>
                <Input
                  value={form.reference ?? ""}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  placeholder="e.g. INV-001, ADJ-2025"
                />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status ?? "DRAFT"} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="POSTED">Posted</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-3">
                <Label>Narration / Description</Label>
                <Textarea
                  value={form.narration}
                  onChange={(e) => setForm({ ...form, narration: e.target.value })}
                  placeholder="Describe the purpose of this journal entry..."
                  rows={1}
                />
              </div>
            </div>

            <Separator />

            {/* Lines */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Journal Entry Lines</Label>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>

              <div className="rounded-lg bg-white overflow-x-auto shadow-sm border border-gray-100">
                <Table className="min-w-full">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>Account Code</TableHead>
                      <TableHead>Account Name</TableHead>
                      <TableHead className="text-right">Debit ({currencyCode})</TableHead>
                      <TableHead className="text-right">Credit ({currencyCode})</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Cost Center</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.lines.map((line, idx) => {
                      const searchVal = accountSearch[idx] ?? line.accountCode;
                      const suggestions = accountHeads.filter((a) => {
                        const q = searchVal.toLowerCase();
                        return q.length >= 1 && (
                          a.code.toLowerCase().includes(q) ||
                          a.name.toLowerCase().includes(q)
                        );
                      }).slice(0, 6);
                      const showSuggestions = suggestions.length > 0 && searchVal.length >= 1 && searchVal !== line.accountCode;

                      return (
                      <TableRow key={idx}>
                        <TableCell className="relative">
                          <Input
                            value={searchVal}
                            onChange={(e) => {
                              setAccountSearch({ ...accountSearch, [idx]: e.target.value });
                              updateLine(idx, "accountCode", e.target.value);
                              updateLine(idx, "accountName", "");
                            }}
                            placeholder="1000 or name..."
                            className="w-36"
                          />
                          {showSuggestions && (
                            <div className="absolute z-50 top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-40 overflow-y-auto">
                              {suggestions.map((a) => (
                                <button
                                  key={a.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 flex flex-col"
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    updateLine(idx, "accountCode", a.code);
                                    updateLine(idx, "accountName", a.name);
                                    setAccountSearch({ ...accountSearch, [idx]: a.code });
                                  }}
                                >
                                  <span className="font-mono font-medium">{a.code}</span>
                                  <span className="text-gray-500 text-xs">{a.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.accountName}
                            onChange={(e) => updateLine(idx, "accountName", e.target.value)}
                            placeholder="Cash in Hand"
                            className="min-w-[140px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.debit || ""}
                            onChange={(e) => updateLine(idx, "debit", parseFloat(e.target.value) || 0)}
                            className="w-28 text-right"
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={line.credit || ""}
                            onChange={(e) => updateLine(idx, "credit", parseFloat(e.target.value) || 0)}
                            className="w-28 text-right"
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.description ?? ""}
                            onChange={(e) => updateLine(idx, "description", e.target.value)}
                            placeholder="Optional note"
                            className="min-w-[130px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={line.costCenter ?? ""}
                            onChange={(e) => updateLine(idx, "costCenter", e.target.value)}
                            placeholder="CC-001"
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500"
                            onClick={() => removeLine(idx)}
                          >
                            ×
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Balance indicator */}
              <div className="flex items-center justify-between p-3 rounded-md bg-white border border-gray-100 shadow-sm">
                <div className="flex items-center gap-6 text-sm">
                  <span>Total Debit: <strong><CurrencyGlyph /> {formTotalDebit.toFixed(2)}</strong></span>
                  <span>Total Credit: <strong><CurrencyGlyph /> {formTotalCredit.toFixed(2)}</strong></span>
                  <span>
                    Difference: <strong className={isBalanced ? "text-green-600" : "text-red-600"}>
                      <CurrencyGlyph /> {Math.abs(formTotalDebit - formTotalCredit).toFixed(2)}
                    </strong>
                  </span>
                </div>
                {isBalanced ? (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" /> Balanced
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">
                    <AlertTriangle className="h-3 w-3 mr-1" /> Unbalanced
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-3 sticky bottom-0 bg-white border-t px-6 py-3 -mx-6">
            <Button variant="outline" onClick={() => { setIsFormOpen(false); resetForm(); }}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!isBalanced}
              className="bg-primary hover:bg-primary/90"
            >
              {editingId ? "Save Changes" : "Create Voucher"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      {viewingVoucher && (
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-primary" />
                {viewingVoucher.voucherNo}
                <Badge className={statusColors[viewingVoucher.status] ?? "bg-gray-100 text-gray-800"}>
                  {viewingVoucher.status}
                </Badge>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Date:</span> <strong>{viewingVoucher.date}</strong></div>
                <div><span className="text-gray-500">Reference:</span> <strong>{viewingVoucher.reference || "—"}</strong></div>
                <div className="col-span-2">
                  <span className="text-gray-500">Narration:</span> <strong>{viewingVoucher.narration}</strong>
                </div>
                {viewingVoucher.createdAt && (
                  <div><span className="text-gray-500">Created:</span> <strong>{new Date(viewingVoucher.createdAt).toLocaleString()}</strong></div>
                )}
                {viewingVoucher.updatedAt && (
                  <div><span className="text-gray-500">Last Updated:</span> <strong>{new Date(viewingVoucher.updatedAt).toLocaleString()}</strong></div>
                )}
              </div>

              <Separator />

              <Table className="min-w-full">
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Account Code</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {viewingVoucher.lines.map((line, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono">{line.accountCode}</TableCell>
                      <TableCell>{line.accountName}</TableCell>
                      <TableCell className="text-right">{line.debit > 0 ? `${line.debit.toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-right">{line.credit > 0 ? `${line.credit.toFixed(2)}` : "—"}</TableCell>
                      <TableCell className="text-gray-600">{line.description || "—"}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-gray-50 font-semibold">
                    <TableCell colSpan={2}>Total</TableCell>
                    <TableCell className="text-right">{viewingVoucher.totalDebit.toFixed(2)}</TableCell>
                    <TableCell className="text-right">{viewingVoucher.totalCredit.toFixed(2)}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {viewingVoucher.status === "DRAFT" && (
                <div className="flex gap-3 pt-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => { handlePost(viewingVoucher.id); setIsViewOpen(false); }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Post Voucher
                  </Button>
                  <Button
                    variant="outline"
                    className="text-orange-600 border-orange-300"
                    onClick={() => { handleCancel(viewingVoucher.id); setIsViewOpen(false); }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel Voucher
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Journal Voucher?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The voucher and all its journal lines will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}



