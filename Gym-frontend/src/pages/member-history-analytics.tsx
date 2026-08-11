import React, { useEffect, useState, useCallback } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Label } from "../components/ui/label";
import { toast } from "sonner";
import {
  ArrowLeft,
  Search,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  DollarSign,
  CreditCard,
  Wallet,
  MessageSquare,
  Target,
  Receipt,
  RefreshCcw,
  Gift,
  Users,
  Activity,
  CheckCircle,
  AlertCircle,
  XCircle,
  Star,
  Share2,
  ShoppingCart,
  MapPin,
  Percent,
  FileText,
  Plus,
  Dumbbell,
  Building,
  Send,
  Filter,
  ChevronRight,
  X,
  UserX,
  Eye,
  Snowflake,
  Loader2,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar as CalendarComponent } from "../components/ui/calendar";
import { format, differenceInDays } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { Textarea } from "../components/ui/textarea";

import { membersService } from '../utils/supabase/members-service';
import type { Member, MemberNote } from '../utils/supabase/members-service';
import { billingService } from '../utils/supabase/billing-service';
import type { MemberStatement, StatementLine } from '../utils/supabase/billing-service';
import { attendanceService } from '../utils/supabase/attendance-service';
import type { AttendanceListItem } from '../utils/supabase/attendance-service';
import { workoutFeedbackService } from '../utils/supabase/workout-feedback-service';
import type { WorkoutFeedback, WorkoutSession } from '../utils/supabase/workout-feedback-service';
import { messagingService } from '../utils/supabase/messaging-service';
import type { MessageHistoryApi } from '../utils/supabase/messaging-service';
import { addonsService } from '../utils/supabase/addons-service';
import type { MemberAddon } from '../utils/supabase/addons-service';
import { promotionsService } from '../utils/supabase/promotions-service';
import type { EligibleMemberApi } from '../utils/supabase/promotions-service';
import { rewardService, walletService } from '../utils/supabase/reward-service';
import type { ReferralReward, Wallet as RewardWallet } from '../utils/supabase/reward-service';
import { referralService } from '../utils/supabase/referral-service';
import type { ReferralResponse } from '../utils/supabase/referral-service';
import { receiptsService } from '../utils/supabase/receipts-service';
import { downloadReceiptInvoice } from '../utils/receipt-invoice';

interface MemberHistoryAnalyticsProps {
  onNavigate?: (section: string, params?: Record<string, any>) => void;
  memberId?: string;
}

const COLORS = ['#0047AB', '#00c5cb', '#4CAF50', '#FFC107', '#F44336'];

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function fmtDate(value?: string | null): string {
  const d = safeDate(value);
  return d ? format(d, 'dd MMM yyyy') : '—';
}

// A bill paid in full at the moment it was created (register a member, take
// cash on the spot) produces an "Invoice" line and a "Payment" line sharing
// the same underlying receipt id — two ledger rows for what was, from the
// member's point of view, one single transaction. Collapse that specific pair
// into one row; a partial/credit sale, a mixed-method split, or a payment
// collected later (its own receipt id) still shows as separate rows, because
// those really are separate events. Callers that need ledger totals (Total
// Billed/Total Paid) should keep summing the un-merged lines — this is only
// for "how many transactions actually happened" display purposes.
function mergeTransactionLines(lines: StatementLine[]): StatementLine[] {
  const groups = new Map<string, StatementLine[]>();
  const ungrouped: StatementLine[] = [];
  lines.forEach(l => {
    if (l.id == null) { ungrouped.push(l); return; }
    const key = String(l.id);
    const group = groups.get(key);
    if (group) group.push(l); else groups.set(key, [l]);
  });
  const merged: StatementLine[] = [...ungrouped];
  groups.forEach(group => {
    const invoiceLines = group.filter(l => l.type === 'Invoice');
    const paymentLines = group.filter(l => l.type === 'Payment');
    if (invoiceLines.length === 1 && paymentLines.length === 1
        && Math.abs(paymentLines[0].credit - invoiceLines[0].debit) < 0.005) {
      merged.push({
        ...paymentLines[0],
        description: invoiceLines[0].description,
        invoice_no: invoiceLines[0].invoice_no,
      });
    } else {
      merged.push(...group);
    }
  });
  return merged.sort((a, b) => (safeDate(b.date)?.getTime() ?? 0) - (safeDate(a.date)?.getTime() ?? 0));
}

function fmtDateTime(value?: string | null): string {
  const d = safeDate(value);
  return d ? format(d, 'dd MMM yyyy, h:mm a') : '—';
}

