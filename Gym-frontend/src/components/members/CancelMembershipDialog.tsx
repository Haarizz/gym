import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Ban, CalendarClock, CalendarX2, CheckCircle2, CircleDollarSign, Dumbbell,
  FileX2, HandCoins, Hourglass, Loader2, PauseCircle, Package, ReceiptText, ShieldCheck, Smartphone, Undo2, UserX, Users, Wallet,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MemberAvatar } from './MemberAvatar';
import { CurrencyValue, useCurrency } from '../../utils/currency';
import { apiErrorMessage } from '../../utils/supabase/payment-terms-service';
import {
  cancellationService, cancelRefundPath,
  type CancelHandoff, type CancelPerson, type CancellationPreview, type CancellationResult, type DuesAction,
} from '../../utils/supabase/cancellation-service';
import rs from '../../pages/refunds.module.css';
import s from './CancelMembership.module.css';

type Step = 'warn' | 'review' | 'confirm' | 'done';
/** COLLECT and HOLD are handled here; the other two travel to the server. */
type DuesChoice = DuesAction | 'COLLECT' | 'HOLD' | null;

const Money = ({ value, className }: { value?: number | null; className?: string }) =>
  <CurrencyValue amount={Number(value ?? 0)} options={{ minimumFractionDigits: 2, maximumFractionDigits: 2 }} className={className} />;

