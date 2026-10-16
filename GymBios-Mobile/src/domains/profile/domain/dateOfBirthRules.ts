import { differenceInYears, parseISO, subYears } from 'date-fns';

import { i18n } from '@/core/i18n';

/**
 * Allowed age range for a member's date of birth.
 * Keep in sync with MIN_AGE_YEARS / MAX_AGE_YEARS in the backend's
 * MobileProfileService, which enforces the same rule server-side.
 */
export const MIN_AGE_YEARS = 10;
export const MAX_AGE_YEARS = 100;

/** Latest selectable birth date (youngest allowed member). */
export const getMaxBirthDate = () => subYears(new Date(), MIN_AGE_YEARS);

/** Earliest selectable birth date (oldest allowed member). */
export const getMinBirthDate = () => subYears(new Date(), MAX_AGE_YEARS);

/** Validates a YYYY-MM-DD birth date; returns an error message or null. */
export function validateDateOfBirth(value: string): string | null {
  const age = differenceInYears(new Date(), parseISO(value));
  if (Number.isNaN(age)) return i18n.t('validation.invalidDateOfBirth');
  if (age < MIN_AGE_YEARS) return i18n.t('validation.minAge', { min: MIN_AGE_YEARS });
  if (age > MAX_AGE_YEARS) return i18n.t('validation.maxAge', { max: MAX_AGE_YEARS });
  return null;
}
