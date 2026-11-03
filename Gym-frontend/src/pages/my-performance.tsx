import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  Activity, BarChart3, CheckCircle2, Heart, Info, ListChecks, RefreshCw, Star, Target, TrendingUp, Trophy, UserPlus, Users,
} from "lucide-react";
import { useCurrency } from "../utils/currency";
import { staffService, StaffTarget, StaffPerformance } from "../utils/supabase/staff-service";
import { Button } from "../components/ui/button";
import {
  styles, usePalette, axisTick, Kpi, Panel, ChartTip, BarRows, Empty, Seg, Delta, fmtInt,
} from "../components/overview/overview-kit";
import mp from "../components/performance/my-performance.module.css";

interface MyPerformanceProps {
  onNavigate?: (section: string) => void;
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const STATUS_TEXT: Record<string, string> = {
  ACHIEVED: "Target achieved", AHEAD: "Ahead of pace", ON_TRACK: "On track", AT_RISK: "Behind pace", NO_TARGET: "No target this month",
};

function Ring({ pct, label, sub }: { pct: number; label: string; sub: string }) {
  const r = 44, c = 2 * Math.PI * r;
  const shown = Math.max(0, Math.min(100, pct));
  return (
    <div className={mp.ring} aria-label={`${label} ${sub}`}>
      <svg viewBox="0 0 100 100"><circle className={mp.ringTrack} cx="50" cy="50" r={r} />
        <circle className={mp.ringFill} cx="50" cy="50" r={r} strokeDasharray={c} strokeDashoffset={c * (1 - shown / 100)} /></svg>
      <div className={mp.ringLabel}><span className={mp.ringValue}>{label}</span><span className={mp.ringSub}>{sub}</span></div>
    </div>
  );
}

function Goal({ name, achieved, target, fmt, pace, fill }: { name: string; achieved: number; target: number; fmt: (n: number) => string; pace?: number; fill?: string }) {
  const pct = target > 0 ? Math.round((achieved / target) * 100) : 0;
  return (
    <div className={mp.goal}>
      <div className={mp.goalHead}>
        <span className={mp.goalName}>{name}</span>
        <span className={mp.goalVal}><b>{fmt(achieved)}</b> / {fmt(target)} · {pct}%</span>
      </div>
      <div className={mp.bar}>
        <div className={mp.barFill} style={{ width: `${Math.min(100, pct)}%`, ["--fill" as any]: fill }} />
        {pace != null && pace > 0 && pace < 100 && <span className={mp.pace} style={{ left: `${pace}%` }} title="Where you should be by today" />}
      </div>
    </div>
  );
}

/**
 * My Performance — the signed-in user's own figures for this month (GET /mobile/staff/performance).
 * Revenue and conversions are what was recorded under this person; accounts without a Staff record
 * (Admin, owner) are measured by their login and have no targets or leaderboard.
 */
export function MyPerformance(_props: MyPerformanceProps) {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const palette = usePalette();
  const money = useCallback((n: number) => formatCurrency(n, { maximumFractionDigits: 0 }), [formatCurrency]);
  const compact = useCallback((n: number) => formatCurrency(n, { notation: "compact", maximumFractionDigits: 1 } as Intl.NumberFormatOptions), [formatCurrency]);

  const [performance, setPerformance] = useState<StaffPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // null until known; false for accounts with no Staff record (Admin, owner).
  const [hasStaffRecord, setHasStaffRecord] = useState<boolean | null>(null);
  const [myTargets, setMyTargets] = useState<StaffTarget[]>([]);
  const [metric, setMetric] = useState<"revenue" | "conversions">("revenue");

  const loadPerformance = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setPerformance(await staffService.getMyPerformance());
    } catch (error) {
      console.error("Failed to load my performance:", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPerformance();
    let cancelled = false;
    (async () => {
      try {
        const profile = await staffService.getMyProfile();
        if (!cancelled) setHasStaffRecord(!!profile);
        if (!profile) return;
        const targets = await staffService.getTargets(undefined, undefined, undefined, Number(profile.id));
        if (!cancelled) setMyTargets(targets);
      } catch (error) {
        console.error("Failed to load my targets:", error);
      }
    })();
    return () => { cancelled = true; };
  }, [loadPerformance]);

  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const pace = Math.round((now.getDate() / daysInMonth) * 100);

