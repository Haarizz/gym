import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  AlertTriangle, BarChart3, Briefcase, CalendarDays, ChevronLeft, ChevronRight, Clock, DoorOpen, Dumbbell, Footprints,
  History, LogOut, RefreshCw, Search, Timer, TrendingUp, UserCheck, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { DatePickerField } from '../components/shared/DatePickerField';
import {
  styles, usePalette, axisTick, Kpi, Panel, ChartTip, Legend, Empty, SectionTabs, Seg, Status, Delta, pctChange, fmtInt,
} from '../components/overview/overview-kit';
import { ReportActions, type ReportDocument, chartFromRows, col, kpiSection, tableSection } from '../components/report-export';
import { useBranch } from '../utils/branch-context';
import {
  staffAttendanceService, MinVisitNotReachedError,
  type AttendanceStats, type DayReport, type DayVisit, type RosterRow, type VisitKind,
} from '../utils/supabase/staff-attendance-service';
import a from './attendance.module.css';

// ── Helpers ────────────────────────────────────────────────────────────────────

type Tab = 'inside' | 'log' | 'team' | 'trends';
type KindFilter = 'all' | VisitKind;

const KIND: Record<VisitKind, { label: string; plural: string; tone: string }> = {
  member: { label: 'Member', plural: 'Members', tone: 'blue' },
  walk_in: { label: 'Walk-in', plural: 'Walk-ins', tone: 'orange' },
  trainer: { label: 'Trainer', plural: 'Trainers', tone: 'violet' },
  staff: { label: 'Staff', plural: 'Staff', tone: 'teal' },
};
const isGuest = (k: VisitKind) => k === 'member' || k === 'walk_in';

/** Members are flagged after 3h inside (probably forgot to check out); staff after a 10h shift. */
const LIMIT = { guest: 180, team: 600 };

