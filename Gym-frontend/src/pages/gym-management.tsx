import React, { useState, useEffect } from 'react';
import { Plus, Edit2, CheckCircle2, XCircle, Dumbbell, Trash2, Building2, GitBranch, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';
import {
  PlatformPage, PageHead, KpiRow, Kpi, Panel, Toolbar, Count, SearchField, DataTable, StateRow,
  Entity, Pill, IconAction, p, type PillKind,
} from '../components/platform/platform-ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { LocationPicker } from "../components/shared/location-picker";
import { gymApi, GymDTO } from '../utils/supabase/gym-service';
import { toast } from 'sonner';

// Matches the gyms.phone DB column (VARCHAR(50), see backend V29 migration) —
// enforced client-side so a too-long value never reaches the network, and again
// server-side (GymService.updateGym) as the source of truth.
const PHONE_MAX_LENGTH = 50;

export function GymManagement() {
  const [gyms, setGyms] = useState<GymDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    address: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    phone: '',
    email: '',
    status: 'ACTIVE',
    ownerUsername: '',
    ownerPassword: '',
    ownerEmail: ''
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGym, setEditingGym] = useState<GymDTO | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    slug: '',
    address: '',
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
    phone: '',
    email: ''
  });

  const loadGyms = async () => {
    try {
      const data = await gymApi.getAllGyms();
      setGyms(data);
    } catch (error) {
      console.error('Failed to load gyms', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGyms();
  }, []);

  const handleAddGym = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { name, status } = await gymApi.createGym(formData);
      setShowAddModal(false);
      setFormData({ name: '', slug: '', address: '', lat: undefined, lng: undefined, phone: '', email: '', status: 'ACTIVE', ownerUsername: '', ownerPassword: '', ownerEmail: '' });
      // Phase 3: gym creation now provisions a dedicated database asynchronously.
      // status is PROVISIONING here, not ACTIVE yet — no polling added, matching
      // this form's existing alert()-based style; refresh the list shortly to see
      // it complete.
      alert(`${name} is being provisioned (status: ${status}). This can take up to a minute — refresh the list shortly to see it go live.`);
      loadGyms();
    } catch (error: any) {
      console.error('Failed to add gym', error);
      const msg = error.response?.data?.message || error.message || 'Slug must be unique.';
      alert(`Failed to add gym. ${msg}`);
    }
  };

  const openEditModal = (gym: GymDTO) => {
    setEditingGym(gym);
    setEditFormData({
      name: gym.name || '',
      slug: gym.slug || '',
      address: gym.address || '',
      lat: gym.lat,
      lng: gym.lng,
      phone: gym.phone || '',
      email: gym.email || ''
    });
    setShowEditModal(true);
  };

  // The real API response serializes tenant_id (snake_case), not tenantId — same
  // mismatch class as isDefault/branchCount/ownerUsername elsewhere in this file.
  // Reading gym.tenantId directly is always undefined, so this dual-key read is
  // required or every tenant-sourced gym silently falls through to the PRIMARY-DB
  // endpoint with an id that table doesn't have, 500ing with "Gym not found" —
  // confirmed live: this is exactly what made Deactivate appear to do nothing.
  const getTenantId = (gym: GymDTO): number | null => {
    const raw = (gym as any).tenantId ?? (gym as any).tenant_id;
    return raw != null ? Number(raw) : null;
  };

  // BG_60: a TENANT-sourced row now shows up immediately with status PROVISIONING
  // (or PROVISION_FAILED) instead of being missing from the list until its
  // dedicated database finishes provisioning — see GymService.toResponseDTO's
  // placeholder path. Neither status has a tenant database to write to yet, so
  // actions that update/deactivate one (Edit, status toggle) must stay disabled
  // until it reaches a real status (ACTIVE/INACTIVE/SUSPENDED).
  const isProvisioningPlaceholder = (gym: GymDTO): boolean =>
    gym.source === 'TENANT' && (gym.status === 'PROVISIONING' || gym.status === 'PROVISION_FAILED');

  const handleEditGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGym) return;
    if (editFormData.phone.length > PHONE_MAX_LENGTH) {
      toast.error(`Phone number must be ${PHONE_MAX_LENGTH} characters or fewer`);
      return;
    }
    try {
      // Phase 8: a gym created since the per-tenant-database cutover (source ===
      // 'TENANT') has no primary-DB Gym row to update — its own details live in
      // its own dedicated database instead, reached via the tenant-scoped endpoint.
      const tenantId = getTenantId(editingGym);
      if (editingGym.source === 'TENANT' && tenantId != null) {
        await gymApi.updateTenantGym(tenantId, editFormData);
      } else {
        await gymApi.updateGym(editingGym.id, editFormData);
      }
      setShowEditModal(false);
      setEditingGym(null);
      loadGyms();
    } catch (error: any) {
      console.error('Failed to update gym', error);
      const msg = error.response?.data?.message || error.message || 'Slug must be unique.';
      toast.error(`Failed to update gym. ${msg}`);
    }
  };

  const toggleStatus = async (gym: GymDTO) => {
    const newStatus = gym.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    if (newStatus === 'INACTIVE' && !window.confirm(
      'Deactivating this gym will immediately block its owner and all staff/members from logging in, on both web and the mobile app. Continue?'
    )) {
      return;
    }
    try {
      const tenantId = getTenantId(gym);
      if (gym.source === 'TENANT' && tenantId != null) {
        await gymApi.updateTenantGymStatus(tenantId, newStatus);
      } else {
        await gymApi.updateGymStatus(gym.id, newStatus);
      }
      loadGyms();
    } catch (error: any) {
      console.error('Failed to update status', error);
      const msg = error.response?.data?.message || error.message || 'Please try again.';
      alert(`Failed to update gym status. ${msg}`);
    }
  };

  /**
   * Irreversible hard delete — only offered for TENANT-sourced gyms (every gym
   * created since Phase 3's per-tenant-database cutover), since the backend
   * endpoint only knows how to drop a control-plane tenant's own database/role.
   * Deliberately not offered for PRIMARY-sourced gyms (Main Gym, Power Gym's
   * legacy pre-cutover siblings) — no equivalent teardown exists for those, and
   * they were never in scope for this operation anyway.
   */
  const handleDeleteGym = async (gym: GymDTO) => {
    const tenantId = getTenantId(gym);
    if (tenantId == null) return;
    if (!window.confirm(
      `Permanently delete "${gym.name}"? This drops its entire database and cannot be undone. Type-confirm by clicking OK only if you are certain.`
    )) {
      return;
    }
    try {
      await gymApi.deleteTenantGym(tenantId);
      toast.success(`${gym.name} permanently deleted.`);
      loadGyms();
    } catch (error: any) {
      console.error('Failed to delete gym', error);
      const msg = error.response?.data?.message || error.message || 'Please try again.';
      toast.error(`Failed to delete gym. ${msg}`);
    }
  };

  const filteredGyms = gyms.filter(g => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return g.name.toLowerCase().includes(q) ||
           g.slug.toLowerCase().includes(q);
  });

  // Backend serializes as snake_case (is_default/branch_count/owner_username) — GymDTO's
  // camelCase typing doesn't match the real wire shape, so both keys are checked.
  const isDefaultGym = (gym: GymDTO) => !!((gym as any).isDefault ?? (gym as any).is_default);
  const branchCountOf = (gym: GymDTO): number => Number((gym as any).branchCount ?? (gym as any).branch_count ?? 0);
  const ownerOf = (gym: GymDTO): string | null => (gym as any).ownerUsername ?? (gym as any).owner_username ?? null;

  const statusPill = (status: string) => {
    const kind: PillKind = status === 'ACTIVE' ? 'good'
      : status === 'PROVISIONING' ? 'info'
      : status === 'PROVISION_FAILED' || status === 'SUSPENDED' ? 'bad' : 'neutral';
    const label = status === 'PROVISION_FAILED' ? 'Setup failed' : status === 'PROVISIONING' ? 'Setting up' : status.toLowerCase();
    return <Pill kind={kind}>{label}</Pill>;
  };

  const activeCount = gyms.filter(g => g.status === 'ACTIVE').length;
  const totalBranches = gyms.reduce((sum, g) => sum + branchCountOf(g), 0);

  return (
    <PlatformPage>
      <PageHead
        icon={Dumbbell}
        title="Gym Management"
        subtitle="Gym clients onboarded to the platform — their status, owner login and branches."
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Gym
          </Button>
        }
      />

      <KpiRow cols={4}>
        <Kpi icon={Building2} tone="teal" label="Gyms" value={loading ? '—' : gyms.length} hint="On the platform" />
        <Kpi icon={CheckCircle2} tone="green" label="Active" value={loading ? '—' : activeCount} hint="Open to staff and members" />
        <Kpi icon={XCircle} tone="gray" label="Not active" value={loading ? '—' : gyms.length - activeCount} hint="Inactive, suspended or setting up" />
        <Kpi icon={GitBranch} tone="blue" label="Branches" value={loading ? '—' : totalBranches} hint="Across all gyms" />
      </KpiRow>

      <Panel
        title="Gym clients"
        icon={Dumbbell}
        action={
          <Toolbar>
            <Count n={filteredGyms.length} />
            <SearchField value={searchQuery} onChange={setSearchQuery} placeholder="Search by name or slug…" label="Search gyms" />
          </Toolbar>
        }
      >
        <DataTable head={<>
          <th>Gym</th>
          <th>Slug</th>
          <th className={p.num}>Branches</th>
          <th>Owner login</th>
          <th>Status</th>
          <th className={p.right}>Actions</th>
        </>}>
          {loading ? <StateRow cols={6} loading /> : filteredGyms.map((gym) => (
            <tr key={gym.id}>
              <td data-label="">
                <Entity
                  name={gym.name}
                  seed={gym.slug}
                  badge={isDefaultGym(gym) ? <Pill kind="brand">Default</Pill> : undefined}
                  sub={gym.address ? <><MapPin />{gym.address}</> : <span>No address</span>}
                />
              </td>
              <td data-label="Slug"><span className={`${p.chip} ${p.mono}`}>{gym.slug}</span></td>
              <td data-label="Branches" className={p.num}>{branchCountOf(gym)}</td>
              <td data-label="Owner login">
                {ownerOf(gym)
                  ? <span className={p.mono}>{ownerOf(gym)}</span>
                  : <span className={p.muted} style={{ fontStyle: 'italic', fontSize: '0.75rem' }}>Not issued</span>}
              </td>
              <td data-label="Status">{statusPill(gym.status)}</td>
              <td data-label="">
                {/* BG_60: a TENANT-sourced row can now appear while still PROVISIONING/
                    PROVISION_FAILED (see GymService.toResponseDTO placeholder) — its
                    dedicated database doesn't exist yet, so Edit/status-toggle (which
                    write to that database) are disabled until it's actually provisioned. */}
                <div className={p.rowActions}>
                  <IconAction icon={Edit2} label="Edit gym" onClick={() => openEditModal(gym)} disabled={isProvisioningPlaceholder(gym)} />
                  <span title={gym.status === 'ACTIVE' ? 'Deactivate gym' : 'Activate gym'} style={{ display: 'inline-flex', padding: '0 0.25rem' }}>
                    <Switch
                      checked={gym.status === 'ACTIVE'}
                      onCheckedChange={() => toggleStatus(gym)}
                      disabled={isProvisioningPlaceholder(gym)}
                      aria-label="Toggle Status"
                    />
                  </span>
                  {gym.source === 'TENANT' && !isDefaultGym(gym) && (
                    <IconAction icon={Trash2} label="Delete gym permanently" danger onClick={() => handleDeleteGym(gym)} />
                  )}
                </div>
              </td>
            </tr>
          ))}
          {!loading && filteredGyms.length === 0 && (
            <StateRow cols={6}>{gyms.length === 0 ? 'No gyms yet — add one with Add Gym.' : 'No gyms match your search.'}</StateRow>
          )}
        </DataTable>
      </Panel>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Gym</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddGym} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Gym Name</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. FitZone Downtown"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                required
                value={formData.slug}
                onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase()})}
                placeholder="e.g. fitzone-downtown"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Location</Label>
              <LocationPicker
                id="address"
                value={formData.address}
                onChange={({ address, lat, lng }) => setFormData({...formData, address, lat, lng})}
                placeholder="Search for a city or town..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={e => setFormData({...formData, phone: e.target.value})}
                placeholder="Contact phone"
                maxLength={PHONE_MAX_LENGTH}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                placeholder="Contact email"
              />
            </div>

            <div className="pt-2 border-t">
              <p className="text-sm font-medium text-muted-foreground pt-3 pb-1">Owner Login (optional)</p>
              <p className="text-xs text-muted-foreground pb-3">Leave blank to create the gym without a login — you can issue one later.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerUsername">Owner Username</Label>
              <Input
                id="ownerUsername"
                value={formData.ownerUsername}
                onChange={e => setFormData({...formData, ownerUsername: e.target.value})}
                placeholder="e.g. fitzone_owner"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerEmail">Owner Email</Label>
              <Input
                id="ownerEmail"
                type="email"
                value={formData.ownerEmail}
                onChange={e => setFormData({...formData, ownerEmail: e.target.value})}
                placeholder="Defaults to gym contact email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerPassword">Owner Password</Label>
              <Input
                id="ownerPassword"
                type="password"
                value={formData.ownerPassword}
                onChange={e => setFormData({...formData, ownerPassword: e.target.value})}
                placeholder="Set an initial password"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit">Save Gym</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Gym</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditGym} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Gym Name</Label>
              <Input
                id="edit-name"
                required
                value={editFormData.name}
                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                placeholder="e.g. FitZone Downtown"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input
                id="edit-slug"
                required
                disabled={editingGym?.source === 'TENANT'}
                value={editFormData.slug}
                onChange={(e) => setEditFormData({...editFormData, slug: e.target.value.toLowerCase()})}
                placeholder="e.g. fitzone-downtown"
              />
              {editingGym?.source === 'TENANT' && (
                <p className="text-xs text-muted-foreground">
                  Slug can't be changed for this gym — it identifies its dedicated database.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-address">Location</Label>
              <LocationPicker
                id="edit-address"
                value={editFormData.address}
                onChange={({ address, lat, lng }) => setEditFormData({...editFormData, address, lat, lng})}
                placeholder="Search for a city or town..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editFormData.phone}
                onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                placeholder="Contact phone"
                maxLength={PHONE_MAX_LENGTH}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editFormData.email}
                onChange={e => setEditFormData({...editFormData, email: e.target.value})}
                placeholder="Contact email"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PlatformPage>
  );
}
