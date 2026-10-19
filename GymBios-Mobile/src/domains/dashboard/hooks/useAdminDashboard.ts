import { useQuery } from '@tanstack/react-query';
import { format, isToday } from 'date-fns';
import { BrandColors } from '@/core/theme';
import type {
  AdminAlertItem,
  AdminDashboardData,
  AdminKpiItem,
  AdminOperationalHighlight,
  AdminPaymentMixItem,
  AdminReportType,
} from '../domain/AdminDashboardData';
import { useBranchContext } from '@/shared/providers/BranchProvider';
import { adminDashboardRepository } from '../infrastructure/ApiAdminDashboardRepository';
import type { AdminDashboardKpiApi, AdminDashboardResponseApi } from '../infrastructure/AdminDashboardApiModels';
import { formatChange, formatCompactCurrency, formatKpiValue, formatKpiValueText } from '../utils/adminDashboardFormat';

import { formatDate, tOr } from '@/core/i18n/format';
import i18n from '@/core/i18n/i18n';

// Purely structural placeholder for the brief window before the first real
// response arrives (or after a failed request) — every value is a genuine
// "no data yet" marker, never a plausible-looking fabricated number, so it
// can never be mistaken for real data by whoever is looking at the screen.
const EMPTY_ADMIN_DASHBOARD: AdminDashboardData = {
  branch: '',
  dateText: '',
  kpis: [],
  paymentMix: [],
  alerts: [],
  highlights: [],
};

// Icon/color are presentation-only concerns the backend has no business
// dictating — kept here, keyed by the KPI id the backend does send.
const KPI_STYLE: Record<string, { icon: string; color: string }> = {
  'total-collections': { icon: 'dollar-sign', color: '#22C55E' },
  'membership-sales': { icon: 'user-check', color: BrandColors.teal },
  'pos-revenue': { icon: 'shopping-bag', color: BrandColors.memberGold },
  'pt-sales': { icon: 'users', color: BrandColors.trainerAmber },
  'day-pass': { icon: 'credit-card', color: '#3B82F6' },
  'check-ins': { icon: 'trending-up', color: '#A855F7' },
  'active-members': { icon: 'users', color: BrandColors.teal },
  'churn-rate': { icon: 'user-minus', color: '#EF4444' },
  'retention-rate': { icon: 'user-plus', color: '#16A34A' },
};

const KPI_I18N_KEYS: Record<string, string> = {
  'total-collections': 'dashboard.admin.kpis.totalCollections',
  'membership-sales': 'dashboard.admin.kpis.membershipSales',
  'pos-revenue': 'dashboard.admin.kpis.posRevenue',
  'pt-sales': 'dashboard.admin.kpis.ptSales',
  'day-pass': 'dashboard.admin.kpis.dayPass',
  'check-ins': 'dashboard.admin.kpis.checkIns',
  'active-members': 'dashboard.admin.kpis.activeMembers',
  'churn-rate': 'dashboard.admin.kpis.churnRate',
  'retention-rate': 'dashboard.admin.kpis.retentionRate',
};

const PAYMENT_MODE_COLORS: Record<string, string> = {
  Card: BrandColors.teal,
  Cash: BrandColors.memberGold,
  Online: BrandColors.trainerAmber,
  'Bank Transfer': '#3B82F6',
  Wallet: '#A855F7',
};
const FALLBACK_PAYMENT_COLOR = '#94A3B8';

const PAYMENT_MODE_I18N_KEYS: Record<string, string> = {
  Card: 'dashboard.admin.paymentModes.Card',
  Cash: 'dashboard.admin.paymentModes.Cash',
  Online: 'dashboard.admin.paymentModes.Online',
  'Bank Transfer': 'dashboard.admin.paymentModes.BankTransfer',
  Wallet: 'dashboard.admin.paymentModes.Wallet',
};

// Accent colors for highlights that need attention, keyed by highlight id.
// Applied only when the count is non-zero so an all-clear row stays neutral.
const HIGHLIGHT_COLORS: Record<string, string> = {
  'renewals-due': '#DC2626',
  'pending-follow-ups': '#CA8A04',
};

const HIGHLIGHT_I18N_KEYS: Record<string, string> = {
  'renewals-due': 'dashboard.admin.highlights.renewalsDue',
  'pending-follow-ups': 'dashboard.admin.highlights.pendingFollowUps',
  'expiring-soon': 'dashboard.admin.highlights.expiringSoon',
  'birthdays-today': 'dashboard.admin.highlights.birthdaysToday',
};

