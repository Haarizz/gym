// Route: /platform-follow-up
// Super Admin's scheduled follow-ups against platform leads (see platform-leads.tsx
// and platform-lead-service.tsx). A lead can also be approved for onboarding
// directly from here, moving it to Pending Approval.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PlatformPage, PageHead, KpiRow, Kpi, Panel, Toolbar, Count, SearchField, DataTable, StateRow, Entity, Pill, p, type PillKind,
} from '../components/platform/platform-ui';
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

function statusKind(status: DerivedStatus): PillKind {
  switch (status) {
    case 'PENDING': return 'warn';
    case 'COMPLETED': return 'good';
    case 'OVERDUE': return 'bad';
    default: return 'neutral';
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
  const [search, setSearch] = useState('');
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
    const q = search.trim().toLowerCase();
    return followUpRows.filter(f =>
      (statusFilter === 'all' || f.status === statusFilter) && (!q || f.leadName.toLowerCase().includes(q)));
  }, [followUpRows, statusFilter, search]);

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
    <PlatformPage>
      <PageHead
        icon={CalendarClock}
        title="Follow Up"
        subtitle="Scheduled touchpoints with prospective gyms — calls, emails and meetings."
        actions={
          <Button onClick={() => setAddOpen(true)} disabled={leads.length === 0}>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Follow-up
          </Button>
        }
      />

      <KpiRow cols={3}>
        <Kpi icon={AlertCircle} tone="red" label="Overdue" value={loading ? '—' : kpis.overdue} hint="Past their due date"
          onClick={() => setStatusFilter(statusFilter === 'OVERDUE' ? 'all' : 'OVERDUE')} title="Show only overdue follow-ups" />
        <Kpi icon={CalendarClock} tone="amber" label="Pending" value={loading ? '—' : kpis.pending} hint="Scheduled, not yet due"
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'all' : 'PENDING')} title="Show only pending follow-ups" />
        <Kpi icon={CheckCircle} tone="green" label="Completed" value={loading ? '—' : kpis.completed} hint="Wrapped up"
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'all' : 'COMPLETED')} title="Show only completed follow-ups" />
      </KpiRow>

      <Panel
        title="Follow-ups"
        icon={CalendarClock}
        action={
          <Toolbar>
            <Count n={filtered.length} />
            <SearchField value={search} onChange={setSearch} placeholder="Search by lead…" label="Search follow-ups" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" aria-label="Status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="COMPLETED">Completed</SelectItem>
              </SelectContent>
            </Select>
          </Toolbar>
        }
      >
        <DataTable head={<>
          <th>Lead</th>
          <th>Type</th>
          <th>Due</th>
          <th>Notes</th>
          <th>Status</th>
          <th className={p.right}>Actions</th>
        </>}>
          {loading ? <StateRow cols={6} loading /> : filtered.map((f) => (
            <tr key={f.id}>
              <td data-label=""><Entity name={f.leadName} seed={String(f.leadId)} /></td>
              <td data-label="Type">
                <span className={p.chip} style={{ textTransform: 'capitalize' }}>{typeIcon(f.type)}{f.type.toLowerCase()}</span>
              </td>
              <td data-label="Due">
                <span style={f.status === 'OVERDUE' ? { color: '#dc2626', fontWeight: 600 } : undefined} className={f.status === 'OVERDUE' ? undefined : p.muted}>
                  {formatDate(f.dueDate)}
                </span>
              </td>
              <td data-label="Notes"><span className={`${p.muted} ${p.clamp}`}>{f.notes || '—'}</span></td>
              <td data-label="Status"><Pill kind={statusKind(f.status)}>{f.status.toLowerCase()}</Pill></td>
              <td data-label="">
                <div className={p.rowActions}>
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
              </td>
            </tr>
          ))}
          {!loading && filtered.length === 0 && (
            <StateRow cols={6}>
              {followUpRows.length === 0 ? 'No follow-ups scheduled yet.' : 'No follow-ups match this filter.'}
            </StateRow>
          )}
        </DataTable>
      </Panel>

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
    </PlatformPage>
  );
}

export default PlatformFollowUp;
