import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Progress } from '../components/ui/progress';
import { Checkbox } from '../components/ui/checkbox';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  CreditCard,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Trophy,
  Users,
  Download,
  Share2,
  Printer,
  Edit,
  Plus,
  TrendingUp,
  Gift,
  Tag,
  Info,
  DollarSign,
  Wallet,
  Receipt,
  FileText,
  History,
  Zap,
  Award,
  Pause,
  Play,
  RefreshCw,
  ArrowRight,
  Sparkles,
  Check,
  ChevronRight,
  Building2,
  Timer,
  CircleDot,
  Ban,
  Snowflake,
  Flame
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api";

const calcDaysLeft = (endDate: string | null | undefined): number => {
  if (!endDate) return 0;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86400000));
};

const calcUsedPct = (startDate: string | null | undefined, endDate: string | null | undefined): number => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = Date.now();
  if (end <= start) return 0;
  return Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
};

interface RawMember {
  id: string;
  member_id?: string; memberId?: string;
  name?: string;
  membership_status?: string; membershipStatus?: string;
  membership_plan?: string; membershipPlan?: string;
  membership_type?: string; membershipType?: string;
  membership_start_date?: string; membershipStartDate?: string;
  membership_end_date?: string; membershipEndDate?: string;
  membership_fee?: number; membershipFee?: number;
  monthly_fee?: number; monthlyFee?: number;
  outstanding_balance?: number; outstandingBalance?: number;
  total_visits?: number; totalVisits?: number;
  app_access_enabled?: boolean; appAccessEnabled?: boolean;
  payment_status?: string; paymentStatus?: string;
}

interface RawPlan {
  id: number; name: string; type?: string; planType?: string;
  price?: number; discount?: number; description?: string;
  duration_type?: string; durationType?: string;
  duration_value?: string; durationValue?: string;
}

const buildMembershipData = (raw: RawMember) => {
  const memberId = raw.member_id ?? raw.memberId ?? "—";
  const memberName = raw.name ?? "Member";
  const status = raw.membership_status ?? raw.membershipStatus ?? "Active";
  const planName = raw.membership_plan ?? raw.membershipPlan ?? "—";
  const planType = raw.membership_type ?? raw.membershipType ?? "Individual";
  const startDate = raw.membership_start_date ?? raw.membershipStartDate ?? null;
  const endDate = raw.membership_end_date ?? raw.membershipEndDate ?? null;
  const fee = Number(raw.membership_fee ?? raw.membershipFee ?? raw.monthly_fee ?? raw.monthlyFee ?? 0);
  const outstanding = Number(raw.outstanding_balance ?? raw.outstandingBalance ?? 0);
  const appEnabled = raw.app_access_enabled ?? raw.appAccessEnabled ?? false;
  const paymentStatus = raw.payment_status ?? raw.paymentStatus ?? "pending";
  const daysLeft = calcDaysLeft(endDate);
  const usedPct = calcUsedPct(startDate, endDate);

  return {
    memberId,
    memberName,
    memberPhoto: null as null,
    status: status.charAt(0).toUpperCase() + status.slice(1).toLowerCase(),
    currentPlan: {
      name: planName,
      type: planType,
      duration: 30,
      startDate: startDate ?? "",
      endDate: endDate ?? "",
      branch: "Main Branch",
      price: fee,
      benefits: [] as string[],
    },
    daysLeft,
    timeUsedPercentage: usedPct,
    activeAddons: [] as any[],
    dues: outstanding > 0
      ? [{ id: 1, type: "Outstanding Balance", description: `Balance due`, amount: outstanding, dueDate: endDate ?? "", status: paymentStatus }]
      : [] as any[],
    totalDue: outstanding,
    accessDeviceStatus: { enabled: appEnabled, validUntil: endDate ?? "" },
  };
};

