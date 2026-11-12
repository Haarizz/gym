import React, { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, Info, Loader2, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import {
  dashboardService,
  type ApiResponse,
  type CampaignInsights,
  type InsightWindow,
  type OperationsComparison,
  type OpsMetric,
  type RenewalInsights,
  type RevenueCompareMode,
  type TrainingInsights,
} from "../../utils/supabase/dashboard-service";
import { ReportActions, type ReportDocument, type ReportSection, type ValueFormat, col, tableSection } from "../report-export";
import { ChangeBadge, formatRange } from "./RevenueReports";
import {
  COMPARE_COLOR, CURRENT_COLOR, CompareBars, MetricChange, MetricTiles, Money, Panel, RowsTable, TrendPanel,
  ValueTooltip, num,
} from "./InsightBlocks";
import rs from "./RevenueReports.module.css";
import styles from "./RevenueOperations.module.css";

const SPEND_COLOR = "#eb6834";

interface SectionProps {
  from: string;
  to: string;
  compare: RevenueCompareMode;
  refreshKey: number;
  compareName: string;
  compareLabel: string;
  /** The page's operations comparison: leads/CRM and bookings figures folded into these sections */
  ops: OperationsComparison | null;
}

// ── Loading ────────────────────────────────────────────────────────────────

function useInsight<T>(load: () => Promise<ApiResponse<T>>, deps: unknown[], what: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    load()
      .then((res) => {
        if (cancelled) return;
        if (res?.success && res.data) setData(res.data);
        else setError(res?.error || `Could not load ${what}`);
      })
      .catch((e) => { if (!cancelled) setError(e?.message || `Could not load ${what}`); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, retry]);
  return { data, error, loading, retry: () => setRetry((r) => r + 1) };
}

function LoadState({ loading, error, retry, what }: { loading: boolean; error: string | null; retry: () => void; what: string }) {
  if (error) {
    return (
      <div className={styles.error}>
        <span>{error}</span>
        <Button size="sm" variant="outline" onClick={retry}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
      </div>
    );
  }
  return <div className={styles.loading}><Loader2 className="h-4 w-4 animate-spin" />{loading ? `Working out ${what}…` : ""}</div>;
}

// ── Small pieces ───────────────────────────────────────────────────────────

const pick = (metrics: OpsMetric[], keys: string[]) =>
  keys.map((k) => metrics.find((m) => m.key === k)).filter((m): m is OpsMetric => !!m);

const shortDate = (d?: string | null) => (d ? format(parseISO(d), "MMM d, yyyy") : "—");

const pctText = (v: number | null | undefined, digits = 0) => (v === null || v === undefined ? "—" : `${num(v).toFixed(digits)}%`);

function Heading({ children, note }: { children: React.ReactNode; note?: React.ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <h3>{children}</h3>
      {note && <p>{note}</p>}
    </div>
  );
}

function ReportBar({ w, compareName, what, report }: { w: InsightWindow; compareName: string; what: string; report: () => ReportDocument }) {
  return (
    <div className={rs.reportBar}>
      <p>
        {what} for <strong>{formatRange(w.from, w.to)}</strong>{w.toDate ? " (up to today)" : ""}, compared with {compareName.toLowerCase()} ({formatRange(w.previousFrom, w.previousTo)}).
      </p>
      <ReportActions report={report} menuLabel={what} compact />
    </div>
  );
}

/** "12 of 20" with a meter, for a figure against its target. */
function OfTarget({ value, target }: { value: number; target: number | null }) {
  if (!target) return <>{value.toLocaleString()}</>;
  const pct = (value / target) * 100;
  return (
    <>
      {value.toLocaleString()} <span className={rs.muted}>of {target.toLocaleString()}</span>
      <div className={styles.meter}><span className={pct >= 100 ? styles.met : undefined} style={{ width: `${Math.min(100, pct)}%` }} /></div>
    </>
  );
}

function Was({ children }: { children: React.ReactNode }) {
  return <div className={rs.muted}>{children}</div>;
}

const fmtOf = (f: OpsMetric["format"]): ValueFormat =>
  f === "money" ? "money" : f === "count" ? "integer" : f === "percent" ? "percent" : f === "minutes" ? "duration" : "number";

function metricsTable(title: string, metrics: OpsMetric[], compareName: string) {
  return tableSection(title, [col("metric", "Metric"), col("cur", "This period", "number"), col("prev", compareName, "number")],
    metrics.map((m) => ({ metric: m.label + (m.format === "money" ? "" : m.format === "percent" ? " (%)" : ""), cur: m.current ?? "—", prev: m.previous ?? "—" })));
}

function rowsTable(title: string, rows: { name: string; current: number; previous: number; amount?: number; previousAmount?: number }[], compareName: string, money = false) {
  return tableSection(title, [
    col("name", "Name"), col("current", "This period", "integer", { total: "sum" }), col("previous", compareName, "integer", { total: "sum" }),
    ...(money ? [col("amount", "Amount", "money", { total: "sum" }), col("previousAmount", `${compareName} amount`, "money", { total: "sum" })] : []),
  ], rows, { totals: true });
}

// ═══════════════════════════════════════════════════════════════════════════
//  Campaigns
// ═══════════════════════════════════════════════════════════════════════════

const CAMPAIGN_KEYS = ["campaignSpend", "campaignLeads", "campaignConversions", "campaignConversionRate", "costPerLead", "costPerConversion", "campaignRevenue", "returnOnSpend"];
const PROMO_KEYS = ["promoRedemptions", "promoRevenue", "promoDiscount", "referralsMade", "referralsPaid", "referralRewards", "messagesSent"];

function campaignReport(d: CampaignInsights, compareName: string): ReportDocument {
  return {
    title: "Campaigns Report",
    fileName: "Campaigns",
    period: { from: d.from, to: d.to },
    filters: [{ label: "Compared with", value: `${d.label} (${formatRange(d.previousFrom, d.previousTo)})` }],
    sections: [
      metricsTable("Headline", d.metrics, compareName),
      tableSection("Marketing campaigns", [
        col("name", "Campaign"), col("platform", "Platform"), col("status", "Status"), col("owner", "Owner"),
        col("budget", "Budget", "money"), col("spend", "Spend", "money", { total: "sum" }), col("leads", "Leads", "integer", { total: "sum" }),
        col("converted", "Converted", "integer", { total: "sum" }), col("costPerLead", "Cost / lead", "money"), col("costPerConversion", "Cost / conversion", "money"),
        col("revenue", "Revenue (first 90 days)", "money", { total: "sum" }),
      ], d.campaigns, { totals: true }),
      tableSection("Promotions", [
        col("name", "Promotion"), col("code", "Code"), col("current", "Redemptions", "integer", { total: "sum" }), col("previous", `${compareName} redemptions`, "integer", { total: "sum" }),
        col("members", "Members", "integer"), col("newMembers", "New members", "integer"), col("amount", "Revenue", "money", { total: "sum" }), col("savings", "Discount", "money", { total: "sum" }),
      ], d.promotions, { totals: true }),
      rowsTable("Spend by category", d.spendByCategory, compareName, true),
      rowsTable("Referral funnel", d.referralFunnel, compareName),
      rowsTable("Top referrers", d.topReferrers, compareName),
      rowsTable("Messages sent", d.messages, compareName),
    ],
  };
}

export function CampaignsSection({ from, to, compare, refreshKey, compareName, compareLabel, ops }: SectionProps) {
  const { data: d, error, loading, retry } = useInsight(
    () => dashboardService.getCampaignInsights(from, to, compare), [from, to, compare, refreshKey], "campaign results");
  if (!d) return <LoadState loading={loading} error={error} retry={retry} what="campaign results" />;

  const spendVsRevenue = d.campaigns.filter((c) => c.spend > 0 || c.revenue > 0).slice(0, 10)
    .map((c) => ({ name: c.name, spend: c.spend, revenue: c.revenue }));
  const crm = ops?.metrics.filter((m) => m.area === "crm") ?? [];

  return (
    <>
      <ReportBar w={d} compareName={compareName} what="Campaign results" report={() => campaignReport(d, compareName)} />
      <MetricTiles metrics={pick(d.metrics, CAMPAIGN_KEYS)} compareLabel={compareLabel} />

      <Panel title="Marketing Campaigns" description="Campaigns running in the period or with spend or leads in either period. Revenue is what converted leads paid in their first 90 days.">
        {d.campaigns.length === 0 ? (
          <p className={rs.empty}>No marketing campaigns in either period. Add them in CRM › Campaigns and tag leads to them.</p>
        ) : (
          <div className={rs.tableWrap}>
            <table className={rs.table}>
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th className={rs.num}>Spend</th>
                  <th>Budget used</th>
                  <th className={rs.num}>Leads</th>
                  <th className={rs.num}>Converted</th>
                  <th className={rs.num}>Cost / lead</th>
                  <th className={rs.num}>Cost / conversion</th>
                  <th className={rs.num}>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {d.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td className={rs.name} title={c.name}>
                      {c.name}
                      <div className={rs.muted}>
                        {[c.platform, c.owner, c.status].filter(Boolean).join(" · ") || "—"}
                        {(c.startDate || c.endDate) && <> · {shortDate(c.startDate)} – {c.endDate ? shortDate(c.endDate) : "ongoing"}</>}
                      </div>
                    </td>
                    <td className={rs.num}><Money value={c.spend} /><Was>{compareLabel}: <Money value={c.previousSpend} /></Was></td>
                    <td>
                      {c.budgetUsed === null ? <span className={rs.muted}>No budget</span> : (
                        <>
                          <div className={styles.meter}><span className={c.budgetUsed > 100 ? styles.over : undefined} style={{ width: `${Math.min(100, c.budgetUsed)}%` }} /></div>
                          <span className={rs.muted}>{pctText(c.budgetUsed)} of <Money value={c.budget} digits={0} /></span>
                        </>
                      )}
                    </td>
                    <td className={rs.num}><OfTarget value={c.leads} target={c.targetLeads} /><Was>{compareLabel}: {c.previousLeads}</Was></td>
                    <td className={rs.num}>
                      <OfTarget value={c.converted} target={c.targetConversions} />
                      <Was>{c.leads > 0 ? `${((c.converted / c.leads) * 100).toFixed(0)}% of leads` : `${compareLabel}: ${c.previousConverted}`}</Was>
                    </td>
                    <td className={rs.num}>{c.costPerLead === null ? "—" : <Money value={c.costPerLead} />}</td>
                    <td className={rs.num}>{c.costPerConversion === null ? "—" : <Money value={c.costPerConversion} />}</td>
                    <td className={rs.num}>
                      <Money value={c.revenue} />
                      <Was>{c.spend > 0 ? `${(c.revenue / c.spend).toFixed(1)}× spend` : <ChangeBadge current={c.revenue} previous={c.previousRevenue} />}</Was>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className={rs.grid2}>
        <Panel title="Campaign Funnel" description="Leads tagged to a campaign: created → contacted → converted">
          <CompareBars rows={d.funnel} compareName={compareName} />
        </Panel>
        <Panel title="Spend vs Revenue" description="Per campaign, this period">
          {spendVsRevenue.length === 0 ? <p className={rs.empty}>No campaign spend or revenue in this period.</p> : (
            <ResponsiveContainer width="100%" height={Math.max(220, spendVsRevenue.length * 46 + 40)}>
              <BarChart data={spendVsRevenue} layout="vertical" margin={{ left: 4, right: 16 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                <Tooltip content={<ValueTooltip format="money" />} />
                <Legend />
                <Bar dataKey="spend" name="Spend" fill={SPEND_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                <Bar dataKey="revenue" name="Revenue" fill={CURRENT_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Spend by Category" description="Where campaign money went">
          <RowsTable rows={d.spendByCategory} compareLabel={compareLabel} money unit="entries" empty="No campaign spend recorded in either period." />
        </Panel>
        <Panel title="Lead Sources" description="All leads, with how many converted">
          {ops ? <RowsTable rows={ops.crm.bySource} compareLabel={compareLabel} conversion /> : <p className={rs.empty}>Loading…</p>}
        </Panel>
      </div>

      <Heading note="Discounts, codes and member referrals">Promotions & Referrals</Heading>
      <MetricTiles metrics={pick(d.metrics, PROMO_KEYS)} compareLabel={compareLabel} />
      <Panel title="Promotions" description="Redemptions in each period. New members = joined within 30 days before redeeming.">
        {d.promotions.length === 0 ? <p className={rs.empty}>No promotions redeemed in either period.</p> : (
          <div className={rs.tableWrap}>
            <table className={rs.table}>
              <thead>
                <tr>
                  <th>Promotion</th>
                  <th className={rs.num}>Redemptions</th>
                  <th className={rs.num}>Members</th>
                  <th className={rs.num}>Revenue</th>
                  <th className={rs.num}>Discount given</th>
                  <th className={rs.num}>Avg. discount</th>
                </tr>
              </thead>
              <tbody>
                {d.promotions.map((p) => (
                  <tr key={p.name + (p.code ?? "")}>
                    <td className={rs.name} title={p.name}>
                      {p.name}
                      <div className={rs.muted}>{[p.code, p.type, p.status].filter(Boolean).join(" · ") || "—"}</div>
                    </td>
                    <td className={rs.num}>
                      {p.usageLimit ? <OfTarget value={p.current} target={p.usageLimit} /> : p.current.toLocaleString()}
                      <Was><ChangeBadge current={p.current} previous={p.previous} /> {compareLabel}: {p.previous}</Was>
                    </td>
                    <td className={rs.num}>{p.members}<Was>{p.newMembers} new</Was></td>
                    <td className={rs.num}><Money value={p.amount} /><Was>{compareLabel}: <Money value={p.previousAmount} /></Was></td>
                    <td className={rs.num}><Money value={p.savings} /><Was>{compareLabel}: <Money value={p.previousSavings} /></Was></td>
                    <td className={rs.num}>{p.current > 0 ? <Money value={p.savings / p.current} /> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className={rs.grid2}>
        <Panel title="Referral Funnel" description="Referrals made in each period and how far they got">
          <CompareBars rows={d.referralFunnel} compareName={compareName} />
        </Panel>
        <Panel title="Top Referrers" description="Members who referred the most people">
          <RowsTable rows={d.topReferrers} compareLabel={compareLabel} conversion conversionLabel="Paid" empty="No referrals in either period." />
        </Panel>
      </div>

      <Heading note="Every lead, whatever brought them in, plus follow-ups and member enquiries">Leads & Follow-ups</Heading>
      {ops ? (
        <>
          <MetricTiles metrics={crm} compareLabel={compareLabel} />
          <div className={rs.grid2}>
            <TrendPanel trend={ops.trend} keys={["leads", "conversions"]} granularity={ops.granularity} compareName={compareName} />
            <Panel title="Lead Pipeline" description="Current status of the leads created in each period">
              <CompareBars rows={ops.crm.byStatus} compareName={compareName} />
            </Panel>
            <Panel title="Leads by Staff" description="Assigned staff, with conversions">
              <RowsTable rows={ops.crm.byStaff} compareLabel={compareLabel} conversion />
            </Panel>
            <Panel title="Member Enquiries" description="Enquiries members raised, by category">
              <RowsTable rows={ops.crm.enquiryCategories} compareLabel={compareLabel} empty="No member enquiries in either period." />
            </Panel>
            <Panel title="Messages Sent" description="Message campaigns sent, by channel">
              <RowsTable rows={d.messages} compareLabel={compareLabel} empty="No message campaigns sent in either period." />
            </Panel>
          </div>
        </>
      ) : <p className={rs.empty}>Loading leads…</p>}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Renewals & upgrades
// ═══════════════════════════════════════════════════════════════════════════

function renewalReport(d: RenewalInsights, compareName: string): ReportDocument {
  return {
    title: "Renewals & Upgrades Report",
    fileName: "Renewals and Upgrades",
    period: { from: d.from, to: d.to },
    filters: [{ label: "Compared with", value: `${d.label} (${formatRange(d.previousFrom, d.previousTo)})` }],
    sections: [
      metricsTable("Headline", d.metrics, compareName),
      rowsTable("Where ending memberships went", d.outcomes, compareName),
      rowsTable("Renewal timing", d.timing, compareName),
      tableSection("Plan changes", [
        col("name", "From → to"), col("kind", "Change"), col("current", "This period", "integer", { total: "sum" }), col("previous", compareName, "integer", { total: "sum" }),
        col("amount", "Revenue", "money", { total: "sum" }), col("difference", "Price difference", "money", { total: "sum" }),
      ], d.planChanges, { totals: true }),
      tableSection("Plans", [
        col("name", "Plan"), col("activeMembers", "Active members", "integer", { total: "sum" }), col("newSales", "New sales", "integer", { total: "sum" }),
        col("renewals", "Renewals", "integer", { total: "sum" }), col("upgradesIn", "Upgrades in", "integer", { total: "sum" }), col("downgradesIn", "Downgrades in", "integer", { total: "sum" }),
        col("ended", "Ended", "integer", { total: "sum" }), col("renewed", "Renewed", "integer", { total: "sum" }), col("renewalRate", "Renewal rate", "percent"),
      ], d.plans, { totals: true }),
      tableSection("Lapsed / not renewed yet", [
        col("name", "Member"), col("phone", "Phone"), col("plan", "Plan"), col("endedOn", "Ended", "date"), col("value", "Last paid", "money"),
        col("status", "Status"), col("lastVisit", "Last visit", "date"),
      ], d.lapsedMembers),
      tableSection("Due for renewal (next 30 days)", [
        col("name", "Member"), col("phone", "Phone"), col("plan", "Plan"), col("endsOn", "Ends", "date"), col("daysLeft", "Days left", "integer"),
        col("value", "Fee", "money"), col("lastVisit", "Last visit", "date"),
      ], d.dueSoon.members),
    ] as ReportSection[],
  };
}

export function RenewalsSection({ from, to, compare, refreshKey, compareName, compareLabel }: SectionProps) {
  const { data: d, error, loading, retry } = useInsight(
    () => dashboardService.getRenewalInsights(from, to, compare), [from, to, compare, refreshKey], "renewals");
  if (!d) return <LoadState loading={loading} error={error} retry={retry} what="renewals" />;

  const rateChart = d.plans.filter((p) => p.renewalRate !== null || p.previousRenewalRate !== null).slice(0, 10)
    .map((p) => ({ name: p.name, current: p.renewalRate, previous: p.previousRenewalRate }));

  return (
    <>
      <ReportBar w={d} compareName={compareName} what="Renewals & upgrades" report={() => renewalReport(d, compareName)} />
      <div className={styles.note}>
        <Info size={16} />
        <span>
          Renewal rate looks at memberships that <strong>ended</strong> in each period: renewed (on any plan) within 30 days of ending vs lapsed.
          Ones that ended less than 30 days ago and haven't renewed yet are shown separately, not counted as lost.
          An upgrade or downgrade is a renewal onto a dearer or cheaper plan.
        </span>
      </div>
      <MetricTiles metrics={d.metrics} compareLabel={compareLabel} />

      <div className={rs.grid2}>
        <Panel title="Where Ending Memberships Went" description="Memberships that ended in each period">
          <CompareBars rows={d.outcomes} compareName={compareName} horizontal />
        </Panel>
        <Panel title="Renewal Timing" description="When members renewed, relative to their old membership's end date">
          <CompareBars rows={d.timing} compareName={compareName} horizontal />
        </Panel>
        <Panel title="Renewal Rate by Plan" description="% of ended memberships that renewed">
          {rateChart.length === 0 ? <p className={rs.empty}>No memberships ended in either period.</p> : (
            <ResponsiveContainer width="100%" height={Math.max(220, rateChart.length * 46 + 40)}>
              <BarChart data={rateChart} layout="vertical" margin={{ left: 4, right: 16 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                <Tooltip content={<ValueTooltip format="percent" />} />
                <Legend />
                <Bar dataKey="current" name="This period" fill={CURRENT_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                <Bar dataKey="previous" name={compareName} fill={COMPARE_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="Plan Changes" description="Which plan members moved from and to when they renewed">
          {d.planChanges.length === 0 ? <p className={rs.empty}>No upgrades or downgrades in either period.</p> : (
            <div className={rs.tableWrap}>
              <table className={rs.table}>
                <thead>
                  <tr>
                    <th>From → to</th>
                    <th className={rs.num}>This period</th>
                    <th className={rs.num}>{compareLabel}</th>
                    <th className={rs.num}>Revenue</th>
                    <th className={rs.num}>Price difference</th>
                  </tr>
                </thead>
                <tbody>
                  {d.planChanges.map((r) => (
                    <tr key={r.name}>
                      <td className={rs.name} title={r.name}>
                        {r.name}
                        <div><span className={r.kind === "Upgrade" ? styles.tagUp : styles.tagDown}>{r.kind}</span></div>
                      </td>
                      <td className={rs.num}>{num(r.current)}</td>
                      <td className={rs.num}>{num(r.previous)}</td>
                      <td className={rs.num}><Money value={r.amount} /></td>
                      <td className={rs.num}>{num(r.difference) >= 0 ? "+" : "−"}<Money value={Math.abs(num(r.difference))} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Plans" description="Sales, renewals and plan changes per plan this period; active members as of today">
        {d.plans.length === 0 ? <p className={rs.empty}>No membership activity in this period.</p> : (
          <div className={rs.tableWrap}>
            <table className={rs.table}>
              <thead>
                <tr>
                  <th>Plan</th>
                  <th className={rs.num}>Active members</th>
                  <th className={rs.num}>New sales</th>
                  <th className={rs.num}>Renewals</th>
                  <th className={rs.num}>Upgrades in</th>
                  <th className={rs.num}>Downgrades in</th>
                  <th className={rs.num}>Ended</th>
                  <th className={rs.num}>Renewal rate</th>
                </tr>
              </thead>
              <tbody>
                {d.plans.map((p) => (
                  <tr key={p.name}>
                    <td className={rs.name} title={p.name}>{p.name}</td>
                    <td className={rs.num}>{p.activeMembers}</td>
                    <td className={rs.num}>{p.newSales}</td>
                    <td className={rs.num}>{p.renewals}</td>
                    <td className={rs.num}>{p.upgradesIn}</td>
                    <td className={rs.num}>{p.downgradesIn}</td>
                    <td className={rs.num}>{p.ended}<Was>{p.renewed} renewed</Was></td>
                    <td className={rs.num}>
                      {pctText(p.renewalRate)}
                      <div>
                        <MetricChange m={{ current: p.renewalRate, previous: p.previousRenewalRate, format: "percent", goodWhenUp: true }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Heading note="As of today, whatever period is selected">Due for Renewal</Heading>
      <div className={rs.tiles}>
        {[["Next 7 days", d.dueSoon.in7], ["Next 14 days", d.dueSoon.in14], ["Next 30 days", d.dueSoon.in30]].map(([label, n]) => (
          <div key={label} className={rs.tile}>
            <div className={rs.tileHead}>{label}</div>
            <div className={rs.tileValue}>{num(n).toLocaleString()}</div>
            <div className={rs.tileSub}>active memberships ending</div>
          </div>
        ))}
      </div>
      <Panel title="Ending Soon" description="Active memberships ending in the next 30 days, soonest first">
        {d.dueSoon.members.length === 0 ? <p className={rs.empty}>No memberships end in the next 30 days.</p> : (
          <MemberTable rows={d.dueSoon.members.map((m) => ({
            key: m.memberId, name: m.name, phone: m.phone, plan: m.plan, date: m.endsOn, value: m.value, lastVisit: m.lastVisit,
            status: <span className={m.daysLeft <= 7 ? styles.tagDown : styles.tagNeutral}>{m.daysLeft === 0 ? "Today" : `${m.daysLeft} day${m.daysLeft === 1 ? "" : "s"}`}</span>,
          }))} dateLabel="Ends" valueLabel="Fee" statusLabel="Left" />
        )}
      </Panel>
      <Panel title="Lapsed & Not Yet Renewed" description={`Ended in this period without renewing, most valuable first${d.lapsedTotal > d.lapsedMembers.length ? ` (top ${d.lapsedMembers.length} of ${d.lapsedTotal})` : ""}`}>
        {d.lapsedMembers.length === 0 ? <p className={rs.empty}>Everyone whose membership ended in this period has renewed.</p> : (
          <MemberTable rows={d.lapsedMembers.map((m) => ({
            key: m.memberId, name: m.name, phone: m.phone, plan: m.plan, date: m.endedOn, value: m.value, lastVisit: m.lastVisit,
            status: <span className={m.status === "Lapsed" ? styles.tagDown : styles.tagNeutral}>{m.status}</span>,
          }))} dateLabel="Ended" valueLabel="Last paid" statusLabel="Status" />
        )}
      </Panel>
    </>
  );
}

function MemberTable({ rows, dateLabel, valueLabel, statusLabel }: {
  rows: { key: number; name: string | null; phone: string | null; plan: string | null; date: string; value: number | null; lastVisit: string | null; status: React.ReactNode }[];
  dateLabel: string; valueLabel: string; statusLabel: string;
}) {
  return (
    <div className={rs.tableWrap}>
      <table className={rs.table}>
        <thead>
          <tr>
            <th>Member</th>
            <th>Plan</th>
            <th>{dateLabel}</th>
            <th className={rs.num}>{valueLabel}</th>
            <th>Last visit</th>
            <th>{statusLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={`${r.key}-${r.date}`}>
              <td className={rs.name} title={r.name ?? ""}>{r.name ?? "—"}{r.phone && <div className={rs.muted}>{r.phone}</div>}</td>
              <td className={rs.name} title={r.plan ?? ""}>{r.plan ?? "—"}</td>
              <td>{shortDate(r.date)}</td>
              <td className={rs.num}>{r.value === null ? "—" : <Money value={r.value} />}</td>
              <td>{r.lastVisit ? shortDate(r.lastVisit) : <span className={rs.muted}>Never</span>}</td>
              <td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
//  Training & classes
// ═══════════════════════════════════════════════════════════════════════════

const PT_KEYS = ["ptRevenue", "packagesSold", "repeatPackages", "ptSessions", "ptClients", "ptNoShowRate", "packagesExpired", "unusedSessions"];
const CLASS_KEYS = ["classSessions", "classFill", "classAvgAttendance", "classNoShowRate", "classCancelRate", "avgRating"];
const BOOKING_KEYS = ["bookings", "bookingCheckIns", "noShows", "showRate", "cancellations", "waitlisted", "bookingValue"];

function trainingReport(d: TrainingInsights, compareName: string): ReportDocument {
  return {
    title: "Training & Classes Report",
    fileName: "Training and Classes",
    period: { from: d.from, to: d.to },
    filters: [{ label: "Compared with", value: `${d.label} (${formatRange(d.previousFrom, d.previousTo)})` }],
    sections: [
      metricsTable("Headline", d.metrics, compareName),
      tableSection("Trainers", [
        col("name", "Trainer"), col("clients", "PT clients", "integer", { total: "sum" }), col("ptSessions", "PT sessions", "integer", { total: "sum" }),
        col("previousPtSessions", `${compareName} PT sessions`, "integer", { total: "sum" }), col("classes", "Classes taught", "integer", { total: "sum" }),
        col("noShows", "PT no-shows", "integer", { total: "sum" }), col("packagesSold", "Packages sold", "integer", { total: "sum" }),
        col("packageRevenue", "Package revenue", "money", { total: "sum" }), col("rating", "Rating", "number"), col("switchedAway", "Clients switched away", "integer", { total: "sum" }),
      ], d.trainers, { totals: true }),
      tableSection("Classes", [
        col("name", "Class"), col("type", "Type"), col("current", "Sessions", "integer", { total: "sum" }), col("previous", `${compareName} sessions`, "integer", { total: "sum" }),
        col("booked", "Booked", "integer", { total: "sum" }), col("avgBooked", "Avg. booked", "number"), col("fill", "Fill %", "percent"),
        col("full", "Full sessions", "integer", { total: "sum" }), col("noShowRate", "No-show %", "percent"), col("cancelRate", "Cancel %", "percent"), col("rating", "Rating", "number"),
      ], d.classes, { totals: true }),
      rowsTable("PT packages sold", d.packages, compareName, true),
      rowsTable("Package mix", d.packageMix, compareName),
    ],
  };
}

export function TrainingSection({ from, to, compare, refreshKey, compareName, compareLabel, ops }: SectionProps) {
  const { data: d, error, loading, retry } = useInsight(
    () => dashboardService.getTrainingInsights(from, to, compare), [from, to, compare, refreshKey], "training figures");
  if (!d) return <LoadState loading={loading} error={error} retry={retry} what="training figures" />;

  const fillChart = d.classes.filter((c) => c.fill !== null || c.previousFill !== null).slice(0, 10)
    .map((c) => ({ name: c.name, current: c.fill, previous: c.previousFill }));
  const bookingMetrics = ops ? pick(ops.metrics, BOOKING_KEYS) : [];

  return (
    <>
      <ReportBar w={d} compareName={compareName} what="Training & classes" report={() => trainingReport(d, compareName)} />

      <Heading note="Packages sold, sessions delivered and what went unused">Personal Training</Heading>
      <MetricTiles metrics={pick(d.metrics, PT_KEYS)} compareLabel={compareLabel} />
      <Panel title="Trainers" description="PT clients, sessions delivered, classes taught, package sales and ratings, this period">
        {d.trainers.length === 0 ? <p className={rs.empty}>No PT sessions, classes or package sales in either period.</p> : (
          <div className={rs.tableWrap}>
            <table className={rs.table}>
              <thead>
                <tr>
                  <th>Trainer</th>
                  <th className={rs.num}>PT clients</th>
                  <th className={rs.num}>PT sessions</th>
                  <th className={rs.num}>Classes</th>
                  <th className={rs.num}>No-shows</th>
                  <th className={rs.num}>Packages sold</th>
                  <th className={rs.num}>Rating</th>
                  <th className={rs.num}>Client switches</th>
                </tr>
              </thead>
              <tbody>
                {d.trainers.map((t) => (
                  <tr key={t.name}>
                    <td className={rs.name} title={t.name}>{t.name}</td>
                    <td className={rs.num}>{t.clients}</td>
                    <td className={rs.num}>{t.ptSessions}<Was><ChangeBadge current={t.ptSessions} previous={t.previousPtSessions} /> {compareLabel}: {t.previousPtSessions}</Was></td>
                    <td className={rs.num}>{t.classes}<Was>{compareLabel}: {t.previousClasses}</Was></td>
                    <td className={rs.num}>{t.noShows}</td>
                    <td className={rs.num}>{t.packagesSold}{t.packagesSold > 0 && <Was><Money value={t.packageRevenue} /></Was>}</td>
                    <td className={rs.num}>{t.rating === null ? "—" : `${t.rating.toFixed(1)} ★`}{t.reviews > 0 && <Was>{t.reviews} review{t.reviews === 1 ? "" : "s"}</Was>}</td>
                    <td className={rs.num}>
                      {t.switchedAway === 0 && t.switchedIn === 0 ? "—" : (
                        <>
                          {t.switchedIn > 0 && <div className={styles.tagUp}>+{t.switchedIn} in</div>}
                          {t.switchedAway > 0 && <div className={styles.tagDown}>−{t.switchedAway} away</div>}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <div className={rs.grid2}>
        <Panel title="PT Packages Sold" description="Best sellers by revenue">
          <RowsTable rows={d.packages} compareLabel={compareLabel} money unit="sold" empty="No PT packages sold in either period." />
        </Panel>
        <Panel title="Package Mix" description="Session packs vs day-based packages">
          <CompareBars rows={d.packageMix} compareName={compareName} />
        </Panel>
      </div>

      <Heading note="Group classes and other bookable sessions (not PT)">Classes</Heading>
      <MetricTiles metrics={pick(d.metrics, CLASS_KEYS)} compareLabel={compareLabel} />
      <div className={rs.grid2}>
        <Panel title="Class Fill Rate" description="Seats booked ÷ capacity, per class">
          {fillChart.length === 0 ? <p className={rs.empty}>No capacity-limited classes in either period.</p> : (
            <ResponsiveContainer width="100%" height={Math.max(220, fillChart.length * 46 + 40)}>
              <BarChart data={fillChart} layout="vertical" margin={{ left: 4, right: 16 }} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12 }} />
                <Tooltip content={<ValueTooltip format="percent" />} />
                <Legend />
                <Bar dataKey="current" name="This period" fill={CURRENT_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
                <Bar dataKey="previous" name={compareName} fill={COMPARE_COLOR} radius={[0, 4, 4, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>
        <Panel title="When Classes Fill Up" description="Fill rate by day and start time, this period. Darker = fuller.">
          <Heatmap cells={d.heatmap} />
        </Panel>
      </div>
      <Panel title="Classes" description="Per class, this period">
        {d.classes.length === 0 ? <p className={rs.empty}>No classes in either period.</p> : (
          <div className={rs.tableWrap}>
            <table className={rs.table}>
              <thead>
                <tr>
                  <th>Class</th>
                  <th className={rs.num}>Sessions</th>
                  <th className={rs.num}>Booked</th>
                  <th className={rs.num}>Fill</th>
                  <th className={rs.num}>Full sessions</th>
                  <th className={rs.num}>No-shows</th>
                  <th className={rs.num}>Late cancels</th>
                  <th className={rs.num}>Rating</th>
                </tr>
              </thead>
              <tbody>
                {d.classes.map((c) => (
                  <tr key={c.name}>
                    <td className={rs.name} title={c.name}>{c.name}{c.type && <div className={rs.muted}>{c.type}</div>}</td>
                    <td className={rs.num}>{num(c.current)}<Was>{compareLabel}: {num(c.previous)}</Was></td>
                    <td className={rs.num}>{c.booked}<Was>{c.avgBooked === null ? "—" : `${c.avgBooked.toFixed(1)} per class`}</Was></td>
                    <td className={rs.num}>
                      {pctText(c.fill)}
                      <div><MetricChange m={{ current: c.fill, previous: c.previousFill, format: "percent", goodWhenUp: true }} /></div>
                    </td>
                    <td className={rs.num}>{c.full}</td>
                    <td className={rs.num}>{pctText(c.noShowRate)}</td>
                    <td className={rs.num}>{pctText(c.cancelRate)}</td>
                    <td className={rs.num}>{c.rating === null ? "—" : `${c.rating.toFixed(1)} ★`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Heading note="All bookings, PT and classes together">Bookings</Heading>
      {ops ? (
        <>
          <MetricTiles metrics={bookingMetrics} compareLabel={compareLabel} />
          <div className={rs.grid2}>
            <TrendPanel trend={ops.trend} keys={["bookings"]} granularity={ops.granularity} compareName={compareName} />
            <Panel title="Booking Status" description="Bookings on sessions dated in each period">
              <CompareBars rows={ops.bookings.byStatus} compareName={compareName} horizontal />
            </Panel>
            <Panel title="Bookings by Day of Week">
              <CompareBars rows={ops.bookings.byWeekday} compareName={compareName} />
            </Panel>
            <Panel title="Classes vs Personal Training">
              <CompareBars rows={ops.bookings.byType} compareName={compareName} />
            </Panel>
          </div>
        </>
      ) : <p className={rs.empty}>Loading bookings…</p>}
    </>
  );
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function Heatmap({ cells }: { cells: TrainingInsights["heatmap"] }) {
  const withSeats = cells.filter((c) => c.seats > 0);
  if (withSeats.length === 0) return <p className={rs.empty}>No capacity-limited classes in this period.</p>;
  const hours = Array.from(new Set(withSeats.map((c) => c.hour))).sort((a, b) => a - b);
  const at = (day: number, hour: number) => withSeats.find((c) => c.day === day && c.hour === hour);
  const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`;
  return (
    <div className={styles.heatWrap}>
      <table className={styles.heat}>
        <thead>
          <tr>
            <th />
            {hours.map((h) => <th key={h}>{hourLabel(h)}</th>)}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((name, i) => (
            <tr key={name}>
              <th>{name}</th>
              {hours.map((h) => {
                const c = at(i + 1, h);
                const fill = c?.fill ?? null;
                return (
                  <td key={h}
                    style={fill === null ? undefined : { background: `color-mix(in srgb, var(--gb-primary-deep) ${Math.max(8, Math.min(100, fill))}%, transparent)`, color: fill > 55 ? "#fff" : undefined }}
                    title={c ? `${name} ${hourLabel(h)}: ${c.booked} of ${c.seats} seats booked across ${c.sessions} session${c.sessions === 1 ? "" : "s"}` : `${name} ${hourLabel(h)}: no classes`}>
                    {fill === null ? "" : `${Math.round(fill)}`}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.legendNote}>
        <span><CalendarClock size={12} className="inline mr-1" />Numbers are % of seats booked; hover a cell for details.</span>
      </div>
    </div>
  );
}
