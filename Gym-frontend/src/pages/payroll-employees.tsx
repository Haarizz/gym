import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  AlertTriangle, CalendarClock, CalendarDays, GraduationCap, HandCoins, RefreshCw, TrendingUp, UserPlus, Users, Wallet,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useCurrency } from "../utils/currency";
import { payrollAnalyticsService, PayrollDashboardData } from "../utils/supabase/payroll-analytics-service";
import {
  payrollReportService, PayrollDataset, addMonths, monthLabel, ym, totals,
} from "../utils/supabase/payroll-report-service";
import { salaryPaymentsService, SalaryPaymentEmployee } from "../utils/supabase/salary-payments-service";
import {
  styles, usePalette, axisTick, Kpi, Panel, ChartTip, Legend, BarRows, Empty, SectionTabs, Status, Delta,
  pctChange, fmtInt, fmtDate,
} from "../components/overview/overview-kit";
import { ReportActions, type ReportDocument, chartFromRows, col, countCol, kpiSection, moneyCol, tableSection } from "../components/report-export";

type Tab = "hires" | "unpaid" | "advances" | "classes";
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/**
 * Payroll & Employees overview. Pay figures come from the payroll report (by salary month, the
 * same numbers as Payroll Reports / Analytics); "unpaid" is Salary Payments' own status for last
 * month; headcount, classes and bookings come from the payroll dashboard endpoint.
 */
