import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, Banknote, Ban, CalendarX2, CheckCircle2, CreditCard, FileText, History, Landmark,
  Loader2, Printer, ReceiptText, RotateCcw, Search, Smartphone, Undo2, UserRound, Users, Wallet, X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ListPagination } from '../components/list-pagination';
import { MemberAvatar } from '../components/members/MemberAvatar';
import { ReportActions, col, countCol, kpiSection, moneyCol, pieSection, tableSection, type ReportDocument } from '../components/report-export';
import { CurrencyGlyph, CurrencyValue, useCurrency } from '../utils/currency';
import { getCompanyDetails } from '../utils/company-details';
import { useBranch } from '../utils/branch-context';
import { useDebouncedValue } from '../utils/use-debounced-value';
import { membersService, type Member } from '../utils/supabase/members-service';
import { accountHeadsService, type AccountHead } from '../utils/supabase/account-heads-service';
import { apiErrorMessage } from '../utils/supabase/payment-terms-service';
import {
  REFUND_METHODS, REFUND_REASONS, billTypeLabel, refundService,
  type MemberRefund, type MemberRefundBills, type RefundMethod, type RefundPage, type RefundableBill,
} from '../utils/supabase/refund-service';
import bs from './billing.module.css';
import s from './refunds.module.css';

// ── Period presets (same set as Pending Payments) ─────────────────────────────
type Preset = 'today' | 'week' | 'month' | 'prev-month' | 'year' | 'all' | 'custom';
const PRESETS: { value: Preset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'prev-month', label: 'Previous Month' },
  { value: 'year', label: 'This Year' },
  { value: 'all', label: 'All Time' },
  { value: 'custom', label: 'Custom' },
];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function presetRange(preset: Preset, custom: { from: string; to: string }): { from: string; to: string } {
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
    case 'year': return { from: iso(new Date(today.getFullYear(), 0, 1)), to: iso(today) };
    case 'custom': return { from: custom.from || iso(today), to: custom.to || iso(today) };
    default: return { from: '2000-01-01', to: iso(today) };
  }
}
const presetLabel = (preset: Preset, range: { from: string; to: string }) =>
  preset === 'custom' ? `${fmtDate(range.from)} – ${fmtDate(range.to)}` : PRESETS.find(p => p.value === preset)?.label ?? '';

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return isNaN(d.getTime()) ? '—'
    : d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
const round2 = (n: number) => Math.round(n * 100) / 100;

const METHOD_ICON: Record<RefundMethod, typeof Banknote> = {
  Cash: Banknote, Card: CreditCard, 'Bank Transfer': Landmark, Online: Smartphone, Wallet: Wallet,
};
const METHOD_HINT: Record<RefundMethod, string> = {
  Cash: 'Handed back from the cash drawer',
  Card: 'Reversed to the card it was paid with',
  'Bank Transfer': 'Sent to the member’s bank account',
  Online: 'Sent back through the online gateway',
  Wallet: 'Kept as wallet credit to spend at the gym',
};

const Amount = ({ value, className }: { value?: number | null; className?: string }) =>
  <CurrencyValue amount={Number(value ?? 0)} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} className={className} />;

// ── Printable refund voucher ──────────────────────────────────────────────────
const esc = (v: unknown) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

