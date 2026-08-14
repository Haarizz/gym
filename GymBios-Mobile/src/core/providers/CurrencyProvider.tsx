import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';

export type CurrencyCode = 'AED' | 'INR' | 'USD' | 'EUR' | 'GBP' | 'SAR';

export interface CurrencyDefinition {
  code: CurrencyCode;
  name: string;
  textPrefix: string;
}

export const CURRENCIES: CurrencyDefinition[] = [
  { code: 'AED', name: 'UAE Dirham', textPrefix: 'AED ' },
  { code: 'INR', name: 'Indian Rupee', textPrefix: '₹' },
  { code: 'USD', name: 'US Dollar', textPrefix: '$' },
  { code: 'EUR', name: 'Euro', textPrefix: '€' },
  { code: 'GBP', name: 'British Pound', textPrefix: '£' },
  { code: 'SAR', name: 'Saudi Riyal', textPrefix: 'SAR ' },
];

const DEFAULT_CURRENCY: CurrencyCode = 'AED';

interface CurrencyContextValue {
  currencyCode: CurrencyCode;
  currency: CurrencyDefinition;
  setCurrencyCode: (code: CurrencyCode) => void;
  formatCurrency: (amount: number, options?: Intl.NumberFormatOptions) => string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(DEFAULT_CURRENCY);

  const currency = useMemo(
    () => CURRENCIES.find((c) => c.code === currencyCode) ?? CURRENCIES[0],
    [currencyCode]
  );

  const formatCurrency = useCallback(
    (amount: number, options?: Intl.NumberFormatOptions) => {
      const formatted = (amount ?? 0).toLocaleString(undefined, options);
      return `${currency.textPrefix}${formatted}`;
    },
    [currency]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      currencyCode,
      currency,
      setCurrencyCode,
      formatCurrency,
    }),
    [currencyCode, currency, formatCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Fallback if context is not mounted
    const def = CURRENCIES[0];
    return {
      currencyCode: DEFAULT_CURRENCY,
      currency: def,
      setCurrencyCode: () => {},
      formatCurrency: (amt: number) => `${def.textPrefix}${(amt ?? 0).toLocaleString()}`,
    };
  }
  return ctx;
}

export function CurrencyGlyph({ code, style }: { code?: CurrencyCode; style?: StyleProp<TextStyle> }) {
  const { currencyCode, currency } = useCurrency();
  const def = code ? CURRENCIES.find((c) => c.code === code) ?? currency : currency;
  return <Text style={style}>{def.textPrefix.trim()}</Text>;
}

export function CurrencyValue({
  amount,
  code,
  style,
}: {
  amount: number;
  code?: CurrencyCode;
  style?: StyleProp<TextStyle>;
}) {
  const { currencyCode, currency } = useCurrency();
  const def = code ? CURRENCIES.find((c) => c.code === code) ?? currency : currency;
  const formatted = (amount ?? 0).toLocaleString();
  return (
    <Text style={style}>
      {def.textPrefix}
      {formatted}
    </Text>
  );
}
