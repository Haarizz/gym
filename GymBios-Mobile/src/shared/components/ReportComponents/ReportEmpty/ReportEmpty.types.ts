/**
 * Props for the ReportEmpty component.
 * Renders a centered empty-state message.
 * Intentionally generic – no business domain terminology.
 */
export interface ReportEmptyProps {
  /** Short headline for the empty state (e.g. "No data available"). */
  title: string;

  /** Optional supporting sentence to help the user understand the empty state. */
  description?: string;
}
