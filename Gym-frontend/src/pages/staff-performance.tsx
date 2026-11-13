/**
 * Staff Performance — the gym owner's view of /my-performance. Every staff member's figures
 * for a period, ranked, with charts, so the owner can see who performed best.
 *
 * Data: GET /performance/overview (per person, per month: revenue, admissions, conversions, POS,
 * PT sales and sessions, classes, targets, commission — the same figures as Staff Targets and
 * commission) + GET /performance/staff-extras (leads, follow-ups, members' rating).
 * Other roles keep their own My Performance page.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, Award, BarChart3, CheckCircle2, Dumbbell, Lightbulb, RefreshCw, Star, Target, TrendingUp, Trophy, UserPlus, Users, Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../components/ui/sheet";
import {
  BarRows, ChartTip, Delta, Empty, Kpi, Legend, Panel, Seg, Status, axisTick, fmtInt, pctChange, seriesOf, styles, usePalette,
} from "../components/overview/overview-kit";
import { ReportActions, type ReportDocument, col, countCol, kpiSection, moneyCol, tableSection } from "../components/report-export";
import { useCurrency } from "../utils/currency";
import { resolveBackendImageUrl } from "../utils/resolve-image-url";
import {
  performanceService, type MetricCode, type OverviewRow, type PerformanceOverview, type PeriodFigures, type StaffExtra,
} from "../utils/supabase/performance-service";
import sp from "../components/performance/staff-performance.module.css";

type Window = "this" | "last" | "q" | "h" | "y";
type RankBy = "score" | "revenue" | "admissions" | "conversions" | "sessions" | "classes" | "rating" | "targets";

const WINDOWS: [Window, string][] = [["this", "This month"], ["last", "Last month"], ["q", "3 months"], ["h", "6 months"], ["y", "12 months"]];
const RANK_BY: [RankBy, string][] = [
  ["score", "Overall score"], ["revenue", "Revenue"], ["admissions", "New members"], ["conversions", "Lead conversions"],
  ["sessions", "PT sessions"], ["classes", "Classes taught"], ["rating", "Member rating"], ["targets", "Targets reached"],
];
/** Weights of the overall score; metrics nobody did in the period drop out and the rest re-weigh. */
const WEIGHTS = { revenue: 35, admissions: 15, conversions: 15, delivery: 15, targets: 10, rating: 10 };
const TONES = ["#2a78d6", "#1baf7a", "#6250d6", "#c2410c", "#0e9fb5", "#b45309", "#be185d", "#4d7c0f"];

interface Totals {
  revenue: number; admissions: number; admissionAmt: number; conversions: number; posCount: number; posAmt: number;
  ptSales: number; ptAmt: number; sessions: number; classes: number; attendees: number; commission: number; targetPct: number | null;
}
interface Person {
  row: OverviewRow; tone: string; cur: Totals; prev: Totals | null; extra: StaffExtra | null; score: number;
  monthly: { period: string; label: string; revenue: number; admissions: number; conversions: number; sessions: number }[];
  goals: PeriodFigures["goals"];
}

const amt = (m: PeriodFigures, c: MetricCode) => Number(m.achieved?.[c]?.amount ?? 0);
const cnt = (m: PeriodFigures, c: MetricCode) => Number(m.achieved?.[c]?.count ?? 0);
const monthLabel = (p: string) => new Date(`${p}-01T00:00:00`).toLocaleString(undefined, { month: "short" });
const monthLong = (p: string) => new Date(`${p}-01T00:00:00`).toLocaleString(undefined, { month: "long", year: "numeric" });
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join("") || "?";

function totalsOf(months: PeriodFigures[]): Totals {
  const t: Totals = { revenue: 0, admissions: 0, admissionAmt: 0, conversions: 0, posCount: 0, posAmt: 0, ptSales: 0, ptAmt: 0, sessions: 0, classes: 0, attendees: 0, commission: 0, targetPct: null };
  const pcts: number[] = [];
  for (const m of months) {
    t.revenue += amt(m, "REVENUE_TOTAL");
    t.admissions += cnt(m, "MEMBER_ADMISSION"); t.admissionAmt += amt(m, "MEMBER_ADMISSION");
    t.conversions += cnt(m, "LEAD_CONVERSION");
    t.posCount += cnt(m, "POS_SALE"); t.posAmt += amt(m, "POS_SALE");
    t.ptSales += cnt(m, "PT_SALE"); t.ptAmt += amt(m, "PT_SALE");
    t.sessions += cnt(m, "PT_SESSION_DELIVERED");
    t.classes += cnt(m, "CLASS_TAUGHT"); t.attendees += cnt(m, "CLASS_ATTENDEE");
    t.commission += Number(m.commission ?? 0);
    for (const g of m.goals ?? []) if (g.goal > 0 && g.percent != null) pcts.push(Math.min(150, Number(g.percent)));
  }
  t.targetPct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
  return t;
}

