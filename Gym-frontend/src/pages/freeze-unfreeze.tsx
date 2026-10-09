import React, { useState, useEffect, useMemo } from 'react';
import { membersService, Member, type FreezeAllowance, type FreezeHistoryEntry } from '../utils/supabase/members-service';
import { CurrencyGlyph } from '../utils/currency';
import { plansService } from '../utils/supabase/plans-service';
import { authService } from '../utils/supabase/auth-service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Switch } from "../components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
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
  CheckCircle,
  XCircle,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Sun,
  BarChart3,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { format, differenceInDays, addDays } from "date-fns";
import { Avatar, AvatarFallback } from "../components/ui/avatar";

interface FreezeUnfreezeProps {
  onNavigate?: (section: string) => void;
}

// GymBios design colours (applied inline — the app ships a fixed Tailwind build)
const TEAL = '#2B7A78';
const TEAL_LIGHT = '#DFF5F4';
const headerStyle: React.CSSProperties = {
  background: `linear-gradient(to right, ${TEAL_LIGHT}, #ffffff)`,
  borderBottom: '1px solid rgba(43, 122, 120, 0.1)',
};
const cardBorder: React.CSSProperties = { borderColor: 'rgba(43, 122, 120, 0.2)' };

const initials = (name: string) => (name || '').split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
const fmt = (d?: string | Date | null) => (d ? format(new Date(d), 'dd MMM yyyy') : '—');
// A stored freeze end is the moment the member is back (midnight after a staff-picked
// last day), so the last day actually frozen is the moment before it.
const lastFrozenDay = (end: string) => new Date(new Date(end).getTime() - 1);

