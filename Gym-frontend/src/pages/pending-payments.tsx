import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown, Ban, CalendarClock, FileText, Hourglass, Loader2, Search, Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import bs from './billing.module.css';
import { ListPagination } from '../components/list-pagination';
import { useDebouncedValue } from '../utils/use-debounced-value';
import { CurrencyGlyph, useCurrency } from '../utils/currency';
import { useBranch } from '../utils/branch-context';
import { ReportActions, col, countCol, kpiSection, moneyCol, tableSection, type ReportDocument } from '../components/report-export';
import {
  pendingPaymentsService, WRITE_OFF_REASONS, writeOffReasonLabel,
  type DueFilter, type PendingDue, type PendingDuePage, type PendingPaymentStats,
  type WriteOffPage, type WriteOffReason, type WriteOffRecord, type WriteOffReport,
} from '../utils/supabase/pending-payments-service';

const PAGE_SIZE = 20;

type Tab = 'dues' | 'history' | 'report';
type Preset = 'today' | 'week' | 'month' | 'prev-month' | 'all' | 'custom';

const PRESETS: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'prev-month', label: 'Previous Month' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function presetRange(preset: Preset, custom: { from: string; to: string }): { from?: string; to?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today': return { from: iso(today), to: iso(today) };
    case 'week': {
      const monday = new Date(today);
      monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      return { from: iso(monday), to: iso(today) };
    }
    case 'month': return { from: iso(new Date(today.getFullYear(), today.getMonth(), 1)), to: iso(today) };
    case 'prev-month': return {
      from: iso(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
      to: iso(new Date(today.getFullYear(), today.getMonth(), 0)),
    };
    case 'custom': return { from: custom.from || undefined, to: custom.to || undefined };
    default: return {};
  }
}

const presetLabel = (preset: Preset, range: { from?: string; to?: string }) =>
  preset === 'custom' ? `${range.from ? fmtDate(range.from) : '…'} – ${range.to ? fmtDate(range.to) : '…'}`
    : PRESETS.find(p => p.value === preset)?.label ?? '';

