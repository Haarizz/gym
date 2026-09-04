import React, { useState, useEffect } from 'react';
import { Plus, Edit2, CheckCircle2, XCircle, Search, Dumbbell } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { LocationPicker } from "../components/shared/location-picker";
import { gymApi, GymDTO } from '../utils/supabase/gym-service';

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

  const handleEditGym = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGym) return;
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
      alert(`Failed to update gym. ${msg}`);
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

  const filteredGyms = gyms.filter(g => {
    const q = searchQuery || '';
    return g.name.toLowerCase().includes(q.toLowerCase()) ||
           g.slug.toLowerCase().includes(q.toLowerCase());
  });

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gym Management</h1>
          <p className="text-muted-foreground">Manage gym clients onboarded to the platform</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Gym
        </Button>
      </div>

      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center">
              <Dumbbell className="w-5 h-5 mr-2 text-primary" />
              Gym Clients
            </CardTitle>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search gyms..."
              className="pl-10 bg-background/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="hover:bg-transparent">
                <TableHead>Gym Name</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead>Owner Login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredGyms.map((gym) => (
                <TableRow key={gym.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        {gym.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{gym.name}</span>
                      {/* Backend serializes as snake_case (is_default/branch_count/owner_username) — GymDTO's
                          camelCase typing doesn't match the real wire shape, so both keys are checked. */}
                      {((gym as any).isDefault ?? (gym as any).is_default) && <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 ml-2">Default</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono">{gym.slug}</TableCell>
                  <TableCell className="text-muted-foreground">{gym.address || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">{(gym as any).branchCount ?? (gym as any).branch_count ?? 0}</TableCell>
                  <TableCell className="text-muted-foreground font-mono">
                    {((gym as any).ownerUsername ?? (gym as any).owner_username)
                      ? ((gym as any).ownerUsername ?? (gym as any).owner_username)
                      : <span className="italic text-xs">Not issued</span>}
                  </TableCell>
                  <TableCell>
                    <Badge variant={gym.status === 'ACTIVE' ? "default" : "destructive"} className={gym.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : ""}>
                      {gym.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {gym.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => openEditModal(gym)}
                        aria-label="Edit gym"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Switch
                        checked={gym.status === 'ACTIVE'}
                        onCheckedChange={() => toggleStatus(gym)}
                        aria-label="Toggle Status"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredGyms.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No gyms found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
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
        <DialogContent className="sm:max-w-md">
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
    </div>
  );
}