function Avatar({ name, photo, tone, large }: { name: string; photo: string | null; tone: string; large?: boolean }) {
  const [broken, setBroken] = useState(false);
  const src = photo ? resolveBackendImageUrl(photo) : null;
  return src && !broken
    ? <img src={src} alt="" className={`${sp.photo} ${large ? sp.photoLg : ""}`} onError={() => setBroken(true)} />
    : <span className={`${sp.initials} ${large ? sp.initialsLg : ""}`} style={{ ["--tone" as any]: tone }}>{initials(name)}</span>;
}

function Change({ cur, prev }: { cur: number; prev: number | undefined | null }) {
  if (prev == null) return null;
  const pct = pctChange(cur, prev);
  if (pct == null || pct === 0) return null;
  return <span className={sp.change} data-tone={pct > 0 ? "good" : "bad"}>{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%</span>;
}

export function StaffPerformance() {
  const navigate = useNavigate();
  const palette = usePalette();
  const series = seriesOf(palette);
  const { formatCurrency } = useCurrency();
  const money = useCallback((n: number) => formatCurrency(n, { maximumFractionDigits: 0 }), [formatCurrency]);
  const compact = useCallback((n: number) => formatCurrency(n, { notation: "compact", maximumFractionDigits: 1 } as Intl.NumberFormatOptions), [formatCurrency]);

  const [data, setData] = useState<PerformanceOverview | null>(null);
  const [extras, setExtras] = useState<Map<number, StaffExtra>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [win, setWin] = useState<Window>("this");
  const [rankBy, setRankBy] = useState<RankBy>("score");
  const [open, setOpen] = useState<Person | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const now = new Date();
      const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const fromD = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      const from = `${fromD.getFullYear()}-${String(fromD.getMonth() + 1).padStart(2, "0")}`;
      const [ov, ex] = await Promise.all([
        performanceService.overview(from, to),
        performanceService.staffExtras().catch(() => [] as StaffExtra[]), // the page still works without the extras
      ]);
      setData(ov);
      setExtras(new Map(ex.map(e => [e.staff_id, e])));
    } catch (e: any) {
      setError(e?.message || "Couldn't load staff performance.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Months in the chosen window and the window just before it (for changes).
  const { curMonths, prevMonths, label } = useMemo(() => {
    const periods = data?.periods ?? [];
    const cur = data?.current_period ?? periods[periods.length - 1];
    const idx = Math.max(0, periods.indexOf(cur));
    const span = win === "q" ? 3 : win === "h" ? 6 : win === "y" ? 12 : 1;
    const end = win === "last" ? idx - 1 : idx;
    const curP = periods.slice(Math.max(0, end - span + 1), end + 1);
    const prevP = periods.slice(Math.max(0, end - 2 * span + 1), Math.max(0, end - span + 1));
    const lbl = curP.length === 0 ? "" : curP.length === 1 ? monthLong(curP[0]) : `${monthLabel(curP[0])} – ${monthLong(curP[curP.length - 1])}`;
    // No change arrows for the month in progress: the figures are whole months, so day 13 against
    // all of last month would always look like a drop.
    const comparable = win !== "this" && prevP.length === curP.length;
    return { curMonths: new Set(curP), prevMonths: comparable ? new Set(prevP) : null, label: lbl };
  }, [data, win]);

  const people: Person[] = useMemo(() => {
    if (!data) return [];
    const base = data.rows.map((row, i) => {
      const cur = totalsOf(row.months.filter(m => curMonths.has(m.period)));
      const prev = prevMonths ? totalsOf(row.months.filter(m => prevMonths.has(m.period))) : null;
      const monthly = row.months.map(m => ({ period: m.period, label: monthLabel(m.period), revenue: amt(m, "REVENUE_TOTAL"), admissions: cnt(m, "MEMBER_ADMISSION"), conversions: cnt(m, "LEAD_CONVERSION"), sessions: cnt(m, "PT_SESSION_DELIVERED") + cnt(m, "CLASS_TAUGHT") }));
      const latest = row.months.find(m => m.period === data.current_period) ?? row.months[row.months.length - 1];
      return { row, tone: TONES[i % TONES.length], cur, prev, extra: extras.get(row.staff_id) ?? null, score: 0, monthly, goals: latest?.goals ?? [] };
    });
    // Overall score: each part relative to the best person in the period, weighted.
    const max = {
      revenue: Math.max(0, ...base.map(p => p.cur.revenue)), admissions: Math.max(0, ...base.map(p => p.cur.admissions)),
      conversions: Math.max(0, ...base.map(p => p.cur.conversions)), delivery: Math.max(0, ...base.map(p => p.cur.sessions + p.cur.classes)),
      targets: base.some(p => p.cur.targetPct != null) ? 1 : 0, rating: base.some(p => (p.extra?.rating ?? 0) > 0) ? 1 : 0,
    };
    for (const p of base) {
      const parts: [number, number][] = [];
      if (max.revenue) parts.push([WEIGHTS.revenue, p.cur.revenue / max.revenue]);
      if (max.admissions) parts.push([WEIGHTS.admissions, p.cur.admissions / max.admissions]);
      if (max.conversions) parts.push([WEIGHTS.conversions, p.cur.conversions / max.conversions]);
      if (max.delivery) parts.push([WEIGHTS.delivery, (p.cur.sessions + p.cur.classes) / max.delivery]);
      if (max.targets) parts.push([WEIGHTS.targets, Math.min(1, (p.cur.targetPct ?? 0) / 100)]);
      if (max.rating) parts.push([WEIGHTS.rating, (p.extra?.rating ?? 0) / 5]);
      const w = parts.reduce((n, [x]) => n + x, 0);
      p.score = w ? Math.round((parts.reduce((n, [x, v]) => n + x * v, 0) / w) * 100) : 0;
    }
    return base;
  }, [data, extras, curMonths, prevMonths]);

  const valueOf = useCallback((p: Person, by: RankBy) => ({
    score: p.score, revenue: p.cur.revenue, admissions: p.cur.admissions, conversions: p.cur.conversions,
    sessions: p.cur.sessions, classes: p.cur.classes, rating: p.extra?.rating ?? 0, targets: p.cur.targetPct ?? -1,
  }[by]), []);
  const ranked = useMemo(() => [...people].sort((a, b) => valueOf(b, rankBy) - valueOf(a, rankBy) || b.cur.revenue - a.cur.revenue || a.row.name.localeCompare(b.row.name)), [people, rankBy, valueOf]);
  const active = ranked.filter(p => p.score > 0 || p.cur.revenue > 0);

  const team = useMemo(() => totalsOf(data?.rows.flatMap(r => r.months.filter(m => curMonths.has(m.period))) ?? []), [data, curMonths]);
  const teamPrev = useMemo(() => prevMonths ? totalsOf(data?.rows.flatMap(r => r.months.filter(m => prevMonths.has(m.period))) ?? []) : null, [data, prevMonths]);

  const insights = useMemo(() => {
    const out: { type: string; tag: string; title: string; detail: string }[] = [];
    const top = [...people].sort((a, b) => b.cur.revenue - a.cur.revenue)[0];
    if (top && top.cur.revenue > 0) out.push({ type: "positive", tag: "Top earner", title: `${top.row.name} brought in ${money(top.cur.revenue)}`, detail: `${team.revenue ? Math.round((top.cur.revenue / team.revenue) * 100) : 0}% of the team's revenue in ${label}.` });
    const improved = people.filter(p => p.prev && p.prev.revenue > 0).map(p => ({ p, d: p.cur.revenue - p.prev!.revenue })).sort((a, b) => b.d - a.d)[0];
    if (improved && improved.d > 0) out.push({ type: "info", tag: "Most improved", title: `${improved.p.row.name}: +${money(improved.d)}`, detail: `Up ${pctChange(improved.p.cur.revenue, improved.p.prev!.revenue)}% on the period before.` });
    const rated = people.filter(p => (p.extra?.rating_count ?? 0) >= 3).sort((a, b) => (b.extra!.rating) - (a.extra!.rating))[0];
    if (rated) out.push({ type: "positive", tag: "Members' favourite", title: `${rated.row.name} is rated ${rated.extra!.rating.toFixed(1)} / 5`, detail: `From ${rated.extra!.rating_count} session reviews.` });
    const behind = people.filter(p => p.cur.targetPct != null && p.cur.targetPct < 50).sort((a, b) => (a.cur.targetPct ?? 0) - (b.cur.targetPct ?? 0))[0];
    if (behind) out.push({ type: "warning", tag: "Needs support", title: `${behind.row.name} is at ${behind.cur.targetPct}% of target`, detail: "Check in on their leads and follow-ups." });
    const idle = people.filter(p => p.score === 0 && p.cur.revenue === 0).length;
    if (idle) out.push({ type: "warning", tag: "No activity", title: `${idle} staff with nothing recorded`, detail: "Sales, sessions and leads are credited by name — check they're entered under the right person." });
    return out.slice(0, 4);
  }, [people, team, label, money]);

  const revenueRows = useMemo(() => [...people].filter(p => p.cur.revenue > 0).sort((a, b) => b.cur.revenue - a.cur.revenue).slice(0, 10)
    .map(p => ({ name: p.row.name.split(" ")[0], tipLabel: p.row.name, memberships: Math.max(0, p.cur.revenue - p.cur.posAmt - p.cur.ptAmt), pos: p.cur.posAmt, pt: p.cur.ptAmt })), [people]);
  const top5 = useMemo(() => [...people].sort((a, b) => b.cur.revenue - a.cur.revenue).slice(0, 5).filter(p => p.cur.revenue > 0), [people]);
  const trend = useMemo(() => (data?.periods ?? []).slice(-6).map(per => {
    const o: Record<string, any> = { label: monthLabel(per) };
    top5.forEach(p => { o[`s${p.row.staff_id}`] = p.monthly.find(m => m.period === per)?.revenue ?? 0; });
    return o;
  }), [data, top5]);

  const buildReport = (): ReportDocument => ({
    title: "Staff Performance",
    period: { label },
    sections: [
      kpiSection([
        { label: "Team revenue", value: team.revenue, format: "money" },
        { label: "New members", value: team.admissions, format: "integer" },
        { label: "Lead conversions", value: team.conversions, format: "integer" },
        { label: "PT sessions", value: team.sessions, format: "integer" },
        { label: "Classes taught", value: team.classes, format: "integer" },
        { label: "Commission", value: team.commission, format: "money" },
      ], label),
      tableSection(`Ranked by ${RANK_BY.find(r => r[0] === rankBy)![1].toLowerCase()}`, [
        col("rank", "#", "integer"), col("name", "Staff"), col("role", "Role"), col("score", "Score", "integer"),
        moneyCol("revenue", "Revenue"), countCol("admissions", "New members"), countCol("conversions", "Conversions"),
        moneyCol("pos", "POS sales"), moneyCol("pt", "PT sales"), countCol("sessions", "PT sessions"), countCol("classes", "Classes"),
        col("followups", "Follow-ups done"), col("rating", "Rating"), col("targets", "Targets"), moneyCol("commission", "Commission"),
      ], ranked.map((p, i) => ({
        rank: i + 1, name: p.row.name, role: p.row.role ?? "", score: p.score, revenue: p.cur.revenue, admissions: p.cur.admissions,
        conversions: p.cur.conversions, pos: p.cur.posAmt, pt: p.cur.ptAmt, sessions: p.cur.sessions, classes: p.cur.classes,
        followups: p.extra?.follow_ups_total ? `${Math.round((p.extra.follow_ups_completed / p.extra.follow_ups_total) * 100)}%` : "—",
        rating: p.extra?.rating ? p.extra.rating.toFixed(1) : "—", targets: p.cur.targetPct != null ? `${p.cur.targetPct}%` : "—", commission: p.cur.commission,
      })), { totals: true }),
    ],
  });

  if (loading && !data) {
    return <div className={styles.root}><div className={styles.centered}><RefreshCw className="h-6 w-6 animate-spin text-primary" />Loading staff performance…</div></div>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Staff Performance</h1>
          <div className={styles.subtitle}>{label ? `${label} · ` : ""}{fmtInt(people.length)} staff · who performed best, and how everyone is doing</div>
        </div>
        <div className={styles.actions}>
          <Seg value={win} onChange={setWin} label="Period" options={WINDOWS} />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
          <ReportActions report={buildReport} disabled={!data || loading} menuLabel={`Staff performance · ${label}`} />
          <Button size="sm" onClick={() => navigate("/my-targets")}><Target className="h-4 w-4 mr-2" />Staff Targets</Button>
        </div>
      </div>

      {error && <div className={`${styles.card} ${styles.filters}`} style={{ color: "var(--bad-ink, var(--destructive))" }}><AlertTriangle size={16} />{error}</div>}

      {data && people.length === 0 && (
        <div className={`${styles.card} ${styles.panel}`}>
          <Empty icon={Users} title="No staff yet" text="Add your staff and trainers, and their sales, sessions and leads will be ranked here."
            action={<Button size="sm" onClick={() => navigate("/staffs-trainers")}>Staffs & Trainers</Button>} />
        </div>
      )}

      {data && people.length > 0 && (
        <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Podium */}
          {active.length > 0 && (
            <div className={sp.podium}>
              {active.slice(0, 3).map((p, i) => (
                <button key={p.row.staff_id} type="button" className={sp.place} data-rank={i + 1} onClick={() => setOpen(p)}>
                  <span className={sp.medal}>{i + 1}</span>
                  <div className={sp.placeTop}>
                    <Avatar name={p.row.name} photo={p.row.photo_url} tone={p.tone} large />
                    <div style={{ minWidth: 0 }}>
                      <div className={sp.placeName}>{p.row.name}</div>
                      <div className={sp.placeRole}>{[p.row.role, p.row.branch].filter(Boolean).join(" · ") || "Staff"}</div>
                    </div>
                  </div>
                  <div className={sp.placeScore}>
                    <b>{rankBy === "score" ? p.score : rankBy === "revenue" ? compact(p.cur.revenue) : rankBy === "rating" ? (p.extra?.rating ?? 0).toFixed(1) : rankBy === "targets" ? `${p.cur.targetPct ?? 0}%` : fmtInt(valueOf(p, rankBy))}</b>
                    <span>{RANK_BY.find(r => r[0] === rankBy)![1].toLowerCase()}</span>
                    <Change cur={p.cur.revenue} prev={p.prev?.revenue} />
                  </div>
                  <div className={sp.placeStats}>
                    <div className={sp.placeStat}><span>Revenue</span><b>{money(p.cur.revenue)}</b></div>
                    <div className={sp.placeStat}><span>New members</span><b>{fmtInt(p.cur.admissions)}</b></div>
                    <div className={sp.placeStat}><span>Sessions</span><b>{fmtInt(p.cur.sessions + p.cur.classes)}</b></div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className={styles.kpis}>
            <Kpi icon={Wallet} tone="blue" label="Team revenue" value={money(team.revenue)} delta={teamPrev ? <Delta pct={pctChange(team.revenue, teamPrev.revenue)} /> : undefined}
              hint={team.revenue && people.length ? `${money(team.revenue / Math.max(1, active.length))} per active person` : undefined} />
            <Kpi icon={UserPlus} tone="teal" label="New members" value={fmtInt(team.admissions)} delta={teamPrev ? <Delta pct={pctChange(team.admissions, teamPrev.admissions)} /> : undefined} onClick={() => setRankBy("admissions")} />
            <Kpi icon={TrendingUp} tone="green" label="Lead conversions" value={fmtInt(team.conversions)} delta={teamPrev ? <Delta pct={pctChange(team.conversions, teamPrev.conversions)} /> : undefined} onClick={() => setRankBy("conversions")} />
            <Kpi icon={Dumbbell} tone="violet" label="PT sessions" value={fmtInt(team.sessions)} hint={`${fmtInt(team.ptSales)} PT sales · ${money(team.ptAmt)}`} onClick={() => setRankBy("sessions")} />
            <Kpi icon={Users} tone="orange" label="Classes taught" value={fmtInt(team.classes)} hint={`${fmtInt(team.attendees)} attendees`} onClick={() => setRankBy("classes")} />
            <Kpi icon={Award} tone="amber" label="Commission" value={money(team.commission)} hint={team.targetPct != null ? `targets ${team.targetPct}% reached on average` : "no targets set"} onClick={() => setRankBy("targets")} />
          </div>

          <div className={styles.row2}>
            <Panel title="Revenue by staff" icon={BarChart3} scope={label} sub="Memberships, POS and PT sales credited to each person">
              {revenueRows.length === 0 ? <Empty icon={BarChart3} title="No revenue credited to staff in this period" text="Receipts and sales are credited to the staff member who processed them." /> : (
                <>
                  <div className={styles.chart}>
                    <ResponsiveContainer>
                      <BarChart data={revenueRows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke={palette.grid} />
                        <XAxis dataKey="name" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} interval={0} />
                        <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={60} tickFormatter={v => compact(Number(v))} />
                        <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                        <Bar isAnimationActive={false} stackId="r" dataKey="memberships" name="Memberships" fill={series[0]} maxBarSize={38} />
                        <Bar isAnimationActive={false} stackId="r" dataKey="pos" name="POS" fill={series[1]} maxBarSize={38} />
                        <Bar isAnimationActive={false} stackId="r" dataKey="pt" name="PT" fill={series[3]} radius={[4, 4, 0, 0]} maxBarSize={38} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <Legend items={[{ label: "Memberships", color: series[0] }, { label: "POS", color: series[1] }, { label: "PT", color: series[3] }]} />
                </>
              )}
            </Panel>
            <Panel title="Worth a look" icon={Lightbulb} sub={label}>
              <div className={styles.insights}>
                {insights.length === 0 ? <Empty icon={CheckCircle2} title="Nothing stands out yet" text="Highlights appear once staff have sales, sessions or reviews in the period." /> : insights.map(i => (
                  <div key={i.title} className={styles.insight} data-type={i.type}>
                    <span className={styles.insightIcon}>{i.type === "positive" ? <Trophy size={15} /> : i.type === "info" ? <TrendingUp size={15} /> : <AlertTriangle size={15} />}</span>
                    <div><div className={styles.insightTag}>{i.tag}</div><div className={styles.insightTitle}>{i.title}</div><div className={styles.insightDetail}>{i.detail}</div></div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel title="Leaderboard" icon={Trophy} scope={label} sub="Click a person for their months, targets and reviews"
            action={<select className={sp.select} value={rankBy} onChange={e => setRankBy(e.target.value as RankBy)} aria-label="Rank by">
              {RANK_BY.map(([v, l]) => <option key={v} value={v}>Rank by: {l}</option>)}
            </select>}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th><th>Staff</th><th>Score</th><th className={styles.num}>Revenue</th><th className={styles.num}>New members</th>
                    <th className={styles.num}>Conversions</th><th className={styles.num}>POS</th><th className={styles.num}>PT sales</th>
                    <th className={styles.num}>PT sessions</th><th className={styles.num}>Classes</th><th className={styles.num}>Follow-ups</th>
                    <th className={styles.num}>Rating</th><th className={styles.num}>Targets</th><th className={styles.num}>Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((p, i) => {
                    const x = p.extra;
                    const fu = x?.follow_ups_total ? Math.round((x.follow_ups_completed / x.follow_ups_total) * 100) : null;
                    const conv = x?.leads_assigned ? Math.round((x.leads_converted / x.leads_assigned) * 100) : null;
                    return (
                      <tr key={p.row.staff_id} className={`${sp.clickRow} ${open?.row.staff_id === p.row.staff_id ? sp.selectedRow : ""}`} onClick={() => setOpen(p)}>
                        <td><span className={sp.rank} data-top={i < 3}>{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span></td>
                        <td>
                          <div className={sp.person}>
                            <Avatar name={p.row.name} photo={p.row.photo_url} tone={p.tone} />
                            <div style={{ minWidth: 0 }}><div className={sp.name}>{p.row.name}</div><div className={sp.sub}>{[p.row.role, p.row.branch].filter(Boolean).join(" · ") || "Staff"}</div></div>
                          </div>
                        </td>
                        <td><div className={sp.score}><div className={sp.scoreBar}><div className={sp.scoreFill} style={{ width: `${p.score}%`, ["--fill" as any]: p.score >= 70 ? palette.s3 : p.score >= 40 ? palette.s1 : palette.s5 }} /></div><span className={sp.scoreNum}>{p.score}</span></div></td>
                        <td className={styles.num}><div style={{ fontWeight: 700 }}>{money(p.cur.revenue)}</div><Change cur={p.cur.revenue} prev={p.prev?.revenue} /></td>
                        <td className={styles.num}>{fmtInt(p.cur.admissions)}</td>
                        <td className={styles.num}><div>{fmtInt(p.cur.conversions)}</div>{conv != null && <div className={sp.sub}>{conv}% of {fmtInt(x!.leads_assigned)} leads</div>}</td>
                        <td className={styles.num}>{p.cur.posAmt ? money(p.cur.posAmt) : "—"}</td>
                        <td className={styles.num}>{p.cur.ptAmt ? money(p.cur.ptAmt) : "—"}</td>
                        <td className={styles.num}>{fmtInt(p.cur.sessions)}</td>
                        <td className={styles.num}><div>{fmtInt(p.cur.classes)}</div>{p.cur.attendees > 0 && <div className={sp.sub}>{fmtInt(p.cur.attendees)} attended</div>}</td>
                        <td className={styles.num}>{fu != null ? `${fu}%` : "—"}</td>
                        <td className={styles.num}>{x?.rating ? <span title={`${x.rating_count} reviews`}><Star size={12} style={{ display: "inline", verticalAlign: "-1px", color: "#d4a017", fill: "#d4a017" }} /> {x.rating.toFixed(1)}</span> : "—"}</td>
                        <td className={styles.num}>{p.cur.targetPct != null ? <Status kind={p.cur.targetPct >= 100 ? "good" : p.cur.targetPct >= 60 ? "info" : "warning"}>{p.cur.targetPct}%</Status> : <span className={styles.muted}>—</span>}</td>
                        <td className={styles.num}>{p.cur.commission ? money(p.cur.commission) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className={sp.note}>
              Score (0–100) weighs revenue {WEIGHTS.revenue}%, new members {WEIGHTS.admissions}%, lead conversions {WEIGHTS.conversions}%, PT sessions & classes {WEIGHTS.delivery}%,
              targets reached {WEIGHTS.targets}% and member rating {WEIGHTS.rating}%, each against the best person in the period; anything nobody did in the period is left out.
              Revenue, sessions and conversions are the same figures as Staff Targets and commission. Leads, follow-ups and rating are all-time.
            </div>
          </Panel>

          <div className={styles.cols2}>
            <Panel title="Monthly revenue — top 5" icon={TrendingUp} scope="Last 6 months" sub="How the top earners of the period did month by month">
              {top5.length === 0 ? <Empty icon={TrendingUp} title="No revenue credited yet" /> : (
                <>
                  <div className={styles.chart}>
                    <ResponsiveContainer>
                      <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid vertical={false} stroke={palette.grid} />
                        <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                        <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={60} tickFormatter={v => compact(Number(v))} />
                        <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} />
                        {top5.map((p, i) => <Line key={p.row.staff_id} isAnimationActive={false} dataKey={`s${p.row.staff_id}`} name={p.row.name} stroke={series[i % series.length]} strokeWidth={2} dot={{ r: 3 }} />)}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <Legend items={top5.map((p, i) => ({ label: p.row.name, color: series[i % series.length], line: true }))} />
                </>
              )}
            </Panel>
            <Panel title="Trainers" icon={Dumbbell} scope={label} sub="PT sessions and classes delivered, with members' rating">
              <BarRows rows={[...people].filter(p => p.cur.sessions + p.cur.classes > 0).sort((a, b) => (b.cur.sessions + b.cur.classes) - (a.cur.sessions + a.cur.classes)).slice(0, 8)
                .map(p => ({ key: String(p.row.staff_id), label: p.row.name, value: p.cur.sessions + p.cur.classes, color: palette.s4,
                  meta: `${fmtInt(p.cur.sessions)} PT · ${fmtInt(p.cur.classes)} classes${p.extra?.rating ? ` · ★ ${p.extra.rating.toFixed(1)}` : ""}` }))}
                fmt={n => fmtInt(n)} empty="No PT sessions or classes delivered in this period." />
            </Panel>
          </div>
        </div>
      )}

      <PersonSheet person={open} onClose={() => setOpen(null)} money={money} compact={compact} label={label} />
    </div>
  );
}

function PersonSheet({ person: p, onClose, money, compact, label }: {
  person: Person | null; onClose: () => void; money: (n: number) => string; compact: (n: number) => string; label: string;
}) {
  const palette = usePalette();
  if (!p) return null;
  const x = p.extra;
  const chart = p.monthly.slice(-6);
  return (
    <Sheet open={!!p} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent className={sp.sheet} style={{ width: "min(100vw, 36rem)", maxWidth: "100vw", overflowY: "auto" }}>
        <SheetHeader>
          <div className={sp.person} style={{ gap: 14 }}>
            <Avatar name={p.row.name} photo={p.row.photo_url} tone={p.tone} large />
            <div style={{ minWidth: 0 }}>
              <SheetTitle className={sp.sheetTitle}>{p.row.name}</SheetTitle>
              <SheetDescription>{[p.row.role, p.row.department, p.row.branch].filter(Boolean).join(" · ") || "Staff"}{p.row.plan ? ` · plan: ${p.row.plan.name}` : ""}</SheetDescription>
            </div>
          </div>
          <div className={styles.chips} style={{ marginTop: 10 }}>
            <Status kind={p.score >= 70 ? "good" : p.score >= 40 ? "info" : "warning"}>Score {p.score}</Status>
            {p.cur.targetPct != null && <Status kind={p.cur.targetPct >= 100 ? "good" : "info"}>Targets {p.cur.targetPct}%</Status>}
            {x?.rating ? <Status kind="info">★ {x.rating.toFixed(1)} · {x.rating_count} reviews</Status> : null}
          </div>
        </SheetHeader>
        <div className={sp.sheetBody}>
          <div>
            <div className={sp.sectionTitle} style={{ marginBottom: 8 }}>{label}</div>
            <div className={styles.facts}>
              <div className={styles.fact}><span className={styles.factLabel}>Revenue</span><span className={styles.factValue}>{money(p.cur.revenue)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>New members</span><span className={styles.factValue}>{fmtInt(p.cur.admissions)} · {money(p.cur.admissionAmt)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Lead conversions</span><span className={styles.factValue}>{fmtInt(p.cur.conversions)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>POS sales</span><span className={styles.factValue}>{fmtInt(p.cur.posCount)} · {money(p.cur.posAmt)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>PT sales</span><span className={styles.factValue}>{fmtInt(p.cur.ptSales)} · {money(p.cur.ptAmt)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>PT sessions / classes</span><span className={styles.factValue}>{fmtInt(p.cur.sessions)} / {fmtInt(p.cur.classes)} ({fmtInt(p.cur.attendees)} attended)</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Commission</span><span className={styles.factValue}>{money(p.cur.commission)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Leads (all time)</span><span className={styles.factValue}>{x ? `${fmtInt(x.leads_converted)} of ${fmtInt(x.leads_assigned)} converted` : "—"}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Follow-ups (all time)</span><span className={styles.factValue}>{x?.follow_ups_total ? `${fmtInt(x.follow_ups_completed)} of ${fmtInt(x.follow_ups_total)} done` : "—"}</span></div>
            </div>
          </div>

          <div>
            <div className={sp.sectionTitle} style={{ marginBottom: 8 }}>Revenue, last 6 months</div>
            <div style={{ height: 170 }}>
              <ResponsiveContainer>
                <BarChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={palette.grid} />
                  <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                  <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={56} tickFormatter={v => compact(Number(v))} />
                  <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                  <Bar isAnimationActive={false} dataKey="revenue" name="Revenue" fill={p.tone} radius={[4, 4, 0, 0]} maxBarSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <div className={sp.sectionTitle} style={{ marginBottom: 8 }}>This month's targets</div>
            {p.goals.filter(g => g.goal > 0).length === 0 ? <div className={styles.muted} style={{ fontSize: "var(--text-sm)" }}>No targets set for this month.</div>
              : p.goals.filter(g => g.goal > 0).map(g => {
                const pct = g.percent ?? (g.goal ? (g.achieved / g.goal) * 100 : 0);
                const fmtV = (n: number) => g.measure === "amount" ? money(n) : fmtInt(n);
                return (
                  <div key={`${g.metric}-${g.measure}`} className={sp.goal}>
                    <div className={sp.goalHead}><span>{g.label}</span><span><b>{fmtV(g.achieved)}</b> / {fmtV(g.goal)} · {Math.round(pct)}%</span></div>
                    <div className={styles.track}><div className={styles.fill} style={{ width: `${Math.min(100, pct)}%`, ["--fill" as any]: pct >= 100 ? palette.s3 : palette.s1 }} /></div>
                  </div>
                );
              })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
