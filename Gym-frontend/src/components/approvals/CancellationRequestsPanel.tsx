import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle, Clock, UserX, Wallet, XCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Panel, Status, fmtDate, styles } from '../overview/overview-kit';
import { apiErrorMessage } from '../../utils/supabase/payment-terms-service';
import { cancellationService, type CancelRequestRow } from '../../utils/supabase/cancellation-service';
import q from './approvals.module.css';

const initials = (name?: string | null) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('');

const DUES_LABEL: Record<string, string> = { WRITE_OFF: 'written off', DEDUCT: 'taken from the refund' };

/**
 * Approvals › Cancellations: membership cancellations sent for approval because GymOS ›
 * Member Deactivation Policy › Approval Required is on. Approving carries out exactly what
 * the staff member chose (MembershipCancellationService.approve); only Admins and Managers
 * can decide — everyone else sees the queue read-only.
 */
export function CancellationRequestsPanel({ rows, loading, canApprove, onChanged, money }: {
  rows: CancelRequestRow[];
  loading: boolean;
  canApprove: boolean;
  onChanged: () => void;
  money: (n: number) => string;
}) {
  const [action, setAction] = useState<{ type: 'approve' | 'reject'; row: CancelRequestRow } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!action) return;
    setBusy(true);
    try {
      if (action.type === 'approve') {
        const r = await cancellationService.approve(action.row.id);
        toast.success(`Membership cancelled — ${r.members.join(', ')}`, {
          description: r.refund_amount > 0 ? `${money(r.net_paid_out)} paid out by ${action.row.refund_method}` : 'No refund',
        });
      } else {
        await cancellationService.reject(action.row.id, note.trim());
        toast.success('Cancellation rejected', { description: `${action.row.member_name} stays a member.` });
      }
      setAction(null);
      setNote('');
      onChanged();
    } catch (e) {
      toast.error(apiErrorMessage(e, action.type === 'approve' ? 'The cancellation could not be carried out' : 'Could not reject'));
    } finally { setBusy(false); }
  };

  return (
    <Panel title="Membership cancellations" icon={UserX}
      sub={canApprove ? 'Approving cancels the membership exactly as requested, including any refund'
        : 'Only an Admin or Manager can approve or reject these'}>
      {loading && rows.length === 0 ? (
        <div className={styles.muted} style={{ padding: '1.5rem', textAlign: 'center' }}>Loading…</div>
      ) : rows.length === 0 ? (
        <div className={styles.muted} style={{ padding: '1.5rem', textAlign: 'center' }}>
          <strong>No cancellations waiting.</strong><br />
          With “Approval Required” on in GymOS › Member Deactivation Policy, cancellations by front-desk staff appear here.
        </div>
      ) : (
        <div className={q.queue}>
          {rows.map(r => (
            <div key={r.id} className={q.item}>
              <span className={q.avatar}>{r.photo_url ? <img src={r.photo_url} alt="" /> : initials(r.member_name)}</span>
              <div className={q.who}>
                <span className={q.name}>{r.member_name}
                  <span className={styles.muted} style={{ fontWeight: 400 }}>
                    {r.member_code ? ` · ${r.member_code}` : ''}{r.household_size > 1 ? ` · household of ${r.household_size}` : ''}
                  </span>
                </span>
                <span className={q.what}>{r.reason || 'No reason'}{r.notes ? ` — ${r.notes}` : ''}</span>
                <span className={q.meta}>
                  {r.plan && <span>{r.plan}</span>}
                  <span><Clock size={12} />asked by {r.requested_by || 'staff'} · {fmtDate(r.requested_at || '')}</span>
                  {r.dues_action && r.dues_amount > 0 && <Status kind="warning">Dues {money(r.dues_amount)} {DUES_LABEL[r.dues_action] ?? r.dues_action}</Status>}
                </span>
              </div>
              <div className={q.money}>
                <div className={q.moneyCell}>
                  <span className={q.moneyLabel}>Refund</span>
                  <span className={q.moneyValue} data-tone={r.with_refund ? 'bad' : undefined}>{r.with_refund ? money(r.refund_amount) : 'None'}</span>
                  {r.with_refund && r.refund_method && <span className={q.moneySub}><Wallet size={11} /> {r.refund_method}</span>}
                </div>
                <div className={q.moneyCell}>
                  <span className={q.moneyLabel}>Policy allows</span>
                  <span className={q.moneyValue}>{r.with_refund ? money(r.policy_amount) : '—'}</span>
                </div>
                <div className={q.moneyCell}>
                  <span className={q.moneyLabel}>Paid out</span>
                  <span className={q.moneyValue}>{r.with_refund ? money(Math.max(0, r.refund_amount - (r.dues_action === 'DEDUCT' ? r.dues_amount : 0))) : '—'}</span>
                </div>
              </div>
              <div className={q.actions}>
                <Button size="sm" variant="outline" className={q.reject} disabled={!canApprove} onClick={() => setAction({ type: 'reject', row: r })}>
                  <XCircle className="mr-1.5 h-4 w-4" /> Reject
                </Button>
                <Button size="sm" className={q.approve} disabled={!canApprove} onClick={() => setAction({ type: 'approve', row: r })}>
                  <CheckCircle className="mr-1.5 h-4 w-4" /> Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!action} onOpenChange={o => { if (!o && !busy) { setAction(null); setNote(''); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{action?.type === 'approve' ? 'Approve cancellation' : 'Reject cancellation'}</DialogTitle>
            <DialogDescription>
              {action && (action.type === 'approve'
                ? <><strong>{action.row.member_name}</strong>{action.row.household_size > 1 ? ' and their family' : ''} will be cancelled today
                  {action.row.with_refund ? <> and <strong>{money(action.row.refund_amount)}</strong> refunded by {action.row.refund_method}</> : ' without a refund'}.
                  Bookings, add-ons and PT packages are cancelled and check-in stops. This can’t be undone from here.</>
                : <><strong>{action.row.member_name}</strong> stays a member; nothing changes. Say why so {action.row.requested_by || 'the requester'} knows.</>)}
            </DialogDescription>
          </DialogHeader>
          {action?.type === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="cancel-reject-note">Reason (required)</Label>
              <Textarea id="cancel-reject-note" rows={3} value={note} onChange={e => setNote(e.target.value)}
                placeholder="Why is this cancellation not going ahead?" />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAction(null); setNote(''); }} disabled={busy}>Back</Button>
            <Button onClick={confirm} disabled={busy || (action?.type === 'reject' && !note.trim())}
              className={action?.type === 'reject' ? q.rejectSolid : q.approve}>
              {busy ? 'Working…' : action?.type === 'approve' ? 'Approve & cancel' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}
