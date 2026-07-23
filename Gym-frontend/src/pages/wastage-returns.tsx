import React, { useState, useEffect, useMemo } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { ScrollArea } from "../components/ui/scroll-area";
import { Alert, AlertDescription } from "../components/ui/alert";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import {
  ArrowLeftRight, Plus, Search, Download, Edit, Trash2, Eye,
  TrendingDown, AlertTriangle, CheckCircle, Clock, Package,
  DollarSign, User, RefreshCw, Save, Send, X, Check, XCircle,
  Info, MoreHorizontal, Printer, TrendingUp, Activity,
  ClipboardList, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import {
  wastageReturnService,
  WastageReturn,
  WastageReturnRequest,
  WastageReturnItemRequest,
  WastageReturnStats,
} from "../utils/supabase/wastage-return-service";
import { productsService, Product } from "../utils/supabase/products-service";

// ── Constants ────────────────────────────────────────────────────────────────

const WASTAGE_REASONS = [
  'Expired', 'Damaged in Storage', 'Damaged in Transit',
  'Manufacturing Defect', 'Contaminated', 'Spoiled',
  'Broken/Cracked', 'Quality Issues', 'Overstock Disposal', 'Other',
];

const RETURN_REASONS = [
  'Returned to Supplier - Defective', 'Returned to Supplier - Wrong Item',
  'Returned to Supplier - Quality Issues', 'Customer Return - Wrong Size',
  'Customer Return - Defective', 'Customer Return - Not Satisfied',
  'Customer Return - Wrong Color', 'Customer Return - Changed Mind',
  'Warranty Return', 'Exchange Return', 'Other',
];

const LOCATIONS = [
  'Main Store', 'Warehouse A', 'Warehouse B', 'Retail Floor',
  'Café Storage', 'Equipment Room', 'Reception', 'Other',
];

// ── Types ────────────────────────────────────────────────────────────────────

interface FormItem extends WastageReturnItemRequest {
  _key: string; // unique key for React list
}

function emptyForm() {
  return {
    type: 'WASTAGE' as 'WASTAGE' | 'GOODS_RETURN',
    date: new Date().toISOString().split('T')[0],
    associatedParty: '',
    partyType: 'NONE' as 'SUPPLIER' | 'CUSTOMER' | 'NONE',
    reason: '',
    location: '',
    recordedBy: '',
    notes: '',
    items: [] as FormItem[],
  };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    DRAFT:            { label: 'Draft',            className: 'bg-gray-100 text-gray-700' },
    PENDING_APPROVAL: { label: 'Pending Approval', className: 'bg-yellow-100 text-yellow-800' },
    APPROVED:         { label: 'Approved',         className: 'bg-green-100 text-green-800' },
    COMPLETED:        { label: 'Completed',        className: 'bg-blue-100 text-blue-800' },
    CANCELLED:        { label: 'Cancelled',        className: 'bg-red-100 text-red-700' },
    REJECTED:         { label: 'Rejected',         className: 'bg-red-200 text-red-900' },
  };
  const s = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return <Badge className={`text-xs font-medium ${s.className}`}>{s.label}</Badge>;
}

function typeBadge(type: string) {
  return type === 'WASTAGE'
    ? <Badge className="bg-orange-100 text-orange-800 text-xs">Wastage</Badge>
    : <Badge className="bg-purple-100 text-purple-800 text-xs">Goods Return</Badge>;
}

