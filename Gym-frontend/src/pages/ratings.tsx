import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Building2, ChevronRight, Megaphone, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { RatingInline, RatingSummaryCard, ReviewList } from '../components/ratings/rating-parts';
import { useBranch } from '../utils/branch-context';
import { hasPermission } from '../utils/permissions';
import {
  ratingsService, GymRatingDetail, GymRatingSummary, GymReviewRequestStatus,
} from '../utils/supabase/ratings-service';

const formatDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString() : '');

/**
 * The gym's own Ratings: what members rate each branch, and asking them to rate it.
 * One page per branch — working in a branch opens it directly; "All branches" lists
 * them to pick from (read-only, like every other page in that mode).
 */
export function GymRatings() {
  const { activeBranchId, isAllBranches } = useBranch();
  const { branchId: branchParam } = useParams();
  const branchId = branchParam ? Number(branchParam) : null;

  if (!isAllBranches && activeBranchId != null) {
    // A user working in one branch only ever sees that branch.
    if (branchId != null && branchId !== activeBranchId) return <Navigate to="/ratings" replace />;
    return <BranchRatings branchId={activeBranchId} />;
  }
  return branchId != null ? <BranchRatings branchId={branchId} showBack /> : <BranchList />;
}

function PageHeader({ title, subtitle, onBack }: { title: string; subtitle: string; onBack?: () => void }) {
  return (
    <div className="flex items-start gap-3">
      {onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to all branches">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function BranchList() {
  const navigate = useNavigate();
  const [branches, setBranches] = useState<GymRatingSummary[] | null>(null);

  useEffect(() => {
    ratingsService.getBranches()
      .then(setBranches)
      .catch(e => { toast.error(e.message); setBranches([]); });
  }, []);

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Ratings" subtitle="What members rate each of your branches in the mobile app" />
      <Card className="border-primary/10 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-primary" />
            Branches
          </CardTitle>
          <CardDescription>Open a branch to see its reviews</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {branches === null ? (
            <p className="text-center py-8 text-muted-foreground">Loading ratings...</p>
          ) : branches.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No branches found.</p>
          ) : (
            <div className="divide-y">
              {branches.map(b => (
                <button
                  key={b.branch_id}
                  className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
                  onClick={() => navigate(`/ratings/${b.branch_id}`)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{b.branch_name ?? `Branch ${b.branch_id}`}</div>
                    {b.last_review_at && (
                      <div className="text-xs text-muted-foreground">Last review {formatDate(b.last_review_at)}</div>
                    )}
                  </div>
                  <RatingInline average={b.average_rating} count={b.rating_count} />
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BranchRatings({ branchId, showBack }: { branchId: number; showBack?: boolean }) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<GymRatingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    ratingsService.getBranch(branchId).then(setDetail).catch(e => setError(e.message));
  }, [branchId]);

  useEffect(() => { setDetail(null); load(); }, [load]);

  const branchName = detail?.summary.branch_name ?? 'Branch';

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={detail ? `Ratings · ${branchName}` : 'Ratings'}
        subtitle="What members rate this branch in the mobile app"
        onBack={showBack ? () => navigate('/ratings') : undefined}
      />
      {error ? (
        <Card><CardContent className="py-8 text-center text-destructive">{error}</CardContent></Card>
      ) : !detail ? (
        <p className="text-muted-foreground">Loading ratings...</p>
      ) : (
        <>
          <RatingSummaryCard summary={detail.summary} />
          {detail.request && (
            <RequestReviewsCard
              branchId={branchId}
              status={detail.request}
              onSent={status => setDetail(d => (d ? { ...d, request: status } : d))}
            />
          )}
          <ReviewList reviews={detail.reviews} />
        </>
      )}
    </div>
  );
}

function RequestReviewsCard({
  branchId, status, onSent,
}: { branchId: number; status: GymReviewRequestStatus; onSent: (s: GymReviewRequestStatus) => void }) {
  const { isAllBranches } = useBranch();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const canCreate = hasPermission('MEMBER_CONNECT_CREATE');

  const send = async () => {
    setSending(true);
    try {
      const next = await ratingsService.requestReviews(branchId);
      onSent(next);
      toast.success(`Asked ${next.last_recipient_count ?? status.eligible_count} members to rate this branch`);
    } catch (e: any) {
      toast.error(e.message || 'Could not send the request');
    } finally {
      setSending(false);
      setConfirmOpen(false);
    }
  };

  const noOne = status.eligible_count === 0;
  const disabled = !canCreate || isAllBranches || !status.can_request || noOne || sending;
  const hint = !canCreate
    ? "You don't have permission to message members."
    : isAllBranches
      ? 'Select this branch in the sidebar to request reviews.'
      : !status.can_request
        ? `Available again on ${formatDate(status.next_available_at)} — requests are limited to one every ${status.cooldown_days} days.`
        : noOne
          ? 'Every eligible member has already rated this branch.'
          : `Goes to ${status.eligible_count} member${status.eligible_count === 1 ? '' : 's'} who haven't rated this branch yet.`;

  return (
    <Card className="border-primary/10 shadow-md">
      <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
          <Megaphone className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium">Request reviews</p>
          <p className="text-sm text-muted-foreground">
            Sends members a notification, and the app opens the rating sheet the next time they open it.
            Only members with an active membership who joined at least a day ago are asked.
          </p>
          <p className="text-sm mt-1">{hint}</p>
          {status.last_requested_at && (
            <p className="text-xs text-muted-foreground mt-1">
              Last requested {formatDate(status.last_requested_at)}
              {status.last_recipient_count != null ? ` · sent to ${status.last_recipient_count} member${status.last_recipient_count === 1 ? '' : 's'}` : ''}
            </p>
          )}
        </div>
        <Button onClick={() => setConfirmOpen(true)} disabled={disabled}>
          <Star className="h-4 w-4 mr-2" />
          Ask members to rate us
        </Button>
      </CardContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ask members to rate this branch?</AlertDialogTitle>
            <AlertDialogDescription>
              This notifies {status.eligible_count} member{status.eligible_count === 1 ? '' : 's'}. You can send the
              next request after {status.cooldown_days} days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); send(); }} disabled={sending}>
              {sending ? 'Sending...' : 'Send request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
