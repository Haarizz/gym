import React, { useState, useEffect } from 'react';
import { Plus, Edit2, CheckCircle2, XCircle, Search, Building2, Users } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { branchApi, BranchDTO } from '../utils/supabase/branch-service';
import { useBranch } from '../utils/branch-context';

export function BranchManagement() {
  const [branches, setBranches] = useState<BranchDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    branch_name: '',
    branch_code: '',
    address: '',
    phone: '',
    email: '',
    status: 'ACTIVE'
  });

  const loadBranches = async () => {
    try {
      const data = await branchApi.getAllBranches();
      setBranches(data);
    } catch (error) {
      console.error('Failed to load branches', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const { refreshBranches } = useBranch();
  const handleAddBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await branchApi.createBranch(formData);
      setShowAddModal(false);
      setFormData({ branch_name: '', branch_code: '', address: '', phone: '', email: '', status: 'ACTIVE' });
      loadBranches();
      await refreshBranches();
    } catch (error: any) {
      console.error('Failed to add branch', error);
      const msg = error.response?.data?.message || error.message || 'Code must be unique.';
      alert(`Failed to add branch. ${msg}`);
    }
  };

  const toggleStatus = async (id: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await branchApi.updateBranchStatus(id, newStatus);
      loadBranches();
    } catch (error) {
      console.error('Failed to update status', error);
    }
  };

  const filteredBranches = branches.filter(b => {
    const name = b.branch_name || b.name || '';
    const code = b.branch_code || b.code || '';
    const q = searchQuery || '';
    return name.toLowerCase().includes(q.toLowerCase()) || 
           code.toLowerCase().includes(q.toLowerCase());
  });

  if (loading) return <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Branch Management</h1>
          <p className="text-muted-foreground">Manage gym locations and assignments</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Branch
        </Button>
      </div>

      <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center">
              <Building2 className="w-5 h-5 mr-2 text-primary" />
              Active Locations
            </CardTitle>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search branches..." 
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
                <TableHead>Branch Name</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBranches.map((branch) => (
                <TableRow key={branch.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="bg-primary/10 p-2 rounded-lg text-primary">
                        {(branch.branch_code || branch.code || 'BR').substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-medium">{branch.branch_name || branch.name}</span>
                      {branch.is_default && <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 ml-2">Default</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono">{branch.branch_code || branch.code}</TableCell>
                  <TableCell className="text-muted-foreground">{branch.address || '-'}</TableCell>
                  <TableCell>
                    <Badge variant={branch.status === 'ACTIVE' ? "default" : "destructive"} className={branch.status === 'ACTIVE' ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20" : ""}>
                      {branch.status === 'ACTIVE' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                      {branch.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={branch.status === 'ACTIVE'}
                      onCheckedChange={() => toggleStatus(branch.id, branch.status)}
                      aria-label="Toggle Status"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {filteredBranches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No branches found matching your search.
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
            <DialogTitle>Add New Branch</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddBranch} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="branch_name">Branch Name</Label>
              <Input 
                id="branch_name"
                required
                value={formData.branch_name}
                onChange={(e) => setFormData({...formData, branch_name: e.target.value})}
                placeholder="e.g. Downtown Center"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch_code">Branch Code</Label>
              <Input 
                id="branch_code"
                required
                value={formData.branch_code}
                onChange={(e) => setFormData({...formData, branch_code: e.target.value.toUpperCase()})}
                className="uppercase"
                placeholder="e.g. NYC"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input 
                id="address"
                value={formData.address}
                onChange={e => setFormData({...formData, address: e.target.value})}
                placeholder="Full address"
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button type="submit">Save Branch</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
