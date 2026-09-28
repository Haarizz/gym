import React, { useCallback, useEffect, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Card, CardContent } from '../ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Copy, ExternalLink, Edit, Trash2, Plus, Link2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { useBranch } from '../../utils/branch-context';
import { usePermission } from '../../utils/permissions';
import {
  leadFormService, leadFormErrorMessage, publicLeadFormUrl,
  type LeadForm, type LeadFormRequest, type LeadFormSource,
} from '../../utils/supabase/lead-form-service';

const SOURCE_LABELS: Record<LeadFormSource, string> = {
  'social-media': 'Social Media',
  'facebook-ads': 'Facebook Ads',
  'instagram': 'Instagram',
  'google-ads': 'Google Ads',
  'website': 'Website',
  'other': 'Other',
};

const UNASSIGNED = '__unassigned__';

type Draft = {
  name: string;
  branchId: string;
  headline: string;
  description: string;
  successMessage: string;
  privacyPolicyUrl: string;
  source: LeadFormSource;
  assignedStaff: string;
  showEmail: boolean;
  requireEmail: boolean;
  showInterest: boolean;
};

const emptyDraft = (): Draft => ({
  name: '', branchId: '', headline: '', description: '', successMessage: '', privacyPolicyUrl: '',
  source: 'social-media', assignedStaff: '', showEmail: true, requireEmail: false, showInterest: true,
});

interface LeadFormsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffMembers: { id: string; name: string }[];
}

/**
 * "Lead Forms" on the Leads page: each form is a public link (/f/{key}) the gym
 * pastes into its social-media ads; every submission lands in Leads with a
 * first follow-up already scheduled.
 */
