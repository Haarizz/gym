/**
 * Props for the ReportListItem component.
 * Renders one row inside a report list.
 * Intentionally generic – no business domain terminology.
 */
export interface ReportListItemProps {
  /** Primary label for the row (e.g. "Premium Membership", "Rahul Sharma"). */
  title: string;

  /** Optional secondary detail line shown below the title. */
  subtitle?: string;

  /** Optional trailing value shown on the right (e.g. "Active", or a <CurrencyValue />). */
  value?: React.ReactNode;

  /** When true the bottom divider is hidden. Useful for the last item in a list. */
  hideDivider?: boolean;
}
