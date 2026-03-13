import React, { useState } from 'react';
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

const frozenMembersData = [
  {
    id: 'MBR-123456',
    name: 'Ahmed Al-Mansoori',
    planName: 'Premium Fitness',
    freezeStartDate: '2024-10-15',
    freezeEndDate: '2024-11-15',
    daysFrozen: 31,
    status: 'Frozen',
    autoUnfreeze: true,
    freezeCount: 1,
    maxFreezeCount: 2,
    maxFreezeDays: 60,
    usedDays: 31,
    phone: '+971 50 123 4567',
  },
  {
    id: 'MBR-234567',
    name: 'Fatima Hassan',
    planName: 'Basic Gym',
    freezeStartDate: '2024-10-20',
    freezeEndDate: '2024-11-05',
    daysFrozen: 16,
    status: 'Frozen',
    autoUnfreeze: true,
    freezeCount: 1,
    maxFreezeCount: 1,
    maxFreezeDays: 30,
    usedDays: 16,
    phone: '+971 52 234 5678',
  },
  {
    id: 'MBR-345678',
    name: 'Mohammed Khalid',
    planName: 'Premium Plus',
    freezeStartDate: '2024-10-10',
    freezeEndDate: '2024-12-10',
    daysFrozen: 61,
    status: 'Frozen',
    autoUnfreeze: false,
    freezeCount: 1,
    maxFreezeCount: 3,
    maxFreezeDays: 90,
    usedDays: 61,
    phone: '+971 55 345 6789',
  },
  {
    id: 'MBR-456789',
    name: 'Sara Abdullah',
    planName: 'Family Plan',
    freezeStartDate: '2024-10-18',
    freezeEndDate: '2024-11-18',
    daysFrozen: 31,
    status: 'Frozen',
    autoUnfreeze: true,
    freezeCount: 2,
    maxFreezeCount: 2,
    maxFreezeDays: 60,
    usedDays: 45,
    phone: '+971 56 456 7890',
  },
];

const allMembers = [
  {
    id: 'MBR-111111',
    name: 'Ali Rashid',
    phone: '+971 50 111 1111',
    email: 'ali.rashid@email.com',
    planName: 'Premium Fitness',
    status: 'Active',
    maxFreezeDays: 60,
    maxFreezeCount: 2,
    usedFreezeDays: 0,
    usedFreezeCount: 0,
    chargePerExtraDay: 10,
    autoUnfreezeDefault: true,
  },
  {
    id: 'MBR-222222',
    name: 'Layla Ahmed',
    phone: '+971 52 222 2222',
    email: 'layla.ahmed@email.com',
    planName: 'Basic Gym',
    status: 'Active',
    maxFreezeDays: 30,
    maxFreezeCount: 1,
    usedFreezeDays: 0,
    usedFreezeCount: 0,
    chargePerExtraDay: 5,
    autoUnfreezeDefault: true,
  },
  ...frozenMembersData,
];

