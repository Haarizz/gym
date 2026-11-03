import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, BarChart3, CalendarClock, Filter, Gift, Megaphone, MessageSquare, RefreshCw, Send, Share2, Target, UserPlus, Users,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useBranch } from "../utils/branch-context";
import { leadService, LeadResponse, LeadStats } from "../utils/supabase/lead-service";
import { referralService, ReferralResponse, ReferralStats } from "../utils/supabase/referral-service";
import { followUpService, FollowUpResponse } from "../utils/supabase/follow-up-service";
import { messagingService, MessageHistoryApi } from "../utils/supabase/messaging-service";
import { promotionsService, PromotionApi } from "../utils/supabase/promotions-service";
import {
  styles, usePalette, axisTick, Kpi, Panel, ChartTip, Legend, BarRows, Empty, SectionTabs, Seg, Status, Delta,
  pctChange, fmtInt, fmtDate, Period, periodRange, PERIOD_OPTIONS,
} from "../components/overview/overview-kit";

type Tab = "due" | "leads" | "referrals" | "promotions";

const SOURCE_LABELS: Record<string, string> = {
  website: "Website", referral: "Referral", "walk-in": "Walk-in", "social-media": "Social media",
  "google-ads": "Google Ads", "facebook-ads": "Facebook Ads", instagram: "Instagram", other: "Other",
};
const OPEN_FOLLOW_UP = new Set(["pending", "overdue", "rescheduled"]);
const day = (s?: string | null) => (s || "").slice(0, 10);
const inRange = (s: string | undefined | null, from: string, to: string) => { const d = day(s); return !!d && d >= from && d <= to; };
const leadName = (l: LeadResponse) => `${l.firstName ?? ""} ${l.lastName ?? ""}`.trim() || l.leadId;
/** When a referral turned into a member (falls back to when it was logged). */
const referralWon = (r: ReferralResponse) => r.paymentDate || r.signupDate || r.updatedAt || r.createdAt;

/** Every page of a 1-based paged list (capped, so a huge tenant can't hang the page). */
async function allPages<T>(fetchPage: (page: number) => Promise<{ items: T[]; totalPages: number }>): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= 20; page++) {
    const r = await fetchPage(page);
    out.push(...r.items);
    if (page >= (r.totalPages || 1) || r.items.length === 0) break;
  }
  return out;
}

/**
 * Member Connect overview: leads, referrals, follow-ups, messaging and promotions. Lead conversion
 * is measured on the leads that came in during the period (how many of them have converted since),
 * so every number is a count of real records, not a blended "engagement score".
 */
