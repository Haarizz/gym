import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronRight, Star, Building2, MessageSquare, Clock, GitBranch } from 'lucide-react';
import { RatingInline, RatingSummaryCard, ReviewList } from '../components/ratings/rating-parts';
import { ratingsService, GymRatingDetail, PlatformGymRating } from '../utils/supabase/ratings-service';
import {
  PlatformPage, PageHead, KpiRow, Kpi, Panel, Toolbar, Count, SearchField, DataTable, StateRow, Entity, p,
} from '../components/platform/platform-ui';

const formatDate = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString() : '—');

/**
 * The platform admin's Ratings: every gym's member ratings → one gym's branches →
 * one branch's reviews.
 */
export function PlatformRatings() {
  const { tenantSlug, branchId } = useParams();
  if (tenantSlug && branchId) return <PlatformBranch tenantSlug={tenantSlug} branchId={Number(branchId)} />;
  if (tenantSlug) return <PlatformGym tenantSlug={tenantSlug} />;
  return <PlatformGymList />;
}

function ErrorPanel({ message }: { message: string }) {
  return <Panel title="Couldn't load ratings"><p style={{ margin: 0, color: 'var(--destructive)' }}>{message}</p></Panel>;
}

function PlatformGymList() {
  const navigate = useNavigate();
  const [gyms, setGyms] = useState<PlatformGymRating[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    ratingsService.getPlatformGyms()
      .then(setGyms)
      .catch(e => { toast.error(e.message); setGyms([]); });
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (gyms ?? []).filter(g => !q || `${g.gym_name} ${g.tenant_slug}`.toLowerCase().includes(q));
  }, [gyms, search]);

  // Platform-wide figures: the average is weighted by each gym's number of ratings.
  const stats = useMemo(() => {
    const list = gyms ?? [];
    const rated = list.filter(g => (g.rating_count ?? 0) > 0);
    const total = rated.reduce((s, g) => s + (g.rating_count ?? 0), 0);
    const avg = total ? rated.reduce((s, g) => s + (g.average_rating ?? 0) * (g.rating_count ?? 0), 0) / total : null;
    const last = list.map(g => g.last_review_at).filter(Boolean).sort().pop() ?? null;
    return { gyms: list.length, rated: rated.length, total, avg, last };
  }, [gyms]);
  const loading = gyms === null;

  return (
    <PlatformPage>
      <PageHead icon={Star} title="Ratings" subtitle="What members rate each gym in the mobile app." />

      <KpiRow cols={4}>
        <Kpi icon={Building2} tone="teal" label="Gyms rated" value={loading ? '—' : `${stats.rated} / ${stats.gyms}`} hint="Have at least one rating" />
        <Kpi icon={Star} tone="amber" label="Platform average" value={loading || stats.avg == null ? '—' : stats.avg.toFixed(1)} hint="Weighted by number of ratings" />
        <Kpi icon={MessageSquare} tone="blue" label="Ratings" value={loading ? '—' : stats.total.toLocaleString()} hint="Across all gyms" />
        <Kpi icon={Clock} tone="gray" label="Latest review" value={loading ? '—' : formatDate(stats.last)} hint="Most recent, any gym" />
      </KpiRow>

      <Panel
        title="Gym ratings"
        icon={Star}
        action={
          <Toolbar>
            <Count n={rows.length} />
            <SearchField value={search} onChange={setSearch} placeholder="Search gyms…" label="Search gyms" />
          </Toolbar>
        }
      >
        <DataTable head={<>
          <th>Gym</th>
          <th>Rating</th>
          <th>Last review</th>
          <th className={p.right} aria-label="Open" />
        </>}>
          {loading ? <StateRow cols={4} loading /> : rows.map(g => (
            <tr key={g.tenant_slug} data-clickable="true" onClick={() => navigate(`/platform-ratings/${encodeURIComponent(g.tenant_slug)}`)}>
              <td data-label=""><Entity name={g.gym_name} seed={g.tenant_slug} sub={<span className={p.mono}>{g.tenant_slug}</span>} /></td>
              <td data-label="Rating"><RatingInline average={g.average_rating} count={g.rating_count} /></td>
              <td data-label="Last review" className={p.muted}>{formatDate(g.last_review_at)}</td>
              <td data-label="" className={p.right}><ChevronRight className="h-4 w-4" style={{ color: 'var(--muted-foreground)', display: 'inline' }} /></td>
            </tr>
          ))}
          {!loading && rows.length === 0 && <StateRow cols={4}>No gyms found.</StateRow>}
        </DataTable>
      </Panel>
    </PlatformPage>
  );
}

