/**
 * ReportComponents – reusable UI primitives for composing business reports.
 *
 * Every report in the application should be built by composing these
 * primitives instead of writing custom layouts.  This keeps the visual
 * language consistent and isolates business data from presentation concerns.
 *
 * Usage:
 * ```tsx
 * import {
 *   ReportSection,
 *   ReportMetric,
 *   ReportListItem,
 *   ReportEmpty,
 * } from '@/shared/components/ReportComponents';
 * ```
 */
export * from './ReportSection';
export * from './ReportMetric';
export * from './ReportListItem';
export * from './ReportEmpty';

export * from './ReportRow';
export * from './ReportFooterAction';
