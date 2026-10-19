import React, { useEffect, useMemo, useState } from 'react';
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useBranch } from '../../utils/branch-context';
import {
  marketingCampaignService, campaignErrorMessage,
  type CampaignLeadFormOption, type CampaignObjective, type CampaignPlatform, type CampaignRequest,
  type CampaignStatus, type MarketingCampaign,
} from '../../utils/supabase/marketing-campaign-service';
import { OBJECTIVE_LABELS, PLATFORM_LABELS, STATUS_LABELS, suggestTrackingCode } from './campaign-ui';
import styles from './campaigns.module.css';

const DURATION_PRESETS = [3, 5, 7, 14, 30];
const NO_OWNER = '__none__';

type Draft = {
  name: string;
  platform: CampaignPlatform;
  objective: CampaignObjective;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  budget: string;
  targetLeads: string;
  targetConversions: string;
  trackingCode: string;
  trackingTouched: boolean;
  ownerName: string;
  description: string;
  branchId: string;
  leadFormIds: number[];
};

const ymd = (d: Date) => format(d, 'yyyy-MM-dd');

function emptyDraft(branchId: string): Draft {
  const today = new Date();
  return {
    name: '', platform: 'instagram', objective: 'leads', status: 'active',
    startDate: ymd(today), endDate: ymd(addDays(today, 4)),
    budget: '', targetLeads: '', targetConversions: '', trackingCode: '', trackingTouched: false,
    ownerName: '', description: '', branchId, leadFormIds: [],
  };
}