const buildRenewalPlans = (raw: RawPlan[], currentPlanName: string) => {
  return raw.map((p, idx) => {
    const price = Number(p.price ?? 0);
    const discount = Number(p.discount ?? 0);
    const finalPrice = price - discount;
    const newExpiry = new Date();
    newExpiry.setMonth(newExpiry.getMonth() + 1);
    const type = p.name === currentPlanName ? "Recommended" : idx === 0 ? "Recommended" : "Upgrade";
    return {
      id: p.id,
      name: p.name,
      type,
      duration: p.duration_type ?? p.durationType ?? "Monthly",
      price,
      discount,
      finalPrice,
      savings: discount,
      newExpiryDate: newExpiry.toISOString().slice(0, 10),
      features: p.description ? [p.description] : ["Gym access included"],
    };
  });
};


// Mock history timeline
const membershipHistory = [
  {
    id: 1,
    type: "renewal",
    title: "Membership Renewed",
    description: "Gold Monthly - January 2026",
    date: "2026-01-12",
    time: "10:30 AM",
    amount: 500,
    discount: 0,
    createdBy: "Self Service",
    voucherId: "V-2026-001"
  },
  {
    id: 2,
    type: "addon",
    title: "Add-on Purchased",
    description: "Nutrition Consultation Package",
    date: "2026-01-15",
    time: "02:15 PM",
    amount: 300,
    discount: 30,
    createdBy: "Self Service",
    voucherId: "V-2026-002"
  },
  {
    id: 3,
    type: "payment",
    title: "Payment Received",
    description: "Receipt for membership renewal",
    date: "2026-01-12",
    time: "10:32 AM",
    amount: 500,
    discount: 0,
    createdBy: "Admin",
    voucherId: "R-2026-001"
  },
  {
    id: 4,
    type: "membership",
    title: "Membership Activated",
    description: "Gold Monthly - December 2025",
    date: "2025-12-12",
    time: "09:15 AM",
    amount: 500,
    discount: 50,
    createdBy: "Front Desk",
    voucherId: "V-2025-345"
  }
];

interface MembershipRenewalProps {
  onNavigate?: (section: string) => void;
}

