import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ChevronRight, Search, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { RatingInline, RatingSummaryCard, ReviewList } from '../components/ratings/rating-parts';
import { ratingsService, GymRatingDetail, PlatformGymRating } from '../utils/supabase/ratings-service';

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

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack?: () => void }) {
  return (
    <div className="flex items-start gap-3">
      {onBack && (
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
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

  return (
    <div className="p-6 space-y-6">
      <Header title="Ratings" subtitle="What members rate each gym in the mobile app" />
      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Star className="w-5 h-5 mr-2 text-primary" />
            Gym Ratings
          </CardTitle>
          <div className="relative w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search gyms..."
              className="pl-10 bg-background/50"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gym Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Last Review</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {gyms === null ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading ratings...</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No gyms found.</TableCell></TableRow>
              ) : rows.map(g => (
                <TableRow
                  key={g.tenant_slug}
                  className="cursor-pointer"
                  onClick={() => navigate(`/platform-ratings/${encodeURIComponent(g.tenant_slug)}`)}
                >
                  <TableCell className="font-medium">{g.gym_name}</TableCell>
                  <TableCell className="font-mono text-sm text-muted-foreground">{g.tenant_slug}</TableCell>
                  <TableCell><RatingInline average={g.average_rating} count={g.rating_count} /></TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatDate(g.last_review_at)}</TableCell>
                  <TableCell><ChevronRight className="h-4 w-4 text-muted-foreground" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
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
    <div className="p-6 space-y-6">
      <Header
        title={gym ? gym.gym_name : 'Ratings'}
        subtitle={gym ? `${tenantSlug} · ratings by branch` : 'Ratings by branch'}
        onBack={() => navigate('/platform-ratings')}
      />
      {error ? (
        <Card><CardContent className="py-8 text-center text-destructive">{error}</CardContent></Card>
      ) : !gym ? (
        <p className="text-muted-foreground">Loading ratings...</p>
      ) : (
        <>
          <Card className="border-primary/10 shadow-md">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="text-4xl font-bold">{gym.average_rating != null ? gym.average_rating.toFixed(1) : '—'}</div>
              <RatingInline average={gym.average_rating} count={gym.rating_count} />
            </CardContent>
          </Card>
          <Card className="border-primary/10 shadow-md">
            <CardHeader><CardTitle>Branches</CardTitle></CardHeader>
            <CardContent className="p-0">
              {(gym.branches ?? []).length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No branches found.</p>
              ) : (
                <div className="divide-y">
                  {gym.branches!.map(b => (
                    <button
                      key={b.branch_id}
                      className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/50 transition-colors"
                      onClick={() => navigate(`/platform-ratings/${encodeURIComponent(tenantSlug)}/${b.branch_id}`)}
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
        </>
      )}
    </div>
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
    <div className="p-6 space-y-6">
      <Header
        title={detail?.summary.branch_name ?? 'Branch ratings'}
        subtitle={`${tenantSlug} · member ratings and reviews`}
        onBack={() => navigate(`/platform-ratings/${encodeURIComponent(tenantSlug)}`)}
      />
      {error ? (
        <Card><CardContent className="py-8 text-center text-destructive">{error}</CardContent></Card>
      ) : !detail ? (
        <p className="text-muted-foreground">Loading ratings...</p>
      ) : (
        <>
          <RatingSummaryCard summary={detail.summary} />
          <ReviewList reviews={detail.reviews} />
        </>
      )}
    </div>
  );
}