export function FreezeUnfreeze({ onNavigate }: FreezeUnfreezeProps) {
  // Freeze form (left)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [allowance, setAllowance] = useState<FreezeAllowance | null>(null);
  const [allowanceLoading, setAllowanceLoading] = useState(false);
  const [freezeStartDate, setFreezeStartDate] = useState<Date | undefined>(undefined);
  const [freezeEndDate, setFreezeEndDate] = useState<Date | undefined>(undefined);
  const [autoUnfreeze, setAutoUnfreeze] = useState(true);
  const [freezeNotes, setFreezeNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Frozen members table (right)
  const [frozenMembers, setFrozenMembers] = useState<Member[]>([]);
  const [frozenAllowances, setFrozenAllowances] = useState<Record<string, FreezeAllowance>>({});
  const [tableSearch, setTableSearch] = useState('');
  // Plan name → its Auto Unfreeze setting (from Manage Plans)
  const [planAutoUnfreeze, setPlanAutoUnfreeze] = useState<Record<string, boolean>>({});
  const [planMaxFreezes, setPlanMaxFreezes] = useState<Record<string, number | null>>({});
  const [filterStatus, setFilterStatus] = useState('frozen');

  // History dialog
  const [showFreezeHistory, setShowFreezeHistory] = useState(false);
  const [selectedMemberHistory, setSelectedMemberHistory] = useState<Member | null>(null);
  const [history, setHistory] = useState<FreezeHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const loadFrozenMembers = async () => {
    try {
      const res = await membersService.getMembers({ status: 'frozen' }, { limit: 100 });
      setFrozenMembers(res.members);
      // Plan freeze settings per frozen member (auto-unfreeze, freezes used)
      const entries = await Promise.all(res.members.map(async (m) => {
        try { return [String(m.id), await membersService.getFreezeAllowance(m.id)] as const; }
        catch { return null; }
      }));
      setFrozenAllowances(Object.fromEntries(entries.filter(Boolean) as [string, FreezeAllowance][]));
    } catch {
      // show an empty list
    }
  };

  useEffect(() => { loadFrozenMembers(); }, []);

  useEffect(() => {
    plansService.getPlans()
      .then((plans) => {
        setPlanAutoUnfreeze(Object.fromEntries(plans.map((p: any) => [p.name, Boolean(p.autoUnfreeze)])));
        setPlanMaxFreezes(Object.fromEntries(plans.map((p: any) => [p.name, p.maxFreezeOccurrences && p.maxFreezeOccurrences > 0 ? p.maxFreezeOccurrences : null])));
      })
      .catch(() => {});
  }, []);

  /** Whether a member's freeze auto-ends on its end date: their plan's Auto Unfreeze setting */
  const autoUnfreezeFor = (m: Member): boolean | undefined =>
    frozenAllowances[String(m.id)]?.autoUnfreeze ?? (m.membership_plan ? planAutoUnfreeze[m.membership_plan] : undefined);

  // Search members as the user types
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2 || selectedMember) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      membersService.searchMembers(searchQuery).then(setSearchResults).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery, selectedMember]);

  const selectMember = async (member: Member) => {
    setSelectedMember(member);
    setSearchQuery(member.name);
    setSearchResults([]);
    setAllowance(null);
    setAllowanceLoading(true);
    try {
      const a = await membersService.getFreezeAllowance(member.id);
      setAllowance(a);
      setAutoUnfreeze(a.autoUnfreeze);
    } catch {
      setAllowance(null);
      const planAuto = member.membership_plan ? planAutoUnfreeze[member.membership_plan] : undefined;
      if (planAuto !== undefined) setAutoUnfreeze(planAuto);
    } finally {
      setAllowanceLoading(false);
    }
  };

  const clearSelection = () => {
    setSelectedMember(null);
    setAllowance(null);
    setSearchQuery('');
    setFreezeStartDate(undefined);
    setFreezeEndDate(undefined);
    setFreezeNotes('');
  };

  // Freeze length and how much of it the plan's free days cover
  const totalDays = freezeStartDate && freezeEndDate ? differenceInDays(freezeEndDate, freezeStartDate) + 1 : 0;
  const freeDaysAvailable = allowance ? allowance.freeDaysRemaining : 0;
  const extraDays = Math.max(0, totalDays - freeDaysAvailable);
  const extraDayRate = allowance ? Number(allowance.chargePerExtraDay || 0) : 0;
  const exceedsRemaining = allowance ? totalDays > allowance.remainingDays : false;

  const handleFreezeMembership = async () => {
    if (!selectedMember || !freezeStartDate || !freezeEndDate) {
      toast.error('Please fill all required fields');
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const fStart = new Date(freezeStartDate);
    fStart.setHours(0, 0, 0, 0);

    const mStartStr = (selectedMember as any).membership_start_date || (selectedMember as any).join_date;
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

    if (freezeStartDate > freezeEndDate) {
      toast.error('End date cannot be before start date');
      return;
    }
    setIsSubmitting(true);
    try {
      const freezeUntil = format(freezeEndDate, 'yyyy-MM-dd') + 'T00:00:00Z';
      const freezeStart = format(freezeStartDate, 'yyyy-MM-dd') + 'T00:00:00Z';
      await membersService.freezeMember(String(selectedMember.id), {
        freezeUntil,
        freezeStartDate: freezeStart,
        reason: freezeNotes || undefined,
      });
      toast.success(`Membership frozen for ${selectedMember.name}`, {
        description: `${totalDays} days from ${format(freezeStartDate, 'dd MMM yyyy')} to ${format(freezeEndDate, 'dd MMM yyyy')}`,
      });
      clearSelection();
      await loadFrozenMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to freeze membership. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnfreeze = async (member: Member) => {
    try {
      await membersService.unfreezeMember(String(member.id));
      toast.success(`Membership unfrozen for ${member.name}`, { description: 'Member status updated to Active' });
      await loadFrozenMembers();
    } catch {
      toast.error('Failed to unfreeze membership. Please try again.');
    }
  };

  const openHistory = async (member: Member) => {
    setSelectedMemberHistory(member);
    setShowFreezeHistory(true);
    setHistory([]);
    setHistoryLoading(true);
    try {
      setHistory(await membersService.getFreezeHistory(member.id));
    } catch {
      try {
        setHistory(await loadHistoryFromReport(member));
      } catch {
        toast.error('Could not load freeze history');
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  /** Same records via the freeze report (used when /members/{id}/freezes isn't available) */
  const loadHistoryFromReport = async (member: Member): Promise<FreezeHistoryEntry[]> => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api';
    const from = format(new Date(new Date().getFullYear() - 10, 0, 1), 'yyyy-MM-dd');
    const to = format(new Date(new Date().getFullYear() + 2, 0, 1), 'yyyy-MM-dd');
    const res = await authService.makeAuthenticatedRequest(`${base}/membership-reports/freezes?from=${from}&to=${to}`);
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    const body = await res.json();
    return ((body?.data ?? []) as any[])
      .filter((r) => String(r.memberDbId) === String(member.id))
      .map((r) => ({
        id: r.id,
        planName: r.plan,
        freezeStart: r.freezeStart,
        plannedEnd: r.plannedEnd ?? null,
        endedAt: r.endedAt ?? null,
        days: r.status === 'Frozen' ? (r.requestedDays || r.daysFrozen) : r.daysFrozen,
        freeDays: r.freeDays,
        chargedDays: r.chargedDays,
        chargeAmount: Number(r.chargeAmount || 0),
        reason: r.reason,
        source: r.source,
        status: r.status === 'Frozen' ? 'Active' : 'Completed',
      }));
  };

  // Total planned freeze duration (start → the moment the freeze ends)
  const plannedFreezeDays = (m: Member): number => {
    if (!m.freeze_start_date || !m.freeze_end_date) return 0;
    return Math.max(0, differenceInDays(new Date(m.freeze_end_date), new Date(m.freeze_start_date)));
  };

  const filteredMembers = useMemo(() => {
    const q = tableSearch.trim().toLowerCase();
    return frozenMembers.filter((member) => {
      const status = (member.membership_status || '').toLowerCase();
      const matchesStatus = filterStatus === 'all' || status === filterStatus;
      const matchesSearch = !q
        || member.name.toLowerCase().includes(q)
        || (member.member_id || '').toLowerCase().includes(q)
        || (member.phone || '').includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [frozenMembers, tableSearch, filterStatus]);

  const totalFrozenDays = frozenMembers.reduce((acc, m) => acc + plannedFreezeDays(m), 0);
  const autoUnfreezeCount = frozenMembers.filter((m) => autoUnfreezeFor(m)).length;

  const exportReport = () => {
    if (frozenMembers.length === 0) { toast.info('No frozen members to export'); return; }
    const cell = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = ['Member Name', 'Member ID', 'Phone', 'Plan', 'Freeze Start', 'Freeze End', 'Days Frozen', 'Status', 'Auto Unfreeze', 'Reason'];
    const rows = frozenMembers.map((m) => [
      m.name, m.member_id, m.phone, m.membership_plan,
      m.freeze_start_date ? format(new Date(m.freeze_start_date), 'yyyy-MM-dd') : '',
      m.freeze_end_date ? format(lastFrozenDay(m.freeze_end_date), 'yyyy-MM-dd') : '',
      plannedFreezeDays(m), m.membership_status,
      autoUnfreezeFor(m) ? 'Yes' : 'No', m.freeze_reason || '',
    ]);
    const csv = [header, ...rows].map((r) => r.map(cell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `frozen-members-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${frozenMembers.length} frozen member(s)`);
  };

  const historyAllowance = selectedMemberHistory ? frozenAllowances[String(selectedMemberHistory.id)] : undefined;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => onNavigate?.('members')} className="text-gray-600">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Members
          </Button>
          <Button variant="outline" size="sm" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        <div className="flex items-center space-x-3 mb-2">
          <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${TEAL}, #1a4d4b)` }}>
            <Snowflake className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Freeze / Unfreeze Memberships</h1>
            <p className="text-sm text-gray-600">Manage membership freeze requests with plan-based limits and automated notifications</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Freeze Member */}
        <div className="lg:col-span-1">
          <Card style={cardBorder} className="overflow-hidden">
            <CardHeader style={headerStyle}>
              <CardTitle className="flex items-center space-x-2">
                <Snowflake className="h-5 w-5" style={{ color: TEAL }} />
                <span>Freeze Member</span>
              </CardTitle>
              <CardDescription>Search and freeze a member's membership</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Search Member */}
              <div className="space-y-2">
                <Label>Search Member</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Name, ID, Phone, or Email..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      if (selectedMember) { setSelectedMember(null); setAllowance(null); }
                    }}
                    className="pl-10"
                  />
                </div>

                {/* Search Results */}
                {searchQuery && searchResults.length > 0 && !selectedMember && (
                  <Card className="mt-2 max-h-64 overflow-y-auto" style={cardBorder}>
                    <CardContent className="p-2">
                      {searchResults.map((member) => {
                        const status = member.membership_status || '';
                        return (
                          <button
                            key={member.id}
                            onClick={() => selectMember(member)}
                            className="w-full p-3 rounded-lg text-left transition-colors hover:bg-muted/50"
                          >
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10" style={{ border: `2px solid ${TEAL}` }}>
                                <AvatarFallback className="text-white" style={{ background: TEAL }}>{initials(member.name)}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{member.name}</p>
                                <p className="text-xs text-gray-600 truncate">{member.member_id || member.id} • {member.membership_plan || '—'}</p>
                              </div>
                              <Badge className={
                                status.toLowerCase() === 'active' ? 'bg-green-100 text-green-700'
                                  : status.toLowerCase() === 'frozen' ? 'bg-blue-100 text-blue-700'
                                  : 'bg-gray-100 text-gray-700'
                              }>
                                {status || '—'}
                              </Badge>
                            </div>
                          </button>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Selected Member Details */}
              {selectedMember && (
                <Card style={{ borderColor: 'rgba(43, 122, 120, 0.3)', background: 'rgba(223, 245, 244, 0.3)' }}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 min-w-0">
                        <Avatar className="h-12 w-12" style={{ border: `2px solid ${TEAL}` }}>
                          <AvatarFallback className="text-white" style={{ background: TEAL }}>{initials(selectedMember.name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{selectedMember.name}</p>
                          <p className="text-xs text-gray-600">{selectedMember.member_id || selectedMember.id}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={clearSelection} title="Clear selection">
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3" style={{ borderTop: '1px solid rgba(43, 122, 120, 0.2)' }}>
                      <div>
                        <p className="text-xs text-gray-600">Plan</p>
                        <p className="font-medium text-sm">{selectedMember.membership_plan || '—'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600">Status</p>
                        <Badge className={(selectedMember.membership_status || '').toLowerCase() === 'frozen' ? 'bg-blue-100 text-blue-700 text-xs' : 'bg-green-100 text-green-700 text-xs'}>
                          {selectedMember.membership_status || '—'}
                        </Badge>
                      </div>
                    </div>

                    {allowanceLoading ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500"><Loader2 className="h-3 w-3 animate-spin" /> Loading freeze allowance…</div>
                    ) : allowance ? (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600">Max Freeze Days</p>
                            <p className="font-semibold" style={{ color: TEAL }}>{allowance.maxDays} days</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Used Days</p>
                            <p className="font-semibold text-orange-600">{allowance.usedDays} days</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs text-gray-600">Freezes Allowed</p>
                            <p className="font-semibold" style={{ color: TEAL }}>{allowance.maxOccurrences ?? 'Unlimited'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Freezes Used</p>
                            <p className="font-semibold text-orange-600">{allowance.usedOccurrences}</p>
                          </div>
                        </div>

                        <div className="pt-2" style={{ borderTop: '1px solid rgba(43, 122, 120, 0.2)' }}>
                          <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-600">Balance Days Remaining</p>
                            <p className="font-bold" style={{ color: TEAL }}>{allowance.remainingDays} days</p>
                          </div>
                        </div>

                        {!allowance.canFreeze && allowance.unavailableMessage && (
                          <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-2 text-xs text-amber-800">
                            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                            <span>{allowance.unavailableMessage.replace(/^Your|^You've/, (w) => (w === 'Your' ? "This member's" : 'This member has'))} Staff can still freeze it.</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">Freeze allowance unavailable for this member's plan.</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Freeze Dates */}
              {selectedMember && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Freeze Start Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {freezeStartDate ? format(freezeStartDate, 'dd MMM yyyy') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={freezeStartDate}
                            onSelect={(d) => {
                              setFreezeStartDate(d);
                              if (d && freezeEndDate && freezeEndDate < d) setFreezeEndDate(undefined);
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Freeze End Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {freezeEndDate ? format(freezeEndDate, 'dd MMM yyyy') : 'Select date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={freezeEndDate}
                            onSelect={setFreezeEndDate}
                            disabled={(date) => !freezeStartDate || date < freezeStartDate}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Freeze Summary */}
                  {freezeStartDate && freezeEndDate && (
                    <Card className="bg-white" style={{ borderColor: 'rgba(43, 122, 120, 0.3)' }}>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">Total Days</p>
                          <p className="font-bold text-gray-900">{totalDays} days</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600">Free Days Available</p>
                          <p className="font-semibold text-green-600">{freeDaysAvailable} days</p>
                        </div>
                        {extraDays > 0 && (
                          <>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-gray-600">Extra Days</p>
                              <p className="font-semibold text-orange-600">{extraDays} days</p>
                            </div>
                            {extraDayRate > 0 && (
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                <p className="text-sm font-medium text-gray-900">Charge for Extra Days</p>
                                <div className="text-right">
                                  <p className="font-bold" style={{ color: '#E63946' }}><CurrencyGlyph /> {(extraDays * extraDayRate).toLocaleString()}</p>
                                  <p className="text-xs text-gray-500">Not billed for staff freezes</p>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                        {exceedsRemaining && (
                          <p className="text-xs text-amber-700">Longer than the {allowance?.remainingDays} days left on this plan's freeze allowance.</p>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Auto Unfreeze */}
                  <div className="flex items-center justify-between p-4 rounded-lg" style={{ border: '1px solid rgba(43, 122, 120, 0.2)' }}>
                    <div>
                      <Label className="text-sm font-medium">Auto Unfreeze on End Date</Label>
                      <p className="text-xs text-gray-600 mt-1">
                        Automatically activate membership on {freezeEndDate ? format(addDays(freezeEndDate, 1), 'dd MMM yyyy') : 'the day after the end date'}
                      </p>
                    </div>
                    <Switch checked={autoUnfreeze} onCheckedChange={setAutoUnfreeze} />
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      placeholder="Add reason or notes for this freeze..."
                      value={freezeNotes}
                      onChange={(e) => setFreezeNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Freeze Button */}
                  <Button
                    onClick={handleFreezeMembership}
                    className="w-full text-white"
                    style={{ background: '#E63946' }}
                    disabled={!freezeStartDate || !freezeEndDate || isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Snowflake className="h-4 w-4 mr-2" />}
                    Freeze Membership
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Frozen Members */}
        <div className="lg:col-span-2">
          <Card style={cardBorder} className="overflow-hidden">
            <CardHeader style={headerStyle}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Sun className="h-5 w-5" style={{ color: TEAL }} />
                    <span>Currently Frozen Members</span>
                  </CardTitle>
                  <CardDescription>View and manage all frozen memberships</CardDescription>
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] bg-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="frozen">Frozen</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search frozen members..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Frozen Members Table */}
              <div className="rounded-lg overflow-hidden overflow-x-auto" style={{ border: '1px solid rgba(43, 122, 120, 0.2)' }}>
                <Table>
                  <TableHeader>
                    <TableRow style={{ background: 'rgba(223, 245, 244, 0.5)' }}>
                      <TableHead>Member Name</TableHead>
                      <TableHead>Member ID</TableHead>
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Freeze Start</TableHead>
                      <TableHead>Freeze End</TableHead>
                      <TableHead>Days Frozen</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Auto Unfreeze</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => {
                        const auto = autoUnfreezeFor(member);
                        const status = member.membership_status || '';
                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8" style={{ border: `1px solid ${TEAL}` }}>
                                  <AvatarFallback className="text-white text-xs" style={{ background: TEAL }}>{initials(member.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{member.name}</p>
                                  <p className="text-xs text-gray-600">{member.phone || '—'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-sm">{member.member_id || member.id}</TableCell>
                            <TableCell>{member.membership_plan || '—'}</TableCell>
                            <TableCell>{fmt(member.freeze_start_date)}</TableCell>
                            <TableCell>{member.freeze_end_date ? fmt(lastFrozenDay(member.freeze_end_date)) : '—'}</TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-700">{plannedFreezeDays(member)} days</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={status.toLowerCase() === 'frozen' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                                <Snowflake className="h-3 w-3 mr-1" />
                                {status ? status.charAt(0).toUpperCase() + status.slice(1) : '—'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {auto === undefined ? (
                                <span className="text-xs text-gray-500">—</span>
                              ) : auto ? (
                                <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Yes</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-700"><XCircle className="h-3 w-3 mr-1" />No</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openHistory(member)}
                                  style={{ borderColor: 'rgba(43, 122, 120, 0.3)', color: TEAL }}
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  History
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUnfreeze(member)}
                                  className="border-green-300 text-green-700 hover:bg-green-50"
                                >
                                  <Sun className="h-3 w-3 mr-1" />
                                  Unfreeze
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                          <Snowflake className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                          <p>No frozen members found</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {[
                  { label: 'Total Frozen', value: frozenMembers.length, icon: <Snowflake className="h-8 w-8 text-blue-500" /> },
                  { label: 'Auto Unfreeze', value: autoUnfreezeCount, icon: <RefreshCw className="h-8 w-8 text-green-500" /> },
                  { label: 'Total Days', value: totalFrozenDays, icon: <Clock className="h-8 w-8 text-orange-500" /> },
                  {
                    label: 'Avg Duration',
                    value: `${frozenMembers.length > 0 ? Math.round(totalFrozenDays / frozenMembers.length) : 0} days`,
                    icon: <BarChart3 className="h-8 w-8 text-purple-500" />,
                  },
                ].map((s) => (
                  <Card key={s.label} style={cardBorder}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600">{s.label}</p>
                          <p className="font-bold text-gray-900">{s.value}</p>
                        </div>
                        {s.icon}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Freeze History Dialog */}
      <Dialog open={showFreezeHistory} onOpenChange={setShowFreezeHistory}>
        <DialogContent style={{ maxWidth: 'min(820px, calc(100% - 2rem))' }}>
          <DialogHeader>
            <DialogTitle>Freeze History</DialogTitle>
            <DialogDescription>
              Complete freeze/unfreeze history for {selectedMemberHistory?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Card style={{ ...cardBorder, background: 'rgba(223, 245, 244, 0.3)' }}>
              <CardContent className="p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-gray-600">Member ID</p>
                    <p className="font-medium">{selectedMemberHistory?.member_id || selectedMemberHistory?.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Current Plan</p>
                    <p className="font-medium">{selectedMemberHistory?.membership_plan || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Freezes Used</p>
                    <p className="font-medium">
                      {historyAllowance
                        ? `${historyAllowance.usedOccurrences} / ${historyAllowance.maxOccurrences ?? '∞'}`
                        : historyLoading
                        ? '…'
                        : `${history.length} / ${(selectedMemberHistory?.membership_plan && planMaxFreezes[selectedMemberHistory.membership_plan]) || '∞'}`}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(43, 122, 120, 0.2)' }}>
              <Table>
                <TableHeader>
                  <TableRow style={{ background: 'rgba(223, 245, 244, 0.5)' }}>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Charged</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading history…
                      </TableCell>
                    </TableRow>
                  ) : history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-sm text-gray-500">
                        No freezes recorded for this member.
                      </TableCell>
                    </TableRow>
                  ) : (
                    history.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{fmt(record.freezeStart)}</TableCell>
                        <TableCell>{fmt(record.endedAt || record.plannedEnd)}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-700">{record.days} days</Badge>
                        </TableCell>
                        <TableCell>{record.reason || '—'}</TableCell>
                        <TableCell>
                          {Number(record.chargeAmount) > 0 ? (
                            <span className="font-medium" style={{ color: '#E63946' }}><CurrencyGlyph /> {Number(record.chargeAmount).toLocaleString()}</span>
                          ) : (
                            <span className="text-gray-600">Free</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={record.status === 'Active' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}>
                            {record.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
