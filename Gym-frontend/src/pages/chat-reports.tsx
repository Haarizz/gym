import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  Ban, CheckCircle2, ChevronLeft, ChevronRight, EyeOff, Flag, Layers, Lock, MessageSquare, ShieldAlert,
  ShieldCheck, Trash2, XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useBranch } from '../utils/branch-context';
import {
  conversationReportsService, ConversationReport, MAX_RESOLUTION_NOTE_LENGTH, REPORT_REASON_LABELS,
  ReportMessage, ReportPage, ReportResolution, ReportStatus,
} from '../utils/supabase/conversation-reports-service';
import s from './enquiries.module.css';
import c from './chat-reports.module.css';

const PAGE_SIZE = 20;

const formatDateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '');
const timeAgo = (iso: string | null | undefined) => (iso ? formatDistanceToNowStrict(new Date(iso), { addSuffix: true }) : '');

const STATUS: Record<ReportStatus, { label: string; tone: string }> = {
  OPEN: { label: 'Needs review', tone: 'red' },
  ACTIONED: { label: 'Action taken', tone: 'amber' },
  DISMISSED: { label: 'Dismissed', tone: 'gray' },
};

const RESOLUTION_LABELS: Record<ReportResolution, string> = {
  DISMISS: 'Dismissed',
  BLOCK_CONVERSATION: 'Conversation closed',
  BAN_MEMBER: 'Member banned from chat',
};

type StatusTab = 'ALL' | ReportStatus;

const TILES: { key: StatusTab; label: string; tone: string; icon: React.ReactNode }[] = [
  { key: 'OPEN', label: 'Needs review', tone: 'red', icon: <ShieldAlert /> },
  { key: 'ACTIONED', label: 'Action taken', tone: 'amber', icon: <ShieldCheck /> },
  { key: 'DISMISSED', label: 'Dismissed', tone: 'gray', icon: <XCircle /> },
  { key: 'ALL', label: 'All reports', tone: 'teal', icon: <Layers /> },
];

const EMPTY_TEXT: Record<StatusTab, [string, string]> = {
  OPEN: ['All caught up', 'No chat reports are waiting for review.'],
  ACTIONED: ['Nothing actioned yet', 'Reports where you closed a chat or banned a member show up here.'],
  DISMISSED: ['No dismissed reports', 'Reports you dismiss show up here.'],
  ALL: ['No chat reports yet', 'When a member or staff member reports a chat message in the mobile app, it shows up here.'],
};

/** What each resolve action does, for its confirmation dialog. */
const ACTIONS: Record<ReportResolution, { title: string; text: string; confirm: string }> = {
  DISMISS: {
    title: 'Dismiss this report?',
    text: 'Nothing changes for the member or the staff member. The report moves to Dismissed.',
    confirm: 'Dismiss report',
  },
  BLOCK_CONVERSATION: {
    title: 'Close this conversation for good?',
    text: "Neither side can send messages in it again. They can still read it. This can't be undone.",
    confirm: 'Close conversation',
  },
  BAN_MEMBER: {
    title: 'Ban this member from chat?',
    text: "They won't be able to send messages to anyone at this gym. You can lift the ban later from this page.",
    confirm: 'Ban from chat',
  },
};

function initials(name: string | null | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map(p => p[0]).join('').toUpperCase() : '?';
}

function memberName(r: ConversationReport) {
  return r.member_name ?? `Member #${r.member_id}`;
}

function reporterLine(r: ConversationReport) {
  const who = r.reported_by_name ?? (r.reported_by_type === 'MEMBER' ? 'The member' : 'A staff member');
  return `${who} (${r.reported_by_type === 'MEMBER' ? 'member' : 'staff'})`;
}

function StatusPill({ status }: { status: ReportStatus }) {
  const st = STATUS[status] ?? STATUS.OPEN;
  return <span className={s.status} data-tone={st.tone}>{st.label}</span>;
}

/** Laptop and wider: list and report side by side; smaller screens open a sheet. */
function useWide() {
  const query = '(min-width: 1024px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setWide(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return wide;
}

