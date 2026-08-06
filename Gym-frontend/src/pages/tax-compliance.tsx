import React, { useState, useEffect, useCallback } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { taxComplianceService, TaxComplianceItem, TaxComplianceCreateRequest } from '../utils/supabase/tax-compliance-service';
import { financialReportsService, TaxSummaryData } from '../utils/supabase/financial-reports-service';
import { getVatRate, DEFAULT_VAT_RATE } from '../utils/tax';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  FileText, Plus, Edit, Trash2, Download, Calendar as CalendarIcon,
  AlertCircle, CheckCircle, Clock, Filter, Search, FileSpreadsheet,
  FileCode, Eye, Settings, Building2, Receipt, DollarSign, BarChart3,
  ChevronRight, Bell
} from 'lucide-react';
import { format } from 'date-fns';

const TAX_TYPE_OPTIONS = [
  { value: "VAT", label: "VAT (Value Added Tax)" },
  { value: "CORPORATE_TAX", label: "Corporate Tax" },
  { value: "EXCISE_TAX", label: "Excise Tax" },
  { value: "WITHHOLDING_TAX", label: "Withholding Tax" },
  { value: "CUSTOMS_DUTY", label: "Customs Duty" },
];

const STATUS_OPTIONS = [
  { value: "PENDING", label: "Pending" },
  { value: "FILED", label: "Filed" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "EXEMPT", label: "Exempt" },
];

