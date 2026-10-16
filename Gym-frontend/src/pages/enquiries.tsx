import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Inbox, MessageSquare, Phone, Send, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
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

const PAGE_SIZE = 20;
const MAX_REPLY_LENGTH = 2000;

const formatDateTime = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString() : '');

const STATUS_STYLES: Record<EnquiryStatus, { label: string; className: string }> = {
  OPEN: { label: 'Open', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  REPLIED: { label: 'Replied', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CLOSED: { label: 'Closed', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

type StatusTab = 'ALL' | EnquiryStatus;

function StatusBadge({ status }: { status: EnquiryStatus }) {
  const s = STATUS_STYLES[status] ?? STATUS_STYLES.OPEN;
  return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
}

/**
 * Members' enquiries from the mobile app (Profile → Raise Enquiry). One reply each;
 * only staff close them. "All branches" lists every branch's enquiries read-only.
 */
export function Enquiries() {
  const { activeBranchId, isAllBranches } = useBranch();
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

  const onUpdated = (updated: MemberEnquiry) => {
    setSelected(updated);
    load();
  };

  const counts = data?.status_counts;
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Enquiries</h1>
        <p className="text-muted-foreground">Questions members raised from the mobile app</p>
      </div>

      <Card className="border-primary/10 shadow-md">
        <CardHeader className="gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center">
                <Inbox className="w-5 h-5 mr-2 text-primary" />
                Member enquiries
              </CardTitle>
              <CardDescription>
                {isAllBranches ? 'Showing every branch — select a branch to reply.' : 'Open one to read it and reply'}
              </CardDescription>
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full md:w-52">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {Object.entries(ENQUIRY_CATEGORY_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Tabs value={tab} onValueChange={v => setTab(v as StatusTab)}>
            <TabsList>
              <TabsTrigger value="OPEN">Open{counts ? ` (${counts.OPEN ?? 0})` : ''}</TabsTrigger>
              <TabsTrigger value="REPLIED">Replied{counts ? ` (${counts.REPLIED ?? 0})` : ''}</TabsTrigger>
              <TabsTrigger value="CLOSED">Closed{counts ? ` (${counts.CLOSED ?? 0})` : ''}</TabsTrigger>
              <TabsTrigger value="ALL">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          {error ? (
            <p className="text-center py-8 text-destructive">{error}</p>
          ) : data === null ? (
            <p className="text-center py-8 text-muted-foreground">Loading enquiries...</p>
          ) : data.items.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No enquiries here.</p>
          ) : (
            <div className="divide-y">
              {data.items.map(e => (
                <button
                  key={e.id}
                  className="w-full flex items-start gap-4 px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
                  onClick={() => setSelected(e)}
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{e.subject}</span>
                    </div>
                    <div className="text-sm text-muted-foreground truncate">{e.message}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {e.member_name ?? `Member #${e.member_id}`}
                      {e.member_code ? ` · ${e.member_code}` : ''}
                      {' · '}{ENQUIRY_CATEGORY_LABELS[e.category] ?? e.category}
                      {isAllBranches && e.branch_name ? ` · ${e.branch_name}` : ''}
                      {' · '}{formatDateTime(e.created_at)}
                    </div>
                  </div>
                  <StatusBadge status={e.status} />
                </button>
              ))}
            </div>
          )}
          {data && data.total > PAGE_SIZE && (
            <div className="flex items-center justify-between px-6 py-3 border-t text-sm text-muted-foreground">
              <span>Page {page + 1} of {totalPages} · {data.total} enquiries</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page + 1 >= totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <EnquirySheet enquiry={selected} onClose={() => setSelected(null)} onUpdated={onUpdated} />
    </div>
  );
}

function EnquirySheet({
  enquiry, onClose, onUpdated,
}: { enquiry: MemberEnquiry | null; onClose: () => void; onUpdated: (e: MemberEnquiry) => void }) {
  const { isAllBranches } = useBranch();
  const canEdit = hasPermission('MEMBER_CONNECT_EDIT');
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => { setReply(''); }, [enquiry?.id]);

  if (!enquiry) return null;

  const readOnlyHint = !canEdit
    ? "You don't have permission to reply to members."
    : isAllBranches
      ? 'Select this branch in the sidebar to reply.'
      : null;

  const sendReply = async () => {
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
    <Sheet open onOpenChange={open => { if (!open) onClose(); }}>
      <SheetContent className="sm:max-w-lg w-full overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <StatusBadge status={enquiry.status} />
            <Badge variant="secondary">{ENQUIRY_CATEGORY_LABELS[enquiry.category] ?? enquiry.category}</Badge>
          </div>
          <SheetTitle className="text-lg">{enquiry.subject}</SheetTitle>
          <SheetDescription>
            {enquiry.member_name ?? `Member #${enquiry.member_id}`}
            {enquiry.member_code ? ` · ${enquiry.member_code}` : ''}
            {enquiry.branch_name ? ` · ${enquiry.branch_name}` : ''}
          </SheetDescription>
          {enquiry.member_phone && (
            <a href={`tel:${enquiry.member_phone}`} className="text-sm text-primary inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5" /> {enquiry.member_phone}
            </a>
          )}
        </SheetHeader>

        <div className="px-4 space-y-5 pb-6">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Asked {formatDateTime(enquiry.created_at)}</p>
            <div className="rounded-lg bg-slate-50 border p-4 text-sm whitespace-pre-wrap">{enquiry.message}</div>
          </div>

          {enquiry.reply ? (
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                Replied {formatDateTime(enquiry.replied_at)}{enquiry.replied_by ? ` by ${enquiry.replied_by}` : ''}
              </p>
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 text-sm whitespace-pre-wrap">{enquiry.reply}</div>
            </div>
          ) : enquiry.status === 'OPEN' ? (
            <div className="space-y-2">
              <p className="text-sm font-medium">Reply</p>
              <Textarea
                value={reply}
                onChange={e => setReply(e.target.value.slice(0, MAX_REPLY_LENGTH))}
                placeholder="Write your reply to the member…"
                rows={6}
                disabled={!!readOnlyHint || busy}
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Members get one reply — they can raise a new enquiry to follow up.</span>
                <span>{reply.length}/{MAX_REPLY_LENGTH}</span>
              </div>
            </div>
          ) : null}

          {enquiry.status === 'CLOSED' && (
            <p className="text-xs text-muted-foreground">
              Closed {formatDateTime(enquiry.closed_at)}{enquiry.closed_by ? ` by ${enquiry.closed_by}` : ''}
            </p>
          )}

          {readOnlyHint && enquiry.status !== 'CLOSED' && <p className="text-sm text-muted-foreground">{readOnlyHint}</p>}

          {enquiry.status !== 'CLOSED' && (
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button variant="outline" disabled={!!readOnlyHint || busy} onClick={() => setConfirmClose(true)}>
                <XCircle className="h-4 w-4 mr-2" /> Close enquiry
              </Button>
              {enquiry.status === 'OPEN' && (
                <Button disabled={!!readOnlyHint || busy || !reply.trim()} onClick={sendReply}>
                  <Send className="h-4 w-4 mr-2" /> {busy ? 'Sending…' : 'Send reply'}
                </Button>
              )}
            </div>
          )}
        </div>

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
      </SheetContent>
    </Sheet>
  );
}
