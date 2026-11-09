import React, { useState, useMemo, useEffect } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";
import {
  Calendar,
  Search,
  Download,
  FileText,
  Filter,
  DollarSign,
  CreditCard,
  Wallet,
  X,
  TrendingUp,
  Users,
  RefreshCcw,
  ArrowLeft,
  Printer,
} from 'lucide-react';
import { PeriodComparison } from "../components/reports/PeriodComparison";
import { PAY_METHOD_ORDER, splitPaid } from "../utils/payment-split";
import { toast } from "sonner";
import { receiptsService, Receipt } from '../utils/supabase/receipts-service';
import { ReportActions, type ReportDocument, col, moneyCol, kpiSection, tableSection, pieSection } from "../components/report-export";

interface CustomReportsProps {
  onNavigate?: (section: string) => void;
  /** Rendered inside another page (e.g. the Reports & Analytics tab): no back link or page padding */
  embedded?: boolean;
}

interface ReportRecord {
  id: string;
  memberId: string;
  memberName: string;
  photoUrl: string | null;
  mobile: string;
  membershipType: string;
  transactionType: string;
  planName: string;
  planAmount: number;
  paymentMode: string;
  dueAmount: number;
  dueDate: string | null;
  transactionDate: string;
  /** Money actually received on this receipt */
  paidAmount: number;
  /** paidAmount split by payment method bucket (Cash, Card, Online, ...) */
  paidByMethod: Record<string, number>;
}

function mapReceiptToRecord(r: Receipt): ReportRecord {
  return {
    id: r.id,
    memberId: r.member_id || '',
    memberName: r.member_name || '',
    photoUrl: null,
    mobile: r.member_phone || '',
    membershipType: (r as any).membership_type || '',
    transactionType: r.transaction_type || '',
    planName: r.plan_name || '',
    planAmount: r.amount ? Number(r.amount) : 0,
    paymentMode: r.payment_method || '',
    // What's still owed on this bill (partial payments included)
    dueAmount: ['pending', 'partial', 'overdue'].includes((r.status || '').toLowerCase())
      ? Math.max(0, Number(r.amount || 0) - Number(r.total_paid_to_date ?? r.paid_amount ?? 0))
      : 0,
    dueDate: r.valid_till || null,
    transactionDate: r.transaction_date ? r.transaction_date.split('T')[0] : '',
    paidAmount: Number(r.paid_amount ?? r.amount ?? 0),
    paidByMethod: splitPaid(r, Number(r.paid_amount ?? r.amount ?? 0)),
  };
}

