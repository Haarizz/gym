import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { Text, type StyleProp, type TextProps, type TextStyle } from 'react-native';
import { useFonts } from 'expo-font';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '@/core/network/apiClient';
import { useAuthStore } from '@/domains/auth/store';

import {
  CURRENCIES,
  CURRENCY_FONT_FAMILY,
  DEFAULT_CURRENCY,
  formatAmount,
  formatAmountParts,
  formatCurrency,
  getCurrencyDefinition,
  isCurrencyCode,
  useCurrencyStore,
  type CurrencyCode,
  type CurrencyDefinition,
  type CurrencyFormatOptions,
} from './currencyDefinitions';

export { CURRENCIES, type CurrencyCode, type CurrencyDefinition, type CurrencyFormatOptions };

interface CurrencyContextValue {
  currencyCode: CurrencyCode;
  currency: CurrencyDefinition;
  setCurrencyCode: (code: CurrencyCode) => void;
  /** Plain-text "$1,250" / "AED 1,250" — see formatCurrency in currencyDefinitions. */
  formatCurrency: (amount: number | null | undefined, options?: CurrencyFormatOptions) => string;
  /** Number without symbol. */
  formatAmount: (amount: number | null | undefined, options?: CurrencyFormatOptions) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const currencyCode = useCurrencyStore((s) => s.currencyCode);
  const setCurrencyCode = useCurrencyStore((s) => s.setCurrencyCode);
  const setGlyphFontLoaded = useCurrencyStore((s) => s.setGlyphFontLoaded);

  // Loaded at runtime (no native rebuild needed); glyphs fall back to "AED " until ready.
  const [fontLoaded] = useFonts({
    [CURRENCY_FONT_FAMILY]: require('../../../assets/fonts/GymBiosCurrency.ttf'),
  });
  useEffect(() => {
    setGlyphFontLoaded(fontLoaded);
  }, [fontLoaded, setGlyphFontLoaded]);

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currencyCode,
      currency: getCurrencyDefinition(currencyCode),
      setCurrencyCode,
      // Pin the code captured by this render so memoized consumers re-run on change.
      formatCurrency: (amount, options) => formatCurrency(amount, { code: currencyCode, ...options }),
      formatAmount: (amount, options) => formatAmount(amount, { code: currencyCode, ...options }),
    }),
    [currencyCode, setCurrencyCode],
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return ctx;
}

interface FinancialSettingRow {
  settingKey?: string;
  setting_key?: string;
  settingValue?: string;
  setting_value?: string;
}

/**
 * Pulls the display currency the gym admin chose on the web Settings page. It is
 * branch-scoped on the backend, so this re-fetches whenever the tenant or the
 * active branch changes. Mounted from BranchProvider, which owns the branch header.
 */
export function useDisplayCurrencySync(branchId: number | 'ALL') {
  const session = useAuthStore((s) => s.session);
  const activeTenant = useAuthStore((s) => s.activeTenant);
  const setCurrencyCode = useCurrencyStore((s) => s.setCurrencyCode);

  const { data } = useQuery({
    queryKey: ['display-currency', session?.user?.id, activeTenant, branchId],
    queryFn: async () => {
      const { data: rows } = await apiClient.get<FinancialSettingRow[]>('/financial-settings', {
        params: { category: 'APP_PREFERENCES' },
        skipGlobalErrorToast: true,
      });
      const row = (rows ?? []).find((r) => (r.settingKey ?? r.setting_key) === 'currency_code');
      const saved = row?.settingValue ?? row?.setting_value;
      // No saved value for this branch means the default — same rule as the web app.
      return isCurrencyCode(saved) ? saved : DEFAULT_CURRENCY;
    },
    enabled: !!session,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  useEffect(() => {
    if (data) setCurrencyCode(data);
  }, [data, setCurrencyCode]);
}

const glyphBaseStyle: TextStyle = {
  fontFamily: CURRENCY_FONT_FAMILY,
  // The font has one weight; keep platforms from synthesising bold/italic differently.
  fontWeight: 'normal',
  fontStyle: 'normal',
};

/**
 * The currency symbol on its own. Safe to nest inside any <Text>/<Typography>:
 * it inherits size and colour, and AED renders the real Dirham sign.
 */
export function CurrencyGlyph({ code, style }: { code?: CurrencyCode; style?: StyleProp<TextStyle> }) {
  const activeCode = useCurrencyStore((s) => s.currencyCode);
  const fontLoaded = useCurrencyStore((s) => s.glyphFontLoaded);
  const def = getCurrencyDefinition(code ?? activeCode);

  if (def.fontGlyph && fontLoaded) {
    return <Text style={[style, glyphBaseStyle]}>{def.fontGlyph}</Text>;
  }
  return <Text style={style}>{def.textPrefix.trim()}</Text>;
}

interface CurrencyValueProps extends Omit<TextProps, 'children'> {
  amount: number | null | undefined;
  options?: CurrencyFormatOptions;
  /** Shorthand for options.compact. */
  compact?: boolean;
  /** Shorthand for options.signed. */
  signed?: boolean;
  /** Shorthand for options.decimals. */
  decimals?: number;
  code?: CurrencyCode;
  /** Text after the amount, e.g. " / month" or " OFF". */
  suffix?: string;
}

/**
 * Symbol + amount ("$1,250", "[Dirham]1,250"). Nest it inside an existing
 * <Text>/<Typography> to inherit that typography, or pass `style`.
 */
export function CurrencyValue({ amount, options, compact, signed, decimals, code, suffix, style, ...textProps }: CurrencyValueProps) {
  const activeCode = useCurrencyStore((s) => s.currencyCode);
  const fontLoaded = useCurrencyStore((s) => s.glyphFontLoaded);
  const { sign, number, currency } = formatAmountParts(amount, {
    ...options,
    compact: compact ?? options?.compact,
    signed: signed ?? options?.signed,
    decimals: decimals ?? options?.decimals,
    code: code ?? options?.code ?? activeCode,
  });
  const useGlyph = !!currency.fontGlyph && fontLoaded;

  return (
    <Text
      style={style}
      accessibilityLabel={`${sign}${currency.textPrefix}${number}${suffix ?? ''}`}
      {...textProps}
    >
      {sign}
      {useGlyph ? <Text style={glyphBaseStyle}>{currency.fontGlyph}</Text> : currency.textPrefix}
      {number}
      {suffix}
    </Text>
  );
}