function fmtDate(value: string | null | undefined) {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Server timestamps (e.g. written_off_at) are UTC without an offset — read them as UTC so they
// show in local time. Date-only values (due dates, filter bounds) stay local days.
function utcStamp(value: string) {
  return /[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`;
}

function fmtStampDate(value: string | null | undefined) {
  return value ? fmtDate(utcStamp(value)) : '—';
}

function fmtTime(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(utcStamp(value));
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const money = (n: number | null | undefined) =>
  Number(n ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Amount({ value, className }: { value: number | null | undefined; className?: string }) {
  return <span className={`whitespace-nowrap ${className ?? ''}`}><CurrencyGlyph /> {money(value)}</span>;
}

/** Same rounded filter chips as Billing › Member Receipts. */
function Pill({ active, onClick, children, count }: { active: boolean; onClick: () => void; children: ReactNode; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-full text-sm font-medium transition-all"
      style={{
        padding: '6px 14px',
        border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
        background: active ? 'var(--primary)' : 'var(--card)',
        color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
      }}
    >
      {children}
      {count !== undefined && (
        <span
          className="rounded-full text-xs font-semibold"
          style={{
            padding: '1px 8px',
            background: active ? 'color-mix(in srgb, var(--primary-foreground) 22%, transparent)' : 'light-dark(#f1f5f9, var(--muted-bg))',
            color: active ? 'var(--primary-foreground)' : 'var(--muted-foreground)',
          }}
        >
          {count.toLocaleString()}
        </span>
      )}
    </button>
  );
}

function SortHead<K extends string>({ label, field, sort, dir, onSort, className }: {
  label: string; field: K; sort: K; dir: 'asc' | 'desc'; onSort: (f: K) => void; className?: string;
}) {
  const Icon = sort !== field ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button type="button" onClick={() => onSort(field)} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
        {label}<Icon className={`h-3.5 w-3.5 ${sort === field ? 'text-primary' : 'opacity-50'}`} />
      </button>
    </TableHead>
  );
}

function PeriodPicker({ preset, onPreset, custom, onCustom }: {
  preset: Preset; onPreset: (p: Preset) => void; custom: { from: string; to: string }; onCustom: (c: { from: string; to: string }) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Period">
      {PRESETS.map(p => <Pill key={p.value} active={preset === p.value} onClick={() => onPreset(p.value)}>{p.label}</Pill>)}
      {preset === 'custom' && (
        <div className="flex items-center gap-2">
          <Input type="date" className="w-40" value={custom.from} max={custom.to || undefined}
                 onChange={e => onCustom({ ...custom, from: e.target.value })} aria-label="From" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" className="w-40" value={custom.to} min={custom.from || undefined}
                 onChange={e => onCustom({ ...custom, to: e.target.value })} aria-label="To" />
        </div>
      )}
    </div>
  );
}

/** Billing › Pending Payments tab: open dues, write-offs, write-off history and report. */
export function PendingPayments() {
  const [params, setParams] = useSearchParams();
  const { activeBranchId } = useBranch();
  const { formatCurrency } = useCurrency();

  // Inner view lives in ?view= so it doesn't clash with Billing's own ?tab=.
  const view = params.get('view');
  const tab: Tab = view === 'history' ? 'history' : view === 'report' ? 'report' : 'dues';
  const setTab = (t: Tab) => setParams(prev => {
    const next = new URLSearchParams(prev);
    if (t === 'dues') next.delete('view'); else next.set('view', t);
    return next;
  }, { replace: true });

  // Bumped after a write-off so every tab reloads.
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Header cards ──────────────────────────────────────────────────────────
  const [stats, setStats] = useState<PendingPaymentStats | null>(null);
  const monthRange = useMemo(() => presetRange('month', { from: '', to: '' }), []);
  useEffect(() => {
    pendingPaymentsService.stats(monthRange.from, monthRange.to)
      .then(setStats)
      .catch(e => toast.error('Could not load the totals', { description: e.message }));
  }, [activeBranchId, refreshKey, monthRange]);

  // ── Pending payments tab ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const [filter, setFilter] = useState<DueFilter>('all');
  const [dueSort, setDueSort] = useState<'due_date' | 'amount'>('due_date');
  const [dueDir, setDueDir] = useState<'asc' | 'desc'>('asc');
  const [duePage, setDuePage] = useState(1);
  const [dues, setDues] = useState<PendingDuePage | null>(null);
  const [duesLoading, setDuesLoading] = useState(true);
  const [duesError, setDuesError] = useState<string | null>(null);

  useEffect(() => { setDuePage(1); }, [debouncedSearch, filter, dueSort, dueDir, activeBranchId]);

  useEffect(() => {
    let cancelled = false;
    setDuesLoading(true);
    setDuesError(null);
    pendingPaymentsService.list({ search: debouncedSearch, filter, sort: dueSort, dir: dueDir, page: duePage, limit: PAGE_SIZE })
      .then(d => { if (!cancelled) setDues(d); })
      .catch(e => { if (!cancelled) setDuesError(e.message); })
      .finally(() => { if (!cancelled) setDuesLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedSearch, filter, dueSort, dueDir, duePage, activeBranchId, refreshKey]);

  const onDueSort = (f: 'due_date' | 'amount') => {
    if (f === dueSort) setDueDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setDueSort(f); setDueDir(f === 'amount' ? 'desc' : 'asc'); }
  };

  // ── Write-off dialog ──────────────────────────────────────────────────────
  const [target, setTarget] = useState<PendingDue | null>(null);
  const [reason, setReason] = useState<WriteOffReason | ''>('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const openWriteOff = (due: PendingDue) => { setTarget(due); setReason(''); setNotes(''); };

  const confirmWriteOff = async () => {
    if (!target || !reason) return;
    setSubmitting(true);
    try {
      const done = await pendingPaymentsService.writeOff(target.receipt_id, reason, notes);
      toast.success(`Written off ${formatCurrency(done.written_off_amount, { minimumFractionDigits: 2 })}`, {
        description: `${done.member_name ?? 'Member'} · ${done.receipt_no ?? ''}. Recorded in the write-off history.`,
      });
      setTarget(null);
      setRefreshKey(k => k + 1);
    } catch (e: any) {
      toast.error('Write-off failed', { description: e.message });
      setRefreshKey(k => k + 1);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Write-off history tab ─────────────────────────────────────────────────
  const [hSearch, setHSearch] = useState('');
  const debouncedHSearch = useDebouncedValue(hSearch.trim(), 300);
  const [hReason, setHReason] = useState('all');
  const [hStaff, setHStaff] = useState('all');
  const [hPreset, setHPreset] = useState<Preset>('all');
  const [hCustom, setHCustom] = useState({ from: '', to: '' });
  const [hSort, setHSort] = useState<'date' | 'amount'>('date');
  const [hDir, setHDir] = useState<'asc' | 'desc'>('desc');
  const [hPage, setHPage] = useState(1);
  const [history, setHistory] = useState<WriteOffPage | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const hRange = useMemo(() => presetRange(hPreset, hCustom), [hPreset, hCustom]);
  const historyQuery = useMemo(() => ({
    search: debouncedHSearch, from: hRange.from, to: hRange.to,
    reason: hReason === 'all' ? undefined : hReason, written_by: hStaff === 'all' ? undefined : hStaff,
    sort: hSort, dir: hDir,
  }), [debouncedHSearch, hRange, hReason, hStaff, hSort, hDir]);

  useEffect(() => { setHPage(1); }, [historyQuery, activeBranchId]);

  useEffect(() => {
    if (tab !== 'history') return;
    let cancelled = false;
    setHistoryLoading(true);
    setHistoryError(null);
    pendingPaymentsService.history({ ...historyQuery, page: hPage, limit: PAGE_SIZE })
      .then(h => { if (!cancelled) setHistory(h); })
      .catch(e => { if (!cancelled) setHistoryError(e.message); })
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [tab, historyQuery, hPage, activeBranchId, refreshKey]);

  const onHistorySort = (f: 'date' | 'amount') => {
    if (f === hSort) setHDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setHSort(f); setHDir('desc'); }
  };

  // ── Write-off report tab ──────────────────────────────────────────────────
  const [rPreset, setRPreset] = useState<Preset>('month');
  const [rCustom, setRCustom] = useState({ from: '', to: '' });
  const rRange = useMemo(() => presetRange(rPreset, rCustom), [rPreset, rCustom]);
  const [report, setReport] = useState<WriteOffReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== 'report') return;
    let cancelled = false;
    setReportLoading(true);
    setReportError(null);
    pendingPaymentsService.report(rRange.from, rRange.to)
      .then(r => { if (!cancelled) setReport(r); })
      .catch(e => { if (!cancelled) setReportError(e.message); })
      .finally(() => { if (!cancelled) setReportLoading(false); });
    return () => { cancelled = true; };
  }, [tab, rRange, activeBranchId, refreshKey]);

  // ── Exports ───────────────────────────────────────────────────────────────
  const buildDuesReport = useCallback(async (): Promise<ReportDocument> => {
    const rows: PendingDue[] = [];
    for (let page = 1; ; page++) {
      const p = await pendingPaymentsService.list({ search: debouncedSearch, filter, sort: dueSort, dir: dueDir, page, limit: 200 });
      rows.push(...p.items);
      if (page >= p.pagination.total_pages) break;
    }
    return {
      title: 'Pending Payments',
      subtitle: 'Open member dues',
      filters: [
        { label: 'Showing', value: filter === 'overdue' ? 'Overdue only' : filter === 'upcoming' ? 'Not yet due' : 'All' },
        { label: 'Search', value: debouncedSearch || null },
      ],
      sections: [tableSection(undefined, [
        col('member', 'Member'), col('code', 'Member ID'), col('phone', 'Phone'), col('bill', 'Receipt / Invoice'),
        col('for', 'For'), moneyCol('billed', 'Billed'), moneyCol('paid', 'Paid'), col('due', 'Due Date', 'date'),
        col('status', 'Status'), moneyCol('owed', 'Amount Due'),
      ], rows.map(d => ({
        member: d.member_name, code: d.member_code, phone: d.member_phone,
        bill: [d.receipt_no, d.invoice_no].filter(Boolean).join(' / '), for: d.description,
        billed: d.original_amount, paid: d.paid_amount, due: d.due_date,
        status: d.overdue ? `Overdue (${d.days_overdue} days)` : 'Not yet due', owed: d.amount_due,
      })), { totals: true, emptyText: 'No pending payments.' })],
    };
  }, [debouncedSearch, filter, dueSort, dueDir]);

  const buildHistoryReport = useCallback(async (): Promise<ReportDocument> => {
    const rows: WriteOffRecord[] = [];
    for (let page = 1; ; page++) {
      const p = await pendingPaymentsService.history({ ...historyQuery, page, limit: 500 });
      rows.push(...p.items);
      if (page >= p.pagination.total_pages) break;
    }
    return {
      title: 'Write-off History',
      subtitle: 'Uncollectable member dues written off. Not payments: excluded from collections and revenue.',
      orientation: 'landscape',
      period: { from: hRange.from, to: hRange.to, label: presetLabel(hPreset, hRange) },
      filters: [
        { label: 'Reason', value: hReason === 'all' ? null : writeOffReasonLabel(hReason) },
        { label: 'Written off by', value: hStaff === 'all' ? null : hStaff },
        { label: 'Search', value: debouncedHSearch || null },
      ],
      sections: [tableSection(undefined, [
        col('date', 'Date', 'datetime'), col('member', 'Member'), col('code', 'Member ID'), col('bill', 'Invoice / Reference'),
        moneyCol('billed', 'Original Amount'), moneyCol('paid', 'Paid Amount'), moneyCol('written', 'Written-off Amount'),
        col('reason', 'Reason'), col('notes', 'Notes'), col('by', 'Written Off By'),
      ], rows.map(w => ({
        date: w.written_off_at, member: w.member_name, code: w.member_code,
        bill: [w.receipt_no, w.invoice_no, w.bill_description].filter(Boolean).join(' · '),
        billed: w.original_amount, paid: w.paid_amount, written: w.written_off_amount,
        reason: writeOffReasonLabel(w.reason), notes: w.notes, by: w.written_off_by,
      })), { totals: true, emptyText: 'No write-offs in this period.' })],
    };
  }, [historyQuery, hRange, hPreset, hReason, hStaff, debouncedHSearch]);

  const buildWriteOffReport = useCallback(async (): Promise<ReportDocument> => {
    const r = report ?? await pendingPaymentsService.report(rRange.from, rRange.to);
    const groupCols = (first: string) => [col('label', first), countCol('count', 'Write-offs'), moneyCol('amount', 'Amount')];
    return {
      title: 'Write-off Report',
      subtitle: 'Write-offs clear uncollectable dues. They are not collections and not revenue.',
      period: { from: rRange.from, to: rRange.to, label: presetLabel(rPreset, rRange) },
      sections: [
        kpiSection([
          { label: 'Total written off', value: r.total_amount, format: 'money' },
          { label: 'Write-offs', value: r.count, format: 'integer' },
          { label: 'Members', value: r.by_member.length, format: 'integer' },
        ]),
        tableSection('By reason', groupCols('Reason'), r.by_reason, { totals: true }),
        tableSection('By staff member', groupCols('Written off by'), r.by_staff, { totals: true }),
        tableSection('By month', groupCols('Month'), r.by_month, { totals: true }),
        tableSection('By member', groupCols('Member'), r.by_member, { totals: true }),
      ],
    };
  }, [report, rRange, rPreset]);

  // ── Render ────────────────────────────────────────────────────────────────
  const statCard = (opts: { title: string; value: ReactNode; sub: string; icon: ReactNode; iconBg: string; ring: string; active: boolean; onClick: () => void }) => (
    <Card
      className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      style={opts.active ? { boxShadow: `0 0 0 2px ${opts.ring}` } : undefined}
      onClick={opts.onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{opts.title}</CardTitle>
        <div className={`p-2 rounded-lg ${opts.iconBg}`}>{opts.icon}</div>
      </CardHeader>
      <CardContent>
        {stats ? (
          <>
            <div className="text-2xl font-bold">{opts.value}</div>
            <p className="text-xs text-muted-foreground">{opts.sub}</p>
          </>
        ) : <Loader2 className="h-6 w-6 animate-spin" />}
      </CardContent>
    </Card>
  );

  const loadingBlock = <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  const errorBlock = (message: string, retry: () => void) => (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <AlertTriangle className="h-8 w-8 text-red-500" />
      <div className="text-sm text-muted-foreground max-w-md">{message}</div>
      <Button variant="outline" size="sm" onClick={retry}>Try again</Button>
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Open dues across members. Write off an uncollectable due; it is recorded in the Write-off History.</p>

      <div className={bs.statGrid4}>
        {statCard({
          title: 'Total Due', value: <Amount value={stats?.total_due} />,
          sub: `${(stats?.open_count ?? 0).toLocaleString()} open ${stats?.open_count === 1 ? 'bill' : 'bills'}`,
          icon: <Wallet className="h-4 w-4 text-teal-700" />, iconBg: 'bg-teal-50', ring: 'var(--gb-primary)',
          active: tab === 'dues' && filter === 'all', onClick: () => { setTab('dues'); setFilter('all'); },
        })}
        {statCard({
          title: 'Overdue', value: <Amount value={stats?.overdue_amount} className="text-red-600" />,
          sub: `${(stats?.overdue_count ?? 0).toLocaleString()} past their due date`,
          icon: <AlertTriangle className="h-4 w-4 text-red-600" />, iconBg: 'bg-red-50', ring: '#dc2626',
          active: tab === 'dues' && filter === 'overdue', onClick: () => { setTab('dues'); setFilter('overdue'); },
        })}
        {statCard({
          title: 'Not Yet Due', value: <Amount value={stats?.upcoming_amount} className="text-orange-600" />,
          sub: `${(stats?.upcoming_count ?? 0).toLocaleString()} due later`,
          icon: <CalendarClock className="h-4 w-4 text-orange-600" />, iconBg: 'bg-orange-50', ring: '#ea580c',
          active: tab === 'dues' && filter === 'upcoming', onClick: () => { setTab('dues'); setFilter('upcoming'); },
        })}
        {statCard({
          title: 'Written Off This Month', value: <Amount value={stats?.written_off_amount} />,
          sub: `${(stats?.write_off_count ?? 0).toLocaleString()} ${stats?.write_off_count === 1 ? 'write-off' : 'write-offs'} · not counted as collections`,
          icon: <Ban className="h-4 w-4 text-slate-600" />, iconBg: 'bg-slate-100', ring: '#475569',
          active: tab === 'history', onClick: () => { setTab('history'); setHPreset('month'); },
        })}
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as Tab)} className="space-y-6">
        <TabsList className="w-full flex">
          <TabsTrigger value="dues" className="flex-1">Pending Payments</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">Write-off History</TabsTrigger>
          <TabsTrigger value="report" className="flex-1">Write-off Report</TabsTrigger>
        </TabsList>

        {/* ── Pending payments ── */}
        <TabsContent value="dues" className="space-y-6">
          <Card className="border-primary/10 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className={bs.tableTitle}>
                    <Hourglass className="h-4 w-4 text-primary" />
                    Open Dues
                    <span className={bs.count}>{(dues?.all_count ?? 0).toLocaleString()}</span>
                  </CardTitle>
                  <CardDescription>Every member bill with money still owed, one row per bill</CardDescription>
                </div>
                <ReportActions report={buildDuesReport} disabled={!dues || dues.pagination.total === 0} menuLabel="Pending payments" compact />
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by member name, member ID, phone, email, receipt # or invoice #..."
                  className="pl-10"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filter dues">
                <Pill active={filter === 'all'} onClick={() => setFilter('all')} count={dues?.all_count}>All</Pill>
                <Pill active={filter === 'overdue'} onClick={() => setFilter('overdue')} count={dues?.overdue_count}>Overdue only</Pill>
                <Pill active={filter === 'upcoming'} onClick={() => setFilter('upcoming')} count={dues?.upcoming_count}>Not yet due</Pill>
              </div>

              {duesError ? errorBlock(duesError, () => setRefreshKey(k => k + 1))
                : duesLoading && !dues ? loadingBlock
                : !dues || dues.items.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {debouncedSearch ? `No open dues match “${debouncedSearch}”.`
                      : filter === 'overdue' ? 'Nothing is overdue.'
                      : filter === 'upcoming' ? 'No dues that are not yet due.'
                      : 'No pending payments. Every member bill is fully paid.'}
                  </div>
                ) : (
                  <>
                    <div className={`overflow-x-auto transition-opacity ${duesLoading ? 'opacity-50' : ''}`}>
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="hover:bg-transparent">
                            <TableHead>Member</TableHead>
                            <TableHead>For</TableHead>
                            <TableHead className="text-right">Billed</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <SortHead label="Due Date" field="due_date" sort={dueSort} dir={dueDir} onSort={onDueSort} />
                            <TableHead>Status</TableHead>
                            <SortHead label="Amount Due" field="amount" sort={dueSort} dir={dueDir} onSort={onDueSort} className="text-right" />
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dues.items.map(d => (
                            <TableRow key={d.receipt_id} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell>
                                <div className="font-medium">{d.member_name || '—'}</div>
                                <div className="text-xs text-muted-foreground">{[d.member_code, d.member_phone].filter(Boolean).join(' · ')}</div>
                              </TableCell>
                              <TableCell style={{ maxWidth: 340 }}>
                                <div className="text-sm">{d.description}</div>
                                <div className="text-xs text-muted-foreground">{[d.receipt_no, d.invoice_no].filter(Boolean).join(' · ')}{d.bill_date ? ` · billed ${fmtDate(d.bill_date)}` : ''}</div>
                                {d.remarks && <div className="text-xs text-muted-foreground truncate" title={d.remarks}>{d.remarks}</div>}
                              </TableCell>
                              <TableCell className="text-right"><Amount value={d.original_amount} /></TableCell>
                              <TableCell className="text-right"><Amount value={d.paid_amount} className="text-muted-foreground" /></TableCell>
                              <TableCell>
                                <div className={bs.when}>{fmtDate(d.due_date)}</div>
                                {d.overdue
                                  ? <div className="text-xs font-semibold text-red-600">{d.days_overdue} {d.days_overdue === 1 ? 'day' : 'days'} overdue</div>
                                  : <div className={bs.whenSub}>{daysUntil(d.due_date)}</div>}
                              </TableCell>
                              <TableCell>
                                {d.overdue
                                  ? <Badge className="bg-red-600 text-white hover:bg-red-600">OVERDUE</Badge>
                                  : <Badge variant="outline" className="border-orange-300 text-orange-700">NOT YET DUE</Badge>}
                              </TableCell>
                              <TableCell className="text-right font-bold"><Amount value={d.amount_due} /></TableCell>
                              <TableCell className="text-right">
                                <Button size="sm" variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                        onClick={() => openWriteOff(d)}>
                                  <Ban className="mr-2 h-3.5 w-3.5" />Write off
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ListPagination page={duePage} pageSize={PAGE_SIZE} total={dues.pagination.total} onPageChange={setDuePage} noun="dues" disabled={duesLoading} />
                  </>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Write-off history ── */}
        <TabsContent value="history" className="space-y-6">
          <Card className="border-primary/10 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className={bs.tableTitle}>
                    <Ban className="h-4 w-4 text-primary" />
                    Write-off History
                    <span className={bs.count}>{(history?.pagination.total ?? 0).toLocaleString()}</span>
                  </CardTitle>
                  <CardDescription>
                    Every due written off{history ? <> · <Amount value={history.total_amount} /> in this view</> : null}. Write-offs are not payments.
                  </CardDescription>
                </div>
                <ReportActions report={buildHistoryReport} disabled={!history || history.pagination.total === 0} menuLabel="Write-off history" compact />
              </div>
            </CardHeader>
            <CardContent>
              <div className={bs.creditFilters}>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search by member name, ID, phone or invoice..." className="pl-10"
                         value={hSearch} onChange={e => setHSearch(e.target.value)} />
                </div>
                <Select value={hReason} onValueChange={setHReason}>
                  <SelectTrigger><SelectValue placeholder="Reason" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All reasons</SelectItem>
                    {WRITE_OFF_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={hStaff} onValueChange={setHStaff}>
                  <SelectTrigger><SelectValue placeholder="Written off by" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Anyone</SelectItem>
                    {(history?.staff ?? []).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="mb-6">
                <PeriodPicker preset={hPreset} onPreset={setHPreset} custom={hCustom} onCustom={setHCustom} />
              </div>

              {historyError ? errorBlock(historyError, () => setRefreshKey(k => k + 1))
                : historyLoading && !history ? loadingBlock
                : !history || history.items.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">No write-offs for these filters.</div>
                ) : (
                  <>
                    <div className={`overflow-x-auto transition-opacity ${historyLoading ? 'opacity-50' : ''}`}>
                      <Table>
                        <TableHeader className="bg-slate-50/50">
                          <TableRow className="hover:bg-transparent">
                            <SortHead label="Date" field="date" sort={hSort} dir={hDir} onSort={onHistorySort} />
                            <TableHead>Member</TableHead>
                            <TableHead>Member ID</TableHead>
                            <TableHead>Invoice / Reference</TableHead>
                            <TableHead className="text-right">Original</TableHead>
                            <TableHead className="text-right">Paid</TableHead>
                            <SortHead label="Written Off" field="amount" sort={hSort} dir={hDir} onSort={onHistorySort} className="text-right" />
                            <TableHead>Reason</TableHead>
                            <TableHead>Written Off By</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.items.map(w => (
                            <TableRow key={w.id} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell>
                                <div className={bs.when}>{fmtStampDate(w.written_off_at)}</div>
                                <div className={bs.whenSub}>{fmtTime(w.written_off_at)}</div>
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{w.member_name || '—'}</div>
                                {w.member_phone && <div className="text-xs text-muted-foreground">{w.member_phone}</div>}
                              </TableCell>
                              <TableCell className="text-sm">{w.member_code || '—'}</TableCell>
                              <TableCell style={{ maxWidth: 260 }}>
                                <div className={bs.receiptNo}>{w.receipt_no || '—'}</div>
                                {w.invoice_no && <div className={bs.invoiceNo}>{w.invoice_no}</div>}
                                {w.bill_description && <div className="text-xs text-muted-foreground truncate" title={w.bill_description}>{w.bill_description}</div>}
                              </TableCell>
                              <TableCell className="text-right"><Amount value={w.original_amount} /></TableCell>
                              <TableCell className="text-right"><Amount value={w.paid_amount} className="text-muted-foreground" /></TableCell>
                              <TableCell className="text-right font-bold text-red-600"><Amount value={w.written_off_amount} /></TableCell>
                              <TableCell style={{ maxWidth: 220 }}>
                                <Badge variant="outline">{writeOffReasonLabel(w.reason)}</Badge>
                                {w.notes && <div className="text-xs text-muted-foreground mt-1 truncate" title={w.notes}>{w.notes}</div>}
                              </TableCell>
                              <TableCell className="text-sm">{w.written_off_by}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <ListPagination page={hPage} pageSize={PAGE_SIZE} total={history.pagination.total} onPageChange={setHPage} noun="write-offs" disabled={historyLoading} />
                  </>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Write-off report ── */}
        <TabsContent value="report" className="space-y-6">
          <Card className="border-primary/10 shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className={bs.tableTitle}><FileText className="h-4 w-4 text-primary" />Write-off Report</CardTitle>
                  <CardDescription>Totals by reason, staff member, month and member. Write-offs are not collections and not revenue.</CardDescription>
                </div>
                <ReportActions report={buildWriteOffReport} disabled={!report} menuLabel="Write-off report" compact />
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <PeriodPicker preset={rPreset} onPreset={setRPreset} custom={rCustom} onCustom={setRCustom} />

              {reportError ? errorBlock(reportError, () => setRefreshKey(k => k + 1))
                : reportLoading && !report ? loadingBlock
                : report && (
                  <div className={`space-y-6 transition-opacity ${reportLoading ? 'opacity-50' : ''}`}>
                    <div className={bs.cards}>
                      <div className={bs.card}>
                        <div><div className={bs.cardLabel}>Total written off</div><div className={bs.cardValue}><Amount value={report.total_amount} /></div></div>
                        <span className={bs.cardIcon} data-tone="amber"><Ban /></span>
                      </div>
                      <div className={bs.card}>
                        <div><div className={bs.cardLabel}>Write-offs</div><div className={bs.cardValue}>{report.count.toLocaleString()}</div></div>
                        <span className={bs.cardIcon} data-tone="blue"><FileText /></span>
                      </div>
                      <div className={bs.card}>
                        <div><div className={bs.cardLabel}>Average write-off</div><div className={bs.cardValue}><Amount value={report.count ? report.total_amount / report.count : 0} /></div></div>
                        <span className={bs.cardIcon} data-tone="teal"><Wallet /></span>
                      </div>
                      <div className={bs.card}>
                        <div><div className={bs.cardLabel}>Members</div><div className={bs.cardValue}>{report.by_member.length.toLocaleString()}</div></div>
                        <span className={bs.cardIcon} data-tone="green"><Hourglass /></span>
                      </div>
                    </div>

                    {report.count === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">No write-offs in {presetLabel(rPreset, rRange).toLowerCase()}.</div>
                    ) : (
                      <div className="grid gap-6 lg:grid-cols-2">
                        <GroupTable title="By reason" first="Reason" rows={report.by_reason} />
                        <GroupTable title="By staff member" first="Written off by" rows={report.by_staff} />
                        <GroupTable title="By month" first="Month" rows={report.by_month} />
                        <GroupTable title="By member" first="Member" rows={report.by_member} limit={10} />
                      </div>
                    )}
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!target} onOpenChange={open => { if (!open && !submitting) setTarget(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Ban className="h-5 w-5 text-red-600" />Write off this due?</DialogTitle>
            <DialogDescription>
              The remaining balance is cleared from the member's account and recorded in the Write-off History.
            </DialogDescription>
          </DialogHeader>

          {target && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 rounded-lg border p-4 text-sm">
                <Field label="Member" value={target.member_name || '—'} />
                <Field label="Member ID" value={target.member_code || '—'} />
                <div className="col-span-2">
                  <Field label="Bill" value={`${target.description}${target.receipt_no ? ` · ${target.receipt_no}` : ''}${target.invoice_no ? ` / ${target.invoice_no}` : ''}`} />
                </div>
                <Field label="Original amount" value={<Amount value={target.original_amount} />} />
                <Field label="Already paid" value={<Amount value={target.paid_amount} />} />
                <Field label="Due date" value={fmtDate(target.due_date)} />
                <Field label="Status" value={target.overdue ? `${target.days_overdue} days overdue` : 'Not yet due'} />
                <div className="col-span-2 border-t pt-3 flex items-center justify-between">
                  <span className="text-muted-foreground">Amount to write off</span>
                  <span className="text-xl font-bold text-red-600"><Amount value={target.amount_due} /></span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wo-reason">Reason</Label>
                <Select value={reason} onValueChange={v => setReason(v as WriteOffReason)}>
                  <SelectTrigger id="wo-reason"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
                  <SelectContent>
                    {WRITE_OFF_REASONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wo-notes">Notes {reason === 'OTHER' ? '' : <span className="text-muted-foreground font-normal">(optional)</span>}</Label>
                <Textarea id="wo-notes" rows={3} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)}
                          placeholder={reason === 'OTHER' ? 'Explain why this due is being written off' : 'Anything worth keeping on record'} />
              </div>

              <div className="flex gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-1" />
                <span>
                  This is not a payment. No receipt is created, and nothing is added to collections, cash or revenue.
                  The bill and the <Amount value={target.paid_amount} /> already paid stay on record. This can't be undone.
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={submitting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmWriteOff}
                    disabled={submitting || !reason || (reason === 'OTHER' && !notes.trim())}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Write off {target ? formatCurrency(target.amount_due, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function daysUntil(due: string | null) {
  if (!due) return '';
  const today = new Date(new Date().toDateString()).getTime();
  const days = Math.round((new Date(`${due}T00:00:00`).getTime() - today) / 86_400_000);
  return days === 0 ? 'due today' : `due in ${days} ${days === 1 ? 'day' : 'days'}`;
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function GroupTable({ title, first, rows, limit }: { title: string; first: string; rows: { key: string; label: string; count: number; amount: number }[]; limit?: number }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  return (
    <div className="rounded-lg border">
      <div className="px-4 py-3 border-b font-semibold text-sm flex justify-between">
        <span>{title}</span>
        {limit && rows.length > limit && <span className="text-xs font-normal text-muted-foreground">Top {limit} of {rows.length} · all in the export</span>}
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{first}</TableHead>
            <TableHead className="text-right">Write-offs</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shown.map(r => (
            <TableRow key={r.key}>
              <TableCell>{r.label || '—'}</TableCell>
              <TableCell className="text-right">{r.count.toLocaleString()}</TableCell>
              <TableCell className="text-right font-medium"><Amount value={r.amount} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
