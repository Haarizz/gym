import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import {
  Banknote, CheckCircle2, Clock, Copy, Edit, ExternalLink, Loader2, MoreHorizontal, Pause, Percent, Play,
  Plus, Target, Timer, Trash2, TrendingUp, Users, XCircle, Hourglass, Link2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { useCurrency } from '../../utils/currency';
import { usePermission } from '../../utils/permissions';
import {
  marketingCampaignService, campaignAdLink, campaignErrorMessage,
  type CampaignBreakdown, type CampaignLeadFormOption, type CampaignReport, type CampaignSpend,
  type CampaignStatus, type MarketingCampaign, type SpendCategory,
} from '../../utils/supabase/marketing-campaign-service';
import {
  LeadStatusPill, Meter, OBJECTIVE_LABELS, PhaseBadge, PlatformPill, SPEND_CATEGORY_LABELS,
  fmtDate, fmtDateTime, fmtNumber, timelineText,
} from './campaign-ui';
import styles from './campaigns.module.css';

type View = 'forms' | 'spend' | 'leads' | 'breakdown';

interface Props {
  campaignId: number | null;
  onOpenChange: (open: boolean) => void;
  onEdit: (campaign: MarketingCampaign) => void;
  onChanged: () => void;
  /** Bumped by the parent after an edit so the open report reloads. */
  refreshKey?: number;
}

const emptySpend = () => ({ spendDate: format(new Date(), 'yyyy-MM-dd'), category: 'ad_spend' as SpendCategory, amount: '', hours: '', notes: '' });

export function CampaignReportDialog({ campaignId, onOpenChange, onEdit, onChanged, refreshKey }: Props) {
  const { formatCurrency } = useCurrency();
  const canEdit = usePermission('PROMOTIONS_CAMPAIGN_EDIT');
  const canDelete = usePermission('PROMOTIONS_CAMPAIGN_DELETE');

  const [report, setReport] = useState<CampaignReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<View>('forms');

  const [linking, setLinking] = useState(false);
  const [formOptions, setFormOptions] = useState<CampaignLeadFormOption[]>([]);
  const [linkIds, setLinkIds] = useState<number[]>([]);
  const [savingLinks, setSavingLinks] = useState(false);

  const [spendDraft, setSpendDraft] = useState(emptySpend);
  const [editingSpendId, setEditingSpendId] = useState<number | null>(null);
  const [savingSpend, setSavingSpend] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const money = useCallback((n: number | null | undefined) => (n == null ? '—' : formatCurrency(n, { maximumFractionDigits: 0 })), [formatCurrency]);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    try {
      setReport(await marketingCampaignService.report(id));
    } catch (err) {
      toast.error(campaignErrorMessage(err, 'Failed to load campaign'));
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [onOpenChange]);

  useEffect(() => {
    if (campaignId == null) { setReport(null); return; }
    setView('forms');
    setLinking(false);
    setEditingSpendId(null);
    setSpendDraft(emptySpend());
    load(campaignId);
  }, [campaignId, load]);

  useEffect(() => {
    if (campaignId != null && refreshKey) load(campaignId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const reload = async () => {
    if (campaignId == null) return;
    await load(campaignId);
    onChanged();
  };

  const c = report?.campaign;
  const m = c?.metrics;

  // ── Status / delete ───────────────────────────────────────────────────────
  const setStatus = async (status: CampaignStatus) => {
    if (!c) return;
    try {
      await marketingCampaignService.setStatus(c.id, status);
      toast.success(`Campaign ${status === 'active' ? 'activated' : status}`);
      await reload();
    } catch (err) {
      toast.error(campaignErrorMessage(err, 'Failed to update status'));
    }
  };

  const remove = async () => {
    if (!c) return;
    try {
      await marketingCampaignService.remove(c.id);
      toast.success('Campaign deleted — its leads are kept');
      setConfirmDelete(false);
      onOpenChange(false);
      onChanged();
    } catch (err) {
      toast.error(campaignErrorMessage(err, 'Failed to delete campaign'));
    }
  };

  // ── Lead form links ───────────────────────────────────────────────────────
  const startLinking = async () => {
    if (!c) return;
    setLinking(true);
    setLinkIds(c.leadForms.filter(f => !f.missing).map(f => f.id));
    try {
      const all = await marketingCampaignService.leadForms();
      setFormOptions(all.filter(f => f.branchId === c.branchId));
    } catch (err) {
      toast.error(campaignErrorMessage(err, 'Failed to load lead forms'));
    }
  };

  const saveLinks = async () => {
    if (!c) return;
    setSavingLinks(true);
    try {
      await marketingCampaignService.linkLeadForms(c.id, linkIds);
      toast.success('Lead forms updated');
      setLinking(false);
      await reload();
    } catch (err) {
      toast.error(campaignErrorMessage(err, 'Failed to update lead forms'));
    } finally {
      setSavingLinks(false);
    }
  };

  const copy = async (text: string, msg = 'Ad link copied') => {
    try { await navigator.clipboard.writeText(text); toast.success(msg); } catch { toast.info(text); }
  };

  // ── Spend log ─────────────────────────────────────────────────────────────
  const saveSpend = async () => {
    if (!c) return;
    const amount = spendDraft.amount.trim() === '' ? 0 : Number(spendDraft.amount);
    const hours = spendDraft.hours.trim() === '' ? 0 : Number(spendDraft.hours);
    if (Number.isNaN(amount) || Number.isNaN(hours) || amount < 0 || hours < 0) return toast.error('Amount and hours must be positive numbers');
    if (amount === 0 && hours === 0) return toast.error('Enter the amount spent or the hours put in');
    setSavingSpend(true);
    const body = { spendDate: spendDraft.spendDate, category: spendDraft.category, amount, hours, notes: spendDraft.notes };
    try {
      if (editingSpendId) await marketingCampaignService.updateSpend(c.id, editingSpendId, body);
      else await marketingCampaignService.addSpend(c.id, body);
      toast.success(editingSpendId ? 'Entry updated' : 'Spend logged');
      setEditingSpendId(null);
      setSpendDraft(emptySpend());
      await reload();
    } catch (err) {
      toast.error(campaignErrorMessage(err, 'Failed to save entry'));
    } finally {
      setSavingSpend(false);
    }
  };

  const editSpend = (s: CampaignSpend) => {
    setEditingSpendId(s.id);
    setSpendDraft({
      spendDate: s.spendDate, category: s.category,
      amount: s.amount ? String(s.amount) : '', hours: s.hours ? String(s.hours) : '', notes: s.notes ?? '',
    });
  };

  const deleteSpend = async (s: CampaignSpend) => {
    if (!c || !window.confirm('Delete this spend entry?')) return;
    try {
      await marketingCampaignService.removeSpend(c.id, s.id);
      toast.success('Entry deleted');
      await reload();
    } catch (err) {
      toast.error(campaignErrorMessage(err, 'Failed to delete entry'));
    }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const chartData = useMemo(() => (report?.daily ?? []).map(d => ({
    day: fmtDate(d.date, 'dd MMM'), Leads: d.leads, Conversions: d.conversions, Spend: Number(d.spend) || 0,
  })), [report]);

  const funnel = m ? [
    { label: 'New', value: m.newLeads, tone: 'blue' },
    { label: 'Contacted', value: m.contacted, tone: 'violet' },
    { label: 'Follow-up', value: m.followUp, tone: 'amber' },
    { label: 'Converted', value: m.converted, tone: 'green' },
    { label: 'Lost', value: m.lost, tone: 'gray' },
  ] : [];

  return (
    <>
      <Dialog open={campaignId != null} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl md:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="sr-only">{c?.name ?? 'Campaign'}</DialogTitle>
            <DialogDescription className="sr-only">Campaign performance report</DialogDescription>
          </DialogHeader>

          {loading && !report ? (
            <div className={styles.centered}><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : !c || !m ? null : (
            <div className={styles.root}>
              {/* Header */}
              <div className={styles.reportHead}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
                    <PlatformPill platform={c.platform} />
                    <PhaseBadge phase={c.phase} />
                  </div>
                  <h2 className={styles.reportTitle}>{c.name}</h2>
                  <div className={styles.reportMeta}>
                    <span>{fmtDate(c.startDate)} – {fmtDate(c.endDate)}</span>
                    <span className={styles.dot} />
                    <span>{timelineText(c)}</span>
                    <span className={styles.dot} />
                    <span>{OBJECTIVE_LABELS[c.objective] ?? c.objective}</span>
                    {c.ownerName && (<><span className={styles.dot} /><span>Owner: {c.ownerName}</span></>)}
                    {c.branchName && (<><span className={styles.dot} /><span>{c.branchName}</span></>)}
                    <span className={styles.dot} />
                    <span className="font-mono">{c.campaignCode}</span>
                  </div>
                  {c.description && <p className={styles.headSub}>{c.description}</p>}
                </div>
                <div className={styles.headActions}>
                  {canEdit && (
                    <Button variant="outline" onClick={() => onEdit(c)}>
                      <Edit className="mr-2 h-4 w-4" /> Edit
                    </Button>
                  )}
                  {(canEdit || canDelete) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" aria-label="More actions"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {canEdit && c.status !== 'active' && (
                          <DropdownMenuItem onClick={() => setStatus('active')}><Play className="mr-2 h-4 w-4" /> Activate</DropdownMenuItem>
                        )}
                        {canEdit && c.status === 'active' && (
                          <DropdownMenuItem onClick={() => setStatus('paused')}><Pause className="mr-2 h-4 w-4" /> Pause</DropdownMenuItem>
                        )}
                        {canEdit && c.status !== 'completed' && (
                          <DropdownMenuItem onClick={() => setStatus('completed')}><CheckCircle2 className="mr-2 h-4 w-4" /> Mark completed</DropdownMenuItem>
                        )}
                        {canEdit && c.status !== 'cancelled' && (
                          <DropdownMenuItem onClick={() => setStatus('cancelled')}><XCircle className="mr-2 h-4 w-4" /> Cancel campaign</DropdownMenuItem>
                        )}
                        {canDelete && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setConfirmDelete(true)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>

              {/* KPIs */}
              <div className={styles.reportKpis}>
                <ReportKpi icon={Users} tone="blue" label="Leads" value={fmtNumber(m.leads)}
                  hint={c.targetLeads ? `${fmtNumber(m.leadTargetPct, 1)}% of ${c.targetLeads} target` : `${fmtNumber(m.leads / Math.max(1, c.daysElapsed || c.durationDays), 1)} a day`} />
                <ReportKpi icon={CheckCircle2} tone="green" label="Conversions" value={fmtNumber(m.converted)}
                  hint={`${fmtNumber(m.conversionRate, 1)}% of leads${c.targetConversions ? ` · target ${c.targetConversions}` : ''}`} />
                <ReportKpi icon={Banknote} tone="amber" label="Spent" value={money(m.spend)}
                  hint={c.budget ? `${fmtNumber(m.budgetUsedPct, 1)}% of ${money(c.budget)} budget` : 'No budget set'} />
                <ReportKpi icon={Clock} tone="violet" label="Team hours" value={`${fmtNumber(m.hours, 1)} h`}
                  hint={m.leadsPerHour != null ? `${fmtNumber(m.leadsPerHour, 1)} leads per hour` : 'Log hours in Spend & hours'} />
                <ReportKpi icon={Target} tone="teal" label="Cost per lead" value={money(m.costPerLead)} />
                <ReportKpi icon={Percent} tone="teal" label="Cost per conversion" value={money(m.costPerConversion)} />
                <ReportKpi icon={TrendingUp} tone="green" label="Revenue" value={money(m.revenue)} hint="Paid by converted members since" />
                <ReportKpi icon={TrendingUp} tone={m.roi == null ? 'gray' : m.roi >= 0 ? 'green' : 'red'} label="Return on spend"
                  value={m.roi == null ? '—' : `${m.roi > 0 ? '+' : ''}${fmtNumber(m.roi, 1)}%`}
                  valueClass={m.roi == null ? undefined : m.roi >= 0 ? styles.good : styles.bad}
                  hint={m.spend > 0 ? `${money(m.revenue - m.spend)} ${m.revenue >= m.spend ? 'profit' : 'short'}` : 'Log spend to see ROI'} />
                <ReportKpi icon={Hourglass} tone="gray" label="Avg. time to convert"
                  value={m.avgDaysToConvert == null ? '—' : m.avgDaysToConvert < 1 ? 'Under a day' : `${fmtNumber(m.avgDaysToConvert, 1)} days`} />
                <ReportKpi icon={Timer} tone="gray" label="Duration" value={`${c.durationDays} days`}
                  hint={c.phase === 'live' ? `${c.daysRemaining} left` : undefined} />
              </div>

              {/* Funnel */}
              <div className={styles.panel}>
                <div className={styles.sectionHead} style={{ marginBottom: 10 }}>
                  <span className={styles.sectionTitle}>Lead pipeline</span>
                  <span className={styles.kpiHint}>{m.leads} {m.leads === 1 ? 'lead' : 'leads'} credited to this campaign</span>
                </div>
                <div className={styles.funnel}>
                  {m.leads > 0 && funnel.map(f => f.value > 0 && (
                    <div key={f.label} className={styles.funnelSeg} data-tone={f.tone} style={{ width: `${(f.value / m.leads) * 100}%` }} title={`${f.label}: ${f.value}`} />
                  ))}
                </div>
                <div className={styles.legend}>
                  {funnel.map(f => (
                    <span key={f.label} className={styles.legendItem}>
                      <span className={styles.legendSwatch} data-tone={f.tone} /> {f.label} <b style={{ color: 'var(--foreground)' }}>{f.value}</b>
                    </span>
                  ))}
                </div>
              </div>

              {/* Daily trend */}
              <div className={styles.panelWhite}>
                <div className={styles.sectionHead} style={{ marginBottom: 8 }}>
                  <span className={styles.sectionTitle}>Day by day</span>
                  <span className={styles.kpiHint}>Leads and conversions per day, and what was spent each day</span>
                </div>
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={2}>
                      <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{ background: 'var(--popover)', border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgb(0 0 0 / 0.12)', color: 'var(--foreground)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="Leads" fill="#2a78d6" radius={[4, 4, 0, 0]} maxBarSize={28} />
                      <Bar dataKey="Conversions" fill="#1baf7a" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                {/* Spend on its own scale — a second y-axis on the chart above would invent a correlation. */}
                <div className={styles.kpiHint} style={{ marginTop: 8 }}>Spend per day</div>
                <div style={{ width: '100%', height: 120 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeOpacity={0.5} vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false}
                        tickFormatter={(v: number) => Intl.NumberFormat(undefined, { notation: 'compact' }).format(v)} />
                      <Tooltip
                        contentStyle={{ background: 'var(--popover)', border: 'none', borderRadius: 8, boxShadow: '0 4px 12px rgb(0 0 0 / 0.12)', color: 'var(--foreground)' }}
                        formatter={(value: number) => money(value)}
                      />
                      <Bar dataKey="Spend" fill="#eb6834" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sections */}
              <div className={styles.seg} role="tablist">
                {([['forms', `Lead forms (${c.leadForms.length})`], ['spend', `Spend & hours (${report!.spends.length})`],
                  ['leads', `Leads (${m.leads})`], ['breakdown', 'Breakdown']] as [View, string][]).map(([v, label]) => (
                  <button key={v} type="button" role="tab" aria-selected={view === v} className={styles.segBtn} data-active={view === v} onClick={() => setView(v)}>
                    {label}
                  </button>
                ))}
              </div>

              {view === 'forms' && (
                <div className={styles.section}>
                  <div className={styles.sectionHead}>
                    <span className={styles.kpiHint}>
                      Paste these links in this campaign's ads. Everyone who fills them is credited to “{c.name}”
                      {c.trackingCode ? <> (tagged <span className="font-mono">utm_campaign={c.trackingCode}</span>)</> : null}.
                    </span>
                    {canEdit && !linking && (
                      <Button variant="outline" size="sm" onClick={startLinking}><Link2 className="mr-2 h-4 w-4" /> Manage forms</Button>
                    )}
                  </div>

                  {linking ? (
                    <div className={styles.panel} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {formOptions.length === 0 ? (
                        <span className={styles.kpiHint}>No lead forms in this campaign's branch yet — create one from “Lead forms”.</span>
                      ) : (
                        <div className={styles.formList}>
                          {formOptions.map(f => {
                            const checked = linkIds.includes(f.id);
                            const others = f.campaigns.filter(n => n !== c.name);
                            return (
                              <label key={f.id} className={styles.formOption} data-checked={checked} style={{ background: checked ? undefined : 'var(--card)' }}>
                                <Checkbox checked={checked} onCheckedChange={() => setLinkIds(ids => (ids.includes(f.id) ? ids.filter(x => x !== f.id) : [...ids, f.id]))} />
                                <div className={styles.formOptionMain}>
                                  <div className={styles.formOptionName}>{f.name}{!f.active && ' (paused)'}</div>
                                  <div className={styles.formOptionMeta}>
                                    {f.submissionCount} {f.submissionCount === 1 ? 'submission' : 'submissions'}
                                    {others.length > 0 && ` · also in ${others.join(', ')}`}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                        <Button variant="outline" onClick={() => setLinking(false)}>Cancel</Button>
                        <Button onClick={saveLinks} disabled={savingLinks}>
                          {savingLinks && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save links
                        </Button>
                      </div>
                    </div>
                  ) : c.leadForms.length === 0 ? (
                    <div className={styles.panel}>
                      <span className={styles.kpiHint}>
                        No lead forms linked yet. Link the form your ads point to and its leads start counting here.
                      </span>
                    </div>
                  ) : (
                    c.leadForms.map(f => {
                      const link = f.formKey ? campaignAdLink(f.formKey, c) : null;
                      return (
                        <div key={f.id} className={styles.linkRow}>
                          <div className={styles.linkRowTop}>
                            <div>
                              <span className="font-semibold">{f.name}</span>
                              {f.missing ? <span className={styles.warnChip} style={{ marginLeft: 8 }}>Form deleted</span>
                                : !f.active && <span className={styles.warnChip} style={{ marginLeft: 8 }}>Paused — link shows “no longer available”</span>}
                            </div>
                            <span className={styles.kpiHint}>
                              {f.leads} {f.leads === 1 ? 'lead' : 'leads'} · {f.conversions} converted
                            </span>
                          </div>
                          {link && (
                            <div className={styles.linkInput}>
                              <Input readOnly value={link} onFocus={e => e.currentTarget.select()} />
                              <Button variant="outline" size="sm" onClick={() => copy(link)} title="Copy ad link"><Copy className="h-4 w-4" /></Button>
                              <Button variant="outline" size="sm" onClick={() => window.open(link, '_blank', 'noopener')} title="Open form"><ExternalLink className="h-4 w-4" /></Button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {view === 'spend' && (
                <div className={styles.section}>
                  {canEdit && (
                    <div className={styles.panel}>
                      <div className={styles.spendForm}>
                        <div className={styles.field}>
                          <Label htmlFor="sp-date">Date</Label>
                          <Input id="sp-date" type="date" value={spendDraft.spendDate} onChange={e => setSpendDraft(d => ({ ...d, spendDate: e.target.value }))} />
                        </div>
                        <div className={styles.field}>
                          <Label>What for</Label>
                          <Select value={spendDraft.category} onValueChange={v => setSpendDraft(d => ({ ...d, category: v as SpendCategory }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {(Object.keys(SPEND_CATEGORY_LABELS) as SpendCategory[]).map(k => <SelectItem key={k} value={k}>{SPEND_CATEGORY_LABELS[k]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className={styles.field}>
                          <Label htmlFor="sp-amount">Amount</Label>
                          <Input id="sp-amount" type="number" min={0} placeholder="0" value={spendDraft.amount} onChange={e => setSpendDraft(d => ({ ...d, amount: e.target.value }))} />
                        </div>
                        <div className={styles.field}>
                          <Label htmlFor="sp-hours">Hours</Label>
                          <Input id="sp-hours" type="number" min={0} step="0.5" placeholder="0" value={spendDraft.hours} onChange={e => setSpendDraft(d => ({ ...d, hours: e.target.value }))} />
                        </div>
                        <div className={styles.field}>
                          <Label htmlFor="sp-notes">Note</Label>
                          <Input id="sp-notes" placeholder="e.g. Reel boost, 2 days" value={spendDraft.notes} onChange={e => setSpendDraft(d => ({ ...d, notes: e.target.value }))} />
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {editingSpendId && <Button variant="outline" onClick={() => { setEditingSpendId(null); setSpendDraft(emptySpend()); }}>Cancel</Button>}
                          <Button onClick={saveSpend} disabled={savingSpend}>
                            {savingSpend ? <Loader2 className="h-4 w-4 animate-spin" /> : editingSpendId ? 'Save' : <><Plus className="mr-1 h-4 w-4" /> Add</>}
                          </Button>
                        </div>
                      </div>
                      <p className={styles.fieldHint} style={{ marginTop: 8 }}>
                        Log each payment to Meta/Google, design or boosting costs, and the hours your team put in (shoots, replies, calls).
                      </p>
                    </div>
                  )}
                  {report!.spends.length === 0 ? (
                    <div className={styles.panel}><span className={styles.kpiHint}>Nothing logged yet.</span></div>
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr><th>Date</th><th>What for</th><th>Note</th><th className={styles.num}>Amount</th><th className={styles.num}>Hours</th><th>Added by</th>{canEdit && <th />}</tr>
                        </thead>
                        <tbody>
                          {report!.spends.map(s => (
                            <tr key={s.id}>
                              <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(s.spendDate)}</td>
                              <td>{SPEND_CATEGORY_LABELS[s.category] ?? s.category}</td>
                              <td className={styles.muted}>{s.notes || '—'}</td>
                              <td className={styles.num}>{s.amount ? money(s.amount) : '—'}</td>
                              <td className={styles.num}>{s.hours ? `${fmtNumber(s.hours, 2)} h` : '—'}</td>
                              <td className={styles.muted}>{s.createdBy || '—'}</td>
                              {canEdit && (
                                <td className={styles.num}>
                                  <Button variant="ghost" size="sm" onClick={() => editSpend(s)} title="Edit"><Edit className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="sm" onClick={() => deleteSpend(s)} title="Delete"><Trash2 className="h-4 w-4" /></Button>
                                </td>
                              )}
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={3} className="font-semibold">Total</td>
                            <td className={`${styles.num} font-semibold`}>{money(m.spend)}</td>
                            <td className={`${styles.num} font-semibold`}>{fmtNumber(m.hours, 2)} h</td>
                            <td colSpan={canEdit ? 2 : 1} />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {view === 'leads' && (
                report!.recentLeads.length === 0 ? (
                  <div className={styles.panel}>
                    <span className={styles.kpiHint}>
                      No leads yet. Leads arrive from the linked lead forms, or pick this campaign on a lead in the Leads page.
                    </span>
                  </div>
                ) : (
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr><th>Lead</th><th>Phone</th><th>Status</th><th>Form</th><th>Assigned to</th><th>Came in</th></tr>
                      </thead>
                      <tbody>
                        {report!.recentLeads.map(l => (
                          <tr key={l.id}>
                            <td>
                              <div className="font-medium">{l.name || '—'}</div>
                              <div className={styles.kpiHint}>{l.leadId}</div>
                            </td>
                            <td style={{ whiteSpace: 'nowrap' }}>{l.phone || '—'}</td>
                            <td><LeadStatusPill status={l.memberId ? 'converted' : l.status} /></td>
                            <td className={styles.muted}>{l.leadFormName || 'Added manually'}</td>
                            <td className={styles.muted}>{l.assignedStaff || 'Unassigned'}</td>
                            <td className={styles.muted} style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(l.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {m.leads > report!.recentLeads.length && (
                      <p className={styles.fieldHint} style={{ padding: '8px 12px' }}>Showing the latest {report!.recentLeads.length} of {m.leads} leads.</p>
                    )}
                  </div>
                )
              )}

              {view === 'breakdown' && (
                <div className={styles.breakdowns}>
                  <BreakdownCard title="By source" rows={report!.bySource} />
                  <BreakdownCard title="By lead form" rows={report!.byForm} />
                  <BreakdownCard title="By staff member" rows={report!.byStaff} />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete campaign?</DialogTitle>
            <DialogDescription>
              “{c?.name}” and its spend log will be deleted. Its leads stay in Leads, just no longer credited to a campaign.
              To stop it but keep the report, mark it completed or cancelled instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>Keep</Button>
            <Button variant="destructive" onClick={remove}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ReportKpi({ icon: Icon, tone, label, value, hint, valueClass }: {
  icon: React.ComponentType<{ className?: string; size?: number }>;
  tone: string; label: string; value: string; hint?: string; valueClass?: string;
}) {
  return (
    <div className={styles.reportKpi}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiIcon} data-tone={tone} style={{ width: '1.625rem', height: '1.625rem' }}><Icon size={14} /></span>
      </div>
      <div className={`${styles.kpiValue} ${valueClass ?? ''}`} title={value}>{value}</div>
      {hint && <div className={styles.kpiHint}>{hint}</div>}
    </div>
  );
}

function BreakdownCard({ title, rows }: { title: string; rows: CampaignBreakdown[] }) {
  const max = Math.max(1, ...rows.map(r => r.leads));
  return (
    <div className={styles.panel}>
      <div className={styles.sectionTitle} style={{ marginBottom: 8 }}>{title}</div>
      {rows.length === 0 ? <span className={styles.kpiHint}>No leads yet.</span> : rows.map(r => (
        <div key={r.key ?? r.label} className={styles.breakRow}>
          <div className={styles.breakTop}>
            <span className={styles.breakLabel} title={r.label}>{r.label}</span>
            <span className={styles.breakValue}>{r.leads} · {r.conversions} conv. ({fmtNumber(r.conversionRate, 1)}%)</span>
          </div>
          <Meter pct={(r.leads / max) * 100} tone="teal" />
        </div>
      ))}
    </div>
  );
}
