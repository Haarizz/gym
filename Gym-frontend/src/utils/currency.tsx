import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { financialSettingsService } from "./supabase/financial-settings-service";
import aedSymbolUrl from "../assets/currency/aed-symbol.webp";

export type CurrencyCode = "AED" | "INR" | "USD" | "EUR" | "GBP" | "SAR";

export interface CurrencyDefinition {
  code: CurrencyCode;
  name: string;
  /** Prefix for plain text that leaves the app (CSV/Excel, print windows, messages), e.g. "$" or "AED ". */
  textPrefix: string;
  /**
   * Prefix for on-screen text, e.g. "$" or the Dirham sign. AED uses U+20C3 (UAE DIRHAM SIGN), which
   * the app font stack renders from a bundled one-glyph font (styles/fonts.css); exports keep textPrefix.
   */
  displayPrefix: string;
  /** true when this currency has a dedicated graphic mark (currently only AED) instead of a Unicode glyph. */
  hasImageGlyph?: boolean;
}

/** U+20C3 UAE DIRHAM SIGN — drawn by the bundled GymBios Dirham font (styles/fonts.css). */
export const DIRHAM_SIGN = "⃃";

/**
 * Swaps the Dirham sign back to "AED " for text drawn outside the app's fonts — native tooltips
 * (title attributes), alert() dialogs — where the sign could show as an empty box.
 */
export const toPlainCurrencyText = (text: string) => text.split(DIRHAM_SIGN).join("AED ");

export const CURRENCIES: CurrencyDefinition[] = [
  { code: "AED", name: "UAE Dirham", textPrefix: "AED ", displayPrefix: DIRHAM_SIGN, hasImageGlyph: true },
  { code: "INR", name: "Indian Rupee", textPrefix: "₹", displayPrefix: "₹" },
  { code: "USD", name: "US Dollar", textPrefix: "$", displayPrefix: "$" },
  { code: "EUR", name: "Euro", textPrefix: "€", displayPrefix: "€" },
  { code: "GBP", name: "British Pound", textPrefix: "£", displayPrefix: "£" },
  { code: "SAR", name: "Saudi Riyal", textPrefix: "SAR ", displayPrefix: "SAR " },
];

const DEFAULT_CURRENCY: CurrencyCode = "AED";
const STORAGE_KEY = "gymbios_currency_code";
const SETTING_KEY = "currency_code";
const SETTING_CATEGORY = "APP_PREFERENCES";

function isCurrencyCode(value: string | null): value is CurrencyCode {
  return !!value && CURRENCIES.some((c) => c.code === value);
}

function readCachedCurrency(): CurrencyCode {
  if (typeof window === "undefined") return DEFAULT_CURRENCY;
  const cached = window.localStorage.getItem(STORAGE_KEY);
  return isCurrencyCode(cached) ? cached : DEFAULT_CURRENCY;
}

