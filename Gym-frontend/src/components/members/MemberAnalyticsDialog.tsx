import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from 'recharts';
import {
  Activity, Award, Banknote, CalendarDays, CheckCircle, Clock, CreditCard, DollarSign,
  Loader2, Star, Target, TrendingUp, User, Wallet, Zap,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { useCurrency } from '../../utils/currency';
import { resolveBackendImageUrl } from '../../utils/resolve-image-url';
import { attendanceService, type AttendanceListItem } from '../../utils/supabase/attendance-service';
import { billingService, type MemberStatement } from '../../utils/supabase/billing-service';
import type { Member } from '../../utils/supabase/members-service';
import styles from './MemberAnalyticsDialog.module.css';

// Benchmark the attendance charts and scores are measured against.
const MONTHLY_VISIT_TARGET = 12;
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;

interface MemberAnalyticsDialogProps {
  member: Member | null;
  /** Status as the directory shows it (expiry-aware), e.g. "Active" / "Expired". */
  status?: string;
  /** The member's own fee share, as shown in the directory. */
  fee?: number;
  onOpenChange: (open: boolean) => void;
}

const parseDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const fmtDate = (d: Date | null, withYear = true) =>
  d ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}) }) : '—';

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

/** The current month and the five before it, oldest first. */
const lastSixMonths = () => {
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: monthKey(d), label: `${MONTH_NAMES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` };
  });
};

const toneFor = (status: string) => {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'paid' || s === 'completed') return styles.pillGood;
  if (s === 'expired' || s === 'overdue' || s === 'inactive' || s === 'unpaid' || s === 'cancelled') return styles.pillBad;
  if (s === 'frozen') return styles.pillInfo;
  return styles.pillWarn;
};

const achievementTone = (pct: number) =>
  pct >= 100 ? { color: '#0F766E', label: 'Excellent', cls: styles.pillGood }
    : pct >= 70 ? { color: '#f59e0b', label: 'Good', cls: styles.pillWarn }
      : { color: '#B91C1C', label: 'Low', cls: styles.pillBad };

