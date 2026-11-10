// Route: /approvals
// Reception/admin queue for mobile self-service purchases paid by Cash, Credit, or
// Mixed payment — these require staff to verify the cash was received (or the
// credit terms are acceptable) before the member gets app access. See
// MobileDiscoveryController.purchaseMembership on the backend for how a member
// lands in this state. Class/PT bookings paid the same way in the app wait here
// too (BookingPaymentService) — the seat is held until reception decides — and so do
// add-ons bought in the app (AddonPaymentService), which stay inactive until then.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { membersService, type Member } from '../utils/supabase/members-service';
import { bookingService, type BookingApi } from '../utils/supabase/booking-service';
import { addonsService, type MemberAddon } from '../utils/supabase/addons-service';
import { servicePortfolioService, type MembershipApplication } from '../utils/supabase/service-portfolio-service';
import { ApplicationsPanel } from '../components/approvals/ApplicationsPanel';
import { useCurrency } from '../utils/currency';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import {
  CalendarCheck,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  History,
  Hourglass,
  PackagePlus,
  RefreshCw,
  UserCheck,
  Wallet,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { styles, Kpi, Panel, SectionTabs, Status, fmtInt, fmtDate } from '../components/overview/overview-kit';
import q from '../components/approvals/approvals.module.css';

const PAGE_SIZE = 20;
/** Requests older than this are flagged so reception clears them first. */
const LATE_HOURS = 24;

type ActionType = 'approve' | 'reject';
type Tab = 'members' | 'bookings' | 'addons' | 'applications';

type ActionTarget =
  | { kind: 'member'; type: ActionType; member: Member }
  | { kind: 'booking'; type: ActionType; booking: BookingApi }
  | { kind: 'addon'; type: ActionType; addon: MemberAddon };

/** One queue card, whatever the request type. */
interface Request {
  key: string;
  name: string;
  sub?: string;
  photo?: string;
  what: string;
  whatSub?: string;
  method?: string | null;
  since?: string | null;
  /** Date-only values (a member's join date) have no meaningful time. */
  sinceIsDate?: boolean;
  total: number;
  received: number;
  walletPart?: number;
  discount?: string | null;
  onApprove: () => void;
  onReject: () => void;
}

const initials = (name?: string | null) =>
  (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?';

function ageOf(value?: string | null): { hours: number; text: string } | null {
  if (!value) return null;
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return null;
  const hours = Math.max(0, (Date.now() - t) / 36e5);
  const text = hours < 1 ? 'just now' : hours < 24 ? `${Math.floor(hours)}h ago` : `${Math.floor(hours / 24)}d ago`;
  return { hours, text };
}

const timeOf = (value?: string | null) => {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '';
};

export function Approvals() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const money = useCallback((n: number) => formatCurrency(n), [formatCurrency]);

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [bookingApprovals, setBookingApprovals] = useState<BookingApi[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  const [addonApprovals, setAddonApprovals] = useState<MemberAddon[]>([]);
  const [loadingAddons, setLoadingAddons] = useState(false);

  const [applications, setApplications] = useState<MembershipApplication[]>([]);
  const [loadingApplications, setLoadingApplications] = useState(false);

  // ?tab=applications comes from the "New membership application" notification.
  const [searchParams] = useSearchParams();
  const linkedTab = searchParams.get('tab') === 'applications' ? 'applications' : null;
  const [tab, setTab] = useState<Tab>(linkedTab ?? 'members');
  const tabChosen = useRef(!!linkedTab);

  const [actionDialog, setActionDialog] = useState<ActionTarget | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await membersService.getPendingApprovals({ page: currentPage, limit: PAGE_SIZE });
      setMembers(res.members);
      setTotalPages(res.pagination.totalPages || 1);
      setTotalItems(res.pagination.total || 0);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  const loadBookings = useCallback(async () => {
    setLoadingBookings(true);
    try {
      setBookingApprovals(await bookingService.getPendingPaymentApprovals());
    } catch (err: any) {
      toast.error(err.message || 'Failed to load booking payments');
    } finally {
      setLoadingBookings(false);
    }
  }, []);

  const loadAddons = useCallback(async () => {
    setLoadingAddons(true);
    try {
      setAddonApprovals(await addonsService.getPendingPaymentApprovals());
    } catch (err: any) {
      toast.error(err.message || 'Failed to load add-on payments');
    } finally {
      setLoadingAddons(false);
    }
  }, []);

  const loadApplications = useCallback(async () => {
    setLoadingApplications(true);
    try {
      setApplications(await servicePortfolioService.listApplications('pending'));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to load membership applications');
    } finally {
      setLoadingApplications(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    loadAddons();
  }, [loadAddons]);

  const anyLoading = loading || loadingBookings || loadingAddons || loadingApplications;

  // Open on the first queue that has something in it, until the user picks a tab.
  useEffect(() => {
    if (anyLoading || tabChosen.current) return;
    if (totalItems > 0) setTab('members');
    else if (applications.length > 0) setTab('applications');
    else if (bookingApprovals.length > 0) setTab('bookings');
    else if (addonApprovals.length > 0) setTab('addons');
  }, [anyLoading, totalItems, applications.length, bookingApprovals.length, addonApprovals.length]);

  const chooseTab = (t: Tab) => {
    tabChosen.current = true;
    setTab(t);
  };

  const refreshAll = () => {
    loadMembers();
    loadBookings();
    loadAddons();
    loadApplications();
  };

  const onApplicationsChanged = () => {
    loadApplications();
    window.dispatchEvent(new Event('approvals_updated'));
  };

  const openAction = (type: ActionType, member: Member) => {
    setActionDialog({ kind: 'member', type, member });
    setReason('');
  };

  const openBookingAction = (type: ActionType, booking: BookingApi) => {
    setActionDialog({ kind: 'booking', type, booking });
    setReason('');
  };

  const openAddonAction = (type: ActionType, addon: MemberAddon) => {
    setActionDialog({ kind: 'addon', type, addon });
    setReason('');
  };

  const confirmAction = async () => {
    if (!actionDialog) return;
    const { type } = actionDialog;
    if (type === 'reject' && !reason.trim()) {
      toast.error('A rejection reason is required');
      return;
    }
    setProcessing(true);
    try {
      if (actionDialog.kind === 'member') {
        const { member } = actionDialog;
        if (type === 'approve') {
          await membersService.approveMemberPayment(member.id);
          toast.success(`${member.name}'s payment approved — app access unlocked`);
        } else {
          await membersService.rejectMemberPayment(member.id, reason.trim());
          toast.success(`${member.name}'s payment rejected`);
        }
        setActionDialog(null);
        await loadMembers();
      } else if (actionDialog.kind === 'addon') {
        const { addon } = actionDialog;
        if (type === 'approve') {
          await addonsService.approvePayment(addon.id);
          toast.success(`${addon.member_name}'s ${addon.addon_name} is now active`);
        } else {
          await addonsService.rejectPayment(addon.id, reason.trim());
          toast.success(`${addon.member_name}'s add-on payment rejected`);
        }
        setActionDialog(null);
        await loadAddons();
      } else {
        const { booking } = actionDialog;
        if (type === 'approve') {
          await bookingService.approvePayment(booking.id);
          toast.success(`${booking.memberName}'s booking confirmed`);
        } else {
          await bookingService.rejectPayment(booking.id, reason.trim());
          toast.success(`${booking.memberName}'s booking payment rejected — the seat was released`);
        }
        setActionDialog(null);
        await loadBookings();
      }
      // Lets the sidebar clear its pending-approvals dot right away.
      window.dispatchEvent(new Event('approvals_updated'));
    } catch (err: any) {
      toast.error(err.message || `Failed to ${type} payment`);
    } finally {
      setProcessing(false);
    }
  };

  // ── Queue cards ──
  const memberRequests: Request[] = useMemo(() => members.map((m) => {
    const total = Number(m.membership_fee ?? 0);
    const owed = Number(m.outstanding_balance ?? 0);
    return {
      key: `m-${m.id}`,
      name: m.name,
      sub: m.member_id || m.phone || m.email,
      photo: m.photo_url,
      what: m.membership_plan || m.membership_type || 'Membership',
      whatSub: m.phone || m.email,
      method: m.payment_method_used,
      since: m.join_date,
      sinceIsDate: true,
      total,
      received: Math.max(0, total - owed),
      onApprove: () => openAction('approve', m),
      onReject: () => openAction('reject', m),
    };
  }), [members]);

  const bookingRequests: Request[] = useMemo(() => bookingApprovals.map((b) => ({
    key: `b-${b.id}`,
    name: b.memberName || b.guestName || '—',
    sub: b.guest ? 'Guest' : undefined,
    what: b.sessionName || 'Session',
    whatSub: [b.date ? fmtDate(b.date) : '', b.startTime ? b.startTime.slice(0, 5) : '', b.trainerName || ''].filter(Boolean).join(' · '),
    method: b.paymentMethod,
    since: b.createdAt,
    total: Number(b.price ?? 0),
    received: Number(b.paidAmount ?? 0),
    walletPart: Number(b.walletAmount ?? 0),
    discount: b.discountLabel,
    onApprove: () => openBookingAction('approve', b),
    onReject: () => openBookingAction('reject', b),
  })), [bookingApprovals]);

  const addonRequests: Request[] = useMemo(() => addonApprovals.map((a) => ({
    key: `a-${a.id}`,
    name: a.member_name || '—',
    sub: a.member_id,
    what: a.addon_name || 'Add-on',
    whatSub: [a.category, a.transaction_id].filter(Boolean).join(' · '),
    method: a.payment_mode,
    since: a.purchase_date || a.created_at,
    total: Number(a.amount ?? 0),
    received: Number(a.paid_amount ?? 0),
    walletPart: Number(a.wallet_amount ?? 0),
    discount: a.discount_label,
    onApprove: () => openAddonAction('approve', a),
    onReject: () => openAddonAction('reject', a),
  })), [addonApprovals]);

  const all = [...memberRequests, ...bookingRequests, ...addonRequests];
  const waiting = totalItems + bookingApprovals.length + addonApprovals.length + applications.length;
  const received = all.reduce((s, r) => s + r.received, 0);
  const owed = all.reduce((s, r) => s + Math.max(0, r.total - r.received), 0);
  const oldest = all.map(r => ageOf(r.since)).filter(Boolean).sort((a, b) => b!.hours - a!.hours)[0];
  const lateCount = all.filter(r => (ageOf(r.since)?.hours ?? 0) >= LATE_HOURS).length;
  const partialNote = totalPages > 1 ? ' (this page of memberships)' : '';

  const tabs: { id: Tab; label: string; icon: typeof UserCheck; count?: number }[] = [
    { id: 'members', label: 'Memberships', icon: UserCheck, count: totalItems },
    { id: 'applications', label: 'Applications', icon: FileText, count: applications.length },
    { id: 'bookings', label: 'Bookings', icon: CalendarCheck, count: bookingApprovals.length },
    { id: 'addons', label: 'Add-ons', icon: PackagePlus, count: addonApprovals.length },
  ];

  const dialogName = !actionDialog ? ''
    : actionDialog.kind === 'member' ? actionDialog.member.name
    : actionDialog.kind === 'addon' ? actionDialog.addon.member_name
    : actionDialog.booking.memberName;
  const dialogMethod = (!actionDialog ? undefined
    : actionDialog.kind === 'member' ? actionDialog.member.payment_method_used
    : actionDialog.kind === 'addon' ? actionDialog.addon.payment_mode
    : actionDialog.booking.paymentMethod)?.toLowerCase() || 'payment';
  const dialogRequest = !actionDialog ? undefined
    : all.find(r => r.key === (actionDialog.kind === 'member' ? `m-${actionDialog.member.id}`
      : actionDialog.kind === 'addon' ? `a-${actionDialog.addon.id}` : `b-${actionDialog.booking.id}`));

  const renderQueue = (rows: Request[], busy: boolean, emptyTitle: string, emptyText: string) => {
    if (busy && rows.length === 0) {
      return <div className={styles.centered} style={{ minHeight: 160 }}><RefreshCw className="h-5 w-5 animate-spin text-primary" />Loading…</div>;
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
      <div className={`${q.queue} ${busy ? styles.loadingVeil : ''}`}>
        {rows.map((r) => {
          const age = ageOf(r.since);
          const late = (age?.hours ?? 0) >= LATE_HOURS;
          const due = Math.max(0, r.total - r.received);
          return (
            <div key={r.key} className={q.item} data-late={late}>
              <span className={q.avatar}>{r.photo ? <img src={r.photo} alt="" /> : initials(r.name)}</span>
              <div className={q.who}>
                <span className={q.name}>{r.name}{r.sub && <span className={styles.muted} style={{ fontWeight: 400 }}> · {r.sub}</span>}</span>
                <span className={q.what}>{r.what}</span>
                <span className={q.meta}>
                  {r.whatSub && <span>{r.whatSub}</span>}
                  <Status kind="info"><Wallet size={11} />{r.method || 'Unknown method'}</Status>
                  {age && (
                    <span title={r.sinceIsDate ? fmtDate(r.since) : `${fmtDate(r.since)} ${timeOf(r.since)}`}>
                      {late ? <Status kind="warning"><Hourglass size={11} />waiting {age.text.replace(' ago', '')}</Status>
                        : <><Clock size={12} />{r.sinceIsDate ? fmtDate(r.since) : age.text}</>}
                    </span>
                  )}
                </span>
              </div>
              <div className={q.money}>
                <div className={q.moneyCell}>
                  <span className={q.moneyLabel}>Amount</span>
                  <span className={q.moneyValue}>{money(r.total)}</span>
                  {r.discount && <span className={q.moneySub}>{r.discount}</span>}
                </div>
                <div className={q.moneyCell}>
                  <span className={q.moneyLabel}>Received</span>
                  <span className={q.moneyValue} data-tone={r.total > 0 && due === 0 ? 'good' : undefined}>{money(r.received)}</span>
                  {r.walletPart ? <span className={q.moneySub}>incl. {money(r.walletPart)} wallet</span> : null}
                </div>
                <div className={q.moneyCell}>
                  <span className={q.moneyLabel}>On credit</span>
                  <span className={q.moneyValue} data-tone={due > 0 ? 'bad' : undefined}>{money(due)}</span>
                </div>
              </div>
              <div className={q.actions}>
                <Button size="sm" variant="outline" className={q.reject} onClick={r.onReject}>
                  <XCircle className="mr-1.5 h-4 w-4" /> Reject
                </Button>
                <Button size="sm" className={q.approve} onClick={r.onApprove}>
                  <CheckCircle className="mr-1.5 h-4 w-4" /> Approve
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Approvals</h1>
          <div className={styles.subtitle}>
            App purchases paid by Cash, Credit or Mixed payment, and membership applications from your share link, wait here until staff approve them
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={anyLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${anyLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/approval-history')}>
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
        </div>
      </div>

      <div className={styles.kpis}>
        <Kpi icon={Hourglass} tone={waiting ? 'amber' : 'green'} label="Waiting now" value={fmtInt(waiting)}
          hint={waiting ? (oldest ? `oldest ${oldest.text}${lateCount ? ` · ${lateCount} over a day` : ''}` : 'requests to review') : 'all caught up'} />
        <Kpi icon={UserCheck} tone="blue" label="Memberships" value={fmtInt(totalItems)} hint="app access locked until approved" onClick={() => chooseTab('members')} />
        <Kpi icon={FileText} tone="blue" label="Applications" value={fmtInt(applications.length)} hint={`${fmtInt(applications.filter(a => a.payment_status === 'PAID').length)} paid online · from your share link`} onClick={() => chooseTab('applications')} />
        <Kpi icon={CalendarCheck} tone="violet" label="Bookings" value={fmtInt(bookingApprovals.length)} hint="seats held until approved" onClick={() => chooseTab('bookings')} />
        <Kpi icon={PackagePlus} tone="teal" label="Add-ons" value={fmtInt(addonApprovals.length)} hint="inactive until approved" onClick={() => chooseTab('addons')} />
        <Kpi icon={Wallet} tone="green" label="Received, to confirm" value={money(received)} hint={`cash and payments to verify${partialNote}`} />
        <Kpi icon={CreditCard} tone={owed > 0 ? 'red' : 'orange'} label="On credit" value={money(owed)} hint={`still to be paid${partialNote}`} />
      </div>

      <SectionTabs tabs={tabs} value={tab} onChange={chooseTab} label="Approval queues" />

      {tab === 'members' && (
        <Panel title="Membership purchases" icon={UserCheck} sub="Approving unlocks the member's app access and posts the payment to the books">
          {renderQueue(memberRequests, loading, 'No memberships waiting', 'New app purchases paid by Cash, Credit or Mixed payment will appear here.')}
          {totalPages > 1 && (
            <div className={q.pager}>
              <span>Showing {((currentPage - 1) * PAGE_SIZE) + 1}–{Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} pending</span>
              <div className={q.pagerBtns}>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span>Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </Panel>
      )}

      {tab === 'applications' && (
        <ApplicationsPanel applications={applications} loading={loadingApplications} onChanged={onApplicationsChanged} money={money} />
      )}

      {tab === 'bookings' && (
        <Panel title="Class & PT bookings" icon={CalendarCheck} sub="The seat is held until you decide; rejecting releases it and returns any wallet amount">
          {renderQueue(bookingRequests, loadingBookings, 'No bookings waiting', 'Bookings paid by Cash, Credit or Mixed payment in the app will appear here.')}
        </Panel>
      )}

      {tab === 'addons' && (
        <Panel title="Add-on purchases" icon={PackagePlus} sub="The add-on starts from the day you approve it">
          {renderQueue(addonRequests, loadingAddons, 'No add-ons waiting', 'Add-ons bought in the app with Cash, Credit or Mixed payment will appear here.')}
        </Panel>
      )}

      {/* Approve / Reject confirmation dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(open) => { if (!open) setActionDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{actionDialog?.type === 'approve' ? 'Approve' : 'Reject'} Payment</DialogTitle>
            <DialogDescription>
              {actionDialog && (
                <>
                  {actionDialog.kind === 'member'
                    ? (actionDialog.type === 'approve'
                        ? <>Confirm that <strong>{dialogName}</strong>'s {dialogMethod} was received. This unlocks their app access.</>
                        : <>Reject <strong>{dialogName}</strong>'s payment. Their membership will be marked inactive and app access stays locked.</>)
                    : actionDialog.kind === 'addon'
                    ? (actionDialog.type === 'approve'
                        ? <>Confirm that <strong>{dialogName}</strong>'s {dialogMethod} for <strong>{actionDialog.addon.addon_name}</strong> was received. The add-on becomes active from today.</>
                        : <>Reject <strong>{dialogName}</strong>'s payment for <strong>{actionDialog.addon.addon_name}</strong>. The add-on won't start, and any wallet amount is returned.</>)
                    : (actionDialog.type === 'approve'
                        ? <>Confirm that <strong>{dialogName}</strong>'s {dialogMethod} for <strong>{actionDialog.booking.sessionName}</strong> was received. Their seat is confirmed.</>
                        : <>Reject <strong>{dialogName}</strong>'s payment for <strong>{actionDialog.booking.sessionName}</strong>. The booking is cancelled, the seat released, and any wallet amount or Reward Pass returned.</>)}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {dialogRequest && (
            <dl className={q.summary}>
              <div><dt>For</dt><dd>{dialogRequest.what}</dd></div>
              <div><dt>Paid by</dt><dd>{dialogRequest.method || '—'}</dd></div>
              <div><dt>Received</dt><dd>{money(dialogRequest.received)}</dd></div>
              <div><dt>On credit</dt><dd style={{ color: dialogRequest.total > dialogRequest.received ? 'var(--status-critical, #d03b3b)' : undefined }}>{money(Math.max(0, dialogRequest.total - dialogRequest.received))}</dd></div>
            </dl>
          )}
          {/* Approvals take no note (the server doesn't store one); a rejection needs its reason. */}
          {actionDialog?.type === 'reject' && (
            <div className="space-y-2">
              <Label htmlFor="action-reason">Reason (required)</Label>
              <Textarea
                id="action-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this payment being rejected?"
                rows={3}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)} disabled={processing}>
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={processing}
              className={actionDialog?.type === 'reject' ? q.rejectSolid : q.approve}
            >
              {processing ? 'Processing...' : `Confirm ${actionDialog?.type === 'approve' ? 'Approval' : 'Rejection'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