export function PayrollEmployees() {
  const navigate = useNavigate();
  const { formatCurrency } = useCurrency();
  const palette = usePalette();
  const money = useCallback((n: number) => formatCurrency(n, { maximumFractionDigits: 0 }), [formatCurrency]);
  const compact = useCallback((n: number) => formatCurrency(n, { notation: "compact", maximumFractionDigits: 1 } as Intl.NumberFormatOptions), [formatCurrency]);

  const thisMonth = ym(new Date());
  const lastMonth = addMonths(thisMonth, -1);
  const firstMonth = addMonths(thisMonth, -5);
  const [lmYear, lmMonth] = lastMonth.split("-").map(Number);

  const [dash, setDash] = useState<PayrollDashboardData | null>(null);
  const [report, setReport] = useState<PayrollDataset | null>(null);
  const [unpaid, setUnpaid] = useState<SalaryPaymentEmployee[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string[]>([]);
  const [tab, setTab] = useState<Tab>("unpaid");

  const load = useCallback(async () => {
    setLoading(true);
    const errors: string[] = [];
    const [d, r, u] = await Promise.allSettled([
      payrollAnalyticsService.getDashboardData(),
      payrollReportService.get(firstMonth, thisMonth),
      salaryPaymentsService.getEmployees({ month: MONTH_NAMES[lmMonth - 1], year: lmYear }),
    ]);
    if (d.status === "fulfilled") setDash(d.value); else errors.push("staff & classes");
    if (r.status === "fulfilled") setReport(r.value); else errors.push("payroll");
    if (u.status === "fulfilled") setUnpaid(u.value.filter(e => e.paymentStatus !== "Paid")); else errors.push("salary payments");
    setFailed(errors);
    setLoading(false);
  }, [firstMonth, thisMonth, lmMonth, lmYear]);
  useEffect(() => { load(); }, [load]);

  // ── Derived ──
  const payrollByMonth = useMemo(() => {
    if (!report) return [];
    return report.months.map(m => {
      const t = totals(report.records.filter(r => r.month === m.month));
      return {
        month: m.month, label: m.label, tipLabel: monthLabel(m.month, true) + (m.current ? " (running)" : ""),
        basic: Math.round(t.basic), allowances: Math.round(t.allowances + t.unitemised), overtime: Math.round(t.overtime),
        commission: Math.round(t.commission),
        // The running month has no salaries until payroll runs; leave the line open instead of dropping to 0.
        net: m.current && !t.rows ? null : Math.round(t.net), employees: t.employees, paid: t.paid, unpaid: t.unpaid, draft: t.draft,
      };
    });
  }, [report]);
  const lm = payrollByMonth.find(m => m.month === lastMonth);
  const installmentsDue = (report?.advances.open ?? []).reduce((s, a) => s + Math.min(a.installment || a.balance, a.balance), 0);
  const lm2 = payrollByMonth.find(m => m.month === addMonths(thisMonth, -2));
  const unpaidTotal = (unpaid ?? []).reduce((s, e) => s + (Number(e.netSalary) || 0), 0);
  const hiresThisMonth = (dash?.recentHires ?? []).filter(h => h.hireDate && h.hireDate.slice(0, 7) === thisMonth).length;
  const hiresCapped = (dash?.recentHires ?? []).length >= 5 && hiresThisMonth >= 5;
  const deptBasic = new Map((dash?.payrollDistribution ?? []).map(d => [d.category, Number(d.amount) || 0]));
  const deptRows = (dash?.staffByDepartment ?? [])
    .map(d => ({ key: d.department, label: d.department, value: Number(d.count) || 0, color: palette.s1, meta: `${money(deptBasic.get(d.department) ?? 0)} basic / mo` }))
    .sort((a, b) => b.value - a.value);
  const totalBasic = [...deptBasic.values()].reduce((s, v) => s + v, 0);
  const classTrend = (dash?.classBookingTrends ?? []).map(t => ({ label: t.month, classes: Number(t.classes) || 0, bookings: Number(t.bookings) || 0 }));

  const tabs: { id: Tab; label: string; icon: typeof Users; count?: number }[] = [
    { id: "unpaid", label: `Unpaid · ${monthLabel(lastMonth)}`, icon: Wallet, count: unpaid?.length },
    { id: "advances", label: "Salary advances", icon: HandCoins, count: report?.advances.openCount },
    { id: "hires", label: "Recent hires", icon: UserPlus },
    { id: "classes", label: "Top classes", icon: GraduationCap },
  ];

  // Export / print: the overview's figures and every tab's list
  const buildReport = (): ReportDocument => ({
    title: "Payroll & Employees Overview",
    fileName: "Payroll and Employees Overview",
    period: { label: monthLabel(thisMonth, true) },
    sections: [
      kpiSection([
        { label: "Staff & trainers", value: dash?.kpiData.totalStaffTrainers ?? "—", format: "integer" },
        { label: `Payroll · ${monthLabel(lastMonth)}`, value: lm?.net ?? "—", format: "money", hint: lm ? `${lm.employees} employees · net pay` : "no salaries recorded" },
        { label: `Unpaid · ${monthLabel(lastMonth)}`, value: unpaid ? unpaid.length : "—", format: "integer", hint: unpaid?.length ? "to pay" : undefined },
        { label: "Unpaid amount", value: unpaidTotal, format: "money" },
        { label: "Advances owed", value: report ? report.advances.outstanding : "—", format: "money", hint: report ? `${report.advances.openCount} open advances` : undefined },
        { label: "Upcoming classes", value: dash?.kpiData.activeTrainingsClasses ?? "—", format: "integer" },
        { label: "Bookings · 7 days", value: dash?.kpiData.upcomingBookings ?? "—", format: "integer" },
      ], "Key figures"),
      chartFromRows("Payroll by salary month (gross parts)", "stacked-bar", payrollByMonth, "tipLabel", [
        { key: "basic", name: "Basic", color: "#2a78d6" }, { key: "allowances", name: "Allowances", color: "#eb6834" },
        { key: "overtime", name: "Overtime", color: "#1baf7a" }, { key: "commission", name: "Commission", color: "#6250d6" },
      ], { valueFormat: "money" }),
      tableSection("Payroll by salary month", [
        col("tipLabel", "Month"), moneyCol("basic", "Basic"), moneyCol("allowances", "Allowances"), moneyCol("overtime", "Overtime"),
        moneyCol("commission", "Commission"), moneyCol("net", "Net pay"), col("employees", "Employees", "integer"),
      ], payrollByMonth, { totals: true }),
      tableSection("Staff by department", [col("label", "Department"), countCol("value", "Staff"), col("meta", "Monthly basic")], deptRows, { totals: true }),
      { kind: "keyValue", title: "Payroll facts", items: [
        { label: "Monthly basic", value: report?.staff.monthlyBase ?? totalBasic, format: "money" },
        { label: "Average basic", value: report?.staff.active ? report.staff.monthlyBase / report.staff.active : "—", format: "money" },
        { label: "Advance recoveries / month", value: installmentsDue, format: "money" },
        { label: "Joined in last 6 months", value: report?.staff.joinedInRange ?? "—", format: "integer" },
      ] },
      tableSection(`Unpaid salaries · ${monthLabel(lastMonth)}`, [col("name", "Employee"), col("employeeId", "ID"), col("department", "Department"), col("status", "Status"), moneyCol("net", "Net to pay")],
        (unpaid ?? []).map(e => ({ name: e.name, employeeId: e.employeeId, department: e.department || "—", status: e.paymentStatus + (e.payrollRunStatus ? ` · payroll ${e.payrollRunStatus.toLowerCase()}` : ""), net: Number(e.netSalary) || 0 })),
        { totals: true, emptyText: "Everyone is paid." }),
      tableSection("Open salary advances", [col("name", "Employee"), col("ref", "Advance"), col("issuedOn", "Issued", "date"), moneyCol("approved", "Approved"), moneyCol("recovered", "Recovered"), moneyCol("installment", "Installment"), moneyCol("balance", "Balance")],
        (report?.advances.open ?? []).map(a => ({ ...a, ref: `ADV-${a.id}${a.type ? ` · ${a.type}` : ""}` })), { totals: true, emptyText: "No open advances." }),
      tableSection("Recent hires", [col("name", "Employee"), col("position", "Position"), col("department", "Department"), col("hireDate", "Joined", "date"), moneyCol("salary", "Basic salary")],
        (dash?.recentHires ?? []).map(h => ({ name: h.name, position: h.position || "—", department: h.department || "—", hireDate: h.hireDate, salary: h.salary != null ? Number(h.salary) : null }))),
      tableSection("Top classes", [col("className", "Class"), col("instructor", "Trainer"), countCol("bookings", "Seats booked"), col("capacity", "Capacity", "integer"), moneyCol("revenue", "Booking revenue")],
        (dash?.topPerformingClasses ?? []).map(c => ({ className: c.className, instructor: c.instructor, bookings: c.bookings, capacity: c.capacity || null, revenue: Number(c.revenue) || 0 })), { totals: true }),
      chartFromRows("Classes and bookings by month", "bar", classTrend, "label", [{ key: "classes", name: "Classes", color: "#2a78d6" }, { key: "bookings", name: "Bookings", color: "#1baf7a" }], { valueFormat: "integer" }),
    ],
  });

  if (loading && !dash && !report) {
    return <div className={styles.root}><div className={styles.centered}><RefreshCw className="h-6 w-6 animate-spin text-primary" />Loading payroll & employees…</div></div>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Payroll & Employees</h1>
          <div className={styles.subtitle}>Staff, salaries, advances and classes at a glance · {monthLabel(thisMonth, true)}</div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Refresh
          </Button>
          <ReportActions report={buildReport} disabled={loading} menuLabel="Payroll & employees" />
          <Button size="sm" onClick={() => navigate("/payroll")}><Wallet className="h-4 w-4 mr-2" />Open Payroll</Button>
        </div>
      </div>

      {failed.length > 0 && (
        <div className={`${styles.card} ${styles.filters}`} style={{ color: "var(--bad-ink)" }}>
          <AlertTriangle size={16} />Couldn't load {failed.join(", ")}. The rest of the page is up to date.
        </div>
      )}

      <div className={loading ? styles.loadingVeil : undefined} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className={styles.kpis}>
          <Kpi icon={Users} tone="blue" label="Staff & trainers" value={fmtInt(dash?.kpiData.totalStaffTrainers)}
            hint={hiresThisMonth ? `${hiresThisMonth}${hiresCapped ? "+" : ""} joined this month` : "active employees"} onClick={() => navigate("/staffs-trainers")} />
          <Kpi icon={Wallet} tone="violet" label={`Payroll · ${monthLabel(lastMonth)}`} value={lm?.net != null ? money(lm.net) : "—"}
            delta={lm?.net != null && lm2?.net != null ? <Delta pct={pctChange(lm.net, lm2.net)} upIsGood={false} /> : undefined}
            hint={lm ? `${lm.employees} employee${lm.employees === 1 ? "" : "s"} · net pay` : "no salaries recorded"} onClick={() => navigate("/payroll-reports")} />
          <Kpi icon={AlertTriangle} tone={unpaid && unpaid.length ? "red" : "green"} label={`Unpaid · ${monthLabel(lastMonth)}`}
            value={unpaid ? fmtInt(unpaid.length) : "—"} hint={unpaid ? (unpaid.length ? money(unpaidTotal) + " to pay" : "everyone paid") : "unavailable"}
            onClick={() => navigate("/salary-payments")} />
          <Kpi icon={HandCoins} tone="orange" label="Advances owed" value={report ? money(report.advances.outstanding) : "—"}
            hint={report ? `${report.advances.openCount} open advance${report.advances.openCount === 1 ? "" : "s"}` : undefined} onClick={() => navigate("/salary-advances")} />
          <Kpi icon={GraduationCap} tone="teal" label="Upcoming classes" value={fmtInt(dash?.kpiData.activeTrainingsClasses)} hint="scheduled from today" onClick={() => navigate("/trainings-classes")} />
          <Kpi icon={CalendarClock} tone="amber" label="Bookings · 7 days" value={fmtInt(dash?.kpiData.upcomingBookings)} hint="seats booked" />
        </div>

        <div className={styles.row2}>
          <Panel title="Payroll by salary month" icon={TrendingUp} scope="Last 6 months"
            sub="Gross pay by part (bars) and net paid (line) — the same figures as Payroll Reports">
            {payrollByMonth.every(m => !m.net && !m.basic) ? (
              <Empty icon={Wallet} title="No salaries recorded yet" text="Run payroll or record salary payments and the trend appears here." />
            ) : (
              <>
                <div className={styles.chart}>
                  <ResponsiveContainer>
                    <ComposedChart data={payrollByMonth} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke={palette.grid} />
                      <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                      <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={64} tickFormatter={v => compact(Number(v))} />
                      <Tooltip content={<ChartTip fmt={(v: number) => money(v)} />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                      <Bar isAnimationActive={false} dataKey="basic" name="Basic" stackId="g" fill={palette.s1} maxBarSize={44} />
                      <Bar isAnimationActive={false} dataKey="allowances" name="Allowances" stackId="g" fill={palette.s2} maxBarSize={44} />
                      <Bar isAnimationActive={false} dataKey="overtime" name="Overtime" stackId="g" fill={palette.s3} maxBarSize={44} />
                      <Bar isAnimationActive={false} dataKey="commission" name="Commission" stackId="g" fill={palette.s4} maxBarSize={44} radius={[4, 4, 0, 0]} />
                      <Line isAnimationActive={false} dataKey="net" name="Net pay" stroke="var(--foreground)" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <Legend items={[
                  { label: "Basic", color: palette.s1 }, { label: "Allowances", color: palette.s2 },
                  { label: "Overtime", color: palette.s3 }, { label: "Commission", color: palette.s4 },
                  { label: "Net pay", color: "var(--foreground)", line: true },
                ]} />
              </>
            )}
          </Panel>

          <Panel title="Staff by department" icon={Users} sub={`${fmtInt(dash?.kpiData.totalStaffTrainers)} employees · ${money(totalBasic)} monthly basic`}>
            <BarRows rows={deptRows} fmt={n => `${n} staff`} empty="Add departments to employees to see the split." />
            <div className={styles.facts} style={{ marginTop: "auto", paddingTop: "1rem", borderTop: "1px solid var(--border)" }}>
              <div className={styles.fact}><span className={styles.factLabel}>Monthly basic</span><span className={styles.factValue}>{money(report?.staff.monthlyBase ?? totalBasic)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Average basic</span><span className={styles.factValue}>{report?.staff.active ? money(report.staff.monthlyBase / report.staff.active) : "—"}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Advance recoveries / month</span><span className={styles.factValue}>{money(installmentsDue)}</span></div>
              <div className={styles.fact}><span className={styles.factLabel}>Joined in last 6 months</span><span className={styles.factValue}>{fmtInt(report?.staff.joinedInRange)}</span></div>
            </div>
          </Panel>
        </div>

        <Panel title="Classes & bookings" icon={CalendarDays} scope="Last 6 months" sub="Sessions held and seats booked per month">
          {classTrend.every(t => !t.classes && !t.bookings) ? (
            <Empty icon={CalendarDays} title="No classes yet" text="Sessions created in Trainings & Classes show here." />
          ) : (
            <>
              <div className={styles.chartMd}>
                <ResponsiveContainer>
                  <BarChart data={classTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={4}>
                    <CartesianGrid vertical={false} stroke={palette.grid} />
                    <XAxis dataKey="label" tick={axisTick(palette)} tickLine={false} axisLine={{ stroke: palette.grid }} />
                    <YAxis tick={axisTick(palette)} tickLine={false} axisLine={false} width={32} allowDecimals={false} />
                    <Tooltip content={<ChartTip />} cursor={{ fill: "color-mix(in srgb, var(--muted) 60%, transparent)" }} />
                    <Bar isAnimationActive={false} dataKey="classes" name="Classes" fill={palette.s3} radius={[4, 4, 0, 0]} maxBarSize={28} />
                    <Bar isAnimationActive={false} dataKey="bookings" name="Bookings" fill={palette.s1} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <Legend items={[{ label: "Classes", color: palette.s3 }, { label: "Bookings", color: palette.s1 }]} />
            </>
          )}
        </Panel>

        <SectionTabs tabs={tabs} value={tab} onChange={setTab} label="Payroll details" />

        {tab === "unpaid" && (
          <Panel title={`Not yet paid for ${monthLabel(lastMonth, true)}`} icon={Wallet}
            sub="Active employees without a salary payment for last month, from Salary Payments"
            action={<Button variant="outline" size="sm" onClick={() => navigate("/salary-payments")}>Pay salaries</Button>}>
            {!unpaid ? <Empty title="Salary payments unavailable" /> : unpaid.length === 0 ? (
              <Empty icon={Wallet} title={`Everyone has been paid for ${monthLabel(lastMonth, true)}`} />
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Employee</th><th>Department</th><th>Status</th><th className={styles.num}>Net to pay</th></tr></thead>
                  <tbody>
                    {unpaid.map(e => (
                      <tr key={e.employeeId}>
                        <td style={{ fontWeight: 600 }}>{e.name}<div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400 }}>{e.employeeId}{e.designation ? ` · ${e.designation}` : ""}</div></td>
                        <td className={styles.muted}>{e.department || "—"}</td>
                        <td><Status kind={e.paymentStatus === "On Hold" ? "info" : "warning"}>{e.paymentStatus}{e.payrollRunStatus ? ` · payroll ${e.payrollRunStatus.toLowerCase()}` : ""}</Status></td>
                        <td className={styles.num} style={{ fontWeight: 700 }}>{money(Number(e.netSalary) || 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={3}>Total</td><td className={styles.num}>{money(unpaidTotal)}</td></tr></tfoot>
                </table>
              </div>
            )}
          </Panel>
        )}

        {tab === "advances" && (
          <Panel title="Salary advances being repaid" icon={HandCoins} sub="Open advances and what's left to recover"
            action={<Button variant="outline" size="sm" onClick={() => navigate("/salary-advances")}>Advances & Deductions</Button>}>
            {!report || report.advances.open.length === 0 ? (
              <Empty icon={HandCoins} title="No open advances" />
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Employee</th><th>Issued</th><th className={styles.num}>Approved</th><th className={styles.num}>Recovered</th><th className={styles.num}>Installment</th><th className={styles.num}>Balance</th></tr></thead>
                  <tbody>
                    {report.advances.open.map(a => (
                      <tr key={a.id}>
                        <td style={{ fontWeight: 600 }}>{a.name}<div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400 }}>ADV-{a.id}{a.type ? ` · ${a.type}` : ""}</div></td>
                        <td>{fmtDate(a.issuedOn)}</td>
                        <td className={styles.num}>{money(a.approved)}</td>
                        <td className={styles.num}>
                          <span className={styles.miniTrack}><span className={styles.miniFill} style={{ display: "block", width: `${a.approved ? Math.min(100, a.recovered / a.approved * 100) : 0}%`, ["--fill" as any]: palette.s3 }} /></span>
                          {money(a.recovered)}
                        </td>
                        <td className={styles.num}>{money(a.installment)}</td>
                        <td className={styles.num} style={{ fontWeight: 700 }}>{money(a.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr><td colSpan={5}>Outstanding</td><td className={styles.num}>{money(report.advances.outstanding)}</td></tr></tfoot>
                </table>
              </div>
            )}
          </Panel>
        )}

        {tab === "hires" && (
          <Panel title="Recent hires" icon={UserPlus} sub="Latest joiners by joining date"
            action={<Button variant="outline" size="sm" onClick={() => navigate("/staffs-trainers")}>Staffs & Trainers</Button>}>
            {!dash || dash.recentHires.length === 0 ? <Empty icon={UserPlus} title="No employees yet" /> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Employee</th><th>Department</th><th>Joined</th><th className={styles.num}>Basic salary</th></tr></thead>
                  <tbody>
                    {dash.recentHires.map(h => (
                      <tr key={h.id}>
                        <td style={{ fontWeight: 600 }}>{h.name}<div className={styles.muted} style={{ fontSize: "var(--text-xs)", fontWeight: 400, textTransform: "capitalize" }}>{h.position || "—"}</div></td>
                        <td className={styles.muted}>{h.department || "—"}</td>
                        <td>{fmtDate(h.hireDate)}{h.hireDate?.slice(0, 7) === thisMonth && <span style={{ marginLeft: 6 }}><Status kind="good">New</Status></span>}</td>
                        <td className={styles.num}>{h.salary != null ? money(Number(h.salary)) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        )}

        {tab === "classes" && (
          <Panel title="Best-attended classes" icon={GraduationCap} sub="Ranked by seats booked (cancelled and waitlisted excluded)"
            action={<Button variant="outline" size="sm" onClick={() => navigate("/trainings-classes")}>Trainings & Classes</Button>}>
            {!dash || dash.topPerformingClasses.length === 0 ? <Empty icon={GraduationCap} title="No classes yet" /> : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Class</th><th>Trainer</th><th style={{ width: "30%" }}>Seats booked</th><th className={styles.num}>Booking revenue</th></tr></thead>
                  <tbody>
                    {dash.topPerformingClasses.map(c => {
                      const fill = c.capacity ? Math.min(100, (c.bookings / c.capacity) * 100) : 0;
                      return (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 600 }}>{c.className}</td>
                          <td className={styles.muted}>{c.instructor}</td>
                          <td>
                            <span className={styles.miniTrack}><span className={styles.miniFill} style={{ display: "block", width: `${fill}%`, ["--fill" as any]: palette.s1 }} /></span>
                            {c.bookings}{c.capacity ? ` / ${c.capacity}` : ""}
                          </td>
                          <td className={styles.num}>{money(Number(c.revenue) || 0)}</td>
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
