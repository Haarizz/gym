import React, { useEffect, useMemo, useState } from 'react';
import { Star, ShoppingBag, Dumbbell, UserPlus, Target, CalendarCheck } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { CurrencyGlyph } from '../../utils/currency';
import { staffService, Staff, StaffListPerformance } from '../../utils/supabase/staff-service';

// Performance & Targets tab of Staffs & Trainers: one month of performance-engine figures per
// staff member. Sales figures and trainer figures are shown by role (or whenever they're non-zero).

const money = (v?: number | null) => Number(v ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** The current month and the 11 before it, newest first. */
const lastMonths = () => {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: monthKey(d), label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) };
  });
};

const isTrainerRole = (role?: string) => /trainer|coach|instructor/i.test(role ?? '');

const progressColor = (pct: number) =>
  pct >= 120 ? 'bg-emerald-500' : pct >= 100 ? 'bg-green-500' : pct >= 80 ? 'bg-yellow-500' : 'bg-red-500';

const PACE: Record<string, { current: string; past: string; className: string; rank: number }> = {
  EXCELLENT: { current: 'Target met', past: 'Target met', className: 'bg-emerald-100 text-emerald-800', rank: 0 },
  ON_TRACK:  { current: 'On track',   past: 'Nearly met', className: 'bg-blue-100 text-blue-800',       rank: 1 },
  AT_RISK:   { current: 'At risk',    past: 'Missed',     className: 'bg-red-100 text-red-800',         rank: 2 },
  NO_TARGET: { current: 'No target',  past: 'No target',  className: 'bg-slate-100 text-slate-600',     rank: 3 },
};

