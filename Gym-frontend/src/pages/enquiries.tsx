import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import {
  CheckCircle2, ChevronLeft, ChevronRight, Inbox, Layers, MailOpen, MessageSquare, Phone, Send, XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { useBranch } from '../utils/branch-context';
import { hasPermission } from '../utils/permissions';
import {
  enquiriesService, ENQUIRY_CATEGORY_LABELS, EnquiryPage, EnquiryStatus, MemberEnquiry,
} from '../utils/supabase/enquiries-service';
import s from './enquiries.module.css';

const PAGE_SIZE = 20;
const MAX_REPLY_LENGTH = 2000;

const formatDateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '');
const timeAgo = (iso: string | null | undefined) => (iso ? formatDistanceToNowStrict(new Date(iso), { addSuffix: true }) : '');

const STATUS: Record<EnquiryStatus, { label: string; tone: string }> = {
  OPEN: { label: 'Awaiting reply', tone: 'amber' },
  REPLIED: { label: 'Replied', tone: 'green' },
  CLOSED: { label: 'Closed', tone: 'gray' },
};

type StatusTab = 'ALL' | EnquiryStatus;

const TILES: { key: StatusTab; label: string; tone: string; icon: React.ReactNode }[] = [
  { key: 'OPEN', label: 'Awaiting reply', tone: 'amber', icon: <MailOpen /> },
  { key: 'REPLIED', label: 'Replied', tone: 'green', icon: <CheckCircle2 /> },
  { key: 'CLOSED', label: 'Closed', tone: 'gray', icon: <XCircle /> },
  { key: 'ALL', label: 'All enquiries', tone: 'teal', icon: <Layers /> },
];

const EMPTY_TEXT: Record<StatusTab, [string, string]> = {
  OPEN: ['All caught up', 'No enquiries are waiting for a reply.'],
  REPLIED: ['Nothing replied yet', 'Enquiries you answer show up here.'],
  CLOSED: ['No closed enquiries', 'Closed enquiries show up here.'],
  ALL: ['No enquiries yet', 'Questions members raise in the mobile app show up here.'],
};

function initials(name: string | null | undefined) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map(p => p[0]).join('').toUpperCase() : '?';
}

function memberName(e: MemberEnquiry) {
  return e.member_name ?? `Member #${e.member_id}`;
}

function StatusPill({ status }: { status: EnquiryStatus }) {
  const st = STATUS[status] ?? STATUS.OPEN;
  return <span className={s.status} data-tone={st.tone}>{st.label}</span>;
}

/** Laptop and wider: list and conversation side by side; smaller screens open a sheet. */
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
 * Members' enquiries from the mobile app (Profile → Raise Enquiry). One reply each;
 * only staff close them. "All branches" lists every branch's enquiries read-only.
 */
