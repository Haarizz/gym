import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { PhoneInput } from "../components/shared/PhoneInput";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  AlertCircle, BadgePercent, BarChart3, Briefcase, CalendarClock, Camera, CheckCircle, Clock, Coffee, DoorOpen, Footprints,
  Gauge, History, LogIn, LogOut, QrCode, RefreshCw, Search, Settings, Timer, Upload, UserCheck, UserPlus, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { styles, Kpi, Panel, Empty, SectionTabs, Seg, Status, fmtInt } from '../components/overview/overview-kit';
import { useBranch } from '../utils/branch-context';
import { membersService, type Member } from '../utils/supabase/members-service';
import { staffService, type Staff } from '../utils/supabase/staff-service';
import { checkInService, MinVisitNotReachedError, type CheckInSettings, type WalkInCheckInRequest } from '../utils/supabase/checkin-service';
import { staffAttendanceService, type DayReport, type DayVisit } from '../utils/supabase/staff-attendance-service';
import { attendanceService } from '../utils/supabase/attendance-service';
import { plansService, type Plan } from '../utils/supabase/plans-service';
import { accountHeadsService, type AccountHead } from '../utils/supabase/account-heads-service';
import { usePaymentManager } from '../payments/usePaymentManager';
import { PaymentAllocationPanel } from '../payments/PaymentAllocationPanel';
import { buildPaymentPayload } from '../payments/paymentPayload';
import { PAYMENT_TYPES } from '../payments/paymentModel';
import type { CreditCustomer } from '../payments/modals/CreditModal';
import { walkInRegistrationService, type MyWalkInLink, type PendingWalkInRegistration } from '../utils/supabase/walk-in-registration-service';
import { WalkInQr } from '../components/shared/WalkInQr';
import { useDebouncedValue } from '../utils/use-debounced-value';
import a from './attendance.module.css';
import c from './check-in.module.css';
import { askPaymentTerms } from '../components/payment-terms/PaymentTermsDialog';

// ── Types ─────────────────────────────────────────────────────────────────────

type PersonKind = 'member' | 'staff';
type EffStatus = 'active' | 'expired' | 'frozen' | 'suspended' | 'pending_approval' | 'inactive' | string;
interface PersonEntry {
  kind: PersonKind;
  id: number;
  name: string;
  bizId: string;       // MBR-... or EMP-...
  role: string;        // membership type for members, role for staff
  status: EffStatus;   // members: effective status (an active membership past its end date is expired)
  photoUrl?: string;
  phone?: string;
  endDate?: string | null;
  trainer?: boolean;
  // Membership suspended by staff — check-in is refused until it's resumed.
  suspended?: boolean;
  suspendedReason?: string | null;
}
type Tab = 'desk' | 'daily' | 'configuration';
type Who = 'all' | 'member' | 'staff';

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';
}

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Same rule as the backend's MemberEffectiveStatus: suspended wins, then frozen/pending, then the end date. */
function effectiveStatus(m: Member): EffStatus {
  if (m.membership_suspended) return 'suspended';
  const stored = (m.membership_status || '').toLowerCase();
  if (stored === 'pending_approval' || stored === 'frozen') return stored;
  const end = (m.membership_end_date || m.expiry_date || '').slice(0, 10);
  if (end && end < todayIso()) return 'expired';
  return stored || 'inactive';
}

const isTrainerRole = (role?: string | null) => /trainer|coach|instructor/i.test(role || '');

function memberToPerson(m: Member): PersonEntry {
  return {
    kind: 'member',
    id: Number(m.id),
    name: m.name,
    bizId: m.member_id || String(m.id),
    role: m.membership_type || 'Member',
    status: effectiveStatus(m),
    photoUrl: m.photo_url,
    phone: m.phone,
    endDate: (m.membership_end_date || m.expiry_date || null),
    suspended: !!m.membership_suspended,
    suspendedReason: m.suspended_reason ?? null,
  };
}

function staffToPerson(s: Staff): PersonEntry {
  return {
    kind: 'staff',
    id: Number(s.id),
    name: s.name,
    bizId: s.staff_id || String(s.id),
    role: s.role || 'Staff',
    status: s.status,
    photoUrl: s.photo_url,
    trainer: isTrainerRole(s.role),
  };
}

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y) return null;
  const t = new Date(); t.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d).getTime() - t.getTime()) / 86400000);
}