function Bar({ pct }: { pct: number }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-1.5">
      <div className={`h-1.5 rounded-full ${progressColor(pct)}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </div>
  );
}

/** One figure line: label on the left, value on the right. */
function Figure({ label, children, title }: { label: string; children: React.ReactNode; title?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 text-xs" title={title}>
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="font-medium text-right whitespace-nowrap">{children}</span>
    </div>
  );
}

function TargetCell({ perf }: { perf?: StaffListPerformance }) {
  if (!perf) return <span className="text-sm text-muted-foreground">—</span>;
  const pct = perf.achievement_percentage ?? 0;
  const target = Number(perf.revenue_target ?? 0);
  const others = (perf.goals ?? []).filter(g => !(g.metric === 'REVENUE_TOTAL' && g.measure === 'amount'));
  return (
    <div className="space-y-2 min-w-48">
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Revenue</span>
          <span className="font-medium">{target > 0 ? `${pct}%` : '—'}</span>
        </div>
        {target > 0 && <Bar pct={pct} />}
        <div className="text-xs text-muted-foreground">
          <CurrencyGlyph /> {money(perf.revenue_achieved)}
          {target > 0 ? <> of <CurrencyGlyph /> {money(target)}</> : ' (no revenue target)'}
        </div>
      </div>
      {others.map(g => {
        const p = g.percent ?? 0;
        return (
          <div key={`${g.metric}|${g.measure}`} className="space-y-1">
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-muted-foreground truncate">{g.label}</span>
              <span className="font-medium whitespace-nowrap">
                {g.measure === 'amount'
                  ? <><CurrencyGlyph /> {money(g.achieved)} / {money(g.goal)}</>
                  : `${Number(g.achieved)} / ${Number(g.goal)}`}
              </span>
            </div>
            <Bar pct={p} />
          </div>
        );
      })}
    </div>
  );
}

type SortKey = 'target' | 'revenue' | 'pace' | 'name';

interface Props {
  staff: Staff[];
  isLoading: boolean;
}

export function StaffPerformancePanel({ staff, isLoading }: Props) {
  const months = useMemo(lastMonths, []);
  const [period, setPeriod] = useState(months[0].value);
  const [sortBy, setSortBy] = useState<SortKey>('target');
  const [perfById, setPerfById] = useState<Record<string, StaffListPerformance>>({});
  const [loadingPerf, setLoadingPerf] = useState(false);
  const isCurrent = period === months[0].value;

  const idsKey = staff.map(s => String(s.id)).slice(0, 100).join(',');

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : [];
    if (ids.length === 0) { setPerfById({}); return; }
    let cancelled = false;
    setLoadingPerf(true);
    staffService.getStaffListPerformance(ids, period)
      .then(list => {
        if (cancelled) return;
        const map: Record<string, StaffListPerformance> = {};
        list.forEach(p => { map[String(p.staff_id)] = p; });
        setPerfById(map);
      })
      .catch(e => console.error('Failed to load staff performance', e))
      .finally(() => { if (!cancelled) setLoadingPerf(false); });
    return () => { cancelled = true; };
  }, [idsKey, period]);

  const rows = useMemo(() => {
    const perf = (s: Staff) => perfById[String(s.id)];
    return [...staff].sort((a, b) => {
      const pa = perf(a), pb = perf(b);
      switch (sortBy) {
        case 'revenue': return Number(pb?.revenue_achieved ?? 0) - Number(pa?.revenue_achieved ?? 0);
        case 'pace': return (PACE[pa?.performance_status ?? 'NO_TARGET']?.rank ?? 3) - (PACE[pb?.performance_status ?? 'NO_TARGET']?.rank ?? 3)
          || (pb?.achievement_percentage ?? 0) - (pa?.achievement_percentage ?? 0);
        case 'name': return a.name.localeCompare(b.name);
        default: return (pb?.achievement_percentage ?? -1) - (pa?.achievement_percentage ?? -1)
          || Number(pb?.revenue_achieved ?? 0) - Number(pa?.revenue_achieved ?? 0);
      }
    });
  }, [staff, perfById, sortBy]);

  return (
    <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 border-b">
          <div>
            <div className="font-semibold">Performance &amp; Targets</div>
            <div className="text-xs text-muted-foreground">
              Figures from sales, PT, classes and leads credited to each person for the month.
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="target">Sort: Target %</SelectItem>
                <SelectItem value="revenue">Sort: Revenue</SelectItem>
                <SelectItem value="pace">Sort: Pace</SelectItem>
                <SelectItem value="name">Sort: Name</SelectItem>
              </SelectContent>
            </Select>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table className="[&_tr]:border-0">
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent border-0">
                <TableHead>Employee</TableHead>
                <TableHead>Target Progress</TableHead>
                <TableHead>Pace</TableHead>
                <TableHead><span className="inline-flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" />Sales</span></TableHead>
                <TableHead><span className="inline-flex items-center gap-1"><Dumbbell className="h-3.5 w-3.5" />Training</span></TableHead>
                <TableHead><span className="inline-flex items-center gap-1"><CalendarCheck className="h-3.5 w-3.5" />Attendance</span></TableHead>
                <TableHead>Rating</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading || (loadingPerf && Object.keys(perfById).length === 0) ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading performance...</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No staff found.</TableCell>
                </TableRow>
              ) : rows.map(s => {
                const p = perfById[String(s.id)];
                const trainer = isTrainerRole(s.role);
                const salesActive = !!p && ((p.admissions ?? 0) + (p.lead_conversions ?? 0) + (p.pos_sales ?? 0)) > 0;
                const trainingActive = !!p && ((p.pt_sales ?? 0) + (p.pt_sessions_delivered ?? 0) + (p.classes_taught ?? 0)) > 0;
                const showSales = !!p && (!trainer || salesActive);
                const showTraining = !!p && (trainer || trainingActive);
                const pace = PACE[p?.performance_status ?? 'NO_TARGET'] ?? PACE.NO_TARGET;
                const classes = p?.classes_taught ?? 0;
                const avgAttendees = classes > 0 ? (p!.class_attendees ?? 0) / classes : 0;
                return (
                  <TableRow key={s.id} className="hover:bg-slate-50/50 transition-colors border-0 align-top">
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-9 w-9">
                          {s.photo_url && <AvatarImage src={s.photo_url} alt={s.name} />}
                          <AvatarFallback>{s.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">{s.role}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><TargetCell perf={p} /></TableCell>
                    <TableCell>
                      {p ? <Badge className={`text-xs ${pace.className}`}>{isCurrent ? pace.current : pace.past}</Badge> : '—'}
                    </TableCell>
                    <TableCell>
                      {showSales ? (
                        <div className="space-y-1 min-w-44">
                          <Figure label="New memberships" title="New-member receipts they processed">
                            <span className="inline-flex items-center gap-1"><UserPlus className="h-3 w-3 text-muted-foreground" />{p!.admissions ?? 0}</span>
                            {(p!.admissions ?? 0) > 0 && <span className="text-muted-foreground font-normal"> · <CurrencyGlyph /> {money(p!.admissions_amount)}</span>}
                          </Figure>
                          <Figure label="Lead conversions" title="Leads assigned to them marked converted this month (rate is all-time)">
                            {p!.lead_conversions ?? 0}
                            <span className="text-muted-foreground font-normal"> · {p!.conversion_rate ?? 0}%</span>
                          </Figure>
                          <Figure label="POS sales" title="Completed POS bills they rang up, net of refunds">
                            {p!.pos_sales ?? 0}
                            {(p!.pos_sales ?? 0) > 0 && <span className="text-muted-foreground font-normal"> · <CurrencyGlyph /> {money(p!.pos_sales_amount)}</span>}
                          </Figure>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {showTraining ? (
                        <div className="space-y-1 min-w-44">
                          <Figure label="PT sales" title="PT packages and paid PT sessions sold with them">
                            {p!.pt_sales ?? 0}
                            {(p!.pt_sales ?? 0) > 0 && <span className="text-muted-foreground font-normal"> · <CurrencyGlyph /> {money(p!.pt_sales_amount)}</span>}
                          </Figure>
                          <Figure label="PT sessions" title="PT sessions delivered (member came, or a counted no-show)">
                            {p!.pt_sessions_delivered ?? 0}
                          </Figure>
                          <Figure label="Classes taught" title="Classes they led with at least one booking">
                            {classes}
                            {classes > 0 && <span className="text-muted-foreground font-normal"> · avg {avgAttendees.toFixed(1)}</span>}
                          </Figure>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell>
                      {p ? (
                        <div className="space-y-1 min-w-20">
                          <div className="text-sm font-medium">{p.attendance_rate ?? 0}%</div>
                          <Bar pct={p.attendance_rate ?? 0} />
                          {isCurrent && (
                            <div className={`text-xs ${p.present_today ? 'text-green-600' : 'text-muted-foreground'}`}>
                              {p.present_today ? 'In today' : 'Not in today'}
                            </div>
                          )}
                        </div>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      {p && (p.rating_count ?? 0) > 0 ? (
                        <div className="flex items-center gap-1 text-sm" title="Average member workout feedback (all time)">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-medium">{Number(p.rating).toFixed(1)}</span>
                          <span className="text-xs text-muted-foreground">({p.rating_count})</span>
                        </div>
                      ) : <span className="text-sm text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        {!isLoading && rows.length > 0 && (
          <div className="flex items-center gap-1.5 px-4 py-3 border-t text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5" />
            Set or change goals from Targets &amp; Commission. Sales and training show by role, or whenever someone has figures there.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
