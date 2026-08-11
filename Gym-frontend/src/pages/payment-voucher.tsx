import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import { paymentVoucherService, type PaymentVoucher as PVApiType, type PaymentVoucherCreateRequest } from "../utils/supabase/payment-voucher-service";
import { purchaseService, type Supplier } from "../utils/supabase/purchase-service";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { toast } from "sonner";
import {
  CalendarIcon,
  Plus,
  Search,
  Download,
  FileText,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Building2,
  CreditCard,
  Banknote,
  Wallet,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Calendar as CalendarBig,
  Users,
  Receipt,
  Split,
  Check,
  ChevronsUpDown
} from "lucide-react";
import { cn } from "../components/ui/utils";
import {
  SplitPaymentFields, isSplitPaymentValid, isSplitPaymentDetailsValid, buildSplitPaymentBreakdown,
  EMPTY_SPLIT_PAYMENT, EMPTY_SPLIT_DETAILS, CARD_TYPE_OPTIONS, ONLINE_PAYMENT_TYPE_OPTIONS
} from "../components/shared/split-payment-fields";
import type { SplitPaymentValue, SplitPaymentDetails } from "../components/shared/split-payment-fields";
import { accountHeadsService, AccountHead } from "../utils/supabase/account-heads-service";

// Maps the Payment Method select value to the SplitPaymentValue key so a
// single (non-Mixed) method's details can be validated/built by reusing the
// same helpers Mixed Payment legs use.
const PAYMENT_METHOD_TO_LEG_KEY: Partial<Record<string, keyof SplitPaymentValue>> = {
  Cash: 'cash', Card: 'card', Cheque: 'cheque', 'Bank Transfer': 'bankTransfer', 'Digital Wallet': 'online'
};

interface PaymentVoucher {
  id: string;
  voucherNo: string;
  supplierName: string;
  supplierType: "Supplier" | "Vendor" | "Employee";
  billNo?: string;
  paymentDate: string;
  amount: number;
  paymentMethod: "Cash" | "Card" | "Bank Transfer" | "Cheque" | "Digital Wallet" | "Mixed";
  paymentBreakdown?: { method: string; amount: number; reference?: string }[];
  status: "Paid" | "Pending" | "Overdue" | "Partial";
  description: string;
  createdAt: string;
  bills?: BillEntry[];
  bankAccount?: string;
  chequeNo?: string;
  chequeDate?: string;
  notes?: string;
}

interface BillEntry {
  id: string;
  billNo: string;
  billDate: string;
  originalAmount: number;
  paidAmount: number;
  remainingBalance: number;
  dueDate: string;
  status: "Paid" | "Pending" | "Overdue" | "Partial";
}

interface PVForm {
  supplierName: string;
  supplierType: string;
  billNo: string;
  paymentDate: string;
  amount: string;
  paymentMethod: string;
  status: string;
  description: string;
  bankAccount: string;
  chequeNo: string;
  chequeDate: string;
  notes: string;
  bills: BillForm[];
}

// Method-specific details for Card ("Card") and Digital Wallet ("Digital
// Wallet", the online-payment equivalent on this page) plus the ledger bank
// account id backing the freetext Bank Account field for Bank Transfer —
// reuses the same shape Mixed Payment legs use.
const emptyMethodDetails: SplitPaymentDetails = { ...EMPTY_SPLIT_DETAILS };

interface BillForm {
  billNo: string;
  billDate: string;
  originalAmount: string;
  paidAmount: string;
  remainingBalance: string;
  dueDate: string;
  status: string;
}

const emptyBill: BillForm = {
  billNo: "",
  billDate: new Date().toISOString().split("T")[0],
  originalAmount: "",
  paidAmount: "",
  remainingBalance: "",
  dueDate: "",
  status: "Pending",
};

const emptyForm: PVForm = {
  supplierName: "",
  supplierType: "Supplier",
  billNo: "",
  paymentDate: new Date().toISOString().split("T")[0],
  amount: "",
  paymentMethod: "Cash",
  status: "Pending",
  description: "",
  bankAccount: "",
  chequeNo: "",
  chequeDate: "",
  notes: "",
  bills: [],
};

