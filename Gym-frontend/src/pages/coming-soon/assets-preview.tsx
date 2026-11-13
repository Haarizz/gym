/**
 * Assets — coming soon. Three preview pages on sample data (assets-mock.ts):
 *   /assets              AssetsOverview      value, upkeep and what needs attention
 *   /manage-assets       ManageAssets        the asset register + asset detail sheet
 *   /asset-transactions  AssetTransactions   purchases, transfers, repairs, disposals
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle, ArrowLeftRight, Boxes, Building2, CalendarClock, Car, CheckCircle2, ClipboardList, Coffee,
  Download, Dumbbell, FileText, Hammer, Laptop, Package, PackageMinus, PackagePlus, Plus, Search, ShieldCheck,
  Sofa, Speaker, Tag, TrendingDown, Upload, UserCheck, Wallet, Wrench,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "../../components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../../components/ui/sheet";
import {
  BarRows, ChartTip, Empty, Kpi, Legend, Panel, SectionTabs, Status, axisTick, fmtDate, fmtInt, seriesOf, styles, usePalette,
} from "../../components/overview/overview-kit";
import { Meter, PreviewBanner, daysUntil, lastMonths, ps, soon, useMoney } from "../../components/coming-soon/preview-kit";
import { ACTIVITY_BY_MONTH, ASSETS, Asset, AssetTxn, CATEGORIES, PENDING_APPROVAL, TRANSACTIONS, TxnType } from "./assets-mock";

const FEATURES = ["Asset register", "Maintenance schedule", "Depreciation", "Transfers between branches", "Warranty alerts"];

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  "Gym Equipment": Dumbbell, "IT Equipment": Laptop, Furniture: Sofa, Vehicles: Car, "Office Equipment": Speaker, "Kitchen & Café": Coffee,
};
const CATEGORY_TONE: Record<string, string> = {
  "Gym Equipment": "#2a78d6", "IT Equipment": "#1baf7a", Furniture: "#b45309", Vehicles: "#d03b3b", "Office Equipment": "#6250d6", "Kitchen & Café": "#0e9fb5",
};

const STATUS_KIND: Record<string, "good" | "warning" | "critical" | "info"> = {
  "In use": "good", Available: "info", "Under maintenance": "warning", Retired: "critical",
};
const CONDITION_KIND: Record<string, "good" | "warning" | "critical" | "info"> = { Excellent: "good", Good: "info", Fair: "warning", Poor: "critical" };

export const TXN_META: Record<TxnType, { label: string; icon: React.ComponentType<{ className?: string; size?: number }>; tone: string }> = {
  purchase: { label: "Purchase", icon: PackagePlus, tone: "#1baf7a" },
  transfer: { label: "Transfer", icon: ArrowLeftRight, tone: "#2a78d6" },
  maintenance: { label: "Maintenance", icon: Wrench, tone: "#b45309" },
  assignment: { label: "Assignment", icon: UserCheck, tone: "#6250d6" },
  depreciation: { label: "Depreciation", icon: TrendingDown, tone: "#64748b" },
  disposal: { label: "Disposal", icon: PackageMinus, tone: "#d03b3b" },
  sale: { label: "Sale", icon: Tag, tone: "#0e9fb5" },
  insurance: { label: "Insurance", icon: ShieldCheck, tone: "#c2410c" },
};

function AssetTile({ category, large }: { category: string; large?: boolean }) {
  const Icon = CATEGORY_ICON[category] ?? Package;
  return <span className={`${ps.tile} ${large ? ps.tileLg : ""}`} style={{ ["--tone" as any]: CATEGORY_TONE[category] ?? "#64748b" }}><Icon /></span>;
}

function dueLabel(iso: string) {
  const d = daysUntil(iso);
  if (d < 0) return { text: `${-d} day${d === -1 ? "" : "s"} overdue`, kind: "critical" as const };
  if (d === 0) return { text: "Due today", kind: "warning" as const };
  if (d <= 7) return { text: `In ${d} day${d === 1 ? "" : "s"}`, kind: "warning" as const };
  return { text: `In ${d} days`, kind: "info" as const };
}

function PageHead({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className={styles.head}>
      <div>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </div>
  );
}

// ── Asset detail sheet ──────────────────────────────────────────────────────

function AssetSheet({ asset, onClose }: { asset: Asset | null; onClose: () => void }) {
  const { money, compact } = useMoney();
  const palette = usePalette();
  const curve = useMemo(() => {
    if (!asset) return [];
    const years = Math.max(1, Math.ceil(daysUntil(asset.purchaseDate) / -365) + 2);
    return Array.from({ length: years + 1 }, (_, i) => ({
      label: `Yr ${i}`, value: Math.max(0, Math.round(asset.purchasePrice * (1 - (asset.depreciationRate / 100) * i))),
    }));
  }, [asset]);
  if (!asset) return null;
  const due = dueLabel(asset.nextService);
  const warrantyDays = daysUntil(asset.warrantyExpiry);
  return (
    <Sheet open={!!asset} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent className={ps.sheet} style={{ width: "min(100vw, 36rem)", maxWidth: "100vw", overflowY: "auto" }}>
        <SheetHeader>
          <div className={ps.sheetHead}>
            <AssetTile category={asset.category} large />
            <div style={{ minWidth: 0 }}>
              <SheetTitle className={ps.sheetTitle}>{asset.name}</SheetTitle>
              <SheetDescription className={ps.sheetSub}>{asset.code} · {asset.model}</SheetDescription>
            </div>
          </div>
          <div className={styles.chips} style={{ marginTop: 10 }}>
            <Status kind={STATUS_KIND[asset.status]}>{asset.status}</Status>
            <Status kind={CONDITION_KIND[asset.condition]}>{asset.condition} condition</Status>
            <Status kind={warrantyDays < 0 ? "critical" : warrantyDays <= 90 ? "warning" : "good"}>
              {warrantyDays < 0 ? "Warranty expired" : `Warranty ${warrantyDays} days left`}
            </Status>
          </div>
        </SheetHeader>
        <div className={ps.sheetBody}>
          <div className={ps.sheetActions}>
            <Button size="sm" onClick={() => soon("Scheduling a service")}><Wrench className="h-4 w-4 mr-2" />Schedule service</Button>
            <Button size="sm" variant="outline" onClick={() => soon("Transferring an asset")}><ArrowLeftRight className="h-4 w-4 mr-2" />Transfer</Button>
            <Button size="sm" variant="outline" onClick={() => soon("Assigning an asset")}><UserCheck className="h-4 w-4 mr-2" />Assign</Button>
            <Button size="sm" variant="outline" onClick={() => soon("Retiring an asset")}><PackageMinus className="h-4 w-4 mr-2" />Retire</Button>
          </div>

          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>Value</div>
            <div className={styles.facts}>
              <div className={styles.fact}><span className={styles.factLabel}>Purchase price</span><span className={styles.factValue}>{money(asset.purchasePrice)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Book value today</span><span className={styles.factValue}>{money(asset.currentValue)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Depreciation</span><span className={styles.factValue}>{asset.depreciationRate}% a year, straight line</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Written off so far</span><span className={styles.factValue}>{money(asset.purchasePrice - asset.currentValue)}</span></div>
            </div>
            <div style={{ height: 150 }}>
              <ResponsiveContainer>
                <LineChart data={curve} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke={palette.grid} />
                  <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                  <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={56} tickFormatter={v => compact(Number(v))} />
                  <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} />
                  <Line isAnimationActive={false} dataKey="value" name="Book value" stroke={palette.s1} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>Details</div>
            <div className={styles.facts}>
              <div className={styles.fact}><span className={styles.factLabel}>Category</span><span className={styles.factValue}>{asset.category} · {asset.subcategory}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Branch & location</span><span className={styles.factValue}>{asset.branch} · {asset.location}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Serial number</span><span className={styles.factValue}>{asset.serialNumber}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Vendor</span><span className={styles.factValue}>{asset.vendor}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Bought</span><span className={styles.factValue}>{fmtDate(asset.purchaseDate)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Assigned to</span><span className={styles.factValue}>{asset.assignedTo ?? "—"}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Next service</span><span className={styles.factValue}>{fmtDate(asset.nextService)} · {due.text}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Usage</span><span className={styles.factValue}><Meter pct={asset.utilization} color={palette.s3} /></span></div>
            </div>
          </div>

          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>Maintenance history</div>
            {asset.maintenance.length === 0 ? <div className={styles.muted} style={{ fontSize: "var(--text-sm)" }}>No maintenance recorded yet.</div> : (
              <div className={ps.timeline}>
                {asset.maintenance.map((m, i) => (
                  <div key={i} className={ps.tlItem} style={{ ["--tone" as any]: m.type === "Repair" ? "#d03b3b" : "#b45309" }}>
                    <span className={ps.tlDot}><Wrench /></span>
                    <div>
                      <div className={ps.tlTitle}>{m.type} · {money(m.cost)}</div>
                      <div className={ps.tlMeta}>{fmtDate(m.date)} — {m.notes}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>Movements</div>
            {asset.transfers.length === 0 ? <div className={styles.muted} style={{ fontSize: "var(--text-sm)" }}>Has not moved since it was bought.</div> : (
              <div className={ps.timeline}>
                {asset.transfers.map((t, i) => (
                  <div key={i} className={ps.tlItem} style={{ ["--tone" as any]: "#2a78d6" }}>
                    <span className={ps.tlDot}><ArrowLeftRight /></span>
                    <div>
                      <div className={ps.tlTitle}>{t.from} → {t.to}</div>
                      <div className={ps.tlMeta}>{fmtDate(t.date)} — {t.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── /assets ─────────────────────────────────────────────────────────────────

export function AssetsOverview() {
  const navigate = useNavigate();
  const palette = usePalette();
  const series = seriesOf(palette);
  const { money, compact } = useMoney();
  const [tab, setTab] = useState<"recent" | "pending" | "value">("recent");
  const [open, setOpen] = useState<Asset | null>(null);

  const months = lastMonths(6);
  const activity = ACTIVITY_BY_MONTH.map((m, i) => ({ ...m, label: months[i] }));
  const totalValue = CATEGORIES.reduce((n, c) => n + c.value, 0);
  const totalCount = CATEGORIES.reduce((n, c) => n + c.count, 0);
  const upcoming = [...ASSETS].filter(a => a.status !== "Retired").sort((x, y) => x.nextService.localeCompare(y.nextService)).slice(0, 6);
  const overdue = ASSETS.filter(a => a.status !== "Retired" && daysUntil(a.nextService) < 0).length;
  const dueSoon = ASSETS.filter(a => a.status !== "Retired" && daysUntil(a.nextService) >= 0 && daysUntil(a.nextService) <= 7).length;
  const warrantySoon = ASSETS.filter(a => { const d = daysUntil(a.warrantyExpiry); return d >= 0 && d <= 90; });

  return (
    <div className={styles.root}>
      <PageHead title="Assets" subtitle="Everything the gym owns — what it's worth, where it is and when it needs looking after">
        <Button variant="outline" size="sm" onClick={() => navigate("/manage-assets")}><ClipboardList className="h-4 w-4 mr-2" />Asset register</Button>
        <Button size="sm" onClick={() => soon("Adding an asset")}><Plus className="h-4 w-4 mr-2" />Add asset</Button>
      </PageHead>
      <PreviewBanner module="Assets" features={FEATURES} />

      <div className={styles.kpis}>
        <Kpi icon={Boxes} tone="blue" label="Assets" value={fmtInt(totalCount)} hint={`${CATEGORIES.length} categories · 4 branches`} onClick={() => navigate("/manage-assets")} />
        <Kpi icon={Wallet} tone="teal" label="Book value" value={money(totalValue)} hint="after depreciation" />
        <Kpi icon={TrendingDown} tone="gray" label="Depreciation this year" value={money(236_400)} hint="≈ 21,450 a month" />
        <Kpi icon={CalendarClock} tone={overdue ? "red" : "amber"} label="Service due" value={fmtInt(overdue + dueSoon)} hint={`${overdue} overdue · ${dueSoon} this week`} />
        <Kpi icon={Wrench} tone="orange" label="Under repair" value={fmtInt(ASSETS.filter(a => a.status === "Under maintenance").length)} hint="out of use right now" />
        <Kpi icon={ShieldCheck} tone="violet" label="Warranties ending" value={fmtInt(warrantySoon.length)} hint="in the next 90 days" />
      </div>

      <div className={styles.row2}>
        <Panel title="Asset activity" icon={ArrowLeftRight} scope="Last 6 months" sub="Assets added, moved, serviced and retired each month">
          <div className={styles.chart}>
            <ResponsiveContainer>
              <BarChart data={activity} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={3}>
                <CartesianGrid vertical={false} stroke={palette.grid} />
                <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                <Bar isAnimationActive={false} dataKey="added" name="Added" fill={series[2]} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar isAnimationActive={false} dataKey="transferred" name="Transferred" fill={series[0]} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar isAnimationActive={false} dataKey="maintenance" name="Serviced" fill={series[4]} radius={[4, 4, 0, 0]} maxBarSize={18} />
                <Bar isAnimationActive={false} dataKey="retired" name="Retired" fill={series[1]} radius={[4, 4, 0, 0]} maxBarSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <Legend items={[{ label: "Added", color: series[2] }, { label: "Transferred", color: series[0] }, { label: "Serviced", color: series[4] }, { label: "Retired", color: series[1] }]} />
        </Panel>

        <Panel title="Needs attention" icon={AlertTriangle} sub="What to deal with first">
          <div className={styles.insights}>
            {[
              { type: "warning", tag: "Overdue service", title: "Smith Machine is 3 days past its service", detail: "Bearings worn — parts on order. Keep it out of use until the repair is done." },
              { type: "warning", tag: "Warranty", title: `${warrantySoon.length} warranties end within 90 days`, detail: "Espresso machine first (20 days). Book a check-up while repairs are still covered." },
              { type: "info", tag: "Low use", title: "Sound System used 34% of the time", detail: "Moved to Abu Dhabi — consider sharing it between studios." },
              { type: "positive", tag: "Healthy", title: "92% of equipment in good or excellent condition", detail: "Up from 87% six months ago." },
            ].map(i => (
              <div key={i.title} className={styles.insight} data-type={i.type}>
                <span className={styles.insightIcon}>{i.type === "positive" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}</span>
                <div>
                  <div className={styles.insightTag}>{i.tag}</div>
                  <div className={styles.insightTitle}>{i.title}</div>
                  <div className={styles.insightDetail}>{i.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className={styles.cols2}>
        <Panel title="Value by category" icon={Wallet} sub={`${money(totalValue)} across ${fmtInt(totalCount)} assets`}>
          <BarRows
            rows={CATEGORIES.map(c => ({ key: c.name, label: c.name, value: c.value, color: CATEGORY_TONE[c.name] ?? palette.s1, meta: `${c.count} items` }))}
            fmt={compact} empty="No assets yet."
          />
        </Panel>
        <Panel title="Service schedule" icon={CalendarClock} sub="Next services due, soonest first"
          action={<Button variant="outline" size="sm" onClick={() => navigate("/manage-assets")}>All assets</Button>}>
          <div className={styles.list}>
            {upcoming.map(a => {
              const due = dueLabel(a.nextService);
              return (
                <button key={a.code} type="button" className={styles.listRow} style={{ border: 0, textAlign: "left", cursor: "pointer", font: "inherit", color: "inherit" }} onClick={() => setOpen(a)}>
                  <AssetTile category={a.category} />
                  <div className={styles.rowMain}>
                    <span className={styles.rowName}>{a.name}</span>
                    <span className={styles.rowMeta}>{a.branch} · {fmtDate(a.nextService)}</span>
                  </div>
                  <span className={styles.rowEnd}><Status kind={due.kind}>{due.text}</Status></span>
                </button>
              );
            })}
          </div>
        </Panel>
      </div>

      <SectionTabs
        tabs={[
          { id: "recent", label: "Recent activity", icon: ClipboardList },
          { id: "pending", label: "Waiting for approval", icon: CalendarClock, count: PENDING_APPROVAL.length },
          { id: "value", label: "High-value assets", icon: Wallet },
        ]}
        value={tab} onChange={setTab} label="Asset lists"
      />
      {tab === "recent" && <Panel title="Recent activity" icon={ClipboardList} sub="The latest purchases, transfers, repairs and disposals"
        action={<Button variant="outline" size="sm" onClick={() => navigate("/asset-transactions")}>All transactions</Button>}>
        <TxnTable rows={TRANSACTIONS.slice(0, 8)} />
      </Panel>}
      {tab === "pending" && <Panel title="Waiting for approval" icon={CalendarClock} sub="Requests a manager still has to approve">
        <TxnTable rows={PENDING_APPROVAL} />
      </Panel>}
      {tab === "value" && <Panel title="High-value assets" icon={Wallet} sub="The most valuable items, by book value">
        <AssetTable rows={[...ASSETS].sort((x, y) => y.currentValue - x.currentValue).slice(0, 6)} onOpen={setOpen} />
      </Panel>}

      <AssetSheet asset={open} onClose={() => setOpen(null)} />
    </div>
  );
}

// ── Tables ──────────────────────────────────────────────────────────────────

function AssetTable({ rows, onOpen }: { rows: Asset[]; onOpen: (a: Asset) => void }) {
  const { money } = useMoney();
  const palette = usePalette();
  if (!rows.length) return <Empty icon={Search} title="No assets match" text="Try another search or filter." />;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Asset</th><th>Category</th><th>Where</th><th>Condition</th><th>Status</th><th>Usage</th><th>Next service</th><th className={styles.num}>Book value</th></tr></thead>
        <tbody>
          {rows.map(a => {
            const due = dueLabel(a.nextService);
            return (
              <tr key={a.code} className={ps.clickRow} onClick={() => onOpen(a)}>
                <td>
                  <div className={ps.entity}>
                    <AssetTile category={a.category} />
                    <div style={{ minWidth: 0 }}>
                      <div className={ps.cellMain}>{a.name}</div>
                      <div className={ps.cellSub}>{a.code} · {a.model}</div>
                    </div>
                  </div>
                </td>
                <td><div>{a.category}</div><div className={ps.cellSub}>{a.subcategory}</div></td>
                <td><div>{a.branch}</div><div className={ps.cellSub}>{a.location}</div></td>
                <td><Status kind={CONDITION_KIND[a.condition]}>{a.condition}</Status></td>
                <td><Status kind={STATUS_KIND[a.status]}>{a.status}</Status></td>
                <td style={{ minWidth: 150 }}><Meter pct={a.utilization} color={a.utilization < 40 ? palette.s5 : palette.s3} /></td>
                <td>{a.status === "Retired" ? <span className={styles.muted}>—</span> : <><div>{fmtDate(a.nextService)}</div><div className={ps.cellSub} style={{ color: due.kind === "critical" ? "var(--status-critical)" : undefined }}>{due.text}</div></>}</td>
                <td className={styles.num}><div style={{ fontWeight: 700 }}>{money(a.currentValue)}</div><div className={ps.cellSub}>of {money(a.purchasePrice)}</div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TxnTypeCell({ type }: { type: TxnType }) {
  const m = TXN_META[type];
  return (
    <span className={ps.entity} style={{ gap: 6 }}>
      <span className={ps.tile} style={{ ["--tone" as any]: m.tone, width: 26, height: 26, borderRadius: 8 }}><m.icon size={13} /></span>
      <span style={{ fontWeight: 600 }}>{m.label}</span>
    </span>
  );
}

const TXN_STATUS: Record<string, "good" | "warning" | "info"> = { completed: "good", pending: "warning", active: "info" };

function TxnTable({ rows, onOpen }: { rows: AssetTxn[]; onOpen?: (t: AssetTxn) => void }) {
  const { money } = useMoney();
  if (!rows.length) return <Empty icon={Search} title="No transactions match" text="Try another type or search." />;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Date</th><th>Type</th><th>Asset</th><th>Details</th><th>By</th><th>Status</th><th className={styles.num}>Amount</th></tr></thead>
        <tbody>
          {rows.map(t => (
            <tr key={t.id} className={onOpen ? ps.clickRow : undefined} onClick={onOpen ? () => onOpen(t) : undefined}>
              <td><div>{fmtDate(t.date)}</div><div className={ps.cellSub}>{t.id}</div></td>
              <td><TxnTypeCell type={t.type} /></td>
              <td><div className={ps.cellMain}>{t.assetName}</div><div className={ps.cellSub}>{t.assetCode}</div></td>
              <td style={{ maxWidth: 320 }}>
                {(() => {
                  const lead = t.from && t.to ? `${t.from} → ${t.to}` : t.assignedTo ? `To ${t.assignedTo}` : t.vendor;
                  return <>
                    <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead ?? t.detail}</div>
                    {lead && <div className={ps.cellSub} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.detail}</div>}
                  </>;
                })()}
              </td>
              <td>{t.by}</td>
              <td><Status kind={TXN_STATUS[t.status]}>{t.status === "pending" ? "Awaiting approval" : t.status === "active" ? "Active" : "Completed"}</Status></td>
              <td className={styles.num} style={{ fontWeight: 700 }}>{t.amount ? money(t.amount) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── /manage-assets ─────────────────────────────────────────────────────────

export function ManageAssets() {
  const navigate = useNavigate();
  const { money } = useMoney();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [branch, setBranch] = useState("all");
  const [open, setOpen] = useState<Asset | null>(null);

  const categories = useMemo(() => [...new Set(ASSETS.map(a => a.category))], []);
  const branches = useMemo(() => [...new Set(ASSETS.map(a => a.branch))].sort(), []);
  const rows = ASSETS.filter(a =>
    (category === "all" || a.category === category) && (status === "all" || a.status === status) && (branch === "all" || a.branch === branch)
    && (!query.trim() || `${a.name} ${a.code} ${a.model} ${a.serialNumber} ${a.location}`.toLowerCase().includes(query.trim().toLowerCase())));
  const statusCount = (st: string) => ASSETS.filter(a => a.status === st).length;
  const inUse = ASSETS.length ? Math.round((statusCount("In use") / ASSETS.length) * 100) : 0;

  return (
    <div className={styles.root}>
      <PageHead title="Asset Register" subtitle="Every asset with its value, condition, location and service history">
        <Button variant="outline" size="sm" onClick={() => navigate("/assets")}><Boxes className="h-4 w-4 mr-2" />Overview</Button>
        <Button variant="outline" size="sm" onClick={() => soon("Importing assets")}><Upload className="h-4 w-4 mr-2" />Import</Button>
        <Button variant="outline" size="sm" onClick={() => soon("Exporting the register")}><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" onClick={() => soon("Adding an asset")}><Plus className="h-4 w-4 mr-2" />Add asset</Button>
      </PageHead>
      <PreviewBanner module="Asset Register" features={["QR / barcode tags", "Service reminders", "Depreciation schedule", "Branch transfers"]} />

      <div className={styles.kpis} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))" }}>
        <Kpi icon={Boxes} tone="blue" label="Assets in this list" value={fmtInt(ASSETS.length)} hint="sample of the register" />
        <Kpi icon={Wallet} tone="teal" label="Book value" value={money(ASSETS.reduce((n, a) => n + a.currentValue, 0))} hint={`bought for ${money(ASSETS.reduce((n, a) => n + a.purchasePrice, 0))}`} />
        <Kpi icon={CheckCircle2} tone="green" label="In use" value={`${inUse}%`} hint={`${statusCount("In use")} of ${ASSETS.length}`} onClick={() => setStatus("In use")} />
        <Kpi icon={Hammer} tone="orange" label="Under maintenance" value={fmtInt(statusCount("Under maintenance"))} onClick={() => setStatus("Under maintenance")} />
        <Kpi icon={Building2} tone="violet" label="Branches" value={fmtInt(branches.length)} onClick={() => setBranch("all")} />
      </div>

      <Panel title="Assets" icon={ClipboardList} sub="Click an asset to see its value, service history and movements"
        action={<span className={styles.scope}>{rows.length} shown</span>}>
        <div className={ps.toolbar}>
          <label className={ps.search}><Search aria-hidden /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search name, code, model, serial…" aria-label="Search assets" /></label>
          <select className={ps.select} value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
            <option value="all">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={ps.select} value={branch} onChange={e => setBranch(e.target.value)} aria-label="Branch">
            <option value="all">All branches</option>{branches.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <div className={styles.chips} style={{ flex: "0 1 auto" }}>
            {["all", "In use", "Available", "Under maintenance", "Retired"].map(st => (
              <button key={st} type="button" className={styles.chip} data-active={status === st} onClick={() => setStatus(st)}>
                {st === "all" ? "All" : st}{st !== "all" && ` · ${statusCount(st)}`}
              </button>
            ))}
          </div>
        </div>
        <AssetTable rows={rows} onOpen={setOpen} />
      </Panel>

      <AssetSheet asset={open} onClose={() => setOpen(null)} />
    </div>
  );
}

// ── /asset-transactions ────────────────────────────────────────────────────

function TxnSheet({ txn, onClose }: { txn: AssetTxn | null; onClose: () => void }) {
  const { money } = useMoney();
  if (!txn) return null;
  const m = TXN_META[txn.type];
  return (
    <Sheet open={!!txn} onOpenChange={o => { if (!o) onClose(); }}>
      <SheetContent className={ps.sheet} style={{ width: "min(100vw, 32rem)", maxWidth: "100vw", overflowY: "auto" }}>
        <SheetHeader>
          <div className={ps.sheetHead}>
            <span className={`${ps.tile} ${ps.tileLg}`} style={{ ["--tone" as any]: m.tone }}><m.icon /></span>
            <div style={{ minWidth: 0 }}>
              <SheetTitle className={ps.sheetTitle}>{m.label} · {txn.assetName}</SheetTitle>
              <SheetDescription className={ps.sheetSub}>{txn.id} · {fmtDate(txn.date)}</SheetDescription>
            </div>
          </div>
        </SheetHeader>
        <div className={ps.sheetBody}>
          {txn.status === "pending" && (
            <div className={ps.sheetActions}>
              <Button size="sm" onClick={() => soon("Approving asset transactions")}><CheckCircle2 className="h-4 w-4 mr-2" />Approve</Button>
              <Button size="sm" variant="outline" onClick={() => soon("Rejecting asset transactions")}>Reject</Button>
            </div>
          )}
          <div className={styles.facts}>
            <div className={styles.fact}><span className={styles.factLabel}>Amount</span><span className={styles.factValue}>{txn.amount ? money(txn.amount) : "—"}</span></div>
            <div className={styles.fact}><span className={styles.factLabel}>Status</span><span className={styles.factValue}><Status kind={TXN_STATUS[txn.status]}>{txn.status === "pending" ? "Awaiting approval" : txn.status}</Status></span></div>
            <div className={styles.fact}><span className={styles.factLabel}>Asset</span><span className={styles.factValue}>{txn.assetName} ({txn.assetCode})</span></div>
            {txn.vendor && <div className={styles.fact}><span className={styles.factLabel}>Vendor</span><span className={styles.factValue}>{txn.vendor}</span></div>}
            {txn.from && <div className={styles.fact}><span className={styles.factLabel}>From</span><span className={styles.factValue}>{txn.from}</span></div>}
            {txn.to && <div className={styles.fact}><span className={styles.factLabel}>To</span><span className={styles.factValue}>{txn.to}</span></div>}
            {txn.assignedTo && <div className={styles.fact}><span className={styles.factLabel}>Assigned to</span><span className={styles.factValue}>{txn.assignedTo}</span></div>}
          </div>
          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>Notes</div>
            <div style={{ fontSize: "var(--text-sm)" }}>{txn.detail}</div>
          </div>
          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>Approval trail</div>
            <div className={ps.timeline}>
              <div className={ps.tlItem}><span className={ps.tlDot}><FileText /></span><div><div className={ps.tlTitle}>Recorded by {txn.by}</div><div className={ps.tlMeta}>{fmtDate(txn.date)}</div></div></div>
              {txn.approvedBy
                ? <div className={ps.tlItem} style={{ ["--tone" as any]: "#1baf7a" }}><span className={ps.tlDot}><CheckCircle2 /></span><div><div className={ps.tlTitle}>Approved by {txn.approvedBy}</div><div className={ps.tlMeta}>{fmtDate(txn.date)}</div></div></div>
                : <div className={ps.tlItem} style={{ ["--tone" as any]: "#b45309" }}><span className={ps.tlDot}><CalendarClock /></span><div><div className={ps.tlTitle}>Waiting for a manager</div><div className={ps.tlMeta}>Not approved yet</div></div></div>}
            </div>
          </div>
          <div className={ps.sheetSection}>
            <div className={ps.sheetSectionTitle}>Documents</div>
            <div className={ps.docs}>{txn.documents.map(d => <button key={d} type="button" className={ps.doc} onClick={() => soon("Opening attached documents")}><FileText />{d}</button>)}</div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AssetTransactions() {
  const { money } = useMoney();
  const [type, setType] = useState<TxnType | "all">("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<AssetTxn | null>(null);
  const rows = TRANSACTIONS.filter(t => (type === "all" || t.type === type)
    && (!query.trim() || `${t.id} ${t.assetName} ${t.assetCode} ${t.detail} ${t.vendor ?? ""} ${t.by}`.toLowerCase().includes(query.trim().toLowerCase())));
  const sum = (ty: TxnType, days = 90) => TRANSACTIONS.filter(t => t.type === ty && daysUntil(t.date) >= -days).reduce((n, t) => n + t.amount, 0);
  const count = (ty: TxnType) => TRANSACTIONS.filter(t => t.type === ty).length;

  return (
    <div className={styles.root}>
      <PageHead title="Asset Transactions" subtitle="Purchases, transfers, repairs, assignments and disposals in one ledger">
        <Button variant="outline" size="sm" onClick={() => soon("Exporting transactions")}><Download className="h-4 w-4 mr-2" />Export</Button>
        <Button size="sm" onClick={() => soon("Recording an asset transaction")}><Plus className="h-4 w-4 mr-2" />New transaction</Button>
      </PageHead>
      <PreviewBanner module="Asset Transactions" features={["Approval workflow", "Linked documents", "Posts to the ledger", "Audit trail"]} />

      <div className={styles.kpis} style={{ gridTemplateColumns: "repeat(auto-fit, minmax(11rem, 1fr))" }}>
        <Kpi icon={ClipboardList} tone="blue" label="Transactions" value={fmtInt(TRANSACTIONS.length)} hint="in this sample" />
        <Kpi icon={PackagePlus} tone="green" label="Bought (90 days)" value={money(sum("purchase"))} onClick={() => setType("purchase")} />
        <Kpi icon={Wrench} tone="amber" label="Maintenance (90 days)" value={money(sum("maintenance"))} onClick={() => setType("maintenance")} />
        <Kpi icon={CalendarClock} tone="orange" label="Awaiting approval" value={fmtInt(PENDING_APPROVAL.length)} hint={money(PENDING_APPROVAL.reduce((n, t) => n + t.amount, 0))} />
      </div>

      <Panel title="Ledger" icon={ClipboardList} sub="Click a transaction for its details, approvals and documents" action={<span className={styles.scope}>{rows.length} shown</span>}>
        <div className={ps.toolbar}>
          <label className={ps.search}><Search aria-hidden /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search asset, vendor, reference…" aria-label="Search transactions" /></label>
          <div className={styles.chips}>
            <button type="button" className={styles.chip} data-active={type === "all"} onClick={() => setType("all")}>All</button>
            {(Object.keys(TXN_META) as TxnType[]).filter(ty => count(ty) > 0).map(ty => (
              <button key={ty} type="button" className={styles.chip} data-active={type === ty} onClick={() => setType(ty)}>{TXN_META[ty].label} · {count(ty)}</button>
            ))}
          </div>
        </div>
        <TxnTable rows={rows} onOpen={setOpen} />
      </Panel>

      <TxnSheet txn={open} onClose={() => setOpen(null)} />
    </div>
  );
}