function fmtDur(min: number | null | undefined) {
  const m = Math.max(0, Math.round(Number(min) || 0));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

const plural = (n: number, one: string, many = `${one}s`) => `${fmtInt(n)} ${n === 1 ? one : many}`;

/** Roster times arrive as gym wall-clock "HH:mm"; show them like every other time on the page. */
function clock(hhmm?: string | null) {
  if (!hhmm) return '—';
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return hhmm;
  return new Date(2000, 0, 1, h, m || 0).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

const shiftDate = (iso: string, days: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return t.toISOString().slice(0, 10);
};

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

const METHOD: Record<string, string> = {
  face: 'Face', qr: 'QR', qr_code: 'QR', manual: 'Desk', web: 'Desk', WEB: 'Desk', mobile: 'App', app: 'App',
  barcode: 'Barcode', card: 'Card', rfid: 'Card', kiosk: 'Kiosk',
};
const methodLabel = (m?: string | null) => (m ? METHOD[m] || METHOD[m.toLowerCase()] || m.replace(/_/g, ' ') : null);

const STATUS_KIND: Record<string, 'good' | 'warning' | 'critical' | 'info'> = {
  Working: 'good', Present: 'good', Overtime: 'info', Late: 'warning', 'Early Departure': 'warning', 'Half Day': 'warning',
  Absent: 'critical', 'Incomplete Punch': 'critical', Scheduled: 'info',
};

// ── Small pieces ───────────────────────────────────────────────────────────────

function Photo({ name, url, tone, small, on }: { name: string; url?: string | null; tone: string; small?: boolean; on?: boolean }) {
  const [broken, setBroken] = useState(false);
  const cls = `${a.photo} ${small ? a.photoSm : ''}`;
  return (
    <span className={a.photoWrap} data-tone={tone}>
      {url && !broken
        ? <img src={url} alt="" className={cls} onError={() => setBroken(true)} />
        : <span className={cls} aria-hidden="true">{initials(name)}</span>}
      {on && <span className={a.onDot} title="Inside now" />}
    </span>
  );
}

function KindTag({ kind }: { kind: VisitKind }) {
  return <span className={a.kind} data-tone={KIND[kind].tone}>{KIND[kind].label}</span>;
}

// ── Page ───────────────────────────────────────────────────────────────────────

interface AttendanceProps {
  onNavigate?: (section: string) => void;
}

export function Attendance({ onNavigate }: AttendanceProps = {}) {
  const { activeBranchId } = useBranch();
  const palette = usePalette();
  const now = useNow(30_000);

  // '' = the gym's today; Attendance Reports links here with ?date=yyyy-MM-dd to open one day.
  const [date, setDate] = useState<string>(() => {
    const q = new URLSearchParams(window.location.search).get('date');
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : '';
  });
  const [gymToday, setGymToday] = useState<string>('');
  const [report, setReport] = useState<DayReport | null>(null);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>(() => (date ? 'log' : 'inside'));

  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [insideSort, setInsideSort] = useState<'longest' | 'latest' | 'name'>('longest');
  const [logStatus, setLogStatus] = useState<'all' | 'inside' | 'out'>('all');
  const [logSort, setLogSort] = useState<'latest' | 'longest'>('latest');
  const [logLimit, setLogLimit] = useState(100);
  const [teamFilter, setTeamFilter] = useState<'all' | 'trainer' | 'staff'>('all');

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ visit: DayVisit; reason: 'min' | 'staff'; message?: string } | null>(null);

  // ── Loading ──────────────────────────────────────────────────────────────────
  const seq = useRef(0);
  const load = useCallback(async (quiet = false) => {
    const mine = ++seq.current;
    if (!quiet) setLoading(true);
    try {
      const r = await staffAttendanceService.getDayReport(date || undefined);
      if (mine !== seq.current) return;
      setReport(r);
      setError(null);
      if (r.today) setGymToday(r.date);
    } catch (e: any) {
      if (mine !== seq.current) return;
      if (!quiet) setError(e?.message || 'Could not load attendance');
    } finally {
      if (mine === seq.current) setLoading(false);
    }
  }, [date]);

  const loadStats = useCallback(async () => {
    try { setStats(await staffAttendanceService.getStats()); } catch { /* trends just stay empty */ }
  }, []);

  useEffect(() => { load(); }, [load, activeBranchId]);
  useEffect(() => { loadStats(); }, [loadStats, activeBranchId]);

  // Live: today's report refreshes itself every minute while the tab is visible.
  useEffect(() => {
    if (!report?.today) return;
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(true); }, 60_000);
    return () => clearInterval(t);
  }, [report?.today, load]);

  const isToday = report?.today ?? !date;
  const tz = report?.time_zone;
  const fmtTime = useCallback((iso?: string | null) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: tz }); }
    catch { return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  }, [tz]);
  const fmtDay = (iso?: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
  };
  const weekdayOf = (iso?: string) => {
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long' });
  };

  /** Minutes inside, ticking for people still in. */
  const minutesOf = useCallback((v: DayVisit) => {
    if (!v.inside) return v.minutes;
    return Math.max(v.minutes, Math.floor((now - new Date(v.check_in).getTime()) / 60000));
  }, [now]);

  const levelOf = (v: DayVisit, min: number) => {
    const limit = isGuest(v.kind) ? LIMIT.guest : LIMIT.team;
    if (min >= limit) return 'alert';
    if (min >= limit * 0.7) return 'warn';
    return 'ok';
  };

  // ── Derived ──────────────────────────────────────────────────────────────────
  const visits = report?.visits ?? [];
  const s = report?.summary;
  const q = search.trim().toLowerCase();
  const matches = (v: DayVisit) => !q || v.name.toLowerCase().includes(q) || (v.code || '').toLowerCase().includes(q)
    || (v.detail || '').toLowerCase().includes(q);

  const inside = useMemo(() => visits.filter(v => v.inside), [visits]);
  const insideShown = useMemo(() => {
    const list = inside.filter(v => matches(v) && (kindFilter === 'all' || v.kind === kindFilter));
    return [...list].sort((x, y) => {
      if (insideSort === 'name') return x.name.localeCompare(y.name);
      const dx = new Date(x.check_in).getTime(), dy = new Date(y.check_in).getTime();
      return insideSort === 'longest' ? dx - dy : dy - dx;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inside, q, kindFilter, insideSort]);

  const counts = useMemo(() => {
    const c = { all: 0, member: 0, walk_in: 0, trainer: 0, staff: 0 } as Record<KindFilter, number>;
    const src = tab === 'inside' ? inside : visits.filter(v => !v.from_earlier_day);
    for (const v of src) { c.all++; c[v.kind]++; }
    return c;
  }, [inside, visits, tab]);

  const logRows = useMemo(() => {
    const list = visits.filter(v => !v.from_earlier_day && matches(v)
      && (kindFilter === 'all' || v.kind === kindFilter)
      && (logStatus === 'all' || (logStatus === 'inside' ? v.inside : !v.inside)));
    if (logSort === 'longest') return [...list].sort((x, y) => minutesOf(y) - minutesOf(x));
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visits, q, kindFilter, logStatus, logSort, minutesOf]);

  const longStays = inside.filter(v => isGuest(v.kind) && minutesOf(v) >= LIMIT.guest);
  const insideCount = inside.length;
  const insideGuests = inside.filter(v => isGuest(v.kind)).length;
  const insideTeam = insideCount - insideGuests;
  const teamPresent = (s?.trainers_present ?? 0) + (s?.staff_present ?? 0);

  const hourly = useMemo(() => {
    let rows = report?.hourly ?? [];
    if (report?.today) {
      // Hours still to come would read as "nobody inside"; stop the chart at the current hour.
      let current = 23;
      try { current = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: report.time_zone }).format(new Date())); } catch { /* keep 23 */ }
      rows = rows.filter(h => h.hour <= current);
    }
    const active = rows.filter(h => h.members + h.walk_ins + h.staff + h.trainers + h.inside > 0).map(h => h.hour);
    if (!active.length) return rows.filter(h => h.hour >= 6 && h.hour <= 23);
    const from = Math.max(0, Math.min(...active) - 1), to = Math.min(23, Math.max(...active) + 1);
    return rows.filter(h => h.hour >= from && h.hour <= to);
  }, [report?.hourly, report?.today, report?.time_zone]);

  const roster = useMemo(() => {
    const list = (report?.roster ?? []).filter(r => (teamFilter === 'all' || (teamFilter === 'trainer' ? r.trainer : !r.trainer))
      && (!q || r.name.toLowerCase().includes(q) || (r.code || '').toLowerCase().includes(q) || (r.role || '').toLowerCase().includes(q)));
    const rank = (r: RosterRow) => (r.inside ? 0 : r.actual_in ? 1 : r.status === 'Absent' ? 2 : r.status === 'Scheduled' ? 3 : 4);
    return [...list].sort((x, y) => rank(x) - rank(y) || x.name.localeCompare(y.name));
  }, [report?.roster, teamFilter, q]);
  const teamVisits = useMemo(() => visits.filter(v => !isGuest(v.kind) && !v.from_earlier_day
    && (teamFilter === 'all' || v.kind === teamFilter) && matches(v)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visits, teamFilter, q]);

  const weekly = stats?.weekly_trend ?? [];
  const monthly = stats?.monthly_trend ?? [];
  const busiest = weekly.reduce((m, d) => (d.visits > m.visits ? d : m), { day: '—', visits: 0, date: '' });

  // ── Actions ──────────────────────────────────────────────────────────────────
  const goDate = (iso: string) => {
    const past = !!gymToday && iso !== gymToday;
    setDate(past ? iso : '');
    setLogLimit(100);
    // "Who's in now" is live-only; a past day opens on its log.
    if (past && tab === 'inside') setTab('log');
  };

  const checkOut = async (v: DayVisit, force = false) => {
    setBusyKey(v.key);
    try {
      if (isGuest(v.kind)) {
        const res = await staffAttendanceService.checkout(v.record_id, force);
        toast.success(`${v.name} checked out${res?.formatted_duration ? ` · ${res.formatted_duration}` : ''}`);
      } else {
        await staffAttendanceService.clockOutRecord(v.record_id);
        toast.success(`${v.name} clocked out`);
      }
      setConfirm(null);
      load(true);
    } catch (e: any) {
      if (e instanceof MinVisitNotReachedError) {
        setConfirm({ visit: v, reason: 'min', message: e.message });
      } else {
        toast.error(e?.message || 'Check-out failed');
      }
    } finally {
      setBusyKey(null);
    }
  };
  const askCheckOut = (v: DayVisit) => (isGuest(v.kind) ? checkOut(v) : setConfirm({ visit: v, reason: 'staff' }));

  // ── Export ───────────────────────────────────────────────────────────────────
  const buildReport = async (): Promise<ReportDocument> => {
    const r = report!;
    const row = (v: DayVisit) => ({
      name: v.name, code: v.code || '', type: KIND[v.kind].label, detail: v.detail || '',
      in: fmtTime(v.check_in), out: v.inside ? 'Inside' : fmtTime(v.check_out), minutes: minutesOf(v),
      via: methodLabel(v.method) || '', status: v.inside ? 'Inside' : 'Checked out',
    });
    const visitCols = [
      col('name', 'Name'), col('code', 'ID'), col('type', 'Type'), col('detail', 'Plan / role'), col('in', 'In'),
      col('out', 'Out'), col('minutes', 'Time spent', 'duration'), col('via', 'Via'), col('status', 'Status'),
    ];
    return {
      title: 'Attendance Day Report',
      orientation: 'landscape',
      period: { from: r.date, to: r.date, label: fmtDay(r.date) },
      filters: [{ label: 'Time zone', value: r.time_zone }],
      sections: [
        kpiSection([
          { label: 'Visits', value: r.summary.visits, format: 'integer', hint: `${r.summary.last_week_visits} on the same day last week` },
          { label: 'Unique members', value: r.summary.unique_members, format: 'integer' },
          { label: 'Walk-ins', value: r.summary.walk_ins, format: 'integer' },
          { label: 'Average stay', value: r.summary.avg_stay_minutes, format: 'duration' },
          { label: 'Peak hour', value: r.summary.peak_hour || '—', hint: `${r.summary.peak_hour_visits} check-ins` },
          { label: 'Trainers present', value: r.summary.trainers_present, format: 'integer' },
          { label: 'Staff present', value: r.summary.staff_present, format: 'integer' },
          r.today && { label: 'Inside now', value: inside.length, format: 'integer' },
        ], 'Summary'),
        chartFromRows('Check-ins by hour', 'bar', hourly, 'label', [
          { key: 'members', name: 'Members', color: palette.s1 },
          { key: 'walk_ins', name: 'Walk-ins', color: palette.s2 },
          { key: 'inside', name: 'Inside during the hour', color: palette.s3 },
        ], { valueFormat: 'integer' }),
        ...(r.today ? [tableSection('Inside now', visitCols, inside.map(row), { emptyText: 'Nobody is inside.' })] : []),
        tableSection('Visit log', visitCols, visits.filter(v => !v.from_earlier_day).map(row), { emptyText: 'No visits on this day.' }),
        ...(r.roster.length ? [tableSection('Staff & trainers roster', [
          col('name', 'Name'), col('role', 'Role'), col('shift', 'Shift'), col('scheduled', 'Scheduled'), col('in', 'In'), col('out', 'Out'),
          col('worked', 'Worked', 'duration'), col('late', 'Late', 'duration'), col('status', 'Status'),
        ], r.roster.map(x => ({
          name: x.name, role: x.trainer ? `${x.role || 'Trainer'}` : (x.role || 'Staff'), shift: x.shift_name || '',
          scheduled: x.scheduled_in ? `${clock(x.scheduled_in)} – ${clock(x.scheduled_out)}` : "", in: x.actual_in ? clock(x.actual_in) : "", out: x.actual_out ? clock(x.actual_out) : "",
          worked: x.worked_minutes, late: x.late_minutes, status: x.inside ? 'On duty' : x.status,
        })))] : []),
      ],
    };
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  const shownDate = report?.date || date || gymToday;
  const updatedAt = report ? fmtTime(report.generated_at) : '';

  const insideGroups: { kind: 'guests' | 'trainer' | 'staff'; title: string; icon: any; list: DayVisit[] }[] = [
    { kind: 'guests', title: 'Members & walk-ins', icon: Users, list: insideShown.filter(v => isGuest(v.kind)) },
    { kind: 'trainer', title: 'Trainers', icon: Dumbbell, list: insideShown.filter(v => v.kind === 'trainer') },
    { kind: 'staff', title: 'Staff', icon: Briefcase, list: insideShown.filter(v => v.kind === 'staff') },
  ];

  const kindChips = (
    <div className={styles.chips} role="group" aria-label="Who to show">
      {(['all', 'member', 'walk_in', 'trainer', 'staff'] as KindFilter[]).map(k => (
        <button key={k} type="button" className={styles.chip} data-active={kindFilter === k} onClick={() => setKindFilter(k)}>
          {k === 'all' ? 'Everyone' : KIND[k].plural}<span className={a.count}>{counts[k]}</span>
        </button>
      ))}
    </div>
  );

  const searchBox = (placeholder: string) => (
    <label className={a.search}>
      <Search size={15} />
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
    </label>
  );

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Attendance</h1>
          <div className={styles.subtitle}>
            <span>{fmtDay(shownDate)}</span>
            {tz && <span>· {tz.replace('_', ' ')}</span>}
            {isToday
              ? <span className={a.live}><span className={a.dot} />Live{updatedAt ? ` · updated ${updatedAt}` : ''}</span>
              : <span className={a.past}><History size={12} />Past day</span>}
          </div>
        </div>
        <div className={styles.actions}>
          <div className={a.dateNav}>
            <button type="button" className={a.iconBtn} aria-label="Previous day" onClick={() => shownDate && goDate(shiftDate(shownDate, -1))}>
              <ChevronLeft size={16} />
            </button>
            <div className={a.datePick}>
              <DatePickerField value={shownDate} max={gymToday || undefined} clearable={false} onChange={v => v && goDate(v)} />
            </div>
            <button type="button" className={a.iconBtn} aria-label="Next day" disabled={isToday}
              onClick={() => shownDate && goDate(shiftDate(shownDate, 1))}>
              <ChevronRight size={16} />
            </button>
            {!isToday && <Button variant="outline" size="sm" onClick={() => goDate(gymToday)}>Today</Button>}
          </div>
          <Button variant="outline" size="sm" onClick={() => { load(); loadStats(); }} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <ReportActions report={buildReport} disabled={!report} menuLabel={`Attendance · ${shownDate}`} />
        </div>
      </div>

      {error && !report && (
        <div className={`${styles.card} ${styles.filters}`} style={{ color: 'var(--destructive)' }}>
          {error}
          <Button variant="outline" size="sm" onClick={() => load()}>Try again</Button>
        </div>
      )}

      <div className={loading && report ? styles.loadingVeil : undefined} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {/* KPIs */}
        <div className={styles.kpis}>
          {isToday ? (
            <Kpi icon={DoorOpen} tone="green" label="Inside now" value={report ? fmtInt(insideCount) : '—'}
              hint={report ? `${plural(insideGuests, "member")} · ${insideTeam} team` : undefined}
              onClick={() => { setTab('inside'); setKindFilter('all'); }} title="Show who is inside now" />
          ) : (
            <Kpi icon={DoorOpen} tone="green" label="Most inside" value={s ? fmtInt(s.peak_inside) : '—'}
              hint="at the busiest hour" />
          )}
          <Kpi icon={UserCheck} tone="blue" label="Visits" value={s ? fmtInt(s.visits) : '—'}
            delta={s ? <Delta pct={pctChange(s.visits, s.last_week_visits)} suffix={`vs last ${weekdayOf(shownDate).slice(0, 3)}`} /> : undefined}
            hint={s ? plural(s.unique_members, "member") : undefined}
            onClick={() => { setTab('log'); setKindFilter('all'); setLogStatus('all'); }} title="Open the visit log" />
          <Kpi icon={Footprints} tone="orange" label="Walk-ins" value={s ? fmtInt(s.walk_ins) : '—'}
            hint={s && isToday ? `${s.inside_walk_ins} inside now` : 'day passes'}
            onClick={() => { setTab('log'); setKindFilter('walk_in'); }} title="Show walk-ins" />
          <Kpi icon={Timer} tone="violet" label="Average stay" value={s ? fmtDur(s.avg_stay_minutes) : '—'}
            hint={s?.longest_stay_minutes ? `longest ${fmtDur(s.longest_stay_minutes)}` : 'of completed visits'}
            onClick={() => { setTab('log'); setLogSort('longest'); }} title="Sort the log by time spent" />
          <Kpi icon={TrendingUp} tone="amber" label="Peak hour" value={<span className={styles.kpiValueSm}>{s?.peak_hour || '—'}</span>}
            hint={s?.peak_hour_visits ? plural(s.peak_hour_visits, "check-in") : 'no visits yet'}
            onClick={() => setTab('log')} title="See the hour-by-hour flow" />
          <Kpi icon={Briefcase} tone="teal" label="Team on duty" value={s ? fmtInt(isToday ? (s.inside_trainers + s.inside_staff) : teamPresent) : '—'}
            hint={s ? (isToday ? `${teamPresent} came in today${s.roster_absent ? ` · ${s.roster_absent} absent` : ''}` : `${plural(s.trainers_present, "trainer")} · ${s.staff_present} staff`) : undefined}
            onClick={() => setTab('team')} title="Staff & trainers" />
        </div>

        {isToday && longStays.length > 0 && (
          <div className={a.alert} role="status">
            <AlertTriangle size={18} />
            <span className={a.alertText}>
              <strong>{longStays.length} {longStays.length === 1 ? 'person has' : 'people have'} been inside for over 3 hours</strong>
              {' '}— {longStays.slice(0, 3).map(v => v.name).join(', ')}{longStays.length > 3 ? '…' : ''}. They may have forgotten to check out.
            </span>
            <Button variant="outline" size="sm" onClick={() => { setTab('inside'); setInsideSort('longest'); setKindFilter('all'); }}>Review</Button>
          </div>
        )}

        <SectionTabs<Tab>
          label="Attendance views"
          value={tab}
          onChange={t => { setTab(t); if (t === 'team') setKindFilter('all'); }}
          tabs={[
            { id: 'inside', label: "Who's in now", icon: DoorOpen, count: isToday ? insideCount : undefined },
            { id: 'log', label: 'Day log', icon: Clock, count: s?.visits },
            { id: 'team', label: 'Staff & trainers', icon: Briefcase, count: teamPresent },
            { id: 'trends', label: 'Trends', icon: BarChart3 },
          ]}
        />

        {/* ── Who's in now ── */}
        {tab === 'inside' && (
          !isToday ? (
            <div className={styles.card}>
              <Empty icon={DoorOpen} title="Who's in now is live for today"
                text={`You're looking at ${fmtDay(shownDate)}. The day log shows everyone who came in and when they left.`}
                action={<div style={{ display: 'flex', gap: 8 }}>
                  <Button size="sm" variant="outline" onClick={() => setTab('log')}>Open day log</Button>
                  <Button size="sm" onClick={() => goDate(gymToday)}>Go to today</Button>
                </div>} />
            </div>
          ) : (
            <>
              <div className={`${styles.card} ${a.toolbar}`}>
                {searchBox('Search name or ID')}
                {kindChips}
                <div className={a.toolEnd}>
                  <Seg label="Sort" value={insideSort} onChange={setInsideSort}
                    options={[['longest', 'Longest in'], ['latest', 'Latest in'], ['name', 'Name']]} />
                </div>
              </div>
              {!report ? (
                <div className={styles.card}><Empty icon={RefreshCw} title="Loading…" /></div>
              ) : insideShown.length === 0 ? (
                <div className={styles.card}>
                  <Empty icon={DoorOpen} title={inside.length ? 'Nobody matches' : 'Nobody is inside right now'}
                    text={inside.length ? 'Try another name or clear the filter.' : 'Members, trainers and staff appear here the moment they check in.'} />
                </div>
              ) : (
                <div className={a.groups}>
                  {insideGroups.filter(g => g.list.length).map(g => (
                    <Panel key={g.kind} title={g.title} icon={g.icon} scope={String(g.list.length)}
                      sub={g.kind === 'guests' ? 'Time inside counts up live · flagged after 3 hours' : 'Clocked in and on the floor'}>
                      <div className={a.people}>
                        {g.list.map(v => {
                          const min = minutesOf(v);
                          const level = levelOf(v, min);
                          const limit = isGuest(v.kind) ? LIMIT.guest : LIMIT.team;
                          const via = methodLabel(v.method);
                          return (
                            <div key={v.key} className={a.person} data-tone={KIND[v.kind].tone} data-alert={level === 'alert' && isGuest(v.kind)}>
                              <div className={a.personTop}>
                                <Photo name={v.name} url={v.photo_url} tone={KIND[v.kind].tone} on />
                                <div className={a.who}>
                                  <div className={a.name} title={v.name}>{v.name}</div>
                                  <div className={a.sub}>{[v.code, v.detail].filter(Boolean).join(' · ') || '—'}</div>
                                </div>
                                <KindTag kind={v.kind} />
                              </div>
                              <div className={a.timerRow}>
                                <span className={a.timer} data-level={level}>{fmtDur(min)}</span>
                                <span className={a.since}>
                                  in since {fmtTime(v.check_in)}{v.from_earlier_day ? ' (yesterday)' : ''}
                                </span>
                              </div>
                              <div className={a.bar} role="progressbar" aria-valuemin={0} aria-valuemax={limit} aria-valuenow={Math.min(min, limit)}
                                aria-label={`${fmtDur(min)} inside`}>
                                <div className={a.barFill} data-level={level} style={{ width: `${Math.min(100, (min / limit) * 100)}%` }} />
                              </div>
                              <div className={a.personFoot}>
                                <div className={a.tags}>
                                  {via && <span className={a.tag}>{via}</span>}
                                  {v.workout_running && <span className={a.tag} data-tone="green"><Dumbbell size={11} />Workout on</span>}
                                  {v.activity && <span className={a.tag}>{v.activity}</span>}
                                  {level === 'alert' && isGuest(v.kind) && <span className={a.tag} data-tone="red">Check-out missed?</span>}
                                  {v.payment_status && v.payment_status !== 'paid' && <span className={a.tag} data-tone="amber">{v.payment_status}</span>}
                                </div>
                                <button type="button" className={a.outBtn} disabled={busyKey === v.key} onClick={() => askCheckOut(v)}>
                                  {busyKey === v.key ? <RefreshCw size={12} className="animate-spin" /> : <LogOut size={12} />}
                                  {isGuest(v.kind) ? 'Check out' : 'Clock out'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </Panel>
                  ))}
                </div>
              )}
            </>
          )
        )}

        {/* ── Day log ── */}
        {tab === 'log' && (
          <>
            <Panel title="Hour by hour" icon={Clock}
              sub={`Check-ins per hour, and how many members were inside during each hour${s?.peak_hour ? ` · busiest ${s.peak_hour}` : ''}`}
              action={<Legend items={[
                { label: 'Members', color: palette.s1 }, { label: 'Walk-ins', color: palette.s2 },
                { label: 'Inside', color: palette.s3, line: true },
              ]} />}>
              {s && s.visits + s.inside_members + s.inside_walk_ins === 0 ? (
                <Empty icon={Clock} title="No visits on this day" />
              ) : (
                <div className={a.chartBox}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={hourly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                      <YAxis allowDecimals={false} tick={axisTick(palette)} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: 'color-mix(in srgb, currentColor 6%, transparent)' }} />
                      <Bar dataKey="members" name="Members" stackId="in" fill={palette.s1} maxBarSize={28} />
                      <Bar dataKey="walk_ins" name="Walk-ins" stackId="in" fill={palette.s2} radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Line dataKey="inside" name="Inside" type="monotone" stroke={palette.s3} strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            <Panel title="Visit log" icon={UserCheck}
              sub="Everyone who checked in on this day — when they came, when they left and how long they stayed">
              <div className={a.toolbar} style={{ padding: 0 }}>
                {searchBox('Search name, ID or plan')}
                {kindChips}
                <div className={a.toolEnd}>
                  <Seg label="Status" value={logStatus} onChange={setLogStatus} options={[['all', 'All'], ['inside', 'Inside'], ['out', 'Left']]} />
                  <Seg label="Sort" value={logSort} onChange={setLogSort} options={[['latest', 'Latest'], ['longest', 'Longest']]} />
                </div>
              </div>
              {logRows.length === 0 ? (
                <Empty icon={UserCheck} title={visits.length ? 'No visits match' : 'No visits on this day'} />
              ) : (
                <>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr><th>Person</th><th>Type</th><th>Checked in</th><th>Checked out</th><th>Time spent</th><th>Via</th><th>Status</th><th aria-label="Actions" /></tr>
                      </thead>
                      <tbody>
                        {logRows.slice(0, logLimit).map(v => {
                          const min = minutesOf(v);
                          const limit = isGuest(v.kind) ? LIMIT.guest : LIMIT.team;
                          return (
                            <tr key={v.key}>
                              <td>
                                <div className={a.personCell}>
                                  <Photo name={v.name} url={v.photo_url} tone={KIND[v.kind].tone} small on={v.inside} />
                                  <div className={a.who}>
                                    <div className={a.name}>{v.name}</div>
                                    <div className={a.sub}>{[v.code, v.detail].filter(Boolean).join(' · ')}</div>
                                  </div>
                                </div>
                              </td>
                              <td><KindTag kind={v.kind} /></td>
                              <td className={a.time}>{fmtTime(v.check_in)}</td>
                              <td className={a.time}>
                                {v.inside ? <span className={a.insideText}><span className={a.dot} />Still inside</span>
                                  : v.check_out ? fmtTime(v.check_out) : <span className={styles.muted}>Not checked out</span>}
                              </td>
                              <td>
                                <div className={a.spent} data-tone={KIND[v.kind].tone}>
                                  <span className={a.time} style={{ fontWeight: 600 }}>{fmtDur(min)}</span>
                                  <div className={a.spentBar}><div className={a.spentFill} style={{ width: `${Math.min(100, (min / limit) * 100)}%` }} /></div>
                                </div>
                              </td>
                              <td className={styles.muted}>{methodLabel(v.method) || '—'}</td>
                              <td>
                                {v.inside ? <Status kind="good">Inside</Status>
                                  : v.check_out ? <span className={a.neutral}>Left</span>
                                  : <Status kind="warning">No check-out</Status>}
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                {v.inside && (
                                  <button type="button" className={a.outBtn} disabled={busyKey === v.key} onClick={() => askCheckOut(v)}>
                                    <LogOut size={12} />{isGuest(v.kind) ? 'Check out' : 'Clock out'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {logRows.length > logLimit && (
                    <div className={a.more}>
                      <Button variant="outline" size="sm" onClick={() => setLogLimit(n => n + 100)}>
                        Show more ({logRows.length - logLimit} left)
                      </Button>
                    </div>
                  )}
                </>
              )}
            </Panel>
          </>
        )}

        {/* ── Staff & trainers ── */}
        {tab === 'team' && (
          <>
            <div className={a.teamFacts}>
              {[
                { label: isToday ? 'On duty now' : 'Came in', value: isToday ? (s?.inside_trainers ?? 0) + (s?.inside_staff ?? 0) : teamPresent, tone: 'green' },
                { label: 'Trainers in today', value: s?.trainers_present ?? 0, tone: 'violet' },
                { label: 'Staff in today', value: s?.staff_present ?? 0, tone: 'teal' },
                { label: report?.roster.length ? `Absent · ${s?.roster_late ?? 0} late` : 'Scheduled', value: report?.roster.length ? (s?.roster_absent ?? 0) : '—', tone: s?.roster_absent ? 'red' : 'gray' },
              ].map(f => (
                <div key={f.label} className={a.teamFact} data-tone={f.tone}>
                  <div className={a.teamFactValue}>{f.value}</div>
                  <div className={a.teamFactLabel}>{f.label}</div>
                </div>
              ))}
            </div>

            <Panel title="Staff & trainers" icon={Briefcase}
              sub={report?.roster.length ? 'Shift, clock-in and clock-out for everyone on the team' : 'Clock-ins on this day'}
              action={<div className={a.toolEnd}>
                {searchBox('Search team')}
                <Seg label="Team" value={teamFilter} onChange={setTeamFilter} options={[['all', 'Everyone'], ['trainer', 'Trainers'], ['staff', 'Staff']]} />
              </div>}>
              {report?.roster.length ? (
                roster.length === 0 ? <Empty icon={Briefcase} title="Nobody matches" /> : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr><th>Name</th><th>Shift</th><th>Clock in</th><th>Clock out</th><th>Worked</th><th>Status</th><th aria-label="Actions" /></tr>
                      </thead>
                      <tbody>
                        {roster.map(r => {
                          const open = visits.find(v => v.inside && !isGuest(v.kind) && v.person_id === r.staff_id);
                          const kind: VisitKind = r.trainer ? 'trainer' : 'staff';
                          return (
                            <tr key={r.staff_id}>
                              <td>
                                <div className={a.personCell}>
                                  <Photo name={r.name} url={r.photo_url} tone={KIND[kind].tone} small on={r.inside} />
                                  <div className={a.who}>
                                    <div className={a.name}>{r.name}</div>
                                    <div className={a.sub}>{[r.code, r.role].filter(Boolean).join(' · ')}</div>
                                  </div>
                                </div>
                              </td>
                              <td className={styles.muted}>
                                {r.shift_name ? <>{r.shift_name}{r.scheduled_in && <div style={{ fontSize: 'var(--text-xs)' }}>{clock(r.scheduled_in)} – {clock(r.scheduled_out)}</div>}</> : '—'}
                              </td>
                              <td className={a.time}>
                                {clock(r.actual_in)}
                                {r.late_minutes > 0 && <div style={{ fontSize: 'var(--text-xs)', color: '#b45309' }}>{fmtDur(r.late_minutes)} late</div>}
                              </td>
                              <td className={a.time}>{r.inside ? <span className={a.insideText}><span className={a.dot} />On duty</span> : clock(r.actual_out)}</td>
                              <td className={a.time}>{r.inside && open ? fmtDur(minutesOf(open)) : (r.worked_minutes ? fmtDur(r.worked_minutes) : '—')}</td>
                              <td>{STATUS_KIND[r.status] ? <Status kind={STATUS_KIND[r.status]}>{r.status}</Status> : <span className={a.neutral}>{r.status}</span>}</td>
                              <td style={{ textAlign: 'right' }}>
                                {open && isToday && (
                                  <button type="button" className={a.outBtn} disabled={busyKey === open.key} onClick={() => askCheckOut(open)}>
                                    <LogOut size={12} />Clock out
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              ) : teamVisits.length === 0 ? (
                <Empty icon={Briefcase} title="No staff or trainers clocked in on this day"
                  text="Staff clock in from the GymBios app or the check-in desk. Set shifts in Shifts & Schedules to see who is late or absent." />
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Name</th><th>Type</th><th>Clock in</th><th>Clock out</th><th>Worked</th><th aria-label="Actions" /></tr></thead>
                    <tbody>
                      {teamVisits.map(v => (
                        <tr key={v.key}>
                          <td>
                            <div className={a.personCell}>
                              <Photo name={v.name} url={v.photo_url} tone={KIND[v.kind].tone} small on={v.inside} />
                              <div className={a.who}><div className={a.name}>{v.name}</div><div className={a.sub}>{[v.code, v.detail].filter(Boolean).join(' · ')}</div></div>
                            </div>
                          </td>
                          <td><KindTag kind={v.kind} /></td>
                          <td className={a.time}>{fmtTime(v.check_in)}</td>
                          <td className={a.time}>{v.inside ? <span className={a.insideText}><span className={a.dot} />On duty</span> : fmtTime(v.check_out)}</td>
                          <td className={a.time}>{fmtDur(minutesOf(v))}</td>
                          <td style={{ textAlign: 'right' }}>
                            {v.inside && <button type="button" className={a.outBtn} onClick={() => askCheckOut(v)}><LogOut size={12} />Clock out</button>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          </>
        )}

        {/* ── Trends ── */}
        {tab === 'trends' && (
          <>
            <Panel title="Last 14 days" icon={CalendarDays} sub="Visits per day · click a day to open it"
              action={onNavigate && <Button variant="outline" size="sm" onClick={() => onNavigate('attendance-reports')}><BarChart3 className="mr-2 h-4 w-4" />Detailed reports</Button>}>
              <div className={a.chartBoxSm}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report?.last_days ?? []} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={palette.grid} />
                    <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis allowDecimals={false} tick={axisTick(palette)} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: 'color-mix(in srgb, currentColor 6%, transparent)' }} />
                    <Bar dataKey="visits" name="Visits" radius={[4, 4, 0, 0]} maxBarSize={34} cursor="pointer"
                      onClick={(d: any) => d?.date && goDate(d.date)}>
                      {(report?.last_days ?? []).map(d => (
                        <Cell key={d.date} fill={d.date === shownDate ? palette.s2 : palette.s1} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Panel>

            <div className={styles.cols2}>
              <Panel title="This week" icon={TrendingUp} sub="Visits Monday to Sunday">
                <div className={a.chartBoxSm}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weekly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="day" tick={axisTick(palette)} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={axisTick(palette)} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: 'color-mix(in srgb, currentColor 6%, transparent)' }} />
                      <Bar dataKey="visits" name="Visits" fill={palette.s1} radius={[4, 4, 0, 0]} maxBarSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className={a.trendFacts}>
                  <div className={a.teamFact} data-tone="blue"><div className={a.teamFactValue}>{fmtInt(weekly.reduce((n, d) => n + d.visits, 0))}</div><div className={a.teamFactLabel}>Visits this week</div></div>
                  <div className={a.teamFact} data-tone="amber"><div className={a.teamFactValue}>{busiest.visits ? busiest.day : '—'}</div><div className={a.teamFactLabel}>Busiest day</div></div>
                  <div className={a.teamFact} data-tone="green"><div className={a.teamFactValue}>{fmtInt(stats?.total_active_members ?? 0)}</div><div className={a.teamFactLabel}>Active members</div></div>
                </div>
              </Panel>
              <Panel title="This year" icon={BarChart3} sub="Visits per month">
                <div className={a.chartBoxSm}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthly} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="month" tick={axisTick(palette)} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={axisTick(palette)} tickLine={false} axisLine={false} />
                      <Tooltip content={<ChartTip />} />
                      <Line dataKey="visits" name="Visits" type="monotone" stroke={palette.s1} strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
            </div>
          </>
        )}
      </div>

      {/* Confirm: early check-out / clocking out a team member */}
      <AlertDialog open={!!confirm} onOpenChange={o => { if (!o) setConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm?.reason === 'min' ? `Check out ${confirm.visit.name} early?` : `Clock out ${confirm?.visit.name}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm?.reason === 'min'
                ? (confirm.message || "This visit is shorter than the branch's minimum visit time.") + ' Check them out anyway?'
                : `This ends their shift now (${confirm ? fmtDur(minutesOf(confirm.visit)) : ''} so far). Use it when someone left without clocking out.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={e => { e.preventDefault(); if (confirm) { if (confirm.reason === 'min') checkOut(confirm.visit, true); else checkOut(confirm.visit); } }}>
              {confirm?.reason === 'min' ? 'Check out anyway' : 'Clock out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
