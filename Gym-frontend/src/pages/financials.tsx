import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, ArrowDownLeft, ArrowUpRight, BarChart3, CheckCircle2, CreditCard, FileText, Info, Landmark, PieChart,
  Receipt, RefreshCw, Scale, TrendingDown, TrendingUp, Users, Wallet,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useCurrency } from "../utils/currency";
import { useBranch } from "../utils/branch-context";
import {
  financialOverviewService, overviewErrorMessage, FinancialOverview, InsightType,
} from "../utils/supabase/financial-overview-service";
import { financialAnalyticsService, PendingReconciliation } from "../utils/supabase/financial-analytics-service";
import {
  styles, usePalette, axisTick, Kpi, Panel, ChartTip, Legend, BarRows, Empty, SectionTabs, Seg, Status, Delta, fmtInt, fmtDate,
  Period, periodRange, PERIOD_OPTIONS,
} from "../components/overview/overview-kit";

type Tab = "activity" | "dues" | "bills" | "recon";

const INSIGHT: Record<InsightType, { icon: typeof Info; label: string }> = {
  critical: { icon: AlertTriangle, label: "Needs attention" },
  warning: { icon: AlertTriangle, label: "Watch" },
  positive: { icon: CheckCircle2, label: "Good news" },
  info: { icon: Info, label: "Note" },
};

/**
 * Financials overview. Everything comes from GET /financial-analytics/overview, so the numbers are
 * the ones in the Income Statement and Financial Analytics: P&L from posted journal vouchers,
 * collections from receipts + POS, dues from members, payables from supplier bills.
 */
