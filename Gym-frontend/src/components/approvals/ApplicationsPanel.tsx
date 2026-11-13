// Approvals → Applications: membership applications from the public Service Portfolios
// link, and ones staff raise for a walk-in (Service Portfolios → Choose Plan → New Member,
// source DESK — always cash at reception). Payment and approval are separate: a paid online application still waits here,
// and a cash one is approved only once reception confirms the cash. Approving creates
// the member with the chosen plan (starting today) and posts the receipt.
// Either decision emails the applicant (approved: their member ID; rejected: the reason as
// written) from the gym's mailbox in GymOS › Settings › Email. "Recently decided" shows
// whether that email went out, with a Resend.
import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import {
  AlertTriangle, Banknote, CheckCircle, Clock, CreditCard, FileText, Globe, History, Mail, MailCheck, MailX,
  RefreshCw, Send, Store, XCircle,
} from 'lucide-react';
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

const householdLabel = (a: MembershipApplication) => {
  const n = 1 + (a.family_members?.length ?? 0);
  return `${n} people`;
};

const sourceLabel = (a: MembershipApplication) =>
  a.source === 'DESK' ? `Registered at the desk${a.submitted_by ? ` by ${a.submitted_by}` : ''}` : 'Share link (applied online)';

/** The end of the success toast: did the applicant hear about it? */
const emailOutcome = (a: MembershipApplication) =>
  a.decision_email_status === 'SENT' ? `${a.full_name} has been emailed.`
    : a.decision_email_status === 'FAILED' ? "The email to the applicant couldn't be sent. You can resend it under Recently decided."
    : "Email isn't set up, so the applicant wasn't notified.";

function EmailStatus({ a }: { a: MembershipApplication }) {
  if (a.decision_email_status === 'SENT') {
    return <Status kind="good"><MailCheck size={11} />Emailed</Status>;
  }
  if (a.decision_email_status === 'FAILED') {
    return <span title={a.decision_email_error || undefined}><Status kind="critical"><MailX size={11} />Email failed</Status></span>;
  }
  return <Status kind="warning"><Mail size={11} />Not emailed</Status>;
}

