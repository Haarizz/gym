import { i18n } from '@/core/i18n';

/**
 * Allowed height/weight ranges for a member's profile.
 * Keep in sync with MIN/MAX_HEIGHT_CM and MIN/MAX_WEIGHT_KG in the backend's
 * MobileProfileService, which enforces the same rule server-side.
 */
export const MIN_HEIGHT_CM = 20;
export const MAX_HEIGHT_CM = 250;
export const MIN_WEIGHT_KG = 20;
export const MAX_WEIGHT_KG = 300;

/** Up to 3 digits with an optional single decimal place, e.g. "70" or "172.5". */
const BODY_METRIC_PATTERN = /^\d{1,3}(\.\d)?$/;

/** Max characters for a height/weight input ("172.5"). */
export const BODY_METRIC_MAX_LENGTH = 5;

/**
 * Drops anything that isn't a digit or the first decimal point. Commas are
 * treated as decimal points, since some locales' decimal-pad shows ",".
 */
export function sanitizeBodyMetricInput(text: string): string {
  const cleaned = text.replace(/,/g, '.').replace(/[^\d.]/g, '');
  const dot = cleaned.indexOf('.');
  return dot === -1
    ? cleaned
    : cleaned.slice(0, dot + 1) + cleaned.slice(dot + 1).replace(/\./g, '');
}

function validateRange(
  value: string,
  metric: 'height' | 'weight',
  min: number,
  max: number,
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!BODY_METRIC_PATTERN.test(trimmed)) {
    return i18n.t(metric === 'height' ? 'validation.invalidHeight' : 'validation.invalidWeight');
  }
  const num = Number(trimmed);
  if (num < min || num > max) {
    return i18n.t(metric === 'height' ? 'validation.heightRange' : 'validation.weightRange', { min, max });
  }
  return null;
}

/** Validates an optional height in cm; returns an error message or null. */
export const validateHeight = (value: string) =>
  validateRange(value, 'height', MIN_HEIGHT_CM, MAX_HEIGHT_CM);

/** Validates an optional weight in kg; returns an error message or null. */
export const validateWeight = (value: string) =>
  validateRange(value, 'weight', MIN_WEIGHT_KG, MAX_WEIGHT_KG);