export function MemberAnalyticsDialog({ member, status, fee, onOpenChange }: MemberAnalyticsDialogProps) {
  const { formatCurrency: formatWithSymbol } = useCurrency();
  // Always two decimals, matching the directory's "AED 164.85" amounts.
  const formatCurrency = useCallback(
    (amount: number) => formatWithSymbol(amount, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [formatWithSymbol],
  );
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceListItem[]>([]);
  const [statement, setStatement] = useState<MemberStatement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [failed, setFailed] = useState({ attendance: false, statement: false });

  useEffect(() => {
    if (!member) return;
    let cancelled = false;
    setTab('overview');
    setLoading(true);
    setLoadError(null);
    setFailed({ attendance: false, statement: false });
    setAttendance([]);
    setStatement(null);
    Promise.allSettled([
      attendanceService.getMemberAttendanceHistory(member.id),
      billingService.getMemberStatement(Number(member.id)),
    ]).then(([attendanceR, statementR]) => {
      if (cancelled) return;
      if (attendanceR.status === 'fulfilled') setAttendance(attendanceR.value);
      if (statementR.status === 'fulfilled') setStatement(statementR.value);
      setFailed({ attendance: attendanceR.status === 'rejected', statement: statementR.status === 'rejected' });
      if (attendanceR.status === 'rejected' || statementR.status === 'rejected') {
        setLoadError('Some analytics could not be loaded — figures below may be incomplete.');
      }
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [member?.id]);

  const stats = useMemo(() => {
    if (!member) return null;
    const now = Date.now();
    const joinDate = parseDate(member.join_date) || parseDate(member.membership_start_date);
    const expiryDate = parseDate(member.membership_end_date || member.expiry_date);
    const daysSinceJoining = joinDate ? Math.max(1, Math.floor((now - joinDate.getTime()) / DAY_MS)) : 1;

    const visits = attendance
      .map(a => parseDate(a.check_in_time))
      .filter((d): d is Date => !!d)
      .sort((a, b) => b.getTime() - a.getTime());
    const totalVisits = visits.length;
    const avgVisitsPerMonth = totalVisits / Math.max(1, daysSinceJoining / 30);
    const lastVisit = visits[0] ?? null;
    const daysSinceLastVisit = lastVisit ? Math.floor((now - lastVisit.getTime()) / DAY_MS) : null;
    const completed = attendance.filter(a => (a.total_minutes || 0) > 0);
    const avgMinutes = completed.length
      ? Math.round(completed.reduce((s, a) => s + (a.total_minutes || 0), 0) / completed.length) : 0;

    const months = lastSixMonths();
    const visitsByMonth: Record<string, number> = {};
    visits.forEach(d => { visitsByMonth[monthKey(d)] = (visitsByMonth[monthKey(d)] || 0) + 1; });
    const attendanceData = months.map(m => ({
      month: m.label, visits: visitsByMonth[m.key] || 0, target: MONTHLY_VISIT_TARGET,
    }));

    const lines = statement?.lines ?? [];
    const paidByMonth: Record<string, number> = {};
    const billedByMonth: Record<string, number> = {};
    lines.forEach(l => {
      const d = parseDate(l.date);
      if (!d) return;
      const k = monthKey(d);
      paidByMonth[k] = (paidByMonth[k] || 0) + (Number(l.credit) || 0);
      billedByMonth[k] = (billedByMonth[k] || 0) + (Number(l.debit) || 0);
    });
    const financialData = months.map(m => ({
      month: m.label, paid: paidByMonth[m.key] || 0, billed: billedByMonth[m.key] || 0,
    }));
    const recentLines = [...lines]
      .sort((a, b) => (parseDate(b.date)?.getTime() ?? 0) - (parseDate(a.date)?.getTime() ?? 0))
      .slice(0, 10);

    const totalPaid = Number(statement?.total_paid) || 0;
    const totalBilled = Number(statement?.total_billed) || 0;
    const outstanding = statement ? Number(statement.closing_balance) || 0 : Number(member.outstanding_balance) || 0;

    // Engagement scores, all derived from real check-ins and billing.
    const visitsLast30 = visits.filter(d => now - d.getTime() <= 30 * DAY_MS).length;
    const weeksWindow = Math.min(12, Math.max(1, Math.ceil(daysSinceJoining / 7)));
    const activeWeeks = new Set(
      visits
        .filter(d => now - d.getTime() < weeksWindow * 7 * DAY_MS)
        .map(d => Math.floor((now - d.getTime()) / (7 * DAY_MS))),
    ).size;
    const engagement = [
      {
        subject: 'Attendance', fill: '#0F766E',
        value: Math.min(100, Math.round((visitsLast30 / MONTHLY_VISIT_TARGET) * 100)),
        hint: `${visitsLast30} visits in the last 30 days vs ${MONTHLY_VISIT_TARGET} target`,
      },
      {
        subject: 'Consistency', fill: '#0F766E',
        value: Math.round((activeWeeks / weeksWindow) * 100),
        hint: `Visited in ${activeWeeks} of the last ${weeksWindow} week${weeksWindow === 1 ? '' : 's'}`,
      },
      {
        subject: 'Recency', fill: '#4BA3A0',
        value: daysSinceLastVisit === null ? 0 : Math.max(0, Math.round(100 - (daysSinceLastVisit / 30) * 100)),
        hint: daysSinceLastVisit === null ? 'No visits yet'
          : daysSinceLastVisit === 0 ? 'Visited today' : `Last visit ${daysSinceLastVisit} day${daysSinceLastVisit === 1 ? '' : 's'} ago`,
      },
      {
        subject: 'Payment Health', fill: '#76C7C4',
        value: !statement ? 0 : totalBilled > 0 ? Math.min(100, Math.round((totalPaid / totalBilled) * 100)) : 100,
        hint: !statement ? 'Billing data unavailable' : totalBilled > 0 ? `${formatCurrency(totalPaid)} paid of ${formatCurrency(totalBilled)} billed` : 'Nothing billed yet',
      },
    ];

    return {
      joinDate, expiryDate, daysSinceJoining, totalVisits, avgVisitsPerMonth, lastVisit, avgMinutes,
      attendanceData, financialData, recentLines, totalPaid, totalBilled, outstanding, engagement,
    };
  }, [member, attendance, statement, formatCurrency]);

  if (!member || !stats) return null;

  const displayStatus = status || member.membership_status || '';
  const paymentStatus = derivePaymentStatus(stats.outstanding, member.payment_status);
  const plan = member.membership_plan || member.membership_type || '—';
  const feeValue = fee ?? member.membership_fee ?? member.monthly_fee ?? 0;
  const photo = member.photo_url ? (resolveBackendImageUrl(member.photo_url) as string) : undefined;
  const initials = member.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  const isFamilyPlaceholderEmail = member.email?.includes('@family.local');
  const pending = (v: React.ReactNode) => (loading ? '…' : v);
  // A figure whose source failed to load shows "—" rather than a misleading zero.
  const visitsVal = (v: React.ReactNode) => (loading ? '…' : failed.attendance ? '—' : v);
  const moneyVal = (v: React.ReactNode) => (loading ? '…' : failed.statement ? '—' : v);
  const avgPerMonth = stats.avgVisitsPerMonth.toFixed(1);
  const targetPct = Math.round((stats.avgVisitsPerMonth / MONTHLY_VISIT_TARGET) * 100);

  const kpis = [
    { label: 'Total Visits', value: visitsVal(stats.totalVisits), icon: <Activity size={14} />, sub: `${avgPerMonth}/mo avg` },
    { label: 'Days Active', value: stats.daysSinceJoining.toLocaleString(), icon: <CalendarDays size={14} />, sub: 'Since joining' },
    { label: 'Membership Fee', value: formatCurrency(feeValue), icon: <DollarSign size={14} />, sub: paymentStatus },
    { label: 'Lifetime Value', value: moneyVal(formatCurrency(stats.totalPaid)), icon: <Award size={14} />, sub: 'Total paid' },
  ];

  const achievements = [
    { label: 'First Visit', earned: stats.totalVisits >= 1, desc: 'Completed first gym visit' },
    { label: '10 Visits Milestone', earned: stats.totalVisits >= 10, desc: '10 total check-ins' },
    { label: '25 Visits Milestone', earned: stats.totalVisits >= 25, desc: '25 total check-ins' },
    { label: '50 Visits Milestone', earned: stats.totalVisits >= 50, desc: '50 total check-ins' },
    { label: 'Loyal Member', earned: stats.daysSinceJoining >= 180, desc: '6+ months membership' },
    { label: 'Annual Member', earned: stats.daysSinceJoining >= 365, desc: '1+ year membership' },
  ];

  const chartLoading = (
    <div className={styles.chartEmpty}><Loader2 className={styles.spin} size={18} /> Loading…</div>
  );

  return (
    <Dialog open={!!member} onOpenChange={onOpenChange}>
      <DialogContent className={styles.dialog} style={{ maxWidth: 'min(880px, calc(100% - 2rem))' }}>
        {/* Header */}
        <div className={styles.hero}>
          <div className={styles.heroTop}>
            <div className={styles.identity}>
              <Avatar className={styles.avatar}>
                {photo && <AvatarImage src={photo} alt={member.name} />}
                <AvatarFallback className={styles.avatarFallback}>{initials}</AvatarFallback>
              </Avatar>
              <div className={styles.identityText}>
                <DialogTitle className={styles.name}>{member.name}</DialogTitle>
                <DialogDescription className={styles.memberId}>Member ID: {member.member_id || member.id}</DialogDescription>
                <div className={styles.pills}>
                  {displayStatus && <span className={`${styles.pill} ${toneFor(displayStatus)}`}>{displayStatus.toLowerCase()}</span>}
                  {paymentStatus && <span className={`${styles.pill} ${toneFor(paymentStatus)}`}>{paymentStatus}</span>}
                </div>
              </div>
            </div>
            <div className={styles.heroMeta}>
              <p>Joined {fmtDate(stats.joinDate)}</p>
              {stats.expiryDate && <p>Expires {fmtDate(stats.expiryDate)}</p>}
              <p className={styles.heroPlan}>{plan}</p>
            </div>
          </div>

          <div className={styles.kpiStrip}>
            {kpis.map(k => (
              <div key={k.label} className={styles.kpi}>
                <div className={styles.kpiLabel}>{k.icon}{k.label}</div>
                <div className={styles.kpiValue}>{k.value}</div>
                <div className={styles.kpiSub}>{k.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.body}>
          {loadError && <div className={styles.notice}>{loadError}</div>}
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className={styles.tabsList}>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="engagement">Engagement</TabsTrigger>
            </TabsList>

            {/* Overview */}
            <TabsContent value="overview" className={styles.tabBody}>
              <div className={styles.grid2}>
                <section className={styles.card}>
                  <h3 className={styles.cardTitle}><Activity size={16} /> Monthly Visits</h3>
                  {loading ? chartLoading : (
                    <>
                      <ResponsiveContainer width="100%" height={170}>
                        <BarChart data={stats.attendanceData} barSize={16}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                          <RTooltip formatter={(v: any, name: any) => [`${v} visits`, name]} />
                          <Bar dataKey="visits" name="Actual" fill="#0F766E" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="target" name="Target" fill="#B91C1C" radius={[4, 4, 0, 0]} opacity={0.25} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className={styles.legend}>
                        <span><i style={{ background: 'var(--primary)' }} /> Actual</span>
                        <span><i style={{ background: 'var(--danger)', opacity: 0.5 }} /> Target ({MONTHLY_VISIT_TARGET}/mo)</span>
                      </div>
                    </>
                  )}
                </section>

                <section className={styles.card}>
                  <h3 className={styles.cardTitle}><User size={16} /> Member Info</h3>
                  <dl className={styles.infoList}>
                    {[
                      { label: 'Email', value: isFamilyPlaceholderEmail ? '—' : member.email || '—' },
                      { label: 'Phone', value: member.phone || '—' },
                      { label: 'Plan', value: plan },
                      { label: 'Blood Type', value: member.blood_type || '—' },
                      { label: 'Emergency Contact', value: member.emergency_contact_name || member.emergency_contact || '—' },
                      { label: 'Emergency Phone', value: member.emergency_contact_phone || member.emergency_phone || '—' },
                      { label: 'Last Visit', value: loading ? '…' : stats.lastVisit ? fmtDate(stats.lastVisit) : 'Never' },
                    ].map(row => (
                      <div key={row.label} className={styles.infoRow}>
                        <dt>{row.label}</dt>
                        <dd title={String(row.value)}>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>

              <section className={styles.card}>
                <h3 className={styles.cardTitle}><Star size={16} /> Engagement Snapshot</h3>
                <div className={styles.rings}>
                  {stats.engagement.map(item => (
                    <div key={item.subject} className={styles.ringItem} title={item.hint}>
                      <div className={styles.ring}>
                        <svg viewBox="0 0 80 80">
                          <circle cx="40" cy="40" r="32" fill="none" stroke="#f0f0f0" strokeWidth="8" />
                          {/* Skipped at 0%: a round cap on a zero-length arc still draws a dot. */}
                          {!loading && item.value > 0 && (
                            <circle
                              cx="40" cy="40" r="32" fill="none" stroke={item.fill} strokeWidth="8"
                              strokeDasharray={`${(item.value / 100) * 201} 201`} strokeLinecap="round"
                            />
                          )}
                        </svg>
                        <span>{loading ? '…' : `${item.value}%`}</span>
                      </div>
                      <p className={styles.ringLabel}>{item.subject}</p>
                      <p className={styles.ringHint}>{loading ? '' : item.hint}</p>
                    </div>
                  ))}
                </div>
              </section>
            </TabsContent>

            {/* Attendance */}
            <TabsContent value="attendance" className={styles.tabBody}>
              <div className={styles.grid3}>
                {[
                  { label: 'Total Visits', value: visitsVal(stats.totalVisits), icon: <CheckCircle size={20} color="#10b981" />, tone: styles.tileGreen },
                  { label: 'Avg / Month', value: visitsVal(avgPerMonth), icon: <TrendingUp size={20} color="#0F766E" />, tone: styles.tileTeal },
                  { label: `Target (${MONTHLY_VISIT_TARGET}/mo)`, value: visitsVal(`${targetPct}%`), icon: <Target size={20} color="#3b82f6" />, tone: styles.tileBlue },
                ].map(k => (
                  <div key={k.label} className={`${styles.tile} ${k.tone}`}>
                    {k.icon}
                    <div><p className={styles.tileLabel}>{k.label}</p><p className={styles.tileValue}>{k.value}</p></div>
                  </div>
                ))}
              </div>

              <section className={styles.card}>
                <h3 className={styles.cardTitle}>6-Month Attendance vs Target</h3>
                {loading ? chartLoading : (
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={stats.attendanceData}>
                      <defs>
                        <linearGradient id="memberAnalyticsVisits" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F766E" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0F766E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                      <RTooltip />
                      <Area type="monotone" dataKey="visits" stroke="#0F766E" strokeWidth={2} fill="url(#memberAnalyticsVisits)" name="Visits" />
                      <Line type="monotone" dataKey="target" stroke="#B91C1C" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Target" />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </section>

              <section className={styles.card}>
                <h3 className={styles.cardTitle}>
                  Monthly Breakdown
                  {!loading && stats.avgMinutes > 0 && (
                    <span className={styles.cardTitleNote}><Clock size={13} /> Avg session {stats.avgMinutes} min</span>
                  )}
                </h3>
                <div className={styles.tableWrap}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead>Visits</TableHead>
                        <TableHead>Target</TableHead>
                        <TableHead>Achievement</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...stats.attendanceData].reverse().map(row => {
                        const pct = Math.round((row.visits / row.target) * 100);
                        const tone = achievementTone(pct);
                        return (
                          <TableRow key={row.month}>
                            <TableCell className="font-medium">{row.month}</TableCell>
                            <TableCell>{visitsVal(row.visits)}</TableCell>
                            <TableCell>{row.target}</TableCell>
                            <TableCell>
                              <div className={styles.progressCell}>
                                <div className={styles.track}>
                                  <div style={{ width: `${loading ? 0 : Math.min(100, pct)}%`, background: tone.color }} />
                                </div>
                                <span>{visitsVal(`${pct}%`)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {!loading && <span className={`${styles.pill} ${tone.cls}`}>{tone.label}</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </TabsContent>

            {/* Financial */}
            <TabsContent value="financial" className={styles.tabBody}>
              <div className={styles.grid3}>
                {[
                  { label: 'Membership Fee', value: formatCurrency(feeValue), icon: <CreditCard size={20} color="#0F766E" />, tone: styles.tileTeal },
                  { label: 'Lifetime Revenue', value: moneyVal(formatCurrency(stats.totalPaid)), icon: <Banknote size={20} color="#10b981" />, tone: styles.tileGreen },
                  {
                    label: 'Outstanding', value: moneyVal(formatCurrency(Math.max(0, stats.outstanding))),
                    icon: <Wallet size={20} color={stats.outstanding > 0 ? '#B91C1C' : '#3b82f6'} />,
                    tone: stats.outstanding > 0 ? styles.tileRed : styles.tileBlue,
                  },
                ].map(k => (
                  <div key={k.label} className={`${styles.tile} ${k.tone}`}>
                    {k.icon}
                    <div><p className={styles.tileLabel}>{k.label}</p><p className={styles.tileValue}>{k.value}</p></div>
                  </div>
                ))}
              </div>

              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Payment History (6 Months)</h3>
                {loading ? chartLoading : (
                  <ResponsiveContainer width="100%" height={210}>
                    <BarChart data={stats.financialData} barSize={18}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} width={48} />
                      <RTooltip formatter={(v: any, name: any) => [formatCurrency(Number(v)), name]} />
                      <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="billed" fill="#B91C1C" opacity={0.35} radius={[4, 4, 0, 0]} name="Billed" />
                      <Bar dataKey="paid" fill="#0F766E" radius={[4, 4, 0, 0]} name="Paid" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </section>

              <section className={styles.card}>
                <h3 className={styles.cardTitle}>Transaction Summary</h3>
                <div className={styles.tableWrap}>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow><TableCell colSpan={5}>{chartLoading}</TableCell></TableRow>
                      ) : stats.recentLines.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className={styles.emptyCell}>No transactions recorded for this member.</TableCell></TableRow>
                      ) : stats.recentLines.map((l, i) => {
                        const isCredit = (Number(l.credit) || 0) > 0;
                        return (
                          <TableRow key={`${l.id ?? l.receipt_no}-${l.type}-${i}`}>
                            <TableCell className="font-medium">{fmtDate(parseDate(l.date))}</TableCell>
                            <TableCell className={styles.descCell} title={l.description}>{l.description}</TableCell>
                            <TableCell>{l.type}</TableCell>
                            <TableCell className={`text-right ${isCredit ? styles.credit : ''}`}>
                              {isCredit ? '+' : ''}{formatCurrency(Number(isCredit ? l.credit : l.debit) || 0)}
                            </TableCell>
                            <TableCell>
                              {l.status && <span className={`${styles.pill} ${toneFor(l.status)}`}>{l.status.toLowerCase()}</span>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </section>
            </TabsContent>

            {/* Engagement */}
            <TabsContent value="engagement" className={styles.tabBody}>
              <div className={styles.grid2}>
                <section className={styles.card}>
                  <h3 className={styles.cardTitle}><Zap size={16} /> Engagement Scores</h3>
                  <div className={styles.scoreList}>
                    {stats.engagement.map(item => (
                      <div key={item.subject}>
                        <div className={styles.scoreHead}>
                          <span>{item.subject}</span>
                          <strong>{pending(`${item.value}%`)}</strong>
                        </div>
                        <div className={styles.track} style={{ height: 10 }}>
                          <div style={{ width: `${loading ? 0 : item.value}%`, background: item.fill }} />
                        </div>
                        {!loading && <p className={styles.ringHint} style={{ textAlign: 'left' }}>{item.hint}</p>}
                      </div>
                    ))}
                  </div>
                </section>

                <section className={styles.card}>
                  <h3 className={styles.cardTitle}><Award size={16} /> Achievements</h3>
                  <div className={styles.achievements}>
                    {achievements.map(a => {
                      const earned = !loading && a.earned;
                      return (
                        <div key={a.label} className={`${styles.achievement} ${earned ? styles.earned : ''}`}>
                          <div className={styles.achievementIcon}><Star size={15} color="#fff" /></div>
                          <div>
                            <p className={styles.achievementLabel}>{a.label}</p>
                            <p className={styles.achievementDesc}>{a.desc}</p>
                          </div>
                          {earned && <CheckCircle size={16} color="#0F766E" className={styles.achievementCheck} />}
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>

              <section className={styles.card}>
                <h3 className={styles.cardTitle}><Target size={16} /> Health Profile</h3>
                <div className={styles.healthGrid}>
                  {[
                    { label: 'Date of Birth', value: fmtDate(parseDate(member.date_of_birth)) },
                    { label: 'Blood Type', value: member.blood_type || '—' },
                    { label: 'Medical Conditions', value: member.medical_conditions || 'None reported' },
                    { label: 'Allergies', value: member.allergies || 'None reported' },
                    { label: 'Current Medications', value: member.current_medications || 'None' },
                    { label: 'Health Notes', value: member.health_notes || '—' },
                  ].map(row => (
                    <div key={row.label} className={styles.healthItem}>
                      <p className={styles.tileLabel}>{row.label}</p>
                      <p className={styles.healthValue}>{row.value}</p>
                    </div>
                  ))}
                </div>
              </section>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Payment status from the statement balance. The stored flag only tracks the
 * membership, so it stays "paid" while e.g. a sales invoice sold on account is unpaid.
 */
function derivePaymentStatus(balance: number, stored?: string) {
  if (balance > 0.005) return stored === 'overdue' ? 'overdue' : 'due';
  return 'paid';
}
