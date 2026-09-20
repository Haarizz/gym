/**
 * Presentation-only formatting for the Admin Dashboard. The backend returns
 * raw numeric values/currency codes; this keeps the existing screen's visual
 * style (compact Indian-notation currency like "₹2.4L") without touching the
 * shared, AED-first CurrencyProvider used elsewhere in the app, which the
 * Admin Dashboard has never used and which doesn't support this compact
 * lakh/crore notation.
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  AED: 'AED ',
  USD: '$',
  EUR: '€',
  GBP: '£',
  SAR: 'SAR ',
};

export function formatCompactCurrency(amount: number | null | undefined, currency = 'INR'): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `;
  if (amount === null || amount === undefined) return `${symbol}—`;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_00_00_000) return `${sign}${symbol}${(abs / 1_00_00_000).toFixed(1)}Cr`;
  if (abs >= 1_00_000) return `${sign}${symbol}${(abs / 1_00_000).toFixed(1)}L`;
  if (abs >= 1_000) return `${sign}${symbol}${(abs / 1_000).toFixed(1)}K`;
  return `${sign}${symbol}${abs.toLocaleString('en-IN')}`;
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return value.toLocaleString('en-IN');
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  return `${value.toFixed(1)}%`;
}

export function formatKpiValue(unit: string, value: number | null, currency: string): string {
  if (value === null) return '—';
  if (unit === 'currency') return formatCompactCurrency(value, currency);
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
export function formatReportCell(value: string | number | null, columnLabel: string, currency: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    const label = columnLabel.toLowerCase();
    if (label.includes('growth') || label.includes('rate') || label.includes('share') || label.includes('trend')) {
      return formatPercent(value);
    }
    if (label.includes('amount') || label.includes('sales') || label.includes('revenue') || label.includes('ticket')) {
      return formatCompactCurrency(value, currency);
    }
    return formatCount(value);
  }
  return String(value);
}