export function PaymentVoucher() {
  const { currencyCode } = useCurrency();
  const [allVouchers, setAllVouchers] = useState<PaymentVoucher[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(true);

  const loadVouchers = useCallback(async () => {
    try {
      setLoadingVouchers(true);
      const data = await paymentVoucherService.getPaymentVouchers();
      const mapped: PaymentVoucher[] = data.map((v: PVApiType) => ({
        id: v.id,
        voucherNo: v.voucherNo,
        supplierName: v.supplierName,
        supplierType: v.supplierType as "Supplier" | "Vendor" | "Employee",
        billNo: v.billNo,
        paymentDate: v.paymentDate,
        amount: v.amount,
        paymentMethod: v.paymentMethod as "Cash" | "Card" | "Bank Transfer" | "Cheque" | "Digital Wallet" | "Mixed",
        paymentBreakdown: v.paymentBreakdown,
        status: normalizeStatus(v.status) as any,
        description: v.description,
        createdAt: v.createdAt ?? "",
        bankAccount: v.bankAccount,
        chequeNo: v.chequeNo,
        chequeDate: v.chequeDate,
        notes: v.notes,
        bills: v.bills?.map((b) => ({
          id: b.id ?? String(Math.random()),
          billNo: b.billNo,
          billDate: b.billDate,
          originalAmount: b.originalAmount,
          paidAmount: b.paidAmount,
          remainingBalance: b.remainingBalance,
          dueDate: b.dueDate,
          status: normalizeStatus(b.status) as any,
        })),
      }));
      setAllVouchers(mapped);
    } catch (err: any) {
      toast.error(err.message || "Failed to load payment vouchers");
    } finally {
      setLoadingVouchers(false);
    }
  }, []);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  // Filters & sorting state
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDateRange, setSelectedDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [sortField, setSortField] = useState<string>("paymentDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedVoucher, setSelectedVoucher] = useState<PaymentVoucher | null>(null);
  const [showAdvancedFilter, setShowAdvancedFilter] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PVForm>(emptyForm);
  const [splitPayment, setSplitPayment] = useState<SplitPaymentValue>(EMPTY_SPLIT_PAYMENT);
  const [splitDetails, setSplitDetails] = useState<SplitPaymentDetails>(EMPTY_SPLIT_DETAILS);
  // Card Type / Digital Wallet details for the top-level (non-Mixed) Payment Method.
  const [methodDetails, setMethodDetails] = useState<SplitPaymentDetails>(emptyMethodDetails);
  const [bankAccounts, setBankAccounts] = useState<AccountHead[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState("");

  useEffect(() => {
    accountHeadsService.getBankAccounts()
      .then(setBankAccounts)
      .catch(err => console.error('Failed to load bank accounts:', err));
      
    purchaseService.getActiveSuppliers()
      .then(setSuppliers)
      .catch(err => console.error('Failed to load suppliers:', err));
  }, []);
  const [savingForm, setSavingForm] = useState(false);
  const [deletingVoucher, setDeletingVoucher] = useState(false);

  const summaryData = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const thisMonthVouchers = allVouchers.filter(v => {
      const parts = v.paymentDate.split("-").map(Number);
      return (parts[1] - 1) === currentMonth && parts[0] === currentYear;
    });

    const totalPaidThisMonth = thisMonthVouchers
      .filter(v => v.status === "Paid")
      .reduce((sum, v) => sum + v.amount, 0);

    const totalPending = allVouchers
      .filter(v => v.status === "Pending" || v.status === "Partial")
      .reduce((sum, v) => sum + v.amount, 0);

    const overdueCount = allVouchers.filter(v => v.status === "Overdue").length;

    const upcomingPayments = allVouchers.filter(v => {
      const [y, m, d] = v.paymentDate.split("-").map(Number);
      const paymentDate = new Date(y, m - 1, d);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      return paymentDate <= nextWeek && v.status === "Pending";
    }).length;

    return { totalPaidThisMonth, totalPending, overdueCount, upcomingPayments };
  }, [allVouchers]);

  const filteredAndSortedVouchers = useMemo(() => {
    let filtered = allVouchers.filter(voucher => {
      if (selectedCategory !== "all") {
        if (selectedCategory === "pending" && voucher.status !== "Pending" && voucher.status !== "Partial") return false;
        if (selectedCategory === "paid" && voucher.status !== "Paid") return false;
        if (selectedCategory === "overdue" && voucher.status !== "Overdue") return false;
        if (selectedCategory === "supplier" && voucher.supplierType !== "Supplier") return false;
      }
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !voucher.voucherNo.toLowerCase().includes(q) &&
          !voucher.supplierName.toLowerCase().includes(q) &&
          !(voucher.billNo?.toLowerCase().includes(q)) &&
          !voucher.description.toLowerCase().includes(q)
        ) return false;
      }
      if (selectedStatus !== "all" && voucher.status.toLowerCase() !== selectedStatus) return false;
      if (selectedPaymentMethod !== "all" && voucher.paymentMethod.toLowerCase().replace(/ /g, "-") !== selectedPaymentMethod) return false;
      if (selectedDateRange.from || selectedDateRange.to) {
        const [y, m, d] = voucher.paymentDate.split("-").map(Number);
        const vDate = new Date(y, m - 1, d);
        if (selectedDateRange.from && vDate < selectedDateRange.from) return false;
        if (selectedDateRange.to && vDate > selectedDateRange.to) return false;
      }
      return true;
    });

    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof PaymentVoucher];
      let bVal: any = b[sortField as keyof PaymentVoucher];
      if (sortField === "amount") {
        aVal = Number(aVal); bVal = Number(bVal);
      } else if (sortField === "paymentDate") {
        aVal = new Date(aVal); bVal = new Date(bVal);
      } else {
        aVal = String(aVal ?? "").toLowerCase(); bVal = String(bVal ?? "").toLowerCase();
      }
      return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return filtered;
  }, [allVouchers, selectedCategory, searchQuery, selectedStatus, selectedPaymentMethod, selectedDateRange, sortField, sortDirection]);

  const totalPages = Math.ceil(filteredAndSortedVouchers.length / itemsPerPage);
  const paginatedVouchers = filteredAndSortedVouchers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleViewDetails = (voucher: PaymentVoucher) => {
    setSelectedVoucher(voucher);
    setIsDetailsOpen(true);
  };

  const handleExport = () => toast.success("Exporting payment vouchers...");

  const openCreate = () => {
    setForm(emptyForm);
    setSplitPayment(EMPTY_SPLIT_PAYMENT);
    setSplitDetails(EMPTY_SPLIT_DETAILS);
    setMethodDetails(emptyMethodDetails);
    setShowCreateDialog(true);
  };

  const openEdit = (voucher: PaymentVoucher) => {
    setEditingId(voucher.id);
    setForm({
      supplierName: voucher.supplierName,
      supplierType: voucher.supplierType,
      billNo: voucher.billNo ?? "",
      paymentDate: voucher.paymentDate.split("T")[0],
      amount: String(voucher.amount),
      paymentMethod: voucher.paymentMethod,
      status: voucher.status,
      description: voucher.description,
      bankAccount: voucher.bankAccount ?? "",
      chequeNo: voucher.chequeNo ?? "",
      chequeDate: voucher.chequeDate?.split("T")[0] ?? "",
      notes: voucher.notes ?? "",
      bills: (voucher.bills ?? []).map(b => ({
        billNo: b.billNo,
        billDate: b.billDate.split("T")[0],
        originalAmount: String(b.originalAmount),
        paidAmount: String(b.paidAmount),
        remainingBalance: String(b.remainingBalance),
        dueDate: b.dueDate.split("T")[0],
        status: b.status,
      })),
    });
    const legs = voucher.paymentBreakdown ?? [];
    setSplitPayment({
      cash: legs.find(l => l.method === "Cash")?.amount || 0,
      card: legs.find(l => l.method === "Card")?.amount || 0,
      cheque: legs.find(l => l.method === "Cheque")?.amount || 0,
      bankTransfer: legs.find(l => l.method === "Bank Transfer")?.amount || 0,
      online: legs.find(l => l.method === "Online Payment")?.amount || 0,
    });
    setSplitDetails(EMPTY_SPLIT_DETAILS);
    setMethodDetails(emptyMethodDetails);
    setShowEditDialog(true);
  };

  // Builds the payment_breakdown leg(s) for whatever's currently selected —
  // several legs for Mixed, a single leg carrying the method's rich detail
  // (card type, online payment type, ...) for Card/Digital Wallet, none for
  // Cash/Cheque/Bank Transfer (those already have their own scalar fields).
  const buildBreakdownForSubmit = (f: PVForm) => {
    if (f.paymentMethod === "Mixed") {
      return buildSplitPaymentBreakdown(splitPayment, splitDetails, bankAccounts);
    }
    const legKey = PAYMENT_METHOD_TO_LEG_KEY[f.paymentMethod];
    if (legKey !== 'card' && legKey !== 'online') return undefined;
    const probe: SplitPaymentValue = { ...EMPTY_SPLIT_PAYMENT, [legKey]: parseFloat(f.amount) || 0 };
    return buildSplitPaymentBreakdown(probe, methodDetails, bankAccounts);
  };

  const toRequest = (f: PVForm): PaymentVoucherCreateRequest => ({
    supplierName: f.supplierName,
    supplierType: f.supplierType,
    billNo: f.billNo || undefined,
    paymentDate: f.paymentDate,
    amount: parseFloat(f.amount) || 0,
    paymentMethod: f.paymentMethod,
    paymentBreakdown: buildBreakdownForSubmit(f),
    status: f.status || "Pending",
    description: f.description,
    bankAccount: f.bankAccount || undefined,
    chequeNo: f.chequeNo || undefined,
    chequeDate: f.chequeDate || undefined,
    notes: f.notes || undefined,
    bills: f.bills.map(b => ({
      billNo: b.billNo,
      billDate: b.billDate,
      originalAmount: parseFloat(b.originalAmount) || 0,
      paidAmount: parseFloat(b.paidAmount) || 0,
      remainingBalance: parseFloat(b.remainingBalance) || 0,
      dueDate: b.dueDate,
      status: b.status,
    })),
  });

  // Shared by handleCreate/handleEdit: split-amount validity + required
  // method-specific fields (Card Type, Online Payment Type, ...).
  const validatePaymentMethodFields = (f: PVForm) => {
    const amount = parseFloat(f.amount) || 0;
    if (f.paymentMethod === "Mixed") {
      if (!isSplitPaymentValid(splitPayment, amount)) {
        toast.error("Split payment amounts must add up to the total amount");
        return false;
      }
      if (!isSplitPaymentDetailsValid(splitPayment, splitDetails)) {
        toast.error("Please fill in the required details for each payment method used in the split");
        return false;
      }
    } else {
      const legKey = PAYMENT_METHOD_TO_LEG_KEY[f.paymentMethod];
      if (legKey === 'card' || legKey === 'online') {
        const probe: SplitPaymentValue = { ...EMPTY_SPLIT_PAYMENT, [legKey]: amount };
        if (!isSplitPaymentDetailsValid(probe, methodDetails)) {
          toast.error(`Please fill in the required ${f.paymentMethod} details`);
          return false;
        }
      }
    }
    return true;
  };

  const handleCreate = async () => {
    if (!form.supplierName.trim()) { toast.error("Supplier name is required"); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { toast.error("Valid amount is required"); return; }
    if (!validatePaymentMethodFields(form)) return;
    setSavingForm(true);
    try {
      await paymentVoucherService.createPaymentVoucher(toRequest(form));
      toast.success("Payment voucher created");
      setShowCreateDialog(false);
      await loadVouchers();
    } catch (err: any) {
      toast.error(err.message || "Failed to create payment voucher");
    } finally {
      setSavingForm(false);
    }
  };

  const handleEdit = async () => {
    if (!editingId) return;
    if (!form.supplierName.trim()) { toast.error("Supplier name is required"); return; }
    if (!form.amount || isNaN(parseFloat(form.amount))) { toast.error("Valid amount is required"); return; }
    if (!validatePaymentMethodFields(form)) return;
    setSavingForm(true);
    try {
      await paymentVoucherService.updatePaymentVoucher(editingId, toRequest(form));
      toast.success("Payment voucher updated");
      setShowEditDialog(false);
      if (selectedVoucher?.id === editingId) setIsDetailsOpen(false);
      await loadVouchers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update payment voucher");
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeletingVoucher(true);
    try {
      await paymentVoucherService.deletePaymentVoucher(deleteConfirmId);
      toast.success("Payment voucher deleted");
      if (selectedVoucher?.id === deleteConfirmId) setIsDetailsOpen(false);
      setDeleteConfirmId(null);
      await loadVouchers();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete payment voucher");
    } finally {
      setDeletingVoucher(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await paymentVoucherService.updateStatus(id, status);
      toast.success(`Status updated to ${status}`);
      if (selectedVoucher?.id === id) {
        setSelectedVoucher(prev => prev ? { ...prev, status: status as any } : null);
      }
      await loadVouchers();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const addBillRow = () => setForm(f => ({ ...f, bills: [...f.bills, { ...emptyBill }] }));
  const removeBillRow = (idx: number) => setForm(f => ({ ...f, bills: f.bills.filter((_, i) => i !== idx) }));
  const updateBill = (idx: number, key: keyof BillForm, val: string) =>
    setForm(f => ({ ...f, bills: f.bills.map((b, i) => i === idx ? { ...b, [key]: val } : b) }));

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length < 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const normalizeStatus = (status?: string) => {
    if (!status) return "Pending";
    const s = status.toLowerCase();
    if (s === "paid") return "Paid";
    if (s === "pending") return "Pending";
    if (s === "overdue") return "Overdue";
    if (s === "partial" || s === "partially paid" || s === "partially-paid") return "Partial";
    return status;
  };
  const getStatusBadge = (status: string) => {
    const normalized = normalizeStatus(status);
    const config: Record<string, { className: string; icon: any }> = {
      "Paid": { className: "bg-gymbios-success text-white", icon: CheckCircle },
      "Pending": { className: "bg-gymbios-warning text-white", icon: Clock },
      "Overdue": { className: "bg-gymbios-error text-white", icon: AlertTriangle },
      "Partial": { className: "bg-orange-500 text-white", icon: Clock },
    };
    const c = config[normalized] ?? { className: "bg-muted text-foreground", icon: Clock };
    const Icon = c.icon;
    return (
      <Badge className={cn("flex items-center space-x-1", c.className)}>
        <Icon className="h-3 w-3" />
        <span>{normalized}</span>
      </Badge>
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    const icons: Record<string, any> = {
      "Cash": Banknote,
      "Card": CreditCard,
      "Bank Transfer": Building2,
      "Cheque": FileText,
      "Digital Wallet": Wallet,
      "Mixed": Split,
    };
    return icons[method] || CreditCard;
  };

  const renderForm = () => (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Supplier / Vendor Name *</Label>
          <Popover open={supplierOpen} onOpenChange={setSupplierOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={supplierOpen}
                className="w-full justify-between font-normal bg-white"
              >
                {form.supplierName || "Select or enter supplier..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent style={{ width: 'var(--radix-popover-trigger-width)' }} className="p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search supplier..." 
                  value={supplierSearch}
                  onValueChange={setSupplierSearch}
                />
                <CommandList>
                  <CommandEmpty>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start font-normal px-2 py-1.5 h-auto"
                      onClick={() => {
                        setForm(f => ({ ...f, supplierName: supplierSearch }));
                        setSupplierOpen(false);
                      }}
                    >
                      Use "{supplierSearch}"
                    </Button>
                  </CommandEmpty>
                  <CommandGroup>
                    {suppliers.map((supplier) => (
                      <CommandItem
                        key={supplier.id}
                        value={supplier.name}
                        onSelect={(currentValue) => {
                          setForm(f => ({ ...f, supplierName: supplier.name }));
                          setSupplierOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            form.supplierName === supplier.name ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {supplier.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        <div className="space-y-2">
          <Label>Supplier Type</Label>
          <Select value={form.supplierType} onValueChange={v => setForm(f => ({ ...f, supplierType: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Supplier">Supplier</SelectItem>
              <SelectItem value="Vendor">Vendor</SelectItem>
              <SelectItem value="Employee">Employee</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payment Date *</Label>
          <Input
            type="date"
            value={form.paymentDate}
            onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Amount ({currencyCode}) *</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.amount}
            onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Payment Method</Label>
          <Select
            value={form.paymentMethod}
            onValueChange={v => { setForm(f => ({ ...f, paymentMethod: v })); setMethodDetails(emptyMethodDetails); }}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="Card">Card</SelectItem>
              <SelectItem value="Cheque">Cheque</SelectItem>
              <SelectItem value="Mixed">Mixed</SelectItem>
              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
              <SelectItem value="Digital Wallet">Digital Wallet</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Paid">Paid</SelectItem>
              <SelectItem value="Partial">Partial</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {form.paymentMethod === "Card" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Card Type *</Label>
            <Select value={methodDetails.cardType} onValueChange={v => setMethodDetails(d => ({ ...d, cardType: v }))}>
              <SelectTrigger><SelectValue placeholder="Select card type" /></SelectTrigger>
              <SelectContent>
                {CARD_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Reference (optional)</Label>
            <Input
              value={methodDetails.cardReference}
              onChange={e => setMethodDetails(d => ({ ...d, cardReference: e.target.value }))}
              placeholder="Transaction number"
            />
          </div>
        </div>
      )}

      {form.paymentMethod === "Digital Wallet" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Payment Type *</Label>
            <Select value={methodDetails.onlinePaymentType} onValueChange={v => setMethodDetails(d => ({ ...d, onlinePaymentType: v }))}>
              <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
              <SelectContent>
                {ONLINE_PAYMENT_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transaction / Reference ID *</Label>
            <Input
              value={methodDetails.onlineReference}
              onChange={e => setMethodDetails(d => ({ ...d, onlineReference: e.target.value }))}
              placeholder="Transaction ID"
            />
          </div>
          {methodDetails.onlinePaymentType === 'Other' && (
            <div className="col-span-2 space-y-2">
              <Label>Payment Provider Name *</Label>
              <Input
                value={methodDetails.onlineProviderName}
                onChange={e => setMethodDetails(d => ({ ...d, onlineProviderName: e.target.value }))}
                placeholder="Provider name"
              />
            </div>
          )}
        </div>
      )}

      {form.paymentMethod === "Mixed" && (
        <SplitPaymentFields
          total={parseFloat(form.amount) || 0}
          value={splitPayment}
          onChange={setSplitPayment}
          details={splitDetails}
          onDetailsChange={setSplitDetails}
          bankAccounts={bankAccounts}
          currencyCode={currencyCode}
        />
      )}

      <div className="space-y-2">
        <Label>Bill No</Label>
        <Input
          value={form.billNo}
          onChange={e => setForm(f => ({ ...f, billNo: e.target.value }))}
          placeholder="e.g. INV-2026-001"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Input
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Payment description"
        />
      </div>

      <div className="space-y-2">
        <Label>Bank Account</Label>
        {form.paymentMethod === "Bank Transfer" ? (
          <>
            <Select
              value={bankAccounts.find(a => a.name === form.bankAccount)?.id ? String(bankAccounts.find(a => a.name === form.bankAccount)!.id) : ""}
              onValueChange={id => {
                const account = bankAccounts.find(a => String(a.id) === id);
                setForm(f => ({ ...f, bankAccount: account?.name ?? f.bankAccount }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={bankAccounts.length ? 'Select bank account (ledger)' : 'No bank accounts in ledger'} />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map(account => (
                  <SelectItem key={account.id} value={String(account.id)}>{account.code} — {account.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Accounts pulled from the Chart of Accounts (Ledger).</p>
          </>
        ) : (
          <Input
            value={form.bankAccount}
            onChange={e => setForm(f => ({ ...f, bankAccount: e.target.value }))}
            placeholder="e.g. Emirates NBD Current"
          />
        )}
      </div>

      {form.paymentMethod === "Cheque" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Cheque Number</Label>
            <Input
              value={form.chequeNo}
              onChange={e => setForm(f => ({ ...f, chequeNo: e.target.value }))}
              placeholder="CHQ-000001"
            />
          </div>
          <div className="space-y-2">
            <Label>Cheque Date</Label>
            <Input
              type="date"
              value={form.chequeDate}
              onChange={e => setForm(f => ({ ...f, chequeDate: e.target.value }))}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label>Notes</Label>
        <Input
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          placeholder="Additional notes"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Bill Entries</Label>
          <Button type="button" variant="outline" size="sm" onClick={addBillRow}>
            <Plus className="h-4 w-4 mr-1" /> Add Bill
          </Button>
        </div>
        {form.bills.length > 0 && (
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="">
                <tr>
                  <th className="p-2 text-left">Bill No</th>
                  <th className="p-2 text-left">Bill Date</th>
                  <th className="p-2 text-right">Original</th>
                  <th className="p-2 text-right">Paid</th>
                  <th className="p-2 text-right">Remaining</th>
                  <th className="p-2 text-left">Due Date</th>
                  <th className="p-2 text-left">Status</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {form.bills.map((bill, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="p-1">
                      <Input value={bill.billNo} onChange={e => updateBill(idx, "billNo", e.target.value)} className="h-7 text-xs" />
                    </td>
                    <td className="p-1">
                      <Input type="date" value={bill.billDate} onChange={e => updateBill(idx, "billDate", e.target.value)} className="h-7 text-xs" />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={bill.originalAmount} onChange={e => updateBill(idx, "originalAmount", e.target.value)} className="h-7 text-xs text-right" />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={bill.paidAmount} onChange={e => updateBill(idx, "paidAmount", e.target.value)} className="h-7 text-xs text-right" />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={bill.remainingBalance} onChange={e => updateBill(idx, "remainingBalance", e.target.value)} className="h-7 text-xs text-right" />
                    </td>
                    <td className="p-1">
                      <Input type="date" value={bill.dueDate} onChange={e => updateBill(idx, "dueDate", e.target.value)} className="h-7 text-xs" />
                    </td>
                    <td className="p-1">
                      <Select value={bill.status} onValueChange={v => updateBill(idx, "status", v)}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Pending">Pending</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Partial">Partial</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeBillRow(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="w-full px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Payment Vouchers</h1>
              <p className="text-gray-600 mt-1">Create and manage supplier payments and voucher entries</p>
            </div>

            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm" onClick={() => setShowAdvancedFilter(!showAdvancedFilter)} className="btn-secondary shadow-sm hover:shadow-md transition-all">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filter
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="btn-secondary shadow-sm hover:shadow-md transition-all">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExport}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExport}>
                    <FileText className="h-4 w-4 mr-2" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button size="sm" className="btn-primary shadow-sm hover:shadow-md transition-all" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Payment
              </Button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="mt-4 flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by voucher number, supplier, bill number, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-focus"
              />
            </div>

            <div className="flex space-x-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-32 input-focus">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger className="w-40 input-focus">
                  <SelectValue placeholder="Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="digital-wallet">Digital Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Advanced Filter */}
          {showAdvancedFilter && (
            <div className="mt-4 p-4 bg-muted/30 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="form-label">Date Range</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left input-focus">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {selectedDateRange.from ? (
                          selectedDateRange.to ? (
                            `${selectedDateRange.from.toLocaleDateString()} - ${selectedDateRange.to.toLocaleDateString()}`
                          ) : selectedDateRange.from.toLocaleDateString()
                        ) : "Pick date range"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={selectedDateRange}
                        onSelect={(range) => setSelectedDateRange(range || {})}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="form-label">Amount Range</Label>
                  <div className="flex space-x-2">
                    <Input placeholder="Min" className="input-focus" />
                    <Input placeholder="Max" className="input-focus" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="form-label">Supplier Type</Label>
                  <Select>
                    <SelectTrigger className="input-focus">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="supplier">Supplier</SelectItem>
                      <SelectItem value="vendor">Vendor</SelectItem>
                      <SelectItem value="employee">Employee</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => {
                  setSearchQuery("");
                  setSelectedDateRange({});
                  setSelectedStatus("all");
                  setSelectedPaymentMethod("all");
                }}>
                  Clear Filters
                </Button>
                <Button className="btn-primary shadow-sm hover:shadow-md transition-all" onClick={() => setShowAdvancedFilter(false)}>Apply Filters</Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-6 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

          {/* Left Panel */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-gymbios-primary">Ledger Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {[
                  { id: "all", label: "All Payments", icon: Receipt, count: allVouchers.length },
                  { id: "pending", label: "Pending Payments", icon: Clock, count: allVouchers.filter(v => v.status === "Pending" || v.status === "Partial").length },
                  { id: "paid", label: "Paid", icon: CheckCircle, count: allVouchers.filter(v => v.status === "Paid").length },
                  { id: "overdue", label: "Overdue", icon: AlertTriangle, count: allVouchers.filter(v => v.status === "Overdue").length },
                  { id: "supplier", label: "Supplier-wise Ledger", icon: Building2, count: allVouchers.filter(v => v.supplierType === "Supplier").length },
                ].map((category) => {
                  const Icon = category.icon;
                  return (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "ghost"}
                      className={cn("w-full justify-start", selectedCategory === category.id ? "btn-primary" : "hover:bg-muted")}
                      onClick={() => setSelectedCategory(category.id)}
                    >
                      <Icon className="h-4 w-4 mr-3" />
                      <span className="flex-1 text-left">{category.label}</span>
                      <Badge variant="secondary" className="ml-2">{category.count}</Badge>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4">
              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gymbios-success/10 p-3 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-gymbios-success" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground whitespace-nowrap">Paid This Month</p>
                      <p className="font-bold text-lg"><CurrencyGlyph /> {summaryData.totalPaidThisMonth.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gymbios-warning/10 p-3 rounded-lg">
                      <Clock className="h-5 w-5 text-gymbios-warning" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-amber-700">Total Pending</p>
                      <p className="font-bold text-lg"><CurrencyGlyph /> {summaryData.totalPending.toFixed(2)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gymbios-error/10 p-3 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-gymbios-error" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground whitespace-nowrap">Overdue Payments</p>
                      <p className="font-bold text-lg">{summaryData.overdueCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 p-3 rounded-lg">
                      <CalendarBig className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground whitespace-nowrap">Upcoming (7 days)</p>
                      <p className="font-bold text-lg">{summaryData.upcomingPayments}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Table */}
          <div className="lg:col-span-3">
            <Card className="bg-white border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-gymbios-primary">
                    Payment Vouchers ({filteredAndSortedVouchers.length})
                  </CardTitle>

                  <div className="flex items-center space-x-2">
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Show:</Label>
                    <Select value={itemsPerPage.toString()} onValueChange={(v) => setItemsPerPage(parseInt(v))}>
                      <SelectTrigger className="w-20 input-focus"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto rounded-lg bg-white">
                  <Table className="min-w-full">
                    <TableHeader className="bg-slate-50">
                      <TableRow className="">
                        <TableHead className="table-header cursor-pointer hover:bg-slate-100" onClick={() => handleSort("voucherNo")}>
                          <div className="flex items-center space-x-2"><span>Voucher No</span><ArrowUpDown className="h-4 w-4" /></div>
                        </TableHead>
                        <TableHead className="table-header cursor-pointer hover:bg-slate-100" onClick={() => handleSort("supplierName")}>
                          <div className="flex items-center space-x-2"><span>Supplier/Vendor</span><ArrowUpDown className="h-4 w-4" /></div>
                        </TableHead>
                        <TableHead className="table-header">Bill No</TableHead>
                        <TableHead className="table-header cursor-pointer hover:bg-slate-100" onClick={() => handleSort("paymentDate")}>
                          <div className="flex items-center space-x-2"><span>Payment Date</span><ArrowUpDown className="h-4 w-4" /></div>
                        </TableHead>
                        <TableHead className="table-header text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort("amount")}>
                          <div className="flex items-center justify-end space-x-2"><span>Amount</span><ArrowUpDown className="h-4 w-4" /></div>
                        </TableHead>
                        <TableHead className="table-header">Payment Method</TableHead>
                        <TableHead className="table-header">Status</TableHead>
                        <TableHead className="table-header">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingVouchers ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            Loading payment vouchers...
                          </TableCell>
                        </TableRow>
                      ) : paginatedVouchers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No payment vouchers found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedVouchers.map((voucher, index) => {
                          const PaymentIcon = getPaymentMethodIcon(voucher.paymentMethod);
                          return (
                            <TableRow
                              key={voucher.id}
                              className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                              onClick={() => handleViewDetails(voucher)}
                            >
                              <TableCell className="font-medium">
                                <Button variant="link" className="p-0 h-auto font-medium text-gymbios-primary">
                                  {voucher.voucherNo}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <div className="bg-muted p-2 rounded">
                                    <Users className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="font-medium">{voucher.supplierName}</p>
                                    <p className="text-sm text-muted-foreground whitespace-nowrap">{voucher.supplierType}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {voucher.billNo ? (
                                  <Button variant="link" className="p-0 h-auto text-gymbios-secondary">{voucher.billNo}</Button>
                                ) : (
                                  <span className="text-gray-600 mt-1">-</span>
                                )}
                              </TableCell>
                              <TableCell>{formatDate(voucher.paymentDate)}</TableCell>
                              <TableCell className="text-right font-semibold text-gymbios-primary">
                                <CurrencyGlyph /> {voucher.amount.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <PaymentIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm">{voucher.paymentMethod}</span>
                                </div>
                              </TableCell>
                              <TableCell>{getStatusBadge(voucher.status)}</TableCell>
                              <TableCell>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetails(voucher); }}>
                                      <Eye className="h-4 w-4 mr-2" /> View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(voucher); }}>
                                      <Edit className="h-4 w-4 mr-2" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusUpdate(voucher.id, "Paid"); }}>
                                      <CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(voucher.id); }}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <p className="text-sm text-muted-foreground whitespace-nowrap">
                    {filteredAndSortedVouchers.length === 0
                      ? "No results"
                      : `Showing ${((currentPage - 1) * itemsPerPage) + 1} to ${Math.min(currentPage * itemsPerPage, filteredAndSortedVouchers.length)} of ${filteredAndSortedVouchers.length} results`}
                  </p>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className={currentPage === page ? "btn-primary" : ""}
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:w-[680px] overflow-y-auto bg-gray-50 p-0">
          {selectedVoucher && (
            <>
              <div className="px-6 py-5 bg-white border-b">
                <SheetHeader>
                  <SheetTitle className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-50 p-2 rounded-lg">
                        <FileText className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">{selectedVoucher.voucherNo}</div>
                        <div className="text-sm text-gray-500">{selectedVoucher.supplierName}</div>
                      </div>
                    </div>
                    {getStatusBadge(selectedVoucher.status)}
                  </SheetTitle>
                </SheetHeader>
              </div>

              <div className="px-6 py-6 space-y-6">
                <Card className="bg-white border-0 shadow-sm">
                  <CardHeader><CardTitle className="text-lg">Voucher Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="form-label">Payment Date</Label>
                        <p className="font-medium">{formatDate(selectedVoucher.paymentDate)}</p>
                      </div>
                      <div>
                        <Label className="form-label">Amount</Label>
                        <p className="font-bold text-lg text-gymbios-primary"><CurrencyGlyph /> {selectedVoucher.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <Label className="form-label">Payment Method</Label>
                        <div className="flex items-center space-x-2">
                          {(() => {
                            const Icon = getPaymentMethodIcon(selectedVoucher.paymentMethod);
                            return <Icon className="h-4 w-4" />;
                          })()}
                          <span>{selectedVoucher.paymentMethod}</span>
                        </div>
                      </div>
                      <div>
                        <Label className="form-label">Supplier Type</Label>
                        <p>{selectedVoucher.supplierType}</p>
                      </div>
                    </div>

                    {selectedVoucher.bankAccount && (
                      <div>
                        <Label className="form-label">Bank Account</Label>
                        <p>{selectedVoucher.bankAccount}</p>
                      </div>
                    )}

                    {selectedVoucher.chequeNo && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="form-label">Cheque Number</Label>
                          <p>{selectedVoucher.chequeNo}</p>
                        </div>
                        <div>
                          <Label className="form-label">Cheque Date</Label>
                          <p>{formatDate(selectedVoucher.chequeDate)}</p>
                        </div>
                      </div>
                    )}

                    <div>
                      <Label className="form-label">Description</Label>
                      <p>{selectedVoucher.description || "-"}</p>
                    </div>

                    {selectedVoucher.notes && (
                      <div>
                        <Label className="form-label">Notes</Label>
                        <p>{selectedVoucher.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {selectedVoucher.bills && selectedVoucher.bills.length > 0 && (
                  <Card className="bg-white border-0 shadow-sm">
                    <CardHeader><CardTitle className="text-lg">Bill Breakdown</CardTitle></CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedVoucher.bills.map((bill) => (
                          <div key={bill.id} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-medium text-gymbios-primary">{bill.billNo}</p>
                                <p className="text-sm text-muted-foreground whitespace-nowrap">Due: {formatDate(bill.dueDate)}</p>
                              </div>
                              {getStatusBadge(bill.status)}
                            </div>
                            <div className="grid grid-cols-3 gap-4 text-sm">
                              <div>
                                <Label className="text-xs text-muted-foreground">Original Amount</Label>
                                <p className="font-medium"><CurrencyGlyph /> {bill.originalAmount.toFixed(2)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Paid Amount</Label>
                                <p className="font-medium text-gymbios-success"><CurrencyGlyph /> {bill.paidAmount.toFixed(2)}</p>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Remaining</Label>
                                <p className="font-medium text-gymbios-warning"><CurrencyGlyph /> {bill.remainingBalance.toFixed(2)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex flex-col space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Button className="btn-primary" onClick={() => { setIsDetailsOpen(false); openEdit(selectedVoucher); }}>
                      <Edit className="h-4 w-4 mr-2" /> Edit Voucher
                    </Button>
                    <Button variant="outline" onClick={() => handleStatusUpdate(selectedVoucher.id, "Paid")}>
                      <CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={() => handleStatusUpdate(selectedVoucher.id, "Partial")}>
                      <Clock className="h-4 w-4 mr-2" /> Mark Partial
                    </Button>
                    <Button
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => { setIsDetailsOpen(false); setDeleteConfirmId(selectedVoucher.id); }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Footer Summary */}
      <div className="mt-6">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between rounded-2xl bg-white/20 backdrop-blur-md shadow-lg px-6 py-4 gap-6">
            <div className="flex items-center gap-12 flex-wrap">
              <div className="text-center space-y-2 min-w-[150px]">
                <p className="text-xs uppercase tracking-wide text-emerald-700">Total Paid</p>
                <p className="font-bold text-emerald-700 text-lg">
                  <CurrencyGlyph /> {allVouchers.filter(v => v.status === "Paid").reduce((sum, v) => sum + v.amount, 0).toFixed(2)}
                </p>
              </div>
              <div className="text-center space-y-2 min-w-[150px]">
                <p className="text-xs uppercase tracking-wide text-amber-700">Total Pending</p>
                <p className="font-bold text-amber-700 text-lg">
                  <CurrencyGlyph /> {summaryData.totalPending.toFixed(2)}
                </p>
              </div>
              <div className="text-center space-y-2 min-w-[150px]">
                <p className="text-xs uppercase tracking-wide text-blue-700">Total Amount</p>
                <p className="font-bold text-blue-700 text-lg">
                  <CurrencyGlyph /> {allVouchers.reduce((sum, v) => sum + v.amount, 0).toFixed(2)}
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground whitespace-nowrap">Last updated: {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Payment Voucher</DialogTitle>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={savingForm}>
              Cancel
            </Button>
            <Button className="btn-primary shadow-sm hover:shadow-md transition-all" onClick={handleCreate} disabled={savingForm}>
              {savingForm ? "Saving..." : "Create Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payment Voucher</DialogTitle>
          </DialogHeader>
          {renderForm()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={savingForm}>
              Cancel
            </Button>
            <Button className="btn-primary shadow-sm hover:shadow-md transition-all" onClick={handleEdit} disabled={savingForm}>
              {savingForm ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Payment Voucher</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 mt-1">
            Are you sure you want to delete this payment voucher? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deletingVoucher}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletingVoucher}>
              {deletingVoucher ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