export function Financials() {
  const navigate = useNavigate();
  const { activeBranchId } = useBranch();
  const { formatCurrency } = useCurrency();
  const palette = usePalette();
  const money = useCallback((n: number) => formatCurrency(n, { maximumFractionDigits: 0 }), [formatCurrency]);
  const compact = useCallback((n: number) => formatCurrency(n, { notation: "compact", maximumFractionDigits: 1 } as Intl.NumberFormatOptions), [formatCurrency]);

  const [period, setPeriod] = useState<Period>("mtd");
  const [tab, setTab] = useState<Tab>("activity");
  const [data, setData] = useState<FinancialOverview | null>(null);
  const [recons, setRecons] = useState<PendingReconciliation[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => periodRange(period), [period]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [o, r] = await Promise.allSettled([
      financialOverviewService.get({ from: range.from, to: range.to, compare: "previous", compareFrom: range.compareFrom, compareTo: range.compareTo }),
      financialAnalyticsService.getPendingReconciliations(),
    ]);
    if (o.status === "fulfilled") setData(o.value); else setError(overviewErrorMessage(o.reason, "Couldn't load the financial overview."));
    setRecons(r.status === "fulfilled" ? r.value : null);
    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, activeBranchId]);
  useEffect(() => { load(); }, [load]);

  const k = data?.kpis;
  const monthly = useMemo(() => (data?.monthly ?? []).slice(-6).map(m => ({
    ...m, label: m.label.split(" ")[0], tipLabel: m.label,
    revenue: Math.round(m.revenue), expenses: Math.round(m.expenses), profit: Math.round(m.profit),
  })), [data]);
  const expenseRows = (data?.expenseByAccount ?? []).filter(a => a.current > 0).slice(0, 6)
    .map(a => ({ key: a.code + a.name, label: a.name, value: a.current, color: palette.s2, meta: <>{a.share}% of spend{a.changePct != null && <> · <Delta pct={a.changePct} upIsGood={false} /></>}</> }));
  const revenueRows = (data?.revenueByAccount ?? []).filter(a => a.current > 0).slice(0, 6)
    .map(a => ({ key: a.code + a.name, label: a.name, value: a.current, color: palette.s1, meta: <>{a.share}% of revenue{a.changePct != null && <> · <Delta pct={a.changePct} /></>}</> }));
  const methodRows = (data?.collectionsByMethod ?? []).filter(m => m.amount > 0)
    .map(m => ({ key: m.method, label: m.method, value: m.amount, color: palette.s3, meta: `${m.count} payment${m.count === 1 ? "" : "s"} · ${m.share}%` }));
  const dueRows = (data?.receivablesAging ?? []).filter(a => a.amount > 0)
    .map(a => ({ key: a.bucket, label: a.label, value: a.amount, color: a.bucket === "current" ? palette.s3 : a.bucket === "1-30" ? palette.s5 : palette.bad, meta: `${a.count} receipt${a.count === 1 ? "" : "s"}` }));
  const billRows = (data?.payablesAging ?? []).filter(a => a.amount > 0)
    .map(a => ({ key: a.bucket, label: a.label, value: a.amount, color: a.bucket === "current" ? palette.s3 : a.bucket === "1-30" ? palette.s5 : palette.bad, meta: `${a.count} bill${a.count === 1 ? "" : "s"}` }));
  const openRecons = (recons ?? []).filter(r => !/^(completed|reconciled|closed)$/i.test(r.status));

  const tabs: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { id: "activity", label: "Income & expenses", icon: FileText, count: data?.activity.length },
    { id: "dues", label: "Member dues", icon: Users, count: k?.receivables.members },
    { id: "bills", label: "Supplier bills", icon: Receipt, count: k?.payables.bills },
    { id: "recon", label: "Reconciliations", icon: Scale, count: openRecons.length },
  ];

  if (loading && !data) {
    return <div className={styles.root}><div className={styles.centered}><RefreshCw className="h-6 w-6 animate-spin text-primary" />Loading financials…</div></div>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Financials</h1>
          <div className={styles.subtitle}>{range.label} · {fmtDate(range.from)} – {fmtDate(range.to)} · changes {range.vs}</div>
        </div>
        <div className={styles.actions}>
          <Seg value={period} onChange={setPeriod} label="Period" options={PERIOD_OPTIONS} />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <Button size="sm" onClick={() => navigate("/financial-analytics")}><BarChart3 className="h-4 w-4 mr-2" />Full analytics</Button>
        </div>
      </div>

      {error && (
        <div className={`${styles.card} ${styles.filters}`} style={{ color: "var(--bad-ink, var(--destructive))" }}>
          <AlertTriangle size={16} />{error}
        </div>
      )}

      {data && k && (
        <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div className={styles.kpis}>
            <Kpi icon={TrendingUp} tone="blue" label="Revenue" value={money(k.revenue.current)}
              delta={<Delta pct={k.revenue.changePct} />} hint={k.revenue.changePct == null ? (k.revenue.previous ? undefined : "nothing to compare") : undefined}
              onClick={() => navigate("/financial-reports")} title="Posted income, as in the Income Statement" />
            <Kpi icon={TrendingDown} tone="orange" label="Expenses" value={money(k.expenses.current)}
              delta={<Delta pct={k.expenses.changePct} upIsGood={false} />} hint={k.expenses.changePct == null && !k.expenses.previous ? "nothing to compare" : undefined}
              onClick={() => navigate("/expenses")} />
            <Kpi icon={Landmark} tone={k.netProfit.current < 0 ? "red" : "green"} label={k.netProfit.current < 0 ? "Net loss" : "Net profit"} value={money(k.netProfit.current)}
              delta={<Delta pct={k.netProfit.changePct} />} hint={k.revenue.current ? `${k.profitMargin.current}% margin` : undefined} />
            <Kpi icon={Wallet} tone="teal" label="Collected" value={money(k.collections.current)}
              delta={<Delta pct={k.collections.changePct} />} hint={`${fmtInt(k.payingMembers.current)} paying member${k.payingMembers.current === 1 ? "" : "s"}`}
              onClick={() => navigate("/receipt-voucher")} title="Cash received from members and POS in the period" />
            <Kpi icon={CreditCard} tone="violet" label="Cash & bank" value={money(k.cashBalance)}
              hint={<>net flow {k.netCashFlow.current >= 0 ? "+" : ""}{money(k.netCashFlow.current)}</>}
              onClick={() => navigate("/ledgers")} title="Closing balance of cash and bank accounts" />
            <Kpi icon={Users} tone={k.receivables.overdue > 0 ? "red" : "amber"} label="Members owe" value={money(k.receivables.amount)}
              hint={k.receivables.amount ? `${fmtInt(k.receivables.members)} member${k.receivables.members === 1 ? "" : "s"} · ${money(k.receivables.overdue)} overdue` : "nothing outstanding"}
              onClick={() => setTab("dues")} />
          </div>

          <div className={styles.row2}>
            <Panel title="Income vs expenses" icon={BarChart3} scope="Last 6 months" sub="Posted revenue and expenses per month, with the profit line">
              {monthly.every(m => !m.revenue && !m.expenses) ? (
                <Empty icon={BarChart3} title="No posted income or expenses yet" text="Receipts, POS sales, bills and salaries post here once they're recorded." />
              ) : (
                <>
                  <div className={styles.chart}>
                    <ResponsiveContainer>
                      <ComposedChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={4}>
                        <CartesianGrid vertical={false} stroke={palette.grid} />
                        <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                        <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={64} tickFormatter={v => compact(Number(v))} />
                        <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                        <Bar isAnimationActive={false} dataKey="revenue" name="Revenue" fill={palette.s1} radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Bar isAnimationActive={false} dataKey="expenses" name="Expenses" fill={palette.s2} radius={[4, 4, 0, 0]} maxBarSize={30} />
                        <Line isAnimationActive={false} dataKey="profit" name="Profit" stroke={palette.s3} strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <Legend items={[{ label: "Revenue", color: palette.s1 }, { label: "Expenses", color: palette.s2 }, { label: "Profit", color: palette.s3, line: true }]} />
                </>
              )}
            </Panel>

            <Panel title="Worth a look" icon={Info} sub={range.label}>
              <div className={styles.insights}>
                {data.insights.length === 0 ? <Empty icon={CheckCircle2} title="Nothing stands out for this period" /> : data.insights.slice(0, 4).map((i, idx) => {
                  const meta = INSIGHT[i.type] ?? INSIGHT.info;
                  return (
                    <div key={idx} className={styles.insight} data-type={i.type}>
                      <span className={styles.insightIcon}><meta.icon size={15} /></span>
                      <div>
                        <div className={styles.insightTag}>{meta.label}</div>
                        <div className={styles.insightTitle}>{i.title}</div>
                        <div className={styles.insightDetail}>{i.detail}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>

          <div className={styles.cols2}>
            <Panel title="Where the money came from" icon={ArrowDownLeft} scope={range.label} sub="Revenue by income account">
              <BarRows rows={revenueRows} fmt={money} empty="No revenue posted in this period." />
            </Panel>
            <Panel title="Where the money went" icon={ArrowUpRight} scope={range.label} sub="Expenses by account, change vs the comparison period">
              <BarRows rows={expenseRows} fmt={money} empty="No expenses posted in this period." />
            </Panel>
          </div>

          <div className={styles.cols2}>
            <Panel title="How members paid" icon={Wallet} scope={range.label} sub="Collections by payment method (credit sales excluded)">
              <BarRows rows={methodRows} fmt={money} empty="No payments collected in this period." />
            </Panel>
            <Panel title="Balance sheet snapshot" icon={PieChart} sub={`As of ${fmtDate(range.to)}`}>
              <div className={styles.facts}>
                <div className={styles.fact}><span className={styles.factLabel}>Cash & bank</span><span className={styles.factValue}>{money(k.cashBalance)}</span></div>
                <div className={styles.fact}><span className={styles.factLabel}>Cash in / out (period)</span><span className={styles.factValue}>{money(k.cashIn.current)} / {money(k.cashOut.current)}</span></div>
                <div className={styles.fact}><span className={styles.factLabel}>Receivable (ledger)</span><span className={styles.factValue}>{money(k.receivables.ledger)}</span></div>
                <div className={styles.fact}><span className={styles.factLabel}>Payable (ledger)</span><span className={styles.factValue}>{money(k.payables.ledger)}</span></div>
                <div className={styles.fact}><span className={styles.factLabel}>Tax payable</span><span className={styles.factValue}>{money(k.taxPayable)}</span></div>
                <div className={styles.fact}><span className={styles.factLabel}>Unearned membership revenue</span><span className={styles.factValue}>{money(k.deferredRevenue)}</span></div>
              </div>
            </Panel>
          </div>

          <SectionTabs tabs={tabs} value={tab} onChange={setTab} label="Financial details" />

          {tab === "activity" && (
            <Panel title="Income & expense entries" icon={FileText} scope={range.label} sub="Posted journal vouchers that touched income or expense accounts"
              action={<Button variant="outline" size="sm" onClick={() => navigate("/ledgers")}>Ledgers</Button>}>
              {data.activity.length === 0 ? <Empty icon={FileText} title="No postings in this period" /> : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Date</th><th>Entry</th><th>Accounts</th><th>Type</th><th className={styles.num}>Amount</th></tr></thead>
                    <tbody>
                      {data.activity.slice(0, 25).map(a => {
                        const income = a.kind === "income" || a.kind === "expense_reversal";
                        return (
                          <tr key={a.id}>
                            <td>{fmtDate(a.date)}</td>
                            <td style={{ maxWidth: 360 }}>
                              <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.narration || a.reference || "—"}</div>
                              <div className={styles.muted} style={{ fontSize: "var(--text-xs)" }}>{a.voucherNo}</div>
                            </td>
                            <td className={styles.muted}>{a.accounts}</td>
                            <td><Status kind={income ? "good" : "warning"}>{a.kind.replace("_", " ")}</Status></td>
                            <td className={styles.num} style={{ fontWeight: 700, color: income ? "var(--status-good)" : undefined }}>{income ? "+" : "−"}{money(Math.abs(a.amount))}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {data.activity.length > 25 && <div className={styles.muted} style={{ fontSize: "var(--text-xs)", padding: "0.5rem 0.75rem" }}>Showing the latest 25 of {data.activity.length}. Open Ledgers for the rest.</div>}
                </div>
              )}
            </Panel>
          )}

          {tab === "dues" && (
            <div className={styles.cols2}>
              <Panel title="Dues by age" icon={Users} sub={`${money(k.receivables.amount)} owed by ${fmtInt(k.receivables.members)} member${k.receivables.members === 1 ? "" : "s"}`}>
                <BarRows rows={dueRows} fmt={money} empty="No member owes anything right now." />
              </Panel>
              <Panel title="Largest balances" icon={AlertTriangle} sub="Members to follow up with first"
                action={<Button variant="outline" size="sm" onClick={() => navigate("/follow-ups")}>Follow-ups</Button>}>
                {data.topDebtors.length === 0 ? <Empty icon={CheckCircle2} title="Nothing outstanding" /> : (
                  <div className={styles.list}>
                    {data.topDebtors.map((d, i) => (
                      <div key={(d.memberId ?? d.name) + "-" + i} className={styles.listRow}>
                        <span className={`${styles.kpiIcon} ${styles.kpiIconSm}`} data-tone={d.daysOverdue > 30 ? "red" : "amber"}><Users size={14} /></span>
                        <div className={styles.rowMain}>
                          <span className={styles.rowName}>{d.name}</span>
                          <span className={styles.rowMeta}>Oldest due {fmtDate(d.oldestDue)}{d.daysOverdue > 0 ? ` · ${d.daysOverdue} days overdue` : ""}</span>
                        </div>
                        <span className={styles.rowEnd} style={{ fontWeight: 700 }}>{money(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          )}

          {tab === "bills" && (
            <div className={styles.cols2}>
              <Panel title="Unpaid bills by age" icon={Receipt} sub={`${money(k.payables.amount)} across ${fmtInt(k.payables.bills)} bill${k.payables.bills === 1 ? "" : "s"}`}>
                <BarRows rows={billRows} fmt={money} empty="No unpaid supplier bills." />
              </Panel>
              <Panel title="Due next" icon={Receipt} sub="Supplier bills in due-date order"
                action={<Button variant="outline" size="sm" onClick={() => navigate("/purchase")}>Purchases</Button>}>
                {data.upcomingPayables.length === 0 ? <Empty icon={CheckCircle2} title="No bills waiting to be paid" /> : (
                  <div className={styles.list}>
                    {data.upcomingPayables.map((b, i) => (
                      <div key={(b.bill ?? b.vendor) + "-" + i} className={styles.listRow}>
                        <span className={`${styles.kpiIcon} ${styles.kpiIconSm}`} data-tone={b.daysOverdue > 0 ? "red" : "blue"}><Receipt size={14} /></span>
                        <div className={styles.rowMain}>
                          <span className={styles.rowName}>{b.vendor}{b.bill ? ` · ${b.bill}` : ""}</span>
                          <span className={styles.rowMeta}>{b.daysOverdue > 0 ? `${b.daysOverdue} days overdue` : `Due ${fmtDate(b.dueDate)}`}</span>
                        </div>
                        <span className={styles.rowEnd} style={{ fontWeight: 700 }}>{money(b.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          )}

          {tab === "recon" && (
            <Panel title="Bank reconciliations" icon={Scale} sub="Statements not yet matched to the books"
              action={<Button variant="outline" size="sm" onClick={() => navigate("/bank-reconciliations")}>Bank Reconciliations</Button>}>
              {!recons ? <Empty title="Reconciliations unavailable" /> : openRecons.length === 0 ? (
                <Empty icon={CheckCircle2} title="All bank accounts are reconciled" />
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>Account</th><th>Bank</th><th>Last reconciled</th><th>Status</th><th className={styles.num}>Difference</th></tr></thead>
                    <tbody>
                      {openRecons.map(r => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.account}</td>
                          <td className={styles.muted}>{r.bank || "—"}</td>
                          <td>{fmtDate(r.lastReconciled)}</td>
                          <td><Status kind={/progress/i.test(r.status) ? "info" : "warning"}>{r.status.replace(/_/g, " ").toLowerCase()}</Status></td>
                          <td className={styles.num} style={{ fontWeight: 700 }}>{money(Number(r.difference) || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>
          )}
        </div>
      )}
    </div>
  );
}
