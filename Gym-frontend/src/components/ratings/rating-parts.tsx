import React, { useMemo, useState } from 'react';
import { formatDistanceToNowStrict } from 'date-fns';
import { Star, UserRound } from 'lucide-react';
import { Button } from '../ui/button';
import { GYM_RATING_TAG_LABELS, GymRatingSummary, GymReview } from '../../utils/supabase/ratings-service';
import s from './rating-parts.module.css';

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

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

/**
 * Score, star spread and what members highlight. With onStarClick the star bars filter
 * the reviews below (activeStar is the one picked; clicking it again clears it).
 */
export function RatingSummaryCard({ summary, reviews, activeStar, onStarClick }: {
  summary: GymRatingSummary;
  /** When given, adds the share of 4–5★ ratings and of written reviews. */
  reviews?: GymReview[];
  activeStar?: number | null;
  onStarClick?: (star: number | null) => void;
}) {
  const total = summary.rating_count;
  const tags = Object.entries(summary.top_tags ?? {}).sort((a, b) => b[1] - a[1]);
  const positive = (summary.distribution?.[3] ?? 0) + (summary.distribution?.[4] ?? 0);
  const written = reviews ? reviews.filter(r => r.comment && r.comment.trim()).length : null;

  return (
    <div className={`${s.card} ${s.summary}`}>
      <div className={s.score}>
        <div className={s.scoreValue}>
          {summary.average_rating != null ? summary.average_rating.toFixed(1) : '—'}
          {summary.average_rating != null && <span className={s.scoreOf}> / 5</span>}
        </div>
        <div className={s.scoreStars}><Stars value={summary.average_rating} size="h-5 w-5" /></div>
        <div className={s.scoreCount}>
          {total === 0 ? 'No ratings yet' : `${total} rating${total === 1 ? '' : 's'}`}
        </div>
      </div>

      <div className={s.bars} aria-label="Ratings by star">
        {[5, 4, 3, 2, 1].map(star => {
          const count = summary.distribution?.[star - 1] ?? 0;
          const pct = total ? (count / total) * 100 : 0;
          const content = (
            <>
              <span className={s.barLabel}>{star}<Star /></span>
              <span className={s.barTrack}><span className={s.barFill} style={{ width: `${pct}%`, display: 'block' }} /></span>
              <span className={s.barCount}>{count}</span>
            </>
          );
          return onStarClick ? (
            <button
              key={star}
              type="button"
              className={s.bar}
              data-active={activeStar === star}
              data-dim={activeStar != null && activeStar !== star}
              onClick={() => onStarClick(activeStar === star ? null : star)}
              title={activeStar === star ? 'Show all reviews' : `Show ${star}-star reviews`}
            >
              {content}
            </button>
          ) : (
            <div key={star} className={s.bar}>{content}</div>
          );
        })}
      </div>

      <div className={s.side}>
        {total > 0 && (
          <div className={s.stats}>
            <div className={s.stat}>
              <div className={s.statValue}>{Math.round((positive / total) * 100)}%</div>
              <div className={s.statLabel}>rated 4–5 stars</div>
            </div>
            {written != null ? (
              <div className={s.stat}>
                <div className={s.statValue}>{written}</div>
                <div className={s.statLabel}>written review{written === 1 ? '' : 's'}</div>
              </div>
            ) : summary.last_review_at ? (
              <div className={s.stat}>
                <div className={s.statValue}>{formatDistanceToNowStrict(new Date(summary.last_review_at))}</div>
                <div className={s.statLabel}>since the last rating</div>
              </div>
            ) : null}
          </div>
        )}
        <div>
          <p className={s.sideTitle}>What members say</p>
          {tags.length === 0 ? (
            <p className={s.muted}>No highlights picked yet.</p>
          ) : (
            <div className={s.tags}>
              {tags.map(([tag, count]) => (
                <span key={tag} className={s.tag}>
                  {GYM_RATING_TAG_LABELS[tag] ?? tag} <span className={s.tagCount}>{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type Sort = 'newest' | 'highest' | 'lowest';
const PAGE = 10;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map(p => p[0]).join('').toUpperCase() : '?';
}

/**
 * Every review with star / written-only filters and a sort. The star filter can be driven
 * from the summary's bars (starFilter + onStarFilterChange) or kept here.
 */
export function ReviewList({ reviews, starFilter, onStarFilterChange }: {
  reviews: GymReview[];
  starFilter?: number | null;
  onStarFilterChange?: (star: number | null) => void;
}) {
  const [ownStar, setOwnStar] = useState<number | null>(null);
  const star = onStarFilterChange ? (starFilter ?? null) : ownStar;
  const setStar = onStarFilterChange ?? setOwnStar;
  const [writtenOnly, setWrittenOnly] = useState(false);
  const [sort, setSort] = useState<Sort>('newest');
  const [shown, setShown] = useState(PAGE);

  const visible = useMemo(() => {
    const when = (r: GymReview) => new Date(r.updated_at || r.created_at).getTime();
    return reviews
      .filter(r => star == null || r.rating === star)
      .filter(r => !writtenOnly || (r.comment && r.comment.trim()))
      .sort((a, b) => sort === 'highest' ? b.rating - a.rating || when(b) - when(a)
        : sort === 'lowest' ? a.rating - b.rating || when(b) - when(a)
        : when(b) - when(a));
  }, [reviews, star, writtenOnly, sort]);

  const pickStar = (v: number | null) => { setStar(v); setShown(PAGE); };

  return (
    <div className={s.card}>
      <div className={s.reviewsHead}>
        <h3 className={s.reviewsTitle}>
          Reviews
          <span className={s.reviewsCount}>
            {visible.length === reviews.length ? reviews.length : `${visible.length} of ${reviews.length}`}
          </span>
        </h3>
      </div>
      {reviews.length > 0 && (
        <div className={s.toolbar}>
          <button type="button" className={s.chip} data-active={star == null} onClick={() => pickStar(null)}>All</button>
          {[5, 4, 3, 2, 1].map(v => (
            <button key={v} type="button" className={s.chip} data-active={star === v} onClick={() => pickStar(star === v ? null : v)}>
              {v} <Star />
            </button>
          ))}
          <button type="button" className={s.chip} data-active={writtenOnly} onClick={() => { setWrittenOnly(w => !w); setShown(PAGE); }}>
            With a comment
          </button>
          <span className={s.spacer} />
          <select className={s.sort} value={sort} onChange={e => setSort(e.target.value as Sort)} aria-label="Sort reviews">
            <option value="newest">Newest first</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </div>
      )}

      {reviews.length === 0 ? (
        <p className={s.empty}>No reviews yet.</p>
      ) : visible.length === 0 ? (
        <p className={s.empty}>No reviews match these filters.</p>
      ) : (
        <div className={s.reviews}>
          {visible.slice(0, shown).map(r => {
            const when = r.updated_at || r.created_at;
            return (
              <div key={r.id} className={s.review}>
                <span className={s.avatar}>{r.anonymous ? <UserRound /> : initials(r.member_name)}</span>
                <div className={s.reviewBody}>
                  <div className={s.reviewTop}>
                    <span className={s.reviewWho}>
                      <span className={s.reviewName}>{r.member_name}</span>
                      {r.anonymous && (
                        <span className={s.anon} title="Other members see this review as anonymous">Anonymous to members</span>
                      )}
                    </span>
                    <span className={s.reviewDate} title={new Date(when).toLocaleString()}>
                      {formatDistanceToNowStrict(new Date(when), { addSuffix: true })}
                    </span>
                  </div>
                  <div className={s.reviewStars}>
                    <Stars value={r.rating} size="h-3.5 w-3.5" />
                    <span className={s.ratingWord}>{RATING_WORDS[r.rating] ?? ''}</span>
                  </div>
                  {r.tags?.length > 0 && (
                    <div className={s.reviewTags}>
                      {r.tags.map(tag => <span key={tag} className={s.reviewTag}>{GYM_RATING_TAG_LABELS[tag] ?? tag}</span>)}
                    </div>
                  )}
                  {r.comment && r.comment.trim()
                    ? <p className={s.comment}>{r.comment}</p>
                    : <p className={s.noComment}>Rating only, no written review</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {visible.length > shown && (
        <div className={s.more}>
          <Button variant="outline" size="sm" onClick={() => setShown(n => n + PAGE)}>
            Show more ({visible.length - shown} left)
          </Button>
        </div>
      )}
    </div>
  );
}
