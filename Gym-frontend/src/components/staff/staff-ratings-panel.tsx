import React, { useEffect, useState } from 'react';
import { Star, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { staffService, Staff, StaffRating, StaffRatingSummary, STAFF_RATING_TAG_LABELS } from '../../utils/supabase/staff-service';

// Member ratings of staff, submitted from the mobile app. Read-only here.

function Stars({ value, size = 'h-4 w-4' }: { value: number; size?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={`${size} ${i <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}
        />
      ))}
    </div>
  );
}

function Distribution({ counts, total }: { counts: number[]; total: number }) {
  return (
    <div className="space-y-1 w-44">
      {[5, 4, 3, 2, 1].map(star => {
        const count = counts[star - 1] || 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-3 text-right">{star}</span>
            <div className="flex-1 bg-slate-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full bg-amber-400" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
            </div>
            <span className="w-6 text-right">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

function StaffReviews({ staffId }: { staffId: string }) {
  const [reviews, setReviews] = useState<StaffRating[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    staffService.getRatings(staffId).then(setReviews).catch(() => setError(true));
  }, [staffId]);

  if (error) return <p className="text-sm text-destructive py-3">Couldn't load reviews.</p>;
  if (!reviews) return <p className="text-sm text-muted-foreground py-3">Loading reviews...</p>;
  if (reviews.length === 0) return <p className="text-sm text-muted-foreground py-3">No reviews yet.</p>;

  return (
    <div className="divide-y">
      {reviews.map(r => (
        <div key={r.id} className="py-3 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{r.member_name}</span>
              {r.anonymous && (
                <Badge variant="outline" className="text-xs text-muted-foreground" title="Other members see this review as anonymous">
                  Anonymous
                </Badge>
              )}
              <Stars value={r.rating} size="h-3.5 w-3.5" />
            </div>
            <span className="text-xs text-muted-foreground">
              {new Date(r.updated_at || r.created_at).toLocaleDateString()}
            </span>
          </div>
          {r.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {r.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs font-normal">
                  {STAFF_RATING_TAG_LABELS[tag] ?? tag}
                </Badge>
              ))}
            </div>
          )}
          {r.comment
            ? <p className="text-sm text-slate-700 whitespace-pre-line">{r.comment}</p>
            : <p className="text-xs text-muted-foreground italic">Rating only, no written review</p>}
        </div>
      ))}
    </div>
  );
}

interface StaffRatingsPanelProps {
  staff: Staff[];
  isLoading: boolean;
}

export function StaffRatingsPanel({ staff, isLoading }: StaffRatingsPanelProps) {
  const [summaries, setSummaries] = useState<Record<string, StaffRatingSummary>>({});
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    staffService.getRatingSummaries()
      .then(list => setSummaries(Object.fromEntries(list.map(s => [String(s.staff_id), s]))))
      .catch(e => console.error('Failed to load staff ratings', e))
      .finally(() => setLoadingSummaries(false));
  }, []);

  // Highest rated first; unrated staff at the bottom, alphabetically.
  const rows = [...staff].sort((a, b) => {
    const sa = summaries[a.id];
    const sb = summaries[b.id];
    if (sa && sb) return sb.average_rating - sa.average_rating || sb.rating_count - sa.rating_count;
    if (sa) return -1;
    if (sb) return 1;
    return a.name.localeCompare(b.name);
  });

  const rated = staff.map(s => summaries[s.id]).filter(Boolean) as StaffRatingSummary[];
  const totalRatings = rated.reduce((n, s) => n + s.rating_count, 0);
  const overallAverage = totalRatings
    ? rated.reduce((n, s) => n + s.average_rating * s.rating_count, 0) / totalRatings
    : 0;

  return (
    <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Ratings & Reviews</CardTitle>
          <CardDescription>What members rate your staff in the mobile app</CardDescription>
        </div>
        {totalRatings > 0 && (
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <span className="text-2xl font-bold">{overallAverage.toFixed(1)}</span>
              <Stars value={overallAverage} />
            </div>
            <p className="text-xs text-muted-foreground">{totalRatings} rating{totalRatings === 1 ? '' : 's'} across {rated.length} staff</p>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading || loadingSummaries ? (
          <p className="text-center py-8 text-muted-foreground">Loading ratings...</p>
        ) : rows.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No staff found.</p>
        ) : (
          <div className="divide-y">
            {rows.map(employee => {
              const summary = summaries[employee.id];
              const expanded = expandedId === employee.id;
              return (
                <div key={employee.id}>
                  <button
                    className="w-full flex items-center gap-4 px-6 py-4 text-left hover:bg-slate-50/50 transition-colors disabled:cursor-default"
                    onClick={() => setExpandedId(expanded ? null : employee.id)}
                    disabled={!summary}
                  >
                    <Avatar className="h-10 w-10">
                      {employee.photo_url && <AvatarImage src={employee.photo_url} alt={employee.name} />}
                      <AvatarFallback>{employee.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{employee.name}</div>
                      <div className="text-sm text-muted-foreground truncate">
                        {employee.role}{employee.department ? ` • ${employee.department}` : ''}
                      </div>
                    </div>
                    {summary ? (
                      <>
                        <div className="hidden md:block">
                          <Distribution counts={summary.distribution} total={summary.rating_count} />
                        </div>
                        <div className="text-right w-32">
                          <div className="flex items-center gap-2 justify-end">
                            <span className="font-semibold">{summary.average_rating.toFixed(1)}</span>
                            <Stars value={summary.average_rating} />
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                            <MessageSquare className="h-3 w-3" />
                            {summary.rating_count} rating{summary.rating_count === 1 ? '' : 's'}
                          </div>
                        </div>
                        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Not rated yet</Badge>
                    )}
                  </button>
                  {expanded && (
                    <div className="px-6 pb-4 ml-14">
                      <StaffReviews staffId={employee.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
