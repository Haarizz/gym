import React from 'react';
import { FlaskConical } from 'lucide-react';
import type { GymDataContext } from '../../utils/ai-service';
import type { BiosBranchComparisonRow } from '../../utils/supabase/bios-service';
import type { StaffTarget } from '../../utils/supabase/staff-service';

/**
 * Everything the BiOS page already derives from real data, handed to the
 * design's analysis dialogs and BI Engine views so they show live figures
 * wherever a source exists. Sections without a backend source keep the
 * design's illustrative values and carry a <SampleDataBadge />.
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
 * Marks a section whose numbers are illustrative — there is no data source for
 * it in GymBios yet — so nobody mistakes them for their gym's figures.
 */
export function SampleDataBadge({ className = '' }: { className?: string }) {
  return (
    <span
      title="Illustrative figures — this section has no connected data source yet"
      className={`inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 whitespace-nowrap ${className}`}
    >
      <FlaskConical className="h-3 w-3" />
      Sample data
    </span>
  );
}

/** A CardTitle row with the sample badge pushed to the right. */
export function SampleTitle({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center justify-between gap-2 w-full">
      <span>{children}</span>
      <SampleDataBadge />
    </span>
  );
}
