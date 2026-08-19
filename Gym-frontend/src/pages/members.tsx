import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCurrency, CurrencyGlyph } from '../utils/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Calendar as CalendarComponent } from "../components/ui/calendar";
import { Checkbox } from "../components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { Tooltip, TooltipTrigger, TooltipContent } from "../components/ui/tooltip";
import { MemberApprovalModal } from "../components/shared/member-approval-modal";
import { MemberAddons } from "./member-addons";
import { MemberReceipts } from "./member-receipts";
import { rewardService, walletService, type ReferralReward, type Wallet as RewardWallet } from "../utils/supabase/reward-service";
import {
  Plus,
  Search,
  UserPlus,
  Pause,
  Play,
  BarChart3,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  FileText,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Banknote,
  CreditCard,
  Wallet,
  ArrowLeftRight,
  Snowflake,
  Info,
  MoreVertical,
  UserCheck,
  Eye,
  Pencil,
  XCircle,
  Bell,
  ShieldBan,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { FaCircleCheck, FaCircleArrowUp, FaCircleArrowDown, FaArrowsRotate, FaArrowUp, FaArrowDown, FaArrowRight } from 'react-icons/fa6';
import { toast } from 'sonner';
import { membersService, Member } from '../utils/supabase/members-service';
import { plansService, Plan } from '../utils/supabase/plans-service';
import { addonsService } from '../utils/supabase/addons-service';
import { authService } from '../utils/supabase/auth-service';
import { receiptsService, Receipt as ApiReceipt } from '../utils/supabase/receipts-service';
import { accountHeadsService, AccountHead } from '../utils/supabase/account-heads-service';
import {
  SplitPaymentFields, isSplitPaymentValid, isSplitPaymentDetailsValid, buildSplitPaymentBreakdown,
  EMPTY_SPLIT_PAYMENT, EMPTY_SPLIT_DETAILS, CARD_TYPE_OPTIONS, ONLINE_PAYMENT_TYPE_OPTIONS
} from '../components/shared/split-payment-fields';
import type { SplitPaymentValue, SplitPaymentDetails } from '../components/shared/split-payment-fields';
import { FaPlus } from 'react-icons/fa6';

// Maps the renewal panel's top-level payment method to the SplitPaymentValue
// key so its rich detail fields (card type, online payment type, ...) can be
// validated/built by reusing the same helpers Mixed/Split legs use — a single
// top-level method is just a split with one active leg.
const RENEWAL_METHOD_TO_LEG_KEY: Partial<Record<string, keyof SplitPaymentValue>> = {
  cash: 'cash', card: 'card', online: 'online',
};

const membershipPlans = [
  {
    id: 1,
    name: "Basic Monthly",
    price: 299,
    duration: "1 month",
    level: 1,
    features: ["Gym access", "Locker room", "Basic equipment"]
  },
  {
    id: 2,
    name: "Standard Monthly",
    price: 499,
    duration: "1 month",
    level: 2,
    features: ["Basic + Group classes", "Guest pass", "Towel service"]
  },
  {
    id: 3,
    name: "Premium Monthly",
    price: 799,
    duration: "1 month",
    level: 3,
    features: ["Standard + Personal training", "Nutrition consultation", "Priority booking"]
  },
  {
    id: 4,
    name: "Gold Quarterly",
    price: 2199,
    duration: "3 months",
    level: 4,
    features: ["Premium benefits", "3 months access", "10% discount", "Free fitness assessment"]
  },
  {
    id: 5,
    name: "Platinum Annual",
    price: 7999,
    duration: "12 months",
    level: 5,
    features: ["All Premium features", "2 months free", "VIP locker", "Complimentary massages", "Nutrition plan"]
  }
];

interface MembersProps {
  onNavigate?: (section: string, params?: Record<string, any>) => void;
  initialTab?: string;
}


export function Members({ onNavigate, initialTab = "members" }: MembersProps = {}) {
  const navigate = useNavigate();
  const { currencyCode } = useCurrency();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  // Only gates the full-page skeleton on first mount. Search/filter/pagination
  // re-fetches reuse `loading` for a small inline indicator instead, so the
  // search input never unmounts (and loses focus) while the user is typing.
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [profileMember, setProfileMember] = useState<Member | null>(null);
  const [profileRewards, setProfileRewards] = useState<ReferralReward[]>([]);
  const [profileWallet, setProfileWallet] = useState<RewardWallet | null>(null);
  const [profileRewardsLoading, setProfileRewardsLoading] = useState(false);

  useEffect(() => {
    if (!isProfileDialogOpen || !profileMember) {
      setProfileRewards([]);
      setProfileWallet(null);
      return;
    }
    const memberBusinessId = String(profileMember.member_id || profileMember.id);
    setProfileRewardsLoading(true);
    Promise.all([
      rewardService.getByMember(memberBusinessId).catch(() => []),
      walletService.getWallet(memberBusinessId).catch(() => null),
    ]).then(([rewards, wallet]) => {
      setProfileRewards(rewards);
      setProfileWallet(wallet);
    }).finally(() => setProfileRewardsLoading(false));
  }, [isProfileDialogOpen, profileMember]);
  const [isPhotoViewerOpen, setIsPhotoViewerOpen] = useState(false);
  const [photoViewer, setPhotoViewer] = useState<{ src: string; name: string } | null>(null);

  // Membership Report states
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize] = useState(20);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Report filters
  const [reportType, setReportType] = useState("membership");
  const [dateRange, setDateRange] = useState("last-30-days");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);
  const [membershipType, setMembershipType] = useState("all");
  const [transactionType, setTransactionType] = useState("all");
  const [payMode, setPayMode] = useState("all");
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Schedule form states
  const [scheduleName, setScheduleName] = useState("");
  const [scheduleFrequency, setScheduleFrequency] = useState("weekly");
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(new Date());
  const [scheduleRecipients, setScheduleRecipients] = useState("");
  const [includeSummary, setIncludeSummary] = useState(true);
  const [exportFormat, setExportFormat] = useState("excel");

  // API Plans for Renewals tab
  const [apiPlans, setApiPlans] = useState<Plan[]>([]);

  // Active add-ons per member (member_db_id -> add-on names), shown as
  // "+ addon" under Plan Type in the member directory table.
  const [memberActiveAddons, setMemberActiveAddons] = useState<Record<string, string[]>>({});

  // Renew Family dialog (family_head billing mode — one invoice for the whole
  // family, recalculated from the plan's price-per-member × current headcount)
  const [familyRenewalHead, setFamilyRenewalHead] = useState<Member | null>(null);
  const [familyRenewalCount, setFamilyRenewalCount] = useState<number | null>(null);
  const [familyRenewalPaymentStatus, setFamilyRenewalPaymentStatus] = useState<'paid' | 'pending'>('paid');
  const [familyRenewalPaymentMethod, setFamilyRenewalPaymentMethod] = useState('cash');
  const [isRenewingFamily, setIsRenewingFamily] = useState(false);

  const openFamilyRenewalDialog = async (head: Member) => {
    setFamilyRenewalHead(head);
    setFamilyRenewalCount(null);
    setFamilyRenewalPaymentStatus('paid');
    setFamilyRenewalPaymentMethod('cash');
    try {
      // Numeric database id, not the display "MBR-..." member_id — see the note
      // on the analogous fix in handleProcessRenewalUpgrade.
      const group = await membersService.getFamilyGroup(head.id);
      setFamilyRenewalCount(1 + group.members.length);
    } catch (e) {
      console.error('Failed to load family group', e);
    }
  };

  const handleRenewFamily = async () => {
    if (!familyRenewalHead) return;
    setIsRenewingFamily(true);
    try {
      await membersService.renewFamily(familyRenewalHead.id, {
        payment_status: familyRenewalPaymentStatus,
        payment_method: familyRenewalPaymentMethod,
      });
      toast.success('Family renewed', {
        description: `${familyRenewalHead.name}'s family membership has been renewed.`,
      });
      setFamilyRenewalHead(null);
      loadMembers();
      loadStatusCounts();
    } catch (e: any) {
      toast.error('Failed to renew family', { description: e?.message || 'Please try again.' });
    } finally {
      setIsRenewingFamily(false);
    }
  };

  // Renewals & Upgrades states
  const [renewalSearchTerm, setRenewalSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMemberForRenewal, setSelectedMemberForRenewal] = useState<any>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<any>(null);
  const [operationType, setOperationType] = useState<"renewal" | "upgrade" | "downgrade" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [splitPayment, setSplitPayment] = useState(false);
  // Rich per-method detail (card type, online payment type, ...) for whichever
  // single top-level method is selected — reuses the same shape/helpers as the
  // Split/Mixed legs below so validation and payload-building stay consistent.
  const [renewalMethodDetails, setRenewalMethodDetails] = useState<SplitPaymentDetails>(EMPTY_SPLIT_DETAILS);
  const [splitLegs, setSplitLegs] = useState<SplitPaymentValue>(EMPTY_SPLIT_PAYMENT);
  const [splitLegDetails, setSplitLegDetails] = useState<SplitPaymentDetails>(EMPTY_SPLIT_DETAILS);
  const [renewalBankAccounts, setRenewalBankAccounts] = useState<AccountHead[]>([]);
  // "Credit" — renews the membership now but defers some/all of the fee as an
  // outstanding due, mirroring the Add Member credit flow: an optional amount
  // received now (via a real method), with the remainder left as Member.outstandingBalance.
  const [creditAmountReceived, setCreditAmountReceived] = useState("");
  const [creditReceivedVia, setCreditReceivedVia] = useState("cash");
  const [creditMethodDetails, setCreditMethodDetails] = useState<SplitPaymentDetails>(EMPTY_SPLIT_DETAILS);
  const [discountAmount, setDiscountAmount] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [planComparisonOpen, setPlanComparisonOpen] = useState(false);

  // Pending approvals states
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [selectedDraftForApproval, setSelectedDraftForApproval] = useState<any | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Status counts fetched independently (unfiltered) so KPI cards are always accurate
  const [statusCounts, setStatusCounts] = useState<{
    total: number; active: number; inactive: number;
    expired: number; frozen: number; suspended: number;
  }>({ total: 0, active: 0, inactive: 0, expired: 0, frozen: 0, suspended: 0 });

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const authState = {
        isAuthenticated: authService.isAuthenticated(),
        currentUser: authService.getCurrentUser(),
        hasAccessToken: !!authService.getAccessToken(),
        isDemoMode: authService.isDemoMode()
      };

      if (!authState.isAuthenticated) {
        throw new Error('User not authenticated');
      }

      const filters = {
        search: searchTerm || undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined
      };

      const pagination = {
        page: currentPage,
        limit: 20
      };

      if (authState.isDemoMode) {
        const demoResponse = await membersService.getDemoMembersData(filters, pagination);
        setMembers(demoResponse.members);
        setTotalPages(demoResponse.pagination.totalPages);
        setTotalMembers(demoResponse.pagination.total);
        return;
      }

      const response = await membersService.getMembers(filters, pagination);
      setMembers(response.members);
      setTotalPages(response.pagination.totalPages);
      setTotalMembers(response.pagination.total);
    } catch (err) {
      console.error('Failed to load members:', err);
      if (err instanceof Error && (err.message.includes('401') || err.message.includes('not authenticated'))) {
        setError('Authentication required. Please sign in again.');
        toast.error('Authentication Error', {
          description: 'Please sign in again to continue.'
        });
      } else {
        setError('Failed to load members. Please try again.');
        toast.error('Error', {
          description: 'Failed to load members data'
        });
      }
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  // Fetch ALL members (no status/search filter, high limit) to compute accurate
  // KPI status counts independent of the current page/filter.
  const loadStatusCounts = async () => {
    try {
      const isDemoMode = authService.isDemoMode();
      const fetcher = isDemoMode
        ? membersService.getDemoMembersData({}, { limit: 10000 })
        : membersService.getMembers({}, { limit: 10000 });
      const res = await fetcher;
      const all = res.members;
      setStatusCounts({
        total: all.length,
        active: all.filter((m: Member) => m.membership_status === 'active').length,
        inactive: all.filter((m: Member) => m.membership_status === 'inactive').length,
        expired: all.filter((m: Member) => m.membership_status === 'expired').length,
        frozen: all.filter((m: Member) => (m.membership_status || '').toLowerCase() === 'frozen').length,
        suspended: all.filter((m: Member) => m.membership_status === 'suspended').length,
      });
    } catch (e) {
      console.error('Failed to load status counts:', e);
    }
  };

  // Load status counts on mount
  useEffect(() => {
    loadStatusCounts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMembers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedStatus, currentPage]);

  // Load active plans for Renewals tab
  useEffect(() => {
    plansService.getPlans('Active').then(setApiPlans).catch(() => { });
  }, []);

  // Load active add-ons so the directory table can show "+ addon" under Plan Type
  useEffect(() => {
    addonsService.getAddons({ status: 'Active' }, { limit: 500 })
      .then(res => {
        const map: Record<string, string[]> = {};
        res.addons.forEach(addon => {
          const key = String(addon.member_db_id);
          if (!map[key]) map[key] = [];
          map[key].push(addon.addon_name);
        });
        setMemberActiveAddons(map);
      })
      .catch(() => { });
  }, []);

  // Bank accounts for the Renewals & Upgrades payment panel's Bank Transfer leg
  useEffect(() => {
    accountHeadsService.getBankAccounts().then(setRenewalBankAccounts).catch(() => { });
  }, []);

  // Load pending members from sessionStorage
  useEffect(() => {
    const loadPendingMembers = () => {
      const stored = sessionStorage.getItem('pendingMembers');
      if (stored) {
        try {
          setPendingMembers(JSON.parse(stored));
        } catch (error) {
          console.error('Error loading pending members:', error);
        }
      }
    };

    loadPendingMembers();

    // Listen for updates
    window.addEventListener('pendingMembersUpdated', loadPendingMembers);
    return () => window.removeEventListener('pendingMembersUpdated', loadPendingMembers);
  }, []);


  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case "active": return "bg-green-100 text-green-800";
      case "inactive": return "bg-gray-100 text-gray-800";
      case "suspended": return "bg-orange-100 text-orange-800";
      case "expired": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // KPI counts come from the dedicated unfiltered fetch, not the current page
  const totalMembersCount = statusCounts.total;
  const activeMembers = statusCounts.active;
  const inactiveMembers = statusCounts.inactive;
  const expiredMembers = statusCounts.expired;
  const frozenMembers = statusCounts.frozen;
  const suspendedMembers = statusCounts.suspended;

  const autoUnfreezePending = members.filter(m => {
    const status = (m.membership_status || "").toLowerCase();
    return status === "frozen" && m.freeze_end_date != null;
  }).length;

  const totalFreezeDays = members.reduce((total, m) => {
    const status = (m.membership_status || "").toLowerCase();
    if (status === "frozen" && m.freeze_start_date) {
      const start = new Date(m.freeze_start_date);
      const end = m.freeze_end_date ? new Date(m.freeze_end_date) : new Date();
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return total + diffDays;
    }
    return total;
  }, 0);
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800";
      case "Frozen": return "bg-blue-100 text-blue-800";
      case "Expired": return "bg-red-100 text-red-800";
      case "Pending": return "bg-yellow-100 text-yellow-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const handleAddMember = () => {
    navigate('/members/add');
  };

  // Handle generate report
  const handleGenerateReport = async () => {
    setReportLoading(true);
    try {
      const filters: { transactionType?: string; status?: string } = {};
      if (transactionType !== "all") {
        const typeMap: Record<string, string> = {
          "New": "Membership",
          "Renewal": "Renewal",
          "Add-on": "Add-on",
          "Single Day": "Daily Entry",
        };
        filters.transactionType = typeMap[transactionType] || transactionType;
      }

      const res = await receiptsService.getReceipts(filters, { limit: 500 });
      let receipts = res.receipts;

      // Apply date range filter
      const today = new Date();
      if (dateRange === "last-7-days") {
        const cutoff = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        receipts = receipts.filter(r => r.transaction_date && new Date(r.transaction_date) >= cutoff);
      } else if (dateRange === "last-30-days") {
        const cutoff = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        receipts = receipts.filter(r => r.transaction_date && new Date(r.transaction_date) >= cutoff);
      } else if (dateRange === "last-90-days") {
        const cutoff = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        receipts = receipts.filter(r => r.transaction_date && new Date(r.transaction_date) >= cutoff);
      } else if (dateRange === "custom" && customDateFrom && customDateTo) {
        receipts = receipts.filter(r => {
          if (!r.transaction_date) return false;
          const d = new Date(r.transaction_date);
          return d >= customDateFrom && d <= customDateTo;
        });
      }

      // Apply payment mode filter
      if (payMode !== "all") {
        receipts = receipts.filter(r => r.payment_method?.toLowerCase() === payMode.toLowerCase());
      }

      // Map to the report row shape expected by the existing table JSX
      const data = receipts.map((r, i) => ({
        id: i + 1,
        docDate: r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('en-GB') : '—',
        docNo: r.receipt_no || '—',
        memberId: r.member_id || '—',
        memberName: r.member_name || '—',
        photo: null,
        mobile: r.member_phone || '—',
        membershipType: r.membership_type || '—',
        transactionType: r.transaction_type || '—',
        plan: r.plan_name || '—',
        amount: Number(r.amount || 0),
        mode: r.payment_method || '—',
        // Actual money collected via that method for this specific transaction —
        // NOT the bill's full invoice amount, which may still be partially unpaid.
        cash: r.payment_method?.toLowerCase() === 'cash' ? Number(r.paid_amount ?? r.amount ?? 0) : 0,
        card: r.payment_method?.toLowerCase() === 'card' ? Number(r.paid_amount ?? r.amount ?? 0) : 0,
        due: Math.max(0, Number(r.due_amount ?? (Number(r.amount || 0) - Number(r.paid_amount || 0)))),
        dueDate: Number(r.due_amount ?? (Number(r.amount || 0) - Number(r.paid_amount || 0))) > 0 && r.transaction_date ? new Date(r.transaction_date).toLocaleDateString('en-GB') : '—',
      }));

      setReportData(data);
      setReportGenerated(true);
      setReportPage(1);

      toast.success('Report Generated', {
        description: `Found ${data.length} transactions matching your criteria.`,
      });
    } catch {
      toast.error('Failed to generate report. Please try again.');
    } finally {
      setReportLoading(false);
    }
  };

  // Calculate report summary
  const reportSummary = reportData.reduce((acc, item) => {
    acc.totalRecords += 1;
    acc.totalAmount += item.amount;
    acc.totalCash += item.cash;
    acc.totalCard += item.card;
    acc.totalDue += item.due;
    return acc;
  }, {
    totalRecords: 0,
    totalAmount: 0,
    totalCash: 0,
    totalCard: 0,
    totalDue: 0,
  });

  // Pagination for report
  const reportStartIndex = (reportPage - 1) * reportPageSize;
  const reportEndIndex = reportStartIndex + reportPageSize;
  const paginatedReportData = reportData.slice(reportStartIndex, reportEndIndex);
  const reportTotalPages = Math.ceil(reportData.length / reportPageSize);

  // Handle export
  const handleExport = (format: string) => {
    toast.success(`Exporting as ${format.toUpperCase()}`, {
      description: 'Your report will be downloaded shortly.',
    });
  };

  // Handle schedule save
  const handleScheduleSave = () => {
    if (!scheduleName || !scheduleRecipients) {
      toast.error('Missing Information', {
        description: 'Please fill in all required fields.',
      });
      return;
    }

    toast.success('Schedule Created', {
      description: `Report will be sent ${scheduleFrequency} to ${scheduleRecipients.split(',').length} recipient(s).`,
    });

    setScheduleModalOpen(false);
    setScheduleName("");
    setScheduleRecipients("");
  };

  const getTransactionTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      'New': 'bg-green-100 text-green-800',
      'Renewal': 'bg-blue-100 text-blue-800',
      'Add-on': 'bg-purple-100 text-purple-800',
      'Single Day': 'bg-orange-100 text-orange-800',
    };
    return badges[type] || 'bg-gray-100 text-gray-800';
  };

  const getPayModeBadge = (mode: string) => {
    const badges: Record<string, string> = {
      'Cash': 'bg-emerald-100 text-emerald-800',
      'Card': 'bg-sky-100 text-sky-800',
      'Credit': 'bg-amber-100 text-amber-800',
    };
    return badges[mode] || 'bg-gray-100 text-gray-800';
  };

  // Helper functions to safely access member properties
  const getMemberId = (member: Member) => member.member_id || member.id;
  const getMembershipPlan = (member: Member) => member.membership_plan || member.membership_type;
  const getMembershipStartDate = (member: Member) => member.membership_start_date || member.join_date;
  const getMembershipEndDate = (member: Member) => member.membership_end_date || member.expiry_date || '';
  const getMembershipFee = (member: Member) => member.membership_fee || member.monthly_fee;

  // Mirrors MemberService.memberPriceForIndex() on the backend.
  const memberPriceForIndex = (plan: Plan, index: number): number => {
    const base = Number(plan.pricePerMember) || 0;
    const max = plan.maxFamilyMembers != null && Number(plan.maxFamilyMembers) > 0
      ? Number(plan.maxFamilyMembers) : null;
    if (max === null || index < max) return base;
    const extra = plan.additionalMemberPrice != null ? Number(plan.additionalMemberPrice) : base;
    return extra;
  };

  // A family/couple head under "family_head" billing carries the COMBINED
  // invoice total for every member billed to them as their own membership_fee
  // (see MemberService.createMember) — for display, show just the head's own
  // share instead, so it reads consistently with what each dependent's row
  // already shows (their own share, not the family total).
  const getDisplayFee = (member: Member): number => {
    const fee = getMembershipFee(member) || 0;
    if (!(member as any).is_family_head) return fee;
    const plan = apiPlans.find(p => p.name === member.membership_plan);
    if (!plan || plan.familyBillingMode !== 'family_head') return fee;
    const autoCalc = plan.autoCalculateTotal !== false && plan.pricePerMember != null;
    if (!autoCalc) return fee; // flat combined price — no per-member figure to show
    return memberPriceForIndex(plan, 0);
  };

  // "Renew Family" (renewFamily/{headId}/renew-family) only works for a head
  // whose plan uses family_head billing — for the far more common "individual"
  // mode, adults renew independently via the regular Renew flow and minors via
  // Renew Family Member, so the whole-family renewal endpoint would just fail.
  const isFamilyHeadBillingHead = (member: Member): boolean => {
    if (!(member as any).is_family_head) return false;
    const plan = apiPlans.find(p => p.name === member.membership_plan);
    return plan?.familyBillingMode === 'family_head';
  };
  const getTotalVisits = (member: Member) => member.total_visits || 0;
  const avatarPool = ["/avatars/sarah.jpg", "/avatars/mike.jpg", "/avatars/emily.jpg"];
  const getMemberAvatar = (member: any) => {
    const explicit =
      member?.avatar ||
      member?.photo ||
      member?.photo_url ||
      member?.profile_photo ||
      member?.image;
    if (explicit) return explicit;
    const seed = String(getMemberId(member) || member?.name || "");
    const hash = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    return avatarPool[hash % avatarPool.length];
  };

  // Helper function to get membership category (Individual, Family, Corporate)
  const getMembershipCategory = (member: Member): string => {
    return member.membership_type || 'Individual';
  };

  // Helper function to get plan type
  const getPlanDetails = (member: Member) => {
    const plan = getMembershipPlan(member);
    const addons = memberActiveAddons[String(member.id)] || [];
    return { plan, addons };
  };

  // Helper function to get amount due. Minors are billed to their family head and
  // never carry their own balance — callers should check isBilledToGuardian first
  // and show "Billed to: {head}" instead of calling this.
  const getAmountDue = (member: Member): number => {
    if (member.outstanding_balance != null) {
      return member.outstanding_balance;
    }
    if (member.payment_status === 'overdue') {
      return getMembershipFee(member) * 0.5; // 50% of monthly fee as example
    }
    if (member.payment_status === 'pending') {
      return getMembershipFee(member);
    }
    return 0;
  };

  // Members billed to their family head don't carry their own balance — every
  // minor, plus any adult dependent under a family_head-billing-mode Family plan.
  const isBilledToGuardian = (member: Member): boolean =>
    Boolean((member as any).is_minor || (member as any).billed_to_head);

  // Helper function to get payment due date
  const getPaymentDueDate = (member: Member): string => {
    if (member.next_payment_date) {
      try {
        return new Date(member.next_payment_date).toLocaleDateString('en-GB');
      } catch (e) {
        console.error('Invalid date:', member.next_payment_date);
      }
    }
    if (member.payment_status === 'overdue' || member.payment_status === 'pending') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 days from now
      return dueDate.toLocaleDateString('en-GB');
    }
    return '';
  };

  // Function to open member history/analytics. member.id is the internal
  // numeric database id (not the human-readable "MBR-..." member_id) — same
  // convention dashboard.tsx already uses via router state, which the page
  // now reads from its `memberId` prop instead of a sessionStorage handoff.
  const openMemberHistory = (member: Member) => {
    onNavigate?.('member-history-analytics', { memberId: member.id });
  };

  // Pending approval handlers
  const handleApproveClick = (draft: any) => {
    setSelectedDraftForApproval(draft);
    setShowApprovalModal(true);
  };

  const handleApproveMember = (approvalData: any) => {
    // Remove from pending list
    const updated = pendingMembers.filter(m => m.memberId !== approvalData.memberId);
    setPendingMembers(updated);
    sessionStorage.setItem('pendingMembers', JSON.stringify(updated));

    // Save to active members (simulated)
    const existingMembers = JSON.parse(sessionStorage.getItem('activeMembers') || '[]');
    existingMembers.push(approvalData);
    sessionStorage.setItem('activeMembers', JSON.stringify(existingMembers));

    // Notify other components
    window.dispatchEvent(new Event('pendingMembersUpdated'));

    // Refresh members list
    loadMembers();
    loadStatusCounts();
  };

  const handleRejectDraft = (draftId: string) => {
    const updated = pendingMembers.filter(m => m.memberId !== draftId);
    setPendingMembers(updated);
    sessionStorage.setItem('pendingMembers', JSON.stringify(updated));

    // Notify other components
    window.dispatchEvent(new Event('pendingMembersUpdated'));
  };

  // Combine regular members with pending members for display
  const combinedMembers = React.useMemo(() => {
    const pending = pendingMembers.map(pm => ({
      id: pm.memberId,
      name: pm.fullName,
      email: pm.email,
      phone: pm.mobile,
      member_id: pm.memberId,
      membership_plan: pm.planName,
      membership_type: pm.planName,
      membership_status: 'pending_approval' as const,
      membership_start_date: '',
      membership_end_date: '',
      membership_fee: pm.planPrice,
      payment_status: 'pending' as const,
      join_date: pm.requestedDate,
      total_visits: 0,
      isPending: true,
      draftData: pm
    }));

    return [...pending, ...members];
  }, [pendingMembers, members]);

  // Renewals & Upgrades helper functions
  const handleRenewalSearch = (value: string) => {
    setRenewalSearchTerm(value);

    if (value.trim().length > 0) {
      membersService.searchMembers(value)
        .then(results => {
          setSearchSuggestions(results.slice(0, 5));
          setShowSuggestions(results.length > 0);
        })
        .catch(() => setSearchSuggestions([]));
    } else {
      setSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectMemberForRenewal = (member: any) => {
    setSelectedMemberForRenewal(member);
    setRenewalSearchTerm(member.name);
    setShowSuggestions(false);
    setSelectedNewPlan(null);
    setOperationType(null);
  };

  const handlePlanSelection = (plan: any) => {
    setSelectedNewPlan(plan);

    if (selectedMemberForRenewal) {
      const currentPlanName = selectedMemberForRenewal.membership_plan;
      if (plan.name === currentPlanName) {
        setOperationType("renewal");
      } else {
        const currentPlan = apiPlans.find(p => p.name === currentPlanName);
        const currentPrice = currentPlan?.price ?? getDisplayFee(selectedMemberForRenewal);
        setOperationType(plan.price < currentPrice ? "downgrade" : "upgrade");
      }
    }
  };

  const calculateTotalAmount = () => {
    if (!selectedNewPlan) return 0;

    let total = selectedNewPlan.price;

    if (discountAmount) {
      total -= parseFloat(discountAmount);
    }

    return Math.round(Math.max(0, total) * 100) / 100;
  };

  const handleProcessRenewalUpgrade = async () => {
    if (!selectedMemberForRenewal || !selectedNewPlan) {
      toast.error('Missing Information', {
        description: 'Please select a member and a plan.',
      });
      return;
    }

    const totalAmount = calculateTotalAmount();
    const isCredit = paymentMethod === 'credit' && !splitPayment;

    // Validate payment
    if (splitPayment) {
      if (!isSplitPaymentValid(splitLegs, totalAmount)) {
        toast.error('Split Payment Error', {
          description: `Split amounts must add up to the total amount (${totalAmount}).`,
        });
        return;
      }
      if (!isSplitPaymentDetailsValid(splitLegs, splitLegDetails)) {
        toast.error('Missing Payment Details', {
          description: 'Please fill in the required details for each method used in the split.',
        });
        return;
      }
    } else if (isCredit) {
      const received = parseFloat(creditAmountReceived) || 0;
      if (received > totalAmount) {
        toast.error('Invalid Amount', {
          description: 'Amount received now cannot exceed the total amount.',
        });
        return;
      }
      if (received > 0) {
        const probe: SplitPaymentValue = { ...EMPTY_SPLIT_PAYMENT, [creditReceivedVia as keyof SplitPaymentValue]: received };
        if (!isSplitPaymentDetailsValid(probe, creditMethodDetails)) {
          toast.error('Missing Payment Details', {
            description: `Please fill in the required details for ${creditReceivedVia}.`,
          });
          return;
        }
      }
    } else {
      const legKey = RENEWAL_METHOD_TO_LEG_KEY[paymentMethod];
      if (legKey && legKey !== 'cash') {
        const probe: SplitPaymentValue = { ...EMPTY_SPLIT_PAYMENT, [legKey]: totalAmount };
        if (!isSplitPaymentDetailsValid(probe, renewalMethodDetails)) {
          toast.error('Missing Payment Details', {
            description: `Please fill in the required ${paymentMethod} details.`,
          });
          return;
        }
      }
    }

    // Compute new end date from plan duration
    const computeEndDate = (durationValue: string, durationType: string): string => {
      const start = new Date();
      const val = parseInt(durationValue);
      if (isNaN(val)) return '';
      switch ((durationType || '').toLowerCase()) {
        case 'days': start.setDate(start.getDate() + val); break;
        case 'weeks': start.setDate(start.getDate() + val * 7); break;
        case 'months': start.setMonth(start.getMonth() + val); break;
        case 'years': start.setFullYear(start.getFullYear() + val); break;
      }
      return start.toISOString().split('T')[0] + 'T00:00:00Z';
    };

    const newEndDate = computeEndDate(
      selectedNewPlan.durationValue || '',
      selectedNewPlan.durationType || ''
    );

    // How much is actually being collected now, the real method(s) it moved
    // through, and the per-leg detail (card type, online payment type, ...).
    // "Credit" itself is never sent as a real payment method — it's only the
    // absence of one; any amount received now always carries its real method.
    let amountReceived = totalAmount;
    let effectivePaymentMethod = paymentMethod === 'card' ? 'Card' : paymentMethod === 'online' ? 'Online Payment' : 'Cash';
    let paymentBreakdown: any[] | undefined;
    let bankAccountCode: string | undefined;
    let bankAccountName: string | undefined;

    if (splitPayment) {
      effectivePaymentMethod = 'Mixed';
      paymentBreakdown = buildSplitPaymentBreakdown(splitLegs, splitLegDetails, renewalBankAccounts);
    } else if (isCredit) {
      amountReceived = parseFloat(creditAmountReceived) || 0;
      if (amountReceived > 0) {
        const probe: SplitPaymentValue = { ...EMPTY_SPLIT_PAYMENT, [creditReceivedVia as keyof SplitPaymentValue]: amountReceived };
        const legs = buildSplitPaymentBreakdown(probe, creditMethodDetails, renewalBankAccounts);
        paymentBreakdown = legs;
        effectivePaymentMethod = legs[0]?.method || 'Cash';
        if (creditReceivedVia === 'bankTransfer') {
          const account = renewalBankAccounts.find(a => String(a.id) === creditMethodDetails.bankTransferAccountId);
          bankAccountCode = account?.code;
          bankAccountName = account?.name;
        }
      } else {
        effectivePaymentMethod = 'Credit';
      }
    } else {
      const legKey = RENEWAL_METHOD_TO_LEG_KEY[paymentMethod];
      if (legKey && legKey !== 'cash') {
        const probe: SplitPaymentValue = { ...EMPTY_SPLIT_PAYMENT, [legKey]: totalAmount };
        paymentBreakdown = buildSplitPaymentBreakdown(probe, renewalMethodDetails, renewalBankAccounts);
      }
    }

    // Call backend — a member billed to their family head (minor, or an adult
    // under family_head billing mode) doesn't carry their own renewal/receipt,
    // so route through the dedicated endpoint.
    try {
      // The backend's /renew endpoints take the internal numeric database id
      // (Long), not the human-readable "MBR-..." member_id — getMemberId()
      // prefers the latter for display purposes, so it can't be used here.
      const memberId = selectedMemberForRenewal.id;
      if (isBilledToGuardian(selectedMemberForRenewal)) {
        // Same payment inputs collected above for the regular renewal path
        // (amountReceived/effectivePaymentMethod/paymentBreakdown) apply here
        // too — whatever wasn't collected now folds onto the guardian's due.
        await membersService.renewFamilyMinor(String(memberId), {
          plan_name: selectedNewPlan.name,
          fee: totalAmount,
          payment_status: amountReceived >= totalAmount ? 'paid' : (amountReceived > 0 ? 'partial' : 'pending'),
          paid_amount: amountReceived,
          payment_method: amountReceived > 0 ? effectivePaymentMethod : undefined,
          payment_breakdown: paymentBreakdown,
          bank_account_code: bankAccountCode,
          bank_account_name: bankAccountName,
        });
      } else {
        await membersService.renewMember(String(memberId), {
          plan_name: selectedNewPlan.name,
          membership_end_date: newEndDate,
          membership_fee: totalAmount,
          payment_status: amountReceived >= totalAmount ? 'paid' : (amountReceived > 0 ? 'partial' : 'pending'),
          membership_type: selectedNewPlan.planType,
          membership_status: 'active',
          amount_received: amountReceived,
          payment_method: effectivePaymentMethod,
          payment_breakdown: paymentBreakdown,
          bank_account_code: bankAccountCode,
          bank_account_name: bankAccountName,
        });
      }
      // Refresh member list
      loadMembers();
      loadStatusCounts();
    } catch (err) {
      toast.error('Failed to process renewal. Please try again.');
      return;
    }

    // Show success modal
    setShowSuccessModal(true);

    // Reset form after 3 seconds
    setTimeout(() => {
      setShowSuccessModal(false);
      setSelectedMemberForRenewal(null);
      setSelectedNewPlan(null);
      setOperationType(null);
      setRenewalSearchTerm("");
      setPaymentMethod("cash");
      setSplitPayment(false);
      setRenewalMethodDetails(EMPTY_SPLIT_DETAILS);
      setSplitLegs(EMPTY_SPLIT_PAYMENT);
      setSplitLegDetails(EMPTY_SPLIT_DETAILS);
      setCreditAmountReceived("");
      setCreditReceivedVia("cash");
      setCreditMethodDetails(EMPTY_SPLIT_DETAILS);
      setDiscountAmount("");
      setCouponCode("");
    }, 3000);
  };

  const getDaysLeft = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadgeForRenewal = (daysLeft: number) => {
    if (daysLeft < 0) return { text: 'Expired', class: 'bg-red-100 text-red-800' };
    if (daysLeft <= 7) return { text: 'Expiring Soon', class: 'bg-orange-100 text-orange-800' };
    return { text: 'Active', class: 'bg-green-100 text-green-800' };
  };

  if (initialLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Members</h1>
            <p className="text-muted-foreground">Comprehensive member management and operations.</p>
          </div>
          <Button onClick={handleAddMember}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading members...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Members</h1>
            <p className="text-muted-foreground">Comprehensive member management and operations.</p>
          </div>
          <Button onClick={handleAddMember}>
            <Plus className="mr-2 h-4 w-4" />
            Add Member
          </Button>
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadMembers}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Members</h1>
          <p className="text-muted-foreground">Comprehensive member management and operations.</p>
        </div>
        <Button onClick={handleAddMember}>
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <Card
          className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          style={selectedStatus === 'all' ? { boxShadow: '0 0 0 2px #6366f1' } : undefined}
          onClick={() => { setActiveTab('members'); setSelectedStatus('all'); }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Members</CardTitle>
            <div className="bg-gradient-light p-2 rounded-lg">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalMembersCount}</div>
            <p className="text-xs text-muted-foreground">Registered members</p>
          </CardContent>
        </Card>

        <Card
          className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          style={selectedStatus === 'active' ? { boxShadow: '0 0 0 2px #16a34a' } : undefined}
          onClick={() => { setActiveTab('members'); setSelectedStatus(selectedStatus === 'active' ? 'all' : 'active'); }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Active Members</CardTitle>
            <div className="bg-green-50 p-2 rounded-lg">
              <UserPlus className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{activeMembers}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card
          className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          style={selectedStatus === 'inactive' ? { boxShadow: '0 0 0 2px #2563eb' } : undefined}
          onClick={() => { setActiveTab('members'); setSelectedStatus(selectedStatus === 'inactive' ? 'all' : 'inactive'); }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Inactive</CardTitle>
            <div className="bg-blue-50 p-2 rounded-lg">
              <Pause className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{inactiveMembers}</div>
            <p className="text-xs text-muted-foreground">Inactive members</p>
          </CardContent>
        </Card>

        <Card
          className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          style={selectedStatus === 'expired' ? { boxShadow: '0 0 0 2px #dc2626' } : undefined}
          onClick={() => { setActiveTab('members'); setSelectedStatus(selectedStatus === 'expired' ? 'all' : 'expired'); }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Expired</CardTitle>
            <div className="bg-red-50 p-2 rounded-lg">
              <Calendar className="h-4 w-4 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiredMembers}</div>
            <p className="text-xs text-muted-foreground">Need renewal</p>
          </CardContent>
        </Card>

        <Card
          className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          style={selectedStatus === 'frozen' ? { boxShadow: '0 0 0 2px #0891b2' } : undefined}
          onClick={() => { setActiveTab('members'); setSelectedStatus(selectedStatus === 'frozen' ? 'all' : 'frozen'); }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Freezed</CardTitle>
            <div className="bg-cyan-50 p-2 rounded-lg">
              <Snowflake className="h-4 w-4 text-cyan-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{frozenMembers}</div>
            <p className="text-xs text-muted-foreground">Membership frozen</p>
          </CardContent>
        </Card>

        <Card
          className="border-primary/10 shadow-md hover:shadow-lg transition-shadow cursor-pointer"
          style={selectedStatus === 'suspended' ? { boxShadow: '0 0 0 2px #ea580c' } : undefined}
          onClick={() => { setActiveTab('members'); setSelectedStatus(selectedStatus === 'suspended' ? 'all' : 'suspended'); }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Suspended</CardTitle>
            <div className="bg-orange-50 p-2 rounded-lg">
              <ShieldBan className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{suspendedMembers}</div>
            <p className="text-xs text-muted-foreground">Suspended members</p>
          </CardContent>
        </Card>
      </div>

      <style>{`
        @keyframes tabSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        [role="tabpanel"][data-state="active"] {
          animation: tabSlideIn 0.22s ease-out;
        }
      `}</style>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full flex">
          <TabsTrigger value="members" className="flex-1">All Members</TabsTrigger>
          <TabsTrigger value="renewals" className="flex-1">Renewals & Upgrades</TabsTrigger>
          <TabsTrigger value="addons" className="flex-1">Add-ons</TabsTrigger>
          <TabsTrigger value="receipts" className="flex-1">Member Receipts</TabsTrigger>
          <TabsTrigger value="freeze" className="flex-1">Freeze/Unfreeze</TabsTrigger>
          <TabsTrigger value="reports" className="flex-1">Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <span>Member Directory</span>
                  {pendingMembers.length > 0 && (
                    <Badge className="bg-amber-500 text-white flex items-center space-x-1">
                      <Bell className="h-3 w-3" />
                      <span>{pendingMembers.length} Pending</span>
                    </Badge>
                  )}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    {loading && !initialLoading ? (
                      <Loader2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground animate-spin" />
                    ) : (
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    )}
                    <Input
                      placeholder="Search members..."
                      className="pl-10"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="frozen">Frozen</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </div>

              <style>{`
                .member-row:hover {
                  background-color: #f8fafc;
                }
              `}</style>
              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Membership Type</TableHead>
                    <TableHead>Family Head</TableHead>
                    <TableHead>Plan Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Payment Due Date</TableHead>
                    <TableHead>Visits</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {combinedMembers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={12} className="text-center py-8">
                        <p className="text-muted-foreground">No members found.</p>
                        <Button className="mt-4" onClick={handleAddMember}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add First Member
                        </Button>
                      </TableCell>
                    </TableRow>
                  ) : (
                    combinedMembers.map((member) => {
                      const planDetails = getPlanDetails(member);
                      const amountDue = getAmountDue(member);
                      const paymentDueDate = getPaymentDueDate(member);
                      const membershipCategory = getMembershipCategory(member);

                      return (
                        <TableRow
                          key={member.id}
                          className="member-row transition-colors cursor-pointer"
                          onClick={() => openMemberHistory(member)}
                        >
                          <TableCell className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPhotoViewer({ src: getMemberAvatar(member), name: member.name });
                                setIsPhotoViewerOpen(true);
                              }}
                              className="rounded-full focus:outline-none focus:ring-2 focus:ring-primary/40"
                              title="View photo"
                            >
                              <Avatar>
                                <AvatarImage src={getMemberAvatar(member)} alt={member.name} />
                                <AvatarFallback>
                                  {member.name.split(' ').map(n => n[0]).join('')}
                                </AvatarFallback>
                              </Avatar>
                            </button>
                            <div>
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {getMemberId(member)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {member.email?.includes('@family.local') ? (
                              <>
                                <div className="text-sm">{member.phone || '—'}</div>
                                <div className="text-xs text-muted-foreground italic">Family member</div>
                              </>
                            ) : (
                              <>
                                <div className="text-sm">{member.email}</div>
                                <div className="text-sm text-muted-foreground">{member.phone}</div>
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{getMembershipPlan(member)}</div>
                            <div className="text-sm text-muted-foreground">
                              <CurrencyGlyph /> {getDisplayFee(member)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize text-sm font-medium text-slate-700">
                              {membershipCategory}
                            </span>
                          </TableCell>
                          <TableCell>
                            {member.membership_type?.toLowerCase() === 'family' || member.membership_type?.toLowerCase() === 'couple' ? (
                              member.is_family_head ? (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Head</span>
                              ) : (
                                <div className="text-xs">
                                  <div className="font-medium text-slate-700">
                                    {(member as any).family_head_name || member.family_head_id || '—'}
                                  </div>
                                  {member.relationship_to_head && (
                                    <div className="text-slate-500">({member.relationship_to_head})</div>
                                  )}
                                </div>
                              )
                            ) : (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-700">
                                {planDetails.plan}
                              </span>
                              {planDetails.addons.length > 0 && (
                                <span className="text-xs text-slate-500">
                                  + {planDetails.addons.join(', ')}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${member.membership_status === 'pending_approval'
                                ? 'bg-amber-100 text-amber-700'
                                : member.membership_status === 'active'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : member.membership_status === 'inactive'
                                    ? 'bg-slate-100 text-slate-600'
                                    : member.membership_status === 'suspended'
                                      ? 'bg-amber-100 text-amber-700'
                                      : 'bg-rose-100 text-rose-700'
                                }`}
                            >
                              {member.membership_status === 'pending_approval' ? 'Pending Approval' : member.membership_status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {getMembershipEndDate(member) ?
                              new Date(getMembershipEndDate(member)).toLocaleDateString('en-GB') : '—'}
                          </TableCell>
                          <TableCell>
                            {isBilledToGuardian(member) ? (
                              <span className="text-xs text-slate-500 italic">
                                Billed to: {(member as any).family_head_name || member.family_head_id || 'guardian'}
                              </span>
                            ) : (
                              <span
                                className={`font-medium ${amountDue > 0 ? 'text-red-600' : 'text-emerald-600'
                                  }`}
                              >
                                {amountDue > 0 ? `${currencyCode} ${amountDue.toFixed(2)}` : `${currencyCode} 0.00`}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {paymentDueDate ? paymentDueDate : '—'}
                          </TableCell>
                          <TableCell>
                            <span className="text-slate-600 font-medium">{getTotalVisits(member)}</span>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            {member.membership_status === 'pending_approval' && (member as any).isPending ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreVertical className="h-4 w-4 text-slate-500" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="left" align="start" className="w-48">
                                  <DropdownMenuItem
                                    className="text-[#2B7A78] cursor-pointer"
                                    onClick={() => handleApproveClick((member as any).draftData)}
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    Approve to On-board
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="cursor-pointer"
                                    onClick={() => handleApproveClick((member as any).draftData)}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 cursor-pointer"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to reject this draft request?')) {
                                        handleRejectDraft((member as any).draftData.memberId);
                                        toast.error('Draft request rejected');
                                      }
                                    }}
                                  >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Reject / Delete Draft
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="View Profile"
                                  onClick={() => openMemberHistory(member)}
                                >
                                  <Eye className="h-4 w-4 text-slate-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Send Message"
                                >
                                  <Mail className="h-4 w-4 text-slate-500" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  title="Edit Member"
                                  onClick={() => navigate(`/members/edit/${getMemberId(member)}`)}
                                >
                                  <Pencil className="h-4 w-4 text-slate-500" />
                                </Button>
                                {isFamilyHeadBillingHead(member) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    title="Renew Family"
                                    onClick={() => openFamilyRenewalDialog(member)}
                                  >
                                    <FaArrowsRotate className="h-4 w-4 text-slate-500" />
                                  </Button>
                                )}
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              <Dialog open={isPhotoViewerOpen} onOpenChange={setIsPhotoViewerOpen}>
                <DialogContent className="w-[300px] sm:max-w-[300px] p-5">
                  <DialogHeader>
                    <DialogTitle>Member Photo</DialogTitle>
                    <DialogDescription>{photoViewer?.name}</DialogDescription>
                  </DialogHeader>
                  <div className="flex items-center justify-center py-2">
                    {photoViewer && (
                      <img
                        src={photoViewer.src}
                        alt={photoViewer.name}
                        className="h-48 w-48 rounded-lg object-cover shadow-md"
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>

              {/* Renew Family Dialog — family_head billing mode: one invoice for
                  the whole family, recalculated from price-per-member × headcount */}
              <Dialog open={!!familyRenewalHead} onOpenChange={(open) => { if (!open) setFamilyRenewalHead(null); }}>
                <DialogContent className="sm:max-w-[420px]">
                  <DialogHeader>
                    <DialogTitle>Renew Family</DialogTitle>
                    <DialogDescription>
                      {familyRenewalHead?.name}'s family membership — one combined invoice for every member.
                    </DialogDescription>
                  </DialogHeader>
                  {familyRenewalHead && (
                    <div className="space-y-4 mt-2">
                      <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                        <span className="text-muted-foreground">Family members: </span>
                        <span className="font-semibold">
                          {familyRenewalCount !== null ? familyRenewalCount : '…'}
                        </span>
                        <div className="text-xs text-muted-foreground mt-1">
                          The renewal amount is calculated automatically from the plan's price per member.
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Payment Status</Label>
                        <Select value={familyRenewalPaymentStatus} onValueChange={(v: any) => setFamilyRenewalPaymentStatus(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid Now</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {familyRenewalPaymentStatus === 'paid' && (
                        <div className="space-y-2">
                          <Label>Payment Method</Label>
                          <Select value={familyRenewalPaymentMethod} onValueChange={setFamilyRenewalPaymentMethod}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                              <SelectItem value="online">Online Payment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setFamilyRenewalHead(null)}>Cancel</Button>
                        <Button onClick={handleRenewFamily} disabled={isRenewingFamily}>
                          {isRenewingFamily ? 'Renewing…' : 'Confirm Renewal'}
                        </Button>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Member Profile Dialog */}
              <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
                <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center space-x-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={profileMember ? getMemberAvatar(profileMember) : ''} />
                        <AvatarFallback>{profileMember?.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div>{profileMember?.name}</div>
                        <div className="text-sm font-normal text-muted-foreground">{profileMember ? getMemberId(profileMember) : ''}</div>
                      </div>
                    </DialogTitle>
                  </DialogHeader>
                  {profileMember && (
                    <div className="space-y-4 mt-2">
                      {/* Basic Info */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Email</Label>
                          <p className="text-sm font-medium">{profileMember.email || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Phone</Label>
                          <p className="text-sm font-medium">{profileMember.phone || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Membership Plan</Label>
                          <p className="text-sm font-medium">{getMembershipPlan(profileMember) || '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Status</Label>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(profileMember.membership_status)}`}>
                            {profileMember.membership_status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Start Date</Label>
                          <p className="text-sm">{getMembershipStartDate(profileMember) ? new Date(getMembershipStartDate(profileMember)).toLocaleDateString('en-GB') : '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                          <p className="text-sm">{getMembershipEndDate(profileMember) ? new Date(getMembershipEndDate(profileMember)).toLocaleDateString('en-GB') : '—'}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Membership Fee</Label>
                          <p className="text-sm font-medium"><CurrencyGlyph /> {getMembershipFee(profileMember)}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Payment Status</Label>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${profileMember.payment_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {profileMember.payment_status}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Total Visits</Label>
                          <p className="text-sm">{getTotalVisits(profileMember)}</p>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                          <p className="text-sm">{(profileMember as any).date_of_birth ? new Date((profileMember as any).date_of_birth).toLocaleDateString('en-GB') : '—'}</p>
                        </div>
                      </div>
                      {/* Emergency Contact */}
                      {(profileMember.emergency_contact || (profileMember as any).emergency_contact_name) && (
                        <div className="border-t pt-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Emergency Contact</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Name</Label>
                              <p className="text-sm">{(profileMember as any).emergency_contact_name || profileMember.emergency_contact || '—'}</p>
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Phone</Label>
                              <p className="text-sm">{(profileMember as any).emergency_contact_phone || profileMember.emergency_phone || '—'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Health Info */}
                      {((profileMember as any).blood_type || (profileMember as any).medical_conditions || (profileMember as any).allergies) && (
                        <div className="border-t pt-3">
                          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Health Information</p>
                          <div className="grid grid-cols-2 gap-3">
                            {(profileMember as any).blood_type && (
                              <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">Blood Type</Label>
                                <p className="text-sm">{(profileMember as any).blood_type}</p>
                              </div>
                            )}
                            {(profileMember as any).medical_conditions && (
                              <div className="space-y-1 col-span-2">
                                <Label className="text-xs text-muted-foreground">Medical Conditions</Label>
                                <p className="text-sm">{(profileMember as any).medical_conditions}</p>
                              </div>
                            )}
                            {(profileMember as any).allergies && (
                              <div className="space-y-1 col-span-2">
                                <Label className="text-xs text-muted-foreground">Allergies</Label>
                                <p className="text-sm">{(profileMember as any).allergies}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Rewards & Wallet */}
                      <div className="border-t pt-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Rewards & Wallet</p>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-muted-foreground">Wallet Balance</span>
                          <span className="text-sm font-semibold text-primary">
                            <CurrencyGlyph /> {(profileWallet?.balance ?? 0).toLocaleString()}
                          </span>
                        </div>
                        {profileRewardsLoading ? (
                          <p className="text-sm text-muted-foreground">Loading rewards…</p>
                        ) : profileRewards.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No rewards yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {(['AVAILABLE', 'CLAIMED', 'REDEEMED', 'EXPIRED'] as const).map((group) => {
                              const items = profileRewards.filter(r => r.status === group);
                              if (items.length === 0) return null;
                              return (
                                <div key={group}>
                                  <p className="text-[11px] font-medium text-muted-foreground mb-1">
                                    {group === 'AVAILABLE' ? 'Available' : group === 'CLAIMED' ? 'Claimed' : group === 'REDEEMED' ? 'Redeemed' : 'Expired'} ({items.length})
                                  </p>
                                  <div className="space-y-1">
                                    {items.map((r) => (
                                      <div key={r.id} className="flex items-center justify-between text-sm">
                                        <span>{r.rewardName}</span>
                                        <Badge
                                          className={
                                            r.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                              r.status === 'CLAIMED' ? 'bg-blue-100 text-blue-800' :
                                                r.status === 'REDEEMED' ? 'bg-gray-100 text-gray-700' :
                                                  'bg-red-100 text-red-700'
                                          }
                                        >
                                          {r.status}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-muted-foreground">
                    Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalMembers)} of {totalMembers} members
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="renewals" className="space-y-5">
          {/* Step 1: Search Member Section */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="border-b bg-slate-50/50 py-4">
              <div className="flex items-center space-x-3">
                <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-semibold shrink-0">
                  1
                </div>
                <div>
                  <CardTitle className="text-base">Search Member</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Search by Name, Mobile, Member ID, or Email</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    placeholder="Type member name, mobile, ID, or email..."
                    value={renewalSearchTerm}
                    onChange={(e) => handleRenewalSearch(e.target.value)}
                    onFocus={() => {
                      if (searchSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    className="pl-10 text-lg h-12"
                  />
                </div>

                {/* Live Suggestions Dropdown */}
                {showSuggestions && searchSuggestions.length > 0 && (
                  <Card className="absolute z-50 w-full mt-2 shadow-xl border-2">
                    <CardContent className="p-2">
                      {searchSuggestions.map((member) => {
                        const daysLeft = getDaysLeft(getMembershipEndDate(member));
                        const statusBadge = getStatusBadgeForRenewal(daysLeft);

                        return (
                          <div
                            key={member.id}
                            onClick={() => selectMemberForRenewal(member)}
                            className="p-3 hover:bg-gradient-light cursor-pointer rounded-lg transition-all"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Avatar>
                                  <AvatarFallback>
                                    {member.name.split(' ').map((n: string) => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{member.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {getMemberId(member)} • {member.phone}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {getMembershipPlan(member)} • Expires: {new Date(getMembershipEndDate(member)).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                              <Badge className={statusBadge.class}>
                                {statusBadge.text}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Selected Member Snapshot */}
              {selectedMemberForRenewal && (
                <Card className="mt-6 bg-gradient-light border-2 border-primary/20">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-16 w-16">
                          <AvatarFallback className="text-lg bg-gradient-primary text-white">
                            {selectedMemberForRenewal.name.split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-bold text-lg">{selectedMemberForRenewal.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Member ID: {getMemberId(selectedMemberForRenewal)}
                          </p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{selectedMemberForRenewal.phone}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedMemberForRenewal(null);
                          setSelectedNewPlan(null);
                          setOperationType(null);
                          setRenewalSearchTerm("");
                        }}
                      >
                        Clear
                      </Button>
                    </div>

                    {isBilledToGuardian(selectedMemberForRenewal) && (
                      <div className="mt-4 px-3 py-2 rounded-lg bg-blue-50 text-sm text-blue-800">
                        This renewal will be billed to {(selectedMemberForRenewal as any).family_head_name || 'the family head'}'s account — {selectedMemberForRenewal.name} will not get an independent balance.
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <Label className="text-xs text-muted-foreground">Active Plan</Label>
                        <p className="font-semibold mt-1">{getMembershipPlan(selectedMemberForRenewal)}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Start Date</Label>
                        <p className="font-semibold mt-1">
                          {new Date(getMembershipStartDate(selectedMemberForRenewal)).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Expiry Date</Label>
                        <p className="font-semibold mt-1">
                          {new Date(getMembershipEndDate(selectedMemberForRenewal)).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground">Days Left</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <p className="font-semibold">
                            {getDaysLeft(getMembershipEndDate(selectedMemberForRenewal))} days
                          </p>
                          <Badge className={getStatusBadgeForRenewal(getDaysLeft(getMembershipEndDate(selectedMemberForRenewal))).class}>
                            {getStatusBadgeForRenewal(getDaysLeft(getMembershipEndDate(selectedMemberForRenewal))).text}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>

          {/* Step 2: Choose New Plan */}
          {selectedMemberForRenewal && (
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="border-b bg-slate-50/50 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-semibold shrink-0">
                      2
                    </div>
                    <div>
                      <CardTitle className="text-base">Choose New Plan</CardTitle>
                      <CardDescription className="text-xs mt-0.5">Select a membership plan to renew or upgrade</CardDescription>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPlanComparisonOpen(true)}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Compare Plans
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {apiPlans.length === 0 && (
                    <p className="text-sm text-muted-foreground col-span-3 text-center py-4">No active plans found.</p>
                  )}
                  {apiPlans.map((plan) => {
                    const isCurrentPlan = plan.name === getMembershipPlan(selectedMemberForRenewal);
                    const isSelected = selectedNewPlan?.id === plan.id;
                    const discountedPrice = plan.discount && plan.discount > 0
                      ? plan.price * (1 - plan.discount / 100)
                      : plan.price;

                    return (
                      <Card
                        key={plan.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${isSelected
                          ? 'border-2 border-primary shadow-lg scale-105'
                          : 'border hover:border-primary/50'
                          } ${isCurrentPlan ? 'bg-blue-50' : ''}`}
                        onClick={() => handlePlanSelection(plan)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-bold text-lg">{plan.name}</h3>
                              <p className="text-sm text-muted-foreground">{plan.duration || `${plan.durationValue} ${plan.durationType}`}</p>
                            </div>
                            {isCurrentPlan && (
                              <Badge className="bg-blue-100 text-blue-800">Current</Badge>
                            )}
                          </div>

                          <div className="mb-4">
                            <div className="text-3xl font-bold text-primary">
                              {discountedPrice.toFixed(2)} <span className="text-base font-normal text-muted-foreground"><CurrencyGlyph /></span>
                            </div>
                            {plan.discount > 0 && (
                              <p className="text-xs text-muted-foreground line-through"><CurrencyGlyph /> {plan.price}</p>
                            )}
                          </div>

                          {plan.description && (
                            <p className="text-sm text-muted-foreground mb-3">{plan.description}</p>
                          )}

                          {isSelected && (
                            <Button className="w-full mt-4 bg-gradient-primary" size="sm">
                              Selected
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Operation Type Indicator */}
                {operationType && (
                  <div className={`mt-4 rounded-xl border overflow-hidden ${operationType === 'renewal'
                    ? 'border-green-200 bg-gradient-to-br from-green-50 via-white to-emerald-50/60'
                    : operationType === 'downgrade'
                      ? 'border-red-200 bg-red-50'
                      : 'border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50/60'
                    }`}>
                    <div className={`h-0.5 w-full ${operationType === 'renewal'
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                      : operationType === 'downgrade'
                        ? 'bg-red-500'
                        : 'bg-gradient-to-r from-orange-400 to-amber-500'
                      }`} />
                    <div className="flex flex-col items-center text-center gap-2 px-6 py-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl shadow-sm ${operationType === 'renewal'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : operationType === 'downgrade'
                          ? 'bg-red-500'
                          : 'bg-gradient-to-br from-orange-500 to-amber-600'
                        }`}>
                        {operationType === 'renewal'
                          ? <FaArrowsRotate size={17} className="text-white" />
                          : operationType === 'downgrade'
                            ? <FaCircleArrowDown size={17} className="text-white" />
                            : <FaCircleArrowUp size={17} className="text-white" />
                        }
                      </div>
                      <p className={`text-sm font-semibold ${operationType === 'renewal'
                        ? 'text-green-800'
                        : operationType === 'downgrade'
                          ? 'text-red-800'
                          : 'text-orange-800'
                        }`}>
                        {operationType === 'renewal' ? 'Detected as Renewal' : operationType === 'downgrade' ? 'Detected as Downgrade' : 'Detected as Upgrade'}
                      </p>
                      {operationType === 'renewal' ? (
                        <p className="text-xs text-muted-foreground">
                          Member is renewing their current plan:{' '}
                          <span className={`font-medium text-green-700`}>{selectedNewPlan.name}</span>
                        </p>
                      ) : operationType === 'downgrade' ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="font-medium text-red-700 px-1.5 py-0.5 bg-red-100 rounded-md">{getMembershipPlan(selectedMemberForRenewal)}</span>
                          <FaArrowRight size={9} className="text-muted-foreground/60 shrink-0" />
                          <span className="font-medium text-red-700 px-1.5 py-0.5 bg-red-100 rounded-md">{selectedNewPlan.name}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="font-medium text-orange-700 px-1.5 py-0.5 bg-orange-100/80 rounded-md">{getMembershipPlan(selectedMemberForRenewal)}</span>
                          <FaArrowRight size={9} className="text-muted-foreground/60 shrink-0" />
                          <span className="font-medium text-amber-700 px-1.5 py-0.5 bg-amber-100/80 rounded-md">{selectedNewPlan.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Payment Section */}
          {selectedNewPlan && (
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="border-b bg-slate-50/50 py-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-semibold shrink-0">
                    3
                  </div>
                  <div>
                    <CardTitle className="text-base">Payment Details</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Configure payment method and apply discounts</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {/* Plan Amount */}
                <div className="bg-gradient-light p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">Plan Amount:</span>
                    <span className="text-2xl font-bold text-primary"><CurrencyGlyph /> {selectedNewPlan.price}</span>
                  </div>
                  {discountAmount && parseFloat(discountAmount) > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="text-lg font-semibold text-green-600">- <CurrencyGlyph /> {discountAmount}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-semibold">Total Amount:</span>
                        <span className="text-2xl font-bold text-primary"><CurrencyGlyph /> {calculateTotalAmount()}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Discount & Coupon */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discount">Apply Discount ({currencyCode})</Label>
                    <Input
                      id="discount"
                      type="number"
                      placeholder="0"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="coupon">Coupon Code (Optional)</Label>
                    <Input
                      id="coupon"
                      placeholder="Enter coupon code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                </div>

                {/* Payment Method */}
                <div>
                  <Label>Payment Method</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-2">
                    <Button
                      variant={!splitPayment && paymentMethod === 'cash' ? 'default' : 'outline'}
                      onClick={() => {
                        setPaymentMethod('cash');
                        setSplitPayment(false);
                      }}
                      className={!splitPayment && paymentMethod === 'cash' ? 'bg-gradient-primary' : ''}
                    >
                      <Banknote className="mr-2 h-4 w-4" />
                      Cash
                    </Button>
                    <Button
                      variant={!splitPayment && paymentMethod === 'card' ? 'default' : 'outline'}
                      onClick={() => {
                        setPaymentMethod('card');
                        setSplitPayment(false);
                      }}
                      className={!splitPayment && paymentMethod === 'card' ? 'bg-gradient-primary' : ''}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Card
                    </Button>
                    <Button
                      variant={!splitPayment && paymentMethod === 'online' ? 'default' : 'outline'}
                      onClick={() => {
                        setPaymentMethod('online');
                        setSplitPayment(false);
                      }}
                      className={!splitPayment && paymentMethod === 'online' ? 'bg-gradient-primary' : ''}
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      Online
                    </Button>
                    <Button
                      variant={!splitPayment && paymentMethod === 'credit' ? 'default' : 'outline'}
                      onClick={() => {
                        setPaymentMethod('credit');
                        setSplitPayment(false);
                      }}
                      className={!splitPayment && paymentMethod === 'credit' ? 'bg-gradient-primary' : ''}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Credit
                    </Button>
                    <Button
                      variant={splitPayment ? 'default' : 'outline'}
                      onClick={() => setSplitPayment(!splitPayment)}
                      className={splitPayment ? 'bg-gradient-primary' : ''}
                    >
                      <ArrowLeftRight className="mr-2 h-4 w-4" />
                      Split
                    </Button>
                  </div>
                </div>

                {/* Card details */}
                {!splitPayment && paymentMethod === 'card' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gradient-light rounded-lg">
                    <div>
                      <Label className="text-xs">Card Type <span className="text-red-500">*</span></Label>
                      <Select
                        value={renewalMethodDetails.cardType}
                        onValueChange={(v) => setRenewalMethodDetails({ ...renewalMethodDetails, cardType: v })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select card type" /></SelectTrigger>
                        <SelectContent>
                          {CARD_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Reference (optional)</Label>
                      <Input
                        value={renewalMethodDetails.cardReference}
                        onChange={(e) => setRenewalMethodDetails({ ...renewalMethodDetails, cardReference: e.target.value })}
                        className="mt-1"
                        placeholder="Transaction number"
                      />
                    </div>
                  </div>
                )}

                {/* Online Payment details */}
                {!splitPayment && paymentMethod === 'online' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gradient-light rounded-lg">
                    <div>
                      <Label className="text-xs">Payment Type <span className="text-red-500">*</span></Label>
                      <Select
                        value={renewalMethodDetails.onlinePaymentType}
                        onValueChange={(v) => setRenewalMethodDetails({ ...renewalMethodDetails, onlinePaymentType: v })}
                      >
                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select payment type" /></SelectTrigger>
                        <SelectContent>
                          {ONLINE_PAYMENT_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Transaction / Reference ID <span className="text-red-500">*</span></Label>
                      <Input
                        value={renewalMethodDetails.onlineReference}
                        onChange={(e) => setRenewalMethodDetails({ ...renewalMethodDetails, onlineReference: e.target.value })}
                        className="mt-1"
                        placeholder="Transaction ID"
                      />
                    </div>
                    {renewalMethodDetails.onlinePaymentType === 'Other' && (
                      <div className="md:col-span-2">
                        <Label className="text-xs">Payment Provider Name <span className="text-red-500">*</span></Label>
                        <Input
                          value={renewalMethodDetails.onlineProviderName}
                          onChange={(e) => setRenewalMethodDetails({ ...renewalMethodDetails, onlineProviderName: e.target.value })}
                          className="mt-1"
                          placeholder="Provider name"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Credit details */}
                {!splitPayment && paymentMethod === 'credit' && (
                  <div className="space-y-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-xs text-orange-700">
                      Membership renews now; anything not received today stays as the member's outstanding due.
                    </p>
                    <div>
                      <Label className="text-xs">Amount Received Now (optional)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={creditAmountReceived}
                        onChange={(e) => setCreditAmountReceived(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    {(parseFloat(creditAmountReceived) || 0) > 0 && (
                      <>
                        <div>
                          <Label className="text-xs">Received Via <span className="text-red-500">*</span></Label>
                          <Select value={creditReceivedVia} onValueChange={setCreditReceivedVia}>
                            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="cheque">Cheque</SelectItem>
                              <SelectItem value="bankTransfer">Bank Transfer</SelectItem>
                              <SelectItem value="online">Online Payment</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {creditReceivedVia === 'card' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs">Card Type <span className="text-red-500">*</span></Label>
                              <Select
                                value={creditMethodDetails.cardType}
                                onValueChange={(v) => setCreditMethodDetails({ ...creditMethodDetails, cardType: v })}
                              >
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select card type" /></SelectTrigger>
                                <SelectContent>
                                  {CARD_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Reference (optional)</Label>
                              <Input
                                value={creditMethodDetails.cardReference}
                                onChange={(e) => setCreditMethodDetails({ ...creditMethodDetails, cardReference: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}
                        {creditReceivedVia === 'cheque' && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <Label className="text-xs">Cheque Number <span className="text-red-500">*</span></Label>
                              <Input
                                value={creditMethodDetails.chequeNumber}
                                onChange={(e) => setCreditMethodDetails({ ...creditMethodDetails, chequeNumber: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Bank Name (optional)</Label>
                              <Input
                                value={creditMethodDetails.chequeBankName}
                                onChange={(e) => setCreditMethodDetails({ ...creditMethodDetails, chequeBankName: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Cheque Date (optional)</Label>
                              <Input
                                type="date"
                                value={creditMethodDetails.chequeDate}
                                onChange={(e) => setCreditMethodDetails({ ...creditMethodDetails, chequeDate: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}
                        {creditReceivedVia === 'bankTransfer' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs">Reference <span className="text-red-500">*</span></Label>
                              <Input
                                value={creditMethodDetails.bankTransferReference}
                                onChange={(e) => setCreditMethodDetails({ ...creditMethodDetails, bankTransferReference: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Bank Account (Ledger)</Label>
                              <Select
                                value={creditMethodDetails.bankTransferAccountId}
                                onValueChange={(v) => setCreditMethodDetails({ ...creditMethodDetails, bankTransferAccountId: v })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue placeholder={renewalBankAccounts.length ? 'Select bank account' : 'No bank accounts in ledger'} />
                                </SelectTrigger>
                                <SelectContent>
                                  {renewalBankAccounts.map(account => (
                                    <SelectItem key={account.id} value={String(account.id)}>{account.code} — {account.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                        {creditReceivedVia === 'online' && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label className="text-xs">Payment Type <span className="text-red-500">*</span></Label>
                              <Select
                                value={creditMethodDetails.onlinePaymentType}
                                onValueChange={(v) => setCreditMethodDetails({ ...creditMethodDetails, onlinePaymentType: v })}
                              >
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select payment type" /></SelectTrigger>
                                <SelectContent>
                                  {ONLINE_PAYMENT_TYPE_OPTIONS.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Transaction / Reference ID <span className="text-red-500">*</span></Label>
                              <Input
                                value={creditMethodDetails.onlineReference}
                                onChange={(e) => setCreditMethodDetails({ ...creditMethodDetails, onlineReference: e.target.value })}
                                className="mt-1"
                              />
                            </div>
                            {creditMethodDetails.onlinePaymentType === 'Other' && (
                              <div className="md:col-span-2">
                                <Label className="text-xs">Payment Provider Name <span className="text-red-500">*</span></Label>
                                <Input
                                  value={creditMethodDetails.onlineProviderName}
                                  onChange={(e) => setCreditMethodDetails({ ...creditMethodDetails, onlineProviderName: e.target.value })}
                                  className="mt-1"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    <p className="text-sm font-medium">
                      Due after renewal:{' '}
                      <span className="text-orange-700">
                        <CurrencyGlyph /> {Math.max(0, calculateTotalAmount() - (parseFloat(creditAmountReceived) || 0)).toLocaleString()}
                      </span>
                    </p>
                  </div>
                )}

                {/* Split Payment Fields */}
                {splitPayment && (
                  <SplitPaymentFields
                    total={calculateTotalAmount()}
                    value={splitLegs}
                    onChange={setSplitLegs}
                    details={splitLegDetails}
                    onDetailsChange={setSplitLegDetails}
                    bankAccounts={renewalBankAccounts}
                    currencyCode={currencyCode}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 4: Confirmation */}
          {selectedNewPlan && (
            <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
              <CardHeader className="border-b bg-slate-50/50 py-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary text-primary-foreground rounded-full w-7 h-7 flex items-center justify-center text-sm font-semibold shrink-0">
                    4
                  </div>
                  <div>
                    <CardTitle className="text-base">Confirmation</CardTitle>
                    <CardDescription className="text-xs mt-0.5">Review details before processing</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-white border-2 border-primary/20 rounded-lg p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Member Name</Label>
                      <p className="font-semibold">{selectedMemberForRenewal.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Member ID</Label>
                      <p className="font-semibold">{getMemberId(selectedMemberForRenewal)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Current Plan</Label>
                      <p className="font-semibold">{getMembershipPlan(selectedMemberForRenewal)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">New Plan</Label>
                      <p className="font-semibold text-primary">{selectedNewPlan.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Operation Type</Label>
                      <Badge className={
                        operationType === 'renewal'
                          ? 'bg-green-100 text-green-800'
                          : operationType === 'downgrade'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-orange-100 text-orange-800'
                      }>
                        <span className="flex items-center gap-1">
                          {operationType === 'renewal'
                            ? <><FaArrowsRotate size={12} /> Renewal</>
                            : operationType === 'downgrade'
                              ? <><FaArrowDown size={12} /> Downgrade</>
                              : <><FaArrowUp size={12} /> Upgrade</>}
                        </span>
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Method</Label>
                      <p className="font-semibold capitalize">
                        {splitPayment ? 'Split Payment' : paymentMethod === 'credit' ? 'Credit' : paymentMethod}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Total Amount</Label>
                      <p className="text-2xl font-bold text-primary"><CurrencyGlyph /> {calculateTotalAmount()}</p>
                    </div>
                    {!splitPayment && paymentMethod === 'credit' && (
                      <div className="col-span-2 pt-1 border-t">
                        <div className="flex justify-between text-sm mt-2">
                          <span className="text-muted-foreground">Received Now</span>
                          <span className="font-medium"><CurrencyGlyph /> {(parseFloat(creditAmountReceived) || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-orange-700 font-medium">Due After Renewal</span>
                          <span className="text-orange-700 font-medium">
                            <CurrencyGlyph /> {Math.max(0, calculateTotalAmount() - (parseFloat(creditAmountReceived) || 0)).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button
                    onClick={handleProcessRenewalUpgrade}
                    className="w-full h-12 text-lg bg-gradient-primary hover:bg-gradient-primary-hover"
                  >
                    {operationType === 'renewal' ? (
                      <>
                        <RefreshCw className="mr-2 h-5 w-5" />
                        Renew Membership
                      </>
                    ) : operationType === 'downgrade' ? (
                      <>
                        <TrendingDown className="mr-2 h-5 w-5" />
                        Downgrade Membership
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-5 w-5" />
                        Upgrade Membership
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Success Modal */}
          <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
            <DialogContent className="sm:max-w-[500px]">
              <div className="text-center py-6">
                <div className="bg-gradient-primary rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-12 w-12 text-white" />
                </div>
                <DialogTitle className="text-2xl mb-2">
                  🎉 Membership Successfully {operationType === 'renewal' ? 'Renewed' : operationType === 'downgrade' ? 'Downgraded' : 'Upgraded'}!
                </DialogTitle>
                <div className="text-base mt-4">
                  <div className="bg-gradient-light p-4 rounded-lg space-y-2">
                    <div className="font-semibold text-foreground">
                      {selectedMemberForRenewal?.name}'s membership has been successfully {operationType === 'renewal' ? 'renewed' : operationType === 'downgrade' ? 'downgraded' : 'upgraded'}.
                    </div>
                    <div className="text-sm">
                      New Plan: <span className="font-semibold text-primary">{selectedNewPlan?.name}</span>
                    </div>
                    <div className="text-sm">
                      Amount Paid: <span className="font-semibold text-primary"><CurrencyGlyph /> {calculateTotalAmount()}</span>
                    </div>
                    <div className="pt-3 border-t mt-3">
                      <div className="text-xs text-muted-foreground">
                        ✅ Digital receipt has been sent via WhatsApp/SMS<br />
                        ✅ Congratulatory message delivered<br />
                        ✅ Member profile updated
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Plan Comparison Modal */}
          <Dialog open={planComparisonOpen} onOpenChange={setPlanComparisonOpen}>
            <DialogContent className="sm:max-w-[800px]">
              <DialogHeader>
                <DialogTitle>Plan Comparison</DialogTitle>
                <DialogDescription>Compare all membership plans side by side</DialogDescription>
              </DialogHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Plan Name</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Features</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiPlans.map((plan) => (
                      <TableRow key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-semibold">{plan.name}</TableCell>
                        <TableCell className="font-bold text-primary"><CurrencyGlyph /> {plan.price}</TableCell>
                        <TableCell>{plan.duration || `${plan.durationValue} ${plan.durationType}`}</TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">{plan.description || '—'}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>

          {/* Empty State */}
          {!selectedMemberForRenewal && (
            <Card className="border-primary/10 shadow-md">
              <CardContent className="flex flex-col items-center justify-center pt-20 pb-16 text-center">
                <div className="bg-primary/5 p-4 rounded-full mb-4">
                  <RefreshCw className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Search a Member to Get Started</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Use the search bar above to find a member. The system will automatically detect whether it's a renewal or upgrade.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="addons">
          <MemberAddons embedded />
        </TabsContent>

        <TabsContent value="receipts">
          <MemberReceipts embedded />
        </TabsContent>

        <TabsContent value="freeze" className="space-y-6">
          <Card className="border-[#2B7A78]/20 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-[#DFF5F4] to-white border-b border-[#2B7A78]/10">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <Snowflake className="h-5 w-5 text-[#2B7A78]" />
                    <span>Freeze / Unfreeze Memberships</span>
                  </CardTitle>
                  <CardDescription>Manage membership freeze requests with automated workflows</CardDescription>
                </div>
                <Button
                  onClick={() => onNavigate?.('freeze-unfreeze')}
                  className="bg-[#2B7A78] hover:bg-[#1a4d4b] text-white"
                >
                  <Snowflake className="h-4 w-4 mr-2" />
                  Open Freeze Management
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-blue-200 bg-blue-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Snowflake className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Currently Frozen</p>
                    <p className="font-bold text-gray-900">{frozenMembers} Members</p>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-green-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                        <Clock className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Auto Unfreeze Pending</p>
                    <p className="font-bold text-gray-900">{autoUnfreezePending} Members</p>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-orange-50/50">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">Total Freeze Days</p>
                    <p className="font-bold text-gray-900">{totalFreezeDays} Days</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="mt-6 border-[#2B7A78]/20 shadow-sm hover:shadow-md transition-shadow bg-gradient-to-r from-[#DFF5F4]/30 to-white">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <div className="h-10 w-10 rounded-lg bg-[#2B7A78] flex items-center justify-center flex-shrink-0">
                      <Info className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900 mb-2">Freeze Management Features</h4>
                      <ul className="space-y-2 text-sm text-gray-700">
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Search and freeze member memberships with plan-based limits</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>View all currently frozen members in a comprehensive grid view</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Automatic charge calculation for extra freeze days beyond plan limits</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Auto-unfreeze scheduling with automated notifications</span>
                        </li>
                        <li className="flex items-start">
                          <CheckCircle className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" />
                          <span>Complete freeze history tracking for each member</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          {/* Header with Breadcrumb */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-2">
            <span>Community</span>
            <ChevronRight className="h-4 w-4" />
            <span>Members</span>
            <ChevronRight className="h-4 w-4" />
            <span>Reports</span>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium">Membership Report</span>
          </div>

          <div className="flex items-center space-x-3 mb-6">
            <div>
              <h2 className="text-2xl font-bold">Membership Report</h2>
              <p className="text-sm text-muted-foreground">Generate comprehensive membership transaction reports</p>
            </div>
          </div>

          {/* Report Filters Panel */}
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                {/* Report Type */}
                <div>
                  <Label className="text-sm mb-2 block">Report Type</Label>
                  <Select value={reportType} onValueChange={setReportType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="membership">Membership Report</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Range */}
                <div>
                  <Label className="text-sm mb-2 block">Date Range</Label>
                  {dateRange === "custom" ? (
                    <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left">
                          <Calendar className="mr-2 h-4 w-4" />
                          {customDateFrom && customDateTo
                            ? `${customDateFrom.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })} - ${customDateTo.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' })}`
                            : 'Select dates'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-4" align="start">
                        <div className="space-y-4">
                          <div>
                            <Label className="text-xs mb-2 block">From Date</Label>
                            <CalendarComponent
                              mode="single"
                              selected={customDateFrom}
                              onSelect={setCustomDateFrom}
                              initialFocus
                            />
                          </div>
                          <div>
                            <Label className="text-xs mb-2 block">To Date</Label>
                            <CalendarComponent
                              mode="single"
                              selected={customDateTo}
                              onSelect={setCustomDateTo}
                              initialFocus
                            />
                          </div>
                          <Button onClick={() => setShowDatePicker(false)} size="sm" className="w-full">
                            Apply
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : (
                    <Select value={dateRange} onValueChange={setDateRange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yesterday">Yesterday</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="custom">Custom Date Range</SelectItem>
                        <SelectItem value="last-7-days">Last 7 Days</SelectItem>
                        <SelectItem value="last-30-days">Last 30 Days</SelectItem>
                        <SelectItem value="last-12-months">Last 12 Months</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Membership Type */}
                <div>
                  <Label className="text-sm mb-2 block">Membership Type</Label>
                  <Select value={membershipType} onValueChange={setMembershipType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Individual">Individual</SelectItem>
                      <SelectItem value="Couple">Couple</SelectItem>
                      <SelectItem value="Family">Family</SelectItem>
                      <SelectItem value="Corporate">Corporate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Transaction Type */}
                <div>
                  <Label className="text-sm mb-2 block">Transaction Type</Label>
                  <Select value={transactionType} onValueChange={setTransactionType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="New">New</SelectItem>
                      <SelectItem value="Renewal">Renewal</SelectItem>
                      <SelectItem value="Add-on">Add-on</SelectItem>
                      <SelectItem value="Single Day">Single Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Pay Mode */}
                <div>
                  <Label className="text-sm mb-2 block">Pay Mode</Label>
                  <Select value={payMode} onValueChange={setPayMode}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Card">Card</SelectItem>
                      <SelectItem value="Credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleGenerateReport}
                  disabled={reportLoading}
                  className="bg-gradient-primary hover:bg-gradient-primary-hover"
                >
                  {reportLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>

                {reportGenerated && (
                  <>
                    <div className="relative">
                      <Button
                        variant="outline"
                        onClick={() => setShowExportMenu(v => !v)}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export Report
                      </Button>
                      {showExportMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                          <div className="absolute top-full left-0 mt-2 bg-white border rounded-lg shadow-lg z-50 w-48">
                            <button
                              onClick={() => { handleExport('excel'); setShowExportMenu(false); }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center rounded-t-lg"
                            >
                              <FileSpreadsheet className="mr-2 h-4 w-4 text-green-600" />
                              Export as Excel
                            </button>
                            <button
                              onClick={() => { handleExport('pdf'); setShowExportMenu(false); }}
                              className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center rounded-b-lg"
                            >
                              <FileText className="mr-2 h-4 w-4 text-red-600" />
                              Export as PDF
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setScheduleModalOpen(true)}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Schedule Report
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Report Output Section */}
          {reportGenerated && (
            <>
              {/* Summary Bar (Sticky) */}
              <div className="sticky top-16 z-30 bg-white border border-border shadow-md rounded-lg px-8 py-3">
                <div className="flex items-center gap-0 overflow-x-auto">
                  <div className="flex items-center gap-1.5 font-semibold text-primary text-sm pr-4 shrink-0">
                    <BarChart3 className="h-4 w-4" />
                    Summary
                  </div>
                  <div className="flex items-center gap-1.5 text-sm px-4 border-l shrink-0">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground whitespace-nowrap">Total Records</span>
                    <span className="font-bold ml-1">{reportSummary.totalRecords}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm px-4 border-l shrink-0">
                    <DollarSign className="h-3.5 w-3.5 text-green-600 shrink-0" />
                    <span className="text-muted-foreground whitespace-nowrap">Total Amount</span>
                    <span className="font-bold text-green-600 ml-1"><CurrencyGlyph /> {reportSummary.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm px-4 border-l shrink-0">
                    <Banknote className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="text-muted-foreground whitespace-nowrap">Total Cash</span>
                    <span className="font-bold text-emerald-600 ml-1"><CurrencyGlyph /> {reportSummary.totalCash.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm px-4 border-l shrink-0">
                    <CreditCard className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                    <span className="text-muted-foreground whitespace-nowrap">Total Card</span>
                    <span className="font-bold text-sky-600 ml-1"><CurrencyGlyph /> {reportSummary.totalCard.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm px-4 border-l shrink-0">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="text-muted-foreground whitespace-nowrap">Total Due</span>
                    <span className="font-bold text-amber-600 ml-1"><CurrencyGlyph /> {reportSummary.totalDue.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Report Results
                    <Badge variant="secondary" className="ml-1">{reportData.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-12">#</TableHead>
                          <TableHead>Doc. Date</TableHead>
                          <TableHead>Doc. No.</TableHead>
                          <TableHead>Member ID</TableHead>
                          <TableHead>Member Name</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Membership Type</TableHead>
                          <TableHead>Transaction Type</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Mode</TableHead>
                          <TableHead>Cash</TableHead>
                          <TableHead>Card</TableHead>
                          <TableHead>Due</TableHead>
                          <TableHead>Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedReportData.map((row, index) => (
                          <TableRow key={row.id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell>{reportStartIndex + index + 1}</TableCell>
                            <TableCell>{row.docDate}</TableCell>
                            <TableCell className="font-medium">{row.docNo}</TableCell>
                            <TableCell className="font-mono text-sm">{row.memberId}</TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="text-xs">
                                    {row.memberName.split(' ').map((n: string) => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{row.memberName}</span>
                              </div>
                            </TableCell>
                            <TableCell>{row.mobile}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="whitespace-nowrap">
                                {row.membershipType}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={getTransactionTypeBadge(row.transactionType)}>
                                {row.transactionType}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.plan}</TableCell>
                            <TableCell className="font-semibold"><CurrencyGlyph /> {row.amount.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge className={getPayModeBadge(row.mode)}>
                                {row.mode}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-emerald-600">{row.cash.toLocaleString()}</TableCell>
                            <TableCell className="text-sky-600">{row.card.toLocaleString()}</TableCell>
                            <TableCell className="text-amber-600">{row.due.toLocaleString()}</TableCell>
                            <TableCell>{row.dueDate}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Pagination */}
                  <div className="flex items-center justify-between pt-4 mt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      Showing <span className="font-medium text-foreground">{reportStartIndex + 1}</span>–<span className="font-medium text-foreground">{Math.min(reportEndIndex, reportData.length)}</span> of <span className="font-medium text-foreground">{reportData.length}</span> transactions
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReportPage(p => Math.max(1, p - 1))}
                        disabled={reportPage === 1}
                        className="h-8 px-3"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      {Array.from({ length: Math.min(reportTotalPages, 5) }, (_, i) => {
                        const page = reportTotalPages <= 5
                          ? i + 1
                          : reportPage <= 3
                            ? i + 1
                            : reportPage >= reportTotalPages - 2
                              ? reportTotalPages - 4 + i
                              : reportPage - 2 + i;
                        return (
                          <Button
                            key={page}
                            variant={reportPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setReportPage(page)}
                            className="h-8 w-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setReportPage(p => Math.min(reportTotalPages, p + 1))}
                        disabled={reportPage === reportTotalPages}
                        className="h-8 px-3"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Empty State */}
          {!reportGenerated && !reportLoading && (
            <Card className="border-0 shadow-md hover:shadow-lg transition-shadow">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="bg-gradient-light p-6 rounded-full mb-4">
                  <BarChart3 className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Report Generated Yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Select your filters and click "Generate Report" to view comprehensive membership transaction data with detailed analytics.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Schedule Report Modal */}
          <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Schedule Report</DialogTitle>
                <DialogDescription>
                  Set up automatic report generation and delivery
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="schedule-name">Schedule Name *</Label>
                  <Input
                    id="schedule-name"
                    placeholder="e.g., Weekly Membership Report"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="frequency">Frequency *</Label>
                  <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Next Run Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start mt-2">
                        <Calendar className="mr-2 h-4 w-4" />
                        {scheduleDate ? scheduleDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'Select date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={scheduleDate}
                        onSelect={setScheduleDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <Label htmlFor="recipients">Recipients (comma-separated emails) *</Label>
                  <Input
                    id="recipients"
                    placeholder="admin@gym.com, manager@gym.com"
                    value={scheduleRecipients}
                    onChange={(e) => setScheduleRecipients(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="include-summary"
                    checked={includeSummary}
                    onCheckedChange={(checked) => setIncludeSummary(checked as boolean)}
                  />
                  <Label htmlFor="include-summary" className="cursor-pointer">
                    Include summary in email
                  </Label>
                </div>

                <div>
                  <Label htmlFor="export-format">Export Format</Label>
                  <Select value={exportFormat} onValueChange={setExportFormat}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                      <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setScheduleModalOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleScheduleSave} className="bg-gradient-primary">
                  Save Schedule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>

      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Member Details - {selectedMember.name}</DialogTitle>
              <DialogDescription>
                View and manage member information and settings
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedMember.avatar} />
                  <AvatarFallback>{selectedMember.name.split(' ').map((n: string) => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-medium">{selectedMember.name}</h3>
                  <p className="text-sm text-muted-foreground">Member ID: {selectedMember.id.toString().padStart(4, '0')}</p>
                  <Badge className={getStatusColor(selectedMember.status)}>
                    {selectedMember.status}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Information</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center text-sm">
                      <Mail className="mr-2 h-4 w-4" />
                      {selectedMember.email}
                    </div>
                    <div className="flex items-center text-sm">
                      <Phone className="mr-2 h-4 w-4" />
                      {selectedMember.phone}
                    </div>
                    <div className="flex items-center text-sm">
                      <MapPin className="mr-2 h-4 w-4" />
                      {selectedMember.address}
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Membership Details</Label>
                  <div className="mt-2 space-y-2">
                    <div className="text-sm">
                      <strong>Plan:</strong> {selectedMember.membership}
                    </div>
                    <div className="text-sm">
                      <strong>Fee:</strong> ${selectedMember.membershipFee}
                    </div>
                    <div className="text-sm">
                      <strong>Joined:</strong> {new Date(selectedMember.joinDate).toLocaleDateString()}
                    </div>
                    <div className="text-sm">
                      <strong>Expires:</strong> {new Date(selectedMember.expiryDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline">Edit Member</Button>
              <Button>Generate Receipt</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Member Approval Modal */}
      <MemberApprovalModal
        open={showApprovalModal}
        onOpenChange={setShowApprovalModal}
        draftData={selectedDraftForApproval}
        onApprove={handleApproveMember}
        onReject={handleRejectDraft}
      />
    </div>
  );
}

