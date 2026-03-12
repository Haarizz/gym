import React, { useState, useEffect } from 'react';
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
import { MemberApprovalModal } from "../components/shared/member-approval-modal";
import { MemberAddons } from "./member-addons";
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
  Banknote,
  CreditCard,
  Wallet,
  ArrowLeftRight,
  Snowflake,
  Info,
  MoreVertical,
  UserCheck,
  Eye,
  XCircle,
  Bell,
  ShieldBan,
  DollarSign,
  AlertCircle,
} from 'lucide-react';
import { FaCircleCheck, FaCircleArrowUp, FaArrowsRotate, FaArrowUp, FaArrowRight } from 'react-icons/fa6';
import { toast } from 'sonner';
import { membersService, Member } from '../utils/supabase/members-service';
import { authService } from '../utils/supabase/auth-service';

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
  onNavigate?: (section: string) => void;
  initialTab?: string;
}

// Mock data for membership report
const generateMockReportData = () => {
  const transactions = [];
  const membershipTypes = ['Individual', 'Family', 'Corporate'];
  const transactionTypes = ['New', 'Renewal', 'Add-on', 'Single Day'];
  const plans = ['Basic Monthly', 'Standard Monthly', 'Premium Monthly', 'Premium Annual', 'Gold Plan', 'Platinum Plan'];
  const payModes = ['Cash', 'Card', 'Credit'];
  
  for (let i = 1; i <= 124; i++) {
    const amount = Math.floor(Math.random() * 3000) + 500;
    const cashAmount = payModes[Math.floor(Math.random() * 3)] === 'Cash' ? amount : 0;
    const cardAmount = payModes[Math.floor(Math.random() * 3)] === 'Card' ? amount : 0;
    const dueAmount = Math.random() > 0.9 ? Math.floor(Math.random() * 500) : 0;
    
    transactions.push({
      id: i,
      docDate: new Date(2025, 9, Math.floor(Math.random() * 13) + 1).toLocaleDateString('en-GB'),
      docNo: `INV-${String(400 + i).padStart(5, '0')}`,
      memberId: `M-${String(200 + i).padStart(5, '0')}`,
      memberName: `Member ${i}`,
      photo: null,
      mobile: `050${String(1000000 + i).slice(-7)}`,
      membershipType: membershipTypes[Math.floor(Math.random() * membershipTypes.length)],
      transactionType: transactionTypes[Math.floor(Math.random() * transactionTypes.length)],
      plan: plans[Math.floor(Math.random() * plans.length)],
      amount: amount,
      mode: payModes[Math.floor(Math.random() * payModes.length)],
      cash: cashAmount,
      card: cardAmount,
      due: dueAmount,
      dueDate: dueAmount > 0 ? new Date(2025, 10, Math.floor(Math.random() * 30) + 1).toLocaleDateString('en-GB') : '–',
    });
  }
  
  return transactions;
};