  const p = performance;
  const revenue = p?.revenue_target.achieved ?? 0;
  const revenueTarget = p?.revenue_target.target ?? 0;
  const conversions = p?.conversion_target.achieved ?? 0;
  const conversionTarget = p?.conversion_target.target ?? 0;
  const rating = p?.summary.rating ?? 0;
  const status = p?.motivation?.status ?? (revenueTarget > 0 ? "ON_TRACK" : "NO_TARGET");

  const monthTarget = useMemo(
    () => myTargets.find(t => p && t.year === p.period.year && t.month === p.period.month),
    [myTargets, p],
  );
  const pastTargets = useMemo(
    () => myTargets.filter(t => t !== monthTarget && t.revenue_target > 0)
      .sort((a, b) => (b.year * 12 + (b.month || 0)) - (a.year * 12 + (a.month || 0))).slice(0, 4),
    [myTargets, monthTarget],
  );

  const trend = useMemo(() => (p?.trend ?? []).map((t, i, all) => ({
    ...t, current: i === all.length - 1, tipLabel: t.label + (i === all.length - 1 ? " (so far)" : ""),
  })), [p]);
  const lastMonth = trend.length >= 2 ? trend[trend.length - 2] : undefined;
  const best = trend.reduce((m, t) => Math.max(m, metric === "revenue" ? t.revenue : t.conversions), 0);

  const qualityRows = p ? [
    { key: "conv", label: "Lead conversion", value: p.breakdown.conversion_rate, color: palette.s1, meta: `${fmtInt(p.summary.lead_count)} leads assigned to you` },
    { key: "fu", label: "Follow-ups completed", value: p.breakdown.follow_up_completion, color: palette.s3, meta: "of the follow-ups assigned to you" },
    ...(rating > 0 ? [{ key: "sat", label: "Member satisfaction", value: p.breakdown.customer_satisfaction, color: palette.s5, meta: `${rating} / 5 from your session feedback` }] : []),
  ] : [];

  const topRevenue = Math.max(1, ...(p?.leaderboard ?? []).map(e => e.revenue));
  const me = p?.leaderboard.find(e => e.current_user);