function initialsOf(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

interface TimelineItem {
  date: Date;
  event: string;
  detail: string;
  type: 'membership' | 'payment' | 'addon' | 'referral';
}

export function MemberHistoryAnalytics({ onNavigate, memberId }: MemberHistoryAnalyticsProps) {
  const { currencyCode } = useCurrency();

  // ── Core data ──────────────────────────────────────────────────────────
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [statement, setStatement] = useState<MemberStatement | null>(null);
  const [attendance, setAttendance] = useState<AttendanceListItem[]>([]);
  const [feedback, setFeedback] = useState<WorkoutFeedback[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [communications, setCommunications] = useState<MessageHistoryApi[]>([]);
  const [notes, setNotes] = useState<MemberNote[]>([]);
  const [addons, setAddons] = useState<MemberAddon[]>([]);
  const [eligibility, setEligibility] = useState<EligibleMemberApi | null>(null);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [referrals, setReferrals] = useState<ReferralResponse[]>([]);

  // ── Search bar (switch member) ────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

  // ── Communication tab ──────────────────────────────────────────────────
  const [selectedMessage, setSelectedMessage] = useState<MessageHistoryApi | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [channelFilter, setChannelFilter] = useState('all');
  const [communicationSearch, setCommunicationSearch] = useState('');

  // ── Transactions tab ────────────────────────────────────────────────────
  const [transactionSearch, setTransactionSearch] = useState('');
  const [transactionDateFrom, setTransactionDateFrom] = useState('');
  const [transactionDateTo, setTransactionDateTo] = useState('');
  const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');

  // ── Notes tab ────────────────────────────────────────────────────────────
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // ── Dialogs ──────────────────────────────────────────────────────────────
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isFreezeDialogOpen, setIsFreezeDialogOpen] = useState(false);

  const [transferForm, setTransferForm] = useState({
    fullName: '', mobileNumber: '', email: '', gender: '', dateOfBirth: '', confirmTransfer: false,
  });
  const [savingTransfer, setSavingTransfer] = useState(false);

  const [deactivateForm, setDeactivateForm] = useState({
    effectiveDate: new Date().toISOString().split('T')[0], reason: '', confirmDeactivation: false,
  });
  const [savingDeactivate, setSavingDeactivate] = useState(false);

  const [freezeStartDate, setFreezeStartDate] = useState<Date | undefined>(undefined);
  const [freezeEndDate, setFreezeEndDate] = useState<Date | undefined>(undefined);
  const [freezeReason, setFreezeReason] = useState('');
  const [savingFreeze, setSavingFreeze] = useState(false);

  // ── Load everything for this member ─────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!memberId) { setLoading(false); return; }
    setLoading(true);
    setLoadError(null);
    try {
      const m = await membersService.getMemberById(String(memberId));
      setMember(m);
      const bizId = m.member_id || String(memberId);

      const [
        statementR, attendanceR, feedbackR, sessionsR, commsR, notesR,
        addonsR, eligibilityR, rewardsR, walletR, referralsR,
      ] = await Promise.allSettled([
        billingService.getMemberStatement(Number(memberId)),
        attendanceService.getMemberAttendanceHistory(memberId),
        workoutFeedbackService.getMemberFeedback(memberId),
        workoutFeedbackService.getMemberSessions(memberId),
        messagingService.getMemberHistory(memberId),
        membersService.getNotes(memberId),
        addonsService.getAddons({ search: bizId, status: 'Active' }),
        promotionsService.getEligibilityMembers(),
        rewardService.getByMember(bizId),
        walletService.getWallet(bizId),
        referralService.getReferrals({ search: bizId, size: 50 }),
      ]);

      setStatement(statementR.status === 'fulfilled' ? statementR.value : null);
      setAttendance(attendanceR.status === 'fulfilled' ? attendanceR.value : []);
      setFeedback(feedbackR.status === 'fulfilled' ? feedbackR.value : []);
      setSessions(sessionsR.status === 'fulfilled' ? sessionsR.value : []);
      setCommunications(commsR.status === 'fulfilled' ? commsR.value : []);
      setNotes(notesR.status === 'fulfilled' ? notesR.value : []);
      setAddons(addonsR.status === 'fulfilled' ? addonsR.value.addons.filter(a => a.member_id === bizId) : []);
      setEligibility(eligibilityR.status === 'fulfilled'
        ? (eligibilityR.value.find(e => e.id === String(memberId)) ?? null) : null);
      setRewards(rewardsR.status === 'fulfilled' ? rewardsR.value : []);
      setWallet(walletR.status === 'fulfilled' ? walletR.value : null);
      setReferrals(referralsR.status === 'fulfilled'
        ? referralsR.value.referrals.filter(r => r.referrerMemberId === bizId) : []);
    } catch (e) {
      console.error('Failed to load member analytics:', e);
      setLoadError('Failed to load this member. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Member search (switch to a different member) ────────────────────────
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    let cancelled = false;
    const timer = setTimeout(() => {
      membersService.searchMembers(searchQuery)
        .then(results => { if (!cancelled) { setSearchResults(results); setSearchOpen(true); } })
        .catch(() => { if (!cancelled) setSearchResults([]); });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [searchQuery]);

  const switchToMember = (m: Member) => {
    setSearchQuery('');
    setSearchOpen(false);
    setSearchResults([]);
    onNavigate?.('member-history-analytics', { memberId: m.id });
  };

  // ── Derived values ────────────────────────────────────────────────────
  const daysRemaining = member?.expiry_date
    ? differenceInDays(safeDate(member.expiry_date) as Date, new Date())
    : null;

  const statementLines = statement?.lines ?? [];
  const totalPaid = statement?.total_paid ?? 0;
  const outstandingDues = member?.outstanding_balance ?? 0;
  const totalTransactions = mergeTransactionLines(statementLines).length;

  const paymentBreakdown = statementLines.reduce((acc, l) => {
    if (l.credit > 0 && l.payment_method) {
      acc[l.payment_method] = (acc[l.payment_method] || 0) + l.credit;
    }
    return acc;
  }, {} as Record<string, number>);
  const paymentPieData = Object.entries(paymentBreakdown).map(([name, value]) => ({ name, value }));

  const totalAttendanceMinutes = attendance.reduce((s, a) => s + (a.total_minutes || 0), 0);
  const totalHours = Math.round((totalAttendanceMinutes / 60) * 10) / 10;
  const totalVisitDays = new Set(attendance.map(a => (a.check_in_time || '').slice(0, 10))).size;
  const avgDurationHours = attendance.length > 0
    ? Math.round((totalAttendanceMinutes / attendance.length / 60) * 10) / 10 : 0;
  const now = new Date();
  const thisMonthVisits = attendance.filter(a => {
    const d = safeDate(a.check_in_time);
    return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const monthlyAttendanceMap: Record<string, number> = {};
  attendance.forEach(a => {
    const d = safeDate(a.check_in_time);
    if (!d) return;
    const key = format(d, 'MMM yyyy');
    monthlyAttendanceMap[key] = (monthlyAttendanceMap[key] || 0) + (a.total_minutes || 0) / 60;
  });
  const attendanceChartData = Object.entries(monthlyAttendanceMap)
    .map(([month, hours]) => ({ month, hours: Math.round(hours * 10) / 10 }))
    .slice(-7);

  const weeklyDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklyCounts = [0, 0, 0, 0, 0, 0, 0];
  attendance.forEach(a => {
    const d = safeDate(a.check_in_time);
    if (d) weeklyCounts[d.getDay()]++;
  });
  const weeklyOrder = [1, 2, 3, 4, 5, 6, 0];
  const weeklyData = weeklyOrder.map(i => ({ day: weeklyDayNames[i], visits: weeklyCounts[i] }));

  const monthlyRevenueMap: Record<string, number> = {};
  statementLines.forEach(l => {
    if (l.credit > 0) {
      const d = safeDate(l.date);
      if (!d) return;
      const key = format(d, 'MMM yyyy');
      monthlyRevenueMap[key] = (monthlyRevenueMap[key] || 0) + l.credit;
    }
  });
  const revenueChartData = Object.entries(monthlyRevenueMap)
    .map(([month, amount]) => ({ month, amount: Math.round(amount * 100) / 100 }))
    .slice(-7);

  const timelineItems: TimelineItem[] = [];
  statementLines.forEach(l => {
    const d = safeDate(l.date);
    if (!d) return;
    if (l.type === 'Invoice') {
      timelineItems.push({ date: d, event: 'Invoice', detail: l.description, type: 'membership' });
    } else if (l.credit > 0) {
      timelineItems.push({
        date: d, event: 'Payment',
        detail: `${currencyCode} ${l.credit.toLocaleString()} via ${l.payment_method || 'unknown method'}`,
        type: 'payment',
      });
    }
  });
  addons.forEach(a => {
    const d = safeDate(a.purchase_date);
    if (d) timelineItems.push({ date: d, event: 'Add-on Purchase', detail: a.addon_name, type: 'addon' });
  });
  referrals.forEach(r => {
    const d = safeDate(r.date || r.createdAt);
    if (d) timelineItems.push({ date: d, event: 'Referral', detail: `Referred ${r.refereeName}`, type: 'referral' });
  });
  timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime());

  const ptSessions = sessions.filter(s => (s.workout_type || '').toLowerCase().includes('personal')).length;

  // ── Communication tab derived data ───────────────────────────────────────
  const filteredCommunications = communications.filter(msg => {
    const matchesChannel = channelFilter === 'all' || msg.type === channelFilter;
    const q = communicationSearch.toLowerCase();
    const matchesSearch = !q || msg.subject.toLowerCase().includes(q) || msg.content.toLowerCase().includes(q);
    return matchesChannel && matchesSearch;
  });
  const communicationStats = {
    total: communications.length,
    sent: communications.filter(m => m.status === 'sent' || m.status === 'sending').length,
    failedOrPending: communications.filter(m => m.status === 'failed' || m.status === 'scheduled' || m.status === 'partial').length,
  };
  const channelBreakdown = ['sms', 'email', 'whatsapp', 'in-app']
    .map(ch => ({ name: ch, value: communications.filter(m => m.type === ch).length }))
    .filter(c => c.value > 0);

  // ── Transactions tab derived data ────────────────────────────────────────
  const filteredTransactionLines = statementLines.filter(l => {
    const d = safeDate(l.date);
    if (transactionDateFrom && d && d < new Date(transactionDateFrom)) return false;
    if (transactionDateTo && d && d > new Date(transactionDateTo)) return false;
    if (transactionTypeFilter !== 'all') {
      const desc = `${l.type} ${l.description}`.toLowerCase();
      if (transactionTypeFilter === 'membership' && !desc.includes('invoice') && !desc.includes('plan')) return false;
      if (transactionTypeFilter === 'payment' && l.type !== 'Payment') return false;
    }
    if (transactionSearch) {
      const q = transactionSearch.toLowerCase();
      if (!l.receipt_no.toLowerCase().includes(q) && !l.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Total Billed/Total Paid below sum from the unmerged filteredTransactionLines
  // so the ledger totals stay exact regardless of how rows are grouped for display.
  const mergedTransactionLines = mergeTransactionLines(filteredTransactionLines);

  // ── Actions ───────────────────────────────────────────────────────────────
  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'sms': return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'email': return <Mail className="h-4 w-4 text-purple-600" />;
      case 'whatsapp': return <MessageSquare className="h-4 w-4 text-green-600" />;
      default: return <Send className="h-4 w-4" />;
    }
  };

  const getMessageStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-100 text-green-700 flex items-center gap-1"><CheckCircle className="h-3.5 w-3.5" />Sent</Badge>;
      case 'sending':
        return <Badge className="bg-yellow-100 text-yellow-700 flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Sending</Badge>;
      case 'scheduled':
        return <Badge className="bg-gray-100 text-gray-700 flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Scheduled</Badge>;
      case 'partial':
        return <Badge className="bg-orange-100 text-orange-700 flex items-center gap-1"><AlertCircle className="h-3.5 w-3.5" />Partial</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-700 flex items-center gap-1"><XCircle className="h-3.5 w-3.5" />Failed</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleFreeze = async () => {
    if (!member || !memberId) return;
    if (!freezeEndDate) { toast.error('Please select a freeze end date'); return; }
    setSavingFreeze(true);
    try {
      const freezeUntil = freezeEndDate.toISOString().split('T')[0] + 'T00:00:00Z';
      await membersService.freezeMember(String(memberId), { freezeUntil, reason: freezeReason || undefined });
      toast.success('Membership frozen successfully');
      setIsFreezeDialogOpen(false);
      setFreezeStartDate(undefined);
      setFreezeEndDate(undefined);
      setFreezeReason('');
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to freeze membership');
    } finally {
      setSavingFreeze(false);
    }
  };

  const handleUnfreeze = async () => {
    if (!memberId) return;
    setSavingFreeze(true);
    try {
      await membersService.unfreezeMember(String(memberId));
      toast.success('Membership unfrozen successfully');
      setIsFreezeDialogOpen(false);
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to unfreeze membership');
    } finally {
      setSavingFreeze(false);
    }
  };

  const handleTransfer = async () => {
    if (!memberId) return;
    if (!transferForm.fullName || !transferForm.mobileNumber || !transferForm.confirmTransfer) return;
    setSavingTransfer(true);
    try {
      await membersService.updateMember(String(memberId), {
        name: transferForm.fullName,
        phone: transferForm.mobileNumber,
        email: transferForm.email || undefined,
        gender: transferForm.gender || undefined,
        date_of_birth: transferForm.dateOfBirth || undefined,
      } as Partial<Member>);
      toast.success('Membership transferred successfully', {
        description: `Updated to ${transferForm.fullName}`,
      });
      setIsTransferModalOpen(false);
      setTransferForm({ fullName: '', mobileNumber: '', email: '', gender: '', dateOfBirth: '', confirmTransfer: false });
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to transfer membership');
    } finally {
      setSavingTransfer(false);
    }
  };

  const handleDeactivate = async () => {
    if (!memberId || !deactivateForm.confirmDeactivation) return;
    setSavingDeactivate(true);
    try {
      await membersService.updateMember(String(memberId), { membership_status: 'inactive' } as Partial<Member>);
      if (deactivateForm.reason.trim()) {
        await membersService.addNote(String(memberId),
          `Deactivated on ${deactivateForm.effectiveDate}: ${deactivateForm.reason.trim()}`);
      }
      toast.success('Membership deactivated successfully');
      setIsDeactivateModalOpen(false);
      setDeactivateForm({ effectiveDate: new Date().toISOString().split('T')[0], reason: '', confirmDeactivation: false });
      loadAll();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to deactivate membership');
    } finally {
      setSavingDeactivate(false);
    }
  };

  const handleAddNote = async () => {
    if (!memberId || !newNote.trim()) return;
    setSavingNote(true);
    try {
      await membersService.addNote(String(memberId), newNote.trim());
      setNewNote('');
      const updated = await membersService.getNotes(String(memberId));
      setNotes(updated);
      toast.success('Note added');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleViewReceiptLine = async (lineId?: number) => {
    if (!lineId) { toast.error('No receipt available for this line'); return; }
    try {
      const receipt = await receiptsService.getReceiptById(String(lineId));
      downloadReceiptInvoice(receipt, currencyCode);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to open receipt');
    }
  };

  // ── Loading / empty states ───────────────────────────────────────────────
  if (!memberId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-[1400px] mx-auto">
          <Card className="overflow-hidden border-primary/20">
            <CardContent className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No member selected. Open analytics from a member's profile.</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => onNavigate?.('members')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Members
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Loading member analytics...</p>
        </div>
      </div>
    );
  }

  if (loadError || !member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
        <div className="max-w-[1400px] mx-auto">
          <Card className="overflow-hidden border-primary/20">
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
              <p className="text-gray-600">{loadError || 'Member not found.'}</p>
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="outline" size="sm" onClick={() => onNavigate?.('members')}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Members
                </Button>
                <Button size="sm" className="btn-primary" onClick={loadAll}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isFrozen = member.membership_status === 'frozen';
  const isActive = member.membership_status === 'active';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
      {/* Header with Search */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate?.('members')}
              className="text-gray-600 hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Members
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <Card className="overflow-hidden border-primary/10 shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="relative">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search member by name, mobile, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                  className="pl-10 border-primary/20"
                />
              </div>
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-primary/20 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {searchResults.map((r) => (
                    <button
                      key={r.id}
                      className="w-full text-left px-4 py-2 hover:bg-gradient-light flex items-center space-x-3"
                      onClick={() => switchToMember(r)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={r.photo_url} alt={r.name} />
                        <AvatarFallback className="bg-gradient-primary text-white text-xs">{initialsOf(r.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.member_id || r.id} • {r.phone}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Current Member Summary Bar */}
        <Card className="overflow-hidden mt-4 border-primary/20 bg-gradient-light shadow-sm">
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16 border-2 border-primary shadow-sm">
                  <AvatarImage src={member.photo_url} alt={member.name} />
                  <AvatarFallback className="bg-gradient-primary text-white">{initialsOf(member.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold text-lg">{member.name}</h3>
                    <Badge className="bg-gradient-primary text-white capitalize">{member.membership_status}</Badge>
                  </div>
                  <p className="text-sm text-gray-600">Member ID: {member.member_id || member.id}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-white/70 px-3 py-2 border border-primary/10">
                  <p className="text-gray-600">Current Plan</p>
                  <p className="font-semibold text-primary">{member.membership_plan || member.membership_type || '—'}</p>
                </div>
                <div className="rounded-lg bg-white/70 px-3 py-2 border border-primary/10">
                  <p className="text-gray-600">Days Remaining</p>
                  <p className="font-semibold text-orange-600">{daysRemaining !== null ? `${daysRemaining} days` : '—'}</p>
                </div>
                <div className="rounded-lg bg-white/70 px-3 py-2 border border-primary/10">
                  <p className="text-gray-600">Joined</p>
                  <p className="font-semibold">{fmtDate(member.membership_start_date || member.join_date)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Membership & Add-On Overview Card */}
      <Card className="overflow-hidden border-primary/20 mb-6">
        <CardHeader className="bg-gradient-light border-b border-primary/10">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>Current Membership & Add-Ons</span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                className="border-[#2B7A78] text-[#2B7A78] hover:bg-[#DFF5F4]"
                onClick={() => setIsFreezeDialogOpen(true)}
              >
                <Snowflake className="h-4 w-4 mr-2" />
                {isFrozen ? 'Unfreeze' : 'Freeze'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-primary/20"
                onClick={() => setIsTransferModalOpen(true)}
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Transfer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-600 hover:bg-red-50"
                onClick={() => setIsDeactivateModalOpen(true)}
                disabled={!isActive && !isFrozen}
              >
                <UserX className="h-4 w-4 mr-2" />
                Deactivate
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Current Plan</p>
              <p className="font-semibold text-gray-900">{member.membership_plan || member.membership_type || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Start Date</p>
              <p className="font-semibold text-gray-900">{fmtDate(member.membership_start_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Expiry Date</p>
              <p className="font-semibold text-gray-900">
                {fmtDate(member.expiry_date)}{' '}
                {daysRemaining !== null && (
                  <span className={daysRemaining < 0 ? 'text-red-600 text-xs' : 'text-green-600 text-xs'}>
                    ({daysRemaining} days {daysRemaining < 0 ? 'overdue' : 'left'})
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Add-Ons</p>
              <div className="flex flex-wrap gap-1">
                {addons.length === 0 && <span className="text-sm text-gray-400">None</span>}
                {addons.map(a => (
                  <Badge key={a.id} variant="outline" className="border-primary/30 text-xs">{a.addon_name}</Badge>
                ))}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <Badge className={
                isActive ? 'bg-green-100 text-green-700 flex items-center gap-1 w-fit'
                  : isFrozen ? 'bg-blue-100 text-blue-700 flex items-center gap-1 w-fit'
                    : 'bg-gray-100 text-gray-700 flex items-center gap-1 w-fit'
              }>
                {isActive ? <CheckCircle className="h-3.5 w-3.5" /> : <Snowflake className="h-3.5 w-3.5" />}
                <span className="capitalize">{member.membership_status}</span>
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Payment Mode</p>
              <p className="font-semibold text-gray-900">{member.payment_method_used || '—'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Paid</p>
              <p className="font-semibold text-gray-900"><CurrencyGlyph /> {totalPaid.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Outstanding Dues</p>
              <p className={`font-semibold ${outstandingDues > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                <CurrencyGlyph /> {outstandingDues.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Layout: Left Sidebar + Right Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar - Member Overview Panel */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-6 lg:self-start">
          {/* Member Info Card */}
          <Card className="overflow-hidden border-primary/20">
            <CardHeader className="bg-gradient-light border-b border-primary/10">
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5 text-primary" />
                <span>Member Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col items-center mb-4">
                <Avatar className="h-24 w-24 mb-3 border-4 border-primary/20">
                  <AvatarImage src={member.photo_url} alt={member.name} />
                  <AvatarFallback className="bg-gradient-primary text-white text-2xl">{initialsOf(member.name)}</AvatarFallback>
                </Avatar>
                <h3 className="font-semibold text-lg">{member.name}</h3>
                <p className="text-sm text-gray-600">{member.member_id || member.id}</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center space-x-3 text-sm">
                  <Mail className="h-4 w-4 text-primary" />
                  <span className="text-gray-600">{member.email || '—'}</span>
                </div>
                <div className="flex items-center space-x-3 text-sm">
                  <Phone className="h-4 w-4 text-primary" />
                  <span className="text-gray-600">{member.phone || '—'}</span>
                </div>
                {member.address && (
                  <div className="flex items-center space-x-3 text-sm">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-gray-600">{member.address}</span>
                  </div>
                )}
                {member.family_head_name && (
                  <div className="flex items-center space-x-3 text-sm">
                    <Users className="h-4 w-4 text-primary" />
                    <span className="text-gray-600">Family Head: {member.family_head_name}</span>
                  </div>
                )}
                <div className="flex items-center space-x-3 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-gray-600">Joined: {fmtDate(member.membership_start_date || member.join_date)}</span>
                </div>
              </div>

              <Separator />

              {/* Key Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Total Time</p>
                  <p className="font-semibold text-primary">{totalHours}h</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Total Income</p>
                  <p className="font-semibold text-green-600"><CurrencyGlyph /> {totalPaid.toLocaleString()}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Total Visits</p>
                  <p className="font-semibold text-purple-600">{member.total_visits ?? attendance.length}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">Transactions</p>
                  <p className="font-semibold text-orange-600">{totalTransactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary Card */}
          <Card className="overflow-hidden border-primary/20">
            <CardHeader className="bg-gradient-light border-b border-primary/10">
              <CardTitle className="flex items-center space-x-2">
                <Wallet className="h-5 w-5 text-primary" />
                <span>Payment Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Total Transactions</span>
                  <span className="font-semibold">{totalTransactions}</span>
                </div>
                {Object.entries(paymentBreakdown).map(([method, amount]) => (
                  <div className="flex justify-between items-center" key={method}>
                    <span className="text-sm text-gray-600 capitalize">By {method}</span>
                    <span className="font-semibold text-blue-600"><CurrencyGlyph /> {amount.toLocaleString()}</span>
                  </div>
                ))}
                {Object.keys(paymentBreakdown).length === 0 && (
                  <p className="text-sm text-gray-400">No payments recorded yet</p>
                )}
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Outstanding Dues</span>
                  <span className="font-semibold text-red-600"><CurrencyGlyph /> {outstandingDues.toLocaleString()}</span>
                </div>
              </div>

              {paymentPieData.length > 0 && (
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={150}>
                    <RePieChart>
                      <Pie
                        data={paymentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {paymentPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RePieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {wallet && wallet.balance > 0 && (
                <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 flex justify-between items-center">
                  <span className="text-sm text-purple-800">Reward Wallet Balance</span>
                  <span className="font-semibold text-purple-700"><CurrencyGlyph /> {wallet.balance.toLocaleString()}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="overflow-hidden border-primary/20">
            <CardHeader className="bg-gradient-light border-b border-primary/10">
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary" />
                <span>Quick Actions</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              <Button variant="outline" className="w-full justify-start border-primary/20" onClick={() => onNavigate?.('billing')}>
                <Receipt className="h-4 w-4 mr-2" />
                View Receipts
              </Button>
              <Button variant="outline" className="w-full justify-start border-primary/20" onClick={() => onNavigate?.('members')}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Renew / Upgrade Plan
              </Button>
              <Button variant="outline" className="w-full justify-start border-primary/20" onClick={() => onNavigate?.('plans-services-catalog')}>
                <ShoppingCart className="h-4 w-4 mr-2" />
                Purchase Add-On
              </Button>
              <Button variant="outline" className="w-full justify-start border-primary/20" onClick={() => onNavigate?.('promotions-campaign')}>
                <Gift className="h-4 w-4 mr-2" />
                Set Target / Offer Discount
              </Button>
              <Button variant="outline" className="w-full justify-start border-primary/20" onClick={() => onNavigate?.('messaging')}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Content - Detailed Analytics Tabs */}
        <div className="lg:col-span-8">
          <Card className="overflow-hidden border-primary/20">
            <Tabs defaultValue="timeline" className="w-full">
              <CardHeader className="bg-gradient-light border-b border-primary/10">
                <TabsList className="w-full overflow-x-auto flex flex-nowrap gap-1.5 bg-slate-100/80 p-1.5 rounded-xl border border-border/70">
                  <TabsTrigger value="timeline" className="flex-none justify-center rounded-lg border border-transparent bg-white/70 text-foreground hover:bg-white data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm whitespace-nowrap px-4 py-1.5 text-xs sm:text-sm">
                    Activity Timeline
                  </TabsTrigger>
                  <TabsTrigger value="financial" className="flex-none justify-center rounded-lg border border-transparent bg-white/70 text-foreground hover:bg-white data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm whitespace-nowrap px-4 py-1.5 text-xs sm:text-sm">
                    Financial History
                  </TabsTrigger>
                  <TabsTrigger value="usage" className="flex-none justify-center rounded-lg border border-transparent bg-white/70 text-foreground hover:bg-white data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm whitespace-nowrap px-4 py-1.5 text-xs sm:text-sm">
                    Gym Usage
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="flex-none justify-center rounded-lg border border-transparent bg-white/70 text-foreground hover:bg-white data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm whitespace-nowrap px-4 py-1.5 text-xs sm:text-sm">
                    Performance
                  </TabsTrigger>
                  <TabsTrigger value="promotions" className="flex-none justify-center rounded-lg border border-transparent bg-white/70 text-foreground hover:bg-white data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm whitespace-nowrap px-4 py-1.5 text-xs sm:text-sm">
                    Promotions
                  </TabsTrigger>
                  <TabsTrigger value="feedback" className="flex-none justify-center rounded-lg border border-transparent bg-white/70 text-foreground hover:bg-white data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm whitespace-nowrap px-4 py-1.5 text-xs sm:text-sm">
                    Workout Feedback
                  </TabsTrigger>
                  <TabsTrigger value="communication" className="flex-none justify-center rounded-lg border border-transparent bg-white/70 text-foreground hover:bg-white data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm whitespace-nowrap px-4 py-1.5 text-xs sm:text-sm">
                    Communication History
                  </TabsTrigger>
                  <TabsTrigger value="transactions" className="flex-none justify-center rounded-lg border border-transparent bg-white/70 text-foreground hover:bg-white data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm whitespace-nowrap px-4 py-1.5 text-xs sm:text-sm">
                    Transactions
                  </TabsTrigger>
                  <TabsTrigger value="notes" className="flex-none justify-center rounded-lg border border-transparent bg-white/70 text-foreground hover:bg-white data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm whitespace-nowrap px-4 py-1.5 text-xs sm:text-sm">
                    Notes
                  </TabsTrigger>
                </TabsList>
              </CardHeader>

              <CardContent className="p-6">
                {/* Tab 1: Activity Timeline */}
                <TabsContent value="timeline" className="space-y-4 mt-0">
                  {timelineItems.length === 0 ? (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No activity recorded yet</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {timelineItems.slice(0, 30).map((activity, index) => (
                        <div key={index} className="flex items-start space-x-4">
                          <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                            activity.type === 'membership' ? 'bg-purple-100' :
                            activity.type === 'payment' ? 'bg-green-100' :
                            activity.type === 'addon' ? 'bg-blue-100' :
                            'bg-orange-100'
                          }`}>
                            {activity.type === 'membership' && <CreditCard className="h-5 w-5 text-purple-600" />}
                            {activity.type === 'payment' && <DollarSign className="h-5 w-5 text-green-600" />}
                            {activity.type === 'addon' && <ShoppingCart className="h-5 w-5 text-blue-600" />}
                            {activity.type === 'referral' && <Share2 className="h-5 w-5 text-orange-600" />}
                          </div>
                          <div className="flex-1 border-l-2 border-gray-200 pl-4 pb-6">
                            <div className="flex items-center justify-between mb-1">
                              <h4 className="font-semibold text-gray-900">{activity.event}</h4>
                              <span className="text-sm text-gray-500">{format(activity.date, 'dd MMM yyyy, h:mm a')}</span>
                            </div>
                            <p className="text-sm text-gray-600">{activity.detail}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Tab 2: Financial & Payment History */}
                <TabsContent value="financial" className="space-y-6 mt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-primary/10">
                          <th className="text-left p-3 text-sm font-semibold text-primary">Date</th>
                          <th className="text-left p-3 text-sm font-semibold text-primary">Type</th>
                          <th className="text-left p-3 text-sm font-semibold text-primary">Mode</th>
                          <th className="text-right p-3 text-sm font-semibold text-primary">Amount</th>
                          <th className="text-left p-3 text-sm font-semibold text-primary">Remarks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {statementLines.map((line, index) => (
                          <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="p-3 text-sm">{fmtDate(line.date)}</td>
                            <td className="p-3 text-sm">{line.type}</td>
                            <td className="p-3 text-sm">
                              <Badge variant="outline" className="border-primary/30">{line.payment_method || '—'}</Badge>
                            </td>
                            <td className={`p-3 text-sm text-right font-semibold ${line.credit > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                              <CurrencyGlyph /> {(line.credit > 0 ? line.credit : line.debit).toLocaleString()}
                            </td>
                            <td className="p-3 text-sm text-gray-600">{line.description}</td>
                          </tr>
                        ))}
                        {statementLines.length === 0 && (
                          <tr><td colSpan={5} className="p-6 text-center text-gray-500">No financial history yet</td></tr>
                        )}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gradient-light border-t-2 border-primary/20">
                          <td colSpan={3} className="p-3 text-sm font-semibold">Total Paid</td>
                          <td className="p-3 text-sm text-right font-semibold text-green-600">
                            <CurrencyGlyph /> {totalPaid.toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                        <tr className="bg-red-50">
                          <td colSpan={3} className="p-3 text-sm font-semibold">Outstanding</td>
                          <td className="p-3 text-sm text-right font-semibold text-red-600">
                            <CurrencyGlyph /> {outstandingDues.toLocaleString()}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {revenueChartData.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-semibold mb-4">Income Over Time</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={revenueChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="amount" fill="#0047AB" name={`Revenue (${currencyCode})`} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 3: Gym Usage Analytics */}
                <TabsContent value="usage" className="space-y-6 mt-0">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="overflow-hidden border-primary/20 bg-blue-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Total Hours</p>
                            <p className="text-2xl font-bold text-primary">{totalHours}</p>
                          </div>
                          <Clock className="h-8 w-8 text-primary/40" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-primary/20 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Total Days</p>
                            <p className="text-2xl font-bold text-green-600">{totalVisitDays}</p>
                          </div>
                          <Calendar className="h-8 w-8 text-green-600/40" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-primary/20 bg-purple-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Avg Duration</p>
                            <p className="text-2xl font-bold text-purple-600">{avgDurationHours}h</p>
                          </div>
                          <Activity className="h-8 w-8 text-purple-600/40" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-primary/20 bg-orange-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">This Month</p>
                            <p className="text-2xl font-bold text-orange-600">{thisMonthVisits}</p>
                          </div>
                          <Percent className="h-8 w-8 text-orange-600/40" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {attendanceChartData.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-4">Attendance Over Time</h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={attendanceChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="hours" stroke="#0047AB" strokeWidth={2} name="Hours" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {attendance.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-4">Most Active Days</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="visits" fill="#00c5cb" name="Visits" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {attendance.length === 0 && (
                    <div className="text-center py-12">
                      <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No attendance records yet</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 4: Performance & Engagement */}
                <TabsContent value="performance" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="overflow-hidden border-primary/20">
                      <CardContent className="p-6 text-center">
                        <Share2 className="h-12 w-12 mx-auto mb-3 text-orange-600" />
                        <p className="text-3xl font-bold text-orange-600 mb-1">{referrals.length}</p>
                        <p className="text-sm text-gray-600">Referrals Made</p>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-primary/20">
                      <CardContent className="p-6 text-center">
                        <Users className="h-12 w-12 mx-auto mb-3 text-purple-600" />
                        <p className="text-3xl font-bold text-purple-600 mb-1">{ptSessions}</p>
                        <p className="text-sm text-gray-600">PT Sessions</p>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-primary/20">
                      <CardContent className="p-6 text-center">
                        <Dumbbell className="h-12 w-12 mx-auto mb-3 text-blue-600" />
                        <p className="text-3xl font-bold text-blue-600 mb-1">{sessions.length}</p>
                        <p className="text-sm text-gray-600">Total Workout Sessions</p>
                      </CardContent>
                    </Card>
                  </div>

                  {referrals.length === 0 && ptSessions === 0 && sessions.length === 0 && (
                    <div className="text-center py-6">
                      <p className="text-sm text-gray-500">No performance activity recorded yet for this member.</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab 5: Promotion & Discount Eligibility */}
                <TabsContent value="promotions" className="space-y-6 mt-0">
                  {/* Loyalty eligibility */}
                  {eligibility ? (
                    <Card className="overflow-hidden border-green-200 bg-green-50">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                            <Gift className="h-6 w-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                              <Star className="h-4 w-4" />
                              <span>This member is a candidate for a loyalty promotion</span>
                            </h4>
                            <ul className="space-y-2 text-sm text-green-800 mb-4">
                              <li className="flex items-center space-x-2">
                                <CheckCircle className="h-4 w-4" />
                                <span>{eligibility.renewalCount ?? 0} renewals completed</span>
                              </li>
                              <li className="flex items-center space-x-2">
                                <CheckCircle className="h-4 w-4" />
                                <span>Lifetime spend <CurrencyGlyph /> {totalPaid.toLocaleString()}</span>
                              </li>
                              {eligibility.currentPlan && (
                                <li className="flex items-center space-x-2">
                                  <CheckCircle className="h-4 w-4" />
                                  <span>Current plan: {eligibility.currentPlan.name}</span>
                                </li>
                              )}
                            </ul>
                            <Badge className="bg-green-600 text-white">Eligible for loyalty promotions</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="overflow-hidden border-primary/20 bg-gray-50">
                      <CardContent className="p-6 flex items-center space-x-3">
                        <AlertCircle className="h-5 w-5 text-gray-400" />
                        <p className="text-sm text-gray-600">Not currently eligible for a loyalty promotion.</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Reward / Promotion History */}
                  <Card className="overflow-hidden border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg">Promotion &amp; Reward History</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {rewards.length === 0 ? (
                        <p className="text-sm text-gray-500 py-4 text-center">No promotions or rewards yet</p>
                      ) : (
                        <div className="space-y-3">
                          {rewards.map((r) => (
                            <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <p className="font-medium">{r.rewardName}</p>
                                <p className="text-sm text-gray-600">
                                  {fmtDate(r.generatedDate)}{r.couponCode ? ` • Coupon: ${r.couponCode}` : ''}
                                </p>
                              </div>
                              <Badge variant="outline" className={
                                r.status === 'REDEEMED' || r.status === 'CLAIMED'
                                  ? 'border-green-600 text-green-600'
                                  : r.status === 'EXPIRED' || r.status === 'CANCELLED'
                                    ? 'border-red-500 text-red-500'
                                    : 'border-blue-600 text-blue-600'
                              }>
                                {r.rewardValue ? `${currencyCode} ${r.rewardValue}` : r.status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {wallet && (
                    <Card className="overflow-hidden border-purple-200 bg-purple-50">
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-3 mb-3">
                          <Wallet className="h-6 w-6 text-purple-600" />
                          <h4 className="font-semibold text-purple-900">Reward Wallet</h4>
                        </div>
                        <p className="text-2xl font-bold text-purple-800 mb-1"><CurrencyGlyph /> {wallet.balance.toLocaleString()}</p>
                        <p className="text-sm text-purple-700">Current balance • {wallet.transactions.length} transactions</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* Tab 6: Workout Feedback */}
                <TabsContent value="feedback" className="space-y-6 mt-0">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="font-semibold">Post-Workout Feedback</h4>
                      <p className="text-sm text-gray-600">Member satisfaction and workout reviews</p>
                    </div>
                    <Badge className="bg-gradient-primary text-white">{feedback.length} Total Reviews</Badge>
                  </div>

                  {feedback.length === 0 ? (
                    <div className="text-center py-12">
                      <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No workout feedback submitted yet</p>
                    </div>
                  ) : (
                    <>
                      <Card className="overflow-hidden border-primary/20 bg-gradient-light">
                        <CardContent className="p-6">
                          <h4 className="font-semibold mb-4">Average Ratings</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-2">
                                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                              </div>
                              <p className="text-2xl font-bold text-primary">
                                {(feedback.reduce((acc, f) => acc + (f.overall_satisfaction || 0), 0) / feedback.length).toFixed(1)}
                              </p>
                              <p className="text-xs text-gray-600">Overall</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-2">
                                <Activity className="h-5 w-5 text-orange-500" />
                              </div>
                              <p className="text-2xl font-bold text-orange-600">
                                {(feedback.reduce((acc, f) => acc + (f.workout_intensity || 0), 0) / feedback.length).toFixed(1)}
                              </p>
                              <p className="text-xs text-gray-600">Intensity</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-2">
                                <Dumbbell className="h-5 w-5 text-blue-500" />
                              </div>
                              <p className="text-2xl font-bold text-blue-600">
                                {(feedback.reduce((acc, f) => acc + (f.equipment_quality || 0), 0) / feedback.length).toFixed(1)}
                              </p>
                              <p className="text-xs text-gray-600">Equipment</p>
                            </div>
                            <div className="text-center">
                              <div className="flex items-center justify-center mb-2">
                                <Building className="h-5 w-5 text-green-500" />
                              </div>
                              <p className="text-2xl font-bold text-green-600">
                                {(feedback.reduce((acc, f) => acc + (f.facility_rating || 0), 0) / feedback.length).toFixed(1)}
                              </p>
                              <p className="text-xs text-gray-600">Facility</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="space-y-4">
                        {feedback.map((f) => (
                          <Card key={f.id} className="border-primary/20">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <Badge className="bg-gradient-primary text-white">{f.workout_type || 'Workout'}</Badge>
                                    {f.class_name && <Badge variant="outline" className="border-primary/30">{f.class_name}</Badge>}
                                  </div>
                                  <CardTitle className="text-base">{f.trainer_name || 'Self-Guided'}</CardTitle>
                                  <CardDescription>{fmtDate(f.submitted_at)}</CardDescription>
                                </div>
                                <div className="flex items-center space-x-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`h-4 w-4 ${i < (f.overall_satisfaction || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}`} />
                                  ))}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">Intensity</p>
                                  <span className="text-sm font-semibold">{f.workout_intensity ?? '—'}/5</span>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">Equipment</p>
                                  <span className="text-sm font-semibold">{f.equipment_quality ?? '—'}/5</span>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">Facility</p>
                                  <span className="text-sm font-semibold">{f.facility_rating ?? '—'}/5</span>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-600 mb-1">Difficulty</p>
                                  <Badge variant="outline" className="text-xs border-primary/30">{(f.difficulty_level || '—').replace('-', ' ')}</Badge>
                                </div>
                              </div>

                              {f.best_aspects && f.best_aspects.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <CheckCircle className="h-4 w-4 text-green-600 mr-1" />
                                    Best Aspects
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {f.best_aspects.map((aspect, idx) => (
                                      <Badge key={idx} className="bg-green-100 text-green-700 border-green-200">{aspect}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {f.areas_for_improvement && f.areas_for_improvement.length > 0 && (
                                <div>
                                  <p className="text-sm font-medium text-gray-700 mb-2 flex items-center">
                                    <AlertCircle className="h-4 w-4 text-orange-600 mr-1" />
                                    Areas for Improvement
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {f.areas_for_improvement.map((area, idx) => (
                                      <Badge key={idx} className="bg-orange-100 text-orange-700 border-orange-200">{area}</Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {f.comments && (
                                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                                  <p className="text-sm font-medium text-blue-900 mb-1 flex items-center">
                                    <MessageSquare className="h-4 w-4 mr-1" />
                                    Member Comments
                                  </p>
                                  <p className="text-sm text-blue-800">{f.comments}</p>
                                </div>
                              )}

                              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                                <div className="text-center">
                                  <p className="text-xs text-gray-600 mb-1">Likely to Return</p>
                                  <p className="text-sm font-semibold text-primary">{f.likely_to_return ?? '—'}/10</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs text-gray-600 mb-1">Recommend</p>
                                  <Badge className={
                                    f.recommend_workout === 'yes' ? 'bg-green-100 text-green-700'
                                      : f.recommend_workout === 'maybe' ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700'
                                  }>
                                    {f.recommend_workout || '—'}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Tab 7: Communication History */}
                <TabsContent value="communication" className="space-y-6 mt-0">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="overflow-hidden border-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Total Messages</p>
                            <p className="text-2xl font-bold text-primary">{communicationStats.total}</p>
                          </div>
                          <Send className="h-8 w-8 text-primary/30" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-green-600 mb-1">Sent</p>
                            <p className="text-2xl font-bold text-green-700">{communicationStats.sent}</p>
                          </div>
                          <CheckCircle className="h-8 w-8 text-green-300" />
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-red-600 mb-1">Failed/Pending</p>
                            <p className="text-2xl font-bold text-red-700">{communicationStats.failedOrPending}</p>
                          </div>
                          <AlertCircle className="h-8 w-8 text-red-300" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {channelBreakdown.length > 0 && (
                    <Card className="overflow-hidden border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-base">Channel Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={200}>
                          <RePieChart>
                            <Pie data={channelBreakdown} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5} dataKey="value" label>
                              {channelBreakdown.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RePieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="overflow-hidden border-primary/20 bg-gradient-light">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Channel</label>
                          <Select value={channelFilter} onValueChange={setChannelFilter}>
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="All Channels" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Channels</SelectItem>
                              <SelectItem value="sms">SMS</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="whatsapp">WhatsApp</SelectItem>
                              <SelectItem value="in-app">In-App</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 block">Search Messages</label>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                              placeholder="Search subject or content..."
                              value={communicationSearch}
                              onChange={(e) => setCommunicationSearch(e.target.value)}
                              className="pl-10 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-primary/10">
                        <p className="text-sm text-gray-600">
                          Showing <span className="font-semibold text-primary">{filteredCommunications.length}</span> of {communications.length} messages
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-primary/20">
                    <CardHeader>
                      <CardTitle>Message History</CardTitle>
                      <CardDescription>Complete communication log across all channels</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {filteredCommunications.map((msg) => (
                          <div
                            key={msg.id}
                            className="p-4 border border-gray-200 rounded-lg hover:border-primary/40 hover:bg-gradient-light cursor-pointer transition-all duration-200 group"
                            onClick={() => { setSelectedMessage(msg); setIsDrawerOpen(true); }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <div className="mt-1">{getChannelIcon(msg.type)}</div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h4 className="font-semibold text-gray-900 truncate">{msg.subject}</h4>
                                    <Badge variant="outline" className="border-blue-300 text-blue-700 text-xs capitalize">{msg.type}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 truncate mb-2">{msg.content}</p>
                                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                                    <span className="flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {fmtDateTime(msg.sent_date || msg.scheduled_date)}
                                    </span>
                                    {msg.sent_by && (
                                      <span className="flex items-center">
                                        <User className="h-3 w-3 mr-1" />
                                        {msg.sent_by}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                {getMessageStatusBadge(msg.status)}
                                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {filteredCommunications.length === 0 && (
                        <div className="text-center py-12">
                          <Send className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                          <p className="text-gray-600">
                            {communications.length === 0 ? 'No messages sent to this member yet' : 'No messages found matching your filters'}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 8: Transactions */}
                <TabsContent value="transactions" className="space-y-6 mt-0">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Transactions</h3>
                    <p className="text-sm text-gray-600">
                      All recorded payments and financial activities of this member, including membership renewals and add-ons.
                    </p>
                  </div>

                  <Card className="overflow-hidden border-primary/20">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>From Date</span>
                          </label>
                          <Input type="date" value={transactionDateFrom} onChange={(e) => setTransactionDateFrom(e.target.value)} className="w-full" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-500" />
                            <span>To Date</span>
                          </label>
                          <Input type="date" value={transactionDateTo} onChange={(e) => setTransactionDateTo(e.target.value)} className="w-full" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                            <Filter className="h-4 w-4 text-gray-500" />
                            <span>Transaction Type</span>
                          </label>
                          <Select value={transactionTypeFilter} onValueChange={setTransactionTypeFilter}>
                            <SelectTrigger>
                              <SelectValue placeholder="All Transactions" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Transactions</SelectItem>
                              <SelectItem value="membership">Membership / Invoices</SelectItem>
                              <SelectItem value="payment">Payments</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <div className="relative flex-1">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Search by receipt number or keyword..."
                            value={transactionSearch}
                            onChange={(e) => setTransactionSearch(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setTransactionDateFrom('');
                            setTransactionDateTo('');
                            setTransactionTypeFilter('all');
                            setTransactionSearch('');
                          }}
                        >
                          <RefreshCcw className="h-4 w-4 mr-2" />
                          Reset Filters
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-primary/20 shadow-md rounded-2xl overflow-hidden">
                    <CardHeader className="bg-gradient-primary text-white">
                      <CardTitle>Transaction History</CardTitle>
                      <CardDescription className="text-white/80">Complete financial activity log</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-gray-50 sticky top-0 z-10">
                            <TableRow>
                              <TableHead className="table-header">Date</TableHead>
                              <TableHead className="table-header">Type</TableHead>
                              <TableHead className="table-header">Receipt No.</TableHead>
                              <TableHead className="table-header">Mode</TableHead>
                              <TableHead className="table-header text-right">Amount ({currencyCode})</TableHead>
                              <TableHead className="table-header">Remarks</TableHead>
                              <TableHead className="table-header text-center">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {mergedTransactionLines.map((line, index) => (
                              <TableRow key={index} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-gradient-light transition-colors`}>
                                <TableCell className="font-medium">{fmtDate(line.date)}</TableCell>
                                <TableCell>
                                  <Badge className={line.type === 'Invoice' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}>
                                    {line.type}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="border-primary/30 font-mono">
                                    {line.type === 'Invoice' ? (line.invoice_no || line.receipt_no) : line.receipt_no}
                                  </Badge>
                                  {line.type === 'Payment' && line.invoice_no && (
                                    <div className="text-xs text-gray-400 mt-0.5 font-mono">Inv: {line.invoice_no}</div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge className="bg-blue-100 text-blue-700">{line.payment_method || '—'}</Badge>
                                </TableCell>
                                <TableCell className={`text-right font-semibold ${line.credit > 0 ? 'text-green-600' : 'text-gray-700'}`}>
                                  {(line.credit > 0 ? line.credit : line.debit).toLocaleString()}
                                </TableCell>
                                <TableCell className="text-gray-600">{line.description}</TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-center">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-blue-50 group"
                                      onClick={() => handleViewReceiptLine(line.id)}
                                    >
                                      <Eye className="h-4 w-4 text-gray-600 group-hover:text-blue-600" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            {mergedTransactionLines.length === 0 && (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center text-gray-500 py-8">No transactions found</TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>

                      <div className="border-t-2 border-primary/20 p-6 bg-gradient-light">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
                            <p className="text-2xl font-bold text-primary">{mergedTransactionLines.length}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Total Billed</p>
                            <p className="text-2xl font-bold text-purple-600">
                              <CurrencyGlyph /> {filteredTransactionLines.filter(l => l.type === 'Invoice').reduce((s, l) => s + l.debit, 0).toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Total Paid</p>
                            <p className="text-2xl font-bold text-green-600">
                              <CurrencyGlyph /> {filteredTransactionLines.reduce((s, l) => s + l.credit, 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* Tab 9: Notes */}
                <TabsContent value="notes" className="space-y-4 mt-0">
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2">Staff Notes</h4>
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a note about this member..."
                        rows={2}
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        className="btn-primary self-end"
                        disabled={!newNote.trim() || savingNote}
                        onClick={handleAddNote}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {notes.map((note) => (
                      <Card key={note.id} className="overflow-hidden border-primary/20">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="bg-gradient-primary text-white text-xs">
                                  {initialsOf(note.created_by || 'Staff')}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium">{note.created_by || 'Staff'}</p>
                                <p className="text-xs text-gray-500">{fmtDateTime(note.created_at)}</p>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700">{note.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                    {notes.length === 0 && (
                      <div className="text-center py-12">
                        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-600">No notes yet — add the first one above</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Message Details Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto" aria-describedby="message-details-description">
          {selectedMessage ? (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <SheetTitle className="flex items-center space-x-2">
                    {getChannelIcon(selectedMessage.type)}
                    <span>Message Details</span>
                  </SheetTitle>
                  <Button variant="ghost" size="sm" onClick={() => setIsDrawerOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <SheetDescription id="message-details-description">
                  Complete message information and delivery status
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <Card className="overflow-hidden border-primary/20">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Message ID</span>
                        <Badge variant="outline" className="font-mono">{selectedMessage.id}</Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Channel</span>
                        <div className="flex items-center space-x-2">
                          {getChannelIcon(selectedMessage.type)}
                          <span className="font-semibold capitalize">{selectedMessage.type}</span>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status</span>
                        {getMessageStatusBadge(selectedMessage.status)}
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Date Sent</span>
                        <span className="font-semibold text-sm">{fmtDateTime(selectedMessage.sent_date || selectedMessage.scheduled_date)}</span>
                      </div>
                      {selectedMessage.sent_by && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Sent By</span>
                            <Badge variant="outline">{selectedMessage.sent_by}</Badge>
                          </div>
                        </>
                      )}
                      {selectedMessage.recipient_count != null && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Recipients (campaign)</span>
                            <span className="font-semibold text-sm">{selectedMessage.recipient_count}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="overflow-hidden border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-base">Message Content</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Subject</label>
                      <p className="text-sm font-semibold text-gray-900">{selectedMessage.subject}</p>
                    </div>
                    <Separator />
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Full Message</label>
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedMessage.content}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Transfer Membership Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <RefreshCcw className="h-5 w-5 text-primary" />
              <span>Transfer Membership</span>
            </DialogTitle>
            <DialogDescription>
              Update this membership's holder details. This renames the membership in place — the current plan, dates and dues stay attached to it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="fullName" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <User className="h-4 w-4 text-gray-500" />
                <span>Full Name *</span>
              </Label>
              <Input
                id="fullName"
                placeholder="Enter full name"
                value={transferForm.fullName}
                onChange={(e) => setTransferForm({ ...transferForm, fullName: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="mobileNumber" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>Mobile Number *</span>
              </Label>
              <Input
                id="mobileNumber"
                placeholder="+971 50 123 4567"
                value={transferForm.mobileNumber}
                onChange={(e) => setTransferForm({ ...transferForm, mobileNumber: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>Email (optional)</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={transferForm.email}
                  onChange={(e) => setTransferForm({ ...transferForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="gender" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>Gender (optional)</span>
                </Label>
                <Select value={transferForm.gender} onValueChange={(value) => setTransferForm({ ...transferForm, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="dob" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Date of Birth (optional)</span>
              </Label>
              <Input
                id="dob"
                type="date"
                value={transferForm.dateOfBirth}
                onChange={(e) => setTransferForm({ ...transferForm, dateOfBirth: e.target.value })}
              />
            </div>

            <Card className="overflow-hidden border-primary/20 bg-gradient-light">
              <CardContent className="p-4">
                <p className="text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  Remaining Plan Days
                </p>
                <p className="text-lg font-semibold text-primary">
                  {daysRemaining !== null ? `${daysRemaining} days will carry over to the new details` : 'No active expiry date on this membership'}
                </p>
              </CardContent>
            </Card>

            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="checkbox"
                id="confirmTransfer"
                checked={transferForm.confirmTransfer}
                onChange={(e) => setTransferForm({ ...transferForm, confirmTransfer: e.target.checked })}
                className="mt-1"
              />
              <Label htmlFor="confirmTransfer" className="text-sm text-blue-900 cursor-pointer flex items-start gap-2">
                <CheckCircle className="h-4 w-4 mt-0.5" />
                <span>I confirm these updated details for this membership.</span>
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsTransferModalOpen(false);
                setTransferForm({ fullName: '', mobileNumber: '', email: '', gender: '', dateOfBirth: '', confirmTransfer: false });
              }}
            >
              Cancel
            </Button>
            <Button
              className="btn-primary"
              disabled={!transferForm.fullName || !transferForm.mobileNumber || !transferForm.confirmTransfer || savingTransfer}
              onClick={handleTransfer}
            >
              {savingTransfer ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
              Transfer Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Membership Modal */}
      <Dialog open={isDeactivateModalOpen} onOpenChange={setIsDeactivateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-red-600">
              <UserX className="h-5 w-5" />
              <span>Deactivate Membership</span>
            </DialogTitle>
            <DialogDescription>Mark this member's plan as inactive</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="effectiveDate" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span>Effective Date</span>
              </Label>
              <Input
                id="effectiveDate"
                type="date"
                value={deactivateForm.effectiveDate}
                onChange={(e) => setDeactivateForm({ ...deactivateForm, effectiveDate: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="reason" className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <span>Reason for Deactivation (optional, saved as a note)</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="Enter reason for deactivation..."
                rows={3}
                value={deactivateForm.reason}
                onChange={(e) => setDeactivateForm({ ...deactivateForm, reason: e.target.value })}
              />
            </div>

            <Card className="overflow-hidden border-primary/20 bg-gradient-light">
              <CardContent className="p-4">
                <h4 className="font-semibold text-gray-900 mb-3">Current Membership Summary</h4>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Plan</p>
                    <p className="font-semibold">{member.membership_plan || member.membership_type || '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Days Remaining</p>
                    <p className="font-semibold text-orange-600">{daysRemaining !== null ? `${daysRemaining} days` : '—'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Total Paid</p>
                    <p className="font-semibold text-green-600"><CurrencyGlyph /> {totalPaid.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start space-x-3 p-4 bg-red-50 rounded-lg border border-red-200">
              <input
                type="checkbox"
                id="confirmDeactivation"
                checked={deactivateForm.confirmDeactivation}
                onChange={(e) => setDeactivateForm({ ...deactivateForm, confirmDeactivation: e.target.checked })}
                className="mt-1"
              />
              <Label htmlFor="confirmDeactivation" className="text-sm text-red-900 cursor-pointer flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <span>Confirm deactivation of this member's plan. This action will mark the membership as inactive.</span>
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeactivateModalOpen(false);
                setDeactivateForm({ effectiveDate: new Date().toISOString().split('T')[0], reason: '', confirmDeactivation: false });
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={!deactivateForm.confirmDeactivation || savingDeactivate}
              onClick={handleDeactivate}
            >
              {savingDeactivate ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <UserX className="h-4 w-4 mr-2" />}
              Deactivate Membership
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Freeze / Unfreeze Modal */}
      <Dialog open={isFreezeDialogOpen} onOpenChange={setIsFreezeDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Snowflake className="h-5 w-5 text-primary" />
              <span>{isFrozen ? 'Unfreeze Membership' : 'Freeze Membership'}</span>
            </DialogTitle>
            <DialogDescription>
              {isFrozen
                ? 'Reactivate this membership immediately.'
                : 'Temporarily pause this membership until a chosen date.'}
            </DialogDescription>
          </DialogHeader>

          {isFrozen ? (
            <div className="py-4 space-y-4">
              <Card className="overflow-hidden border-blue-200 bg-blue-50">
                <CardContent className="p-4 text-sm text-blue-900">
                  <p>This membership is currently frozen{member.freeze_reason ? `: ${member.freeze_reason}` : '.'}</p>
                  {member.freeze_end_date && <p className="mt-1">Scheduled to end: {fmtDate(member.freeze_end_date)}</p>}
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Freeze Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <Calendar className="mr-2 h-4 w-4" />
                        {freezeStartDate ? format(freezeStartDate, 'dd MMM yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={freezeStartDate} onSelect={setFreezeStartDate} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Freeze End Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left">
                        <Calendar className="mr-2 h-4 w-4" />
                        {freezeEndDate ? format(freezeEndDate, 'dd MMM yyyy') : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent mode="single" selected={freezeEndDate} onSelect={setFreezeEndDate} disabled={(date) => date < new Date()} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Reason (Optional)</Label>
                <Textarea
                  placeholder="Add reason or notes for this freeze..."
                  rows={3}
                  value={freezeReason}
                  onChange={(e) => setFreezeReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsFreezeDialogOpen(false)}>
              Cancel
            </Button>
            {isFrozen ? (
              <Button
                className="bg-[#2B7A78] hover:bg-[#236664] text-white"
                disabled={savingFreeze}
                onClick={handleUnfreeze}
              >
                {savingFreeze ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Snowflake className="h-4 w-4 mr-2" />}
                Unfreeze Membership
              </Button>
            ) : (
              <Button
                className="bg-[#E63946] hover:bg-[#d12935] text-white"
                disabled={!freezeEndDate || savingFreeze}
                onClick={handleFreeze}
              >
                {savingFreeze ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Snowflake className="h-4 w-4 mr-2" />}
                Freeze Membership
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
