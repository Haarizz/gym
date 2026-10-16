export type PlanTermUnit = 'days' | 'weeks' | 'months' | 'quarters' | 'years' | 'sessions';

export interface PlanTerm {
  unit: PlanTermUnit;
  count: number;
}

const TERM_UNITS: Record<string, PlanTermUnit> = {
  day: 'days', days: 'days', daily: 'days',
  week: 'weeks', weeks: 'weeks', weekly: 'weeks',
  month: 'months', months: 'months', monthly: 'months',
  quarter: 'quarters', quarters: 'quarters', quarterly: 'quarters',
  year: 'years', years: 'years', yearly: 'years', annual: 'years', annually: 'years',
  session: 'sessions', sessions: 'sessions',
};

/**
 * The backend's plan `duration` is "<value> <durationType>" — e.g. "1 month",
 * "56 monthly", "8 sessions". Returns null when it can't be parsed, so callers
 * fall back to the raw string.
 */
export function parsePlanTerm(duration?: string | null): PlanTerm | null {
  const match = duration?.trim().toLowerCase().match(/^(\d+)\s*([a-z]+)$/);
  if (!match) return null;
  const unit = TERM_UNITS[match[2]];
  const count = parseInt(match[1], 10);
  return unit && count > 0 ? { unit, count } : null;
}
