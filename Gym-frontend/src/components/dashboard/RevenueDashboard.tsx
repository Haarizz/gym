import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../ui/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Users,
  Calendar as CalendarIcon,
  CreditCard,
  Banknote,
  Receipt,
  Wallet,
  Dumbbell,
  Coffee,
  ShoppingBag,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import {
  format,
  parseISO,
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
  type RevenueBreakdownRow,
  type RevenueGranularity,
  type RevenueStreamKey,
  type RevenueSummary
} from "../../utils/supabase/dashboard-service";
import { CurrencyGlyph, useCurrency } from "../../utils/currency";

type FilterType = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'custom';

interface DateRange {
  from: Date;
  to: Date;
}

// GymBios palette
const COLORS = {
  primary: '#2B7A78',
  accent: '#E63946',
  cash: '#10B981',
  card: '#3B82F6',
  other: '#F59E0B',
};

const CHART_COLORS = ['#2B7A78', '#3B82F6', '#10B981', '#F59E0B', '#E63946', '#8B5CF6', '#EC4899'];

// Labelled by the period each preset covers (see presetRange) — "Daily" used to read
// as "today" although it shows the last 7 days, one point per day.
const PRESETS: { type: Exclude<FilterType, 'custom'>; label: string }[] = [
  { type: 'hourly', label: 'Today' },
  { type: 'daily', label: 'Last 7 Days' },
  { type: 'weekly', label: 'This Week' },
  { type: 'monthly', label: 'This Month' },
  { type: 'quarterly', label: 'This Quarter' },
  { type: 'yearly', label: 'This Year' },
];

