import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useCurrency, CurrencyGlyph } from "../utils/currency";
import {
  bankReconciliationService,
  BankReconciliation as ApiReconciliation,
  BankReconciliationCreateRequest,
  BankStatementLine,
  MatchCandidate,
  AutoMatchSuggestion,
} from "../utils/supabase/bank-reconciliation-service";
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
import { Separator } from "../components/ui/separator";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import {
  CalendarIcon,
  Search,
  Download,
  FileText,
  Eye,
  Edit,
  Trash2,
  MoreHorizontal,
  Building2,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  RefreshCcw,
  Landmark,
  FileSpreadsheet,
  Calculator,
  Zap,
  SplitSquareHorizontal,
  Plus,
  Loader2,
  Info,
} from "lucide-react";
import { cn } from "../components/ui/utils";

interface BankTransaction {
  id: string;
  lineId: number;
  date: string;
  description: string;
  reference: string;
  bankAmount: number;
  ledgerAmount: number;
  status: "Matched" | "Unmatched" | "Pending" | "Partial";
  category: string;
  bankReference?: string;
  ledgerReference?: string;
  notes?: string;
  matchedBy?: string;
  matchedDate?: string;
  type: "Credit" | "Debit";
}

interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  bank: string;
}

interface LineForm {
  id?: number;
  transactionDate: string;
  description: string;
  amount: string;
  type: string;
  reference: string;
}

interface ReconciliationForm {
  bankAccountName: string;
  statementDate: string;
  openingBalance: string;
  closingBalance: string;
  notes: string;
  lines: LineForm[];
}

const PREDEFINED_ACCOUNTS: BankAccount[] = [
  { id: "BANK001", name: "Emirates NBD Current", accountNumber: "****-4521", bank: "Emirates NBD" },
  { id: "BANK002", name: "ADCB Business Account", accountNumber: "****-8967", bank: "ADCB" },
  { id: "BANK003", name: "FAB Operational Account", accountNumber: "****-1234", bank: "FAB" },
];

const emptyLine: LineForm = {
  transactionDate: new Date().toISOString().split("T")[0],
  description: "",
  amount: "",
  type: "DEBIT",
  reference: "",
};