export function Enquiries() {
  const { activeBranchId, isAllBranches } = useBranch();
  const wide = useWide();
  const [tab, setTab] = useState<StatusTab>('OPEN');
  const [category, setCategory] = useState<string>('ALL');
  const [page, setPage] = useState(0);
  const [data, setData] = useState<EnquiryPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<MemberEnquiry | null>(null);

  const load = useCallback(() => {
    setError(null);
    enquiriesService.list({
      status: tab === 'ALL' ? null : tab,
      category: category === 'ALL' ? null : category,
      page,
      size: PAGE_SIZE,
    }).then(setData).catch(e => setError(e.message));
  }, [tab, category, page, activeBranchId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(0); }, [tab, category, activeBranchId]);

  // Side by side, keep something open: the first enquiry, unless the selected one is still listed.
  useEffect(() => {
    if (!wide || !data) return;
    if (!selected || !data.items.some(e => e.id === selected.id)) setSelected(data.items[0] ?? null);
  }, [wide, data]); // eslint-disable-line react-hooks/exhaustive-deps

  const onUpdated = (updated: MemberEnquiry) => {
    setSelected(updated);
    load();
  };

  const counts = data?.status_counts;
  const allCount = counts ? (counts.OPEN ?? 0) + (counts.REPLIED ?? 0) + (counts.CLOSED ?? 0) : null;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const [emptyTitle, emptyText] = EMPTY_TEXT[tab];

  return (
    <div className={s.root}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Enquiries</h1>
          <p className={s.subtitle}>
            Questions members raised from the mobile app
            {isAllBranches ? ' — showing every branch; select a branch in the sidebar to reply.' : ''}
          </p>
        </div>
      </div>

      <div className={s.tiles} role="tablist" aria-label="Enquiry status">
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
                {counts ? (t.key === 'ALL' ? allCount : counts[t.key as EnquiryStatus] ?? 0) : '—'}
              </div>
              <div className={s.tileLabel}>{t.label}</div>
            </span>
          </button>
        ))}
      </div>

      <div className={s.chips} aria-label="Category">
        {[['ALL', 'All categories'], ...Object.entries(ENQUIRY_CATEGORY_LABELS)].map(([key, label]) => (
          <button key={key} type="button" className={s.chip} data-active={category === key} onClick={() => setCategory(key)}>
            {label}
          </button>
        ))}
      </div>

      <div className={s.inbox} data-single={!wide}>
        <div className={s.list}>
          <div className={s.listHead}>
            <span>
              {data ? `${data.total} ${data.total === 1 ? 'enquiry' : 'enquiries'}` : 'Loading…'}
              {category !== 'ALL' ? ` · ${ENQUIRY_CATEGORY_LABELS[category] ?? category}` : ''}
            </span>
          </div>
          {error ? (
            <p className={s.error}>{error}</p>
          ) : data === null ? (
            <div className={s.state}><Inbox /><span>Loading enquiries…</span></div>
          ) : data.items.length === 0 ? (
            <div className={s.state}>
              {tab === 'OPEN' ? <CheckCircle2 /> : <Inbox />}
              <span className={s.stateTitle}>{emptyTitle}</span>
              <span>{emptyText}</span>
            </div>
          ) : (
            <div className={s.items}>
              {data.items.map(e => (
                <button
                  key={e.id}
                  type="button"
                  className={s.item}
                  data-selected={wide && selected?.id === e.id}
                  data-open={e.status === 'OPEN'}
                  onClick={() => setSelected(e)}
                >
                  <span className={s.avatar} data-tone={STATUS[e.status]?.tone ?? 'amber'}>{initials(e.member_name)}</span>
                  <span className={s.itemBody}>
                    <span className={s.itemTop}>
                      <span className={s.itemName}>{memberName(e)}</span>
                      <span className={s.itemTime} title={formatDateTime(e.created_at)}>{timeAgo(e.created_at)}</span>
                    </span>
                    <div className={s.itemSubject}>{e.subject}</div>
                    <div className={s.itemPreview}>{e.message}</div>
                    <span className={s.itemMeta}>
                      <StatusPill status={e.status} />
                      <span className={s.tag}>{ENQUIRY_CATEGORY_LABELS[e.category] ?? e.category}</span>
                      {isAllBranches && e.branch_name && <span className={s.tag}>{e.branch_name}</span>}
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
          selected
            ? <EnquiryDetail enquiry={selected} onUpdated={onUpdated} />
            : <div className={s.state}><MessageSquare /><span>Select an enquiry to read it and reply.</span></div>
        )}
      </div>

      {!wide && selected && (
        <Sheet open onOpenChange={open => { if (!open) setSelected(null); }}>
          <SheetContent className="sm:max-w-lg w-full overflow-y-auto p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>{selected.subject}</SheetTitle>
              <SheetDescription>{memberName(selected)}</SheetDescription>
            </SheetHeader>
            <div className={s.sheetDetail}>
              <EnquiryDetail enquiry={selected} onUpdated={onUpdated} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function EnquiryDetail({ enquiry, onUpdated }: { enquiry: MemberEnquiry; onUpdated: (e: MemberEnquiry) => void }) {
  const { isAllBranches } = useBranch();
  const canEdit = hasPermission('MEMBER_CONNECT_EDIT');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => { setReply(''); }, [enquiry.id]);

  const readOnlyHint = !canEdit
    ? "You don't have permission to reply to members."
    : isAllBranches
      ? 'Select this branch in the sidebar to reply.'
      : null;

  const sendReply = async () => {
    if (!reply.trim() || readOnlyHint || busy) return;
    setBusy(true);
    try {
      const updated = await enquiriesService.reply(enquiry.id, reply.trim());
      toast.success('Reply sent — the member has been notified');
      onUpdated(updated);
    } catch (e: any) {
      toast.error(e.message || 'Could not send the reply');
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    setBusy(true);
    try {
      const updated = await enquiriesService.close(enquiry.id);
      toast.success('Enquiry closed');
      onUpdated(updated);
    } catch (e: any) {
      toast.error(e.message || 'Could not close the enquiry');
    } finally {
      setBusy(false);
      setConfirmClose(false);
    }
  };

  return (
    <div className={s.detail}>
      <div className={s.detailHead}>
        <span className={s.avatar} data-size="lg" data-tone={STATUS[enquiry.status]?.tone ?? 'amber'}>{initials(enquiry.member_name)}</span>
        <div className={s.detailWho}>
          <h2 className={s.detailSubject}>{enquiry.subject}</h2>
          <div className={s.detailMember}>
            <span>{memberName(enquiry)}{enquiry.member_code ? ` · ${enquiry.member_code}` : ''}</span>
            {enquiry.member_phone && (
              <a href={`tel:${enquiry.member_phone}`} className={s.call}><Phone /> {enquiry.member_phone}</a>
            )}
          </div>
          <div className={s.detailTags}>
            <StatusPill status={enquiry.status} />
            <span className={s.tag}>{ENQUIRY_CATEGORY_LABELS[enquiry.category] ?? enquiry.category}</span>
            {enquiry.branch_name && <span className={s.tag}>{enquiry.branch_name}</span>}
          </div>
        </div>
      </div>

      <div className={s.thread}>
        <div className={s.msg} data-from="member">
          <span className={s.msgMeta} title={formatDateTime(enquiry.created_at)}>
            {memberName(enquiry)} · {timeAgo(enquiry.created_at)}
          </span>
          <div className={s.bubble}>{enquiry.message}</div>
        </div>
        {enquiry.reply && (
          <div className={s.msg} data-from="staff">
            <span className={s.msgMeta} title={formatDateTime(enquiry.replied_at)}>
              {enquiry.replied_by ?? 'Staff'} · {timeAgo(enquiry.replied_at)}
            </span>
            <div className={s.bubble}>{enquiry.reply}</div>
          </div>
        )}
        {enquiry.status === 'CLOSED' && (
          <span className={s.notice} title={formatDateTime(enquiry.closed_at)}>
            Closed {timeAgo(enquiry.closed_at)}{enquiry.closed_by ? ` by ${enquiry.closed_by}` : ''}
          </span>
        )}
      </div>

      {enquiry.status !== 'CLOSED' && (
        <div className={s.composer}>
          {enquiry.status === 'OPEN' && (
            <>
              <Textarea
                value={reply}
                onChange={e => setReply(e.target.value.slice(0, MAX_REPLY_LENGTH))}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); sendReply(); } }}
                placeholder={`Reply to ${memberName(enquiry)}…`}
                rows={4}
                disabled={!!readOnlyHint || busy}
              />
              <div className={s.composerFoot}>
                <span>Members get one reply — they can raise a new enquiry to follow up. Ctrl + Enter to send.</span>
                <span>{reply.length}/{MAX_REPLY_LENGTH}</span>
              </div>
            </>
          )}
          {readOnlyHint && <p className={s.hint}>{readOnlyHint}</p>}
          <div className={s.actions}>
            <Button variant="outline" disabled={!!readOnlyHint || busy} onClick={() => setConfirmClose(true)}>
              <XCircle className="h-4 w-4 mr-2" /> Close enquiry
            </Button>
            {enquiry.status === 'OPEN' && (
              <Button disabled={!!readOnlyHint || busy || !reply.trim()} onClick={sendReply}>
                <Send className="h-4 w-4 mr-2" /> {busy ? 'Sending…' : 'Send reply'}
              </Button>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close this enquiry?</AlertDialogTitle>
            <AlertDialogDescription>
              {enquiry.status === 'OPEN'
                ? "It hasn't been replied to — once closed, it can't be answered."
                : 'The member will see it as closed.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={e => { e.preventDefault(); close(); }}>Close enquiry</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