/** Each preset is a window plus the trend-chart bucket size that suits it. */
function presetRange(type: Exclude<FilterType, 'custom'>): { range: DateRange; granularity: RevenueGranularity } {
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

const TREND_TITLES: Record<RevenueGranularity, string> = {
  hourly: 'Hourly Revenue Trend',
  daily: 'Daily Revenue Trend',
  weekly: 'Weekly Revenue Trend',
  monthly: 'Monthly Revenue Trend',
};

const toNumber = (v: unknown) => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const formatAmount = (v: unknown) =>
  toNumber(v).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function Money({ value }: { value: unknown }) {
  return <><CurrencyGlyph />{formatAmount(value)}</>;
}

const cardShell = "border-0 shadow-md hover:shadow-lg transition-shadow";
const tileShell = "rounded-lg bg-card p-3 shadow-sm";

interface RevenueDashboardProps {
  /** Bumped by the parent's Refresh button to re-fetch */
  refreshKey?: number;
}

export function RevenueDashboard({ refreshKey = 0 }: RevenueDashboardProps) {
  const { currencyCode } = useCurrency();
  const initial = presetRange('monthly');
  const [dateFilterType, setDateFilterType] = useState<FilterType>('monthly');
  const [dateRange, setDateRange] = useState<DateRange>(initial.range);
  const [granularity, setGranularity] = useState<RevenueGranularity | undefined>(initial.granularity);
  const [draftRange, setDraftRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('total-collection');

  const [data, setData] = useState<RevenueSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const fromKey = format(dateRange.from, 'yyyy-MM-dd');
  const toKey = format(dateRange.to, 'yyyy-MM-dd');

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    dashboardService.getRevenueSummary(fromKey, toKey, granularity)
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
  }, [fromKey, toKey, granularity, refreshKey, reloadKey]);

  const handleDateFilterChange = (type: Exclude<FilterType, 'custom'>) => {
    const preset = presetRange(type);
    setDateFilterType(type);
    setDateRange(preset.range);
    setGranularity(preset.granularity);
  };

  const rangeLabel = fromKey === toKey
    ? format(dateRange.from, 'MMM dd, yyyy')
    : `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd, yyyy')}`;

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{label ?? payload[0].name ?? payload[0].payload?.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color || entry.payload?.color }}>
              {payload.length > 1 ? `${entry.name}: ` : ''}<Money value={entry.value} />
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // KPI Card
  const KPICard = ({
    title,
    value,
    isCurrency = true,
    trend,
    trendGoodWhenUp = true,
    icon: Icon,
    tone,
    subtitle,
    cash,
    card
  }: {
    title: string;
    value: number;
    isCurrency?: boolean;
    trend?: number;
    trendGoodWhenUp?: boolean;
    icon: React.ElementType;
    tone: 'emerald' | 'red' | 'teal' | 'blue';
    subtitle?: string;
    cash?: number;
    card?: number;
  }) => {
    const toneClasses = {
      emerald: { chip: 'bg-emerald-50', icon: 'text-emerald-600', value: 'text-emerald-700' },
      red: { chip: 'bg-red-50', icon: 'text-red-600', value: 'text-red-700' },
      teal: { chip: 'bg-teal-50', icon: 'text-teal-600', value: 'text-teal-700' },
      blue: { chip: 'bg-blue-50', icon: 'text-blue-600', value: 'text-blue-700' },
    }[tone];
    const good = trend !== undefined && (trend >= 0) === trendGoodWhenUp;
    const trendColor = trend === 0 ? "text-muted-foreground" : good ? "text-green-500" : "text-red-500";
    return (
      <Card className={cardShell}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-primary">{title}</CardTitle>
          <div className={cn("p-2 rounded-lg", toneClasses.chip)}>
            <Icon className={cn("h-4 w-4", toneClasses.icon)} />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && !data ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <div className={cn("text-2xl font-bold", toneClasses.value)}>
                {isCurrency ? <Money value={value} /> : value.toLocaleString()}
              </div>
              {cash !== undefined && card !== undefined && (
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-1">
                    <Banknote className="h-3 w-3 text-green-600" />
                    <span className="text-xs text-muted-foreground">Cash: <Money value={cash} /></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3 text-blue-600" />
                    <span className="text-xs text-muted-foreground">Card: <Money value={card} /></span>
                  </div>
                </div>
              )}
              {trend !== undefined && (
                <div className="flex items-center mt-1">
                  {trend >= 0 ? (
                    <ArrowUpRight className={cn("h-4 w-4 mr-1", trendColor)} />
                  ) : (
                    <ArrowDownRight className={cn("h-4 w-4 mr-1", trendColor)} />
                  )}
                  <span className={cn("text-sm font-medium", trendColor)}>
                    {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
                  </span>
                  <span className="text-sm text-muted-foreground ml-1">vs previous period</span>
                </div>
              )}
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  // Empty state component
  const EmptyState = ({ title, message }: { title: string; message?: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-gray-100 dark:bg-gray-800 p-4 mb-4">
        <Activity className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1">No data for this period</h3>
      <p className="text-sm text-muted-foreground">
        {message ?? `${title} will appear here once transactions are recorded in this period`}
      </p>
    </div>
  );

  // For revenue streams GymBios doesn't record yet, so there is nothing to fetch
  const ComingSoon = ({ title, message }: { title: string; message: string }) => (
    <AnimatedGrid single>
      <Card className={cardShell}>
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-teal-50 p-4 mb-4">
              <Clock className="h-8 w-8 text-teal-600" />
            </div>
            <Badge variant="secondary" className="mb-2">Coming Soon</Badge>
            <h3 className="font-medium mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </CardContent>
      </Card>
    </AnimatedGrid>
  );

  const MethodTiles = ({ cash, card, other }: { cash: number; card: number; other: number }) => (
    <div className={cn("grid gap-3", other > 0 ? "grid-cols-3" : "grid-cols-2")}>
      <div className={tileShell}>
        <div className="flex items-center gap-2 mb-1">
          <Banknote className="h-4 w-4 text-green-600" />
          <p className="text-xs text-muted-foreground">Cash</p>
        </div>
        <p className="text-lg font-bold"><Money value={cash} /></p>
      </div>
      <div className={tileShell}>
        <div className="flex items-center gap-2 mb-1">
          <CreditCard className="h-4 w-4 text-blue-600" />
          <p className="text-xs text-muted-foreground">Card</p>
        </div>
        <p className="text-lg font-bold"><Money value={card} /></p>
      </div>
      {other > 0 && (
        <div className={tileShell}>
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-amber-600" />
            <p className="text-xs text-muted-foreground">Online / Other</p>
          </div>
          <p className="text-lg font-bold"><Money value={other} /></p>
        </div>
      )}
    </div>
  );

  const BreakdownList = ({
    title,
    rows,
    unit,
    icon: Icon
  }: {
    title: string;
    rows: RevenueBreakdownRow[];
    unit: string;
    icon?: React.ElementType;
  }) => (
    <div className="space-y-2">
      <p className="text-sm font-medium">{title}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing recorded in this period</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.name} className="flex items-center justify-between rounded-md bg-card p-2 shadow-sm">
              <div className="flex items-center gap-2 min-w-0">
                {Icon && <Icon className="h-4 w-4 text-primary shrink-0" />}
                <span className="text-sm truncate">{row.name}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-medium"><Money value={row.amount} /></span>
                <Badge variant="secondary">{toNumber(row.count)} {unit}</Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const AnimatedGrid = ({ children, single = false }: { children: React.ReactNode; single?: boolean }) => (
    // Plain div on purpose: a JS fade-in here could leave a freshly opened tab stuck at opacity 0
    <div className={single ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-4"}>
      {children}
    </div>
  );

  const breakdownChart = (rows: RevenueBreakdownRow[], variant: 'bar' | 'vertical-bar' | 'pie', color: string) => {
    const chartRows = rows.map((r, i) => ({ name: r.name, amount: toNumber(r.amount), color: CHART_COLORS[i % CHART_COLORS.length] }));
    if (variant === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartRows}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              dataKey="amount"
              nameKey="name"
            >
              {chartRows.map((entry, index) => (
                <Cell key={`pie-cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }
    if (variant === 'vertical-bar') {
      return (
        <ResponsiveContainer width="100%" height={Math.max(220, chartRows.length * 48)}>
          <BarChart data={chartRows} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={130} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" name="Revenue" radius={[0, 4, 4, 0]}>
              {chartRows.map((entry, index) => (
                <Cell key={`vbar-cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartRows}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="amount" name="Amount" fill={color} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  /** Shared layout for the per-stream tabs: summary card + chart card. */
  const StreamTab = ({
    stream,
    title,
    chartTitle,
    chartDescription,
    breakdownTitle,
    unit,
    variant,
    icon
  }: {
    stream: RevenueStreamKey;
    title: string;
    chartTitle: string;
    chartDescription: string;
    breakdownTitle: string;
    unit: string;
    variant: 'bar' | 'vertical-bar' | 'pie';
    icon?: React.ElementType;
  }) => {
    const s = data?.streams?.[stream];
    if (!s || toNumber(s.total) === 0) {
      return (
        <AnimatedGrid single>
          <Card className={cardShell}>
            <CardContent className="p-8">
              <EmptyState title={title} />
            </CardContent>
          </Card>
        </AnimatedGrid>
      );
    }
    return (
      <AnimatedGrid>
        <Card className={cardShell}>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Total: <Money value={s.total} /></CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <MethodTiles cash={toNumber(s.cash)} card={toNumber(s.card)} other={toNumber(s.other)} />
            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-center gap-2 mb-1">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Total Transactions</p>
              </div>
              <p className="text-2xl font-bold">{toNumber(s.count)}</p>
            </div>
            <BreakdownList title={breakdownTitle} rows={s.breakdown} unit={unit} icon={icon} />
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader>
            <CardTitle>{chartTitle}</CardTitle>
            <CardDescription>{chartDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {breakdownChart(s.breakdown, variant, COLORS.primary)}
          </CardContent>
        </Card>
      </AnimatedGrid>
    );
  };

  const total = data?.totalCollection;
  const cashVsCardData = total
    ? [
        { name: 'Cash', value: toNumber(total.cash), color: COLORS.cash },
        { name: 'Card', value: toNumber(total.card), color: COLORS.card },
        { name: 'Online / Other', value: toNumber(total.other), color: COLORS.other },
      ].filter((d) => d.value > 0)
    : [];
  const trendData = (data?.trend ?? []).map((p) => ({
    label: p.label,
    revenue: toNumber(p.revenue),
    expenses: p.expenses === null || p.expenses === undefined ? undefined : toNumber(p.expenses),
  }));
  const showExpenseLine = data?.granularity !== 'hourly' && toNumber(data?.expenses?.total) > 0;
  const expenseRows = data?.expenses?.breakdown ?? [];

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Revenue Dashboard</h2>
            <p className="text-muted-foreground">
              Comprehensive revenue analytics and insights
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && data && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
            <Badge variant="outline" className="text-sm">{rangeLabel}</Badge>
          </div>
        </div>

        {/* Date Filter Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {PRESETS.map(({ type, label }) => (
              <Button
                key={type}
                variant={dateFilterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => handleDateFilterChange(type)}
                className={dateFilterType === type ? "bg-primary text-white" : ""}
              >
                {label}
              </Button>
            ))}
          </div>

          <Popover
            open={calendarOpen}
            onOpenChange={(open) => {
              setCalendarOpen(open);
              if (open) setDraftRange({ from: dateRange.from, to: dateRange.to });
            }}
          >
            <PopoverTrigger asChild>
              <Button
                variant={dateFilterType === 'custom' ? "default" : "outline"}
                size="sm"
                className={dateFilterType === 'custom' ? "bg-primary text-white" : ""}
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
                    setDateRange({ from: range.from, to: range.to });
                    setGranularity(undefined); // let the backend pick a bucket size for the span
                    setDateFilterType('custom');
                    setCalendarOpen(false);
                  }
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {error && (
        <Card className={cn(cardShell, "bg-red-50")}>
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
            <Button size="sm" variant="outline" onClick={() => setReloadKey((k) => k + 1)}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Top KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Collection"
          value={toNumber(total?.total)}
          trend={total ? toNumber(total.trend) : undefined}
          icon={Wallet}
          tone="emerald"
          cash={total ? toNumber(total.cash) : undefined}
          card={total ? toNumber(total.card) : undefined}
          subtitle={total ? `${toNumber(total.count)} transactions` : undefined}
        />
        <KPICard
          title="Total Expenses"
          value={toNumber(data?.expenses?.total)}
          trend={data ? toNumber(data.expenses.trend) : undefined}
          trendGoodWhenUp={false}
          icon={Receipt}
          tone="red"
          subtitle={data ? `${toNumber(data.expenses.count)} approved / paid expenses` : undefined}
        />
        <KPICard
          title="Net Revenue"
          value={toNumber(data?.netRevenue?.total)}
          trend={data ? toNumber(data.netRevenue.trend) : undefined}
          icon={TrendingUp}
          tone="teal"
          subtitle="Collection minus expenses"
        />
        <KPICard
          title="Active Members"
          value={toNumber(data?.activeMembers?.count)}
          isCurrency={false}
          icon={Users}
          tone="blue"
          subtitle={data ? `${toNumber(data.activeMembers.newInPeriod)} joined in this period` : undefined}
        />
      </div>

      {/* Revenue Breakdown Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full flex flex-wrap h-auto p-1 gap-1">
          <TabsTrigger value="total-collection" className="text-xs">Total Collection</TabsTrigger>
          <TabsTrigger value="membership" className="text-xs">Membership</TabsTrigger>
          <TabsTrigger value="personal-training" className="text-xs">PT & Services</TabsTrigger>
          <TabsTrigger value="merchandise" className="text-xs">Merchandise</TabsTrigger>
          <TabsTrigger value="events" className="text-xs">Events</TabsTrigger>
          <TabsTrigger value="cafe" className="text-xs">Cafe & F&B</TabsTrigger>
          <TabsTrigger value="equipment" className="text-xs">Equipment</TabsTrigger>
          <TabsTrigger value="facilities" className="text-xs">Facilities</TabsTrigger>
          <TabsTrigger value="expenses" className="text-xs">Expenses</TabsTrigger>
        </TabsList>

        {isLoading && !data ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="w-full h-64" />
            <Skeleton className="w-full h-64" />
          </div>
        ) : (
          <>
            {/* Total Collection Tab */}
            <TabsContent value="total-collection" className="space-y-4">
              <AnimatedGrid>
                <Card className={cardShell}>
                  <CardHeader>
                    <CardTitle>Cash vs Card Distribution</CardTitle>
                    <CardDescription>Payment method breakdown</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-6">
                      <MethodTiles cash={toNumber(total?.cash)} card={toNumber(total?.card)} other={toNumber(total?.other)} />
                    </div>
                    {cashVsCardData.length === 0 ? (
                      <EmptyState title="Payment method split" />
                    ) : (
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={cashVsCardData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            dataKey="value"
                            nameKey="name"
                          >
                            {cashVsCardData.map((entry, index) => (
                              <Cell key={`cash-card-cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className={cardShell}>
                  <CardHeader>
                    <CardTitle>{TREND_TITLES[data?.granularity ?? 'daily']}</CardTitle>
                    <CardDescription>Revenue performance over time ({currencyCode})</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={trendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" minTickGap={16} />
                        <YAxis />
                        <Tooltip content={<CustomTooltip />} />
                        {showExpenseLine && <Legend />}
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke={COLORS.primary}
                          strokeWidth={2}
                          dot={trendData.length <= 31 ? { fill: COLORS.primary, r: 4 } : false}
                        />
                        {showExpenseLine && (
                          <Line
                            type="monotone"
                            dataKey="expenses"
                            name="Expenses"
                            stroke={COLORS.accent}
                            strokeDasharray="5 5"
                            strokeWidth={2}
                            dot={false}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </AnimatedGrid>
            </TabsContent>

            {/* Membership Revenue Tab */}
            <TabsContent value="membership" className="space-y-4">
              <StreamTab
                stream="membership"
                title="Membership Revenue"
                chartTitle="Revenue by Membership Type"
                chartDescription="Breakdown by transaction type"
                breakdownTitle="Transaction Breakdown"
                unit="receipts"
                variant="bar"
              />
            </TabsContent>

            {/* Personal Training & Services Tab */}
            <TabsContent value="personal-training" className="space-y-4">
              <StreamTab
                stream="services"
                title="PT & Services Revenue"
                chartTitle="Revenue by Service Type"
                chartDescription="Paid PT sessions and class bookings"
                breakdownTitle="Service Breakdown"
                unit="bookings"
                variant="vertical-bar"
                icon={Dumbbell}
              />
            </TabsContent>

            {/* Merchandise & Retail Tab */}
            <TabsContent value="merchandise" className="space-y-4">
              <StreamTab
                stream="merchandise"
                title="Merchandise Revenue"
                chartTitle="Category-wise Revenue"
                chartDescription="POS sales by product category"
                breakdownTitle="Category Breakdown"
                unit="lines"
                variant="pie"
                icon={ShoppingBag}
              />
            </TabsContent>

            {/* Events & Workshops Tab */}
            <TabsContent value="events">
              <ComingSoon
                title="Events & Workshops Revenue"
                message="Event ticketing isn't available in GymBios yet. Events & workshops revenue will show here once it is."
              />
            </TabsContent>

            {/* Cafe & F&B Tab */}
            <TabsContent value="cafe" className="space-y-4">
              <StreamTab
                stream="cafe"
                title="Cafe & F&B Revenue"
                chartTitle="Cafe Sales by Category"
                chartDescription="POS sales from cafe, snack and beverage categories"
                breakdownTitle="Category Breakdown"
                unit="lines"
                variant="bar"
                icon={Coffee}
              />
            </TabsContent>

            {/* Equipment Tab */}
            <TabsContent value="equipment">
              <StreamTab
                stream="equipment"
                title="Equipment Revenue"
                chartTitle="Equipment Sales by Category"
                chartDescription="POS sales from equipment categories"
                breakdownTitle="Category Breakdown"
                unit="lines"
                variant="bar"
                icon={Package}
              />
            </TabsContent>

            {/* Facilities & Lockers Tab */}
            <TabsContent value="facilities">
              <ComingSoon
                title="Facilities & Lockers Revenue"
                message="Facility and locker charges aren't recorded in GymBios yet. Their revenue will show here once they are."
              />
            </TabsContent>

            {/* Expenses Tab */}
            <TabsContent value="expenses" className="space-y-4">
              {toNumber(data?.expenses?.total) === 0 ? (
                <AnimatedGrid single>
                  <Card className={cardShell}>
                    <CardContent className="p-8">
                      <EmptyState title="Approved expenses" />
                    </CardContent>
                  </Card>
                </AnimatedGrid>
              ) : (
                <AnimatedGrid>
                  <Card className={cardShell}>
                    <CardHeader>
                      <CardTitle>Expense Summary</CardTitle>
                      <CardDescription>Total: <Money value={data?.expenses?.total} /> (approved and paid)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg bg-muted p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Total Expenses Recorded</p>
                        </div>
                        <p className="text-2xl font-bold">{toNumber(data?.expenses?.count)}</p>
                      </div>
                      <BreakdownList title="Expense Categories" rows={expenseRows} unit="items" />
                    </CardContent>
                  </Card>

                  <Card className={cardShell}>
                    <CardHeader>
                      <CardTitle>Expenses by Category</CardTitle>
                      <CardDescription>Category-wise expense breakdown</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {breakdownChart(expenseRows, 'bar', COLORS.accent)}
                    </CardContent>
                  </Card>
                </AnimatedGrid>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