export const adminDashboardKeys = {
  all: ['dashboard', 'admin'] as const,
};

function mapKpi(kpi: AdminDashboardKpiApi): AdminKpiItem {
  const style = KPI_STYLE[kpi.id] ?? { icon: 'bar-chart-2', color: '#64748B' };
  const { text, trend } = formatChange(kpi.change_percent);
  const label = KPI_I18N_KEYS[kpi.id] ? tOr(KPI_I18N_KEYS[kpi.id], kpi.label) : kpi.label;
  return {
    id: kpi.id,
    label,
    value: kpi.available ? formatKpiValue(kpi.unit, kpi.value) : 'N/A',
    valueText: kpi.available ? formatKpiValueText(kpi.unit, kpi.value) : 'N/A',
    change: kpi.available ? text : '—',
    trend,
    icon: style.icon,
    color: style.color,
    clickable: kpi.clickable,
  };
}

function mapPaymentMix(api: AdminDashboardResponseApi): AdminPaymentMixItem[] {
  return api.payment_mix.map((pm) => ({
    mode: PAYMENT_MODE_I18N_KEYS[pm.mode] ? tOr(PAYMENT_MODE_I18N_KEYS[pm.mode], pm.mode) : pm.mode,
    amount: formatCompactCurrency(pm.amount),
    percentage: pm.percentage,
    color: PAYMENT_MODE_COLORS[pm.mode] ?? FALLBACK_PAYMENT_COLOR,
  }));
}

function mapAlerts(api: AdminDashboardResponseApi): AdminAlertItem[] {
  return api.alerts.map((a) => ({ text: a.text, urgent: a.urgent }));
}

function mapHighlights(api: AdminDashboardResponseApi): AdminOperationalHighlight[] {
  return api.operational_highlights.map((h) => ({
    label: HIGHLIGHT_I18N_KEYS[h.id] ? tOr(HIGHLIGHT_I18N_KEYS[h.id], h.label) : h.label,
    value: h.value,
    color: parseInt(h.value, 10) > 0 ? HIGHLIGHT_COLORS[h.id] : undefined,
  }));
}

function formatDateText(fromIso: string, toIso: string): string {
  const from = new Date(`${fromIso}T00:00:00`);
  const to = new Date(`${toIso}T00:00:00`);
  if (fromIso === toIso) {
    const formattedDate = formatDate(from, 'MMM d, yyyy');
    return isToday(from)
      ? (i18n.t('dashboard.admin.todayPrefix', { date: formattedDate }) as string)
      : formattedDate;
  }
  return `${formatDate(from, 'MMM d, yyyy')} – ${formatDate(to, 'MMM d, yyyy')}`;
}

function mapDashboard(api: AdminDashboardResponseApi): AdminDashboardData {
  return {
    branch: api.branch.all_branches ? (i18n.t('dashboard.admin.allBranches') as string) : api.branch.branch_name,
    dateText: formatDateText(api.from, api.to),
    kpis: api.kpis.map(mapKpi),
    paymentMix: mapPaymentMix(api),
    alerts: mapAlerts(api),
    highlights: mapHighlights(api),
  };
}

export interface AdminDashboardDateRange {
  from: string; // ISO yyyy-MM-dd
  to: string; // ISO yyyy-MM-dd
}

export function todayRange(): AdminDashboardDateRange {
  const today = format(new Date(), 'yyyy-MM-dd');
  return { from: today, to: today };
}

export function useAdminDashboard(range: AdminDashboardDateRange) {
  const { selectedBranchId } = useBranchContext();

  const query = useQuery({
    queryKey: [...adminDashboardKeys.all, selectedBranchId, range.from, range.to],
    queryFn: async (): Promise<AdminDashboardData> => {
      const api = await adminDashboardRepository.getAdminDashboard(range);
      return mapDashboard(api);
    },
    staleTime: 1000 * 60 * 2,
  });

  return {
    ...query,
    data: query.data ?? EMPTY_ADMIN_DASHBOARD,
  };
}

export function useAdminReport(reportType: AdminReportType, range: AdminDashboardDateRange) {
  const { selectedBranchId } = useBranchContext();

  return useQuery({
    queryKey: [...adminDashboardKeys.all, 'report', reportType, selectedBranchId, range.from, range.to],
    queryFn: () => adminDashboardRepository.getAdminReport(reportType as string, range),
    enabled: !!reportType,
    staleTime: 1000 * 60 * 2,
  });
}