export function MembershipRenewal({ onNavigate }: MembershipRenewalProps = {}) {
  const [mainTab, setMainTab] = useState<'details' | 'renewal' | 'payments' | 'history'>('details');
  const [showRenewalSheet, setShowRenewalSheet] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [showFreezeSheet, setShowFreezeSheet] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [selectedDues, setSelectedDues] = useState<number[]>([]);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [successType, setSuccessType] = useState<'renewal' | 'payment' | 'freeze'>('renewal');
  const [successVoucherId, setSuccessVoucherId] = useState('');

  // Freeze form state
  const [freezeForm, setFreezeForm] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  // Real data state
  const [membershipData, setMembershipData] = useState<ReturnType<typeof buildMembershipData> | null>(null);
  const [renewalPlans, setRenewalPlans] = useState<ReturnType<typeof buildRenewalPlans>>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token) { setDataLoading(false); setDataError("Please log in to view your membership."); return; }
    try {
      setDataLoading(true);
      setDataError(null);
      const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
      const [mRes, pRes] = await Promise.all([
        fetch(`${API_BASE}/members/me`, { headers }),
        fetch(`${API_BASE}/plans?status=Active`, { headers }),
      ]);
      if (mRes.status === 404) {
        const msg = await mRes.text().catch(() => "");
        throw new Error(msg || "No membership record found for your account.");
      }
      if (!mRes.ok) { const b = await mRes.json().catch(() => ({})); throw new Error((b as any)?.message ?? `Error ${mRes.status}`); }
      if (!pRes.ok) throw new Error(`Plans error ${pRes.status}`);
      const [rawMember, rawPlans]: [RawMember, RawPlan[]] = await Promise.all([mRes.json(), pRes.json()]);
      const built = buildMembershipData(rawMember);
      setMemberId(rawMember.id);
      setMembershipData(built);
      setRenewalPlans(buildRenewalPlans(rawPlans, built.currentPlan.name));
    } catch (e: any) {
      setDataError(e.message ?? "Failed to load membership data.");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Expiring Soon':
        return 'bg-orange-100 text-orange-800';
      case 'Expired':
        return 'bg-red-100 text-red-800';
      case 'Frozen':
        return 'bg-blue-100 text-blue-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'Expiring Soon':
        return <AlertCircle className="h-4 w-4" />;
      case 'Expired':
        return <XCircle className="h-4 w-4" />;
      case 'Frozen':
        return <Snowflake className="h-4 w-4" />;
      case 'Inactive':
        return <Ban className="h-4 w-4" />;
      default:
        return <CircleDot className="h-4 w-4" />;
    }
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'renewal':
        return <RefreshCw className="h-5 w-5 text-green-600" />;
      case 'addon':
        return <Plus className="h-5 w-5 text-blue-600" />;
      case 'payment':
        return <DollarSign className="h-5 w-5 text-purple-600" />;
      case 'membership':
        return <CreditCard className="h-5 w-5 text-orange-600" />;
      case 'freeze':
        return <Snowflake className="h-5 w-5 text-cyan-600" />;
      default:
        return <CircleDot className="h-5 w-5 text-gray-600" />;
    }
  };

  const handleRenewClick = (plan: any) => {
    setSelectedPlan(plan);
    setShowRenewalSheet(true);
  };

  const handleConfirmRenewal = async () => {
    if (!memberId || !selectedPlan) return;
    try {
      const token = sessionStorage.getItem("token") ?? "";
      const newEnd = new Date();
      newEnd.setMonth(newEnd.getMonth() + 1);
      const body = {
        planName: selectedPlan.name,
        membershipEndDate: newEnd.toISOString(),
        membershipFee: selectedPlan.finalPrice,
        paymentStatus: "pending",
        membershipType: membershipData?.currentPlan.type ?? "Individual",
        membershipStatus: "active",
      };
      const res = await fetch(`${API_BASE}/members/${memberId}/renew`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as any)?.message ?? "Renewal failed"); }
      setShowRenewalSheet(false);
      setSuccessType('renewal');
      setSuccessVoucherId(`V-${Date.now().toString().slice(-6)}`);
      setShowSuccessDialog(true);
      toast.success('Membership Renewed!', {
        description: `Your ${selectedPlan.name} has been renewed successfully`,
        duration: 5000,
      });
      loadData();
    } catch (e: any) {
      toast.error('Renewal Failed', { description: e.message });
    }
  };

  const handlePayDue = () => {
    if (selectedDues.length === 0) {
      toast.error('Please select at least one due to pay');
      return;
    }
    setShowPaymentSheet(false);
    setSuccessType('payment');
    setSuccessVoucherId(`R-2026-${Math.floor(Math.random() * 1000)}`);
    setShowSuccessDialog(true);
    toast.success('Payment Successful!', {
      description: 'Your payment has been processed',
      duration: 3000,
    });
    setSelectedDues([]);
  };

  const handleRequestFreeze = async () => {
    if (!memberId || !freezeForm.endDate) {
      toast.error('Please select a freeze end date');
      return;
    }
    try {
      const token = sessionStorage.getItem("token") ?? "";
      const res = await fetch(`${API_BASE}/members/${memberId}/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ freezeUntil: freezeForm.endDate, reason: freezeForm.reason || "Member request" }),
      });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error((b as any)?.message ?? "Freeze failed"); }
      setShowFreezeSheet(false);
      setSuccessType('freeze');
      setShowSuccessDialog(true);
      toast.success('Membership Frozen!', { description: `Frozen until ${freezeForm.endDate}`, duration: 3000 });
      setFreezeForm({ startDate: '', endDate: '', reason: '' });
      loadData();
    } catch (e: any) {
      toast.error('Freeze Failed', { description: e.message });
    }
  };

  const handleDownloadVoucher = (voucherId: string) => {
    toast.info('Downloading Voucher', {
      description: `Voucher ${voucherId} is being downloaded...`,
      duration: 2000,
    });
  };

  const handleShareVoucher = (voucherId: string) => {
    toast.success('Voucher Shared', {
      description: 'Sharing via WhatsApp...',
      duration: 2000,
    });
  };

  const handlePrintVoucher = (voucherId: string) => {
    toast.info('Printing Voucher', {
      description: 'Opening print dialog...',
      duration: 2000,
    });
  };

  const filteredHistory = historyFilter === 'all'
    ? membershipHistory
    : membershipHistory.filter(item => item.type === historyFilter);

  const data = membershipData;

  const totalSelectedDueAmount = (data?.dues ?? [])
    .filter(due => selectedDues.includes(due.id))
    .reduce((sum, due) => sum + due.amount, 0);

  if (dataLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#327F74] mx-auto mb-4" />
          <p className="text-gray-600">Loading membership data…</p>
        </div>
      </div>
    );
  }

  if (dataError || !data) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-red-600">{dataError ?? "Membership data not found."}</p>
          <button onClick={loadData} className="px-4 py-2 bg-[#327F74] text-white rounded-lg">Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] p-4 md:p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-[#1E293B]">Membership & Renewal</h1>
            <p className="text-gray-600 mt-1">Manage your membership details</p>
          </div>
        </div>

        {/* Membership Snapshot Card */}
        <Card className="mb-6 border-2" style={{ borderColor: '#327F74' }}>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Left: Member Info */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-4" style={{ borderColor: '#327F74' }}>
                  <AvatarImage src={data.memberPhoto} />
                  <AvatarFallback className="text-xl bg-[#327F74] text-white">
                    {data.memberName.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold">{data.memberName}</h2>
                  <p className="text-sm text-gray-600">ID: {data.memberId}</p>
                  <Badge className={`mt-2 ${getStatusColor(data.status)}`}>
                    {getStatusIcon(data.status)}
                    <span className="ml-1">{data.status}</span>
                  </Badge>
                </div>
              </div>

              {/* Middle: Plan Details */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Current Plan</p>
                    <p className="text-lg font-bold text-[#327F74]">{data.currentPlan.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Branch</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Building2 className="h-4 w-4" />
                      {data.currentPlan.branch}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-xs text-gray-600">Start Date</p>
                    <p className="font-semibold flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(data.currentPlan.startDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">End Date</p>
                    <p className="font-semibold flex items-center gap-1 text-orange-600">
                      <AlertCircle className="h-3 w-3" />
                      {new Date(data.currentPlan.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Time Remaining Progress */}
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Time Used</span>
                    <span className="font-semibold text-[#327F74]">{data.daysLeft} days left</span>
                  </div>
                  <Progress value={data.timeUsedPercentage} className="h-2" />
                </div>
              </div>

              {/* Right: Quick Actions */}
              <div className="flex flex-col gap-2 md:w-48">
                <Button
                  style={{ backgroundColor: '#327F74' }}
                  onClick={() => setMainTab('renewal')}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Renew Now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMainTab('renewal')}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Upgrade
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentSheet(true)}
                >
                  <Wallet className="h-4 w-4 mr-2" />
                  Pay Due
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowFreezeSheet(true)}
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Freeze
                </Button>
              </div>
            </div>

            {/* Access Status Banner */}
            {data.accessDeviceStatus.enabled && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">Access Enabled</p>
                    <p className="text-sm text-green-700">
                      Valid until: {new Date(data.accessDeviceStatus.validUntil).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Zap className="h-8 w-8 text-green-600 opacity-20" />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Tabs */}
        <Tabs value={mainTab} onValueChange={(val) => setMainTab(val as any)} className="w-full">
          <TabsList className="grid w-full md:w-[600px] grid-cols-4">
            <TabsTrigger value="details">Plan Details</TabsTrigger>
            <TabsTrigger value="renewal">Renew/Upgrade</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Plan Details Tab */}
          <TabsContent value="details" className="mt-6 space-y-6">
            {/* Current Plan Benefits */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Benefits</CardTitle>
                <CardDescription>What's included in your {data.currentPlan.name}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {data.currentPlan.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                      <span className="text-sm">{benefit}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Add-ons */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Active Add-ons</span>
                  <Button size="sm" variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Buy Add-on
                  </Button>
                </CardTitle>
                <CardDescription>Additional services you've purchased</CardDescription>
              </CardHeader>
              <CardContent>
                {data.activeAddons.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No active add-ons</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {data.activeAddons.map(addon => (
                      <Card key={addon.id} className="bg-gradient-to-r from-blue-50 to-purple-50">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-semibold">{addon.name}</h3>
                            {addon.unlimited ? (
                              <Badge className="bg-purple-100 text-purple-800">Unlimited</Badge>
                            ) : (
                              <Badge className="bg-blue-100 text-blue-800">
                                {addon.creditsRemaining}/{addon.totalCredits} credits left
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(addon.validFrom).toLocaleDateString()}</span>
                            </div>
                            <ArrowRight className="h-4 w-4" />
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{new Date(addon.validTo).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {!addon.unlimited && (
                            <Progress 
                              value={(addon.creditsRemaining / addon.totalCredits) * 100} 
                              className="h-2 mt-3"
                            />
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Renew/Upgrade Tab */}
          <TabsContent value="renewal" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Renewal Options</CardTitle>
                <CardDescription>Choose the best plan for you</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {renewalPlans.map(plan => (
                    <Card 
                      key={plan.id} 
                      className={`hover:shadow-lg transition-all cursor-pointer ${
                        plan.type === 'Best Value' ? 'border-2 border-[#327F74] relative' : ''
                      }`}
                      onClick={() => handleRenewClick(plan)}
                    >
                      {plan.type === 'Best Value' && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-[#327F74] text-white px-4 py-1">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Best Value
                          </Badge>
                        </div>
                      )}
                      {plan.type === 'Recommended' && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-blue-500 text-white px-4 py-1">
                            Recommended
                          </Badge>
                        </div>
                      )}
                      {plan.type === 'Upgrade' && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-purple-500 text-white px-4 py-1">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            Upgrade
                          </Badge>
                        </div>
                      )}
                      <CardContent className="p-6 pt-8">
                        <div className="text-center mb-4">
                          <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                          <p className="text-sm text-gray-600">{plan.duration}</p>
                        </div>

                        <div className="text-center mb-4">
                          {plan.discount > 0 && (
                            <p className="text-sm text-gray-500 line-through">AED {plan.price}</p>
                          )}
                          <p className="text-3xl font-bold text-[#327F74]">
                            AED {plan.finalPrice}
                          </p>
                          {plan.savings > 0 && (
                            <Badge className="mt-2 bg-green-100 text-green-800">
                              <Tag className="h-3 w-3 mr-1" />
                              Save AED {plan.savings}
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 mb-4">
                          {plan.features.map((feature, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>

                        <Separator className="my-4" />

                        <div className="text-center text-sm text-gray-600 mb-4">
                          <p>New expiry date:</p>
                          <p className="font-semibold text-[#327F74]">
                            {new Date(plan.newExpiryDate).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>

                        <Button 
                          className="w-full" 
                          style={{ backgroundColor: plan.type === 'Best Value' ? '#327F74' : undefined }}
                          variant={plan.type === 'Best Value' ? 'default' : 'outline'}
                        >
                          {plan.type === 'Upgrade' ? 'Upgrade Now' : 'Renew Now'}
                          <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments & Dues Tab */}
          <TabsContent value="payments" className="mt-6 space-y-6">
            {/* Dues Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Outstanding Dues</CardTitle>
                <CardDescription>Pending payments and invoices</CardDescription>
              </CardHeader>
              <CardContent>
                {data.totalDue > 0 ? (
                  <>
                    <div className="p-6 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-orange-900 mb-1">Total Due Amount</p>
                          <p className="text-3xl font-bold text-orange-600">
                            AED {data.totalDue.toFixed(2)}
                          </p>
                        </div>
                        <AlertCircle className="h-12 w-12 text-orange-600 opacity-20" />
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      {data.dues.map(due => (
                        <Card key={due.id} className="border-l-4 border-orange-500">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                id={`due-${due.id}`}
                                checked={selectedDues.includes(due.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedDues([...selectedDues, due.id]);
                                  } else {
                                    setSelectedDues(selectedDues.filter(id => id !== due.id));
                                  }
                                }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">{due.description}</h4>
                                  <Badge className="bg-orange-100 text-orange-800">
                                    {due.status}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <FileText className="h-4 w-4" />
                                    {due.type}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    Due: {new Date(due.dueDate).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1 font-bold text-orange-600">
                                    <DollarSign className="h-4 w-4" />
                                    AED {due.amount}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    <Button
                      className="w-full h-12"
                      style={{ backgroundColor: '#327F74' }}
                      onClick={() => setShowPaymentSheet(true)}
                      disabled={selectedDues.length === 0}
                    >
                      <Wallet className="h-5 w-5 mr-2" />
                      Pay Selected Dues (AED {totalSelectedDueAmount})
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">All Paid Up!</h3>
                    <p className="text-gray-600">You have no outstanding dues</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Receipts */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Receipts</CardTitle>
                <CardDescription>Download or share your payment receipts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {membershipHistory
                    .filter(item => item.type === 'payment' || item.type === 'renewal')
                    .slice(0, 5)
                    .map(item => (
                      <Card key={item.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                  <Receipt className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                  <h4 className="font-semibold">{item.description}</h4>
                                  <p className="text-sm text-gray-600">
                                    {new Date(item.date).toLocaleDateString()} • {item.voucherId}
                                  </p>
                                </div>
                              </div>
                              <p className="text-lg font-bold text-[#327F74] ml-14">
                                AED {item.amount.toFixed(2)}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleDownloadVoucher(item.voucherId)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleShareVoucher(item.voucherId)}
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handlePrintVoucher(item.voucherId)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Membership History</CardTitle>
                <CardDescription>Your complete membership timeline</CardDescription>
                
                {/* Filter Chips */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {['all', 'membership', 'renewal', 'addon', 'payment', 'freeze'].map(filter => (
                    <Badge
                      key={filter}
                      variant={historyFilter === filter ? 'default' : 'outline'}
                      className="cursor-pointer capitalize"
                      onClick={() => setHistoryFilter(filter)}
                    >
                      {filter === 'all' ? 'All' : filter.replace('-', ' ')}
                    </Badge>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="space-y-4">
                    {filteredHistory.map((item, idx) => (
                      <div key={item.id} className="relative">
                        {/* Timeline Line */}
                        {idx !== filteredHistory.length - 1 && (
                          <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200" />
                        )}
                        
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex gap-4">
                              {/* Icon */}
                              <div className="flex-shrink-0">
                                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                                  {getTimelineIcon(item.type)}
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <h4 className="font-semibold">{item.title}</h4>
                                    <p className="text-sm text-gray-600">{item.description}</p>
                                  </div>
                                  <Badge variant="outline" className="ml-2">
                                    {item.voucherId}
                                  </Badge>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(item.date).toLocaleDateString()}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {item.time}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {item.createdBy}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between">
                                  <div className="text-sm">
                                    {item.discount > 0 && (
                                      <p className="text-gray-500">
                                        Original: AED {item.amount + item.discount} • 
                                        Discount: AED {item.discount}
                                      </p>
                                    )}
                                    <p className="font-bold text-[#327F74]">
                                      Amount: AED {item.amount.toFixed(2)}
                                    </p>
                                  </div>
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => handleDownloadVoucher(item.voucherId)}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Voucher
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Renewal Confirmation Sheet */}
      {selectedPlan && (
        <Sheet open={showRenewalSheet} onOpenChange={setShowRenewalSheet}>
          <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Confirm Renewal</SheetTitle>
              <SheetDescription>Review your renewal details</SheetDescription>
            </SheetHeader>

            <div className="space-y-6 mt-6">
              {/* Plan Summary */}
              <Card className="bg-gradient-to-r from-[#327F74] to-[#2a6a61] text-white">
                <CardContent className="p-6">
                  <h3 className="text-2xl font-bold mb-2">{selectedPlan.name}</h3>
                  <p className="text-white/80 mb-4">{selectedPlan.duration}</p>
                  <div className="flex items-end gap-2">
                    {selectedPlan.discount > 0 && (
                      <span className="text-lg text-white/70 line-through">
                        AED {selectedPlan.price}
                      </span>
                    )}
                    <span className="text-4xl font-bold">AED {selectedPlan.finalPrice}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Discount Details */}
              {selectedPlan.discount > 0 && (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Tag className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="font-semibold text-green-900">Discount Applied</p>
                        <p className="text-sm text-green-700">You save AED {selectedPlan.savings}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Renewal Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Renewal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Current Expiry</span>
                    <span className="font-semibold">
                      {new Date(data.currentPlan.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Renewal Start</span>
                    <span className="font-semibold">
                      {new Date(data.currentPlan.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-gray-600 font-semibold">New Expiry Date</span>
                    <span className="font-bold text-[#327F74]">
                      {new Date(selectedPlan.newExpiryDate).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Payment Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Plan Price</span>
                    <span>AED {selectedPlan.price}</span>
                  </div>
                  {selectedPlan.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>- AED {selectedPlan.discount}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Payable</span>
                    <span className="text-[#327F74]">AED {selectedPlan.finalPrice}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Confirm Buttons */}
              <div className="space-y-3">
                <Button
                  className="w-full h-12 text-lg"
                  style={{ backgroundColor: '#327F74' }}
                  onClick={handleConfirmRenewal}
                >
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Confirm & Pay Now
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleConfirmRenewal}
                >
                  Confirm & Pay Later
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Payment Sheet */}
      <Sheet open={showPaymentSheet} onOpenChange={setShowPaymentSheet}>
        <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Pay Outstanding Dues</SheetTitle>
            <SheetDescription>Complete your payment</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Amount Summary */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 mb-1">Total Amount</p>
                <p className="text-4xl font-bold text-purple-600">
                  AED {totalSelectedDueAmount.toFixed(2)}
                </p>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'card' ? 'border-[#327F74] bg-[#327F74] bg-opacity-5' : 'hover:border-gray-400'
                  }`}
                  onClick={() => setPaymentMethod('card')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-[#327F74]" />
                      <div>
                        <p className="font-semibold">Credit/Debit Card</p>
                        <p className="text-sm text-gray-600">Pay with card</p>
                      </div>
                    </div>
                    {paymentMethod === 'card' && <CheckCircle2 className="h-5 w-5 text-[#327F74]" />}
                  </div>
                </div>

                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    paymentMethod === 'wallet' ? 'border-[#327F74] bg-[#327F74] bg-opacity-5' : 'hover:border-gray-400'
                  }`}
                  onClick={() => setPaymentMethod('wallet')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wallet className="h-5 w-5 text-[#327F74]" />
                      <div>
                        <p className="font-semibold">Wallet</p>
                        <p className="text-sm text-gray-600">Balance: AED 1,200</p>
                      </div>
                    </div>
                    {paymentMethod === 'wallet' && <CheckCircle2 className="h-5 w-5 text-[#327F74]" />}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Confirm Payment */}
            <Button
              className="w-full h-12 text-lg"
              style={{ backgroundColor: '#327F74' }}
              onClick={handlePayDue}
              disabled={selectedDues.length === 0}
            >
              <Wallet className="h-5 w-5 mr-2" />
              Pay AED {totalSelectedDueAmount.toFixed(2)}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Freeze Request Sheet */}
      <Sheet open={showFreezeSheet} onOpenChange={setShowFreezeSheet}>
        <SheetContent side="bottom" className="h-[75vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Request Membership Freeze</SheetTitle>
            <SheetDescription>Temporarily pause your membership</SheetDescription>
          </SheetHeader>

          <div className="space-y-6 mt-6">
            {/* Freeze Policy */}
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-semibold text-blue-900">Freeze Policy</p>
                    <ul className="list-disc list-inside text-blue-700 space-y-1">
                      <li>Minimum freeze period: 7 days</li>
                      <li>Maximum freeze period: 60 days</li>
                      <li>Maximum freeze count per year: 2 times</li>
                      <li>Freeze requires admin approval</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Freeze Form */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="freezeStart">Freeze Start Date</Label>
                <Input
                  id="freezeStart"
                  type="date"
                  value={freezeForm.startDate}
                  onChange={(e) => setFreezeForm({...freezeForm, startDate: e.target.value})}
                  className="mt-2"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="freezeEnd">Freeze End Date</Label>
                <Input
                  id="freezeEnd"
                  type="date"
                  value={freezeForm.endDate}
                  onChange={(e) => setFreezeForm({...freezeForm, endDate: e.target.value})}
                  className="mt-2"
                  min={freezeForm.startDate}
                />
              </div>
              <div>
                <Label htmlFor="freezeReason">Reason (Optional)</Label>
                <Input
                  id="freezeReason"
                  placeholder="Medical, Travel, etc."
                  value={freezeForm.reason}
                  onChange={(e) => setFreezeForm({...freezeForm, reason: e.target.value})}
                  className="mt-2"
                />
              </div>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full h-12"
              style={{ backgroundColor: '#327F74' }}
              onClick={handleRequestFreeze}
            >
              <Snowflake className="h-5 w-5 mr-2" />
              Submit Freeze Request
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <div className="text-center space-y-6 py-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              {successType === 'renewal' && <RefreshCw className="h-10 w-10 text-green-600" />}
              {successType === 'payment' && <CheckCircle2 className="h-10 w-10 text-green-600" />}
              {successType === 'freeze' && <Snowflake className="h-10 w-10 text-blue-600" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">
                {successType === 'renewal' && 'Renewal Successful!'}
                {successType === 'payment' && 'Payment Successful!'}
                {successType === 'freeze' && 'Request Submitted!'}
              </h2>
              <p className="text-gray-600">
                {successType === 'renewal' && 'Your membership has been renewed successfully'}
                {successType === 'payment' && 'Your payment has been processed'}
                {successType === 'freeze' && 'Your freeze request is pending admin approval'}
              </p>
            </div>

            {(successType === 'renewal' || successType === 'payment') && (
              <Card className="bg-gray-50">
                <CardContent className="p-4">
                  <p className="text-sm text-gray-600 mb-1">Voucher ID</p>
                  <p className="font-mono font-bold text-lg">{successVoucherId}</p>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full"
                style={{ backgroundColor: '#327F74' }}
                onClick={() => {
                  setShowSuccessDialog(false);
                  setMainTab('details');
                }}
              >
                View Details
              </Button>
              {(successType === 'renewal' || successType === 'payment') && (
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDownloadVoucher(successVoucherId)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleShareVoucher(successVoucherId)}
                  >
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handlePrintVoucher(successVoucherId)}
                  >
                    <Printer className="h-4 w-4 mr-1" />
                    Print
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
