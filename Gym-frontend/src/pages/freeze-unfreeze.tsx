import React, { useState, useEffect } from 'react';
import { membersService, Member } from '../utils/supabase/members-service';
import { CurrencyGlyph } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent } from "../components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Calendar } from "../components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  Snowflake,
  Calendar as CalendarIcon,
  Clock,
  User,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  RefreshCw,
  Sun,
  BarChart3,
  X,
} from 'lucide-react';
import { format, differenceInDays } from "date-fns";
import { Avatar, AvatarFallback } from "../components/ui/avatar";

interface FreezeUnfreezeProps {
  onNavigate?: (section: string) => void;
}

export function FreezeUnfreeze({ onNavigate }: FreezeUnfreezeProps) {
    const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [freezeStartDate, setFreezeStartDate] = useState<Date | undefined>(undefined);
  const [freezeEndDate, setFreezeEndDate] = useState<Date | undefined>(undefined);
  const [autoUnfreeze, setAutoUnfreeze] = useState(true);
  const [freezeNotes, setFreezeNotes] = useState('');
  const [filterStatus, setFilterStatus] = useState('frozen');
  const [showFreezeHistory, setShowFreezeHistory] = useState(false);
  const [selectedMemberHistory, setSelectedMemberHistory] = useState<any>(null);
  const [frozenMembers, setFrozenMembers] = useState<Member[]>([]);
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load frozen members from API
  const loadFrozenMembers = async () => {
    try {
      const res = await membersService.getMembers({ status: 'frozen' }, { limit: 100 });
      setFrozenMembers(res.members);
    } catch {
      // silently fail — show empty list
    }
  };

  useEffect(() => { loadFrozenMembers(); }, []);

  // Search active members as user types
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    membersService.searchMembers(searchQuery).then(setSearchResults).catch(() => {});
  }, [searchQuery]);

  const calculateFreezeDays = () => {
    if (!freezeStartDate || !freezeEndDate) return 0;
    return differenceInDays(freezeEndDate, freezeStartDate) + 1;
  };

  const totalDays = calculateFreezeDays();

  // Days a member has been frozen so far — from freeze_start_date up to now
  // (or freeze_end_date, if that's already passed).
  const daysFrozenSoFar = (m: Member): number => {
    if (!m.freeze_start_date) return 0;
    const start = new Date(m.freeze_start_date);
    const scheduledEnd = m.freeze_end_date ? new Date(m.freeze_end_date) : null;
    const end = scheduledEnd && scheduledEnd < new Date() ? scheduledEnd : new Date();
    return Math.max(0, differenceInDays(end, start));
  };
  const totalFrozenDays = frozenMembers.reduce((acc, m) => acc + daysFrozenSoFar(m), 0);
  const endingSoonCount = frozenMembers.filter(m => {
    if (!m.freeze_end_date) return false;
    const end = new Date(m.freeze_end_date);
    return end >= new Date() && differenceInDays(end, new Date()) <= 7;
  }).length;

  const filteredMembers = frozenMembers.filter((member) => {
    if (!searchQuery) return true;
    return (
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (member.member_id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery)
    );
  });

  const handleFreezeMembership = async () => {
    if (!selectedMember || !freezeStartDate || !freezeEndDate) {
      toast.error('Please fill all required fields');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fStart = new Date(freezeStartDate);
    fStart.setHours(0, 0, 0, 0);

    const mStartStr = selectedMember.membership_start_date || selectedMember.join_date;
    if (mStartStr) {
      const mStart = new Date(mStartStr);
      mStart.setHours(0, 0, 0, 0);
      if (fStart < mStart) {
        toast.error('Freeze start date cannot be before the membership start date');
        return;
      }
    }

    if (fStart < today) {
      toast.error('Freeze start date cannot be in the past');
      return;
    }

    if (freezeStartDate >= freezeEndDate) {
      toast.error('End date must be after start date');
      return;
    }
    setIsSubmitting(true);
    try {
      const freezeUntil = freezeEndDate.toISOString().split('T')[0] + 'T00:00:00Z';
      const freezeStart = freezeStartDate.toISOString().split('T')[0] + 'T00:00:00Z';
      await membersService.freezeMember(String(selectedMember.id), {
        freezeUntil,
        freezeStartDate: freezeStart,
        reason: freezeNotes || undefined,
      });
      toast.success(`Membership frozen for ${selectedMember.name}`, {
        description: `${totalDays} days until ${format(freezeEndDate, 'dd MMM yyyy')}`,
      });
      setSelectedMember(null);
      setFreezeStartDate(undefined);
      setFreezeEndDate(undefined);
      setFreezeNotes('');
      setSearchQuery('');
      setSearchResults([]);
      await loadFrozenMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to freeze membership. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnfreeze = async (member: any) => {
    try {
      await membersService.unfreezeMember(String(member.id));
      toast.success(`Membership unfrozen for ${member.name}`, { description: 'Member status updated to Active' });
      await loadFrozenMembers();
    } catch {
      toast.error('Failed to unfreeze membership. Please try again.');
    }
  };

  const initials = (name: string) => name.split(' ').map((n) => n[0]).join('');

  return (
    <div className="min-h-screen bg-background">
      {/* ── Page Header ── */}
      <div className="border-b bg-white">
        <div className="p-6">
          <div className="flex items-center justify-between mb-5">
            <Button variant="ghost" size="sm" onClick={() => onNavigate?.('members')} className="gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Back to Members
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary shadow-sm shrink-0">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">Freeze / Unfreeze Memberships</h1>
              <p className="text-sm text-muted-foreground">Manage membership freeze requests with plan-based limits and automated notifications</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* ── Summary Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Total Frozen', value: frozenMembers.length, sub: 'Active freeze requests', icon: <Snowflake className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-100' },
            { label: 'Ending Soon', value: endingSoonCount, sub: 'Within the next 7 days', icon: <RefreshCw className="h-5 w-5 text-green-600" />, bg: 'bg-green-100' },
            { label: 'Total Days', value: totalFrozenDays, sub: 'Across all members', icon: <Clock className="h-5 w-5 text-orange-600" />, bg: 'bg-orange-100' },
            { label: 'Avg Duration', value: frozenMembers.length > 0 ? `${Math.round(totalFrozenDays / frozenMembers.length)} days` : '0 days', sub: 'Per frozen member', icon: <BarChart3 className="h-5 w-5 text-purple-600" />, bg: 'bg-purple-100' },
          ].map(({ label, value, sub, icon, bg }) => (
            <Card key={label} className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
                <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Main Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left — Freeze Member Form */}
          <div className="lg:col-span-1">
            <Card className="border-primary/10 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Snowflake className="h-5 w-5 text-primary" />
                  Freeze Member
                </CardTitle>
                <CardDescription>Search and freeze a member's membership</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Search */}
                <div className="space-y-2">
                  <Label>Search Member</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Name, ID, Phone or Email…"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setSelectedMember(null); }}
                      className="pl-10"
                    />
                  </div>

                  {/* Dropdown results */}
                  {searchQuery && searchResults.length > 0 && !selectedMember && (
                    <div className="rounded-xl border shadow-md overflow-hidden max-h-60 overflow-y-auto bg-white">
                      {searchResults.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => { setSelectedMember(member); setSearchQuery(member.name); }}
                          className="w-full px-3 py-2.5 hover:bg-muted/50 text-left transition-colors flex items-center gap-3 border-b last:border-0"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary text-white text-xs">{initials(member.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.member_id || member.id} · {member.membership_plan}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 border-green-200">
                            {member.membership_status}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected member card */}
                {selectedMember && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 overflow-hidden">
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-blue-100">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-700 text-white text-sm">{initials(selectedMember.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{selectedMember.name}</p>
                        <p className="text-xs text-muted-foreground">{selectedMember.id}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="shrink-0 h-7 w-7 p-0" onClick={() => { setSelectedMember(null); setSearchQuery(''); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2">
                      <div className="px-4 py-2.5 border-r border-blue-100">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Plan</p>
                        <p className="text-xs font-semibold">{selectedMember.membership_plan || selectedMember.planName || '—'}</p>
                      </div>
                      <div className="px-4 py-2.5">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                          {selectedMember.membership_status || selectedMember.status || '—'}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 border-t border-blue-100">
                      <div className="px-4 py-2.5 border-r border-blue-100">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Member ID</p>
                        <p className="text-xs font-semibold text-primary">{selectedMember.member_id || selectedMember.id}</p>
                      </div>
                      <div className="px-4 py-2.5">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                        <p className="text-xs font-semibold">{selectedMember.phone || '—'}</p>
                      </div>
                    </div>
                    <div className="px-4 py-2.5 border-t border-blue-100 bg-blue-50/60">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                      <p className="text-xs font-semibold text-primary break-all">
                        {selectedMember.email && !selectedMember.email.includes('@family.local') ? selectedMember.email : 'Not added'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Freeze Dates */}
                {selectedMember && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">Start Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left text-xs h-9">
                              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                              {freezeStartDate ? format(freezeStartDate, 'dd MMM yyyy') : 'Select date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={freezeStartDate} onSelect={setFreezeStartDate} disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))} />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-medium">End Date *</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className="w-full justify-start text-left text-xs h-9">
                              <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                              {freezeEndDate ? format(freezeEndDate, 'dd MMM yyyy') : 'Select date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={freezeEndDate} onSelect={setFreezeEndDate} disabled={(date) => !freezeStartDate || date <= freezeStartDate} />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Freeze Summary */}
                    {freezeStartDate && freezeEndDate && (
                      <div className="rounded-xl border bg-muted/30 overflow-hidden">
                        <div className="h-0.5 bg-gradient-to-r from-blue-400 to-primary" />
                        <div className="px-4 py-3 space-y-2">
                          {[
                            { label: 'Total Days', value: `${totalDays} days`, color: 'text-foreground' },
                            { label: 'From', value: freezeStartDate ? format(freezeStartDate, 'dd MMM yyyy') : '—', color: 'text-green-600' },
                            { label: 'Until', value: freezeEndDate ? format(freezeEndDate, 'dd MMM yyyy') : '—', color: 'text-primary' },
                          ].map(({ label, value, color }) => (
                            <div key={label} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{label}</span>
                              <span className={`font-semibold ${color}`}>{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Auto Unfreeze toggle */}
                    <div className="flex items-center justify-between rounded-xl border px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">Auto Unfreeze on End Date</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Activate membership on {freezeEndDate ? format(freezeEndDate, 'dd MMM yyyy') : 'end date'}
                        </p>
                      </div>
                      <Switch checked={autoUnfreeze} onCheckedChange={setAutoUnfreeze} />
                    </div>

                    {/* Notes */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Notes <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      <Textarea
                        placeholder="Add reason or notes for this freeze…"
                        value={freezeNotes}
                        onChange={(e) => setFreezeNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <Button
                      onClick={handleFreezeMembership}
                      className="w-full gap-2"
                      variant="destructive"
                      disabled={!freezeStartDate || !freezeEndDate || isSubmitting}
                    >
                      <Snowflake className="h-4 w-4" />
                      Freeze Membership
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right — Frozen Members Table */}
          <div className="lg:col-span-2">
            <Card className="border-primary/10 shadow-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Sun className="h-5 w-5 text-primary" />
                      Currently Frozen Members
                    </CardTitle>
                    <CardDescription>View and manage all frozen memberships</CardDescription>
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      <SelectItem value="frozen">Frozen</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search frozen members…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Member</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Freeze Period</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((member: any) => {
                          const freezeStart = member.freeze_start_date ? new Date(member.freeze_start_date) : null;
                          const freezeEnd = member.freeze_end_date ? new Date(member.freeze_end_date) : null;
                          const daysFrozen = freezeStart && freezeEnd ? differenceInDays(freezeEnd, freezeStart) + 1 : 0;
                          return (
                            <TableRow key={member.id} className="hover:bg-slate-50/50 transition-colors">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-8 w-8 shrink-0">
                                    <AvatarFallback className="bg-primary text-white text-xs">{initials(member.name)}</AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">{member.name}</p>
                                    <p className="text-xs text-muted-foreground">{member.member_id || member.id}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm">{member.membership_plan || '—'}</TableCell>
                              <TableCell>
                                <div className="text-xs">
                                  {freezeStart && <p className="font-medium">{format(freezeStart, 'dd MMM yyyy')}</p>}
                                  {freezeEnd && <p className="text-muted-foreground">→ {format(freezeEnd, 'dd MMM yyyy')}</p>}
                                  {!freezeStart && <p className="text-muted-foreground">—</p>}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-blue-100 text-blue-700 border-blue-200">{daysFrozen}d</Badge>
                              </TableCell>
                              <TableCell>
                                {member.freeze_reason ? (
                                  <span className="text-xs text-muted-foreground">{member.freeze_reason}</span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1"
                                    onClick={() => { setSelectedMemberHistory(member); setShowFreezeHistory(true); }}
                                  >
                                    <Eye className="h-3 w-3" />History
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1 border-green-300 text-green-700 hover:bg-green-50"
                                    onClick={() => handleUnfreeze(member)}
                                  >
                                    <Sun className="h-3 w-3" />Unfreeze
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                            <Snowflake className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
                            <p className="text-sm">No frozen members found</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* ── Freeze History Dialog ── */}
      <Dialog open={showFreezeHistory} onOpenChange={setShowFreezeHistory}>
        <DialogContent className="flex flex-col sm:max-w-[600px] p-0 gap-0 overflow-hidden" style={{ maxHeight: '85vh' }}>

          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b bg-white">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary shadow-sm shrink-0">
              <Snowflake className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-bold tracking-tight">Freeze History</h2>
              <p className="text-xs text-muted-foreground truncate">
                {selectedMemberHistory?.name} · {selectedMemberHistory?.id}
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-4">

            {/* Member summary */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/40 overflow-hidden">
              <div className="grid grid-cols-3">
                <div className="px-4 py-3 border-r border-blue-100">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Plan</p>
                  <p className="text-xs font-semibold">{selectedMemberHistory?.membership_plan || selectedMemberHistory?.planName || '—'}</p>
                </div>
                <div className="px-4 py-3 border-r border-blue-100">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Freeze Start</p>
                  <p className="text-xs font-semibold">
                    {selectedMemberHistory?.freeze_start_date
                      ? format(new Date(selectedMemberHistory.freeze_start_date), 'dd MMM yyyy')
                      : '—'}
                  </p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Freeze Until</p>
                  <p className="text-xs font-semibold">
                    {selectedMemberHistory?.freeze_end_date
                      ? format(new Date(selectedMemberHistory.freeze_end_date), 'dd MMM yyyy')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* History table — the backend only tracks the current freeze period on
                the member record itself (freeze_start_date/end/reason), not a log
                of past freeze cycles, so this shows that one real period rather
                than fabricating a multi-entry history. */}
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedMemberHistory?.freeze_start_date ? (
                    <TableRow className="hover:bg-slate-50/50">
                      <TableCell className="text-sm">{format(new Date(selectedMemberHistory.freeze_start_date), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-sm">
                        {selectedMemberHistory.freeze_end_date ? format(new Date(selectedMemberHistory.freeze_end_date), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">{daysFrozenSoFar(selectedMemberHistory)}d</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{selectedMemberHistory.freeze_reason || '—'}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">Active</Badge>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                        No freeze period on record for this member.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer */}
          <div className="shrink-0 flex justify-end px-6 py-3.5 border-t bg-slate-50/80">
            <Button variant="outline" onClick={() => setShowFreezeHistory(false)}>Close</Button>
          </div>

        </DialogContent>
      </Dialog>
    </div>
  );
}