function fmtDate(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString()} ${n === 1 ? one : many}`;
function duration(days: number) {
  if (days < 45) return plural(days, 'day');
  if (days < 365) return `${Math.round(days / 30.4)} months`;
  const y = Math.floor(days / 365); const m = Math.round((days % 365) / 30.4);
  return `${plural(y, 'year')}${m ? ` ${plural(m, 'month')}` : ''}`;
}
const POLICY_LABEL: Record<string, string> = {
  prorated: 'pro-rated for the unused days',
  flat: 'unused bills less a fixed fee',
  none: 'no refunds',
};

export function CancelMembershipDialog({ memberId, open, onClose, onChanged }: {
  memberId: number | string | null;
  open: boolean;
  onClose: () => void;
  /** After a cancellation or a hold change — reload the member / list. */
  onChanged?: () => void;
}) {
  const navigate = useNavigate();
  const { formatCurrencyText } = useCurrency();
  const [data, setData] = useState<CancellationPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('warn');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [dues, setDues] = useState<DuesChoice>(null);
  const [holdRefund, setHoldRefund] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<CancellationResult | null>(null);

  const load = () => {
    if (memberId == null) return;
    setError(null);
    cancellationService.preview(memberId)
      .then(p => {
        setData(p);
        if (p.hold?.reason) setReason(r => r || p.hold!.reason!);
        if (p.hold?.notes) setNotes(n => n || p.hold!.notes!);
      })
      .catch(e => setError(apiErrorMessage(e, 'Could not load the member')));
  };

  useEffect(() => {
    if (!open) return;
    setData(null); setStep('warn'); setReason(''); setNotes(''); setDues(null); setHoldRefund(false);
    setUnderstood(false); setResult(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, memberId]);

  const hasDues = (data?.dues_total ?? 0) > 0.004;
  const canDeduct = !!data?.can_refund && hasDues && (data?.policy_total ?? 0) + 0.004 >= (data?.dues_total ?? 0);
  const family = (data?.household.length ?? 0) > 1;
  const who = data ? (family ? `${data.name} and family` : data.name) : '';
  const duesReady = !hasDues || dues === 'WRITE_OFF' || dues === 'DEDUCT';
  const reasonOk = reason.trim().length > 0;
  const upcomingTotal = useMemo(() => data?.household.reduce((n, p) => n + p.upcoming_bookings.length, 0) ?? 0, [data]);
  const activeAddons = useMemo(() => data?.household.reduce((n, p) =>
    n + p.addons.filter(a => !['cancelled', 'rejected', 'expired'].includes((a.status || '').toLowerCase())).length, 0) ?? 0, [data]);

  const close = () => { if (!saving) onClose(); };

  const goRefund = () => {
    if (!data) return;
    const handoff: CancelHandoff = { reason: reason.trim(), notes: notes.trim() || undefined, dues_action: dues === 'WRITE_OFF' || dues === 'DEDUCT' ? dues : null };
    onClose();
    navigate(cancelRefundPath(data.member_db_id), { state: { cancelHandoff: handoff } });
  };

  const collectNow = () => {
    if (!data) return;
    onClose();
    navigate(`/billing?tab=pending&search=${encodeURIComponent(data.member_id || data.name)}`);
  };

  const putOnHold = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const p = await cancellationService.hold(data.member_db_id, { reason: reason.trim(), notes: notes.trim() || null, wants_refund: holdRefund });
      setData(p);
      toast.success('Cancellation on hold', { description: `${who} is suspended until the dues are cleared.` });
      onChanged?.();
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not put the cancellation on hold'));
    } finally { setSaving(false); }
  };

  const withdrawRequest = async () => {
    if (!data?.pending_request) return;
    setSaving(true);
    try {
      await cancellationService.withdraw(data.pending_request.id);
      toast.success('Cancellation request withdrawn');
      onChanged?.();
      load();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not withdraw the request'));
    } finally { setSaving(false); }
  };

  const releaseHold = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await cancellationService.releaseHold(data.member_db_id);
      toast.success('Cancellation withdrawn', { description: `${data.name} stays a member and is no longer suspended.` });
      onChanged?.();
      onClose();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not withdraw the cancellation'));
    } finally { setSaving(false); }
  };

  const cancelNow = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const r = await cancellationService.cancel(data.member_db_id, {
        reason: reason.trim(), notes: notes.trim() || null, dues_action: dues === 'WRITE_OFF' ? 'WRITE_OFF' : null,
      });
      if (r.outcome === 'PENDING_APPROVAL') {
        toast.success('Sent for approval', { description: `An Admin or Manager will review cancelling ${r.members.join(', ')}.` });
        onChanged?.();
        onClose();
        return;
      }
      setResult(r);
      setStep('done');
      toast.success(`Membership cancelled — ${r.members.join(', ')}`);
      onChanged?.();
    } catch (e) {
      toast.error(apiErrorMessage(e, 'The membership could not be cancelled'));
    } finally { setSaving(false); }
  };

  const title = step === 'done' ? 'Membership cancelled'
    : step === 'confirm' ? 'Confirm the cancellation'
    : step === 'review' ? 'Review before cancelling'
    : 'Cancel membership';

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) close(); }}>
      <DialogContent className={`${rs.dialog} ${s.wide}`} onInteractOutside={e => e.preventDefault()}>
        <div className={rs.dHead}>
          <span className={rs.dIcon} data-done={step === 'done'}>{step === 'done' ? <CheckCircle2 /> : <UserX />}</span>
          <div className={rs.dHeadText}>
            <DialogTitle className={rs.dTitle}>{title}</DialogTitle>
            <DialogDescription className={rs.dSub}>
              {data ? <>{data.name}{data.member_id ? ` · ${data.member_id}` : ''}{family ? ` · household of ${data.household.length}` : ''}</> : 'Loading…'}
            </DialogDescription>
          </div>
        </div>

        {error ? (
          <div className={rs.dBody}><div className={s.banner} data-tone="red"><AlertTriangle /><span>{error}</span></div></div>
        ) : !data ? (
          <div className={rs.dBody}><div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div></div>
        ) : step === 'warn' ? (
          <WarnStep data={data} family={family} upcoming={upcomingTotal} addons={activeAddons} />
        ) : step === 'review' ? (
          <div className={rs.dBody}>
            {data.household.map(p => <PersonCard key={p.member_db_id} p={p} />)}

            {/* Dues */}
            {(hasDues || data.expiry_dues_total > 0) && (
              <div className={rs.field}>
                <div className={s.sectionHead}><ReceiptText /> Unpaid dues <em><Money value={data.dues_total} className={hasDues ? rs.red : undefined} /></em></div>
                <div className={s.dueList}>
                  {data.dues.map(d => (
                    <div key={d.receipt_id} className={s.dueRow} data-expiry={d.expiry_due}>
                      <div>
                        <strong>{d.description}</strong>
                        <div className={rs.cellSub}>{d.receipt_no} · {fmtDate(d.date)}{family && d.member_name ? ` · ${d.member_name}` : ''}
                          {d.expiry_due ? ' · renewal bill — cancelled with the membership, nothing to collect' : ''}</div>
                      </div>
                      <Money value={d.owed} className={d.expiry_due ? undefined : rs.red} />
                    </div>
                  ))}
                </div>
                {hasDues && (
                  <>
                    <span className={rs.hint}>{data.name} owes <b>{formatCurrencyText(data.dues_total)}</b>. Settle it before the membership ends:</span>
                    <div className={s.options}>
                      <DuesOption on={dues === 'COLLECT'} icon={<HandCoins />} title="Collect now"
                        sub="Open Pending Payments for this member, take the payment, then come back."
                        onClick={() => setDues('COLLECT')} />
                      <DuesOption on={dues === 'DEDUCT'} icon={<Undo2 />} title="Take it from the refund"
                        sub={canDeduct ? `Refund minus ${formatCurrencyText(data.dues_total)} owed — only the difference is paid out.`
                          : data.can_refund ? `The refund (up to ${formatCurrencyText(data.policy_total)}) doesn't cover the dues.` : 'No refund is due under the policy.'}
                        disabled={!canDeduct} onClick={() => setDues('DEDUCT')} />
                      <DuesOption on={dues === 'WRITE_OFF'} icon={<FileX2 />} title="Write it off"
                        sub="The gym gives up the money. Recorded in Write-off History." onClick={() => setDues('WRITE_OFF')} />
                      <DuesOption on={dues === 'HOLD'} icon={<PauseCircle />} title="Put on hold"
                        sub="Suspend the membership (no entry, no bookings) until the dues are paid or written off."
                        onClick={() => setDues('HOLD')} />
                    </div>
                    {dues === 'COLLECT' && (
                      <div className={s.banner} data-tone="blue"><HandCoins /><span>Collect the dues in <strong>Billing › Pending Payments</strong>, then open Cancel membership again.</span></div>
                    )}
                    {dues === 'HOLD' && (
                      <label className={s.confirmCheck}>
                        <input type="checkbox" checked={holdRefund} onChange={e => setHoldRefund(e.target.checked)} disabled={!data.can_refund} />
                        <span>Give a refund when it finishes{!data.can_refund ? ' (none due under the policy)' : ''}. Without a refund the cancellation finishes by itself as soon as nothing is owed; with one, finish it from Billing › Refunds.</span>
                      </label>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Refund estimate */}
            <div className={s.refundCard} data-none={!data.can_refund}>
              <CircleDollarSign />
              <div>
                <b>{data.can_refund ? 'Refundable under the gym’s policy' : 'No refund'}</b>
                {data.can_refund
                  ? <>Policy: {POLICY_LABEL[data.policy.method]}{data.cancellation_fee > 0 ? ` (fee ${formatCurrencyText(data.cancellation_fee)})` : ''}. Choose 100%, 75%, 50% or 25% of it on the refund screen.</>
                  : data.refund_blocked_reason}
              </div>
              {data.can_refund && <strong><Money value={data.policy_total} /></strong>}
            </div>

            {/* Reason */}
            <div className={rs.grid2}>
              <div className={rs.field}>
                <Label>Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger><SelectValue placeholder="Why is the member leaving?" /></SelectTrigger>
                  <SelectContent>
                    {(data.reasons.length ? data.reasons : ['Member Relocation', 'Medical Reasons', 'Financial Issues', 'Dissatisfaction', 'Other'])
                      .concat(reason && !data.reasons.includes(reason) ? [reason] : [])
                      .map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className={rs.field}>
                <Label htmlFor="cm-notes">Notes <span className={rs.optional}>optional</span></Label>
                <Textarea id="cm-notes" rows={2} maxLength={1000} value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Anything to remember about why they left" />
              </div>
            </div>
          </div>
        ) : step === 'confirm' ? (
          <div className={rs.dBody}>
            <div className={rs.reviewList}>
              <div className={rs.reviewHead}>What happens</div>
              <ul>
                <li><CheckCircle2 />{family ? `${data.household.map(p => p.name).join(', ')} are cancelled together.` : `${data.name}’s membership ends today and is marked Cancelled.`}</li>
                <li><CheckCircle2 />No money goes back — the gym keeps what was paid.</li>
                {dues === 'WRITE_OFF' && <li><CheckCircle2 />{formatCurrencyText(data.dues_total)} in dues is written off.</li>}
                {data.expiry_dues_total > 0 && <li><CheckCircle2 />The unpaid renewal bill ({formatCurrencyText(data.expiry_dues_total)}) is cancelled.</li>}
                {upcomingTotal > 0 && <li><CheckCircle2 />{plural(upcomingTotal, 'upcoming booking')} cancelled — seats go to the waitlist.</li>}
                {activeAddons > 0 && <li><CheckCircle2 />{plural(activeAddons, 'add-on')} and any PT packages cancelled.</li>}
                <li><CheckCircle2 />Check-in and face access stop. Their GymBios app shows the gym as cancelled — they keep their account and can still see their payments here.</li>
                <li><CheckCircle2 />Their record, bills and history stay — find them under the Cancelled filter.</li>
              </ul>
              <div className={rs.reviewReason}>Reason: <strong>{reason}</strong>{notes.trim() ? ` — ${notes.trim()}` : ''}</div>
            </div>
            {data.wallet_total > 0 && (
              <div className={s.banner}><Wallet /><span>{data.name} has <strong>{formatCurrencyText(data.wallet_total)}</strong> in their wallet. It isn’t paid out by cancelling.</span></div>
            )}
            <label className={s.confirmCheck}>
              <input type="checkbox" checked={understood} onChange={e => setUnderstood(e.target.checked)} />
              <span>{data.needs_approval
                ? 'I understand an Admin or Manager will carry this out exactly as chosen once they approve it.'
                : 'I understand this can’t be undone from here. The member would have to join again.'}</span>
            </label>
          </div>
        ) : result ? (
          <div className={rs.dBody}>
            <div className={rs.doneBox}>
              <div className={rs.doneAmount} style={{ color: 'inherit', fontSize: '1.5rem' }}>{result.members.join(', ')}</div>
              <div className={rs.doneSub}>membership cancelled{result.refund_amount > 0 ? <> · refunded <Money value={result.refund_amount} /></> : ' without a refund'}</div>
              <div className={rs.doneMeta}>
                {result.dues_written_off > 0 && <span>Dues written off {formatCurrencyText(result.dues_written_off)}</span>}
                {result.expiry_dues_cancelled > 0 && <span>Renewal bill cancelled</span>}
                {result.bookings_cancelled > 0 && <span>{plural(result.bookings_cancelled, 'booking')} cancelled</span>}
                {result.addons_cancelled > 0 && <span>{plural(result.addons_cancelled, 'add-on')} cancelled</span>}
              </div>
            </div>
          </div>
        ) : null}

        <div className={rs.dFoot}>
          {!data || error ? (
            <Button variant="outline" onClick={close}>Close</Button>
          ) : step === 'warn' ? (
            <>
              {data.hold && !data.pending_request && <Button variant="outline" onClick={releaseHold} disabled={saving}>Withdraw cancellation</Button>}
              {data.pending_request && <Button variant="outline" onClick={withdrawRequest} disabled={saving}>Withdraw request</Button>}
              <span className={s.footSpacer} />
              <Button variant="outline" onClick={close}>Keep membership</Button>
              <Button onClick={() => setStep('review')} disabled={!data.can_cancel || !!data.pending_request} className={rs.confirmBtn}>
                Continue <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </>
          ) : step === 'review' ? (
            <>
              <Button variant="outline" onClick={() => setStep('warn')}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <span className={s.footSpacer} />
              {dues === 'COLLECT' ? (
                <Button onClick={collectNow}><HandCoins className="h-4 w-4 mr-2" /> Go to Pending Payments</Button>
              ) : dues === 'HOLD' ? (
                <Button onClick={putOnHold} disabled={saving || !reasonOk} className={rs.confirmBtn}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PauseCircle className="h-4 w-4 mr-2" />} Put on hold
                </Button>
              ) : (
                <>
                  <Button variant="outline" className={s.dangerOutline} onClick={() => { setUnderstood(false); setStep('confirm'); }}
                    disabled={!reasonOk || !duesReady || dues === 'DEDUCT'}
                    title={dues === 'DEDUCT' ? 'Dues taken from the refund need a refund' : undefined}>
                    <Ban className="h-4 w-4 mr-2" /> Cancel without refund
                  </Button>
                  <Button onClick={goRefund} disabled={!reasonOk || !duesReady || !data.can_refund}
                    title={!data.can_refund ? data.refund_blocked_reason ?? undefined : undefined}>
                    <Undo2 className="h-4 w-4 mr-2" /> Cancel with refund
                  </Button>
                </>
              )}
            </>
          ) : step === 'confirm' ? (
            <>
              <Button variant="outline" onClick={() => setStep('review')} disabled={saving}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
              <span className={s.footSpacer} />
              <Button onClick={cancelNow} disabled={saving || !understood} className={rs.confirmBtn}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
                {data.needs_approval ? 'Send for approval' : 'Cancel membership'}
              </Button>
            </>
          ) : (
            <Button onClick={close}>Done</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WarnStep({ data, family, upcoming, addons }: { data: CancellationPreview; family: boolean; upcoming: number; addons: number }) {
  const { formatCurrencyText } = useCurrency();
  return (
    <div className={rs.dBody}>
      <div className={s.warnHero}>
        <span className={s.warnIcon}><AlertTriangle /></span>
        <h3>Cancel {family ? `${data.name}’s family` : `${data.name}’s`} membership?</h3>
        <p>Cancelling ends the membership for good and removes the member from the gym. Their bills and history are kept for the accounts.</p>
      </div>

      {!data.can_cancel && <div className={s.banner} data-tone="red"><Ban /><span>{data.blocked_reason}</span></div>}

      {data.pending_request && (
        <div className={s.banner} data-tone="blue">
          <Hourglass />
          <span>
            <strong>Waiting for approval.</strong> {data.pending_request.requested_by || 'Staff'} asked to cancel
            {' '}{data.pending_request.with_refund ? `with a refund of ${formatCurrencyText(data.pending_request.refund_amount)}` : 'without a refund'}
            {data.pending_request.requested_at ? ` on ${fmtDate(data.pending_request.requested_at)}` : ''}. An Admin or Manager decides in Approvals › Cancellations.
          </span>
        </div>
      )}
      {!data.pending_request && data.needs_approval && data.can_cancel && (
        <div className={s.banner} data-tone="blue"><ShieldCheck /><span>The gym’s policy needs an Admin or Manager to approve cancellations. What you choose is sent to them; nothing changes until they approve.</span></div>
      )}

      {data.hold && (
        <div className={s.banner}>
          <PauseCircle />
          <span>
            <strong>Cancellation on hold</strong> since {fmtDate(data.hold.since)}{data.hold.by ? ` (by ${data.hold.by})` : ''} — waiting for dues to be cleared.
            {data.dues_total > 0
              ? <> Still owed: <strong>{formatCurrencyText(data.dues_total)}</strong>.</>
              : <> Nothing is owed any more — continue to finish the cancellation.</>}
          </span>
        </div>
      )}

      {family && (
        <div className={s.banner} data-tone="blue">
          <Users />
          <span>{data.name} is a family head. <strong>Everyone billed to them is cancelled too:</strong> {data.household.filter(p => !p.head).map(p => p.name).join(', ')}.</span>
        </div>
      )}
      {data.billed_to_head && (
        <div className={s.banner} data-tone="blue"><Users /><span>{data.name} is billed to {data.head_name || 'their family head'}. Only {data.name} is cancelled; the head’s bills stay as they are.</span></div>
      )}

      <div className={s.consequences}>
        <div className={s.consequence}><CalendarX2 /><div>Membership ends today<span>Status becomes Cancelled; it no longer appears in the active list.</span></div></div>
        <div className={s.consequence}><Ban /><div>No more entry<span>Check-in and face devices stop letting them in.</span></div></div>
        <div className={s.consequence}><CalendarClock /><div>{upcoming ? plural(upcoming, 'upcoming booking') : 'Upcoming bookings'} cancelled<span>Seats are released to the waitlist.</span></div></div>
        <div className={s.consequence}><Package /><div>{addons ? plural(addons, 'add-on') : 'Add-ons'} & PT packages cancelled<span>Anything still running stops today.</span></div></div>
        <div className={s.consequence}><Smartphone /><div>App shows “Cancelled”<span>Their GymBios account stays theirs — Community and gym search keep working, and they can still see their payments here.</span></div></div>
        <div className={s.consequence}><ReceiptText /><div>Dues first<span>{data.dues_total > 0 ? `${formatCurrencyText(data.dues_total)} is owed and must be settled.` : 'Nothing is owed.'}</span></div></div>
      </div>
    </div>
  );
}

function PersonCard({ p }: { p: CancelPerson }) {
  const pct = p.period_days > 0 ? Math.min(100, Math.round((p.days_used / p.period_days) * 100)) : 0;
  const status = p.suspended ? 'Suspended' : p.frozen ? 'Frozen' : p.status ? p.status.charAt(0).toUpperCase() + p.status.slice(1) : null;
  const liveAddons = p.addons.filter(a => !['cancelled', 'rejected'].includes((a.status || '').toLowerCase()));
  return (
    <div className={s.person}>
      <div className={s.personHead}>
        <MemberAvatar name={p.name} photo={p.photo_url} size={42} />
        <div className={s.personMain}>
          <div className={s.personName}>
            {p.name}
            {p.head && <span className={s.chip} data-tone="blue">Family head</span>}
            {status && <span className={s.chip} data-tone={p.suspended || p.frozen ? 'amber' : undefined}>{status}</span>}
          </div>
          <div className={s.personMeta}>
            {[p.member_id, p.plan, p.period_start || p.period_end ? `${fmtDate(p.period_start)} → ${fmtDate(p.period_end)}` : null].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
      <div className={s.stats}>
        <div className={s.stat}><span>Member for</span><strong>{duration(p.member_for_days)}</strong><em>since {fmtDate(p.join_date)}</em></div>
        <div className={s.stat}>
          <span>Subscribed</span><strong>{plural(p.period_days, 'day')}</strong>
          <em>{p.days_used} used · {p.days_left} left</em>
          <div className={s.progress}><span style={{ width: `${pct}%` }} /></div>
        </div>
        <div className={s.stat}><span>Checked in</span><strong>{plural(p.check_ins_this_period, 'day')}</strong><em>this period · {p.check_ins.toLocaleString()} all time</em></div>
        <div className={s.stat}><span>Last visit</span><strong>{p.last_check_in ? fmtDate(p.last_check_in) : 'Never'}</strong><em>{p.past_bookings ? `${plural(p.past_bookings, 'class', 'classes')} attended` : 'No classes attended'}</em></div>
      </div>
      <div className={s.lists}>
        <div className={s.list}>
          <div className={s.listHead}><Package className="inline h-3 w-3 mr-1" />Add-ons purchased · {p.addons.length}</div>
          {liveAddons.length === 0 && p.addons.length === 0 ? <div className={s.listEmpty}>None</div> : p.addons.slice(-5).reverse().map((a, i) => (
            <div key={i} className={s.listItem} data-dead={['cancelled', 'rejected', 'expired'].includes((a.status || '').toLowerCase())}>
              <span>{a.name || 'Add-on'}</span><span>{a.end ? `to ${fmtDate(a.end)}` : a.status}</span>
            </div>
          ))}
        </div>
        <div className={s.list}>
          <div className={s.listHead}><CalendarClock className="inline h-3 w-3 mr-1" />Booked classes · {p.upcoming_bookings.length} upcoming</div>
          {p.upcoming_bookings.length === 0 ? <div className={s.listEmpty}>Nothing booked</div> : p.upcoming_bookings.slice(0, 5).map(b => (
            <div key={b.id} className={s.listItem}>
              <span>{b.name || 'Session'}{b.paid ? ' · paid' : ''}</span><span>{fmtDate(b.date)}{b.start_time ? ` ${b.start_time.slice(0, 5)}` : ''}</span>
            </div>
          ))}
        </div>
        <div className={s.list}>
          <div className={s.listHead}><Dumbbell className="inline h-3 w-3 mr-1" />PT packages · {p.packages.length}</div>
          {p.packages.length === 0 ? <div className={s.listEmpty}>None</div> : p.packages.slice(0, 4).map((k, i) => (
            <div key={i} className={s.listItem} data-dead={(k.status || '') !== 'active'}>
              <span>{k.name || 'Package'}</span><span>{k.sessions_total ? `${k.sessions_used}/${k.sessions_total} used` : `to ${fmtDate(k.end_date)}`}</span>
            </div>
          ))}
          {p.wallet_balance > 0 && <div className={s.listItem}><span><Wallet className="inline h-3 w-3 mr-1" />Wallet</span><span><Money value={p.wallet_balance} /></span></div>}
        </div>
      </div>
    </div>
  );
}

function DuesOption({ on, icon, title, sub, onClick, disabled }: {
  on: boolean; icon: ReactNode; title: string; sub: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button type="button" className={s.option} data-on={on} onClick={onClick} disabled={disabled}>
      {icon}<span><b>{title}</b><small>{sub}</small></span>
    </button>
  );
}