const freezeHistory = [
  { id: 1, startDate: '2024-06-15', endDate: '2024-07-15', days: 30, reason: 'Travel', status: 'Completed', chargedAmount: 0 },
  { id: 2, startDate: '2024-10-15', endDate: '2024-11-15', days: 31, reason: 'Medical', status: 'Active', chargedAmount: 0 },
];

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

  const calculateFreezeDays = () => {
    if (!freezeStartDate || !freezeEndDate) return 0;
    return differenceInDays(freezeEndDate, freezeStartDate) + 1;
  };

  const totalDays = calculateFreezeDays();
  const freeDaysAvailable = selectedMember ? Math.max(0, selectedMember.maxFreezeDays - selectedMember.usedFreezeDays) : 0;
  const extraDays = Math.max(0, totalDays - freeDaysAvailable);
  const chargeForExtraDays = selectedMember ? extraDays * (selectedMember.chargePerExtraDay || 0) : 0;

  const filteredMembers = frozenMembersData.filter((member) => {
    const matchesSearch =
      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone.includes(searchQuery);
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'frozen' && member.status === 'Frozen') ||
      (filterStatus === 'active' && member.status === 'Active');
    return matchesSearch && matchesStatus;
  });

  const searchResults = allMembers.filter((member) => {
    if (!searchQuery) return false;
    return (
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery) ||
      (member as any).email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleFreezeMembership = () => {
    if (!selectedMember || !freezeStartDate || !freezeEndDate) {
      toast.error('Please fill all required fields');
      return;
    }
    if (freezeStartDate >= freezeEndDate) {
      toast.error('End date must be after start date');
      return;
    }
    if (selectedMember.usedFreezeCount >= selectedMember.maxFreezeCount) {
      toast.error(`Member has used all ${selectedMember.maxFreezeCount} freezes allowed for this plan`);
      return;
    }
    toast.success(`Membership frozen for ${selectedMember.name}`, {
      description: `${totalDays} days from ${format(freezeStartDate, 'dd MMM yyyy')} to ${format(freezeEndDate, 'dd MMM yyyy')}${chargeForExtraDays > 0 ? ` | Charge: AED ${chargeForExtraDays}` : ''}`,
    });
    setSelectedMember(null);
    setFreezeStartDate(undefined);
    setFreezeEndDate(undefined);
    setFreezeNotes('');
    setSearchQuery('');
  };

  const handleUnfreeze = (member: any) => {
    toast.success(`Membership unfrozen for ${member.name}`, { description: 'Member status updated to Active' });
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
            { label: 'Total Frozen', value: frozenMembersData.length, sub: 'Active freeze requests', icon: <Snowflake className="h-5 w-5 text-blue-600" />, bg: 'bg-blue-100' },
            { label: 'Auto Unfreeze', value: frozenMembersData.filter(m => m.autoUnfreeze).length, sub: 'Scheduled to unfreeze', icon: <RefreshCw className="h-5 w-5 text-green-600" />, bg: 'bg-green-100' },
            { label: 'Total Days', value: frozenMembersData.reduce((acc, m) => acc + m.daysFrozen, 0), sub: 'Across all members', icon: <Clock className="h-5 w-5 text-orange-600" />, bg: 'bg-orange-100' },
            { label: 'Avg Duration', value: `${Math.round(frozenMembersData.reduce((acc, m) => acc + m.daysFrozen, 0) / frozenMembersData.length)} days`, sub: 'Per frozen member', icon: <BarChart3 className="h-5 w-5 text-purple-600" />, bg: 'bg-purple-100' },
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
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Name, ID, Phone or Email…"
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setSelectedMember(null); }}
                      className="pl-9"
                    />
                  </div>

                  {/* Dropdown results */}
                  {searchQuery && searchResults.length > 0 && !selectedMember && (
                    <div className="rounded-xl border shadow-md overflow-hidden max-h-60 overflow-y-auto bg-white">
                      {searchResults.map((member) => (
                        <button
                          key={member.id}
                          onClick={() => { setSelectedMember(member); setSearchQuery(member.name); setAutoUnfreeze(member.autoUnfreezeDefault); }}
                          className="w-full px-3 py-2.5 hover:bg-muted/50 text-left transition-colors flex items-center gap-3 border-b last:border-0"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className="bg-primary text-white text-xs">{initials(member.name)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.id} · {member.planName}</p>
                          </div>
                          <Badge className={member.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-blue-100 text-blue-700 border-blue-200'}>
                            {member.status}
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
                    <div className="grid grid-cols-2 divide-x divide-blue-100">
                      <div className="px-4 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Plan</p>
                        <p className="text-xs font-semibold">{selectedMember.planName}</p>
                      </div>
                      <div className="px-4 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px]">{selectedMember.status}</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-blue-100 border-t border-blue-100">
                      <div className="px-4 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Max Freeze Days</p>
                        <p className="text-xs font-semibold text-primary">{selectedMember.maxFreezeDays} days</p>
                      </div>
                      <div className="px-4 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Used Days</p>
                        <p className="text-xs font-semibold text-orange-600">{selectedMember.usedFreezeDays} days</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 divide-x divide-blue-100 border-t border-blue-100">
                      <div className="px-4 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Freezes Allowed</p>
                        <p className="text-xs font-semibold text-primary">{selectedMember.maxFreezeCount}</p>
                      </div>
                      <div className="px-4 py-2.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Freezes Used</p>
                        <p className="text-xs font-semibold text-orange-600">{selectedMember.usedFreezeCount}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-blue-100 bg-blue-50/60">
                      <p className="text-xs text-muted-foreground">Balance Remaining</p>
                      <p className="text-xs font-bold text-primary">{selectedMember.maxFreezeDays - selectedMember.usedFreezeDays} days</p>
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
                            <Calendar mode="single" selected={freezeStartDate} onSelect={setFreezeStartDate} disabled={(date) => date < new Date()} />
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
                            { label: 'Free Days Available', value: `${freeDaysAvailable} days`, color: 'text-green-600' },
                            ...(extraDays > 0 ? [
                              { label: 'Extra Days', value: `${extraDays} days`, color: 'text-orange-600' },
                              { label: 'Charge for Extra Days', value: `AED ${chargeForExtraDays}`, color: 'text-red-600' },
                            ] : []),
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
                      disabled={!freezeStartDate || !freezeEndDate}
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
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search frozen members…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
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
                        <TableHead>Auto Unfreeze</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length > 0 ? (
                        filteredMembers.map((member) => (
                          <TableRow key={member.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8 shrink-0">
                                  <AvatarFallback className="bg-primary text-white text-xs">{initials(member.name)}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{member.name}</p>
                                  <p className="text-xs text-muted-foreground">{member.id}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{member.planName}</TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <p className="font-medium">{format(new Date(member.freezeStartDate), 'dd MMM yyyy')}</p>
                                <p className="text-muted-foreground">→ {format(new Date(member.freezeEndDate), 'dd MMM yyyy')}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-blue-100 text-blue-700 border-blue-200">{member.daysFrozen}d</Badge>
                            </TableCell>
                            <TableCell>
                              {member.autoUnfreeze ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                                  <CheckCircle className="h-3 w-3" />Yes
                                </Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-600 border-gray-200 gap-1">
                                  <XCircle className="h-3 w-3" />No
                                </Badge>
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
                        ))
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
        <DialogContent className="flex flex-col sm:!max-w-[640px] max-h-[85vh] p-0 gap-0 overflow-hidden">

          {/* Header */}
          <div className="shrink-0 flex items-center gap-3 px-6 py-4 border-b bg-white">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary shadow-sm shrink-0">
              <Snowflake className="h-[18px] w-[18px] text-white" />
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
              <div className="grid grid-cols-3 divide-x divide-blue-100">
                <div className="px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Current Plan</p>
                  <p className="text-xs font-semibold">{selectedMemberHistory?.planName}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Freezes Used</p>
                  <p className="text-xs font-semibold">{selectedMemberHistory?.freezeCount} / {selectedMemberHistory?.maxFreezeCount}</p>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">Days Used</p>
                  <p className="text-xs font-semibold">{selectedMemberHistory?.usedDays} / {selectedMemberHistory?.maxFreezeDays} days</p>
                </div>
              </div>
            </div>

            {/* History table */}
            <div className="rounded-xl border overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Charged</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {freezeHistory.map((record) => (
                    <TableRow key={record.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-sm">{format(new Date(record.startDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell className="text-sm">{format(new Date(record.endDate), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">{record.days}d</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{record.reason}</TableCell>
                      <TableCell>
                        {record.chargedAmount > 0 ? (
                          <span className="text-sm font-medium text-red-600">AED {record.chargedAmount}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Free</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={record.status === 'Active' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-green-100 text-green-700 border-green-200'}>
                          {record.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
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
