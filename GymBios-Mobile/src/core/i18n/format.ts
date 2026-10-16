import {
  format as dateFnsFormat,
  formatDistanceToNow as dateFnsFormatDistanceToNow,
  type Locale,
} from 'date-fns';
import { ar, de, enUS, es, fr, hi, ta, zhCN } from 'date-fns/locale';

import i18n from './i18n';
import { isLanguageCode, type DeferredLanguageCode, type LanguageCode } from './languages';

/**
 * date-fns has no Malayalam locale, so month and weekday names come from Intl
 * (Hermes ships ICU data); everything else falls back to English.
 */
function buildIntlNamesLocale(tag: string, base: Locale): Locale {
  const names = (options: Intl.DateTimeFormatOptions, dates: Date[]) => {
    try {
      const fmt = new Intl.DateTimeFormat(tag, options);
      return dates.map((d) => fmt.format(d));
    } catch {
      return null;
    }
  };
  const months = (month: 'long' | 'short') =>
    names({ month }, Array.from({ length: 12 }, (_, i) => new Date(2021, i, 1)));
  // 2021-01-03 was a Sunday — date-fns indexes weekdays from Sunday.
  const days = (weekday: 'long' | 'short') =>
    names({ weekday }, Array.from({ length: 7 }, (_, i) => new Date(2021, 0, 3 + i)));

  const longMonths = months('long');
  const shortMonths = months('short');
  const longDays = days('long');
  const shortDays = days('short');
  const localize = base.localize!;

  return {
    ...base,
    code: tag,
    localize: {
      ...localize,
      month: (index, options) => {
        const list = options?.width === 'wide' ? longMonths : shortMonths;
        return list?.[index] ?? localize.month(index, options);
      },
      day: (index, options) => {
        const list = options?.width === 'wide' ? longDays : shortDays;
        return list?.[index] ?? localize.day(index, options);
      },
    },
  };
}

const DATE_LOCALES: Record<LanguageCode | DeferredLanguageCode, Locale> = {
  en: enUS,
  hi,
  ar,
  de,
  fr,
  es,
  zh: zhCN,
  ml: buildIntlNamesLocale('ml-IN', enUS),
  ta,
};

/**
 * BCP-47 tag for Intl / toLocale*String. Arabic keeps Latin digits so dates,
 * prices and codes read the same as everywhere else in the app.
 */
const INTL_LOCALES: Record<LanguageCode | DeferredLanguageCode, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  ar: 'ar-u-nu-latn',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  zh: 'zh-CN',
  ml: 'ml-IN',
  ta: 'ta-IN',
};

function currentLanguage(): LanguageCode {
  const lng = i18n.language;
  return isLanguageCode(lng) ? lng : 'en';
}

/** date-fns locale for the current app language. */
export function getDateLocale(): Locale {
  return DATE_LOCALES[currentLanguage()];
}

/** Locale tag for Intl APIs and Date#toLocale*String in the current app language. */
export function getIntlLocale(): string {
  return INTL_LOCALES[currentLanguage()];
}

/** Date-only strings ("2026-10-14") are local calendar days, not UTC midnight. */
function toDate(date: Date | number | string): Date | number {
  if (typeof date !== 'string') return date;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(date);
}

/** date-fns `format` in the current app language; '' for an invalid date. */
export function formatDate(date: Date | number | string, pattern: string): string {
  const value = toDate(date);
  if (Number.isNaN(new Date(value).getTime())) return typeof date === 'string' ? date : '';
  return dateFnsFormat(value, pattern, { locale: getDateLocale() });
}

/** date-fns `formatDistanceToNow` in the current app language. */
export function formatTimeAgo(date: Date | number | string, options?: { addSuffix?: boolean }): string {
  const value = toDate(date);
  return dateFnsFormatDistanceToNow(value, { ...options, locale: getDateLocale() });
}

/** "14:30" / "14:30:00" → localized short time ("2:30 PM", "14:30", …); input returned if unparseable. */
export function formatClockTime(timeStr: string | null | undefined): string {
  if (!timeStr) return '';
  const m = /^(\d{1,2}):(\d{2})/.exec(timeStr);
  if (!m) return timeStr;
  const d = new Date();
  d.setHours(Number(m[1]), Number(m[2]), 0, 0);
  return formatDate(d, 'p');
}

/**
 * Translates a key built from backend data (e.g. a status), falling back to the
 * raw value when no translation exists.
 */
export function tOr(key: string, fallback: string): string {
  return i18n.exists(key) ? (i18n.t(key as never) as string) : fallback;
}
