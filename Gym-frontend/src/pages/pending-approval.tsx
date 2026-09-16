// Route: /pending-approval
// Super Admin queue for leads that have been approved for onboarding (see
// platform-leads.tsx / platform-follow-up.tsx) and are awaiting the final step:
// creating the real gym. Approving here calls the existing gymApi.createGym
// backend endpoint (the same one Gym Management's "Add Gym" form uses), pre-filled
// from the lead's captured info, with Super Admin setting the owner credentials.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
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
  Search,
  Building2,
  Mail,
  Phone,
  Calendar,
  Clock,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
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

  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

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
    <div className="p-6 space-y-6">
      <style>{`
        .platform-table-row:hover {
          background-color: #f1f5f9;
        }
      `}</style>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Pending Approval</h1>
          <p className="text-muted-foreground">Leads approved for onboarding — finish creating the gym and issue owner credentials.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Awaiting Final Approval</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{records.length}</div>
            <p className="text-xs text-muted-foreground">Ready to become a gym</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Approved (all time)</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Gyms created from this pipeline</p>
          </CardContent>
        </Card>
      </div>

      <Card className={cardShell}>
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by business, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <Card className={cardShell}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <span>Ready for Onboarding ({filtered.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              )}
              {!loading && filtered.map((r) => (
                <TableRow key={r.id} className="platform-table-row transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{r.businessName || 'Untitled business'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{r.country}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{r.planInterest}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{r.contactName || '—'}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {r.contactEmail || '—'}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {r.contactPhone || '—'}
                    </p>
                  </TableCell>
                  <TableCell>{r.branches || '—'}</TableCell>
                  <TableCell>
                    <div className="text-sm flex items-center gap-1 text-muted-foreground">
                      <Calendar className="h-3 w-3" /> {formatDateTime(r.createdAt)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button size="sm" onClick={() => openApprove(r)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve & Create Gym
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={() => openReject(r)}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {records.length === 0
                      ? 'Nothing pending — approve a lead from Leads or Follow Up to see it here.'
                      : 'No requests match your search.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
    </div>
  );
}

export default PendingApproval;
