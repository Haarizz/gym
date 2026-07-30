import type { ReactNode } from 'react';

/**
 * Props for the ReportSection component.
 * Renders a titled section block with a divider and slotted children.
 * Intentionally generic – no business domain terminology.
 */
export interface ReportSectionProps {
  /** Heading text displayed above the divider. */
  title: string;

  /** Content rendered below the divider. */
  children: ReactNode;
}
