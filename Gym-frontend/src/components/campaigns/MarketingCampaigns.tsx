import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Banknote, CheckCircle2, Clock, Link2, Loader2, Megaphone, Plus, Search, Target, TrendingUp, Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCurrency } from '../../utils/currency';
import { useBranch } from '../../utils/branch-context';
import { usePermission } from '../../utils/permissions';
import { staffService } from '../../utils/supabase/staff-service';
import { LeadFormsManager } from '../shared/lead-forms-manager';
import {
  marketingCampaignService, campaignErrorMessage,
  type CampaignPhase, type CampaignPlatform, type MarketingCampaign,
} from '../../utils/supabase/marketing-campaign-service';
import { CampaignEditorDialog } from './CampaignEditorDialog';
import { CampaignReportDialog } from './CampaignReportDialog';
import {
  Meter, PHASE_LABELS, PLATFORM_LABELS, PhaseBadge, PlatformPill, fmtDate, fmtNumber, timelineText,
} from './campaign-ui';
import styles from './campaigns.module.css';

const PHASE_FILTERS: (CampaignPhase | 'all')[] = ['all', 'live', 'scheduled', 'ended', 'paused', 'draft', 'completed', 'cancelled'];

/**
 * Promotions & Campaigns › Campaigns: social-media / ad campaigns bridged to the lead forms
 * their ads point to, so each one shows what it cost (money + team hours) against the leads,
 * conversions and revenue it brought in.
 */
