/**
 * Wire shapes returned by GET /api/mobile/admin/dashboard and
 * GET /api/mobile/admin/dashboard/report.
 *
 * The backend has a GLOBAL Jackson setting
 * (spring.jackson.property-naming-strategy=SNAKE_CASE in application.properties)
 * that snake_cases every DTO's bean properties app-wide — confirmed on the
 * wire (branch_id, all_branches, change_percent, payment_mix, ...). These
 * interfaces intentionally mirror that snake_case shape rather than the
 * camelCase Java getter names. Dynamic report row keys (e.g. "Branch",
 * "Amount") are plain Map<String,Object> entries, not bean properties, so
 * Jackson leaves those keys untouched regardless of this setting.
 */

export interface AdminDashboardBranchContextApi {
  branch_id: number | null;
  branch_name: string;
  all_branches: boolean;
}

export interface AdminDashboardKpiApi {
  id: string;
  label: string;
  unit: 'currency' | 'count' | 'percent';
  value: number | null;
  change_percent: number | null;
  clickable: boolean;
  available: boolean;
}

export interface AdminDashboardAlertApi {
  text: string;
  urgent: boolean;
  type: string;
}

export interface AdminDashboardPaymentMixItemApi {
  mode: string;
  amount: number;
  percentage: number;
}

export interface AdminDashboardOperationalHighlightApi {
  label: string;
  value: string;
}

export interface AdminDashboardResponseApi {
  branch: AdminDashboardBranchContextApi;
  from: string;
  to: string;
  currency: string;
  kpis: AdminDashboardKpiApi[];
  alerts: AdminDashboardAlertApi[];
  payment_mix: AdminDashboardPaymentMixItemApi[];
  operational_highlights: AdminDashboardOperationalHighlightApi[];
}

export interface AdminDashboardReportResponseApi {
  report_type: string;
  branch: AdminDashboardBranchContextApi;
  from: string;
  to: string;
  currency: string;
  columns: string[];
  rows: Array<Record<string, string | number | null>>;
  total_entries: number;
  aggregate_total: number | null;
  page: number;
  page_size: number;
  total_pages: number;
}
