import { create } from 'zustand';

/**
 * Display currency — mirrors Gym-frontend/src/utils/currency.tsx. The gym admin
 * picks it on the web Settings page (financial setting `currency_code`, category
 * APP_PREFERENCES, branch-scoped); the app only ever reads it.
 */
export type CurrencyCode = 'AED' | 'INR' | 'USD' | 'EUR' | 'GBP' | 'SAR';

export interface CurrencyDefinition {
  code: CurrencyCode;
  name: string;
  /** Prefix for plain-text contexts (alerts, share text, a11y labels), e.g. "$" or "AED ". */
  textPrefix: string;
  /** Glyph in the bundled GymBiosCurrency font, for currencies with no widely supported Unicode symbol. */
  fontGlyph?: string;
  /** Locale used for digit grouping (en-IN gives 1,00,000). */
  locale: string;
}

/** U+20C3 UAE DIRHAM SIGN — too new for system fonts, so it is drawn from GymBiosCurrency.ttf. */
export const DIRHAM_SIGN = '⃃';
export const CURRENCY_FONT_FAMILY = 'GymBiosCurrency';

export const CURRENCIES: CurrencyDefinition[] = [
  { code: 'AED', name: 'UAE Dirham', textPrefix: 'AED ', fontGlyph: DIRHAM_SIGN, locale: 'en-US' },
  { code: 'INR', name: 'Indian Rupee', textPrefix: '₹', locale: 'en-IN' },
  { code: 'USD', name: 'US Dollar', textPrefix: '$', locale: 'en-US' },
  { code: 'EUR', name: 'Euro', textPrefix: '€', locale: 'en-US' },
  { code: 'GBP', name: 'British Pound', textPrefix: '£', locale: 'en-US' },
  { code: 'SAR', name: 'Saudi Riyal', textPrefix: 'SAR ', locale: 'en-US' },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'AED';

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && CURRENCIES.some((c) => c.code === value);
}

export function getCurrencyDefinition(code?: CurrencyCode): CurrencyDefinition {
  const resolved = code ?? useCurrencyStore.getState().currencyCode;
  return CURRENCIES.find((c) => c.code === resolved) ?? CURRENCIES[0];
}

interface CurrencyStoreState {
  currencyCode: CurrencyCode;
  /** True once GymBiosCurrency.ttf is loaded — until then font glyphs fall back to textPrefix. */
  glyphFontLoaded: boolean;
  setCurrencyCode: (code: CurrencyCode) => void;
  setGlyphFontLoaded: (loaded: boolean) => void;
}

/**
 * Module-level store so plain functions (formatters, HTML builders, dashboard
 * mappers) see the same currency as components without prop-drilling it.
 */
export const useCurrencyStore = create<CurrencyStoreState>((set) => ({
  currencyCode: DEFAULT_CURRENCY,
  glyphFontLoaded: false,
  setCurrencyCode: (currencyCode) => set({ currencyCode }),
  setGlyphFontLoaded: (glyphFontLoaded) => set({ glyphFontLoaded }),
}));

export interface CurrencyFormatOptions extends Intl.NumberFormatOptions {
  /** 1.2K / 3.4M (or 1.2K / 3.4L / 1.1Cr for INR). */
  compact?: boolean;
  /** Prefix "+" / "−" by sign; the number itself is then shown unsigned. */
  signed?: boolean;
  /** Fixed number of decimals (sets both minimum and maximum fraction digits). */
  decimals?: number;
  /** Override the configured display currency. */
  code?: CurrencyCode;
}

function trimNumber(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

function formatCompactNumber(value: number, def: CurrencyDefinition): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (def.code === 'INR') {
    if (abs >= 1e7) return `${sign}${trimNumber(abs / 1e7)}Cr`;
    if (abs >= 1e5) return `${sign}${trimNumber(abs / 1e5)}L`;
  } else {
    if (abs >= 1e9) return `${sign}${trimNumber(abs / 1e9)}B`;
    if (abs >= 1e6) return `${sign}${trimNumber(abs / 1e6)}M`;
  }
  if (abs >= 1e3) return `${sign}${trimNumber(abs / 1e3)}K`;
  return `${sign}${Math.round(abs).toLocaleString(def.locale)}`;
}

/** Splits an amount into its sign marker and the unsigned number text (no currency symbol). */
export function formatAmountParts(
  amount: number | null | undefined,
  options: CurrencyFormatOptions = {},
): { sign: string; number: string; currency: CurrencyDefinition } {
  const { compact, signed, code, decimals, ...rest } = options;
  const intl: Intl.NumberFormatOptions =
    decimals === undefined ? rest : { ...rest, minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  const currency = getCurrencyDefinition(code);
  const value = Number(amount ?? 0) || 0;
  // A leading "-" goes before the symbol ("-AED 5"), never between symbol and digits.
  const sign = signed ? (value < 0 ? '−' : value > 0 ? '+' : '') : value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const number = compact ? formatCompactNumber(abs, currency) : abs.toLocaleString(currency.locale, intl);
  return { sign, number, currency };
}

/** Number only, no symbol — for inputs and places that draw the symbol separately. */
export function formatAmount(amount: number | null | undefined, options: CurrencyFormatOptions = {}): string {
  const { sign, number } = formatAmountParts(amount, options);
  return `${sign}${number}`;
}

/**
 * Plain-text currency string, e.g. "$1,250" / "AED 1,250". Use it where only a
 * string works (Alert, toast, share text, a11y labels). For on-screen amounts
 * use <CurrencyValue>, which draws the real Dirham sign.
 */
export function formatCurrency(amount: number | null | undefined, options: CurrencyFormatOptions = {}): string {
  const { sign, number, currency } = formatAmountParts(amount, options);
  return `${sign}${currency.textPrefix}${number}`;
}

const MAGNITUDE: Record<string, number> = { K: 1e3, L: 1e5, CR: 1e7, M: 1e6, B: 1e9 };

/**
 * Reads an amount the backend sent pre-formatted with a hardcoded symbol
 * ("₹1,500", "₹2.4L", "AED 12K") or as a plain number, so it can be re-rendered
 * in the configured display currency. Returns null when there is no number.
 */
export function parseAmount(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const match = value.replace(/,/g, '').match(/(-?\d+(?:\.\d+)?)\s*(Cr|K|L|M|B)?\b/i);
  if (!match) return null;
  const n = parseFloat(match[1]);
  const factor = match[2] ? MAGNITUDE[match[2].toUpperCase()] ?? 1 : 1;
  return n * factor;
}