function toDraft(c: MarketingCampaign): Draft {
  return {
    name: c.name, platform: c.platform, objective: c.objective, status: c.status,
    startDate: c.startDate, endDate: c.endDate,
    budget: c.budget != null ? String(c.budget) : '',
    targetLeads: c.targetLeads != null ? String(c.targetLeads) : '',
    targetConversions: c.targetConversions != null ? String(c.targetConversions) : '',
    trackingCode: c.trackingCode ?? '', trackingTouched: true,
    ownerName: c.ownerName ?? '', description: c.description ?? '',
    branchId: String(c.branchId), leadFormIds: c.leadForms.map(f => f.id),
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: MarketingCampaign | null;
  staffMembers: { id: string; name: string }[];
  onSaved: (campaign: MarketingCampaign) => void;
}

/**
 * Create / edit a campaign. On create the lead forms are picked here too; on edit they are
 * managed from the campaign report ("Manage forms"), which also re-credits earlier leads.
 */
export function CampaignEditorDialog({ open, onOpenChange, editing, staffMembers, onSaved }: Props) {
  const { activeBranchId, activeBranchName, accessibleBranches, isAllBranches } = useBranch();
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(activeBranchId ? String(activeBranchId) : ''));
  const [forms, setForms] = useState<CampaignLeadFormOption[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(editing ? toDraft(editing) : emptyDraft(activeBranchId ? String(activeBranchId) : ''));
    if (editing) return;
    setFormsLoading(true);
    marketingCampaignService.leadForms()
      .then(setForms)
      .catch(() => setForms([]))
      .finally(() => setFormsLoading(false));
  }, [open, editing, activeBranchId]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }));

  const durationDays = useMemo(() => {
    try {
      return differenceInCalendarDays(parseISO(draft.endDate), parseISO(draft.startDate)) + 1;
    } catch { return 0; }
  }, [draft.startDate, draft.endDate]);

  const branchForms = useMemo(
    () => forms.filter(f => !draft.branchId || String(f.branchId) === draft.branchId),
    [forms, draft.branchId],
  );

  const applyPreset = (days: number) => {
    const start = draft.startDate ? parseISO(draft.startDate) : new Date();
    set('endDate', ymd(addDays(start, days - 1)));
  };

  const onNameChange = (name: string) => setDraft(d => ({
    ...d, name, trackingCode: d.trackingTouched ? d.trackingCode : suggestTrackingCode(name),
  }));

  const toggleForm = (id: number) => setDraft(d => ({
    ...d,
    leadFormIds: d.leadFormIds.includes(id) ? d.leadFormIds.filter(x => x !== id) : [...d.leadFormIds, id],
  }));

  const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

  const save = async () => {
    if (!draft.name.trim()) return toast.error('Give the campaign a name');
    if (!draft.startDate || !draft.endDate) return toast.error('Pick the start and end dates');
    if (durationDays < 1) return toast.error("The end date can't be before the start date");
    if (isAllBranches && !editing && !draft.branchId) return toast.error('Choose a branch');
    for (const [label, v] of [['Budget', draft.budget], ['Lead target', draft.targetLeads], ['Conversion target', draft.targetConversions]] as const) {
      if (v.trim() !== '' && (Number.isNaN(Number(v)) || Number(v) < 0)) return toast.error(`${label} must be a positive number`);
    }

    // Empty strings / 0 (not undefined) so clearing a field on edit actually clears it.
    const body: CampaignRequest = {
      name: draft.name.trim(),
      platform: draft.platform,
      objective: draft.objective,
      status: draft.status,
      startDate: draft.startDate,
      endDate: draft.endDate,
      budget: num(draft.budget) ?? 0,
      targetLeads: num(draft.targetLeads) ?? 0,
      targetConversions: num(draft.targetConversions) ?? 0,
      trackingCode: draft.trackingCode.trim(),
      ownerName: draft.ownerName,
      description: draft.description,
    };
    if (!editing) {
      body.branchId = draft.branchId ? Number(draft.branchId) : undefined;
      body.leadFormIds = draft.leadFormIds;
    }
    setSaving(true);
    try {
      const saved = editing
        ? await marketingCampaignService.update(editing.id, body)
        : await marketingCampaignService.create(body);
      toast.success(editing ? 'Campaign updated' : 'Campaign created');
      onSaved(saved);
      onOpenChange(false);
    } catch (err) {
      toast.error(campaignErrorMessage(err, 'Failed to save campaign'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit campaign' : 'New campaign'}</DialogTitle>
          <DialogDescription>
            A campaign is one push on social media — say a 5-day Instagram offer. Link the lead forms its ads point to,
            log what you spend, and every lead, conversion and rupee it brings in is tracked against it.
          </DialogDescription>
        </DialogHeader>

        <div className={styles.formGrid}>
          <div className={`${styles.field} ${styles.full}`}>
            <Label htmlFor="mc-name">Campaign name *</Label>
            <Input id="mc-name" placeholder="e.g. Diwali 5-day Instagram offer" value={draft.name} onChange={e => onNameChange(e.target.value)} />
          </div>

          <div className={styles.field}>
            <Label>Platform</Label>
            <Select value={draft.platform} onValueChange={v => set('platform', v as CampaignPlatform)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PLATFORM_LABELS) as CampaignPlatform[]).map(p => (
                  <SelectItem key={p} value={p}>{PLATFORM_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={styles.field}>
            <Label>Goal</Label>
            <Select value={draft.objective} onValueChange={v => set('objective', v as CampaignObjective)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(OBJECTIVE_LABELS) as CampaignObjective[]).map(o => (
                  <SelectItem key={o} value={o}>{OBJECTIVE_LABELS[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={styles.field}>
            <Label htmlFor="mc-start">Start date *</Label>
            <Input id="mc-start" type="date" value={draft.startDate} onChange={e => set('startDate', e.target.value)} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="mc-end">End date *</Label>
            <Input id="mc-end" type="date" value={draft.endDate} min={draft.startDate} onChange={e => set('endDate', e.target.value)} />
          </div>
          <div className={`${styles.field} ${styles.full}`}>
            <div className={styles.presets}>
              {DURATION_PRESETS.map(d => (
                <button key={d} type="button" className={styles.chip} data-active={durationDays === d} onClick={() => applyPreset(d)}>
                  {d} days
                </button>
              ))}
            </div>
            <span className={styles.fieldHint}>
              {durationDays > 0 ? `Runs ${durationDays} ${durationDays === 1 ? 'day' : 'days'}` : 'End date is before the start date'}
            </span>
          </div>

          <div className={styles.field}>
            <Label htmlFor="mc-budget">Budget</Label>
            <Input id="mc-budget" type="number" min={0} placeholder="Planned spend" value={draft.budget} onChange={e => set('budget', e.target.value)} />
          </div>
          <div className={styles.field}>
            <Label>Status</Label>
            <Select value={draft.status} onValueChange={v => set('status', v as CampaignStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABELS) as CampaignStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className={styles.field}>
            <Label htmlFor="mc-target-leads">Lead target</Label>
            <Input id="mc-target-leads" type="number" min={0} placeholder="e.g. 50" value={draft.targetLeads} onChange={e => set('targetLeads', e.target.value)} />
          </div>
          <div className={styles.field}>
            <Label htmlFor="mc-target-conv">Conversion target</Label>
            <Input id="mc-target-conv" type="number" min={0} placeholder="e.g. 10 new members" value={draft.targetConversions} onChange={e => set('targetConversions', e.target.value)} />
          </div>

          <div className={styles.field}>
            <Label htmlFor="mc-code">Tracking code</Label>
            <Input
              id="mc-code"
              placeholder="diwali-offer"
              value={draft.trackingCode}
              onChange={e => setDraft(d => ({ ...d, trackingCode: e.target.value.replace(/\s+/g, '-'), trackingTouched: true }))}
            />
            <span className={styles.fieldHint}>Added to your ad links as utm_campaign, so leads are credited even from a shared form.</span>
          </div>
          <div className={styles.field}>
            <Label>Campaign owner</Label>
            <Select value={draft.ownerName || NO_OWNER} onValueChange={v => set('ownerName', v === NO_OWNER ? '' : v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_OWNER}>Not set</SelectItem>
                {staffMembers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {isAllBranches && !editing && (
            <div className={`${styles.field} ${styles.full}`}>
              <Label>Branch *</Label>
              <Select value={draft.branchId} onValueChange={v => setDraft(d => ({ ...d, branchId: v, leadFormIds: [] }))}>
                <SelectTrigger><SelectValue placeholder="Choose a branch" /></SelectTrigger>
                <SelectContent>
                  {accessibleBranches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.branchName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className={`${styles.field} ${styles.full}`}>
            <Label htmlFor="mc-desc">Notes for the team</Label>
            <Textarea id="mc-desc" placeholder="Offer, audience, creatives used…" value={draft.description} onChange={e => set('description', e.target.value)} />
          </div>

          {!editing && (
            <div className={`${styles.field} ${styles.full}`}>
              <Label>Lead forms used in this campaign's ads</Label>
              {formsLoading ? (
                <div className={styles.fieldHint}><Loader2 className="h-4 w-4 animate-spin" /></div>
              ) : branchForms.length === 0 ? (
                <div className={styles.switchRow}>
                  <span className={styles.fieldHint}>
                    <Link2 className="h-4 w-4" style={{ display: 'inline', marginRight: 6, verticalAlign: '-3px' }} />
                    No lead forms {isAllBranches ? 'in this branch' : `in ${activeBranchName}`} yet. Create one from
                    “Lead forms” and link it to this campaign later.
                  </span>
                </div>
              ) : (
                <>
                  <div className={styles.formList}>
                    {branchForms.map(f => {
                      const checked = draft.leadFormIds.includes(f.id);
                      return (
                        <label key={f.id} className={styles.formOption} data-checked={checked}>
                          <Checkbox checked={checked} onCheckedChange={() => toggleForm(f.id)} />
                          <div className={styles.formOptionMain}>
                            <div className={styles.formOptionName}>{f.name}{!f.active && ' (paused)'}</div>
                            <div className={styles.formOptionMeta}>
                              {f.submissionCount} {f.submissionCount === 1 ? 'submission' : 'submissions'}
                              {f.campaigns.length > 0 && ` · also in ${f.campaigns.join(', ')}`}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editing ? 'Save changes' : 'Create campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
