import type { ReactNode } from 'react';

import { CurrencyValue, formatCurrency } from '@/core/providers';

/**
 * Presentation-only formatting for the Admin Dashboard. The backend returns
 * raw numeric values; money is shown compactly ("1.2K", "3.4M", or "2.4L" for
 * INR) in the gym's display currency from the web Settings page. The API's own
 * `currency` field is the accounting base currency, so it is not used here.
 */

/** Compact money as a node — renders the real Dirham sign for AED. */
export function formatCompactCurrency(amount: number | null | undefined): ReactNode {
  if (amount === null || amount === undefined) return '—';
  return <CurrencyValue amount={amount} compact />;
}

/** Plain-text twin of formatCompactCurrency, for accessibility labels. */
export function formatCompactCurrencyText(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return '—';
  return formatCurrency(amount, { compact: true });
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-IN');
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}%`;
}

export function formatKpiValue(unit: string, value: number | null): ReactNode {
  if (value === null) return '—';
  if (unit === 'currency') return formatCompactCurrency(value);
  if (unit === 'percent') return formatPercent(value);
  return formatCount(value);
}

export function formatKpiValueText(unit: string, value: number | null): string {
  if (value === null) return '—';
  if (unit === 'currency') return formatCompactCurrencyText(value);
  if (unit === 'percent') return formatPercent(value);
  return formatCount(value);
}

export function formatChange(changePercent: number | null): { text: string; trend: 'up' | 'down' } {
  if (changePercent === null) return { text: '—', trend: 'up' };
  const trend: 'up' | 'down' = changePercent >= 0 ? 'up' : 'down';
  const text = `${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%`;
  return { text, trend };
}

/** Formats a value for a generic report-table cell based on its column header. */
export function formatReportCell(value: string | number | null, columnLabel: string): ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    const label = columnLabel.toLowerCase();
    if (label.includes('growth') || label.includes('rate') || label.includes('share') || label.includes('trend')) {
      return formatPercent(value);
    }
    if (label.includes('amount') || label.includes('sales') || label.includes('revenue') || label.includes('ticket')) {
      return formatCompactCurrency(value);
    }
    return formatCount(value);
  }
  return String(value);
}
