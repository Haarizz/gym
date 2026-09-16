// Route: /platform-follow-up
// Super Admin's scheduled follow-ups against platform leads (see platform-leads.tsx
// and platform-lead-service.tsx). A lead can also be approved for onboarding
// directly from here, moving it to Pending Approval.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
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
import {
  CalendarClock,
  CheckCircle,
  AlertCircle,
  Plus,
  Phone,
  Mail,
  Users,
  Building2,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  platformLeadService,
  type PlatformLeadResponse,
  type PlatformFollowUpType,
} from '../utils/supabase/platform-lead-service';

type DerivedStatus = 'PENDING' | 'COMPLETED' | 'OVERDUE';

interface FollowUpRow {
  id: number;
  type: PlatformFollowUpType;
  dueDate: string;
  notes?: string;
  status: DerivedStatus;
  leadId: number;
  leadName: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function deriveStatus(status: string, dueDate: string): DerivedStatus {
  if (status === 'COMPLETED') return 'COMPLETED';
  const due = new Date(dueDate);
  if (!isNaN(due.getTime()) && due.getTime() < Date.now()) return 'OVERDUE';
  return 'PENDING';
}

function getStatusColor(status: DerivedStatus) {
  switch (status) {
    case 'PENDING': return 'bg-yellow-100 text-yellow-800';
    case 'COMPLETED': return 'bg-green-100 text-green-800';
    case 'OVERDUE': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

function typeIcon(type: PlatformFollowUpType) {
  switch (type) {
    case 'CALL': return <Phone className="h-4 w-4 text-blue-600" />;
    case 'EMAIL': return <Mail className="h-4 w-4 text-green-600" />;
    case 'MEETING': return <Users className="h-4 w-4 text-purple-600" />;
  }
}

export function PlatformFollowUp() {
  const location = useLocation();
  const prefill = location.state as { prefillLeadId?: number; prefillLeadName?: string } | null;

  const [leads, setLeads] = useState<PlatformLeadResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [addOpen, setAddOpen] = useState(!!prefill?.prefillLeadId);
  const [saving, setSaving] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [newFollowUp, setNewFollowUp] = useState({
    leadId: prefill?.prefillLeadId ? String(prefill.prefillLeadId) : '',
    type: 'CALL' as PlatformFollowUpType,
    dueDate: '',
    notes: '',
  });

  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const page = await platformLeadService.getByStage('LEAD', { size: 200 });
      setLeads(page.leads);
    } catch (error) {
      console.error('Failed to load leads', error);
      toast.error('Failed to load follow-ups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const followUpRows: FollowUpRow[] = useMemo(() => {
    const rows: FollowUpRow[] = [];
    for (const lead of leads) {
      for (const fu of lead.followUps) {
        rows.push({
          id: fu.id,
          type: fu.type,
          dueDate: fu.dueDate,
          notes: fu.notes,
          status: deriveStatus(fu.status, fu.dueDate),
          leadId: lead.id,
          leadName: lead.businessName || 'Untitled business',
        });
      }
    }
    return rows.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [leads]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return followUpRows;
    return followUpRows.filter(f => f.status === statusFilter);
  }, [followUpRows, statusFilter]);

  const kpis = useMemo(() => ({
    overdue: followUpRows.filter(f => f.status === 'OVERDUE').length,
    pending: followUpRows.filter(f => f.status === 'PENDING').length,
    completed: followUpRows.filter(f => f.status === 'COMPLETED').length,
  }), [followUpRows]);

  const handleComplete = async (row: FollowUpRow) => {
    setCompletingId(row.id);
    try {
      await platformLeadService.completeFollowUp(row.leadId, row.id);
      toast.success('Follow-up marked as completed');
      refresh();
    } catch (error) {
      console.error('Failed to complete follow-up', error);
      toast.error('Failed to update this follow-up');
    } finally {
      setCompletingId(null);
    }
  };

  const handleApprove = async (leadId: number, businessName: string) => {
    setApprovingId(leadId);
    try {
      await platformLeadService.approveForOnboarding(leadId);
      toast.success(`${businessName} moved to Pending Approval`, {
        description: 'Finish creating the gym from the Pending Approval page.',
      });
      refresh();
    } catch (error) {
      console.error('Failed to approve lead', error);
      toast.error('Failed to approve this lead');
    } finally {
      setApprovingId(null);
    }
  };

  const handleAdd = async () => {
    if (!newFollowUp.leadId || !newFollowUp.dueDate) {
      toast.error('Lead and due date are required');
      return;
    }
    setSaving(true);
    try {
      await platformLeadService.addFollowUp(Number(newFollowUp.leadId), {
        type: newFollowUp.type,
        // The <input type="datetime-local"> value ("2026-09-15T14:00") is already
        // local time with no offset — exactly what the backend's
        // LocalDateTime.parse() expects. Converting through
        // `new Date(...).toISOString()` (as this used to) both shifts the value to
        // UTC (silently changing the time the user actually picked) and appends a
        // "Z" suffix LocalDateTime.parse() cannot parse at all, failing every
        // submission with "Invalid due date format" — confirmed live. Only need to
        // pad on seconds since the input omits them.
        dueDate: newFollowUp.dueDate.length === 16 ? `${newFollowUp.dueDate}:00` : newFollowUp.dueDate,
        notes: newFollowUp.notes,
      });
      setAddOpen(false);
      setNewFollowUp({ leadId: '', type: 'CALL', dueDate: '', notes: '' });
      toast.success('Follow-up scheduled');
      refresh();
    } catch (error) {
      console.error('Failed to schedule follow-up', error);
      toast.error('Failed to schedule this follow-up');
    } finally {
      setSaving(false);
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
          <h1 className="text-3xl font-bold">Follow Up</h1>
          <p className="text-muted-foreground">Scheduled touchpoints with prospective gyms.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} disabled={leads.length === 0}>
          <Plus className="mr-2 h-4 w-4" />
          Schedule Follow-up
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Overdue</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.overdue}</div>
            <p className="text-xs text-muted-foreground">Past their due date</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Pending</CardTitle>
            <div className="bg-yellow-50 p-2 rounded-lg">
              <CalendarClock className="h-4 w-4 text-yellow-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{kpis.pending}</div>
            <p className="text-xs text-muted-foreground">Scheduled, not yet due</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Completed</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpis.completed}</div>
            <p className="text-xs text-muted-foreground">Wrapped up</p>
          </CardContent>
        </Card>
      </div>

      <Card className={cardShell}>
        <CardContent className="p-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="OVERDUE">Overdue</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className={cardShell}>
        <CardHeader>
          <CardTitle>Follow-ups ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
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
              {!loading && filtered.map((f) => (
                <TableRow key={f.id} className="platform-table-row transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{f.leadName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 capitalize">
                      {typeIcon(f.type)}
                      {f.type.toLowerCase()}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`text-sm ${f.status === 'OVERDUE' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                      {formatDate(f.dueDate)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground line-clamp-2">{f.notes || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(f.status)}>{f.status.toLowerCase()}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {f.status !== 'COMPLETED' && (
                        <Button size="sm" variant="outline" onClick={() => handleComplete(f)} disabled={completingId === f.id}>
                          {completingId === f.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                          Mark done
                        </Button>
                      )}
                      <Button size="sm" onClick={() => handleApprove(f.leadId, f.leadName)} disabled={approvingId === f.leadId}>
                        {approvingId === f.leadId ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        Approve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {followUpRows.length === 0
                      ? 'No follow-ups scheduled yet.'
                      : 'No follow-ups match this filter.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule a follow-up</DialogTitle>
            <DialogDescription>Set a reminder to reach back out to a lead.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fu-lead">Lead</Label>
              <Select
                value={newFollowUp.leadId}
                onValueChange={(v) => setNewFollowUp(prev => ({ ...prev, leadId: v }))}
              >
                <SelectTrigger id="fu-lead">
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={String(l.id)}>{l.businessName || 'Untitled business'}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fu-type">Type</Label>
                <Select
                  value={newFollowUp.type}
                  onValueChange={(v) => setNewFollowUp(prev => ({ ...prev, type: v as PlatformFollowUpType }))}
                >
                  <SelectTrigger id="fu-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CALL">Call</SelectItem>
                    <SelectItem value="EMAIL">Email</SelectItem>
                    <SelectItem value="MEETING">Meeting</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fu-due">Due date</Label>
                <Input
                  id="fu-due"
                  type="datetime-local"
                  value={newFollowUp.dueDate}
                  onChange={(e) => setNewFollowUp(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fu-notes">Notes</Label>
              <Textarea
                id="fu-notes"
                value={newFollowUp.notes}
                onChange={(e) => setNewFollowUp(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                placeholder="What should be covered in this follow-up?"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default PlatformFollowUp;