function fmtDur(min: number) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, '0')}m`;
}

const STATUS_LOOK: Record<string, { label: string; tone: string }> = {
  active: { label: 'Active', tone: '#15803d' },
  expired: { label: 'Expired', tone: '#b42318' },
  frozen: { label: 'Frozen', tone: '#2563eb' },
  suspended: { label: 'Suspended', tone: '#b42318' },
  pending_approval: { label: 'Pending approval', tone: '#b45309' },
  inactive: { label: 'Inactive', tone: '#64748b' },
};
const statusLook = (s: string) => STATUS_LOOK[(s || '').toLowerCase()] || { label: s || '—', tone: '#64748b' };

const KIND_TONE: Record<string, string> = { member: 'blue', walk_in: 'orange', trainer: 'violet', staff: 'teal' };

function Photo({ name, url, tone, on, small }: { name: string; url?: string | null; tone: string; on?: boolean; small?: boolean }) {
  const [broken, setBroken] = useState(false);
  const cls = `${a.photo} ${small ? a.photoSm : ''}`;
  return (
    <span className={a.photoWrap} data-tone={tone}>
      {url && !broken ? <img src={url} alt="" className={cls} onError={() => setBroken(true)} /> : <span className={cls} aria-hidden="true">{initials(name)}</span>}
      {on && <span className={a.onDot} title="Inside now" />}
    </span>
  );
}

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

/** Members listed at a time on the check-in screen (the rest are a search away). */
const MEMBER_RESULTS = 50;
const LONG_STAY = 180;

// ── Component ─────────────────────────────────────────────────────────────────

export function CheckIn() {
  const { currencyCode, currencyPrefix } = useCurrency();
  const { activeBranchId } = useBranch();
  const navigate = useNavigate();
  const now = useNow(15_000);

  // ── Data state ──────────────────────────────────────────────────────────────
  const [memberPeople, setMemberPeople]   = useState<PersonEntry[]>([]);
  const [staffPeople, setStaffPeople]     = useState<PersonEntry[]>([]);
  const [memberTotal, setMemberTotal]     = useState(0);   // every member in the branch
  const [memberMatches, setMemberMatches] = useState(0);   // members matching the current search
  const [memberSearching, setMemberSearching] = useState(false);
  // Today (gym day): everyone inside — members, walk-ins, trainers, staff — and every visit so far.
  const [day, setDay]                     = useState<DayReport | null>(null);
  const [loading, setLoading]             = useState(true);
  const [checkingInId, setCheckingInId]   = useState<number | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<number | null>(null); // attendance record / staff id being closed

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]       = useState('');
  const [who, setWho]                     = useState<Who>('all');
  const [feedView, setFeedView]           = useState<'inside' | 'today'>('inside');
  // The dashboard's Day-Pass card opens this straight on the Walk-In / Daily tab
  const location = useLocation();
  const [activeTab, setActiveTab]         = useState<Tab>(
    (location.state as { tab?: string } | null)?.tab === 'daily' ? 'daily' : 'desk'
  );
  const [selectedPerson, setSelectedPerson] = useState<PersonEntry | null>(null);
  const searchBoxRef = useRef<HTMLInputElement>(null);

  // ── Daily visitor form ───────────────────────────────────────────────────────
  const [visitorName, setVisitorName]     = useState('');
  const [visitorMobile, setVisitorMobile] = useState('');
  const [visitorPhoto, setVisitorPhoto]   = useState<string | null>(null);
  const [walkInPlans, setWalkInPlans]     = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan]   = useState('');
  // Desk discount on the pass: a flat amount or a percentage of the price, with an optional reason
  const [discountValue, setDiscountValue] = useState('');
  const [discountUnit, setDiscountUnit]   = useState<'amount' | 'percent'>('amount');
  const [discountReason, setDiscountReason] = useState('');
  const [grantingAccess, setGrantingAccess] = useState(false);
  const [bankAccounts, setBankAccounts]   = useState<AccountHead[]>([]);
  const [staffOptions, setStaffOptions]   = useState<Staff[]>([]);
  const [processedByStaffId, setProcessedByStaffId] = useState('');
  // QR self-registrations waiting for payment; selfRegistration is the one loaded into the form.
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingWalkInRegistration[]>([]);
  const [selfRegistration, setSelfRegistration] = useState<PendingWalkInRegistration | null>(null);
  const [walkInLink, setWalkInLink] = useState<MyWalkInLink | null>(null);
  const [walkInQrOpen, setWalkInQrOpen] = useState(false);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  // Configurable gym floor capacity (Attendance Reports > Settings), defaulting to 150 until it loads.
  const [gymCapacity, setGymCapacity] = useState(150);
  useEffect(() => {
    attendanceService.getReportSettings()
      .then(settings => { if (settings.gym_capacity) setGymCapacity(settings.gym_capacity); })
      .catch(() => {});
  }, []);

  // Check-in timing rules for this branch (Rules tab). Enforced by the backend.
  const [savedSettings, setSavedSettings] = useState<CheckInSettings | null>(null);
  const [settingsForm, setSettingsForm] = useState<CheckInSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  // A check-out the backend held back for the minimum visit time, awaiting the desk's override.
  const [earlyCheckOut, setEarlyCheckOut] = useState<{ attendanceId: number; name: string; message: string } | null>(null);

  useEffect(() => {
    if (activeTab !== 'configuration' || savedSettings) return;
    checkInService.getSettings()
      .then(settings => { setSavedSettings(settings); setSettingsForm(settings); })
      .catch(() => toast.error('Could not load check-in settings'));
  }, [activeTab, savedSettings]);

  const settingsDirty = !!settingsForm && !!savedSettings
    && (Object.keys(settingsForm) as (keyof CheckInSettings)[]).some(k => settingsForm[k] !== savedSettings[k]);

  const saveSettings = async () => {
    if (!settingsForm) return;
    setSavingSettings(true);
    try {
      const saved = await checkInService.updateSettings(settingsForm);
      setSavedSettings(saved);
      setSettingsForm(saved);
      toast.success('Check-in rules saved');
    } catch (err: any) {
      toast.error(err.message || 'Could not save check-in settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Daily/walk-in passes are real plans configured in Manage Plans under the
  // "Walk-In / Daily Visitor" membership type.
  useEffect(() => {
    plansService.getPlans('Active')
      .then(all => setWalkInPlans(all.filter(p => p.planType === 'Walk-In')))
      .catch(() => {});
    accountHeadsService.getBankAccounts().then(setBankAccounts).catch(() => {});
  }, []);

  // ── Load data ────────────────────────────────────────────────────────────────

  // Members are searched on the server (name, ID or phone) — a gym can have far
  // more members than are worth sending to the browser; without a search the list
  // shows the most recent ones. Staff are few and load once.
  const debouncedSearch = useDebouncedValue(searchTerm.trim(), 300);
  const searchRef = useRef(debouncedSearch);
  searchRef.current = debouncedSearch;

  const loadMembers = useCallback(async (search: string) => {
    const res = await membersService.getMembers(search ? { search } : {}, { page: 1, limit: MEMBER_RESULTS });
    if (search !== searchRef.current) return; // a newer search already replaced this one
    setMemberPeople(res.members.map(memberToPerson));
    setMemberMatches(Number(res.pagination?.total ?? res.members.length));
    if (!search) setMemberTotal(Number(res.pagination?.total ?? res.members.length));
  }, []);

  const loadPeople = useCallback(async () => {
    try {
      const [, staffRes] = await Promise.all([
        loadMembers(searchRef.current),
        staffService.getStaff({}, 1, 500),
      ]);
      setStaffPeople(staffRes.items.map(staffToPerson));
      setStaffOptions(staffRes.items);
    } catch {
      toast.error('Failed to load people list');
    }
  }, [loadMembers]);

  useEffect(() => {
    setMemberSearching(true);
    loadMembers(debouncedSearch)
      .catch(() => toast.error('Failed to search members'))
      .finally(() => setMemberSearching(false));
  }, [debouncedSearch, loadMembers]);

  const loadDay = useCallback(async () => {
    try {
      setDay(await staffAttendanceService.getDayReport());
    } catch {
      // non-fatal — the lists stay as they were
    }
  }, []);

  const loadPendingRegistrations = useCallback(async () => {
    try {
      setPendingRegistrations(await walkInRegistrationService.listPending());
    } catch {
      // non-fatal
    }
  }, []);

  const loadAll = useCallback(() => {
    setLoading(true);
    return Promise.all([loadPeople(), loadDay(), loadPendingRegistrations()]).finally(() => setLoading(false));
  }, [loadPeople, loadDay, loadPendingRegistrations]);

  useEffect(() => { loadAll(); }, [loadAll, activeBranchId]);

  // The desk screen stays open all day: pick up face-device / app check-ins every 30 seconds.
  useEffect(() => {
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') loadDay(); }, 30_000);
    return () => window.clearInterval(t);
  }, [loadDay]);

  // Visitors sign up from their own phones — keep the pending list fresh while the desk is on this tab.
  useEffect(() => {
    if (activeTab !== 'daily') return;
    const timer = window.setInterval(loadPendingRegistrations, 30_000);
    return () => window.clearInterval(timer);
  }, [activeTab, loadPendingRegistrations]);

  const openWalkInQr = () => {
    setWalkInQrOpen(true);
    walkInRegistrationService.myLink().then(setWalkInLink).catch(() => toast.error('Could not load the walk-in QR'));
  };

  // Loads a self-registered visitor into the form; payment then goes through the normal Grant Access.
  const takeSelfRegistrationPayment = (r: PendingWalkInRegistration) => {
    resetDailyForm();
    setSelfRegistration(r);
    setVisitorName(r.name);
    setVisitorMobile(r.phone);
    if (r.plan_id && walkInPlans.some(p => p.id === r.plan_id)) setSelectedPlan(String(r.plan_id));
    if (r.referred_by_staff_id && staffOptions.some(st => String(st.id) === String(r.referred_by_staff_id))) {
      setProcessedByStaffId(String(r.referred_by_staff_id));
    }
  };

  const dismissSelfRegistration = async (r: PendingWalkInRegistration) => {
    try {
      await walkInRegistrationService.dismiss(r.id);
      setPendingRegistrations(prev => prev.filter(p => p.id !== r.id));
      if (selfRegistration?.id === r.id) resetDailyForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Could not dismiss this visitor');
      loadPendingRegistrations();
    }
  };

  // ── Derived values ───────────────────────────────────────────────────────────

  const visits = day?.visits ?? [];
  const tz = day?.time_zone;
  const fmtTime = useCallback((iso?: string | null) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', timeZone: tz }); }
    catch { return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  }, [tz]);
  const minutesIn = useCallback((v: DayVisit) => (v.inside ? Math.max(v.minutes, Math.floor((now - new Date(v.check_in).getTime()) / 60000)) : v.minutes), [now]);

  // member id → open visit, staff id → open shift
  const insideMember = useMemo(() => {
    const m: Record<number, DayVisit> = {};
    for (const v of visits) if (v.inside && v.kind === 'member' && v.person_id != null) m[v.person_id] = v;
    return m;
  }, [visits]);
  const insideStaff = useMemo(() => {
    const m: Record<number, DayVisit> = {};
    for (const v of visits) if (v.inside && (v.kind === 'staff' || v.kind === 'trainer') && v.person_id != null) m[v.person_id] = v;
    return m;
  }, [visits]);

  const insideGuests = visits.filter(v => v.inside && (v.kind === 'member' || v.kind === 'walk_in'));
  const insideTeam = visits.filter(v => v.inside && (v.kind === 'staff' || v.kind === 'trainer'));
  const walkInsToday = visits.filter(v => v.kind === 'walk_in' && !v.from_earlier_day);
  const checkInsToday = visits.filter(v => (v.kind === 'member' || v.kind === 'walk_in') && !v.from_earlier_day).length;
  const occupancy = gymCapacity > 0 ? Math.round((insideGuests.length / gymCapacity) * 100) : 0;
  const occLevel = occupancy >= 90 ? 'alert' : occupancy >= 70 ? 'warn' : 'ok';

  // Members come back already matched by the server; staff are matched here.
  const q = searchTerm.trim().toLowerCase();
  const staffMatches = staffPeople.filter(p => !q || p.name.toLowerCase().includes(q) || p.bizId.toLowerCase().includes(q) || p.role.toLowerCase().includes(q));
  const filtered = [
    ...(who === 'staff' ? [] : memberPeople),
    ...(who === 'member' ? [] : staffMatches),
  ];
  const canAct = (p: PersonEntry) => p.kind === 'member'
    ? (!!insideMember[p.id] || (p.status === 'active' && !p.suspended))
    : (p.status || '').toLowerCase() !== 'inactive';

  const selectedPlanDetails = walkInPlans.find(p => p.id.toString() === selectedPlan);
  const walkInPrice = Number(selectedPlanDetails?.price ?? 0);
  const walkInDiscount = (() => {
    const v = Math.max(0, Number(discountValue) || 0);
    const off = discountUnit === 'percent' ? (walkInPrice * Math.min(v, 100)) / 100 : v;
    return Math.round(Math.min(off, walkInPrice) * 100) / 100;
  })();
  const walkInCharge = Math.round((walkInPrice - walkInDiscount) * 100) / 100;
  // Same payment flow as Renewals / Add-ons: split across methods, rest on credit
  const walkInPaymentManager = usePaymentManager({ invoiceTotal: walkInCharge });
  const walkInCredit = walkInPaymentManager.totalByType(PAYMENT_TYPES.CREDIT);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCheckOut = async (attendanceId: number, memberName: string, force = false) => {
    setCheckingOutId(attendanceId);
    try {
      const res = await checkInService.checkout(attendanceId, force);
      toast.success(`${memberName} checked out${res.formatted_duration ? ` · ${res.formatted_duration}` : ''}`);
      await loadDay();
    } catch (err: any) {
      if (err instanceof MinVisitNotReachedError) {
        setEarlyCheckOut({ attendanceId, name: memberName, message: err.message });
      } else {
        toast.error(err.message || 'Checkout failed');
      }
    } finally {
      setCheckingOutId(null);
    }
  };

  const handleStaffClockIn = async (person: PersonEntry) => {
    setCheckingInId(person.id);
    try {
      await staffAttendanceService.clockIn(person.id, 'WEB');
      toast.success(`${person.name} clocked in`);
      await loadDay();
    } catch (err: any) {
      toast.error(err.message || 'Clock-in failed');
    } finally {
      setCheckingInId(null);
    }
  };

  const handleStaffClockOut = async (person: PersonEntry) => {
    setCheckingOutId(person.id);
    try {
      const rec = await staffAttendanceService.clockOut(person.id);
      toast.success(`${person.name} clocked out${rec.formatted_duration ? ` · ${rec.formatted_duration}` : ''}`);
      await loadDay();
    } catch (err: any) {
      toast.error(err.message || 'Clock-out failed');
    } finally {
      setCheckingOutId(null);
    }
  };

  /** One button per row: check in / check out a member, clock in / out a staff member. */
  const primaryAction = (person: PersonEntry) => {
    if (person.kind === 'staff') {
      if (insideStaff[person.id]) handleStaffClockOut(person); else handleStaffClockIn(person);
      return;
    }
    const open = insideMember[person.id];
    if (open) { handleCheckOut(open.record_id, person.name); return; }
    if (person.suspended) { toast.error(`${person.name}'s membership is suspended${person.suspendedReason ? `: ${person.suspendedReason}` : ''}`); return; }
    if (person.status !== 'active') { toast.error(`Can't check in — membership is ${statusLook(person.status).label.toLowerCase()}`); return; }
    setSelectedPerson(person);
  };

  const confirmCheckIn = async () => {
    if (!selectedPerson) return;
    setCheckingInId(selectedPerson.id);
    try {
      const res = await checkInService.checkIn({
        method: 'manual',
        member_id: selectedPerson.id,
        device_id: 'WEB',
      });
      toast.success(res.message || `${selectedPerson.name} checked in`);
      setSelectedPerson(null);
      setSearchTerm('');
      await loadDay();
      searchBoxRef.current?.focus();
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    } finally {
      setCheckingInId(null);
    }
  };

  // Enter in the search box acts on the first result (scan a card / type an ID, press Enter).
  const onSearchKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && filtered.length > 0 && !memberSearching && debouncedSearch === searchTerm.trim()) {
      e.preventDefault();
      primaryAction(filtered[0]);
    } else if (e.key === 'Escape') {
      setSearchTerm('');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setVisitorPhoto(reader.result as string);
      toast.success('Photo uploaded');
    };
    reader.readAsDataURL(file);
  };

  const handleCapturePhoto = async () => {
    if (!isCameraActive) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
        setIsCameraActive(true);
      } catch { toast.error('Unable to access camera'); }
    } else {
      if (videoRef.current) {
        const canvas = document.createElement('canvas');
        canvas.width  = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        setVisitorPhoto(canvas.toDataURL('image/png'));
        (videoRef.current.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
        setIsCameraActive(false);
        toast.success('Photo captured');
      }
    }
  };

  // Mirrors the renewal flow's payload: how much is received now, the real
  // method(s) it moved through, and any remainder left on credit. "Credit" is
  // never sent as a real method — it's only the absence of one.
  const handleGrantAccess = async () => {
    if (!visitorName || !visitorMobile || !selectedPlan) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (walkInCharge > 0 && !walkInPaymentManager.settleable) {
      toast.error('Payment Incomplete', {
        description: 'Allocate the full amount (or leave the remainder on Credit) before granting access.',
      });
      return;
    }
    if (!(await askPaymentTerms('day_pass', {
      memberName: visitorName,
      amount: walkInCharge,
      detail: selectedPlanDetails?.name ?? 'Day pass',
    }))) return;
    try {
      setGrantingAccess(true);
      const lines = walkInPaymentManager.paymentLines;
      const payload = buildPaymentPayload(lines, walkInCharge);
      const paidAmount = walkInCharge > 0 ? payload.paidAmount : 0;
      const nonCreditLines = lines.filter(l => l.paymentType !== PAYMENT_TYPES.CREDIT);
      const methodLabelByType: Record<string, string> = {
        [PAYMENT_TYPES.CASH]: 'Cash',
        [PAYMENT_TYPES.CARD]: 'Card',
        [PAYMENT_TYPES.ONLINE]: 'Online Payment',
      };
      const lineMethod = (l: typeof lines[number]) =>
        l.paymentType === PAYMENT_TYPES.CARD && l.paymentSubtype ? l.paymentSubtype : methodLabelByType[l.paymentType];

      let paymentMethod = 'Credit';
      let paymentBreakdown: WalkInCheckInRequest['payment_breakdown'];
      let bankAccountCode: string | undefined;
      let bankAccountName: string | undefined;
      if (nonCreditLines.length === 1) {
        const line = nonCreditLines[0];
        paymentMethod = lineMethod(line);
        if (line.paymentType === PAYMENT_TYPES.ONLINE && line.bankAccountId) {
          const account = bankAccounts.find(acc => String(acc.id) === line.bankAccountId);
          bankAccountCode = account?.code;
          bankAccountName = account?.name;
        }
      } else if (nonCreditLines.length > 1) {
        paymentMethod = 'Mixed';
        paymentBreakdown = nonCreditLines.map(line => ({
          method: lineMethod(line),
          amount: line.amount,
          ...(line.reference ? { reference: line.reference } : {}),
          ...(line.bankAccountName ? { bank_account_name: line.bankAccountName } : {}),
        }));
      }
      const paymentSummary = walkInCharge > 0 ? (walkInPaymentManager.summary || paymentMethod) : 'Free';

      const req: WalkInCheckInRequest = {
        name: visitorName,
        phone: visitorMobile,
        session_type: selectedPlanDetails?.name || 'gym',
        amount: walkInCharge,
        paid_amount: paidAmount,
        discount_amount: walkInDiscount > 0 ? walkInDiscount : undefined,
        discount_label: walkInDiscount > 0
          ? (discountReason.trim() ? `Staff discount: ${discountReason.trim()}` : 'Staff discount')
          : undefined,
        payment_method: paymentMethod,
        payment_breakdown: paymentBreakdown,
        bank_account_code: bankAccountCode,
        bank_account_name: bankAccountName,
        device_id: 'WEB',
        notes: `Plan: ${selectedPlanDetails?.name}, Payment: ${paymentSummary}, Amount: ${currencyCode} ${walkInCharge}`
          + (walkInDiscount > 0 ? `, Discount: ${currencyCode} ${walkInDiscount}${discountReason.trim() ? ` (${discountReason.trim()})` : ''}` : ''),
        processed_by_staff_id: processedByStaffId ? Number(processedByStaffId) : undefined,
        self_registration_id: selfRegistration?.id,
      };
      await checkInService.walkInCheckIn(req);
      if (selfRegistration) setPendingRegistrations(prev => prev.filter(p => p.id !== selfRegistration.id));
      toast.success(`Access granted to ${visitorName}`, {
        description: walkInCredit > 0
          ? `${selectedPlanDetails?.name} — ${currencyPrefix}${walkInCredit} left on credit`
          : `${selectedPlanDetails?.name} — Valid for ${selectedPlanDetails?.duration}`,
      });
      resetDailyForm();
      await loadDay();
    } catch (err: any) {
      toast.error(err.message || 'Walk-in check-in failed');
      if (selfRegistration) loadPendingRegistrations();
    } finally {
      setGrantingAccess(false);
    }
  };

  const resetDailyForm = () => {
    setVisitorName(''); setVisitorMobile(''); setVisitorPhoto(null);
    setSelectedPlan(''); setProcessedByStaffId(''); setSelfRegistration(null);
    setDiscountValue(''); setDiscountUnit('amount'); setDiscountReason('');
    walkInPaymentManager.clearLines();
    if (isCameraActive && videoRef.current) {
      (videoRef.current.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
      setIsCameraActive(false);
    }
  };

  // ── Render pieces ─────────────────────────────────────────────────────────────

  const clock = (() => {
    try {
      return new Date(now).toLocaleString(undefined, { weekday: 'long', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: tz });
    } catch { return new Date(now).toLocaleString(); }
  })();

  const feedRow = (v: DayVisit, showOut: boolean) => {
    const min = minutesIn(v);
    const isGuest = v.kind === 'member' || v.kind === 'walk_in';
    const level = isGuest ? (min >= LONG_STAY ? 'alert' : min >= LONG_STAY * 0.7 ? 'warn' : 'ok') : 'ok';
    const busy = checkingOutId === v.record_id || (!isGuest && v.person_id != null && checkingOutId === v.person_id);
    return (
      <div key={v.key} className={c.feedRow} data-tone={KIND_TONE[v.kind]}>
        <Photo name={v.name} url={v.photo_url} tone={KIND_TONE[v.kind]} on={v.inside} small />
        <div style={{ minWidth: 0 }}>
          <div className={a.name}>{v.name}</div>
          <div className={a.sub}>
            {v.inside ? `in since ${fmtTime(v.check_in)}${v.from_earlier_day ? ' (yesterday)' : ''}` : `${fmtTime(v.check_in)} – ${fmtTime(v.check_out)}`}
            {v.code ? ` · ${v.code}` : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div className={c.feedTime}>
            <div className={c.feedTimer} data-level={level}>{fmtDur(min)}</div>
            {v.inside ? (level === 'alert' ? <span className={c.warnTag}>check-out missed?</span> : 'inside') : 'stayed'}
          </div>
          {showOut && v.inside && (
            <button type="button" className={c.btnOut} style={{ minWidth: 0 }} disabled={busy}
              onClick={() => {
                if (isGuest) handleCheckOut(v.record_id, v.name);
                else if (v.person_id != null) {
                  const p = staffPeople.find(s => s.id === v.person_id);
                  if (p) handleStaffClockOut(p);
                }
              }}
              aria-label={`${isGuest ? 'Check out' : 'Clock out'} ${v.name}`}>
              {busy ? <RefreshCw size={12} className="animate-spin" /> : <LogOut size={12} />}
            </button>
          )}
        </div>
      </div>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Check In</h1>
          <div className={styles.subtitle}>
            <span className={a.live}><span className={a.dot} />Live</span>
            <span className={c.clock}>{clock}</span>
            {tz && <span>· {tz.replace('_', ' ')}</span>}
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" size="sm" onClick={() => loadAll()} aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={openWalkInQr}>
            <QrCode className="mr-2 h-4 w-4" /> Walk-in QR
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/attendance')}>
            <BarChart3 className="mr-2 h-4 w-4" /> Attendance
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className={styles.kpis}>
        <Kpi icon={DoorOpen} tone="green" label="Inside now" value={day ? fmtInt(insideGuests.length) : '—'}
          hint={day ? `${insideGuests.filter(v => v.kind === 'walk_in').length} walk-ins among them` : undefined}
          onClick={() => { setActiveTab('desk'); setFeedView('inside'); }} title="Who is inside" />
        <Kpi icon={Gauge} tone={occLevel === 'alert' ? 'red' : occLevel === 'warn' ? 'amber' : 'teal'} label="Occupancy"
          value={day ? `${occupancy}%` : '—'}
          hint={<span style={{ display: 'block', width: '100%' }}>of {fmtInt(gymCapacity)} capacity
            <span className={c.meter} style={{ display: 'block' }}><span className={c.meterFill} data-level={occLevel} style={{ display: 'block', width: `${Math.min(100, occupancy)}%` }} /></span></span>} />
        <Kpi icon={LogIn} tone="blue" label="Check-ins today" value={day ? fmtInt(checkInsToday) : '—'}
          hint={day?.summary.peak_hour ? `busiest ${day.summary.peak_hour}` : 'so far today'}
          onClick={() => { setActiveTab('desk'); setFeedView('today'); }} title="Today's check-ins" />
        <Kpi icon={Footprints} tone="orange" label="Walk-ins" value={day ? fmtInt(walkInsToday.length) : '—'}
          hint={pendingRegistrations.length ? `${pendingRegistrations.length} waiting to pay` : 'day passes today'}
          onClick={() => setActiveTab('daily')} title="Walk-in / day pass" />
        <Kpi icon={Briefcase} tone="violet" label="Team on duty" value={day ? fmtInt(insideTeam.length) : '—'}
          hint={day ? `${insideTeam.filter(v => v.kind === 'trainer').length} trainers · ${insideTeam.filter(v => v.kind === 'staff').length} staff` : undefined}
          onClick={() => { setActiveTab('desk'); setWho('staff'); }} title="Clock staff in and out" />
        <Kpi icon={Timer} tone="amber" label="Average stay" value={day?.summary.avg_stay_minutes ? fmtDur(day.summary.avg_stay_minutes) : '—'}
          hint={day?.summary.long_stays ? `${day.summary.long_stays} inside 3h+` : 'today'} />
      </div>

      <SectionTabs<Tab>
        label="Check-in sections"
        value={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'desk', label: 'Members & staff', icon: UserCheck },
          { id: 'daily', label: 'Walk-in / day pass', icon: UserPlus, count: pendingRegistrations.length },
          { id: 'configuration', label: 'Rules', icon: Settings },
        ]}
      />

      {/* ── Members & staff ── */}
      {activeTab === 'desk' && (
        <div className={c.desk}>
          <Panel title="Find & check in" icon={Search}
            sub="Type a name, member ID or phone — press Enter to act on the first result">
            <label className={c.scan}>
              <Search size={18} className={c.scanIcon} />
              <input ref={searchBoxRef} autoFocus value={searchTerm} onChange={e => setSearchTerm(e.target.value)} onKeyDown={onSearchKey}
                placeholder="Search name, ID or phone…" aria-label="Search members and staff" />
              {searchTerm ? (
                <button type="button" className={c.scanHint} onClick={() => setSearchTerm('')} aria-label="Clear search" style={{ border: 0, cursor: 'pointer' }}>Esc</button>
              ) : <span className={c.scanHint}>Enter</span>}
            </label>
            <div className={c.searchMeta}>
              <div className={styles.chips} role="group" aria-label="Who">
                {([['all', 'Everyone'], ['member', 'Members'], ['staff', 'Staff & trainers']] as [Who, string][]).map(([k, l]) => (
                  <button key={k} type="button" className={styles.chip} data-active={who === k} onClick={() => setWho(k)}>{l}</button>
                ))}
              </div>
              <span>
                {memberMatches > memberPeople.length && who !== 'staff'
                  ? (q ? `First ${memberPeople.length} of ${fmtInt(memberMatches)} matches` : `${memberPeople.length} most recent of ${fmtInt(memberTotal)} members`)
                  : `${filtered.length} shown`}
              </span>
            </div>

            {loading && !filtered.length ? (
              <Empty icon={RefreshCw} title="Loading…" />
            ) : filtered.length === 0 ? (
              <Empty icon={Search} title={searchTerm ? `No one matches “${searchTerm}”` : 'No members or staff yet'}
                text={searchTerm ? 'Try the member ID or phone number.' : undefined} />
            ) : (
              <div className={c.results} data-busy={memberSearching}>
                {filtered.map((person, idx) => {
                  const isMember = person.kind === 'member';
                  const open = isMember ? insideMember[person.id] : insideStaff[person.id];
                  const look = statusLook(isMember ? person.status : (person.status || 'active'));
                  const blocked = isMember && !open && (person.status !== 'active' || !!person.suspended);
                  const left = isMember ? daysUntil(person.endDate) : null;
                  const busy = checkingInId === person.id || checkingOutId === person.id || (open && checkingOutId === open.record_id);
                  const tone = isMember ? 'blue' : person.trainer ? 'violet' : 'teal';
                  return (
                    <div key={`${person.kind}-${person.id}`} className={c.row} data-inside={!!open} data-blocked={blocked}
                      data-first={idx === 0 && !!q}>
                      <Photo name={person.name} url={person.photoUrl} tone={tone} on={!!open} />
                      <div style={{ minWidth: 0 }}>
                        <div className={c.rowName}>
                          <span className="nm" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.name}</span>
                          {!isMember && <span className={a.kind} data-tone={tone}>{person.trainer ? 'Trainer' : 'Staff'}</span>}
                        </div>
                        <div className={c.rowSub}>
                          <span>{person.bizId}</span>
                          <span>· {person.role}</span>
                          {open ? (
                            <span className={c.inTag}>· {isMember ? 'In gym' : 'On duty'} {fmtDur(minutesIn(open))}</span>
                          ) : isMember && person.status === 'active' && left != null && left <= 7 ? (
                            <span className={c.warnTag}>· {left <= 0 ? 'ends today' : `ends in ${left} day${left === 1 ? '' : 's'}`}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className={c.rowEnd}>
                        {isMember && (
                          <span className={c.pill} style={{ ['--tone' as any]: look.tone }}
                            title={person.suspended ? `Suspended${person.suspendedReason ? `: ${person.suspendedReason}` : ''}` : undefined}>
                            {look.label}
                          </span>
                        )}
                        {open ? (
                          <button type="button" className={c.btnOut} disabled={!!busy} onClick={() => primaryAction(person)}>
                            {busy ? <RefreshCw size={13} className="animate-spin" /> : <LogOut size={13} />}{isMember ? 'Check out' : 'Clock out'}
                          </button>
                        ) : (
                          <button type="button" className={c.btnIn} disabled={!!busy || !canAct(person)} onClick={() => primaryAction(person)}
                            title={blocked ? `Membership is ${look.label.toLowerCase()}` : undefined}>
                            {busy ? <RefreshCw size={13} className="animate-spin" /> : <LogIn size={13} />}{isMember ? 'Check in' : 'Clock in'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>

          <Panel title={feedView === 'inside' ? 'Inside now' : 'Today so far'} icon={feedView === 'inside' ? DoorOpen : History}
            scope={String(feedView === 'inside' ? insideGuests.length + insideTeam.length : visits.filter(v => !v.from_earlier_day).length)}
            sub={feedView === 'inside' ? 'Live — updates every 30 seconds, including face-device and app check-ins' : 'Every check-in and clock-in today, newest first'}
            action={<Seg label="View" value={feedView} onChange={setFeedView} options={[['inside', 'Inside'], ['today', 'Today']]} />}>
            {!day ? <Empty icon={RefreshCw} title="Loading…" /> : feedView === 'inside' ? (
              insideGuests.length + insideTeam.length === 0 ? (
                <Empty icon={DoorOpen} title="Nobody is inside" text="People appear here the moment they check in at the desk, the face device or the app." />
              ) : (
                <div className={c.feed}>
                  {insideGuests.length > 0 && <div className={c.groupLabel}>Members & walk-ins · {insideGuests.length}</div>}
                  {[...insideGuests].sort((x, y) => x.check_in.localeCompare(y.check_in)).map(v => feedRow(v, true))}
                  {insideTeam.length > 0 && <div className={c.groupLabel}>Trainers & staff · {insideTeam.length}</div>}
                  {insideTeam.map(v => feedRow(v, true))}
                </div>
              )
            ) : (
              visits.filter(v => !v.from_earlier_day).length === 0 ? <Empty icon={History} title="No check-ins yet today" /> : (
                <div className={c.feed}>{visits.filter(v => !v.from_earlier_day).map(v => feedRow(v, true))}</div>
              )
            )}
          </Panel>
        </div>
      )}

      {/* ── Walk-in / day pass ── */}
      {activeTab === 'daily' && (
        <>
          {pendingRegistrations.length > 0 && (
            <Panel title="Signed up with the QR — waiting to pay" icon={Clock} scope={String(pendingRegistrations.length)}
              sub="They get in only after you take payment. Updates every 30 seconds.">
              <div className={c.pending}>
                {pendingRegistrations.map(r => (
                  <div key={r.id} className={c.pendingRow} data-active={selfRegistration?.id === r.id}>
                    <Photo name={r.name} tone="orange" small />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={a.name}>{r.name}</div>
                      <div className={a.sub}>
                        {r.phone}{r.plan_name ? ` · ${r.plan_name}` : ''}{r.referred_by_staff_name ? ` · via ${r.referred_by_staff_name}` : ''}
                        {' · '}{new Date(r.created_at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <Button size="sm" className="btn-primary" onClick={() => takeSelfRegistrationPayment(r)}>Take payment</Button>
                    <Button size="sm" variant="ghost" onClick={() => dismissSelfRegistration(r)} title="Visitor left or signed up twice">Dismiss</Button>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          <div className={c.walk}>
            <Panel title="Sell a day pass" icon={UserPlus} sub="Register the visitor, pick a pass, take payment — access starts right away">
              {selfRegistration && (
                <div className={c.banner}>
                  <span>Taking payment for <strong>{selfRegistration.name}</strong>, who signed up with the walk-in QR.</span>
                  <Button variant="ghost" size="sm" onClick={resetDailyForm} aria-label="Cancel"><X className="h-4 w-4" /></Button>
                </div>
              )}

              <div className={c.step}>
                <div className={c.stepHead}><span className={c.stepNo}>1</span>Visitor</div>
                <div className={c.grid2}>
                  <div className="space-y-2">
                    <Label>Full name <span style={{ color: 'var(--destructive)' }}>*</span></Label>
                    <Input placeholder="Visitor's full name" value={visitorName} onChange={e => setVisitorName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile number <span style={{ color: 'var(--destructive)' }}>*</span></Label>
                    <PhoneInput value={visitorMobile} onChange={setVisitorMobile} />
                  </div>
                </div>
                <div className={c.photoBox}>
                  {visitorPhoto ? (
                    <>
                      <img src={visitorPhoto} alt="Visitor" className={c.photoPreview} />
                      <span className={styles.muted} style={{ fontSize: 'var(--text-xs)' }}>Photo ready</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setVisitorPhoto(null)} aria-label="Remove photo"><X className="h-4 w-4" /></Button>
                    </>
                  ) : (
                    <>
                      <Button type="button" variant="outline" size="sm" onClick={handleCapturePhoto}>
                        <Camera className="mr-2 h-4 w-4" />{isCameraActive ? 'Take photo' : 'Camera'}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="mr-2 h-4 w-4" /> Upload photo
                      </Button>
                      <span className={styles.muted} style={{ fontSize: 'var(--text-xs)' }}>Optional</span>
                      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                    </>
                  )}
                </div>
                {isCameraActive && <div className={c.video}><video ref={videoRef} autoPlay playsInline /></div>}
              </div>

              <div className={c.step}>
                <div className={c.stepHead}><span className={c.stepNo}>2</span>Pass</div>
                {walkInPlans.length === 0 ? (
                  <Empty icon={CalendarClock} title="No day passes set up"
                    text='Add a plan under Manage Plans with the membership type "Walk-In / Daily Visitor".' />
                ) : (
                  <div className={c.plans} role="radiogroup" aria-label="Day pass">
                    {walkInPlans.map(p => (
                      <button key={p.id} type="button" role="radio" aria-checked={selectedPlan === String(p.id)} className={c.plan}
                        data-active={selectedPlan === String(p.id)} onClick={() => setSelectedPlan(String(p.id))}>
                        <span className={c.planName}>{p.name}</span>
                        <span className={c.planPrice}>{Number(p.price) > 0 ? <><CurrencyGlyph /> {p.price}</> : 'Free'}</span>
                        <span className={c.planDur}>{p.duration}</span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="space-y-2" style={{ maxWidth: '22rem' }}>
                  <Label>Sold by</Label>
                  <Select value={processedByStaffId || undefined} onValueChange={setProcessedByStaffId}>
                    <SelectTrigger><SelectValue placeholder="Staff member (optional)" /></SelectTrigger>
                    <SelectContent>
                      {staffOptions.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className={styles.muted} style={{ fontSize: 'var(--text-xs)' }}>Counts toward that staff member's revenue target.</p>
                </div>
              </div>

              {selectedPlan && (
                <div className={c.step}>
                  <div className={c.stepHead}><span className={c.stepNo}>3</span>Payment</div>
                  <div className={c.charge}>
                    <div>
                      <div className={styles.muted} style={{ fontSize: 'var(--text-xs)' }}>To pay</div>
                      <div className={c.chargeValue}><CurrencyGlyph /> {walkInCharge}</div>
                      <div className={styles.muted} style={{ fontSize: 'var(--text-xs)' }}>
                        {selectedPlanDetails?.name} · valid for {selectedPlanDetails?.duration}
                        {walkInDiscount > 0 && <> · <s><CurrencyGlyph /> {walkInPrice}</s> − <CurrencyGlyph /> {walkInDiscount} discount</>}
                      </div>
                    </div>
                    {walkInCharge <= 0 ? <Status kind="good">Free</Status>
                      : !walkInPaymentManager.settleable ? <Status kind="warning">Awaiting payment</Status>
                      : walkInCredit <= 0 ? <Status kind="good">Paid</Status>
                      : walkInCredit >= walkInCharge ? <Status kind="warning">On credit</Status>
                      : <Status kind="warning">Partly on credit</Status>}
                  </div>
                  {walkInPrice > 0 && (
                    <section className={c.discount} data-applied={walkInDiscount > 0} aria-labelledby="walkin-discount-title">
                      <div className={c.discountHead}>
                        <span className={c.discountIcon} aria-hidden><BadgePercent /></span>
                        <div className={c.discountTitles}>
                          <span id="walkin-discount-title" className={c.discountTitle}>Discount</span>
                          <span className={c.discountSub}>Give this visitor a lower price — it's shown on the bill.</span>
                        </div>
                        {walkInDiscount > 0 && (
                          <span className={c.discountApplied}>
                            −<CurrencyGlyph /> {walkInDiscount} off
                            <button type="button" className={c.discountClear} aria-label="Remove discount"
                              onClick={() => { setDiscountValue(''); setDiscountReason(''); }}><X /></button>
                          </span>
                        )}
                      </div>
                      <div className={c.discountRow}>
                        <div className="space-y-2">
                          <Label htmlFor="walkin-discount">Amount</Label>
                          <div className={c.discountInput}>
                            <Input id="walkin-discount" type="number" inputMode="decimal" min="0"
                              max={discountUnit === 'percent' ? 100 : walkInPrice} step="0.01" placeholder="0"
                              value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
                            <div className={c.unitToggle} role="radiogroup" aria-label="Discount type">
                              {(['amount', 'percent'] as const).map(u => (
                                <button key={u} type="button" role="radio" aria-checked={discountUnit === u}
                                  data-active={discountUnit === u} onClick={() => setDiscountUnit(u)}>
                                  {u === 'amount' ? currencyCode : '%'}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className={c.quickChips}>
                            {[10, 20, 50].map(pct => (
                              <button key={pct} type="button" className={c.quickChip}
                                data-active={discountUnit === 'percent' && Number(discountValue) === pct}
                                onClick={() => { setDiscountUnit('percent'); setDiscountValue(String(pct)); }}>
                                {pct}%
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="walkin-discount-reason">Reason</Label>
                          <Input id="walkin-discount-reason" placeholder={walkInDiscount > 0 ? 'e.g. Friend of member (optional)' : 'Enter a discount first'}
                            value={discountReason} onChange={e => setDiscountReason(e.target.value)}
                            disabled={walkInDiscount <= 0} />
                        </div>
                      </div>
                    </section>
                  )}
                  {walkInCharge > 0 && (
                    <PaymentAllocationPanel
                      manager={walkInPaymentManager}
                      invoiceTotal={walkInCharge}
                      bankAccounts={bankAccounts}
                      customers={visitorName ? [{ code: visitorMobile || visitorName, name: visitorName } as CreditCustomer] : []}
                      offeredTypes={[PAYMENT_TYPES.CASH, PAYMENT_TYPES.CARD, PAYMENT_TYPES.ONLINE, PAYMENT_TYPES.CREDIT]}
                    />
                  )}
                </div>
              )}

              <div className={c.actionsRow}>
                <Button variant="outline" onClick={resetDailyForm}><X className="mr-2 h-4 w-4" /> Clear</Button>
                <Button className="btn-primary" onClick={handleGrantAccess}
                  disabled={!visitorName || !visitorMobile || !selectedPlan || grantingAccess || (walkInCharge > 0 && !walkInPaymentManager.settleable)}>
                  {grantingAccess ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Granting…</> : <><CheckCircle className="mr-2 h-4 w-4" /> Grant access</>}
                </Button>
              </div>
            </Panel>

            <Panel title="Today's walk-ins" icon={Footprints} scope={String(walkInsToday.length)} sub="Day passes used today">
              {walkInsToday.length === 0 ? <Empty icon={Footprints} title="No walk-ins yet today" /> : (
                <div className={c.feed}>
                  {walkInsToday.map(v => (
                    <div key={v.key} className={c.feedRow} data-tone="orange">
                      <Photo name={v.name} tone="orange" on={v.inside} small />
                      <div style={{ minWidth: 0 }}>
                        <div className={a.name}>{v.name}</div>
                        <div className={a.sub}>{[v.detail, v.activity].filter(Boolean).join(' · ')}</div>
                        <div className={a.sub}>
                          {fmtTime(v.check_in)}{v.check_out ? ` – ${fmtTime(v.check_out)}` : ''}
                          {v.payment_status && v.payment_status !== 'paid' ? <span className={c.warnTag}> · {v.payment_status}</span> : null}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className={c.feedTime}><div className={c.feedTimer}>{fmtDur(minutesIn(v))}</div>{v.inside ? 'inside' : 'left'}</div>
                        {v.inside && (
                          <button type="button" className={c.btnOut} style={{ minWidth: 0 }} disabled={checkingOutId === v.record_id}
                            onClick={() => handleCheckOut(v.record_id, v.name)} aria-label={`Check out ${v.name}`}>
                            <LogOut size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        </>
      )}

      {/* ── Rules ── */}
      {activeTab === 'configuration' && (
        <>
          {!settingsForm ? (
            <div className={styles.card}><Empty icon={RefreshCw} title="Loading the rules…" /></div>
          ) : (
            <>
              <div className={c.rules}>
                <RuleCard icon={Timer} tone="blue" title="Minimum visit"
                  text="Members can't check themselves out sooner than this. The desk can still check them out after confirming."
                  value={settingsForm.min_visit_minutes} onChange={v => setSettingsForm({ ...settingsForm, min_visit_minutes: v })} />
                <RuleCard icon={Coffee} tone="amber" title="Quick break"
                  text="How long a member can step out with Take Break in the app and stay checked in. Break time isn't counted as gym time. 0 turns Take Break off."
                  value={settingsForm.break_grace_minutes} onChange={v => setSettingsForm({ ...settingsForm, break_grace_minutes: v })} />
                <RuleCard icon={Clock} tone="violet" title="Wait before checking in again"
                  text="After any check-out, how long a member has to wait before the next check-in."
                  value={settingsForm.cooldown_minutes} onChange={v => setSettingsForm({ ...settingsForm, cooldown_minutes: v })} />
              </div>
              <div className={`${styles.card} ${styles.filters}`} style={{ justifyContent: 'space-between' }}>
                <span className={styles.muted} style={{ fontSize: 'var(--text-xs)' }}>
                  Rules apply to this branch and are enforced for the desk, the face device and the member app. Set 0 to turn a rule off.
                  {' '}Gym capacity ({fmtInt(gymCapacity)}) is set in Attendance Reports › Settings.
                </span>
                <div className={c.ruleSave}>
                  <Button variant="outline" size="sm" onClick={() => setSettingsForm(savedSettings)} disabled={!settingsDirty || savingSettings}>Reset</Button>
                  <Button className="btn-primary" size="sm" onClick={saveSettings} disabled={!settingsDirty || savingSettings}>
                    {savingSettings ? 'Saving…' : 'Save rules'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Confirm check-in */}
      {selectedPerson && (
        <Dialog open onOpenChange={() => setSelectedPerson(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Check in {selectedPerson.name}?</DialogTitle>
              <DialogDescription>Starts their visit now. They can check out at the desk, the face device or the app.</DialogDescription>
            </DialogHeader>
            {(() => {
              const left = daysUntil(selectedPerson.endDate);
              return (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '0.5rem 0' }}>
                  <Photo name={selectedPerson.name} url={selectedPerson.photoUrl} tone="blue" />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{selectedPerson.name}</div>
                    <div className={styles.muted} style={{ fontSize: 'var(--text-xs)' }}>{selectedPerson.bizId} · {selectedPerson.role}</div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.35rem', alignItems: 'center' }}>
                      <span className={c.pill} style={{ ['--tone' as any]: statusLook(selectedPerson.status).tone }}>{statusLook(selectedPerson.status).label}</span>
                      {selectedPerson.endDate && (
                        <span className={left != null && left <= 7 ? c.warnTag : styles.muted} style={{ fontSize: 'var(--text-xs)' }}>
                          {left != null && left <= 0 ? 'Membership ends today' : `Ends ${new Date(selectedPerson.endDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}${left != null ? ` · ${left} day${left === 1 ? '' : 's'} left` : ''}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
            {daysUntil(selectedPerson.endDate) != null && (daysUntil(selectedPerson.endDate) as number) <= 7 && (
              <div className={c.banner}><span><AlertCircle className="inline h-4 w-4 mr-1" />Membership ends soon — a good moment to offer a renewal.</span></div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="outline" onClick={() => setSelectedPerson(null)}>Cancel</Button>
              <Button className="btn-primary" onClick={confirmCheckIn} disabled={checkingInId !== null} autoFocus>
                {checkingInId !== null ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Checking in…</> : <><CheckCircle className="mr-2 h-4 w-4" /> Check in</>}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog open={!!earlyCheckOut} onOpenChange={open => { if (!open) setEarlyCheckOut(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Check out {earlyCheckOut?.name} early?</AlertDialogTitle>
            <AlertDialogDescription>{earlyCheckOut?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep checked in</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (earlyCheckOut) handleCheckOut(earlyCheckOut.attendanceId, earlyCheckOut.name, true);
                setEarlyCheckOut(null);
              }}
            >
              Check out anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={walkInQrOpen} onOpenChange={setWalkInQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Walk-in QR</DialogTitle>
            <DialogDescription>
              {walkInLink?.staff_name
                ? `Your personal code — sign-ups through it count toward ${walkInLink.staff_name}'s walk-in target.`
                : 'Visitors scan this to sign themselves up, then pay here.'}
            </DialogDescription>
          </DialogHeader>
          {!walkInLink ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" /></div>
          ) : !walkInLink.enabled ? (
            <p className="text-sm text-muted-foreground py-4">
              Self-registration is off for {walkInLink.branch_name || 'this branch'}. Turn it on under Settings › Branch › Walk-in Self-Registration.
            </p>
          ) : (
            <WalkInQr
              path={walkInLink.path}
              title={walkInLink.branch_name || 'Walk-in registration'}
              subtitle={walkInLink.staff_name ? `Scan to register — ${walkInLink.staff_name}` : undefined}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Rule card ─────────────────────────────────────────────────────────────────

function RuleCard({ icon: Icon, tone, title, text, value, onChange }: {
  icon: React.ComponentType<{ size?: number }>;
  tone: string;
  title: string;
  text: string;
  value: number;
  onChange: (minutes: number) => void;
}) {
  return (
    <div className={`${styles.card} ${c.rule}`}>
      <div className={c.ruleTop}>
        <span className={styles.kpiIcon} data-tone={tone}><Icon size={16} /></span>
        {value > 0 ? <Status kind="info">On</Status> : <span className={c.pill}>Off</span>}
      </div>
      <div className={c.ruleTitle}>{title}</div>
      <div className={c.ruleText}>{text}</div>
      <label className={c.ruleInput}>
        <input type="number" min={0} max={1440} value={value} aria-label={`${title} in minutes`}
          onChange={e => onChange(Math.max(0, Math.min(1440, Math.floor(Number(e.target.value) || 0))))} />
        <span className={styles.muted} style={{ fontSize: 'var(--text-sm)' }}>minutes</span>
      </label>
    </div>
  );
}

export default CheckIn;
