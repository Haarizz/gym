/**
 * Assets — coming soon: reports and analytics on sample data (assets-mock.ts).
 *   /asset-reports    AssetReports    register, depreciation, maintenance, warranty, movements, disposals
 *   /asset-analytics  AssetAnalytics  cost of ownership, value trend, upkeep, usage, age, replacement plan
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowLeftRight, BarChart3, Boxes, CalendarClock, CheckCircle2, Clock, Download, FileSpreadsheet,
  FileText, Gauge, Hourglass, Lightbulb, PackageMinus, Printer, RefreshCcw, ShieldCheck, TrendingDown, Wallet, Wrench,
} from "lucide-react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../../components/ui/button";
import {
  BarRows, ChartTip, Empty, Kpi, Legend, Panel, SectionTabs, Seg, Status, axisTick, fmtDate, fmtInt, seriesOf, styles, usePalette,
} from "../../components/overview/overview-kit";
import { Meter, PreviewBanner, daysUntil, lastMonths, ps, soon, useMoney } from "../../components/coming-soon/preview-kit";
import { ASSETS, Asset, CATEGORIES, TRANSACTIONS } from "./assets-mock";

const CATEGORY_TONE: Record<string, string> = {
  "Gym Equipment": "#2a78d6", "IT Equipment": "#1baf7a", Furniture: "#b45309", Vehicles: "#d03b3b", "Office Equipment": "#6250d6", "Kitchen & Café": "#0e9fb5",
};

const ageYears = (a: Asset) => -daysUntil(a.purchaseDate) / 365;
const maintCost = (a: Asset) => a.maintenance.reduce((n, m) => n + m.cost, 0);
/** Straight-line: years until the book value reaches zero at the asset's rate. */
const usefulLife = (a: Asset) => 100 / a.depreciationRate;
const yearDepreciation = (a: Asset) => Math.round(a.purchasePrice * (a.depreciationRate / 100));

function PageHead({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className={styles.head}>
      <div><h1 className={styles.title}>{title}</h1><div className={styles.subtitle}>{subtitle}</div></div>
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  );
}

function ExportButtons({ what }: { what: string }) {
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => soon(`Printing the ${what}`)}><Printer className="h-4 w-4 mr-2" />Print</Button>
      <Button variant="outline" size="sm" onClick={() => soon(`Exporting the ${what} to PDF`)}><FileText className="h-4 w-4 mr-2" />PDF</Button>
      <Button variant="outline" size="sm" onClick={() => soon(`Exporting the ${what} to Excel`)}><FileSpreadsheet className="h-4 w-4 mr-2" />Excel</Button>
    </>
  );
}

// ── /asset-reports ──────────────────────────────────────────────────────────

type Report = "register" | "depreciation" | "maintenance" | "warranty" | "movements" | "disposals";
type Scope = "month" | "quarter" | "year";

const REPORTS: { id: Report; label: string; icon: React.ComponentType<{ size?: number; className?: string }>; about: string }[] = [
  { id: "register", label: "Register summary", icon: Boxes, about: "Assets, cost and book value by category" },
  { id: "depreciation", label: "Depreciation", icon: TrendingDown, about: "Straight-line schedule per asset" },
  { id: "maintenance", label: "Maintenance costs", icon: Wrench, about: "Every service and repair, with cost" },
  { id: "warranty", label: "Warranty & service", icon: ShieldCheck, about: "Warranties ending and services due" },
  { id: "movements", label: "Movements", icon: ArrowLeftRight, about: "Transfers between branches and areas" },
  { id: "disposals", label: "Disposals", icon: PackageMinus, about: "Assets sold, retired or written off" },
];

