import React, { useCallback, useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';
import { ArrowLeft, Building2, ChevronRight, Megaphone, Star } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { RatingSummaryCard, ReviewList, Stars } from '../components/ratings/rating-parts';
import { useBranch } from '../utils/branch-context';
import { hasPermission } from '../utils/permissions';
import {
  ratingsService, GymRatingDetail, GymRatingSummary, GymReviewRequestStatus,
} from '../utils/supabase/ratings-service';
import s from './ratings.module.css';

const formatDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString() : '');

// Star spread colours, 5★ → 1★ (green to red), for the branch cards' mini bar.
const SPREAD_COLORS = ['#16a34a', '#84cc16', '#facc15', '#f97316', '#ef4444'];

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
    <div className={s.header}>
      {onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back to all branches">
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      <div>
        <h1 className={s.title}>{title}</h1>
        <p className={s.subtitle}>{subtitle}</p>
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
    <div className={s.root}>
      <PageHeader title="Ratings" subtitle="What members rate each of your branches in the mobile app — open one to see its reviews" />
      {branches === null ? (
        <p className={s.state}>Loading ratings…</p>
      ) : branches.length === 0 ? (
        <p className={s.state}>No branches found.</p>
      ) : (
        <div className={s.grid}>
          {branches.map(b => {
            const rated = b.average_rating != null && b.rating_count > 0;
            return (
              <button key={b.branch_id} type="button" className={s.branch} onClick={() => navigate(`/ratings/${b.branch_id}`)}>
                <span className={s.branchTop}>
                  <span className={s.branchIcon}><Building2 /></span>
                  <span className={s.branchName}>{b.branch_name ?? `Branch ${b.branch_id}`}</span>
                  <ChevronRight className={s.branchChevron} />
                </span>
                {rated ? (
                  <>
                    <span className={s.branchScore}>
                      <span className={s.branchValue}>{b.average_rating!.toFixed(1)}</span>
                      <span>
                        <Stars value={b.average_rating} />
                        <span className={s.branchMeta}>{b.rating_count} rating{b.rating_count === 1 ? '' : 's'}</span>
                      </span>
                    </span>
                    <span className={s.spread} aria-label="Ratings by star, 5 to 1">
                      {[5, 4, 3, 2, 1].map((star, i) => {
                        const n = b.distribution?.[star - 1] ?? 0;
                        return n > 0 ? <span key={star} style={{ width: `${(n / b.rating_count) * 100}%`, background: SPREAD_COLORS[i] }} title={`${star}★ · ${n}`} /> : null;
                      })}
                    </span>
                    {b.last_review_at && (
                      <span className={s.branchMeta}>Last rated {formatDistanceToNowStrict(new Date(b.last_review_at), { addSuffix: true })}</span>
                    )}
                  </>
                ) : (
                  <span className={s.unrated}>Not rated yet</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BranchRatings({ branchId, showBack }: { branchId: number; showBack?: boolean }) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<GymRatingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starFilter, setStarFilter] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(null);
    ratingsService.getBranch(branchId).then(setDetail).catch(e => setError(e.message));
  }, [branchId]);

  useEffect(() => { setDetail(null); setStarFilter(null); load(); }, [load]);

  const branchName = detail?.summary.branch_name ?? 'Branch';

  return (
    <div className={s.root}>
      <PageHeader
        title={detail ? `Ratings · ${branchName}` : 'Ratings'}
        subtitle="What members rate this branch in the mobile app"
        onBack={showBack ? () => navigate('/ratings') : undefined}
      />
      {error ? (
        <p className={`${s.state} ${s.error}`}>{error}</p>
      ) : !detail ? (
        <p className={s.state}>Loading ratings…</p>
      ) : (
        <>
          <RatingSummaryCard
            summary={detail.summary}
            reviews={detail.reviews}
            activeStar={starFilter}
            onStarClick={setStarFilter}
          />
          {detail.request && (
            <RequestReviewsCard
              branchId={branchId}
              status={detail.request}
              onSent={status => setDetail(d => (d ? { ...d, request: status } : d))}
            />
          )}
          <ReviewList reviews={detail.reviews} starFilter={starFilter} onStarFilterChange={setStarFilter} />
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
  const members = `${status.eligible_count} member${status.eligible_count === 1 ? '' : 's'}`;
  const [tone, label] = !canCreate
    ? ['gray', "You don't have permission to message members"]
    : isAllBranches
      ? ['gray', 'Select this branch in the sidebar to request reviews']
      : !status.can_request
        ? ['gray', `Available again on ${formatDate(status.next_available_at)} (one request every ${status.cooldown_days} days)`]
        : noOne
          ? ['green', 'Every eligible member has already rated this branch']
          : ['amber', `Ready — goes to ${members} who haven't rated yet`];

  return (
    <div className={s.request}>
      <span className={s.requestIcon}><Megaphone /></span>
      <div className={s.requestBody}>
        <p className={s.requestTitle}>Ask members to rate this branch</p>
        <p className={s.requestText}>
          Members get a notification, and the app opens the rating sheet the next time they open it. Only members with an
          active membership who joined at least a day ago are asked.
        </p>
        <div className={s.requestStatus}>
          <span className={s.pill} data-tone={tone}>{label}</span>
          {status.last_requested_at && (
            <span className={s.last}>
              Last asked {formatDate(status.last_requested_at)}
              {status.last_recipient_count != null ? ` · ${status.last_recipient_count} member${status.last_recipient_count === 1 ? '' : 's'}` : ''}
            </span>
          )}
        </div>
      </div>
      <Button onClick={() => setConfirmOpen(true)} disabled={disabled}>
        <Star className="h-4 w-4 mr-2" />
        Request reviews
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ask members to rate this branch?</AlertDialogTitle>
            <AlertDialogDescription>
              This notifies {members}. You can send the next request after {status.cooldown_days} days.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); send(); }} disabled={sending}>
              {sending ? 'Sending…' : 'Send request'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