function PlatformGym({ tenantSlug }: { tenantSlug: string }) {
  const navigate = useNavigate();
  const [gym, setGym] = useState<PlatformGymRating | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ratingsService.getPlatformGym(tenantSlug).then(setGym).catch(e => setError(e.message));
  }, [tenantSlug]);

  return (
    <PlatformPage>
      <PageHead
        icon={Star}
        title={gym ? gym.gym_name : 'Ratings'}
        subtitle={<><span className={p.mono}>{tenantSlug}</span> · ratings by branch</>}
        onBack={() => navigate('/platform-ratings')}
      />
      {error ? <ErrorPanel message={error} /> : !gym ? (
        <Panel title="Loading ratings…"><div className={p.muted}>Loading…</div></Panel>
      ) : (
        <>
          <Panel title="Overall rating" icon={Star}>
            <div className={p.score}>
              <span className={p.scoreBig}>{gym.average_rating != null ? gym.average_rating.toFixed(1) : '—'}</span>
              <RatingInline average={gym.average_rating} count={gym.rating_count} />
              <span className={p.muted} style={{ fontSize: '0.8125rem' }}>Last review {formatDate(gym.last_review_at)}</span>
            </div>
          </Panel>
          <Panel title="Branches" icon={GitBranch} action={<Count n={(gym.branches ?? []).length} />}>
            {(gym.branches ?? []).length === 0 ? (
              <div className={p.muted} style={{ textAlign: 'center', padding: '1.5rem 0' }}>No branches found.</div>
            ) : (
              <div style={{ margin: '0 -1.25rem -1.25rem' }}>
                {gym.branches!.map(b => (
                  <button
                    key={b.branch_id}
                    type="button"
                    className={p.listBtn}
                    onClick={() => navigate(`/platform-ratings/${encodeURIComponent(tenantSlug)}/${b.branch_id}`)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Entity name={b.branch_name ?? `Branch ${b.branch_id}`} seed={`${tenantSlug}-${b.branch_id}`}
                        sub={b.last_review_at ? `Last review ${formatDate(b.last_review_at)}` : 'No reviews yet'} />
                    </div>
                    <RatingInline average={b.average_rating} count={b.rating_count} />
                    <ChevronRight className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                  </button>
                ))}
              </div>
            )}
          </Panel>
        </>
      )}
    </PlatformPage>
  );
}

function PlatformBranch({ tenantSlug, branchId }: { tenantSlug: string; branchId: number }) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<GymRatingDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ratingsService.getPlatformBranch(tenantSlug, branchId).then(setDetail).catch(e => setError(e.message));
  }, [tenantSlug, branchId]);

  return (
    <PlatformPage>
      <PageHead
        icon={Star}
        title={detail?.summary.branch_name ?? 'Branch ratings'}
        subtitle={<><span className={p.mono}>{tenantSlug}</span> · member ratings and reviews</>}
        onBack={() => navigate(`/platform-ratings/${encodeURIComponent(tenantSlug)}`)}
      />
      {error ? <ErrorPanel message={error} /> : !detail ? (
        <Panel title="Loading ratings…"><div className={p.muted}>Loading…</div></Panel>
      ) : (
        <>
          <RatingSummaryCard summary={detail.summary} />
          <ReviewList reviews={detail.reviews} />
        </>
      )}
    </PlatformPage>
  );
}