const emptyForm: ReconciliationForm = {
  bankAccountName: PREDEFINED_ACCOUNTS[0].name,
  statementDate: new Date().toISOString().split("T")[0],
  openingBalance: "",
  closingBalance: "",
  notes: "",
  lines: [],
};

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function BankReconciliation() {
  const { currencyCode } = useCurrency();
  const [selectedAccount, setSelectedAccount] = useState<BankAccount>(PREDEFINED_ACCOUNTS[0]);
  const [allReconciliations, setAllReconciliations] = useState<ApiReconciliation[]>([]);
  const [currentReconciliation, setCurrentReconciliation] = useState<ApiReconciliation | null>(null);
  const [allTransactions, setAllTransactions] = useState<BankTransaction[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [dateFilter, setDateFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [newNote, setNewNote] = useState<string>("");

  // Manual match picker (real posted vouchers only — never free text)
  const [showMatchPicker, setShowMatchPicker] = useState(false);
  const [matchCandidates, setMatchCandidates] = useState<MatchCandidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [matchingInProgress, setMatchingInProgress] = useState(false);

  // Auto-match review
  const [showAutoMatchDialog, setShowAutoMatchDialog] = useState(false);
  const [autoMatchSuggestions, setAutoMatchSuggestions] = useState<AutoMatchSuggestion[]>([]);
  const [autoMatchPicks, setAutoMatchPicks] = useState<Record<number, number>>({}); // lineId -> chosen journalVoucherId
  const [loadingAutoMatch, setLoadingAutoMatch] = useState(false);
  const [applyingAutoMatch, setApplyingAutoMatch] = useState(false);

  // Create/Edit dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ReconciliationForm>(emptyForm);
  const [savingForm, setSavingForm] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deletingRec, setDeletingRec] = useState(false);
  const [completingRec, setCompletingRec] = useState(false);

  const mapLinesToTransactions = (rec: ApiReconciliation): BankTransaction[] =>
    rec.lines.map(line => ({
      id: String(line.id),
      lineId: line.id,
      date: line.transactionDate,
      description: line.description,
      reference: line.reference,
      bankAmount: line.amount,
      ledgerAmount: line.isMatched ? line.amount : 0,
      status: line.isMatched ? "Matched" : "Unmatched",
      category: line.type === "CREDIT" ? "Revenue" : "Expenses",
      bankReference: line.reference,
      ledgerReference: line.matchedVoucherNo ?? undefined,
      type: line.type === "CREDIT" ? "Credit" : "Debit",
      matchedBy: line.matchedVoucherNo ? "System" : undefined,
      matchedDate: line.isMatched ? line.transactionDate : undefined,
    }));

  const loadReconciliations = useCallback(async () => {
    setLoadingData(true);
    try {
      const data = await bankReconciliationService.getAll(selectedAccount.name);
      setAllReconciliations(data);
      if (data.length > 0) {
        const rec = data[0];
        setCurrentReconciliation(rec);
        setAllTransactions(mapLinesToTransactions(rec));
      } else {
        setCurrentReconciliation(null);
        setAllTransactions([]);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load reconciliations");
    } finally {
      setLoadingData(false);
    }
  }, [selectedAccount.name]);

  useEffect(() => { loadReconciliations(); }, [loadReconciliations]);

  const filteredAndSortedTransactions = useMemo(() => {
    let filtered = allTransactions.filter(transaction => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (
          !transaction.description.toLowerCase().includes(q) &&
          !transaction.reference.toLowerCase().includes(q) &&
          !(transaction.bankReference?.toLowerCase().includes(q)) &&
          !(transaction.ledgerReference?.toLowerCase().includes(q))
        ) return false;
      }

      if (statusFilter !== "all" && transaction.status.toLowerCase() !== statusFilter) return false;

      if (dateFilter !== "all") {
        const [y, m, d] = transaction.date.split("T")[0].split("-").map(Number);
        const txDate = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (dateFilter === "today") {
          const todayStr = today.toDateString();
          if (txDate.toDateString() !== todayStr) return false;
        } else if (dateFilter === "last7days") {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(today.getDate() - 7);
          if (txDate < sevenDaysAgo) return false;
        } else if (dateFilter === "last30days") {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(today.getDate() - 30);
          if (txDate < thirtyDaysAgo) return false;
        } else if (dateFilter === "custom" && (customDateRange.from || customDateRange.to)) {
          if (customDateRange.from && txDate < customDateRange.from) return false;
          if (customDateRange.to && txDate > customDateRange.to) return false;
        }
      }

      return true;
    });

    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof BankTransaction];
      let bVal: any = b[sortField as keyof BankTransaction];
      if (sortField === "bankAmount" || sortField === "ledgerAmount") {
        aVal = Number(aVal); bVal = Number(bVal);
      } else if (sortField === "date") {
        aVal = new Date(aVal); bVal = new Date(bVal);
      } else {
        aVal = String(aVal ?? "").toLowerCase(); bVal = String(bVal ?? "").toLowerCase();
      }
      return sortDirection === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });

    return filtered;
  }, [allTransactions, searchQuery, statusFilter, dateFilter, customDateRange, sortField, sortDirection]);

  const reconciliationSummary = useMemo(() => {
    return filteredAndSortedTransactions.reduce((s, t) => ({
      totalBankAmount: s.totalBankAmount + t.bankAmount,
      totalLedgerAmount: s.totalLedgerAmount + t.ledgerAmount,
      difference: (s.totalBankAmount + t.bankAmount) - (s.totalLedgerAmount + t.ledgerAmount),
      matchedTransactions: s.matchedTransactions + (t.status === "Matched" ? 1 : 0),
      unmatchedTransactions: s.unmatchedTransactions + (t.status === "Unmatched" ? 1 : 0),
      pendingTransactions: s.pendingTransactions + (t.status === "Pending" || t.status === "Partial" ? 1 : 0),
    }), { totalBankAmount: 0, totalLedgerAmount: 0, difference: 0, matchedTransactions: 0, unmatchedTransactions: 0, pendingTransactions: 0 });
  }, [filteredAndSortedTransactions]);

  const totalPages = Math.ceil(filteredAndSortedTransactions.length / itemsPerPage);
  const paginatedTransactions = filteredAndSortedTransactions.slice(
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

  const handleViewTransaction = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setShowMatchPicker(false);
    setMatchCandidates([]);
    setSelectedCandidateId(null);
    setCandidateSearch("");
    setNewNote("");
    setIsDetailsOpen(true);
  };

  const loadMatchCandidates = async (transaction: BankTransaction) => {
    if (!currentReconciliation) return;
    setShowMatchPicker(true);
    setSelectedCandidateId(null);
    setCandidateSearch("");
    setLoadingCandidates(true);
    try {
      const candidates = await bankReconciliationService.getMatchCandidates(currentReconciliation.id, transaction.lineId);
      setMatchCandidates(candidates);
    } catch (e: any) {
      toast.error(e.message || "Failed to load matching ledger entries");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleMatchTransaction = async (transaction: BankTransaction, journalVoucherId: number) => {
    if (!currentReconciliation) { toast.error("No active reconciliation"); return; }
    setMatchingInProgress(true);
    try {
      const updated = await bankReconciliationService.matchLine(currentReconciliation.id, transaction.lineId, journalVoucherId);
      toast.success("Transaction matched successfully");
      setCurrentReconciliation(updated);
      setAllTransactions(mapLinesToTransactions(updated));
      setShowMatchPicker(false);
      setSelectedCandidateId(null);
      // Update selected transaction in details panel
      const updatedLine = updated.lines.find(l => l.id === transaction.lineId);
      if (updatedLine && selectedTransaction?.lineId === transaction.lineId) {
        setSelectedTransaction({
          ...selectedTransaction,
          status: "Matched",
          ledgerReference: updatedLine.matchedVoucherNo ?? undefined,
          matchedBy: "System",
          matchedDate: updatedLine.transactionDate,
        });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to match transaction");
    } finally {
      setMatchingInProgress(false);
    }
  };

  const handleUnmatchTransaction = async (transaction: BankTransaction) => {
    if (!currentReconciliation) { toast.error("No active reconciliation"); return; }
    try {
      const updated = await bankReconciliationService.unmatchLine(currentReconciliation.id, transaction.lineId);
      toast.success("Transaction unmatched");
      setCurrentReconciliation(updated);
      setAllTransactions(mapLinesToTransactions(updated));
      if (selectedTransaction?.lineId === transaction.lineId) {
        setSelectedTransaction({ ...selectedTransaction, status: "Unmatched", ledgerReference: undefined, matchedBy: undefined, matchedDate: undefined });
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to unmatch transaction");
    }
  };

  const handleAutoMatch = async () => {
    if (!currentReconciliation) { toast.error("No active reconciliation"); return; }
    setLoadingAutoMatch(true);
    try {
      const suggestions = await bankReconciliationService.getAutoMatchSuggestions(currentReconciliation.id);
      if (suggestions.length === 0) {
        toast.info("No candidate matches found — all remaining lines need to be recorded in the ledger first, or matched manually.");
        return;
      }
      // Pre-select the single candidate for every HIGH-confidence suggestion.
      const picks: Record<number, number> = {};
      suggestions.forEach(s => {
        if (s.confidence === "HIGH" && s.candidates.length === 1) {
          picks[s.lineId] = s.candidates[0].journalVoucherId;
        }
      });
      setAutoMatchPicks(picks);
      setAutoMatchSuggestions(suggestions);
      setShowAutoMatchDialog(true);
    } catch (e: any) {
      toast.error(e.message || "Failed to compute auto-match suggestions");
    } finally {
      setLoadingAutoMatch(false);
    }
  };

  const handleApplyAutoMatch = async (onlyHighConfidence: boolean) => {
    if (!currentReconciliation) return;
    const toApply = autoMatchSuggestions.filter(s => {
      const picked = autoMatchPicks[s.lineId];
      if (!picked) return false;
      return onlyHighConfidence ? s.confidence === "HIGH" : true;
    });
    if (toApply.length === 0) {
      toast.error("Nothing selected to apply");
      return;
    }
    setApplyingAutoMatch(true);
    let succeeded = 0;
    let failed = 0;
    for (const s of toApply) {
      try {
        await bankReconciliationService.matchLine(currentReconciliation.id, s.lineId, autoMatchPicks[s.lineId]);
        succeeded++;
      } catch {
        failed++;
      }
    }
    setApplyingAutoMatch(false);
    if (succeeded > 0) toast.success(`Matched ${succeeded} transaction${succeeded === 1 ? "" : "s"}`);
    if (failed > 0) toast.error(`${failed} match${failed === 1 ? "" : "es"} failed — they may already be matched elsewhere`);
    setShowAutoMatchDialog(false);
    setAutoMatchSuggestions([]);
    setAutoMatchPicks({});
    await loadReconciliations();
  };

  const handleExport = (format: string) => {
    toast.success(`Exporting reconciliation as ${format.toUpperCase()}`);
  };

  const handleFinalizeReconciliation = async () => {
    if (!currentReconciliation) { toast.error("No active reconciliation"); return; }
    if (currentReconciliation.unmatchedCount > 0) {
      toast.error(`Cannot finalize — ${currentReconciliation.unmatchedCount} unmatched transactions remain`);
      return;
    }
    setCompletingRec(true);
    try {
      const updated = await bankReconciliationService.complete(currentReconciliation.id);
      toast.success("Reconciliation finalized successfully");
      setCurrentReconciliation(updated);
      await loadReconciliations();
    } catch (e: any) {
      toast.error(e.message || "Failed to finalize reconciliation");
    } finally {
      setCompletingRec(false);
    }
  };

  const openCreate = () => {
    setForm({ ...emptyForm, bankAccountName: selectedAccount.name });
    setShowCreateDialog(true);
  };

  const openEdit = (rec: ApiReconciliation) => {
    setEditingId(rec.id);
    setForm({
      bankAccountName: rec.bankAccountName,
      statementDate: rec.statementDate.split("T")[0],
      openingBalance: String(rec.openingBalance),
      closingBalance: String(rec.closingBalance),
      notes: rec.notes ?? "",
      lines: rec.lines.map(l => ({
        id: l.id,
        transactionDate: l.transactionDate.split("T")[0],
        description: l.description,
        amount: String(l.amount),
        type: l.type,
        reference: l.reference,
      })),
    });
    setShowEditDialog(true);
  };

  const toRequest = (f: ReconciliationForm): BankReconciliationCreateRequest => ({
    bankAccountName: f.bankAccountName,
    statementDate: f.statementDate,
    openingBalance: parseFloat(f.openingBalance) || 0,
    closingBalance: parseFloat(f.closingBalance) || 0,
    notes: f.notes || undefined,
    // Existing lines keep their id so the backend preserves their match state;
    // lines without an id are newly added and will be inserted unmatched.
    lines: f.lines.map(l => ({
      id: l.id,
      transactionDate: l.transactionDate,
      description: l.description,
      amount: parseFloat(l.amount) || 0,
      type: l.type,
      reference: l.reference,
    } as Partial<BankStatementLine>)),
  });

  const handleCreate = async () => {
    if (!form.bankAccountName.trim()) { toast.error("Bank account name is required"); return; }
    if (!form.statementDate) { toast.error("Statement date is required"); return; }
    setSavingForm(true);
    try {
      const created = await bankReconciliationService.create(toRequest(form));
      toast.success("Reconciliation created");
      setShowCreateDialog(false);
      setCurrentReconciliation(created);
      setAllTransactions(mapLinesToTransactions(created));
      await loadReconciliations();
    } catch (err: any) {
      toast.error(err.message || "Failed to create reconciliation");
    } finally {
      setSavingForm(false);
    }
  };

  const handleEdit = async () => {
    if (!editingId) return;
    setSavingForm(true);
    try {
      const updated = await bankReconciliationService.update(editingId, toRequest(form));
      toast.success("Reconciliation updated");
      setShowEditDialog(false);
      setCurrentReconciliation(updated);
      setAllTransactions(mapLinesToTransactions(updated));
      await loadReconciliations();
    } catch (err: any) {
      toast.error(err.message || "Failed to update reconciliation");
    } finally {
      setSavingForm(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    setDeletingRec(true);
    try {
      await bankReconciliationService.delete(deleteConfirmId);
      toast.success("Reconciliation deleted");
      setDeleteConfirmId(null);
      await loadReconciliations();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete reconciliation");
    } finally {
      setDeletingRec(false);
    }
  };

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { ...emptyLine }] }));
  const removeLine = (idx: number) => setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }));
  const updateLine = (idx: number, key: keyof LineForm, val: string) =>
    setForm(f => ({ ...f, lines: f.lines.map((l, i) => i === idx ? { ...l, [key]: val } : l) }));

  const getStatusBadge = (status: string) => {
    const cfg: Record<string, { className: string; icon: any }> = {
      "Matched": { className: "bg-green-100 text-green-800 border-green-200", icon: CheckCircle },
      "Unmatched": { className: "bg-red-100 text-red-800 border-red-200", icon: AlertTriangle },
      "Pending": { className: "bg-orange-100 text-orange-800 border-orange-200", icon: Clock },
      "Partial": { className: "bg-yellow-100 text-yellow-800 border-yellow-200", icon: Clock },
    };
    const c = cfg[status] ?? { className: "bg-gray-100 text-gray-800 border-gray-200", icon: Clock };
    const Icon = c.icon;
    return (
      <Badge className={cn("flex items-center space-x-1.5 px-2.5 py-1 border font-medium", c.className)}>
        <Icon className="h-3 w-3" />
        <span className="text-xs">{status}</span>
      </Badge>
    );
  };

  const canFinalize = currentReconciliation
    ? currentReconciliation.unmatchedCount === 0 && currentReconciliation.status !== "COMPLETED"
    : false;

  const renderFormContent = () => (
    <div className="space-y-4 py-2">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Bank Account Name *</Label>
          <Select value={form.bankAccountName} onValueChange={v => setForm(f => ({ ...f, bankAccountName: v }))}>
            <SelectTrigger className="border-0 bg-white focus:ring-2 focus:ring-gymbios-primary/20"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PREDEFINED_ACCOUNTS.map(a => (
                <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Statement Date *</Label>
          <Input type="date" value={form.statementDate} onChange={e => setForm(f => ({ ...f, statementDate: e.target.value }))} className="border-0 bg-white focus:ring-2 focus:ring-gymbios-primary/20" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Opening Balance</Label>
          <Input type="number" step="0.01" value={form.openingBalance} onChange={e => setForm(f => ({ ...f, openingBalance: e.target.value }))} placeholder="0.00" className="border-0 bg-white focus:ring-2 focus:ring-gymbios-primary/20" />
        </div>
        <div className="space-y-2">
          <Label>Closing Balance (Bank)</Label>
          <Input type="number" step="0.01" value={form.closingBalance} onChange={e => setForm(f => ({ ...f, closingBalance: e.target.value }))} placeholder="0.00" className="border-0 bg-white focus:ring-2 focus:ring-gymbios-primary/20" />
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <span>
          Ledger Balance is computed automatically from posted journal entries as of the statement
          date — it can't be typed in, so the comparison to your bank statement is always accurate.
        </span>
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" className="border-0 bg-white focus:ring-2 focus:ring-gymbios-primary/20" />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-semibold">Bank Statement Lines</Label>
          <Button type="button" variant="outline" size="sm" onClick={addLine}>
            <Plus className="h-4 w-4 mr-1" /> Add Line
          </Button>
        </div>
        {form.lines.length > 0 && (
          <div className="rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-2 text-left">Date</th>
                  <th className="p-2 text-left">Description</th>
                  <th className="p-2 text-right">Amount</th>
                  <th className="p-2 text-left">Type</th>
                  <th className="p-2 text-left">Reference</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {form.lines.map((line, idx) => (
                  <tr key={idx} className="border-t border-gray-100">
                    <td className="p-1">
                      <Input type="date" value={line.transactionDate} onChange={e => updateLine(idx, "transactionDate", e.target.value)} className="h-7 text-xs border-0 bg-white focus:ring-1 focus:ring-gymbios-primary/20" />
                    </td>
                    <td className="p-1">
                      <Input value={line.description} onChange={e => updateLine(idx, "description", e.target.value)} className="h-7 text-xs border-0 bg-white focus:ring-1 focus:ring-gymbios-primary/20" placeholder="Description" />
                    </td>
                    <td className="p-1">
                      <Input type="number" step="0.01" value={line.amount} onChange={e => updateLine(idx, "amount", e.target.value)} className="h-7 text-xs text-right border-0 bg-white focus:ring-1 focus:ring-gymbios-primary/20" />
                    </td>
                    <td className="p-1">
                      <Select value={line.type} onValueChange={v => updateLine(idx, "type", v)}>
                        <SelectTrigger className="h-7 text-xs border-0 bg-white focus:ring-1 focus:ring-gymbios-primary/20"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DEBIT">DEBIT</SelectItem>
                          <SelectItem value="CREDIT">CREDIT</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <Input value={line.reference} onChange={e => updateLine(idx, "reference", e.target.value)} className="h-7 text-xs border-0 bg-white focus:ring-1 focus:ring-gymbios-primary/20" placeholder="Ref no." />
                    </td>
                    <td className="p-1">
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => removeLine(idx)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {form.lines.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">
            No lines added yet. Click "Add Line" to add bank statement entries.
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-white shadow-sm">
        <div className="w-full px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Bank Reconciliation</h1>
              <p className="text-gray-600 mt-1">Match bank statements with accounting ledger entries for accurate financial records</p>
            </div>

            <div className="flex items-center space-x-3">
              <Button
                onClick={handleAutoMatch}
                disabled={loadingAutoMatch || !currentReconciliation}
                className="bg-gymbios-secondary hover:bg-gymbios-secondary/90 text-white"
              >
                {loadingAutoMatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
                Auto-Match
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-gymbios-primary text-gymbios-primary hover:bg-gymbios-primary hover:text-white">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" /> Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("pdf")}>
                    <FileText className="h-4 w-4 mr-2" /> Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button className="btn-primary" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                New Reconciliation
              </Button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gymbios-primary">Date Filter</Label>
              <div className="flex items-center space-x-2">
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger className="flex-1 border-0 bg-white focus:ring-2 focus:ring-gymbios-primary/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="last7days">Last 7 Days</SelectItem>
                    <SelectItem value="last30days">Last 30 Days</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>

                {dateFilter === "custom" && (
                  <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="border-gray-300 hover:border-gymbios-primary">
                        <CalendarIcon className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={customDateRange}
                        onSelect={(range) => setCustomDateRange(range || {})}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gymbios-primary">Bank Account</Label>
              <Select value={selectedAccount.id} onValueChange={(value) => {
                const account = PREDEFINED_ACCOUNTS.find(acc => acc.id === value);
                if (account) setSelectedAccount(account);
              }}>
                <SelectTrigger className="border-0 bg-white focus:ring-2 focus:ring-gymbios-primary/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_ACCOUNTS.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} • {account.accountNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gymbios-primary">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 border-0 bg-white focus:ring-2 focus:ring-gymbios-primary/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gymbios-primary">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="border-0 bg-white focus:ring-2 focus:ring-gymbios-primary/20">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="unmatched">Unmatched</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Current Reconciliation Info */}
          {currentReconciliation && (
            <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-4 text-sm">
                <span className="font-medium text-blue-900">
                  Active: {currentReconciliation.bankAccountName}
                </span>
                <span className="text-blue-700">
                  Statement: {formatDate(currentReconciliation.statementDate)}
                </span>
                <Badge className={cn(
                  "text-xs",
                  currentReconciliation.status === "COMPLETED" ? "bg-green-100 text-green-800" :
                  currentReconciliation.status === "IN_PROGRESS" ? "bg-orange-100 text-orange-800" :
                  "bg-blue-100 text-blue-800"
                )}>
                  {currentReconciliation.status}
                </Badge>
                <span className="text-blue-700">
                  {currentReconciliation.unmatchedCount} unmatched
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(currentReconciliation)}>
                  <Edit className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteConfirmId(currentReconciliation.id)}>
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
                {allReconciliations.length > 1 && (
                  <Select
                    value={String(currentReconciliation.id)}
                    onValueChange={v => {
                      const rec = allReconciliations.find(r => r.id === parseInt(v));
                      if (rec) {
                        setCurrentReconciliation(rec);
                        setAllTransactions(mapLinesToTransactions(rec));
                      }
                    }}
                  >
                    <SelectTrigger className="w-auto border-blue-300 text-blue-800 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allReconciliations.map(r => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {formatDate(r.statementDate)} — {r.status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="w-full px-6 py-6">
        {/* Top Summary Panel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-primary">Bank Balance</CardTitle>
              <div className="bg-blue-50 p-2 rounded-lg">
                <Landmark className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                <CurrencyGlyph /> {currentReconciliation ? currentReconciliation.closingBalance.toFixed(2) : "0.00"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Bank statement</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-primary">Ledger Balance</CardTitle>
              <div className="bg-green-50 p-2 rounded-lg">
                <Calculator className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                <CurrencyGlyph /> {currentReconciliation ? currentReconciliation.systemBalance.toFixed(2) : "0.00"}
              </div>
              <p className="text-xs text-gray-500 mt-1">Accounting records</p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-primary">Difference</CardTitle>
              <div className={cn(
                "p-2 rounded-lg",
                !currentReconciliation || Math.abs(currentReconciliation.difference) < 0.01
                  ? "bg-green-50" : "bg-red-50"
              )}>
                {(!currentReconciliation || Math.abs(currentReconciliation.difference) < 0.01) ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className={cn(
                "text-2xl font-bold",
                !currentReconciliation || Math.abs(currentReconciliation.difference) < 0.01
                  ? "text-green-600" : "text-red-600"
              )}>
                {!currentReconciliation
                  ? "—"
                  : Math.abs(currentReconciliation.difference) < 0.01
                    ? "Balanced ✓"
                    : `${currencyCode} ${Math.abs(currentReconciliation.difference).toFixed(2)}`}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {!currentReconciliation ? "No reconciliation" :
                  Math.abs(currentReconciliation.difference) < 0.01 ? "No discrepancy" : "Requires attention"}
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-medium text-primary">Unmatched</CardTitle>
              <div className="bg-orange-50 p-2 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {currentReconciliation ? currentReconciliation.unmatchedCount : 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Transactions</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md hover:shadow-lg transition-all">
            <CardContent className="p-4 h-full flex items-center justify-center">
              <Button
                onClick={openCreate}
                className="w-full h-full bg-white hover:bg-gray-50 text-gray-900 border-0 flex flex-col items-center justify-center gap-1"
                variant="outline"
              >
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <Plus className="h-6 w-6 text-indigo-600" />
                </div>
                <span className="text-sm font-medium">New</span>
                <span className="text-xs text-gray-500">Reconciliation</span>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Main Transaction Table */}
        <Card className="bg-white shadow-sm border-0">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-gymbios-primary font-semibold">
              Bank Statement Lines ({filteredAndSortedTransactions.length})
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Review and match bank statement entries with ledger records
            </p>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 border-b border-gray-200">
                    <TableHead className="font-semibold text-gymbios-primary cursor-pointer hover:bg-gray-100 px-6 py-4" onClick={() => handleSort("date")}>
                      <div className="flex items-center space-x-2"><span>Date</span><ArrowUpDown className="h-4 w-4 opacity-60" /></div>
                    </TableHead>
                    <TableHead className="font-semibold text-gymbios-primary cursor-pointer hover:bg-gray-100 px-6 py-4" onClick={() => handleSort("description")}>
                      <div className="flex items-center space-x-2"><span>Description</span><ArrowUpDown className="h-4 w-4 opacity-60" /></div>
                    </TableHead>
                    <TableHead className="font-semibold text-gymbios-primary px-6 py-4">Reference</TableHead>
                    <TableHead className="font-semibold text-gymbios-primary text-right cursor-pointer hover:bg-gray-100 px-6 py-4" onClick={() => handleSort("bankAmount")}>
                      <div className="flex items-center justify-end space-x-2"><span>Amount</span><ArrowUpDown className="h-4 w-4 opacity-60" /></div>
                    </TableHead>
                    <TableHead className="font-semibold text-gymbios-primary px-6 py-4">Type</TableHead>
                    <TableHead className="font-semibold text-gymbios-primary px-6 py-4">Status</TableHead>
                    <TableHead className="font-semibold text-gymbios-primary px-6 py-4">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingData ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        Loading reconciliation data...
                      </TableCell>
                    </TableRow>
                  ) : paginatedTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <div className="flex flex-col items-center space-y-3">
                          <Landmark className="h-10 w-10 text-muted-foreground/40" />
                          <p>No bank statement lines found.</p>
                          <Button variant="outline" size="sm" onClick={openCreate}>
                            <Plus className="h-4 w-4 mr-2" /> Create Reconciliation
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedTransactions.map((transaction, index) => (
                      <TableRow
                        key={transaction.id}
                        className={cn(
                          "hover:bg-blue-50/30 cursor-pointer transition-colors border-b border-gray-100",
                          index % 2 === 0 ? "bg-white" : "bg-gray-50/30",
                          transaction.status === "Unmatched" && "bg-red-50 hover:bg-red-100/50"
                        )}
                        onClick={() => handleViewTransaction(transaction)}
                      >
                        <TableCell className="px-6 py-4 font-medium text-gray-900">
                          {formatDate(transaction.date)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900">{transaction.description}</p>
                            <p className="text-sm text-gray-500">{transaction.category}</p>
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="text-sm font-mono font-medium text-gymbios-primary">{transaction.reference || "-"}</div>
                            {transaction.ledgerReference && (
                              <div className="text-xs text-gray-500">Voucher: {transaction.ledgerReference}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4 text-right">
                          <div className={cn(
                            "font-mono font-bold",
                            transaction.type === "Credit" ? "text-green-600" : "text-red-600"
                          )}>
                            {transaction.type === "Credit" ? "+" : "-"}<CurrencyGlyph /> {Math.abs(transaction.bankAmount).toFixed(2)}
                          </div>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <Badge className={cn(
                            "text-xs",
                            transaction.type === "Credit" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          )}>
                            {transaction.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          {getStatusBadge(transaction.status)}
                        </TableCell>
                        <TableCell className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {transaction.status === "Unmatched" && (
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleViewTransaction(transaction); }}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 text-xs"
                              >
                                Match
                              </Button>
                            )}
                            {transaction.status === "Matched" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => { e.stopPropagation(); handleUnmatchTransaction(transaction); }}
                                className="border-red-300 text-red-600 hover:bg-red-50 px-3 py-1 text-xs"
                              >
                                Unmatch
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-gray-100" onClick={e => e.stopPropagation()}>
                                  <MoreHorizontal className="h-4 w-4 text-gray-600" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewTransaction(transaction); }}>
                                  <Eye className="h-4 w-4 mr-2" /> View Details
                                </DropdownMenuItem>
                                {transaction.status === "Unmatched" && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewTransaction(transaction); }}>
                                    <CheckCircle className="h-4 w-4 mr-2" /> Match
                                  </DropdownMenuItem>
                                )}
                                {transaction.status === "Matched" && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleUnmatchTransaction(transaction); }}>
                                    <X className="h-4 w-4 mr-2" /> Unmatch
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {filteredAndSortedTransactions.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
                  {Math.min(currentPage * itemsPerPage, filteredAndSortedTransactions.length)} of{" "}
                  {filteredAndSortedTransactions.length} results
                </p>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm"
                          onClick={() => setCurrentPage(page)} className={currentPage === page ? "btn-primary" : ""}>
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reconciliation Summary */}
        <Card className="mt-6 bg-white shadow-sm border-0">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-gymbios-primary font-semibold">Reconciliation Summary</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 font-medium mb-1">Total Debits</p>
                <p className="text-2xl font-bold text-blue-900 font-mono">
                  <CurrencyGlyph /> {filteredAndSortedTransactions.filter(t => t.type === "Debit").reduce((s, t) => s + t.bankAmount, 0).toFixed(2)}
                </p>
                <p className="text-xs text-blue-600 mt-1">{filteredAndSortedTransactions.filter(t => t.type === "Debit").length} transactions</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-700 font-medium mb-1">Total Credits</p>
                <p className="text-2xl font-bold text-green-900 font-mono">
                  <CurrencyGlyph /> {filteredAndSortedTransactions.filter(t => t.type === "Credit").reduce((s, t) => s + t.bankAmount, 0).toFixed(2)}
                </p>
                <p className="text-xs text-green-600 mt-1">{filteredAndSortedTransactions.filter(t => t.type === "Credit").length} transactions</p>
              </div>
              <div className={cn(
                "text-center p-4 rounded-lg",
                (currentReconciliation?.unmatchedCount ?? 0) === 0 ? "bg-green-50" : "bg-orange-50"
              )}>
                <p className={cn(
                  "text-sm font-medium mb-1",
                  (currentReconciliation?.unmatchedCount ?? 0) === 0 ? "text-green-700" : "text-orange-700"
                )}>
                  Match Status
                </p>
                <p className={cn(
                  "text-2xl font-bold",
                  (currentReconciliation?.unmatchedCount ?? 0) === 0 ? "text-green-900" : "text-orange-900"
                )}>
                  {reconciliationSummary.matchedTransactions} / {allTransactions.length}
                </p>
                <p className={cn(
                  "text-xs mt-1",
                  (currentReconciliation?.unmatchedCount ?? 0) === 0 ? "text-green-600" : "text-orange-600"
                )}>
                  {(currentReconciliation?.unmatchedCount ?? 0) === 0 ? "All matched ✓" : `${currentReconciliation?.unmatchedCount ?? 0} unmatched`}
                </p>
              </div>
              <div className="text-center">
                <Button
                  onClick={handleFinalizeReconciliation}
                  disabled={!canFinalize || completingRec}
                  className={cn(
                    "w-full h-16 text-base font-medium",
                    canFinalize
                      ? "bg-green-600 hover:bg-green-700 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  )}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  {completingRec ? "Finalizing..." :
                    !currentReconciliation ? "No Reconciliation" :
                    currentReconciliation.status === "COMPLETED" ? "Already Completed" :
                    canFinalize ? "Finalize Reconciliation" :
                    `${currentReconciliation.unmatchedCount} Unmatched Remain`}
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  {canFinalize ? "All transactions are matched" : "Match all transactions before finalizing"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:w-[600px] overflow-y-auto bg-white">
          {selectedTransaction && (
            <>
              <SheetHeader className="border-b border-gray-200 pb-4">
                <SheetTitle className="flex items-center justify-between">
                  <div>
                    <span className="text-gymbios-primary font-bold">{selectedTransaction.reference || "—"}</span>
                    <p className="text-sm text-gray-600 mt-1">{selectedTransaction.description}</p>
                  </div>
                  {getStatusBadge(selectedTransaction.status)}
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <Card className="shadow-sm border-0">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-200">
                    <CardTitle className="text-lg text-gymbios-primary">Transaction Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Date</Label>
                        <p className="font-medium text-gray-900 mt-1">{formatDate(selectedTransaction.date)}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Type</Label>
                        <p className="font-medium text-gray-900 mt-1">{selectedTransaction.type}</p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Amount</Label>
                        <div className={cn(
                          "text-lg font-bold font-mono mt-1",
                          selectedTransaction.type === "Credit" ? "text-green-600" : "text-red-600"
                        )}>
                          {selectedTransaction.type === "Credit" ? "+" : "-"}<CurrencyGlyph /> {Math.abs(selectedTransaction.bankAmount).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Category</Label>
                        <p className="font-medium text-gray-900 mt-1">{selectedTransaction.category}</p>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-sm font-medium text-gray-700">Description</Label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-md mt-1">{selectedTransaction.description}</p>
                    </div>

                    {selectedTransaction.ledgerReference && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Matched Voucher</Label>
                        <p className="font-mono text-sm bg-green-50 text-green-800 p-2 rounded mt-1">{selectedTransaction.ledgerReference}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Quick Reconciliation Actions */}
                <Card className="shadow-sm border-0">
                  <CardHeader className="bg-gymbios-secondary/10 border-b border-gray-200">
                    <CardTitle className="text-lg text-gymbios-primary">Quick Reconciliation</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {selectedTransaction.status === "Unmatched" && (
                      <>
                        {showMatchPicker ? (
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-gray-700">Select the matching ledger entry</Label>
                            <Input
                              value={candidateSearch}
                              onChange={e => setCandidateSearch(e.target.value)}
                              placeholder="Search by voucher no. or description..."
                            />
                            <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                              {loadingCandidates ? (
                                <div className="p-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin" /> Loading ledger entries...
                                </div>
                              ) : (() => {
                                const q = candidateSearch.trim().toLowerCase();
                                const filtered = q
                                  ? matchCandidates.filter(c =>
                                      c.voucherNo.toLowerCase().includes(q) || c.narration.toLowerCase().includes(q))
                                  : matchCandidates;
                                if (filtered.length === 0) {
                                  return (
                                    <div className="p-6 text-center text-sm text-muted-foreground">
                                      No unmatched posted ledger entries found for this amount. Record the
                                      transaction in the ledger first, then come back to match it.
                                    </div>
                                  );
                                }
                                return filtered.map(c => (
                                  <div
                                    key={c.journalVoucherId}
                                    onClick={() => setSelectedCandidateId(c.journalVoucherId)}
                                    className={cn(
                                      "p-3 cursor-pointer hover:bg-gray-50 flex items-center justify-between gap-3",
                                      selectedCandidateId === c.journalVoucherId && "bg-green-50"
                                    )}
                                  >
                                    <div className="min-w-0">
                                      <p className="font-mono text-sm font-medium text-gymbios-primary">{c.voucherNo}</p>
                                      <p className="text-xs text-gray-600 truncate">{c.narration}</p>
                                      <p className="text-xs text-gray-400">{formatDate(c.date)}</p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="font-mono text-sm font-semibold"><CurrencyGlyph /> {c.amount.toFixed(2)}</span>
                                      {selectedCandidateId === c.journalVoucherId && <CheckCircle className="h-4 w-4 text-green-600" />}
                                    </div>
                                  </div>
                                ));
                              })()}
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                disabled={!selectedCandidateId || matchingInProgress}
                                onClick={() => selectedCandidateId && handleMatchTransaction(selectedTransaction, selectedCandidateId)}
                              >
                                {matchingInProgress ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                                Confirm Match
                              </Button>
                              <Button variant="outline" onClick={() => { setShowMatchPicker(false); setSelectedCandidateId(null); }}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 text-white h-12 text-base font-medium"
                            onClick={() => loadMatchCandidates(selectedTransaction)}
                          >
                            <CheckCircle className="h-5 w-5 mr-2" />
                            Match with Ledger
                          </Button>
                        )}
                      </>
                    )}

                    {selectedTransaction.status === "Matched" && (
                      <>
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
                          <CheckCircle className="h-4 w-4 inline mr-2" />
                          Matched{selectedTransaction.ledgerReference ? ` to ${selectedTransaction.ledgerReference}` : ""}
                        </div>
                        <Button
                          variant="outline"
                          className="w-full border-red-600 text-red-600 hover:bg-red-600 hover:text-white h-10"
                          onClick={() => handleUnmatchTransaction(selectedTransaction)}
                        >
                          <X className="h-4 w-4 mr-2" /> Unmatch Transaction
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card className="shadow-sm border-0">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-200">
                    <CardTitle className="text-lg text-gymbios-primary">Notes & Remarks</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-4">
                    {currentReconciliation?.notes && (
                      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <Label className="text-sm font-medium text-yellow-800 mb-2 block">Reconciliation Notes</Label>
                        <p className="text-sm text-yellow-900">{currentReconciliation.notes}</p>
                      </div>
                    )}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-gray-700">Add Note to Reconciliation</Label>
                      <Textarea
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        placeholder="Add remarks for audit purposes..."
                        rows={3}
                        className="border-gray-300 focus:border-gymbios-primary resize-none"
                      />
                      <Button
                        size="sm"
                        className="bg-gymbios-primary hover:bg-gymbios-primary-hover text-white"
                        disabled={!newNote.trim() || !currentReconciliation}
                        onClick={async () => {
                          if (!currentReconciliation || !newNote.trim()) return;
                          try {
                            const updated = await bankReconciliationService.update(currentReconciliation.id, {
                              bankAccountName: currentReconciliation.bankAccountName,
                              statementDate: currentReconciliation.statementDate,
                              openingBalance: currentReconciliation.openingBalance,
                              closingBalance: currentReconciliation.closingBalance,
                              notes: newNote.trim(),
                              lines: currentReconciliation.lines.map(l => ({ ...l })),
                            });
                            setCurrentReconciliation(updated);
                            setAllTransactions(mapLinesToTransactions(updated));
                            setNewNote("");
                            toast.success("Note saved");
                          } catch (e: any) {
                            toast.error(e.message || "Failed to save note");
                          }
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Save Note
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-semibold text-gray-900">New Bank Reconciliation</DialogTitle>
          </DialogHeader>
          {renderFormContent()}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={savingForm}>Cancel</Button>
            <Button className="btn-primary" onClick={handleCreate} disabled={savingForm}>
              {savingForm ? "Creating..." : "Create Reconciliation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-semibold text-gray-900">Edit Reconciliation</DialogTitle>
          </DialogHeader>
          {renderFormContent()}
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={savingForm}>Cancel</Button>
            <Button className="btn-primary" onClick={handleEdit} disabled={savingForm}>
              {savingForm ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Match Review */}
      <Dialog open={showAutoMatchDialog} onOpenChange={setShowAutoMatchDialog}>
        <DialogContent className="w-[96vw] max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-semibold text-gray-900">Auto-Match Suggestions</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Every suggestion below is a real posted journal voucher with the same amount and direction as the
              statement line, found within 30 days of its date. Review and confirm before applying.
            </p>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {autoMatchSuggestions.map(s => {
              const txn = allTransactions.find(t => t.lineId === s.lineId);
              const picked = autoMatchPicks[s.lineId];
              return (
                <div key={s.lineId} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900">{txn?.description ?? `Line #${s.lineId}`}</p>
                      <p className="text-xs text-gray-500">
                        {txn ? formatDate(txn.date) : ""} • {txn?.type === "Credit" ? "+" : "-"}
                        <CurrencyGlyph /> {txn ? Math.abs(txn.bankAmount).toFixed(2) : ""}
                      </p>
                    </div>
                    <Badge className={s.confidence === "HIGH" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                      {s.confidence === "HIGH" ? "1 match found" : `${s.candidates.length} possible matches`}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {s.candidates.map(c => (
                      <label
                        key={c.journalVoucherId}
                        className={cn(
                          "flex items-center justify-between gap-3 p-2 rounded-md cursor-pointer border",
                          picked === c.journalVoucherId ? "border-green-400 bg-green-50" : "border-transparent hover:bg-gray-50"
                        )}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <input
                            type="radio"
                            name={`auto-match-${s.lineId}`}
                            checked={picked === c.journalVoucherId}
                            onChange={() => setAutoMatchPicks(prev => ({ ...prev, [s.lineId]: c.journalVoucherId }))}
                          />
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-medium text-gymbios-primary">{c.voucherNo}</p>
                            <p className="text-xs text-gray-600 truncate">{c.narration}</p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 flex-shrink-0">{formatDate(c.date)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setShowAutoMatchDialog(false)} disabled={applyingAutoMatch}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleApplyAutoMatch(true)}
              disabled={applyingAutoMatch || !autoMatchSuggestions.some(s => s.confidence === "HIGH")}
            >
              Apply High-Confidence Only
            </Button>
            <Button className="btn-primary" onClick={() => handleApplyAutoMatch(false)} disabled={applyingAutoMatch}>
              {applyingAutoMatch ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Apply Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Reconciliation</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Are you sure you want to delete this reconciliation and all its statement lines? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} disabled={deletingRec}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deletingRec}>
              {deletingRec ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