const DECIDED_PAGE = 10;

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
  const [decided, setDecided] = useState<MembershipApplication[]>([]);
  const [decidedLoading, setDecidedLoading] = useState(false);
  const [decidedShown, setDecidedShown] = useState(DECIDED_PAGE);
  const [resending, setResending] = useState<number | null>(null);

  const loadDecided = useCallback(async () => {
    setDecidedLoading(true);
    try {
      setDecided(await servicePortfolioService.listApplications('decided'));
    } catch {
      // The pending queue is what matters here; its own load reports errors.
    } finally {
      setDecidedLoading(false);
    }
  }, []);

  // Reloads whenever the pending list does, so a decision moves across straight away.
  useEffect(() => { loadDecided(); }, [applications, loadDecided]);

  const resend = async (a: MembershipApplication) => {
    setResending(a.id);
    try {
      const done = await servicePortfolioService.resendDecisionEmail(a.id);
      setDecided(rows => rows.map(x => (x.id === done.id ? done : x)));
      if (done.decision_email_status === 'SENT') toast.success(`Email sent to ${done.email}`);
      else if (done.decision_email_status === 'FAILED') toast.error(done.decision_email_error || "The email couldn't be sent");
      else toast.error("Email isn't set up yet. Add your mailbox in GymOS › Settings › Email.");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't resend the email"));
    } finally {
      setResending(null);
    }
  };

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
      toast.success(`${done.full_name} is now a member${done.member_code ? ` (${done.member_code})` : ''} — ${done.plan_name} is active. ${emailOutcome(done)}`);
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
      const done = await servicePortfolioService.reject(review.id, reason.trim());
      toast.success((review.payment_status === 'PAID'
        ? `${review.full_name}'s application rejected — the online payment is marked refunded. `
        : `${review.full_name}'s application rejected. `) + emailOutcome(done));
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
                <span className={q.what}>
                  {a.plan_name}{a.plan_duration ? ` · ${a.plan_duration}` : ''}
                  {!!a.family_members?.length && ` · ${householdLabel(a)}`}
                </span>
                <span className={q.meta}>
                  <span>{a.phone}</span>
                  {a.branch_name && <span>{a.branch_name}</span>}
                  <Status kind={isPaid ? 'good' : 'warning'}>
                    {a.payment_method === 'ONLINE' ? <CreditCard size={11} /> : <Banknote size={11} />}
                    {paymentLabel(a)}
                  </Status>
                  {a.source === 'DESK'
                    ? <Status kind="info"><Store size={11} />Walk-in · desk</Status>
                    : <Status kind="info"><Globe size={11} />Share link</Status>}
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
        {renderList(cash, 'No cash applications waiting', 'Applicants who chose to pay cash at the gym, and walk-ins registered from Service Portfolios, appear here.')}
      </Panel>
      <div style={{ height: 16 }} />
      <Panel title="Recently decided" icon={History}
        sub="Approved and rejected applications, and whether the applicant was emailed">
        {decided.length === 0 ? (
          decidedLoading
            ? <div className={styles.centered} style={{ minHeight: 80 }}><RefreshCw className="h-5 w-5 animate-spin text-primary" />Loading…</div>
            : <p className="text-sm text-muted-foreground" style={{ padding: '8px 0' }}>No decisions yet.</p>
        ) : (
          <div className={`${q.queue} ${decidedLoading ? styles.loadingVeil : ''}`}>
            {decided.slice(0, decidedShown).map(a => {
              const approved = a.approval_status === 'APPROVED';
              return (
                <div key={a.id} className={q.item}>
                  <span className={q.avatar}>{initials(a.full_name)}</span>
                  <div className={q.who}>
                    <span className={q.name}>{a.full_name}<span className={styles.muted} style={{ fontWeight: 400 }}> · {a.reference}</span></span>
                    <span className={q.what}>
                      {a.plan_name}{a.plan_duration ? ` · ${a.plan_duration}` : ''}
                      {approved && a.member_code ? ` · ${a.member_code}` : ''}
                    </span>
                    {!approved && a.rejection_reason && (
                      <span className="text-sm text-muted-foreground line-clamp-2" title={a.rejection_reason}>
                        Reason: {a.rejection_reason}
                      </span>
                    )}
                    <span className={q.meta}>
                      <span>{a.email}</span>
                      {a.branch_name && <span>{a.branch_name}</span>}
                      {approved
                        ? <Status kind="good"><CheckCircle size={11} />Approved</Status>
                        : <Status kind="critical"><XCircle size={11} />Rejected</Status>}
                      <EmailStatus a={a} />
                      <span title={dateTime(a.decided_at)}>{a.decided_by ? `${a.decided_by} · ` : ''}{ago(a.decided_at)}</span>
                    </span>
                    {a.decision_email_status === 'FAILED' && a.decision_email_error && (
                      <span className="text-xs text-destructive">{a.decision_email_error}</span>
                    )}
                  </div>
                  <div className={q.actions}>
                    {a.decision_email_status !== 'SENT' && (
                      <Button size="sm" variant="outline" onClick={() => resend(a)} disabled={resending === a.id}>
                        <Send className="mr-1.5 h-4 w-4" /> {resending === a.id ? 'Sending…' : 'Resend email'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {decided.length > decidedShown && (
              <div style={{ textAlign: 'center', paddingTop: 8 }}>
                <Button size="sm" variant="ghost" onClick={() => setDecidedShown(n => n + DECIDED_PAGE)}>Show more</Button>
              </div>
            )}
          </div>
        )}
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
                    {r.reg_doc_number && <div><dt>National ID</dt><dd>{r.reg_doc_number}</dd></div>}
                    <div><dt>Source</dt><dd>{sourceLabel(r)}</dd></div>
                    {r.address && <div style={{ gridColumn: '1 / -1' }}><dt>Address</dt><dd>{r.address}</dd></div>}
                    {(r.emergency_contact_name || r.emergency_contact_phone) && (
                      <div style={{ gridColumn: '1 / -1' }}><dt>Emergency contact</dt>
                        <dd>{[r.emergency_contact_name, r.emergency_contact_phone].filter(Boolean).join(' · ')}</dd></div>
                    )}
                    {r.medical_conditions && <div style={{ gridColumn: '1 / -1' }}><dt>Medical conditions</dt><dd style={{ whiteSpace: 'pre-line' }}>{r.medical_conditions}</dd></div>}
                    {r.notes && <div style={{ gridColumn: '1 / -1' }}><dt>Notes</dt><dd style={{ whiteSpace: 'pre-line' }}>{r.notes}</dd></div>}
                  </dl>
                </div>

                {!!r.family_members?.length && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">
                      Family members ({r.family_members.length})
                    </div>
                    <ul className={q.householdList}>
                      {r.family_members.map((m, i) => (
                        <li key={i}>
                          <div className={q.householdName}>
                            {m.name}
                            <span className={styles.muted} style={{ fontWeight: 400 }}>
                              {' · '}{m.relationship}{m.minor ? ' · Child' : ''}
                            </span>
                          </div>
                          <div className={q.householdMeta}>
                            {[m.gender, m.date_of_birth ? `Born ${fmtDate(m.date_of_birth)}` : null, m.phone, m.email]
                              .filter(Boolean).join(' · ') || 'No other details'}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

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
                      {!!r.family_members?.length && <> {r.full_name} becomes the family head and the {r.family_members.length === 1 ? 'other member is' : `${r.family_members.length} other members are`} added to the family, billed on the same receipt.</>}
                    </p>
                    <EmailNotice a={r} sends={<>{r.full_name} will be emailed their member ID at <strong>{r.email}</strong>.</>} />
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="app-reason">Reason (required)</Label>
                    <Textarea id="app-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)}
                      placeholder="Why is this application being rejected?" />
                    {reviewPaid && (
                      <p className="text-xs text-muted-foreground">The online payment will be marked refunded.</p>
                    )}
                    <EmailNotice a={r} sends={<>This reason will be emailed to <strong>{r.email}</strong> exactly as written.</>} />
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

/** Under a decision: what the applicant will be emailed, or a warning that they won't be. */
function EmailNotice({ a, sends }: { a: MembershipApplication; sends: React.ReactNode }) {
  if (a.email_configured && a.email) {
    return (
      <p className="text-xs text-muted-foreground flex items-start gap-1.5">
        <Mail size={13} className="mt-0.5 shrink-0" /><span>{sends}</span>
      </p>
    );
  }
  return (
    <p className="text-xs flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-50 p-2 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertTriangle size={13} className="mt-0.5 shrink-0" />
      <span>
        Email isn't set up for this gym (GymOS › Settings › Email), so the applicant won't be notified.
        Contact them on <strong>{a.phone}</strong>.
      </span>
    </p>
  );
}
