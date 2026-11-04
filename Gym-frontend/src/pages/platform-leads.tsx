// Route: /platform-leads
// Super Admin's sales pipeline for prospective gyms — businesses that submitted
// the "Request a demo" onboarding form on the public pricing page. Backed by the
// real platform-leads API (see platform-lead-service.tsx / PlatformLeadController
// on the backend). A lead is worked here (call/email/schedule follow-up) until
// Super Admin approves it, which moves it to Pending Approval for final gym
// creation.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import {
  Users,
  TrendingUp,
  Target,
  Phone,
  Mail,
  MessageSquare,
  Building2,
  CalendarClock,
  CheckCircle,
  Eye,
  MapPin,
  Briefcase,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  PlatformPage, PageHead, KpiRow, Kpi, Panel, Toolbar, Count, SearchField, DataTable, StateRow,
  Entity, Pill, Chip, IconAction, Section, Facts, p, type PillKind,
} from '../components/platform/platform-ui';
import {
  platformLeadService,
  type PlatformLeadResponse,
  type PlatformLeadStatus,
} from '../utils/supabase/platform-lead-service';

function statusKind(status: PlatformLeadStatus): PillKind {
  switch (status) {
    case 'NEW': return 'info';
    case 'CONTACTED': return 'neutral';
    case 'FOLLOW_UP': return 'warn';
    default: return 'neutral';
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function PlatformLeads() {
  const [records, setRecords] = useState<PlatformLeadResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detail, setDetail] = useState<PlatformLeadResponse | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const page = await platformLeadService.getByStage('LEAD', { size: 200 });
      setRecords(page.leads);
    } catch (error) {
      console.error('Failed to load leads', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return records.filter(l => {
      const matchesTerm = !term ||
        l.businessName.toLowerCase().includes(term) ||
        (l.contactName || '').toLowerCase().includes(term) ||
        (l.contactEmail || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'all' || l.leadStatus === statusFilter;
      return matchesTerm && matchesStatus;
    });
  }, [records, searchTerm, statusFilter]);

  const kpis = useMemo(() => {
    const total = records.length;
    const inFollowUp = records.filter(l => l.leadStatus === 'FOLLOW_UP').length;
    const newCount = records.filter(l => l.leadStatus === 'NEW').length;
    const contacted = records.filter(l => l.leadStatus === 'CONTACTED').length;
    return { total, inFollowUp, newCount, contacted };
  }, [records]);

  const handleApprove = async (record: PlatformLeadResponse) => {
    setApprovingId(record.id);
    try {
      await platformLeadService.approveForOnboarding(record.id);
      toast.success(`${record.businessName} moved to Pending Approval`, {
        description: 'Finish creating the gym from the Pending Approval page.',
      });
      setDetail(null);
      refresh();
    } catch (error) {
      console.error('Failed to approve lead', error);
      toast.error('Failed to approve this lead');
    } finally {
      setApprovingId(null);
    }
  };

  const handleContacted = async (record: PlatformLeadResponse) => {
    if (record.leadStatus !== 'NEW') return;
    try {
      await platformLeadService.updateLeadStatus(record.id, 'CONTACTED');
      refresh();
    } catch (error) {
      console.error('Failed to update lead status', error);
    }
  };

  return (
    <PlatformPage>
      <PageHead
        icon={Target}
        title="Leads"
        subtitle="Prospective gyms that requested a demo, tracked from first contact to approval."
      />

      <KpiRow cols={4}>
        <Kpi icon={Users} tone="teal" label="Active leads" value={loading ? '—' : kpis.total} hint="Prospective gyms in progress" />
        <Kpi icon={Target} tone="blue" label="New" value={loading ? '—' : kpis.newCount} hint="Not yet contacted"
          onClick={() => setStatusFilter(statusFilter === 'NEW' ? 'all' : 'NEW')} title="Show only new leads" />
        <Kpi icon={Phone} tone="gray" label="Contacted" value={loading ? '—' : kpis.contacted} hint="Reached at least once"
          onClick={() => setStatusFilter(statusFilter === 'CONTACTED' ? 'all' : 'CONTACTED')} title="Show only contacted leads" />
        <Kpi icon={CalendarClock} tone="amber" label="In follow-up" value={loading ? '—' : kpis.inFollowUp} hint="Needs a next touchpoint"
          onClick={() => setStatusFilter(statusFilter === 'FOLLOW_UP' ? 'all' : 'FOLLOW_UP')} title="Show only leads in follow-up" />
      </KpiRow>

      <Panel
        title="Pipeline"
        icon={Building2}
        action={
          <Toolbar>
            <Count n={filtered.length} />
            <SearchField value={searchTerm} onChange={setSearchTerm} placeholder="Search business, contact or email…" label="Search leads" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]" aria-label="Status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </Toolbar>
        }
      >
        <DataTable head={<>
          <th>Business</th>
          <th>Plan interest</th>
          <th>Contact</th>
          <th>Status</th>
          <th>Created</th>
          <th className={p.right}>Actions</th>
        </>}>
          {loading ? <StateRow cols={6} loading /> : filtered.map((l) => (
            <tr key={l.id} data-clickable="true" onClick={() => setDetail(l)}>
              <td data-label="">
                <Entity name={l.businessName || 'Untitled business'} seed={String(l.id)}
                  sub={l.country ? <><MapPin />{l.country}</> : undefined} />
              </td>
              <td data-label="Plan interest">{l.planInterest ? <Chip>{l.planInterest}</Chip> : <span className={p.muted}>—</span>}</td>
              <td data-label="Contact">
                <div className={p.stack}>
                  <span>{l.contactName || '—'}</span>
                  <span className={p.entitySub}><Mail />{l.contactEmail || '—'}</span>
                </div>
              </td>
              <td data-label="Status"><Pill kind={statusKind(l.leadStatus)}>{l.leadStatus.replace('_', ' ').toLowerCase()}</Pill></td>
              <td data-label="Created" className={p.muted}>{formatDate(l.createdAt)}</td>
              <td data-label="">
                <div className={p.rowActions}>
                  <IconAction icon={Eye} label="View details" onClick={() => setDetail(l)} />
                  <IconAction icon={Phone} label={l.contactPhone ? `Call ${l.contactPhone}` : 'No phone number'} disabled={!l.contactPhone}
                    onClick={() => { handleContacted(l); window.open(`tel:${l.contactPhone}`); }} />
                  <IconAction icon={Mail} label={l.contactEmail ? `Email ${l.contactEmail}` : 'No email'} disabled={!l.contactEmail}
                    onClick={() => { handleContacted(l); window.open(`mailto:${l.contactEmail}`); }} />
                  <IconAction icon={MessageSquare} label="Schedule follow-up"
                    onClick={() => navigate('/platform-follow-up', { state: { prefillLeadId: l.id, prefillLeadName: l.businessName } })} />
                  <Button size="sm" onClick={(e) => { e.stopPropagation(); handleApprove(l); }} disabled={approvingId === l.id} title="Approve for onboarding">
                    {approvingId === l.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                    Approve
                  </Button>
                </div>
              </td>
            </tr>
          ))}
          {!loading && filtered.length === 0 && (
            <StateRow cols={6}>
              {records.length === 0
                ? 'No leads yet — they appear here when someone completes the onboarding form on the pricing page.'
                : 'No leads match your search.'}
            </StateRow>
          )}
        </DataTable>
      </Panel>

      <Sheet open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="w-full sm:w-[600px] sm:max-w-none overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle>
                  <Entity name={detail.businessName || 'Untitled business'} seed={String(detail.id)}
                    sub={<Pill kind={statusKind(detail.leadStatus)}>{detail.leadStatus.replace('_', ' ').toLowerCase()}</Pill>} />
                </SheetTitle>
              </SheetHeader>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem', marginTop: '1.25rem' }}>
                <Section icon={Users} title="Contact">
                  <Facts rows={[
                    ['Name', detail.contactName],
                    ['Email', detail.contactEmail],
                    ['Phone', detail.contactPhone],
                    ['WhatsApp', detail.contactWhatsapp],
                  ]} />
                </Section>

                <Section icon={Briefcase} title="Business">
                  <Facts rows={[
                    ['Plan interest', detail.planInterest],
                    ['Years in business', detail.yearsInBusiness],
                    ['Branches', detail.branches],
                    ['Members', detail.memberCount],
                    ['Staff', detail.staffCount],
                    ...(detail.businessTypes.length > 0
                      ? [['Business type', <div className={p.chips}>{detail.businessTypes.map(t => <Chip key={t}>{t}</Chip>)}</div>] as [string, React.ReactNode]]
                      : []),
                  ]} />
                </Section>

                <Section icon={MapPin} title="Location">
                  <Facts rows={[
                    ['Country', detail.country],
                    ['State', detail.state],
                    ['City / area', detail.cityArea],
                    ['Address', detail.address],
                  ]} />
                </Section>

                {(detail.services.length > 0 || detail.goals.length > 0 || detail.currentSoftware) && (
                  <Section icon={TrendingUp} title="Services & goals">
                    <Facts rows={[
                      ...(detail.services.length > 0 ? [['Services', <div className={p.chips}>{detail.services.map(x => <Chip key={x}>{x}</Chip>)}</div>] as [string, React.ReactNode]] : []),
                      ...(detail.goals.length > 0 ? [['Goals', <div className={p.chips}>{detail.goals.map(g => <Chip key={g}>{g}</Chip>)}</div>] as [string, React.ReactNode]] : []),
                      ...(detail.currentSoftware ? [['Current software', detail.currentSoftware] as [string, React.ReactNode]] : []),
                    ]} />
                  </Section>
                )}

                {detail.notes && (
                  <Section title="Notes">
                    <p className={p.note} style={{ margin: 0 }}>{detail.notes}</p>
                  </Section>
                )}

                {detail.followUps.length > 0 && (
                  <Section icon={CalendarClock} title="Follow-up history">
                    <div className={p.timeline}>
                      {detail.followUps.map(fu => (
                        <div key={fu.id} className={p.timelineItem}>
                          <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{fu.type.toLowerCase()} · {formatDate(fu.dueDate)}</div>
                          <div className={p.muted}>{fu.notes || 'No notes'}</div>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}

                <Button className="w-full" onClick={() => handleApprove(detail)} disabled={approvingId === detail.id}>
                  {approvingId === detail.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Approve for onboarding
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </PlatformPage>
  );
}

export default PlatformLeads;