export function MarketingCampaigns() {
  const { formatCurrency } = useCurrency();
  const { activeBranchId } = useBranch();
  const canCreate = usePermission('PROMOTIONS_CAMPAIGN_CREATE');
  const canViewLeads = usePermission('LEADS_VIEW');

  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [phase, setPhase] = useState<CampaignPhase | 'all'>('all');
  const [platform, setPlatform] = useState<CampaignPlatform | 'all'>('all');

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<MarketingCampaign | null>(null);
  const [reportId, setReportId] = useState<number | null>(null);
  const [reportRefresh, setReportRefresh] = useState(0);
  const [formsOpen, setFormsOpen] = useState(false);
  const [staffMembers, setStaffMembers] = useState<{ id: string; name: string }[]>([]);

  const money = useCallback((n: number | null | undefined) => (n == null ? '—' : formatCurrency(n, { maximumFractionDigits: 0 })), [formatCurrency]);

  const load = useCallback(async () => {
    try {
      setCampaigns(await marketingCampaignService.list());
    } catch (err) {
      toast.error(campaignErrorMessage(err, 'Failed to load campaigns'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setLoading(true); load(); }, [load, activeBranchId]);

  useEffect(() => {
    staffService.getStaff({}, 1, 100)
      .then(res => setStaffMembers(res.items.map(s => ({ id: String(s.id), name: s.name }))))
      .catch(() => setStaffMembers([]));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return campaigns.filter(c =>
      (phase === 'all' || c.phase === phase)
      && (platform === 'all' || c.platform === platform)
      && (!q || c.name.toLowerCase().includes(q) || (c.trackingCode ?? '').toLowerCase().includes(q)
        || c.leadForms.some(f => f.name.toLowerCase().includes(q))));
  }, [campaigns, search, phase, platform]);

  const phaseCounts = useMemo(() => {
    const counts: Record<string, number> = { all: campaigns.length };
    campaigns.forEach(c => { counts[c.phase] = (counts[c.phase] ?? 0) + 1; });
    return counts;
  }, [campaigns]);

  // Totals over what's on screen, so filtering to "Live" or one platform answers "how are those doing?".
  const totals = useMemo(() => {
    const t = { leads: 0, converted: 0, spend: 0, hours: 0, revenue: 0, live: 0 };
    filtered.forEach(c => {
      t.leads += c.metrics.leads;
      t.converted += c.metrics.converted;
      t.spend += Number(c.metrics.spend) || 0;
      t.hours += Number(c.metrics.hours) || 0;
      t.revenue += Number(c.metrics.revenue) || 0;
      if (c.phase === 'live') t.live++;
    });
    return {
      ...t,
      conversionRate: t.leads ? (t.converted * 100) / t.leads : 0,
      costPerLead: t.leads && t.spend ? t.spend / t.leads : null,
      costPerConversion: t.converted && t.spend ? t.spend / t.converted : null,
      roi: t.spend ? ((t.revenue - t.spend) * 100) / t.spend : null,
    };
  }, [filtered]);

  const openCreate = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (c: MarketingCampaign) => { setEditing(c); setEditorOpen(true); };

  const onSaved = (saved: MarketingCampaign) => {
    load();
    if (editing) setReportRefresh(n => n + 1);
    else setReportId(saved.id);
  };

  const presentPhases = PHASE_FILTERS.filter(p => p === 'all' || (phaseCounts[p] ?? 0) > 0);

  return (
    <div className={styles.root}>
      <div className={styles.head}>
        <div>
          <h2 className={styles.headTitle}>Campaigns</h2>
          <p className={styles.headSub}>
            Track each social-media campaign end to end — link the lead forms its ads use, log spend and team hours,
            and see the leads, conversions and revenue it brought in.
          </p>
        </div>
        <div className={styles.headActions}>
          {canViewLeads && (
            <Button variant="outline" onClick={() => setFormsOpen(true)}>
              <Link2 className="mr-2 h-4 w-4" /> Lead forms
            </Button>
          )}
          {canCreate && (
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> New campaign
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpis}>
        <Kpi icon={Megaphone} tone="teal" label="Live now" value={fmtNumber(totals.live)} hint={`${filtered.length} ${filtered.length === 1 ? 'campaign' : 'campaigns'} shown`} />
        <Kpi icon={Banknote} tone="amber" label="Spent" value={money(totals.spend)} hint={`${fmtNumber(totals.hours, 1)} team hours`} />
        <Kpi icon={Users} tone="blue" label="Leads" value={fmtNumber(totals.leads)} hint={totals.costPerLead != null ? `${money(totals.costPerLead)} per lead` : 'Cost per lead appears once spend is logged'} />
        <Kpi icon={CheckCircle2} tone="green" label="Conversions" value={fmtNumber(totals.converted)} hint={`${fmtNumber(totals.conversionRate, 1)}% of leads`} />
        <Kpi icon={Target} tone="violet" label="Cost / conversion" value={money(totals.costPerConversion)} />
        <Kpi icon={TrendingUp} tone={totals.roi == null ? 'gray' : totals.roi >= 0 ? 'green' : 'red'} label="Revenue"
          value={money(totals.revenue)}
          hint={totals.roi == null ? 'From converted members' : `${totals.roi >= 0 ? '+' : ''}${fmtNumber(totals.roi, 1)}% return on spend`} />
      </div>

      {/* Toolbar */}
      {campaigns.length > 0 && (
        <div className={`${styles.card} ${styles.toolbar}`}>
          <div className={styles.search}>
            <Search className={`h-4 w-4 ${styles.searchIcon}`} />
            <Input placeholder="Search campaigns, tracking codes or forms…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className={styles.chips}>
            {presentPhases.map(p => (
              <button key={p} type="button" className={styles.chip} data-active={phase === p} onClick={() => setPhase(p)}>
                {p === 'all' ? 'All' : PHASE_LABELS[p]}
                <span className={styles.chipCount}>{phaseCounts[p] ?? 0}</span>
              </button>
            ))}
          </div>
          <Select value={platform} onValueChange={v => setPlatform(v as CampaignPlatform | 'all')}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All platforms</SelectItem>
              {(Object.keys(PLATFORM_LABELS) as CampaignPlatform[]).map(p => <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className={styles.centered}><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : campaigns.length === 0 ? (
        <div className={`${styles.card} ${styles.empty}`}>
          <span className={styles.kpiIcon} data-tone="teal" style={{ width: '3rem', height: '3rem', borderRadius: '1rem' }}><Megaphone size={22} /></span>
          <div>
            <div className={styles.emptyTitle}>No campaigns yet</div>
            <p className={styles.headSub} style={{ marginInline: 'auto' }}>Running a 3-day or 5-day offer on Instagram or Facebook? Set it up here so you know exactly what it returned.</p>
          </div>
          <div className={styles.steps}>
            <Step n={1} title="Create the campaign" text="Name, platform, dates and budget — e.g. 5 days, 10,000 budget." />
            <Step n={2} title="Link its lead form" text="Pick the lead form the ads point to, and copy the tagged ad link." />
            <Step n={3} title="Log spend & hours" text="Add each ad payment, boost or design cost and the team's hours." />
            <Step n={4} title="Watch the results" text="Leads, conversions, cost per lead, revenue and ROI — live." />
          </div>
          {canCreate && <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" /> Create your first campaign</Button>}
        </div>
      ) : filtered.length === 0 ? (
        <div className={`${styles.card} ${styles.centered}`}>No campaigns match these filters.</div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(c => <CampaignCard key={c.id} c={c} money={money} onOpen={() => setReportId(c.id)} />)}
        </div>
      )}

      <CampaignEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        editing={editing}
        staffMembers={staffMembers}
        onSaved={onSaved}
      />
      <CampaignReportDialog
        campaignId={reportId}
        refreshKey={reportRefresh}
        onOpenChange={open => { if (!open) setReportId(null); }}
        onEdit={openEdit}
        onChanged={load}
      />
      {canViewLeads && (
        <LeadFormsManager
          open={formsOpen}
          onOpenChange={open => { setFormsOpen(open); if (!open) load(); }}
          staffMembers={staffMembers}
        />
      )}
    </div>
  );
}

function CampaignCard({ c, money, onOpen }: { c: MarketingCampaign; money: (n: number | null | undefined) => string; onOpen: () => void }) {
  const { formatCurrency } = useCurrency();
  // Card tiles are narrow: 4.2K instead of 4,200 (full amount on hover).
  const compact = (n: number | null | undefined) => (n == null ? '—' : formatCurrency(n, { notation: 'compact', maximumFractionDigits: 1 }));
  const m = c.metrics;
  const timePct = c.durationDays ? (c.daysElapsed / c.durationDays) * 100 : 0;
  const missingForms = c.leadForms.length === 0;
  return (
    <button type="button" className={`${styles.card} ${styles.campaign}`} onClick={onOpen}>
      <div className={styles.campaignTop}>
        <div style={{ minWidth: 0 }}>
          <div className={styles.campaignName}>{c.name}</div>
          <div className={styles.campaignMeta}>
            <span>{fmtDate(c.startDate, 'dd MMM')} – {fmtDate(c.endDate, 'dd MMM yyyy')}</span>
            {c.ownerName && (<><span className={styles.dot} /><span>{c.ownerName}</span></>)}
          </div>
        </div>
        <PhaseBadge phase={c.phase} />
      </div>

      <div className={styles.timeline}>
        <div className={styles.timelineRow}>
          <PlatformPill platform={c.platform} />
          <span>{timelineText(c)}</span>
        </div>
        <Meter pct={timePct} tone={c.phase === 'live' ? 'green' : 'gray'} />
      </div>

      <div className={styles.stats}>
        <Stat label="Leads" value={fmtNumber(m.leads)} />
        <Stat label="Converted" value={`${fmtNumber(m.converted)} · ${fmtNumber(m.conversionRate, 0)}%`} />
        <Stat label="Spent" value={compact(m.spend)} title={money(m.spend)} />
        <Stat label="Per lead" value={compact(m.costPerLead)} title={money(m.costPerLead)} />
      </div>

      {(c.targetLeads || c.budget) ? (
        <div style={{ display: 'grid', gridTemplateColumns: c.targetLeads && c.budget ? '1fr 1fr' : '1fr', gap: 10 }}>
          {c.targetLeads ? (
            <div className={styles.timeline}>
              <div className={styles.timelineRow}><span>Lead target</span><span>{m.leads}/{c.targetLeads}</span></div>
              <Meter pct={m.leadTargetPct} tone="blue" />
            </div>
          ) : null}
          {c.budget ? (
            <div className={styles.timeline}>
              <div className={styles.timelineRow}><span>Budget used</span><span>{fmtNumber(m.budgetUsedPct, 0)}%</span></div>
              <Meter pct={m.budgetUsedPct} tone={(m.budgetUsedPct ?? 0) > 100 ? 'red' : 'amber'} />
            </div>
          ) : null}
        </div>
      ) : null}

      <div className={styles.campaignFoot}>
        <div className={styles.formChips}>
          {missingForms ? <span className={styles.warnChip}>No lead form linked</span>
            : c.leadForms.slice(0, 2).map(f => <span key={f.id} className={styles.formChip} title={f.name}>{f.name}</span>)}
          {c.leadForms.length > 2 && <span className={styles.formChip}>+{c.leadForms.length - 2}</span>}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Clock size={12} /> {fmtNumber(m.hours, 1)} h
          {m.roi != null && (
            <b className={m.roi >= 0 ? styles.good : styles.bad} style={{ marginLeft: 8 }}>
              ROI {m.roi > 0 ? '+' : ''}{fmtNumber(m.roi, 0)}%
            </b>
          )}
        </span>
      </div>
    </button>
  );
}

function Kpi({ icon: Icon, tone, label, value, hint }: {
  icon: React.ComponentType<{ className?: string; size?: number }>; tone: string; label: string; value: string; hint?: string;
}) {
  return (
    <div className={`${styles.card} ${styles.kpi}`}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        <span className={styles.kpiIcon} data-tone={tone}><Icon size={16} /></span>
      </div>
      <div className={styles.kpiValue} title={value}>{value}</div>
      {hint && <div className={styles.kpiHint}>{hint}</div>}
    </div>
  );
}

function Stat({ label, value, title }: { label: string; value: string; title?: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue} title={title ?? value}>{value}</div>
    </div>
  );
}

function Step({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className={styles.step}>
      <span className={styles.stepNo}>{n}</span>
      <div>
        <div className={styles.stepTitle}>{title}</div>
        <div className={styles.stepText}>{text}</div>
      </div>
    </div>
  );
}