function fmt(n: number) {
  return n.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ────────────────────────────────────────────────────────────────

export function WastageReturns() {
  const { currencyCode } = useCurrency();
  // ── data state ─────────────────────────────────────────────────────────────
  const [vouchers, setVouchers]   = useState<WastageReturn[]>([]);
  const [stats, setStats]         = useState<WastageReturnStats | null>(null);
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalVouchers, setTotalVouchers] = useState(0);

  // ── filter state ───────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]     = useState("");
  const [selectedType, setSelectedType]   = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // ── dialog state ───────────────────────────────────────────────────────────
  const [showCreateDialog, setShowCreateDialog]     = useState(false);
  const [editingVoucher, setEditingVoucher]         = useState<WastageReturn | null>(null);
  const [viewingVoucher, setViewingVoucher]         = useState<WastageReturn | null>(null);
  const [showViewDialog, setShowViewDialog]         = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvingVoucher, setApprovingVoucher]     = useState<WastageReturn | null>(null);
  const [approvalAction, setApprovalAction]         = useState<'approve' | 'reject'>('approve');
  const [rejectionReason, setRejectionReason]       = useState("");
  const [showDeleteDialog, setShowDeleteDialog]     = useState(false);
  const [deletingId, setDeletingId]                 = useState<number | null>(null);

  // ── form state ─────────────────────────────────────────────────────────────
  const [form, setForm]       = useState(emptyForm());
  const [saving, setSaving]   = useState(false);
  const [acting, setActing]   = useState(false);

  // ── product search state ───────────────────────────────────────────────────
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductSearch, setShowProductSearch]   = useState(false);
  const [selectedProduct, setSelectedProduct]       = useState<Product | null>(null);
  const [productQty, setProductQty]                 = useState(1);
  const [productReasonSpecific, setProductReasonSpecific] = useState("");
  const [productUnitCost, setProductUnitCost]       = useState(0);

  // ── load ────────────────────────────────────────────────────────────────────

  async function loadData(p = page) {
    setLoading(true);
    try {
      const [voucherPage, statsData, products] = await Promise.all([
        wastageReturnService.getVouchers({
          page: p, size: 20,
          type:   selectedType   !== 'all' ? selectedType   : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          search: searchQuery    || undefined,
        }),
        wastageReturnService.getStats(),
        productsService.getProducts({ size: 200 }),
      ]);
      setVouchers(voucherPage.vouchers);
      setTotalPages(voucherPage.pagination.totalPages);
      setTotalVouchers(voucherPage.pagination.total);
      setStats(statsData);
      setApiProducts(products.products);
    } catch (e: any) {
      toast.error(e.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(1); setPage(1); }, [selectedType, selectedStatus, searchQuery]);

  // ── filtered products for search ───────────────────────────────────────────

  const filteredProducts = useMemo(() =>
    apiProducts.filter(p =>
      !productSearchQuery ||
      p.name.toLowerCase().includes(productSearchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(productSearchQuery.toLowerCase())
    ), [apiProducts, productSearchQuery]);

  // ── form helpers ───────────────────────────────────────────────────────────

  function openCreate() {
    setEditingVoucher(null);
    setForm(emptyForm());
    setShowCreateDialog(true);
  }

  function openEdit(v: WastageReturn) {
    setEditingVoucher(v);
    setForm({
      type: v.type,
      date: v.date,
      associatedParty: v.associatedParty ?? '',
      partyType: v.partyType,
      reason: v.reason,
      location: v.location,
      recordedBy: v.recordedBy ?? '',
      notes: v.notes ?? '',
      items: v.items.map(i => ({
        _key: Math.random().toString(36),
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        batchNo: i.batchNo,
        quantity: i.quantity,
        unitCost: i.unitCost,
        unit: i.unit,
        reasonSpecific: i.reasonSpecific,
      })),
    });
    setShowCreateDialog(true);
  }

  function openView(v: WastageReturn) {
    setViewingVoucher(v);
    setShowViewDialog(true);
  }

  function removeItem(key: string) {
    setForm(f => ({ ...f, items: f.items.filter(i => i._key !== key) }));
  }

  function updateItem(key: string, field: string, value: any) {
    setForm(f => ({
      ...f,
      items: f.items.map(i => {
        if (i._key !== key) return i;
        const updated = { ...i, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
          // totalCost is computed in backend; we just store unitCost here
        }
        return updated;
      }),
    }));
  }

  const formTotalItems = form.items.reduce((s, i) => s + (i.quantity || 0), 0);
  const formTotalValue = form.items.reduce((s, i) => s + (i.quantity || 0) * (i.unitCost || 0), 0);

  // ── product add ─────────────────────────────────────────────────────────────

  function openProductSearch() {
    setProductSearchQuery("");
    setSelectedProduct(null);
    setProductQty(1);
    setProductReasonSpecific("");
    setProductUnitCost(0);
    setShowProductSearch(true);
  }

  function selectProduct(p: Product) {
    setSelectedProduct(p);
    setProductUnitCost(p.costPrice || p.sellingPrice || 0);
  }

  function addProductToVoucher() {
    if (!selectedProduct) { toast.error("Select a product first"); return; }
    if (productQty <= 0) { toast.error("Quantity must be greater than 0"); return; }
    setForm(f => ({
      ...f,
      items: [...f.items, {
        _key: Math.random().toString(36),
        productId: selectedProduct.id,
        productName: selectedProduct.name,
        sku: selectedProduct.sku,
        batchNo: undefined,
        quantity: productQty,
        unitCost: productUnitCost,
        unit: selectedProduct.defaultUnit || 'unit',
        reasonSpecific: productReasonSpecific || undefined,
      }],
    }));
    setShowProductSearch(false);
  }

  // ── save ───────────────────────────────────────────────────────────────────

  async function saveVoucher(asDraft: boolean) {
    if (!form.reason) { toast.error("Reason is required"); return; }
    if (!form.location) { toast.error("Location is required"); return; }
    if (form.items.length === 0) { toast.error("Add at least one product"); return; }
    setSaving(true);
    try {
      const req: WastageReturnRequest = {
        date: form.date,
        type: form.type,
        associatedParty: form.associatedParty || undefined,
        partyType: form.partyType,
        reason: form.reason,
        location: form.location,
        recordedBy: form.recordedBy || undefined,
        notes: form.notes || undefined,
        items: form.items.map(i => ({
          productId: i.productId,
          productName: i.productName,
          sku: i.sku,
          batchNo: i.batchNo,
          quantity: i.quantity,
          unitCost: i.unitCost,
          unit: i.unit,
          reasonSpecific: i.reasonSpecific,
        })),
      };

      let saved: WastageReturn;
      if (editingVoucher) {
        saved = await wastageReturnService.updateVoucher(editingVoucher.id, req);
        toast.success("Voucher updated");
      } else {
        saved = await wastageReturnService.createVoucher(req);
        toast.success(asDraft ? "Saved as draft" : "Voucher created");
      }

      if (!asDraft && !editingVoucher) {
        // Submit for approval immediately
        await wastageReturnService.submitForApproval(saved.id);
        toast.success("Submitted for approval");
      }

      setShowCreateDialog(false);
      loadData(1);
    } catch (e: any) {
      toast.error(e.message || "Failed to save voucher");
    } finally {
      setSaving(false);
    }
  }

  // ── actions ────────────────────────────────────────────────────────────────

  async function handleSubmitForApproval(v: WastageReturn) {
    setActing(true);
    try {
      await wastageReturnService.submitForApproval(v.id);
      toast.success("Submitted for approval");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to submit");
    } finally {
      setActing(false);
    }
  }

  function openApproval(v: WastageReturn, action: 'approve' | 'reject') {
    setApprovingVoucher(v);
    setApprovalAction(action);
    setRejectionReason("");
    setShowApprovalDialog(true);
  }

  async function handleApprovalAction() {
    if (!approvingVoucher) return;
    if (approvalAction === 'reject' && !rejectionReason.trim()) {
      toast.error("Rejection reason is required");
      return;
    }
    setActing(true);
    try {
      if (approvalAction === 'approve') {
        await wastageReturnService.approveVoucher(approvingVoucher.id);
        toast.success("Voucher approved — stock adjusted");
      } else {
        await wastageReturnService.rejectVoucher(approvingVoucher.id, rejectionReason);
        toast.success("Voucher rejected");
      }
      setShowApprovalDialog(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setActing(false);
    }
  }

  async function handleComplete(v: WastageReturn) {
    setActing(true);
    try {
      await wastageReturnService.completeVoucher(v.id);
      toast.success("Voucher completed");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to complete");
    } finally {
      setActing(false);
    }
  }

  async function handleCancel(v: WastageReturn) {
    setActing(true);
    try {
      await wastageReturnService.cancelVoucher(v.id);
      toast.success("Voucher cancelled");
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to cancel");
    } finally {
      setActing(false);
    }
  }

  function askDelete(id: number) {
    setDeletingId(id);
    setShowDeleteDialog(true);
  }

  async function handleDelete() {
    if (!deletingId) return;
    try {
      await wastageReturnService.deleteVoucher(deletingId);
      toast.success("Voucher deleted");
      setShowDeleteDialog(false);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  }

  function printVoucher(v: WastageReturn) {
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html><head><title>${v.voucherNumber}</title>
      <style>body{font-family:sans-serif;padding:20px}table{width:100%;border-collapse:collapse}
      td,th{border:1px solid #ccc;padding:6px 10px;font-size:12px}.header{margin-bottom:16px}</style>
      </head><body>
      <div class="header">
        <h2>${v.type === 'WASTAGE' ? 'Wastage Voucher' : 'Goods Return Voucher'}</h2>
        <p><b>Voucher #:</b> ${v.voucherNumber}</p>
        <p><b>Date:</b> ${v.date}</p>
        <p><b>Reason:</b> ${v.reason}</p>
        <p><b>Location:</b> ${v.location}</p>
        ${v.associatedParty ? `<p><b>Party:</b> ${v.associatedParty} (${v.partyType})</p>` : ''}
        <p><b>Status:</b> ${v.status}</p>
        ${v.recordedBy ? `<p><b>Recorded By:</b> ${v.recordedBy}</p>` : ''}
      </div>
      <table><thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>Unit Cost</th><th>Total</th></tr></thead>
      <tbody>${v.items.map(i => `<tr>
        <td>${i.productName}</td><td>${i.sku}</td><td>${i.quantity} ${i.unit}</td>
        <td>${fmt(i.unitCost)}</td><td>${fmt(i.totalCost)}</td>
      </tr>`).join('')}</tbody>
      </table>
      <p style="margin-top:12px"><b>Total Items:</b> ${v.totalItems} &nbsp;&nbsp;
      <b>Total Value:</b> ${currencyCode} ${fmt(v.totalValue)}</p>
      ${v.notes ? `<p><b>Notes:</b> ${v.notes}</p>` : ''}
      </body></html>
    `);
    win.document.close();
    win.print();
  }

  function duplicateVoucher(v: WastageReturn) {
    setEditingVoucher(null);
    setForm({
      type: v.type,
      date: new Date().toISOString().split('T')[0],
      associatedParty: v.associatedParty ?? '',
      partyType: v.partyType,
      reason: v.reason,
      location: v.location,
      recordedBy: v.recordedBy ?? '',
      notes: v.notes ?? '',
      items: v.items.map(i => ({
        _key: Math.random().toString(36),
        productId: i.productId,
        productName: i.productName,
        sku: i.sku,
        batchNo: i.batchNo,
        quantity: i.quantity,
        unitCost: i.unitCost,
        unit: i.unit,
        reasonSpecific: i.reasonSpecific,
      })),
    });
    setShowCreateDialog(true);
    toast.info("Duplicated — save as a new voucher");
  }

  function exportCsv() {
    const rows = [
      ['Voucher #', 'Date', 'Type', 'Reason', 'Location', 'Items', 'Total Value', 'Status', 'Recorded By'],
      ...vouchers.map(v => [
        v.voucherNumber, v.date, v.type, v.reason, v.location,
        v.totalItems, v.totalValue, v.status, v.recordedBy ?? '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'wastage-returns.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Wastage & Returns</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Track damaged goods, expired items and supplier/customer returns
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="h-9" onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> New Voucher
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes wrFadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [role="tabpanel"][data-state="active"] {
          animation: wrFadeIn 0.22s ease-out;
        }
      `}</style>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Vouchers</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg">
              <ClipboardList className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats?.totalVouchers ?? totalVouchers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pendingApproval ?? 0} pending approval
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Wastage Value</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <TrendingDown className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600"><CurrencyGlyph /> {fmt(stats?.totalWastageValue ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month: <CurrencyGlyph /> {fmt(stats?.monthlyWastage ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Returns Value</CardTitle>
            <div className="bg-purple-50 p-2 rounded-lg">
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600"><CurrencyGlyph /> {fmt(stats?.totalReturnValue ?? 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month: <CurrencyGlyph /> {fmt(stats?.monthlyReturns ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Pending Approval</CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pendingApproval ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Require action</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="vouchers">
        <TabsList className="w-full flex">
          <TabsTrigger value="vouchers" className="flex-1"><ClipboardList className="mr-1.5 h-3.5 w-3.5" />Vouchers</TabsTrigger>
          <TabsTrigger value="analytics" className="flex-1"><BarChart3 className="mr-1.5 h-3.5 w-3.5" />Analytics</TabsTrigger>
        </TabsList>

        {/* ── Vouchers Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="vouchers" className="space-y-4 mt-4">
          {/* Filters */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search voucher number, reason, location..."
                className="pl-11 h-10"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="WASTAGE">Wastage</SelectItem>
                    <SelectItem value="GOODS_RETURN">Goods Return</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="icon" onClick={() => loadData(1)} title="Refresh">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            {loading ? (
              <CardContent className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                Loading vouchers...
              </CardContent>
            ) : vouchers.length === 0 ? (
              <CardContent className="flex flex-col items-center justify-center py-20 px-6 text-muted-foreground text-center">
                <ArrowLeftRight className="h-10 w-10 mb-4 opacity-30" />
                <p className="font-medium">No vouchers found</p>
                <p className="text-sm mt-2">Create your first wastage or return voucher</p>
                <Button className="mt-4" onClick={openCreate}>
                  <Plus className="mr-2 h-4 w-4" /> New Voucher
                </Button>
              </CardContent>
            ) : (
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Voucher #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Value ({currencyCode})</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recorded By</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vouchers.map(v => (
                    <TableRow key={v.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell className="font-mono text-sm font-medium">{v.voucherNumber}</TableCell>
                      <TableCell className="text-sm">{v.date}</TableCell>
                      <TableCell>{typeBadge(v.type)}</TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">{v.reason}</TableCell>
                      <TableCell className="text-right text-sm">{v.totalItems}</TableCell>
                      <TableCell className="text-right text-sm font-medium">{fmt(v.totalValue)}</TableCell>
                      <TableCell>{statusBadge(v.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{v.recordedBy ?? v.createdBy ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(v)}>
                              <Eye className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            {v.status === 'PENDING_APPROVAL' && (
                              <>
                                <DropdownMenuItem onClick={() => openApproval(v, 'approve')}>
                                  <Check className="mr-2 h-4 w-4 text-green-600" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openApproval(v, 'reject')}>
                                  <XCircle className="mr-2 h-4 w-4 text-red-600" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {v.status === 'APPROVED' && (
                              <DropdownMenuItem onClick={() => handleComplete(v)}>
                                <CheckCircle className="mr-2 h-4 w-4 text-blue-600" /> Mark Complete
                              </DropdownMenuItem>
                            )}
                            {v.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => handleSubmitForApproval(v)}>
                                <Send className="mr-2 h-4 w-4" /> Submit for Approval
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => printVoucher(v)}>
                              <Printer className="mr-2 h-4 w-4" /> Print
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateVoucher(v)}>
                              <Activity className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            {v.status === 'DRAFT' && (
                              <DropdownMenuItem onClick={() => openEdit(v)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                            )}
                            {(v.status === 'DRAFT' || v.status === 'PENDING_APPROVAL' || v.status === 'APPROVED') && (
                              <DropdownMenuItem onClick={() => handleCancel(v)} className="text-destructive">
                                <X className="mr-2 h-4 w-4" /> Cancel
                              </DropdownMenuItem>
                            )}
                            {v.status === 'DRAFT' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => askDelete(v.id)} className="text-destructive">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); loadData(page - 1); }}>Previous</Button>
              <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); loadData(page + 1); }}>Next</Button>
            </div>
          )}
        </TabsContent>

        {/* ── Analytics Tab ─────────────────────────────────────────────────── */}
        <TabsContent value="analytics" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-orange-500" /> Top Wasted Products
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!stats || stats.topWastedProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No wastage data yet</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topWastedProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                          <span className="text-sm font-medium">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold"><CurrencyGlyph /> {fmt(p.value)}</p>
                          <p className="text-xs text-muted-foreground">{p.quantity} units</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" /> Return Reasons Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!stats || stats.topReturnReasons.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No return data yet</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topReturnReasons.map((r, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                          <span className="text-sm font-medium">{r.reason}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">{r.count} cases</p>
                          <p className="text-xs text-muted-foreground"><CurrencyGlyph /> {fmt(r.value)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Create / Edit Voucher Dialog ──────────────────────────────────── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingVoucher ? `Edit Voucher — ${editingVoucher.voucherNumber}` : 'New Wastage / Return Voucher'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">

            {/* Type */}
            <div className="space-y-2">
              <Label>Voucher Type</Label>
              <RadioGroup
                value={form.type}
                onValueChange={v => setForm(f => ({ ...f, type: v as any, reason: '' }))}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="WASTAGE" id="type-wastage" />
                  <Label htmlFor="type-wastage" className="cursor-pointer font-normal">
                    <TrendingDown className="inline h-3.5 w-3.5 mr-1 text-orange-500" />Wastage
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="GOODS_RETURN" id="type-return" />
                  <Label htmlFor="type-return" className="cursor-pointer font-normal">
                    <TrendingUp className="inline h-3.5 w-3.5 mr-1 text-purple-500" />Goods Return
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Row: Date + Location */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Date <span className="text-destructive">*</span></Label>
                <Input type="date" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Location <span className="text-destructive">*</span></Label>
                <Select value={form.location} onValueChange={v => setForm(f => ({ ...f, location: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row: Reason + Recorded By */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Reason <span className="text-destructive">*</span></Label>
                <Select value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
                  <SelectContent>
                    {(form.type === 'WASTAGE' ? WASTAGE_REASONS : RETURN_REASONS).map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Recorded By</Label>
                <Input placeholder="Your name" value={form.recordedBy}
                  onChange={e => setForm(f => ({ ...f, recordedBy: e.target.value }))} />
              </div>
            </div>

            {/* Party info — goods return only */}
            {form.type === 'GOODS_RETURN' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Party Type</Label>
                  <Select value={form.partyType} onValueChange={v => setForm(f => ({ ...f, partyType: v as any }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SUPPLIER">Supplier</SelectItem>
                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                      <SelectItem value="NONE">N/A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.partyType !== 'NONE' && (
                  <div className="space-y-1.5">
                    <Label>{form.partyType === 'SUPPLIER' ? 'Supplier Name' : 'Customer Name'}</Label>
                    <Input placeholder="Enter name" value={form.associatedParty}
                      onChange={e => setForm(f => ({ ...f, associatedParty: e.target.value }))} />
                  </div>
                )}
              </div>
            )}

            {/* Products */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Products</Label>
                <Button type="button" variant="outline" size="sm" onClick={openProductSearch}>
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add Product
                </Button>
              </div>

              {form.items.length === 0 ? (
                <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No products added yet</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="w-24">Qty</TableHead>
                        <TableHead className="w-28">Unit Cost</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {form.items.map(item => (
                        <TableRow key={item._key}>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{item.productName}</p>
                              {item.reasonSpecific && (
                                <p className="text-xs text-muted-foreground">{item.reasonSpecific}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{item.sku}</TableCell>
                          <TableCell>
                            <Input
                              type="number" min={1} className="h-7 w-20"
                              value={item.quantity}
                              onChange={e => updateItem(item._key, 'quantity', Number(e.target.value))}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number" min={0} step="0.01" className="h-7 w-24"
                              value={item.unitCost}
                              onChange={e => updateItem(item._key, 'unitCost', Number(e.target.value))}
                            />
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {fmt(item.quantity * item.unitCost)}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                              onClick={() => removeItem(item._key)}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {form.items.length > 0 && (
                <div className="flex justify-end">
                  <div className="bg-muted rounded-lg px-4 py-2 text-sm space-y-1">
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Total Items</span>
                      <span className="font-medium">{formTotalItems}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Total Value</span>
                      <span className="font-bold"><CurrencyGlyph /> {fmt(formTotalValue)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes / Comments</Label>
              <Textarea rows={2} placeholder="Additional notes..."
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
              <Button variant="secondary" onClick={() => saveVoucher(true)} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? 'Saving...' : 'Save as Draft'}
              </Button>
              <Button onClick={() => saveVoucher(false)} disabled={saving}>
                <Send className="mr-2 h-4 w-4" />
                {saving ? 'Submitting...' : editingVoucher ? 'Update' : 'Create & Submit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Product Search Dialog ─────────────────────────────────────────── */}
      <Dialog open={showProductSearch} onOpenChange={setShowProductSearch}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Select Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or SKU..."
                className="pl-11 h-10"
                value={productSearchQuery}
                onChange={e => setProductSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <ScrollArea className="h-56 border rounded-lg">
              {filteredProducts.length === 0 ? (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  No products found
                </div>
              ) : (
                filteredProducts.map(p => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b last:border-0 hover:bg-muted/50 transition-colors ${
                      selectedProduct?.id === p.id ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                    }`}
                    onClick={() => selectProduct(p)}
                  >
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.sku} · {p.categoryName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Stock: {p.totalStock}</p>
                      <p className="text-xs font-medium"><CurrencyGlyph /> {fmt(p.costPrice)}</p>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>

            {selectedProduct && (
              <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                <p className="text-sm font-semibold">{selectedProduct.name}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number" min={1}
                      value={productQty}
                      onChange={e => setProductQty(Number(e.target.value))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Unit Cost ({currencyCode})</Label>
                    <Input
                      type="number" min={0} step="0.01"
                      value={productUnitCost}
                      onChange={e => setProductUnitCost(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Specific Reason (optional)</Label>
                  <Input
                    placeholder="e.g. Found damaged in shelf B2"
                    value={productReasonSpecific}
                    onChange={e => setProductReasonSpecific(e.target.value)}
                  />
                </div>
                <Alert className="py-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Total cost: <CurrencyGlyph /> {fmt(productQty * productUnitCost)}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowProductSearch(false)}>Cancel</Button>
              <Button onClick={addProductToVoucher} disabled={!selectedProduct}>
                Add to Voucher
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Voucher Dialog ───────────────────────────────────────────── */}
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              {viewingVoucher?.voucherNumber}
            </DialogTitle>
          </DialogHeader>
          {viewingVoucher && (
            <div className="space-y-4 pt-2">
              <div className="flex gap-2">
                {typeBadge(viewingVoucher.type)}
                {statusBadge(viewingVoucher.status)}
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-muted-foreground">Date:</span> <span className="font-medium ml-1">{viewingVoucher.date}</span></div>
                <div><span className="text-muted-foreground">Location:</span> <span className="font-medium ml-1">{viewingVoucher.location}</span></div>
                <div><span className="text-muted-foreground">Reason:</span> <span className="font-medium ml-1">{viewingVoucher.reason}</span></div>
                <div><span className="text-muted-foreground">Recorded By:</span> <span className="font-medium ml-1">{viewingVoucher.recordedBy || viewingVoucher.createdBy || '—'}</span></div>
                {viewingVoucher.associatedParty && (
                  <div><span className="text-muted-foreground">Party:</span> <span className="font-medium ml-1">{viewingVoucher.associatedParty} ({viewingVoucher.partyType})</span></div>
                )}
                {viewingVoucher.approvedBy && (
                  <div><span className="text-muted-foreground">Approved By:</span> <span className="font-medium ml-1">{viewingVoucher.approvedBy}</span></div>
                )}
                {viewingVoucher.rejectionReason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Rejection Reason:</span>
                    <span className="font-medium ml-1 text-destructive">{viewingVoucher.rejectionReason}</span>
                  </div>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewingVoucher.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <p className="text-sm font-medium">{item.productName}</p>
                          {item.reasonSpecific && <p className="text-xs text-muted-foreground">{item.reasonSpecific}</p>}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.sku}</TableCell>
                        <TableCell className="text-right text-sm">{item.quantity} {item.unit}</TableCell>
                        <TableCell className="text-right text-sm">{fmt(item.unitCost)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{fmt(item.totalCost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <div className="bg-muted rounded-lg px-4 py-2 text-sm space-y-1">
                  <div className="flex justify-between gap-8">
                    <span className="text-muted-foreground">Total Items</span>
                    <span className="font-medium">{viewingVoucher.totalItems}</span>
                  </div>
                  <div className="flex justify-between gap-8">
                    <span className="text-muted-foreground">Total Value</span>
                    <span className="font-bold"><CurrencyGlyph /> {fmt(viewingVoucher.totalValue)}</span>
                  </div>
                </div>
              </div>

              {viewingVoucher.notes && (
                <div>
                  <p className="text-xs text-muted-foreground font-medium mb-1">Notes</p>
                  <p className="text-sm border rounded p-2 bg-muted/30">{viewingVoucher.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 border-t pt-3">
                <Button variant="outline" onClick={() => printVoucher(viewingVoucher)}>
                  <Printer className="mr-2 h-4 w-4" /> Print
                </Button>
                {viewingVoucher.status === 'DRAFT' && (
                  <Button onClick={() => { setShowViewDialog(false); openEdit(viewingVoucher); }}>
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                )}
                {viewingVoucher.status === 'PENDING_APPROVAL' && (
                  <>
                    <Button variant="destructive" onClick={() => { setShowViewDialog(false); openApproval(viewingVoucher, 'reject'); }}>
                      <XCircle className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => { setShowViewDialog(false); openApproval(viewingVoucher, 'approve'); }}>
                      <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Approval Dialog ───────────────────────────────────────────────── */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className={`flex items-center gap-2 ${approvalAction === 'approve' ? 'text-green-700' : 'text-destructive'}`}>
              {approvalAction === 'approve'
                ? <><CheckCircle className="h-5 w-5" /> Approve Voucher</>
                : <><XCircle className="h-5 w-5" /> Reject Voucher</>
              }
            </DialogTitle>
          </DialogHeader>
          {approvingVoucher && (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                Voucher <span className="font-medium text-foreground">{approvingVoucher.voucherNumber}</span>
                {' '}— Total value: <span className="font-medium text-foreground"><CurrencyGlyph /> {fmt(approvingVoucher.totalValue)}</span>
              </p>

              <div className="border rounded-lg p-3 space-y-1.5 text-sm bg-muted/30">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{typeBadge(approvingVoucher.type)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reason</span>
                  <span className="font-medium text-right max-w-[60%]">{approvingVoucher.reason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Products</span>
                  <span className="font-medium">{approvingVoucher.totalItems} items</span>
                </div>
              </div>

              {approvalAction === 'approve' && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {approvingVoucher.type === 'WASTAGE' || approvingVoucher.partyType === 'SUPPLIER'
                      ? 'Approving will deduct product stock for all items in this voucher.'
                      : 'Approving will add product stock back for customer returns.'}
                  </AlertDescription>
                </Alert>
              )}

              {approvalAction === 'reject' && (
                <div className="space-y-1.5">
                  <Label>Rejection Reason <span className="text-destructive">*</span></Label>
                  <Textarea
                    rows={3}
                    placeholder="Explain why this voucher is being rejected..."
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={() => setShowApprovalDialog(false)}>Cancel</Button>
                <Button
                  variant={approvalAction === 'approve' ? 'default' : 'destructive'}
                  onClick={handleApprovalAction}
                  disabled={acting}
                  className={approvalAction === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  {acting ? 'Processing...' : approvalAction === 'approve' ? 'Approve' : 'Reject'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Voucher</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Are you sure you want to delete this draft voucher? This cannot be undone.
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