  if (loading && !p) {
    return <div className={styles.root}><div className={styles.centered}><RefreshCw className="h-6 w-6 animate-spin text-primary" />Loading your performance…</div></div>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>My Performance</h1>
          <div className={styles.subtitle}>
            {p ? `${p.period.label} so far · day ${now.getDate()} of ${daysInMonth}` : "Your sales, leads and follow-ups"}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={loadPerformance} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          {hasStaffRecord && (
            <Button size="sm" onClick={() => navigate("/my-targets")}>
              <Target className="h-4 w-4 mr-2" />My Targets
            </Button>
          )}
        </div>
      </div>

      {!p ? (
        <div className={`${styles.card} ${styles.panel}`}>
          <Empty icon={Activity} title={failed ? "Couldn't load your performance" : "No performance data yet"}
            text={failed ? "Something went wrong while calculating your figures. Please try again in a moment." : "There's no personal performance data for this account yet."}
            action={<Button variant="outline" size="sm" onClick={loadPerformance}><RefreshCw className="h-4 w-4 mr-2" />Try again</Button>} />
        </div>
      ) : (
        <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {hasStaffRecord === false && (
            <div className={`${styles.card} ${styles.filters}`} style={{ alignItems: "flex-start", flexWrap: "nowrap", fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: 2, color: "var(--primary)" }} />
              <span>
                Your account isn't linked to a staff record, so these figures are the receipts, leads, follow-ups and POS sales recorded
                under your login. Targets and the branch leaderboard appear once the account is linked to a staff member in Staffs &amp; Trainers.
              </span>
            </div>
          )}

          {/* Where you stand this month */}
          <div className={`${styles.card} ${mp.hero}`} data-status={status}>
            {revenueTarget > 0
              ? <Ring pct={p.revenue_target.percentage} label={`${p.revenue_target.percentage}%`} sub="of target" />
              : <Ring pct={0} label="—" sub="no target" />}
            <div className={mp.heroText}>
              <span className={mp.heroTag}>{STATUS_TEXT[status] ?? status.replace(/_/g, " ")}</span>
              <span className={mp.heroTitle}>{money(revenue)} earned in {p.period.label}</span>
              <span className={mp.heroMsg}>
                {p.motivation?.message || (revenueTarget > 0 ? "" : "No target has been set for this month yet.")}
              </span>
            </div>
            <div className={mp.goals}>
              {revenueTarget > 0 || conversionTarget > 0 ? (
                <>
                  {revenueTarget > 0 && <Goal name="Revenue" achieved={revenue} target={revenueTarget} fmt={money} pace={pace} fill={palette.s1} />}
                  {conversionTarget > 0 && <Goal name="Conversions" achieved={conversions} target={conversionTarget} fmt={fmtInt} pace={pace} fill={palette.s3} />}
                  {monthTarget?.membership_revenue_target ? <Goal name="Memberships" achieved={monthTarget.membership_revenue_achieved ?? 0} target={monthTarget.membership_revenue_target} fmt={money} pace={pace} fill={palette.s4} /> : null}
                  {monthTarget?.pos_revenue_target ? <Goal name="POS sales" achieved={monthTarget.pos_revenue_achieved ?? 0} target={monthTarget.pos_revenue_target} fmt={money} pace={pace} fill={palette.s2} /> : null}
                  {monthTarget?.pt_revenue_target ? <Goal name="Personal training" achieved={monthTarget.pt_revenue_achieved ?? 0} target={monthTarget.pt_revenue_target} fmt={money} pace={pace} fill={palette.s6} /> : null}
                  <span className={mp.goalNote}>The marker shows where you'd be at an even pace ({pace}% of the month gone).</span>
                </>
              ) : (
                <span className={mp.goalNote}>
                  {hasStaffRecord === false ? "Targets are set per staff member." : "Once your manager sets a monthly target, your progress and pace show here."}
                </span>
              )}
            </div>
          </div>

          <div className={styles.kpis}>
            <Kpi icon={TrendingUp} tone="blue" label="Revenue" value={money(revenue)}
              delta={p.summary.growth_percentage ? <Delta pct={p.summary.growth_percentage} /> : undefined}
              hint={p.summary.growth_percentage ? "vs same days last month" : lastMonth ? `last month ${money(lastMonth.revenue)}` : undefined} />
            <Kpi icon={UserPlus} tone="green" label="Conversions" value={fmtInt(conversions)}
              hint={conversionTarget > 0 ? `target ${fmtInt(conversionTarget)}` : lastMonth ? `last month ${fmtInt(lastMonth.conversions)}` : "new members signed up"} />
            <Kpi icon={Users} tone="violet" label="Leads assigned" value={fmtInt(p.summary.lead_count)} hint="all leads in your name"
              onClick={() => navigate("/leads")} />
            <Kpi icon={Target} tone="teal" label="Lead conversion" value={`${p.breakdown.conversion_rate}%`} hint="of your leads became members" />
            <Kpi icon={ListChecks} tone="orange" label="Follow-ups done" value={`${p.breakdown.follow_up_completion}%`} hint="of follow-ups assigned to you"
              onClick={() => navigate("/follow-ups")} />
            <Kpi icon={Star} tone="amber" label="Member rating" value={rating > 0 ? `${rating} / 5` : "—"}
              hint={rating > 0 ? "from your sessions' feedback" : hasStaffRecord === false ? "for trainers' sessions" : "no ratings yet"} />
          </div>

          <div className={styles.row2}>
            <Panel title={metric === "revenue" ? "Revenue by month" : "Conversions by month"} icon={BarChart3} scope="Last 6 months"
              sub="This month is still in progress" action={<Seg value={metric} onChange={setMetric} label="Metric" options={[["revenue", "Revenue"], ["conversions", "Conversions"]]} />}>
              {trend.every(t => !t.revenue && !t.conversions) ? (
                <Empty icon={BarChart3} title="Nothing recorded under you yet" text="Receipts, POS sales and conversions in your name show here month by month." />
              ) : (
                <div className={styles.chart}>
                  <ResponsiveContainer>
                    <BarChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                      <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={metric === "revenue" ? 64 : 32}
                        allowDecimals={false} tickFormatter={v => (metric === "revenue" ? compact(Number(v)) : String(v))} />
                      <Tooltip content={<ChartTip fmt={(v: number) => (metric === "revenue" ? money(v) : fmtInt(v))} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                      <Bar isAnimationActive={false} dataKey={metric} name={metric === "revenue" ? "Revenue" : "Conversions"} radius={[6, 6, 0, 0]} maxBarSize={48}>
                        {trend.map((t) => {
                          const v = metric === "revenue" ? t.revenue : t.conversions;
                          const color = metric === "revenue" ? palette.s1 : palette.s3;
                          return <Cell key={t.period} fill={color} fillOpacity={t.current ? 0.55 : v === best && best > 0 ? 1 : 0.85} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {trend.length > 0 && (
                <div className={styles.facts} style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                  <div className={styles.fact}><span className={styles.factLabel}>6-month total</span><span className={styles.factValue}>{metric === "revenue" ? money(trend.reduce((s, t) => s + t.revenue, 0)) : fmtInt(trend.reduce((s, t) => s + t.conversions, 0))}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>Best month</span><span className={styles.factValue}>{metric === "revenue" ? money(best) : fmtInt(best)}</span></div>
                  <div className={styles.fact}><span className={styles.factLabel}>Last month</span><span className={styles.factValue}>{lastMonth ? (metric === "revenue" ? money(lastMonth.revenue) : fmtInt(lastMonth.conversions)) : "—"}</span></div>
                </div>
              )}
            </Panel>

            <Panel title="How well you follow through" icon={Heart} sub="All-time rates for leads and follow-ups in your name">
              <BarRows rows={qualityRows} fmt={n => `${n}%`} empty="Nothing to measure yet." />
              {pastTargets.length > 0 && (
                <div style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  <span className={styles.factLabel}>Earlier targets</span>
                  {pastTargets.map(t => (
                    <Goal key={t.id} name={t.month ? `${MONTH_NAMES[t.month - 1]} ${t.year}` : String(t.year)} achieved={Number(t.revenue_achieved) || 0}
                      target={Number(t.revenue_target) || 0} fmt={compact} fill={(t.percentage ?? 0) >= 100 ? palette.good : palette.s1} />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {p.leaderboard.length > 0 && (
            <Panel title="Branch leaderboard" icon={Trophy} scope={p.period.label}
              sub={me ? `You're #${me.rank} of ${p.leaderboard.length} this month, ranked by revenue` : "Ranked by revenue this month"}>
              <div className={mp.board}>
                {p.leaderboard.map(e => (
                  <div key={e.staff_id} className={mp.boardRow} data-me={e.current_user}>
                    <span className={mp.rank} data-medal={e.rank <= 3 ? e.rank : undefined}>{e.rank}</span>
                    <div className={mp.boardMain}>
                      <span className={mp.boardName}>{e.current_user ? `You · ${e.staff_name}` : e.staff_name}</span>
                      <div className={mp.bar} style={{ height: "0.375rem" }}>
                        <div className={mp.barFill} style={{ width: `${(e.revenue / topRevenue) * 100}%`, ["--fill" as any]: e.current_user ? "var(--primary)" : palette.soft }} />
                      </div>
                    </div>
                    <span className={mp.boardEnd}>{money(e.revenue)}<small>{e.conversion_count} conversion{e.conversion_count === 1 ? "" : "s"}</small></span>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {hasStaffRecord && p.leaderboard.length === 0 && (
            <div className={`${styles.card} ${styles.filters}`} style={{ fontSize: "var(--text-sm)", color: "var(--muted-foreground)" }}>
              <CheckCircle2 size={16} style={{ color: "var(--primary)" }} />The branch leaderboard appears once staff in your branch record sales this month.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