export function CustomReports({ onNavigate, embedded = false }: CustomReportsProps) {
  const { currencyCode, currencySymbol } = useCurrency();
  const panelCardShell = "bg-white border-0 shadow-sm rounded-2xl overflow-hidden";

  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | 'week' | 'month' | 'all' | 'custom'>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState<string>('all');
  const [reportData, setReportData] = useState<ReportRecord[]>([]);
  const [loading, setLoading] = useState(false);

  // Load receipts from backend
  useEffect(() => {
    setLoading(true);
    receiptsService.getReceipts({}, { page: 1, limit: 500 })
      .then(res => {
        setReportData(res.receipts.map(mapReceiptToRecord));
      })
      .catch(err => {
        console.error('Failed to load receipts:', err);
        toast.error('Failed to load report data');
      })
      .finally(() => setLoading(false));
  }, []);

  // Get today/yesterday dates using local calendar day (not UTC, which can be off by a day near midnight)
  const toLocalDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = toLocalDateStr(new Date());
  const yesterday = toLocalDateStr(new Date(Date.now() - 86400000));

  // Selected date window as local yyyy-MM-dd bounds (inclusive)
  const rangeBounds = (): { startDate: string; endDate: string } | null => {
    if (dateRange === 'all') return null;
    let startDate = today;
    let endDate = today;
    if (dateRange === 'yesterday') {
      startDate = yesterday;
      endDate = yesterday;
    } else if (dateRange === 'week') {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      startDate = toLocalDateStr(d);
    } else if (dateRange === 'month') {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      startDate = toLocalDateStr(d);
    } else if (dateRange === 'custom') {
      startDate = customStartDate || today;
      endDate = customEndDate || today;
    }
    return { startDate, endDate };
  };

  // Filter data based on date range
  const filteredByDate = useMemo(() => {
    const b = rangeBounds();
    if (!b) return reportData;
    return reportData.filter(record => record.transactionDate >= b.startDate && record.transactionDate <= b.endDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportData, dateRange, customStartDate, customEndDate, today, yesterday]);

  // Filter by transaction type
  const filteredByType = useMemo(() => {
    if (transactionTypeFilter === 'all') return filteredByDate;
    return filteredByDate.filter(record => record.transactionType === transactionTypeFilter);
  }, [filteredByDate, transactionTypeFilter]);

  // Filter by search query
  const filteredData = useMemo(() => {
    if (!searchQuery) return filteredByType;
    const query = searchQuery.toLowerCase();
    return filteredByType.filter(record =>
      record.memberName.toLowerCase().includes(query) ||
      record.memberId.toLowerCase().includes(query) ||
      record.mobile.includes(query)
    );
  }, [filteredByType, searchQuery]);

  // Calculate summary
  const summary = useMemo(() => {
    const totalPlans = filteredData.length;
    const totalRevenue = filteredData.reduce((sum, record) => sum + record.planAmount, 0);
    const totalDue = filteredData.reduce((sum, record) => sum + record.dueAmount, 0);
    const totalPaid = filteredData.reduce((sum, record) => sum + record.paidAmount, 0);
    const byMethod: Record<string, number> = {};
    for (const record of filteredData) {
      for (const [m, amt] of Object.entries(record.paidByMethod)) byMethod[m] = (byMethod[m] || 0) + amt;
    }
    const methods = PAY_METHOD_ORDER.filter(m => (byMethod[m] || 0) > 0).map(m => ({ method: m, amount: byMethod[m] }));

    return {
      totalPlans,
      totalRevenue,
      totalDue,
      totalPaid,
      methods,
    };
  }, [filteredData]);


  const getRangeDisplayLabel = () => {
    switch (dateRange) {
      case 'today': return 'Today';
      case 'yesterday': return 'Yesterday';
      case 'week': return 'Last 7 Days';
      case 'month': return 'Last 30 Days';
      case 'all': return 'All Time';
      default: return 'Custom Range';
    }
  };

  // Export / print: every receipt in the selected window (the screen lists the latest 500),
  // with the same type and search filters and the same summary maths.
  const buildMembershipReport = async (): Promise<ReportDocument> => {
    const b = rangeBounds();
    const local = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
    const window = b ? { from: local(b.startDate), to: new Date(local(b.endDate).getTime() + 86400000) } : {};
    const all = (await receiptsService.getAllReceipts(window)).map(mapReceiptToRecord);
    const q = searchQuery.toLowerCase();
    const rows = all
      .filter(r => !b || (r.transactionDate >= b.startDate && r.transactionDate <= b.endDate))
      .filter(r => transactionTypeFilter === 'all' || r.transactionType === transactionTypeFilter)
      .filter(r => !q || r.memberName.toLowerCase().includes(q) || r.memberId.toLowerCase().includes(q) || r.mobile.includes(q))
      .sort((x, y) => (x.transactionDate < y.transactionDate ? 1 : x.transactionDate > y.transactionDate ? -1 : 0));
    const byMethod: Record<string, number> = {};
    rows.forEach(r => Object.entries(r.paidByMethod).forEach(([m, amt]) => { byMethod[m] = (byMethod[m] || 0) + amt; }));
    const methods = PAY_METHOD_ORDER.filter(m => (byMethod[m] || 0) > 0).map(m => ({ method: m, amount: byMethod[m] }));
    const totalPaid = rows.reduce((s, r) => s + r.paidAmount, 0);
    return {
      title: 'Membership Report (Detailed)',
      fileName: 'Membership Report',
      orientation: 'landscape',
      period: b ? { from: b.startDate, to: b.endDate, label: getRangeDisplayLabel() } : { label: 'All Time' },
      filters: [
        { label: 'Transaction type', value: transactionTypeFilter === 'all' ? 'All types' : transactionTypeFilter },
        { label: 'Search', value: searchQuery || undefined },
      ],
      sections: [
        kpiSection([
          { label: 'Transactions', value: rows.length, format: 'integer' },
          { label: 'Total billed', value: rows.reduce((s, r) => s + r.planAmount, 0), format: 'money' },
          { label: 'Collected', value: totalPaid, format: 'money' },
          { label: 'Outstanding dues', value: rows.reduce((s, r) => s + r.dueAmount, 0), format: 'money' },
        ], 'Summary'),
        tableSection('Collected by payment method', [col('method', 'Payment method'), moneyCol('amount', 'Collected'), col('share', 'Share', 'percent', { total: 'sum' })],
          methods.map(m => ({ method: m.method, amount: m.amount, share: totalPaid > 0 ? Math.round((m.amount / totalPaid) * 1000) / 10 : 0 })), { totals: true, emptyText: 'No payments in this range.' }),
        pieSection('Collected by payment method', methods.map(m => ({ label: m.method, value: m.amount })), { valueFormat: 'money' }),
        tableSection('Transactions', [
          col('n', '#', 'integer'), col('memberId', 'Member ID'), col('memberName', 'Member name'), col('mobile', 'Mobile'),
          col('membershipType', 'Membership type'), col('transactionType', 'Transaction'), col('planName', 'Plan'),
          moneyCol('planAmount', 'Amount'), moneyCol('paidAmount', 'Paid'), col('paymentMode', 'Pay mode'), moneyCol('dueAmount', 'Due'),
          col('dueDate', 'Due date', 'date'), col('transactionDate', 'Transaction date', 'date'),
        ], rows.map(({ paidByMethod, photoUrl, ...r }, i) => ({ ...r, n: i + 1, membershipType: r.membershipType || '—' })), { totals: true }),
      ],
    };
  };

  // Get transaction type badge
  const getTransactionBadge = (type: string) => {
    switch (type) {
      case 'New Member':
        return <Badge className="bg-green-100 text-green-700">New Member</Badge>;
      case 'Renewal':
        return <Badge className="bg-blue-100 text-blue-700">Renewal</Badge>;
      case 'Upgrade':
        return <Badge className="bg-purple-100 text-purple-700">Upgrade</Badge>;
      case 'Add-on':
        return <Badge className="bg-orange-100 text-orange-700">Add-on</Badge>;
      default:
        return <Badge>{type}</Badge>;
    }
  };

  return (
    <div className={embedded ? "" : "min-h-screen bg-gray-50 p-6"} id="custom-report-print">
      {/* Print only this report: hide the rest of the app and every on-screen control */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body * { visibility: hidden !important; }
          #custom-report-print, #custom-report-print * { visibility: visible !important; }
          #custom-report-print { position: absolute; left: 0; top: 0; width: 100%; min-height: 0; background: #fff; padding: 0; }
          #custom-report-print [data-print-hide] { display: none !important; }
          #custom-report-print .shadow-md, #custom-report-print .shadow-lg { box-shadow: none !important; }
          #custom-report-print [data-slot="card"] { break-inside: avoid; border: 1px solid #e5e7eb !important; }
          #custom-report-print tr { break-inside: avoid; }
        }
      `}</style>

      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          {!embedded && (
            <Button
              variant="ghost"
              size="sm"
              className="mb-2 -ml-2 text-gray-600 hover:text-gray-900"
              onClick={() => onNavigate?.('reports')}
              data-print-hide
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
          )}
          <h1 className="text-3xl font-bold text-gray-900">Custom Reports</h1>
          <p className="text-gray-600 mt-1">
            Comparisons, profit analytics and detailed membership reports
          </p>
        </div>
        <div data-print-hide>
          <ReportActions report={buildMembershipReport} disabled={loading} menuLabel="Membership report (detailed)" />
        </div>
      </div>

      {/* Today vs Yesterday and This Month vs Last Month */}
      <PeriodComparison />

      {/* Membership Report Table */}
      <Card className={panelCardShell}>
        <CardHeader className="bg-gradient-light border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Membership Report (Detailed)</span>
              </CardTitle>
              <CardDescription>
                Complete transaction history for the selected date range, with cash / card / online totals
              </CardDescription>
            </div>

          </div>
        </CardHeader>
        <CardContent className="p-6">
          {/* Date range (filters the report instantly) */}
          <div className="space-y-4 mb-6" data-print-hide>
            {/* Quick Select Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant={dateRange === 'today' ? 'default' : 'outline'}
                className={dateRange === 'today' ? 'btn-primary' : 'border-primary/20'}
                onClick={() => setDateRange('today')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Today
              </Button>
              <Button
                variant={dateRange === 'yesterday' ? 'default' : 'outline'}
                className={dateRange === 'yesterday' ? 'btn-primary' : 'border-primary/20'}
                onClick={() => setDateRange('yesterday')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Yesterday
              </Button>
              <Button
                variant={dateRange === 'week' ? 'default' : 'outline'}
                className={dateRange === 'week' ? 'btn-primary' : 'border-primary/20'}
                onClick={() => setDateRange('week')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Last 7 Days
              </Button>
              <Button
                variant={dateRange === 'month' ? 'default' : 'outline'}
                className={dateRange === 'month' ? 'btn-primary' : 'border-primary/20'}
                onClick={() => setDateRange('month')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Last 30 Days
              </Button>
              <Button
                variant={dateRange === 'all' ? 'default' : 'outline'}
                className={dateRange === 'all' ? 'btn-primary' : 'border-primary/20'}
                onClick={() => setDateRange('all')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                All Time
              </Button>
              <Button
                variant={dateRange === 'custom' ? 'default' : 'outline'}
                className={dateRange === 'custom' ? 'btn-primary' : 'border-primary/20'}
                onClick={() => setDateRange('custom')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Custom Range
              </Button>
            </div>

            {/* Custom Date Range Inputs */}
            {dateRange === 'custom' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    From Date
                  </label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    To Date
                  </label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Totals and payment method split for the selected range */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-gray-500 mb-1">Transactions</p>
              <p className="text-xl font-bold text-primary">{summary.totalPlans}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-gray-500 mb-1">Total Billed</p>
              <p className="text-xl font-bold text-gray-900"><CurrencyGlyph /> {summary.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-gray-500 mb-1">Collected</p>
              <p className="text-xl font-bold text-green-600"><CurrencyGlyph /> {summary.totalPaid.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs text-gray-500 mb-1">Outstanding Dues</p>
              <p className="text-xl font-bold text-red-600"><CurrencyGlyph /> {summary.totalDue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm font-medium text-gray-700 mr-1">Collected by method:</span>
            {summary.methods.length === 0 ? (
              <span className="text-sm text-gray-500">No payments in this range</span>
            ) : (
              summary.methods.map(m => (
                <span key={m.method} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm">
                  <span className="text-gray-600">{m.method}</span>
                  <span className="font-semibold text-gray-900"><CurrencyGlyph /> {m.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  {summary.totalPaid > 0 && (
                    <span className="text-xs text-gray-500">{Math.round((m.amount / summary.totalPaid) * 100)}%</span>
                  )}
                </span>
              ))
            )}
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, member ID, or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="New Member">New Member</SelectItem>
                  <SelectItem value="Renewal">Renewal</SelectItem>
                  <SelectItem value="Upgrade">Upgrade</SelectItem>
                  <SelectItem value="Add-on">Add-on</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Count */}
          <div className="mb-4">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-primary">{filteredData.length}</span> of {reportData.length} records
            </p>
          </div>

          {/* Table */}
          <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
            <Table className="min-w-[1100px]">
                <TableHeader className="bg-gradient-light sticky top-0 z-10">
                  <TableRow>
                    <TableHead className="text-primary font-semibold">#</TableHead>
                    <TableHead className="text-primary font-semibold">Member ID</TableHead>
                    <TableHead className="text-primary font-semibold">Photo & Name</TableHead>
                    <TableHead className="text-primary font-semibold">Mobile</TableHead>
                    <TableHead className="text-primary font-semibold">Membership Type</TableHead>
                    <TableHead className="text-primary font-semibold">Transaction</TableHead>
                    <TableHead className="text-primary font-semibold">Plan</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Amount ({currencySymbol})</TableHead>
                    <TableHead className="text-primary font-semibold">Pay Mode</TableHead>
                    <TableHead className="text-primary font-semibold text-right">Due</TableHead>
                    <TableHead className="text-primary font-semibold">Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-gray-500">
                        Loading report data...
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((record, index) => (
                      <TableRow key={record.id} className="hover:bg-gradient-light transition-colors">
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-primary/30">
                            {record.memberId}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8 border border-primary/20">
                              <AvatarImage src={record.photoUrl || undefined} />
                              <AvatarFallback className="bg-gradient-primary text-white text-xs">
                                {record.memberName.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium whitespace-normal">{record.memberName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600">{record.mobile}</TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{record.membershipType || '—'}</span>
                        </TableCell>
                        <TableCell>{getTransactionBadge(record.transactionType)}</TableCell>
                        <TableCell className="font-medium whitespace-normal">{record.planName}</TableCell>
                        <TableCell className="text-right font-semibold text-green-600">
                          {record.planAmount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {record.paymentMode === 'Cash' && (
                            <Badge className="bg-purple-100 text-purple-700">Cash</Badge>
                          )}
                          {record.paymentMode === 'Card' && (
                            <Badge className="bg-blue-100 text-blue-700">Card</Badge>
                          )}
                          {record.paymentMode === 'Mixed' && (
                            <Badge className="bg-orange-100 text-orange-700">Mixed</Badge>
                          )}
                          {record.paymentMode && !['Cash','Card','Mixed'].includes(record.paymentMode) && (
                            <Badge className="bg-gray-100 text-gray-700">{record.paymentMode}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {record.dueAmount > 0 ? (
                            <span className="font-semibold text-red-600">
                              {record.dueAmount.toLocaleString()}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {record.dueDate ? (
                            <span className="text-sm text-gray-600">
                              {new Date(record.dueDate).toLocaleDateString('en-GB')}
                            </span>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <FileText className="h-12 w-12 mb-3 text-gray-300" />
                          <p className="font-medium">No records found</p>
                          <p className="text-sm">
                            {filteredByDate.length === 0 && reportData.length > 0
                              ? `${reportData.length} record(s) exist outside "${getRangeDisplayLabel()}" — try "All Time" or a wider range`
                              : filteredByType.length === 0 && filteredByDate.length > 0
                              ? 'No records match this date range for the selected type — try "All Types"'
                              : 'Try adjusting your search'}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
            </Table>
          </div>

          {/* Summary Footer */}
          {filteredData.length > 0 && (
            <div className="mt-6 p-4 bg-gradient-light rounded-lg border border-primary/20">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
                  <p className="text-xl font-bold text-primary">{summary.totalPlans}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                  <p className="text-xl font-bold text-green-600"><CurrencyGlyph /> {summary.totalRevenue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Outstanding Dues</p>
                  <p className="text-xl font-bold text-red-600"><CurrencyGlyph /> {summary.totalDue.toLocaleString()}</p>
                </div>
              </div>
              {summary.methods.length > 0 && (
                <div className="mt-3 pt-3 border-t border-primary/10 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  {summary.methods.map(m => (
                    <span key={m.method}>
                      <span className="text-gray-600">{m.method}: </span>
                      <span className="font-semibold"><CurrencyGlyph /> {m.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