export function AssetReports() {
  const { money } = useMoney();
  const [report, setReport] = useState<Report>("register");
  const [scope, setScope] = useState<Scope>("year");
  const [branch, setBranch] = useState("all");
  const branches = useMemo(() => [...new Set(ASSETS.map(a => a.branch))].sort(), []);
  const scoped = ASSETS.filter(a => branch === "all" || a.branch === branch);
  const days = scope === "month" ? 31 : scope === "quarter" ? 92 : 366;
  const inScope = (iso: string) => -daysUntil(iso) <= days && daysUntil(iso) <= 0;
  const meta = REPORTS.find(r => r.id === report)!;
  const scopeLabel = scope === "month" ? "Last 30 days" : scope === "quarter" ? "Last 3 months" : "Last 12 months";

  return (
    <div className={styles.root}>
      <PageHead title="Asset Reports" subtitle="Ready-made reports on the asset register — print them or export to PDF and Excel">
        <select className={ps.select} value={branch} onChange={e => setBranch(e.target.value)} aria-label="Branch">
          <option value="all">All branches</option>{branches.map(b => <option key={b} value={b}>{b}</option>)}
        </select>
        <Seg value={scope} onChange={setScope} label="Period" options={[["month", "Month"], ["quarter", "Quarter"], ["year", "Year"]]} />
      </PageHead>
      <PreviewBanner module="Asset Reports" features={["PDF & Excel export", "Scheduled email reports", "Per-branch filters", "Audit-ready depreciation"]} />

      <SectionTabs<Report> tabs={REPORTS.map(r => ({ id: r.id, label: r.label, icon: r.icon }))} value={report} onChange={setReport} label="Asset reports" />

      <Panel title={meta.label} icon={meta.icon} scope={report === "register" || report === "depreciation" || report === "warranty" ? "As of today" : scopeLabel}
        sub={`${meta.about} · ${branch === "all" ? "all branches" : branch}`} action={<div className={ps.toolbar}><ExportButtons what={meta.label.toLowerCase()} /></div>}>

        {report === "register" && (() => {
          const rows = Object.keys(CATEGORY_TONE).map(cat => {
            const list = scoped.filter(a => a.category === cat);
            return { cat, count: list.length, cost: list.reduce((n, a) => n + a.purchasePrice, 0), value: list.reduce((n, a) => n + a.currentValue, 0),
              inUse: list.filter(a => a.status === "In use").length, repair: list.filter(a => a.status === "Under maintenance").length };
          }).filter(r => r.count);
          const t = rows.reduce((x, r) => ({ count: x.count + r.count, cost: x.cost + r.cost, value: x.value + r.value, inUse: x.inUse + r.inUse, repair: x.repair + r.repair }), { count: 0, cost: 0, value: 0, inUse: 0, repair: 0 });
          return rows.length === 0 ? <Empty icon={Boxes} title="No assets in this branch" /> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Category</th><th className={styles.num}>Assets</th><th className={styles.num}>In use</th><th className={styles.num}>Under repair</th><th className={styles.num}>Cost</th><th className={styles.num}>Book value</th><th style={{ minWidth: 170 }}>Value kept</th></tr></thead>
                <tbody>{rows.map(r => (
                  <tr key={r.cat}>
                    <td><span className={ps.entity}><span className={ps.dot} style={{ ["--tone" as any]: CATEGORY_TONE[r.cat] }} />{r.cat}</span></td>
                    <td className={styles.num}>{r.count}</td><td className={styles.num}>{r.inUse}</td><td className={styles.num}>{r.repair || "—"}</td>
                    <td className={styles.num}>{money(r.cost)}</td><td className={styles.num} style={{ fontWeight: 700 }}>{money(r.value)}</td>
                    <td><Meter pct={(r.value / r.cost) * 100} color={CATEGORY_TONE[r.cat]} /></td>
                  </tr>
                ))}</tbody>
                <tfoot><tr><td>Total</td><td className={styles.num}>{t.count}</td><td className={styles.num}>{t.inUse}</td><td className={styles.num}>{t.repair}</td><td className={styles.num}>{money(t.cost)}</td><td className={styles.num}>{money(t.value)}</td><td>{t.cost ? `${Math.round((t.value / t.cost) * 100)}% of cost` : ""}</td></tr></tfoot>
              </table>
            </div>
          );
        })()}

        {report === "depreciation" && (() => {
          const rows = scoped.filter(a => a.status !== "Retired").sort((x, y) => yearDepreciation(y) - yearDepreciation(x));
          return (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Asset</th><th>Bought</th><th className={styles.num}>Cost</th><th className={styles.num}>Rate</th><th className={styles.num}>This year</th><th className={styles.num}>To date</th><th className={styles.num}>Book value</th><th>Fully written off</th></tr></thead>
                <tbody>{rows.map(a => {
                  const end = new Date(new Date(a.purchaseDate).getTime() + usefulLife(a) * 365 * 86_400_000);
                  return (
                    <tr key={a.code}>
                      <td><div className={ps.cellMain}>{a.name}</div><div className={ps.cellSub}>{a.code} · {a.category}</div></td>
                      <td>{fmtDate(a.purchaseDate)}</td>
                      <td className={styles.num}>{money(a.purchasePrice)}</td>
                      <td className={styles.num}>{a.depreciationRate}%</td>
                      <td className={styles.num}>{money(yearDepreciation(a))}</td>
                      <td className={styles.num}>{money(a.purchasePrice - a.currentValue)}</td>
                      <td className={styles.num} style={{ fontWeight: 700 }}>{money(a.currentValue)}</td>
                      <td>{end.toLocaleDateString(undefined, { month: "short", year: "numeric" })}</td>
                    </tr>
                  );
                })}</tbody>
                <tfoot><tr><td colSpan={2}>Total</td><td className={styles.num}>{money(rows.reduce((n, a) => n + a.purchasePrice, 0))}</td><td />
                  <td className={styles.num}>{money(rows.reduce((n, a) => n + yearDepreciation(a), 0))}</td>
                  <td className={styles.num}>{money(rows.reduce((n, a) => n + a.purchasePrice - a.currentValue, 0))}</td>
                  <td className={styles.num}>{money(rows.reduce((n, a) => n + a.currentValue, 0))}</td><td /></tr></tfoot>
              </table>
            </div>
          );
        })()}

        {report === "maintenance" && (() => {
          const rows = scoped.flatMap(a => a.maintenance.map(m => ({ ...m, asset: a }))).filter(r => inScope(r.date)).sort((x, y) => y.date.localeCompare(x.date));
          return rows.length === 0 ? <Empty icon={Wrench} title="No maintenance in this period" text="Try a longer period or another branch." /> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Date</th><th>Asset</th><th>Branch</th><th>Type</th><th>Work done</th><th className={styles.num}>Cost</th></tr></thead>
                <tbody>{rows.map((r, i) => (
                  <tr key={i}>
                    <td>{fmtDate(r.date)}</td>
                    <td><div className={ps.cellMain}>{r.asset.name}</div><div className={ps.cellSub}>{r.asset.code}</div></td>
                    <td>{r.asset.branch}</td>
                    <td><Status kind={r.type === "Repair" ? "critical" : r.type === "Inspection" ? "info" : "warning"}>{r.type}</Status></td>
                    <td className={styles.muted}>{r.notes}</td>
                    <td className={styles.num} style={{ fontWeight: 700 }}>{r.cost ? money(r.cost) : "—"}</td>
                  </tr>
                ))}</tbody>
                <tfoot><tr><td colSpan={5}>Total · {rows.length} job{rows.length === 1 ? "" : "s"} ({rows.filter(r => r.type === "Repair").length} repairs)</td><td className={styles.num}>{money(rows.reduce((n, r) => n + r.cost, 0))}</td></tr></tfoot>
              </table>
            </div>
          );
        })()}

        {report === "warranty" && (() => {
          const rows = scoped.filter(a => a.status !== "Retired").map(a => ({ a, w: daysUntil(a.warrantyExpiry), s: daysUntil(a.nextService) }))
            .sort((x, y) => Math.min(x.w < 0 ? 9999 : x.w, x.s) - Math.min(y.w < 0 ? 9999 : y.w, y.s));
          return (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Asset</th><th>Branch</th><th>Warranty until</th><th>Warranty</th><th>Next service</th><th>Service</th><th>Vendor</th></tr></thead>
                <tbody>{rows.map(({ a, w, s }) => (
                  <tr key={a.code}>
                    <td><div className={ps.cellMain}>{a.name}</div><div className={ps.cellSub}>{a.code}</div></td>
                    <td>{a.branch}</td>
                    <td>{fmtDate(a.warrantyExpiry)}</td>
                    <td><Status kind={w < 0 ? "critical" : w <= 90 ? "warning" : "good"}>{w < 0 ? "Expired" : `${w} days left`}</Status></td>
                    <td>{fmtDate(a.nextService)}</td>
                    <td><Status kind={s < 0 ? "critical" : s <= 7 ? "warning" : "info"}>{s < 0 ? `${-s} days overdue` : s === 0 ? "Today" : `In ${s} days`}</Status></td>
                    <td className={styles.muted}>{a.vendor}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          );
        })()}

        {report === "movements" && (() => {
          const rows = scoped.flatMap(a => a.transfers.map(t => ({ ...t, asset: a }))).filter(r => inScope(r.date)).sort((x, y) => y.date.localeCompare(x.date));
          return rows.length === 0 ? <Empty icon={ArrowLeftRight} title="No movements in this period" text="Try a longer period or another branch." /> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Date</th><th>Asset</th><th>From</th><th>To</th><th>Reason</th><th className={styles.num}>Book value</th></tr></thead>
                <tbody>{rows.map((r, i) => (
                  <tr key={i}>
                    <td>{fmtDate(r.date)}</td>
                    <td><div className={ps.cellMain}>{r.asset.name}</div><div className={ps.cellSub}>{r.asset.code}</div></td>
                    <td>{r.from}</td><td>{r.to}</td><td className={styles.muted}>{r.reason}</td>
                    <td className={styles.num}>{money(r.asset.currentValue)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          );
        })()}

        {report === "disposals" && (() => {
          const rows = TRANSACTIONS.filter(t => (t.type === "disposal" || t.type === "sale") && inScope(t.date));
          const bookOf = (code: string) => ASSETS.find(a => a.code === code)?.currentValue ?? 0;
          return rows.length === 0 ? <Empty icon={PackageMinus} title="Nothing disposed of in this period" /> : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>Date</th><th>Asset</th><th>How</th><th>Reason</th><th>Status</th><th className={styles.num}>Book value</th><th className={styles.num}>Received</th><th className={styles.num}>Gain / loss</th></tr></thead>
                <tbody>{rows.map(t => {
                  const book = t.type === "sale" ? 2100 : bookOf(t.assetCode);
                  const got = t.type === "sale" ? t.amount : 0;
                  const gl = got - book;
                  return (
                    <tr key={t.id}>
                      <td>{fmtDate(t.date)}</td>
                      <td><div className={ps.cellMain}>{t.assetName}</div><div className={ps.cellSub}>{t.assetCode}</div></td>
                      <td>{t.type === "sale" ? "Sold" : "Written off"}</td>
                      <td className={styles.muted}>{t.detail}</td>
                      <td><Status kind={t.status === "pending" ? "warning" : "good"}>{t.status === "pending" ? "Awaiting approval" : "Done"}</Status></td>
                      <td className={styles.num}>{money(book)}</td>
                      <td className={styles.num}>{got ? money(got) : "—"}</td>
                      <td className={styles.num} style={{ fontWeight: 700, color: gl < 0 ? "var(--status-critical)" : "var(--status-good)" }}>{gl < 0 ? "−" : "+"}{money(Math.abs(gl))}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          );
        })()}
      </Panel>

      <div className={styles.cols2}>
        <Panel title="Scheduled reports" icon={CalendarClock} sub="Sent automatically by email" action={<Button variant="outline" size="sm" onClick={() => soon("Scheduling reports")}>Add schedule</Button>}>
          <div className={styles.list}>
            {[
              { name: "Depreciation schedule", when: "1st of every month", to: "Finance" },
              { name: "Warranty & service due", when: "Every Monday, 8:00", to: "Facilities team" },
              { name: "Maintenance costs", when: "End of each quarter", to: "Owner" },
            ].map(r => (
              <div key={r.name} className={styles.listRow}>
                <span className={`${styles.kpiIcon} ${styles.kpiIconSm}`} data-tone="teal"><Clock size={14} /></span>
                <div className={styles.rowMain}><span className={styles.rowName}>{r.name}</span><span className={styles.rowMeta}>{r.when} · to {r.to}</span></div>
                <span className={styles.rowEnd}><Status kind="good">Active</Status></span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="All reports" icon={FileText} sub="Pick a report to open it above">
          <div className={styles.list}>
            {REPORTS.map(r => (
              <button key={r.id} type="button" className={styles.listRow} style={{ border: 0, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => { setReport(r.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                <span className={`${styles.kpiIcon} ${styles.kpiIconSm}`} data-tone={r.id === report ? "blue" : "gray"}><r.icon size={14} /></span>
                <div className={styles.rowMain}><span className={styles.rowName}>{r.label}</span><span className={styles.rowMeta}>{r.about}</span></div>
                <span className={styles.rowEnd}><Download size={15} className={styles.muted} /></span>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

// ── /asset-analytics ────────────────────────────────────────────────────────

/** 12 months of sample book value vs cost, and maintenance spend split routine / repair. */
const VALUE_TREND = [2_610_000, 2_640_000, 2_655_000, 2_700_000, 2_735_000, 2_760_000, 2_770_000, 2_790_000, 2_805_000, 2_830_000, 2_842_000, 2_850_000];
const COST_TREND = [3_020_000, 3_065_000, 3_095_000, 3_160_000, 3_210_000, 3_255_000, 3_285_000, 3_320_000, 3_350_000, 3_390_000, 3_415_000, 3_440_000];
const UPKEEP = [
  { routine: 3200, repair: 1800 }, { routine: 2900, repair: 2600 }, { routine: 3400, repair: 900 }, { routine: 3100, repair: 4200 },
  { routine: 3600, repair: 1500 }, { routine: 3300, repair: 2200 }, { routine: 3800, repair: 3100 }, { routine: 3500, repair: 1200 },
  { routine: 3900, repair: 2400 }, { routine: 3700, repair: 1900 }, { routine: 4100, repair: 2800 }, { routine: 3600, repair: 2300 },
];
const USAGE_BY_CATEGORY = [
  { name: "Gym Equipment", pct: 84 }, { name: "IT Equipment", pct: 93 }, { name: "Kitchen & Café", pct: 76 },
  { name: "Vehicles", pct: 66 }, { name: "Furniture", pct: 71 }, { name: "Office Equipment", pct: 48 },
];
const AGE_PROFILE = [{ band: "< 1 yr", n: 64 }, { band: "1–2 yrs", n: 118 }, { band: "2–3 yrs", n: 96 }, { band: "3–5 yrs", n: 79 }, { band: "5+ yrs", n: 34 }];
const CONDITION_MIX = [{ name: "Excellent", n: 142, tone: "#15803d" }, { name: "Good", n: 177, tone: "#2a78d6" }, { name: "Fair", n: 52, tone: "#b45309" }, { name: "Poor", n: 20, tone: "#d03b3b" }];

export function AssetAnalytics() {
  const navigate = useNavigate();
  const palette = usePalette();
  const series = seriesOf(palette);
  const { money, compact } = useMoney();
  const months = lastMonths(12);
  const trend = months.map((label, i) => ({ label, value: VALUE_TREND[i], cost: COST_TREND[i] }));
  const upkeep = months.map((label, i) => ({ label, ...UPKEEP[i] }));
  const upkeepYear = UPKEEP.reduce((n, m) => n + m.routine + m.repair, 0);
  const repairShare = Math.round((UPKEEP.reduce((n, m) => n + m.repair, 0) / upkeepYear) * 100);
  const totalValue = CATEGORIES.reduce((n, c) => n + c.value, 0);
  const totalCount = CATEGORIES.reduce((n, c) => n + c.count, 0);
  const avgUsage = Math.round(ASSETS.filter(a => a.status !== "Retired").reduce((n, a) => n + a.utilization, 0) / ASSETS.filter(a => a.status !== "Retired").length);

  // Repair-or-replace: what upkeep has cost relative to the asset's value.
  const costly = ASSETS.filter(a => a.status !== "Retired" && maintCost(a) > 0)
    .map(a => ({ a, cost: maintCost(a), ratio: maintCost(a) / Math.max(1, a.currentValue) }))
    .sort((x, y) => y.ratio - x.ratio).slice(0, 6);
  // Replacement plan: book value at or under 30% of cost, or nearing the end of its useful life.
  const replace = ASSETS.filter(a => a.status !== "Retired")
    .map(a => ({ a, lifeLeft: Math.max(0, usefulLife(a) - ageYears(a)), kept: a.currentValue / a.purchasePrice }))
    .sort((x, y) => x.lifeLeft - y.lifeLeft).slice(0, 5);

  return (
    <div className={styles.root}>
      <PageHead title="Asset Analytics" subtitle="What the gym's assets cost to own, how hard they work and what to replace next">
        <Button variant="outline" size="sm" onClick={() => navigate("/asset-reports")}><FileText className="h-4 w-4 mr-2" />Reports</Button>
        <Button variant="outline" size="sm" onClick={() => soon("Exporting analytics")}><Download className="h-4 w-4 mr-2" />Export</Button>
      </PageHead>
      <PreviewBanner module="Asset Analytics" features={["Cost of ownership", "Usage from check-ins & bookings", "Repair-or-replace advice", "Replacement budget"]} />

      <div className={styles.kpis}>
        <Kpi icon={Wallet} tone="blue" label="Cost of ownership" value={money(COST_TREND[11] + upkeepYear)} hint="purchases + 12 months' upkeep" />
        <Kpi icon={TrendingDown} tone="gray" label="Book value" value={money(totalValue)} hint={`${Math.round((totalValue / COST_TREND[11]) * 100)}% of what was paid`} />
        <Kpi icon={Wrench} tone="amber" label="Upkeep, 12 months" value={money(upkeepYear)} hint={`${repairShare}% on repairs · ${((upkeepYear / totalValue) * 100).toFixed(1)}% of value`} />
        <Kpi icon={Gauge} tone="green" label="Average usage" value={`${avgUsage}%`} hint="of opening hours in use" />
        <Kpi icon={Hourglass} tone="violet" label="Average age" value="2.4 yrs" hint={`${fmtInt(totalCount)} assets`} />
        <Kpi icon={Clock} tone="red" label="Downtime" value="46 hrs" hint="equipment out of use this month" />
      </div>

      <div className={styles.row2}>
        <Panel title="Value over time" icon={BarChart3} scope="Last 12 months" sub="What was paid for everything still owned, against today's book value">
          <div className={styles.chart}>
            <ResponsiveContainer>
              <ComposedChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={palette.grid} />
                <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={64} tickFormatter={v => compact(Number(v))} domain={[2_400_000, "auto"]} />
                <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} />
                <Area isAnimationActive={false} dataKey="value" name="Book value" stroke={palette.s1} fill={palette.s1} fillOpacity={0.12} strokeWidth={2} />
                <Line isAnimationActive={false} dataKey="cost" name="Paid" stroke={palette.s2} strokeWidth={2} strokeDasharray="5 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <Legend items={[{ label: "Book value", color: palette.s1 }, { label: "Paid", color: palette.s2, line: true }]} />
        </Panel>
        <Panel title="Worth a look" icon={Lightbulb} sub="From usage and upkeep">
          <div className={styles.insights}>
            {[
              { type: "critical", tag: "Replace", title: "Smith Machine: upkeep is 14% of its value", detail: "Two repairs this year and parts on order. Replacing may cost less than keeping it running." },
              { type: "warning", tag: "Under-used", title: "Office equipment used 48% of the time", detail: "The sound system sits idle most days — share it between studios." },
              { type: "info", tag: "Busy", title: "Spin bikes run at 91% usage", detail: "Peak classes are full. Adding 4 bikes would cover the waiting list." },
              { type: "positive", tag: "Cheaper upkeep", title: "Routine servicing cut repairs by 18%", detail: "Assets serviced on time needed fewer emergency repairs." },
            ].map(i => (
              <div key={i.title} className={styles.insight} data-type={i.type}>
                <span className={styles.insightIcon}>{i.type === "positive" ? <CheckCircle2 size={15} /> : i.type === "info" ? <Lightbulb size={15} /> : <AlertTriangle size={15} />}</span>
                <div><div className={styles.insightTag}>{i.tag}</div><div className={styles.insightTitle}>{i.title}</div><div className={styles.insightDetail}>{i.detail}</div></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className={styles.cols2}>
        <Panel title="Upkeep spend" icon={Wrench} scope="Last 12 months" sub="Routine servicing against repairs each month">
          <div className={styles.chart}>
            <ResponsiveContainer>
              <BarChart data={upkeep} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={palette.grid} />
                <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={52} tickFormatter={v => compact(Number(v))} />
                <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                <Bar isAnimationActive={false} stackId="u" dataKey="routine" name="Routine" fill={series[2]} maxBarSize={28} />
                <Bar isAnimationActive={false} stackId="u" dataKey="repair" name="Repairs" fill={series[1]} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend items={[{ label: "Routine", color: series[2] }, { label: "Repairs", color: series[1] }]} />
        </Panel>
        <Panel title="How hard they work" icon={Gauge} sub="Share of opening hours each category is in use">
          <BarRows rows={USAGE_BY_CATEGORY.map(u => ({ key: u.name, label: u.name, value: u.pct, color: u.pct < 55 ? palette.s5 : CATEGORY_TONE[u.name] ?? palette.s1 }))}
            fmt={n => `${n}%`} empty="No usage recorded." />
        </Panel>
      </div>

      <div className={styles.cols2}>
        <Panel title="Age profile" icon={Hourglass} sub="How long the gym has had its assets">
          <div className={styles.chartSm ?? styles.chart} style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={AGE_PROFILE} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} stroke={palette.grid} />
                <XAxis dataKey="band" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                <Bar isAnimationActive={false} dataKey="n" name="Assets" fill={palette.s4} radius={[4, 4, 0, 0]} maxBarSize={44} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
        <Panel title="Condition" icon={ShieldCheck} sub={`${fmtInt(totalCount)} assets at the last inspection`}>
          <BarRows rows={CONDITION_MIX.map(c => ({ key: c.name, label: c.name, value: c.n, color: c.tone, meta: `${Math.round((c.n / totalCount) * 100)}%` }))}
            fmt={n => fmtInt(n)} empty="No inspections yet." />
        </Panel>
      </div>

      <div className={styles.cols2}>
        <Panel title="Repair or replace?" icon={RefreshCcw} sub="Upkeep this year against what each asset is worth now">
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Asset</th><th className={styles.num}>Upkeep</th><th className={styles.num}>Worth now</th><th>Advice</th></tr></thead>
              <tbody>{costly.map(({ a, cost, ratio }) => {
                // Replace only when upkeep is high AND the asset is worn; a busy asset in good shape is just watched.
                const worn = a.condition === "Fair" || a.condition === "Poor";
                const advice = ratio >= 0.1 && worn ? "replace" : ratio >= 0.05 ? "watch" : "keep";
                return (
                  <tr key={a.code}>
                    <td><div className={ps.cellMain}>{a.name}</div><div className={ps.cellSub}>{a.branch} · {a.condition.toLowerCase()} condition · upkeep {Math.round(ratio * 100)}% of value</div></td>
                    <td className={styles.num}>{money(cost)}</td>
                    <td className={styles.num}>{money(a.currentValue)}</td>
                    <td><Status kind={advice === "replace" ? "critical" : advice === "watch" ? "warning" : "good"}>{advice === "replace" ? "Consider replacing" : advice === "watch" ? "Watch" : "Keep"}</Status></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </Panel>
        <Panel title="Replacement plan" icon={CalendarClock} sub="Assets closest to the end of their useful life"
          action={<Button variant="outline" size="sm" onClick={() => soon("Adding replacements to the budget")}>Add to budget</Button>}>
          <div className={styles.list}>
            {replace.map(({ a, lifeLeft, kept }) => (
              <div key={a.code} className={styles.listRow} style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(7rem, 10rem) auto" }}>
                <div className={styles.rowMain}><span className={styles.rowName}>{a.name}</span><span className={styles.rowMeta}>{a.branch} · replace for about {money(Math.round(a.purchasePrice * 1.08))}</span></div>
                <Meter pct={kept * 100} color={kept < 0.35 ? palette.bad : kept < 0.6 ? palette.s5 : palette.s3} label={`${Math.round(kept * 100)}%`} />
                <span className={styles.rowEnd}><Status kind={lifeLeft < 2 ? "critical" : lifeLeft < 4 ? "warning" : "info"}>{lifeLeft < 1 ? "This year" : `${lifeLeft.toFixed(1)} yrs left`}</Status></span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
