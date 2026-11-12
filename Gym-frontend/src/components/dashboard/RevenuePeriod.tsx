import React, { useEffect, useState } from 'react';
import { Card, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../ui/utils";
import { AlertTriangle, Calendar as CalendarIcon, RefreshCw } from 'lucide-react';
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear
} from 'date-fns';
import {
  dashboardService,
  type RevenueCompareMode,
  type RevenueGranularity,
  type RevenueSummary
} from "../../utils/supabase/dashboard-service";
import { formatRange } from "./RevenueReports";
import reportStyles from "./RevenueReports.module.css";

export type FilterType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';
type PresetType = Exclude<FilterType, 'custom'>;

export interface DateRange {
  from: Date;
  to: Date;
}

// Labelled by the period each preset covers (see presetRange) — "Daily" used to read
// as "today" although it shows the last 7 days, one point per day.
const PRESETS: { type: PresetType; label: string }[] = [
  { type: 'hourly', label: 'Today' },
  { type: 'daily', label: 'Last 7 Days' },
  { type: 'weekly', label: 'This Week' },
  { type: 'monthly', label: 'This Month' },
  { type: 'quarterly', label: 'This Quarter' },
  { type: 'yearly', label: 'This Year' },
];

/** Each preset is a window plus the trend-chart bucket size that suits it. */
function presetRange(type: PresetType): { range: DateRange; granularity: RevenueGranularity } {
  const now = new Date();
  switch (type) {
    case 'hourly':
      return { range: { from: now, to: now }, granularity: 'hourly' };
    case 'daily':
      return { range: { from: subDays(now, 6), to: now }, granularity: 'daily' };
    case 'weekly':
      return { range: { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfWeek(now, { weekStartsOn: 1 }) }, granularity: 'daily' };
    case 'monthly':
      return { range: { from: startOfMonth(now), to: endOfMonth(now) }, granularity: 'daily' };
    case 'quarterly':
      return { range: { from: startOfQuarter(now), to: endOfQuarter(now) }, granularity: 'weekly' };
    case 'yearly':
      return { range: { from: startOfYear(now), to: endOfYear(now) }, granularity: 'monthly' };
  }
}

/**
 * Period, comparison mode and revenue summary shared by the Revenue, Business Insights
 * and Sales Reports tabs, so switching between them keeps the selected period.
 * Nothing is fetched while `enabled` is false (e.g. on the Overview tab).
 */
export function useRevenuePeriod(refreshKey: number, enabled: boolean) {
  const [filterType, setFilterType] = useState<FilterType>('monthly');
  const [dateRange, setDateRange] = useState<DateRange>(() => presetRange('monthly').range);
  const [granularity, setGranularity] = useState<RevenueGranularity | undefined>('daily');
  const [compareMode, setCompareMode] = useState<RevenueCompareMode>('previous');

  const [data, setData] = useState<RevenueSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const fromKey = format(dateRange.from, 'yyyy-MM-dd');
  const toKey = format(dateRange.to, 'yyyy-MM-dd');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    dashboardService.getRevenueSummary(fromKey, toKey, granularity, compareMode)
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data) {
          setData(res.data);
        } else {
          setError(res?.error || 'Could not load revenue data');
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Could not load revenue data');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [enabled, fromKey, toKey, granularity, compareMode, refreshKey, reloadKey]);

  const applyPreset = (type: PresetType) => {
    const preset = presetRange(type);
    setFilterType(type);
    setDateRange(preset.range);
    setGranularity(preset.granularity);
  };

  const applyCustom = (range: DateRange) => {
    setDateRange(range);
    setGranularity(undefined); // let the backend pick a bucket size for the span
    setFilterType('custom');
  };

  const rangeLabel = fromKey === toKey
    ? format(dateRange.from, 'MMM dd, yyyy')
    : `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;

  return {
    filterType,
    dateRange,
    granularity,
    compareMode,
    setCompareMode,
    applyPreset,
    applyCustom,
    fromKey,
    toKey,
    rangeLabel,
    compareText: compareMode === 'last-year' ? 'vs last year' : 'vs previous period',
    data,
    isLoading,
    error,
    reload: () => setReloadKey((k) => k + 1),
    /** Bumps on the parent's Refresh and on Retry, for child fetches */
    refreshKey: refreshKey + reloadKey,
  };
}

export type RevenuePeriod = ReturnType<typeof useRevenuePeriod>;

/** Tab title, period presets, custom range, compare switch and load error. */
export function PeriodHeader({
  period,
  title,
  description,
  actions
}: {
  period: RevenuePeriod;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  const [draftRange, setDraftRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { data, isLoading, error } = period;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && data && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Badge variant="outline" className="text-sm">{period.rangeLabel}</Badge>
          {actions}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map(({ type, label }) => (
            <Button
              key={type}
              variant={period.filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => period.applyPreset(type)}
              className={period.filterType === type ? "bg-primary text-white" : ""}
            >
              {label}
            </Button>
          ))}
        </div>

        <Popover
          open={calendarOpen}
          onOpenChange={(open) => {
            setCalendarOpen(open);
            if (open) setDraftRange({ from: period.dateRange.from, to: period.dateRange.to });
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant={period.filterType === 'custom' ? "default" : "outline"}
              size="sm"
              className={period.filterType === 'custom' ? "bg-primary text-white" : ""}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              Custom Range
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={draftRange as any}
              onSelect={(range: any) => {
                setDraftRange(range);
                if (range?.from && range?.to) {
                  period.applyCustom({ from: range.from, to: range.to });
                  setCalendarOpen(false);
                }
              }}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>

        <div className={reportStyles.compareSwitch} role="group" aria-label="Compare with">
          <span>Compare with</span>
          <button type="button" aria-pressed={period.compareMode === 'previous'} onClick={() => period.setCompareMode('previous')}>
            Previous period
          </button>
          <button type="button" aria-pressed={period.compareMode === 'last-year'} onClick={() => period.setCompareMode('last-year')}>
            Same period last year
          </button>
        </div>
        {data && (
          <span className={reportStyles.compareRange}>
            {data.toDate
              ? `Up to today: ${formatRange(data.from, data.to)} vs ${formatRange(data.previousFrom, data.previousTo)}`
              : `Comparing with ${formatRange(data.previousFrom, data.previousTo)}`}
          </span>
        )}
      </div>

      {error && (
        <Card className={cn("border-0 shadow-md bg-red-50")}>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={period.reload}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
