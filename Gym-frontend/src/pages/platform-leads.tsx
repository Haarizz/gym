// Route: /platform-leads
// Super Admin's sales pipeline for prospective gyms — businesses that submitted
// the "Request a demo" onboarding form on the public pricing page. Backed by the
// real platform-leads API (see platform-lead-service.tsx / PlatformLeadController
// on the backend). A lead is worked here (call/email/schedule follow-up) until
// Super Admin approves it, which moves it to Pending Approval for final gym
// creation.
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../components/ui/sheet';
import {
  Users,
  TrendingUp,
  Target,
  Search,
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
  platformLeadService,
  type PlatformLeadResponse,
  type PlatformLeadStatus,
} from '../utils/supabase/platform-lead-service';

function getStatusColor(status: PlatformLeadStatus) {
  switch (status) {
    case 'NEW': return 'bg-blue-100 text-blue-800';
    case 'CONTACTED': return 'bg-yellow-100 text-yellow-800';
    case 'FOLLOW_UP': return 'bg-orange-100 text-orange-800';
    default: return 'bg-gray-100 text-gray-800';
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

  const cardShell = "border-primary/10 shadow-md hover:shadow-lg transition-shadow";

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
    return { total, inFollowUp, newCount };
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
    <div className="p-6 space-y-6">
      <style>{`
        .platform-table-row:hover {
          background-color: #f1f5f9;
        }
      `}</style>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Leads</h1>
          <p className="text-muted-foreground">Prospective gyms that requested a demo, tracked from first contact to approval.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Leads</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{kpis.total}</div>
            <p className="text-xs text-muted-foreground">Prospective gyms in progress</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">New</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Target className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpis.newCount}</div>
            <p className="text-xs text-muted-foreground">Not yet contacted</p>
          </CardContent>
        </Card>

        <Card className={cardShell}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">In Follow-up</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <CalendarClock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{kpis.inFollowUp}</div>
            <p className="text-xs text-muted-foreground">Needs a next touchpoint</p>
          </CardContent>
        </Card>
      </div>

      <Card className={cardShell}>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by business, contact, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="FOLLOW_UP">Follow-up</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className={cardShell}>
        <CardHeader>
          <CardTitle>Leads ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Plan Interest</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
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
              {!loading && filtered.map((l) => (
                <TableRow key={l.id} className="platform-table-row transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{l.businessName || 'Untitled business'}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{l.planInterest}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{l.contactName || '—'}</p>
                    <p className="text-xs text-muted-foreground">{l.contactEmail || '—'}</p>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(l.leadStatus)}>{l.leadStatus.replace('_', ' ')}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{formatDate(l.createdAt)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setDetail(l)} title="View details">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { handleContacted(l); window.open(`tel:${l.contactPhone}`); }}
                        title="Call"
                      >
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { handleContacted(l); window.open(`mailto:${l.contactEmail}`); }}
                        title="Email"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="Schedule follow-up"
                        onClick={() => navigate('/platform-follow-up', { state: { prefillLeadId: l.id, prefillLeadName: l.businessName } })}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => handleApprove(l)} disabled={approvingId === l.id} title="Approve for onboarding">
                        {approvingId === l.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                        Approve
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {records.length === 0
                      ? 'No leads yet — they appear here when someone completes the onboarding form on the pricing page.'
                      : 'No leads match your search.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Sheet open={!!detail} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="w-full sm:w-[600px] sm:max-w-none overflow-y-auto">
          {detail && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  {detail.businessName || 'Untitled business'}
                </SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Name:</span> {detail.contactName || '—'}</p>
                    <p><span className="text-muted-foreground">Email:</span> {detail.contactEmail || '—'}</p>
                    <p><span className="text-muted-foreground">Phone:</span> {detail.contactPhone || '—'}</p>
                    <p><span className="text-muted-foreground">WhatsApp:</span> {detail.contactWhatsapp || '—'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Business
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Plan interest:</span> {detail.planInterest}</p>
                    <p><span className="text-muted-foreground">Years in business:</span> {detail.yearsInBusiness || '—'}</p>
                    <p><span className="text-muted-foreground">Branches:</span> {detail.branches || '—'}</p>
                    <p><span className="text-muted-foreground">Members:</span> {detail.memberCount || '—'}</p>
                    <p><span className="text-muted-foreground">Staff:</span> {detail.staffCount || '—'}</p>
                    {detail.businessTypes.length > 0 && (
                      <div>
                        <p className="text-muted-foreground mb-1">Business type</p>
                        <div className="flex flex-wrap gap-1">
                          {detail.businessTypes.map(t => <Badge key={t} variant="outline">{t}</Badge>)}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4" /> Location
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Country:</span> {detail.country || '—'}</p>
                    <p><span className="text-muted-foreground">State:</span> {detail.state || '—'}</p>
                    <p><span className="text-muted-foreground">City / area:</span> {detail.cityArea || '—'}</p>
                    <p><span className="text-muted-foreground">Address:</span> {detail.address || '—'}</p>
                  </CardContent>
                </Card>

                {(detail.services.length > 0 || detail.goals.length > 0 || detail.reasonsToSwitch.length > 0) && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Services & goals</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {detail.services.length > 0 && (
                        <div>
                          <p className="text-muted-foreground mb-1">Services</p>
                          <div className="flex flex-wrap gap-1">
                            {detail.services.map(s => <Badge key={s} variant="outline">{s}</Badge>)}
                          </div>
                        </div>
                      )}
                      {detail.goals.length > 0 && (
                        <div>
                          <p className="text-muted-foreground mb-1">Goals</p>
                          <div className="flex flex-wrap gap-1">
                            {detail.goals.map(g => <Badge key={g} variant="outline">{g}</Badge>)}
                          </div>
                        </div>
                      )}
                      {detail.currentSoftware && (
                        <p><span className="text-muted-foreground">Current software:</span> {detail.currentSoftware}</p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {detail.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Notes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm bg-muted/50 rounded-md p-3">{detail.notes}</p>
                    </CardContent>
                  </Card>
                )}

                {detail.followUps.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Follow-up history</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {detail.followUps.map(fu => (
                        <div key={fu.id} className="text-sm border rounded-lg p-2">
                          <p className="font-medium capitalize">{fu.type.toLowerCase()} — {formatDate(fu.dueDate)}</p>
                          <p className="text-muted-foreground">{fu.notes || 'No notes'}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
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
    </div>
  );
}

export default PlatformLeads;
