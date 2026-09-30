export interface ReportRowProps {
  title: string;
  subtitle?: string;
  /** String or inline node such as <CurrencyValue />. */
  value: React.ReactNode;
  trend?: string;
  hideDivider?: boolean;
}