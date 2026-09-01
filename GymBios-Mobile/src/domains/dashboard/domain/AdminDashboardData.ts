export type AdminReportType =
  | 'total-collections'
  | 'membership-sales'
  | 'pos-revenue'
  | 'pt-sales'
  | 'day-pass'
  | 'check-ins'
  | 'active-members'
  | 'churn-rate'
  | 'retention-rate'
  | null;

export interface AdminKpiItem {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: string;
  color: string;
  clickable: boolean;
}

export interface AdminPaymentMixItem {
  mode: string;
  amount: string;
  percentage: number;
  color: string;
}

export interface AdminAlertItem {
  text: string;
  urgent: boolean;
}

export interface AdminOperationalHighlight {
  label: string;
  value: string;
  color?: string;
}

export interface AdminReportRow {
  [key: string]: string | number;
}

export interface AdminDashboardData {
  branch: string;
  dateText: string;
  kpis: AdminKpiItem[];
  paymentMix: AdminPaymentMixItem[];
  alerts: AdminAlertItem[];
  highlights: AdminOperationalHighlight[];
}
