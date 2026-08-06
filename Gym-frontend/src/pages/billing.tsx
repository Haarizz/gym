import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import {
  AlertCircle,
  CreditCard,
  Download,
  Search,
  Filter,
  Calendar,
  Clock,
  CheckCircle,
  Send,
  Plus,
  FileText,
  Loader2,
  MessageSquare,
  Mail,
  Phone,
  Printer,
  TrendingUp,
  RefreshCw,
  Snowflake,
  ScrollText,
  UserRoundSearch,
  Baby,
  Users
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';
import { billingService, BillingStats, MemberDue, MemberStatement } from '../utils/supabase/billing-service';
import { receiptsService } from '../utils/supabase/receipts-service';
import type { Receipt } from '../utils/supabase/receipts-service';
import { membersService } from '../utils/supabase/members-service';
import type { Member } from '../utils/supabase/members-service';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { downloadReceiptInvoice } from '../utils/receipt-invoice';

interface BillingProps {
  onNavigate?: (section: string) => void;
}

export function Billing({ onNavigate }: BillingProps = {}) {
  const navigate = useNavigate();
  const { currencyCode } = useCurrency();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedTransactionType, setSelectedTransactionType] = useState("all-transactions");
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  // Send receipt dialog
  const [sendingReceipt, setSendingReceipt] = useState<Receipt | null>(null);
  const [sendChannels, setSendChannels] = useState<string[]>([]);

  // Send reminder dialog
  const [reminderMember, setReminderMember] = useState<MemberDue | null>(null);
  const [bulkReminderOpen, setBulkReminderOpen] = useState(false);
  const [reminderChannels, setReminderChannels] = useState<string[]>(['Email', 'SMS']);

  // Freeze accounts dialog
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [freezeMember, setFreezeMember] = useState<MemberDue | null>(null);

  // Member SOA (Statement of Account) tab
  const [soaSearchTerm, setSoaSearchTerm]       = useState("");
  const [soaSuggestions, setSoaSuggestions]     = useState<Member[]>([]);
  const [soaSearchLoading, setSoaSearchLoading] = useState(false);
  const [soaShowSuggestions, setSoaShowSuggestions] = useState(false);
  const [soaSelectedMember, setSoaSelectedMember] = useState<Member | null>(null);
  const [soaFrom, setSoaFrom]                   = useState("");
  const [soaTo, setSoaTo]                       = useState("");
  const [soaStatement, setSoaStatement]         = useState<MemberStatement | null>(null);
  const [soaLoading, setSoaLoading]             = useState(false);

  // Real data state
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [memberDues, setMemberDues] = useState<MemberDue[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingDues, setLoadingDues] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);

  const loadStats = () => {
    setLoadingStats(true);
    billingService.getStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoadingStats(false));
  };

  const loadDues = () => {
    setLoadingDues(true);
    billingService.getMemberDues()
      .then(setMemberDues)
      .catch(console.error)
      .finally(() => setLoadingDues(false));
  };

  useEffect(() => { loadStats(); loadDues(); }, []);

  // ── Member SOA: debounced member search ─────────────────────────────────
  useEffect(() => {
    if (!soaSearchTerm.trim()) { setSoaSuggestions([]); return; }
    setSoaSearchLoading(true);
    const timer = setTimeout(() => {
      membersService.searchMembers(soaSearchTerm)
        .then(setSoaSuggestions)
        .catch(() => setSoaSuggestions([]))
        .finally(() => setSoaSearchLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [soaSearchTerm]);

  const handleSelectSoaMember = (member: Member) => {
    setSoaSelectedMember(member);
    setSoaSearchTerm("");
    setSoaShowSuggestions(false);
    setSoaSuggestions([]);
    setSoaStatement(null);
  };

  const handleGenerateStatement = () => {
    if (!soaSelectedMember) { toast.error('Please select a member first'); return; }
    setSoaLoading(true);
    billingService.getMemberStatement(Number(soaSelectedMember.id), soaFrom || undefined, soaTo || undefined)
      .then(setSoaStatement)
      .catch(() => toast.error('Failed to generate statement'))
      .finally(() => setSoaLoading(false));
  };

  const handleExportStatementCsv = () => {
    if (!soaStatement || soaStatement.lines.length === 0) { toast.info('No statement lines to export'); return; }
    const header = 'Date,Receipt #,Type,Description,Debit,Credit,Balance,Payment Method,Status\n';
    const rows = soaStatement.lines.map(l =>
      `"${l.date}","${l.receipt_no}","${l.type}","${l.description.replace(/"/g, '""')}","${l.debit.toFixed(2)}","${l.credit.toFixed(2)}","${l.balance.toFixed(2)}","${l.payment_method ?? ''}","${l.status}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soa-${soaStatement.member_id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported statement for ${soaStatement.member_name}`);
  };

  useEffect(() => {
    const filters: { search?: string; transactionType?: string; status?: string } = {};
    if (searchTerm) filters.search = searchTerm;
    if (selectedTransactionType !== 'all-transactions') filters.transactionType = selectedTransactionType;
    if (selectedStatus !== 'all') filters.status = selectedStatus;

    setLoadingReceipts(true);
    receiptsService.getReceipts(filters, { limit: 50 })
      .then(r => setReceipts(r.receipts))
      .catch(console.error)
      .finally(() => setLoadingReceipts(false));
  }, [searchTerm, selectedTransactionType, selectedStatus]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Paid":     return "bg-green-100 text-green-800";
      case "Pending":  return "bg-yellow-100 text-yellow-800";
      case "Overdue":  return "bg-red-100 text-red-800";
      case "Partial":  return "bg-orange-100 text-orange-800";
      case "Due Soon": return "bg-orange-100 text-orange-800";
      default:         return "bg-gray-100 text-gray-800";
    }
  };

  const toggleChannel = (list: string[], setList: (v: string[]) => void, ch: string) =>
    setList(list.includes(ch) ? list.filter(c => c !== ch) : [...list, ch]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleDownloadReceipt = (receipt: Receipt) => {
    downloadReceiptInvoice(receipt, currencyCode);
  };

  const handleSendReceipt = () => {
    if (!sendingReceipt || sendChannels.length === 0) return;
    toast.success(`Receipt sent via ${sendChannels.join(', ')}`, {
      description: `${sendingReceipt.receipt_no} sent to ${sendingReceipt.member_name}`
    });
    setSendingReceipt(null);
    setSendChannels([]);
  };

  const handleCollectPayment = (due: MemberDue) => {
    // Navigate to create-receipt with member pre-selected via location state
    navigate('/create-receipt', {
      state: { preSelectMemberId: due.id, preSelectMemberName: due.member_name }
    });
  };

  const handleSendReminder = () => {
    const target = reminderMember ? reminderMember.member_name : `${memberDues.length} members`;
    toast.success(`Reminder sent to ${target}`, {
      description: `Sent via ${reminderChannels.join(', ')}`
    });
    setReminderMember(null);
    setBulkReminderOpen(false);
  };

  const handleFreezeAccount = () => {
    if (!freezeMember) return;
    toast.success(`Account frozen`, {
      description: `${freezeMember.member_name}'s account has been frozen`
    });
    setFreezeOpen(false);
    setFreezeMember(null);
    // Refresh dues
    loadDues();
  };

  const handleExportOverdueReport = () => {
    const overdue = memberDues.filter(m => m.status === 'Overdue');
    if (overdue.length === 0) { toast.info('No overdue members to export'); return; }
    const header = 'Member Name,Member ID,Email,Phone,Membership,Due Type,Amount Due,Due Date,Days Overdue,Last Payment\n';
    const rows = overdue.map(m =>
      `"${m.member_name}","${m.member_id}","${m.member_email}","${m.member_phone}","${m.membership ?? ''}","${m.due_type ?? 'Membership Due'}","${m.amount ?? 0}","${m.due_date ?? ''}","${m.days_overdue}","${m.last_payment ?? ''}"`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `overdue-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${overdue.length} overdue member(s)`);
  };

  const handleExportAllReceipts = () => {
    if (receipts.length === 0) { toast.info('No receipts to export'); return; }
    const header = 'Receipt No,Member,Member ID,Plan,Type,Amount Paid,Remaining Due,Date & Time,Payment Method,Created By,Status\n';
    const rows = receipts.map(r => {
      const paid = Number(r.paid_amount ?? 0);
      const remainingDue = Number(r.balance_after ?? 0);
      return `"${r.receipt_no}","${r.member_name}","${r.member_id}","${r.plan_name ?? ''}","${r.transaction_type}","${paid.toFixed(2)}","${remainingDue.toFixed(2)}","${r.transaction_date ? new Date(r.transaction_date).toLocaleString() : ''}","${r.payment_method ?? ''}","${r.processed_by ?? ''}","${r.status}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${receipts.length} receipt(s)`);
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const overdueCount      = stats?.overdue_count      ?? 0;
  const overdueAmount     = stats?.overdue_amount     ?? 0;
  const dueSoonCount      = stats?.due_soon_count     ?? 0;
  const collectionRate    = stats?.collection_rate    ?? 0;
  const monthlyCollection = stats?.monthly_collection ?? 0;
  const monthlyTarget     = stats?.monthly_target     ?? 50000;
  const chartData         = stats?.monthly_data?.map(d => ({
    month:     d.month,
    collected: Number(d.collected),
    target:    Number(d.target),
  })) ?? [];
  const paymentBreakdown = stats?.payment_method_breakdown ?? {};
  const totalBreakdown   = Object.values(paymentBreakdown).reduce((s, v) => s + Number(v), 0);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Manage member receipts, dues, and payment collections.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportAllReceipts}>
            <Download className="mr-2 h-4 w-4" />Export Data
          </Button>
          <Button onClick={() => navigate('/create-receipt')}>
            <Plus className="mr-2 h-4 w-4" />Create Receipt
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes tabSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [role="tabpanel"][data-state="active"] { animation: tabSlideIn 0.22s ease-out; }
      `}</style>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Collection</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <>
                <div className="text-2xl font-bold"><CurrencyGlyph /> {Number(monthlyCollection).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Target: <CurrencyGlyph /> {monthlyTarget.toLocaleString()}</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Payments</CardTitle>
            <div className="p-2 rounded-lg bg-red-100"><AlertCircle className="h-4 w-4 text-red-600" /></div>
          </CardHeader>
          <CardContent>
            {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <>
                <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
                <p className="text-xs text-muted-foreground"><CurrencyGlyph /> {Number(overdueAmount).toLocaleString()} total</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Due Soon</CardTitle>
            <div className="p-2 rounded-lg bg-orange-100"><Clock className="h-4 w-4 text-orange-600" /></div>
          </CardHeader>
          <CardContent>
            {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <>
                <div className="text-2xl font-bold text-orange-600">{dueSoonCount}</div>
                <p className="text-xs text-muted-foreground">Next 7 days</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Collection Rate</CardTitle>
            <div className="p-2 rounded-lg bg-green-100"><CheckCircle className="h-4 w-4 text-green-600" /></div>
          </CardHeader>
          <CardContent>
            {loadingStats ? <Loader2 className="h-6 w-6 animate-spin" /> : (
              <>
                <div className="text-2xl font-bold text-green-600">{collectionRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">This month</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="receipts" className="space-y-6">
        <TabsList className="w-full flex">
          <TabsTrigger value="receipts" className="flex-1">Member Receipts</TabsTrigger>
          <TabsTrigger value="dues" className="flex-1">Member Due</TabsTrigger>
          <TabsTrigger value="soa" className="flex-1">Member SOA</TabsTrigger>
          <TabsTrigger value="collection" className="flex-1">Total Collection</TabsTrigger>
        </TabsList>

        {/* ── Member Receipts Tab ── */}
        <TabsContent value="receipts" className="space-y-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Member Receipts</CardTitle>
                  <CardDescription>All payment receipts and transaction history</CardDescription>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={handleExportAllReceipts}>
                    <Download className="mr-2 h-4 w-4" />Export CSV
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by receipt #, member name, ID or phone..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={selectedTransactionType} onValueChange={setSelectedTransactionType}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Transaction Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all-transactions">All Transactions</SelectItem>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Renewal">Renewal</SelectItem>
                    <SelectItem value="Add-on">Add-on</SelectItem>
                    <SelectItem value="Payment">Payment</SelectItem>
                    <SelectItem value="Daily Entry">Daily Entry</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loadingReceipts ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : receipts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No receipts found.</div>
              ) : (
                <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Receipt #</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount Paid</TableHead>
                      <TableHead>Transaction Date &amp; Time</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Remaining Due</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <TableRow key={receipt.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Every payment action — the bill's own initial payment, and each
                            later settlement — is its own immutable row with its own unique
                            receipt number. Two payments made at different times are NEVER
                            merged into one row; only legs paid within the SAME payment
                            event (below) are combined under one receipt. */}
                        <TableCell className="font-medium">{receipt.receipt_no}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {receipt.member_name?.split(' ').map(n => n[0]).join('') ?? '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{receipt.member_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {receipt.member_id}{receipt.plan_name ? ` · ${receipt.plan_name}` : ''}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{receipt.transaction_type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          <div><CurrencyGlyph /> {Number(receipt.paid_amount ?? 0).toLocaleString()}</div>
                          {receipt.transaction_type !== 'Payment' && Number(receipt.due_amount ?? 0) > 0 && (
                            <div className="text-xs font-normal text-amber-600">
                              of <CurrencyGlyph /> {Number(receipt.amount).toLocaleString()} — <CurrencyGlyph /> {Number(receipt.due_amount).toLocaleString()} due on this bill
                            </div>
                          )}
                          {/* Legs paid within this SAME payment event only (e.g. 20 Cash +
                              30 Card at one checkout) — never legs from separate payments
                              made at different times, which each get their own row instead. */}
                          {receipt.payment_breakdown && receipt.payment_breakdown.length > 1 && (
                            <div className="text-xs font-normal text-muted-foreground mt-0.5">
                              Split: {receipt.payment_breakdown
                                .map(leg => `${Number(leg.amount).toLocaleString()} (${leg.method})`)
                                .join(' + ')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {receipt.transaction_date ? new Date(receipt.transaction_date).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <CreditCard className="mr-2 h-4 w-4 text-muted-foreground" />
                            {receipt.payment_method ?? '-'}
                          </div>
                        </TableCell>
                        <TableCell className={Number(receipt.balance_after ?? 0) > 0 ? 'text-red-600 font-medium' : ''}>
                          <CurrencyGlyph /> {Number(receipt.balance_after ?? 0).toLocaleString()}
                        </TableCell>
                        <TableCell>{receipt.processed_by ?? '-'}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(receipt.status)}>{receipt.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* View Details */}
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0 border-primary/20 hover:bg-blue-50"
                              title="View Details"
                              onClick={() => setSelectedReceipt(receipt)}
                            >
                              <FileText className="h-4 w-4 text-blue-600" />
                            </Button>
                            {/* Download */}
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0 border-primary/20 hover:bg-green-50"
                              title="Download Receipt"
                              onClick={() => handleDownloadReceipt(receipt)}
                            >
                              <Download className="h-4 w-4 text-green-600" />
                            </Button>
                            {/* Send */}
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0 border-primary/20 hover:bg-purple-50"
                              title="Send Receipt"
                              onClick={() => { setSendingReceipt(receipt); setSendChannels([]); }}
                            >
                              <Send className="h-4 w-4 text-purple-600" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Member Due Tab ── */}
        <TabsContent value="dues" className="space-y-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Member Due Payments</CardTitle>
                  <CardDescription>Track overdue and upcoming membership payments</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { loadDues(); loadStats(); }}>
                    <RefreshCw className="mr-2 h-4 w-4" />Refresh
                  </Button>
                  <Button
                    disabled={memberDues.length === 0}
                    onClick={() => { setReminderMember(null); setBulkReminderOpen(true); setReminderChannels(['Email', 'SMS']); }}
                  >
                    <Send className="mr-2 h-4 w-4" />Send Reminders
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingDues ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : memberDues.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
                  <p className="text-lg font-medium mb-1">No Outstanding Dues</p>
                  <p className="text-sm text-muted-foreground">
                    All members are up to date. Members who are <strong>overdue</strong>, have a <strong>pending</strong> balance, or a payment due within 7 days will appear here.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Member</TableHead>
                      <TableHead>Membership</TableHead>
                      <TableHead>Due Type</TableHead>
                      <TableHead>Amount Due</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead>Last Payment</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberDues.map((due) => (
                      <TableRow key={due.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {due.member_name?.split(' ').map(n => n[0]).join('') ?? '?'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{due.member_name}</div>
                              <div className="text-sm text-muted-foreground">{due.member_email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{due.membership ?? '-'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={due.due_type === 'Membership Due'
                              ? 'border-amber-300 text-amber-700 bg-amber-50'
                              : 'border-blue-300 text-blue-700 bg-blue-50'}
                          >
                            {due.due_type ?? 'Membership Due'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium text-red-600">
                          <CurrencyGlyph /> {due.amount != null ? Number(due.amount).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          <div className={due.status === "Overdue" ? "text-red-600 font-medium" : ""}>
                            {due.due_date ? new Date(due.due_date).toLocaleDateString() : '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {due.days_overdue > 0
                            ? <span className="text-red-600 font-medium">{due.days_overdue} days</span>
                            : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {due.last_payment ? new Date(due.last_payment).toLocaleDateString() : 'Never'}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(due.status)}>{due.status}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {/* Send Reminder */}
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0 border-primary/20 hover:bg-blue-50"
                              title="Send Reminder"
                              onClick={() => { setReminderMember(due); setReminderChannels(['Email', 'SMS']); }}
                            >
                              <Send className="h-4 w-4 text-blue-600" />
                            </Button>
                            {/* Collect Payment */}
                            <Button
                              variant="outline" size="sm"
                              className="h-8 w-8 p-0 border-primary/20 hover:bg-green-50"
                              title="Collect Payment"
                              onClick={() => handleCollectPayment(due)}
                            >
                              <CreditCard className="h-4 w-4 text-green-600" />
                            </Button>
                            {/* Freeze (overdue only) */}
                            {due.status === "Overdue" && (
                              <Button
                                variant="outline" size="sm"
                                className="h-8 w-8 p-0 border-primary/20 hover:bg-red-50"
                                title="Freeze Account"
                                onClick={() => { setFreezeMember(due); setFreezeOpen(true); }}
                              >
                                <Snowflake className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader><CardTitle>Overdue Summary</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Overdue Amount</span>
                    <span className="font-bold text-red-600"><CurrencyGlyph /> {Number(overdueAmount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Overdue Members</span>
                    <span className="font-bold">{overdueCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Due Soon (7 days)</span>
                    <span className="font-bold text-orange-600">{dueSoonCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Avg Days Overdue</span>
                    <span className="font-bold">
                      {overdueCount > 0
                        ? Math.round(memberDues.filter(m => m.days_overdue > 0).reduce((s, m) => s + m.days_overdue, 0) / overdueCount)
                        : 0} days
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={memberDues.filter(m => m.status === 'Overdue').length === 0}
                  onClick={() => { setReminderMember(null); setBulkReminderOpen(true); setReminderChannels(['Email', 'SMS']); }}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Send Overdue Reminders ({memberDues.filter(m => m.status === 'Overdue').length})
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => navigate('/create-receipt')}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Collect Payment
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={handleExportOverdueReport}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Overdue Report
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={memberDues.filter(m => m.status === 'Overdue').length === 0}
                  onClick={() => {
                    toast.info(`${memberDues.filter(m => m.status === 'Overdue').length} overdue account(s) would be frozen`, {
                      description: 'Use individual freeze buttons to freeze specific accounts'
                    });
                  }}
                >
                  <Snowflake className="mr-2 h-4 w-4" />
                  Freeze Overdue Accounts ({memberDues.filter(m => m.status === 'Overdue').length})
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Member SOA Tab ── */}
        <TabsContent value="soa" className="space-y-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRoundSearch className="h-5 w-5" style={{ color: '#2B7A78' }} />Generate Statement of Account
              </CardTitle>
              <CardDescription>Select a member to see every receipt billed and paid against them, in one place</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="relative">
                  <Label className="mb-2 block">Select Member *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search by name, ID or phone..."
                      className="pl-10"
                      value={soaSelectedMember ? soaSelectedMember.name : soaSearchTerm}
                      onChange={(e) => {
                        setSoaSelectedMember(null);
                        setSoaSearchTerm(e.target.value);
                        setSoaShowSuggestions(true);
                      }}
                      onFocus={() => setSoaShowSuggestions(true)}
                    />
                  </div>
                  {soaShowSuggestions && soaSearchTerm && !soaSelectedMember && (
                    <Card className="absolute z-10 w-full mt-2 max-h-80 overflow-y-auto border-slate-200/80 shadow-md">
                      <CardContent className="p-2">
                        {soaSearchLoading ? (
                          <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
                        ) : soaSuggestions.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center p-4">No members found</p>
                        ) : soaSuggestions.map(member => (
                          <div
                            key={member.id}
                            onClick={() => handleSelectSoaMember(member)}
                            className="p-3 rounded-lg hover:bg-[#DFF5F4] cursor-pointer transition-colors mb-1"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-gradient-to-r from-[#2B7A78] to-[#00c5cb] text-white text-xs">
                                  {member.name?.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="font-medium text-sm flex items-center gap-1">
                                  {member.name}
                                  {member.is_minor && <Baby className="h-4 w-4 text-amber-600" />}
                                </div>
                                <div className="flex gap-2 text-xs text-muted-foreground">
                                  <span>{member.member_id}</span>
                                  <span>{member.phone}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
                <div>
                  <Label className="mb-2 block">From Date</Label>
                  <Input type="date" value={soaFrom} onChange={(e) => setSoaFrom(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-2 block">To Date</Label>
                  <Input type="date" value={soaTo} onChange={(e) => setSoaTo(e.target.value)} />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button
                  style={{ backgroundColor: '#2B7A78' }}
                  className="text-white"
                  disabled={!soaSelectedMember || soaLoading}
                  onClick={handleGenerateStatement}
                >
                  {soaLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScrollText className="mr-2 h-4 w-4" />}
                  Generate Statement
                </Button>
                {soaStatement && !soaStatement.billed_to_head && (
                  <Button variant="outline" onClick={handleExportStatementCsv}>
                    <Download className="mr-2 h-4 w-4" />Export CSV
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {soaLoading && (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          )}

          {!soaLoading && soaStatement && soaStatement.billed_to_head && (
            <Card className="border-amber-200 bg-amber-50 shadow-md">
              <CardContent className="py-12 text-center">
                {soaStatement.is_minor
                  ? <Baby className="h-12 w-12 mx-auto text-amber-600 mb-3" />
                  : <Users className="h-12 w-12 mx-auto text-amber-600 mb-3" />}
                <p className="text-lg font-medium mb-1">
                  {soaStatement.member_name} {soaStatement.is_minor ? 'is a minor' : 'is billed to their family head'}
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  This member doesn't carry an independent billing account — there are no transactions to show here.
                  {soaStatement.family_head_name
                    ? <> Their fees are billed to their {soaStatement.is_minor ? 'guardian' : 'family head'}, <strong>{soaStatement.family_head_name}</strong> — generate that member's statement to see them itemized there.</>
                    : ' Their fees are billed to their family head.'}
                </p>
              </CardContent>
            </Card>
          )}

          {!soaLoading && soaStatement && !soaStatement.billed_to_head && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-primary/10 shadow-md">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Opening Balance</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold"><CurrencyGlyph /> {soaStatement.opening_balance.toLocaleString()}</div></CardContent>
                </Card>
                <Card className="border-primary/10 shadow-md">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Billed</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold"><CurrencyGlyph /> {soaStatement.total_billed.toLocaleString()}</div></CardContent>
                </Card>
                <Card className="border-primary/10 shadow-md">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Paid</CardTitle></CardHeader>
                  <CardContent><div className="text-xl font-bold text-green-600"><CurrencyGlyph /> {soaStatement.total_paid.toLocaleString()}</div></CardContent>
                </Card>
                <Card className="border-primary/10 shadow-md">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Closing Balance</CardTitle></CardHeader>
                  <CardContent>
                    <div className={`text-xl font-bold ${soaStatement.closing_balance > 0 ? 'text-red-600' : ''}`}>
                      <CurrencyGlyph /> {soaStatement.closing_balance.toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle>{soaStatement.member_name} — Statement of Account</CardTitle>
                  <CardDescription>{soaStatement.member_id}{soaStatement.member_phone ? ` · ${soaStatement.member_phone}` : ''}</CardDescription>
                </CardHeader>
                <CardContent>
                  {soaStatement.lines.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">No transactions found for this member{soaFrom || soaTo ? ' in the selected date range' : ''}.</div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Date</TableHead>
                          <TableHead>Receipt #</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Debit</TableHead>
                          <TableHead className="text-right">Credit</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {soaStatement.lines.map((line, idx) => (
                          <TableRow key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell>{line.date ? new Date(line.date).toLocaleDateString() : '-'}</TableCell>
                            <TableCell className="font-medium">{line.receipt_no}</TableCell>
                            <TableCell><Badge variant="outline" className="text-xs">{line.type}</Badge></TableCell>
                            <TableCell>
                              <div>{line.description}</div>
                              {line.minor_charges && line.minor_charges.length > 0 && (
                                <div className="text-xs text-amber-700 mt-0.5 flex items-center gap-1">
                                  <Baby className="h-3 w-3" />
                                  {line.type === 'Payment'
                                    ? line.minor_charges.map(mc =>
                                        `Due of ${mc.name} (${Number(mc.amount).toLocaleString()}) paid by ${soaStatement?.member_name || 'family head'}`
                                      ).join(', ')
                                    : `Incl. ${line.minor_charges.map(mc => `${mc.name}: ${Number(mc.amount).toLocaleString()}`).join(', ')}`}
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {line.debit > 0 ? <><CurrencyGlyph /> {line.debit.toLocaleString()}</> : '-'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {line.credit > 0 ? <><CurrencyGlyph /> {line.credit.toLocaleString()}</> : '-'}
                            </TableCell>
                            <TableCell className={`text-right font-bold ${line.balance > 0 ? 'text-red-600' : ''}`}>
                              <CurrencyGlyph /> {line.balance.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!soaLoading && !soaStatement && (
            <Card className="border-primary/10 shadow-md">
              <CardContent className="py-12 text-center text-muted-foreground">
                <ScrollText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                Search and select a member above, then click <strong>Generate Statement</strong> to see their full payment history.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── Total Collection Tab ── */}
        <TabsContent value="collection" className="space-y-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Total Collection Analytics</CardTitle>
                  <CardDescription>Revenue collection trends — last 12 months</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadStats} disabled={loadingStats}>
                  {loadingStats ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Refresh</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
              ) : chartData.every(d => d.collected === 0) ? (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">No paid receipts recorded yet. Data will appear here once payments are collected.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `${currencyCode} ${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(value: number) => [`${currencyCode} ${value.toLocaleString()}`, '']} />
                    <Legend />
                    <Bar dataKey="collected" fill="#2B7A78" name="Collected" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target"    fill="#DFF5F4" name="Target"    radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader><CardTitle>This Month</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold"><CurrencyGlyph /> {Number(monthlyCollection).toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">
                  {monthlyTarget > 0 ? ((Number(monthlyCollection) / monthlyTarget) * 100).toFixed(1) : 0}% of target
                </p>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((Number(monthlyCollection) / monthlyTarget) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader><CardTitle>Average Monthly</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  <CurrencyGlyph /> {chartData.length > 0
                    ? Math.round(chartData.reduce((s, d) => s + d.collected, 0) / chartData.length).toLocaleString()
                    : 0}
                </div>
                <p className="text-sm text-muted-foreground">Based on {chartData.filter(d => d.collected > 0).length} active months</p>
              </CardContent>
            </Card>

            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader><CardTitle>Collection Rate</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">{collectionRate.toFixed(1)}%</div>
                <p className="text-sm text-muted-foreground">Paid vs total billed this month</p>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(collectionRate, 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Collection by Payment Method</CardTitle>
                <span className="text-sm text-muted-foreground">This month</span>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(paymentBreakdown).length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">No payment data for this month yet.</p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(paymentBreakdown)
                    .sort(([, a], [, b]) => Number(b) - Number(a))
                    .map(([method, amount]) => {
                      const pct = totalBreakdown > 0 ? (Number(amount) / totalBreakdown) * 100 : 0;
                      return (
                        <div key={method} className="p-4 rounded-lg bg-white shadow-sm border border-slate-100">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-medium">{method}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground"><CurrencyGlyph /> {Number(amount).toLocaleString()}</span>
                              <span className="text-sm font-semibold text-blue-600">{pct.toFixed(1)}%</span>
                            </div>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-200/60 overflow-hidden">
                            <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  <div className="flex justify-between p-3 bg-slate-50 rounded-lg mt-2">
                    <span className="font-medium">Total Collected This Month</span>
                    <span className="font-bold"><CurrencyGlyph /> {totalBreakdown.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Receipt Details Dialog ── */}
      {selectedReceipt && (
        <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Receipt Details</DialogTitle>
              <DialogDescription>Complete details of the selected receipt transaction</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-bold text-lg">{selectedReceipt.receipt_no}</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedReceipt.transaction_date ? new Date(selectedReceipt.transaction_date).toLocaleDateString() : '-'}
                  </div>
                </div>
                <Badge className={getStatusColor(selectedReceipt.status)}>{selectedReceipt.status}</Badge>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Member:</span>
                  <span className="text-sm">{selectedReceipt.member_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Member ID:</span>
                  <span className="text-sm">{selectedReceipt.member_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Plan:</span>
                  <span className="text-sm">{selectedReceipt.plan_name ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Transaction Type:</span>
                  <span className="text-sm">{selectedReceipt.transaction_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Payment Method:</span>
                  <span className="text-sm">{selectedReceipt.payment_method}</span>
                </div>
                {selectedReceipt.processed_by && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Processed By:</span>
                    <span className="text-sm">{selectedReceipt.processed_by}</span>
                  </div>
                )}
                {selectedReceipt.valid_from && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Valid From:</span>
                    <span className="text-sm">{new Date(selectedReceipt.valid_from).toLocaleDateString()}</span>
                  </div>
                )}
                {selectedReceipt.valid_till && (
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Valid Till:</span>
                    <span className="text-sm">{new Date(selectedReceipt.valid_till).toLocaleDateString()}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-medium">Total Amount:</span>
                  <span className="font-bold text-lg"><CurrencyGlyph /> {Number(selectedReceipt.amount).toLocaleString()}</span>
                </div>
                {(() => {
                  const paid = Number(selectedReceipt.paid_amount ?? 0);
                  const pending = Number(selectedReceipt.due_amount ?? 0);
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Paid (this transaction):</span>
                        <span>
                          <CurrencyGlyph /> {paid.toLocaleString()}
                        </span>
                      </div>
                      {pending > 0 && selectedReceipt.transaction_type !== 'Payment' && (
                        <div className="flex justify-between text-sm">
                          <span className="text-amber-600 font-medium">Still due on this bill:</span>
                          <span className="text-amber-600 font-medium">
                            <CurrencyGlyph /> {pending.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Remaining due (member balance):</span>
                  <span className={Number(selectedReceipt.balance_after ?? 0) > 0 ? 'text-red-600 font-medium' : ''}>
                    <CurrencyGlyph /> {Number(selectedReceipt.balance_after ?? 0).toLocaleString()}
                  </span>
                </div>
                {selectedReceipt.payment_breakdown && selectedReceipt.payment_breakdown.length > 1 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-sm text-muted-foreground">Payment Split (same transaction):</span>
                    {selectedReceipt.payment_breakdown.map((leg, idx) => (
                      <div key={idx} className="flex justify-between text-sm pl-2">
                        <span className="text-muted-foreground">{leg.method}{leg.reference ? ` — ${leg.reference}` : ''}</span>
                        <span><CurrencyGlyph /> {Number(leg.amount).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleDownloadReceipt(selectedReceipt)}>
                <Download className="mr-2 h-4 w-4" />Download
              </Button>
              <Button onClick={() => { setSendingReceipt(selectedReceipt); setSendChannels([]); setSelectedReceipt(null); }}>
                <Send className="mr-2 h-4 w-4" />Send Receipt
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Send Receipt Dialog ── */}
      <Dialog open={!!sendingReceipt} onOpenChange={() => { setSendingReceipt(null); setSendChannels([]); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" style={{ color: '#2B7A78' }} />Send Receipt
            </DialogTitle>
            <DialogDescription>
              {sendingReceipt?.receipt_no} — {sendingReceipt?.member_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {[
              { ch: 'Email',     icon: <Mail className="h-5 w-5 text-blue-600" />,        info: sendingReceipt?.member_id },
              { ch: 'SMS',       icon: <MessageSquare className="h-5 w-5 text-green-600" />, info: sendingReceipt?.member_phone },
              { ch: 'WhatsApp',  icon: <Phone className="h-5 w-5 text-green-700" />,       info: sendingReceipt?.member_phone },
              { ch: 'Print',     icon: <Printer className="h-5 w-5 text-gray-600" />,      info: 'Print a copy' },
            ].map(opt => (
              <div
                key={opt.ch}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                  sendChannels.includes(opt.ch) ? 'border-[#2B7A78] bg-[#DFF5F4]/30' : 'border-border hover:border-[#2B7A78]/50'
                }`}
                onClick={() => toggleChannel(sendChannels, setSendChannels, opt.ch)}
              >
                <Checkbox checked={sendChannels.includes(opt.ch)} onCheckedChange={() => toggleChannel(sendChannels, setSendChannels, opt.ch)} />
                {opt.icon}
                <div>
                  <p className="font-medium text-sm">{opt.ch}</p>
                  <p className="text-xs text-muted-foreground">{opt.info}</p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSendingReceipt(null); setSendChannels([]); }}>Cancel</Button>
            <Button
              disabled={sendChannels.length === 0}
              style={{ backgroundColor: '#2B7A78' }}
              className="text-white"
              onClick={handleSendReceipt}
            >
              <Send className="mr-2 h-4 w-4" />Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send Reminder Dialog (single or bulk) ── */}
      <Dialog
        open={!!reminderMember || bulkReminderOpen}
        onOpenChange={() => { setReminderMember(null); setBulkReminderOpen(false); }}
      >
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              {reminderMember ? `Send Reminder — ${reminderMember.member_name}` : `Send Bulk Reminders (${memberDues.length})`}
            </DialogTitle>
            <DialogDescription>
              {reminderMember
                ? `Amount due: ${currencyCode} ${Number(reminderMember.amount ?? 0).toLocaleString()} · Due: ${reminderMember.due_date ?? '-'}`
                : `Send a payment reminder to all ${memberDues.length} member(s) with outstanding dues`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <Label className="text-sm font-medium">Select channels:</Label>
            {['Email', 'SMS', 'WhatsApp'].map(ch => (
              <div
                key={ch}
                className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-all ${
                  reminderChannels.includes(ch) ? 'border-[#2B7A78] bg-[#DFF5F4]/30' : 'border-border hover:border-[#2B7A78]/50'
                }`}
                onClick={() => toggleChannel(reminderChannels, setReminderChannels, ch)}
              >
                <Checkbox checked={reminderChannels.includes(ch)} onCheckedChange={() => toggleChannel(reminderChannels, setReminderChannels, ch)} />
                <span className="font-medium text-sm">{ch}</span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReminderMember(null); setBulkReminderOpen(false); }}>Cancel</Button>
            <Button
              disabled={reminderChannels.length === 0}
              style={{ backgroundColor: '#2B7A78' }}
              className="text-white"
              onClick={handleSendReminder}
            >
              <Send className="mr-2 h-4 w-4" />Send Reminder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Freeze Account Dialog ── */}
      <Dialog open={freezeOpen} onOpenChange={() => { setFreezeOpen(false); setFreezeMember(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Snowflake className="h-5 w-5" />Freeze Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to freeze <strong>{freezeMember?.member_name}</strong>'s account?
              They will lose access until the account is unfrozen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              <strong>Outstanding Amount:</strong> <CurrencyGlyph /> {Number(freezeMember?.amount ?? 0).toLocaleString()} · {freezeMember?.days_overdue ?? 0} days overdue
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFreezeOpen(false); setFreezeMember(null); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleFreezeAccount}>
              <Snowflake className="mr-2 h-4 w-4" />Freeze Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