async function printRefundVoucher(r: MemberRefund, money: (n: number) => string, branchId: number | null) {
  const w = window.open('', '_blank', 'width=820,height=900');
  if (!w) { toast.error('Allow pop-ups to print the refund voucher.'); return; }
  let company = { name: '', address: '', phone: '', email: '', logo: '', trn: '' } as Awaited<ReturnType<typeof getCompanyDetails>> | any;
  try { company = await getCompanyDetails(branchId); } catch { /* optional */ }
  const row = (k: string, v: string) => v ? `<tr><th>${esc(k)}</th><td>${v}</td></tr>` : '';
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Refund ${esc(r.voucher_no)}</title>
  <style>
    body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#111;margin:32px;}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:12px}
    .co{font-size:18px;font-weight:700}.co small{display:block;font-weight:400;font-size:12px;color:#555;margin-top:2px}
    .logo{max-height:56px;max-width:160px}
    h1{font-size:20px;margin:20px 0 4px;letter-spacing:.02em}.no{color:#555;font-size:13px}
    .amount{margin:18px 0;padding:14px 16px;border:1px solid #ddd;border-radius:10px;display:flex;justify-content:space-between;align-items:center}
    .amount b{font-size:24px}
    table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;color:#555;font-weight:600;width:38%;padding:7px 0;border-bottom:1px solid #eee;vertical-align:top}
    td{padding:7px 0;border-bottom:1px solid #eee}
    .note{margin-top:14px;font-size:12px;color:#444}
    .sign{margin-top:56px;display:flex;gap:48px}.sign div{flex:1;border-top:1px solid #111;padding-top:6px;font-size:12px;color:#444}
    @media print{body{margin:14mm}}
  </style></head><body>
  <div class="top"><div class="co">${esc(company.name || '')}<small>${esc(company.address || '')}</small>
    <small>${esc([company.phone, company.email].filter(Boolean).join(' · '))}</small>${company.trn ? `<small>TRN ${esc(company.trn)}</small>` : ''}</div>
    ${company.logo ? `<img class="logo" src="${esc(company.logo)}" alt="">` : ''}</div>
  <h1>REFUND VOUCHER</h1><div class="no">${esc(r.voucher_no)} · ${esc(fmtDateTime(r.created_at || r.date))}</div>
  <div class="amount"><span>Amount refunded</span><b>${esc(money(r.amount))}</b></div>
  <table>
    ${row('Member', `${esc(r.member_name)}${r.member_code ? ` (${esc(r.member_code)})` : ''}`)}
    ${row('Phone', esc(r.member_phone))}
    ${row('Against bill', esc([r.receipt_no, r.invoice_no].filter(Boolean).join(' / ')))}
    ${row('For', esc([billTypeLabel(r.bill_type), r.plan_name].filter(Boolean).join(' · ')))}
    ${row('Refunded by', esc(r.method))}
    ${row('Bank account', esc(r.bank_account_name))}
    ${row('Reference', esc(r.reference))}
    ${row('Reason', esc(r.reason_label || r.reason))}
    ${row('Notes', esc(r.notes))}
    ${r.tax > 0 ? row('Of which VAT', esc(money(r.tax))) : ''}
    ${row('Plan', r.cancelled_plan ? 'Cancelled with this refund' : 'Not cancelled')}
    ${r.due_cleared && r.due_cleared > 0 ? row('Unpaid balance cleared', esc(money(r.due_cleared))) : ''}
    ${row('Processed by', esc(r.refunded_by))}
  </table>
  <div class="note">The member confirms receiving the amount above.</div>
  <div class="sign"><div>Member signature</div><div>Authorised by</div></div>
  <script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

// ── Tab ───────────────────────────────────────────────────────────────────────
export function Refunds() {
  const [tab, setTab] = useState<'new' | 'history'>('new');
  const [kpi, setKpi] = useState<RefundPage['summary'] | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const r = presetRange('month', { from: '', to: '' });
    refundService.list({ from: r.from, to: r.to, limit: 1 }).then(p => setKpi(p.summary)).catch(() => setKpi(null));
  }, [reloadKey]);

  const stat = (title: string, value: ReactNode, sub: string, icon: ReactNode, tone: string) => (
    <Card className="border-primary/10 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={s.statIcon} data-tone={tone}>{icon}</div>
      </CardHeader>
      <CardContent>
        {kpi ? (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </>
        ) : <Loader2 className="h-6 w-6 animate-spin" />}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Give money back to a member against a bill they paid — in full or in part, with the option to cancel the plan.
        Every refund is posted to the ledger and shows on the member’s statement.
      </p>

      <div className={bs.statGrid4}>
        {stat('Refunded This Month', <Amount value={kpi?.amount} className={s.red} />,
          `${(kpi?.count ?? 0).toLocaleString()} ${kpi?.count === 1 ? 'refund' : 'refunds'}`,
          <Undo2 className="h-4 w-4" />, 'red')}
        {stat('Members Refunded', (kpi?.members ?? 0).toLocaleString(), 'This month',
          <Users className="h-4 w-4" />, 'blue')}
        {stat('Plans Cancelled', (kpi?.cancelled_plans ?? 0).toLocaleString(), 'Refunds that also cancelled the plan',
          <CalendarX2 className="h-4 w-4" />, 'amber')}
        {stat('Average Refund', <Amount value={kpi?.average} />, 'Per refund this month',
          <ReceiptText className="h-4 w-4" />, 'slate')}
      </div>

      <Tabs value={tab} onValueChange={v => setTab(v as 'new' | 'history')} className="space-y-6">
        <TabsList className="w-full flex">
          <TabsTrigger value="new" className="flex-1">New Refund</TabsTrigger>
          <TabsTrigger value="history" className="flex-1">Refund History</TabsTrigger>
        </TabsList>
        <TabsContent value="new">
          <NewRefund onRefunded={() => setReloadKey(k => k + 1)} />
        </TabsContent>
        <TabsContent value="history">
          {tab === 'history' && <RefundHistory reloadKey={reloadKey} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── New refund: pick member → pick bill → refund dialog ───────────────────────
function NewRefund({ onRefunded }: { onRefunded: () => void }) {
  const { formatCurrencyText } = useCurrency();
  const { activeBranchId } = useBranch();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const [results, setResults] = useState<Member[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<MemberRefundBills | null>(null);
  const [loading, setLoading] = useState(false);
  const [bill, setBill] = useState<RefundableBill | null>(null);
  const searchBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (!debounced.trim()) { setResults([]); return; }
    setSearching(true);
    membersService.searchMembers(debounced)
      .then(r => { if (!cancelled) setResults(r); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  useEffect(() => {
    const close = (e: MouseEvent) => { if (searchBox.current && !searchBox.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const load = useCallback(async (memberDbId: number | string) => {
    setLoading(true);
    try { setData(await refundService.memberBills(memberDbId)); }
    catch (e) { toast.error(apiErrorMessage(e, 'Failed to load the member’s bills')); }
    finally { setLoading(false); }
  }, []);

  const pick = (m: Member) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    load(m.id);
  };

  if (!data && !loading) {
    return (
      <Card className="border-primary/10 shadow-md">
        <CardContent className={s.pickWrap}>
          <div className={s.pickIcon}><RotateCcw /></div>
          <div className={s.pickTitle}>Who is the refund for?</div>
          <div className={s.pickSub}>Search the member by name, member ID or mobile number. Their paid bills appear with what can still be refunded.</div>
          <div className={s.searchWrap} ref={searchBox}>
            <Search className={s.searchIcon} />
            <Input
              autoFocus
              value={query}
              onChange={e => { setQuery(e.target.value); setOpen(true); }}
              onFocus={() => setOpen(true)}
              onKeyDown={e => { if (e.key === 'Enter' && results[0]) pick(results[0]); if (e.key === 'Escape') setOpen(false); }}
              placeholder="Name, member ID or mobile…"
              className={s.searchInput}
            />
            {searching && <Loader2 className={s.searchSpin} />}
            {open && query.trim() && (
              <div className={s.results}>
                {!searching && results.length === 0 && <div className={s.noResult}>No member matches “{query.trim()}”.</div>}
                {results.map(m => (
                  <button key={m.id} type="button" className={s.result} onClick={() => pick(m)}>
                    <MemberAvatar name={m.name} photo={m.photo_url} size={34} />
                    <span className={s.resultMain}>
                      <span className={s.resultName}>{m.name}</span>
                      <span className={s.resultMeta}>{[m.member_id, m.phone, m.membership_plan].filter(Boolean).join(' · ')}</span>
                    </span>
                    <span className={s.resultStatus} data-status={m.membership_status}>{m.membership_status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading || !data) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const refundableBills = data.bills.filter(b => b.refundable > 0);

  return (
    <div className="space-y-6">
      <Card className="border-primary/10 shadow-md">
        <CardContent className={s.memberCard}>
          <MemberAvatar name={data.name} photo={data.photo_url} size={56} />
          <div className={s.memberMain}>
            <div className={s.memberName}>{data.name}</div>
            <div className={s.memberMeta}>
              {[data.member_id, data.phone].filter(Boolean).join(' · ')}
              {data.plan ? <> · <strong>{data.plan}</strong></> : null}
              {data.end_date ? <> · ends {fmtDate(data.end_date)}</> : null}
            </div>
          </div>
          <div className={s.memberFacts}>
            <div className={s.fact}><span>Refundable</span><strong className={s.green}><Amount value={data.total_refundable} /></strong></div>
            <div className={s.fact}><span>Refunded before</span><strong><Amount value={data.total_refunded} /></strong></div>
            <div className={s.fact}><span>Wallet</span><strong><Amount value={data.wallet_balance} /></strong></div>
            <div className={s.fact}><span>Outstanding</span><strong className={data.outstanding > 0 ? s.red : undefined}><Amount value={data.outstanding} /></strong></div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setData(null)} className={s.changeBtn}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Change member
          </Button>
        </CardContent>
      </Card>

      <Card className="border-primary/10 shadow-md">
        <CardHeader>
          <CardTitle className={bs.tableTitle}>
            <ReceiptText className="h-4 w-4 text-primary" /> Paid bills
            <span className={bs.count}>{data.bills.length}</span>
          </CardTitle>
          <CardDescription>
            {refundableBills.length > 0
              ? `${refundableBills.length} ${refundableBills.length === 1 ? 'bill' : 'bills'} with money that can be refunded — newest first`
              : 'Nothing left to refund on this member’s bills'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.bills.length === 0 ? (
            <div className={s.empty}><FileText /><span>This member has no paid bills.</span></div>
          ) : (
            <div className={s.tableWrap}>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Bill</TableHead>
                    <TableHead>For</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Refunded</TableHead>
                    <TableHead className="text-right">Refundable</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.bills.map(b => (
                    <TableRow key={b.id} data-muted={b.refundable <= 0 ? 'true' : undefined} className={s.billRow}>
                      <TableCell>
                        <div className={s.cellMain}>{b.receipt_no}</div>
                        <div className={s.cellSub}>{fmtDate(b.date)}{b.invoice_no ? ` · ${b.invoice_no}` : ''}</div>
                      </TableCell>
                      <TableCell>
                        <span className={s.typeChip} data-type={b.type}>{billTypeLabel(b.type)}</span>
                        <div className={s.cellSub}>{b.plan_name || '—'}</div>
                      </TableCell>
                      <TableCell>
                        {b.valid_from || b.valid_till ? (
                          <>
                            <div className={s.cellMain}>{fmtDate(b.valid_from)} → {fmtDate(b.valid_till)}</div>
                            <div className={s.cellSub}>{b.current_period ? 'Current period' : b.not_started ? 'Not started yet' : 'Finished'}</div>
                          </>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right"><Amount value={b.paid} /></TableCell>
                      <TableCell className="text-right">{b.refunded > 0 ? <Amount value={b.refunded} className={s.red} /> : <span className={s.cellSub}>—</span>}</TableCell>
                      <TableCell className="text-right font-semibold">{b.refundable > 0 ? <Amount value={b.refundable} className={s.green} /> : <span className={s.cellSub}>—</span>}</TableCell>
                      <TableCell><span className={s.statusChip} data-status={(b.status || '').toLowerCase()}>{b.status || '—'}</span></TableCell>
                      <TableCell className="text-right">
                        {b.refundable > 0 ? (
                          <Button size="sm" onClick={() => setBill(b)}><Undo2 className="h-4 w-4 mr-1" /> Refund</Button>
                        ) : (
                          <span className={s.cellSub} title={b.blocked_reason || 'Fully refunded'}>
                            {b.blocked_reason ? 'Not refundable' : 'Fully refunded'}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {data.refunds.length > 0 && (
        <Card className="border-primary/10 shadow-md">
          <CardHeader>
            <CardTitle className={bs.tableTitle}><History className="h-4 w-4 text-primary" /> Earlier refunds <span className={bs.count}>{data.refunds.length}</span></CardTitle>
            <CardDescription>Everything already given back to {data.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={s.pastList}>
              {data.refunds.map(r => (
                <div key={r.id} className={s.pastRow}>
                  <span className={s.pastIcon}><Undo2 /></span>
                  <span className={s.pastMain}>
                    <span className={s.cellMain}>{r.voucher_no} · {billTypeLabel(r.bill_type)}{r.plan_name ? ` · ${r.plan_name}` : ''}</span>
                    <span className={s.cellSub}>{fmtDateTime(r.created_at || r.date)} · {r.method || 'Cash'}{r.reason_label ? ` · ${r.reason_label}` : r.reason ? ` · ${r.reason}` : ''}{r.cancelled_plan ? ' · plan cancelled' : ''}</span>
                  </span>
                  <Amount value={-r.amount} className={s.red} />
                  <Button variant="ghost" size="sm" onClick={() => printRefundVoucher(r, formatCurrencyText, activeBranchId)} aria-label="Print refund voucher">
                    <Printer className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <RefundDialog
        member={data}
        bill={bill}
        onClose={() => setBill(null)}
        onDone={() => { setBill(null); onRefunded(); load(data.member_db_id); }}
      />
    </div>
  );
}

// ── The refund dialog: form → review → done ───────────────────────────────────
function RefundDialog({ member, bill, onClose, onDone }: {
  member: MemberRefundBills; bill: RefundableBill | null; onClose: () => void; onDone: () => void;
}) {
  const { formatCurrencyText } = useCurrency();
  const { activeBranchId } = useBranch();
  const [step, setStep] = useState<'form' | 'review' | 'done'>('form');
  const [amountText, setAmountText] = useState('');
  const [method, setMethod] = useState<RefundMethod>('Cash');
  const [bankAccounts, setBankAccounts] = useState<AccountHead[]>([]);
  const [bankCode, setBankCode] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [cancelPlan, setCancelPlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<MemberRefund | null>(null);

  useEffect(() => {
    if (!bill) return;
    setStep('form');
    setAmountText(bill.refundable.toFixed(2));
    setMethod('Cash');
    setBankCode('');
    setReference('');
    setReason('');
    setNotes('');
    setCancelPlan(false);
    setResult(null);
  }, [bill]);

  useEffect(() => {
    if ((method === 'Bank Transfer' || method === 'Online') && bankAccounts.length === 0) {
      accountHeadsService.getBankAccounts().then(setBankAccounts).catch(() => undefined);
    }
  }, [method, bankAccounts.length]);

  if (!bill) return null;
  const amount = round2(Number(amountText) || 0);
  const tooMuch = amount > bill.refundable + 0.001;
  const full = Math.abs(amount - bill.refundable) < 0.005;
  const isMembership = bill.type === 'New' || bill.type === 'Renewal';
  const needsBank = method === 'Bank Transfer' || method === 'Online';
  const bank = bankAccounts.find(a => a.code === bankCode);
  const formOk = amount > 0 && !tooMuch && !!reason && (reason !== 'OTHER' || notes.trim().length > 0);

  const effects: string[] = [];
  effects.push(method === 'Wallet'
    ? `${formatCurrencyText(amount)} is added to ${member.name}’s wallet (now ${formatCurrencyText(member.wallet_balance)}).`
    : `${formatCurrencyText(amount)} is paid back to ${member.name} by ${method.toLowerCase()}.`);
  effects.push('A refund voucher is posted to the ledger: revenue and VAT are reversed.');
  if (cancelPlan) {
    effects.push(`Bill ${bill.receipt_no} is marked Cancelled.`);
    if (bill.due > 0) effects.push(`The unpaid ${formatCurrencyText(bill.due)} on this bill is written off.`);
    if (isMembership) {
      effects.push(bill.not_started
        ? `This period hasn’t started — the membership goes back to ending ${fmtDate(bill.valid_from)}.`
        : bill.current_period ? 'The membership ends today — no entry from tomorrow.'
        : 'This period is already over, so today’s membership dates don’t change.');
    } else {
      effects.push('The add-on / package on this bill is cancelled.');
    }
  } else {
    effects.push('The plan stays as it is.');
  }

  const submit = async () => {
    setSaving(true);
    try {
      const r = await refundService.refund({
        receipt_id: bill.id,
        amount,
        method,
        bank_account_code: needsBank ? bank?.code ?? null : null,
        bank_account_name: needsBank ? bank?.name ?? null : null,
        reference: reference.trim() || null,
        reason_code: reason,
        notes: notes.trim() || null,
        cancel_plan: cancelPlan,
      });
      setResult(r);
      setStep('done');
      toast.success(`Refunded ${formatCurrencyText(r.amount)} to ${member.name}`, { description: r.voucher_no });
    } catch (e) {
      toast.error(apiErrorMessage(e, 'The refund could not be made'));
      setStep('form');
    } finally {
      setSaving(false);
    }
  };

  const close = () => { if (saving) return; if (step === 'done') onDone(); else onClose(); };

  return (
    <Dialog open onOpenChange={o => { if (!o) close(); }}>
      <DialogContent className={s.dialog} onInteractOutside={e => e.preventDefault()}>
        <div className={s.dHead}>
          <span className={s.dIcon} data-done={step === 'done'}>{step === 'done' ? <CheckCircle2 /> : <Undo2 />}</span>
          <div className={s.dHeadText}>
            <DialogTitle className={s.dTitle}>
              {step === 'done' ? 'Refund done' : step === 'review' ? 'Check the refund' : 'Refund a payment'}
            </DialogTitle>
            <DialogDescription className={s.dSub}>
              {member.name} · {bill.receipt_no} · {billTypeLabel(bill.type)}{bill.plan_name ? ` · ${bill.plan_name}` : ''}
            </DialogDescription>
          </div>
        </div>

        {step !== 'done' && (
          <div className={s.billStrip}>
            <div><span>Paid</span><strong><Amount value={bill.paid} /></strong></div>
            <div><span>Already refunded</span><strong><Amount value={bill.refunded} /></strong></div>
            <div><span>Can refund</span><strong className={s.green}><Amount value={bill.refundable} /></strong></div>
            {bill.due > 0 && <div><span>Unpaid</span><strong className={s.red}><Amount value={bill.due} /></strong></div>}
          </div>
        )}

        {step === 'form' && (
          <div className={s.dBody}>
            <div className={s.field}>
              <Label htmlFor="rf-amount">Amount to refund</Label>
              <div className={s.amountRow}>
                <div className={s.amountInput}>
                  <span className={s.amountGlyph}><CurrencyGlyph /></span>
                  <Input id="rf-amount" type="number" min={0} step="0.01" max={bill.refundable} value={amountText}
                    onChange={e => setAmountText(e.target.value)} className={s.amountField} />
                </div>
                <div className={s.quick}>
                  {[1, 0.75, 0.5, 0.25].map(f => {
                    const v = round2(bill.refundable * f);
                    return (
                      <button key={f} type="button" className={s.quickBtn} data-on={Math.abs(amount - v) < 0.005}
                        onClick={() => setAmountText(v.toFixed(2))}>
                        {f === 1 ? 'Full' : `${f * 100}%`}
                      </button>
                    );
                  })}
                </div>
              </div>
              {tooMuch && <span className={s.err}>At most {formatCurrencyText(bill.refundable)} can be refunded on this bill.</span>}
            </div>

            <div className={s.field}>
              <Label>Give it back by</Label>
              <div className={s.methods}>
                {REFUND_METHODS.map(m => {
                  const Icon = METHOD_ICON[m];
                  return (
                    <button key={m} type="button" className={s.method} data-on={method === m} onClick={() => setMethod(m)}>
                      <Icon /><span>{m}</span>
                    </button>
                  );
                })}
              </div>
              <span className={s.hint}>{METHOD_HINT[method]}{method === 'Wallet' ? ` — wallet balance now ${formatCurrencyText(member.wallet_balance)}` : ''}</span>
            </div>

            {(needsBank || method === 'Card') && (
              <div className={s.grid2}>
                {needsBank && (
                  <div className={s.field}>
                    <Label>Paid from account</Label>
                    <Select value={bankCode} onValueChange={setBankCode}>
                      <SelectTrigger><SelectValue placeholder={bankAccounts.length ? 'Choose the bank account' : 'Cash at Bank'} /></SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map(a => <SelectItem key={a.code} value={a.code}>{a.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className={s.field}>
                  <Label htmlFor="rf-ref">Reference <span className={s.optional}>optional</span></Label>
                  <Input id="rf-ref" maxLength={120} value={reference} onChange={e => setReference(e.target.value)}
                    placeholder={method === 'Card' ? 'Card reversal / approval no.' : 'Transfer reference'} />
                </div>
              </div>
            )}

            <div className={s.grid2}>
              <div className={s.field}>
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="Why is the money going back?" /></SelectTrigger>
                  <SelectContent>
                    {REFUND_REASONS.map(r => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className={s.field}>
                <Label htmlFor="rf-notes">Notes {reason === 'OTHER' ? <span className={s.req}>required</span> : <span className={s.optional}>optional</span>}</Label>
                <Textarea id="rf-notes" rows={2} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Anything to remember about this refund" />
              </div>
            </div>

            {bill.can_cancel && (
              <label className={s.cancelCard} data-on={cancelPlan}>
                <span className={s.cancelIcon}><Ban /></span>
                <span className={s.cancelText}>
                  <span className={s.cancelTitle}>Also cancel this {isMembership ? 'membership period' : billTypeLabel(bill.type).toLowerCase()}</span>
                  <span className={s.cancelSub}>
                    {isMembership
                      ? bill.not_started ? `The renewal is removed and the membership goes back to ending ${fmtDate(bill.valid_from)}.`
                        : bill.current_period ? 'The membership ends today.'
                        : 'The bill is marked cancelled; today’s dates don’t change.'
                      : 'The add-on or package is cancelled.'}
                    {bill.due > 0 ? ` The unpaid ${formatCurrencyText(bill.due)} is written off.` : ''}
                    {!full && ' Keep it off for a part refund where the member stays.'}
                  </span>
                </span>
                <Switch checked={cancelPlan} onCheckedChange={setCancelPlan} />
              </label>
            )}
          </div>
        )}

        {step === 'review' && (
          <div className={s.dBody}>
            <div className={s.reviewAmount}>
              <span>Refund to {member.name}</span>
              <strong><Amount value={amount} /></strong>
              <em>{method}{needsBank && bank ? ` · ${bank.name}` : ''}{reference.trim() ? ` · ref ${reference.trim()}` : ''}</em>
            </div>
            <div className={s.reviewList}>
              <div className={s.reviewHead}>What happens</div>
              <ul>
                {effects.map((e, i) => <li key={i}><CheckCircle2 />{e}</li>)}
              </ul>
              <div className={s.reviewReason}>
                Reason: <strong>{REFUND_REASONS.find(r => r.code === reason)?.label}</strong>{notes.trim() ? ` — ${notes.trim()}` : ''}
              </div>
            </div>
            <div className={s.warn}><AlertTriangle /> A refund can’t be undone from here. Check the amount before you confirm.</div>
          </div>
        )}

        {step === 'done' && result && (
          <div className={s.dBody}>
            <div className={s.doneBox}>
              <div className={s.doneAmount}><Amount value={result.amount} /></div>
              <div className={s.doneSub}>refunded to {member.name} by {result.method}</div>
              <div className={s.doneMeta}>
                <span>{result.voucher_no}</span>
                <span>{fmtDateTime(result.created_at || result.date)}</span>
                {result.cancelled_plan && <span>Plan cancelled</span>}
                {result.due_cleared && result.due_cleared > 0 ? <span>Unpaid {formatCurrencyText(result.due_cleared)} cleared</span> : null}
              </div>
            </div>
          </div>
        )}

        <div className={s.dFoot}>
          {step === 'form' && (
            <>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={() => setStep('review')} disabled={!formOk}>
                Review refund <ArrowLeft className="h-4 w-4 ml-1" style={{ transform: 'rotate(180deg)' }} />
              </Button>
            </>
          )}
          {step === 'review' && (
            <>
              <Button variant="outline" onClick={() => setStep('form')} disabled={saving}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button onClick={submit} disabled={saving} className={s.confirmBtn}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Undo2 className="h-4 w-4 mr-2" />}
                Refund {formatCurrencyText(amount)}
              </Button>
            </>
          )}
          {step === 'done' && result && (
            <>
              <Button variant="outline" onClick={() => printRefundVoucher(result, formatCurrencyText, activeBranchId)}>
                <Printer className="h-4 w-4 mr-2" /> Print voucher
              </Button>
              <Button onClick={close}>Done</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── History ───────────────────────────────────────────────────────────────────
function RefundHistory({ reloadKey }: { reloadKey: number }) {
  const { formatCurrencyText } = useCurrency();
  const { activeBranchId } = useBranch();
  const [preset, setPreset] = useState<Preset>('month');
  const [custom, setCustom] = useState({ from: '', to: '' });
  const range = useMemo(() => presetRange(preset, custom), [preset, custom]);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search, 300);
  const [method, setMethod] = useState('all');
  const [reason, setReason] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<RefundPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const PAGE = 25;

  useEffect(() => { setPage(1); }, [range, debounced, method, reason]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    refundService.list({
      from: range.from, to: range.to, search: debounced || undefined,
      method: method === 'all' ? undefined : method, reason: reason === 'all' ? undefined : reason, page, limit: PAGE,
    }).then(d => { if (!cancelled) setData(d); })
      .catch(e => { if (!cancelled) setError(apiErrorMessage(e, 'Failed to load refunds')); });
    return () => { cancelled = true; };
  }, [range, debounced, method, reason, page, reloadKey]);

  const buildReport = useCallback(async (): Promise<ReportDocument> => {
    const all = await refundService.list({
      from: range.from, to: range.to, search: debounced || undefined,
      method: method === 'all' ? undefined : method, reason: reason === 'all' ? undefined : reason, page: 1, limit: 200,
    });
    const sm = all.summary;
    const sliceCols = (first: string) => [col('label', first), countCol('count', 'Refunds'), moneyCol('amount', 'Amount')];
    return {
      title: 'Refund Report',
      subtitle: 'Money given back to members against their bills.',
      period: { from: range.from, to: range.to, label: presetLabel(preset, range) },
      sections: [
        kpiSection([
          { label: 'Total refunded', value: sm.amount, format: 'money' },
          { label: 'Refunds', value: sm.count, format: 'integer' },
          { label: 'Members', value: sm.members, format: 'integer' },
          { label: 'Plans cancelled', value: sm.cancelled_plans, format: 'integer' },
        ]),
        pieSection('By method', sm.by_method.map(x => ({ label: x.label, value: x.amount })), { valueFormat: 'money' }),
        tableSection('By reason', sliceCols('Reason'), sm.by_reason, { totals: true }),
        tableSection('By bill type', sliceCols('Bill'), sm.by_type, { totals: true }),
        tableSection('Refunds', [
          col('date', 'Date', 'date'), col('voucher_no', 'Voucher'), col('member', 'Member'), col('bill', 'Bill'),
          col('reason', 'Reason'), col('method', 'Method'), moneyCol('amount', 'Amount'), col('cancelled', 'Plan cancelled'),
          col('by', 'By'),
        ], all.rows.map(r => ({
          date: r.date, voucher_no: r.voucher_no, member: [r.member_name, r.member_code].filter(Boolean).join(' · '),
          bill: [r.receipt_no, billTypeLabel(r.bill_type), r.plan_name].filter(Boolean).join(' · '),
          reason: r.reason_label || r.reason || '', method: r.method || '', amount: r.amount,
          cancelled: r.cancelled_plan ? 'Yes' : 'No', by: r.refunded_by || '',
        })), { totals: true }),
      ],
    };
  }, [range, debounced, method, reason, preset]);

  const sm = data?.summary;
  const maxMethod = Math.max(1, ...(sm?.by_method.map(x => x.amount) ?? [1]));
  const maxReason = Math.max(1, ...(sm?.by_reason.map(x => x.amount) ?? [1]));

  return (
    <div className="space-y-6">
      <Card className="border-primary/10 shadow-md">
        <CardContent className={s.filters}>
          <div className={s.presets}>
            {PRESETS.map(p => (
              <button key={p.value} type="button" className={s.preset} data-on={preset === p.value} onClick={() => setPreset(p.value)}>{p.label}</button>
            ))}
          </div>
          {preset === 'custom' && (
            <div className={s.customRange}>
              <Input type="date" value={custom.from} onChange={e => setCustom(c => ({ ...c, from: e.target.value }))} />
              <span>to</span>
              <Input type="date" value={custom.to} onChange={e => setCustom(c => ({ ...c, to: e.target.value }))} />
            </div>
          )}
        </CardContent>
      </Card>

      {sm && sm.count > 0 && (
        <div className={s.breakGrid}>
          <Card className="border-primary/10 shadow-md">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">By method</CardTitle></CardHeader>
            <CardContent className={s.bars}>
              {sm.by_method.map(x => (
                <div key={x.key} className={s.bar}>
                  <span className={s.barLabel}>{x.label}<em>{x.count}</em></span>
                  <span className={s.barTrack}><span className={s.barFill} style={{ width: `${(x.amount / maxMethod) * 100}%` }} /></span>
                  <Amount value={x.amount} className={s.barValue} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="border-primary/10 shadow-md">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">By reason</CardTitle></CardHeader>
            <CardContent className={s.bars}>
              {sm.by_reason.map(x => (
                <div key={x.key} className={s.bar}>
                  <span className={s.barLabel}>{x.label}<em>{x.count}</em></span>
                  <span className={s.barTrack}><span className={s.barFill} data-tone="amber" style={{ width: `${(x.amount / maxReason) * 100}%` }} /></span>
                  <Amount value={x.amount} className={s.barValue} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="border-primary/10 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className={bs.tableTitle}>
                <History className="h-4 w-4 text-primary" /> Refunds
                <span className={bs.count}>{(data?.total ?? 0).toLocaleString()}</span>
              </CardTitle>
              <CardDescription>
                {sm ? <>{presetLabel(preset, range)} · <Amount value={sm.amount} /> refunded to {sm.members.toLocaleString()} {sm.members === 1 ? 'member' : 'members'}</> : 'Loading…'}
              </CardDescription>
            </div>
            <ReportActions report={buildReport} disabled={!data || data.total === 0} menuLabel="Refunds" compact />
          </div>
        </CardHeader>
        <CardContent>
          <div className={s.tableFilters}>
            <div className={s.searchWrapSm}>
              <Search className={s.searchIconSm} />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Member, voucher, bill or plan…" className={s.searchInputSm} />
              {search && <button type="button" className={s.clear} onClick={() => setSearch('')} aria-label="Clear"><X /></button>}
            </div>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger className={s.filterSelect}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                {REFUND_METHODS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className={s.filterSelect}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reasons</SelectItem>
                {REFUND_REASONS.map(r => <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <div className={s.empty}><AlertTriangle /><span>{error}</span></div>
          ) : !data ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : data.rows.length === 0 ? (
            <div className={s.empty}><Undo2 /><span>No refunds in {presetLabel(preset, range).toLowerCase()}{debounced ? ` matching “${debounced}”` : ''}.</span></div>
          ) : (
            <>
              <div className={s.tableWrap}>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead>Against</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>By</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.rows.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className={s.cellMain}>{fmtDate(r.date)}</div>
                          <div className={s.cellSub}>{r.voucher_no}</div>
                        </TableCell>
                        <TableCell>
                          <div className={s.cellMain}><UserRound className={s.inlineIcon} />{r.member_name || '—'}</div>
                          <div className={s.cellSub}>{[r.member_code, r.member_phone].filter(Boolean).join(' · ')}</div>
                        </TableCell>
                        <TableCell>
                          <div className={s.cellMain}>{r.receipt_no || '—'}</div>
                          <div className={s.cellSub}>{[billTypeLabel(r.bill_type), r.plan_name].filter(Boolean).join(' · ')}</div>
                        </TableCell>
                        <TableCell>
                          <div className={s.cellMain}>{r.reason_label || r.reason || '—'}</div>
                          {r.cancelled_plan && <span className={s.statusChip} data-status="cancelled">Plan cancelled</span>}
                        </TableCell>
                        <TableCell>
                          <span className={s.methodChip}>{r.method || 'Cash'}</span>
                          {r.reference && <div className={s.cellSub}>{r.reference}</div>}
                        </TableCell>
                        <TableCell className="text-right font-semibold"><Amount value={-r.amount} className={s.red} /></TableCell>
                        <TableCell><span className={s.cellSub}>{r.refunded_by || (r.source ? '—' : 'Imported')}</span></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => printRefundVoucher(r, formatCurrencyText, activeBranchId)} aria-label="Print refund voucher">
                            <Printer className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ListPagination page={page} pageSize={PAGE} total={data.total} onPageChange={setPage} noun="refunds" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