function displayTaxType(t: string) {
  return t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function displayStatus(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

function getStatusColor(status: string) {
  switch (status.toUpperCase()) {
    case "FILED": return "bg-green-100 text-green-800 border-green-200";
    case "PENDING": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "OVERDUE": return "bg-red-100 text-red-800 border-red-200";
    case "EXEMPT": return "bg-blue-100 text-blue-800 border-blue-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getStatusIcon(status: string) {
  switch (status.toUpperCase()) {
    case "FILED": return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "PENDING": return <Clock className="h-4 w-4 text-yellow-600" />;
    case "OVERDUE": return <AlertCircle className="h-4 w-4 text-red-600" />;
    default: return <Clock className="h-4 w-4 text-gray-400" />;
  }
}

function daysUntil(dateStr: string): number {
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const defaultFilingForm = {
  taxType: "VAT",
  taxPeriod: "",
  dueDate: "",
  filingAmount: "",
  status: "PENDING",
  notes: "",
  documentUrl: "",
};

const defaultMarkFiledForm = {
  filedDate: format(new Date(), 'yyyy-MM-dd'),
  filingAmount: "",
  filingReference: "",
};

const defaultConfigForm = {
  taxType: "",
  filingFrequency: "Monthly",
  rate: "",
  linkedAccounts: "",
  status: "Active",
};

const initialTaxTypeConfigs = [
  { id: 1, taxType: "Corporate Tax", filingFrequency: "Quarterly", rate: "9%", linkedAccounts: ["Revenue", "Operating Expenses", "Depreciation"], status: "Active" },
  { id: 2, taxType: "VAT", filingFrequency: "Monthly", rate: "5%", linkedAccounts: ["Sales Revenue", "Purchase Expenses"], status: "Active" },
  { id: 3, taxType: "Excise Tax", filingFrequency: "Quarterly", rate: "50%", linkedAccounts: ["Excisable Goods Revenue"], status: "Active" },
];

export function TaxCompliance() {
  const { currencyCode } = useCurrency();
  const [filings, setFilings] = useState<TaxComplianceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTaxType, setFilterTaxType] = useState("all");

  // Filing add/edit dialog
  const [showFilingDialog, setShowFilingDialog] = useState(false);
  const [editingFiling, setEditingFiling] = useState<TaxComplianceItem | null>(null);
  const [filingForm, setFilingForm] = useState(defaultFilingForm);
  const [savingFiling, setSavingFiling] = useState(false);

  // Mark Filed dialog
  const [showMarkFiledDialog, setShowMarkFiledDialog] = useState(false);
  const [markFiledTarget, setMarkFiledTarget] = useState<TaxComplianceItem | null>(null);
  const [markFiledForm, setMarkFiledForm] = useState(defaultMarkFiledForm);
  const [savingMarkFiled, setSavingMarkFiled] = useState(false);

  // View filing dialog
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [viewingFiling, setViewingFiling] = useState<TaxComplianceItem | null>(null);

  // Configuration tab — local state only (no backend entity for tax type config)
  const [taxTypeConfigs, setTaxTypeConfigs] = useState(initialTaxTypeConfigs);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<typeof initialTaxTypeConfigs[0] | null>(null);
  const [configForm, setConfigForm] = useState(defaultConfigForm);

  // Reports tab — real figures derived from the posted ledger (see
  // FinancialReportService.getTaxSummary). Corporate Tax is annual so it's
  // computed year-to-date; VAT is filed quarterly in the UAE so it's computed
  // for the current quarter-to-date. Both come from the same endpoint, just
  // called with different date ranges.
  const [annualTaxSummary, setAnnualTaxSummary] = useState<TaxSummaryData | null>(null);
  const [quarterlyTaxSummary, setQuarterlyTaxSummary] = useState<TaxSummaryData | null>(null);
  const [taxSummaryLoading, setTaxSummaryLoading] = useState(false);
  const [vatRatePercent, setVatRatePercent] = useState(DEFAULT_VAT_RATE);

  const loadTaxSummary = useCallback(async () => {
    setTaxSummaryLoading(true);
    try {
      const today = new Date();
      const yearStart = new Date(today.getFullYear(), 0, 1);
      const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3;
      const quarterStart = new Date(today.getFullYear(), quarterStartMonth, 1);
      const toIso = (d: Date) => d.toISOString().slice(0, 10);

      const [annual, quarterly, rate] = await Promise.all([
        financialReportsService.getTaxSummary(toIso(yearStart), toIso(today)),
        financialReportsService.getTaxSummary(toIso(quarterStart), toIso(today)),
        getVatRate(),
      ]);
      setAnnualTaxSummary(annual);
      setQuarterlyTaxSummary(quarterly);
      setVatRatePercent(rate);
    } catch { /* silently degrade — Reports cards fall back to a loading/empty state */ }
    finally { setTaxSummaryLoading(false); }
  }, []);

  useEffect(() => { loadTaxSummary(); }, [loadTaxSummary]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await taxComplianceService.getAll();
      setFilings(data);
    } catch { /* silently degrade */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Summary stats ────────────────────────────────────────────────────
  const totalPendingAmount = filings
    .filter(f => f.status === 'PENDING' || f.status === 'OVERDUE')
    .reduce((sum, f) => sum + (f.filingAmount ?? 0), 0);

  const overdueCount = filings.filter(f => f.status === 'OVERDUE').length;

  const dueThisWeekCount = filings.filter(f => {
    if (f.status !== 'PENDING' || !f.dueDate) return false;
    const d = daysUntil(f.dueDate);
    return d >= 0 && d <= 7;
  }).length;

  const filedThisMonth = filings.filter(f => {
    if (!f.filedDate) return false;
    const d = new Date(f.filedDate);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // ── Overview: group by taxType ────────────────────────────────────────
  const uniqueTaxTypes = [...new Set(filings.map(f => f.taxType))];

  // ── Filtered filings (Filings tab) ───────────────────────────────────
  const filteredFilings = filings.filter(f => {
    const label = displayTaxType(f.taxType).toLowerCase();
    const matchesSearch = label.includes(searchTerm.toLowerCase()) ||
      f.taxPeriod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.filingReference ?? '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || f.status.toLowerCase() === filterStatus.toLowerCase();
    const matchesTaxType = filterTaxType === 'all' || f.taxType === filterTaxType;
    return matchesSearch && matchesStatus && matchesTaxType;
  });

  // ── Filing CRUD ───────────────────────────────────────────────────────
  const openAdd = () => {
    setEditingFiling(null);
    setFilingForm(defaultFilingForm);
    setShowFilingDialog(true);
  };

  const openEdit = (f: TaxComplianceItem) => {
    setEditingFiling(f);
    setFilingForm({
      taxType: f.taxType,
      taxPeriod: f.taxPeriod,
      dueDate: f.dueDate,
      filingAmount: f.filingAmount?.toString() ?? "",
      status: f.status,
      notes: f.notes ?? "",
      documentUrl: f.documentUrl ?? "",
    });
    setShowFilingDialog(true);
  };

  const handleSaveFiling = async () => {
    setSavingFiling(true);
    try {
      const req: TaxComplianceCreateRequest = {
        taxType: filingForm.taxType,
        taxPeriod: filingForm.taxPeriod,
        dueDate: filingForm.dueDate,
        filingAmount: filingForm.filingAmount ? parseFloat(filingForm.filingAmount) : undefined,
        status: filingForm.status,
        notes: filingForm.notes || undefined,
        documentUrl: filingForm.documentUrl || undefined,
      };
      if (editingFiling) {
        await taxComplianceService.update(editingFiling.id, req);
      } else {
        await taxComplianceService.create(req);
      }
      setShowFilingDialog(false);
      await load();
    } catch { /* ignore */ } finally {
      setSavingFiling(false);
    }
  };

  const openMarkFiled = (f: TaxComplianceItem) => {
    setMarkFiledTarget(f);
    setMarkFiledForm({
      filedDate: format(new Date(), 'yyyy-MM-dd'),
      filingAmount: f.filingAmount?.toString() ?? "",
      filingReference: f.filingReference ?? "",
    });
    setShowMarkFiledDialog(true);
  };

  const handleMarkFiled = async () => {
    if (!markFiledTarget) return;
    setSavingMarkFiled(true);
    try {
      await taxComplianceService.markFiled(markFiledTarget.id, {
        filedDate: markFiledForm.filedDate,
        filingAmount: markFiledForm.filingAmount ? parseFloat(markFiledForm.filingAmount) : undefined,
        filingReference: markFiledForm.filingReference || undefined,
      });
      setShowMarkFiledDialog(false);
      await load();
    } catch { /* ignore */ } finally {
      setSavingMarkFiled(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this filing record?")) return;
    try {
      await taxComplianceService.delete(id);
      await load();
    } catch { /* ignore */ }
  };

  // ── Config tab (local only) ───────────────────────────────────────────
  const openAddConfig = () => {
    setEditingConfig(null);
    setConfigForm(defaultConfigForm);
    setShowConfigDialog(true);
  };

  const openEditConfig = (c: typeof initialTaxTypeConfigs[0]) => {
    setEditingConfig(c);
    setConfigForm({
      taxType: c.taxType,
      filingFrequency: c.filingFrequency,
      rate: c.rate,
      linkedAccounts: c.linkedAccounts.join(", "),
      status: c.status,
    });
    setShowConfigDialog(true);
  };

  const handleSaveConfig = () => {
    const accounts = configForm.linkedAccounts.split(',').map(a => a.trim()).filter(Boolean);
    if (editingConfig) {
      setTaxTypeConfigs(prev => prev.map(c => c.id === editingConfig.id
        ? { ...c, taxType: configForm.taxType, filingFrequency: configForm.filingFrequency, rate: configForm.rate, linkedAccounts: accounts, status: configForm.status }
        : c));
    } else {
      setTaxTypeConfigs(prev => [...prev, { id: Date.now(), taxType: configForm.taxType, filingFrequency: configForm.filingFrequency, rate: configForm.rate, linkedAccounts: accounts, status: configForm.status }]);
    }
    setShowConfigDialog(false);
  };

  const handleDeleteConfig = (id: number) => {
    setTaxTypeConfigs(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Tax Compliance Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage Corporate Tax, VAT, and Excise Tax compliance in one centralized interface</p>
        </div>
        <Button
          size="sm"
          className="bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md transition-all"
          onClick={openAdd}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Filing
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Total Pending Amount</CardTitle>
            <div className="bg-emerald-50 p-2 rounded-lg"><DollarSign className="h-4 w-4 text-emerald-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700"><CurrencyGlyph /> {totalPendingAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all tax types</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Overdue Filings</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg"><AlertCircle className="h-4 w-4 text-red-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700">{overdueCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Requires immediate attention</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Due This Week</CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg"><Bell className="h-4 w-4 text-yellow-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700">{dueThisWeekCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Upcoming in next 7 days</p>
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-all">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-medium text-primary">Filed This Month</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg"><CheckCircle className="h-4 w-4 text-green-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700">{filedThisMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview"><BarChart3 className="mr-2 h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="configuration"><Settings className="mr-2 h-4 w-4" />Configuration</TabsTrigger>
          <TabsTrigger value="reports"><FileSpreadsheet className="mr-2 h-4 w-4" />Reports</TabsTrigger>
          <TabsTrigger value="filings"><FileText className="mr-2 h-4 w-4" />Filings</TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : uniqueTaxTypes.length === 0 ? (
            <Card className="bg-white shadow-sm">
              <CardContent className="py-12 text-center text-muted-foreground">
                No filings yet. Click <strong>Add Filing</strong> to create the first record.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {uniqueTaxTypes.map(taxType => {
                const typeFilings = filings.filter(f => f.taxType === taxType);
                const pending = typeFilings.filter(f => f.status === 'PENDING' || f.status === 'OVERDUE');
                const nextDue = pending.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
                const totalOwed = pending.reduce((s, f) => s + (f.filingAmount ?? 0), 0);
                const lastFiled = typeFilings
                  .filter(f => f.status === 'FILED' && f.filedDate)
                  .sort((a, b) => new Date(b.filedDate!).getTime() - new Date(a.filedDate!).getTime())[0];
                const isUrgent = nextDue && daysUntil(nextDue.dueDate) <= 7 && daysUntil(nextDue.dueDate) >= 0;

                return (
                  <Card key={taxType} className={`bg-white border border-gray-100 shadow-sm ${isUrgent ? 'ring-2 ring-red-200' : ''}`}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{displayTaxType(taxType)}</CardTitle>
                        {nextDue && (
                          <Badge className={getStatusColor(nextDue.status)}>
                            {displayStatus(nextDue.status)}
                          </Badge>
                        )}
                      </div>
                      <CardDescription>{typeFilings.length} filing{typeFilings.length !== 1 ? 's' : ''} total</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {nextDue && (
                        <div>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <span className="text-muted-foreground">Next Due Date</span>
                            {isUrgent && (
                              <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                                {daysUntil(nextDue.dueDate)} days left
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{format(new Date(nextDue.dueDate), "dd MMM yyyy")}</span>
                          </div>
                        </div>
                      )}

                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Pending Amount</div>
                        <div className="text-2xl font-bold" style={{ color: '#2B7A78' }}>
                          <CurrencyGlyph /> {totalOwed.toLocaleString()}
                        </div>
                      </div>

                      {lastFiled && (
                        <div>
                          <div className="text-sm text-muted-foreground mb-1">Last Filed</div>
                          <div className="text-sm">{format(new Date(lastFiled.filedDate!), "dd MMM yyyy")}</div>
                        </div>
                      )}

                      {nextDue && nextDue.status !== 'FILED' && (
                        <Button
                          className="w-full mt-4 bg-white shadow-sm hover:shadow-md border border-gray-200"
                          variant="ghost"
                          onClick={() => openMarkFiled(nextDue)}
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          File Return
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Filing Calendar */}
          <Card className="bg-white border border-gray-100 shadow-sm">
            <CardHeader>
              <CardTitle>Filing Calendar</CardTitle>
              <CardDescription>Upcoming due dates and filing statuses</CardDescription>
            </CardHeader>
            <CardContent>
              {filings.filter(f => f.status !== 'FILED').length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No pending or overdue filings.</p>
              ) : (
                <div className="space-y-3">
                  {filings
                    .filter(f => f.status !== 'FILED')
                    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                    .slice(0, 6)
                    .map(f => {
                      const days = daysUntil(f.dueDate);
                      return (
                        <div key={f.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50">
                              {getStatusIcon(f.status)}
                            </div>
                            <div>
                              <div className="font-medium">{displayTaxType(f.taxType)}</div>
                              <div className="text-sm text-muted-foreground">{f.taxPeriod}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="text-sm font-medium">
                                {f.filingAmount != null ? `${currencyCode} ${f.filingAmount.toLocaleString()}` : '—'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                Due: {format(new Date(f.dueDate), "dd MMM yyyy")}
                              </div>
                            </div>
                            <Badge className={getStatusColor(f.status)}>{displayStatus(f.status)}</Badge>
                            <Button variant="ghost" size="sm" onClick={() => openMarkFiled(f)}>
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Configuration Tab (local only) ── */}
        <TabsContent value="configuration" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tax Type Configuration</CardTitle>
                <CardDescription>Define tax types, filing frequencies, and linked accounts</CardDescription>
              </div>
              <Button size="sm" onClick={openAddConfig}>
                <Plus className="mr-2 h-4 w-4" />
                Add Tax Type
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Filing Frequency</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Linked Accounts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {taxTypeConfigs.map(c => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.taxType}</TableCell>
                      <TableCell><Badge variant="outline">{c.filingFrequency}</Badge></TableCell>
                      <TableCell>{c.rate}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {c.linkedAccounts.slice(0, 2).map((a, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{a}</Badge>
                          ))}
                          {c.linkedAccounts.length > 2 && (
                            <Badge variant="outline" className="text-xs">+{c.linkedAccounts.length - 2} more</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={c.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEditConfig(c)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDeleteConfig(c.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Reports Tab — derived from the posted ledger, see FinancialReportService.getTaxSummary ── */}
        <TabsContent value="reports" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white border-0 shadow-sm hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Corporate Tax Summary
                </CardTitle>
                <CardDescription>
                  Year to date ({annualTaxSummary?.periodFrom ?? '—'} to {annualTaxSummary?.periodTo ?? '—'})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Revenue</span><span className="font-medium"><CurrencyGlyph /> {taxSummaryLoading || !annualTaxSummary ? '—' : annualTaxSummary.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Deductions</span><span className="font-medium"><CurrencyGlyph /> {taxSummaryLoading || !annualTaxSummary ? '—' : annualTaxSummary.deductions.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Taxable Profit</span><span className="font-medium"><CurrencyGlyph /> {taxSummaryLoading || !annualTaxSummary ? '—' : annualTaxSummary.taxableProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between pt-2 border-t"><span className="font-medium">Tax Payable ({annualTaxSummary ? (annualTaxSummary.corporateTaxRate * 100).toFixed(0) : 9}%)</span><span className="font-bold" style={{ color: '#2B7A78' }}><CurrencyGlyph /> {taxSummaryLoading || !annualTaxSummary ? '—' : annualTaxSummary.corporateTaxPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                </div>
                <p className="text-xs text-gray-400">
                  UAE Corporate Tax: 0% on the first <CurrencyGlyph /> {annualTaxSummary?.corporateTaxZeroRateThreshold.toLocaleString() ?? '375,000'} of taxable profit, 9% above it.
                </p>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm"><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button>
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm"><FileText className="mr-2 h-4 w-4" />PDF</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Receipt className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  VAT Return Report
                </CardTitle>
                <CardDescription>
                  Current quarter to date ({quarterlyTaxSummary?.periodFrom ?? '—'} to {quarterlyTaxSummary?.periodTo ?? '—'})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Output VAT ({vatRatePercent}%)</span><span className="font-medium"><CurrencyGlyph /> {taxSummaryLoading || !quarterlyTaxSummary ? '—' : quarterlyTaxSummary.outputVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Input VAT ({vatRatePercent}%)</span><span className="font-medium"><CurrencyGlyph /> {taxSummaryLoading || !quarterlyTaxSummary ? '—' : quarterlyTaxSummary.inputVat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                  <div className="flex justify-between pt-2 border-t"><span className="font-medium">Net VAT Payable</span><span className="font-bold" style={{ color: '#2B7A78' }}><CurrencyGlyph /> {taxSummaryLoading || !quarterlyTaxSummary ? '—' : quarterlyTaxSummary.netVatPayable.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                </div>
                <p className="text-xs text-gray-400">
                  Output VAT is collected on membership, add-on, POS and invoice sales; Input VAT is reclaimed on expenses and supplier bills.
                </p>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm"><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button>
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm"><FileCode className="mr-2 h-4 w-4" />XML</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-0 shadow-sm hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5" style={{ color: '#2B7A78' }} />
                  Excise Tax Report
                </CardTitle>
                <CardDescription>Tax on specific goods/services</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Excisable Goods Value</span><span className="font-medium"><CurrencyGlyph /> 0.00</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax Rate</span><span className="font-medium">—</span></div>
                  <div className="flex justify-between pt-2 border-t"><span className="font-medium">Excise Tax Payable</span><span className="font-bold" style={{ color: '#2B7A78' }}><CurrencyGlyph /> 0.00</span></div>
                </div>
                <p className="text-xs text-gray-400">
                  No products are flagged as excisable yet (e.g. energy drinks, tobacco) — this app doesn't track excise category or rate per product, so this will read zero until that's built.
                </p>
                <div className="flex gap-2">
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm" disabled><FileSpreadsheet className="mr-2 h-4 w-4" />Excel</Button>
                  <Button className="flex-1 bg-white shadow-sm hover:shadow-md border-0" variant="ghost" size="sm" disabled><FileText className="mr-2 h-4 w-4" />PDF</Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filing History from API */}
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Filing History</CardTitle>
                  <CardDescription>Log of all submitted returns</CardDescription>
                </div>
                <div className="flex gap-3">
                  <Select value={filterTaxType} onValueChange={setFilterTaxType}>
                    <SelectTrigger className="w-[180px] shadow-sm"><SelectValue placeholder="All Tax Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tax Types</SelectItem>
                      {TAX_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Tax Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Filed Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filings
                    .filter(f => f.status === 'FILED' && (filterTaxType === 'all' || f.taxType === filterTaxType))
                    .sort((a, b) => new Date(b.filedDate ?? 0).getTime() - new Date(a.filedDate ?? 0).getTime())
                    .map(f => (
                      <TableRow key={f.id}>
                        <TableCell className="font-medium">{displayTaxType(f.taxType)}</TableCell>
                        <TableCell>{f.taxPeriod}</TableCell>
                        <TableCell>{format(new Date(f.dueDate), "dd MMM yyyy")}</TableCell>
                        <TableCell>{f.filedDate ? format(new Date(f.filedDate), "dd MMM yyyy") : '—'}</TableCell>
                        <TableCell>{f.filingAmount != null ? `${currencyCode} ${f.filingAmount.toLocaleString()}` : '—'}</TableCell>
                        <TableCell>{f.filingReference ?? '—'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(f.status)}>
                            {getStatusIcon(f.status)}
                            <span className="ml-1">{displayStatus(f.status)}</span>
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  {filings.filter(f => f.status === 'FILED').length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No filed returns yet.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Filings Tab (full CRUD) ── */}
        <TabsContent value="filings" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <Card className="bg-white border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tax Filings Management</CardTitle>
                  <CardDescription>Manage all tax periods, due dates, and filing statuses</CardDescription>
                </div>
                <Button size="sm" onClick={openAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Filing
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tax type, period, reference..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterTaxType} onValueChange={setFilterTaxType}>
                  <SelectTrigger className="w-[200px] shadow-sm"><SelectValue placeholder="All Tax Types" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tax Types</SelectItem>
                    {TAX_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[160px] shadow-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <div className="text-center py-12 text-muted-foreground">Loading...</div>
              ) : filteredFilings.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No filings match your filters.</div>
              ) : (
                <div className="space-y-3">
                  {filteredFilings.map(f => {
                    const days = f.dueDate ? daysUntil(f.dueDate) : null;
                    const isUrgent = days !== null && days >= 0 && days <= 7 && f.status === 'PENDING';
                    return (
                      <div
                        key={f.id}
                        className={`p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition-all border border-gray-100 ${isUrgent ? 'ring-2 ring-red-200' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex gap-4 flex-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-slate-50 shrink-0">
                              {getStatusIcon(f.status)}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="font-semibold">{displayTaxType(f.taxType)}</h3>
                                <Badge className={getStatusColor(f.status)}>{displayStatus(f.status)}</Badge>
                                {f.isOverdue && f.status !== 'FILED' && (
                                  <Badge variant="outline" className="border-red-200 text-red-600 text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />Overdue
                                  </Badge>
                                )}
                                {isUrgent && (
                                  <Badge variant="outline" className="border-orange-200 text-orange-600 text-xs">
                                    Due in {days} days
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">Period: {f.taxPeriod}</div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Due:</span>
                                  <div className="font-medium">{f.dueDate ? format(new Date(f.dueDate), "dd MMM yyyy") : '—'}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Amount:</span>
                                  <div className="font-medium" style={{ color: '#2B7A78' }}>
                                    {f.filingAmount != null ? `${currencyCode} ${f.filingAmount.toLocaleString()}` : '—'}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Filed:</span>
                                  <div className="font-medium">{f.filedDate ? format(new Date(f.filedDate), "dd MMM yyyy") : '—'}</div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Reference:</span>
                                  <div className="font-medium">{f.filingReference ?? '—'}</div>
                                </div>
                              </div>
                              {f.notes && (
                                <div className="text-sm p-2 bg-slate-50 rounded">
                                  <span className="text-muted-foreground">Notes: </span>{f.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {f.status !== 'FILED' && (
                              <Button variant="ghost" size="sm" className="text-green-700 hover:bg-green-50" onClick={() => openMarkFiled(f)} title="Mark as Filed">
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => openEdit(f)} title="Edit">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(f.id)} title="Delete">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Add / Edit Filing Dialog ── */}
      <Dialog open={showFilingDialog} onOpenChange={open => { setShowFilingDialog(open); }}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingFiling ? "Edit Filing" : "Add Filing"}</DialogTitle>
            <DialogDescription>
              {editingFiling ? `Editing ${displayTaxType(editingFiling.taxType)} — ${editingFiling.taxPeriod}` : "Create a new tax compliance filing record"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tax Type *</Label>
              <Select value={filingForm.taxType} onValueChange={v => setFilingForm(f => ({ ...f, taxType: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TAX_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tax Period *</Label>
              <Input placeholder="e.g. Q1 2026 or January 2026" value={filingForm.taxPeriod} onChange={e => setFilingForm(f => ({ ...f, taxPeriod: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Due Date *</Label>
              <Input type="date" value={filingForm.dueDate} onChange={e => setFilingForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Filing Amount ({currencyCode})</Label>
              <Input type="number" placeholder="0.00" value={filingForm.filingAmount} onChange={e => setFilingForm(f => ({ ...f, filingAmount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filingForm.status} onValueChange={v => setFilingForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea placeholder="Optional notes..." rows={2} value={filingForm.notes} onChange={e => setFilingForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Document URL</Label>
              <Input placeholder="https://..." value={filingForm.documentUrl} onChange={e => setFilingForm(f => ({ ...f, documentUrl: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFilingDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveFiling} disabled={savingFiling || !filingForm.taxPeriod || !filingForm.dueDate}
              style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}>
              {savingFiling ? "Saving..." : editingFiling ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mark Filed Dialog ── */}
      <Dialog open={showMarkFiledDialog} onOpenChange={setShowMarkFiledDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Mark as Filed</DialogTitle>
            <DialogDescription>
              {markFiledTarget && `${displayTaxType(markFiledTarget.taxType)} — ${markFiledTarget.taxPeriod}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Filed Date *</Label>
              <Input type="date" value={markFiledForm.filedDate} onChange={e => setMarkFiledForm(f => ({ ...f, filedDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Filing Amount ({currencyCode})</Label>
              <Input type="number" placeholder="0.00" value={markFiledForm.filingAmount} onChange={e => setMarkFiledForm(f => ({ ...f, filingAmount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Filing Reference</Label>
              <Input placeholder="e.g. TRN-2026-001" value={markFiledForm.filingReference} onChange={e => setMarkFiledForm(f => ({ ...f, filingReference: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMarkFiledDialog(false)}>Cancel</Button>
            <Button onClick={handleMarkFiled} disabled={savingMarkFiled || !markFiledForm.filedDate}
              style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}>
              {savingMarkFiled ? "Saving..." : "Confirm Filed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Tax Type Config Dialog (local only) ── */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editingConfig ? "Edit Tax Type" : "Add Tax Type"}</DialogTitle>
            <DialogDescription>Configure tax type, filing frequency, and linked accounts</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Tax Type *</Label>
              <Input placeholder="e.g. VAT, Corporate Tax" value={configForm.taxType} onChange={e => setConfigForm(f => ({ ...f, taxType: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Filing Frequency *</Label>
              <Select value={configForm.filingFrequency} onValueChange={v => setConfigForm(f => ({ ...f, filingFrequency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Monthly">Monthly</SelectItem>
                  <SelectItem value="Quarterly">Quarterly</SelectItem>
                  <SelectItem value="Annually">Annually</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tax Rate</Label>
              <Input placeholder="e.g. 5%, 9%, 50%" value={configForm.rate} onChange={e => setConfigForm(f => ({ ...f, rate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Linked Accounts (comma-separated)</Label>
              <Textarea placeholder="e.g. Revenue, Operating Expenses" rows={2} value={configForm.linkedAccounts} onChange={e => setConfigForm(f => ({ ...f, linkedAccounts: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={configForm.status} onValueChange={v => setConfigForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfigDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveConfig} disabled={!configForm.taxType}
              style={{ background: 'linear-gradient(135deg, #2B7A78 0%, #2B7A78 100%)', color: 'white' }}>
              {editingConfig ? "Update" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
