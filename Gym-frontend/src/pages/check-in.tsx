import { useState, useRef, useEffect, useCallback } from 'react';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Separator } from "../components/ui/separator";
import {
  LogIn,
  LogOut,
  Search,
  QrCode,
  UserCheck,
  Users,
  Camera,
  CheckCircle,
  AlertCircle,
  UserPlus,
  Upload,
  CreditCard,
  X,
  CalendarClock,
  RefreshCw,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { membersService, type Member } from '../utils/supabase/members-service';
import { staffService, type Staff } from '../utils/supabase/staff-service';
import { checkInService, type TodayAttendanceRecord, type WalkInCheckInRequest } from '../utils/supabase/checkin-service';
import { staffAttendanceService } from '../utils/supabase/staff-attendance-service';
import { attendanceService } from '../utils/supabase/attendance-service';
import { plansService, type Plan } from '../utils/supabase/plans-service';
import { accountHeadsService, type AccountHead } from '../utils/supabase/account-heads-service';
import type { PaymentSplitLeg } from '../utils/supabase/billing-service';

// ── Types ─────────────────────────────────────────────────────────────────────

type PersonKind = 'member' | 'staff';
interface PersonEntry {
  kind: PersonKind;
  id: number;
  name: string;
  bizId: string;       // MBR-... or EMP-...
  role: string;        // membership type for members, role for staff
  status: string;
  photoUrl?: string;
}

// ── Payment methods (mirrors add-member.tsx's canonical set, minus POS) ──────

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Cash',
  card: 'Card',
  check: 'Cheque',
  'bank-transfer': 'Bank Transfer',
  online: 'Online Payment',
  credit: 'Credit',
};
const CARD_TYPE_OPTIONS = ['Visa', 'Mastercard', 'RuPay', 'American Express', 'Maestro', 'Diners Club', 'Other'];
const ONLINE_PAYMENT_TYPE_OPTIONS = ['Google Pay', 'PhonePe', 'Paytm', 'BHIM', 'Samsung Pay', 'Apple Pay', 'Amazon Pay', 'UPI', 'Other'];

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function memberToPerson(m: Member): PersonEntry {
  return {
    kind: 'member',
    id: Number(m.id),
    name: m.name,
    bizId: m.member_id || String(m.id),
    role: m.membership_type || 'Member',
    status: m.membership_status,
    photoUrl: m.photo_url,
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
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CheckIn() {
  const { currencyCode } = useCurrency();
  // ── Data state ──────────────────────────────────────────────────────────────
  const [people, setPeople]               = useState<PersonEntry[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<TodayAttendanceRecord[]>([]);
  const [loading, setLoading]             = useState(true);
  const [checkingInId, setCheckingInId]   = useState<number | null>(null);
  const [checkingOutId, setCheckingOutId] = useState<number | null>(null); // attendance record id being checked out
  const [staffActiveMap, setStaffActiveMap] = useState<Record<number, number>>({}); // staffDbId → attendanceRecordId

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]       = useState('');
  const [activeTab, setActiveTab]         = useState('registered');
  const [selectedPerson, setSelectedPerson] = useState<PersonEntry | null>(null);
  const [activeOnlyFilter, setActiveOnlyFilter] = useState(false);

  // ── Daily visitor form ───────────────────────────────────────────────────────
  const [visitorName, setVisitorName]     = useState('');
  const [visitorMobile, setVisitorMobile] = useState('');
  const [visitorPhoto, setVisitorPhoto]   = useState<string | null>(null);
  const [walkInPlans, setWalkInPlans]     = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan]   = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentDone, setPaymentDone]     = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [dailyCheckIns, setDailyCheckIns] = useState<any[]>([]);
  const [walkInsLoaded, setWalkInsLoaded] = useState(false);
  const [bankAccounts, setBankAccounts]   = useState<AccountHead[]>([]);
  const [staffOptions, setStaffOptions]   = useState<Staff[]>([]);
  const [processedByStaffId, setProcessedByStaffId] = useState('');

  // Payment-method-specific detail fields — matches Add Member's capture for
  // Card/Cheque/Bank Transfer/Online Payment so a walk-in's payment record has
  // the same detail as a member's.
  const [paymentDetails, setPaymentDetails] = useState({
    cardType: '', chequeNumber: '', chequeDate: '', bankName: '',
    bankAccountId: '', onlinePaymentType: '', providerName: '',
  });
  const updatePaymentDetail = (field: string, value: string) =>
    setPaymentDetails(prev => ({ ...prev, [field]: value }));

  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef     = useRef<HTMLVideoElement>(null);

  // Configurable gym floor capacity (Attendance Reports > report settings),
  // defaulting to 150 only until the real value loads.
  const [gymCapacity, setGymCapacity] = useState(150);
  useEffect(() => {
    attendanceService.getReportSettings()
      .then(settings => { if (settings.gym_capacity) setGymCapacity(settings.gym_capacity); })
      .catch(() => {});
  }, []);

  // Daily/walk-in passes are now real plans configured in Manage Plans under the
  // "Walk-In / Daily Visitor" membership type, instead of a hardcoded list.
  useEffect(() => {
    plansService.getPlans('Active')
      .then(all => setWalkInPlans(all.filter(p => p.planType === 'Walk-In')))
      .catch(() => {});
    accountHeadsService.getBankAccounts().then(setBankAccounts).catch(() => {});
  }, []);

  // ── Load data ────────────────────────────────────────────────────────────────

  const loadPeople = useCallback(async () => {
    try {
      const [membersRes, staffRes] = await Promise.all([
        membersService.getMembers({}, { page: 0, limit: 500 }),
        staffService.getStaff({}, 1, 500),
      ]);
      const combined: PersonEntry[] = [
        ...membersRes.members.map(memberToPerson),
        ...staffRes.items.map(staffToPerson),
      ];
      setPeople(combined);
      setStaffOptions(staffRes.items);
    } catch (err) {
      toast.error('Failed to load people list');
    }
  }, []);

  const loadTodayAttendance = useCallback(async () => {
    try {
      const records = await checkInService.getTodayAttendance();
      setTodayAttendance(records);
    } catch {
      // non-fatal — show empty list
    }
  }, []);

  const loadStaffActiveMap = useCallback(async () => {
    try {
      const records = await staffAttendanceService.getTodayStaffAttendance();
      const map: Record<number, number> = {};
      records.filter(r => r.status === 'working').forEach(r => {
        map[r.staff_db_id] = r.id;
      });
      setStaffActiveMap(map);
    } catch {
      // non-fatal
    }
  }, []);

  const loadTodayWalkIns = useCallback(async () => {
    if (walkInsLoaded) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await staffAttendanceService.getAttendance(today, undefined, 0, 200);
      const walkIns = res.items
        .filter(r => r.type === 'walk_in')
        .map(r => ({
          id: r.id,
          memberName: r.walk_in_name || 'Visitor',
          memberId: `DAILY-${String(r.id).slice(-4)}`,
          avatar: null,
          checkInTime: new Date(r.check_in_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          status: r.status === 'active' ? 'Active' : 'Completed',
          membership: r.activity_type || 'Daily Pass',
          type: 'daily',
          mobile: r.walk_in_phone || '',
          plan: null,
          paymentMethod: '',
          amount: null,
        }));
      setDailyCheckIns(walkIns);
      setWalkInsLoaded(true);
    } catch {
      // non-fatal
    }
  }, [walkInsLoaded]);

  useEffect(() => {
    Promise.all([loadPeople(), loadTodayAttendance(), loadStaffActiveMap(), loadTodayWalkIns()]).finally(() => setLoading(false));
  }, [loadPeople, loadTodayAttendance, loadStaffActiveMap, loadTodayWalkIns]);

  // ── Derived values ───────────────────────────────────────────────────────────

  const filtered = people.filter(p => {
    const q = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.bizId.toLowerCase().includes(q);
  });

  const todayCount  = todayAttendance.length + dailyCheckIns.length;
  const activeCount = todayAttendance.length + dailyCheckIns.filter(d => d.status === 'Active').length;
  const occupancy   = Math.round((activeCount / gymCapacity) * 100);
  const visibleTodayAttendance = activeOnlyFilter
    ? todayAttendance.filter(r => r.status === 'active')
    : todayAttendance;

  const selectedPlanDetails = walkInPlans.find(p => p.id.toString() === selectedPlan);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  const handleCheckOut = async (attendanceId: number, memberName: string) => {
    setCheckingOutId(attendanceId);
    try {
      const res = await checkInService.checkout(attendanceId);
      toast.success(`${memberName} checked out — ${res.formatted_duration}`);
      await loadTodayAttendance();
    } catch (err: any) {
      toast.error(err.message || 'Checkout failed');
    } finally {
      setCheckingOutId(null);
    }
  };

  const handleStaffClockIn = async (person: PersonEntry) => {
    setCheckingInId(person.id);
    try {
      const rec = await staffAttendanceService.clockIn(person.id, 'WEB');
      setStaffActiveMap(prev => ({ ...prev, [person.id]: rec.id }));
      toast.success(`${person.name} clocked in`);
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
      setStaffActiveMap(prev => { const n = { ...prev }; delete n[person.id]; return n; });
      toast.success(`${person.name} clocked out — ${rec.formatted_duration || ''}`);
    } catch (err: any) {
      toast.error(err.message || 'Clock-out failed');
    } finally {
      setCheckingOutId(null);
    }
  };

  const handleCheckIn = async (person: PersonEntry) => {
    if (person.kind === 'staff') {
      toast.info('Staff clock-in is managed through the Attendance module');
      return;
    }
    if (person.status !== 'active') {
      toast.error(`Cannot check in — membership is ${person.status}`);
      return;
    }
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
      toast.success(res.message);
      setSelectedPerson(null);
      await loadTodayAttendance();
    } catch (err: any) {
      toast.error(err.message || 'Check-in failed');
    } finally {
      setCheckingInId(null);
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

  const handleCollectPayment = () => {
    if (!visitorName || !visitorMobile || !selectedPlan || !paymentMethod) {
      toast.error('Please fill in all required fields');
      return;
    }
    setProcessingPayment(true);
    setTimeout(() => {
      setPaymentDone(true);
      setProcessingPayment(false);
      const label = PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod;
      toast.success(paymentMethod === 'credit'
        ? `${currencyCode} ${selectedPlanDetails?.price} marked as Credit (unpaid)`
        : `Payment of ${currencyCode} ${selectedPlanDetails?.price} collected via ${label}`);
    }, 1200);
  };

  // Mirrors add-member.tsx's buildFamilyMemberLeg — builds the single
  // PaymentSplitDTO-shaped leg (snake_case) describing how this walk-in's
  // payment was actually received.
  const buildWalkInPaymentLeg = (amount: number): PaymentSplitLeg => {
    const leg: PaymentSplitLeg = { method: PAYMENT_METHOD_LABELS[paymentMethod] || paymentMethod, amount };
    if (paymentMethod === 'card') {
      leg.card_type = paymentDetails.cardType;
    } else if (paymentMethod === 'check') {
      leg.cheque_number = paymentDetails.chequeNumber;
      if (paymentDetails.bankName) leg.bank_name = paymentDetails.bankName;
      if (paymentDetails.chequeDate) leg.cheque_date = paymentDetails.chequeDate;
    } else if (paymentMethod === 'bank-transfer') {
      const acct = bankAccounts.find(a => String(a.id) === paymentDetails.bankAccountId);
      leg.bank_account_code = acct?.code;
      leg.bank_account_name = acct?.name;
    } else if (paymentMethod === 'online') {
      leg.online_payment_type = paymentDetails.onlinePaymentType;
      if (paymentDetails.onlinePaymentType === 'Other') leg.provider_name = paymentDetails.providerName;
    }
    return leg;
  };

  const handleGrantAccess = async () => {
    if (!paymentDone) { toast.error('Complete payment first'); return; }
    try {
      const isCredit = paymentMethod === 'credit';
      const amount = selectedPlanDetails?.price ?? 0;
      const methodLabel = PAYMENT_METHOD_LABELS[paymentMethod] || 'Cash';
      const req: WalkInCheckInRequest = {
        name: visitorName,
        phone: visitorMobile,
        session_type: selectedPlanDetails?.name || 'gym',
        payment_status: isCredit ? 'pending' : 'paid',
        amount,
        payment_method: methodLabel,
        payment_breakdown: isCredit ? undefined : [buildWalkInPaymentLeg(amount)],
        device_id: 'WEB',
        notes: `Plan: ${selectedPlanDetails?.name}, Payment: ${methodLabel}, Amount: ${currencyCode} ${amount}`,
        processed_by_staff_id: processedByStaffId ? Number(processedByStaffId) : undefined,
      };
      const resp = await checkInService.walkInCheckIn(req);

      const visitor = {
        id: resp.attendance_id,
        memberName: visitorName,
        memberId: `DAILY-${String(resp.attendance_id).slice(-4)}`,
        avatar: visitorPhoto,
        checkInTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        status: 'Active',
        membership: selectedPlanDetails?.name || 'Daily Pass',
        type: 'daily',
        mobile: visitorMobile,
        plan: selectedPlanDetails,
        paymentMethod,
        amount: selectedPlanDetails?.price,
      };
      setDailyCheckIns(prev => [visitor, ...prev.filter(p => p.id !== resp.attendance_id)]);
      toast.success(`Access granted to ${visitorName}`, {
        description: `${selectedPlanDetails?.name} — Valid for ${selectedPlanDetails?.duration}`,
      });
      resetDailyForm();
    } catch (err: any) {
      toast.error(err.message || 'Walk-in check-in failed');
    }
  };

  const resetDailyForm = () => {
    setVisitorName(''); setVisitorMobile(''); setVisitorPhoto(null);
    setSelectedPlan(''); setPaymentMethod(''); setPaymentDone(false);
    setProcessingPayment(false); setProcessedByStaffId('');
    setPaymentDetails({ cardType: '', chequeNumber: '', chequeDate: '', bankName: '', bankAccountId: '', onlinePaymentType: '', providerName: '' });
    if (isCameraActive && videoRef.current) {
      (videoRef.current.srcObject as MediaStream)?.getTracks().forEach(t => t.stop());
      setIsCameraActive(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 bg-gymbios-main-bg">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gymbios-heading">Check In</h1>
          <p className="text-muted-foreground">Manage access for registered members or daily visitors</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setLoading(true); setWalkInsLoaded(false); Promise.all([loadPeople(), loadTodayAttendance(), loadStaffActiveMap(), loadTodayWalkIns()]).finally(() => setLoading(false)); }}
            className="border-primary/30"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" className="border-primary/30 opacity-60 cursor-not-allowed" disabled title="Hardware device required">
            <QrCode className="mr-2 h-4 w-4" />
            QR Scanner
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Soon</span>
          </Button>
          <Button variant="outline" className="border-primary/30 opacity-60 cursor-not-allowed" disabled title="Face recognition device required">
            <Camera className="mr-2 h-4 w-4" />
            Face Recognition
            <span className="ml-2 text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">Soon</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card
          className="border-primary/10 shadow-md cursor-pointer"
          style={activeTab === 'registered' && !activeOnlyFilter ? { boxShadow: '0 0 0 2px #2B7A78' } : undefined}
          onClick={() => { setActiveTab('registered'); setActiveOnlyFilter(false); }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Today's Check-ins</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg"><LogIn className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{todayCount}</div>
            <p className="text-xs text-muted-foreground">Total visits today</p>
          </CardContent>
        </Card>

        <Card
          className="border-primary/10 shadow-md cursor-pointer"
          style={activeOnlyFilter ? { boxShadow: '0 0 0 2px #16a34a' } : undefined}
          title="Click to show only currently active check-ins"
          onClick={() => { setActiveTab('registered'); setActiveOnlyFilter(v => !v); }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Currently Active</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg"><UserCheck className="h-4 w-4 text-green-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeCount}</div>
            <p className="text-xs text-muted-foreground">Members in gym</p>
          </CardContent>
        </Card>

        <Card
          className="border-primary/10 shadow-md cursor-pointer"
          onClick={() => { setActiveTab('registered'); setActiveOnlyFilter(false); }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Occupancy Rate</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg"><Users className="h-4 w-4 text-primary" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{occupancy}%</div>
            <p className="text-xs text-muted-foreground">of {gymCapacity} capacity</p>
          </CardContent>
        </Card>

        <Card
          className="border-primary/10 shadow-md cursor-pointer"
          style={activeTab === 'daily' ? { boxShadow: '0 0 0 2px #2563eb' } : undefined}
          onClick={() => { setActiveTab('daily'); setActiveOnlyFilter(false); }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Daily Visitors</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg"><UserPlus className="h-4 w-4 text-blue-600" /></div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{dailyCheckIns.length}</div>
            <p className="text-xs text-muted-foreground">Walk-in passes today</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full flex">
          <TabsTrigger value="registered" className="flex-1">
            <UserCheck className="h-4 w-4 mr-2" />
            Members &amp; Staff
          </TabsTrigger>
          <TabsTrigger value="daily" className="flex-1">
            <UserPlus className="h-4 w-4 mr-2" />
            Walk-In / Daily
          </TabsTrigger>
        </TabsList>

        {/* ── Members & Staff tab ── */}
        <TabsContent value="registered" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* People list */}
            <Card className="border-primary/10 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-light border-b border-primary/10">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-primary">Members &amp; Staff</CardTitle>
                    <CardDescription>Search and check-in</CardDescription>
                  </div>
                  <Badge variant="outline" className="border-primary/30 text-primary">
                    {people.length} total
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or ID..."
                    className="pl-10 border-primary/20 focus:border-primary"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Loading...
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    {searchTerm ? `No results for "${searchTerm}"` : 'No members or staff found'}
                  </div>
                ) : (
                  <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: '520px' }}>
                    {filtered.map(person => (
                      <PersonRow
                        key={`${person.kind}-${person.id}`}
                        person={person}
                        onCheckIn={handleCheckIn}
                        onStaffClockIn={handleStaffClockIn}
                        onStaffClockOut={handleStaffClockOut}
                        isChecking={checkingInId === person.id}
                        isClockedIn={!!staffActiveMap[person.id]}
                        isActing={checkingInId === person.id || checkingOutId === person.id}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent check-ins */}
            <Card className="border-primary/10 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-light border-b border-primary/10">
                <CardTitle className="text-primary">Recent Check-ins</CardTitle>
                <CardDescription>Latest member activity today</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {todayAttendance.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserCheck className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm">No check-ins yet today</p>
                  </div>
                ) : visibleTodayAttendance.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <UserCheck className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm">No one is currently active.</p>
                    <Button variant="link" size="sm" onClick={() => setActiveOnlyFilter(false)}>Clear filter</Button>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: '520px' }}>
                    {visibleTodayAttendance.map(record => {
                      const name = record.member_name || record['walk_in_name'] || 'Visitor';
                      const isActive = record.status === 'active';
                      const isCheckingOut = checkingOutId === record.id;
                      return (
                      <div key={record.id} className="flex items-center justify-between p-3 border border-primary/10 rounded-lg hover:bg-gradient-light transition-colors">
                        <div className="flex items-center space-x-3">
                          <Avatar className="border-2 border-primary/20">
                            <AvatarImage src={record.photo_url} />
                            <AvatarFallback className="bg-gradient-light text-primary text-sm">
                              {initials(name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-sm">{name}</div>
                            <div className="text-xs text-muted-foreground">{record.member_biz_id} · {record.membership_type}</div>
                            <div className="text-xs text-muted-foreground">
                              In: {formatTime(record.check_in_time)}
                              {record.check_out_time && ` · Out: ${formatTime(record.check_out_time)}`}
                              {record.formatted_duration && ` · ${record.formatted_duration}`}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          {isActive ? (
                            <>
                              <Badge className="bg-green-100 text-green-800 border-0 text-xs">
                                <CheckCircle className="mr-1 h-3 w-3" /> In Gym
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => handleCheckOut(record.id, name)}
                                disabled={isCheckingOut}
                              >
                                {isCheckingOut
                                  ? <div className="animate-spin rounded-full h-3 w-3 border-b border-red-500 mr-1" />
                                  : <LogOut className="mr-1 h-3 w-3" />
                                }
                                Check Out
                              </Button>
                            </>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600 border-0 text-xs">Completed</Badge>
                          )}
                          <span className="text-xs text-muted-foreground capitalize">{record.check_in_method}</span>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Daily Visitor tab ── */}
        <TabsContent value="daily" className="space-y-6 animate-in fade-in-0 zoom-in-95 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-primary/10 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-primary text-white">
                <div className="flex items-center space-x-2">
                  <UserPlus className="h-5 w-5" />
                  <CardTitle>Walk-In / Daily Visitor Access</CardTitle>
                </div>
                <CardDescription className="text-white/80">Register and grant temporary access</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Visitor info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary flex items-center">
                    <Users className="h-4 w-4 mr-2" /> Visitor Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-primary">Full Name <span className="text-red-500">*</span></Label>
                      <Input placeholder="Enter full name" value={visitorName} onChange={e => setVisitorName(e.target.value)} className="border-primary/20 focus:border-primary" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-primary">Mobile Number <span className="text-red-500">*</span></Label>
                      <Input type="tel" placeholder="+971 XX XXX XXXX" value={visitorMobile} onChange={e => setVisitorMobile(e.target.value)} maxLength={15} className="border-primary/20 focus:border-primary" />
                    </div>
                  </div>

                  {/* Photo */}
                  <div className="space-y-2">
                    <Label className="text-primary">Photo <span className="text-muted-foreground text-sm">(Optional)</span></Label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {!visitorPhoto ? (
                        <>
                          <Button type="button" variant="outline" onClick={handleCapturePhoto} className="flex-1 border-primary/30">
                            <Camera className="mr-2 h-4 w-4" />
                            {isCameraActive ? 'Capture Photo' : 'Use Camera'}
                          </Button>
                          <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="flex-1 border-primary/30">
                            <Upload className="mr-2 h-4 w-4" /> Upload Photo
                          </Button>
                          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                        </>
                      ) : (
                        <div className="flex items-center space-x-3 p-3 border border-primary/20 rounded-lg bg-gradient-light w-full">
                          <img src={visitorPhoto} alt="Visitor" className="w-14 h-14 rounded-lg object-cover border-2 border-primary/20" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-primary">Photo ready</p>
                            <p className="text-xs text-muted-foreground">Ready for check-in</p>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setVisitorPhoto(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {isCameraActive && (
                      <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="bg-primary/10" />

                {/* Plan & Payment */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary flex items-center">
                    <CalendarClock className="h-4 w-4 mr-2" /> Access Plan &amp; Payment
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-primary">Choose Daily Plan <span className="text-red-500">*</span></Label>
                      <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                        <SelectTrigger className="border-primary/20">
                          <SelectValue placeholder={walkInPlans.length === 0 ? "No walk-in plans configured" : "Select a plan"} />
                        </SelectTrigger>
                        <SelectContent>
                          {walkInPlans.map(p => (
                            <SelectItem key={p.id} value={p.id.toString()}>
                              {p.name} — <CurrencyGlyph /> {p.price} ({p.duration})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {walkInPlans.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Add a plan under Manage Plans → Membership Type "Walk-In / Daily Visitor".
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label className="text-primary">Payment Method <span className="text-red-500">*</span></Label>
                      <Select
                        value={paymentMethod}
                        onValueChange={(v) => {
                          setPaymentMethod(v);
                          setPaymentDetails({ cardType: '', chequeNumber: '', chequeDate: '', bankName: '', bankAccountId: '', onlinePaymentType: '', providerName: '' });
                        }}
                      >
                        <SelectTrigger className="border-primary/20"><SelectValue placeholder="Select method" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="check">Cheque</SelectItem>
                          <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                          <SelectItem value="online">Online Payment</SelectItem>
                          <SelectItem value="credit">Credit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-primary">Processed By (Staff)</Label>
                    <Select value={processedByStaffId || undefined} onValueChange={setProcessedByStaffId}>
                      <SelectTrigger className="border-primary/20"><SelectValue placeholder="Select staff member (optional)" /></SelectTrigger>
                      <SelectContent>
                        {staffOptions.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Credits this sale toward that staff member's revenue target.</p>
                  </div>

                  {/* Method-specific detail fields — mirrors add-member.tsx's renderPaymentMethodDetails */}
                  {paymentMethod === 'card' && (
                    <div>
                      <Label className="text-sm text-gray-600 mb-1 block">Card Type</Label>
                      <Select value={paymentDetails.cardType || undefined} onValueChange={(v) => updatePaymentDetail('cardType', v)}>
                        <SelectTrigger className="border-primary/20"><SelectValue placeholder="Select card type" /></SelectTrigger>
                        <SelectContent>
                          {CARD_TYPE_OPTIONS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {paymentMethod === 'check' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <Label className="text-sm text-gray-600 mb-1 block">Cheque Number</Label>
                        <Input value={paymentDetails.chequeNumber} onChange={(e) => updatePaymentDetail('chequeNumber', e.target.value)} className="border-primary/20" />
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600 mb-1 block">Bank Name</Label>
                        <Input value={paymentDetails.bankName} onChange={(e) => updatePaymentDetail('bankName', e.target.value)} className="border-primary/20" />
                      </div>
                      <div>
                        <Label className="text-sm text-gray-600 mb-1 block">Cheque Date</Label>
                        <Input type="date" value={paymentDetails.chequeDate} onChange={(e) => updatePaymentDetail('chequeDate', e.target.value)} className="border-primary/20" />
                      </div>
                    </div>
                  )}
                  {paymentMethod === 'bank-transfer' && (
                    <div>
                      <Label className="text-sm text-gray-600 mb-1 block">Bank Account</Label>
                      <Select value={paymentDetails.bankAccountId || undefined} onValueChange={(v) => updatePaymentDetail('bankAccountId', v)}>
                        <SelectTrigger className="border-primary/20"><SelectValue placeholder="Select bank account" /></SelectTrigger>
                        <SelectContent>
                          {bankAccounts.length === 0 ? (
                            <div className="px-2 py-1.5 text-sm text-gray-500">No bank accounts found in Chart of Accounts</div>
                          ) : (
                            bankAccounts.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.code} — {a.name}</SelectItem>)
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {paymentMethod === 'online' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm text-gray-600 mb-1 block">Online Payment Type</Label>
                        <Select value={paymentDetails.onlinePaymentType || undefined} onValueChange={(v) => updatePaymentDetail('onlinePaymentType', v)}>
                          <SelectTrigger className="border-primary/20"><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            {ONLINE_PAYMENT_TYPE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {paymentDetails.onlinePaymentType === 'Other' && (
                        <div>
                          <Label className="text-sm text-gray-600 mb-1 block">Provider Name</Label>
                          <Input value={paymentDetails.providerName} onChange={(e) => updatePaymentDetail('providerName', e.target.value)} className="border-primary/20" />
                        </div>
                      )}
                    </div>
                  )}
                  {paymentMethod === 'credit' && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      Access will be granted with the charge left unpaid — no amount is collected now.
                    </p>
                  )}

                  {selectedPlan && (
                    <div className="p-4 bg-gradient-light border border-primary/20 rounded-lg flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Total Charge</p>
                        <p className="text-2xl font-bold text-primary"><CurrencyGlyph /> {selectedPlanDetails?.price}</p>
                        <p className="text-xs text-muted-foreground mt-1">Valid for {selectedPlanDetails?.duration}</p>
                      </div>
                      {paymentDone ? (
                        <Badge className="bg-green-100 text-green-800 border-0 px-3 py-1">
                          <CheckCircle className="h-4 w-4 mr-1" /> Paid
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-800 border-0 px-3 py-1">
                          <AlertCircle className="h-4 w-4 mr-1" /> Pending
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                <Separator className="bg-primary/10" />

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" className="flex-1 border-primary/30" onClick={resetDailyForm}>
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white"
                    onClick={handleCollectPayment}
                    disabled={!visitorName || !visitorMobile || !selectedPlan || !paymentMethod || paymentDone || processingPayment}
                  >
                    {processingPayment
                      ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Processing...</>
                      : <><CreditCard className="mr-2 h-4 w-4" /> Collect Payment</>
                    }
                  </Button>
                  <Button className="flex-1 btn-primary" onClick={handleGrantAccess} disabled={!paymentDone}>
                    <CheckCircle className="mr-2 h-4 w-4" /> Grant Access
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Today's daily visitors */}
            <Card className="border-primary/10 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-light border-b border-primary/10">
                <CardTitle className="text-primary">Today's Daily Visitors</CardTitle>
                <CardDescription>Walk-in passes issued</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {dailyCheckIns.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <UserPlus className="mx-auto h-10 w-10 text-muted-foreground/40 mb-3" />
                    <p className="text-sm">No daily visitors yet</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto" style={{ maxHeight: '520px' }}>
                    {dailyCheckIns.map(v => (
                      <div key={v.id} className="p-3 border border-primary/10 rounded-lg bg-gradient-light">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            {v.avatar
                              ? <img src={v.avatar} alt={v.memberName} className="w-10 h-10 rounded-full object-cover border-2 border-primary/20" />
                              : <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><UserPlus className="h-5 w-5 text-blue-600" /></div>
                            }
                            <div>
                              <p className="font-medium text-sm">{v.memberName}</p>
                              <p className="text-xs text-muted-foreground">{v.memberId}</p>
                            </div>
                          </div>
                          <Badge className="bg-blue-100 text-blue-800 border-0 text-xs">Daily</Badge>
                        </div>
                        <div className="space-y-1 text-xs text-muted-foreground ml-12">
                          <div className="flex justify-between"><span>Plan:</span><span className="font-medium text-primary">{v.membership}</span></div>
                          <div className="flex justify-between"><span>Check-in:</span><span className="font-medium">{v.checkInTime}</span></div>
                          <div className="flex justify-between"><span>Amount:</span><span className="font-medium text-green-600"><CurrencyGlyph /> {v.amount}</span></div>
                          <div className="flex justify-between"><span>Mobile:</span><span className="font-medium">{v.mobile}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirm check-in dialog */}
      {selectedPerson && (
        <Dialog open onOpenChange={() => setSelectedPerson(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Check-in</DialogTitle>
              <DialogDescription>Checking in {selectedPerson.name}</DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-4 py-4">
              <Avatar className="h-16 w-16 border-2 border-primary/20">
                <AvatarImage src={selectedPerson.photoUrl} />
                <AvatarFallback className="bg-gradient-light text-primary text-lg">
                  {initials(selectedPerson.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{selectedPerson.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedPerson.bizId}</p>
                <Badge className="mt-1 bg-gradient-light text-primary border border-primary/20">
                  {selectedPerson.role}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label>Check-in Time</Label>
                <div className="font-medium">{new Date().toLocaleTimeString()}</div>
              </div>
              <div>
                <Label>Date</Label>
                <div className="font-medium">{new Date().toLocaleDateString()}</div>
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-2">
              <Button variant="outline" onClick={() => setSelectedPerson(null)} className="border-primary/30">Cancel</Button>
              <Button
                className="btn-primary"
                onClick={confirmCheckIn}
                disabled={checkingInId !== null}
              >
                {checkingInId !== null
                  ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Checking in...</>
                  : <><CheckCircle className="mr-2 h-4 w-4" /> Confirm Check-in</>
                }
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// ── PersonRow sub-component ───────────────────────────────────────────────────

function PersonRow({ person, onCheckIn, onStaffClockIn, onStaffClockOut, isChecking, isClockedIn, isActing }: {
  person: PersonEntry;
  onCheckIn: (p: PersonEntry) => void;
  onStaffClockIn: (p: PersonEntry) => void;
  onStaffClockOut: (p: PersonEntry) => void;
  isChecking: boolean;
  isClockedIn: boolean;
  isActing: boolean;
}) {
  const isMember  = person.kind === 'member';
  const isActive  = person.status === 'active';

  const statusColor = isActive
    ? 'bg-green-100 text-green-800'
    : person.status === 'suspended'
    ? 'bg-red-100 text-red-800'
    : 'bg-gray-100 text-gray-700';

  return (
    <div className="flex items-center justify-between p-3 border border-primary/10 rounded-lg hover:bg-gradient-light transition-colors">
      <div className="flex items-center space-x-3">
        <Avatar className="border-2 border-primary/20">
          <AvatarImage src={person.photoUrl} />
          <AvatarFallback className="bg-gradient-light text-primary text-sm">
            {initials(person.name)}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium text-sm flex items-center gap-1.5">
            {person.name}
            {!isMember && (
              <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground font-normal">
                <Briefcase className="h-3 w-3" /> Staff
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{person.bizId} · {person.role}</div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Badge className={`${statusColor} border-0 text-xs capitalize`}>{person.status}</Badge>
        {isMember ? (
          <Button
            size="sm"
            className="btn-primary"
            onClick={() => onCheckIn(person)}
            disabled={isActing || !isActive}
          >
            {isChecking
              ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
              : <><LogIn className="mr-1 h-3 w-3" /> Check In</>
            }
          </Button>
        ) : isClockedIn ? (
          <Button
            size="sm"
            variant="outline"
            className="border-red-200 text-red-600 hover:bg-red-50 text-xs"
            onClick={() => onStaffClockOut(person)}
            disabled={isActing}
          >
            {isActing
              ? <div className="animate-spin rounded-full h-3 w-3 border-b border-red-500 mr-1" />
              : <LogOut className="mr-1 h-3 w-3" />
            }
            Clock Out
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="border-primary/30 text-xs"
            onClick={() => onStaffClockIn(person)}
            disabled={isActing || !isActive}
          >
            {isActing
              ? <div className="animate-spin rounded-full h-3 w-3 border-b border-primary mr-1" />
              : <LogIn className="mr-1 h-3 w-3" />
            }
            Clock In
          </Button>
        )}
      </div>
    </div>
  );
}
