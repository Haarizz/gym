/**
 * Props for the ReportMetric component.
 * Renders a single KPI card with an optional trend indicator.
 * Intentionally generic – no business domain terminology.
 */
export interface ReportMetricProps {
  /** Descriptive label shown above the value (e.g. "Total Revenue"). */
  label: string;

  /** Formatted value string (e.g. "₹4.2L", "$1,024", "98%"). */
  value: string;

  /**
   * Optional trend / change text displayed below the value
   * (e.g. "+8%", "-2 members", "−₹300").
   */
  change?: string;

  /**
   * Semantic category that drives the trend colour.
   * - 'positive' → green
   * - 'negative' → red / error
   * - 'neutral'  → muted / secondary
   *
   * Defaults to 'neutral' when omitted.
   */
  changeType?: 'positive' | 'negative' | 'neutral';
  tone?: ReportMetricTone;
}

export type ReportMetricTone = 'default' | 'teal' | 'amber';