export function Members({ onNavigate, initialTab = "members" }: MembersProps = {}) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  
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
  
  // Renewals & Upgrades states
  const [renewalSearchTerm, setRenewalSearchTerm] = useState("");
  const [searchSuggestions, setSearchSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedMemberForRenewal, setSelectedMemberForRenewal] = useState<any>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<any>(null);
  const [operationType, setOperationType] = useState<"renewal" | "upgrade" | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [splitPayment, setSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cardAmount, setCardAmount] = useState("");
  const [discountAmount, setDiscountAmount] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [planComparisonOpen, setPlanComparisonOpen] = useState(false);
  
  // Pending approvals states
  const [pendingMembers, setPendingMembers] = useState<any[]>([]);
  const [selectedDraftForApproval, setSelectedDraftForApproval] = useState<any | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

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
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMembers();
    }, 100);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedStatus, currentPage]);

  // Load pending members from localStorage
  useEffect(() => {
    const loadPendingMembers = () => {
      const stored = localStorage.getItem('pendingMembers');
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

  const totalMembersCount = totalMembers;
  const activeMembers = members.filter(m => m.membership_status === "active").length;
  const inactiveMembers = members.filter(m => m.membership_status === "inactive").length;
  const expiredMembers = members.filter(m => m.membership_status === "expired").length;
  const frozenMembers = members.filter(m => m.membership_status === "frozen").length;
  const suspendedMembers = members.filter(m => m.membership_status === "suspended").length;

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
    onNavigate?.('add-member');
  };
  
  // Handle generate report
  const handleGenerateReport = () => {
    setReportLoading(true);
    
    setTimeout(() => {
      let data = generateMockReportData();
      
      // Apply filters
      if (membershipType !== "all") {
        data = data.filter(d => d.membershipType === membershipType);
      }
      if (transactionType !== "all") {
        data = data.filter(d => d.transactionType === transactionType);
      }
      if (payMode !== "all") {
        data = data.filter(d => d.mode === payMode);
      }
      
      setReportData(data);
      setReportGenerated(true);
      setReportLoading(false);
      setReportPage(1);
      
      toast.success('Report Generated', {
        description: `Found ${data.length} transactions matching your criteria.`,
      });
    }, 1500);
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
  const getTotalVisits = (member: Member) => member.total_visits || 0;

  // Helper function to get membership category (Individual, Family, Corporate)
  const getMembershipCategory = (member: Member): string => {
    // Derive from member data or default to Individual
    const memberId = getMemberId(member);
    if (memberId.includes('corp') || memberId.includes('COR')) return 'Corporate';
    if (memberId.includes('fam') || memberId.includes('FAM')) return 'Family';
    // Random distribution for demo
    const hash = memberId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const categories = ['Individual', 'Family', 'Corporate'];
    return categories[hash % 3];
  };

  // Helper function to get plan type with addons
  const getPlanDetails = (member: Member) => {
    const plan = getMembershipPlan(member);
    // Mock addons - in production, this would come from actual member data
    const memberId = getMemberId(member);
    const hasAddons = memberId.charCodeAt(memberId.length - 1) % 3 === 0;
    const addons = hasAddons ? ['Personal Training', 'Nutrition Plan'] : [];
    return { plan, addons };
  };

  // Helper function to get amount due
  const getAmountDue = (member: Member): number => {
    if (member.payment_status === 'overdue') {
      return getMembershipFee(member) * 0.5; // 50% of monthly fee as example
    }
    if (member.payment_status === 'pending') {
      return getMembershipFee(member);
    }
    return 0;
  };

  // Helper function to get payment due date
  const getPaymentDueDate = (member: Member): string => {
    if (member.payment_status === 'overdue' || member.payment_status === 'pending') {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7); // 7 days from now
      return dueDate.toLocaleDateString('en-GB');
    }
    return '';
  };

  // Function to open member history/analytics
  const openMemberHistory = (memberId: string) => {
    console.log('Opening member history for:', memberId);
    // Navigate to member history & analytics screen
    onNavigate?.('member-history-analytics');
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
    localStorage.setItem('pendingMembers', JSON.stringify(updated));

    // Save to active members (simulated)
    const existingMembers = JSON.parse(localStorage.getItem('activeMembers') || '[]');
    existingMembers.push(approvalData);
    localStorage.setItem('activeMembers', JSON.stringify(existingMembers));

    // Notify other components
    window.dispatchEvent(new Event('pendingMembersUpdated'));

    // Refresh members list
    loadMembers();
  };

  const handleRejectDraft = (draftId: string) => {
    const updated = pendingMembers.filter(m => m.memberId !== draftId);
    setPendingMembers(updated);
    localStorage.setItem('pendingMembers', JSON.stringify(updated));
    
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
    
    if (value.length > 2) {
      // Filter members based on search term
      const filtered = members.filter(member => 
        member.name.toLowerCase().includes(value.toLowerCase()) ||
        member.phone.includes(value) ||
        getMemberId(member).toLowerCase().includes(value.toLowerCase()) ||
        member.email.toLowerCase().includes(value.toLowerCase())
      );
      setSearchSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
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
      // Get current plan
      const currentPlan = membershipPlans.find(p => p.name === selectedMemberForRenewal.membership_plan);
      
      if (currentPlan?.id === plan.id) {
        setOperationType("renewal");
      } else if (currentPlan && plan.level > currentPlan.level) {
        setOperationType("upgrade");
      } else if (currentPlan && plan.level < currentPlan.level) {
        setOperationType("upgrade"); // Downgrade also counts as upgrade operation
      } else {
        setOperationType("upgrade");
      }
    }
  };
  
  const calculateTotalAmount = () => {
    if (!selectedNewPlan) return 0;
    
    let total = selectedNewPlan.price;
    
    if (discountAmount) {
      total -= parseFloat(discountAmount);
    }
    
    return Math.max(0, total);
  };
  
  const handleProcessRenewalUpgrade = () => {
    if (!selectedMemberForRenewal || !selectedNewPlan) {
      toast.error('Missing Information', {
        description: 'Please select a member and a plan.',
      });
      return;
    }
    
    const totalAmount = calculateTotalAmount();
    
    // Validate payment
    if (splitPayment) {
      const cash = parseFloat(cashAmount) || 0;
      const card = parseFloat(cardAmount) || 0;
      
      if (cash + card < totalAmount) {
        toast.error('Insufficient Payment', {
          description: 'Total payment must equal the plan amount.',
        });
        return;
      }
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
      setCashAmount("");
      setCardAmount("");
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

  if (loading) {
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
        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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

        <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
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
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
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
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  More Filters
                </Button>
              </div>

              <Table>
                <TableHeader className="bg-slate-50/50">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Member</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Membership</TableHead>
                    <TableHead>Membership Type</TableHead>
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
                      <TableCell colSpan={11} className="text-center py-8">
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
                        <TableRow key={member.id} className="hover:bg-slate-50/50 transition-colors">
                          <TableCell className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarFallback>
                                {member.name.split(' ').map(n => n[0]).join('')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{member.name}</div>
                              <div className="text-sm text-muted-foreground">
                                ID: {getMemberId(member)}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{member.email}</div>
                            <div className="text-sm text-muted-foreground">{member.phone}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{getMembershipPlan(member)}</div>
                            <div className="text-sm text-muted-foreground">
                              AED {getMembershipFee(member)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="capitalize text-sm font-medium text-slate-700">
                              {membershipCategory}
                            </span>
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
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                member.membership_status === 'pending_approval'
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
                            <span
                              className={`font-semibold ${
                                amountDue > 0 ? 'text-red-600' : 'text-green-600'
                              }`}
                            >
                              {amountDue > 0 ? `AED ${amountDue.toFixed(2)}` : '0.00'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {paymentDueDate ? paymentDueDate : '—'}
                          </TableCell>
                          <TableCell>{getTotalVisits(member)}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                {member.membership_status === 'pending_approval' && (member as any).isPending ? (
                                  <>
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
                                  </>
                                ) : (
                                  <>
                                    <DropdownMenuItem
                                      className="cursor-pointer"
                                      onClick={() => openMemberHistory(getMemberId(member))}
                                    >
                                      <BarChart3 className="h-4 w-4 mr-2" />
                                      View Analytics
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer">
                                      <Eye className="h-4 w-4 mr-2" />
                                      View Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer">
                                      <Mail className="h-4 w-4 mr-2" />
                                      Send Message
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

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
                  {membershipPlans.map((plan) => {
                    const isCurrentPlan = plan.name === getMembershipPlan(selectedMemberForRenewal);
                    const isSelected = selectedNewPlan?.id === plan.id;
                    
                    return (
                      <Card
                        key={plan.id}
                        className={`cursor-pointer transition-all hover:shadow-lg ${
                          isSelected 
                            ? 'border-2 border-primary shadow-lg scale-105' 
                            : 'border hover:border-primary/50'
                        } ${isCurrentPlan ? 'bg-blue-50' : ''}`}
                        onClick={() => handlePlanSelection(plan)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-bold text-lg">{plan.name}</h3>
                              <p className="text-sm text-muted-foreground">{plan.duration}</p>
                            </div>
                            {isCurrentPlan && (
                              <Badge className="bg-blue-100 text-blue-800">Current</Badge>
                            )}
                          </div>
                          
                          <div className="mb-4">
                            <div className="text-3xl font-bold text-primary">
                              {plan.price} <span className="text-base font-normal text-muted-foreground">AED</span>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            {plan.features.map((feature, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span className="text-sm">{feature}</span>
                              </div>
                            ))}
                          </div>
                          
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
                  <div className={`mt-4 rounded-xl border overflow-hidden ${
                    operationType === 'renewal'
                      ? 'border-green-200 bg-gradient-to-br from-green-50 via-white to-emerald-50/60'
                      : 'border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50/60'
                  }`}>
                    <div className={`h-0.5 w-full ${operationType === 'renewal' ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-orange-400 to-amber-500'}`} />
                    <div className="flex flex-col items-center text-center gap-2 px-6 py-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl shadow-sm ${
                        operationType === 'renewal'
                          ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                          : 'bg-gradient-to-br from-orange-500 to-amber-600'
                      }`}>
                        {operationType === 'renewal'
                          ? <FaArrowsRotate size={17} className="text-white" />
                          : <FaCircleArrowUp size={17} className="text-white" />
                        }
                      </div>
                      <p className={`text-sm font-semibold ${operationType === 'renewal' ? 'text-green-800' : 'text-orange-800'}`}>
                        {operationType === 'renewal' ? 'Detected as Renewal' : 'Detected as Upgrade'}
                      </p>
                      {operationType === 'renewal' ? (
                        <p className="text-xs text-muted-foreground">
                          Member is renewing their current plan:{' '}
                          <span className={`font-medium text-green-700`}>{selectedNewPlan.name}</span>
                        </p>
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
                    <span className="text-2xl font-bold text-primary">{selectedNewPlan.price} AED</span>
                  </div>
                  {discountAmount && parseFloat(discountAmount) > 0 && (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-muted-foreground">Discount:</span>
                        <span className="text-lg font-semibold text-green-600">- {discountAmount} AED</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t">
                        <span className="font-semibold">Total Amount:</span>
                        <span className="text-2xl font-bold text-primary">{calculateTotalAmount()} AED</span>
                      </div>
                    </>
                  )}
                </div>
                
                {/* Discount & Coupon */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="discount">Apply Discount (AED)</Label>
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
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                    <Button
                      variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                      onClick={() => {
                        setPaymentMethod('cash');
                        setSplitPayment(false);
                      }}
                      className={paymentMethod === 'cash' ? 'bg-gradient-primary' : ''}
                    >
                      <Banknote className="mr-2 h-4 w-4" />
                      Cash
                    </Button>
                    <Button
                      variant={paymentMethod === 'card' ? 'default' : 'outline'}
                      onClick={() => {
                        setPaymentMethod('card');
                        setSplitPayment(false);
                      }}
                      className={paymentMethod === 'card' ? 'bg-gradient-primary' : ''}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Card
                    </Button>
                    <Button
                      variant={paymentMethod === 'online' ? 'default' : 'outline'}
                      onClick={() => {
                        setPaymentMethod('online');
                        setSplitPayment(false);
                      }}
                      className={paymentMethod === 'online' ? 'bg-gradient-primary' : ''}
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      Online
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
                
                {/* Split Payment Fields */}
                {splitPayment && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gradient-light rounded-lg">
                    <div>
                      <Label htmlFor="cash-amount">Cash Amount (AED)</Label>
                      <Input
                        id="cash-amount"
                        type="number"
                        placeholder="0"
                        value={cashAmount}
                        onChange={(e) => setCashAmount(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <Label htmlFor="card-amount">Card Amount (AED)</Label>
                      <Input
                        id="card-amount"
                        type="number"
                        placeholder="0"
                        value={cardAmount}
                        onChange={(e) => setCardAmount(e.target.value)}
                        className="mt-2"
                      />
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">
                        Total Split: {(parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0)} AED
                        {((parseFloat(cashAmount) || 0) + (parseFloat(cardAmount) || 0)) === calculateTotalAmount() && (
                          <span className="text-green-600 ml-2">✓ Payment complete</span>
                        )}
                      </p>
                    </div>
                  </div>
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
                      <Badge className={operationType === 'renewal' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        <span className="flex items-center gap-1">
                          {operationType === 'renewal'
                            ? <><FaArrowsRotate size={12} /> Renewal</>
                            : <><FaArrowUp size={12} /> Upgrade</>}
                        </span>
                      </Badge>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Payment Method</Label>
                      <p className="font-semibold capitalize">
                        {splitPayment ? 'Split Payment' : paymentMethod}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-muted-foreground">Total Amount</Label>
                      <p className="text-2xl font-bold text-primary">{calculateTotalAmount()} AED</p>
                    </div>
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
                  🎉 Membership Successfully {operationType === 'renewal' ? 'Renewed' : 'Upgraded'}!
                </DialogTitle>
                <div className="text-base mt-4">
                  <div className="bg-gradient-light p-4 rounded-lg space-y-2">
                    <div className="font-semibold text-foreground">
                      {selectedMemberForRenewal?.name}'s membership has been successfully {operationType === 'renewal' ? 'renewed' : 'upgraded'}.
                    </div>
                    <div className="text-sm">
                      New Plan: <span className="font-semibold text-primary">{selectedNewPlan?.name}</span>
                    </div>
                    <div className="text-sm">
                      Amount Paid: <span className="font-semibold text-primary">{calculateTotalAmount()} AED</span>
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
                    {membershipPlans.map((plan) => (
                      <TableRow key={plan.id} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-semibold">{plan.name}</TableCell>
                        <TableCell className="font-bold text-primary">{plan.price} AED</TableCell>
                        <TableCell>{plan.duration}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {plan.features.map((feature, index) => (
                              <div key={index} className="text-sm flex items-start">
                                <CheckCircle className="h-3 w-3 text-green-600 mr-1 mt-0.5 flex-shrink-0" />
                                {feature}
                              </div>
                            ))}
                          </div>
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

        <TabsContent value="receipts" className="space-y-6">
          <Card className="border-primary/10 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle>Member Receipts</CardTitle>
              <CardDescription>View and manage payment receipts</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Feature coming soon...</p>
            </CardContent>
          </Card>
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
                    <p className="font-bold text-gray-900">4 Members</p>
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
                    <p className="font-bold text-gray-900">3 Members</p>
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
                    <p className="font-bold text-gray-900">139 Days</p>
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
                    <span className="font-bold text-green-600 ml-1">AED {reportSummary.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm px-4 border-l shrink-0">
                    <Banknote className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="text-muted-foreground whitespace-nowrap">Total Cash</span>
                    <span className="font-bold text-emerald-600 ml-1">AED {reportSummary.totalCash.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm px-4 border-l shrink-0">
                    <CreditCard className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                    <span className="text-muted-foreground whitespace-nowrap">Total Card</span>
                    <span className="font-bold text-sky-600 ml-1">AED {reportSummary.totalCard.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm px-4 border-l shrink-0">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="text-muted-foreground whitespace-nowrap">Total Due</span>
                    <span className="font-bold text-amber-600 ml-1">AED {reportSummary.totalDue.toLocaleString()}</span>
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
                            <TableCell className="font-semibold">{row.amount.toLocaleString()} AED</TableCell>
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
            <Card>
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

