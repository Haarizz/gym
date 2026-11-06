/**
 * GymBios universal report export: describe a report once as a ReportDocument (see types.ts),
 * render <ReportActions report={...}/> next to it, and the shared engine produces the A4 PDF, the
 * formatted .xlsx workbook and the print layout — same company header, filters and data in all three.
 */
export * from "./types";
export { ReportActions, useReportExporter, type ReportSource } from "./ReportActions";
export { CHART_PALETTE } from "./chart-svg";
export { formatDate, formatDateTime, isoDay, toDate } from "./format";
export * from "./builders";
