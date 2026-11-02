import { formatDate } from '@/core/i18n/format';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "MAR 2026" / "March" / "2026-03" → { month: 2, year: 2026 }; null when unrecognised. */
function parseMonthLabel(label: string): { month: number; year?: number } | null {
  const trimmed = label.trim();
  const iso = /^(\d{4})-(\d{1,2})/.exec(trimmed);
  if (iso) return { month: Number(iso[2]) - 1, year: Number(iso[1]) };
  const [name, year] = trimmed.split(/\s+/);
  const month = MONTHS.indexOf((name ?? '').slice(0, 3).toLowerCase());
  if (month < 0) return null;
  return { month, year: year && /^\d{4}$/.test(year) ? Number(year) : undefined };
}

// The backend sends English month labels; render them in the app language.
// "MAR 2026" -> "Mar" (en) / "مارس" (ar)
export function shortMonth(label: string) {
  const parsed = parseMonthLabel(label);
  if (!parsed) {
    const first = label.trim().split(/\s+/)[0] ?? label;
    return first.charAt(0).toUpperCase() + first.slice(1, 3).toLowerCase();
  }
  return formatDate(new Date(parsed.year ?? 2000, parsed.month, 1), 'LLL');
}

// "MAR 2026" -> "Mar 2026" (en) / "مارس 2026" (ar)
export function fullMonth(label: string) {
  const parsed = parseMonthLabel(label);
  if (!parsed) {
    return label
      .trim()
      .split(/\s+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  }
  const date = new Date(parsed.year ?? 2000, parsed.month, 1);
  return formatDate(date, parsed.year ? 'LLL yyyy' : 'LLLL');
}

// Round a raw step up to 1, 2, 2.5 or 5 x 10^n so axis ticks land on readable values
export function niceStep(rawStep: number) {
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  return factor * magnitude;
}
