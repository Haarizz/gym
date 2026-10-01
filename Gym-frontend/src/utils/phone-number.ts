// Country-code phone input helpers for the public lead form. The visitor types
// only the national number; the dial code comes from the country picker and is
// joined back on submit as "+{dial}{digits}" — the shape the backend already
// stores ("+" kept, everything else reduced to digits).

export interface DialCountry {
  iso: string;
  name: string;
  dial: string;
  flag: string;
  /** National number length (without the trunk 0). */
  maxDigits: number;
  /** Display grouping, e.g. [2, 3, 4] → "50 123 4567". */
  groups: number[];
  placeholder: string;
  /** Stricter check for countries where we know the mobile format. */
  mobilePattern?: RegExp;
  mobileHint?: string;
}

export const DIAL_COUNTRIES: DialCountry[] = [
  { iso: 'AE', name: 'United Arab Emirates', dial: '971', flag: '🇦🇪', maxDigits: 9, groups: [2, 3, 4], placeholder: '50 123 4567',
    mobilePattern: /^5\d{8}$/, mobileHint: 'Enter a valid UAE mobile number, e.g. 50\u00a0123\u00a04567' },
  { iso: 'SA', name: 'Saudi Arabia', dial: '966', flag: '🇸🇦', maxDigits: 9, groups: [2, 3, 4], placeholder: '50 123 4567' },
  { iso: 'QA', name: 'Qatar', dial: '974', flag: '🇶🇦', maxDigits: 8, groups: [4, 4], placeholder: '3312 3456' },
  { iso: 'KW', name: 'Kuwait', dial: '965', flag: '🇰🇼', maxDigits: 8, groups: [4, 4], placeholder: '5012 3456' },
  { iso: 'BH', name: 'Bahrain', dial: '973', flag: '🇧🇭', maxDigits: 8, groups: [4, 4], placeholder: '3600 1234' },
  { iso: 'OM', name: 'Oman', dial: '968', flag: '🇴🇲', maxDigits: 8, groups: [4, 4], placeholder: '9212 3456' },
  { iso: 'IN', name: 'India', dial: '91', flag: '🇮🇳', maxDigits: 10, groups: [5, 5], placeholder: '98765 43210' },
  { iso: 'PK', name: 'Pakistan', dial: '92', flag: '🇵🇰', maxDigits: 10, groups: [3, 7], placeholder: '301 2345678' },
  { iso: 'PH', name: 'Philippines', dial: '63', flag: '🇵🇭', maxDigits: 10, groups: [3, 3, 4], placeholder: '917 123 4567' },
  { iso: 'EG', name: 'Egypt', dial: '20', flag: '🇪🇬', maxDigits: 10, groups: [2, 4, 4], placeholder: '10 1234 5678' },
  { iso: 'GB', name: 'United Kingdom', dial: '44', flag: '🇬🇧', maxDigits: 10, groups: [4, 6], placeholder: '7400 123456' },
  { iso: 'US', name: 'United States', dial: '1', flag: '🇺🇸', maxDigits: 10, groups: [3, 3, 4], placeholder: '201 555 0123' },
];

export const DEFAULT_DIAL_COUNTRY = DIAL_COUNTRIES[0];

export const findDialCountry = (iso: string) => DIAL_COUNTRIES.find(c => c.iso === iso) ?? DEFAULT_DIAL_COUNTRY;

// Longest dial code first so "+971…" never matches a shorter code by accident.
const BY_DIAL_LENGTH = [...DIAL_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

/** "501234567" → "50 123 4567"; digits past the last group stay on the end. */
export function formatNational(digits: string, groups: number[]): string {
  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  if (i < digits.length) parts[parts.length - 1] += digits.slice(i);
  return parts.join(' ');
}

export function nationalDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Normalises whatever was typed, pasted or autofilled into the national-number
 * box. A full international number ("+971 50…", "00971…") switches the country;
 * a trunk 0 ("050…") or a repeated dial code ("97150…") is dropped.
 * Returns the country to use and the display value.
 */
export function parsePhoneInput(raw: string, current: DialCountry, format = true): { country: DialCountry; value: string } {
  const trimmed = raw.trim();
  let country = current;
  let digits = nationalDigits(trimmed);

  if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
    if (trimmed.startsWith('00')) digits = digits.slice(2);
    const match = BY_DIAL_LENGTH.find(c => digits.startsWith(c.dial) && digits.length > c.dial.length);
    // Still typing the code ("+97") — leave it alone until it resolves.
    if (!match) return { country, value: trimmed.replace(/[^\d+ ]/g, '') };
    country = match;
    digits = digits.slice(match.dial.length);
  } else if (digits.length > current.maxDigits && digits.startsWith(current.dial)) {
    digits = digits.slice(current.dial.length);
  }

  // Known mobile formats are capped at their exact length; others at the E.164 limit.
  const cap = country.mobilePattern ? country.maxDigits : 15 - country.dial.length;
  digits = digits.replace(/^0+/, '').slice(0, cap);
  return { country, value: format ? formatNational(digits, country.groups) : digits };
}

/** Value sent to the API, e.g. "+971501234567". */
export function toInternational(country: DialCountry, value: string): string {
  const digits = nationalDigits(value);
  return digits ? `+${country.dial}${digits}` : '';
}

/** Returns an error message, or null when the number is acceptable. */
export function validatePhone(country: DialCountry, value: string): string | null {
  const digits = nationalDigits(value);
  if (!digits) return 'Please enter your phone number';
  if (country.mobilePattern) {
    return country.mobilePattern.test(digits) ? null : (country.mobileHint ?? 'Please enter a valid mobile number');
  }
  // Same bounds the backend enforces (7–15 digits overall).
  const total = country.dial.length + digits.length;
  return digits.length >= 7 && total <= 15 ? null : 'Please enter a valid phone number';
}
