import React from 'react';
import type { GymDataContext } from '../../utils/ai-service';
import type { BiosBranchComparisonRow, BiosSettings } from '../../utils/supabase/bios-service';
import type { StaffTarget } from '../../utils/supabase/staff-service';

/**
 * Everything the BiOS page already derives from real data, handed to the
 * design's analysis dialogs and BI Engine views. Figures the page doesn't
 * already hold come from /api/bios/insights/* (useBiosInsights below); sections
 * GymBios has no data for were removed rather than shown with made-up numbers.
 */
export interface BiosLiveData {
  /** false until the first successful load — every figure below is then a placeholder. */
  hasLiveData: boolean;
  gymData: GymDataContext | null;
  currencyCode: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  profitMargin: number;
  activeMembers: number;
  totalMembers: number;
  retentionRate: number;
  /** percentage-point change vs last month */
  retentionDelta: number;
  /** null = no previous-period base ("New") */
  revenueGrowthRate: number | null;
  memberGrowthRate: number | null;
  overallHealthScore: number;
  overallHealthLabel: string;
  performanceScore: number;
  revenuePerMember: number;
  todayCheckIns: number;
  avgSessionMinutes: number;
  /** [hour label, check-ins], busiest first */
  peakHours: Array<[string, number]>;
  monthlyRevenueTarget: number | null;
  monthlyTrend: Array<{ month: string; revenue: number; expenses: number; profit: number }>;
  revenueSources: Array<{ source: string; amount: number; percentage: number; color: string }>;
  expensesByCategory: Record<string, number>;
  membershipTypes: Record<string, number>;
  /** per membership type: total members, currently active, expired */
  membershipTypeStats: Record<string, { total: number; active: number; expired: number }>;
  /** rolling months: cumulative members, retention %, churn %, joins in that month */
  memberTrend: Array<{ month: string; members: number; retention: number; churn: number; newMembers: number }>;
  recentJoins: number;
  expiredMembers: number;
  overdueMembers: number;
  suspendedMembers: number;
  topStaff: StaffTarget[];
  branchComparison: BiosBranchComparisonRow[];
  /** Saved BiOS Configuration (targets, alerts, schedule, benchmarks); null until loaded. */
  settings: BiosSettings | null;
  /** Changes with the active branch — reload key for the dialogs' insight fetches. */
  branchKey: string | number;
  /** Downloads the KPI summary CSV and logs it as a report. */
  onExportReport: () => void;
  /** Downloads the full data CSV and logs it as an export. */
  onExportData: () => void;
  /** Opens BiOS Configuration (targets / alerts / schedule / benchmarks). */
  onConfigure: () => void;
}

export const formatSignedPercent = (value: number | null) =>
  value === null ? 'New' : `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

export const clampPercent = (value: number) => Math.min(100, Math.max(0, Number.isFinite(value) ? value : 0));

/** Chart tooltip formatter: 125750 -> "126K AED". */
export const compactCurrency = (value: number, currencyCode: string) =>
  `${(Number(value) / 1000).toFixed(0)}K ${currencyCode}`;

const toCsvCell = (value: unknown) => {
  const s = value == null ? '' : String(value);
  return `"${s.replace(/"/g, '""')}"`;
};

export const downloadCsv = (filename: string, header: string[], rows: Array<Array<unknown>>) => {
  const csv = [header.map(toCsvCell).join(','), ...rows.map((r) => r.map(toCsvCell).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/**
 * Loads one /api/bios/insights group the first time `enabled` turns true (a
 * dialog opening), and again whenever `reloadKey` changes (e.g. the branch).
 */
export function useBiosInsights<T>(load: () => Promise<T>, enabled: boolean, reloadKey: unknown = null) {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const loadedKey = React.useRef<unknown>(undefined);

  React.useEffect(() => {
    if (!enabled || loadedKey.current === reloadKey) return;
    let cancelled = false;
    loadedKey.current = reloadKey;
    setLoading(true);
    setError(null);
    load()
      .then((result) => { if (!cancelled) setData(result); })
      .catch((e) => {
        if (cancelled) return;
        loadedKey.current = undefined;
        setError(e instanceof Error ? e.message : 'Failed to load');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, reloadKey]);

  return { data, loading, error };
}

/** Placeholder while an insights group loads, or when it failed to. */
export function InsightsStatus({ loading, error }: { loading: boolean; error: string | null }) {
  if (error) return <p className="text-sm text-red-600 py-6 text-center">{error}</p>;
  if (loading) return <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>;
  return null;
}

/** Shown where a section has nothing recorded yet, instead of an empty chart. */
export function NoData({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground py-6 text-center">{children}</p>;
}

/**
 * Every automated BiOS job (see BiosScheduler on the backend) with its real
 * settings — the reports/alerts this branch actually has, not a design mock-up.
 */
export function biosSchedules(settings: BiosSettings | null) {
  const weekly = (settings?.schedule_frequency ?? 'WEEKLY') !== 'MONTHLY';
  return [
    {
      name: 'BiOS Business Summary',
      schedule: weekly ? 'Mondays at 7:30 AM' : '1st of the month at 7:30 AM',
      condition: weekly ? 'Covers the previous 7 days' : 'Covers the previous month',
      recipients: settings?.schedule_email || '—',
      enabled: !!settings?.schedule_enabled
    },
    {
      name: 'Retention Alert',
      schedule: 'Daily at 8:00 AM',
      condition: `When retention drops below ${settings?.alert_retention_threshold ?? 80}%`,
      recipients: settings?.alert_email || '—',
      enabled: !!settings?.alert_enabled
    },
    {
      name: 'Revenue Pace Alert',
      schedule: 'Daily at 8:15 AM',
      condition: settings?.monthly_revenue_target
        ? `When month-end projection is under ${settings?.revenue_alert_threshold_percent ?? 90}% of target`
        : 'Needs a monthly revenue target',
      recipients: settings?.alert_email || '—',
      enabled: !!settings?.revenue_alert_enabled
    },
    {
      name: 'Month-end Member Snapshot',
      schedule: '1st of the month at 12:30 AM',
      condition: 'Records member counts for the trend chart',
      recipients: 'System',
      enabled: true
    }
  ];
}

export function BiosScheduleTable({ settings, onConfigure }: { settings: BiosSettings | null; onConfigure: () => void }) {
  const rows = biosSchedules(settings);
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4 font-medium">Report / Alert</th>
              <th className="py-2 pr-4 font-medium">Schedule</th>
              <th className="py-2 pr-4 font-medium">When</th>
              <th className="py-2 pr-4 font-medium">Recipients</th>
              <th className="py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-b">
                <td className="py-2 pr-4 font-medium">{row.name}</td>
                <td className="py-2 pr-4">{row.schedule}</td>
                <td className="py-2 pr-4 text-muted-foreground">{row.condition}</td>
                <td className="py-2 pr-4">{row.recipients}</td>
                <td className="py-2">
                  <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${row.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {row.enabled ? 'On' : 'Off'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Emails go out only when SMTP is configured on the server.{' '}
        <button type="button" style={{ textDecoration: 'underline' }} onClick={onConfigure}>Change these in BiOS Configuration</button>
      </p>
    </div>
  );
}

export const WEEKDAY_LABELS =['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const hourLabel = (hour: number) =>
  hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;

/** % change, or null when there's no previous value to compare with. */
export const changePercent = (current: number, previous: number): number | null =>
  previous !== 0 ? Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1)) : (current > 0 ? null : 0);

export const shareOf = (part: number, whole: number) => (whole > 0 ? Number(((part / whole) * 100).toFixed(1)) : 0);
