// Route: /pending-approval
// Super Admin queue for leads that have been approved for onboarding (see
// platform-leads.tsx / platform-follow-up.tsx) and are awaiting the final step:
// creating the real gym. Approving here calls the existing gymApi.createGym
// backend endpoint (the same one Gym Management's "Add Gym" form uses), pre-filled
// from the lead's captured info, with Super Admin setting the owner credentials.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { LocationPicker } from '../components/shared/location-picker';
import {
  ClipboardCheck,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Calendar,
  Clock,
  Loader2,
  Check,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PlatformPage, PageHead, KpiRow, Kpi, Panel, Toolbar, Count, SearchField, DataTable, StateRow, Entity, Chip, p,
} from '../components/platform/platform-ui';
import { platformLeadService, type PlatformLeadResponse } from '../utils/supabase/platform-lead-service';
import { gymApi } from '../utils/supabase/gym-service';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

interface GymFormState {
  name: string;
  slug: string;
  address: string;
  lat?: number;
  lng?: number;
  phone: string;
  email: string;
  ownerUsername: string;
  ownerEmail: string;
  ownerPassword: string;
}

export function PendingApproval() {
  const [records, setRecords] = useState<PlatformLeadResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvedCount, setApprovedCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  const [approveTarget, setApproveTarget] = useState<PlatformLeadResponse | null>(null);
  const [gymForm, setGymForm] = useState<GymFormState>({
    name: '', slug: '', address: '', lat: undefined, lng: undefined,
    phone: '', email: '', ownerUsername: '', ownerEmail: '', ownerPassword: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectTarget, setRejectTarget] = useState<PlatformLeadResponse | null>(null);
  const [rejecting, setRejecting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, approved] = await Promise.all([
        platformLeadService.getByStage('PENDING_APPROVAL', { size: 200 }),
        platformLeadService.getByStage('APPROVED', { size: 1 }),
      ]);
      setRecords(pending.leads);
      setApprovedCount(approved.pagination.total);
    } catch (error) {
      console.error('Failed to load pending approvals', error);
      toast.error('Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Debounced live slug-availability check while the create-gym dialog is open.
  // Purely advisory — gymApi.createGym re-validates at submit time regardless
  // (see its comment: a slug can be taken by a legacy/inactive tenant that never
  // shows up in a gym listing, so this check and the real create call must both
  // hit the backend independently).
  useEffect(() => {
    if (!approveTarget || !gymForm.slug.trim()) {
      setSlugStatus('idle');
      return;
    }
    setSlugStatus('checking');
    const slugAtCheckTime = gymForm.slug.trim();
    const timer = setTimeout(async () => {
      try {
        const available = await gymApi.checkSlugAvailable(slugAtCheckTime);
        setSlugStatus(prev => (gymForm.slug.trim() === slugAtCheckTime ? (available ? 'available' : 'taken') : prev));
      } catch {
        setSlugStatus('idle');
      }
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymForm.slug, approveTarget]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return records;
    return records.filter(r =>
      r.businessName.toLowerCase().includes(term) ||
      (r.contactName || '').toLowerCase().includes(term) ||
      (r.contactEmail || '').toLowerCase().includes(term)
    );
  }, [records, searchTerm]);

  const openApprove = (record: PlatformLeadResponse) => {
    setApproveTarget(record);
    setSlugStatus('idle');
    const address = [record.address, record.cityArea, record.state, record.country].filter(Boolean).join(', ');
    setGymForm({
      name: record.businessName,
      slug: slugify(record.businessName),
      address,
      lat: undefined,
      lng: undefined,
      phone: record.contactPhone || '',
      email: record.contactEmail || '',
      ownerUsername: slugify(record.businessName).replace(/-/g, '_'),
      ownerEmail: record.contactEmail || '',
      ownerPassword: '',
    });
  };

  const handleCreateGym = async () => {
    if (!approveTarget) return;
    if (!gymForm.name.trim() || !gymForm.slug.trim()) {
      toast.error('Gym name and slug are required');
      return;
    }
    if (!gymForm.ownerUsername.trim() || !gymForm.ownerPassword.trim()) {
      toast.error('Owner username and password are required to create the gym login');
      return;
    }
    setSubmitting(true);

    // Two backend calls, two different failure stories: if createGym fails, nothing
    // happened — safe to just show the error and let the user retry as-is. If
    // createGym SUCCEEDS but markApproved then fails, the gym is real (and its slug
    // is now genuinely taken) but the lead is still stuck in Pending Approval — a
    // silent generic "failed to create gym" here previously masked that, leaving
    // the slug field pre-filled with what's now a colliding value and no indication
    // the gym already exists. Distinguish the two so a retry doesn't just repeat
    // the same confusing slug-collision error.
    let createdGym: Awaited<ReturnType<typeof gymApi.createGym>> | null = null;
    try {
      createdGym = await gymApi.createGym({
        name: gymForm.name,
        slug: gymForm.slug,
        address: gymForm.address || undefined,
        lat: gymForm.lat,
        lng: gymForm.lng,
        phone: gymForm.phone || undefined,
        email: gymForm.email || undefined,
        ownerUsername: gymForm.ownerUsername,
        ownerPassword: gymForm.ownerPassword,
        ownerEmail: gymForm.ownerEmail || undefined,
      });
    } catch (error: any) {
      console.error('Failed to create gym from pending approval', error);
      const msg = error?.response?.data?.message || error?.message || 'Please check the details and try again.';
      toast.error('Failed to create gym', { description: msg });
      setSubmitting(false);
      return;
    }

    try {
      await platformLeadService.markApproved(approveTarget.id, createdGym.tenantId, createdGym.slug);
      toast.success(`${createdGym.name} is being provisioned`, {
        description: `Status: ${createdGym.status}. This can take up to a minute — check Gym Management shortly.`,
      });
      setApproveTarget(null);
      refresh();
    } catch (error: any) {
      // The gym itself was created successfully — only the pipeline bookkeeping
      // failed. Say so explicitly instead of implying gym creation failed (it
      // didn't), and don't leave the dialog re-submittable with a slug that's now
      // genuinely taken by the gym we just made.
      console.error('Gym created but failed to mark platform lead as approved', error);
      toast.error(`${createdGym.name} was created, but this lead couldn't be marked approved`, {
        description: 'The gym exists in Gym Management. Retry marking it approved, or update the lead manually.',
      });
      setApproveTarget(null);
      refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const openReject = (record: PlatformLeadResponse) => {
    setRejectTarget(record);
    setRejectReason('');
    setRejectOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await platformLeadService.reject(rejectTarget.id);
      toast.success(`${rejectTarget.businessName} rejected`);
      setRejectOpen(false);
      setRejectTarget(null);
      refresh();
    } catch (error) {
      console.error('Failed to reject pending approval', error);
      toast.error('Failed to reject this request');
    } finally {
      setRejecting(false);
    }
  };

  return (
    <PlatformPage>
      <PageHead
        icon={ClipboardCheck}
        title="Pending Approval"
        subtitle="Leads approved for onboarding — finish creating the gym and issue the owner's login."
      />

      <KpiRow cols={2}>
        <Kpi icon={Clock} tone="amber" label="Awaiting final approval" value={loading ? '—' : records.length} hint="Ready to become a gym" />
        <Kpi icon={CheckCircle} tone="green" label="Approved (all time)" value={loading ? '—' : approvedCount} hint="Gyms created from this pipeline" />
      </KpiRow>

      <Panel
        title="Ready for onboarding"
        icon={ClipboardCheck}
        action={
          <Toolbar>
            <Count n={filtered.length} />
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Search business, contact or email…" label="Search requests" />
          </Toolbar>
        }
      >
        <DataTable head={<>
          <th>Business</th>
          <th>Plan</th>
          <th>Contact</th>
          <th className={p.num}>Branches</th>
          <th>Requested</th>
          <th className={p.right}>Actions</th>
        </>}>
          {loading ? <StateRow cols={6} loading /> : filtered.map((r) => (
            <tr key={r.id}>
              <td data-label="">
                <Entity name={r.businessName || 'Untitled business'} seed={String(r.id)}
                  sub={r.country ? <><MapPin />{r.country}</> : undefined} />
              </td>
              <td data-label="Plan">{r.planInterest ? <Chip>{r.planInterest}</Chip> : <span className={p.muted}>—</span>}</td>
              <td data-label="Contact">
                <div className={p.stack}>
                  <span>{r.contactName || '—'}</span>
                  <span className={p.entitySub}><Mail />{r.contactEmail || '—'}</span>
                  <span className={p.entitySub}><Phone />{r.contactPhone || '—'}</span>
                </div>
              </td>
              <td data-label="Branches" className={p.num}>{r.branches || '—'}</td>
              <td data-label="Requested">
                <span className={p.entitySub} style={{ marginTop: 0 }}><Calendar />{formatDateTime(r.createdAt)}</span>
              </td>
              <td data-label="">
                <div className={p.rowActions}>
                  <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => openReject(r)}>
                    <XCircle className="h-4 w-4 mr-1" /> Reject
                  </Button>
                  <Button size="sm" onClick={() => openApprove(r)}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Approve & create gym
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {!loading && filtered.length === 0 && (
            <StateRow cols={6}>
              {records.length === 0
                ? 'Nothing pending — approve a lead from Leads or Follow Up to see it here.'
                : 'No requests match your search.'}
            </StateRow>
          )}
        </DataTable>
      </Panel>

      {/* Approve & create gym dialog — reuses Gym Management's real create-gym API */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create gym for {approveTarget?.businessName}</DialogTitle>
            <DialogDescription>
              Confirm the gym details and set the owner's login. This creates the gym for real.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="pa-name">Gym Name</Label>
              <Input
                id="pa-name"
                required
                value={gymForm.name}
                onChange={(e) => setGymForm({ ...gymForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa-slug">Slug</Label>
              <div className="relative">
                <Input
                  id="pa-slug"
                  required
                  value={gymForm.slug}
                  onChange={(e) => setGymForm({ ...gymForm, slug: e.target.value.toLowerCase() })}
                  className={
                    slugStatus === 'taken' ? 'pr-10 border-red-500' :
                    slugStatus === 'available' ? 'pr-10 border-green-500' :
                    'pr-10'
                  }
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {slugStatus === 'checking' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  {slugStatus === 'available' && <Check className="h-4 w-4 text-green-600" />}
                  {slugStatus === 'taken' && <AlertCircle className="h-4 w-4 text-red-600" />}
                </div>
              </div>
              {slugStatus === 'taken' && (
                <p className="text-xs text-red-600">This slug is already in use — try another.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa-address">Location</Label>
              <LocationPicker
                id="pa-address"
                value={gymForm.address}
                onChange={({ address, lat, lng }) => setGymForm({ ...gymForm, address, lat, lng })}
                placeholder="Search for a city or town..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa-phone">Phone</Label>
              <Input
                id="pa-phone"
                value={gymForm.phone}
                onChange={(e) => setGymForm({ ...gymForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa-email">Email</Label>
              <Input
                id="pa-email"
                type="email"
                value={gymForm.email}
                onChange={(e) => setGymForm({ ...gymForm, email: e.target.value })}
              />
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground pt-3 pb-1">Owner Login</p>
              <p className="text-xs text-muted-foreground pb-3">This is how {approveTarget?.contactName || 'the gym owner'} will sign in.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa-owner-username">Owner Username</Label>
              <Input
                id="pa-owner-username"
                required
                value={gymForm.ownerUsername}
                onChange={(e) => setGymForm({ ...gymForm, ownerUsername: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa-owner-email">Owner Email</Label>
              <Input
                id="pa-owner-email"
                type="email"
                value={gymForm.ownerEmail}
                onChange={(e) => setGymForm({ ...gymForm, ownerEmail: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pa-owner-password">Owner Password</Label>
              <Input
                id="pa-owner-password"
                type="password"
                required
                value={gymForm.ownerPassword}
                onChange={(e) => setGymForm({ ...gymForm, ownerPassword: e.target.value })}
                placeholder="Set an initial password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setApproveTarget(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateGym} disabled={submitting || slugStatus === 'taken'}>
              {submitting ? 'Creating…' : 'Create Gym'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject this request</DialogTitle>
            <DialogDescription>
              {rejectTarget ? `Let ${rejectTarget.businessName} know why this request was declined.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Reason (optional)</Label>
            <Textarea
              id="reject-reason"
              placeholder="Eg. Payment not completed, duplicate request..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={rejecting}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={confirmReject} disabled={rejecting}>
              {rejecting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformPage>
  );
}

export default PendingApproval;