export function MemberConnect() {
  const navigate = useNavigate();
  const { activeBranchId } = useBranch();
  const palette = usePalette();

  const [period, setPeriod] = useState<Period>("mtd");
  const [tab, setTab] = useState<Tab>("due");
  const [leads, setLeads] = useState<LeadResponse[]>([]);
  const [leadStats, setLeadStats] = useState<LeadStats | null>(null);
  const [referrals, setReferrals] = useState<ReferralResponse[]>([]);
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpResponse[]>([]);
  const [messages, setMessages] = useState<MessageHistoryApi[] | null>(null);
  const [promotions, setPromotions] = useState<PromotionApi[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const range = useMemo(() => periodRange(period), [period]);

  const load = useCallback(async () => {
    setLoading(true);
    const r = await Promise.allSettled([
      allPages(async page => { const x = await leadService.getLeads({ page, size: 500 }); return { items: x.leads, totalPages: x.pagination.totalPages }; }),
      leadService.getStats(),
      allPages(async page => { const x = await referralService.getReferrals({ page, size: 500 }); return { items: x.referrals, totalPages: x.pagination.totalPages }; }),
      referralService.getStats(),
      allPages(async page => { const x = await followUpService.getFollowUps({ page, size: 500 }); return { items: x.followUps, totalPages: x.pagination.totalPages }; }),
      messagingService.getHistory(),
      promotionsService.getPromotions(),
    ]);
    const errors: string[] = [];
    if (r[0].status === "fulfilled") setLeads(r[0].value); else errors.push("leads");
    if (r[1].status === "fulfilled") setLeadStats(r[1].value);
    if (r[2].status === "fulfilled") setReferrals(r[2].value); else errors.push("referrals");
    if (r[3].status === "fulfilled") setReferralStats(r[3].value);
    if (r[4].status === "fulfilled") setFollowUps(r[4].value); else errors.push("follow-ups");
    setMessages(r[5].status === "fulfilled" ? r[5].value : null);
    setPromotions(r[6].status === "fulfilled" ? r[6].value : null);
    setFailed(errors);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeBranchId]);
  useEffect(() => { load(); }, [load]);

  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);

  // ── Period figures ──
  const cohort = (from: string, to: string) => {
    const created = leads.filter(l => inRange(l.createdAt, from, to));
    const converted = created.filter(l => l.status === "converted" || l.memberId != null).length;
    return { created: created.length, converted, rate: created.length ? Math.round((converted / created.length) * 1000) / 10 : null, list: created };
  };
  const cur = useMemo(() => cohort(range.from, range.to), [leads, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const prev = useMemo(() => cohort(range.compareFrom, range.compareTo), [leads, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const wonReferrals = (from: string, to: string) => referrals.filter(r => r.status === "successful" && inRange(referralWon(r), from, to)).length;
  const refCur = useMemo(() => wonReferrals(range.from, range.to), [referrals, range]); // eslint-disable-line react-hooks/exhaustive-deps
  const refPrev = useMemo(() => wonReferrals(range.compareFrom, range.compareTo), [referrals, range]); // eslint-disable-line react-hooks/exhaustive-deps

  const openFollowUps = useMemo(() => followUps.filter(f => OPEN_FOLLOW_UP.has(f.status)), [followUps]);
  const overdue = openFollowUps.filter(f => day(f.dueDate) && day(f.dueDate) < today);
  const dueToday = openFollowUps.filter(f => day(f.dueDate) === today);
  const doneInPeriod = followUps.filter(f => f.status === "completed" && inRange(f.completedDate, range.from, range.to)).length;
  const dueList = useMemo(() => openFollowUps.filter(f => day(f.dueDate) && day(f.dueDate) <= in7)
    .sort((a, b) => day(a.dueDate).localeCompare(day(b.dueDate))), [openFollowUps, in7]);

  const sentMsgs = (messages ?? []).filter(m => m.status !== "scheduled" && inRange(m.sent_date, range.from, range.to));
  const reached = sentMsgs.reduce((s, m) => s + (Number(m.recipient_count) || 0), 0);
  const withDelivery = sentMsgs.filter(m => m.delivery_rate != null);
  const deliveryRate = withDelivery.length ? Math.round(withDelivery.reduce((s, m) => s + Number(m.delivery_rate), 0) / withDelivery.length) : null;
  const scheduled = (messages ?? []).filter(m => m.status === "scheduled").length;

  const activePromos = (promotions ?? []).filter(p => (p.status || "").toLowerCase() === "active");
  const redemptions = activePromos.reduce((s, p) => s + (Number(p.usageCount) || 0), 0);

  // ── Trend: last 6 months ──
  const trend = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const created = leads.filter(l => (l.createdAt || "").startsWith(key));
      return {
        label: d.toLocaleDateString(undefined, { month: "short" }),
        tipLabel: d.toLocaleDateString(undefined, { month: "long", year: "numeric" }) + (i === 5 ? " (so far)" : ""),
        leads: created.length,
        converted: created.filter(l => l.status === "converted" || l.memberId != null).length,
        referrals: referrals.filter(r => r.status === "successful" && (referralWon(r) || "").startsWith(key)).length,
        followUps: followUps.filter(f => f.status === "completed" && (f.completedDate || "").startsWith(key)).length,
      };
    });
  }, [leads, referrals, followUps]);

  const pipelineRows = leadStats ? [
    { key: "new", label: "New", value: leadStats.newLeads, color: palette.s1 },
    { key: "contacted", label: "Contacted", value: leadStats.contactedLeads, color: palette.s1 },
    { key: "follow", label: "Following up", value: leadStats.followUpLeads, color: palette.s1 },
    { key: "converted", label: "Converted", value: leadStats.convertedLeads, color: palette.s3 },
    { key: "lost", label: "Lost", value: leadStats.lostLeads, color: palette.axis },
  ] : [];

  const sourceRows = useMemo(() => {
    const by = new Map<string, { n: number; won: number }>();
    for (const l of cur.list) {
      const k = l.source || "other";
      const v = by.get(k) ?? { n: 0, won: 0 };
      v.n++; if (l.status === "converted" || l.memberId != null) v.won++;
      by.set(k, v);
    }
    return [...by.entries()].sort((a, b) => b[1].n - a[1].n)
      .map(([k, v]) => ({ key: k, label: SOURCE_LABELS[k] || k, value: v.n, color: palette.s4, meta: `${v.won} converted · ${Math.round((v.won / v.n) * 100)}%` }));
  }, [cur, palette]);

  const staffRows = useMemo(() => {
    const by = new Map<string, { done: number; open: number; late: number }>();
    for (const f of followUps) {
      const k = f.assignedStaff || "Unassigned";
      const v = by.get(k) ?? { done: 0, open: 0, late: 0 };
      if (f.status === "completed" && inRange(f.completedDate, range.from, range.to)) v.done++;
      if (OPEN_FOLLOW_UP.has(f.status)) { v.open++; if (day(f.dueDate) && day(f.dueDate) < today) v.late++; }
      by.set(k, v);
    }
    return [...by.entries()].filter(([, v]) => v.done || v.open).sort((a, b) => b[1].done - a[1].done || b[1].open - a[1].open).slice(0, 6)
      .map(([k, v]) => ({ key: k, label: k, value: v.done, color: palette.s3, meta: `${v.open} open${v.late ? ` · ${v.late} overdue` : ""}` }));
  }, [followUps, range, palette, today]);

  const latestLeads = useMemo(() => [...leads].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 15), [leads]);
  const latestReferrals = useMemo(() => [...referrals].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 15), [referrals]);

  const tabs: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { id: "due", label: "Follow-ups due", icon: CalendarClock, count: overdue.length + dueToday.length },
    { id: "leads", label: "Latest leads", icon: UserPlus },
    { id: "referrals", label: "Referrals", icon: Share2, count: referralStats?.pendingReferrals },
    { id: "promotions", label: "Promotions", icon: Gift, count: activePromos.length },
  ];

  if (loading && !leads.length && !followUps.length) {
    return <div className={styles.root}><div className={styles.centered}><RefreshCw className="h-6 w-6 animate-spin text-primary" />Loading Member Connect…</div></div>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Member Connect</h1>
          <div className={styles.subtitle}>{range.label} · {fmtDate(range.from)} – {fmtDate(range.to)} · changes {range.vs}</div>
        </div>
        <div className={styles.actions}>
          <Seg value={period} onChange={setPeriod} label="Period" options={PERIOD_OPTIONS} />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button size="sm" onClick={() => navigate("/leads")}><UserPlus className="h-4 w-4 mr-2" />Leads</Button>
        </div>
      </div>

      {failed.length > 0 && (
        <div className={`${styles.card} ${styles.filters}`} style={{ color: "var(--destructive)" }}>
          <AlertTriangle size={16} />Couldn't load {failed.join(", ")}. The rest of the page is up to date.
        </div>
      )}

      <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className={styles.kpis}>
          <Kpi icon={UserPlus} tone="blue" label="New leads" value={fmtInt(cur.created)} delta={<Delta pct={pctChange(cur.created, prev.created)} />}
            hint={prev.created ? undefined : "nothing to compare"} onClick={() => navigate("/leads")} />
          <Kpi icon={Target} tone="green" label="Lead conversion" value={cur.rate != null ? `${cur.rate}%` : "—"}
            hint={cur.created ? `${cur.converted} of ${cur.created} became members${prev.rate != null ? ` · was ${prev.rate}%` : ""}` : "no leads in this period"}
            title="Share of this period's leads that have converted so far" />
          <Kpi icon={Share2} tone="violet" label="Referrals won" value={fmtInt(refCur)} delta={<Delta pct={pctChange(refCur, refPrev)} />}
            hint={`${fmtInt(referralStats?.pendingReferrals)} pending`} onClick={() => navigate("/referrals")} />
          <Kpi icon={CalendarClock} tone={overdue.length ? "red" : "amber"} label="Follow-ups overdue" value={fmtInt(overdue.length)}
            hint={`${dueToday.length} due today · ${doneInPeriod} done`} onClick={() => setTab("due")} />
          <Kpi icon={Send} tone="teal" label="People messaged" value={messages ? fmtInt(reached) : "—"}
            hint={messages ? `${sentMsgs.length} campaign${sentMsgs.length === 1 ? "" : "s"}${deliveryRate != null ? ` · ${deliveryRate}% delivered` : ""}${scheduled ? ` · ${scheduled} scheduled` : ""}` : "unavailable"}
            onClick={() => navigate("/messaging")} />
          <Kpi icon={Gift} tone="orange" label="Active promotions" value={promotions ? fmtInt(activePromos.length) : "—"}
            hint={promotions ? `${fmtInt(redemptions)} redemption${redemptions === 1 ? "" : "s"} so far` : "unavailable"} onClick={() => navigate("/promotions-campaign")} />
        </div>

        <div className={styles.row2}>
          <Panel title="Outreach results" icon={BarChart3} scope="Last 6 months" sub="Leads in and converted (by the month they came in), referrals won and follow-ups completed">
            {trend.every(t => !t.leads && !t.referrals && !t.followUps) ? (
              <Empty icon={BarChart3} title="No outreach activity yet" text="Leads, referrals and follow-ups show here as they're recorded." />
            ) : (
              <>
                <div className={styles.chart}>
                  <ResponsiveContainer>
                    <ComposedChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={3}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                      <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                      <Tooltip content={<ChartTip />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                      <Bar isAnimationActive={false} dataKey="leads" name="New leads" fill={palette.s1} radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <Bar isAnimationActive={false} dataKey="converted" name="Converted" fill={palette.s3} radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <Bar isAnimationActive={false} dataKey="referrals" name="Referrals won" fill={palette.s4} radius={[4, 4, 0, 0]} maxBarSize={22} />
                      <Line isAnimationActive={false} dataKey="followUps" name="Follow-ups done" stroke={palette.s2} strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <Legend items={[
                  { label: "New leads", color: palette.s1 }, { label: "Converted", color: palette.s3 },
                  { label: "Referrals won", color: palette.s4 }, { label: "Follow-ups done", color: palette.s2, line: true },
                ]} />
              </>
            )}
          </Panel>

          <Panel title="Lead pipeline" icon={Filter} sub={`${fmtInt(leadStats?.totalLeads)} leads by where they are now`}>
            <BarRows rows={pipelineRows} fmt={n => fmtInt(n)} empty="No leads yet." />
            <div className={styles.facts} style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <div className={styles.fact}><span className={styles.factLabel}>All-time conversion</span><span className={styles.factValue}>{leadStats ? `${Math.round(leadStats.conversionRate * 10) / 10}%` : "—"}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Referral success</span><span className={styles.factValue}>{referralStats ? `${Math.round(referralStats.conversionRate * 10) / 10}%` : "—"}</span></div>
            </div>
          </Panel>
        </div>

        <div className={styles.cols2}>
          <Panel title="Where leads came from" icon={Megaphone} scope={range.label} sub="This period's leads by source, and how many converted">
            <BarRows rows={sourceRows} fmt={n => `${n} lead${n === 1 ? "" : "s"}`} empty="No leads in this period." />
          </Panel>
          <Panel title="Team follow-ups" icon={Users} scope={range.label} sub="Follow-ups completed per staff member, with what's still open">
            <BarRows rows={staffRows} fmt={n => `${n} done`} empty="No follow-ups assigned yet." />
          </Panel>
        </div>

        <SectionTabs tabs={tabs} value={tab} onChange={setTab} label="Member Connect details" />

        {tab === "due" && (
          <Panel title="Follow-ups to do" icon={CalendarClock} sub="Overdue, today and the next 7 days"
            action={<Button variant="outline" size="sm" onClick={() => navigate("/follow-ups")}>Follow-ups</Button>}>
            {dueList.length === 0 ? <Empty icon={CalendarClock} title="Nothing due in the next 7 days" /> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Lead</th><th>Subject</th><th>Type</th><th>Staff</th><th>Due</th></tr></thead>
                  <tbody>
                    {dueList.slice(0, 25).map(f => {
                      const d = day(f.dueDate);
                      return (
                        <tr key={f.id}>
                          <td style={{ fontWeight: 600 }}>{f.leadName}<div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400 }}>{f.leadPhone || f.leadEmail || ""}</div></td>
                          <td className={styles.muted}>{f.subject || f.followUpReason || "—"}</td>
                          <td style={{ textTransform: "capitalize" }}>{(f.type || "").replace("_", " ")}</td>
                          <td className={styles.muted}>{f.assignedStaff || "Unassigned"}</td>
                          <td><Status kind={d < today ? "critical" : d === today ? "warning" : "info"}>{d < today ? "overdue · " : d === today ? "today · " : ""}{fmtDate(d)}</Status></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {tab === "leads" && (
          <Panel title="Latest leads" icon={UserPlus} sub="Newest enquiries first" action={<Button variant="outline" size="sm" onClick={() => navigate("/leads")}>All leads</Button>}>
            {latestLeads.length === 0 ? <Empty icon={UserPlus} title="No leads yet" /> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Lead</th><th>Source</th><th>Interest</th><th>Staff</th><th>Received</th><th>Status</th></tr></thead>
                  <tbody>
                    {latestLeads.map(l => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600 }}>{leadName(l)}<div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400 }}>{l.phone || l.email || l.leadId}</div></td>
                        <td>{SOURCE_LABELS[l.source || "other"] || l.source}</td>
                        <td className={styles.muted}>{l.membershipInterest || "—"}</td>
                        <td className={styles.muted}>{l.assignedStaff || "—"}</td>
                        <td>{fmtDate(l.createdAt)}</td>
                        <td><Status kind={l.status === "converted" ? "good" : l.status === "lost" ? "critical" : l.status === "new" ? "info" : "warning"}>{l.status.replace("-", " ")}</Status></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {tab === "referrals" && (
          <Panel title="Referrals" icon={Share2} sub={`${fmtInt(referralStats?.successfulReferrals)} won of ${fmtInt(referralStats?.totalReferrals)} · newest first`}
            action={<Button variant="outline" size="sm" onClick={() => navigate("/referrals")}>Referrals</Button>}>
            {latestReferrals.length === 0 ? <Empty icon={Share2} title="No referrals yet" /> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Friend</th><th>Referred by</th><th>Referred</th><th>Status</th><th className={styles.num}>Reward</th></tr></thead>
                  <tbody>
                    {latestReferrals.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.refereeName}<div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400 }}>{r.referralId}</div></td>
                        <td>{r.referrerName}</td>
                        <td>{fmtDate(r.date || r.createdAt)}</td>
                        <td><Status kind={r.status === "successful" ? "good" : r.status === "expired" ? "critical" : "warning"}>{r.status}</Status></td>
                        <td className={styles.num}>{r.rewardAmount ? fmtInt(r.rewardAmount) + (r.rewardRedeemed ? " · redeemed" : "") : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {tab === "promotions" && (
          <Panel title="Active promotions" icon={Gift} sub="Running offers and how often they've been used"
            action={<Button variant="outline" size="sm" onClick={() => navigate("/promotions-campaign")}>Promotions & Campaigns</Button>}>
            {!promotions ? <Empty title="Promotions unavailable" /> : activePromos.length === 0 ? <Empty icon={Gift} title="No active promotions" /> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Promotion</th><th>Code</th><th>Runs</th><th style={{ width: "28%" }}>Used</th></tr></thead>
                  <tbody>
                    {activePromos.map(p => {
                      const used = Number(p.usageCount) || 0;
                      const limit = Number(p.usageLimit) || 0;
                      return (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 600 }}>{p.name}<div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400, textTransform: "capitalize" }}>{(p.type || "").replace(/_/g, " ")}</div></td>
                          <td>{p.code || "—"}</td>
                          <td className={styles.muted}>{fmtDate(p.startDate)} – {p.endDate ? fmtDate(p.endDate) : "open"}</td>
                          <td>
                            {limit > 0 && <span className={styles.miniTrack}><span className={styles.miniFill} style={{ display: "block", width: `${Math.min(100, (used / limit) * 100)}%`, ["--fill" as any]: palette.s2 }} /></span>}
                            {fmtInt(used)}{limit > 0 ? ` / ${fmtInt(limit)}` : ""}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}
      </div>
    </div>
  );
}