export function LeadFormsManager({ open, onOpenChange, staffMembers }: LeadFormsManagerProps) {
  const { activeBranchId, activeBranchName, accessibleBranches, isAllBranches } = useBranch();
  const canCreate = usePermission('LEADS_CREATE');
  const canEdit = usePermission('LEADS_EDIT');
  const canDelete = usePermission('LEADS_DELETE');

  const [forms, setForms] = useState<LeadForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<LeadForm | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<LeadForm | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setForms(await leadFormService.list());
    } catch (err) {
      toast.error(leadFormErrorMessage(err, 'Failed to load lead forms'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) load();
  }, [open, load, activeBranchId]);

  const openCreate = () => {
    setEditing(null);
    setDraft({ ...emptyDraft(), branchId: activeBranchId ? String(activeBranchId) : '' });
    setEditorOpen(true);
  };

  const openEdit = (f: LeadForm) => {
    setEditing(f);
    setDraft({
      name: f.name,
      branchId: String(f.branchId),
      headline: f.headline || '',
      description: f.description || '',
      successMessage: f.successMessage || '',
      privacyPolicyUrl: f.privacyPolicyUrl || '',
      source: f.source,
      assignedStaff: f.assignedStaff || '',
      showEmail: f.showEmail,
      requireEmail: f.requireEmail,
      showInterest: f.showInterest,
    });
    setEditorOpen(true);
  };

  const save = async () => {
    if (!draft.name.trim()) return toast.error('Please give the form a name');
    if (isAllBranches && !draft.branchId) return toast.error('Please choose a branch');

    // Empty strings (not undefined) so clearing a field on edit actually clears it.
    const body: LeadFormRequest = {
      name: draft.name.trim(),
      branchId: draft.branchId ? Number(draft.branchId) : undefined,
      headline: draft.headline,
      description: draft.description,
      successMessage: draft.successMessage,
      privacyPolicyUrl: draft.privacyPolicyUrl,
      source: draft.source,
      assignedStaff: draft.assignedStaff,
      showEmail: draft.showEmail || draft.requireEmail,
      requireEmail: draft.requireEmail,
      showInterest: draft.showInterest,
    };
    setSaving(true);
    try {
      if (editing) {
        await leadFormService.update(editing.id, body);
        toast.success('Lead form updated');
      } else {
        const created = await leadFormService.create(body);
        await copyLink(created.formKey, 'Form created — link copied to clipboard');
      }
      setEditorOpen(false);
      await load();
    } catch (err) {
      toast.error(leadFormErrorMessage(err, 'Failed to save lead form'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (f: LeadForm, active: boolean) => {
    try {
      await leadFormService.update(f.id, { active });
      setForms(list => list.map(x => (x.id === f.id ? { ...x, active } : x)));
      toast.success(active ? 'Form is live again' : 'Form paused — the link will show "no longer available"');
    } catch (err) {
      toast.error(leadFormErrorMessage(err, 'Failed to update form'));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await leadFormService.remove(deleting.id);
      toast.success('Lead form deleted');
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(leadFormErrorMessage(err, 'Failed to delete form'));
    }
  };

  const copyLink = async (formKey: string, successText = 'Link copied') => {
    const url = publicLeadFormUrl(formKey);
    try {
      await navigator.clipboard.writeText(url);
      toast.success(successText);
    } catch {
      toast.info(url);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lead Forms</DialogTitle>
            <DialogDescription>
              Create a form, copy its link and paste it into your Facebook/Instagram ads, bio, WhatsApp status or Google ads.
              Everyone who fills it appears in Leads with a follow-up already scheduled.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {isAllBranches ? 'All branches' : activeBranchName}
            </p>
            {canCreate && (
              <Button onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                New Form
              </Button>
            )}
          </div>

          {loading ? (
            <div className="text-center text-muted-foreground" style={{ padding: 32 }}>
              <Loader2 className="h-6 w-6 animate-spin mx-auto" />
            </div>
          ) : forms.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="text-center" style={{ padding: 32 }}>
                <Link2 className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="font-semibold" style={{ marginTop: 12 }}>No lead forms yet</p>
                <p className="text-sm text-muted-foreground" style={{ marginTop: 4 }}>
                  Create your first form to start collecting leads from your ads.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {forms.map(f => (
                <Card key={f.id}>
                  <CardContent className="space-y-3" style={{ paddingTop: 16 }}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{f.name}</span>
                          <Badge variant="outline">{SOURCE_LABELS[f.source] || f.source}</Badge>
                          {!f.active && <Badge variant="secondary">Paused</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground" style={{ marginTop: 4 }}>
                          {f.branchName || `Branch #${f.branchId}`}
                          {' · '}{f.submissionCount} {f.submissionCount === 1 ? 'submission' : 'submissions'}
                          {f.lastSubmissionAt ? ` · last ${format(new Date(f.lastSubmissionAt), 'dd MMM yyyy, HH:mm')}` : ''}
                          {f.assignedStaff ? ` · assigned to ${f.assignedStaff}` : ''}
                        </p>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-muted-foreground">{f.active ? 'Live' : 'Paused'}</span>
                          <Switch checked={f.active} onCheckedChange={v => toggleActive(f, v)} />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Input readOnly value={publicLeadFormUrl(f.formKey)} className="font-mono text-xs" onFocus={e => e.currentTarget.select()} />
                      <Button variant="outline" size="sm" onClick={() => copyLink(f.formKey)} title="Copy link">
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => window.open(publicLeadFormUrl(f.formKey), '_blank', 'noopener')} title="Open form">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      {canEdit && (
                        <Button variant="outline" size="sm" onClick={() => openEdit(f)} title="Edit">
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="outline" size="sm" onClick={() => setDeleting(f)} title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="bg-muted text-xs text-muted-foreground" style={{ borderRadius: 8, padding: 12 }}>
            <span className="font-semibold">Tip:</span> add <span className="font-mono">?utm_source=instagram&amp;utm_campaign=diwali</span> to
            the end of a link to see which platform and campaign each lead came from. Facebook, Instagram and Google are detected automatically.
          </div>
        </DialogContent>
      </Dialog>

      {/* Create / edit */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Lead Form' : 'New Lead Form'}</DialogTitle>
            <DialogDescription>What people see when they open your ad link.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="lf-form-name">Form name * <span className="text-muted-foreground font-normal">(only your team sees this)</span></Label>
              <Input id="lf-form-name" placeholder="e.g. Diwali Instagram Offer" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
            </div>

            <div className="space-y-2">
              <Label>Branch</Label>
              {isAllBranches ? (
                <Select value={draft.branchId} onValueChange={v => setDraft(d => ({ ...d, branchId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Choose a branch" /></SelectTrigger>
                  <SelectContent>
                    {accessibleBranches.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.branchName}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input readOnly value={editing?.branchName || activeBranchName} />
              )}
            </div>

            <div className="space-y-2">
              <Label>Lead source</Label>
              <Select value={draft.source} onValueChange={v => setDraft(d => ({ ...d, source: v as LeadFormSource }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(SOURCE_LABELS) as LeadFormSource[]).map(s => (
                    <SelectItem key={s} value={s}>{SOURCE_LABELS[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label>Assign new leads to</Label>
              <Select value={draft.assignedStaff || UNASSIGNED} onValueChange={v => setDraft(d => ({ ...d, assignedStaff: v === UNASSIGNED ? '' : v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {staffMembers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="lf-headline">Headline</Label>
              <Input id="lf-headline" placeholder="Start your fitness journey" value={draft.headline} onChange={e => setDraft(d => ({ ...d, headline: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="lf-description">Description</Label>
              <Textarea id="lf-description" placeholder="e.g. Get 20% off on annual memberships this Diwali. Leave your details and we'll call you." value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="lf-success">Thank-you message</Label>
              <Textarea id="lf-success" placeholder="Thank you! Our team will contact you shortly." value={draft.successMessage} onChange={e => setDraft(d => ({ ...d, successMessage: e.target.value }))} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="lf-privacy">Privacy policy link <span className="text-muted-foreground font-normal">(recommended — Facebook/Instagram ads require one)</span></Label>
              <Input id="lf-privacy" type="url" placeholder="https://yourgym.com/privacy" value={draft.privacyPolicyUrl} onChange={e => setDraft(d => ({ ...d, privacyPolicyUrl: e.target.value }))} />
              <p className="text-xs text-muted-foreground">Shown next to the "I agree to be contacted" checkbox. Leave empty to use the GymBios privacy policy.</p>
            </div>

            <div className="md:col-span-2 space-y-3">
              <Label>Fields</Label>
              <div className="flex justify-between items-center">
                <span className="text-sm">Ask for email</span>
                <Switch checked={draft.showEmail || draft.requireEmail} onCheckedChange={v => setDraft(d => ({ ...d, showEmail: v, requireEmail: v ? d.requireEmail : false }))} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Email is required</span>
                <Switch checked={draft.requireEmail} onCheckedChange={v => setDraft(d => ({ ...d, requireEmail: v, showEmail: v ? true : d.showEmail }))} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Ask what they're interested in (your active plans)</span>
                <Switch checked={draft.showInterest} onCheckedChange={v => setDraft(d => ({ ...d, showInterest: v }))} />
              </div>
              <p className="text-xs text-muted-foreground">Name and phone number are always required.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? 'Save Changes' : 'Create Form'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleting} onOpenChange={o => { if (!o) setDeleting(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete lead form?</DialogTitle>
            <DialogDescription>
              "{deleting?.name}" will stop working immediately — anyone opening its link will see "no longer available".
              Leads it already created are kept. To stop it temporarily, pause it instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
