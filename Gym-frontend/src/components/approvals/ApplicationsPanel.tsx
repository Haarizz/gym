// Approvals → Applications: membership applications from the public Service Portfolios
// link. Payment and approval are separate: a paid online application still waits here,
// and a cash one is approved only once reception confirms the cash. Approving creates
// the member with the chosen plan (starting today) and posts the receipt.
import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Banknote, CheckCircle, Clock, CreditCard, FileText, Globe, RefreshCw, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { styles, Panel, Status, fmtDate } from '../overview/overview-kit';
import q from './approvals.module.css';
import {
  servicePortfolioService, apiErrorMessage, type MembershipApplication,
} from '../../utils/supabase/service-portfolio-service';

const initials = (name?: string | null) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?';

function ago(value?: string | null) {
  if (!value) return '';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '';
  const hours = Math.max(0, (Date.now() - t) / 36e5);
  return hours < 1 ? 'just now' : hours < 24 ? `${Math.floor(hours)}h ago` : `${Math.floor(hours / 24)}d ago`;
}

const dateTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—'
    : `${fmtDate(d)} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
};

export function paymentLabel(a: MembershipApplication) {
  if (a.payment_status === 'PAID') return a.payment_method === 'ONLINE' ? 'Paid online' : 'Cash received';
  if (a.payment_status === 'REFUNDED') return 'Refunded';
  if (a.payment_status === 'VOID') return 'Not paid';
  return 'Cash — pending';
}

export function ApplicationsPanel({ applications, loading, onChanged, money }: {
  applications: MembershipApplication[];
  loading: boolean;
  onChanged: () => void;
  money: (n: number) => string;
}) {
  const [review, setReview] = useState<MembershipApplication | null>(null);
  const [mode, setMode] = useState<'review' | 'reject'>('review');
  const [cashReceived, setCashReceived] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const paid = applications.filter(a => a.payment_status === 'PAID');
  const cash = applications.filter(a => a.payment_status !== 'PAID');

  const open = (a: MembershipApplication, m: 'review' | 'reject' = 'review') => {
    setReview(a);
    setMode(m);
    setCashReceived(false);
    setReason('');
  };

  const approve = async () => {
    if (!review) return;
    const needsCash = review.payment_status !== 'PAID';
    if (needsCash && !cashReceived) {
      toast.error(`Confirm you've received ${money(review.amount)} in cash first`);
      return;
    }
    setBusy(true);
    try {
      const done = await servicePortfolioService.approve(review.id, needsCash);
      toast.success(`${done.full_name} is now a member${done.member_code ? ` (${done.member_code})` : ''} — ${done.plan_name} is active`);
      setReview(null);
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to approve the application'));
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    if (!review) return;
    if (!reason.trim()) {
      toast.error('A rejection reason is required');
      return;
    }
    setBusy(true);
    try {
      await servicePortfolioService.reject(review.id, reason.trim());
      toast.success(review.payment_status === 'PAID'
        ? `${review.full_name}'s application rejected — the online payment is marked refunded`
        : `${review.full_name}'s application rejected`);
      setReview(null);
      onChanged();
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Failed to reject the application'));
    } finally {
      setBusy(false);
    }
  };

  const renderList = (rows: MembershipApplication[], emptyTitle: string, emptyText: string) => {
    if (loading && rows.length === 0) {
      return <div className={styles.centered} style={{ minHeight: 120 }}><RefreshCw className="h-5 w-5 animate-spin text-primary" />Loading…</div>;
    }
    if (rows.length === 0) {
      return (
        <div className={q.caughtUp}>
          <span className={q.caughtUpIcon}><CheckCircle size={22} /></span>
          <strong>{emptyTitle}</strong>
          <span>{emptyText}</span>
        </div>
      );
    }
    return (
      <div className={`${q.queue} ${loading ? styles.loadingVeil : ''}`}>
        {rows.map(a => {
          const isPaid = a.payment_status === 'PAID';
          return (
            <div key={a.id} className={q.item}>
              <span className={q.avatar}>{initials(a.full_name)}</span>
              <div className={q.who}>
                <span className={q.name}>{a.full_name}<span className={styles.muted} style={{ fontWeight: 400 }}> · {a.reference}</span></span>
                <span className={q.what}>{a.plan_name}{a.plan_duration ? ` · ${a.plan_duration}` : ''}</span>
                <span className={q.meta}>
                  <span>{a.phone}</span>
                  {a.branch_name && <span>{a.branch_name}</span>}
                  <Status kind={isPaid ? 'good' : 'warning'}>
                    {a.payment_method === 'ONLINE' ? <CreditCard size={11} /> : <Banknote size={11} />}
                    {paymentLabel(a)}
                  </Status>
                  <Status kind="info"><Clock size={11} />Approval pending</Status>
                  <span title={dateTime(a.created_at)}>{ago(a.created_at)}</span>
                </span>
              </div>
              <div className={q.money}>
                <div className={q.moneyCell}>
                  <span className={q.moneyLabel}>Amount</span>
                  <span className={q.moneyValue}>{money(a.amount)}</span>
                  {a.offer_label && <span className={q.moneySub}>{a.offer_label}</span>}
                </div>
                <div className={q.moneyCell}>
                  <span className={q.moneyLabel}>Received</span>
                  <span className={q.moneyValue} data-tone={isPaid ? 'good' : undefined}>{money(isPaid ? a.amount : 0)}</span>
                  {isPaid && a.card_last4 && <span className={q.moneySub}>{a.card_brand} •••• {a.card_last4}</span>}
                </div>
                <div className={q.moneyCell}>
                  <span className={q.moneyLabel}>To collect</span>
                  <span className={q.moneyValue} data-tone={!isPaid ? 'bad' : undefined}>{money(isPaid ? 0 : a.amount)}</span>
                </div>
              </div>
              <div className={q.actions}>
                <Button size="sm" variant="outline" className={q.reject} onClick={() => open(a, 'reject')}>
                  <XCircle className="mr-1.5 h-4 w-4" /> Reject
                </Button>
                <Button size="sm" className={q.approve} onClick={() => open(a)}>
                  <FileText className="mr-1.5 h-4 w-4" /> Review
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const r = review;
  const reviewPaid = r?.payment_status === 'PAID';

  return (
    <>
      <Panel title="Paid applications — pending approval" icon={CreditCard}
        sub="Paid online through the share link. Approving creates the member and starts the plan today">
        {renderList(paid, 'No paid applications waiting', 'Applications paid online from your Service Portfolios link appear here.')}
      </Panel>
      <div style={{ height: 16 }} />
      <Panel title="Cash applications — awaiting payment" icon={Banknote}
        sub="The applicant will pay at reception. Confirm the cash when you approve">
        {renderList(cash, 'No cash applications waiting', 'Applicants who chose to pay cash at the gym appear here.')}
      </Panel>

      <Dialog open={!!r} onOpenChange={(o) => { if (!o) setReview(null); }}>
        <DialogContent className="max-w-lg" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
          {r && (
            <>
              <DialogHeader>
                <DialogTitle>{mode === 'reject' ? 'Reject application' : 'Review application'}</DialogTitle>
                <DialogDescription>
                  {r.full_name} · {r.reference} · submitted {dateTime(r.created_at)}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Applicant</div>
                  <dl className={q.summary}>
                    <div><dt>Phone</dt><dd>{r.phone}</dd></div>
                    <div><dt>Email</dt><dd style={{ overflowWrap: 'anywhere' }}>{r.email || '—'}</dd></div>
                    <div><dt>Gender</dt><dd>{r.gender || '—'}</dd></div>
                    <div><dt>Date of birth</dt><dd>{r.date_of_birth ? fmtDate(r.date_of_birth) : '—'}</dd></div>
                    {r.address && <div style={{ gridColumn: '1 / -1' }}><dt>Address</dt><dd>{r.address}</dd></div>}
                    {(r.emergency_contact_name || r.emergency_contact_phone) && (
                      <div style={{ gridColumn: '1 / -1' }}><dt>Emergency contact</dt>
                        <dd>{[r.emergency_contact_name, r.emergency_contact_phone].filter(Boolean).join(' · ')}</dd></div>
                    )}
                    {r.notes && <div style={{ gridColumn: '1 / -1' }}><dt>Notes</dt><dd style={{ whiteSpace: 'pre-line' }}>{r.notes}</dd></div>}
                  </dl>
                </div>

                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">Plan & payment</div>
                  <dl className={q.summary}>
                    <div><dt>Plan</dt><dd>{r.plan_name}{r.plan_duration ? ` · ${r.plan_duration}` : ''}</dd></div>
                    <div><dt>Amount</dt><dd>{money(r.amount)}{r.list_price > r.amount ? <span className={styles.muted} style={{ fontWeight: 400 }}> (list {money(r.list_price)})</span> : null}</dd></div>
                    <div><dt>Payment method</dt><dd>{r.payment_method === 'ONLINE' ? 'Online (card)' : 'Cash at the gym'}</dd></div>
                    <div><dt>Payment status</dt>
                      <dd><Status kind={reviewPaid ? 'good' : 'warning'}>{paymentLabel(r)}</Status></dd></div>
                    {r.card_last4 && <div><dt>Card</dt><dd>{r.card_brand} •••• {r.card_last4}</dd></div>}
                    {r.paid_at && <div><dt>Paid at</dt><dd>{dateTime(r.paid_at)}</dd></div>}
                    {r.payment_reference && r.payment_method === 'ONLINE' && (
                      <div style={{ gridColumn: '1 / -1' }}><dt>Payment ID</dt><dd className="font-mono text-xs" style={{ overflowWrap: 'anywhere' }}>{r.payment_reference}</dd></div>
                    )}
                    <div><dt>Approval</dt><dd><Status kind="info">Pending</Status></dd></div>
                    {r.branch_name && <div><dt>Branch</dt><dd>{r.branch_name}</dd></div>}
                  </dl>
                  {r.payment_method === 'ONLINE' && (
                    <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                      <Globe size={12} /> Paid through the demo card checkout (test mode) — no real money was taken.
                    </p>
                  )}
                </div>

                {mode === 'review' ? (
                  <>
                    {!reviewPaid && (
                      <label htmlFor="app-cash" className="flex items-start gap-2.5 rounded-lg border p-3 cursor-pointer">
                        <Checkbox id="app-cash" checked={cashReceived} onCheckedChange={(v) => setCashReceived(v === true)} />
                        <span className="text-sm">I've received <strong>{money(r.amount)}</strong> in cash from {r.full_name}.</span>
                      </label>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Approving creates {r.full_name}'s member profile, assigns <strong>{r.plan_name}</strong> starting today,
                      activates the membership and records the {reviewPaid && r.payment_method === 'ONLINE' ? 'card' : 'cash'} payment on a receipt.
                    </p>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="app-reason">Reason (required)</Label>
                    <Textarea id="app-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                      placeholder="Why is this application being rejected?" />
                    {reviewPaid && (
                      <p className="text-xs text-muted-foreground">The online payment will be marked refunded.</p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2">
                {mode === 'review' ? (
                  <>
                    <Button variant="outline" className={q.reject} onClick={() => setMode('reject')} disabled={busy}>
                      <XCircle className="mr-1.5 h-4 w-4" /> Reject
                    </Button>
                    <Button className={q.approve} onClick={approve} disabled={busy || (!reviewPaid && !cashReceived)}>
                      <CheckCircle className="mr-1.5 h-4 w-4" />
                      {busy ? 'Approving…' : reviewPaid ? 'Approve membership' : 'Confirm cash & approve'}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => setMode('review')} disabled={busy}>Back</Button>
                    <Button className={q.rejectSolid} onClick={reject} disabled={busy}>
                      {busy ? 'Rejecting…' : 'Confirm rejection'}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