interface CurrencyContextValue {
  currencyCode: CurrencyCode;
  currency: CurrencyDefinition;
  setCurrencyCode: (code: CurrencyCode) => Promise<void>;
  saving: boolean;
  /** On-screen symbol on its own, for labels like "Price (⃃)": "$", "₹", the Dirham sign, "SAR". */
  currencySymbol: string;
  /** On-screen prefix that goes straight before an amount: `${currencyPrefix}${amount}`. */
  currencyPrefix: string;
  /** "$1,250" / "⃃1,250" — on-screen text; the symbol always comes before the amount. */
  formatCurrency: (amount: number, options?: Intl.NumberFormatOptions) => string;
  /** "$1,250" / "AED 1,250" — for text that leaves the app (CSV/Excel, print windows, messages). */
  formatCurrencyText: (amount: number, options?: Intl.NumberFormatOptions) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCodeState] = useState<CurrencyCode>(readCachedCurrency);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchCurrency = () => {
      financialSettingsService
        .getSettings(SETTING_CATEGORY)
        .then((settings) => {
          if (cancelled) return;
          const saved = settings.find((s) => s.settingKey === SETTING_KEY)?.settingValue ?? null;
          // Falls back to the default currency (not merely "leave unchanged") once a
          // branch context is active — the display currency is now branch-scoped, so
          // switching to a branch with no saved override must not keep showing
          // whichever branch's currency happened to be active before.
          const resolved = isCurrencyCode(saved) ? saved : DEFAULT_CURRENCY;
          setCurrencyCodeState((prev) => {
            if (resolved === prev) return prev;
            window.localStorage.setItem(STORAGE_KEY, resolved);
            return resolved;
          });
        })
        .catch(() => {
          // Not logged in yet, or backend unavailable — keep the cached/default value.
        });
    };

    fetchCurrency();
    // Currency is branch-scoped — re-fetch whenever the active branch changes
    // (branch-context.tsx dispatches this on every setActiveBranch call).
    window.addEventListener("branchChanged", fetchCurrency);

    return () => {
      cancelled = true;
      window.removeEventListener("branchChanged", fetchCurrency);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCurrencyCode = useCallback(async (code: CurrencyCode) => {
    const previous = currencyCode;
    setCurrencyCodeState(code);
    window.localStorage.setItem(STORAGE_KEY, code);
    setSaving(true);

    try {
      await financialSettingsService.upsertSetting({
        settingKey: SETTING_KEY,
        settingValue: code,
        category: SETTING_CATEGORY,
        description: "Application-wide display currency",
      });
      toast.success(`Currency changed to ${code}`);
    } catch (error) {
      setCurrencyCodeState(previous);
      window.localStorage.setItem(STORAGE_KEY, previous);
      toast.error("Failed to save currency setting");
      throw error;
    } finally {
      setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currencyCode]);

  const currency = useMemo(
    () => CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0],
    [currencyCode]
  );

  const formatCurrency = useCallback(
    (amount: number, options?: Intl.NumberFormatOptions) =>
      `${currency.displayPrefix}${(amount ?? 0).toLocaleString(undefined, options)}`,
    [currency]
  );

  const formatCurrencyText = useCallback(
    (amount: number, options?: Intl.NumberFormatOptions) =>
      `${currency.textPrefix}${(amount ?? 0).toLocaleString(undefined, options)}`,
    [currency]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currencyCode, currency, setCurrencyCode, saving,
      currencySymbol: currency.displayPrefix.trim(),
      currencyPrefix: currency.displayPrefix,
      formatCurrency, formatCurrencyText,
    }),
    [currencyCode, currency, setCurrencyCode, saving, formatCurrency, formatCurrencyText]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error("useCurrency must be used within a CurrencyProvider");
  }
  return ctx;
}

/**
 * The official AED (Dirham) mark, rendered via a CSS mask so it always
 * inherits the surrounding text color (currentColor) instead of being a
 * fixed-color image.
 */
export function AedGlyph({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <span
      role="img"
      aria-label="AED"
      className={className}
      style={{
        display: "inline-block",
        width: "0.95em",
        height: "0.82em",
        backgroundColor: "currentColor",
        WebkitMaskImage: `url(${aedSymbolUrl})`,
        maskImage: `url(${aedSymbolUrl})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        verticalAlign: "-0.05em",
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

/** Inline glyph/symbol for the given currency — the real graphic mark for AED, Unicode text for others. */
export function CurrencyGlyph({ code, className }: { code?: CurrencyCode; className?: string }) {
  const { currencyCode, currency } = useCurrency();
  const def = code ? CURRENCIES.find((c) => c.code === code) ?? currency : currency;
  const resolvedCode = code ?? currencyCode;
  if (def.hasImageGlyph && resolvedCode === "AED") {
    return <AedGlyph className={className} />;
  }
  return <span className={className}>{def.textPrefix.trim()}</span>;
}

/**
 * Symbol + amount, in that order (e.g. "$1,250", "[AED glyph]1,250") — for
 * JSX contexts that want the real visual currency mark instead of plain text.
 * Renders inline and inherits color/size from its parent.
 */
export function CurrencyValue({
  amount,
  options,
  className,
}: {
  amount: number;
  options?: Intl.NumberFormatOptions;
  className?: string;
}) {
  const { currency, currencyCode } = useCurrency();
  const formatted = (amount ?? 0).toLocaleString(undefined, options);

  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "baseline", gap: "0.12em" }}>
      {currency.hasImageGlyph && currencyCode === "AED" ? (
        <AedGlyph />
      ) : (
        <span>{currency.textPrefix}</span>
      )}
      <span>{formatted}</span>
    </span>
  );
}