/**
 * Reported member ↔ staff chat messages from the mobile app, for gym owners only.
 * A report is the only way to see a conversation: it opens the whole conversation up
 * to the moment it was filed. From here the owner dismisses it, closes that
 * conversation for good, or bans the member from chat.
 */
export function ChatReports() {
  const { activeBranchId, isAllBranches } = useBranch();
  const wide = useWide();
  const [tab, setTab] = useState<StatusTab>('OPEN');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<ReportPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(null);
    conversationReportsService.list({ status: tab === 'ALL' ? null : tab, page, size: PAGE_SIZE })
      .then(setData)
      .catch(e => setError(e.message));
  }, [tab, page, activeBranchId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [tab, activeBranchId]);

  // Side by side, keep something open: the first report, unless the selected one is still listed.
  useEffect(() => {
    if (!wide || !data) return;
    if (selectedId == null || !data.items.some(r => r.id === selectedId)) setSelectedId(data.items[0]?.id ?? null);
  }, [wide, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = data?.status_counts;
  const allCount = counts ? (counts.OPEN ?? 0) + (counts.ACTIONED ?? 0) + (counts.DISMISSED ?? 0) : null;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const [emptyTitle, emptyText] = EMPTY_TEXT[tab];
  const selectedSummary = data?.items.find(r => r.id === selectedId) ?? null;

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Chat reports</h1>
          <p className={s.subtitle}>
            Messages members and staff reported in the mobile app's chat. You only see a conversation once something in it is reported.
            {isAllBranches ? ' Showing every branch.' : ''}
          </p>
        </div>
      </div>

      <div className={s.tiles} role="tablist" aria-label="Report status">
        {TILES.map(t => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            className={s.tile}
            data-tone={t.tone}
            data-active={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            <span className={s.tileIcon}>{t.icon}</span>
            <span>
              <div className={s.tileValue}>
                {counts ? (t.key === 'ALL' ? allCount : counts[t.key as ReportStatus] ?? 0) : '—'}
              </div>
              <div className={s.tileLabel}>{t.label}</div>
            </span>
          </button>
        ))}
      </div>

      <div className={s.inbox} data-single={!wide}>
        <div className={s.list}>
          <div className={s.listHead}>
            <span>{data ? `${data.total} ${data.total === 1 ? 'report' : 'reports'}` : 'Loading…'}</span>
          </div>
          {error ? (
            <p className={s.error}>{error}</p>
          ) : data === null ? (
            <div className={s.state}><Flag /><span>Loading reports…</span></div>
          ) : data.items.length === 0 ? (
            <div className={s.state}>
              {tab === 'OPEN' ? <CheckCircle2 /> : <Flag />}
              <span className={s.stateTitle}>{emptyTitle}</span>
              <span>{emptyText}</span>
            </div>
          ) : (
            <div className={s.items}>
              {data.items.map(r => (
                <button
                  key={r.id}
                  type="button"
                  className={s.item}
                  data-selected={wide && selectedId === r.id}
                  data-open={r.status === 'OPEN'}
                  onClick={() => setSelectedId(r.id)}
                >
                  <span className={`${s.avatar}`} data-tone={STATUS[r.status]?.tone ?? 'red'}>{initials(r.member_name)}</span>
                  <span className={s.itemBody}>
                    <span className={s.itemTop}>
                      <span className={s.itemName}>{memberName(r)} ↔ {r.staff_name ?? 'Staff'}</span>
                      <span className={s.itemTime} title={formatDateTime(r.created_at)}>{timeAgo(r.created_at)}</span>
                    </span>
                    <div className={s.itemSubject}>{REPORT_REASON_LABELS[r.reason] ?? r.reason}</div>
                    <div className={s.itemPreview}>
                      {r.reported_message?.body ?? (r.reported_message?.deleted ? 'Deleted message' : '')}
                    </div>
                    <span className={s.itemMeta}>
                      <StatusPill status={r.status} />
                      <span className={s.tag}>By {r.reported_by_type === 'MEMBER' ? 'member' : 'staff'}</span>
                      {isAllBranches && r.branch_name && <span className={s.tag}>{r.branch_name}</span>}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
          {data && data.total > PAGE_SIZE && (
            <div className={s.pager}>
              <span>Page {page + 1} of {totalPages}</span>
              <div className={s.pagerButtons}>
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)} aria-label="Previous page">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)} aria-label="Next page">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {wide && (
          selectedId != null
            ? <ReportDetail key={selectedId} reportId={selectedId} onChanged={load} />
            : <div className={s.state}><MessageSquare /><span>Select a report to read the conversation.</span></div>
        )}
      </div>

      {!wide && selectedId != null && (
        <Sheet open onOpenChange={open => { if (!open) setSelectedId(null); }}>
          <SheetContent className="sm:max-w-lg w-full overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Chat report</SheetTitle>
              <SheetDescription>{selectedSummary ? memberName(selectedSummary) : ''}</SheetDescription>
            </SheetHeader>
            <div className={s.sheetDetail}>
              <ReportDetail key={selectedId} reportId={selectedId} onChanged={load} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function ReportDetail({ reportId, onChanged }: { reportId: number; onChanged: () => void }) {
  const [report, setReport] = useState<ConversationReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<ReportResolution | null>(null);
  const [note, setNote] = useState('');
  const [confirmLiftBan, setConfirmLiftBan] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    conversationReportsService.get(reportId)
      .then(r => { if (!cancelled) setReport(r); })
      .catch(e => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [reportId]);

  if (error) return <p className={s.error}>{error}</p>;
  if (!report) return <div className={s.state}><MessageSquare /><span>Loading the conversation…</span></div>;

  const openAction = (a: ReportResolution) => {
    setNote('');
    setAction(a);
  };

  const resolve = async () => {
    if (!action) return;
    setBusy(true);
    try {
      const updated = await conversationReportsService.resolve(report.id, action, note);
      setReport(updated);
      toast.success(RESOLUTION_LABELS[action]);
      onChanged();
    } catch (e: any) {
      toast.error(e.message || 'Could not resolve the report');
    } finally {
      setBusy(false);
      setAction(null);
    }
  };

  const liftBan = async () => {
    setBusy(true);
    try {
      await conversationReportsService.liftChatBan(report.member_id);
      setReport({ ...report, member_chat_banned: false });
      toast.success('Chat ban lifted. The member can send messages again.');
      onChanged();
    } catch (e: any) {
      toast.error(e.message || 'Could not lift the chat ban');
    } finally {
      setBusy(false);
      setConfirmLiftBan(false);
    }
  };

  const transcript = report.transcript ?? [];

  return (
    <div className={s.detail}>
      <div className={s.detailHead}>
        <span className={s.avatar} data-size="lg" data-tone={STATUS[report.status]?.tone ?? 'red'}>{initials(report.member_name)}</span>
        <div className={s.detailWho}>
          <h2 className={s.detailSubject}>{memberName(report)} ↔ {report.staff_name ?? 'Staff'}</h2>
          <div className={s.detailMember}>
            <span>{report.member_code ? `Member ${report.member_code}` : `Member #${report.member_id}`}</span>
            {report.branch_name && <span>· {report.branch_name}</span>}
          </div>
          <div className={s.detailTags}>
            <StatusPill status={report.status} />
            <span className={s.tag}>{REPORT_REASON_LABELS[report.reason] ?? report.reason}</span>
            {report.conversation_blocked && <span className={s.tag}><Lock className="inline h-3 w-3 mr-1" />Conversation closed</span>}
            {report.member_chat_banned && <span className={s.tag}><Ban className="inline h-3 w-3 mr-1" />Banned from chat</span>}
          </div>
        </div>
      </div>

      <div className={c.report}>
        <span className={c.reportTitle}><Flag /> Reported by {reporterLine(report)}</span>
        <span className={c.reportMeta} title={formatDateTime(report.created_at)}>
          {REPORT_REASON_LABELS[report.reason] ?? report.reason} · {timeAgo(report.created_at)}
        </span>
        {report.details && <span className={c.reportDetails}>{report.details}</span>}
      </div>

      <p className={c.privacy}>
        <EyeOff /> The conversation up to the moment of the report. Later messages stay private.
      </p>

      <div className={s.thread}>
        {transcript.length === 0 && <span className={s.notice}>No messages to show.</span>}
        {transcript.map(m => (
          <TranscriptMessage key={m.id} message={m} reported={m.id === report.reported_message?.id} />
        ))}
      </div>

      <div className={s.composer}>
        {report.status === 'OPEN' ? (
          <>
            <p className={s.hint}>What should happen? You can add a note for the record with each choice.</p>
            <div className={s.actions}>
              <Button variant="outline" disabled={busy} onClick={() => openAction('DISMISS')}>
                <XCircle className="h-4 w-4 mr-2" /> Dismiss
              </Button>
              <Button variant="outline" disabled={busy || report.conversation_blocked} onClick={() => openAction('BLOCK_CONVERSATION')}>
                <Lock className="h-4 w-4 mr-2" /> Close conversation
              </Button>
              <Button variant="destructive" disabled={busy || report.member_chat_banned} onClick={() => openAction('BAN_MEMBER')}>
                <Ban className="h-4 w-4 mr-2" /> Ban member from chat
              </Button>
            </div>
          </>
        ) : (
          <div className={c.resolution}>
            <span>
              <strong>{report.resolution ? RESOLUTION_LABELS[report.resolution] : STATUS[report.status].label}</strong>
              {report.resolved_by ? ` by ${report.resolved_by}` : ''}
              {report.resolved_at ? <span title={formatDateTime(report.resolved_at)}> · {timeAgo(report.resolved_at)}</span> : null}
            </span>
            {report.resolution_note && <span className={c.resolutionNote}>{report.resolution_note}</span>}
          </div>
        )}
        {report.member_chat_banned && (
          <div className={s.actions}>
            <Button variant="outline" disabled={busy} onClick={() => setConfirmLiftBan(true)}>
              <ShieldCheck className="h-4 w-4 mr-2" /> Lift chat ban
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={action !== null} onOpenChange={open => { if (!open && !busy) setAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{action ? ACTIONS[action].title : ''}</AlertDialogTitle>
            <AlertDialogDescription>{action ? ACTIONS[action].text : ''}</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            className={c.dialogNote}
            value={note}
            onChange={e => setNote(e.target.value.slice(0, MAX_RESOLUTION_NOTE_LENGTH))}
            placeholder="Note (optional, only admins see it)"
            rows={3}
            disabled={busy}
          />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); resolve(); }}>
              {busy ? 'Saving…' : action ? ACTIONS[action].confirm : ''}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLiftBan} onOpenChange={open => { if (!open && !busy) setConfirmLiftBan(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lift {memberName(report)}'s chat ban?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll be able to message staff and the front desk again. Closed conversations stay closed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); liftBan(); }}>Lift ban</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Member messages on the left, staff on the right, like the enquiry thread. */
function TranscriptMessage({ message: m, reported }: { message: ReportMessage; reported: boolean }) {
  const from = m.sender_type === 'MEMBER' ? 'member' : 'staff';
  return (
    <div className={s.msg} data-from={from}>
      <span className={s.msgMeta} title={formatDateTime(m.created_at)}>
        {m.sender_name ?? (from === 'member' ? 'Member' : 'Staff')} · {formatDateTime(m.created_at)}
      </span>
      <div className={`${s.bubble} ${m.deleted ? c.deleted : ''} ${reported ? c.reportedBubble : ''}`}>
        {m.body ?? ''}
      </div>
      {m.deleted && (
        <span className={c.flagLine}><Trash2 /> Deleted by the sender. Hidden from both sides.</span>
      )}
      {m.masked && m.original_body && (
        <>
          <span className={c.flagLine}><EyeOff /> Contact details were hidden. What they typed:</span>
          <div className={c.original}>{m.original_body}</div>
        </>
      )}
      {reported && <span className={c.reportedTag}>Reported message</span>}
    </div>
  );
}
