import React from 'react';
import { Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { GYM_RATING_TAG_LABELS, GymRatingSummary, GymReview } from '../../utils/supabase/ratings-service';

// Pieces shared by the gym admin's and the platform admin's Ratings pages.

export function Stars({ value, size = 'h-4 w-4' }: { value: number | null | undefined; size?: string }) {
  const filled = Math.round(value ?? 0);
  return (
    <div className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`${size} ${i <= filled ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
      ))}
    </div>
  );
}

/** "4.6 ★★★★★ · 12 reviews", or "Not rated yet". */
export function RatingInline({ average, count }: { average: number | null | undefined; count: number }) {
  if (average == null || count === 0) {
    return <span className="text-sm text-muted-foreground">Not rated yet</span>;
  }
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold">{average.toFixed(1)}</span>
      <Stars value={average} />
      <span className="text-sm text-muted-foreground">
        {count} review{count === 1 ? '' : 's'}
      </span>
    </div>
  );
}

export function RatingSummaryCard({ summary }: { summary: GymRatingSummary }) {
  const total = summary.rating_count;
  const tags = Object.entries(summary.top_tags ?? {});
  return (
    <Card className="border-primary/10 shadow-md">
      <CardContent className="p-6 grid gap-6 md:grid-cols-[auto_1fr_1fr] items-center">
        <div className="text-center md:pr-6 md:border-r">
          <div className="text-5xl font-bold">{summary.average_rating != null ? summary.average_rating.toFixed(1) : '—'}</div>
          <div className="flex justify-center mt-2"><Stars value={summary.average_rating} size="h-5 w-5" /></div>
          <p className="text-sm text-muted-foreground mt-1">{total} review{total === 1 ? '' : 's'}</p>
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map(star => {
            const count = summary.distribution?.[star - 1] ?? 0;
            return (
              <div key={star} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-3 text-right">{star}</span>
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-amber-400" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                </div>
                <span className="w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
        <div>
          <p className="text-sm font-medium mb-2">What members say</p>
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No highlights picked yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map(([tag, count]) => (
                <Badge key={tag} variant="secondary" className="font-normal">
                  {GYM_RATING_TAG_LABELS[tag] ?? tag} · {count}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function ReviewList({ reviews }: { reviews: GymReview[] }) {
  return (
    <Card className="border-primary/10 shadow-md">
      <CardHeader>
        <CardTitle>Reviews</CardTitle>
      </CardHeader>
      <CardContent>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No reviews yet.</p>
        ) : (
          <div className="divide-y">
            {reviews.map(r => (
              <div key={r.id} className="py-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{r.member_name}</span>
                    {r.anonymous && (
                      <Badge variant="outline" className="text-xs text-muted-foreground" title="Other members see this review as anonymous">
                        Anonymous
                      </Badge>
                    )}
                    <Stars value={r.rating} size="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(r.updated_at || r.created_at).toLocaleDateString()}
                  </span>
                </div>
                {r.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="text-xs font-normal">
                        {GYM_RATING_TAG_LABELS[tag] ?? tag}
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
        )}
      </CardContent>
    </Card>
  );
}
