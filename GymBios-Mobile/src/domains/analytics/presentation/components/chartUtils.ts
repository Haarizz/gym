import { formatDate } from '@/core/i18n/format';
import type { Granularity } from '../../hooks/useAdminAnalytics';

/**
 * Categorical series colours, assigned in this order and never cycled.
 * Validated (dataviz validate_palette, light mode on white): lightness band, chroma,
 * adjacent CVD ΔE ≥ 9 and normal-vision ΔE ≥ 27 all pass. Yellow and pink are under
 * 3:1 contrast, so every chart that uses them shows the values as text too.
 */
export const SERIES = ['#0d8a7a', '#eb6834', '#2a78d6', '#eda100', '#6250d6', '#e87ba4'] as const;
/** Neutral for "lost / cancelled / other" — not an identity colour. */
export const NEUTRAL = '#94a3b8';
export const GRID = '#e5e7eb';
export const AXIS = '#9ca3af';
export const GOOD = '#15803d';
export const BAD = '#b91c1c';

// Round a raw step up to 1, 2, 2.5 or 5 x 10^n so axis ticks land on readable values
export function niceStep(rawStep: number) {
  if (!(rawStep > 0)) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}

/** Axis ticks from 0 to a nice ceiling over `max`. */
export function niceTicks(max: number, count = 4) {
  const step = max > 0 ? niceStep(max / count) : 1;
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}

/** Bucket start ("2026-11-03") → axis label. */
export function bucketShort(bucket: string, granularity: Granularity) {
  if (granularity === 'month') return formatDate(bucket, 'LLL');
  if (granularity === 'week') return formatDate(bucket, 'd MMM');
  return formatDate(bucket, 'd');
}

/** Bucket start → tooltip heading. Weeks read as their first day. */
export function bucketLong(bucket: string, granularity: Granularity) {
  if (granularity === 'month') return formatDate(bucket, 'LLLL yyyy');
  return formatDate(bucket, 'EEE d MMM');
}

/** Show at most ~`max` x labels: every k-th from the first. */
export function labelEvery(count: number, max = 6) {
  const k = Math.max(1, Math.ceil(count / max));
  return (i: number) => i % k === 0;
}

/** Vertical bar path from the baseline to `top`, rounded only at the data end. */
export function barPath(x: number, width: number, baseline: number, top: number, radius = 4) {
  const h = baseline - top;
  if (Math.abs(h) < 0.5) return '';
  const up = h > 0;
  const r = Math.min(radius, Math.abs(h), width / 2);
  const end = top;
  const dir = up ? 1 : -1; // direction from the data end back towards the baseline
  return [
    `M${x},${baseline}`,
    `L${x},${end + dir * r}`,
    `Q${x},${end} ${x + r},${end}`,
    `L${x + width - r},${end}`,
    `Q${x + width},${end} ${x + width},${end + dir * r}`,
    `L${x + width},${baseline}`,
    'Z',
  ].join(' ');
}

// Monotone cubic interpolation (Fritsch–Carlson): smooth like a bezier but never overshoots the data
export function monotonePath(points: { x: number; y: number }[]) {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${points[0].x},${points[0].y}`;

  const dx: number[] = [];
  const slopes: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slopes.push((points[i + 1].y - points[i].y) / dx[i]);
  }

  const tangents: number[] = [slopes[0]];
  for (let i = 1; i < n - 1; i++) {
    tangents.push(slopes[i - 1] * slopes[i] <= 0 ? 0 : (slopes[i - 1] + slopes[i]) / 2);
  }
  tangents.push(slopes[n - 2]);

  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }
    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      tangents[i] = t * a * slopes[i];
      tangents[i + 1] = t * b * slopes[i];
    }
  }

  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const third = dx[i] / 3;
    d += ` C${p0.x + third},${p0.y + tangents[i] * third} ${p1.x - third},${p1.y - tangents[i + 1] * third} ${p1.x},${p1.y}`;
  }
  return d;
}

/** % change from previous to value; null when there is nothing to compare against. */
export function percentChange(value: number | null, previous: number | null) {
  if (value == null || previous == null || previous === 0) return null;
  return ((value - previous) / Math.abs(previous)) * 100;
}

/** Slice colour by position; the server's folded "Other" row is always neutral. */
export function sliceColor(name: string, index: number) {
  return name === 'Other' ? NEUTRAL : SERIES[Math.min(index, SERIES.length - 1)];
}
